import re

def split_with_context(text: str) -> list[str]:
    """
    JavaScriptの関数と同様に、括弧のコンテキストを考慮して文字列を分割します。

    「」や()のネストをカウントし、ネストが0の状態で
    分割文字（。、？、！」、?、!）が出現した場合に文字列を分割します。
    最後に、各セグメントから全ての空白文字（改行含む）を削除します。
    """
    segments = []
    start_index = 0
    in_kakko = 0      # () のネストレベル
    in_kagikakko = 0  # 「」のネストレベル

    # 分割文字のセット（リストより検索が高速）
    split_chars = {'。', '？', '」', '！', '?', '!'}

    # enumerateでインデックス(i)と文字(char)を同時に取得
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
            # カッコの外にある場合のみ分割
            if in_kakko == 0 and in_kagikakko == 0:
                # start_indexから現在の文字(i)までを切り出す (i+1でスライス)
                segment = text[start_index : i + 1]
                segments.append(segment)
                # 次のセグメントの開始位置を更新
                start_index = i + 1

    # --- 最後の「。」の後ろに残った文字列の処理 ---
    # または「。」が一つもなかった場合の全文字列
    if start_index < len(text):
        segments.append(text[start_index:])

    # --- 最後のクリーンアップ処理 ---
    # JSの2段階のreplace（改行削除 + 空白削除）は、
    # \s+（1つ以上の空白文字）の置換でまとめて実行可能

    # リスト内包表記を使った場合
    cleaned_segments = [re.sub(r'\s+', '', segment) for segment in segments]

    # (参考) forループを使った場合
    # cleaned_segments = []
    # for segment in segments:
    #     cleaned_segment = re.sub(r'\s+', '', segment)
    #     cleaned_segments.append(cleaned_segment)

    # 元のJSは空になったセグメントを除去していないため、Pythonでもそのまま返す
    # (例: "。 。" は ["。", "。"] になる)
    return cleaned_segments