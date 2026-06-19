/**
 * process-backstage-props.js
 *
 * 处理后台道具 / NPC 图片去背景。
 *
 * 策略：
 *   1. 仅从图片四周边缘 flood-fill 连通背景区域（白色/浅灰/低饱和）。
 *   2. 主体内部白色细节不受影响。
 *   3. 白边羽化：对紧邻透明区域的浅色像素做 alpha 衰减。
 *   4. 小连通域清理：只清理不与主体相连的背景残留小白点。
 *   5. 边缘收缩 + feather 让过渡自然。
 *   6. 生成暗/亮背景预览图。
 *
 * 用法：
 *   node scripts/process-backstage-props.js
 */

import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

// ==============================
// 配置
// ==============================
const INPUT_DIR = 'public/assets/backsatge'
const OUTPUT_DIR = 'public/assets/processed/backstage'
const PREVIEW_DIR = path.join(OUTPUT_DIR, 'preview')

/** 背景判定：HSL 亮度阈值（降低以捕获更多浅色噪点） */
const BG_LIGHTNESS_MIN = 0.35
/** 背景判定：HSL 饱和度上限（提高以捕获低饱和噪点） */
const BG_SAT_MAX = 0.20
/** 背景判定：RGB 通道最大差值（提高以捕获杂色噪点） */
const BG_RGB_DIFF_MAX = 70

/** 白边检测：亮度阈值 */
const EDGE_WHITE_LIGHTNESS = 0.65
/** 白边检测：饱和度上限 */
const EDGE_WHITE_SAT = 0.10
/** 白边检测：RGB 通道最大差值 */
const EDGE_WHITE_RGB_DIFF = 35
/** 白边羽化距离（像素） */
const EDGE_FEATHER_RADIUS = 2
/** 白边 alpha 缩放系数（0=完全透明，1=不变） */
const EDGE_WHITE_ALPHA_FACTOR = 0.25

/** 边缘收缩像素 */
const ERODE_RADIUS = 1
/** 主体边缘 alpha feather 半径 */
const FEATHER_RADIUS = 1

/** 小连通域最大面积（像素）—— 超过此面积视为非残留 */
const SMALL_BLOB_MAX_AREA = 150

/** NPC 文件名集合 */
const NPC_FILES = new Set(['npc1.png', 'npc2.png'])

/** 预览背景色 */
const PREVIEW_DARK = { r: 44, g: 34, b: 24 }    // 深棕色
const PREVIEW_LIGHT = { r: 250, g: 240, b: 220 } // 浅米色

// ==============================
// 工具
// ==============================

function rgbToHsl(r, g, b) {
  const rn = r / 255, gn = g / 255, bn = b / 255
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn)
  const l = (max + min) / 2
  if (max === min) return { h: 0, s: 0, l }
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h
  switch (max) {
    case rn: h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6; break
    case gn: h = ((bn - rn) / d + 2) / 6; break
    case bn: h = ((rn - gn) / d + 4) / 6; break
  }
  return { h, s, l }
}

/** 判断是否为背景色（白色/浅灰/低饱和） */
function isBackgroundColor(r, g, b) {
  const { s, l } = rgbToHsl(r, g, b)
  if (l < BG_LIGHTNESS_MIN) return false
  if (s > BG_SAT_MAX) return false
  const diff = Math.max(r, g, b) - Math.min(r, g, b)
  if (diff > BG_RGB_DIFF_MAX) return false
  return true
}

/** 判断是否为白边像素（高亮低饱和，比背景判定更严格） */
function isWhiteEdge(r, g, b) {
  const { s, l } = rgbToHsl(r, g, b)
  if (l < EDGE_WHITE_LIGHTNESS) return false
  if (s > EDGE_WHITE_SAT) return false
  const diff = Math.max(r, g, b) - Math.min(r, g, b)
  if (diff > EDGE_WHITE_RGB_DIFF) return false
  return true
}

