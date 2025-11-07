import requests
import random
import json

def has_unsupported_chars(text):
    for ch in text:
        code = ord(ch)

        # ひらがな / カタカナ / 漢字 / ASCII記号 / ASCII英数字 は許可
        if (
            0x0000 <= code <= 0x007F or        # ASCII
            0x3040 <= code <= 0x309F or        # ひらがな
            0x30A0 <= code <= 0x30FF or        # カタカナ
            0x4E00 <= code <= 0x9FFF or        # 漢字
            0x3000 <= code <= 0x303F or        # 全角和文記号（。、・「」など）
            0xFF00 <= code <= 0xFFEF           # 全角英数字・全角記号（（  ） ： ー など）
        ):
            continue

        # ↑のどれにも当てはまらない → 打てない可能性高い
        return True

    return False


# ★★★ 必須：User-Agentヘッダーを定義 ★★★
# この文字列は、あなたのゲーム固有のもの（連絡先メールアドレスなど）に
# 変更することを強く推奨します。
my_headers = {
    "User-Agent": "sushida-dev (contact: unker1231@gmail.com) - For a typing game"
}
# ★★★★★★★★★★★★★★★★★★★★★★★★★

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
        # ★ 修正点: headers=my_headers を追加
        res = requests.get(url, params=params, headers=my_headers) 
        res.raise_for_status() # HTTPエラーチェック
        data = res.json()
        page = next(iter(data["query"]["pages"].values()))
        return page.get("extract", "")
    except requests.exceptions.HTTPError as e:
        print(f"HTTPエラー (summary): {e}")
        return ""
    except requests.exceptions.RequestException as e:
        print(f"APIリクエストエラー (summary): {e}")
        return ""
    except (json.JSONDecodeError, KeyError, StopIteration) as e:
        print(f"APIレスポンス形式エラー (summary): {title}")
        print(f"エラー: {e}")
        if 'res' in locals():
             print(f"レスポンス内容 (先頭200文字): {res.text[:200]}")
        return ""


def get_random_title_from_search():
    url = "https://ja.wikipedia.org/w/api.php"

    # Wikipediaカテゴリ名と対応させる
    categories = [
        "動物", "植物", "科学", "技術", "歴史", "地理",
        "数学", "物理学", "化学", "生物学", "天文学",
        "哲学", "経済学", "法律", "芸術", "スポーツ",
        "料理", "気象", "言語学"
    ]

    # カテゴリをランダム選択
    cat = random.choice(categories)
    cmtitle = f"Category:{cat}"

    params = {
        "action": "query",
        "format": "json",
        "list": "categorymembers",
        "cmtitle": cmtitle,
        "cmnamespace": 0,
        "cmlimit": 50,
    }

    try:
        res = requests.get(url, params=params, headers=my_headers)
        res.raise_for_status()
        data = res.json()

        members = data.get("query", {}).get("categorymembers", [])
        if not members:
            print(f"カテゴリに記事なし: {cat}")
            return None

        selected = random.choice(members)
        return selected["title"]

    except Exception as e:
        print(f"カテゴリ取得エラー: {e}")
        return None
notok = True
while notok:
    # --- 実行 ---
    title = get_random_title_from_search()
    
    if title:
        summary = get_wiki_summary(title)
        if summary:
            if has_unsupported_chars(summary):
                print(f"記事「{title}」にはサポートされていない文字が含まれています。")
                print(f"内容：{summary}")
                continue
            print(f"\n選ばれた記事: {title}")
            print("--- 概要 ---")
            print(summary)
            notok = False
        else:
            print(f"記事「{title}」の概要が取得できませんでした。")
    else:
        print("適切な記事が見つかりませんでした。")