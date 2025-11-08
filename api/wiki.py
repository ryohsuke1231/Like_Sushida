# api/wiki.py
import requests
import random
import json
from flask import Flask, request, jsonify, make_response
import logging
import os
import unicodedata
from threading import Thread

app = Flask(__name__)

# --- 設定 (Configuration) ---

# ロギング設定
logging.basicConfig(level=logging.INFO)
#bp = Blueprint("wiki", __name__, url_prefix="/api/wiki")
# Yahoo APIキー
APP_ID = os.environ.get("YAHOO_APP_ID")
API_URL = "https://jlp.yahooapis.jp/FuriganaService/V2/furigana"


def has_unsupported_chars(text):
    for ch in text:
        code = ord(ch)
        if (0x0000 <= code <= 0x007F or 0x3040 <= code <= 0x309F
                or 0x30A0 <= code <= 0x30FF or 0x4E00 <= code <= 0x9FFF
                or 0x3000 <= code <= 0x303F or 0xFF00 <= code <= 0xFFEF):
            continue
        return True
    return False


my_headers = {
    "User-Agent":
    "sushida-dev (contact: unker1231@gmail.com) - For a typing game"
}


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
    """Yahoo APIを呼び出してふりがなを取得する (タイピングゲーム用に調整)"""
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
            # "grade": 1 を削除。これにより「一」にもふりがなが振られる
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

        # --- ★★★ ここからが記号処理ロジック ★★★ ---

        # 1. タイピング用に変換する文字マップ
        # (必要に応じてここに追加・変更してください)
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
            '　': ' '  # 全角スペースを半角スペースに
        }

        # 2. タイピング対象としてそのまま残す記号
        # (ひらがな・カタカナ・長音記号以外)
        keep_symbols = {
            '、', '。', '・', '「', '」', '(', ')', '[', ']', '{', '}', '<', '>',
            '?', '!', ' ', ',', '.'
        }

        furigana_text = ""
        for word in data["result"]["word"]:
            if "furigana" in word:
                # 3. 漢字の読み (「一」は "いち" としてここに来る)
                furigana_text += word["furigana"]

            elif "surface" in word:
                # 4. 読みがない場合 (ひらがな、カタカナ、記号など)
                surface = word["surface"]

                for char in surface:
                    # 4a. 変換マップにある文字は変換して追加
                    if char in conversion_map:
                        furigana_text += conversion_map[char]
                        continue

                    # 4b. ひらがな(ぁ-ん)・カタカナ(ァ-ヶ)・長音記号(ー)かチェック
                    code = ord(char)
                    if (0x3041 <= code <= 0x309F) or \
                       (0x30A1 <= code <= 0x30F6) or \
                       (code == 0x30FC): # 長音記号 'ー'
                        furigana_text += char
                        continue

                    # 4c. 「、」「。」など、そのまま残す記号かチェック
                    if char in keep_symbols:
                        furigana_text += char
                        continue

                    # 4d. それ以外 (改行コードや絵文字など) は無視
                    # logging.info(f"Ignoring char: {char}") # デバッグ用

        # 最後にカタカナをひらがなに統一
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


def get_wiki_summary(title):
    url = "https://ja.wikipedia.org/w/api.php"
    params = {
        "action": "query",
        "format": "json",
        "prop": "extracts",
        "exintro": True,
        "explaintext": True,
        "titles": title
    }
    try:
        res = requests.get(url, params=params, headers=my_headers)
        res.raise_for_status()
        data = res.json()
        page = next(iter(data["query"]["pages"].values()))
        return page.get("extract", "")
    except:
        return ""


def get_random_title_from_search():
    url = "https://ja.wikipedia.org/w/api.php"
    categories = [
        "動物", "植物", "科学", "技術", "歴史", "地理", "数学", "物理学", "化学", "生物学", "天文学",
        "哲学", "経済学", "法律", "芸術", "スポーツ", "料理", "気象", "言語学"
    ]
    cat = random.choice(categories)
    params = {
        "action": "query",
        "format": "json",
        "list": "categorymembers",
        "cmtitle": f"Category:{cat}",
        "cmnamespace": 0,
        "cmlimit": 50,
    }
    try:
        res = requests.get(url, params=params, headers=my_headers)
        res.raise_for_status()
        data = res.json()
        members = data.get("query", {}).get("categorymembers", [])
        if not members:
            return None
        return random.choice(members)["title"]
    except:
        return None


@app.route("/api/wiki", methods=["GET"])
def api_get_wiki():
    for _ in range(15):  # 最大15回まで試す
        title = get_random_title_from_search()
        if not title:
            continue

        summary = get_wiki_summary(title)
        if not summary:
            continue

        if has_unsupported_chars(summary):
            continue

        response_data = jsonify(kanji=summary, yomi=get_furigana(summary))
        response = make_response(response_data)
        return response

    return jsonify({"error": "記事が見つかりませんでした"}), 500

# --- サーバー起動（開発用） ---
if __name__ == '__main__':
    # (本番環境ではGunicornなどを使うため、これは実行されない想定)
    app.run(debug=True, port=5000)
