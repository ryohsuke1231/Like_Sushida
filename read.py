from itertools import product
import re
import random

class TypingJudge:
    """
    ひらがな文字列に対するローマ字タイピング入力を判定するクラス。

    使用例:
    judge = TypingJudge("きょうと")
    judge.check("k")  # True (途中)
    judge.check("y")  # True (途中)
    judge.check("o")  # True (途中)
    judge.check("u")  # False (間違い)

    judge.check("t")  # True (途中)
    judge.check("o")  # None (完了)

    judge.set_problem("かんい") # 新しい問題
    judge.check("k")  # True
    judge.check("a")  # True
    judge.check("n")  # True (kani にはならない)
    judge.check("n")  # True
    judge.check("i")  # None (kanni で完了)
    """

    # ローマ字テーブルを大幅に拡張
    roman_table = {
        # 清音
        "あ": ["a"], "い": ["i"], "う": ["u"], "え": ["e"], "お": ["o"],
        "か": ["ka"], "き": ["ki"], "く": ["ku"], "け": ["ke"], "こ": ["ko"],
        "さ": ["sa"], "し": ["shi", "si", "ci"], "す": ["su"], "せ": ["se"], "そ": ["so"],
        "た": ["ta"], "ち": ["chi", "ti"], "つ": ["tsu", "tu"], "て": ["te"], "と": ["to"],
        "な": ["na"], "に": ["ni"], "ぬ": ["nu"], "ね": ["ne"], "の": ["no"],
        "は": ["ha"], "ひ": ["hi"], "ふ": ["fu", "hu"], "へ": ["he"], "ほ": ["ho"],
        "ま": ["ma"], "み": ["mi"], "む": ["mu"], "め": ["me"], "も": ["mo"],
        "や": ["ya"], "ゆ": ["yu"], "よ": ["yo"],
        "ら": ["ra"], "り": ["ri"], "る": ["ru"], "れ": ["re"], "ろ": ["ro"],
        "わ": ["wa"], "を": ["wo"], "ん": ["n", "nn"], # 'ん' は _get_possible_romaji で特別処理

        # 濁音
        "が": ["ga"], "ぎ": ["gi"], "ぐ": ["gu"], "げ": ["ge"], "ご": ["go"],
        "ざ": ["za"], "じ": ["ji", "zi"], "ず": ["zu"], "ぜ": ["ze"], "ぞ": ["zo"],
        "だ": ["da"], "ぢ": ["di"], "づ": ["du"], "で": ["de"], "ど": ["do"],
        "ば": ["ba"], "び": ["bi"], "ぶ": ["bu"], "べ": ["be"], "ぼ": ["bo"],

        # 半濁音
        "ぱ": ["pa"], "ぴ": ["pi"], "ぷ": ["pu"], "ぺ": ["pe"], "ぽ": ["po"],

        # 拗音 (きゃ行など)
        "きゃ": ["kya", "kixya"], "きゅ": ["kyu", "kixyu"], "きょ": ["kyo", "kixyo"],
        "ぎゃ": ["gya", "gixya"], "ぎゅ": ["gyu", "gixyu"], "ぎょ": ["gyo", "gixyo"],
        "しゃ": ["sha", "sya", "sixya"], "しゅ": ["shu", "syu", "sixyu"], "しょ": ["sho", "syo", "sixyo"],
        "じゃ": ["ja", "zya", "jixya"], "じゅ": ["ju", "zyu", "jixyu"], "じょ": ["jo", "zyo", "jixyo"],
        "ちゃ": ["cha", "tya", "chixya"], "ちゅ": ["chu", "tyu", "chixyu"], "ちょ": ["cho", "tyo", "chixyo"],
        "ぢゃ": ["dya"], "ぢゅ": ["dyu"], "ぢょ": ["dyo"],
        "にゃ": ["nya", "nixya"], "にゅ": ["nyu", "nixyu"], "にょ": ["nyo", "nixyo"],
        "ひゃ": ["hya", "hixya"], "ひゅ": ["hyu", "hixyu"], "ひょ": ["hyo", "hixyo"],
        "びゃ": ["bya", "bixya"], "びゅ": ["byu", "bixyu"], "びょ": ["byo", "bixyo"],
        "ぴゃ": ["pya", "pixya"], "ぴゅ": ["pyu", "pixyu"], "ぴょ": ["pyo", "pixyo"],
        "みゃ": ["mya", "mixya"], "みゅ": ["myu", "mixyu"], "みょ": ["myo", "mixyo"],
        "りゃ": ["rya", "rixya"], "りゅ": ["ryu", "rixyu"], "りょ": ["ryo", "rixyo"],

        # 小さい ぁ ぃ ぅ ぇ ぉ (ふぁ など)
        "ふぁ": ["fa", "fuxa"], "ふぃ": ["fi", "fuxi"], "ふぇ": ["fe", "fuxe"], "ふぉ": ["fo", "fuxo"],
        "うぁ": ["wha"], "うぃ": ["wi"], "うぇ": ["we"], "うぉ": ["who"],
        "ゔぁ": ["va"], "ゔぃ": ["vi"], "ゔ": ["vu"], "ゔぇ": ["ve"], "ゔぉ": ["vo"],
        "てぃ": ["thi"], "でぃ": ["dhi"], "とぅ": ["twu"], "どぅ": ["dwu"],

        # 記号など
        "ー": ["-"], "、": [","], "。": ["."], "・": ["・"], "「": ["["], "」": ["]"], "・": ["・"], "　": [" "], "？": ["?"], "！": ["!"], "：": [":"], "；": [";"], "（": ["("], "）": [")"], "＜": ["<"], "＞": [">"],

        # 小文字単体 (x/l 始まり)
        "ぁ": ["xa", "la"], "ぃ": ["xi", "li"], "ぅ": ["xu", "lu"], "ぇ": ["xe", "le"], "ぉ": ["xo", "lo"],
        "ゃ": ["xya", "lya"], "ゅ": ["xyu", "lyu"], "ょ": ["xyo", "lyo"],
        "っ": ["xtu", "ltu", "xtsu"], # 促音単体
    }

    def __init__(self, hiragana_str: str):
        """インスタンスを初期化し、最初の問題を設定する"""
        self.now_str = ""
        self.buffer = ""
        self.possibles = []
        self.set_problem(hiragana_str) # 初期化メソッドを呼び出す

    def set_problem(self, new_str: str):
        """新しい問題文字列を設定し、バッファをリセットする"""
        self.now_str = new_str
        self.buffer = ""
        # 可能なローマ字を計算してキャッシュ
        self.possibles = self._get_possible_romaji(self.now_str)

    @classmethod
    def _split_hiragana(cls, s):
        """ひらがな文字列をローマ字テーブルに基づいて分割する (拗音などを考慮)"""
        i = 0
        result = []
        while i < len(s):
            # 2文字がテーブルにあるか (例: "きゃ")
            if i + 1 < len(s) and s[i:i+2] in cls.roman_table:
                result.append(s[i:i+2])
                i += 2
            # 1文字がテーブルにあるか
            elif s[i] in cls.roman_table:
                result.append(s[i])
                i += 1
            # テーブルにない文字 (漢字、カタカナ、記号など)
            else:
                result.append(s[i]) # そのまま追加
                i += 1
        return result

    @classmethod
    def _first_consonant(cls, romaji):
        """ローマ字表記の最初の子音を返す"""
        for ch in romaji:
            if ch in "bcdfghjklmnpqrstvwxyz":
                return ch
        return ""

    @classmethod
    def _get_possible_romaji(cls, hiragana):
        """ひらがな文字列から、あり得るローマ字表記の全組み合わせを返す"""
        if not hiragana:
            return [""]

        chars = cls._split_hiragana(hiragana)
        romaji_lists = []
        i = 0
        while i < len(chars):
            ch = chars[i]

            # 1. 促音 ("っ") の処理
            if ch == "っ" and i + 1 < len(chars):
                next_ch = chars[i+1]
                next_romaji = cls.roman_table.get(next_ch, [])

                # 次の文字がテーブルにない(漢字等) or 母音で始まる or 'ん' の場合
                if not next_romaji or next_romaji[0][0] in "aiueo" or next_ch == "ん":
                    # 'xtu', 'ltu' などを追加 (単体の 'っ')
                    options = cls.roman_table.get("っ", ["xtu", "ltu"])
                    romaji_lists.append(options)
                    i += 1 # 'っ' のみ消費
                    continue # 次のループで next_ch を処理

                # 次の文字が子音で始まる場合
                doubled_options = set()

                for nr in next_romaji:
                    # 'ch' の例外 (tchi / cchi)
                    if nr.startswith("ch"):
                        doubled_options.add("t" + nr) # tchi
                        doubled_options.add("c" + nr) # cchi (first_consonant でも 'c' が取れる)

                    first_con = cls._first_consonant(nr)
                    if first_con:
                        doubled_options.add(first_con + nr)
                    else:
                        doubled_options.add(nr) # 通常ありえないが念のため

                romaji_lists.append(list(doubled_options))
                i += 2 # 2文字分 (っ + 次の文字) 進める

            # 2. "ん" の処理
            elif ch == "ん":
                options = set()

                if i + 1 < len(chars):
                    # 次の文字がある場合
                    next_ch = chars[i+1]
                    next_romaji_list = cls.roman_table.get(next_ch, [])

                    is_vowel_or_y = False
                    is_n = False

                    if not next_romaji_list: # 次が漢字など
                        is_vowel_or_y = False
                        is_n = False
                    else:
                        for nr in next_romaji_list:
                            if nr[0] in "aiueoy": 
                                is_vowel_or_y = True
                            if nr.startswith("n"): 
                                is_n = True

                    if is_vowel_or_y:
                        # 例: かんい (kanni), こんや (konya, konnya)
                        options.add("nn") # n 2回が必須 (または許可)
                        # 拗音 (やゆよ) の場合は 'n' 1回も許可
                        if next_ch in ["や", "ゆ", "よ", "ゃ", "ゅ", "ょ"]:
                            options.add("n")
                    elif is_n:
                        # 例: そんな (sonna)
                        options.add("nn") # n 1回
                        # options.add("nn") # sonnna も許可する？ (仕様による)
                    else:
                        # その他子音 例: かんと (kanto, kannto)
                        options.add("n")
                        options.add("nn")
                else:
                    # 文末の "ん"
                    #options.add("n")
                    options.add("nn")

                romaji_lists.append(list(options))
                i += 1

            # 3. その他の文字
            else:
                # テーブル定義に基づく (漢字などは [ch] になる)
                options = cls.roman_table.get(ch, [ch])
                romaji_lists.append(options)
                i += 1

        # 全組み合わせを生成
        if not romaji_lists:
            return [""]

        combos = ["".join(p) for p in product(*romaji_lists)]
        # 空文字や重複を除外
        return list(set(filter(None, combos)))


    def check(self, s: str):
        """
        入力文字 (s) をバッファに追加し、判定を行う。
        戻り値:
        True: 入力は正しいが、まだ途中
        False: 入力は間違い
        None: 入力は正しく、完了した
        """
        test_buffer = self.buffer + s

        # どの候補にもマッチしない (前方一致)
        if not any(p.startswith(test_buffer) for p in self.possibles):
            return False

        # マッチし、かつ完了
        if test_buffer in self.possibles:
            self.buffer = test_buffer # バッファを更新
            return None 

        # マッチしたが、まだ途中
        self.buffer = test_buffer # バッファを更新
        return True# テスト
