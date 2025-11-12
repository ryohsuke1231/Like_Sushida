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
from lib.furigana import get_furigana
from lib.splitWithContext import split_with_context
import sys

app = Flask(__name__)

# --- 設定 (Configuration) ---

# ロギング設定
logging.basicConfig(level=logging.INFO)
GOAL_LENGTH = 300

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

"""
@app.route("/api/wiki", methods=["GET"])
def api_get_wiki():
    res_yomi = []
    res_kanji = []
    total_length = 0
    #前回のtotal_lengthとの差
    diff = 0
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
        title_furigana = get_furigana(title)
        if furigana_result and title_furigana:
            yomi, mapping = furigana_result
            res_yomi.append(title_furigana)
            res_yomi.append(yomi)
            res_kanji.append(title)
            res_kanji.append(summary)
            # 文字数チェック
            yomi_total = 0
            for i in yomi:
                yomi_total += len(i)
            now_diff = total_length - yomi_total
            total_length += yomi_total
            # 300文字以上になったら終了
            if  total_length > GOAL_LENGTH:
                response_data = jsonify(kanji=(split_with_context(summ) for summ in res_kanji), yomi=(split_with_context(yomi) for yomi in res_yomi), mapping=mapping) # ★ mapping を追加
                response = make_response(response_data)
                return response
            else:
                continue
        else:
            # ふりがな取得に失敗した場合は次のループへ
            continue

    return jsonify({"error": "記事が見つかりませんでした"}), 500
"""
@app.route("/api/wiki", methods=["GET"])
def api_get_wiki():
    """
    Wikipediaの記事（タイトル＋要約）をランダムに取得し、
    読みの合計が GOAL_LENGTH に最も近くなるように組み合わせ、
    漢字かな混じり文と読みをそれぞれ分割したリストを返す API。
    """

    # ループ全体で GOAL_LENGTH に最も近かった時点のデータを保持する変数
    best_yomi_segments = []   # 読み (ふりがな) のセグメント (str) のフラットなリスト
    best_kanji_segments = []  # 漢字かな混じり文 (str) のフラットなリスト
    best_mapping = {}         # 最後のふりがなマッピング
    best_diff = sys.maxsize   # GOAL_LENGTH との最小の絶対差
    # best_total_length = 0     # (デバッグ用) その時の合計長

    # 現在の試行で蓄積中のデータ
    current_yomi_segments = []
    current_kanji_segments = []
    current_mapping = {}
    current_total_length = 0

    # 現在の GOAL_LENGTH との絶対差
    # (sys.maxsize にしておくと、最初の記事は必ず「より近い」と判断される)
    current_diff = sys.maxsize 

    for _ in range(15):  # 最大15回まで試す
        title = get_random_title_from_search()
        if not title:
            continue

        summary = get_wiki_summary(title)
        if not summary:
            continue

        if has_unsupported_chars(summary):
            continue

        # タイトルと要約のふりがなを取得
        title_furigana_result = get_furigana(title)
        summary_furigana_result = get_furigana(summary)

        if title_furigana_result and summary_furigana_result:
            title_yomi_list, title_mapping = title_furigana_result
            summary_yomi_list, summary_mapping = summary_furigana_result

            # 今回追加しようとする読みのリストと長さ
            yomi_list_to_add = title_yomi_list + summary_yomi_list
            length_to_add = sum(len(y) for y in yomi_list_to_add)

            # 追加した場合の新しい合計長と GOAL との差
            new_total_length = current_total_length + length_to_add
            new_diff = abs(GOAL_LENGTH - new_total_length)

            # ★★★ 要件1: GOAL_LENGTH により近づく場合のみ追加 ★★★
            # (new_diff < current_diff)
            # 注意: <= にすると、同じ差の場合は追加し続けることになる。
            #       < の場合、GOAL_LENGTH から遠ざかった時点で追加が止まる。
            #       ここでは「近づく限り」追加し続けるため < を採用。
            if new_diff < current_diff:
                # データを蓄積
                current_yomi_segments.extend(yomi_list_to_add)
                current_kanji_segments.append(title)
                current_kanji_segments.append(summary)

                # マッピングはタイトルと要約をマージ (キーが重複した場合は要約側で上書き)
                current_mapping.update(title_mapping)
                current_mapping.update(summary_mapping)

                # 合計長と差を更新
                current_total_length = new_total_length
                current_diff = new_diff

                # ★★★ 現時点での蓄積データが、過去のベストより優れているかチェック ★★★
                # (GOAL_LENGTH を超えても、より近ければベストとして記録)
                if current_diff < best_diff:
                    best_yomi_segments = list(current_yomi_segments)   # コピーを保持
                    best_kanji_segments = list(current_kanji_segments)  # コピーを保持
                    best_mapping = dict(current_mapping)              # コピーを保持
                    best_diff = current_diff
                    # best_total_length = current_total_length # (デバッグ用)

            else:
                # 追加すると GOAL_LENGTH から遠ざかる、または変わらない
                # (このループではこれ以上追加しないが、次のループで別の記事を試す)
                continue

        else:
            # ふりがな取得に失敗した場合は次のループへ
            continue

    # --- ループ終了後 (15回試行後) ---

    # 最終的に、GOAL_LENGTH に最も近かった時点のデータを採用
    if not best_kanji_segments:
        # 一度も記事が追加されなかった場合 (ふりがな取得失敗が続いた等)
        return jsonify({"error": "適切な記事が見つかりませんでした"}), 500

    # ★★★ 要件2: split_with_context を適用し、フラットなリストを作成 ★★★

    # best_kanji_segments は [title1, summary1, title2, summary2, ...] という list[str]
    final_kanji_list = []
    for kanji_text_str in best_kanji_segments:
        # split_with_context(str) は list[str] を返す
        final_kanji_list.extend(split_with_context(kanji_text_str))

    # best_yomi_segments は [yomi1, yomi2, yomi3, ...] という list[str]
    final_yomi_list = []
    for yomi_text_str in best_yomi_segments:
        # split_with_context(str) は list[str] を返す
        final_yomi_list.extend(split_with_context(yomi_text_str))

    # print(f"最終的な合計長: {best_total_length}, 最小差: {best_diff}") # (デバッグ用)

    response_data = jsonify(
        kanji=final_kanji_list, 
        yomi=final_yomi_list, 
        mapping=best_mapping
    )
    response = make_response(response_data)
    return response


# --- サーバー起動（開発用） ---
if __name__ == '__main__':
    # (本番環境ではGunicornなどを使うため、これは実行されない想定)
    app.run(debug=True, port=5000)