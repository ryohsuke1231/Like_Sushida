import requests
import json

APP_ID = "dj00aiZpPUtUc3hEUWRkc0VTdiZzPWNvbnN1bWVyc2VjcmV0Jng9OGY-" 
API_URL = "https://jlp.yahooapis.jp/FuriganaService/V2/furigana"

def get_furigana(sentence):
    headers = {"Content-Type": "application/json"}
    payload = {
        "id": "1234-1",
        "jsonrpc": "2.0",
        "method": "jlp.furiganaservice.furigana",
        "params": {
            "q": sentence,
            "grade": 1
        }
    }

    try:
        response = requests.post(API_URL, headers=headers, data=json.dumps(payload), params={"appid": APP_ID})
        response.raise_for_status()
        data = response.json()
    except requests.exceptions.RequestException as e:
        print(f"APIリクエストエラー: {e}")
        return None
    except json.JSONDecodeError:
        print(f"JSONデコードエラー: {response.text}")
        return None

    furigana_text = ""
    try:
        for word in data["result"]["word"]:
            if "furigana" in word:
                furigana_text += word["furigana"]
            else:
                furigana_text += word["surface"]
    except KeyError:
        print("レスポンス構造が想定外:", data)
        return None

    return furigana_text

# 実行例
input_text = "今日はいい天気ですね。@いやっほー！"
result = get_furigana(input_text)
if result:
    print(f"元の文章: {input_text}")
    print(f"ふりがな: {result}")
