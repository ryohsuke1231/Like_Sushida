// HTMLドキュメントが読み込まれ終わったら実行
// HTMLドキュメントが読み込まれ終わったら実行
// ★ 1. コールバック関数を 'async' に変更
document.addEventListener('DOMContentLoaded', async () => {

    // ★ 2. 'await' を使って readWords が完了するまで待つ
    //    (これを使わないと 'words' には Promise が入ってしまう)
    
    const words = await readWords("sushida/word.txt", true);
    /*
    // 'words' に {1: [...], 2: [...]} のようなデータが正しく入る
    const result = Object.keys(words) 
      .filter(key => {
        const numericKey = Number(key); 
        return numericKey >= 2 && numericKey <= 7;
      })
      // ★ 3. 'data[key]' ではなく 'words[key]' を使う
      .flatMap(key => words[key]); 

    const shuffledResult = shuffleArray(result);

    let yomi = [];
    let kanji = [];

    // ★ 4. (念のため) ループの長さを shuffledResult に合わせる
    for (let i = 0; i < shuffledResult.length; i++) {
        // shuffledResult[i] は ["よみ", "漢字"] という配列
        if (shuffledResult[i] && shuffledResult[i].length >= 2) {
            yomi.push(shuffledResult[i][0]);
            kanji.push(shuffledResult[i][1]);
        }
    }
    */
    // 'words' に {1: [...], 2: [...]} のようなデータが正しく入っていると仮定

    // ★ 1. 各文字数の単語リストを、シャッフルして使えるように準備
    // ★ 1. 各文字数の単語リストを、シャッフルして使えるように準備
    // (sourceWords は不要になったので削除)
    const availableWords = {};

    // 必要な文字キー（2から7）
    const relevantKeys = [2, 3, 4, 5, 6, 7];

    for (const key of relevantKeys) {
        if (words[key] && words[key].length > 0) {
            // ★変更点: 最初に1回だけシャッフルし、availableWords にセットする
            availableWords[key] = shuffleArray([...words[key]]);
        } else {
            // データが存在しない場合は空の配列をセット
            availableWords[key] = [];
            console.warn(`[警告] 文字数 ${key} の単語データが見つかりません。`);
        }
    }

    // ★ 2. 最終結果を格納する配列
    let yomi = [];
    let kanji = [];

    // ★ 3. 処理する文字数の「流れ」を定義
    const flow = [2, 3, 4, 5, 6, 7, 6, 5, 4, 3];

    // ★ 4. 「3個ずつ」取得できなくなるまで、この流れを繰り返す
    let running = true;
    while (running) {

        // 1サイクル (flow配列の 2 から 3 まで) を実行
        for (const length of flow) {

            // ★変更点: 補充ロジックを「完全に削除」

            // (A) この文字(length)の単語が「3個以上」残っているかチェック
            if (availableWords[length] && availableWords[length].length >= 3) {

                // (B) 3個取得する
                for (let i = 0; i < 3; i++) {
                    // (availableWords[length] には3個以上あることが保証されている)
                    const wordPair = availableWords[length].pop();

                    if (wordPair && wordPair.length >= 2) {
                        yomi.push(wordPair[0]);
                        kanji.push(wordPair[1]); // ★(元コードのtypo修正: wordWord -> wordPair)
                    } else {
                        // 万が一、pop()に失敗した場合 (データ不正など)
                         console.warn(`(pop失敗) 文字数 ${length} で有効な単語ペアを取得できませんでした。`);
                         // この場合も続行不能として終了
                         running = false;
                         break; // for (let i...) ループを抜ける
                    }
                }

            } else {
                // (C) 3個未満しか残っていない = 終了条件
                console.log(`文字数 ${length} の単語が3個未満 (残り ${ (availableWords[length] || []).length } 個) のため、処理を終了します。`);
                running = false; // while ループを停止させる
                break; // この for (const length...) ループを抜ける
            }

            // (内側の for (let i...) が break した場合、外側の for (const length...) も break する必要がある)
            if (!running) {
                break;
            }
        }
        // (for (const length...) が break したら、while (running) も停止する)
    }

    // これで yomi と kanji には、単語リストを使い切るまでの結果が入ります
    // console.log("Yomi Array:", yomi.length);
    // console.log("Kanji Array:", kanji.length);
    console.log("Yomi Array:", yomi.length, yomi);
    console.log("Kanji Array:", kanji.length, kanji);
    const amount = {2: 100, 3: 100, 4: 100, 5: 180, 6: 180, 7: 240, 8: 240, 9: 240, 10: 380, 11: 380, 12: 380, 13: 500, 14: 500, 15: 500, 16: 500, 17: 500, 18: 500, 19: 500, 20: 500};
    
    

    const textBox = document.getElementById('box-text');
    const yomiBox = document.getElementById('yomi-text');
    const renda = document.getElementById('renda');
    const remainingTime = document.getElementById('remaining-time');
    const startBox = document.getElementById('start-box');
    const resultBox = document.getElementById('result-box');
    const centerBox = document.getElementById('center-box');
    const start_text = document.getElementById('start-text');
    document.getElementById('total_got_odai').textContent = '0 皿';
    resultBox.style.display = 'none';
    centerBox.style.display = 'none';
    startBox.style.display = 'flex';
    let start = false;
    // ★ 5. (重要) yomi や kanji が空(0件)の場合、エラー処理をする
    if (!textBox || yomi.length === 0) {
        console.error("テキストボックスが見つからないか、読み込む単語がありません。");
        if (textBox) {
            textBox.textContent = "エラー: 単語を読み込めません";
        }
        return; // エラーなので、以降の処理を中断
    }

    const judge = new TypingJudge(yomi[0]);

    // ★ 6. 'いえい' と 'String(words)' の行を削除し、
    //    正しい初期値 (kanji[0]) を設定する
    textBox.textContent = kanji[0];
    yomiBox.textContent = yomi[0];

    // ★ 7. (エラーの原因) 'textbox.textContent = ...' の行は削除
    // textbox.textContent = String(words); // <-- この行がエラーを引き起こしていた

    let i = 0;
    //let pressed_keys_count = 0;
    let correct_keys_count = 0;
    let incorrect_keys_count = 0;
    let renda_count = 0;
    let nokorijikan = 60;
    const amounts = [100, 180, 240, 380, 500];
    // 2. キーが押された時の「信号」を受け取る
    const seconds = setInterval(() => {
        if (nokorijikan > 1) {
            nokorijikan -= 1;
            remainingTime.textContent = `残り時間: ${nokorijikan}秒`;
        } else {
            startBox.style.display = 'flex';
            resultBox.style.display = 'none';
            centerBox.style.display = 'none';
            start_text.textContent = '終了！';
            textBox.textContent = "終了！";
            yomiBox.textContent = "";
            end_time = Date.now();
            setTimeout(() => {
                let total = 0;
                for (let i = 0; i < amounts.length; i++) {
                    const count = document.getElementById(`${amounts[i]}_count`);
                    if (count) {
                        total += amounts[i] * parseInt(count.textContent);
                    }
                }
                document.getElementById('result-total').textContent = `${total} 円分のお寿司をゲット！`;
                if (total >= 3000) {
                    document.getElementById('otoku').textContent = `${total - 3000} 円分お得でした！`;
                    document.getElementById('otoku-box').style.borderColor = '#9acd32';
                } else {
                    document.getElementById('otoku').textContent = `${3000 - total} 円分損でした・・・`;
                    document.getElementById('otoku-box').style.borderColor = '#696969';
                }
                document.getElementById('correct_keys_count').textContent = correct_keys_count;
                document.getElementById('incorrect_keys_count').textContent = incorrect_keys_count;
                document.getElementById('average_keys_count').textContent = Math.round((correct_keys_count) / ((end_time - start_time) / 1000));
                startBox.style.display = 'none';
                resultBox.style.display = 'flex';
                centerBox.style.display = 'none';
                seconds.clearInterval();
            }, 1000);
            
        }
    }, 1000)
    let start_time = 0;
    let end_time = 0;
    window.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ' && start === false) {
            //start = true;
            document.getElementById('start-text').textContent = 'スタート！';
            document.getElementById('total_got_odai').textContent = '0 皿';
            setTimeout(() => {
                resultBox.style.display = 'none';
                centerBox.style.display = 'flex';
                startBox.style.display = 'none';
                start = true;
                start_time = Date.now();
            }, 1000)
        }
        const isSingleCharacter = event.key.length === 1;

        if (isSingleCharacter) {
            const result = judge.check(event.key);

            if (result === null) { // null は「完了」
                incorrect_keys_count += 1;
                renda_count += 1;
                renda.value = renda_count;
                document.getElementById('total_got_odai').textContent = `${i + 1} 皿`;
                if (renda_count == 28) {
                    nokorijikan += 1;
                    remainingTime.textContent = `残り時間: ${nokorijikan}秒`;
                } else if (renda_count == 59) {
                    nokorijikan += 1;
                    remainingTime.textContent = `残り時間: ${nokorijikan}秒`;
                } else if (renda_count == 93) {
                    nokorijikan += 2;
                    remainingTime.textContent = `残り時間: ${nokorijikan}秒`;
                } else if (renda_count == 130) {
                    nokorijikan += 3;
                    remainingTime.textContent = `残り時間: ${nokorijikan}秒`;
                    renda_count = 0;
                }
                // ★★★ 修正点 1 ★★★
                // i++ する「前」に、今完了した単語 (yomi[i]) のスコアを計算する
                let _amount = amount[yomi[i].length];
                const count = document.getElementById(`${_amount}_count`);

                // console.log よりも、こちらの方がデバッグに便利かもしれません
                console.log(`完了: ${yomi[i]} (文字数 ${yomi[i].length}, 金額 ${_amount})`);

                if (count) {
                    count.textContent = parseInt(count.textContent) + 1;
                }

                // ★★★ 修正点 2 ★★★
                // スコア計算が終わってから、次の単語に進める
                i++; 

                // ★ 8. 配列の最後までいったら処理を停止する
                if (i >= yomi.length) {
                    console.log("すべての単語をタイプしました！");
                    textBox.textContent = "おわり";
                    yomiBox.textContent = ""; // 読みもクリア
                    return; // 完了
                }

                // ★ 9. 次の単語をセットする
                // (スコア計算のロジックは上記に移動済み)
                judge.setProblem(yomi[i]);
                textBox.textContent = kanji[i];
                yomiBox.textContent = yomi[i];

                // (元のスコア計算ロジックはここから削除する)

            } else if (result === true) { // true は「途中」
                correct_keys_count += 1;
                renda_count += 1;
                renda.value = renda_count;
                if (renda_count == 28) {
                    nokorijikan += 1;
                } else if (renda_count == 59) {
                    nokorijikan += 1;
                } else if (renda_count == 93) {
                    nokorijikan += 2;
                } else if (renda_count == 130) {
                    nokorijikan += 3;
                    renda_count = 0;
                }
            } else { // false は「間違い」
                incorrect_keys_count += 1;
                renda_count = 0;
                renda.value = renda_count;
            }
        } else {
            // console.log('特殊キーのため無視:', event.key);
        }
    });

});
class TypingJudge {

