# lib/splitWithContext.py
import re

def split_with_context(text: str) -> list[dict]: # ★ 戻り値を list[dict] に変更
    """
    JavaScriptの関数と同様に、括弧のコンテキストを考慮して文字列を分割します。

    「」や()のネストをカウントし、ネストが0の状態で
    分割文字（。、？、！」、?、!）が出現した場合に文字列を分割します。
    最後に、各セグメントから全ての空白文字（改行含む）を削除します。

    Returns:
        list[dict]: [{'segment': str, 'start': int, 'end': int}, ...]
                    segment: 分割・空白除去された文字列
                    start: 元の text におけるセグメントの開始インデックス
                    end: 元の text におけるセグメントの終了インデックス (スライス用)
    """
    raw_segments_data = [] # (raw_segment, start, end) を保持するリスト
    start_index = 0
    in_kakko = 0      # () のネストレベル
    in_kagikakko = 0  # 「」のネストレベル

    # 分割文字のセット
    split_chars = {'。', '？', '」', '！', '?', '!'}

    for i, char in enumerate(text):
        # --- カウンターの更新 ---
        if char == '(':
            in_kakko += 1
        elif char == ')':
            if in_kakko > 0:
                in_kakko -= 1
        elif char == '「':
            in_kagikakko += 1
        elif char == '」':
            if in_kagikakko > 0:
                in_kagikakko -= 1

        # --- 分割判定 ---
        if char in split_chars:
            if in_kakko == 0 and in_kagikakko == 0:
                current_end_index = i + 1
                segment_raw = text[start_index : current_end_index]

                raw_segments_data.append({
                    'raw': segment_raw,
                    'start': start_index,
                    'end': current_end_index
                })

                start_index = i + 1

    # --- 最後の「。」の後ろに残った文字列の処理 ---
    if start_index < len(text):
        raw_segments_data.append({
            'raw': text[start_index:],
            'start': start_index,
            'end': len(text)
        })

    # --- 最後のクリーンアップ処理 ---
    cleaned_segments_data = []
    for data in raw_segments_data:
        # \s+（1つ以上の空白文字）の置換
        text = data['raw']

        # 全角スペースを半角スペースへ
        text = text.replace('　', ' ')

        # タブ・改行などは削除（ただし半角スペースは残す）
        text = re.sub(r'[^\S ]+', '', text)

        cleaned_segment = text

        # 元のJSは空になったセグメントを除去していないため、そのまま返していましたが
        # "空白のみ" のセグメントは不要な出力を生むため除去します。
        # ただし、先頭/末尾にスペースが残る（例: ' なお...') 場合はそのまま保持します。
        if cleaned_segment.strip() == "":
            # セグメントが空白のみ（スペースやタブ変換後）であればスキップ
            continue

        cleaned_segments_data.append({
            'segment': cleaned_segment,
            'start': data['start'],
            'end': data['end']
        })

    return cleaned_segments_data

if __name__ == "__main__":
    # 単体テスト用
    test_text = "これはテストです。なんか彼は言った。「腹減った。\nなんか食べたい」と。"
    result = split_with_context(test_text)
    print(result) 
    # 期待値: [{'segment': 'これはテストです。', 'start': 0, 'end': 8}, {'segment': 'なんか彼は言った。「腹減った。なんか食べたい」と。', 'start': 8, 'end': 33}]

    test_text2 = "これはてすとです。なんかかれはいった。「はらへった。なんかたべたい」と。"
    result2 = split_with_context(test_text2)
    print(result2)