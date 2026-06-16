/**
 * remove-npc-bg.js
 *
 * 针对 NPC 图片的白底去除脚本，复用 remove-checkerboard-bg.js 的核心算法：
 * 1. 从四周边缘 flood fill，删除与边缘连通的浅灰/白色背景
 * 2. 小连通域清理：残留的低饱和高亮小块（<100px）设为透明
 * 3. 紧邻透明区域的浅灰边缘像素，降低 alpha 减少白点残留
 * 4. 输出到 public/assets/processed/npcs/
 * 5. 生成深色背景 preview 图，用于检测残留
 *
 * 用法：
 *   node scripts/remove-npc-bg.js
 */

import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

// ==============================
// 配置
// ==============================
const INPUT_DIR = 'public/assets/npcs'
const OUTPUT_DIR = 'public/assets/processed/npcs'
const PREVIEW_DIR = 'public/assets/processed/preview/npcs'

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

/** 第二轮：更激进的白点清理 — 紧邻透明像素且 RGB 均 > 220 直接透明 */
const SECOND_PASS_WHITE_THRESHOLD = 220
/** 第二轮：小连通域面积上限（更大，清理更多小块） */
const SECOND_PASS_BLOB_AREA = 500

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
    if (!bgFlags[idx]) return
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
// 生成深色背景 preview 图
// ==============================
async function generatePreview(rawRGBA, alphaMask, width, height, previewPath) {
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
// 4. 第二轮清理：紧邻透明像素的白点 & 中小连通域
// ==============================
function secondPassCleanup(rawRGBA, mask, width, height) {
  const totalPixels = width * height

  // 迭代清理：多次执行紧邻透明白点清除，直到收敛（处理多层白边）
  let newMask = Buffer.from(mask)
  const MAX_ITER = 10

  for (let iter = 0; iter < MAX_ITER; iter++) {
    let changed = false
    const prevMask = Buffer.from(newMask)

    // Step 4a: 紧邻透明像素的白点直接设透明
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x
        if (prevMask[idx] === 0) continue

        // 检查是否紧邻透明（使用上一次迭代的结果）
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

  // Step 4b: 中小连通域清理（面积 < SECOND_PASS_BLOB_AREA）
  const visited = new Uint8Array(totalPixels)
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
// 检测残留白点
// ==============================
function detectWhiteResidue(rawRGBA, alphaMask, width, height) {
  let whiteEdgePixels = 0
  let whiteBlobCount = 0
  let whiteBlobTotal = 0

  // 1. 检查紧邻透明像素的非透明像素中是否有白点
  const edgeVisited = new Uint8Array(width * height)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x
      if (alphaMask[idx] === 0) continue
      if (edgeVisited[idx]) continue

      // 检查是否紧邻透明区域
      let isEdge = false
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue
          const nx = x + dx, ny = y + dy
          if (nx < 0 || nx >= width || ny < 0 || ny >= height) { isEdge = true; break }
          if (alphaMask[ny * width + nx] === 0) { isEdge = true; break }
        }
        if (isEdge) break
      }

      if (isEdge) {
        const r = rawRGBA[idx * 4], g = rawRGBA[idx * 4 + 1], b = rawRGBA[idx * 4 + 2]
        // 严格白点判定：所有通道都 > 240（避免误判皮肤/服饰亮色）
        if (r > 240 && g > 240 && b > 240) {
          whiteEdgePixels++
        }
      }
    }
  }

  // 2. 检查非边缘的残留白块（小连通域）
  const blobVisited = new Uint8Array(width * height)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x
      if (alphaMask[idx] === 0) continue
      if (blobVisited[idx]) continue

      const r = rawRGBA[idx * 4], g = rawRGBA[idx * 4 + 1], b = rawRGBA[idx * 4 + 2]
      if (r <= 240 || g <= 240 || b <= 240) continue

      // BFS
      const queue = [idx]
      blobVisited[idx] = 1
      let head = 0
      while (head < queue.length) {
        const ci = queue[head++]
        const cx = ci % width
        const cy = (ci / width) | 0
        for (const [nx, ny] of [[cx - 1, cy], [cx + 1, cy], [cx, cy - 1], [cx, cy + 1]]) {
          if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue
          const ni = ny * width + nx
          if (blobVisited[ni] || alphaMask[ni] === 0) continue
          const nr = rawRGBA[ni * 4], ng = rawRGBA[ni * 4 + 1], nb = rawRGBA[ni * 4 + 2]
          if (nr <= 240 || ng <= 240 || nb <= 240) continue
          blobVisited[ni] = 1
          queue.push(ni)
        }
      }

      if (queue.length < SMALL_BLOB_AREA) {
        whiteBlobCount++
        whiteBlobTotal += queue.length
      }
    }
  }

  return { whiteEdgePixels, whiteBlobCount, whiteBlobTotal }
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

  // 合并
  const mask = Buffer.alloc(totalPixels, 255)
  for (let i = 0; i < totalPixels; i++) {
    if (edgeBg[i] || smallBg[i]) mask[i] = 0
  }

  // Step 3: 边缘半透明
  let finalMask = edgeSoftAlpha(mask, width, height)

  // Step 4: 第二轮清理 — 白点白边 + 中小白块
  finalMask = secondPassCleanup(rawRGBA, finalMask, width, height)

  // 检测残留白点
  const residue = detectWhiteResidue(rawRGBA, finalMask, width, height)

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

  // Preview
  await generatePreview(rawRGBA, finalMask, width, height, previewPath)

  return {
    width,
    height,
    totalPixels,
    transparentPixels,
    ratio: ((transparentPixels / totalPixels) * 100).toFixed(1) + '%',
    residue,
  }
}