    // クラスの静的プロパティとしてローマ字テーブルを定義
    static romanTable = {
        // 清音
        "あ": ["a"], "い": ["i"], "う": ["u"], "え": ["e"], "お": ["o"],
        "か": ["ka"], "き": ["ki"], "く": ["ku"], "け": ["ke"], "こ": ["ko"],
        "さ": ["sa"], "し": ["shi", "si", "ci"], "す": ["su"], "せ": ["se"], "そ": ["so"],
        "た": ["ta"], "ち": ["chi", "ti"], "つ": ["tsu", "tu"], "て": ["te"], "と": ["to"],
        "な": ["na"], "に": ["ni"], "ぬ": ["nu"], "ね": ["ne"], "の": ["no"],
        "は": ["ha"], "ひ": ["hi"], "ふ": ["fu", "hu"], "へ": ["he"], "ほ": ["ho"],
        "ま": ["ma"], "み": ["mi"], "む": ["mu"], "め": ["me"], "も": ["mo"],
        "や": ["ya"], "ゆ": ["yu"], "よ": ["yo"],
        "ら": ["ra"], "り": ["ri"], "る": ["ru"], "れ": ["re"], "ろ": ["ro"],
        "わ": ["wa"], "を": ["wo"], "ん": ["n", "nn"], // 'ん' は _getPossibleRomaji で特別処理

        // 濁音
        "が": ["ga"], "ぎ": ["gi"], "ぐ": ["gu"], "げ": ["ge"], "ご": ["go"],
        "ざ": ["za"], "じ": ["ji", "zi"], "ず": ["zu"], "ぜ": ["ze"], "ぞ": ["zo"],
        "だ": ["da"], "ぢ": ["di"], "づ": ["du"], "で": ["de"], "ど": ["do"],
        "ば": ["ba"], "び": ["bi"], "ぶ": ["bu"], "べ": ["be"], "ぼ": ["bo"],

        // 半濁音
        "ぱ": ["pa"], "ぴ": ["pi"], "ぷ": ["pu"], "ぺ": ["pe"], "ぽ": ["po"],

        // 拗音 (きゃ行など)
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

        // 小さい ぁ ぃ ぅ ぇ ぉ (ふぁ など)
        "ふぁ": ["fa", "fuxa"], "ふぃ": ["fi", "fuxi"], "ふぇ": ["fe", "fuxe"], "ふぉ": ["fo", "fuxo"],
        "うぁ": ["wha"], "うぃ": ["wi"], "うぇ": ["we"], "うぉ": ["who"],
        "ゔぁ": ["va"], "ゔぃ": ["vi"], "ゔ": ["vu"], "ゔぇ": ["ve"], "ゔぉ": ["vo"],
        "てぃ": ["thi"], "でぃ": ["dhi"], "とぅ": ["twu"], "どぅ": ["dwu"],

        // 記号など
        "ー": ["-"], "、": [","], "。": ["."], "・": ["・"], "「": ["["], "」": ["]"], "　": [" "], "？": ["?"], "！": ["!"], "：": [":"], "；": [";"], "（": ["("], "）": [")"], "＜": ["<"], "＞": [">"],

        // 小文字単体 (x/l 始まり)
        "ぁ": ["xa", "la"], "ぃ": ["xi", "li"], "ぅ": ["xu", "lu"], "ぇ": ["xe", "le"], "ぉ": ["xo", "lo"],
        "ゃ": ["xya", "lya"], "ゅ": ["xyu", "lyu"], "ょ": ["xyo", "lyo"],
        "っ": ["xtu", "ltu", "xtsu"], // 促音単体
    };

