import sudachipy
from sudachipy import tokenizer
from sudachipy import dictionary
from pykakasi import Kakasi
import re # 正規表現モジュール

def get_mixed_reading(text):
    """
    Sudachi (full辞書) とpykakasiを使い、
    日本語は「ひらがなの読み」に、
    それ以外（アルファベット・記号等）は「元の文字列」のまま連結する関数
    """
    
    # --- 1. Sudachiの準備 ---
    try:
        tokenizer_obj = dictionary.Dictionary(dict="full").create()
    except Exception as e:
        print(f"エラー: Sudachi辞書（dict=\"full\"）のロードに失敗しました。")
        print(f"sudachidict_full が正しくインストールされているか確認してください。")
        print(f"詳細: {e}")
        return ""

    mode = tokenizer.Tokenizer.SplitMode.C

    # --- 2. pykakasiの準備 ---
    kks = Kakasi() 

    # --- 3. 解析とひらがな変換 ---
    final_string = ""
    
    # 日本語（ひらがな、カタカナ、漢字）を1文字でも含むかを判定する正規表現
    japanese_pattern = re.compile(r'[ぁ-んァ-ヶ\u4e00-\u9faf]')

    try:
        morphemes = tokenizer_obj.tokenize(text, mode)
        
        for m in morphemes:
            surface = m.surface() # 単語の元の表記（表層形）
            
            # 【修正点】
            # surface（元の単語）が日本語（ひらがな、カタカナ、漢字）を
            # 1文字でも含んでいる場合
            if japanese_pattern.search(surface):
                
                # 読みを取得
                reading_kata = m.reading_form()
                
                if reading_kata:
                    result_list = kks.convert(reading_kata)
                    reading_hira = "".join([item['hira'] for item in result_list])
                    final_string += reading_hira
                else:
                    # 読みがない場合（例: 辞書にない日本語記号）は
                    # 念のため元の文字列をそのまま追加
                    final_string += surface 
            
            # 日本語を含まない場合（アルファベット、数字、記号のみ）
            else:
                # 読みは使わず、元の文字列(surface)をそのまま追加
                final_string += surface

    except Exception as e:
        print(f"解析中にエラーが発生しました: {e}")
        return ""

    return final_string

# --- 実行例 ---
text1 = "Sudachiは高精度な形態素解析器です。"
text2 = "「麻生太郎」"
text3 = "Pythonを学ぶ"
text4 = "記号（全角）と!（半角）を除外する"
text5 = "これはTitleCaseです"

print(f"原文: {text1}")
print(f"結果: {get_mixed_reading(text1)}")
print("---")
print(f"原文: {text2}")
print(f"結果: {get_mixed_reading(text2)}")
print("---")
print(f"原文: {text3}")
print(f"結果: {get_mixed_reading(text3)}") # ユーザーの例
print("---")
print(f"原文: {text4}")
print(f"結果: {get_mixed_reading(text4)}")
print("---")
print(f"原文: {text5}")
print(f"結果: {get_mixed_reading(text5)}")