// ==============================
// Step 1: 边缘 flood-fill 连通背景
// ==============================
function floodFillEdge(width, height, bgFlags) {
  const visited = new Uint8Array(width * height)
  const queue = []

  function enqueue(x, y) {
    if (x < 0 || x >= width || y < 0 || y >= height) return
    const idx = y * width + x
    if (visited[idx]) return
    if (!bgFlags[idx]) return
    visited[idx] = 1
    queue.push(idx)
  }

  // 从四边所有像素开始
  for (let x = 0; x < width; x++) {
    enqueue(x, 0)
    enqueue(x, height - 1)
  }
  for (let y = 1; y < height - 1; y++) {
    enqueue(0, y)
    enqueue(width - 1, y)
  }

  let head = 0
  while (head < queue.length) {
    const idx = queue[head++]
    const x = idx % width
    const y = (idx / width) | 0
    enqueue(x - 1, y)
    enqueue(x + 1, y)
    enqueue(x, y - 1)
    enqueue(x, y + 1)
  }

  return visited
}

// ==============================
// Step 2: 小连通域清理（只清理不与主体相连的背景残留）
// ==============================
function smallBlobCleanup(width, height, bgFlags, protectedMask) {
  const visited = new Uint8Array(width * height)
  const toClear = new Uint8Array(width * height)

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x
      if (visited[idx] || !bgFlags[idx]) continue
      // 跳过已保护的区域
      if (protectedMask[idx]) continue

      // BFS 收集连通域
      const queue = [idx]
      visited[idx] = 1
      let head = 0
      let touchesSubject = false

      while (head < queue.length) {
        const ci = queue[head++]
        const cx = ci % width
        const cy = (ci / width) | 0

        for (const [nx, ny] of [[cx - 1, cy], [cx + 1, cy], [cx, cy - 1], [cx, cy + 1]]) {
          if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue
          const ni = ny * width + nx
          if (visited[ni]) continue
          // 碰到非背景像素 → 这个连通域靠近主体，不清理
          if (!bgFlags[ni]) {
            touchesSubject = true
          } else if (!protectedMask[ni]) {
            visited[ni] = 1
            queue.push(ni)
          }
        }
      }

      // 只清理小连通域，且不与主体相邻的
      if (!touchesSubject && queue.length < SMALL_BLOB_MAX_AREA) {
        for (const i of queue) toClear[i] = 1
      }
    }
  }

  return toClear
}

// ==============================
// Step 3: 边缘腐蚀（erode）
// ==============================
function erodeMask(mask, width, height, radius) {
  const result = new Uint8Array(mask)
  for (let r = 0; r < radius; r++) {
    const src = new Uint8Array(result)
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x
        if (src[idx] === 0) continue
        // 检查周围是否有透明像素
        let nearTransparent = false
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx, ny = y + dy
            if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue
            if (src[ny * width + nx] === 0) { nearTransparent = true; break }
          }
          if (nearTransparent) break
        }
        if (nearTransparent) result[idx] = 0
      }
    }
  }
  return result
}

// ==============================
// Step 4: Alpha feather（主体边缘渐变透明）
// ==============================
function applyFeather(mask, width, height, radius) {
  const result = new Uint8Array(mask)
  // 找出所有透明→不透明的边界
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x
      if (mask[idx] > 0) continue // 只处理透明像素

      // 对透明像素周围的每个不透明像素做距离衰减
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          if (dx === 0 && dy === 0) continue
          const nx = x + dx, ny = y + dy
          if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue
          const ni = ny * width + nx
          if (mask[ni] === 0) continue

          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist > radius) continue
          // 越靠近边缘越透明
          const factor = Math.max(0, 1 - dist / (radius + 1))
          const newAlpha = Math.round(mask[ni] * factor)
          if (newAlpha < result[ni]) result[ni] = newAlpha
        }
      }
    }
  }
  return result
}

