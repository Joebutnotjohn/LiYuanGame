/**
 * remove-checkerboard-bg.js
 *
 * 批量处理 PNG 图片中的"假透明棋盘格背景"：
 * 1. 从四周边缘 flood fill，仅删除与边缘连通的浅灰/白色背景
 * 2. 小连通域清理：残留的低饱和高亮小块（<100px）设为透明
 * 3. 紧邻透明区域的浅灰边缘像素，降低 alpha 减少白点残留
 * 4. 输出到 public/assets/processed，生成深色背景 preview 图
 *
 * 用法：
 *   node scripts/remove-checkerboard-bg.js [--overwrite]
 */

import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

// ==============================
// 配置
// ==============================
const INPUT_DIRS = ['public/assets/icons', 'public/assets/buttons', 'public/assets/ui']
const OUTPUT_BASE = 'public/assets/processed'

/** 亮度阈值：HSL lightness > 此值 + 饱和度 < SAT_THRESHOLD 认为是"浅色背景" */
const LIGHTNESS_HI = 0.50
/** 饱和度阈值：低于此值 + 高亮 = 灰白 */
const SAT_THRESHOLD = 0.18
/** 通道差值上限：max-min < 此值 = 接近灰度 */
const RGB_DIFF_MAX = 45
/** 小连通域面积上限（像素） */
const SMALL_BLOB_AREA = 100
/** 边缘半透明：紧邻透明像素的浅灰像素 alpha 乘以此系数 */
const EDGE_ALPHA_FACTOR = 0.0

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
function floodFillEdge(mask, width, height, bgFlags) {
  const visited = new Uint8Array(width * height)
  const queue = []

  function enqueue(x, y) {
    const idx = y * width + x
    if (x < 0 || x >= width || y < 0 || y >= height) return
    if (visited[idx]) return
    if (!bgFlags[idx]) return // 不是背景色
    visited[idx] = 1
    queue.push(idx)
  }

  // 从四边入队
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

  // 返回与边缘连通的背景像素集合
  const edgeConnected = new Uint8Array(width * height)
  for (let i = 0; i < visited.length; i++) {
    edgeConnected[i] = visited[i]
  }
  return edgeConnected
}

// ==============================
// 2. 小连通域清理
// ==============================
function smallBlobCleanup(mask, width, height, bgFlags) {
  const visited = new Uint8Array(width * height)
  const toClear = new Uint8Array(width * height)

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x
      if (visited[idx] || !bgFlags[idx]) continue

      // BFS 找连通域
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
        // 检查 8 邻域是否有透明像素
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
// 生成深色背景 preview 图
// ==============================
async function generatePreview(rawRGBA, alphaMask, width, height, previewPath) {
  // 在 #1a1a2e 深色背景上合成
  const bgR = 0x1a, bgG = 0x1a, bgB = 0x2e
  const preview = Buffer.alloc(width * height * 3)

  for (let i = 0; i < width * height; i++) {
    const a = alphaMask[i] / 255
    const sr = rawRGBA[i * 4]
    const sg = rawRGBA[i * 4 + 1]
    const sb = rawRGBA[i * 4 + 2]
    preview[i * 3] = Math.round(sr * a + bgR * (1 - a))
    preview[i * 3 + 1] = Math.round(sg * a + bgG * (1 - a))
    preview[i * 3 + 2] = Math.round(sb * a + bgB * (1 - a))
  }

  await sharp(preview, { raw: { width, height, channels: 3 } })
    .png()
    .toFile(previewPath)
}

// ==============================
// 主处理
// ==============================
async function processPNG(inputPath, outputPath, previewPath) {
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
  const edgeBg = floodFillEdge(null, width, height, bgFlags)

  // Step 2: 小连通域
  const smallBg = smallBlobCleanup(null, width, height, bgFlags)

  // 合并：边缘连通 + 小连通域 都设透明
  const mask = Buffer.alloc(totalPixels, 255)
  for (let i = 0; i < totalPixels; i++) {
    if (edgeBg[i] || smallBg[i]) mask[i] = 0
  }

  // Step 3: 边缘半透明
  const finalMask = edgeSoftAlpha(mask, width, height)

  // 统计
  let transparentPixels = 0
  for (let i = 0; i < totalPixels; i++) {
    if (finalMask[i] < 255) transparentPixels++
  }

  if (outputPath) {
    // 写入 alpha
    for (let i = 0; i < totalPixels; i++) {
      rawRGBA[i * 4 + 3] = finalMask[i]
    }
    await sharp(rawRGBA, { raw: { width, height, channels: 4 } })
      .png({ compressionLevel: 6 })
      .toFile(outputPath)
  }

  // Preview
  if (previewPath) {
    await generatePreview(rawRGBA, finalMask, width, height, previewPath)
  }

  return {
    transparentPixels,
    totalPixels,
    ratio: ((transparentPixels / totalPixels) * 100).toFixed(1) + '%',
  }
}

// ==============================
// 入口
// ==============================
async function main() {
  const args = process.argv.slice(2)
  const overwrite = args.includes('--overwrite')

  console.log('=== PNG 棋盘格背景移除工具 v2 (Flood Fill) ===')
  console.log(overwrite ? '模式: 覆盖原文件' : '模式: 输出到 processed/')
  console.log('')

  let totalFiles = 0
  const results = []

  for (const dir of INPUT_DIRS) {
    const inputDir = path.resolve(dir)
    if (!fs.existsSync(inputDir)) {
      console.log(`⚠ 目录不存在，跳过: ${dir}`)
      continue
    }

    const relativeDir = path.basename(dir)
    const outputDir = overwrite ? inputDir : path.resolve(OUTPUT_BASE, relativeDir)
    const previewDir = path.resolve(OUTPUT_BASE, 'preview', relativeDir)

    if (!overwrite) {
      fs.mkdirSync(outputDir, { recursive: true })
      fs.mkdirSync(previewDir, { recursive: true })
    }

    const files = fs.readdirSync(inputDir).filter((f) => f.toLowerCase().endsWith('.png'))

    for (const file of files) {
      const inputPath = path.join(inputDir, file)
      const outputPath = overwrite ? inputPath : path.join(outputDir, file)
      const previewPath = overwrite ? null : path.join(previewDir, file)
      totalFiles++

      try {
        const stats = await processPNG(inputPath, outputPath, previewPath)
        console.log(`  ✅ ${relativeDir}/${file} → ${stats.ratio} 透明 (${stats.transparentPixels}/${stats.totalPixels}px)`)
        results.push({ file: `${relativeDir}/${file}`, ...stats, outputPath, previewPath })
      } catch (err) {
        console.error(`  ❌ ${relativeDir}/${file}: ${err.message}`)
      }
    }
  }

  // 输出汇总
  console.log(`\n=== 汇总 ===`)
  console.log(`处理图片: ${totalFiles} 张`)
  console.log(`输出目录: ${path.resolve(OUTPUT_BASE)}/icons + ${path.resolve(OUTPUT_BASE)}/buttons`)
  console.log(`Preview 目录: ${path.resolve(OUTPUT_BASE)}/preview/`)
  console.log('')

  for (const r of results) {
    const ratioNum = parseFloat(r.ratio)
    const status = ratioNum < 0.5 ? '⚠ 几乎无透明' : ratioNum > 90 ? '⚠ 可能误删' : '✓'
    console.log(`  ${status} ${r.file}: ${r.ratio} 透明`)
  }
}

main().catch((err) => {
  console.error('脚本执行失败:', err)
  process.exit(1)
})
