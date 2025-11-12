# lib/furigana.py
# (変更なし)
import requests
import json
import logging
import os
import unicodedata
import math # マッピング計算用に追加

# --- 設定 (Configuration) ---

# Yahoo APIキー
#APP_ID = os.environ.get("YAHOO_APP_ID")
APP_ID = "dj00aiZpPUtUc3hEUWRkc0VTdiZzPWNvbnN1bWVyc2VjcmV0Jng9OGY-"
API_URL = "https://jlp.yahooapis.jp/FuriganaService/V2/furigana"


def kata_to_hira(s):
 """カタカナをひらがなに変換する"""
 s = unicodedata.normalize('NFKC', s)
 result = []
 for ch in s:
     code = ord(ch)
     if 0x30A1 <= code <= 0x30F6:
         result.append(chr(code - 0x60))
     else:
         result.append(ch)
 return "".join(result)


def get_furigana(message):
 """
 Yahoo APIを呼び出してふりがなとマッピングを取得する (タイピングゲーム用に調整)
 Returns:
     (str, list) | None: (ふりがなテキスト, マッピングリスト) のタプル、またはエラー時 None
 """
 if not APP_ID:
     logging.error("YAHOO_APP_ID not set. Cannot get furigana.")
     return None

 headers = {"Content-Type": "application/json"}
 payload = {
     "id": "1234-1",
     "jsonrpc": "2.0",
     "method": "jlp.furiganaservice.furigana",
     "params": {
         "q": message
         # "grade": 1 を削除
     }
 }

 try:
     response = requests.post(API_URL,
                              headers=headers,
                              data=json.dumps(payload),
                              params={"appid": APP_ID},
                              timeout=10)
     response.raise_for_status()
     data = response.json()

     if "error" in data:
         logging.error(f"Yahoo API Error: {data['error']['message']}")
         return None

     if "result" not in data or "word" not in data["result"]:
         logging.error(f"Yahoo API unexpected response: {data}")
         return None

     # --- ★★★ ここからが記号・マッピング処理ロジック ★★★ ---

     conversion_map = {
         '『': '「', '』': '」', '（': '(', '）': ')', '［': '[', '］': ']',
         '｛': '{', '｝': '}', '＜': '<', '＞': '>', '？': '?', '！': '!',
         '・': '/', '　': ' '
     }

     keep_symbols = {
         '、', '。', '・', '「', '」', '(', ')', '[', ']', '{', '}', '<', '>',
         '?', '!', ' ', ',', '.'
     }

     furigana_text = ""
     mapping_list = [] # ★ 新規: ひらがなに対応する元の文字を格納するリスト

     for word in data["result"]["word"]:
         if "furigana" in word:
             # 3. 漢字の読み
             surface = word["surface"]
             furigana = word["furigana"]

             furigana_text += furigana

             # ★ 新規: マッピング処理 (割り算ロジック)
             len_f = len(furigana)
             len_s = len(surface)

             if len_f > 0 and len_s > 0:
                 ratio = len_f / len_s
                 for i in range(1, len_f + 1):
                     # どのsurface文字に対応するか計算 (0-indexed)
                     s_idx = math.ceil(i / ratio) - 1
                     # 念のため範囲内に収める
                     s_idx = min(max(0, s_idx), len_s - 1)
                     mapping_list.append(surface[s_idx])
             elif len_f > 0:
                 # surfaceが空だがfuriganaがある場合 (例: 稀な記号?)
                 mapping_list.extend([furigana[0]] * len_f)

         elif "surface" in word:
             # ★ 追加: 漢字だが furigana が無い場合 → reading を使う
             if "reading" in word and any(0x4E00 <= ord(c) <= 0x9FFF for c in word["surface"]):
                 surface = word["surface"]
                 reading = kata_to_hira(word["reading"])  # 読みをひらがなに統一
                 furigana_text += reading

                 # マッピング（surface と reading の長さを比率で対応）
                 len_f = len(reading)
                 len_s = len(surface)
                 ratio = len_f / len_s
                 for i in range(1, len_f + 1):
                     s_idx = math.ceil(i / ratio) - 1
                     s_idx = min(max(0, s_idx), len_s - 1)
                     mapping_list.append(surface[s_idx])
                 continue

             # 4. 読みがない場合 (ひらがな、カタカナ、記号、アルファベットなど)
             surface = word["surface"]

             for char in surface:
                 # 4a. 変換マップ
                 if char in conversion_map:
                     converted_char = conversion_map[char]
                     furigana_text += converted_char
                     mapping_list.append(converted_char) # マッピングにも追加
                     continue

                 # 4b. ひらがな・カタカナ・長音記号・★アルファベット★ かチェック
                 code = ord(char)
                 if (0x3041 <= code <= 0x309F) or \
                    (0x30A1 <= code <= 0x30F6) or \
                    (code == 0x30FC) or \
                    (0x0041 <= code <= 0x005A) or \
                    (0x0061 <= code <= 0x007A): # ★ アルファベット (A-Z, a-z) を追加

                     furigana_text += char
                     mapping_list.append(char) # マッピングにも追加
                     continue

                 # 4c. そのまま残す記号
                 if char in keep_symbols:
                     furigana_text += char
                     mapping_list.append(char) # マッピングにも追加
                     continue

                 # 4d. それ以外 (改行コードや絵文字など) は無視

     # 最後にカタカナをひらがなに統一
     final_yomi = kata_to_hira(furigana_text)

     # yomiとmappingの長さが一致しない場合（kata_to_hiraで文字数が変わる可能性は低いが念のため）
     if len(final_yomi) != len(mapping_list):
         logging.warning(f"Mismatch length: yomi({len(final_yomi)}) != mapping({len(mapping_list)}). Text: {message}")
         # 強制的に長さを合わせる (マッピングを切り詰めるか、最後の文字で埋める)
         if len(final_yomi) < len(mapping_list):
             mapping_list = mapping_list[:len(final_yomi)]
         else:
             last_char = mapping_list[-1] if mapping_list else " "
             mapping_list.extend([last_char] * (len(final_yomi) - len(mapping_list)))

     return (final_yomi, mapping_list)

 except requests.exceptions.RequestException as e:
     logging.error(f"Yahoo API Request Error: {e}")
     return None
 except json.JSONDecodeError:
     logging.error(f"Yahoo API JSON Decode Error: {response.text}")
     return None
 except Exception as e:
     logging.error(f"Yahoo API Unknown Error: {e}")
     return None

if  __name__ == "__main__":
  # 単体テスト用
  test_text = "これはテストです。なんか草生えるわw"
  result = get_furigana(test_text)
  if result:
      yomi, mapping = result
      print(f"Yomi: {yomi}")
      print(f"Mapping: {mapping}")
      print(f"Yomi Len: {len(yomi)}, Map Len: {len(mapping)}")