// ==============================
// 验证 alpha 通道
// ==============================
async function verifyAlpha(filePath) {
  const { data, info } = await sharp(filePath)
    .raw()
    .toBuffer({ resolveWithObject: true })

  const hasAlpha = info.channels === 4
  let alphaNon255Count = 0
  let alphaZeroCount = 0
  const totalPixels = info.width * info.height

  if (hasAlpha) {
    for (let i = 0; i < totalPixels; i++) {
      const a = data[i * 4 + 3]
      if (a < 255) alphaNon255Count++
      if (a === 0) alphaZeroCount++
    }
  }

  return {
    hasAlpha,
    channels: info.channels,
    width: info.width,
    height: info.height,
    alphaNon255Pct: ((alphaNon255Count / totalPixels) * 100).toFixed(1) + '%',
    alphaZeroPct: ((alphaZeroCount / totalPixels) * 100).toFixed(1) + '%',
  }
}

// ==============================
// 入口
// ==============================
async function main() {
  console.log('=== NPC 白底去背景工具 ===')
  console.log('输入目录:', INPUT_DIR)
  console.log('输出目录:', OUTPUT_DIR)
  console.log('')

  const inputDir = path.resolve(INPUT_DIR)
  const outputDir = path.resolve(OUTPUT_DIR)
  const previewDir = path.resolve(PREVIEW_DIR)

  if (!fs.existsSync(inputDir)) {
    console.error('❌ 输入目录不存在:', inputDir)
    process.exit(1)
  }

  fs.mkdirSync(outputDir, { recursive: true })
  fs.mkdirSync(previewDir, { recursive: true })

  const files = fs.readdirSync(inputDir).filter((f) => f.toLowerCase().endsWith('.png'))
  console.log(`找到 ${files.length} 个 PNG 文件\n`)

  const results = []

  for (const file of files) {
    const inputPath = path.join(inputDir, file)
    const outputPath = path.join(outputDir, file)
    const previewPath = path.join(previewDir, file)

    try {
      console.log(`处理: ${file} ...`)
      const stats = await processPNG(inputPath, outputPath, previewPath)
      console.log(`  📐 ${stats.width}x${stats.height}`)
      console.log(`  🫧 透明像素: ${stats.transparentPixels}/${stats.totalPixels} (${stats.ratio})`)
      console.log(`  🔍 残留白点边缘: ${stats.residue.whiteEdgePixels}px`)
      console.log(`  🔍 残留白块: ${stats.residue.whiteBlobCount} 个 (共 ${stats.residue.whiteBlobTotal}px)`)

      results.push({ file, ...stats })
    } catch (err) {
      console.error(`  ❌ ${file}: ${err.message}`)
    }
  }

  // 验证 alpha
  console.log('\n=== Alpha 通道验证 ===')
  for (const r of results) {
    const outputPath = path.join(outputDir, r.file)
    const alpha = await verifyAlpha(outputPath)
    const hasAlphaIcon = alpha.hasAlpha ? '✅' : '❌'
    const hasTransparency = parseFloat(alpha.alphaNon255Pct) > 0
    console.log(`  ${hasAlphaIcon} ${r.file}: channels=${alpha.channels}, 非255alpha=${alpha.alphaNon255Pct}, 完全透明=${alpha.alphaZeroPct}`)
  }

  // 汇总
  console.log('\n=== 处理汇总 ===')
  for (const r of results) {
    const residueIcon = r.residue.whiteEdgePixels > 50
      ? '⚠ 有明显白边残留'
      : r.residue.whiteBlobCount > 5
        ? '⚠ 有残留白块'
        : '✅ 无明显残留'
    console.log(`  ${r.file}: 透明${r.ratio} | ${residueIcon}`)
  }

  console.log('\n输出目录:', outputDir)
  console.log('Preview 目录:', previewDir)
}

main().catch((err) => {
  console.error('脚本执行失败:', err)
  process.exit(1)
})
