# api/generate3.py
import google.generativeai as genai
import requests
from flask import Flask, request, jsonify, make_response
import os
import json
import random
import logging
from threading import Thread
import time

# ★ 新規: furigana.py からインポート
from lib.furigana import get_furigana
from lib.splitWithContext import split_with_context


LAST_GENERATE_TIME = 0
MIN_INTERVAL = 8 # APIのレート制限のための待機時間


app = Flask(__name__)

# --- 設定 (Configuration) ---

logging.basicConfig(level=logging.INFO)

gemini_api_key = os.environ.get('GEMINI_API_KEY')
if not gemini_api_key:
    logging.warning("GEMINI_API_KEY environment variable not set. Text generation will fail.")
else:
    try:
        genai.configure(api_key=gemini_api_key)
        model = genai.GenerativeModel('gemini-2.5-flash-lite') # モデル名は適宜調整してください
    except Exception as e:
        logging.error(f"Failed to configure Gemini: {e}")
        model = None

# ★ 変更: デフォルトプロンプトとして保持（クライアント指定がない場合に使用）
DEFAULT_PROMPT = "変な面白おかしい文章を書いて！ 奇妙な話でも、日常についての話でもなんでもいいです！ 「わかりました」とかはなしで文章だけ　300文字を目安に"

# ★ 削除: キャッシュ関連の変数をすべて削除
# TEXT_CACHE = []
# MIN_CACHE_STOCK = 5
# MAX_CACHE_SIZE = 50
# generation_thread = None

# --- ヘルパー関数 (Helper Functions) ---
def safe_generate(custom_prompt): # ★ 変更: promptを引数で受け取る
    global LAST_GENERATE_TIME
    if not model:
        logging.error("Gemini model is not initialized. Cannot generate text.")
        return None

    # レート制限（APIキー共有時の保護）
    now = time.time()
    wait = MIN_INTERVAL - (now - LAST_GENERATE_TIME)
    if wait > 0:
        logging.info(f"Rate limit: Waiting for {wait:.2f} seconds.")
        time.sleep(wait)
    LAST_GENERATE_TIME = time.time()

    # ★ 変更: 引数の custom_prompt を使用
    return model.generate_content(custom_prompt)


def generate_new_text_with_furigana(custom_prompt): # ★ 変更: promptを引数で受け取る
    """
    GeminiとYahoo APIを使って新しい [yomi, mapping, word_map, words_data] のリストを生成する
    """
    if not model:
        logging.error("Gemini model is not initialized. Cannot generate text.")
        return None

    try:
        # ★ 変更: 引数の custom_prompt を safe_generate に渡す
        custom_prompt = custom_prompt + " ただし、答える際はMarkdown記号（*, -, #, ` など）や絵文字、特殊記号（ASCII外）を一切使わないでください。 文章のみで回答してください。"
        response = safe_generate(custom_prompt) 

        if not response:
            raise Exception("Gemini API call failed or returned None.")

        # response.text が存在するか確認 (generate_content が失敗した場合の安全策)
        if not hasattr(response, 'text'):
             logging.error(f"Gemini response object has no 'text' attribute. Response: {response}")
             # response.prompt_feedback などでブロック理由を確認できる場合がある
             if hasattr(response, 'prompt_feedback'):
                 logging.error(f"Prompt Feedback: {response.prompt_feedback}")
             return None

        message = response.text

        furigana_result = get_furigana(message)

        if furigana_result:
            yomi_text, mapping_list, word_map, words_data = furigana_result

            if len(yomi_text) != len(mapping_list):
                # ★ 変更: ログ識別子
                logging.warning("Generate3: Mismatch yomi/mapping length AFTER get_furigana. Skipping.")
                return None
            if len(yomi_text) != len(word_map):
                # ★ 変更: ログ識別子
                logging.warning("Generate3: Mismatch yomi/word_map length AFTER get_furigana. Skipping.")
                return None

            logging.info("Successfully generated new text and furigana.")
            return [yomi_text, mapping_list, word_map, words_data]
        else:
            logging.warning("Failed to get furigana for generated text.")
            return None

    except Exception as e:
        logging.error(f"Text generation or Furigana Error: {e}")
        return None

# ★ 削除: キャッシュ補充関連の関数 (refill_cache_task, refill_cache_if_needed) を削除


# --- メインルート (Main Route) ---