    /**
     * インスタンスを初期化し、最初の問題を設定する
     * @param {string} hiraganaStr - 最初の問題（ひらがな文字列）
     */
    constructor(hiraganaStr) {
        this.nowStr = "";
        this.buffer = "";
        this.possibles = [];
        this.setProblem(hiraganaStr);
    }

    /**
     * 新しい問題文字列を設定し、バッファをリセットする
     * @param {string} newStr - 新しい問題（ひらがな文字列）
     */
    setProblem(newStr) {
        this.nowStr = newStr;
        this.buffer = "";
        // 可能なローマ字を計算してキャッシュ
        this.possibles = TypingJudge._getPossibleRomaji(this.nowStr);
    }

    /**
     * ひらがな文字列をローマ字テーブルに基づいて分割する (拗音などを考慮)
     * @param {string} s - ひらがな文字列
     * @returns {string[]} 分割された文字列の配列
     * @private
     * @static
     */
    static _splitHiragana(s) {
        let i = 0;
        const result = [];
        while (i < s.length) {
            // 2文字がテーブルにあるか (例: "きゃ")
            if (i + 1 < s.length && (s.substring(i, i + 2) in this.romanTable)) {
                result.push(s.substring(i, i + 2));
                i += 2;
            }
            // 1文字がテーブルにあるか
            else if (s[i] in this.romanTable) {
                result.push(s[i]);
                i += 1;
            }
            // テーブルにない文字 (漢字、カタカナ、記号など)
            else {
                result.push(s[i]); // そのまま追加
                i += 1;
            }
        }
        return result;
    }

