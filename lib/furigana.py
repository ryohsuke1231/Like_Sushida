# lib/furigana.py
import requests
import json
import logging
import os
import unicodedata
import math

# --- 設定 (Configuration) ---

# Yahoo APIキー
# APP_ID = os.environ.get("YAHOO_APP_ID")
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
        (str, list, list, list) | None:
        - final_yomi_text (str): 結合されたヨミ (空白含む)
        - final_mapping_list (list): ★★★ 修正: タイピング用 1:1 漢字「インデックス」マッピング ★★★
        - map_to_word_index (list): yomi の各文字が words_data の何番目に対応するか
        - words_data (list[dict]): word 単位のデータ [{'kanji': str, 'yomi': str}]
        またはエラー時 None
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
            logging.error(f"requested: {message}")
            return None

        if "result" not in data or "word" not in data["result"]:
            logging.error(f"Yahoo API unexpected response: {data}")
            return None

        conversion_map = {
            '『': '「', '』': '」', '（': '(', '）': ')', '［': '[', '］': ']',
            '｛': '{', '｝': '}', '＜': '<', '＞': '>', '？': '?', '！': '!',
            '・': '/', '0': '0', '1': '1', '2': '2', '3': '3', '4': '4',
            '5': '5', '6': '6', '7': '7', '8': '8', '9': '9', '　': ' ',
            '：': ':', '；': ';', '＆': '&', '＃': '#', '＠': '@', '＄': '$',
            '％': '%', '＾': '^', '＊': '*', '－': '-', '＿': '_', '＋': '+',
            '＝': '='
        }

        keep_symbols = {
            '、', '。', '・', '「', '」', '(', ')', '[', ']', '{', '}', '<', '>', '/',
            '?', '!', ' ', ',', '.', '-', '_', ':', ';', '&', '#', '@', '$', '%', '^', '*', '+', '='
        }

        # ★ 修正: 4つのリストを同時に生成
        yomi_text_parts = []     # word 単位のヨミ (最後に join)
        final_mapping_list = []  # ★ タイピング用マッピング (extend)
        map_to_word_index = []   # ヨミ 1:1 の word インデックス (extend)
        words_data = []          # word 単位のデータ [{'kanji': str, 'yomi': str}]

        word_index_counter = 0
        kanji_index_offset = 0   # ★ 追加: 漢字文字列の全体インデックスオフセット

        for word in data["result"]["word"]:

            current_kanji = ""
            current_yomi = ""
            current_mapping_parts = [] # ★ ここがインデックスのリストになる

            # 1. "furigana" がある場合 (漢字)
            if "furigana" in word:
                surface = word["surface"]
                furigana = kata_to_hira(word["furigana"])

                current_kanji = surface
                current_yomi = furigana

                len_f = len(furigana)
                len_s = len(surface)

                if len_f > 0 and len_s > 0:
                    ratio = len_f / len_s
                    for i in range(1, len_f + 1):
                        s_idx = math.ceil(i / ratio) - 1
                        s_idx = min(max(0, s_idx), len_s - 1)
                        # ★ 修正: オフセットを足した「インデックス」を格納
                        current_mapping_parts.append(s_idx + kanji_index_offset)
                elif len_f > 0:
                    # ★ 修正: 漢字がない場合 (0 + オフセット)
                    current_mapping_parts.extend([kanji_index_offset] * len_f)

            # 2. "furigana" がない場合
            elif "surface" in word:
                # 2a. "reading" がある場合 (例: 信信 (しんしん))
                if "reading" in word and any(0x4E00 <= ord(c) <= 0x9FFF for c in word["surface"]):
                    surface = word["surface"]
                    reading = kata_to_hira(word["reading"])

                    current_kanji = surface
                    current_yomi = reading

                    len_f = len(reading)
                    len_s = len(surface)
                    if len_s == 0:
                        # ★ 修正: オフセットのみ
                        current_mapping_parts.extend([kanji_index_offset] * len_f)
                    else:
                        ratio = len_f / len_s
                        for i in range(1, len_f + 1):
                            s_idx = math.ceil(i / ratio) - 1
                            s_idx = min(max(0, s_idx), len_s - 1)
                            # ★ 修正: オフセットを足した「インデックス」を格納
                            current_mapping_parts.append(s_idx + kanji_index_offset)

                # 2b. "reading" がない場合 (ひらがな、記号、空白など)
                else:
                    surface = word["surface"]
                    normalized_surface = kata_to_hira(surface)

                    temp_kanji = ""
                    temp_yomi = ""
                    temp_map = [] # ★ ここもインデックスのリストになる

                    # ★ 修正: char_idx も取得
                    for char_idx, char in enumerate(normalized_surface):
                        # 4a. 変換マップ
                        if char in conversion_map:
                            converted_char = conversion_map[char]
                            # --- ユーザーリクエストによる修正 ---
                            temp_kanji += char           # カンジ側(表示用)は変換前の文字
                            temp_yomi += converted_char  # ヨミ側(タイピング用)は変換後の文字
                            # ---------------------------------
                            # ★ 修正: オフセットを足した「インデックス」を格納
                            temp_map.append(char_idx + kanji_index_offset)
                            continue

                        # 4b. ひらがな・長音記号・アルファベット
                        code = ord(char)
                        if (0x3041 <= code <= 0x309F) or \
                           (code == 0x30FC) or \
                           (0x0041 <= code <= 0x005A) or \
                           (0x0061 <= code <= 0x007A):
                            temp_kanji += char
                            temp_yomi += char
                            # ★ 修正: オフセットを足した「インデックス」を格納
                            temp_map.append(char_idx + kanji_index_offset)
                            continue

                        # 4c. そのまま残す記号
                        if char in keep_symbols:
                            temp_kanji += char
                            temp_yomi += char
                            # ★ 修正: オフセットを足した「インデックス」を格納
                            temp_map.append(char_idx + kanji_index_offset)
                            continue

                        # 4d. それ以外 (改行コードや絵文字など) は無視

                    current_kanji = temp_kanji
                    current_yomi = temp_yomi
                    current_mapping_parts = temp_map

            # --- この word の処理終了 ---

            if current_yomi: # ヨミが生成された word のみ追加
                yomi_text_parts.append(current_yomi)
                final_mapping_list.extend(current_mapping_parts)

                # ★ 新規 (変更なし)
                words_data.append({'kanji': current_kanji, 'yomi': current_yomi})
                map_to_word_index.extend([word_index_counter] * len(current_yomi))

                # ★ 追加: 次の word のためのオフセット更新
                kanji_index_offset += len(current_kanji)
                word_index_counter += 1

        # --- ループ終了 ---

        final_yomi_text = "".join(yomi_text_parts)

        # ★ 修正: 長さチェックと強制調整ロジック
        if len(final_yomi_text) != len(final_mapping_list):
            logging.warning(f"Mismatch length: yomi({len(final_yomi_text)}) != mapping({len(final_mapping_list)}). Text: {message[:20]}...")
            # (長さ調整ロジック)
            if len(final_yomi_text) < len(final_mapping_list):
                final_mapping_list = final_mapping_list[:len(final_yomi_text)]
            else:
                # ★ 修正: 最後のインデックス(数値)を取得
                last_idx = final_mapping_list[-1] if final_mapping_list else 0
                final_mapping_list.extend([last_idx] * (len(final_yomi_text) - len(final_mapping_list)))

        # ★ yomi と word_map の長さもチェック (変更なし)
        if len(final_yomi_text) != len(map_to_word_index):
            logging.error(f"FATAL: Mismatch length: yomi({len(final_yomi_text)}) != word_map({len(map_to_word_index)}). Text: {message[:20]}...")
            # (強制調整)
            if len(map_to_word_index) > len(final_yomi_text):
                 map_to_word_index = map_to_word_index[:len(final_yomi_text)]
            else:
                 last_idx = map_to_word_index[-1] if map_to_word_index else 0
                 map_to_word_index.extend([last_idx] * (len(final_yomi_text) - len(map_to_word_index)))

        return (final_yomi_text, final_mapping_list, map_to_word_index, words_data)

    except requests.exceptions.RequestException as e:
        logging.error(f"Yahoo API Request Error: {e}")
        return None
    except json.JSONDecodeError:
        logging.error(f"Yahoo API JSON Decode Error: {response.text}")
        return None
    except Exception as e:
        logging.error(f"Yahoo API Unknown Error in get_furigana: {e}", exc_info=True)
        return None

if __name__ == "__main__":
    # 修正確認のためテストケースを変更
    test_text = "テスト（TEST）"
    print(f"Input: {test_text}")
    result = get_furigana(test_text)
    if result:
        yomi, mapping, word_map, words_data = result
        print(f"Yomi: {yomi}")
        print(f"Mapping: {mapping}") # ★ ここがインデックスのリストになる
        print(f"Word Map: {word_map}")
        print(f"Words Data: {words_data}")
        print(f"Yomi Len: {len(yomi)}, Map Len: {len(mapping)}, Word Map Len: {len(word_map)}")

    print("---")
    # 元のテストケース
    test_text = "いやっほ" # ｳﾞｨ (3文字) -> ヴィ (1文字)
    print(f"Input: {test_text}")
    result = get_furigana(test_text)
    if result:
        yomi, mapping, word_map, words_data = result
        print(f"Yomi: {yomi}")
        print(f"Mapping: {mapping}")
        print(f"Word Map: {word_map}")
        print(f"Words Data: {words_data}")
        print(f"Yomi Len: {len(yomi)}, Map Len: {len(mapping)}, Word Map Len: {len(word_map)}")