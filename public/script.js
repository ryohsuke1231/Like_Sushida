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
const ai_mode = false;
let renda_ends = 0;

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
        id: "otegaru",
        keys: [2, 3, 4, 5, 6, 7], // 使用する文字数
        flow: [2, 3, 4, 5, 6, 7, 6, 5, 4, 3], // 単語取得の順番
        time: 60,
        price: 3000,
        amountMap: defaultAmountMap
    },
    osusume: {
        name: "お勧め 5,000円コース",
        id: "osusume",
        keys: [5, 6, 7, 8, 9, 10], // (仮)
        flow: [5, 6, 7, 8, 9, 10, 9, 8, 7, 6], // (仮)
        time: 90,
        price: 5000,
        amountMap: defaultAmountMap // (仮)
    },
    koukyuu: {
        name: "高級 10,000円コース",
        id: "koukyuu",
        keys: [9, 10, 11, 12, 13, 14], // (仮) ※14文字以上も含むべき
        flow: [9, 10, 11, 12, 13, 14, 13, 12, 11, 10], // (仮)
        time: 120,
        price: 10000,
        amountMap: defaultAmountMap // (仮)
    },
    ai_mode: {
        name: "AIモード",
        id: "ai_mode",
        time: null,
        price: null,
        amountMap: defaultAmountMap
    }
};


// --- 初期化処理 ---

document.addEventListener('DOMContentLoaded', initGame);

/**
 * ページの読み込みが完了したら実行される
 */
