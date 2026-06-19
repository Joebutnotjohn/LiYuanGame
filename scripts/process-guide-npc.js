/**
 * process-guide-npc.js
 *
 * 处理 guide.png：去除白色背景，生成透明 PNG。
 * 复用 process-backstage-props.js 的去背景算法。
 *
 * 用法：
 *   node scripts/process-guide-npc.js
 */

import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

// ==============================
// 配置
// ==============================
const INPUT_PATH = 'public/assets/npcs/guide.png'
const OUTPUT_DIR = 'public/assets/processed/npcs'
const OUTPUT_PATH = path.join(OUTPUT_DIR, 'guide.png')
const PREVIEW_DIR = path.join(OUTPUT_DIR, 'preview')

/** 背景判定：HSL 亮度阈值 */
const BG_LIGHTNESS_MIN = 0.35
/** 背景判定：HSL 饱和度上限 */
const BG_SAT_MAX = 0.20
/** 背景判定：RGB 通道最大差值 */
const BG_RGB_DIFF_MAX = 70

/** 白边检测：亮度阈值 */
const EDGE_WHITE_LIGHTNESS = 0.65
/** 白边检测：饱和度上限 */
const EDGE_WHITE_SAT = 0.10
/** 白边检测：RGB 通道最大差值 */
const EDGE_WHITE_RGB_DIFF = 35
/** 白边羽化距离（像素） */
const EDGE_FEATHER_RADIUS = 2
/** 白边 alpha 缩放系数 */
const EDGE_WHITE_ALPHA_FACTOR = 0.25

/** 边缘收缩像素 */
const ERODE_RADIUS = 1
/** 主体边缘 alpha feather 半径 */
const FEATHER_RADIUS = 1

/** 小连通域最大面积（像素） */
const SMALL_BLOB_MAX_AREA = 150

/** 预览背景色 */
const PREVIEW_DARK = { r: 44, g: 34, b: 24 }
const PREVIEW_LIGHT = { r: 250, g: 240, b: 220 }

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

function isBackgroundColor(r, g, b) {
  const { s, l } = rgbToHsl(r, g, b)
  if (l < BG_LIGHTNESS_MIN) return false
  if (s > BG_SAT_MAX) return false
  const diff = Math.max(r, g, b) - Math.min(r, g, b)
  if (diff > BG_RGB_DIFF_MAX) return false
  return true
}

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
// Step 2: 小连通域清理
// ==============================
function smallBlobCleanup(width, height, bgFlags, protectedMask) {
  const visited = new Uint8Array(width * height)
  const toClear = new Uint8Array(width * height)

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x
      if (visited[idx] || !bgFlags[idx]) continue
      if (protectedMask[idx]) continue

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
          if (!bgFlags[ni]) {
            touchesSubject = true
          } else if (!protectedMask[ni]) {
            visited[ni] = 1
            queue.push(ni)
          }
        }
      }

      if (!touchesSubject && queue.length < SMALL_BLOB_MAX_AREA) {
        for (const i of queue) toClear[i] = 1
      }
    }
  }

  return toClear
}

