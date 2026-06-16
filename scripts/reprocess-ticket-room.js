/**
 * reprocess-ticket-room.js
 *
 * 针对特定 ticket-room 图片重新去背景处理：
 * - npc-xiaowan.png (小婉)
 * - npc-ye.png (宋先生)
 * - ticket-img.png (项羽虞姬)
 * - sword.png (剑与酒杯)
 *
 * 使用更激进的参数：降低白底阈值，更多轮迭代，更大连通域清理
 *
 * 用法：
 *   node scripts/reprocess-ticket-room.js
 */

import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

// ==============================
// 配置 — 更激进的参数
// ==============================
const INPUT_DIR = 'public/assets/ticket-room'
const OUTPUT_DIR = 'public/processed/ticket-room'

/** 亮度阈值：进一步降低以捕获更多浅色背景 */
const LIGHTNESS_HI = 0.28
/** 饱和度阈值：更低 */
const SAT_THRESHOLD = 0.14
/** 通道差值上限：更宽松 */
const RGB_DIFF_MAX = 80
/** 小连通域面积上限（像素）— 更大 */
const SMALL_BLOB_AREA = 500
/** 边缘半透明因子 */
const EDGE_ALPHA_FACTOR = 0.0

/** 第二轮：更激进的白点清理 */
const SECOND_PASS_WHITE_THRESHOLD = 150
const SECOND_PASS_BLOB_AREA = 2000
const SECOND_PASS_MAX_ITER = 25

/** 第三轮：所有残留在透明区域附近的灰白像素，逐步扩大清理 */
const THIRD_PASS_WHITE_THRESHOLD = 170
const THIRD_PASS_BLOB_AREA = 4000

// ==============================
// 工具：RGB → HSL
// ==============================
function rgbToHsl(r, g, b) {
  const rn = r / 255, gn = g / 255, bn = b / 255
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn)
  const l = (max + min) / 2
  if (max === min) return [0, 0, l]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h
  switch (max) {
    case rn: h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6; break
    case gn: h = ((bn - rn) / d + 2) / 6; break
    case bn: h = ((rn - gn) / d + 4) / 6; break
  }
  return [h, s, l]
}

function isGrayishBg(r, g, b) {
  const [, s, l] = rgbToHsl(r, g, b)
  if (l < LIGHTNESS_HI) return false
  if (s > SAT_THRESHOLD) return false
  const diff = Math.max(r, g, b) - Math.min(r, g, b)
  if (diff > RGB_DIFF_MAX) return false
  return true
}

// ==============================
// 1. Flood fill 从边缘连通域
// ==============================
function floodFillEdge(width, height, bgFlags) {
  const visited = new Uint8Array(width * height)
  const queue = []

  function enqueue(x, y) {
    const idx = y * width + x
    if (x < 0 || x >= width || y < 0 || y >= height) return
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

  const edgeConnected = new Uint8Array(width * height)
  for (let i = 0; i < visited.length; i++) {
    edgeConnected[i] = visited[i]
  }
  return edgeConnected
}

// ==============================
// 2. 小连通域清理
// ==============================
function smallBlobCleanup(width, height, bgFlags) {
  const visited = new Uint8Array(width * height)
  const toClear = new Uint8Array(width * height)

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x
      if (visited[idx] || !bgFlags[idx]) continue

      const queue = [idx]
      visited[idx] = 1
      let head = 0
      while (head < queue.length) {
        const ci = queue[head++]
        const cx = ci % width
        const cy = (ci / width) | 0
        const dirs = [[cx - 1, cy], [cx + 1, cy], [cx, cy - 1], [cx, cy + 1]]
        for (const [nx, ny] of dirs) {
          if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue
          const ni = ny * width + nx
          if (visited[ni] || !bgFlags[ni]) continue
          visited[ni] = 1
          queue.push(ni)
        }
      }

      if (queue.length < SMALL_BLOB_AREA) {
        for (const i of queue) toClear[i] = 1
      }
    }
  }

  return toClear
}

// ==============================
// 3. 紧邻透明像素的浅灰边缘半透明
// ==============================
function edgeSoftAlpha(mask, width, height) {
  const newMask = Buffer.from(mask)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x
      if (mask[idx] === 255) {
        let hasTransparentNeighbor = false
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue
            const nx = x + dx, ny = y + dy
            if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue
            if (mask[ny * width + nx] === 0) {
              hasTransparentNeighbor = true
              break
            }
          }
          if (hasTransparentNeighbor) break
        }
        if (hasTransparentNeighbor) {
          newMask[idx] = Math.round(255 * EDGE_ALPHA_FACTOR)
        }
      }
    }
  }
  return newMask
}

