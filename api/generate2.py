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
MIN_INTERVAL = 8  # 8秒空ける（1分に約7回 → 上限10回以下）


app = Flask(__name__)

# --- 設定 (Configuration) ---

# ロギング設定
logging.basicConfig(level=logging.INFO)

# Gemini APIキー
gemini_api_key = os.environ.get('GEMINI_API_KEY')
if not gemini_api_key:
    logging.warning("GEMINI_API_KEY environment variable not set. Text generation will fail.")
else:
    try:
        genai.configure(api_key=gemini_api_key)
        model = genai.GenerativeModel('gemini-2.5-flash-lite') # モデル名を更新
    except Exception as e:
        logging.error(f"Failed to configure Gemini: {e}")
        model = None

# プロンプト
prompt = "オリジナルで変な面白おかしい文章を書いて 「わかりました」とかはなしで文章だけ　300文字を目安に"

# キャッシュ設定
TEXT_CACHE = []  # ★★★ [ [kanji, yomi, mapping], [kanji, yomi, mapping], ... ] ★★★
MIN_CACHE_STOCK = 5  # 未使用の文章がこの数を下回ったら補充を試みる
MAX_CACHE_SIZE = 50  # キャッシュが膨らみすぎないように
generation_thread = None  # 補充スレッドが重複しないように

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
    GeminiとYahoo APIを使って新しい [kanji, yomi, mapping] のリストを生成する
    """
    if not model:
        logging.error("Gemini model is not initialized. Cannot generate text.")
        return None

    try:
        # 1. Geminiで文章生成
        response = safe_generate()
        if not response: # APIエラーなどでNoneが返ってきた場合
             raise Exception("Gemini API call failed or returned None.")
        message = response.text

        # 2. Yahoo APIでふりがな取得
        furigana_result = get_furigana(message)

        if furigana_result:
            yomi, mapping = furigana_result
            # ★ furigana.py 修正により、yomi と mapping の長さは一致するはず
            if len(yomi) != len(mapping):
                 logging.warning("Generate2: Mismatch yomi/mapping length AFTER get_furigana. Skipping.")
                 return None
            logging.info("Successfully generated new text and furigana.")
            return [message, yomi, mapping] # ★ mapping を追加
        else:
            logging.warning("Failed to get furigana for generated text.")
            return None

    except Exception as e:
        # Gemini APIが generate_content で失敗した場合もここでキャッチ
        logging.error(f"Text generation or Furigana Error: {e}")
        return None

def refill_cache_task():
    """キャッシュを非同期で補充するタスク"""
    global generation_thread
    try:
        if len(TEXT_CACHE) < MAX_CACHE_SIZE:
            logging.info("Refill task started...")
            new_data = generate_new_text_with_furigana() # [kanji, yomi, mapping]
            if new_data:
                # スレッドセーフではないが、デモ目的としては許容
                TEXT_CACHE.append(new_data)
                logging.info(f"Cache refilled. New size: {len(TEXT_CACHE)}")
            else:
                logging.warning("Refill task failed to generate data.")
    finally:
        generation_thread = None  # スレッド終了

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
    # 1. Cookieから使用済みindexを取得
    try:
        used_indices_json = request.cookies.get('used_indices', '[]')
        if not used_indices_json.startswith('[') or not used_indices_json.endswith(']'):
            raise json.JSONDecodeError("Invalid JSON format", used_indices_json, 0)

        used_indices = set(json.loads(used_indices_json))
    except (json.JSONDecodeError, TypeError):
        used_indices = set()

    # 2. 利用可能なindexを計算
    all_indices = set(range(len(TEXT_CACHE)))
    available_indices = list(all_indices - used_indices)

    # 3. キャッシュが十分かチェックし、必要なら補充（非同期）
    refill_cache_if_needed(len(available_indices))

    # 4. 利用可能な文章がない場合のフォールバック
    if not available_indices:
        logging.warning("No available text in cache. Attempting synchronous generation...")
        new_data = generate_new_text_with_furigana() # [kanji, yomi, mapping]

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
            yomi_text = new_data[1]
            mapping_list = new_data[2]

            yomi_segments_data = split_with_context(yomi_text)
            yomi_split = []
            kanji_split = []

            for data in yomi_segments_data:
                yomi_split.append(data['segment'])
                start, end = data['start'], data['end']

                if start >= len(mapping_list):
                    continue
                end = min(end, len(mapping_list))

                mapping_slice = mapping_list[start:end]
                yomi_slice_raw = yomi_text[start:end]

                # ★ 念のため長さチェック (furigana.py 修正により不要なはずだが)
                if len(yomi_slice_raw) != len(mapping_slice):
                    logging.warning(f"Generate2 (Fallback): Mismatch yomi_slice/mapping_slice length. Skipping segment.")
                    kanji_split.append("") # 空のセグメントを追加
                    continue

                kanji_segment_cleaned_chars = []
                for i in range(len(yomi_slice_raw)):
                    yomi_char = yomi_slice_raw[i]
                    if not yomi_char.isspace():
                        kanji_segment_cleaned_chars.append(mapping_slice[i])

                kanji_split.append("".join(kanji_segment_cleaned_chars))
            # ★★★ 修正ここまで ★★★

            response_data = jsonify(kanji=kanji_split, yomi=yomi_split, mapping=new_data[2])
            response = make_response(response_data)
            response.set_cookie('used_indices',
                                json.dumps(list(used_indices)),
                                max_age=3600*24*30,
                                httponly=True,
                                samesite='Lax')
            return response
        else:
            return jsonify(error="Failed to generate new text. API keys might be missing."), 500

    # 5. ランダムに選択
    selected_index = random.choice(available_indices)
    selected_data = TEXT_CACHE[selected_index] # [kanji, yomi, mapping]

    # 6. 使用済みindexを更新し、Cookieにセット
    used_indices.add(selected_index)
    if len(used_indices) >= len(TEXT_CACHE):
        logging.info("All cache items used by this client. Resetting cookie.")
        used_indices = {selected_index}

    # ★★★ 修正: kanji 再構築ロジック (キャッシュ) ★★★
    yomi_text = selected_data[1]
    mapping_list = selected_data[2]

    yomi_segments_data = split_with_context(yomi_text)
    yomi_split = []
    kanji_split = []

    for data in yomi_segments_data:
        yomi_split.append(data['segment'])
        start, end = data['start'], data['end']

        if start >= len(mapping_list):
            continue
        end = min(end, len(mapping_list))

        mapping_slice = mapping_list[start:end]
        yomi_slice_raw = yomi_text[start:end]

        # ★ 念のため長さチェック
        if len(yomi_slice_raw) != len(mapping_slice):
            logging.warning("Generate2 (Cache): Mismatch yomi_slice/mapping_slice length. Skipping segment.")
            kanji_split.append("")
            continue

        kanji_segment_cleaned_chars = []
        for i in range(len(yomi_slice_raw)):
            yomi_char = yomi_slice_raw[i]
            if not yomi_char.isspace():
                kanji_segment_cleaned_chars.append(mapping_slice[i])

        kanji_split.append("".join(kanji_segment_cleaned_chars))
    # ★★★ 修正ここまで ★★★

    response_data = jsonify(kanji=kanji_split, yomi=yomi_split, mapping=selected_data[2])
    print(f"responce_data: {response_data}")
    response = make_response(response_data)
    response.set_cookie('used_indices',
                        json.dumps(list(used_indices)),
                        max_age=3600*24*30,
                        httponly=True,
                        samesite='Lax')

    return response

# --- サーバー起動（開発用） ---
if __name__ == '__main__':
    # 開発サーバー起動時にキャッシュを温める
    if not TEXT_CACHE:
        logging.info("Priming cache on startup...")
        prime_thread = Thread(target=refill_cache_task)
        prime_thread.start()

    app.run(debug=True, port=5000)