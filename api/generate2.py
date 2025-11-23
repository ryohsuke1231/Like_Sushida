# api/generate2.py
import os
import json
import time
import random
import logging
import threading
from queue import Queue
from threading import Thread

import google.generativeai as genai
from flask import Flask, request, jsonify, make_response

# 既存のライブラリ
from lib.furigana_sudachi import get_furigana
from lib.splitWithContext import split_with_context

# ----------------------------
# 設定
# ----------------------------
logging.basicConfig(level=logging.INFO)
app = Flask(__name__)

# Gemini SDK 初期化
gemini_api_key = os.environ.get('GEMINI_API_KEY')
if not gemini_api_key:
    logging.warning("GEMINI_API_KEY not set; generation will fail.")
    model = None
else:
    try:
        genai.configure(api_key=gemini_api_key)
        model = genai.GenerativeModel('gemini-2.0-flash-lite')  # ここは自由に変えてOK
    except Exception as e:
        logging.error(f"Failed to configure Gemini SDK: {e}")
        model = None

# デフォルトプロンプト
DEFAULT_PROMPT = ("変な面白おかしい文章を書いて！ 奇妙な話でも、日常についての話でもなんでもいいです！ "
                  "「わかりました」とかはなしで文章だけ　300文字を目安に")

# レート関連（API仕様上の安全措置）
MIN_INTERVAL = 3.0  # 秒（APIがburstを嫌う場合はこれを長めに）

# キャッシュ関連
TEXT_CACHE = []               # 各要素は [yomi_text, mapping_list, word_map, words_data] のタプル
TEXT_CACHE_LOCK = threading.Lock()
MIN_CACHE_STOCK = 5
MAX_CACHE_SIZE = 50

# 補充スレッド管理
generation_thread = None
generation_thread_lock = threading.Lock()

# ジョブキュー（Gemini呼び出しを直列化）
JOB_QUEUE = Queue()
WORKER_RUNNING = True
LAST_GENERATE_TIME = 0.0
LAST_GENERATE_LOCK = threading.Lock()

# ----------------------------
# ヘルパー：レスポンスからテキスト抽出（堅牢処理）
# ----------------------------
def extract_text_from_sdk_response(resp):
    """
    SDK が返すレスポンスはバージョンにより構造が違うことがあるため、
    安全に文字列を取り出すユーティリティ。
    """
    if resp is None:
        return None
    # そのまま文字列が返ってくるケース
    if isinstance(resp, str):
        return resp
    # オブジェクトに .text があれば使う
    if hasattr(resp, "text"):
        try:
            return resp.text
        except Exception:
            pass
    # dict-like の可能性
    try:
        if isinstance(resp, dict):
            # common path: {"candidates":[{"content":{"parts":[{"text": "..."}]}}]}
            c = resp.get("candidates")
            if c and isinstance(c, list) and len(c) > 0:
                part = c[0].get("content", {}).get("parts", [])
                if part and isinstance(part, list) and len(part) > 0:
                    t = part[0].get("text")
                    if t:
                        return t
    except Exception:
        pass
    # 最後の手段：文字列化
    try:
        s = str(resp)
        return s
    except Exception:
        return None

# ----------------------------
# ワーカー：キューからジョブを取り、generate を直列で叩く
# ----------------------------
def gemini_worker():
    global LAST_GENERATE_TIME
    logging.info("Gemini worker started.")
    while WORKER_RUNNING:
        job = JOB_QUEUE.get()
        if job is None:
            JOB_QUEUE.task_done()
            break
        resolver, prompt = job  # resolver: callable(result_str_or_None), prompt: str
        try:
            # API間隔を守る（共有タイムスタンプ）
            with LAST_GENERATE_LOCK:
                now = time.time()
                wait = MIN_INTERVAL - (now - LAST_GENERATE_TIME)
                if wait > 0:
                    logging.info(f"Worker sleeping {wait:.2f}s to respect MIN_INTERVAL.")
                    time.sleep(wait)
                LAST_GENERATE_TIME = time.time()

            # 実際の SDK 呼び出し
            try:
                sdk_resp = model.generate_content(prompt)
            except Exception as e:
                logging.error(f"Gemini SDK generate_content error: {e}")
                resolver(None)
                JOB_QUEUE.task_done()
                continue

            text = extract_text_from_sdk_response(sdk_resp)
            resolver(text)
        except Exception as e:
            logging.exception(f"Unexpected worker error: {e}")
            resolver(None)
        finally:
            JOB_QUEUE.task_done()

# ワーカースレッド起動（デーモン）
worker_thread = Thread(target=gemini_worker, daemon=True)
worker_thread.start()

