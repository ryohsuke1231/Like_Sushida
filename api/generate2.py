# api/generate2.py
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
MIN_INTERVAL = 8 


app = Flask(__name__)

# --- 設定 (Configuration) ---

logging.basicConfig(level=logging.INFO)

gemini_api_key = os.environ.get('GEMINI_API_KEY')
if not gemini_api_key:
    logging.warning("GEMINI_API_KEY environment variable not set. Text generation will fail.")
else:
    try:
        genai.configure(api_key=gemini_api_key)
        model = genai.GenerativeModel('gemini-2.5-flash-lite') 
    except Exception as e:
        logging.error(f"Failed to configure Gemini: {e}")
        model = None

prompt = "変な面白おかしい文章を書いて！ 奇妙な話でも、日常についての話でもなんでもいいです！ 「わかりました」とかはなしで文章だけ　300文字を目安に"

TEXT_CACHE = []
MIN_CACHE_STOCK = 5 
MAX_CACHE_SIZE = 50 
generation_thread = None 

# --- ヘルパー関数 (Helper Functions) ---
def safe_generate():
    global LAST_GENERATE_TIME
    if not model:
        logging.error("Gemini model is not initialized. Cannot generate text.")
        return None
    now = time.time()
    wait = MIN_INTERVAL - (now - LAST_GENERATE_TIME)
    if wait > 0:
        time.sleep(wait)
    LAST_GENERATE_TIME = time.time()

    return model.generate_content(prompt)


def generate_new_text_with_furigana():
    """
    GeminiとYahoo APIを使って新しい [yomi, mapping, word_map, words_data] のリストを生成する
    """
    if not model:
        logging.error("Gemini model is not initialized. Cannot generate text.")
        return None

    try:
        response = safe_generate()
        if not response: 
             raise Exception("Gemini API call failed or returned None.")
        message = response.text

        furigana_result = get_furigana(message)

        if furigana_result:
            yomi_text, mapping_list, word_map, words_data = furigana_result

            if len(yomi_text) != len(mapping_list):
                 logging.warning("Generate2: Mismatch yomi/mapping length AFTER get_furigana. Skipping.")
                 return None
            if len(yomi_text) != len(word_map):
                 logging.warning("Generate2: Mismatch yomi/word_map length AFTER get_furigana. Skipping.")
                 return None

            logging.info("Successfully generated new text and furigana.")
            return [yomi_text, mapping_list, word_map, words_data]
        else:
            logging.warning("Failed to get furigana for generated text.")
            return None

    except Exception as e:
        logging.error(f"Text generation or Furigana Error: {e}")
        return None

def refill_cache_task():
    """キャッシュを非同期で補充するタスク"""
    global generation_thread
    try:
        if len(TEXT_CACHE) < MAX_CACHE_SIZE:
            logging.info("Refill task started...")
            new_data = generate_new_text_with_furigana() 
            if new_data:
                TEXT_CACHE.append(new_data)
                logging.info(f"Cache refilled. New size: {len(TEXT_CACHE)}")
            else:
                logging.warning("Refill task failed to generate data.")
    finally:
        generation_thread = None 

def refill_cache_if_needed(available_indices_count):
    """キャッシュのストックが少なければ非同期で補充を開始する"""
    global generation_thread
    if (len(TEXT_CACHE) < MAX_CACHE_SIZE and
            available_indices_count < MIN_CACHE_STOCK and
            (generation_thread is None or not generation_thread.is_alive())):

        logging.info("Cache stock is low. Starting refill thread...")
        generation_thread = Thread(target=refill_cache_task)
        generation_thread.start()

# --- メインルート (Main Route) ---

