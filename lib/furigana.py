# lib/furigana.py
import requests
import json
import logging
import os
import unicodedata
import math 

# --- 設定 (Configuration) ---

# Yahoo APIキー
#APP_ID = os.environ.get("YAHOO_APP_ID")
APP_ID = "dj00aiZpPUtUc3hEUWRkc0VTdiZzPWNvbnN1bWVyc2VjcmV0Jng9OGY-"
API_URL = "https://jlp.yahooapis.jp/FuriganaService/V2/furigana"


def kata_to_hira(s):
    """カタカナをひらがなに変換する (NFKC正規化を含む)"""
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

        conversion_map = {
            '『': '「', '』': '」', '（': '(', '）': ')', '［': '[', '］': ']',
            '｛': '{', '｝': '}', '＜': '<', '＞': '>', '？': '?', '！': '!',
            '・': '/', '0': '0', '1': '1', '2': '2', '3': '3', '4': '4', 
            '5': '5', '6': '6', '7': '7', '8': '8', '9': '9', '　': ' '
        }

        keep_symbols = {
            '、', '。', '・', '「', '」', '(', ')', '[', ']', '{', '}', '<', '>',
            '?', '!', ' ', ',', '.', '-' # ★ ハイフンも追加
        }

        furigana_text = ""
        mapping_list = [] 

        for word in data["result"]["word"]:
            if "furigana" in word:
                surface = word["surface"]
                # ★ 修正: ここでひらがな化
                furigana = kata_to_hira(word["furigana"]) 

                furigana_text += furigana

                len_f = len(furigana)
                len_s = len(surface)

                if len_f > 0 and len_s > 0:
                    ratio = len_f / len_s
                    for i in range(1, len_f + 1):
                        s_idx = math.ceil(i / ratio) - 1
                        s_idx = min(max(0, s_idx), len_s - 1)
                        mapping_list.append(surface[s_idx])
                elif len_f > 0:
                    mapping_list.extend([furigana[0]] * len_f)

            elif "surface" in word:
                if "reading" in word and any(0x4E00 <= ord(c) <= 0x9FFF for c in word["surface"]):
                    surface = word["surface"]
                    # ★ 修正: ここでひらがな化
                    reading = kata_to_hira(word["reading"])
                    furigana_text += reading

                    len_f = len(reading)
                    len_s = len(surface)
                    # ★ バグ修正: len_s が 0 の場合 ZeroDivisionError になる
                    if len_s == 0:
                        mapping_list.extend([surface[0] if surface else " "] * len_f)
                        continue

                    ratio = len_f / len_s
                    for i in range(1, len_f + 1):
                        s_idx = math.ceil(i / ratio) - 1
                        s_idx = min(max(0, s_idx), len_s - 1)
                        mapping_list.append(surface[s_idx])
                    continue

                surface = word["surface"]

                # ★ 修正: surface も NFKC 正規化 (例: ｳﾞ -> ヴ) してからひらがな化
                normalized_surface = kata_to_hira(surface)

                for char in normalized_surface: # ★ normalized_surface をループ
                    # 4a. 変換マップ
                    if char in conversion_map:
                        converted_char = conversion_map[char]
                        furigana_text += converted_char
                        mapping_list.append(converted_char)
                        continue

                    # 4b. ひらがな・長音記号・アルファベット (カタカナは kata_to_hira でひらがな化済み)
                    code = ord(char)
                    if (0x3041 <= code <= 0x309F) or \
                       (code == 0x30FC) or \
                       (0x0041 <= code <= 0x005A) or \
                       (0x0061 <= code <= 0x007A): 

                        furigana_text += char
                        mapping_list.append(char)
                        continue

                    # 4c. そのまま残す記号
                    if char in keep_symbols:
                        furigana_text += char
                        mapping_list.append(char)
                        continue

                    # 4d. それ以外 (改行コードや絵文字など) は無視

        # ★ 修正: 最後の kata_to_hira は不要になった
        final_yomi = furigana_text # ★ そのまま代入

        # ★ 修正: 長さチェックと強制調整ロジック (NFKC正規化を事前に行ったため、不要になったはずだが念のため残す)
        if len(final_yomi) != len(mapping_list):
            logging.warning(f"Mismatch length: yomi({len(final_yomi)}) != mapping({len(mapping_list)}). Text: {message}")
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
        # ★ スタックトレースを含む、より詳細なエラーログ
        logging.error(f"Yahoo API Unknown Error in get_furigana: {e}", exc_info=True)
        return None

if  __name__ == "__main__":
     test_text = "これはテストです。なんか草生えるわw ｳﾞｨ" # ｳﾞｨ (3文字) -> ヴィ (1文字)
     result = get_furigana(test_text)
     if result:
         yomi, mapping = result
         print(f"Yomi: {yomi}")
         print(f"Mapping: {mapping}")
         print(f"Yomi Len: {len(yomi)}, Map Len: {len(mapping)}")