def read_words(yeah):
    max_len = 0
    max_len_word = ""
    with open("sushida/word.txt", "r", encoding="utf-8") as file:
        words = file.read().splitlines()
        levels = {}
        now_level = 0
        for word in words:
            if len(word.split(",")[0]) > max_len:
                max_len = len(word)
                max_len_word = word
            m = re.search(r"txt(\d+)", word)
            if m:
                now_level = int(m.group(1))
            if now_level not in levels:
                levels[now_level] = []
            levels[now_level].append(word)
        print(max_len)
        print(max_len_word)
        if yeah:
            return levels
        else:
            return list(levels.values())
        
typing = TypingJudge("ちょっとなにいってるかわからない")
print(TypingJudge._get_possible_romaji("いって"))  # => ['itte']
#TypingJudge.update("ちょっと"
print(TypingJudge._get_possible_romaji("ちょっと"))  # => ['chotto', 'tyotto', 'chixyotto', ...]
print(TypingJudge._get_possible_romaji("ちょっとなにいってるかわからない"))
next = True
words = read_words(True)[6]
shuffled = random.sample(words, len(words))
for word in shuffled:
    next = True
    print(word)
    typing.set_problem(word.split(",")[0])
    while next:
      s  = input("入力してください: ")
      ret = typing.check(s)
      if ret is True:
        print("OK")
        
      elif ret is None:
        print("OK")
        next = False
      else:
        print("NG")
    