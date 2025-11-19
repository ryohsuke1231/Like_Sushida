import requests
import json
import os

# --- 自分の環境に合わせて設定してください ---

# 1. KoyebのアプリURL (例: https://my-app-ryohsuke.koyeb.app)
# (Koyebの管理画面で確認できます)
API_BASE_URL = os.environ.get("KOYEB_APP_URL", "https://total-reiko-sushida-dev-6d0cf1d1.koyeb.app") 

# 2. Koyebに設定したAPIキー
API_KEY = os.environ.get("FURIGANA_API_KEY", "letsgoshoppingiyafoo1231")

# ----------------------------------------

if "YOUR_KOYEB_APP_URL_HERE" in API_BASE_URL or "YOUR_API_KEY_HERE" in API_KEY:
    print("エラー: API_BASE_URL と API_KEY を設定してください。")
    exit()

# APIのエンドポイント
url = f"{API_BASE_URL}/get_morphemes"

# 送信するデータ
payload = {
    "text": "KoyebでSudachiが動いた。",
    "mode": "C"
}

# 認証ヘッダー
headers = {
    "Content-Type": "application/json",
    "X-API-KEY": API_KEY
}

try:
    print(f"POSTリクエストを {url} に送信中...")
    response = requests.post(url, headers=headers, data=json.dumps(payload), timeout=10)

    # ステータスコードで成功・失敗を判定
    response.raise_for_status() # 4xx, 5xx エラーの場合は例外を発生させる

    print("リクエスト成功！")
    print("--- サーバーからのレスポンス (JSON) ---")
    print(json.dumps(response.json(), indent=2, ensure_ascii=False))
    
except requests.exceptions.HTTPError as e:
    print(f"HTTPエラー: {e.response.status_code}")
    try:
        print(f"エラー詳細: {e.response.json()}")
    except:
        print(f"エラー詳細: {e.response.text}")
except requests.exceptions.RequestException as e:
    print(f"リクエストエラー: {e}")
except Exception as e:
    print(f"予期せぬエラー: {e}")