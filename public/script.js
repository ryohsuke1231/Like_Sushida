// HTMLドキュメントが読み込まれ終わったら実行
// HTMLドキュメントが読み込まれ終わったら実行
// ★ 1. コールバック関数を 'async' に変更
/*
document.addEventListener('DOMContentLoaded', async () => {

    // ★ 2. 'await' を使って readWords が完了するまで待つ
    //    (これを使わないと 'words' には Promise が入ってしまう)
    
    const words = await readWords("sushida/word.txt", true);
    /*for (const [key, value] of Object.entries(words)) {
      console.log(`${key}:`, JSON.stringify(value));
    }*/
    //console.dir(JSON.stringify(words));

    /*
    // 'words' に {1: [...], 2: [...]} のようなデータが正しく入る
    const result = Object.keys(words) 
      .filter(key => {
        const numericKey = Number(key); 
        return numericKey >= 2 && numericKey <= 7;
      })
      // ★ 3. 'data[key]' ではなく 'words[key]' を使うfuruhonya
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
    const selectBox = document.getElementById('select-box');
    const start_text = document.getElementById('start-text');
    const jikan = document.getElementById('jikan');
    const possible_text = document.getElementById('possible');
    const container = document.querySelector('.progress-container');
    const max = parseFloat(renda.getAttribute('max'));

    // 2. すべての .target-marker 要素を取得
    const markers = document.querySelectorAll('.target-marker');

    if (max > 0) {
        // 3. 取得したマーカーすべてをループ処理する
        markers.forEach(marker => {
            // 個々のマーカーから data-target の値を取得
            const targetValue = parseFloat(marker.getAttribute('data-target'));

            // 値の検証
            if (targetValue >= 0 && targetValue <= max) {
                // 位置をパーセンテージで計算
                const positionPercent = (targetValue / max) * 100;

                // CSSのleftプロパティに設定
                marker.style.left = `${positionPercent}%`;

                // 線の位置を正確にするため、線の太さの半分を左にずらす調整
                marker.style.transform = 'translateX(-50%)'; 
            }
        });
    }
    // 1. max値と境界値を取得
    //const max = parseFloat(renda.getAttribute('max'));
    const stopsData = renda.getAttribute('data-color-stops'); // "20,80"

    // 境界値データを解析
    const stops = stopsData ? stopsData.split(',').map(s => parseFloat(s.trim())) : [];

    if (max > 0 && stops.length >= 2) {
        // 2. 境界値をパーセンテージに計算
        // 最初の境界値（例: 20 / 100 * 100 = 20%）
        const stopAPercent = `${(stops[0] / max) * 100}%`;
        // 2番目の境界値（例: 80 / 100 * 100 = 80%）
        const stopBPercent = `${(stops[1] / max) * 100}%`;
        const stopCPercent = `${(stops[2] / max) * 100}%`;

        // 3. 計算結果をCSS変数に設定
        // setPropertyを使って、要素のカスタムプロパティの値を変更
        renda.style.setProperty('--stop-a', stopAPercent);
        renda.style.setProperty('--stop-b', stopBPercent);
        renda.style.setProperty('--stop-c', stopCPercent);
    }
    document.getElementById('total_got_odai').textContent = '0 皿';
    resultBox.style.display = 'none';
    centerBox.style.display = 'none';
    //startBox.style.display = 'flex';
    startBox.style.display = 'none';
    selectBox.style.display = 'flex';
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
    possible_text.innerHTML = `
        <span style="color: #eee;">${String(judge.getBestMatch(""))}</span>
    `;

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
            document.getElementById('haratta').style.display = 'none';
            end_time = Date.now();
            setTimeout(() => {
                let total = 0;
                for (let i = 0; i < amounts.length; i++) {
                    const count = document.getElementById(`${amounts[i]}_count`);
                    if (count) {
                        total += amounts[i] * parseInt(count.textContent);
                    }
                }
                document.getElementById('otoku-box').style.visibility = 'hidden';
                document.getElementById('haratta').style.visibility = 'hidden';
                document.getElementById('result-total').style.visibility = 'hidden';
                document.getElementById('result-table').style.visibility = 'hidden';
                startBox.style.display = 'none';
                resultBox.style.display = 'flex';
                centerBox.style.display = 'none';
                setTimeout(() => {
                document.getElementById('result-total').textContent = `${total} 円分のお寿司をゲット！`;
                document.getElementById('result-total').style.visibility = 'visible';
                }, 500);
                setTimeout(() => {
                document.getElementById('haratta').style.visibility = 'visible';
                }, 1000);
                setTimeout(() => {
                if (total >= 3000) {
                    document.getElementById('otoku').textContent = `${total - 3000} 円分お得でした！`;
                    document.getElementById('otoku-box').style.borderColor = '#9acd32';
                } else {
                    document.getElementById('otoku').textContent = `${3000 - total} 円分損でした・・・`;
                    document.getElementById('otoku-box').style.borderColor = '#696969';
                }
                document.getElementById('otoku-box').style.visibility = 'visible';
                document.getElementById('correct_keys_count').textContent = correct_keys_count;
                document.getElementById('incorrect_keys_count').textContent = incorrect_keys_count;
                const key_per_second = (correct_keys_count + incorrect_keys_count) / ((end_time - start_time) / 1000);
                document.getElementById('average_keys_count').textContent = parseFloat(key_per_second.toFixed(2));
                document.getElementById('result-table').style.visibility = 'visible';
                }, 1500);
                clearInterval(seconds);
            }, 1000);
            
        }
    }, 1000);
    let start_time = 0;
    let end_time = 0;
    let buffer = "";
    window.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ' && start === false) {
            //start = true;
            document.getElementById('start-text').textContent = 'スタート！';
            document.getElementById('total_got_odai').textContent = '0 皿';
            nokorijikan.value = 0;
            //document.getElementById('renda').style.display = 'flex';
            //document.getElementById('renda').style.height = '20px';
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
                    jikan.value = 60 - nokorijikan;
                } else if (renda_count == 59) {
                    nokorijikan += 1;
                    remainingTime.textContent = `残り時間: ${nokorijikan}秒`;
                    jikan.value = 60 - nokorijikan;
                } else if (renda_count == 93) {
                    nokorijikan += 2;
                    remainingTime.textContent = `残り時間: ${nokorijikan}秒`;
                    jikan.value = 60 - nokorijikan;
                } else if (renda_count == 130) {
                    nokorijikan += 3;
                    remainingTime.textContent = `残り時間: ${nokorijikan}秒`;
                    jikan.value = 60 - nokorijikan;
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
                buffer = "";
                judge.setProblem(yomi[i]);
                textBox.textContent = kanji[i];
                yomiBox.textContent = yomi[i];
                possible_text.innerHTML = `
                    <span style="color: #eee;">${String(judge.getBestMatch(buffer))}</span>
                `;
                

                // (元のスコア計算ロジックはここから削除する)

            } else if (result === true) { // true は「途中」
                correct_keys_count += 1;
                renda_count += 1;
                renda.value = renda_count;
                buffer += event.key;
                possible_text.innerHTML = `
                    <span style="color: #444;">${buffer}</span>
                    <span style="color: #eee;">${String(judge.getBestMatch(buffer)).substring(buffer.length)}</span>
                `
                if (renda_count == 28) {
                    nokorijikan += 1;
                    remainingTime.textContent = `残り時間: ${nokorijikan}秒`;
                    jikan.value = 60 - nokorijikan;
                } else if (renda_count == 59) {
                    nokorijikan += 1;
                    remainingTime.textContent = `残り時間: ${nokorijikan}秒`;
                    jikan.value = 60 - nokorijikan;
                } else if (renda_count == 93) {
                    nokorijikan += 2;
                    remainingTime.textContent = `残り時間: ${nokorijikan}秒`;
                    jikan.value = 60 - nokorijikan;
                } else if (renda_count == 130) {
                    nokorijikan += 3;
                    remainingTime.textContent = `残り時間: ${nokorijikan}秒`;
                    jikan.value = 60 - nokorijikan;
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
*/
let allWords = {}; // 読み込んだ全ての単語
let yomi = []; // 現在のゲームで使用する読み配列
let kanji = []; // 現在のゲームで使用する漢字配列
let judge; // TypingJudgeのインスタンス
let currentCourseConfig = {}; // 現在選択中のコース設定

// ゲーム状態
let i = 0; // 現在の単語インデックス
let correct_keys_count = 0;
let incorrect_keys_count = 0;
let renda_count = 0;
let nokorijikan = 60;
let start_time = 0;
let end_time = 0;
let buffer = "";
let start = false; // ゲーム実行中フラグ
let secondsTimer = null; // タイマーのID
let ippatsu = false;
const ippatsu_color = '#a0522d';
const normal_color = '#b8860b';

// DOM要素 (initGame で取得)
let textBox, yomiBox, renda, remainingTime, startBox, resultBox, centerBox, selectBox, start_text, jikan, possible_text;

// --- 定数 ---

// 皿の金額 (HTMLのIDに対応)
const amounts = [100, 180, 240, 380, 500];

// 金額マップ (文字数 -> 金額) ※既存コードから
const defaultAmountMap = {
    2: 100, 3: 100, 4: 100, 5: 180, 6: 180, 7: 240, 8: 240, 9: 240, 10: 380, 11: 380, 12: 380, 13: 500, 14: 500, 15: 500, 16: 500, 17: 500, 18: 500, 19: 500, 20: 500, 21: 500, 22: 500, 23: 500, 24: 500, 25: 500, 26: 500, 27: 500, 28: 500, 29: 500, 30: 500
};

// コース設定
const courses = {
    otegaru: {
        name: "お手軽 3,000円コース",
        keys: [2, 3, 4, 5, 6, 7], // 使用する文字数
        flow: [2, 3, 4, 5, 6, 7, 6, 5, 4, 3], // 単語取得の順番
        time: 60,
        price: 3000,
        amountMap: defaultAmountMap
    },
    osusume: {
        name: "お勧め 5,000円コース",
        keys: [5, 6, 7, 8, 9, 10], // (仮)
        flow: [5, 6, 7, 8, 9, 10, 9, 8, 7, 6], // (仮)
        time: 90,
        price: 5000,
        amountMap: defaultAmountMap // (仮)
    },
    koukyuu: {
        name: "高級 10,000円コース",
        keys: [9, 10, 11, 12, 13, 14], // (仮) ※14文字以上も含むべき
        flow: [9, 10, 11, 12, 13, 14, 13, 12, 11, 10], // (仮)
        time: 120,
        price: 10000,
        amountMap: defaultAmountMap // (仮)
    }
};


// --- 初期化処理 ---

document.addEventListener('load', initGame);

/**
 * ページの読み込みが完了したら実行される
 */
async function initGame() {
    setTimeout(async () => {
        document.getElementById('splash').classList.add('hide');

        try {
            allWords = await readWords("word.txt", true);
            console.log("単語データ読み込み完了:", allWords);
        } catch (error) {
            console.error("単語ファイルの読み込みに失敗しました:", error);
            document.getElementById('select-text').textContent = "エラー: 単語ファイルを読み込めません。";
            return;
        }

        grabDomElements();
        setupUI();
        setupEventListeners();
        showCourseSelection();

    }, 2000);
}


/**
 * 必要なDOM要素を変数に格納する
 */
function grabDomElements() {
    textBox = document.getElementById('box-text');
    yomiBox = document.getElementById('yomi-text');
    renda = document.getElementById('renda');
    remainingTime = document.getElementById('remaining-time');
    startBox = document.getElementById('start-box');
    resultBox = document.getElementById('result-box');
    centerBox = document.getElementById('center-box');
    selectBox = document.getElementById('select-box');
    endBox = document.getElementById('end-box');
    start_text = document.getElementById('start-text');
    jikan = document.getElementById('jikan');
    possible_text = document.getElementById('possible');
    const toggleInput = document.getElementById('cmn-toggle-4');
    toggleInput.addEventListener('change', () => {
        if (toggleInput.checked) {
          // もしチェックされたら、#select-box に 'osusume-mode' クラスを追加
          selectBox.style.backgroundColor = ippatsu_color;
            startBox.style.backgroundColor = ippatsu_color;
            centerBox.style.backgroundColor = ippatsu_color;
            resultBox.style.backgroundColor = ippatsu_color;
            endBox.style.backgroundColor = ippatsu_color;
            ippatsu = true;
        } else {
          // もしチェックが外れたら、'osusume-mode' クラスを削除
          selectBox.style.backgroundColor = normal_color;
            startBox.style.backgroundColor = normal_color;
            centerBox.style.backgroundColor = "#deb887";
            resultBox.style.backgroundColor = normal_color;
            endBox.style.backgroundColor = normal_color;
            ippatsu = false;
        }
      });

      // (おまけ) 読み込み時に一度、現在の状態でクラスを反映させておく
    if (toggleInput.checked) {
          // もしチェックされたら、#select-box に 'osusume-mode' クラスを追加
          selectBox.style.backgroundColor = ippatsu_color;
            startBox.style.backgroundColor = ippatsu_color;
            centerBox.style.backgroundColor = ippatsu_color;
            resultBox.style.backgroundColor = ippatsu_color;
            endBox.style.backgroundColor = ippatsu_color;
            ippatsu = true;
        } else {
          // もしチェックが外れたら、'osusume-mode' クラスを削除
          selectBox.style.backgroundColor = normal_color;
            startBox.style.backgroundColor = normal_color;
            centerBox.style.backgroundColor = "#deb887";
            resultBox.style.backgroundColor = normal_color;
            endBox.style.backgroundColor = normal_color;
            ippatsu = false;
        }

}

/**
 * プログレスバーなどのUI初期設定
 */
function setupUI() {
    // 連打メーターのマーカー設定
    const markers = document.querySelectorAll('.target-marker');
    const max = parseFloat(renda.getAttribute('max'));
    if (max > 0) {
        markers.forEach(marker => {
            const targetValue = parseFloat(marker.getAttribute('data-target'));
            if (targetValue >= 0 && targetValue <= max) {
                const positionPercent = (targetValue / max) * 100;
                marker.style.left = `${positionPercent}%`;
                marker.style.transform = 'translateX(-50%)';
            }
        });
    }

    // 連打メーターの色設定
    const stopsData = renda.getAttribute('data-color-stops'); // "28,59,93,130"
    const stops = stopsData ? stopsData.split(',').map(s => parseFloat(s.trim())) : [];

    // stops[2] (3番目の値 '93') を参照するため、stops.length >= 3 を確認
    if (max > 0 && stops.length >= 3) { 
        const stopAPercent = `${(stops[0] / max) * 100}%`;
        const stopBPercent = `${(stops[1] / max) * 100}%`;
        const stopCPercent = `${(stops[2] / max) * 100}%`; 

        renda.style.setProperty('--stop-a', stopAPercent);
        renda.style.setProperty('--stop-b', stopBPercent);
        renda.style.setProperty('--stop-c', stopCPercent);
    } else if (max > 0 && stops.length >= 2) { // 2つしかない場合のフォールバック
         const stopAPercent = `${(stops[0] / max) * 100}%`;
         const stopBPercent = `${(stops[1] / max) * 100}%`;
         renda.style.setProperty('--stop-a', stopAPercent);
         renda.style.setProperty('--stop-b', stopBPercent);
    }
}

