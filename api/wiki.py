# api/wiki.py
import requests
import random
import json
from flask import Flask, request, jsonify, make_response
import logging
import os
from threading import Thread

# ★ 新規: furigana.py からインポート
from lib.furigana_sudachi import get_furigana
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

    best_articles_data = [] 
    best_diff = sys.maxsize
    # best_total_length = 0 

    current_articles_data = [] 
    current_total_length = 0
    current_diff = sys.maxsize

    for _ in range(15):
        title = get_random_title_from_search()
        if not title:
            continue

        summary = get_wiki_summary(title)
        if not summary:
            continue

        if has_unsupported_chars(summary) or has_unsupported_chars(title): 
            continue

        title_furigana_result = get_furigana(title)
        summary_furigana_result = get_furigana(summary)

        if title_furigana_result and summary_furigana_result:

            title_yomi_str, title_mapping, title_word_map, title_words_data = title_furigana_result
            summary_yomi_str, summary_mapping, summary_word_map, summary_words_data = summary_furigana_result

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

            if len(title_yomi_str) != len(title_mapping) or len(summary_yomi_str) != len(summary_mapping):
                logging.warning(f"Wiki: Mismatch yomi/mapping length. Skipping.")
                continue

            if len(title_yomi_str) != len(title_word_map) or len(summary_yomi_str) != len(summary_word_map):
                logging.warning(f"Wiki: Mismatch yomi/word_map length. Skipping.")
                continue

            new_total_length = current_total_length + length_to_add
            new_diff = abs(GOAL_LENGTH - new_total_length)

            if new_diff < current_diff:
                current_articles_data.extend(data_to_add)
                current_total_length = new_total_length
                current_diff = new_diff

                if current_diff < best_diff:
                    best_articles_data = list(current_articles_data) 
                    best_diff = current_diff
                    # best_total_length = current_total_length
            else:
                continue
        else:
            continue

    if not best_articles_data:
        return jsonify({"error": "適切な記事が見つかりませんでした"}), 500

    final_yomi_list = []
    final_kanji_list = []
    final_mapping_segments = [] 

    for article_data in best_articles_data:
        yomi_text = article_data['yomi']
        mapping_list = article_data['map']
        word_map = article_data['word_map']
        words_data = article_data['words_data']

        yomi_segments_data = split_with_context(yomi_text)

        # ▼▼▼ このループの中身を入れ替える ▼▼▼
        for data in yomi_segments_data:
            # data['segment'] は使わない（api側でクリーンアップするため）
            start, end = data['start'], data['end']

            # --- (1) 元のテキストからスライスを取得 ---
            
            # スライス開始点が各リストの範囲外ならスキップ
            if start >= len(yomi_text) or start >= len(mapping_list) or start >= len(word_map):
                continue
            
            # スライス終了点を各リストの範囲内に収める
            end = min(end, len(yomi_text), len(mapping_list), len(word_map))

            yomi_slice_raw = yomi_text[start:end]
            mapping_slice_raw = mapping_list[start:end]
            word_map_slice = word_map[start:end]

            # スライス間で長さが違う場合はスキップ (安全のため)
            if not (len(yomi_slice_raw) == len(mapping_slice_raw) == len(word_map_slice)):
                logging.warning(f"Wiki: Mismatch raw slice lengths. Skipping segment.")
                continue

            # --- (2) クリーンアップ (空白除去) ---
            # yomi, mapping, word_map を同時にフィルタリングする
            
            cleaned_yomi_chars = []
            cleaned_mapping = []
            cleaned_word_map = []
            is_leading = True # ★ 先頭文字かどうかを判定するフラグ

            for i in range(len(yomi_slice_raw)):
                yomi_char = yomi_slice_raw[i]

                # 全角スペースを半角に (splitWithContext の挙動と合わせる)
                if yomi_char == '　':
                    yomi_char = ' '

                # 改行・タブなど (半角スペース以外) はスキップ (splitWithContext の re.sub に相当)
                if yomi_char != ' ' and yomi_char.isspace():
                    continue

                # ★ ご要望の「先頭のスペース」を除去
                if is_leading and yomi_char == ' ':
                    continue
                
                # 空白以外の文字 or 先頭ではないスペースが来たら、以降は先頭ではない
                is_leading = False

                # 保持するデータを各リストに追加
                cleaned_yomi_chars.append(yomi_char)
                cleaned_mapping.append(mapping_slice_raw[i])
                cleaned_word_map.append(word_map_slice[i])

            # クリーンアップの結果、空になったセグメントはスキップ
            # (splitWithContext の .strip() == "" チェックに相当)
            if not cleaned_yomi_chars:
                continue
            
            # --- (3) final リストへの追加 (クリーンアップ後のデータを使用) ---

            # (3a) yomi
            final_yomi_list.append("".join(cleaned_yomi_chars))

            # (3b) kanji (クリーンアップ後のデータを使用)
            kanji_segment_chars = []
            last_word_index = -1
            for i in range(len(cleaned_yomi_chars)):
                yomi_char = cleaned_yomi_chars[i]
                current_word_index = cleaned_word_map[i] # cleaned_word_map を使用

                if current_word_index != last_word_index:
                    try:
                        kanji_segment_chars.append(words_data[current_word_index]['kanji'])
                        last_word_index = current_word_index
                    except IndexError:
                        logging.warning(f"Word map index {current_word_index} out of bounds.")
                        kanji_segment_chars.append(yomi_char) 
                        last_word_index = -1
            final_kanji_list.append("".join(kanji_segment_chars))

            # (3c) mapping (クリーンアップ後のデータを使用)
            mapping_segment = []
            kanji_segment_start_index = -1 
            for i in range(len(cleaned_yomi_chars)):
                original_kanji_index = cleaned_mapping[i] # cleaned_mapping を使用
                if kanji_segment_start_index == -1:
                    kanji_segment_start_index = original_kanji_index

                relative_kanji_index = original_kanji_index - kanji_segment_start_index
                mapping_segment.append(relative_kanji_index)
            
            final_mapping_segments.append(mapping_segment)

    # --- ループ終了後 ---

    response_data = jsonify(
        kanji=final_kanji_list,
        yomi=final_yomi_list,
        mapping=final_mapping_segments 
    )

    response = make_response(response_data)
    return response


# --- サーバー起動（開発用） ---
if __name__ == '__main__':
    app.run(debug=True, port=5000)