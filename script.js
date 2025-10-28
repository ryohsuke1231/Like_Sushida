// HTMLドキュメントが読み込まれ終わったら実行
document.addEventListener('DOMContentLoaded', () => {

    // 1. 中央のボックス（の中のpタグ）に文字列を表示する
    const textBox = document.getElementById('box-text');

    if (textBox) {
        textBox.textContent = 'キーボードのキーを押してみてください';
    }

    // 2. キーが押された時の「信号」を受け取る
    // window全体でキーボードイベントを監視（リッスン）します
    window.addEventListener('keydown', (event) => {

        // 「信号」として、コンソールに押されたキーの情報を出力します
        console.log('キーが押されました！');
        console.log('・押されたキー:', event.key); // 例: "a", "Enter", "Shift"
        console.log('・キーのコード:', event.code); // 例: "KeyA", "Enter", "ShiftLeft"

        // ボックス内のテキストも更新してみましょう
        if (textBox) {
            // event.key を使って、押されたキーの名前を表示します
            textBox.textContent = `「${event.key}」キーが押されました`;
        }
    });

});