/**
 * クリックやキーボードのイベントリスナーを設定する
 */
function setupEventListeners() {
    // コース選択
    document.getElementById('otegaru').addEventListener('click', () => startCourse(courses.otegaru));
    document.getElementById('osusume').addEventListener('click', () => startCourse(courses.osusume));
    document.getElementById('koukyuu').addEventListener('click', () => startCourse(courses.koukyuu));
    document.getElementById('ai-mode').addEventListener('click', () => startCourse("ai_mode"));

    // 結果画面ボタン
    const retryButtons = document.querySelectorAll('.retry');
    retryButtons.forEach(button => {
        button.addEventListener('click', () => {
            if (currentCourseConfig.name) {
                startCourse(currentCourseConfig); // 同じコースでリトライ
            } else {
                showCourseSelection(); // 念のためコース選択へ
            }
        });
    });
    // CSSセレクタ（.クラス名）を使って要素すべてを取得します
    // document.querySelectorAll は forEach メソッドが使える NodeList を返すため、より簡潔に書けます
    const courseButtons = document.querySelectorAll('.select-course');

    // forEach() を使って各要素にイベントリスナーを設定します
    courseButtons.forEach(button => {
        button.addEventListener('click', showCourseSelection);
    });

    // キー入力
    window.addEventListener('keydown', handleKeyDown);
}


// --- 画面遷移・ゲーム準備 ---

/**
 * コース選択画面を表示する
 */
function showCourseSelection() {
    // 画面切り替え
    selectBox.style.display = 'flex';
    startBox.style.display = 'none';
    centerBox.style.display = 'none';
    resultBox.style.display = 'none';

    // ゲーム状態のリセット
    resetGameState();
}

/**
 * ゲーム状態をリセットする
 */
function resetGameState() {
    if (secondsTimer) {
        clearInterval(secondsTimer);
        secondsTimer = null;
    }

    i = 0;
    correct_keys_count = 0;
    incorrect_keys_count = 0;
    renda_count = 0;
    start_time = 0;
    end_time = 0;
    buffer = "";
    start = false;
    yomi = [];
    kanji = [];
    currentCourseConfig = {};

    // UIリセット
    renda.value = 0;
    document.getElementById('total_got_odai').textContent = '0 皿';
    remainingTime.textContent = `残り時間: ...秒`;

    // 皿カウントリセット
    amounts.forEach(amount => {
        const countEl = document.getElementById(`${amount}_count`);
        if (countEl) countEl.textContent = '0';
    });

    // 結果表示リセット
    document.getElementById('result-total').style.visibility = 'hidden';
    document.getElementById('haratta').style.visibility = 'hidden';
    document.getElementById('otoku-box').style.visibility = 'hidden';
    document.getElementById('result-table').style.visibility = 'hidden';

    // テキストクリア
    textBox.textContent = "";
    yomiBox.textContent = "";
    possible_text.innerHTML = "";
}

/**
 * 選択されたコースを開始準備する
 * @param {object} config - courses オブジェクト (例: courses.otegaru)
 */
function startCourse(config) {
    resetGameState(); // (nokorijikan もリセットされる)
    if (config === "ai_mode") {
        /*ここで実装*/
        return;
    }
    currentCourseConfig = config;

    // 1. ゲーム状態をリセット

    // 2. このコース用の単語を準備
    try {
        // allWords (グローバル) から単語リスト (yomi, kanji) を生成
        prepareWords(config.keys, config.flow);
    } catch (error) {
        console.error(error.message);
        alert(error.message); // ユーザーにエラーを通知
        showCourseSelection(); // エラーならコース選択に戻る
        return;
    }

    // 3. UI設定
    nokorijikan = config.time;
    remainingTime.textContent = `残り時間: ${nokorijikan}秒`;
    jikan.setAttribute('max', config.time); // 時間経過progressのmax
    jikan.value = 0;
    let plus = "";
    if (ippatsu === true) {
        plus = "　一発勝負";
    }
    document.getElementById('course').textContent = config.name + plus;
    document.getElementById('haratta').textContent = `${config.price}円 払って・・・`;
    start_text.textContent = 'スペースかEnterキーを押すとスタートします';

    // 4. 画面切り替え (スタート待機画面)
    selectBox.style.display = 'none';
    startBox.style.display = 'flex';
    centerBox.style.display = 'none';
    resultBox.style.display = 'none';

    // start フラグは false のまま (handleKeyDown が Enter/Space を待つ)
}

/**
 * コース設定に基づき、グローバルの yomi, kanji 配列を生成する
 * @param {Array<number>} relevantKeys - 使用する文字数の配列 (例: [2, 3, 4])
 * @param {Array<number>} flow - 単語を取得する文字数の順番 (例: [2, 3, 4, 3, 2])
 */
function prepareWords(relevantKeys, flow) {

    const availableWords = {};

    for (const key of relevantKeys) {
        if (allWords[key] && allWords[key].length > 0) {
            // 元データを変更しないようシャッフルしてセット
            availableWords[key] = shuffleArray([...allWords[key]]);
        } else {
            availableWords[key] = [];
            console.warn(`[警告] 文字数 ${key} の単語データが見つかりません。`);
        }
    }

    // グローバル変数の yomi, kanji をリセット
    yomi = [];
    kanji = [];

    let running = true;
    while (running) {
        for (const length of flow) {

            // (A) この文字(length)の単語が「3個以上」残っているかチェック
            if (availableWords[length] && availableWords[length].length >= 3) {

                // (B) 3個取得する
                for (let k = 0; k < 3; k++) {
                    const wordPair = availableWords[length].pop(); 

                    if (wordPair && wordPair.length >= 2) {
                        yomi.push(wordPair[0]);
                        kanji.push(wordPair[1]);
                    } else {
                        console.warn(`(pop失敗) 文字数 ${length} で有効な単語ペアを取得できませんでした。`);
                        running = false;
                        break; 
                    }
                }

            } else {
                // (C) 3個未満しか残っていない = 終了条件
                const remainingCount = (availableWords[length] || []).length;
                console.log(`文字数 ${length} の単語が3個未満 (残り ${remainingCount} 個) のため、処理を終了します。`);
                running = false; 
                break; 
            }

            if (!running) {
                break;
            }
        }
    }

    console.log("単語準備完了 (Yomi):", yomi.length, "件");

    // 5. 単語が1件も準備できなかった場合
    if (yomi.length === 0) {
        throw new Error(`単語の準備に失敗しました。選択したコース (${currentCourseConfig.name}) に対応する単語が不足している可能性があります。`);
    }
}


// --- ゲーム実行ロジック ---

/**
 * Enter/Space が押されたらゲームを開始する
 */
function startGame() {
    if (start === true) return; // 既に開始している場合は何もしない

    document.getElementById('start-text').textContent = 'スタート！';
    start = 1;
    // 1秒待ってからゲーム画面へ
    setTimeout(() => {
        resultBox.style.display = 'none';
        centerBox.style.display = 'flex';
        startBox.style.display = 'none';

        // ゲーム開始処理
        start = true;
        start_time = Date.now();

        // 最初の単語 (yomi[0]) で Judge を初期化
        judge = new TypingJudge(yomi[0]);

        // 最初の単語をセット
        i = 0;
        setNextWord(true); // true = 最初の単語としてセット (iをインクリメントしない)

        // タイマースタート
        startTimer();

    }, 1000);
}

/**
 * ゲームのメインタイマーを開始する
 */
function startTimer() {
    if (secondsTimer) clearInterval(secondsTimer); 

    secondsTimer = setInterval(() => {
        if (nokorijikan > 1) {
            nokorijikan -= 1;
            remainingTime.textContent = `残り時間: ${nokorijikan}秒`;
            // 時間経過progress
            jikan.value = currentCourseConfig.time - nokorijikan;

        } else {
            // ★ 時間切れ
            remainingTime.textContent = `残り時間: 0秒`;
            jikan.value = currentCourseConfig.time;
            end_time = Date.now(); 

            if (secondsTimer) clearInterval(secondsTimer);
            secondsTimer = null;

            start = false; // ゲーム終了

            // 終了表示
            startBox.style.display = 'none';
            resultBox.style.display = 'none';
            centerBox.style.display = 'none';
            endBox.style.display = 'flex';
            start_text.textContent = '終了！';
            textBox.textContent = "終了！";
            yomiBox.textContent = "";
            possible_text.innerHTML = "";

            // 結果表示ロジックへ
            endGame();
        }
    }, 1000);
}

/**
 * キー入力イベントのハンドラ
 * @param {KeyboardEvent} event
 */
function handleKeyDown(event) {
    // 1. スタート待ち (Enter/Space)
    if (start === false) {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault(); 
            startGame();
        }
        return; // ゲーム開始前はタイピング処理をしない
    }

    // 2. ゲーム中の処理
    const isSingleCharacter = event.key.length === 1;

    if (isSingleCharacter) {

        const result = judge.check(event.key);

        if (result === null) { // null は「完了」
            // ★修正: 完了キーも「正解」としてカウント
            correct_keys_count += 1; 

            renda_count += 1;
            renda.value = renda_count;

            updateRendaTime();

            // スコア計算 (i++ する前に行う)
            // 完了した単語 (yomi[i]) の文字数から金額を取得
            let _amount = currentCourseConfig.amountMap[yomi[i].length];

            console.log(`完了: ${yomi[i]} (文字数 ${yomi[i].length}, 金額 ${_amount})`);

            // HTMLの皿カウントID (100, 180, ...)
            if (_amount && amounts.includes(_amount)) {
                const countEl = document.getElementById(`${_amount}_count`);
                if (countEl) {
                    countEl.textContent = parseInt(countEl.textContent) + 1;
                }
            }

            // 合計皿数
            document.getElementById('total_got_odai').textContent = `${i + 1} 皿`;

            // 次の単語へ
            setNextWord();

        } else if (result === true) { // true は「途中」
            correct_keys_count += 1;
            renda_count += 1;
            renda.value = renda_count;
            buffer += event.key;

            // 入力中テキスト表示 (入力済みを暗く、残りを明るく)
            possible_text.innerHTML = `
                <span style="color: #444;">${buffer}</span>
                <span style="color: #eee;">${String(judge.getBestMatch(buffer)).substring(buffer.length)}</span>
            `;

            updateRendaTime();

        } else { // false は「間違い」
            if (ippatsu === true) {
                end_time = Date.now(); 

                if (secondsTimer) clearInterval(secondsTimer);
                secondsTimer = null;

                start = false; // ゲーム終了

                // 終了表示
                startBox.style.display = 'none';
                resultBox.style.display = 'none';
                centerBox.style.display = 'none';
                endBox.style.display = 'flex';
                start_text.textContent = '終了！';
                textBox.textContent = "終了！";
                yomiBox.textContent = "";
                possible_text.innerHTML = "";

                // 結果表示ロジックへ
                endGame();
            }
            incorrect_keys_count += 1;
            renda_count = 0;
            renda.value = renda_count;
        }
    }
}

/**
 * 連打数に応じた時間ボーナス処理
 */
function updateRendaTime() {
    let addedTime = 0;
    if (renda_count == 28) {
        addedTime = 1;
    } else if (renda_count == 59) {
        addedTime = 1;
    } else if (renda_count == 93) {
        addedTime = 2;
    } else if (renda_count == 130) {
        addedTime = 3;
        renda_count = 0; // リセット
        renda.value = renda_count;
    }

    if (addedTime > 0) {
        nokorijikan += addedTime;
        remainingTime.textContent = `残り時間: ${nokorijikan}秒`;
    }
}

/**
 * 次の単語をセットする（またはゲーム終了）
 * @param {boolean} [isFirstWord=false] - 最初の単語セット時か (iを増やさない)
 */
function setNextWord(isFirstWord = false) {

    if (!isFirstWord) {
        i++; // 次のインデックスへ
    }

    if (i >= yomi.length) {
        // ★ 完走した場合
        console.log("すべての単語をタイプしました！");
        textBox.textContent = "おわり";
        yomiBox.textContent = ""; 
        possible_text.innerHTML = "";

        if (secondsTimer) clearInterval(secondsTimer);
        secondsTimer = null;
        start = false;

        end_time = Date.now();

        // 完走した場合も結果表示
        endGame(); 

        return; 
    }

    // 次の単語をセット
    buffer = "";
    judge.setProblem(yomi[i]);
    textBox.textContent = kanji[i];
    yomiBox.textContent = yomi[i];
    possible_text.innerHTML = `
        <span style="color: #eee;">${String(judge.getBestMatch(buffer))}</span>
    `;
}

/**
 * ゲーム終了時の結果表示処理
 */
function endGame() {
    start = null;
    // 「終了！」表示から1秒待って結果画面を表示
    setTimeout(() => {
        let total = 0;
        for (let k = 0; k < amounts.length; k++) {
            const countEl = document.getElementById(`${amounts[k]}_count`);
            if (countEl) {
                total += amounts[k] * parseInt(countEl.textContent);
            }
        }

        const resultTotalEl = document.getElementById('result-total');
        const harattaEl = document.getElementById('haratta');
        const otokuBoxEl = document.getElementById('otoku-box');
        const otokuEl = document.getElementById('otoku');
        const resultTableEl = document.getElementById('result-table');
        let plus = "";
        if (ippatsu === true) {
            plus = "　一発勝負";
        }
        document.getElementById('course-result').textContent = currentCourseConfig.name + plus;

        // (1) 画面切り替え (startBox -> resultBox)
        startBox.style.display = 'none';
        resultBox.style.display = 'flex';
        centerBox.style.display = 'none';
        endBox.style.display = 'none';

        resultTotalEl.style.visibility = 'hidden';
        harattaEl.style.visibility = 'hidden';
        otokuBoxEl.style.visibility = 'hidden';
        resultTableEl.style.visibility = 'hidden';

        // (2) 500ms後: 合計金額
        setTimeout(() => {
            resultTotalEl.textContent = `${total} 円分のお寿司をゲット！`;
            resultTotalEl.style.visibility = 'visible';
        }, 500);

        // (3) 1000ms後: 支払金額
        setTimeout(() => {
            // (テキストは startCourse で設定済み)
            harattaEl.style.visibility = 'visible';
        }, 1000);

        // (4) 1500ms後: お得＆詳細テーブル
        setTimeout(() => {
            const price = currentCourseConfig.price || 0; // コース料金
            if (total >= price) {
                otokuEl.textContent = `${total - price} 円分お得でした！`;
                otokuBoxEl.style.borderColor = '#9acd32';
            } else {
                otokuEl.textContent = `${price - total} 円分損でした・・・`;
                otokuBoxEl.style.borderColor = '#696969';
            }
            otokuBoxEl.style.visibility = 'visible';

            // 詳細テーブル
            document.getElementById('correct_keys_count').textContent = correct_keys_count;
            document.getElementById('incorrect_keys_count').textContent = incorrect_keys_count;

            let key_per_second = 0;
            if (start_time > 0 && end_time > start_time) {
                 const elapsedTimeSeconds = (end_time - start_time) / 1000;
                 if (elapsedTimeSeconds > 0) {
                     key_per_second = (correct_keys_count + incorrect_keys_count) / elapsedTimeSeconds;
                 }
            }
            document.getElementById('average_keys_count').textContent = parseFloat(key_per_second.toFixed(2));

            resultTableEl.style.visibility = 'visible';

        }, 1500);

    }, 1000); // 「終了！」表示から1秒待つ
}
class TypingJudge {

