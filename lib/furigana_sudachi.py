# lib/furigana.py (Koyeb API 呼び出し版)

import logging
import unicodedata
import math
import re
import os
import requests # ★ Sudachiの代わりにAPIを呼ぶ
import json

# ★ APIのレスポンス(カタカナ)をひらがなにするために pykakasi は必要
from pykakasi import Kakasi 

# --- 変更: グローバル設定 ---

# ★ Koyeb APIの設定 (環境変数から読み込む)
API_BASE_URL = os.environ.get("FURIGANA_API_URL") # 例: https://my-app.koyeb.app
API_KEY = os.environ.get("FURIGANA_API_KEY") # Koyebに設定したAPIキー

# pykakasi インスタンス (クライアント側で必要)
try:
    KKS = Kakasi()
except Exception as e:
    logging.error(f"Failed to initialize Kakasi: {e}")
    KKS = None

# 日本語判定パターン (クライアント側で必要)
JAPANESE_PATTERN = re.compile(r'[ぁ-んァ-ヶ\u4E00-\u9FAF]')

# --- 削除: SUD_TOKENIZER の初期化は不要 ---

# ★★★ lib/furigana.py からコピー ★★★
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
# ★★★ ここまで ★★★


def get_furigana(message):
    """
    ★★★ Koyeb API版 ★★★
    KoyebのSudachi APIを呼び出し、
    クライアント側でマッピング処理を行ってタイピングゲーム用の4リストを返す。
    """
    # --- 1. API呼び出しの準備 ---
    if not KKS:
        logging.error("Kakasi not initialized. Cannot process furigana.")
        return None
    if not API_BASE_URL or not API_KEY:
        logging.error("FURIGANA_API_URL or FURIGANA_API_KEY not set.")
        return None

    # (サニタイズ処理はAPI側でも行われるが、念のためクライアント側でも実施)
    try:
        sanitized_message_chars = []
        for c in message:
            category = unicodedata.category(c)
            if category == 'So': continue
            elif c in ('\n', '\r', '\t'): sanitized_message_chars.append(' ')
            else: sanitized_message_chars.append(c)
        sanitized_message = "".join(sanitized_message_chars)
        # NFKC正規化はAPI側(サーバー)で行うので、ここでは不要
        # sanitized_message = unicodedata.normalize('NFKC', sanitized_message)
    except Exception as e:
        logging.warning(
            f"Failed to sanitize message, using original. Error: {e}")
        sanitized_message = message

    if not sanitized_message.strip():
        logging.warning(f"Message becomes empty after sanitization: {message}")
        return ("", [], [], [])

    # 4つのリストを初期化 (変更なし)
    yomi_text_parts = []
    final_mapping_list = []
    map_to_word_index = []
    words_data = []

    word_index_counter = 0
    kanji_index_offset = 0

    # ★★★ lib/furigana.py からコピー ★★★
    conversion_map = {
        '『': '「',
        '』': '」',
        '（': '(',
        '）': ')',
        '［': '[',
        '］': ']',
        '｛': '{',
        '｝': '}',
        '＜': '<',
        '＞': '>',
        '？': '?',
        '！': '!',
        '・': '/',
        '0': '0',
        '1': '1',
        '2': '2',
        '3': '3',
        '4': '4',
        '5': '5',
        '6': '6',
        '7': '7',
        '8': '8',
        '9': '9',
        '　': ' ',
        '：': ':',
        '；': ';',
        '＆': '&',
        '＃': '#',
        '＠': '@',
        '＄': '$',
        '％': '%',
        '＾': '^',
        '＊': '*',
        '－': '-',
        '＿': '_',
        '＋': '+',
        '＝': '='
    }

    keep_symbols = {
        '、', '。', '・', '「', '」', '(', ')', '[', ']', '{', '}', '<', '>',
        '/', '?', '!', ' ', ',', '.', '-', '_', ':', ';', '&', '#', '@',
        '$', '%', '^', '*', '+', '='
    }
    # ★★★ ここまで ★★★


    try:
        # --- 2. Sudachiの代わりにKoyeb APIを呼び出す ---
        url = f"{API_BASE_URL}/get_morphemes"
        payload = {
            "text": sanitized_message,
            "mode": "C" # 元のコードのロジック(Mode C)に固定
        }
        headers = {
            "Content-Type": "application/json",
            "X-API-KEY": API_KEY
        }
        
        response = requests.post(url, headers=headers, data=json.dumps(payload), timeout=10)
        response.raise_for_status() # エラーチェック
        
        api_data = response.json()
        
        if "morphemes" not in api_data:
             logging.error(f"API response missing 'morphemes' key: {api_data}")
             return None

        # --- 3. APIのレスポンス(morphemes)を使って、元のマッピングロジックを実行 ---
        
        morphemes = api_data["morphemes"]

        for m in morphemes:
            # APIからのレスポンス(辞書)から値を取得
            current_kanji = m.get("surface", "") # ★ NFKC正規化なし
            reading_kata = m.get("reading", "") # APIはカタカナで返す

            current_yomi = ""
            current_mapping_parts = []

            # 3. 日本語かそれ以外かで処理を分岐
            is_japanese = bool(JAPANESE_PATTERN.search(current_kanji))

            if is_japanese:
                # --- 3a. 日本語の場合 ---
                # ★ pykakasi でカタカナ -> ひらがな に変換 (NFKC正規化も含む)
                result_list = KKS.convert(reading_kata)
                current_yomi = "".join([item['hira'] for item in result_list])
                
                # ★ current_kanji (surface) は正規化しない (Yahoo版 1, 2a と同じ)

                # マッピング計算 (元のコードと同じ)
                len_f = len(current_yomi)
                len_s = len(current_kanji)
                if len_f > 0 and len_s > 0:
                    ratio = len_f / len_s
                    for i in range(1, len_f + 1):
                        s_idx = math.ceil(i / ratio) - 1
                        s_idx = min(max(0, s_idx), len_s - 1)
                        current_mapping_parts.append(s_idx + kanji_index_offset)
                elif len_f > 0:
                    current_mapping_parts.extend([kanji_index_offset] * len_f)
            
            else:
                # --- 3b. 日本語以外の場合 --- (★ Yahoo版の記号処理ロジックに置き換え)
                
                # ★ surface (current_kanji) に kata_to_hira (NFKC + ひらがな化) を適用 (Yahoo版 2b と同じ)
                normalized_surface = kata_to_hira(current_kanji) 

                temp_kanji = ""
                temp_yomi = ""
                temp_map = []

                for char_idx, char in enumerate(normalized_surface):
                    # 4a. 変換マップ
                    if char in conversion_map:
                        converted_char = conversion_map[char]
                        temp_kanji += char  # カンジ側(表示用)は変換前の文字
                        temp_yomi += converted_char  # ヨミ側(タイピング用)は変換後の文字
                        temp_map.append(char_idx + kanji_index_offset)
                        continue

                    # 4b. ひらがな・長音記号・アルファベット
                    code = ord(char)
                    if (0x3041 <= code <= 0x309F) or \
                       (code == 0x30FC) or \
                       (0x0041 <= code <= 0x005A) or \
                       (0x0061 <= code <= 0x007A):
                        temp_kanji += char
                        temp_yomi += char # ★ 小文字化しない (Yahoo版のロジックに合わせる)
                        temp_map.append(char_idx + kanji_index_offset)
                        continue

                    # 4c. そのまま残す記号
                    if char in keep_symbols:
                        temp_kanji += char
                        temp_yomi += char
                        temp_map.append(char_idx + kanji_index_offset)
                        continue

                    # 4d. それ以外 (無視)

                current_kanji = temp_kanji
                current_yomi = temp_yomi
                current_mapping_parts = temp_map
                # ★★★ 置き換えここまで ★★★

            # --- 4. この word の処理終了、結果の格納 (元のコードと同じ) ---
            if current_yomi:
                yomi_text_parts.append(current_yomi)
                final_mapping_list.extend(current_mapping_parts)
                words_data.append({
                    'kanji': current_kanji,
                    'yomi': current_yomi
                })
                map_to_word_index.extend([word_index_counter] * len(current_yomi))
                kanji_index_offset += len(current_kanji)
                word_index_counter += 1

        # --- 5. ループ終了後処理 (元のコードと同じ) ---
        final_yomi_text = "".join(yomi_text_parts)

        # 長さチェックと強制調整ロジック (元のコードと同じ)
        if len(final_yomi_text) != len(final_mapping_list):
            logging.warning(
                f"Mismatch length: yomi({len(final_yomi_text)}) != mapping({len(final_mapping_list)}). Text: {message[:20]}..."
            )
            # (長さ調整ロジック)
            if len(final_yomi_text) < len(final_mapping_list):
                final_mapping_list = final_mapping_list[:len(final_yomi_text)]
            else:
                last_idx = final_mapping_list[-1] if final_mapping_list else 0
                final_mapping_list.extend(
                    [last_idx] * (len(final_yomi_text) - len(final_mapping_list)))

        if len(final_yomi_text) != len(map_to_word_index):
            logging.error(
                f"FATAL: Mismatch length: yomi({len(final_yomi_text)}) != word_map({len(map_to_word_index)}). Text: {message[:20]}..."
            )
            # (強制調整)
            if len(map_to_word_index) > len(final_yomi_text):
                map_to_word_index = map_to_word_index[:len(final_yomi_text)]
            else:
                last_idx = map_to_word_index[-1] if map_to_word_index else 0
                map_to_word_index.extend(
                    [last_idx] *
                    (len(final_yomi_text) - len(map_to_word_index)))

        return (final_yomi_text, final_mapping_list, map_to_word_index,
                words_data)

    except requests.exceptions.RequestException as e:
        logging.error(f"Koyeb API Request Error: {e}")
        return None
    except Exception as e:
        logging.error(f"API processing Error in get_furigana: {e}",
                      exc_info=True)
        return None


