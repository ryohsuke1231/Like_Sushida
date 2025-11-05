from openai import OpenAI
from flask import Flask, request, jsonify
import os

app = Flask(__name__)
api_key = os.environ.get("OPENAI_API_KEY")

client = OpenAI(
    api_key=
    api_key
)

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
    return  jsonify(message=message, usage=usage)
    