    // クラスの静的プロパティとしてローマ字テーブルを定義
    static romanTable = {
        // 清音
        "あ": ["a"], "い": ["i"], "う": ["u"], "え": ["e"], "お": ["o"],
        "か": ["ka"], "き": ["ki"], "く": ["ku"], "け": ["ke"], "こ": ["ko"],
        "さ": ["sa"], "し": ["si", "shi", "ci"], "す": ["su"], "せ": ["se"], "そ": ["so"],
        "た": ["ta"], "ち": ["ti", "chi"], "つ": ["tu", "tsu"], "て": ["te"], "と": ["to"],
        "な": ["na"], "に": ["ni"], "ぬ": ["nu"], "ね": ["ne"], "の": ["no"],
        "は": ["ha"], "ひ": ["hi"], "ふ": ["fu", "hu"], "へ": ["he"], "ほ": ["ho"],
        "ま": ["ma"], "み": ["mi"], "む": ["mu"], "め": ["me"], "も": ["mo"],
        "や": ["ya"], "ゆ": ["yu"], "よ": ["yo"],
        "ら": ["ra"], "り": ["ri"], "る": ["ru"], "れ": ["re"], "ろ": ["ro"],
        "わ": ["wa"], "を": ["wo"], "ん": ["n", "nn"], // 'ん' は _getPossibleRomajiObjects で特別処理

        // 濁音
        "が": ["ga"], "ぎ": ["gi"], "ぐ": ["gu"], "げ": ["ge"], "ご": ["go"],
        "ざ": ["za"], "じ": ["ji", "zi"], "ず": ["zu"], "ぜ": ["ze"], "ぞ": ["zo"],
        "だ": ["da"], "ぢ": ["di"], "づ": ["du"], "で": ["de"], "ど": ["do"],
        "ば": ["ba"], "び": ["bi"], "ぶ": ["bu"], "べ": ["be"], "ぼ": ["bo"],

        // 半濁音
        "ぱ": ["pa"], "ぴ": ["pi"], "ぷ": ["pu"], "ぺ": ["pe"], "ぽ": ["po"],

        // 拗音 (きゃ行など)
        "きゃ": ["kya", "kixya"], "きゅ": ["kyu", "kixyu"], "きぇ": ["kye", "kixye"], "きょ": ["kyo", "kixyo"],
        "ぎゃ": ["gya", "gixya"], "ぎゅ": ["gyu", "gixyu"], "ぎぇ": ["gye", "gixye"],"ぎょ": ["gyo", "gixyo"],
        "しゃ": ["sha", "sya", "sixya"], "しゅ": ["shu", "syu", "sixyu"], "しぇ": ["she", "sye", "sixye"], "しょ": ["sho", "syo", "sixyo"],
        "じゃ": ["ja", "zya", "jixya"], "じゅ": ["ju", "zyu", "jixyu"], "じぇ": ["je", "zye", "jixye"], "じょ": ["jo", "zyo", "jixyo"],
        "ちゃ": ["tya", "cha", "chixya"], "ちゅ": ["tyu", "chu", "chixyu"], "ちぇ": ["tye", "che", "chixye"], "ちょ": ["tyo", "cho", "chixyo"],
        "ぢゃ": ["dya"], "ぢゅ": ["dyu"], "ぢぇ": ["dye"], "ぢょ": ["dyo"],
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
        this.possibles = []; // ここには {romaji: string, priority: number[]} が入る
        this.setProblem(hiraganaStr);
    }

    /**
     * 新しい問題文字列を設定し、バッファをリセットする
     * @param {string} newStr - 新しい問題（ひらがな文字列）
     */
    setProblem(newStr) {
        this.nowStr = newStr;
        this.buffer = "";
        // 可能なローマ字を計算してキャッシュ (オブジェクトの配列)
        this.possibles = this._getPossibleRomajiObjects();
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

    //
    // --- _getPossibleRomaji メソッドは削除 ---
    //

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
        // this.possibles は {romaji: string, ...}[] の配列
        if (!this.possibles.some(p => p.romaji.startsWith(testBuffer))) {
            return false;
        }

        // マッチし、かつ完了
        // (testBuffer と完全に一致する romaji が存在するか)
        if (this.possibles.some(p => p.romaji === testBuffer)) {
            this.buffer = testBuffer; // バッファを更新
            return null; // 完了
        }

        // マッチしたが、まだ途中
        this.buffer = testBuffer; // バッファを更新
        return true; // 途中
    }

    /**
    * 現在の問題（ひらがな）から、あり得るローマ字表記の全組み合わせを、
    * 優先順位情報 (priority配列) と共に計算して返す。
    *
    * @returns {Array<{romaji: string, priority: number[]}>}
    * 優先順位オブジェクトの配列。priority は各ひらがなブロックのインデックス配列 (低いほど優先)
    * @private
    */
    _getPossibleRomajiObjects() {
        if (!this.nowStr) {
            return [{ romaji: "", priority: [] }];
        }

        const chars = TypingJudge._splitHiragana(this.nowStr);
        // romajiLists には {romaji: string, priority: number} の配列の配列が入る
        const romajiLists = [];
        let i = 0;

        while (i < chars.length) {
            const ch = chars[i];

            // 1. 促音 ("っ") の処理
            if (ch === "っ" && i + 1 < chars.length) {
                const nextCh = chars[i + 1];
                const nextRomajiList = TypingJudge.romanTable[nextCh] || [];
                // 次が子音か？ (母音(aiueo)始まりでなく、'ん' でもない)
                const nextIsConsonant = nextRomajiList.length > 0 && !"aiueo".includes(nextRomajiList[0][0]) && nextCh !== "ん";

                // A. 次が子音の場合 (優先処理が必要)
                if (nextIsConsonant) {
                    const blockOptions = []; // このブロックの {romaji, priority} リスト
                    const addedRomaji = new Set(); // 重複追加防止
                    let currentPriority = 0;

                    // 優先グループ 1: 子音重ね (tta, ttsu, ttya, ccha, tcha など)
                    // nextRomajiList (例: ["tya", "cha"]) の順序を尊重して優先度を割り当てる
                    for (const nr of nextRomajiList) {
                        if (nr.startsWith("ch")) {
                            const r1 = "t" + nr; // tcha
                            if (!addedRomaji.has(r1)) {
                                blockOptions.push({ romaji: r1, priority: currentPriority++ });
                                addedRomaji.add(r1);
                            }
                            const r2 = "c" + nr; // ccha
                            if (!addedRomaji.has(r2)) {
                                blockOptions.push({ romaji: r2, priority: currentPriority++ });
                                addedRomaji.add(r2);
                            }
                        }
                        const firstCon = TypingJudge._firstConsonant(nr);
                        if (firstCon) {
                            const r3 = firstCon + nr; // ttya (ch以外), tta, ttsu
                            if (!addedRomaji.has(r3)) {
                                blockOptions.push({ romaji: r3, priority: currentPriority++ });
                                addedRomaji.add(r3);
                            }
                        }
                    }

                    // 優先グループ 2: 単体「っ」 + 次の文字 (xtuta, ltuta, xtuttsu など)
                    const sokuonSingle = TypingJudge.romanTable["っ"] || ["xtu", "ltu"];
                    const nextOptions = nextRomajiList.length > 0 ? nextRomajiList : [nextCh];

                    // _getProductStrings (デカルト積) を利用
                    const xtuProducts = TypingJudge._getProductStrings([sokuonSingle, nextOptions]);

                    for (const r of xtuProducts) {
                        if (!addedRomaji.has(r)) {
                            blockOptions.push({ romaji: r, priority: currentPriority++ });
                            addedRomaji.add(r);
                        }
                    }

                    romajiLists.push(blockOptions);
                    i += 2; // 2文字消費 ("っ" と "た")
                    continue; // whileループの次へ
                }

                // B. 次が子音でない (母音、'ん'、記号、文末)
                // (ch === "っ" の if ブロック内)
                else {
                    // 通常の「っ」単体処理
                    const options = TypingJudge.romanTable["っ"] || ["xtu", "ltu"];
                    romajiLists.push(options.map((r, idx) => ({ romaji: r, priority: idx })));
                    i += 1; // 1文字消費 ("っ" のみ)
                    continue; // whileループの次へ
                }
            } // "っ" の処理終わり

            // 2. "ん" の処理
            // ★★★ 優先順位ロジックを変更 ★★★
            else if (ch === "ん") {
                const optionsSet = new Set();
                let tableOrder = TypingJudge.romanTable["ん"] || ["n", "nn"]; // デフォルト (n 優先)

                if (i + 1 < chars.length) {
                    const nextCh = chars[i + 1];
                    const nextRomajiList = TypingJudge.romanTable[nextCh] || [];

                    // 次の文字の種類を判定
                    const isVowel = ["あ", "い", "う", "え", "お", "ぁ", "ぃ", "ぅ", "ぇ", "ぉ"].includes(nextCh);
                    const isY = ["や", "ゆ", "よ", "ゃ", "ゅ", "ょ"].includes(nextCh);
                    let isN = false;
                    if (nextRomajiList.length > 0) {
                        for (const nr of nextRomajiList) {
                            if (nr.startsWith("n")) isN = true;
                        }
                    }

                    if (isVowel) { // んあ, んい... (例: かんい)
                        // 'nn' (nni) のみ許可
                        optionsSet.add("nn");
                        tableOrder = ["nn", "n"]; // nn 優先 (n は set にないので実質 "nn" のみ)
                    } else if (isY) { // んや, んゆ, んよ (例: こんや)
                        // 'nn' (nnya) を優先
                        optionsSet.add("nn");
                        optionsSet.add("n");
                        tableOrder = ["nn", "n"]; // nn 優先
                    } else if (isN) { // んな, んに... (例: そんな)
                        // 'nn' (nnna) を優先
                        optionsSet.add("n");
                        optionsSet.add("nn");
                        tableOrder = ["nn", "n"]; // nn 優先
                    } else { // その他子音 (かんと) or 漢字/記号
                        // 'n' (kanto) を優先
                        optionsSet.add("n");
                        optionsSet.add("nn");
                        tableOrder = ["n", "nn"]; // n 優先 (デフォルトのまま)
                    }
                } else {
                    // 文末の "ん"
                    optionsSet.add("nn");
                    tableOrder = ["nn", "n"];
                }

                // 優先順位付け
                const blockOptions = [];
                let currentPriority = 0;
                for (const r of tableOrder) {
                    if (optionsSet.has(r)) {
                        blockOptions.push({ romaji: r, priority: currentPriority++ });
                    }
                }
                // もしテーブルにない表記 (例: 'm') が Set に入っていたら、末尾に追加
                for (const r of optionsSet) {
                    if (!tableOrder.includes(r)) {
                        blockOptions.push({ romaji: r, priority: currentPriority++ });
                    }
                }

                romajiLists.push(blockOptions.length > 0 ? blockOptions : [{ romaji: "n", priority: 0 }]); // フォールバック
                i += 1;
            } // "ん" の処理終わり

            // 3. その他の文字
            else {
                // テーブル定義に基づく (漢字などは [ch] になる)
                const options = TypingJudge.romanTable[ch] || [ch];
                romajiLists.push(options.map((r, idx) => ({ romaji: r, priority: idx })));
                i += 1;
            }
        } // while ループ終わり

        // --- デカルト積 (優先順位配列を生成) ---
        if (romajiLists.length === 0) {
            return [{ romaji: "", priority: [] }];
        }

        let accumulator = [{ romaji: "", priority: [] }]; // {romaji: string, priority: number[]}

        for (const currentList of romajiLists) { // 例: [{romaji: "tta", priority: 0}, {romaji: "xtuta", priority: 1}]
            const result = [];
            for (const acc of accumulator) { // 例: {romaji: "ka", priority: [0]}
                for (const current of currentList) {
                    result.push({
                        romaji: acc.romaji + current.romaji,
                        priority: [...acc.priority, current.priority] // 例: [0, 0] or [0, 1]
                    });
                }
            }
            accumulator = result;
        }

        // --- 重複除去 (優先順位が低いものを除く) ---
        const uniqueResults = new Map();
        for (const item of accumulator) {
            if (!uniqueResults.has(item.romaji)) {
                uniqueResults.set(item.romaji, item);
            } else {
                // 重複した場合、優先順位が高い方 (priority配列が辞書順で小さい方) を残す
                const existing = uniqueResults.get(item.romaji);
                if (TypingJudge._comparePriority(item.priority, existing.priority) < 0) {
                    uniqueResults.set(item.romaji, item);
                }
            }
        }

        return Array.from(uniqueResults.values());
    }

    /**
     * 優先順位配列 (number[]) を辞書順で比較する
     * @param {number[]} prioA
     * @param {number[]} prioB
     * @returns {number} a < b なら -1, a > b なら 1, a == b なら 0
     * @private
     * @static
     */
    static _comparePriority(prioA, prioB) {
        const len = Math.min(prioA.length, prioB.length);
        for (let i = 0; i < len; i++) {
            if (prioA[i] < prioB[i]) return -1;
            if (prioA[i] > prioB[i]) return 1;
        }
        // 長さが同じなら 0
        return prioA.length - prioB.length;
    }


    /**
     * (★修正)
     * 現在の入力バッファ (str) で始まる、あり得るローマ字表記をすべて返す。
     * @param {string} str - 現在の入力文字列 (例: "katt")
     * @returns {Array<{romaji: string, priority: number[]}>}
     * str で始まるローマ字表記と優先度オブジェクトの配列
     */
    getMatchingPossibles(str) {
        // setProblem でキャッシュされた this.possibles を使う
        return this.possibles.filter(p => p.romaji.startsWith(str));
    }