// ==============================
// Step 3: 边缘腐蚀
// ==============================
function erodeMask(mask, width, height, radius) {
  const result = new Uint8Array(mask)
  for (let r = 0; r < radius; r++) {
    const src = new Uint8Array(result)
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x
        if (src[idx] === 0) continue
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
// Step 4: Alpha feather
// ==============================
function applyFeather(mask, width, height, radius) {
  const result = new Uint8Array(mask)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x
      if (mask[idx] > 0) continue

      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          if (dx === 0 && dy === 0) continue
          const nx = x + dx, ny = y + dy
          if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue
          const ni = ny * width + nx
          if (mask[ni] === 0) continue

          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist > radius) continue
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
// Step 5: 白边处理
// ==============================
function processWhiteEdge(rawRGBA, mask, width, height) {
  const resultMask = new Uint8Array(mask)
  const totalPixels = width * height
  const distToTransparent = new Uint16Array(totalPixels).fill(65535)
  const queue = []

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

  for (let i = 0; i < totalPixels; i++) {
    if (distToTransparent[i] === 0) continue
    if (distToTransparent[i] > EDGE_FEATHER_RADIUS) continue

    const r = rawRGBA[i * 4], g = rawRGBA[i * 4 + 1], b = rawRGBA[i * 4 + 2]
    if (isWhiteEdge(r, g, b)) {
      const distFactor = distToTransparent[i] / (EDGE_FEATHER_RADIUS + 1)
      const alphaScale = EDGE_WHITE_ALPHA_FACTOR + (1 - EDGE_WHITE_ALPHA_FACTOR) * (1 - distFactor)
      resultMask[i] = Math.round(resultMask[i] * alphaScale)
    }
  }

  return resultMask
}

// ==============================
// 主流程
// ==============================
async function main() {
  const inputDir = path.resolve(INPUT_PATH)
  const outputDir = path.resolve(OUTPUT_DIR)
  const outputPath = path.resolve(OUTPUT_PATH)
  const previewDir = path.resolve(PREVIEW_DIR)

  if (!fs.existsSync(inputDir)) {
    console.error(`❌ 输入文件不存在: ${inputDir}`)
    process.exit(1)
  }

  fs.mkdirSync(outputDir, { recursive: true })
  fs.mkdirSync(previewDir, { recursive: true })

  console.log('═══════════════════════════════════════')
  console.log('  Guide NPC 去背景处理')
  console.log('═══════════════════════════════════════')
  console.log(`输入 : ${inputDir}`)
  console.log(`输出 : ${outputPath}`)
  console.log('')

  const { data: rawRGBA, info } = await sharp(inputDir)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const { width, height } = info
  const totalPixels = width * height
  console.log(`尺寸: ${width}×${height}`)

  // Phase 1: 标记背景像素
  const bgFlags = new Uint8Array(totalPixels)
  for (let i = 0; i < totalPixels; i++) {
    const r = rawRGBA[i * 4], g = rawRGBA[i * 4 + 1], b = rawRGBA[i * 4 + 2]
    bgFlags[i] = isBackgroundColor(r, g, b) ? 1 : 0
  }

  // Phase 2: 边缘 flood-fill
  const edgeBg = floodFillEdge(width, height, bgFlags)

  // Phase 2b: 采样背景颜色范围
  const bgColorSamples = { r: [], g: [], b: [] }
  for (let i = 0; i < totalPixels; i++) {
    if (edgeBg[i]) {
      bgColorSamples.r.push(rawRGBA[i * 4])
      bgColorSamples.g.push(rawRGBA[i * 4 + 1])
      bgColorSamples.b.push(rawRGBA[i * 4 + 2])
    }
  }

  let bgMean = null
  let bgStd = null
  if (bgColorSamples.r.length > 100) {
    const mean = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length
    const std = (arr, m) => Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length)

    bgMean = { r: mean(bgColorSamples.r), g: mean(bgColorSamples.g), b: mean(bgColorSamples.b) }
    bgStd = { r: std(bgColorSamples.r, bgMean.r), g: std(bgColorSamples.g, bgMean.g), b: std(bgColorSamples.b, bgMean.b) }
  }

  // Phase 2c: 扩展背景标记
  if (bgMean && bgStd) {
    const expandedBg = new Uint8Array(totalPixels)
    const rMin = Math.max(0, bgMean.r - 2.5 * bgStd.r)
    const rMax = Math.min(255, bgMean.r + 2.5 * bgStd.r)
    const gMin = Math.max(0, bgMean.g - 2.5 * bgStd.g)
    const gMax = Math.min(255, bgMean.g + 2.5 * bgStd.g)
    const bMin = Math.max(0, bgMean.b - 2.5 * bgStd.b)
    const bMax = Math.min(255, bgMean.b + 2.5 * bgStd.b)

    const bgHsl = rgbToHsl(Math.round(bgMean.r), Math.round(bgMean.g), Math.round(bgMean.b))

    for (let i = 0; i < totalPixels; i++) {
      if (edgeBg[i]) continue
      const r = rawRGBA[i * 4], g = rawRGBA[i * 4 + 1], b = rawRGBA[i * 4 + 2]
      const inRange = r >= rMin && r <= rMax && g >= gMin && g <= gMax && b >= bMin && b <= bMax
      const { s, l } = rgbToHsl(r, g, b)
      const similarHsl = Math.abs(l - bgHsl.l) < 0.15 && Math.abs(s - bgHsl.s) < 0.12
      if (inRange || similarHsl) expandedBg[i] = 1
    }

    for (let i = 0; i < totalPixels; i++) {
      if (expandedBg[i]) bgFlags[i] = 1
    }

    const edgeBg2 = floodFillEdge(width, height, bgFlags)
    for (let i = 0; i < totalPixels; i++) {
      if (edgeBg2[i] && !edgeBg[i]) edgeBg[i] = 1
    }
  }

  // Phase 3: 构建 mask
  const mask = Buffer.alloc(totalPixels, 255)
  for (let i = 0; i < totalPixels; i++) {
    if (edgeBg[i]) mask[i] = 0
  }

  // Phase 4: 小连通域清理
  const protectedMask = new Uint8Array(totalPixels)
  for (let i = 0; i < totalPixels; i++) {
    if (edgeBg[i]) protectedMask[i] = 1
    if (!bgFlags[i] && mask[i] > 0) protectedMask[i] = 1
  }

  const smallBg = smallBlobCleanup(width, height, bgFlags, protectedMask)
  for (let i = 0; i < totalPixels; i++) {
    if (smallBg[i]) mask[i] = 0
  }

  // Phase 5: 白边处理
  const whiteEdgeMask = processWhiteEdge(rawRGBA, mask, width, height)
  for (let i = 0; i < totalPixels; i++) {
    mask[i] = whiteEdgeMask[i]
  }

  // Phase 6: 边缘腐蚀
  const erodedMask = erodeMask(mask, width, height, ERODE_RADIUS)

  // Phase 7: feather
  const featheredMask = applyFeather(erodedMask, width, height, FEATHER_RADIUS)

  // Phase 8: 写回 alpha
  for (let i = 0; i < totalPixels; i++) {
    rawRGBA[i * 4 + 3] = featheredMask[i]
  }

  // 输出
  await sharp(rawRGBA, { raw: { width, height, channels: 4 } })
    .png({ compressionLevel: 6 })
    .toFile(outputPath)

  // 统计
  let transparentPixels = 0
  for (let i = 0; i < totalPixels; i++) {
    if (featheredMask[i] === 0) transparentPixels++
  }
  const transRatio = ((transparentPixels / totalPixels) * 100).toFixed(1)

  console.log(`透明比例: ${transRatio}%`)
  console.log('')

  // 生成预览图
  const previewDarkPath = path.join(previewDir, 'guide_preview_dark.png')
  const previewLightPath = path.join(previewDir, 'guide_preview_light.png')

  const bgDarkSVG = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="rgb(${PREVIEW_DARK.r},${PREVIEW_DARK.g},${PREVIEW_DARK.b})"/></svg>`
  const bgLightSVG = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="rgb(${PREVIEW_LIGHT.r},${PREVIEW_LIGHT.g},${PREVIEW_LIGHT.b})"/></svg>`

  const [bgDarkBuf, bgLightBuf, fgBuf] = await Promise.all([
    sharp(Buffer.from(bgDarkSVG)).resize(width, height).png().toBuffer(),
    sharp(Buffer.from(bgLightSVG)).resize(width, height).png().toBuffer(),
    sharp(outputPath).ensureAlpha().resize(width, height).png().toBuffer(),
  ])

  await Promise.all([
    sharp(bgDarkBuf).composite([{ input: fgBuf, top: 0, left: 0 }]).png({ compressionLevel: 3 }).toFile(previewDarkPath),
    sharp(bgLightBuf).composite([{ input: fgBuf, top: 0, left: 0 }]).png({ compressionLevel: 3 }).toFile(previewLightPath),
  ])

  console.log('预览图已生成:')
  console.log(`  暗色: ${previewDarkPath}`)
  console.log(`  亮色: ${previewLightPath}`)
  console.log('')
  console.log('✅ 处理完成！')
}

main().catch((err) => {
  console.error('脚本执行失败:', err)
  process.exit(1)
})
