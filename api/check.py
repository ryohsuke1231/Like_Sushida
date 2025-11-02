from flask import Flask, request, jsonify

app = Flask(__name__)
AUTH_COOKIE_NAME = 'my_auth_session'

@app.route('/', methods=['GET'])
def check_auth():
    # リクエストからCookieを取得
    auth_cookie = request.cookies.get(AUTH_COOKIE_NAME)

    if auth_cookie == 'true':
        # 認証済み
        return jsonify(message='Authenticated'), 200
    else:
        # 未認証
        return jsonify(message='Unauthorized'), 401