# ----------------------------
# enqueue: 呼び出し側がキューに入れて結果を同期で取得するユーティリティ
# ----------------------------
def enqueue_gemini_request(prompt):
    """
    prompt をキューに入れ、ワーカーが実行して返すのを待つ。返り値は文字列か None。
    """
    result_holder = {"value": None}
    ev = threading.Event()

    def resolver(val):
        result_holder["value"] = val
        ev.set()

    JOB_QUEUE.put((resolver, prompt))
    ev.wait()
    return result_holder["value"]

# ----------------------------
# generate + furigana 全体の流れ
# ----------------------------
def generate_new_text_with_furigana(prompt_text):
    """
    prompt_text を使って Gemini で文章生成 → ふりがな処理。
    返り値: [yomi_text, mapping_list, word_map, words_data] または None
    """
    if model is None:
        logging.error("Model not initialized.")
        return None

    # 生成プロンプトに安全命令を追加（絵文字やMarkdownを使わない等）
    safe_prompt = (prompt_text +
                   "\nただし、答える際はMarkdown記号（*, -, #, ` など）や絵文字、特殊記号（ASCII外）を一切使わないでください。"
                   "絶対です。文章のみで回答してください。")

    text = enqueue_gemini_request(safe_prompt)
    if not text:
        logging.warning("Gemini generation returned no text.")
        return None

    # get_furigana は外部 lib。ここが [yomi, mapping, word_map, words_data] を返す想定
    try:
        furigana_result = get_furigana(text)
    except Exception as e:
        logging.exception(f"get_furigana failed: {e}")
        return None

    if not furigana_result:
        logging.warning("get_furigana returned falsy.")
        return None

    yomi_text, mapping_list, word_map, words_data = furigana_result

    # 基本検査
    if not (isinstance(yomi_text, str) and isinstance(mapping_list, list) and isinstance(word_map, list) and isinstance(words_data, list)):
        logging.warning("generate_new_text_with_furigana: unexpected types from get_furigana.")
        return None

    if len(yomi_text) != len(mapping_list) or len(yomi_text) != len(word_map):
        logging.warning("generate_new_text_with_furigana: length mismatch.")
        return None

    return [yomi_text, mapping_list, word_map, words_data]

# ----------------------------
# キャッシュ補充タスク（非同期）
# ----------------------------
def refill_cache_task():
    global generation_thread
    try:
        logging.info("refill_cache_task started.")
        # 補充は1つずつ生成して追加（安全）
        while True:
            with TEXT_CACHE_LOCK:
                if len(TEXT_CACHE) >= MAX_CACHE_SIZE:
                    logging.info("Cache reached MAX_CACHE_SIZE; stopping refill.")
                    break
                # 目標在庫
                if len(TEXT_CACHE) >= MIN_CACHE_STOCK:
                    logging.info("Cache stock sufficient; stopping refill.")
                    break
            # 生成して追加（失敗なら少し待ってリトライ）
            new_data = generate_new_text_with_furigana(DEFAULT_PROMPT)
            if new_data:
                with TEXT_CACHE_LOCK:
                    if len(TEXT_CACHE) >= MAX_CACHE_SIZE:
                        break
                    TEXT_CACHE.append(new_data)
                    logging.info(f"Cache appended; size={len(TEXT_CACHE)}")
            else:
                logging.warning("Failed to generate new_data during refill; sleeping 2s before retry.")
                time.sleep(2)
    finally:
        with generation_thread_lock:
            generation_thread = None
        logging.info("refill_cache_task finished.")

def refill_cache_if_needed(available_indices_count):
    global generation_thread
    with generation_thread_lock:
        if (len(TEXT_CACHE) < MAX_CACHE_SIZE and
                available_indices_count < MIN_CACHE_STOCK and
                (generation_thread is None or not generation_thread.is_alive())):
            logging.info("Starting generation_thread to refill cache...")
            generation_thread = Thread(target=refill_cache_task, daemon=True)
            generation_thread.start()

# ----------------------------
# safe_generate wrapper（互換用）
# ----------------------------
def safe_generate(prompt_text=None):
    """
    互換性のために用意。prompt_text を渡さなければ DEFAULT_PROMPT を使う。
    結果は常に文字列か None を返す。
    """
    if prompt_text is None:
        prompt_text = DEFAULT_PROMPT
    return enqueue_gemini_request(prompt_text)