// ==============================
// Step 5: 白边处理（检测透明区域旁边的浅白色像素，降低 alpha）
// ==============================
function processWhiteEdge(rawRGBA, mask, width, height) {
  const resultMask = new Uint8Array(mask)
  const totalPixels = width * height

  // 构建边缘距离图：每个不透明像素到最近透明像素的距离
  const distToTransparent = new Uint16Array(totalPixels).fill(65535)
  const queue = []

  // 初始化：所有透明像素距离为 0
  for (let i = 0; i < totalPixels; i++) {
    if (mask[i] === 0) {
      distToTransparent[i] = 0
      queue.push(i)
    }
  }

  let head = 0
  while (head < queue.length) {
    const idx = queue[head++]
    const x = idx % width
    const y = (idx / width) | 0
    const nextDist = distToTransparent[idx] + 1
    if (nextDist > EDGE_FEATHER_RADIUS + 1) continue

    for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) {
      if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue
      const ni = ny * width + nx
      if (nextDist < distToTransparent[ni]) {
        distToTransparent[ni] = nextDist
        queue.push(ni)
      }
    }
  }

  // 对距离透明区域 EDGE_FEATHER_RADIUS 内的像素做白边处理
  for (let i = 0; i < totalPixels; i++) {
    if (distToTransparent[i] === 0) continue  // 已经是透明
    if (distToTransparent[i] > EDGE_FEATHER_RADIUS) continue // 距离太远

    const r = rawRGBA[i * 4], g = rawRGBA[i * 4 + 1], b = rawRGBA[i * 4 + 2]

    if (isWhiteEdge(r, g, b)) {
      // 白边像素：降低 alpha
      const distFactor = distToTransparent[i] / (EDGE_FEATHER_RADIUS + 1)
      const alphaScale = EDGE_WHITE_ALPHA_FACTOR + (1 - EDGE_WHITE_ALPHA_FACTOR) * (1 - distFactor)
      resultMask[i] = Math.round(resultMask[i] * alphaScale)
    }
  }

  return resultMask
}

// ==============================
// Step 6: 边缘扩展回填（补偿腐蚀带来的主体丢失）
// ==============================
function dilateMask(mask, width, height, radius) {
  const result = new Uint8Array(mask)
  for (let r = 0; r < radius; r++) {
    const src = new Uint8Array(result)
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x
        if (src[idx] > 0) continue
        // 检查周围是否有主体像素
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx, ny = y + dy
            if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue
            if (src[ny * width + nx] === 255) { result[idx] = 128; break }
          }
          if (result[idx] > 0) break
        }
      }
    }
  }
  return result
}