// ==============================
// 4. 第二轮清理：更激进
// ==============================
function secondPassCleanup(rawRGBA, mask, width, height) {
  let newMask = Buffer.from(mask)

  for (let iter = 0; iter < SECOND_PASS_MAX_ITER; iter++) {
    let changed = false
    const prevMask = Buffer.from(newMask)

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x
        if (prevMask[idx] === 0) continue

        let nearTransparent = false
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue
            const nx = x + dx, ny = y + dy
            if (nx < 0 || nx >= width || ny < 0 || ny >= height) { nearTransparent = true; break }
            if (prevMask[ny * width + nx] === 0) { nearTransparent = true; break }
          }
          if (nearTransparent) break
        }

        if (nearTransparent) {
          const r = rawRGBA[idx * 4], g = rawRGBA[idx * 4 + 1], b = rawRGBA[idx * 4 + 2]
          if (r > SECOND_PASS_WHITE_THRESHOLD && g > SECOND_PASS_WHITE_THRESHOLD && b > SECOND_PASS_WHITE_THRESHOLD) {
            newMask[idx] = 0
            changed = true
          }
        }
      }
    }

    if (!changed) break
  }

  // Step 4b: 中小连通域清理
  const visited = new Uint8Array(width * height)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x
      if (newMask[idx] === 0) continue
      if (visited[idx]) continue

      const r = rawRGBA[idx * 4], g = rawRGBA[idx * 4 + 1], b = rawRGBA[idx * 4 + 2]
      if (r <= SECOND_PASS_WHITE_THRESHOLD || g <= SECOND_PASS_WHITE_THRESHOLD || b <= SECOND_PASS_WHITE_THRESHOLD) continue

      const queue = [idx]
      visited[idx] = 1
      let head = 0
      while (head < queue.length) {
        const ci = queue[head++]
        const cx = ci % width
        const cy = (ci / width) | 0
        for (const [nx, ny] of [[cx - 1, cy], [cx + 1, cy], [cx, cy - 1], [cx, cy + 1]]) {
          if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue
          const ni = ny * width + nx
          if (visited[ni] || newMask[ni] === 0) continue
          const nr = rawRGBA[ni * 4], ng = rawRGBA[ni * 4 + 1], nb = rawRGBA[ni * 4 + 2]
          if (nr <= SECOND_PASS_WHITE_THRESHOLD || ng <= SECOND_PASS_WHITE_THRESHOLD || nb <= SECOND_PASS_WHITE_THRESHOLD) continue
          visited[ni] = 1
          queue.push(ni)
        }
      }

      if (queue.length < SECOND_PASS_BLOB_AREA) {
        for (const i of queue) newMask[i] = 0
      }
    }
  }

  return newMask
}

// ==============================
// 5. 第三轮：大规模连通域清理
// ==============================
function thirdPassCleanup(rawRGBA, mask, width, height) {
  let newMask = Buffer.from(mask)

  // 迭代清理更大范围的灰白区域
  for (let iter = 0; iter < 8; iter++) {
    let changed = false
    const prevMask = Buffer.from(newMask)

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x
        if (prevMask[idx] === 0) continue

        let nearTransparent = false
        // 检查 2 像素范围内的透明邻居
        for (let dy = -2; dy <= 2; dy++) {
          for (let dx = -2; dx <= 2; dx++) {
            if (dx === 0 && dy === 0) continue
            const nx = x + dx, ny = y + dy
            if (nx < 0 || nx >= width || ny < 0 || ny >= height) { nearTransparent = true; break }
            if (prevMask[ny * width + nx] === 0) { nearTransparent = true; break }
          }
          if (nearTransparent) break
        }

        if (nearTransparent) {
          const r = rawRGBA[idx * 4], g = rawRGBA[idx * 4 + 1], b = rawRGBA[idx * 4 + 2]
          if (r > THIRD_PASS_WHITE_THRESHOLD && g > THIRD_PASS_WHITE_THRESHOLD && b > THIRD_PASS_WHITE_THRESHOLD) {
            newMask[idx] = 0
            changed = true
          }
        }
      }
    }

    if (!changed) break
  }

  // 第三轮连通域清理
  const visited = new Uint8Array(width * height)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x
      if (newMask[idx] === 0) continue
      if (visited[idx]) continue

      const r = rawRGBA[idx * 4], g = rawRGBA[idx * 4 + 1], b = rawRGBA[idx * 4 + 2]
      if (r <= THIRD_PASS_WHITE_THRESHOLD || g <= THIRD_PASS_WHITE_THRESHOLD || b <= THIRD_PASS_WHITE_THRESHOLD) continue

      const queue = [idx]
      visited[idx] = 1
      let head = 0
      while (head < queue.length) {
        const ci = queue[head++]
        const cx = ci % width
        const cy = (ci / width) | 0
        for (const [nx, ny] of [[cx - 1, cy], [cx + 1, cy], [cx, cy - 1], [cx, cy + 1]]) {
          if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue
          const ni = ny * width + nx
          if (visited[ni] || newMask[ni] === 0) continue
          const nr = rawRGBA[ni * 4], ng = rawRGBA[ni * 4 + 1], nb = rawRGBA[ni * 4 + 2]
          if (nr <= THIRD_PASS_WHITE_THRESHOLD || ng <= THIRD_PASS_WHITE_THRESHOLD || nb <= THIRD_PASS_WHITE_THRESHOLD) continue
          visited[ni] = 1
          queue.push(ni)
        }
      }

      if (queue.length < THIRD_PASS_BLOB_AREA) {
        for (const i of queue) newMask[i] = 0
      }
    }
  }

  return newMask
}