    /**
     * ローマ字表記の最初の子音を返す
     * @param {string} romaji - ローマ字表記
     * @returns {string} 最初の子音（見つからなければ空文字）
     * @private
     * @static
     */
    static _firstConsonant(romaji) {
        // 正規表現で最初の子音を探す
        const match = romaji.match(/[bcdfghjklmnpqrstvwxyz]/);
        return match ? match[0] : "";
    }

    /**
     * Pythonの itertools.product と同様の動作（文字列結合版）
     * @param {string[][]} romajiLists - ローマ字表記の配列の配列
     * @returns {string[]} 組み合わせの文字列配列
     * @private
     * @static
     */
    static _getProductStrings(romajiLists) {
        if (romajiLists.length === 0) {
            return [""];
        }

        // reduce を使って全組み合わせを効率的に生成
        return romajiLists.reduce(
            (accumulator, currentList) => {
                const result = [];
                for (const accStr of accumulator) {
                    for (const currentStr of currentList) {
                        result.push(accStr + currentStr);
                    }
                }
                return result;
            },
            [""] // 初期値は空文字を含む配列
        );
    }

    /**
     * ひらがな文字列から、あり得るローマ字表記の全組み合わせを返す
     * @param {string} hiragana - ひらがな文字列
     * @returns {string[]} 可能なローマ字表記の配列
     * @private
     * @static
     */
    static _getPossibleRomaji(hiragana) {
        if (!hiragana) {
            return [""];
        }

        const chars = this._splitHiragana(hiragana);
        const romajiLists = [];
        let i = 0;

        while (i < chars.length) {
            const ch = chars[i];

            // 1. 促音 ("っ") の処理
            if (ch === "っ" && i + 1 < chars.length) {
                const nextCh = chars[i + 1];
                const nextRomaji = this.romanTable[nextCh] || [];

                // 次の文字がテーブルにない(漢字等) or 母音で始まる or 'ん' の場合
                if (nextRomaji.length === 0 || "aiueo".includes(nextRomaji[0][0]) || nextCh === "ん") {
                    // 'xtu', 'ltu' などを追加 (単体の 'っ')
                    const options = this.romanTable["っ"] || ["xtu", "ltu"];
                    romajiLists.push(options);
                    i += 1; // 'っ' のみ消費
                    continue; // 次のループで nextCh を処理
                }

                // 次の文字が子音で始まる場合
                // JavaScriptのSetを使って重複を自動的に削除
                const doubledOptions = new Set();

                for (const nr of nextRomaji) {
                    // 'ch' の例外 (tchi / cchi)
                    if (nr.startsWith("ch")) {
                        doubledOptions.add("t" + nr); // tchi
                        doubledOptions.add("c" + nr); // cchi
                    }

                    const firstCon = this._firstConsonant(nr);
                    if (firstCon) {
                        doubledOptions.add(firstCon + nr);
                    } else {
                        doubledOptions.add(nr); // 通常ありえないが念のため
                    }
                }

                romajiLists.push(Array.from(doubledOptions)); // Setを配列に戻す
                i += 2; // 2文字分 (っ + 次の文字) 進める
            }
            // 2. "ん" の処理
            else if (ch === "ん") {
                const options = new Set();

                if (i + 1 < chars.length) {
                    // 次の文字がある場合
                    const nextCh = chars[i + 1];
                    const nextRomajiList = this.romanTable[nextCh] || [];

                    let isVowelOrY = false;
                    let isN = false;

                    if (nextRomajiList.length === 0) { // 次が漢字など
                        isVowelOrY = false;
                        isN = false;
                    } else {
                        for (const nr of nextRomajiList) {
                            if ("aiueoy".includes(nr[0])) {
                                isVowelOrY = true;
                            }
                            if (nr.startsWith("n")) {
                                isN = true;
                            }
                        }
                    }

                    if (isVowelOrY) {
                        // 例: かんい (kanni), こんや (konya, konnya)
                        options.add("nn"); // n 2回が必須 (または許可)
                        // 拗音 (やゆよ) の場合は 'n' 1回も許可
                        if (["や", "ゆ", "よ", "ゃ", "ゅ", "ょ"].includes(nextCh)) {
                            options.add("n");
                        }
                    } else if (isN) {
                        // 例: そんな (sonna)
                        options.add("n"); // Python版では "nn" だったが "n" (sonna) が正しい？ 
                                        // "nn" (sonnna) も許可するなら両方追加
                        options.add("nn"); // Python版のロジックに合わせる (sonna, sonnna)
                    } else {
                        // その他子音 例: かんと (kanto, kannto)
                        options.add("n");
                        options.add("nn");
                    }
                } else {
                    // 文末の "ん"
                    // options.add("n"); // Python版ではコメントアウトされていた
                    options.add("nn");
                }

                romajiLists.push(Array.from(options));
                i += 1;
            }
            // 3. その他の文字
            else {
                // テーブル定義に基づく (漢字などは [ch] になる)
                const options = this.romanTable[ch] || [ch];
                romajiLists.push(options);
                i += 1;
            }
        }

        // 全組み合わせを生成
        if (romajiLists.length === 0) {
            return [""];
        }

        const combos = this._getProductStrings(romajiLists);

        // 重複を除外 (getProductStrings がSetを使わないため、ここでSet化)
        return Array.from(new Set(combos.filter(s => s))); // 空文字も除外
    }

