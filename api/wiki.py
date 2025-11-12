# api/wiki.py
import requests
import random
import json
from flask import Flask, request, jsonify, make_response
import logging
import os
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

# ★ 削除: 古いコメントアウトされた実装
# """
# @app.route("/api/wiki", methods=["GET"])
# ...
# """

# ★ 削除: list_to_dict (マッピングリストを直接使うため不要)
# def list_to_dict(mapping_list, yomi_text):
#     ...

@app.route("/api/wiki", methods=["GET"])
def api_get_wiki():
    """
    Wikipediaの記事（タイトル＋要約）をランダムに取得し、
    読みの合計が GOAL_LENGTH に最も近くなるように組み合わせ、
    漢字かな混じり文と読みをそれぞれ分割したリストを返す API。
    """

    # ★★★ 修正: 蓄積データを (str, str, list) に変更 ★★★
    # ループ全体で GOAL_LENGTH に最も近かった時点のデータを保持する変数
    best_yomi_text = ""       # 読み (ふりがな) の結合済み文字列
    best_kanji_text = ""      # 漢字かな混じり文 の結合済み文字列 (分割前の原文)
    best_mapping_list = []    # 結合済みのマッピングリスト
    best_diff = sys.maxsize   # GOAL_LENGTH との最小の絶対差
    # best_total_length = 0     # (デバッグ用)

    # 現在の試行で蓄積中のデータ
    current_yomi_text = ""
    current_kanji_text = ""
    current_mapping_list = []
    current_total_length = 0
    current_diff = sys.maxsize

    for _ in range(15):
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
            # ★★★ 修正: get_furigana の戻り値 (str, list) を正しく受け取る
            title_yomi_str, title_mapping = title_furigana_result
            summary_yomi_str, summary_mapping = summary_furigana_result

            # 今回追加しようとする文字列とマッピング
            yomi_str_to_add = title_yomi_str + summary_yomi_str
            kanji_str_to_add = title + summary # ★ 原文も結合する
            mapping_list_to_add = title_mapping + summary_mapping
            length_to_add = len(yomi_str_to_add) # ★ str の長さ

            # yomi と mapping の長さが一致しているか確認 (重要)
            if len(yomi_str_to_add) != len(mapping_list_to_add):
                logging.warning(f"Wiki: Mismatch yomi/mapping length for title/summary. Skipping.")
                continue

            # 追加した場合の新しい合計長と GOAL との差
            new_total_length = current_total_length + length_to_add
            new_diff = abs(GOAL_LENGTH - new_total_length)

            # ★★★ GOAL_LENGTH により近づく場合のみ追加 ★★★
            if new_diff < current_diff:
                # データを蓄積 (文字列・リストを結合)
                current_yomi_text += yomi_str_to_add
                current_kanji_text += kanji_str_to_add
                current_mapping_list.extend(mapping_list_to_add)

                # 合計長と差を更新
                current_total_length = new_total_length
                current_diff = new_diff

                # ★★★ 現時点での蓄積データが、過去のベストより優れているかチェック ★★★
                if current_diff < best_diff:
                    best_yomi_text = current_yomi_text
                    best_kanji_text = current_kanji_text
                    best_mapping_list = list(current_mapping_list) # コピーを保持
                    best_diff = current_diff
                    # best_total_length = current_total_length # (デバッグ用)

            else:
                # 遠ざかる場合は追加しない
                continue

        else:
            # ふりがな取得に失敗した場合は次のループへ
            continue

    # --- ループ終了後 (15回試行後) ---

    if not best_kanji_text: # (best_yomi_text や best_mapping_list でも可)
        # 一度も記事が追加されなかった場合
        return jsonify({"error": "適切な記事が見つかりませんでした"}), 500

    # ★★★ 要件2: mapping を利用して分割 (generate2.py と同じロジック) ★★★

    # 1. best_yomi_text (結合済み yomi) を分割
    yomi_segments_data = split_with_context(best_yomi_text)

    final_yomi_list = []
    final_kanji_list = []

    for data in yomi_segments_data:
        final_yomi_list.append(data['segment']) # 空白除去済みの yomi

        start, end = data['start'], data['end'] # 空白除去前の yomi インデックス

        # yomi_text や mapping_list が空の場合のケア
        if start >= len(best_mapping_list):
            continue

        end = min(end, len(best_mapping_list))

        mapping_slice = best_mapping_list[start:end]
        yomi_slice_raw = best_yomi_text[start:end]

        kanji_segment_cleaned_chars = []
        for i in range(len(yomi_slice_raw)):
            yomi_char = yomi_slice_raw[i]
            if not yomi_char.isspace(): # yomi が空白でないなら
                kanji_segment_cleaned_chars.append(mapping_slice[i])

        final_kanji_list.append("".join(kanji_segment_cleaned_chars))

    # print(f"最終的な合計長: {best_total_length}, 最小差: {best_diff}") # (デバッグ用)

    response_data = jsonify(
        kanji=final_kanji_list,  
        yomi=final_yomi_list,  
        mapping=best_mapping_list # ★ 結合済みのリストを返す
    )
    response = make_response(response_data)
    return response


# --- サーバー起動（開発用） ---
if __name__ == '__main__':
    # (本番環境ではGunicornなどを使うため、これは実行されない想定)
    app.run(debug=True, port=5000)