async function initGame() {
    //setTimeout(async () => {
        //document.getElementById('splash').classList.add('hide');

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

    //}, 1500);
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
    document.getElementById('jikan-plus').textContent = "　";
    document.getElementById('jikan-plus').classList.remove('fade');
    void document.getElementById('jikan-plus').offsetWidth;
    document.getElementById('jikan-plus').classList.add('fade');
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
    document.getElementById('ai-mode').addEventListener('click', () => startCourse(courses.ai_mode));

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
    renda_ends = 0;
    start = false;
    yomi = [];
    kanji = [];
    currentCourseConfig = {};

    // UIリセット
    renda.value = 0;
    document.getElementById('total_got_odai').textContent = '0 皿';
    document.getElementById('keys-per-second').textContent = '0.0 キー/秒';
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
async function startCourse(config) {
    resetGameState(); // (nokorijikan もリセットされる)
    if (config.id === "ai_mode") {
        currentCourseConfig = config;
        

        try {
            const response = await fetch('/api/generate2');
            const data = await response.json();

            // (2) fetch完了後、まだAIモードが選択されているかチェック
            // （ユーザーが「戻る」を押したり、別コースを選んだりしたら currentCourseConfig が変わっているはず）
            if (currentCourseConfig.id !== "ai_mode") {
                console.log("AI data fetched, but user navigated away. Discarding data.");
                return; // yomi/kanji を上書きしない
            }

            // (3) AIモードの単語をセット
            yomi = splitWithContext(data.yomi);
            kanji = splitWithContext(data.kanji);
            console.log(yomi);
            console.log(kanji);
            nokorijikan = null;
            remainingTime.textContent = ` `;
            remainingTime.style.display = 'none';
            
            document.getElementById('haratta').textContent = ``;
            

            //return;
        } catch (error) {
            console.error("AIモードのデータ取得に失敗:", error);
            // エラー時も、ユーザーが待機し続けないようコース選択に戻す
            showCourseSelection(); 
            return;
        }
    } else {
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
    document.getElementById('haratta').textContent = `${config.price}円 払って・・・`;

    }
    let plus = "";
    if (ippatsu === true) {
        plus = "　一発勝負";
    }
    start_text.textContent = 'スペースかEnterキーを押すとスタートします';
    document.getElementById('course').textContent = config.name + plus;
    // 4. 画面切り替え (スタート待機画面)
    selectBox.style.display = 'none';
    startBox.style.display = 'flex';
    centerBox.style.display = 'none';
    resultBox.style.display = 'none';

    // start フラグは false のまま (handleKeyDown が Enter/Space を待つ)
}
function splitWithContext(text) {
    const segments = [];
    let startIndex = 0;
    let inKakko = 0;      // () のネストレベル
    let inKagikakko = 0; // 「」のネストレベル

    for (let i = 0; i < text.length; i++) {
        const char = text[i];

        // カウンターの更新
        if (char === '(') {
            inKakko++;
        } else if (char === ')') {
            if (inKakko > 0) inKakko--;
        } else if (char === '「') {
            inKagikakko++;
        } else if (char === '」') {
            if (inKagikakko > 0) inKagikakko--;
        }

        // 分割判定
        if (char === '。') {
            // カッコの *外* にある「。」の場合のみ分割
            if (inKakko === 0 && inKagikakko === 0) {
                // startIndexから「。」の位置までを切り出す
                segments.push(text.substring(startIndex, i + 1));
                // 次のセグメントの開始位置を「。」の直後に更新
                startIndex = i + 1;
            }
        }
    }

    // 最後の「。」の後ろに残った文字列、
    // または「。」が一つもなかった場合の全文字列を追加
    // （startIndexが文字列長より短い場合のみ）
    if (startIndex < text.length) {
        segments.push(text.substring(startIndex));
    } else if (startIndex === text.length && text.endsWith('。')) {
        // 文字列が「。」でぴったり終わる場合は、
        // splitの挙動（最後に空文字列が入る）に合わせる
        //segments.push("");
    }


    return segments;
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
    //judge = new TypingJudge2(yomi[0]);
    document.getElementById('start-box-button').disabled = true;
    document.getElementById('start-text').textContent = 'スタート！';
    start = 1;
    // 1秒待ってからゲーム画面へ
    const odai_box = document.getElementById('odai-box');

    const items = odai_box.querySelectorAll('*');
    items.forEach(el => {
        el.style.whiteSpace = (currentCourseConfig.id === "ai_mode") ? 'normal' : 'nowrap';
    });

    setTimeout(() => {
        resultBox.style.display = 'none';
        centerBox.style.display = 'flex';
        startBox.style.display = 'none';

        // ゲーム開始処理
        start = true;
        start_time = Date.now();

        // 最初の単語 (yomi[0]) で Judge を初期化

        // 最初の単語をセット
        // ★★★ 修正点 2 ★★★
        // 最初の単語 (yomi[0]) で Judge を初期化
        // ゲームが本当に始まるこの瞬間に new する
        judge = new TypingJudge2(yomi[0]);

        // 最初の単語をセット
        i = 0;

        // ★★★ 修正点 3 ★★★
        // setNextWord(true) は内部で setProblem(yomi[0]) を呼ぶが、
        // judge は既に yomi[0] で初期化済み。
        // 無駄な再構築を防ぐため、setNextWord の中身をここに展開し、
        // setProblem を呼ばないようにする。

        // setNextWord(true); // ← この呼び出しを削除し、

        // ↓↓↓ setNextWord(true) の中身を展開 (setProblem以外)
        buffer = ""; 
        // judge.setProblem(yomi[i]); // ← 呼ばない (既に yomi[0] で初期化済み)
        textBox.textContent = kanji[i]; // i=0
        yomiBox.textContent = yomi[i]; // i=0
        possible_text.innerHTML = `
            <span style="color: #eee;">${judge.getBestMatch()}</span>
        `;
        // ↑↑↑ 修正ここまで

        // タイマースタート
        if (currentCourseConfig.id !== "ai_mode") {
            startTimer();
        }
        document.getElementById('start-box-button').disabled = false;

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
    if (!judge) {
        return; 
    }

    // 2. ゲーム中の処理
    const isSingleCharacter = event.key.length === 1;

    if (isSingleCharacter) {

        const result = judge.check(event.key);
        let now_time = Date.now();
        let elapsed_time = now_time - start_time;
        document.getElementById('keys-per-second').textContent = `${parseFloat(correct_keys_count / (elapsed_time / 1000)).toFixed(1)} キー/秒`;
        if (result === null) { // null は「完了」
            // ★修正: 完了キーも「正解」としてカウント
            correct_keys_count += 1; 

            renda_count += 1;
            renda.value = renda_count;

            updateRendaTime();

            // スコア計算 (i++ する前に行う)
            // 完了した単語 (yomi[i]) の文字数から金額を取得
            if (currentCourseConfig.id !== "ai_mode") {
                let _amount = currentCourseConfig.amountMap[yomi[i].length];
    
                console.log(`完了: ${yomi[i]} (文字数 ${yomi[i].length}, 金額 ${_amount})`);
    
                // HTMLの皿カウントID (100, 180, ...)
                if (_amount && amounts.includes(_amount)) {
                    const countEl = document.getElementById(`${_amount}_count`);
                    if (countEl) {
                        countEl.textContent = parseInt(countEl.textContent) + 1;
                    }
                }
                if (currentCourseConfig.id !== "ai_mode") {
                    // 合計皿数
                    document.getElementById('total_got_odai').textContent = `${i + 1} 皿`;
                    //document.getElementById('keys-per-second').textContent = `${parseFloat(correct_keys_count / (elapsed_time / 1000)).toFixed(1)} キー/秒`;
                }
            } else {
                
            }
            // 次の単語へ
            setNextWord();

        } else if (result === true) { // true は「途中」
            correct_keys_count += 1;
            renda_count += 1;
            renda.value = renda_count;
            buffer += event.key; // buffer は script.js 側で管理

            // ★★★ 修正 ★★★
            // 入力中テキスト表示 (入力済みを暗く、残りを明るく)
            // possible_text.innerHTML = `
            //    <span style="color: #444;">${buffer}</span>
            //    <span style="color: #eee;">${String(judge.getBestMatch(buffer)).substring(buffer.length)}</span>
            // `;

            const remaining = judge.getBestMatch(); // 引数なしで「残り」だけを取得
            possible_text.innerHTML = `
                <span style="color: #444;">${buffer}</span>
                <span style="color: #eee;">${remaining}</span>
            `;
            // ★★★ 修正ここまで ★★★
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
            //document.getElementById('keys-per-second').textContent = `${parseFloat(correct_keys_count / (elapsed_time / 1000)).toFixed(1)} キー/秒`;
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
        renda_ends += 1;
    }

    if (addedTime > 0) {
        nokorijikan += addedTime;
        remainingTime.textContent = `残り時間: ${nokorijikan}秒`;
        const jikan_plus = document.getElementById('jikan-plus');
        jikan_plus.textContent = `+${addedTime}`;
        jikan_plus.classList.remove('fade');
        void jikan_plus.offsetWidth; // 再描画トリガー
        jikan_plus.classList.add('fade');
        if (currentCourseConfig.id === "ai_mode") {
            document.getElementById('total_got_odai').textContent = `連打メーター：${renda_ends}周`;
        }
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

        return; 
    }

    // 次の単語をセット
    // 次の単語をセット
    buffer = ""; // ★ この行は script.js 側にも必要です
    judge.setProblem(yomi[i]);
    textBox.textContent = kanji[i];
    yomiBox.textContent = yomi[i];

    // ★★★ 修正 ★★★
    // possible_text.innerHTML = `
    //    <span style="color: #eee;">${String(judge.getBestMatch(buffer))}</span>
    // `;
    possible_text.innerHTML = `
        <span style="color: #eee;">${judge.getBestMatch()}</span>
    `;
    // ★★★ 修正ここまで ★★★
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
 * TypingJudge クラス (Trie木ベースに全面改修)
 * * setProblem時にローマ字変換のTrie(オートマトン)を構築し、
 * checkメソッドでそのTrieをたどる方式に変更。
 * これにより、長い文章でもデカルト積の爆発を防ぎ、フリーズしなくなります。
 */
/**
 * TypingJudge クラス (Trie木ベース / 改善版)
 *
 * 改善点:
 * 1. `getBestMatch`: 優先パス(bestChildKey)がなくても、
 * 辞書順で最初のパスをたどることで、必ず「残り」の文字列を
 * 最後まで返すように修正。
 * 2. `_buildTrie`: 「ん」の処理を、元のクラスの仕様
 * （「んあ」「文末」は "nn" のみ、「その他」は "n" 優先など）に
 * 厳密に準拠するように修正。
 */
class TypingJudge2 {

    // クラスの静的プロパティとしてローマ字テーブルを定義 (変更なし)
    static romanTable = {
        // ... (内容は変更なし) ...
"あ": ["a"], "い": ["i"], "う": ["u"], "え": ["e"], "お": ["o"],
"か": ["ka"], "き": ["ki"], "く": ["ku"], "け": ["ke"], "こ": ["ko"],
"さ": ["sa"], "し": ["si", "shi", "ci"], "す": ["su"], "せ": ["se"], "そ": ["so"],
"た": ["ta"], "ち": ["ti", "chi"], "つ": ["tu", "tsu"], "て": ["te"], "と": ["to"],
"な": ["na"], "に": ["ni"], "ぬ": ["nu"], "ね": ["ne"], "の": ["no"],
"は": ["ha"], "ひ": ["hi"], "ふ": ["fu", "hu"], "へ": ["he"], "ほ": ["ho"],
"ま": ["ma"], "み": ["mi"], "む": ["mu"], "め": ["me"], "も": ["mo"],
"や": ["ya"], "ゆ": ["yu"], "よ": ["yo"],
"ら": ["ra"], "り": ["ri"], "る": ["ru"], "れ": ["re"], "ろ": ["ro"],
"わ": ["wa"], "を": ["wo"], "ん": ["n", "nn"],

// 濁音
"が": ["ga"], "ぎ": ["gi"], "ぐ": ["gu"], "げ": ["ge"], "ご": ["go"],
"ざ": ["za"], "じ": ["ji", "zi"], "ず": ["zu"], "ぜ": ["ze"], "ぞ": ["zo"],
"だ": ["da"], "ぢ": ["di"], "づ": ["du"], "で": ["de"], "ど": ["do"],
"ば": ["ba"], "び": ["bi"], "ぶ": ["bu"], "べ": ["be"], "ぼ": ["bo"],

// 半濁音
"ぱ": ["pa"], "ぴ": ["pi"], "ぷ": ["pu"], "ぺ": ["pe"], "ぽ": ["po"],

// 拗音 (きゃ行など)
"きゃ": ["kya", "kixya"], "きゅ": ["kyu", "kixyu"], "きぇ": ["kye", "kixye"], "きょ": ["kyo", "kixyo"],
"ぎゃ": ["gya", "gixya"], "ぎゅ": ["gyu", "gixyu"], "ぎぇ": ["gye", "gixye"], "ぎょ": ["gyo", "gixyo"],
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
"ー": ["-"], "、": [","], "。": ["."], "・": ["・"], "「": ["["], "」": ["]"], "S": [" "], "？": ["?"], "！": ["!"], "：": [":"], "；": [";"], "（": ["("], "）": [")"], "＜": ["<"], "＞": [">"],

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
        this.nowStr = "";           // 現在のお題（ひらがな）
        this.hiraganaBlocks = [];   // お題を分割した配列 (例: ["か", "っ", "た"])

        // Trie (オートマトン) のための状態
        this.rootNode = null;       // Trie のルートノード
        this.currentNodes = [];     // 現在アクティブなノードのリスト

        // ★ 修正: Trie構築メモ化のためのキャッシュ
        this.trieCache = null;

        this.setProblem(hiraganaStr);
    }

    /**
     * 新しい問題文字列を設定し、Trieを構築し、状態をリセットする
     * @param {string} newStr - 新しい問題（ひらがな文字列）
     */
    setProblem(newStr) {
        this.nowStr = newStr;
        // ★ 修正: クラス名を TypingJudge2 に
        this.hiraganaBlocks = TypingJudge2._splitHiragana(this.nowStr);

        // Trie を構築する
        this.rootNode = { children: {}, bestChildKey: null, isEnd: false };

        // ★ 修正: Trie構築の重複を避けるためのキャッシュを初期化
        this.trieCache = new Map();

        this._buildTrie(this.rootNode, 0);

        // キャッシュはTrie構築時にのみ必要なので、メモリ解放のために削除
        this.trieCache = null; 

        // 現在の状態をリセット
        this.currentNodes = [this.rootNode];
    }

    /**
     * ひらがな文字列をローマ字テーブルに基づいて分割する (変更なし)
     * @param {string} s - ひらがな文字列
     * @returns {string[]} 分割された文字列の配列
     * @private
     * @static
     */
    static _splitHiragana(s) {
        let i = 0;
        const result = [];
        // ★ 修正: クラス名を TypingJudge2 に
        const table = this.romanTable; // 高速化のため参照
        while (i < s.length) {
            // 2文字がテーブルにあるか (例: "きゃ")
            if (i + 1 < s.length && (table.hasOwnProperty(s.substring(i, i + 2)))) {
                result.push(s.substring(i, i + 2));
                i += 2;
            }
            // 1文字がテーブルにあるか
            else if (table.hasOwnProperty(s[i])) {
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
     * ローマ字表記の最初の子音を返す (変更なし)
     * @param {string} romaji - ローマ字表記
     * @returns {string} 最初の子音（見つからなければ空文字）
     * @private
     * @static
     */
    static _firstConsonant(romaji) {
        // ★ 修正: クラス名を TypingJudge2 に (不要だが念のため)
        const match = romaji.match(/[bcdfghjklmnpqrstvwxyz]/);
        return match ? match[0] : "";
    }

    /**
     * Trie (オートマトン) を構築する再帰関数
     * @param {object} node - 現在のTrieノード
     * @param {number} hIndex - hiraganaBlocks のインデックス
     * @private
     */
    _buildTrie(node, hIndex) {
        // 終了条件: すべてのひらがなブロックを処理した
        if (hIndex >= this.hiraganaBlocks.length) {
            node.isEnd = true; // このノードは文末
            return;
        }

        const ch = this.hiraganaBlocks[hIndex];
        // ★ 修正: クラス名を TypingJudge2 に
        const table = TypingJudge2.romanTable;
        let isBestChildSet = false; // このノードのベストな次打鍵を設定したか

        // 1. 促音 ("っ") の処理
        if (ch === "っ" && hIndex + 1 < this.hiraganaBlocks.length) {
            const nextCh = this.hiraganaBlocks[hIndex + 1];
            const nextRomajiList = table[nextCh] || [];
            const nextIsConsonant = nextRomajiList.length > 0 && !"aiueo".includes(nextRomajiList[0][0]) && nextCh !== "ん";

            // A. 次が子音の場合 (例: "った")
            if (nextIsConsonant) {
                // パターン 1: 子音重ね (tta, ttsu, tcha, ccha など)
                for (const nr of nextRomajiList) {
                    let firstCon = "";
                    if (nr.startsWith("ch")) {
                        firstCon = "t"; // tcha
                    } else {
                        // ★ 修正: クラス名を TypingJudge2 に
                        firstCon = TypingJudge2._firstConsonant(nr); // tta
                    }

                    if (firstCon) {
                        // "t" (tta の最初のt)
                        let nextNode = node.children[firstCon];
                        if (!nextNode) {
                            nextNode = { children: {}, bestChildKey: null, isEnd: false };
                            node.children[firstCon] = nextNode;
                            // ★ 優先 1: これをベストな次打鍵とする
                            if (!isBestChildSet) {
                                node.bestChildKey = firstCon;
                                isBestChildSet = true;
                            }
                        }

                        // "ta" (tta の残りの ta)
                        // この時点で hIndex+2 (次の次) のTrieを構築
                        this._addRomajiPath(nextNode, nr, hIndex + 2);
                    }
                     // ccha のパターン (c + cha)
                    if (nr.startsWith("ch")) {
                        let nextNode = node.children["c"];
                        if (!nextNode) {
                            nextNode = { children: {}, bestChildKey: null, isEnd: false };
                            node.children["c"] = nextNode;
                            if (!isBestChildSet) {
                                node.bestChildKey = "c";
                                isBestChildSet = true;
                            }
                        }
                        this._addRomajiPath(nextNode, nr, hIndex + 2);
                    }
                }
            }

            // B. パターン 2: 単体「っ」 (xtu, ltu) + 次の文字 (xtuta)
            // (次が子音でも母音でも、このパターンは有効)
            const sokuonSingle = table["っ"] || ["xtu", "ltu"];
            for (const r of sokuonSingle) {
                // "xtu" のパスを追加し、その終端ノードから hIndex+1 ("た") のTrieを構築
                // isBestChildSet がまだ false なら、これを優先パスとして設定
                this._addRomajiPath(node, r, hIndex + 1, !isBestChildSet); 
                if (!isBestChildSet) isBestChildSet = true; // ★ 優先 2
            }

            return; // 促音処理はここで終わり
        }

        // 2. "ん" の処理
        else if (ch === "ん") {
            let nextCh = (hIndex + 1 < this.hiraganaBlocks.length) ? this.hiraganaBlocks[hIndex + 1] : null;
            let nextRomajiList = nextCh ? (table[nextCh] || []) : [];

            const isVowel = nextCh && ["あ", "い", "う", "え", "お", "ぁ", "ぃ", "ぅ", "ぇ", "ぉ"].includes(nextCh);
            const isY = nextCh && ["や", "ゆ", "よ", "ゃ", "ゅ", "ょ"].includes(nextCh);
            let isN = false;
            if (nextRomajiList.length > 0) {
                for (const nr of nextRomajiList) {
                    if (nr.startsWith("n")) isN = true;
                }
            }

            let allowN = false;
            let allowNN = false;
            let nnIsBest = false; // "nn" を優先パス(bestChildKey)にするか

            if (isVowel) { // んあ (例: かんい)
                allowNN = true;
                nnIsBest = true;
                // allowN = false (nni は許可, ni はダメ)
            } else if (isY) { // んや (例: こんや)
                allowNN = true;
                allowN = true;
                nnIsBest = true; // nnya を優先
            } else if (isN) { // んな (例: そんな)
                allowNN = true;
                allowN = true;
                // ★ 修正: 'sonnna' ではなく 'sonna' を優先する
                nnIsBest = false; // nnna ではなく nna を優先
            } else if (!nextCh) { // 文末
                allowNN = true;
                nnIsBest = true;
                // allowN = false (文末の n は許可しない)
            } else { // その他 (例: かんと)
                allowN = true;
                allowNN = true;
                nnIsBest = false; // n を優先 (kanto)
            }

            if (nnIsBest) {
                // nn を優先パスとして構築
                if (allowNN) {
                    this._addRomajiPath(node, "nn", hIndex + 1, true); // 優先
                    isBestChildSet = true;
                }
                // n が許可されていれば、非優先パスとして構築
                if (allowN) {
                    this._addRomajiPath(node, "n", hIndex + 1, false); // 非優先
                }
            } else {
                // n を優先パスとして構築
                if (allowN) {
                    this._addRomajiPath(node, "n", hIndex + 1, true); // 優先
                    isBestChildSet = true;
                }
                // nn が許可されていれば、非優先パスとして構築
                if (allowNN) {
                    this._addRomajiPath(node, "nn", hIndex + 1, false); // 非優先
                }
            }

            return; // "ん" 処理はここで終わり
        }

        // 3. その他の文字 (または単体の "っ")
        const options = table[ch] || [ch];
        for (const r of options) {
            // isBestChildSet がまだ false なら、
            // 最初の選択肢 (例: "si") を優先パスとして設定
            this._addRomajiPath(node, r, hIndex + 1, !isBestChildSet); 
            if (!isBestChildSet) isBestChildSet = true;
        }
    }

    /**
     * Trieにローマ字のパスを追加するヘルパー関数
     * (★★★ 高速化対応 ★★★)
     * * @param {object} startNode - 開始ノード
     * @param {string} romaji - 追加するローマ字 (例: "kya")
     * @param {number} nextHIndex - このパスが完了した後の次の hiraganaBlocks インデックス
     * @param {boolean} [isBest=false] - このパスを bestChildKey として設定するか
     * @private
     */
    _addRomajiPath(startNode, romaji, nextHIndex, isBest = false) {
        let currentNode = startNode;

        for (let k = 0; k < romaji.length; k++) {
            const char = romaji[k];

            let nextNode = currentNode.children[char];
            if (!nextNode) {
                nextNode = { children: {}, bestChildKey: null, isEnd: false };
                currentNode.children[char] = nextNode;

                // この分岐の最初の文字を bestChildKey として設定する
                // (currentNode.bestChildKey がまだ設定されていない場合のみ)
                if (k === 0 && isBest && !currentNode.bestChildKey) {
                    currentNode.bestChildKey = char;
                }
            }
            currentNode = nextNode;
        }

        // ★ 修正: メモ化 (Memoization) による高速化
        // このパスの終端ノード (currentNode) から、
        // 次のひらがなブロック (nextHIndex) のTrieを構築する

        // 1. 既に nextHIndex のTrieが構築済み (キャッシュにある) かチェック
        if (this.trieCache.has(nextHIndex)) {
            // 2. 構築済みの場合:
            //    キャッシュされたノード (構築済みのTrie) を取得
            const cachedNode = this.trieCache.get(nextHIndex);

            //    現在のノードに、構築済みのTrieの情報を
            //    (参照として) コピーする
            //    (例: "si" の "i" と "shi" の "i" は、
            //     この先 "ta" が続くなら同じ構造を持つ)
            currentNode.children = cachedNode.children;
            currentNode.bestChildKey = cachedNode.bestChildKey;
            currentNode.isEnd = cachedNode.isEnd;

            //    再帰呼び出し (this._buildTrie) は行わない
        } else {
            // 3. 未構築の場合:
            //    現在のノード (currentNode) を、
            //    nextHIndex のTrieの開始ノードとしてキャッシュに登録
            this.trieCache.set(nextHIndex, currentNode);

            //    通常通り、再帰的に次のTrieを構築する
            this._buildTrie(currentNode, nextHIndex);
        }
    }

    /**
     * 入力文字 (s) をバッファに追加し、判定を行う。
     * (変更なし)
     * * @param {string} s - 入力された1文字
     * @returns {boolean | null}
     * true: 入力は正しいが、まだ途中
     * false: 入力は間違い
     * null: 入力は正しく、完了した
     */
    check(s) {
        const newActiveNodes = [];
        let isEnd = false;

        // 現在アクティブな全ノード (通常は1つ) から、
        // 次の文字 s で遷移できるノードを探す
        for (const node of this.currentNodes) {
            const nextNode = node.children[s];
            if (nextNode) {
                // 文末ノードに到達したか (お題全体の終わり)
                if (nextNode.isEnd) {
                    isEnd = true;
                }
                newActiveNodes.push(nextNode);
            }
        }

        // どのノードからも先に進めない = ミスタイプ
        if (newActiveNodes.length === 0) {
            return false;
        }

        // 状態を更新
        this.currentNodes = newActiveNodes;

        // 文末に到達した = 完了
        if (isEnd) {
            return null;
        }

        // 途中
        return true;
    }


    /**
     * (ロジック修正なし、フォールバックの改善のみ)
     * 現在の入力状態から、最も優先度の高い「残りの」ローマ字表記を
     * 最後までたどって返す。
     *
     * @returns {string}
     * 最も優先度の高い残りのローマ字表記(文字列)。
     */
    getBestMatch() {
        if (!this.currentNodes || this.currentNodes.length === 0) {
            return "";
        }

        // 現在アクティブなノードの中で、
        // 優先パス (bestChildKey) が設定されているノードを最優先で選ぶ
        let bestNode = this.currentNodes[0];
        for (const node of this.currentNodes) {
            if (node.bestChildKey) {
                bestNode = node;
                break;
            }
        }

        // bestNode から bestChildKey をたどって残りの文字列を生成
        let remaining = "";
        let currentNode = bestNode;

        // 無限ループ防止 (Trieが深すぎる場合など)
        for (let i = 0; i < 500; i++) { // 念のため最大500文字

            // 優先キー (bestChildKey) があればそれを使う
            let nextKey = currentNode.bestChildKey;

            // ★ 改善点: 優先キーがない場合、
            // フォールバックとして辞書順で最初のキーを使う
            // (変更なし、元のロジックが正しいため維持)
            if (!nextKey || !currentNode.children[nextKey]) {
                const keys = Object.keys(currentNode.children);
                if (keys.length > 0) {
                    nextKey = keys[0]; // 辞書順で最初
                } else {
                    break; // この先に子ノードがない
                }
            }

            remaining += nextKey;
            currentNode = currentNode.children[nextKey];

            if (currentNode.isEnd) {
                break; // 文末に達した
            }
            if (!currentNode) {
                break; // 念のため
            }
        }

        return remaining;
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