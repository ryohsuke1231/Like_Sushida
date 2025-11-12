let allWords = {}; // 読み込んだ全ての単語
let yomi = []; // 現在のゲームで使用する読み配列
let kanji = []; // 現在のゲームで使用する漢字配列
let judge; // TypingJudgeのインスタンス
let currentCourseConfig = {}; // 現在選択中のコース設定
let mapping = [];

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
let now_selected_course = null;

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
        amountMap: defaultAmountMap,
        special: false
    },
    osusume: {
        name: "お勧め 5,000円コース",
        id: "osusume",
        keys: [5, 6, 7, 8, 9, 10], // (仮)
        flow: [5, 6, 7, 8, 9, 10, 9, 8, 7, 6], // (仮)
        time: 90,
        price: 5000,
        amountMap: defaultAmountMap, // (仮)
        special: false
    },
    koukyuu: {
        name: "高級 10,000円コース",
        id: "koukyuu",
        keys: [9, 10, 11, 12, 13, 14], // (仮) ※14文字以上も含むべき
        flow: [9, 10, 11, 12, 13, 14, 13, 12, 11, 10], // (仮)
        time: 120,
        price: 10000,
        amountMap: defaultAmountMap, // (仮)
        special: false
    },
    ai_mode: {
        name: "AIモード",
        id: "ai_mode",
        endpoint: "/api/generate2",
        time: null,
        price: null,
        amountMap: defaultAmountMap,
        special: true
    },
    wiki_mode: {
        name: "Wikiモード",
        id: "wiki_mode",
        endpoint: "/api/wiki",
        time: null,
        price: null,
        amountMap: defaultAmountMap,
        special: true
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
    document.getElementById('wiki-mode').addEventListener('click', () => startCourse(courses.wiki_mode));

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
    document.getElementById('keys-per-second').textContent = '0.0 キー/秒,　正確率 0.0%';
    remainingTime.textContent = `残り時間: ...秒`;
    remainingTime.style.display = '';

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
    //textBox.textContent = "";
    //yomiBox.textContent = "";
    textBox.innerHTML = "";
    yomiBox.innerHTML = "";
    possible_text.innerHTML = "";
}

