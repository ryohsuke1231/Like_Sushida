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
from queue import Queue

from lib.furigana_sudachi import get_furigana
from lib.splitWithContext import split_with_context

LAST_GENERATE_TIME = 0
MIN_INTERVAL = 8 # APIのレート制限のための待機時間

app = Flask(__name__)
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

DEFAULT_PROMPT = "変な面白おかしい文章を書いて！ 奇妙な話でも、日常についての話でもなんでもいいです！ 「わかりました」とかはなしで文章だけ　300文字を目安に"

# --- Queue と Worker ---
generate_queue = Queue()

def worker():
    while True:
        client_prompt, result_queue = generate_queue.get()
        try:
            result = generate_new_text_with_furigana(client_prompt)
            result_queue.put(result)
        except Exception as e:
            logging.error(f"Worker error: {e}")
            result_queue.put(None)
        generate_queue.task_done()

Thread(target=worker, daemon=True).start()

# --- 生成関数 (元の処理そのまま) ---
def safe_generate(custom_prompt):
    global LAST_GENERATE_TIME
    if not model:
        logging.error("Gemini model is not initialized. Cannot generate text.")
        return None
    now = time.time()
    wait = MIN_INTERVAL - (now - LAST_GENERATE_TIME)
    if wait > 0:
        logging.info(f"Rate limit: Waiting for {wait:.2f} seconds.")
        time.sleep(wait)
    LAST_GENERATE_TIME = time.time()
    return model.generate_content(custom_prompt)

def generate_new_text_with_furigana(custom_prompt):
    if not model:
        logging.error("Gemini model is not initialized. Cannot generate text.")
        return None
    try:
        custom_prompt = custom_prompt + " ただし、答える際はMarkdown記号や絵文字、特殊記号を一切使わないでください。文章のみで回答してください。"
        response = safe_generate(custom_prompt)
        if not response:
            raise Exception("Gemini API call failed or returned None.")
        if not hasattr(response, 'text'):
            logging.error(f"No 'text' in response: {response}")
            return None
        message = response.text
        furigana_result = get_furigana(message)
        if furigana_result:
            yomi_text, mapping_list, word_map, words_data = furigana_result
            if len(yomi_text) != len(mapping_list) or len(yomi_text) != len(word_map):
                logging.warning("Mismatch lengths after get_furigana. Skipping.")
                return None
            logging.info("Successfully generated new text and furigana.")
            return [yomi_text, mapping_list, word_map, words_data]
        else:
            logging.warning("Failed to get furigana for generated text.")
            return None
    except Exception as e:
        logging.error(f"Text generation or Furigana Error: {e}")
        return None

# --- API エンドポイント ---
@app.route('/api/generate3', methods=['GET'])
def generate_text():
    try:
        client_prompt = request.args.get('prompt')
        if not client_prompt or client_prompt.strip() == "":
            logging.info("No prompt provided, using default.")
            client_prompt = DEFAULT_PROMPT
        logging.info(f"Queueing prompt: {client_prompt[:50]}...")

        # --- Queue に入れて結果を待つ ---
        result_queue = Queue()
        generate_queue.put((client_prompt, result_queue))
        new_data = result_queue.get()  # await 的にブロック

        if not new_data:
            return jsonify(error="Failed to generate text."), 500

        # --- 元の Generate3 処理まるごと ---
        yomi_text = new_data[0]
        mapping_list = new_data[1]
        word_map = new_data[2]
        words_data = new_data[3]

        yomi_segments_data = split_with_context(yomi_text)
        yomi_split = []
        kanji_split = []
        final_mapping_segments = []

        for data in yomi_segments_data:
            start, end = data['start'], data['end']
            if start >= len(yomi_text) or start >= len(mapping_list) or start >= len(word_map):
                continue
            end = min(end, len(yomi_text), len(mapping_list), len(word_map))
            yomi_slice_raw = yomi_text[start:end]
            mapping_slice_raw = mapping_list[start:end]
            word_map_slice = word_map[start:end]
            if not (len(yomi_slice_raw) == len(mapping_slice_raw) == len(word_map_slice)):
                logging.warning("Mismatch raw slice lengths. Skipping segment.")
                continue
            cleaned_yomi_chars = []
            cleaned_mapping = []
            cleaned_word_map = []
            is_leading = True
            for i in range(len(yomi_slice_raw)):
                yomi_char = yomi_slice_raw[i]
                if yomi_char == '　': yomi_char = ' '
                if yomi_char != ' ' and yomi_char.isspace(): continue
                if is_leading and yomi_char == ' ': continue
                is_leading = False
                cleaned_yomi_chars.append(yomi_char)
                cleaned_mapping.append(mapping_slice_raw[i])
                cleaned_word_map.append(word_map_slice[i])
            if not cleaned_yomi_chars: continue
            yomi_split.append("".join(cleaned_yomi_chars))
            kanji_segment_chars = []
            last_word_index = -1
            for i in range(len(cleaned_yomi_chars)):
                current_word_index = cleaned_word_map[i]
                if current_word_index != last_word_index:
                    try:
                        kanji_segment_chars.append(words_data[current_word_index]['kanji'])
                        last_word_index = current_word_index
                    except IndexError:
                        logging.warning(f"Word map index {current_word_index} out of bounds.")
                        kanji_segment_chars.append(cleaned_yomi_chars[i])
                        last_word_index = -1
            kanji_split.append("".join(kanji_segment_chars))
            mapping_segment = []
            kanji_segment_start_index = -1
            for i in range(len(cleaned_yomi_chars)):
                original_kanji_index = cleaned_mapping[i]
                if kanji_segment_start_index == -1:
                    kanji_segment_start_index = original_kanji_index
                mapping_segment.append(original_kanji_index - kanji_segment_start_index)
            final_mapping_segments.append(mapping_segment)

        return jsonify(kanji=kanji_split, yomi=yomi_split, mapping=final_mapping_segments)
    except Exception as e:
        logging.error(f"API error: {e}")
        return jsonify(error="Internal server error."), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
