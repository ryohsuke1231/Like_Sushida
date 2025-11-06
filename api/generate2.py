import google.generativeai as genai
import requests
from flask import Flask, request, jsonify, make_response
import os
import json
import unicodedata
import random
import logging
from threading import Thread

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
        model = genai.GenerativeModel('gemini-2.5-flash')
    except Exception as e:
        logging.error(f"Failed to configure Gemini: {e}")
        model = None

# Yahoo APIキー
APP_ID = os.environ.get("YAHOO_APP_ID")
API_URL = "https://jlp.yahooapis.jp/FuriganaService/V2/furigana"

# プロンプト
prompt = "変な面白おかしい文章を書いて 「わかりました」とかはなしで文章だけ　300文字を目安に"

# キャッシュ設定
TEXT_CACHE = [] # [ [kanji, yomi], [kanji, yomi], ... ]
MIN_CACHE_STOCK = 5 # 未使用の文章がこの数を下回ったら補充を試みる
MAX_CACHE_SIZE = 50 # キャッシュが膨らみすぎないように
generation_thread = None # 補充スレッドが重複しないように

# --- ヘルパー関数 (Helper Functions) ---

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
    """Yahoo APIを呼び出してふりがなを取得する"""
    if not APP_ID:
        logging.error("YAHOO_APP_ID not set. Cannot get furigana.")
        return None

    headers = {"Content-Type": "application/json"}
    payload = {
        "id": "1234-1",
        "jsonrpc": "2.0",
        "method": "jlp.furiganaservice.furigana",
        "params": {
            "q": message,
            "grade": 1
        }
    }

    try:
        response = requests.post(API_URL,
                                 headers=headers,
                                 data=json.dumps(payload),
                                 params={"appid": APP_ID},
                                 timeout=10) # タイムアウト設定
        response.raise_for_status()
        data = response.json()

        if "error" in data:
             logging.error(f"Yahoo API Error: {data['error']['message']}")
             return None

        if "result" not in data or "word" not in data["result"]:
             logging.error(f"Yahoo API unexpected response: {data}")
             return None

        furigana_text = ""
        for word in data["result"]["word"]:
            if "furigana" in word:
                furigana_text += word["furigana"]
            elif "surface" in word:
                furigana_text += word["surface"]

        return kata_to_hira(furigana_text)

    except requests.exceptions.RequestException as e:
        logging.error(f"Yahoo API Request Error: {e}")
        return None
    except json.JSONDecodeError:
        logging.error(f"Yahoo API JSON Decode Error: {response.text}")
        return None
    except Exception as e:
        logging.error(f"Yahoo API Unknown Error: {e}")
        return None


def generate_new_text_with_furigana():
    """GeminiとYahoo APIを使って新しい [kanji, yomi] のペアを生成する"""
    if not model:
        logging.error("Gemini model is not initialized. Cannot generate text.")
        return None

    try:
        # 1. Geminiで文章生成
        response = model.generate_content(prompt)
        message = response.text

        # 2. Yahoo APIでふりがな取得
        furigana = get_furigana(message)

        if furigana:
            logging.info("Successfully generated new text and furigana.")
            return [message, furigana]
        else:
            logging.warning("Failed to get furigana for generated text.")
            return None

    except Exception as e:
        logging.error(f"Gemini API Error: {e}")
        return None

def refill_cache_task():
    """キャッシュを非同期で補充するタスク"""
    global generation_thread
    try:
        if len(TEXT_CACHE) < MAX_CACHE_SIZE:
            logging.info("Refill task started...")
            new_data = generate_new_text_with_furigana()
            if new_data:
                # スレッドセーフではないが、デモ目的としては許容
                TEXT_CACHE.append(new_data)
                logging.info(f"Cache refilled. New size: {len(TEXT_CACHE)}")
            else:
                logging.warning("Refill task failed to generate data.")
    finally:
        generation_thread = None # スレッド終了

def refill_cache_if_needed(available_indices_count):
    """キャッシュのストックが少なければ非同期で補充を開始する"""
    global generation_thread
    # キャッシュが上限に達しておらず、
    # 未使用が閾値を下回り、
    # 既に補充スレッドが実行中でない場合
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
        # Cookieが空や不正な値の場合を考慮
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
        # 強制的に新しいものを生成（同期処理なのでレスポンスが遅れる）
        new_data = generate_new_text_with_furigana()

        if new_data:
            # キャッシュに追加
            if len(TEXT_CACHE) < MAX_CACHE_SIZE:
                 TEXT_CACHE.append(new_data)
                 new_index = len(TEXT_CACHE) - 1
            else:
                 # キャッシュが満杯なら古いものを上書き（例：0番目）
                 TEXT_CACHE[0] = new_data
                 new_index = 0

            # new_indexを使用済みにする
            used_indices.add(new_index)

            # Cookieの肥大化を防ぐため、キャッシュサイズを超えたらリセット
            if len(used_indices) >= len(TEXT_CACHE):
                 used_indices = {new_index} # 今回使ったものだけにする

            response_data = jsonify(kanji=new_data[0], yomi=new_data[1])
            response = make_response(response_data)
            response.set_cookie('used_indices', 
                                json.dumps(list(used_indices)), 
                                max_age=3600*24*30, # 30 days
                                httponly=True,
                                samesite='Lax')
            return response

        else:
            # 本当に何も返せない場合
            return jsonify(error="Failed to generate new text. API keys might be missing."), 500

    # 5. ランダムに選択
    selected_index = random.choice(available_indices)
    selected_data = TEXT_CACHE[selected_index]

    # 6. 使用済みindexを更新し、Cookieにセット
    used_indices.add(selected_index)

    # Cookieの肥大化を防ぐ（もし使用済みがキャッシュ全体になったらリセット）
    if len(used_indices) >= len(TEXT_CACHE):
        logging.info("All cache items used by this client. Resetting cookie.")
        used_indices = {selected_index} # 今回のものだけ保持

    response_data = jsonify(kanji=selected_data[0], yomi=selected_data[1])
    response = make_response(response_data)
    # httponly=True, samesite='Lax' を推奨
    response.set_cookie('used_indices', 
                        json.dumps(list(used_indices)), 
                        max_age=3600*24*30, # 30 days
                        httponly=True, 
                        samesite='Lax') 

    return response

# --- サーバー起動（開発用） ---
if __name__ == '__main__':
    # 開発サーバー起動時にキャッシュを温める
    # (本番環境ではGunicornなどを使うため、これは実行されない想定)
    if not TEXT_CACHE:
        logging.info("Priming cache on startup...")
        prime_thread = Thread(target=refill_cache_task)
        prime_thread.start()

    app.run(debug=True, port=5000)