// ==============================
// 主处理
// ==============================
async function processPNG(inputPath, outputPath) {
  const { data: rawRGBA, info } = await sharp(inputPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const { width, height } = info
  const totalPixels = width * height

  // Step A: 标记所有灰白像素
  const bgFlags = new Uint8Array(totalPixels)
  for (let i = 0; i < totalPixels; i++) {
    const r = rawRGBA[i * 4], g = rawRGBA[i * 4 + 1], b = rawRGBA[i * 4 + 2]
    bgFlags[i] = isGrayishBg(r, g, b) ? 1 : 0
  }

  // Step 1: Flood fill 从边缘
  const edgeBg = floodFillEdge(width, height, bgFlags)

  // Step 2: 小连通域
  const smallBg = smallBlobCleanup(width, height, bgFlags)

  // 合并
  const mask = Buffer.alloc(totalPixels, 255)
  for (let i = 0; i < totalPixels; i++) {
    if (edgeBg[i] || smallBg[i]) mask[i] = 0
  }

  // Step 3: 边缘半透明
  let finalMask = edgeSoftAlpha(mask, width, height)

  // Step 4: 第二轮清理
  finalMask = secondPassCleanup(rawRGBA, finalMask, width, height)

  // Step 5: 第三轮清理
  finalMask = thirdPassCleanup(rawRGBA, finalMask, width, height)

  // 统计
  let transparentPixels = 0
  for (let i = 0; i < totalPixels; i++) {
    if (finalMask[i] < 255) transparentPixels++
  }

  // 写入 alpha
  for (let i = 0; i < totalPixels; i++) {
    rawRGBA[i * 4 + 3] = finalMask[i]
  }
  await sharp(rawRGBA, { raw: { width, height, channels: 4 } })
    .png({ compressionLevel: 6 })
    .toFile(outputPath)

  return {
    width,
    height,
    totalPixels,
    transparentPixels,
    ratio: ((transparentPixels / totalPixels) * 100).toFixed(1) + '%',
  }
}

// ==============================
// 入口
// ==============================
async function main() {
  console.log('=== Ticket-room 重新去背景工具（激进模式）===\n')

  const inputDir = path.resolve(INPUT_DIR)
  const outputDir = path.resolve(OUTPUT_DIR)

  if (!fs.existsSync(inputDir)) {
    console.error('❌ 输入目录不存在:', inputDir)
    process.exit(1)
  }

  fs.mkdirSync(outputDir, { recursive: true })

  // 指定需要重新处理的文件（虞姬项羽、剑与酒杯、宋先生）
  const targetFiles = [
    'ticket-img.png',
    'sword.png',
    'npc-ye.png',
  ]

  for (const file of targetFiles) {
    const inputPath = path.join(inputDir, file)
    const outputPath = path.join(outputDir, file)

    if (!fs.existsSync(inputPath)) {
      console.log(`跳过（源文件不存在）: ${file}`)
      continue
    }

    try {
      console.log(`处理: ${file} ...`)
      const stats = await processPNG(inputPath, outputPath)
      console.log(`  ✅ ${stats.width}x${stats.height} | 透明像素: ${stats.transparentPixels}/${stats.totalPixels} (${stats.ratio})`)
    } catch (err) {
      console.error(`  ❌ ${file}: ${err.message}`)
    }
  }

  console.log('\n处理完成！输出目录:', outputDir)
}

main().catch((err) => {
  console.error('脚本执行失败:', err)
  process.exit(1)
})