@app.route('/api/generate2', methods=['GET'])
def generate_text():
    try:
        used_indices_json = request.cookies.get('used_indices', '[]')
        loaded_data = json.loads(used_indices_json)

        # CookieがJSONリスト形式であることを確認
        if not isinstance(loaded_data, list):
            raise TypeError("Cookie is not a JSON list")

        used_indices = set(loaded_data)

    except (json.JSONDecodeError, TypeError, AttributeError):
        # 不正な形式、null、空文字、またはリストでない場合はリセット
        used_indices = set()
    all_indices = set(range(len(TEXT_CACHE)))
    available_indices = list(all_indices - used_indices)

    refill_cache_if_needed(len(available_indices))

    # 4. 利用可能な文章がない場合のフォールバック
    if not available_indices:
        logging.warning("No available text in cache. Attempting synchronous generation...")
        new_data = generate_new_text_with_furigana() 

        if new_data:
            if len(TEXT_CACHE) < MAX_CACHE_SIZE:
                TEXT_CACHE.append(new_data)
                new_index = len(TEXT_CACHE) - 1
            else:
                TEXT_CACHE[0] = new_data
                new_index = 0
            used_indices.add(new_index)
            if len(used_indices) >= len(TEXT_CACHE):
                used_indices = {new_index}

            # ★★★ 修正: kanji 再構築ロジック (フォールバック) ★★★
            yomi_text = new_data[0]
            mapping_list = new_data[1]
            word_map = new_data[2]
            words_data = new_data[3]

            yomi_segments_data = split_with_context(yomi_text)
            yomi_split = []
            kanji_split = []
            final_mapping_segments = [] # ★ 追加

            for data in yomi_segments_data:
                yomi_split.append(data['segment']) 
                start, end = data['start'], data['end']

                # ★★★ 修正 (wiki.py と同じ) ★★★
                if start >= len(yomi_text):
                    continue
                end = min(end, len(yomi_text)) 
                yomi_slice_raw = yomi_text[start:end]
                # ★★★ 修正ここまで ★★★

                # (1) kanji ロジック
                if start >= len(word_map):
                    kanji_split.append("") # ★ kanji_split を使う
                else:
                    word_map_end = min(end, len(word_map)) 
                    word_map_slice = word_map[start:word_map_end]

                    if len(yomi_slice_raw) != len(word_map_slice):
                        logging.warning(f"Generate2 (Fallback): Mismatch yomi_slice/word_map_slice length. Skipping segment.")
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
                                    logging.warning(f"Generate2 (Fallback): Word map index {current_word_index} out of bounds.")
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
                    logging.warning(f"Generate2 (Fallback): Mismatch yomi_slice/mapping_slice length. Appending empty map.")
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
            response.set_cookie('used_indices',
                                json.dumps(list(used_indices)),
                                max_age=3600*24*30,
                                httponly=True,
                                secure=True,
                                samesite='None')
            return response
        else:
            return jsonify(error="Failed to generate new text. API keys might be missing."), 500

    # 5. ランダムに選択
    selected_index = random.choice(available_indices)
    selected_data = TEXT_CACHE[selected_index] 

    # 6. 使用済みindexを更新し、Cookieにセット
    used_indices.add(selected_index)
    if len(used_indices) >= len(TEXT_CACHE):
        logging.info("All cache items used by this client. Resetting cookie.")
        used_indices = {selected_index}

    # ★★★ 修正: kanji 再構築ロジック (キャッシュ) ★★★
    yomi_text = selected_data[0]
    mapping_list = selected_data[1]
    word_map = selected_data[2]
    words_data = selected_data[3]

    yomi_segments_data = split_with_context(yomi_text)
    yomi_split = []
    kanji_split = []
    final_mapping_segments = [] # ★ 追加

    for data in yomi_segments_data:
        yomi_split.append(data['segment'])
        start, end = data['start'], data['end']

        # ★★★ 修正 (wiki.py と同じ) ★★★
        if start >= len(yomi_text):
            continue
        end = min(end, len(yomi_text))
        yomi_slice_raw = yomi_text[start:end]
        # ★★★ 修正ここまで ★★★

        # (1) kanji ロジック (★ 修正: キャッシュヒット時のバグ修正)
        if start >= len(word_map):
            kanji_split.append("") # ★ kanji_split を使う
        else:
            word_map_end = min(end, len(word_map)) 
            word_map_slice = word_map[start:word_map_end]

            if len(yomi_slice_raw) != len(word_map_slice):
                logging.warning("Generate2 (Cache): Mismatch yomi_slice/word_map_slice length. Skipping segment.")
                kanji_split.append("") # ★ kanji_split を使う
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
                            logging.warning(f"Generate2 (Cache): Word map index {current_word_index} out of bounds.")
                            kanji_segment_chars.append(yomi_char)
                            last_word_index = -1
                kanji_split.append("".join(kanji_segment_chars)) # ★ kanji_split を使う

        # (2) mapping ロジック
        if start >= len(mapping_list):
            final_mapping_segments.append([])
            continue

        mapping_end = min(end, len(mapping_list))
        mapping_slice_raw = mapping_list[start:mapping_end]

        if len(yomi_slice_raw) != len(mapping_slice_raw):
            logging.warning(f"Generate2 (Cache): Mismatch yomi_slice/mapping_slice length. Appending empty map.")
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

    # --- ループ終了後 ---

    response_data = jsonify(kanji=kanji_split, yomi=yomi_split, mapping=final_mapping_segments)
    response = make_response(response_data)
    response.set_cookie('used_indices',
                        json.dumps(list(used_indices)),
                        max_age=3600*24*30,
                        httponly=True,
                        secure=True,
                        samesite='None'
                       )

    return response

# --- サーバー起動（開発用） ---
if __name__ == '__main__':
    if not TEXT_CACHE:
        logging.info("Priming cache on startup...")
        prime_thread = Thread(target=refill_cache_task)
        prime_thread.start()

    app.run(debug=True, port=5000)