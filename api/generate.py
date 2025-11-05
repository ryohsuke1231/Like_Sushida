from openai import OpenAI
import requests
from flask import Flask, request, jsonify
import os
import json
import unicodedata

app = Flask(__name__)
api_key = os.environ.get("OPENAI_API_KEY")
APP_ID = os.environ.get("YAHOO_APP_ID")
API_URL = "https://jlp.yahooapis.jp/FuriganaService/V2/furigana"
client = OpenAI(api_key=api_key)


def kata_to_hira(s):
    # 半角 → 全角に統一
    s = unicodedata.normalize('NFKC', s)

    result = []
    for ch in s:
        code = ord(ch)
        # 全角カタカナ → ひらがな
        if 0x30A1 <= code <= 0x30F6:
            result.append(chr(code - 0x60))
        else:
            result.append(ch)
    return "".join(result)


prompt = "変な面白おかしい文章を書いて 「わかりました」とかはなしで文章だけ　200文字を目安に"


@app.route('/api/generate', methods=['GET'])
def generate_text():
    response = client.chat.completions.create(
        model="gpt-4o-mini",  # 高速・安価
        messages=[{
            "role": "user",
            "content": prompt
        }])

    message = response.choices[0].message.content
    usage = response.usage

    # ここでYahoo! Japan Furigana APIを呼び出す
    headers = {"Content-Type": "application/json"}
    payload = {
        "id": "1234-1",
        "jsonrpc": "2.0",
        "method": "jlp.furiganaservice.furigana",
        "params": {
            "q": message,
            "grade": 1
        }
    }

    try:
        response = requests.post(API_URL,
                                 headers=headers,
                                 data=json.dumps(payload),
                                 params={"appid": APP_ID})
        response.raise_for_status()
        data = response.json()
        furigana_text = ""
        for word in data["result"]["word"]:
            if "furigana" in word:
                furigana_text += word["furigana"]
            else:
                furigana_text += word["surface"]
    except Exception as e:
        print(f"エラー: {e}")
        return jsonify(message=message, furigana="", error=str(e))
    """
    except requests.exceptions.RequestException as e:
        print(f"APIリクエストエラー: {e}")
        return None
    except json.JSONDecodeError:
        print(f"JSONデコードエラー: {response.text}")
        return None
    """

    # furigana_text 生成後に追加
    furigana_text = kata_to_hira(furigana_text)

    return jsonify(kanji=message, yomi=furigana_text)