    /**
     * 入力文字 (s) をバッファに追加し、判定を行う。
     * @param {string} s - 入力された1文字
     * @returns {boolean | null}
     * true: 入力は正しいが、まだ途中
     * false: 入力は間違い
     * null: 入力は正しく、完了した
     */
    check(s) {
        const testBuffer = this.buffer + s;

        // どの候補にもマッチしない (前方一致)
        // Array.prototype.some を使用
        if (!this.possibles.some(p => p.startsWith(testBuffer))) {
            return false;
        }

        // マッチし、かつ完了
        // Array.prototype.includes を使用
        if (this.possibles.includes(testBuffer)) {
            this.buffer = testBuffer; // バッファを更新
            return null; // 完了
        }

        // マッチしたが、まだ途中
        this.buffer = testBuffer; // バッファを更新
        return true; // 途中
    }
}


/**
 * [注意] ブラウザのJSはローカルファイルにアクセスできません。
 * この関数は、指定されたパス (url) がWebサーバー上に存在することを前提としています。
 * * @param {string} url - 読み込むテキストファイルへのURL (例: "/sushida/word.txt")
 * @param {boolean} yeah - trueならレベル別オブジェクト、falseなら配列の配列を返す
 * @returns {Promise<Object<number, string[]> | string[][]>} 
 */