@app.route('/api/generate3', methods=['GET']) # ★ 変更: エンドポイント名
def generate_text():
    try:
        # ★ 新規: クライアントから 'prompt' をクエリパラメータで受け取る
        client_prompt = request.args.get('prompt')

        # ★ 新規: プロンプトが指定されていない、または空の場合はデフォルトを使用
        if not client_prompt or client_prompt.strip() == "":
            logging.info("No prompt provided by client, using default.")
            current_prompt = DEFAULT_PROMPT
        else:
            logging.info(f"Using custom prompt: {client_prompt[:50]}...") # 長すぎる場合に備えて一部だけログ出力
            current_prompt = client_prompt

        # ★ 変更: キャッシュロジックを削除し、常に同期生成
        logging.info("Attempting synchronous generation with selected prompt...")
        new_data = generate_new_text_with_furigana(current_prompt) # ★ 変更: 決定したプロンプトを渡す

        if new_data:
            # ★ 変更: キャッシュへの追加ロジックを削除

            # ★ 変更: 元のフォールバック処理をメインロジックとして使用
            yomi_text = new_data[0]
            mapping_list = new_data[1]
            word_map = new_data[2]
            words_data = new_data[3]

            yomi_segments_data = split_with_context(yomi_text)
            yomi_split = []
            kanji_split = []
            final_mapping_segments = [] 

            for data in yomi_segments_data:
                yomi_split.append(data['segment']) 
                start, end = data['start'], data['end']

                # (共通の境界チェック)
                if start >= len(yomi_text):
                    continue
                end = min(end, len(yomi_text)) 
                yomi_slice_raw = yomi_text[start:end]

                # (1) kanji ロジック
                if start >= len(word_map):
                    kanji_split.append("") 
                else:
                    word_map_end = min(end, len(word_map)) 
                    word_map_slice = word_map[start:word_map_end]

                    if len(yomi_slice_raw) != len(word_map_slice):
                        logging.warning(f"Generate3 (Sync): Mismatch yomi_slice/word_map_slice length. Skipping segment.")
                        kanji_split.append("")
                    else:
                        kanji_segment_chars = []
                        last_word_index = -1 
                        for i in range(len(yomi_slice_raw)):
                            yomi_char = yomi_slice_raw[i]
                            if yomi_char.isspace():
                                continue 
                            current_word_index = word_map_slice[i]
                            if current_word_index != last_word_index:
                                try:
                                    kanji_segment_chars.append(words_data[current_word_index]['kanji'])
                                    last_word_index = current_word_index
                                except IndexError:
                                    logging.warning(f"Generate3 (Sync): Word map index {current_word_index} out of bounds.")
                                    kanji_segment_chars.append(yomi_char)
                                    last_word_index = -1
                        kanji_split.append("".join(kanji_segment_chars))

                # (2) mapping ロジック
                if start >= len(mapping_list): 
                    final_mapping_segments.append([])
                    continue

                mapping_end = min(end, len(mapping_list))
                mapping_slice_raw = mapping_list[start:mapping_end]

                if len(yomi_slice_raw) != len(mapping_slice_raw):
                    logging.warning(f"Generate3 (Sync): Mismatch yomi_slice/mapping_slice length. Appending empty map.")
                    final_mapping_segments.append([])
                    continue

                mapping_segment = []
                kanji_segment_start_index = -1
                for i in range(len(yomi_slice_raw)):
                    yomi_char = yomi_slice_raw[i]
                    if yomi_char.isspace():
                        continue
                    original_kanji_index = mapping_slice_raw[i]
                    if kanji_segment_start_index == -1:
                        kanji_segment_start_index = original_kanji_index
                    relative_kanji_index = original_kanji_index - kanji_segment_start_index
                    mapping_segment.append(relative_kanji_index)
                final_mapping_segments.append(mapping_segment)

            response_data = jsonify(kanji=kanji_split, yomi=yomi_split, mapping=final_mapping_segments)
            response = make_response(response_data)

            # ★ 削除: Cookie (used_indices) の設定を削除

            return response
        else:
            # ★ 変更: エラーメッセージ
            return jsonify(error="Failed to generate new text. API keys might be missing or generation failed."), 500

    # ★ 変更: キャッシュヒットのロジックをすべて削除

    except Exception as e:
        logging.error(f"An unexpected error occurred in /api/generate3: {e}")
        return jsonify(error="An internal server error occurred."), 500


# --- サーバー起動（開発用） ---
if __name__ == '__main__':
    # ★ 削除: 起動時のキャッシュ初期化 (priming) を削除
    app.run(debug=True, port=5000)