# ----------------------------
# API エンドポイント
# ----------------------------
@app.route('/api/generate2', methods=['GET'])
def generate_text():
    try:
        # used_indices cookie の取り扱い（以前の仕様互換）
        try:
            used_indices_json = request.cookies.get('used_indices', '[]')
            loaded_data = json.loads(used_indices_json)
            if not isinstance(loaded_data, list):
                raise TypeError("Cookie is not a JSON list")
            used_indices = set(loaded_data)
        except Exception:
            used_indices = set()

        # available indices
        with TEXT_CACHE_LOCK:
            all_indices = set(range(len(TEXT_CACHE)))
        available_indices = list(all_indices - used_indices)

        # 補充が必要なら非同期開始
        refill_cache_if_needed(len(available_indices))

        # キャッシュに何もなければ同期生成（フォールバック）
        if not available_indices:
            logging.warning("No available text in cache. Generating synchronously as fallback...")
            new_data = generate_new_text_with_furigana(DEFAULT_PROMPT)
            if not new_data:
                return jsonify(error="Failed to generate new text. API keys might be missing or generation failed."), 500
            # 追加 or 置換
            with TEXT_CACHE_LOCK:
                if len(TEXT_CACHE) < MAX_CACHE_SIZE:
                    TEXT_CACHE.append(new_data)
                    new_index = len(TEXT_CACHE) - 1
                else:
                    TEXT_CACHE[0] = new_data
                    new_index = 0
            used_indices.add(new_index)
            if len(used_indices) >= len(TEXT_CACHE):
                used_indices = {new_index}

            # フォールバック用と同じ組み立て処理へ渡す
            selected_data = new_data
        else:
            # ランダム選択（キャッシュから）
            selected_index = random.choice(available_indices)
            with TEXT_CACHE_LOCK:
                selected_data = TEXT_CACHE[selected_index]

            used_indices.add(selected_index)
            with TEXT_CACHE_LOCK:
                if len(used_indices) >= len(TEXT_CACHE):
                    logging.info("All cache items used by this client. Resetting used_indices to current selection.")
                    used_indices = {selected_index}

        # selected_data を分解して最終出力を作成（元のロジックを保つ）
        yomi_text = selected_data[0]
        mapping_list = selected_data[1]
        word_map = selected_data[2]
        words_data = selected_data[3]

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
                if yomi_char == '　':
                    yomi_char = ' '
                if yomi_char != ' ' and yomi_char.isspace():
                    continue
                if is_leading and yomi_char == ' ':
                    continue
                is_leading = False
                cleaned_yomi_chars.append(yomi_char)
                cleaned_mapping.append(mapping_slice_raw[i])
                cleaned_word_map.append(word_map_slice[i])

            if not cleaned_yomi_chars:
                continue

            yomi_split.append("".join(cleaned_yomi_chars))

            # kanji
            kanji_segment_chars = []
            last_word_index = -1
            for i in range(len(cleaned_yomi_chars)):
                current_word_index = cleaned_word_map[i]
                if current_word_index != last_word_index:
                    try:
                        kanji_segment_chars.append(words_data[current_word_index]['kanji'])
                        last_word_index = current_word_index
                    except Exception:
                        logging.warning(f"Word map index out of bounds: {current_word_index}")
                        kanji_segment_chars.append(cleaned_yomi_chars[i])
                        last_word_index = -1
            kanji_split.append("".join(kanji_segment_chars))

            # mapping
            mapping_segment = []
            kanji_segment_start_index = -1
            for i in range(len(cleaned_yomi_chars)):
                original_kanji_index = cleaned_mapping[i]
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

    except Exception as e:
        logging.exception(f"Unexpected error in /api/generate2: {e}")
        return jsonify(error="Internal server error"), 500

# ----------------------------
# 起動時キャッシュ priming（軽く埋める）
# ----------------------------
def prime_cache_on_startup(n=MIN_CACHE_STOCK):
    # 非同期でゆっくり埋める（blockingしない）
    def _prime():
        logging.info("Priming cache on startup...")
        for _ in range(n):
            try:
                new_data = generate_new_text_with_furigana(DEFAULT_PROMPT)
                if new_data:
                    with TEXT_CACHE_LOCK:
                        if len(TEXT_CACHE) < MAX_CACHE_SIZE:
                            TEXT_CACHE.append(new_data)
                            logging.info(f"Primed cache size={len(TEXT_CACHE)}")
                else:
                    logging.warning("Priming: failed to generate one item.")
                    time.sleep(1)
            except Exception:
                logging.exception("Priming item failed, continuing.")
                time.sleep(1)
        logging.info("Priming finished.")
    t = Thread(target=_prime, daemon=True)
    t.start()

# ----------------------------
# アプリ開始
# ----------------------------
if __name__ == "__main__":
    prime_cache_on_startup()
    app.run(debug=True, port=5000)
