"""去除 makeup-room 文件夹中 look 图片的白色背景，输出到 processed 子文件夹"""
import os
from PIL import Image

INPUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'public', 'assets', 'makeup-room')
OUTPUT_DIR = os.path.join(INPUT_DIR, 'processed')

os.makedirs(OUTPUT_DIR, exist_ok=True)

# 只处理文件名包含 'look' 的图片
# 白色阈值：RGB 各通道 >= 240 视为白色
THRESHOLD = 240

processed = 0
for filename in sorted(os.listdir(INPUT_DIR)):
    name, ext = os.path.splitext(filename)
    if ext.lower() not in ('.png', '.jpg', '.jpeg', '.webp'):
        continue
    # 只处理名字带 look 的图片
    if 'look' not in name.lower():
        continue

    filepath = os.path.join(INPUT_DIR, filename)
    if not os.path.isfile(filepath):
        continue

    img = Image.open(filepath).convert('RGBA')
    pixels = img.load()
    w, h = img.size

    for y in range(h):
        for x in range(w):
            r, g, b, a = pixels[x, y]
            # 如果接近白色，设为透明
            if r >= THRESHOLD and g >= THRESHOLD and b >= THRESHOLD:
                pixels[x, y] = (r, g, b, 0)

    out_path = os.path.join(OUTPUT_DIR, f'{name}.png')
    img.save(out_path, 'PNG')
    print(f'  OK {filename} -> processed/{name}.png')
    processed += 1

print(f'\nDone! {processed} images saved to {OUTPUT_DIR}')
