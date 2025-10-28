from rich.progress import Progress, TaskID
from rich.console import Console
import time

console = Console()

# 基本的なプログレスバーの作成
def basic_progress():
    with Progress() as progress:
        task = progress.add_task("[green]処理中...", total=100)
        for i in range(100):
            time.sleep(0.1)  # タスクをシミュレート
            progress.update(task, advance=1)

# 複数のタスクを同時に表示
def multi_task_progress():
    with Progress() as progress:
        task1 = progress.add_task("[red]タスク1", total=100)
        task2 = progress.add_task("[green]タスク2", total=100)
        task3 = progress.add_task("[blue]タスク3", total=100)

        while not progress.finished:
            progress.update(task1, advance=0.5)
            progress.update(task2, advance=0.3)
            progress.update(task3, advance=0.9)
            time.sleep(0.02)

# カスタムコラムを持つプログレスバー
from rich.progress import Progress, BarColumn, TextColumn, TimeRemainingColumn

def custom_progress():
    with Progress(
        TextColumn("[progress.description]{task.description}"),
        BarColumn(),
        TextColumn("[progress.percentage]{task.percentage:>3.0f}%"),
        TimeRemainingColumn(),
        # ↓↓↓ ここに自由に変更したいTextColumnを追加 ↓↓↓
        TextColumn("[bold green]{task.fields[status]}", justify="right"),
    ) as progress:
        # 最初はstatusフィールドに初期値を設定することもできます
        task = progress.add_task("[cyan]カスタムタスク", total=1000, status="開始前...")

        for i in range(1000):
            time.sleep(0.01)

            # メッセージを動的に生成
            current_status = ""
            if i < 300:
                current_status = "ファイルを準備中... 📝"
            elif i < 700:
                current_status = "データを処理中... ⚙️"
            else:
                current_status = "完了処理中... ✨"

            # ↓↓↓ updateメソッドでstatusフィールドの値を更新 ↓↓↓
            progress.update(task, advance=1, status=current_status)
# 実行
#console.print("[bold]基本的なプログレスバー:[/bold]")
#basic_progress()

console.print("\n[bold]複数タスクのプログレスバー:[/bold]")
multi_task_progress()

console.print("\n[bold]カスタムプログレスバー:[/bold]")
custom_progress()