    /**
     * (★修正)
     * 現在の入力バッファ (str) で始まる、あり得るローマ字表記のうち、
     * 最も優先順位が高いもの (「っ」の子音重ね優先、「ん」の要求優先など) を1つ返す。
     *
     * @param {string} str - 現在の入力文字列 (例: "katt")
     * @returns {string | null}
     * 最も優先度の高いローマ字表記(文字列)。見つからなければ null。
     */
    getBestMatch(str) {
        // this.possibles を利用する getMatchingPossibles を呼ぶ
        const matches = this.getMatchingPossibles(str);

        if (matches.length === 0) {
            return null;
        }

        // 優先順位 (priority配列) を比較してソートし、最初のもの (最も小さいもの) を返す
        matches.sort((a, b) => TypingJudge._comparePriority(a.priority, b.priority));

        return matches[0].romaji;
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
            //const levels = {"2":[["あい","愛"],["あお","青"],["あか","赤"],["あき","秋"],["あさ","朝"],["あじ","アジ"],["あな","穴"],["あに","兄"],["あめ","雨"],["いえ","家"],["いか","イカ"],["いし","石"],["いす","イス"],["いと","糸"],["いど","井戸"],["いぬ","犬"],["いま","今"],["いろ","色"],["いみ","意味"],["うし","牛"],["うた","歌"],["うそ","嘘"],["うに","ウニ"],["うま","馬"],["うみ","海"],["うめ","梅"],["えい","エイ"],["えき","駅"],["えび","海老"],["えみ","笑み"],["かい","貝"],["かさ","カサ"],["かぜ","風"],["かに","カニ"],["かべ","壁"],["かみ","神"],["かわ","川"],["がむ","ガム"],["がか","画家"],["きく","キク"],["きた","北"],["きぬ","絹"],["くさ","草"],["くに","国"],["くま","クマ"],["くも","雲"],["ぐみ","グミ"],["けん","剣"],["こめ","米"],["こい","恋"],["こな","粉"],["ごご","午後"],["ごむ","ゴム"],["さば","サバ"],["さら","皿"],["さる","サル"],["じか","時価"],["しか","シカ"],["しき","四季"],["しろ","城"],["すし","寿司"],["すな","砂"],["せき","席"],["せみ","セミ"],["ぜろ","ゼロ"],["そり","ソリ"],["ぞう","象"],["たい","タイ"],["たけ","竹"],["たこ","タコ"],["たま","タマ"],["ちか","地下"],["ちえ","知恵"],["ちり","地理"],["つき","月"],["つり","釣り"],["つる","ツル"],["てら","寺"],["とら","トラ"],["とり","鳥"],["どあ","ドア"],["どく","毒"],["なみ","波"],["なつ","夏"],["なす","ナス"],["にし","西"],["にわ","庭"],["ねた","ネタ"],["ねぎ","ネギ"],["ねこ","猫"],["のり","ノリ"],["はな","花"],["はむ","ハム"],["ぱぱ","パパ"],["はる","春"],["ぱん","パン"],["ばす","バス"],["ひる","昼"],["ぴざ","ピザ"],["ふゆ","冬"],["ぶか","部下"],["ぶき","武器"],["ほし","星"],["ほね","骨"],["ぽち","ポチ"],["まち","町"],["まま","ママ"],["みち","道"],["みみ","耳"],["みけ","ミケ"],["むし","虫"],["むら","村"],["もり","森"],["もも","モモ"],["やね","屋根"],["ゆき","雪"],["ゆみ","弓"],["よち","予知"],["よる","夜"],["わに","ワニ"]],"3":[["あいす","アイス"],["あかり","明かり"],["あさり","アサリ"],["あなご","アナゴ"],["あひる","アヒル"],["あふろ","アフロ"],["あわび","アワビ"],["いくら","イクラ"],["いちご","イチゴ"],["いわし","イワシ"],["うさぎ","ウサギ"],["うなぎ","ウナギ"],["おちゃ","お茶"],["おふろ","お風呂"],["おやつ","おやつ"],["かーぶ","カーブ"],["かえる","カエル"],["かっぱ","カッパ"],["かぬー","カヌー"],["かれー","カレー"],["かんじ","漢字"],["きのこ","キノコ"],["きほん","基本"],["きっく","キック"],["くるま","車"],["くろず","黒酢"],["けいと","毛糸"],["けだま","毛玉"],["こあら","コアラ"],["こいん","コイン"],["こたつ","コタツ"],["こっぷ","コップ"],["ことり","小鳥"],["ごるふ","ゴルフ"],["さくら","桜"],["さんそ","酸素"],["さんま","サンマ"],["しげん","資源"],["しじみ","シジミ"],["しっぽ","尻尾"],["しまい","姉妹"],["ずけい","図形"],["すいか","スイカ"],["すきー","スキー"],["すずめ","スズメ"],["ずぼん","ズボン"],["ずーむ","ズーム"],["するめ","スルメ"],["せかい","世界"],["ぜりー","ゼリー"],["そすう","素数"],["ぞんび","ゾンビ"],["たんか","短歌"],["だいや","ダイヤ"],["だがし","駄菓子"],["だーつ","ダーツ"],["だれ？","誰？"],["つくえ","机"],["つつじ","つつじ"],["でんわ","電話"],["とまと","トマト"],["とんぼ","トンボ"],["なめこ","なめこ"],["なまず","ナマズ"],["にっき","日記"],["にゃー","ニャー"],["ねごと","寝言"],["のーと","ノート"],["ばけつ","バケツ"],["ばった","バッタ"],["ばっと","バット"],["ばなな","バナナ"],["はなび","花火"],["はまち","ハマチ"],["ぱんつ","パンツ"],["ぱんだ","パンダ"],["ひみつ","秘密"],["ひっし","必死"],["ひつじ","ヒツジ"],["びーる","ビール"],["ぴんち","ピンチ"],["ぴあの","ピアノ"],["ぶーつ","ブーツ"],["ぷりん","プリン"],["ぼーる","ボール"],["ぼきん","募金"],["ほたて","ホタテ"],["まうす","マウス"],["まぐろ","マグロ"],["まっぷ","マップ"],["まっち","マッチ"],["みかん","ミカン"],["みるく","ミルク"],["むしば","虫歯"],["めいし","名刺"],["めいろ","迷路"],["めだか","メダカ"],["めろん","メロン"],["もぐら","モグラ"],["もでる","モデル"],["やさい","野菜"],["やもり","ヤモリ"],["ゆうひ","夕日"],["ゆうき","勇気"],["よなか","夜中"],["よっと","ヨット"],["らっこ","ラッコ"],["らいむ","ライム"],["りぼん","リボン"],["りんご","りんご"],["るびー","ルビー"],["れいわ","令和"],["れたす","レタス"],["れんず","レンズ"],["ろっく","ロック"],["わー！","わー！"],["わーい","わーい"],["わがし","和菓子"],["わさび","ワサビ"]],"4":[["あいこん","アイコン"],["あおぞら","青空"],["あさがお","朝顔"],["あざらし","アザラシ"],["あぼかど","アボカド"],["あまえび","甘エビ"],["いいね！","いいね！"],["いっぽん","一本"],["いのしし","イノシシ"],["うみのひ","海の日"],["うぐいす","ウグイス"],["うめしゅ","梅酒"],["えんがわ","えんがわ"],["おおとろ","大トロ"],["おかりな","オカリナ"],["おにぎり","おにぎり"],["おはなみ","お花見"],["おまつり","お祭り"],["おむれつ","オムレツ"],["おれんじ","オレンジ"],["かおもじ","顔文字"],["かずのこ","数の子"],["がっこう","学校"],["かまきり","カマキリ"],["かぼちゃ","かぼちゃ"],["かまくら","かまくら"],["かんぱち","カンパチ"],["かんふー","カンフー"],["ぎんがみ","銀紙"],["ぎちょう","議長"],["きばせん","騎馬戦"],["きゃべつ","キャベツ"],["きゃんぷ","キャンプ"],["きんぎょ","金魚"],["きんぱつ","金髪"],["くっきー","クッキー"],["くつした","靴下"],["くりっく","クリック"],["ぐろーぶ","グローブ"],["けしごむ","消しゴム"],["けんだま","けんだま"],["けんさく","検索"],["こうちゃ","紅茶"],["こーひー","コーヒー"],["こくばん","黒板"],["こしあん","こしあん"],["さいころ","サイコロ"],["さーかす","サーカス"],["さーもん","サーモン"],["さっかー","サッカー"],["ざりがに","ザリガニ"],["しきしゃ","指揮者"],["ししゃも","ししゃも"],["しまうま","シマウマ"],["しゃべる","シャベル"],["じょーく","ジョーク"],["しょどう","書道"],["しんかい","深海"],["じんせい","人生"],["すーぱー","スーパー"],["すきやき","スキヤキ"],["すけーと","スケート"],["すこっぷ","スコップ"],["すずむし","鈴虫"],["すらいむ","スライム"],["ずつき","頭突き"],["せんとう","銭湯"],["ぜんたい","全体"],["そうじき","掃除機"],["そぷらの","ソプラノ"],["ぞくせい","属性"],["だいこん","大根"],["たいふう","台風"],["たいまー","タイマー"],["たこやき","たこ焼き"],["たちよみ","立ち読み"],["たくしー","タクシー"],["たんぽぽ","たんぽぽ"],["ちきゅう","地球"],["ちちのひ","父の日"],["ちゃいむ","チャイム"],["ちょきん","貯金"],["つんでれ","ツンデレ"],["つぶあん","つぶあん"],["でこぴん","でこピン"],["てーぶる","テーブル"],["てつどう","鉄道"],["ともだち","友達"],["とんねる","トンネル"],["どーなつ","ドーナツ"],["どんぐり","どんぐり"],["ながぐつ","長靴"],["なまはむ","生ハム"],["にわとり","ニワトリ"],["にんげん","人間"],["にんじゃ","忍者"],["ぬるまゆ","ぬるま湯"],["ねたばれ","ネタバレ"],["ねくたい","ネクタイ"],["はくしゅ","拍手"],["はちみつ","蜂蜜"],["ばったー","バッター"],["はつゆめ","初夢"],["ははのひ","母の日"],["はんせい","反省"],["ばんぱー","バンパー"],["びしょう","微笑"],["ひきょう","秘境"],["ぴんぽん","ピンポン"],["ふぁいる","ファイル"],["ふぃるむ","フィルム"],["ふうりん","風鈴"],["ふじさん","富士山"],["ぶらんど","ブランド"],["へいせい","平成"],["へんしん","変身"],["ぺんぎん","ペンギン"],["ほしぞら","星空"],["ぼーなす","ボーナス"],["ぼくとう","木刀"],["ぽいんと","ポイント"],["まじっく","マジック"],["まめまき","豆まき"],["みじんこ","ミジンコ"],["みかづき","三日月"],["むぎちゃ","麦茶"],["むえたい","ムエタイ"],["めかくし","目隠し"],["めんせき","面積"],["ものくろ","モノクロ"],["もくひょう","目標"],["やしのき","ヤシの木"],["やじるし","矢印"],["やきゅう","野球"],["ゆうやけ","夕焼け"],["ゆたんぽ","湯たんぽ"],["ようかい","妖怪"],["よーよー","ヨーヨー"],["らーめん","ラーメン"],["らいおん","ライオン"],["ろうそく","ろうそく"],["りーだー","リーダー"],["ろぐいん","ログイン"],["わたがし","綿菓子"],["わるぢえ","悪知恵"]],"5":[["あきはばら","秋葉原"],["あくせんと","アクセント"],["あめちゃん","飴ちゃん"],["あめとむち","アメとムチ"],["あめふらし","アメフラシ"],["あるまじろ","アルマジロ"],["あんけーと","アンケート"],["いいてんき","いい天気"],["いいゆだな","いい湯だな"],["いやしけい","癒し系"],["うでどけい","腕時計"],["えいがかん","映画館"],["えいたんご","英単語"],["えめらるど","エメラルド"],["えちけっと","エチケット"],["えどじだい","江戸時代"],["えどばくふ","江戸幕府"],["えびふらい","エビフライ"],["おおそうじ","大掃除"],["おーとばい","オートバイ"],["おきにいり","お気に入り"],["おとしあな","落とし穴"],["おふさいど","オフサイド"],["おままごと","おままごと"],["おむらいす","オムライス"],["おやこどん","親子丼"],["おんらいん","オンライン"],["かうんたー","カウンター"],["かせいじん","火星人"],["かたたたき","肩叩き"],["かたるしす","カタルシス"],["かーりんぐ","カーリング"],["かっぱまき","カッパ巻き"],["かみねんど","紙粘土"],["かれんだー","カレンダー"],["かんがるー","カンガルー"],["きもだめし","肝試し"],["きーぼーど","キーボード"],["ぎゃらりー","ギャラリー"],["きょうだい","兄弟"],["くりすたる","クリスタル"],["くれーたー","クレーター"],["くろいねこ","黒い猫"],["けんきゅう","研究"],["けいけんち","経験値"],["こいのぼり","鯉のぼり"],["こうきあつ","高気圧"],["ごーじゃす","ゴージャス"],["ごぜんさま","午前様"],["こどものひ","こどもの日"],["こんさーと","コンサート"],["こんにちは","こんにちは"],["さくらさく","サクラサク"],["さくらもち","さくらもち"],["さくらんぼ","さくらんぼ"],["さふぁいあ","サファイア"],["さようなら","さようなら"],["しくらめん","シクラメン"],["しろいこな","白い粉"],["しゃったー","シャッター"],["じゃんぐる","ジャングル"],["しゃんぱん","シャンパン"],["しゅりけん","手裏剣"],["しょうかき","消火器"],["しんだふり","死んだふり"],["しんちょう","身長"],["しんぶんし","新聞紙"],["すいさいが","水彩画"],["すとらいく","ストライク"],["すいかわり","スイカ割り"],["すとれーと","ストレート"],["すなどけい","砂時計"],["するめいか","スルメイカ"],["ずわいがに","ズワイガニ"],["せかいちず","世界地図"],["せいきまつ","世紀末"],["そーせーじ","ソーセージ"],["そりてぃあ","ソリティア"],["ぞうりむし","ゾウリムシ"],["たいじゅう","体重"],["だいとかい","大都会"],["だいにんき","大人気"],["たいぴんぐ","タイピング"],["たからばこ","宝箱"],["たっきゅう","卓球"],["たまごやき","玉子焼き"],["たらばがに","タラバガニ"],["ちへいせん","地平線"],["ちゃーはん","チャーハン"],["ちゅうとろ","中トロ"],["ちょうちょ","ちょうちょ"],["ちょんまげ","ちょんまげ"],["ちらしずし","ちらしズシ"],["ちんじゅう","珍獣"],["ついったー","ツイッター"],["つるとかめ","鶴と亀"],["つけまつげ","つけまつげ"],["てぃっしゅ","ティッシュ"],["てぃらみす","ティラミス"],["でざいなー","デザイナー"],["てっかまき","鉄火巻き"],["てでぃべあ","テディベア"],["とうきょうと","東京都"],["どらいやー","ドライヤー"],["とらくたー","トラクター"],["なつまつり","夏祭り"],["ななしさん","名無しさん"],["なまけもの","ナマケモノ"],["にほんちず","日本地図"],["にわかあめ","にわか雨"],["ぬいぐるみ","ぬいぐるみ"],["ねがてぃぶ","ネガティブ"],["ねこぱんち","猫パンチ"],["ねったいや","熱帯夜"],["ねむりひめ","眠り姫"],["のうかがく","脳科学"],["のぼりざか","登り坂"],["はーもにか","ハーモニカ"],["ばいおりん","バイオリン"],["はつひので","初日の出"],["はなふぶき","花吹雪"],["はむすたー","ハムスター"],["はりけーん","ハリケーン"],["ひかえしつ","控え室"],["ひざこぞう","ひざ小僧"],["ひなあられ","ひなあられ"],["ひょうがき","氷河期"],["びりやーど","ビリヤード"],["ぴらみっど","ピラミッド"],["ふぃるたー","フィルター"],["ぶゆうでん","武勇伝"],["ぶるどっぐ","ブルドッグ"],["ふるほんや","古本屋"],["ぷろのわざ","プロの技"],["へやのなか","部屋の中"],["ぺんたごん","ペンタゴン"],["へるめっと","ヘルメット"],["ほうせんか","ホウセンカ"],["ぼうりんぐ","ボウリング"],["ぼたんえび","ボタン海老"],["ほんきのめ","本気の目"],["まねきねこ","招き猫"],["まよねーず","マヨネーズ"],["まんほーる","マンホール"],["みずしぶき","水しぶき"],["みにちゅあ","ミニチュア"],["むしめがね","虫メガネ"],["むじんとう","無人島"],["めだまやき","目玉焼き"],["めんちかつ","メンチカツ"],["もんすたー","モンスター"],["もんぶらん","モンブラン"],["もあいぞう","モアイ像"],["やきざかな","焼き魚"],["やまのかみ","山の神"],["ゆうえんち","遊園地"],["ゆきだるま","雪だるま"],["よーぐると","ヨーグルト"],["よっぱらい","酔っ払い"],["らふれしあ","ラフレシア"],["らんきんぐ","ランキング"],["らんどせる","ランドセル"],["りこーだー","リコーダー"],["りさいくる","リサイクル"],["りんごあめ","りんご飴"],["るーれっと","ルーレット"],["れんしゅう","練習"],["れいぞうこ","冷蔵庫"],["ろんぐぱす","ロングパス"],["ろっぽんぎ","六本木"],["ろぶすたー","ロブスター"],["わいしゃつ","ワイシャツ"],["わたぼこり","綿ぼこり"]],"6":[["あーてぃすと","アーティスト"],["あきのよなが","秋の夜長"],["あきれすけん","アキレス腱"],["あじのひもの","アジの干物"],["あすぱらがす","アスパラガス"],["あすふぁると","アスファルト"],["あっとまーく","アットマーク"],["あっぷるぱい","アップルパイ"],["あらおくさま","あら奥様"],["いきとうごう","意気投合"],["いただきます","いただきます"],["いちごじゃむ","イチゴジャム"],["いぬとさんぽ","犬と散歩"],["いろえんぴつ","色鉛筆"],["うせつきんし","右折禁止"],["うっとりする","うっとりする"],["えいきゅうし","永久歯"],["えくささいず","エクササイズ"],["えれべーたー","エレベーター"],["えんでぃんぐ","エンディング"],["おいなりさん","おいなりさん"],["おーくしょん","オークション"],["おくりばんと","送りバント"],["おこのみやき","お好み焼き"],["おひめさま","お姫様"],["おばけやしき","お化け屋敷"],["おりんぴっく","オリンピック"],["かそうつうか","仮想通貨"],["かぞくかいぎ","家族会議"],["かいすいよく","海水浴"],["かみたいおう","神対応"],["かいてんずし","回転寿司"],["かおすりろん","カオス理論"],["かすたねっと","カスタネット"],["がちゃがちゃ","ガチャガチャ"],["からーこぴー","カラーコピー"],["がったいろぼ","合体ロボ"],["きまつてすと","期末テスト"],["きんにくつう","筋肉痛"],["きょうりゅう","恐竜"],["くらりねっと","クラリネット"],["くりきんとん","栗きんとん"],["ぐんかんまき","軍艦巻き"],["げんばあわせ","現場合わせ"],["けんびきょう","顕微鏡"],["げりらごうう","ゲリラ豪雨"],["こあくまてき","小悪魔的"],["ごちそうさま","ごちそうさま"],["こっくぴっと","コックピット"],["こねこちゃん","子猫ちゃん"],["こはるびより","小春日和"],["こだいいせき","古代遺跡"],["こわいはなし","怖い話"],["こんぴゅーた","コンピュータ"],["ごきげんよう","ごきげんよう"],["さんだんとび","三段跳び"],["さっきょくか","作曲家"],["ざしきわらし","座敷わらし"],["しーらかんす","シーラカンス"],["しきおりおり","四季折々"],["しごのせかい","死後の世界"],["しゃーべっと","シャーベット"],["じゃあまたね","じゃあまたね"],["しゃぼんだま","シャボン玉"],["しょうりんじ","少林寺"],["しりめつれつ","支離滅裂"],["しんかいぎょ","深海魚"],["しんはっけん","新発見"],["しんりてすと","心理テスト"],["じかんがない","時間がない"],["すいへいせん","水平線"],["すとっきんぐ","ストッキング"],["すかいつりー","スカイツリー"],["すいぞくかん","水族館"],["せいじんのひ","成人の日"],["せんもんてん","専門店"],["ぜんごさゆう","前後左右"],["そこなしぬま","底なし沼"],["たいおんけい","体温計"],["たいがどらま","大河ドラマ"],["たいそうふく","体操服"],["たんじょうび","誕生日"],["だいなまいと","ダイナマイト"],["たいむかーど","タイムカード"],["たからのちず","宝の地図"],["たすけてー！","助けてー！"],["ちーずけーき","チーズケーキ"],["ちきんかれー","チキンカレー"],["ちゃわんむし","茶碗蒸し"],["ちゅうこしゃ","中古車"],["ちょきんばこ","貯金箱"],["ちょこれーと","チョコレート"],["つかいまわし","使いまわし"],["でぃすぷれい","ディスプレイ"],["てんきよほう","天気予報"],["でんしじしょ","電子辞書"],["でんわちょう","電話帳"],["といぷーどる","トイプードル"],["どうそうかい","同窓会"],["どうろこうじ","道路工事"],["とおんきごう","ト音記号"],["としでんせつ","都市伝説"],["としょいいん","図書委員"],["とどうふけん","都道府県"],["どうぶつえん","動物園"],["どこいくの？","どこ行くの？"],["とらんぺっと","トランペット"],["ないやあんだ","内野安打"],["なべぶぎょう","鍋奉行"],["なっとうきん","納豆菌"],["にんぎょひめ","人魚姫"],["ぬかよろこび","ぬか喜び"],["ぬすみぎき","盗み聞き"],["ねいるあーと","ネイルアート"],["ねこじゃらし","猫じゃらし"],["ねこにこばん","猫に小判"],["ねしょうがつ","寝正月"],["ねったいぎょ","熱帯魚"],["ねみみにみず","寝耳に水"],["のんびりする","のんびりする"],["のらりくらり","のらりくらり"],["ぱいなっぷる","パイナップル"],["はつかねずみ","ハツカネズミ"],["はるのおがわ","春の小川"],["はるのあらし","春の嵐"],["びしょうねん","美少年"],["ひっこしそば","引越しそば"],["ひつじのむれ","羊の群れ"],["ひっちはいく","ヒッチハイク"],["ひっぱりだこ","ひっぱりだこ"],["びなんびじょ","美男美女"],["ひなたぼっこ","ひなたぼっこ"],["ひのようじん","火の用心"],["ふぁんくらぶ","ファンクラブ"],["ふくじんづけ","福神漬け"],["ぶるーべりー","ブルーベリー"],["ふらんすぱん","フランスパン"],["ふるまらそん","フルマラソン"],["ぶろっこりー","ブロッコリー"],["べんりつーる","便利ツール"],["ぺっとぼとる","ペットボトル"],["へりこぷたー","ヘリコプター"],["へんじがない","返事がない"],["ほしがきれい","星がきれい"],["ぽっぷこーん","ポップコーン"],["ぽてとさらだ","ポテトサラダ"],["まなつのよる","真夏の夜"],["まだまだだな","まだまだだな"],["まほうつかい","魔法使い"],["まんげきょう","万華鏡"],["みぎくりっく","右クリック"],["みちにまよう","道に迷う"],["むりをしない","無理をしない"],["むちゃくちゃ","無茶苦茶"],["むげんるーぷ","無限ループ"],["むかしばなし","昔話"],["めからうろこ","目からウロコ"],["めとろのーむ","メトロノーム"],["めろんそーだ","メロンソーダ"],["もんだいてん","問題点"],["やっぱりむり","やっぱり無理"],["やすみじかん","休み時間"],["ゆにばーさる","ユニバーサル"],["よがのぽーず","ヨガのポーズ"],["よじじゅくご","四字熟語"],["らいとあっぷ","ライトアップ"],["りかのてすと","理科のテスト"],["るーるぶっく","ルールブック"],["れいんこーと","レインコート"],["れべるあっぷ","レベルアップ"],["ろーるけーき","ロールケーキ"],["わんたんめん","ワンタンメン"],["わいんぐらす","ワイングラス"]],"7":[["あさのあいさつ","朝のあいさつ"],["あにめーしょん","アニメーション"],["あわいはつこい","淡い初恋"],["いすとりげーむ","椅子取りゲーム"],["いじょうじたい","異常事態"],["いそぎんちゃく","イソギンチャク"],["いちごだいふく","イチゴ大福"],["いんたーねっと","インターネット"],["うちあげはなび","打ち上げ花火"],["えすかれーたー","エスカレーター"],["えんぴつけずり","鉛筆削り"],["おうさまげーむ","王様ゲーム"],["おしおください","お塩ください"],["おたまじゃくし","おたまじゃくし"],["おとこのろまん","男のロマン"],["おににかなぼう","鬼に金棒"],["おはだつるつる","お肌つるつる"],["おりーぶおいる","オリーブオイル"],["おんそくのかべ","音速の壁"],["かっぷらーめん","カップラーメン"],["かていさいえん","家庭菜園"],["かまくらばくふ","鎌倉幕府"],["がめんをたっち","画面をタッチ"],["かそうげんじつ","仮想現実"],["きえるまきゅう","消える魔球"],["きゅうりょうび","給料日"],["ぎむきょういく","義務教育"],["きゃっちこぴー","キャッチコピー"],["ぎんこうこうざ","銀行口座"],["きょうのにっき","今日の日記"],["ぐーちょきぱー","グーチョキパー"],["くもりのちはれ","くもりのち晴れ"],["ぐっすりねむる","ぐっすり眠る"],["くりにそっくり","栗にそっくり"],["くらいまっくす","クライマックス"],["けいたいでんわ","携帯電話"],["けっこんします","結婚します"],["けいかくどおり","計画通り"],["けんさくさいと","検索サイト"],["こくごのてすと","国語のテスト"],["こさじいっぱい","小さじ一杯"],["こうそくどうろ","高速道路"],["ごはんまだー？","ご飯まだー？"],["さいふおとした","財布落とした"],["さつえいきんし","撮影禁止"],["さぼてんのはな","サボテンの花"],["さるのこしかけ","さるのこしかけ"],["さんじのおやつ","三時のおやつ"],["ざんねんしょう","残念賞"],["ざりがにつり","ザリガニ釣り"],["しあいそくほう","試合速報"],["じぐそーぱずる","ジグソーパズル"],["しちめんちょう","七面鳥"],["しつもんじこう","質問事項"],["しはつれっしゃ","始発列車"],["じゃんけんぽん","じゃんけんポン"],["しゅいをきーぷ","首位をキープ"],["しゅーくりーむ","シュークリーム"],["しゅんぶんのひ","春分の日"],["しょううちゅう","小宇宙"],["しょーとけーき","ショートケーキ"],["じゃんぐるじむ","ジャングルジム"],["すけっちぶっく","スケッチブック"],["すいっちをおす","スイッチを押す"],["すずめのなみだ","スズメの涙"],["すまーとふぉん","スマートフォン"],["せいざうらない","星座占い"],["せきゆすとーぶ","石油ストーブ"],["ぜつめつのきき","絶滅の危機"],["せみのぬけがら","セミの抜け殻"],["せんこうはなび","線香花火"],["せんしょくたい","染色体"],["せんたくびより","洗濯びより"],["そつぎょうしき","卒業式"],["そらのおうじゃ","空の王者"],["たいないどけい","体内時計"],["たっきゅうびん","宅急便"],["だぶるくりっく","ダブルクリック"],["ちぇっくめいと","チェックメイト"],["ちょうだのれつ","長蛇の列"],["つんどらちたい","ツンドラ地帯"],["つぶらなひとみ","つぶらな瞳"],["でじたるかめら","デジタルカメラ"],["でんわばんごう","電話番号"],["てれびばんぐみ","テレビ番組"],["とびだすえほん","飛び出す絵本"],["どじょうすくい","どじょうすくい"],["どんでんがえし","どんでん返し"],["ながしそうめん","流しそうめん"],["なないろのにじ","七色の虹"],["なぞのじんぶつ","謎の人物"],["にちようだいく","日曜大工"],["にほんのこころ","日本の心"],["にゅうがくしき","入学式"],["にんきたれんと","人気タレント"],["ぬるめのおふろ","ぬるめのお風呂"],["ぬきうちてすと","抜き打ちテスト"],["ねーむぷれーと","ネームプレート"],["ねこにまたたび","猫にマタタビ"],["ねちがえました","寝違えました"],["ねるこはそだつ","寝る子は育つ"],["ねんまつねんし","年末年始"],["のーとぱそこん","ノートパソコン"],["のるまたっせい","ノルマ達成"],["のあのはこぶね","ノアの箱舟"],["ばーげんせーる","バーゲンセール"],["はーどでぃすく","ハードディスク"],["ばいうぜんせん","梅雨前線"],["はいすいのじん","背水の陣"],["ぱいぷおるがん","パイプオルガン"],["ばうむくーへん","バウムクーヘン"],["はくしにもどす","白紙に戻す"],["はげしいらいう","激しい雷雨"],["はしりたかとび","走り高跳び"],["はっぴーえんど","ハッピーエンド"],["はなげでてるよ","鼻毛でてるよ"],["はなよりだんご","花より団子"],["ばらのはなたば","バラの花束"],["はれーすいせい","ハレー彗星"],["ぱんどらのはこ","パンドラの箱"],["ひだりくりっく","左クリック"],["ひっこしました","引っ越しました"],["ぴったりさいず","ぴったりサイズ"],["ひまわりのたね","ヒマワリの種"],["ひよこぴよぴよ","ひよこピヨピヨ"],["ふぉーくぎたー","フォークギター"],["ふくざつかいき","複雑怪奇"],["ぶらっくほーる","ブラックホール"],["ぷらねたりうむ","プラネタリウム"],["ぶろっくくずし","ブロック崩し"],["へんしんふよう","返信不要"],["ぺぺろんちーの","ぺペロンチーノ"],["ほんだなのうら","本棚の裏"],["ぼうはんぶざー","防犯ブザー"],["ぽきっておれた","ポキッて折れた"],["ほくとしちせい","北斗七星"],["ほわいとぼーど","ホワイトボード"],["まいなすいおん","マイナスイオン"],["まりんすぽーつ","マリンスポーツ"],["まちがいさがし","間違い探し"],["まっしろなゆき","真っ白な雪"],["まつたけごはん","マツタケご飯"],["まっちゃぷりん","抹茶プリン"],["みくろのせかい","ミクロの世界"],["みりおんせらー","ミリオンセラー"],["むぎわらぼうし","麦わら帽子"],["むじゅうりょく","無重力"],["めいしこうかん","名刺交換"],["めーるあどれす","メールアドレス"],["めざましどけい","目覚まし時計"],["めじゃーりーぐ","メジャーリーグ"],["めらにんしきそ","メラニン色素"],["もーたーぼーと","モーターボート"],["やまたのおろち","ヤマタノオロチ"],["やけいしにみず","焼け石に水"],["ゆうたいりだつ","幽体離脱"],["ゆうびんきょく","郵便局"],["ようせいのくに","妖精の国"],["らーめんらいす","ラーメンライス"],["らじおたいそう","ラジオ体操"],["らすとすぱーと","ラストスパート"],["りかのじっけん","理科の実験"],["りっぷくりーむ","リップクリーム"],["りゅうがくせい","留学生"],["るびーのゆびわ","ルビーの指輪"],["るーむさーびす","ルームサービス"],["るすばんでんわ","留守番電話"],["れんこんのあな","レンコンの穴"],["れとるとかれー","レトルトカレー"],["ろーすとちきん","ローストチキン"],["ろーるきゃべつ","ロールキャベツ"],["ろけっとぱんち","ロケットパンチ"],["ろじょうらいぶ","路上ライブ"],["ろっかーるーむ","ロッカールーム"],["わかばのきせつ","若葉の季節"]],"8":[["あいさいべんとう","愛妻弁当"],["あんこくぶっしつ","暗黒物質"],["あたたかいひざし","あたたかい日差し"],["あるひのできごと","ある日の出来事"],["あんごうかいどく","暗号解読"],["あんぜんだいいち","安全第一"],["いいおあじですね","いいお味ですね"],["いがいないちめん","意外な一面"],["いけばながしゅみ","生け花が趣味"],["いたくしないでね","痛くしないでね"],["いちえんたりない","一円足りない"],["いちえんひろった","一円拾った"],["いっせきにちょう","一石二鳥"],["いっぴきおおかみ","一匹狼"],["いらっしゃいませ","いらっしゃいませ"],["いわしのかんづめ","イワシの缶詰"],["うーぱーるーぱー","ウーパールーパー"],["うそでもいいから","嘘でもいいから"],["うちゅうせいふく","宇宙征服"],["うちゅうゆうえい","宇宙遊泳"],["えいぷりるふーる","エイプリルフール"],["えびでたいをつる","エビでタイを釣る"],["えんじんぜんかい","エンジン全開"],["えんぶんひかえめ","塩分控えめ"],["おおさじいっぱい","大さじ一杯"],["おさきにしつれい","お先に失礼"],["おはだにやさしい","お肌に優しい"],["おもしろはんぶん","面白半分"],["おりかえしちてん","折り返し地点"],["おれじゃないって","俺じゃないって"],["かぼちゃのばしゃ","カボチャの馬車"],["かいちゅうどけい","懐中時計"],["かくやすぶっけん","格安物件"],["からしめんたいこ","からしめんたいこ"],["かるしうむぶそく","カルシウム不足"],["がんばれにっぽん","頑張れニッポン"],["きしょうえいせい","気象衛星"],["きせつのでざーと","季節のデザート"],["きっくぼくしんぐ","キックボクシング"],["きょうだいげんか","兄弟げんか"],["きんだんのかじつ","禁断の果実"],["きみょうなはなし","奇妙な話"],["くうきがおいしい","空気がおいしい"],["ぐれーぷふるーつ","グレープフルーツ"],["けいりょうかっぷ","計量カップ"],["けんさくえんじん","検索エンジン"],["げーむでざいなー","ゲームデザイナー"],["けんとうをいのる","健闘を祈る"],["こいんらんどりー","コインランドリー"],["ごうかきゃくせん","豪華客船"],["こうぎょうちたい","工業地帯"],["ごうこんしようよ","合コンしようよ"],["こーひーぶれいく","コーヒーブレイク"],["こーんぽたーじゅ","コーンポタージュ"],["ここだけのはなし","ここだけの話"],["ことりのさえずり","小鳥のさえずり"],["こんちゅうずかん","昆虫図鑑"],["こんびにべんとう","コンビニ弁当"],["さいごのしゅだん","最後の手段"],["さくらのはなびら","桜の花びら"],["さんかくじょうぎ","三角定規"],["さんきんこうたい","参勤交代"],["ししゃものたまご","シシャモの卵"],["しふくのひととき","至福のひととき"],["しゃーぷぺんしる","シャープペンシル"],["じゃんけんぽん！","ジャンケンポン！"],["じゅくれんのわざ","熟練の技"],["しゅのーけりんぐ","シュノーケリング"],["しょうきんかせぎ","賞金稼ぎ"],["しょちゅうみまい","暑中見舞い"],["しろながすくじら","シロナガスクジラ"],["しんかいのしんぴ","深海の神秘"],["しんこんりょこう","新婚旅行"],["しんたいそくてい","身体測定"],["じんたいのしくみ","人体のしくみ"],["しんれいしゃしん","心霊写真"],["しんれいすぽっと","心霊スポット"],["すいぶんほきゅう","水分補給"],["すかいだいびんぐ","スカイダイビング"],["せいしゅんのひび","青春の日々"],["せいけんこうたい","政権交代"],["せいとかいちょう","生徒会長"],["ぜんこくたいかい","全国大会"],["ぜったいおんかん","絶対音感"],["だっしゅつげーむ","脱出ゲーム"],["だちょうのたまご","ダチョウの卵"],["たっちたいぴんぐ","タッチタイピング"],["たなからぼたもち","棚からぼた餅"],["たきたてのごはん","炊き立てのご飯"],["たましいのさけび","魂の叫び"],["たんぽぽのわたげ","タンポポの綿毛"],["ちゃーしゅーめん","チャーシューメン"],["ちゃぶだいがえし","ちゃぶ台返し"],["ちゅうかんてすと","中間テスト"],["ちゅうしゃじょう","駐車場"],["ちょうのうりょく","超能力"],["つちのこはっけん","ツチノコ発見"],["ついできごころで","つい出来心で"],["つめたいむぎちゃ","冷たい麦茶"],["つるのおんがえし","ツルの恩返し"],["でぱーとでまいご","デパートで迷子"],["でみぐらすそーす","デミグラスソース"],["てれびのりもこん","テレビのリモコン"],["てんごくとじごく","天国と地獄"],["てんたいかんそく","天体観測"],["とうきょうたわー","東京タワー"],["とうめいにんげん","透明人間"],["とうようのまじょ","東洋の魔女"],["ときすでにおそし","時すでに遅し"],["とつぜんのらいう","突然の雷雨"],["どらごんふるーつ","ドラゴンフルーツ"],["にほんだいひょう","日本代表"],["にゅーすそくほう","ニュース速報"],["にんじんはきらい","ニンジンは嫌い"],["ねこがたろぼっと","ネコ型ロボット"],["ねっけつきょうし","熱血教師"],["ねっとさーふぃん","ネットサーフィン"],["ねぼうしちゃった","寝坊しちゃった"],["ばーすでーけーき","バースデーケーキ"],["はっしゅどびーふ","ハッシュドビーフ"],["はわいにいきたい","ハワイに行きたい"],["ばんじーじゃんぷ","バンジージャンプ"],["ひかりふぁいばー","光ファイバー"],["びじょとやじゅう","美女と野獣"],["ひっこしびんぼう","引越し貧乏"],["ひっとえんどらん","ヒットエンドラン"],["ひゃくまんぼると","百万ボルト"],["ぴらみっどぱわー","ピラミッドパワー"],["ふざいちゃくしん","不在着信"],["ぶらっくこーひー","ブラックコーヒー"],["ぶらっくぺっぱー","ブラックペッパー"],["ふりーまーけっと","フリーマーケット"],["ぷりんあらもーど","プリンアラモード"],["ふんだりけったり","踏んだり蹴ったり"],["へいせいがんねん","平成元年"],["べんきょうちゅう","勉強中"],["ぺんぎんのおやこ","ペンギンの親子"],["ぼうさいくんれん","防災訓練"],["ほわいとたいがー","ホワイトタイガー"],["ほーむぽじしょん","ホームポジション"],["ほしのおうじさま","星の王子様"],["ぼっしゅうします","没収します"],["ぼんごれびあんこ","ボンゴレビアンコ"],["まかでみあなっつ","マカデミアナッツ"],["まっかなたいよう","真っ赤な太陽"],["まさかのけつまつ","まさかの結末"],["まかろにぐらたん","マカロニグラタン"],["みすてりーつあー","ミステリーツアー"],["むりかもしれない","無理かもしれない"],["めりーくりすます","メリークリスマス"],["めだかのかんさつ","メダカの観察"],["もうけんちゅうい","猛犬注意"],["もぎたてふるーつ","もぎたてフルーツ"],["もってけどろぼー","持ってけドロボー"],["やきとうもろこし","焼きとうもろこし"],["やきゅうひとすじ","野球一筋"],["ゆうじゅうふだん","優柔不断"],["ゆびきりげんまん","ゆびきりげんまん"],["よわたりじょうず","世渡り上手"],["よくわかりません","よくわかりません"],["らずべりーじゃむ","ラズベリージャム"],["らべんだーばたけ","ラベンダー畑"],["りくるーとすーつ","リクルートスーツ"],["りょうりのれしぴ","料理のレシピ"],["りゅうぐうじょう","竜宮城"],["るいはともをよぶ","類は友を呼ぶ"],["れいとうころっけ","冷凍コロッケ"],["ろんりてきしこう","論理的思考"],["わーぷろけんてい","ワープロ検定"],["わかめのすのもの","ワカメの酢の物"]],"9":[["ああいえばこういう","ああ言えばこう言う"],["あかいちゅーりっぷ","赤いチューリップ"],["あさがおのかんさつ","朝顔の観察"],["あさりのおみそしる","アサリのお味噌汁"],["あしがしびれました","足がしびれました"],["あなたにひとめぼれ","あなたに一目ぼれ"],["あめあがりのよぞら","雨上がりの夜空"],["ありのすのかんさつ","アリの巣の観察"],["あんしょうばんごう","暗証番号"],["あんですさんみゃく","アンデス山脈"],["いそっぷものがたり","イソップ物語"],["いぬようしゃんぷー","犬用シャンプー"],["いまなんじですか？","今何時ですか？"],["いんすぴれーしょん","インスピレーション"],["いんたーなしょなる","インターナショナル"],["うくれれきょうしつ","ウクレレ教室"],["うつくしいにほんご","美しい日本語"],["えいかいわれっすん","英会話レッスン"],["えんきょりれんあい","遠距離恋愛"],["えねるぎーせつやく","エネルギー節約"],["えんぜるふぃっしゅ","エンゼルフィッシュ"],["えいがかんでひるね","映画館で昼寝"],["おしゃれなでざいん","おしゃれなデザイン"],["おくまんちょうじゃ","億万長者"],["おつかれさまでした","お疲れ様でした"],["おんをあだでかえす","恩を仇で返す"],["かいちゅうでんとう","懐中電灯"],["かえるのこはかえる","カエルの子はカエル"],["かくれてもむだだ！","隠れても無駄だ！"],["かしきりろてんぶろ","貸切露天風呂"],["がんばってください","頑張ってください"],["からくりにんぎょう","カラクリ人形"],["かんぜんねんしょう","完全燃焼"],["かんようしょくぶつ","観葉植物"],["きたいしてそんした","期待して損した"],["きゃんぷふぁいやー","キャンプファイヤー"],["きょうがくのじじつ","驚愕の事実"],["きゃべつのせんぎり","キャベツの千切り"],["きんだんのまじゅつ","禁断の魔術"],["くうきせいじょうき","空気清浄機"],["くうちゅうぶらんこ","空中ブランコ"],["くらしっくおんがく","クラシック音楽"],["くもゆきがあやしい","雲行きが怪しい"],["けっこんおめでとう","結婚おめでとう"],["ごうかくはっぴょう","合格発表"],["ごちそうさまでした","ごちそうさまでした"],["ことばのまじゅつし","言葉の魔術師"],["こねこのにくきゅう","子猫の肉球"],["こらーげんはいごう","コラーゲン配合"],["これはぺんですか？","これはペンですか？"],["さーびすざんぎょう","サービス残業"],["さいこうしんきろく","最高新記録"],["さるもきからおちる","サルも木から落ちる"],["さんぎょうかくめい","産業革命"],["じぇっとこーすたー","ジェットコースター"],["しゃかいのはぐるま","社会の歯車"],["しゃったーちゃんす","シャッターチャンス"],["しゅうがくりょこう","修学旅行"],["しゅうごうしゃしん","集合写真"],["しょくごのこーひー","食後のコーヒー"],["しゅうちゅうごうう","集中豪雨"],["じゅけんべんきょう","受験勉強"],["しょうわのうたひめ","昭和の歌姫"],["しんちくまんしょん","新築マンション"],["しんにゅうしゃいん","新入社員"],["すとれすかいしょう","ストレス解消"],["すぺしゃるさんくす","スペシャルサンクス"],["すぺしゃるぷらいす","スペシャルプライス"],["せきららなこくはく","赤裸々な告白"],["せんこうししゃかい","先行試写会"],["せんごくだいみょう","戦国大名"],["せんせいのくちぐせ","先生の口癖"],["そうたいせいりろん","相対性理論"],["そつぎょうしゃしん","卒業写真"],["たいせつなしょるい","大切な書類"],["たいむぱらどっくす","タイムパラドックス"],["たいりょくそくてい","体力測定"],["たびにでたいきぶん","旅に出たい気分"],["たましいのいちげき","魂の一撃"],["たんさんいんりょう","炭酸飲料"],["ちちしぼりたいけん","乳搾り体験"],["ちゃれんじせいしん","チャレンジ精神"],["ちょうりしめんきょ","調理師免許"],["ちょこれーとぱふぇ","チョコレートパフェ"],["ちょっときゅうけい","ちょっと休憩"],["ちんたいまんしょん","賃貸マンション"],["つきがきれいですね","月がきれいですね"],["でんせつのゆうしゃ","伝説の勇者"],["でんきをたいせつに","電気を大切に"],["でぐちのないめいろ","出口のない迷路"],["とくめいきぼうさん","匿名希望さん"],["どれみふぁそらしど","ドレミファソラシド"],["とろぴかるふるーつ","トロピカルフルーツ"],["なすかのちじょうえ","ナスカの地上絵"],["なんきょくたいりく","南極大陸"],["にかいからめぐすり","二階から目薬"],["にほんこくけんぽう","日本国憲法"],["にんきてーまぱーく","人気テーマパーク"],["ぬけみちをはっけん","抜け道を発見"],["ねったいていきあつ","熱帯低気圧"],["のーひっとのーらん","ノーヒットノーラン"],["ばいおてくのろじー","バイオテクノロジー"],["ばくはつてきにんき","爆発的人気"],["はっこうだいおーど","発光ダイオード"],["ぱんくいきょうそう","パン食い競争"],["はんばーぐすてーき","ハンバーグステーキ"],["ひっこしのじゅんび","引っ越しの準備"],["ひにあぶらをそそぐ","火に油を注ぐ"],["ふぁっしょんざっし","ファッション雑誌"],["ふぃぎゅあすけーと","フィギュアスケート"],["ふうりょくはつでん","風力発電"],["ふるーつのおうさま","フルーツの王様"],["ふるもでるちぇんじ","フルモデルチェンジ"],["ぷれぜんてーしょん","プレゼンテーション"],["ぷろふぇっしょなる","プロフェッショナル"],["ふわふわぱんけーき","ふわふわパンケーキ"],["へいきんじゅみょう","平均寿命"],["ぽけっとてぃっしゅ","ポケットティッシュ"],["ほほえみのきこうし","微笑みの貴公子"],["ほんじつのおすすめ","本日のおすすめ"],["まいごのごあんない","迷子のご案内"],["まくらなげしようぜ","枕投げしようぜ"],["みちのせいめいたい","未知の生命体"],["みすてりーさーくる","ミステリーサークル"],["みつかってしまった","見つかってしまった"],["むちこくむけっせき","無遅刻無欠席"],["むじんとうせいかつ","無人島生活"],["めんてなんすふりー","メンテナンスフリー"],["もっこうようぼんど","木工用ボンド"],["やきゅうちゅうけい","野球中継"],["ゆうきゅうきゅうか","有給休暇"],["ゆうさんそうんどう","有酸素運動"],["ゆーらしあたいりく","ユーラシア大陸"],["らくせきにちゅうい","落石に注意"],["りゅうぐうのつかい","リュウグウノツカイ"],["ゆうえんちででーと","遊園地でデート"],["れいとうしょくひん","冷凍食品"],["れいんぼーぶりっじ","レインボーブリッジ"],["ろうかをはしらない","廊下を走らない"],["わふうどれっしんぐ","和風ドレッシング"]],"10":[["あけましておめでとう","あけましておめでとう"],["あしたからだいえっと","あしたからダイエット"],["あしたてんきになーれ","あした天気になーれ"],["あまずっぱいおもいで","甘酸っぱい思い出"],["あなごいっぽんにぎり","アナゴ一本握り"],["あまいものはべつばら","甘いものは別腹"],["いせえびたべほうだい","伊勢海老食べ放題"],["いちごしょーとけーき","イチゴショートケーキ"],["いっきゅうにゅうこん","一球入魂"],["いつみてもきれいだね","いつ見てもきれいだね"],["うまのみみにねんぶつ","馬の耳に念仏"],["うんめいのあかいいと","運命の赤い糸"],["うさぎをもふもふする","ウサギをモフモフする"],["えいかいわきょうしつ","英会話教室"],["えびふらいていしょく","エビフライ定食"],["おあそびはここまでだ","お遊びはここまでだ"],["おおぐいせんしゅけん","大食い選手権"],["おきにいりにとうろく","お気に入りに登録"],["おちゅうげんのきせつ","お中元の季節"],["おとしだまちょうだい","お年玉ちょうだい"],["おんせんにいきたいな","温泉に行きたいな"],["おりょうりきょうしつ","お料理教室"],["かいようしんそうすい","海洋深層水"],["かせいじんしゅうらい","火星人襲来"],["がっこうきゅうしょく","学校給食"],["がっこうのななふしぎ","学校の七不思議"],["かりふぉるにあろーる","カリフォルニアロール"],["かるしうむがたりない","カルシウムが足りない"],["かわいいちわわですね","可愛いチワワですね"],["きおくにございません","記憶にございません"],["きゅうしょくとうばん","給食当番"],["きょうのおすすめひん","今日のおすすめ品"],["くりすますぱーてぃー","クリスマスパーティー"],["くるみわりにんぎょう","くるみ割り人形"],["けいぞくはちからなり","継続は力なり"],["けつえきがたうらない","血液型占い"],["こうかいさきにたたず","後悔先に立たず"],["こうちゃせんもんてん","紅茶専門店"],["こんびにえんすすとあ","コンビニエンスストア"],["こーひーぎゅうにゅう","コーヒー牛乳"],["こたつからでられない","こたつから出られない"],["こわいはなししようぜ","怖い話しようぜ"],["さいこうのゆきげしき","最高の雪景色"],["さいしゅうしょくさき","再就職先"],["さんまがやすいですよ","サンマが安いですよ"],["ししざりゅうせいぐん","獅子座流星群"],["しゅーてぃんぐげーむ","シューティングゲーム"],["じゃくてんがまるみえ","弱点が丸見え"],["じょうがいほーむらん","場外ホームラン"],["じょうしょうきりゅう","上昇気流"],["しょうばいはんじょう","商売繁盛"],["しょうりんじけんぽう","少林寺拳法"],["しょっぴんぐせんたー","ショッピングセンター"],["しるばーあくせさりー","シルバーアクセサリー"],["しんじゅのねっくれす","真珠のネックレス"],["じんせいのぶんきてん","人生の分岐点"],["しんでれらすとーりー","シンデレラストーリー"],["すいーつたべほうだい","スイーツ食べ放題"],["ずいずいずっころばし","ずいずいずっころばし"],["すがおはみせられない","素顔は見せられない"],["すきゅーばだいびんぐ","スキューバダイビング"],["すぺーすきーをれんだ","スペースキーを連打"],["せきゆふぁんひーたー","石油ファンヒーター"],["ぜんじどうせんたくき","全自動洗濯機"],["そうちょうらんにんぐ","早朝ランニング"],["そつぎょうぶんしゅう","卒業文集"],["たぴおかみるくてぃー","タピオカミルクティー"],["たばこがやめられない","タバコがやめられない"],["だるまさんがころんだ","だるまさんが転んだ"],["だっしゅつせいこう！","脱出成功！"],["ちきゅうはあおかった","地球は青かった"],["とうきょうときょうと","東京と京都"],["とうほくしんかんせん","東北新幹線"],["どくしょかんそうぶん","読書感想文"],["といれはどこですか？","トイレはどこですか？"],["どらまちっくなであい","ドラマチックな出会い"],["どあのぶがとれました","ドアノブが取れました"],["なぞのおおいじんぶつ","謎の多い人物"],["なつやすみのえにっき","夏休みの絵日記"],["ぬいだらぬぎっぱなし","脱いだら脱ぎっぱなし"],["ねったいうりんきこう","熱帯雨林気候"],["のんあるこーるびーる","ノンアルコールビール"],["はさみでちょきちょき","はさみでチョキチョキ"],["はるかとおくのぎんが","はるか遠くの銀河"],["はんばーぐていしょく","ハンバーグ定食"],["ぴーまんもたべなさい","ピーマンも食べなさい"],["ふぁみりーれすとらん","ファミリーレストラン"],["ふとんからでられない","布団から出られない"],["ふろあがりのいっぱい","風呂上りの一杯"],["ぷろぐらみんぐげんご","プログラミング言語"],["へっどすらいでぃんぐ","ヘッドスライディング"],["ほしのないよるのそら","星のない夜の空"],["ほわいとちょこれーと","ホワイトチョコレート"],["まんしょんのいっしつ","マンションの一室"],["まやぶんめいのいせき","マヤ文明の遺跡"],["みそらーめんおおもり","味噌ラーメン大盛り"],["みぶんしょうめいしょ","身分証明書"],["みのがしてください！","見逃してください！"],["もうどうにでもなーれ","もうどうにでもなーれ"],["らいねんのかれんだー","来年のカレンダー"],["りくらいにんぐしーと","リクライニングシート"],["りょうりのさしすせそ","料理のさしすせそ"],["りょうりはあいじょう","料理は愛情"],["るーるがわかりません","ルールがわかりません"],["ろうかにたってなさい","廊下に立ってなさい"],["ろうどうきじゅんほう","労働基準法"],["ろぐいんしてください","ログインしてください"],["わしょくかようしょく","和食か洋食"]],"11":[["あいにこっきょうはない","愛に国境はない"],["あおいそら、しろいくも","青い空、白い雲"],["あこがれのせーらーふく","あこがれのセーラー服"],["あせるとまちがえますよ","あせると間違えますよ"],["あたらしいげーむそふと","新しいゲームソフト"],["あめりかんふっとぼーる","アメリカンフットボール"],["ありがとうございました","ありがとうございました"],["いしのうえにもさんねん","石の上にも三年"],["いんたーねっとのしくみ","インターネットの仕組み"],["うんもじつりょくのうち","運も実力のうち"],["えいりあんがやってきた","エイリアンがやってきた"],["えきしょうでぃすぷれい","液晶ディスプレイ"],["えるにーにょげんしょう","エルニーニョ現象"],["えんのしたのちからもち","縁の下の力持ち"],["おかげさまでげんきです","おかげ様で元気です"],["おてあらいはあちらです","お手洗いはあちらです"],["おにのいぬまにせんたく","鬼の居ぬ間に洗濯"],["おにはそと、ふくはうち","鬼は外、福は内"],["おんらいんしょっぴんぐ","オンラインショッピング"],["かいいぬにてをかまれる","飼い犬に手を咬まれる"],["かきごおりはじめました","カキ氷始めました"],["かくしあじはおしょうゆ","隠し味はお醤油"],["かんどうてきなさいかい","感動的な再会"],["きょうせいしゅうりょう","強制終了"],["きょうはたのしかったよ","今日は楽しかったよ"],["きゃらめるぽっぷこーん","キャラメルポップコーン"],["きゅうきょくのせんたく","究極の選択"],["きんきんにひえたびーる","キンキンに冷えたビール"],["きんにくはうらぎらない","筋肉は裏切らない"],["ぐらふぃっくでざいなー","グラフィックデザイナー"],["けいえいこんさるたんと","経営コンサルタント"],["けっていてきしゅんかん","決定的瞬間"],["こうきゅうちょこれーと","高級チョコレート"],["こうしえんきゅうじょう","甲子園球場"],["こくみんけんこうほけん","国民健康保険"],["ここだけのはなしですが","ここだけの話ですが"],["ここからがほんばんです","ここからが本番です"],["こたつでみかんをたべる","こたつでみかんを食べる"],["これはくんれんではない","これは訓練ではない"],["こんやはかれーらいすよ","今夜はカレーライスよ"],["しぇふのきまぐれさらだ","シェフの気まぐれサラダ"],["じぶらるたるかいきょう","ジブラルタル海峡"],["じゃくにくきょうしょく","弱肉強食"],["しゅっけつだいさーびす","出血大サービス"],["じゅようときょうきゅう","需要と供給"],["しようじょうのちゅうい","使用上の注意"],["しょくちゅうしょくぶつ","食虫植物"],["しろいごはんがたべたい","白いご飯が食べたい"],["しまった、ねすごした！","しまった、寝過ごした！"],["すいまにはかてなかった","睡魔には勝てなかった"],["すくらんぶるこうさてん","スクランブル交差点"],["すきまにはいっちゃった","隙間に入っちゃった"],["ぜんざいさんをつぎこむ","全財産をつぎ込む"],["ぜんじどうさらあらいき","全自動皿洗い機"],["ぜんりょくをつくします","全力を尽くします"],["そっくりそのままかえす","そっくりそのまま返す"],["そっちはいきどまりだ！","そっちは行き止まりだ！"],["たいふうせっきんちゅう","台風接近中"],["たっきゅうでだっきゅう","卓球で脱臼"],["たつとりあとをにごさず","立つ鳥跡を濁さず"],["たべたらはをみがこうね","食べたら歯を磨こうね"],["たんじょうびおめでとう","誕生日おめでとう"],["たんじょうびぷれぜんと","誕生日プレゼント"],["ちょうじょうげんしょう","超常現象"],["ちょっとまってください","ちょっと待ってください"],["でぃすかうんとしょっぷ","ディスカウントショップ"],["とけいがこわれたんです","時計が壊れたんです"],["とらぶるしゅーてぃんぐ","トラブルシューティング"],["ねこのてもかりたいです","猫の手も借りたいです"],["はげしいりんぼーだんす","激しいリンボーダンス"],["ぱいなっぷるのかんづめ","パイナップルの缶詰"],["びーるのおいしいきせつ","ビールのおいしい季節"],["ひじょうじたいはっせい","非常事態発生"],["ふぁーぶるこんちゅうき","ファーブル昆虫記"],["ふだんぎはぱじゃまです","普段着はパジャマです"],["ふとんがこいしいきせつ","布団が恋しい季節"],["ぶりとかいてぶりとよむ","鰤と書いてブリと読む"],["ぶるーたす、おまえもか","ブルータス、お前もか"],["ほうふなぼきゃぶらりー","豊富なボキャブラリー"],["ほっかいどうちょくそう","北海道直送"],["ほっきょくとなんきょく","北極と南極"],["まったくおぼえていない","全く覚えていない"],["みりょくてきなあいてむ","魅力的なアイテム"],["むじんとうでさばいばる","無人島でサバイバル"],["もういちどやりなおそう","もう一度やり直そう"],["もうさいかんげんしょう","毛細管現象"],["ゆうしょうとろふぃー","優勝トロフィー"],["ゆりかごからはかばまで","揺りかごから墓場まで"],["ゆうしょうおめでとう！","優勝おめでとう！"],["よろしくおねがいします","よろしくお願いします"],["りもーとこんとろーらー","リモートコントローラー"],["りょくおうしょくやさい","緑黄色野菜"],["るーるをまもりましょう","ルールを守りましょう"],["わにがわのはんどばっぐ","ワニ革のハンドバッグ"]],"12":[["あいたくちがふさがらない","開いた口がふさがらない"],["あっぷるぱいをやきました","アップルパイを焼きました"],["あとはのとなれやまとなれ","あとは野となれ山となれ"],["あめがやんだらにじがでた","雨がやんだら虹が出た"],["あめりかんしょーとへあー","アメリカンショートヘアー"],["あるばいとぼしゅうちゅう","アルバイト募集中"],["あながあったらはいりたい","穴があったら入りたい"],["いざじんじょうにしょうぶ","いざ尋常に勝負"],["いぬはえいごでどっぐです","犬は英語でドッグです"],["いんくじぇっとぷりんたー","インクジェットプリンター"],["うちゅうせんちきゅうごう","宇宙船地球号"],["うんめいなんてしんじない","運命なんて信じない"],["おおばけのかのうせいあり","大化けの可能性あり"],["おしょうゆとってください","お醤油取って下さい"],["おもなとうじょうじんぶつ","主な登場人物"],["おんなごころとあきのそら","女心と秋の空"],["がーでにんぐがしゅみです","ガーデニングが趣味です"],["かいすいよくですいかわり","海水浴でスイカ割り"],["かさでごるふのれんしゅう","傘でゴルフの練習"],["かめのこうよりとしのこう","亀の甲より年の功"],["からしめんたいこおにぎり","辛子明太子おにぎり"],["かんさいこくさいくうこう","関西国際空港"],["かんぬこくさいえいがさい","カンヌ国際映画祭"],["きゃんぺーんじっしちゅう","キャンペーン実施中"],["ぎゅうにくのかるぱっちょ","牛肉のカルパッチョ"],["きょうはいいてんきですね","今日はいい天気ですね"],["ぐあむとさいぱんはちかい","グアムとサイパンは近い"],["くりすますつりーてんとう","クリスマスツリー点灯"],["ごくひぷろじぇくとしどう","極秘プロジェクト始動"],["ごじゆうにおもちください","ご自由にお持ち下さい"],["ごりようはけいかくてきに","ご利用は計画的に"],["こんしゅうのべすとせらー","今週のベストセラー"],["こんどはだいじょうぶです","今度は大丈夫です"],["ここはどこ、わたしはだれ","ここはどこ、私は誰"],["ここはおれがくいとめる！","ここは俺が食い止める！"],["こーひーにみるくいれる？","コーヒーにミルク入れる？"],["さいきどうがひつようです","再起動が必要です"],["さいこうきゅうしょくざい","最高級食材"],["さけといくらのおやこどん","鮭とイクラの親子丼"],["さけはのんでものまれるな","酒は飲んでも飲まれるな"],["さとうとしおをまちがえた","砂糖と塩を間違えた"],["さむいひがつづいています","寒い日が続いています"],["じぶんにたいするごほうび","自分に対するご褒美"],["しゅくだいをわすれました","宿題を忘れました"],["しょうがいぶつきょうそう","障害物競走"],["しんぞうにけがはえている","心臓に毛が生えている"],["しょりそくどをこうそくか","処理速度を高速化"],["じんせいやまありたにあり","人生山あり谷あり"],["しんりがくをせんこうする","心理学を専攻する"],["ずっとあそんでくらしたい","ずっと遊んで暮らしたい"],["ずっとこのままねていたい","ずっとこのまま寝ていたい"],["すもももももももものうち","スモモも桃も桃のうち"],["せかいいっしゅうりょこう","世界一周旅行"],["せんきょかんりいいんかい","選挙管理委員会"],["そこをうせつしてください","そこを右折してください"],["たいいくかんにしゅうごう","体育館に集合"],["だいひょうとりしまりやく","代表取締役"],["ただよりたかいものはない","タダより高いものは無い"],["ちゅーりっぷがさきました","チューリップが咲きました"],["ちきゅうがいせいめいたい","地球外生命体"],["どうしてもおもいだせない","どうしても思い出せない"],["とっきょしゅつがんちゅう","特許出願中"],["ながいよるになりそうです","長い夜になりそうです"],["ねこのくびにすずをつける","猫の首に鈴をつける"],["ねっきょうてきさぽーたー","熱狂的サポーター"],["ぱーそなるこんぴゅーた","パーソナルコンピュータ"],["はくばにのったおうじさま","白馬に乗った王子様"],["はたらくぱぱはかっこいい","働くパパはカッコイイ"],["はんにんはこのなかにいる","犯人はこの中にいる"],["ぱぱ、ぼくおとうとほしい","パパ、ぼく弟ほしい"],["ばみゅーだとらいあんぐる","バミューダトライアングル"],["はやおきはさんもんのとく","早起きは三文の得"],["ふゆしょうぐんのとうらい","冬将軍の到来"],["ほーむぺーじつくりました","ホームページ作りました"],["ほこりでくしゃみれんぱつ","ホコリでくしゃみ連発"],["ぼせいほんのうをくすぐる","母性本能をくすぐる"],["まどのそとはつめたいあめ","窓の外は冷たい雨"],["みかくにんひこうぶったい","未確認飛行物体"],["みいらとりがみいらになる","ミイラ取りがミイラになる"],["みそばたーこーんらーめん","味噌バターコーンラーメン"],["むじんとうにひょうちゃく","無人島に漂着"],["もうすこしまってください","もう少し待ってください"],["もりあがってまいりました","盛り上がってまいりました"],["ゆうじゅうふだんなひとね","優柔不断な人ね"],["らいばるしんにひがついた","ライバル心に火がついた"],["りょうしゅうしょください","領収書ください"],["りょうやくはくちににがし","良薬は口に苦し"],["わかったひとはてをあげて","分かった人は手を挙げて"],["われわれはうちゅうじんだ","ワレワレハウチュウジンダ"]],"13":[["あかでみーしょうじゅしょう","アカデミー賞受賞"],["あしたはあしたのかぜがふく","あしたはあしたの風が吹く"],["あぷりけーしょんえらーです","アプリケーションエラーです"],["いえにかえるまでがえんそく","家に帰るまでが遠足"],["いたいのいたいのとんでいけ","痛いの痛いの飛んで行け"],["いぬもあるけばぼうにあたる","イヌも歩けば棒にあたる"],["いわれたとおりにやったのに","言われた通りにやったのに"],["いんてりあこーでぃねーたー","インテリアコーディネーター"],["ういすきーをおんざろっくで","ウイスキーをオンザロックで"],["うえからよんでもしんぶんし","上から読んでも新聞紙"],["うちゅうじんにあいましたよ","宇宙人に会いましたよ"],["えさをあたえないでください","エサを与えないで下さい"],["えだげがふえてきになります","枝毛が増えて気になります"],["おいしいおにくがたべたいな","おいしいお肉が食べたいな"],["おさけはおとなになってから","お酒は大人になってから"],["かにくいりおれんじじゅーす","果肉入りオレンジジュース"],["かようびはていきゅうびです","火曜日は定休日です"],["かぶとむしたいくわがたむし","カブトムシ対クワガタムシ"],["きのうのてきはきょうのとも","昨日の敵は今日の友"],["きれいなはなにはとげがある","きれいな花にはトゲがある"],["きつねとたぬきのばかしあい","キツネとタヌキの化かし合い"],["こうもりはほにゅうるいです","コウモリは哺乳類です"],["ごかつやくをおいのりします","ご活躍をお祈りします"],["ここであったがひゃくねんめ","ここで会ったが百年目"],["こんやはろーるきゃべつです","今夜はロールキャベツです"],["さいこうきゅうのおもてなし","最高級のおもてなし"],["さんかくかんすうのおうよう","三角関数の応用"],["しかくいたたみをまるくはく","四角い畳を丸く掃く"],["したからよんでもしんぶんし","下から読んでも新聞紙"],["しょうねんよたいしをいだけ","少年よ大志を抱け"],["しんにゅうせいかんげいかい","新入生歓迎会"],["せいしのさかいをさまよう","生死の境をさまよう"],["せんしんこくしゅのうかいぎ","先進国首脳会議"],["そんなこわいかおするなって","そんな恐い顔するなって"],["だうんろーどをかいしします","ダウンロードを開始します"],["ただいまじゅんびちゅうです","ただ今準備中です"],["たたみにきのこがはえました","畳にキノコが生えました"],["だれもはんのうしてくれない","誰も反応してくれない"],["つかいすてこんたくとれんず","使い捨てコンタクトレンズ"],["ていきあつがはったつちゅう","低気圧が発達中"],["てんじょううらになにかいる","天井裏になにかいる"],["とくしょうははわいりょこう","特賞はハワイ旅行"],["とらぬたぬきのかわざんよう","取らぬ狸の皮算用"],["とりあえずびーるちょうだい","とりあえずビールちょうだい"],["どこからかしせんをかんじる","どこからか視線を感じる"],["なかよしこよしのおともだち","仲良しこよしのお友達"],["なまむぎなまごめなまたまご","生むぎ生ごめ生たまご"],["なんだかいやなよかんがする","何だか嫌な予感がする"],["にほんのしゅとはとうきょう","日本の首都は東京"],["にわにはにわにわとりがいる","庭には二羽にわとりがいる"],["ぱすわーどをいれてください","パスワードを入れてください"],["はりつめたくうきがただよう","張りつめた空気が漂う"],["ひじょうしきにもほどがある","非常識にも程がある"],["ひやしちゅうかはじめました","冷やし中華始めました"],["ひらめとかれいのみわけかた","ヒラメとカレイの見分け方"],["ぶりとはまちはおなじさかな","ブリとハマチは同じ魚"],["ぷーるさいどでにっこうよく","プールサイドで日光浴"],["みちのりょういきにふみこむ","未知の領域に踏み込む"],["めいわくめーるがおおすぎる","迷惑メールが多すぎる"],["めーるあどれすをまちがえた","メールアドレスを間違えた"],["めざましどけいにかちました","目覚まし時計に勝ちました"],["めじゃーりーぐへちょうせん","メジャーリーグへ挑戦"],["もうだめだ、こうさんしよう","もうだめだ、降参しよう"],["ゆうきゅうきゅうかをつかう","有給休暇を使う"],["ゆうこうきげんがきれました","有効期限が切れました"],["ゆかたのきれいなおねえさん","浴衣の綺麗なお姉さん"],["るすばんでんわさーびすです","留守番電話サービスです"],["わたしえいごわかりませーん","私英語ワカリマセーン"],["われおもう、ゆえにわれあり","我思う、故に我あり"]],"14":[["あかちゃんからめがはなせない","赤ちゃんから目が離せない"],["あかまきがみあおまきがみきまきがみ","赤巻紙青巻紙黄巻紙"],["あすのてんきよほうはあめです","あすの天気予報は雨です"],["あのゆうひにむかってだっしゅだ","あの夕日に向かってダッシュだ"],["あらかじめごりょうしょうください","あらかじめご了承ください"],["いたかったらみぎてをあげてください","痛かったら右手を上げてください"],["いつからそこにいたんですか？","いつからそこにいたんですか？"],["いいにゅーすとわるいにゅーす","いいニュースと悪いニュース"],["いままでほんとうにおせわになりました","今まで本当にお世話になりました"],["うそついたらはりせんぼんのーます","嘘ついたら針千本飲ーます"],["うそつきはどろぼうのはじまり","嘘つきは泥棒の始まり"],["うまれかわったぼくをみてください","生まれ変わった僕を見てください"],["えんりょしないでたくさんたべてね","遠慮しないでたくさん食べてね"],["おとこばっかりさんきょうだい","男ばっかり三兄弟"],["おじいさんはやまへしばかりに","おじいさんは山へ柴刈りに"],["おばあさんはかわへせんたくに","おばあさんは川へ洗濯に"],["おやつはとだなにはいっています","おやつは戸棚に入っています"],["かいとうらんにきにゅうしてください","解答欄に記入してください"],["かけこみじょうしゃはおやめください","駆け込み乗車はおやめください"],["かべにみみありしょうじにめあり","壁に耳あり障子に目あり"],["かれーらいすとはんばーぐがすきです","カレーライスとハンバーグが好きです"],["かわったしゅみをおもちですね","変わった趣味をお持ちですね"],["きのうのことはおぼえていません","昨日のことは覚えていません"],["きのうのつかれがまだとれない","昨日の疲れがまだとれない"],["きほんてきじんけんのそんちょう","基本的人権の尊重"],["ぎゃくてんさよならまんるいほーむらん","逆転サヨナラ満塁ホームラン"],["きゃびあはちょうざめのたまご","キャビアはチョウザメの卵"],["きんのおのですかぎんのおのですか","金の斧ですか銀の斧ですか"],["ぎょうれつのたえないにんきてん","行列の絶えない人気店"],["けいたいのでんげんをおきりください","携帯の電源をお切り下さい"],["げるまんみんぞくのだいいどう","ゲルマン民族の大移動"],["こうつうるーるをまもりましょう","交通ルールを守りましょう"],["さいふがこぜにでぱんぱんです","財布が小銭でパンパンです"],["こどものころからのゆめでした","子供の頃からの夢でした"],["このいっしゅんにすべてをかける","この一瞬に全てをかける"],["さいゆうしゅうしんじんしょう","最優秀新人賞"],["さくらぜんせんほくじょうちゅう","桜前線北上中"],["ざんねんなおしらせがあります","残念なお知らせがあります"],["じこしょうかいをしてください","自己紹介をしてください"],["しゅみはおちゃとおはなとおことです","趣味はお茶とお花とお琴です"],["しんとうきょうこくさいくうこう","新東京国際空港"],["しんちょうにさぎょうしてください","慎重に作業してください"],["しょるいにはんこをおしてください","書類にハンコを押してください"],["すいさんかなとりうむすいようえき","水酸化ナトリウム水溶液"],["ぜったいぜつめいのだいぴんち","絶体絶命の大ピンチ"],["せんとうをかいししてください","戦闘を開始してください"],["そこをまっすぐいってください","そこをまっすぐ行ってください"],["それでもちきゅうはまわっている","それでも地球は回っている"],["そろそろこころがおれそうです","そろそろ心が折れそうです"],["たいぴんぐにはじしんがあります","タイピングには自信があります"],["たいようけいだいさんわくせいちきゅう","太陽系第三惑星地球"],["たべてすぐねたらうしになりました","食べてすぐ寝たら牛になりました"],["たんすのかどにこゆびをぶつけた","タンスの角に小指をぶつけた"],["ちょうこうきゅうりぞーとほてる","超高級リゾートホテル"],["てすときかんまであといっしゅうかん","テスト期間まであと一週間"],["どこかでおあいしませんでしたか？","どこかでお会いしませんでしたか？"],["となりのきゃくはよくかきくうきゃくだ","隣の客はよく柿食う客だ"],["どらごんたいじにしゅっぱつだ","ドラゴン退治に出発だ"],["なつやすみのしゅくだいおわった？","夏休みの宿題終わった？"],["はいどろぷれーにんぐげんしょう","ハイドロプレーニング現象"],["はるのしんしょくしんはつばい","春の新色新発売"],["ぱすわーどをにゅうりょくしてください","パスワードを入力してください"],["ふぁーすとくらすにのってみたい","ファーストクラスに乗ってみたい"],["ふぁっしょんせんすになんあり","ファッションセンスに難あり"],["ふかふかのおふとんでねむりたい","ふかふかのお布団で眠りたい"],["ぶらうざはなにをつかっていますか？","ブラウザは何を使っていますか？"],["ほんのできごころだったんです","ほんの出来心だったんです"],["ほんとうにあったこわいはなし","本当にあった怖い話"],["まさちゅーせっつこうかだいがく","マサチューセッツ工科大学"],["またのおこしをおまちしております","またのお越しをお待ちしております"],["めずらしくしんけんなかおしてるね","珍しく真剣な顔してるね"],["もういちどおかけなおしください","もう一度お掛け直し下さい"],["もういちどちゃんすをください","もう一度チャンスをください"],["ももがどんぶらことながれてきました","桃がドンブラコと流れてきました"],["やっぱりやめておけばよかった","やっぱりやめておけばよかった"],["れいぞうこのぷりんしらない？","冷蔵庫のプリン知らない？"],["ろっぽうぜんしょをまるあんき","六法全書を丸暗記"]]};
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