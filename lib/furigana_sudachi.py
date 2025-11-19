# lib/furigana.py

import logging
import unicodedata
import math
import re

# Sudachi と pykakasi をインポート
import sudachipy
from sudachipy import tokenizer
from sudachipy import dictionary
from pykakasi import Kakasi

# --- 変更: グローバル設定 ---

try:
    # ★ 修正:
    # dictionary.Dictionary(...).create() が返すオブジェクトが
    # トークナイザ（.tokenize() メソッドを持つ）本体です。
    try:
        SUD_TOKENIZER = dictionary.Dictionary(dict="core").create()
    except:
        logging.warning("sudachidict_full not found. Falling back to core.")
        SUD_TOKENIZER = dictionary.Dictionary(dict="core").create()
    
    # pykakasi インスタンス
    KKS = Kakasi()

    # 日本語（ひらがな、カタカナ、漢字）を1文字でも含むかを判定する正規表現
    JAPANESE_PATTERN = re.compile(r'[ぁ-んァ-ヶ\u4e00-\u9faf]')

except Exception as e:
    logging.error(f"Failed to initialize Sudachi or Kakasi: {e}")
    logging.error("Please ensure sudachipy, sudachidict_core (or full), and pykakasi are installed.")
    SUD_TOKENIZER = None
    KKS = None
    JAPANESE_PATTERN = None


def get_furigana(message):
    """
    ★★★ Sudachi版 ★★★
    Sudachiを呼び出してふりがなとマッピングを取得する (タイピングゲーム用に調整)
    (Returns: ... 省略 ...)
    """
    if not SUD_TOKENIZER or not KKS:
        logging.error("Sudachi or Kakasi not initialized. Cannot get furigana.")
        return None

    # 1. サニタイズ処理 (変更なし)
    try:
        sanitized_message_chars = []
        for c in message:
            category = unicodedata.category(c)
            if category == 'So':
                continue
            elif c in ('\n', '\r', '\t'):
                sanitized_message_chars.append(' ')
            else:
                sanitized_message_chars.append(c)
        
        sanitized_message = "".join(sanitized_message_chars)
        sanitized_message = unicodedata.normalize('NFKC', sanitized_message)

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

    try:
        # ★ 修正:
        # 2. Sudachiで形態素解析
        # .tokenize() を呼び出す際に、分割モード(Mode.C)を指定します。
        mode = tokenizer.Tokenizer.SplitMode.C
        morphemes = SUD_TOKENIZER.tokenize(sanitized_message, mode)

        for m in morphemes:
            
            current_kanji = m.surface()
            current_yomi = ""
            current_mapping_parts = []

            # 3. 日本語かそれ以外かで処理を分岐 (変更なし)
            is_japanese = bool(JAPANESE_PATTERN.search(current_kanji))

            if is_japanese:
                # --- 3a. 日本語の場合 ---
                reading_kata = m.reading_form()
                result_list = KKS.convert(reading_kata)
                current_yomi = "".join([item['hira'] for item in result_list])

                # マッピング計算 (変更なし)
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
                # --- 3b. 日本語以外の場合 --- (変更なし)
                current_yomi = current_kanji
                for i in range(len(current_yomi)):
                    current_mapping_parts.append(i + kanji_index_offset)

            # --- 4. この word の処理終了、結果の格納 (変更なし) ---
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

        # --- 5. ループ終了後処理 (変更なし) ---
        final_yomi_text = "".join(yomi_text_parts)

        # 長さチェックと強制調整ロジック (変更なし)
        if len(final_yomi_text) != len(final_mapping_list):
            logging.warning(
                f"Mismatch length: yomi({len(final_yomi_text)}) != mapping({len(final_mapping_list)}). Text: {message[:20]}..."
            )
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

    except Exception as e:
        logging.error(f"Sudachi Unknown Error in get_furigana: {e}",
                      exc_info=True)
        return None


# --- 実行確認 (変更なし) ---
if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)

    test_text = "テスト（TEST）"
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

    print("---")
    test_text = "いやっほ"
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
        
    print("---")
    test_text = "GuGuGammo"
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