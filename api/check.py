import os
from flask import Flask, jsonify, session

app = Flask(__name__)

# login.pyと同じSECRET_KEYを使う必要あり
app.secret_key = os.environ.get("SECRET_KEY", "super_secret_key")

@app.route('/api/check', methods=['GET'])
def check():
    """署名付きcookieを検証して認証済みか判定"""
    if session.get('authenticated'):
        return jsonify(message='Authenticated'), 200
    else:
        return jsonify(message='Unauthorized'), 401


# --- Vercel用エントリーポイント ---
if __name__ == '__main__':
    app.run(port=8080)
