from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware # この行を追加

app = FastAPI()

# --- CORS設定を追加 ---
origins = [
    # ここに許可したいフロントエンドのURLを追加します
    # 今回はローカルのHTMLファイルからアクセスするため、 "*" ですべてを許可します
    "*" 
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"], # すべてのHTTPメソッドを許可
    allow_headers=["*"], # すべてのHTTPヘッダーを許可
)
# --- ここまで追加 ---


@app.get("/")
def read_root():
    return {"Hello": "World"}

@app.get("/items/{item_id}")
def read_item(item_id: int, q: str | None = None):
    if q:
        return {"item_id": item_id, "q": q}
    return {"item_id": item_id}