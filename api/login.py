import os
import base64
from flask import Flask, request, make_response, jsonify

# 認証情報の定義
USERNAME = os.environ.get("AUTH_USER", "admin")
PASSWORD = os.environ.get("AUTH_PASS", "secret_password")
AUTH_STRING = base64.b64encode(f"{USERNAME}:{PASSWORD}".encode('utf-8')).decode('utf-8')
AUTH_HEADER = f"Basic {AUTH_STRING}"

AUTH_COOKIE_NAME = 'my_auth_session'

# Vercelは 'app' という名前のFlaskインスタンスを探します
app = Flask(__name__)

@app.route('/', methods=['POST'])
def handle_login():
    auth_header = request.headers.get('Authorization')

    if auth_header == AUTH_HEADER:
        # 認証成功
        resp = make_response(jsonify(message='Login Successful'), 200)
        # Cookieをセット
        resp.set_cookie(AUTH_COOKIE_NAME, 'true', path='/', httponly=True, samesite='Strict')
        return resp
    else:
        # 認証失敗
        return jsonify(message='Login Failed'), 401

# このファイルが直接実行された場合（ローカルテスト用）
if __name__ == '__main__':
    app.run(port=8080)