/**
 * [注意] ブラウザのJSはローカルファイルにアクセスできません。
 * この関数は、指定されたパス (url) がWebサーバー上に存在することを前提としています。
 * * @param {string} url - 読み込むテキストファイルへのURL (例: "/sushida/word.txt")
 * @param {boolean} yeah - trueならレベル別オブジェクト、falseなら配列の配列を返す
 * @returns {Promise<Object<number, string[]> | string[][]>} 
 */
async function readWords(url, yeah) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
        }

        const text = await response.text();

        // ★ 修正: 'text.splitlines()' はJSにはないため 'text.split('\n')' に変更
        const words = text.split('\n').map(s => s.trimEnd()); // 改行で分割

        const levels = {};
        let nowLevel = 0;

        for (const word of words) {
            if (!word) continue; // 空行をスキップ

            // Pythonの re.search(r"txt(\d+)", word) と同じ
            const match = word.match(/txt(\d+)/); 

            if (match) {
                nowLevel = parseInt(match[1], 10);
            }

            if (!levels[nowLevel]) {
                levels[nowLevel] = [];
            }

            // "txt..." の行自体は追加しないようにする (もしtxt行も単語として扱いたいならこのif文は不要)
            if (!match) { 
                 const parts = word.split(",");
                 if (parts.length >= 2) { // 読みと漢字が揃っているものだけ追加
                    levels[nowLevel].push(parts);
                 }
            }
        }

        if (yeah) {
            return levels; // {1: [...], 2: [...]}
        } else {
            // filterで空のレベル(例: levels[0])を除外
            return Object.values(levels).filter(level => level.length > 0); 
        }

    } catch (error) {
        console.error("Error reading words:", error);
        return yeah ? {} : []; // エラー時は空のデータを返す
    }
}
/**
 * 配列の要素をランダムにシャッフルします (Fisher-Yatesアルゴリズム)。
 * 元の配列は変更されません。
 * @param {Array} array - シャッフルする配列
 * @returns {Array} シャッフルされた新しい配列
 */
function shuffleArray(array) {
  // 元の配列をコピーする
  const newArray = [...array]; 

  // Fisher-Yates (Knuth) シャッフル
  for (let i = newArray.length - 1; i > 0; i--) {
    // 0 から i までのランダムなインデックスを選ぶ
    const j = Math.floor(Math.random() * (i + 1)); 

    // newArray[i] と newArray[j] の要素を交換する
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }

  return newArray;
}