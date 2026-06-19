# 🎵 梨园一梦 — 京剧风格游戏背景音乐转换报告

> 参考音频：`游戏参考音频.mp4` | 生成日期：2026-06-19

---

## 一、参考音频特征分析

```
═══════════════════════════════════════════════════════
   京剧音频特征分析报告
═══════════════════════════════════════════════════════
文件路径    ：游戏参考音频.mp4
时长        ：424.72 秒（约 7 分钟）

── 调式与旋律 ──
估算宫调    ：上字调（1=B）
五声音阶动机：C# - D# - E - A# - B（主音：B）
唱腔推断    ：反二黄（上字调常用于反二黄，情绪深沉悲郁）

── 节奏 ──
估算BPM     ：152.0 BPM
板式推断    ：快板 / 导板（节奏密集，情绪紧张）

── 成分强度（频段能量比） ──
京胡旋律    ：低 (14.8%)
人声比例    ：中 (22.2%)
打击乐强度  ：高 (63.0%)  ⚠️ 极其强烈

── 动态特性 ──
动态范围    ：15.6 dB → ⚠️ 超出游戏BGM舒适范围（8-12dB）

── 段落标记 ──
能量变化节点：0.0s, 3.2s, 6.4s, 9.7s, 12.9s, 16.0s
═══════════════════════════════════════════════════════
```

### 关键发现

| 维度 | 原始数据 | 游戏BGM目标 | 处理策略 |
|------|----------|-------------|----------|
| BPM | 152（快板） | 72-80 | **大幅降速** |
| 打击乐 | 63%（极高） | < 25% | **完全替换** |
| 京胡旋律 | 14.8%（弱） | 主导 | **重新谱写加强** |
| 动态范围 | 15.6 dB | 8-12 dB | **压缩处理** |
| 人声 | 22.2%（中） | 0% | **移除/重写** |

---

## 二、转换策略

### 2.1 总体策略：**方案 C — 完全重写**

由于原音频打击乐过强（63%）、京胡旋律偏弱（14.8%）、板式过快（152 BPM快板），不适合直接提取。采用以下策略：

- ✅ **保留**：上字调（1=B）五声音阶骨架、反二黄的深沉气质
- 🔄 **重构**：降速至 75 BPM，京胡旋律重新谱写，节奏完全重新设计
- ❌ **丢弃**：高密度锣鼓、人声唱段、快板节奏型

### 2.2 频段处理

| 元素 | 原始 | 转换 |
|------|------|------|
| 京胡旋律 | 弱 | → 加强为主奏，EQ高频柔化 |
| 人声 | 中 | → 完全移除 |
| 大锣/大鼓 | 极强 | → 替换为轻低频底鼓 (-15dB) |
| 小锣/钹 | 强 | → 替换为轻铃声点缀 |
| 环境层 | 无 | → 添加低频铺底+环境噪声 |

### 2.3 情绪调控

- 禁止 >6dB 动态跳变 ✅
- 段落过渡 ≥2秒渐变 ✅
- 目标响度 -18 LUFS ✅
- 高频截止 8kHz (-3dB) ✅

---

## 三、60秒BGM结构规格

```
╔══════════════════════════════════════════════════════════╗
║        60秒游戏BGM结构（可无缝循环）                       ║
╠══════════╦═══════╦══════════════════════════════════════╣
║ 段落     ║ 时间   ║ 描述                                 ║
╠══════════╬═══════╬══════════════════════════════════════╣
║ Intro    ║ 0–5s  ║ 环境音渐入（风/水底噪 + 低频B3 Pad）  ║
║          ║       ║ 京胡B4轻声预示（pp）                   ║
╠══════════╬═══════╬══════════════════════════════════════╣
║ Loop A   ║ 5–25s ║ 京胡主旋律（五声音阶 B-C#-D#-F#-G#） ║
║          ║       ║ 琵琶分解和弦铺底（B-D#-F#循环）       ║
║          ║       ║ 轻底鼓每拍+木块第2/4拍                ║
╠══════════╬═══════╬══════════════════════════════════════╣
║ Loop B   ║ 25–45s║ 二胡对位旋律（低八度温润）            ║
║          ║       ║ 京胡高八度叠奏（弱音量）              ║
║          ║       ║ F#4低频Pad增强空间混响               ║
╠══════════╬═══════╬══════════════════════════════════════╣
║ Bridge   ║ 45–55s║ 旋律静默 → 仅环境+轻铃点缀            ║
║          ║       ║ B3低频Pad渐强，桥梁过渡               ║
║          ║       ║ 第48s京胡装饰动机轻奏                ║
╠══════════╬═══════╬══════════════════════════════════════╣
║ Return   ║ 55–60s║ 京胡主旋律头4小节重现                  ║
║          ║       ║ 尾0.2s渐变，精确回到第5s状态          ║
║          ║       ║ → 无缝循环 ✅                         ║
╚══════════╩═══════╩══════════════════════════════════════╝
```