# --- 実行確認 (変更なし) ---
if __name__ == "__main__":
    # このif __name__ == "__main__": を実行するには、
    # 環境変数に FURIGANA_API_URL と FURIGANA_API_KEY を設定してください
    
    logging.basicConfig(level=logging.INFO)
    
    if not API_BASE_URL or not API_KEY:
        print("="*30)
        print("テスト実行エラー:")
        print("環境変数 FURIGANA_API_URL と FURIGANA_API_KEY を設定してください。")
        print("例: export FURIGANA_API_URL=https://...koyeb.app")
        print("例: export FURIGANA_API_KEY=your_secret_key")
        print("="*30)
    else:
        test_text = "テスト（TEST）" # ★ 記号処理のテスト
        print(f"Input: {test_text}")
        result = get_furigana(test_text)
        if result:
            yomi, mapping, word_map, words_data = result
            print(f"Yomi: {yomi}") # ★ 期待値: 'てすと(TEST)'
            print(f"Mapping: {mapping}")
            print(f"Word Map: {word_map}")
            print(f"Words Data: {words_data}") # ★ 期待値: [{'kanji': 'テスト', 'yomi': 'てすと'}, {'kanji': '（', 'yomi': '('}, {'kanji': 'TEST', 'yomi': 'TEST'}, {'kanji': '）', 'yomi': ')'}]
            print(
                f"Yomi Len: {len(yomi)}, Map Len: {len(mapping)}, Word Map Len: {len(word_map)}"
            )

        print("---")
        test_text = "Pythonを学ぶ"
        print(f"Input: {test_text}")
        result = get_furigana(test_text)
        if result:
            yomi, mapping, word_map, words_data = result
            print(f"Yomi: {yomi}")
            print(f"Mapping: {mapping}")
            print(f"Word Map: {word_map}")
            print(f"Words Data: {words_data}")
            print(
                f"Yomi Len: {len(yomi)}, Map Len: {len(mapping)}, Word Map Len: {len(word_map)}"
            )