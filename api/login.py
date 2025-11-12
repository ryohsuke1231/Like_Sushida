import os
import base64
from flask import Flask, request, jsonify, session

app = Flask(__name__)

# --- 秘密鍵（署名用） ---
app.secret_key = os.environ.get("SECRET_KEY", "super_secret_key")

# --- Basic認証情報 ---
USERNAME = os.environ.get("AUTH_USER", "admin")
PASSWORD = os.environ.get("AUTH_PASS", "secret_password")

@app.route('/api/login', methods=['POST'])
def login():
    """Basic認証を確認し、成功時に署名付きセッションを作成"""
    auth_header = request.headers.get('Authorization')

    # 期待されるAuthorizationヘッダーを生成
    auth_string = base64.b64encode(f"{USERNAME}:{PASSWORD}".encode()).decode()
    expected_header = f"Basic {auth_string}"

    if auth_header == expected_header:
        session['authenticated'] = True
        return jsonify(message='Login Successful'), 200
    else:
        return jsonify(message='Login Failed'), 401


# --- Vercel用エントリーポイント ---
if __name__ == '__main__':
    app.run(port=8080)