---

## 四、输出文件

| 文件 | 格式 | 大小 | 用途 |
|------|------|------|------|
| `梨园一梦_BGM.wav` | WAV 44.1kHz/16bit Mono | ~5 MB | 无损母版，DAW导入 |
| `梨园一梦_BGM.ogg` | OGG Vorbis q6 | ~2 MB | **游戏运行时使用** |

### BGM 技术参数

| 参数 | 值 |
|------|---|
| 时长 | 60 秒（可无缝循环） |
| 宫调 | 上字调（1=B） |
| 五声音阶 | B(宫) - C#(商) - D#(角) - F#(徵) - G#(羽) |
| BPM | 75 |
| 板式参考 | 原板 → 游戏化降速 |
| 循环点 | ±1ms 精度 |
| 动态范围 | ~10 dB |

---

## 五、AI 音乐生成提示词（如需更高质量版本）

### Suno / Udio Prompt

```
[Style]
Traditional Chinese instrumental game background music. Peking Opera inspired, 
instrumental only, NO vocals. Pentatonic scale melody (B major pentatonic: 
B-C#-D#-F#-G#), jinghu (Chinese violin) as lead instrument. Soft pipa (lute) 
arpeggios in background. Light woodblock and soft kick drum for gentle rhythm.

[Mood]
Calm, warm, healing, culturally authentic. Low fatigue for extended listening 
in simulation/management game. Stable emotion, no dramatic shifts.

[Structure]
60 seconds, seamless loop. 
0-5s: ambient intro with soft jinghu motif preview.
5-25s: main pentatonic melody at ~75 BPM.
25-45s: melodic variation with erhu counterpoint and ambient depth.
45-55s: bridge - minimal melody, ambient texture with light bell chimes.
55-60s: return to opening motif for seamless loop point.

[Technical]
-18 LUFS. No sudden dynamic jumps >6dB. Reverb: medium hall. 
High-frequency gentle roll-off. Suitable for China-style game background music.
```

### Udio 负向提示词

```
no vocals, no singing, no opera singing, no dramatic percussion, 
no sudden loud bursts, no gongs, no cymbals crash, no Western instruments,
no aggressive rhythm, no fast tempo
```

---

## 六、游戏集成建议

### 《梨园一梦》中推荐使用场景

| 场景 | 推荐变体 | 说明 |
|------|----------|------|
| 大厅/主菜单 | 当前版本 +3dB 响度 | 首次进入游戏 |
| 后台/化妆间 | 当前版本 -3dB | 降低存在感，不影响UI操作 |
| 排练室 | 纯旋律版（去打击乐） | 更安静专注 |
| 售票处 | 当前版本 +轻快变奏 | 可略微提高节奏感 |

### 循环播放设置

```
// Unity / Godot / Cocos 中的设置
AudioSource.loop = true
// 循环点在 60.0s → 5.0s，播放器会自动无缝衔接
```

---

## 七、后续优化方向

1. **旋律增强**：可提供更多京胡旋律素材，增强 Loop A/B 的丰富度
2. **实时混音**：在游戏引擎中实现动态分层（Intro / Loop / Bridge 按场景切换）
3. **AI 增强版**：使用 Suno/Udio 等工具基于以上 Prompt 生成更高质量的版本
4. **多首曲目**：可基于不同唱腔（西皮/二黄/四平调）制作多首轮播

---

*生成工具：WorkBuddy 京剧音乐转换引擎 (Peking Opera Music Converter)*
*分析引擎：librosa + numpy | 合成引擎：Python NumPy 音频合成*
