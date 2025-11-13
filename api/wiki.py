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


@app.route("/api/wiki", methods=["GET"])
def api_get_wiki():
    """
    Wikipediaの記事（タイトル＋要約）をランダムに取得し、
    読みの合計が GOAL_LENGTH に最も近くなるように組み合わせ、
    漢字かな混じり文と読みをそれぞれ分割したリストを返す API。
    """

    # ★★★ 修正: 蓄積データに word_map と words_data を追加 ★★★
    # [{'yomi': str, 'map': list, 'word_map': list, 'words_data': list}, ...]

    best_articles_data = []  # GOAL_LENGTH に最も近かった時点のデータ
    best_diff = sys.maxsize
    # best_total_length = 0      # (デバッグ用)

    current_articles_data = [] # 現在の試行で蓄積中のデータ
    current_total_length = 0
    current_diff = sys.maxsize

    for _ in range(15):
        title = get_random_title_from_search()
        if not title:
            continue

        summary = get_wiki_summary(title)
        if not summary:
            continue

        if has_unsupported_chars(summary) or has_unsupported_chars(title): # ★ タイトルもチェック
            continue

        title_furigana_result = get_furigana(title)
        summary_furigana_result = get_furigana(summary)

        if title_furigana_result and summary_furigana_result:

            # ★★★ 修正: furigana.py から4つの値を受け取る ★★★
            title_yomi_str, title_mapping, title_word_map, title_words_data = title_furigana_result
            summary_yomi_str, summary_mapping, summary_word_map, summary_words_data = summary_furigana_result

            # ★ 今回追加するデータ (タイトルと要約)
            data_to_add = [
                {
                    'yomi': title_yomi_str, 
                    'map': title_mapping, 
                    'word_map': title_word_map, 
                    'words_data': title_words_data
                },
                {
                    'yomi': summary_yomi_str, 
                    'map': summary_mapping, 
                    'word_map': summary_word_map, 
                    'words_data': summary_words_data
                }
            ]
            length_to_add = len(title_yomi_str) + len(summary_yomi_str)

            # yomi と mapping の長さが一致しているか確認 (furigana.py で保証されるはず)
            if len(title_yomi_str) != len(title_mapping) or len(summary_yomi_str) != len(summary_mapping):
                logging.warning(f"Wiki: Mismatch yomi/mapping length. Skipping.")
                continue

            # ★ yomi と word_map の長さもチェック
            if len(title_yomi_str) != len(title_word_map) or len(summary_yomi_str) != len(summary_word_map):
                logging.warning(f"Wiki: Mismatch yomi/word_map length. Skipping.")
                continue

            new_total_length = current_total_length + length_to_add
            new_diff = abs(GOAL_LENGTH - new_total_length)

            if new_diff < current_diff:
                # データを蓄積 (リストに要素を追加)
                current_articles_data.extend(data_to_add)

                current_total_length = new_total_length
                current_diff = new_diff

                if current_diff < best_diff:
                    best_articles_data = list(current_articles_data) # コピーを保持
                    best_diff = current_diff
                    # best_total_length = current_total_length # (デバッグ用)
            else:
                continue
        else:
            continue

    # --- ループ終了後 ---

    if not best_articles_data:
        return jsonify({"error": "適切な記事が見つかりませんでした"}), 500

    # ★★★ 修正: 確定したデータ (best_articles_data) に対して分割処理を行う ★★★

    final_yomi_list = []
    final_kanji_list = []
    final_mapping_list = [] # ★ レスポンス用の結合済みマッピングリスト

    for article_data in best_articles_data:
        yomi_text = article_data['yomi']
        mapping_list = article_data['map']
        # ★ 追加
        word_map = article_data['word_map']     # [0, 0, 0, 1, 2, 2, ...]
        words_data = article_data['words_data'] # [{'kanji': '社会', ...}, ...]

        # ★ レスポンス用にマッピングを結合
        final_mapping_list.extend(mapping_list)

        # 1. yomi_text (タイトル or 要約) を分割
        yomi_segments_data = split_with_context(yomi_text)

        for data in yomi_segments_data:
            final_yomi_list.append(data['segment']) # 空白除去済みの yomi

            start, end = data['start'], data['end'] # yomi_text (空白あり) でのスライス位置

            if start >= len(word_map):
                continue
            end = min(end, len(word_map))

            # ★★★ 修正: kanji 生成ロジックを word_map ベースに変更 ★★★

            # このセグメント (start, end) に対応する yomi_text (空白あり)
            yomi_slice_raw = yomi_text[start:end] 
            # このセグメントに対応する word_map のスライス
            word_map_slice = word_map[start:end]

            if len(yomi_slice_raw) != len(word_map_slice):
                 logging.warning(f"Wiki: Mismatch yomi_slice/word_map_slice length. Skipping segment.")
                 final_kanji_list.append("")
                 continue

            kanji_segment_chars = []
            last_word_index = -1 # 最後に処理した「空白以外のヨミ」の word インデックス

            for i in range(len(yomi_slice_raw)):
                yomi_char = yomi_slice_raw[i]

                if yomi_char.isspace():
                    continue # 空白は kanji セグメントに含めない (split_with_context の仕様)

                # --- ここに来るのは空白以外の yomi 文字 ---

                # この yomi 文字が対応する word のインデックス
                current_word_index = word_map_slice[i]

                # 最後に kanji を追加した word とインデックスが異なるか？
                if current_word_index != last_word_index:
                    # 異なる場合 (初めての文字か、新しい word に移った場合)
                    try:
                        kanji_segment_chars.append(words_data[current_word_index]['kanji'])
                        last_word_index = current_word_index
                    except IndexError:
                        logging.warning(f"Word map index {current_word_index} out of bounds.")
                        # フェイルセーフ: yomi 文字を追加
                        kanji_segment_chars.append(yomi_char)
                        last_word_index = -1 # リセット
                # else:
                    # (例: "しゃ" -> "かい")
                    # 同じ word インデックス (0) なので、kanji ("社会") を重複追加しない
                    pass

            final_kanji_list.append("".join(kanji_segment_chars))
            # ★★★ 修正ここまで ★★★

    # print(f"最終的な合計長: {best_total_length}, 最小差: {best_diff}") # (デバッグ用)

    response_data = jsonify(
        kanji=final_kanji_list,
        yomi=final_yomi_list,
        mapping=final_mapping_list # ★ 結合済みのリストを返す
    )

    # デバッグ用にコンソールにも結果を表示 (ログレベルINFO以上なら)
    # logging.info(f"Kanji: {final_kanji_list}")
    # logging.info(f"Yomi: {final_yomi_list}")

    response = make_response(response_data)
    return response


# --- サーバー起動（開発用） ---
if __name__ == '__main__':
    # (本番環境ではGunicornなどを使うため、これは実行されない想定)
    app.run(debug=True, port=5000)