/**
* 選択されたコースを開始準備する
* @param {object} config - courses オブジェクト (例: courses.otegaru)
*/
async function startCourse(config) {
    resetGameState(); // (nokorijikan もリセットされる)
    if (config.special === true) {
        currentCourseConfig = config;
        
        // ★ 修正: リトライ時に備え、他の主要ボックスを非表示にする
        selectBox.style.display = 'none';
        startBox.style.display = 'none';
        centerBox.style.display = 'none';
        resultBox.style.display = 'none';
        endBox.style.display = 'none';
        document.getElementById('wait-box').style.display = 'none'; // wait-boxも一旦非表示
        
        try {
            document.getElementById('wait-box').style.display = 'flex'; // ここでwait-boxを表示
            //selectBox.style.display = 'none'; // (上で実施済み)
            const response = await fetch(config.endpoint);
            const data = await response.json();
            
            // (2) fetch完了後、まだAIモードが選択されているかチェック
            // （ユーザーが「戻る」を押したり、別コースを選んだりしたら currentCourseConfig が変わっているはず）
            if (currentCourseConfig.id !== config.id) {
                console.log("Special mode data fetched, but user navigated away. Discarding data.");
                return; // yomi/kanji を上書きしない
            }
            
            // (3) AIモードの単語をセット
            //yomi = splitWithContext(data.yomi);
            //kanji = splitWithContext(data.kanji);
            yomi = data.yomi;
            kanji = data.kanji;
            mapping = data.mapping;
            console.log(yomi);
            console.log(kanji);
            nokorijikan = null;
            remainingTime.textContent = ` `;
            remainingTime.style.display = 'none';
            
            document.getElementById('haratta').textContent = ``;
            document.getElementById('wait-box').style.display = 'none';
            //selectBox.style.display = 'none'; // (上で実施済み)
    
    
        //return; // ← 共通処理（startBox表示）に行くために return しない
        } catch (error) {
            console.error("AIモードのデータ取得に失敗:", error);
            // エラー時も、ユーザーが待機し続けないようコース選択に戻す
            showCourseSelection(); 
            return; // ★ 共通処理には行かない
        }
    } else { // special === false の場合
        currentCourseConfig = config;

        // 1. ゲーム状態をリセット (済)
        
        // 2. このコース用の単語を準備
        try {
            // allWords (グローバル) から単語リスト (yomi, kanji) を生成
            prepareWords(config.keys, config.flow);
        } catch (error) {
            console.error(error.message);
            alert(error.message); // ユーザーにエラーを通知
            showCourseSelection(); // エラーならコース選択に戻る
            return; // ★ 共通処理には行かない
        }

        // 3. UI設定
        nokorijikan = config.time;
        remainingTime.textContent = `残り時間: ${nokorijikan}秒`;
            // remainingTime.style.display = ''; // ★ resetGameState に移動済み
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
    // (special モードの try 成功後、または
    //  special false モードの単語準備成功後にここに来る)
    selectBox.style.display = 'none';
    startBox.style.display = 'flex';
    centerBox.style.display = 'none';
    resultBox.style.display = 'none';
    endBox.style.display = 'none'; // ★ 追加: 念のため非表示
    document.getElementById('wait-box').style.display = 'none'; // ★ 追加: 念のため非表示
    
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
        const splitChars = ['。', '？', '」', '！', '?', '!'];
        //if (char === '。' || char === '？' || char === '」' || char === '！') {
        if (splitChars.includes(char)) {
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
    //全ての要素の改行など文字コードを削除
    for (let i = 0; i < segments.length; i++) {
        segments[i] = segments[i].replace(/\r?\n/g, '');
        segments[i] = segments[i].replace(/\s+/g, '');
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


    setTimeout(() => {
        /*
        const items = odai_box.querySelectorAll('#');
        items.forEach(el => {
            el.style.whiteSpace = (currentCourseConfig.special === true) ? 'normal' : 'nowrap';
        });
        */
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
        // ★★★ 修正 (textContent を使用) ★★★
        /*
        textBox.textContent = kanji[i]; // i=0
        yomiBox.textContent = yomi[i]; // i=0
        */
        textBox.innerHTML = `
            <span>${kanji[i]}</span>
            <span></span>
        `;
        yomiBox.innerHTML = `
            <span>${yomi[i]}</span>
            <span></span>
        `;

        // ★★★ 修正 (スクロール位置をリセット) ★★★
        textBox.scrollLeft = 0;
        yomiBox.scrollLeft = 0;
        // ★★★ 修正ここまで ★★★
        possible_text.innerHTML = `
            <span style="color: #eee;">${judge.getBestMatch()}</span>
        `;
        // ↑↑↑ 修正ここまで
        // ★★★ 修正 (スクロール位置をリセット) ★★★
        possible_text.scrollLeft = 0;
        // ★★★ 修正ここまで ★★★
        // タイマースタート
        if (currentCourseConfig.special !== true) {
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
            //textBox.textContent = "終了！";
            yomiBox.innerHTML = "";
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
        if (result === null) { // null は「完了」
            // ★修正: 完了キーも「正解」としてカウント
            correct_keys_count += 1; 

            renda_count += 1;
            renda.value = renda_count;

            updateRendaTime();

            // スコア計算 (i++ する前に行う)
            // 完了した単語 (yomi[i]) の文字数から金額を取得
            if (currentCourseConfig.special !== true) {
                let _amount = currentCourseConfig.amountMap[yomi[i].length];
    
                console.log(`完了: ${yomi[i]} (文字数 ${yomi[i].length}, 金額 ${_amount})`);
    
                // HTMLの皿カウントID (100, 180, ...)
                if (_amount && amounts.includes(_amount)) {
                    const countEl = document.getElementById(`${_amount}_count`);
                    if (countEl) {
                        countEl.textContent = parseInt(countEl.textContent) + 1;
                    }
                }
                if (currentCourseConfig.special !== true) {
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

            // ★★★ ここから大幅に修正 ★★★

            // (1) possible_text (ローマ字) の計算 (従来通り)
            const remaining = judge.getBestMatch(); 
            possible_text.innerHTML = `
            <span style="color: #444;">${buffer}</span>
            <span style="color: #eee;">${remaining}</span>
            `;
            // 最初の <span style="color: #444;">...</span> (入力済みローマ字)
            const typedRomaSpan = possible_text.children[0]; 
            // 入力済みローマ字の表示幅 (ピクセル数)
            const typedRomaWidth = typedRomaSpan.offsetWidth; 
            // 入力済み幅 - (表示領域の半分) だけスクロール
            possible_text.scrollLeft = typedRomaWidth - (possible_text.clientWidth / 2);

            // (2) yomi-text (ひらがな) の計算
            // judge から「完了したひらがなの文字数」を取得
            const completedHiraganaLength = judge.getCompletedHiraganaLength();
            const fullYomi = yomi[i]; // 現在の単語のひらがな全体
            const completedYomi = fullYomi.substring(0, completedHiraganaLength);
            const remainingYomi = fullYomi.substring(completedHiraganaLength);

            // yomiBox を「入力済み」「未入力」の2つの <span> で構成
            yomiBox.innerHTML = `
            <span>${completedYomi}</span>
            <span>${remainingYomi}</span>
            `;
            const typedYomiSpan = yomiBox.children[0]; // 入力済みひらがなスパン
            const typedYomiWidth = typedYomiSpan.offsetWidth; // 入力済みひらがなの幅
            yomiBox.scrollLeft = typedYomiWidth - (yomiBox.clientWidth / 2);

            // (3) box-text (漢字) の計算 (mapping ベースに修正)
              const fullKanji = kanji[i]; // 現在の単語の漢字全体 (例: "日本")
              const currentMapping = mapping[i]; // 対応するマッピング配列 (例: ["日", "日", "本", "本"])

              let kanjiSplitIndex = 0; // 漢字の分割位置 (0 = 全部未入力)

              // completedHiraganaLength は (2) で計算済み (例: 3)
              if (completedHiraganaLength > 0 && currentMapping && currentMapping.length >= completedHiraganaLength) {

                  // 1. 入力完了したひらがなに対応する、最後の kanji 文字を取得
                  // (配列インデックスは 0 からなので、length - 1)
                  // (例: len=3 -> mapping[2] -> "本")
                  // (例: len=2 -> mapping[1] -> "日")
                  const lastMappedChar = currentMapping[completedHiraganaLength - 1];

                  // 2. その文字が fullKanji の中で最後に出現するインデックスを探す
                  // (注: 'indexOf' では "東京都" の "と" -> "東" (index 0) となってしまうため、
                  //   "とうきょう" -> "京" (index 1) を正しく扱うため 'lastIndexOf' を使う方が安全)
                  // (例: "本" は "日本" の index 1)
                  // (例: "日" は "日本" の index 0)
                  const lastCharIndexInKanji = fullKanji.lastIndexOf(lastMappedChar);

                  if (lastCharIndexInKanji !== -1) {
                      // 3. 分割位置は (見つかったインデックス + 1)
                      // (例: index 1 -> split 2)
                      // (例: index 0 -> split 1)
                      kanjiSplitIndex = lastCharIndexInKanji + 1;
                  }
              }

              const completedKanji = fullKanji.substring(0, kanjiSplitIndex);
              const remainingKanji = fullKanji.substring(kanjiSplitIndex);

              // textBox も同様に2つの <span> で構成
              textBox.innerHTML = `
              <span>${completedKanji}</span>
              <span>${remainingKanji}</span>
              `;

              const typedKanjiSpan = textBox.children[0]; // 入力済み（とみなした）漢字スパン
              const typedKanjiWidth = typedKanjiSpan.offsetWidth; // その幅
              textBox.scrollLeft = typedKanjiWidth - (textBox.clientWidth / 2);

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
                //textBox.textContent = "終了！";
                //yomiBox.textContent = "";
                //possible_text.innerHTML = "";
                yomiBox.innerHTML = "";
                possible_text.innerHTML = "";
                textBox.innerHTML = "";

                // 結果表示ロジックへ
                endGame();
            }
            incorrect_keys_count += 1;
            renda_count = 0;
            renda.value = renda_count;
            //document.getElementById('keys-per-second').textContent = `${parseFloat(correct_keys_count / (elapsed_time / 1000)).toFixed(1)} キー/秒`;
        }
        let correct_keys_persent = parseFloat((correct_keys_count / (correct_keys_count + incorrect_keys_count)) * 100).toFixed(1);
        document.getElementById('keys-per-second').textContent = `${parseFloat(correct_keys_count / (elapsed_time / 1000)).toFixed(1)} キー/秒, 正確率 ${correct_keys_persent}%`;
        
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
        if (currentCourseConfig.special === true) {
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
        //textBox.textContent = "終了！";
        //yomiBox.textContent = "";
        textBox.innerHTML = "";
        yomiBox.innerHTML = "";
        possible_text.innerHTML = "";

        // 結果表示ロジックへ
        endGame();

        return; 
    }

    // 次の単語をセット
    buffer = ""; // ★ この行は script.js 側にも必要です
    judge.setProblem(yomi[i]);

    // ★★★ 修正 (innerHTML ではなく textContent に設定) ★★★
    /*
    textBox.textContent = kanji[i];
    yomiBox.textContent = yomi[i];
    */
    textBox.innerHTML = `
        <span>${kanji[i]}</span>
        <span></span>
    `;
    yomiBox.innerHTML = `
        <span>${yomi[i]}</span>
        <span></span>
    `;

    // ★★★ 修正 (possible_text の更新) ★★★
    possible_text.innerHTML = `
        <span style="color: #eee;">${judge.getBestMatch()}</span>
    `;

        // ★★★ 修正 (スクロール位置をリセット) ★★★
    possible_text.scrollLeft = 0;
    yomiBox.scrollLeft = 0;
    textBox.scrollLeft = 0;
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
 * 3. (★★★ スクロール対応 ★★★)
 * ノードに hIndex (ひらがなブロックインデックス) を持たせ、
 * 入力済みのひらがな文字数を計算する `getCompletedHiraganaLength` を追加。
 */
class TypingJudge2 {

    // クラスの静的プロパティとしてローマ字テーブルを定義 (変更なし)
    static romanTable = {
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
        "が": ["ga"], "ぎ": ["gi"], "ぐ": ["gu"], "げ": ["ge"], "ご": ["go"],
        "ざ": ["za"], "じ": ["ji", "zi"], "ず": ["zu"], "ぜ": ["ze"], "ぞ": ["zo"],
        "だ": ["da"], "ぢ": ["di"], "づ": ["du"], "で": ["de"], "ど": ["do"],
        "ば": ["ba"], "び": ["bi"], "ぶ": ["bu"], "べ": ["be"], "ぼ": ["bo"],
        "ぱ": ["pa"], "ぴ": ["pi"], "ぷ": ["pu"], "ぺ": ["pe"], "ぽ": ["po"],
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
        "ふぁ": ["fa", "fuxa"], "ふぃ": ["fi", "fuxi"], "ふぇ": ["fe", "fuxe"], "ふぉ": ["fo", "fuxo"],
        "うぁ": ["wha"], "うぃ": ["wi"], "うぇ": ["we"], "うぉ": ["who"],
        "ゔぁ": ["va"], "ゔぃ": ["vi"], "ゔ": ["vu"], "ゔぇ": ["ve"], "ゔぉ": ["vo"],
        "てぃ": ["thi"], "でぃ": ["dhi"], "とぅ": ["twu"], "どぅ": ["dwu"],
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
        this.nowStr = "";
        this.hiraganaBlocks = [];
        this.rootNode = null;
        this.currentNodes = [];
        this.trieCache = null;
        this.setProblem(hiraganaStr);
    }

    /**
     * 新しい問題文字列を設定し、Trieを構築し、状態をリセットする
     * @param {string} newStr - 新しい問題（ひらがな文字列）
     */
    setProblem(newStr) {
        this.nowStr = newStr;
        this.hiraganaBlocks = TypingJudge2._splitHiragana(this.nowStr);
        this.trieCache = new Map();
        this.rootNode = this._buildTrie(0); // _buildTrie がルートノードを返す
        this.trieCache = null; // メモリ解放
        this.currentNodes = [this.rootNode];
    }

    /**
     * ひらがな文字列をローマ字テーブルに基づいて分割する
     * (変更なし)
     */
    static _splitHiragana(s) {
        let i = 0;
        const result = [];
        const table = this.romanTable;
        while (i < s.length) {
            if (i + 1 < s.length && (table.hasOwnProperty(s.substring(i, i + 2)))) {
                result.push(s.substring(i, i + 2));
                i += 2;
            }
            else if (table.hasOwnProperty(s[i])) {
                result.push(s[i]);
                i += 1;
            }
            else {
                result.push(s[i]);
                i += 1;
            }
        }
        return result;
    }

    /**
     * ローマ字表記の最初の子音を返す
     * (変更なし)
     */
    static _firstConsonant(romaji) {
        const match = romaji.match(/[bcdfghjklmnpqrstvwxyz]/);
        return match ? match[0] : "";
    }

    /**
     * (★★★ 「ん」のロジック修正 ★★★)
     * (★★★ hIndex の記録を追加 ★★★)
     * Trie (オートマトン) を構築する再帰関数
     * hIndex に対応するTrieのノードを構築し、それを返す（メモ化対応）
     * @param {number} hIndex - hiraganaBlocks のインデックス
     * @returns {object} 構築されたTrieノード
     * @private
     */
    _buildTrie(hIndex) {
        // 1. キャッシュチェック
        if (this.trieCache.has(hIndex)) {
            return this.trieCache.get(hIndex);
        }

        // 2. この hIndex 用の新しいノードを作成
        // ★★★ 修正: hIndex プロパティを追加 ★★★
        const node = { children: {}, bestChildKey: null, isEnd: false, hIndex: hIndex };

        // 3. 循環参照を防ぐため、処理 *前* にキャッシュに登録
        this.trieCache.set(hIndex, node);

        // 4. 終了条件: すべてのひらがなブロックを処理した
        if (hIndex >= this.hiraganaBlocks.length) {
            node.isEnd = true; // このノードは文末
            // node.hIndex は hIndex (ブロック数) のまま
            return node;
        }

        // 5. 通常の構築処理
        const ch = this.hiraganaBlocks[hIndex];
        const table = TypingJudge2.romanTable;
        let isBestChildSet = false;

        // 1. 促音 ("っ") の処理 (変更なし)
        if (ch === "っ" && hIndex + 1 < this.hiraganaBlocks.length) {
            const nextCh = this.hiraganaBlocks[hIndex + 1];
            const nextRomajiList = table[nextCh] || [];
            const nextIsConsonant = nextRomajiList.length > 0 && !"aiueo".includes(nextRomajiList[0][0]) && nextCh !== "ん";

            if (nextIsConsonant) {
                for (const nr of nextRomajiList) {
                    let firstCon = "";
                    if (nr.startsWith("ch")) {
                        firstCon = "t"; // tcha
                    } else {
                        firstCon = TypingJudge2._firstConsonant(nr); // tta
                    }

                    if (firstCon) {
                        this._addPath(node, firstCon + nr, hIndex + 2, !isBestChildSet);
                        if (!isBestChildSet) isBestChildSet = true;
                    }
                    if (nr.startsWith("ch")) {
                        this._addPath(node, "c" + nr, hIndex + 2, !isBestChildSet);
                        if (!isBestChildSet) isBestChildSet = true;
                    }
                }
            }
            const sokuonSingle = table["っ"] || ["xtu", "ltu"];
            for (const r of sokuonSingle) {
                this._addPath(node, r, hIndex + 1, !isBestChildSet);
                if (!isBestChildSet) isBestChildSet = true;
            }
        }

        // 2. "ん" の処理 (★★★ ロジック修正 ★★★)
        else if (ch === "ん") {
            let nextCh = (hIndex + 1 < this.hiraganaBlocks.length) ? this.hiraganaBlocks[hIndex + 1] : null;
            let nextRomajiList = nextCh ? (table[nextCh] || []) : [];

            const isVowel = nextCh && ["あ", "い", "う", "え", "お", "ぁ", "ぃ", "ぅ", "ぇ", "ぉ"].includes(nextCh);
            const isY = nextCh && ["や", "ゆ", "よ", "ゃ", "ゅ", "ょ"].includes(nextCh);

            // "な行" かどうかの判定 (ユーザーのコードを流用)
            let isN = false;
            if (nextCh && nextCh !== "ん" && nextRomajiList.length > 0) {
                for (const nr of nextRomajiList) {
                    if (nr.startsWith("n")) {
                        isN = true;
                        break; // 1つでも見つかれば判定終了
                    }
                }
            }

            // ★★★ ここからが修正 ★★★

            if (isN) { // んな (例: そんな)
                // 自己ループバグを回避するため、_addPath を使わずに手動で構築する

                // 1. "n" のパス (n, kanto 優先) を構築
                // ★★★ 修正: hIndex を設定 ★★★
                const n_node = { children: {}, bestChildKey: null, isEnd: false, hIndex: hIndex };
                node.children['n'] = n_node;
                if (!isBestChildSet) {
                    node.bestChildKey = 'n';
                    isBestChildSet = true; // "n" を優先パスに設定
                }

                // 2. "nn" のパス (nn) を構築
                let nn_node;
                // "n" の子ノードとして "n" が既に存在するか確認
                if (!node.children['n'].children['n']) {
                    // ★★★ 修正: hIndex を設定 ★★★
                    node.children['n'].children['n'] = { children: {}, bestChildKey: null, isEnd: false, hIndex: hIndex };
                }
                nn_node = node.children['n'].children['n']; // "nn" の終端ノード

                // 3. subTrie (「な」のTrie) を一度だけ取得
                const subTrie = this._buildTrie(hIndex + 1);

                // 4. n_node ("n"終端) に subTrie をマージ
                // (※ _addPath のマージ処理を模倣)
                for (const key in subTrie.children) {
                    if (!n_node.children[key]) { // 衝突回避
                        n_node.children[key] = subTrie.children[key];
                    }
                }
                if (!n_node.bestChildKey) {
                    n_node.bestChildKey = subTrie.bestChildKey;
                }
                n_node.isEnd = subTrie.isEnd;
                // ★★★ 修正: hIndex は n_node 自身の hIndex (hIndex) のまま

                // 5. nn_node ("nn"終端) に subTrie をマージ
                // (※ _addPath のマージ処理を模倣)
                for (const key in subTrie.children) {
                    if (!nn_node.children[key]) { // 衝突回避
                        nn_node.children[key] = subTrie.children[key];
                    }
                }
                if (!nn_node.bestChildKey) {
                    nn_node.bestChildKey = subTrie.bestChildKey;
                }
                nn_node.isEnd = subTrie.isEnd;
                // ★★★ 修正: hIndex は nn_node 自身の hIndex (hIndex) のまま

            } else {
                // "ん" だが "な行" ではない場合 (元のロジックをそのまま使用)

                let allowN = false;
                let allowNN = false;
                let nnIsBest = false;

                if (isVowel) { // んあ (例: かんい)
                    allowNN = true; allowN = false; nnIsBest = true;
                } else if (isY) { // んや (例: はんよう)
                    allowNN = true; allowN = false; nnIsBest = true; // ★ 修正
                } else if (!nextCh) { // 文末
                    allowNN = true; allowN = false; nnIsBest = true;
                } else { // その他 (例: かんと)
                    allowN = true; allowNN = true; nnIsBest = false;
                }

                if (nnIsBest) {
                    if (allowNN) {
                        this._addPath(node, "nn", hIndex + 1, true); // 優先
                        isBestChildSet = true;
                    }
                    if (allowN) { // (通らないはず)
                        this._addPath(node, "n", hIndex + 1, false);
                    }
                } else {
                    if (allowN) {
                        this._addPath(node, "n", hIndex + 1, true); // 優先
                        isBestChildSet = true;
                    }
                    if (allowNN) {
                        this._addPath(node, "nn", hIndex + 1, false); // 非優先
                    }
                }
            }

            // ★★★ 修正ここまで ★★★

        }

        // 3. その他の文字 (または単体の "っ") (変更なし)
        else {
            const options = table[ch] || [ch];
            for (const r of options) {
                this._addPath(node, r, hIndex + 1, !isBestChildSet);
                if (!isBestChildSet) isBestChildSet = true;
            }
        }

        // 6. 構築が完了したノードを返す
        return node;
    }

    /**
     * Trieにローマ字のパスを追加し、その終端を次Trie(メモ化)にリンクする
     * (★★★ hIndex の引き継ぎ修正 ★★★)
     */
    _addPath(startNode, romaji, nextHIndex, isBest = false) {
        let currentNode = startNode;
        // ★★★ 追加: 現在の hIndex を取得 ★★★
        const currentHIndex = startNode.hIndex;

        // 1. romaji 文字列のパスをTrieに追加する
        for (let k = 0; k < romaji.length; k++) {
            const char = romaji[k];

            let nextNode = currentNode.children[char];
            if (!nextNode) {
                // ★★★ 修正: 新しいノードに現在の hIndex を設定 ★★★
                nextNode = { children: {}, bestChildKey: null, isEnd: false, hIndex: currentHIndex };
                currentNode.children[char] = nextNode;

                if (k === 0 && isBest && !currentNode.bestChildKey) {
                    currentNode.bestChildKey = char;
                }
            }

            // 既存ノードでも、bestChildKey が未設定なら設定する
            if (k === 0 && isBest && !currentNode.bestChildKey) {
                currentNode.bestChildKey = char;
            }

            currentNode = nextNode;
        }

        // 2. パスの終端 (currentNode) に、
        //    次のインデックス (nextHIndex) のTrie (共有/メモ化済み) を
        //    *リンク* する
        const nextTrieRoot = this._buildTrie(nextHIndex);

        // 3. リンク (プロパティのコピー)
        // ★★★ 修正: hIndex 以外をコピーする ★★★
        currentNode.children = nextTrieRoot.children;
        currentNode.bestChildKey = nextTrieRoot.bestChildKey;
        currentNode.isEnd = nextTrieRoot.isEnd;
        // currentNode.hIndex は currentHIndex のまま (変更しない)
    }

    /**
     * 入力文字 (s) をバッファに追加し、判定を行う。
     * (変更なし)
     */
    check(s) {
        const newActiveNodes = [];
        let isEnd = false;

        for (const node of this.currentNodes) {
            const nextNode = node.children[s];
            if (nextNode) {
                if (nextNode.isEnd) {
                    isEnd = true;
                }
                newActiveNodes.push(nextNode);
            }
        }

        if (newActiveNodes.length === 0) {
            return false;
        }
        this.currentNodes = newActiveNodes;
        if (isEnd) {
            return null;
        }
        return true;
    }


    /**
     * 現在の入力状態から、最も優先度の高い「残りの」ローマ字表記を
     * 最後までたどって返す。
     * (変更なし)
     */
    getBestMatch() {
        if (!this.currentNodes || this.currentNodes.length === 0) {
            return "";
        }

        let bestNode = this.currentNodes[0];
        for (const node of this.currentNodes) {
            if (node.bestChildKey) {
                bestNode = node;
                break;
            }
        }

        let remaining = "";
        let currentNode = bestNode;

        for (let i = 0; i < 500; i++) { // 無限ループ防止
            let nextKey = currentNode.bestChildKey;

            if (!nextKey || !currentNode.children[nextKey]) {
                const keys = Object.keys(currentNode.children);
                if (keys.length > 0) {
                    nextKey = keys[0]; // フォールバック
                } else {
                    break;
                }
            }

            remaining += nextKey;
            currentNode = currentNode.children[nextKey];

            if (currentNode.isEnd) {
                break;
            }
            if (!currentNode) {
                break;
            }
        }

        return remaining;
    }

    // ★★★ ここから新規追加 ★★★

    /**
     * 現在の入力状態で、完了しているひらがなブロックの文字数を返す
     * @returns {number} 完了したひらがな部分の文字列長
     */
    getCompletedHiraganaLength() {
        if (!this.currentNodes || this.currentNodes.length === 0) {
            return 0;
        }

        // 現在アクティブなノード（入力途中）が指している
        // hiraganaBlocks のインデックス (hIndex) の *最小値* を見つける。
        // これが「まだ入力が完了していない、最初のブロック」のインデックスとなる。
        let minHIndex = Infinity;
        for (const node of this.currentNodes) {
            if (node.hIndex < minHIndex) {
                minHIndex = node.hIndex;
            }
        }

        if (minHIndex === Infinity) {
            // ノードはあるが hIndex がない (※ 起こらないはずだが念のため)
            return 0; 
        }

        // minHIndex が 3 なら、ブロック 0, 1, 2 は完了している
        // (完了したブロックのインデックスは minHIndex - 1)
        let completedLength = 0;
        for (let i = 0; i < minHIndex; i++) {
            if (this.hiraganaBlocks[i]) {
                completedLength += this.hiraganaBlocks[i].length;
            }
        }

        return completedLength;
    }
    // ★★★ 新規追加ここまで ★★★
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