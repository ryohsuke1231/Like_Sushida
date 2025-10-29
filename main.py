import http.server
import socketserver
import os

# プレビューを表示するポート番号
PORT = 8080 
socketserver.TCPServer.allow_reuse_address = True

# HTMLファイルがあるディレクトリを指定
# (main.py と index.html が同じ場所にあればこれでOK)
web_dir = os.path.join(os.path.dirname(__file__), '.')
os.chdir(web_dir)

Handler = http.server.SimpleHTTPRequestHandler
httpd = socketserver.TCPServer(("", PORT), Handler)

print(f"サーバーが http://0.0.0.0:{PORT} で起動しました")
print("WebViewパネルで index.html が表示されます。")

# サーバーを起動
httpd.serve_forever()