// ==============================
// 生成预览图
// ==============================
async function generatePreview(processedPath, filename, width, height) {
  const previewDarkPath = path.join(PREVIEW_DIR, `${filename.replace('.png', '')}_preview_dark.png`)
  const previewLightPath = path.join(PREVIEW_DIR, `${filename.replace('.png', '')}_preview_light.png`)

  async function makePreview(bgColor, outPath) {
    const bgSVG = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="rgb(${bgColor.r},${bgColor.g},${bgColor.b})"/>
    </svg>`

    const bgBuf = await sharp(Buffer.from(bgSVG)).resize(width, height).png().toBuffer()

    // 读取处理后的透明 PNG
    const fgBuf = await sharp(processedPath).ensureAlpha().resize(width, height).png().toBuffer()

    await sharp(bgBuf)
      .composite([{ input: fgBuf, top: 0, left: 0 }])
      .png({ compressionLevel: 3 })
      .toFile(outPath)
  }

  await Promise.all([
    makePreview(PREVIEW_DARK, previewDarkPath),
    makePreview(PREVIEW_LIGHT, previewLightPath),
  ])

  return { previewDarkPath, previewLightPath }
}

// ==============================
// 质量检测
// ==============================
async function qualityCheck(outputPath, filename) {
  const { data, info } = await sharp(outputPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const { width, height } = info
  const totalPixels = width * height
  const issues = []

  // 1. 是否有 alpha 通道
  let hasAlpha = false
  for (let i = 0; i < totalPixels; i++) {
    if (data[i * 4 + 3] < 255) { hasAlpha = true; break }
  }
  if (!hasAlpha) issues.push('⚠️ 无 alpha 通道（所有像素不透明）')

  // 2. 四角是否透明
  const corners = [
    [0, 0], [width - 1, 0], [0, height - 1], [width - 1, height - 1]
  ]
  let cornersTransparent = 0
  for (const [cx, cy] of corners) {
    if (data[(cy * width + cx) * 4 + 3] < 10) cornersTransparent++
  }
  if (cornersTransparent < 4) {
    issues.push(`⚠️ 四角未全透明 (${cornersTransparent}/4)`)
  }

  // 3. 是否有大量接近白色背景残留
  let nearWhiteCount = 0
  for (let i = 0; i < totalPixels; i++) {
    const a = data[i * 4 + 3]
    if (a < 128) continue // 已经透明的跳过
    const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2]
    const { s, l } = rgbToHsl(r, g, b)
    if (l > 0.85 && s < 0.08) nearWhiteCount++
  }
  const nearWhiteRatio = nearWhiteCount / totalPixels
  if (nearWhiteRatio > 0.05) {
    issues.push(`⚠️ 不透明区域中有 ${(nearWhiteRatio * 100).toFixed(1)}% 接近白色（可能残留）`)
  }

  // 4. 主体是否被误删（简单检测：全透明比例）
  let fullyTransparent = 0
  for (let i = 0; i < totalPixels; i++) {
    if (data[i * 4 + 3] < 10) fullyTransparent++
  }
  const transRatio = fullyTransparent / totalPixels
  if (transRatio > 0.95) {
    issues.push('⚠️ 超过 95% 像素透明，主体可能被误删')
  }

  // 5. 图片尺寸
  if (width < 32 || height < 32) {
    issues.push(`⚠️ 尺寸过小: ${width}×${height}`)
  }

  return {
    width,
    height,
    hasAlpha,
    cornersTransparent,
    transRatio: (transRatio * 100).toFixed(1) + '%',
    nearWhiteRatio: (nearWhiteRatio * 100).toFixed(1) + '%',
    issues,
    ok: issues.length === 0,
  }
}

// ==============================
// 单图处理主流程
// ==============================
async function processImage(inputPath, outputPath, filename) {
  const isNpc = NPC_FILES.has(filename.toLowerCase())

  // 读取原图
  const { data: rawRGBA, info } = await sharp(inputPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const { width, height } = info
  const totalPixels = width * height

  // ---- Phase 1: 标记背景像素 ----
  const bgFlags = new Uint8Array(totalPixels)
  for (let i = 0; i < totalPixels; i++) {
    const r = rawRGBA[i * 4], g = rawRGBA[i * 4 + 1], b = rawRGBA[i * 4 + 2]
    bgFlags[i] = isBackgroundColor(r, g, b) ? 1 : 0
  }

  // ---- Phase 2: 边缘 flood-fill ----
  const edgeBg = floodFillEdge(width, height, bgFlags)

  // ---- Phase 2b: 从边缘背景区域采样颜色范围 ----
  // 收集边缘连通背景的所有像素颜色
  const bgColorSamples = { r: [], g: [], b: [] }
  for (let i = 0; i < totalPixels; i++) {
    if (edgeBg[i]) {
      bgColorSamples.r.push(rawRGBA[i * 4])
      bgColorSamples.g.push(rawRGBA[i * 4 + 1])
      bgColorSamples.b.push(rawRGBA[i * 4 + 2])
    }
  }

  // 如果边缘背景像素足够多，计算颜色范围的均值和标准差
  let bgMean = null
  let bgStd = null
  if (bgColorSamples.r.length > 100) {
    const mean = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length
    const std = (arr, m) => Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length)

    bgMean = {
      r: mean(bgColorSamples.r),
      g: mean(bgColorSamples.g),
      b: mean(bgColorSamples.b),
    }
    bgStd = {
      r: std(bgColorSamples.r, bgMean.r),
      g: std(bgColorSamples.g, bgMean.g),
      b: std(bgColorSamples.b, bgMean.b),
    }
  }

  // ---- Phase 2c: 基于采样的背景颜色，扩展背景标记 ----
  // 对尚未标记为背景的像素，检查是否与采样背景颜色接近
  if (bgMean && bgStd) {
    const expandedBg = new Uint8Array(totalPixels)
    // 扩展范围 = mean ± 2.5 * std
    const rMin = Math.max(0, bgMean.r - 2.5 * bgStd.r)
    const rMax = Math.min(255, bgMean.r + 2.5 * bgStd.r)
    const gMin = Math.max(0, bgMean.g - 2.5 * bgStd.g)
    const gMax = Math.min(255, bgMean.g + 2.5 * bgStd.g)
    const bMin = Math.max(0, bgMean.b - 2.5 * bgStd.b)
    const bMax = Math.min(255, bgMean.b + 2.5 * bgStd.b)

    // 计算背景的平均亮度和饱和度
    const bgHsl = rgbToHsl(Math.round(bgMean.r), Math.round(bgMean.g), Math.round(bgMean.b))

    for (let i = 0; i < totalPixels; i++) {
      if (edgeBg[i]) continue // 已经标记为背景的跳过
      const r = rawRGBA[i * 4], g = rawRGBA[i * 4 + 1], b = rawRGBA[i * 4 + 2]

      // 条件1：颜色在背景采样范围内
      const inRange = r >= rMin && r <= rMax && g >= gMin && g <= gMax && b >= bMin && b <= bMax

      // 条件2：亮度和饱和度与背景相似
      const { s, l } = rgbToHsl(r, g, b)
      const similarHsl = Math.abs(l - bgHsl.l) < 0.15 && Math.abs(s - bgHsl.s) < 0.12

      if (inRange || similarHsl) {
        expandedBg[i] = 1
      }
    }

    // 将扩展的背景标记合并到 bgFlags
    for (let i = 0; i < totalPixels; i++) {
      if (expandedBg[i]) bgFlags[i] = 1
    }

    // 对扩展后的背景重新做 flood fill（从边缘连通域再次扩展）
    const edgeBg2 = floodFillEdge(width, height, bgFlags)
    for (let i = 0; i < totalPixels; i++) {
      if (edgeBg2[i] && !edgeBg[i]) edgeBg[i] = 1
    }
  }

  // ---- Phase 3: 构建初始 mask（255=不透明, 0=透明） ----
  const mask = Buffer.alloc(totalPixels, 255)
  for (let i = 0; i < totalPixels; i++) {
    if (edgeBg[i]) mask[i] = 0
  }

  // ---- Phase 4: 小连通域清理（仅对非主体区域） ----
  const protectedMask = new Uint8Array(totalPixels)
  for (let i = 0; i < totalPixels; i++) {
    // 边缘背景已标记为透明 → 受保护
    if (edgeBg[i]) protectedMask[i] = 1
    // 主体非背景像素也受保护
    if (!bgFlags[i] && mask[i] > 0) protectedMask[i] = 1
  }

  const smallBg = smallBlobCleanup(width, height, bgFlags, protectedMask)
  for (let i = 0; i < totalPixels; i++) {
    if (smallBg[i]) mask[i] = 0
  }

  // ---- Phase 5: 白边处理 ----
  const whiteEdgeMask = processWhiteEdge(rawRGBA, mask, width, height)
  for (let i = 0; i < totalPixels; i++) {
    mask[i] = whiteEdgeMask[i]
  }

  // ---- Phase 6: 边缘腐蚀 ----
  const erodedMask = erodeMask(mask, width, height, ERODE_RADIUS)

  // ---- Phase 7: 边缘 feather ----
  const featheredMask = applyFeather(erodedMask, width, height, FEATHER_RADIUS)

  // ---- Phase 8: 写回 alpha 通道 ----
  for (let i = 0; i < totalPixels; i++) {
    rawRGBA[i * 4 + 3] = featheredMask[i]
  }

  // ---- 输出处理后的 PNG ----
  await sharp(rawRGBA, { raw: { width, height, channels: 4 } })
    .png({ compressionLevel: 6 })
    .toFile(outputPath)

  // ---- 统计 ----
  let transparentPixels = 0
  let semiTransparentPixels = 0
  for (let i = 0; i < totalPixels; i++) {
    const a = featheredMask[i]
    if (a === 0) transparentPixels++
    else if (a < 255) semiTransparentPixels++
  }

  // ---- 生成预览 ----
  const previews = await generatePreview(outputPath, filename, width, height)

  // ---- 质量检测 ----
  const qc = await qualityCheck(outputPath, filename)

  return {
    filename,
    isNpc,
    width,
    height,
    transparentPixels,
    semiTransparentPixels,
    totalPixels,
    transRatio: ((transparentPixels / totalPixels) * 100).toFixed(1) + '%',
    previews,
    qc,
  }
}

// ==============================
// 入口
// ==============================
async function main() {
  const inputDir = path.resolve(INPUT_DIR)
  const outputDir = path.resolve(OUTPUT_DIR)
  const previewDir = path.resolve(PREVIEW_DIR)

  if (!fs.existsSync(inputDir)) {
    console.error(`❌ 输入目录不存在: ${inputDir}`)
    process.exit(1)
  }

  fs.mkdirSync(outputDir, { recursive: true })
  fs.mkdirSync(previewDir, { recursive: true })

  const files = fs.readdirSync(inputDir).filter((f) => f.toLowerCase().endsWith('.png'))

  console.log('═══════════════════════════════════════')
  console.log('  后台道具 / NPC 图片去背景处理')
  console.log('═══════════════════════════════════════')
  console.log(`输入目录 : ${inputDir}`)
  console.log(`输出目录 : ${outputDir}`)
  console.log(`预览目录 : ${previewDir}`)
  console.log(`找到 ${files.length} 个 PNG 文件`)
  console.log('')

  const results = []
  let skipped = 0

  for (const file of files) {
    const inputPath = path.join(inputDir, file)
    const nameLower = file.toLowerCase()

    // bg.png 跳过
    if (nameLower.startsWith('bg')) {
      console.log(`  ⏭️  ${file} → 背景图，跳过（直接复制）`)
      const destPath = path.join(outputDir, file)
      fs.copyFileSync(inputPath, destPath)
      skipped++
      continue
    }

    const outputPath = path.join(outputDir, file)

    try {
      const result = await processImage(inputPath, outputPath, file)
      results.push(result)

      const tag = result.isNpc ? ' [NPC]' : ''
      console.log(`  ✅ ${file}${tag}`)
      console.log(`     尺寸: ${result.width}×${result.height}`)
      console.log(`     透明: ${result.transRatio} (全透: ${result.transparentPixels}, 半透: ${result.semiTransparentPixels})`)
      if (result.qc.ok) {
        console.log(`     质检: ✅ 通过`)
      } else {
        console.log(`     质检: ${result.qc.issues.join(' | ')}`)
      }
      console.log(`     预览: ${path.relative('.', result.previews.previewDarkPath)}`)
      console.log(`           ${path.relative('.', result.previews.previewLightPath)}`)
    } catch (err) {
      console.error(`  ❌ ${file}: ${err.message}`)
    }

    console.log('')
  }

  // ---- 汇总报告 ----
  console.log('═══════════════════════════════════════')
  console.log('  处理完成')
  console.log('═══════════════════════════════════════')
  console.log(`处理图片 : ${results.length} 张`)
  console.log(`跳过/复制: ${skipped} 张`)
  console.log('')

  // 分类
  const hasAlpha = results.filter(r => r.qc.hasAlpha)
  const noAlpha = results.filter(r => !r.qc.hasAlpha)
  const hasIssues = results.filter(r => !r.qc.ok)
  const mayHaveWhiteEdge = results.filter(r => parseFloat(r.qc.nearWhiteRatio) > 1.0)

  console.log('📊 成功生成透明通道:')
  for (const r of hasAlpha) {
    console.log(`   ✅ ${r.filename} (${r.transRatio}透明)`)
  }

  if (noAlpha.length > 0) {
    console.log('')
    console.log('⚠️ 以下图片无透明通道（可能全是主体）:')
    for (const r of noAlpha) {
      console.log(`   ⚠️ ${r.filename}`)
    }
  }

  if (hasIssues.length > 0) {
    console.log('')
    console.log('⚠️ 以下图片存在质量问题:')
    for (const r of hasIssues) {
      console.log(`   ${r.filename}: ${r.qc.issues.join(' | ')}`)
    }
  }

  if (mayHaveWhiteEdge.length > 0) {
    console.log('')
    console.log('🔍 以下图片可能仍有轻微白边（建议查看预览确认）:')
    for (const r of mayHaveWhiteEdge) {
      console.log(`   🔍 ${r.filename} (不透明区 ${r.qc.nearWhiteRatio} 接近白色)`)
    }
  }

  console.log('')
  console.log('📁 输出路径:')
  console.log(`   处理后图片: ${outputDir}`)
  console.log(`   预览图:     ${previewDir}`)
  console.log('')
  console.log('💡 建议: 请打开预览图检查效果。如果仍有明显白边，')
  console.log('   该素材可能需要重新提供真正透明背景的 PNG。')
}

main().catch((err) => {
  console.error('脚本执行失败:', err)
  process.exit(1)
})
