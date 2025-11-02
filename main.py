import http.server
import socketserver
import os
import base64
from urllib.parse import urlparse, quote
from http.cookies import SimpleCookie # Cookieをパースするためにインポート

# --- 1. 認証情報の定義 ---
USERNAME = os.environ.get("AUTH_USER", "admin")
PASSWORD = os.environ.get("AUTH_PASS", "secret_password")
AUTH_STRING = base64.b64encode(f"{USERNAME}:{PASSWORD}".encode('utf-8')).decode('utf-8')
AUTH_HEADER = f"Basic {AUTH_STRING}"

# ログイン状態を保存するCookieの名前
AUTH_COOKIE_NAME = 'my_auth_session'

# --- 2. カスタムリクエストハンドラを作成 ---
class ConditionalAuthHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):

    def do_GET(self):
        """GETリクエストの処理"""
        parsed_path = urlparse(self.path)
        path = parsed_path.path

        # (A) 認証が不要なパス (ログインページ自体)
        if path == '/' or path == '/password.html':
            if path == '/':
                self.path = '/password.html'
            return super().do_GET()

        # (B) ログイン処理専用のパス
        if path == '/login':
            self.handle_login()
            return

        # (C) 認証が必要なその他すべてのパス (index.html, .css, .js など)
        self.handle_protected_files()

    def handle_login(self):
        """ /login へのアクセスを処理 (JSのfetchから呼ばれる) """
        auth_header = self.headers.get('Authorization')

        if auth_header == AUTH_HEADER:
            # 認証成功
            self.send_response(200)
            # ★ 重要な修正: 認証成功の証としてCookieをセット
            self.send_header('Set-Cookie', f'{AUTH_COOKIE_NAME}=true; Path=/; HttpOnly')
            self.end_headers()
            self.wfile.write(b'Login Successful')
        else:
            # 認証失敗
            self.send_response(401)
            self.end_headers()
            self.wfile.write(b'Login Failed')

    def handle_protected_files(self):
        """ 認証が必要なファイル (index.html, css, js) へのアクセスを処理 """

        # ★ 重要な修正: Authorizationヘッダーの代わりにCookieをチェック
        cookie_data = self.headers.get('Cookie')
        is_authenticated = False

        if cookie_data:
            cookie = SimpleCookie()
            cookie.load(cookie_data)
            if AUTH_COOKIE_NAME in cookie and cookie[AUTH_COOKIE_NAME].value == 'true':
                is_authenticated = True

        if is_authenticated:
            # Cookieがあり、認証済み -> ファイルを返す
            return super().do_GET()
        else:
            # Cookieがない (未認証) -> ログインページにリダイレクト
            message = ""
            encoded_message = quote(message)
            self.send_response(302) # 401ではなく302 (リダイレクト)
            self.send_header('Location', f'/password.html?message={encoded_message}')
            self.end_headers()

# --- 3. サーバー起動コード (変更なし) ---
PORT = 8080
socketserver.TCPServer.allow_reuse_address = True
web_dir = os.path.join(os.path.dirname(__file__), '.')
os.chdir(web_dir)
Handler = ConditionalAuthHTTPRequestHandler
httpd = socketserver.TCPServer(("", PORT), Handler)
print(f"サーバーが Cookie認証付きで http://0.0.0.0:{PORT} で起動しました")
print(f"ユーザー名='{USERNAME}'")
print(f"パスワード='{PASSWORD}'")
try:
    httpd.serve_forever()
except KeyboardInterrupt:
    print("\nサーバーを停止します。")
    httpd.server_close()