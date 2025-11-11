# api/wiki.py
import requests
import random
import json
from flask import Flask, request, jsonify, make_response
import logging
import os
import unicodedata # ★ 削除 (furigana.pyへ移動)
from threading import Thread

# ★ 新規: furigana.py からインポート
from furigana import get_furigana

app = Flask(__name__)

# --- 設定 (Configuration) ---

# ロギング設定
logging.basicConfig(level=logging.INFO)

# ★ 削除 (furigana.pyへ移動)
# APP_ID = os.environ.get("YAHOO_APP_ID")
# API_URL = "https://jlp.yahooapis.jp/FuriganaService/V2/furigana"


def has_unsupported_chars(text):
    """(この関数はWikipediaのサマリーチェック用なので、ここに残します)"""
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

# ★ 削除 (furigana.pyへ移動)
# def kata_to_hira(s):
#     ...

# ★ 削除 (furigana.pyへ移動)
# def get_furigana(message):
#     ...


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

        # ★★★ 修正: get_furigana の戻り値がタプル (yomi, mapping) に
        furigana_result = get_furigana(summary)

        if furigana_result:
            yomi, mapping = furigana_result
            response_data = jsonify(kanji=summary, yomi=yomi, mapping=mapping) # ★ mapping を追加
            response = make_response(response_data)
            return response
        else:
            # ふりがな取得に失敗した場合は次のループへ
            continue

    return jsonify({"error": "記事が見つかりませんでした"}), 500

# --- サーバー起動（開発用） ---
if __name__ == '__main__':
    # (本番環境ではGunicornなどを使うため、これは実行されない想定)
    app.run(debug=True, port=5000)