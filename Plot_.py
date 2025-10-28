import matplotlib.pyplot as plt
import matplotlib

# Noto Sans CJK JPフォントを設定
matplotlib.rcParams['font.family'] = 'Noto Sans CJK JP'

# 進路割合データ
labels = ['就職', '大学院進学', '公務員', '留学', 'その他']
sizes = [50, 30, 10, 5, 5]

# 棒グラフを描く
plt.figure(figsize=(8, 6))
bars = plt.bar(range(len(labels)), sizes, color='#66b3ff')

# グラフのタイトルとラベル
plt.title('筑波大学卒業生の進路割合', fontsize=14)
plt.xlabel('進路', fontsize=12)
plt.ylabel('割合 (%)', fontsize=12)

# 各棒の上にパーセンテージを表示
for bar in bars:
    height = bar.get_height()  # 棒の高さを取得
    plt.text(bar.get_x() + bar.get_width() / 2, height + 1, f'{height}%', 
             ha='center', va='bottom', fontsize=12)

# X軸のラベルを明示的に設定
plt.xticks(range(len(labels)), labels, rotation=0, ha='center', fontsize=12)

# グラフを表示
plt.show()
