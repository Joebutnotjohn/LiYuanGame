/**
 * reprocess-ticket-room-v3.js
 *
 * 使用自适应阈值 + 边缘 flood fill + 渐进式扩展
 * 专为去除纯白色/浅色背景设计
 */

import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

const INPUT_DIR = 'public/assets/ticket-room'
const OUTPUT_DIR = 'public/processed/ticket-room'

/** 初始白色阈值（RGB 各通道最小值） */
const INITIAL_WHITE_MIN = 240
/** 最大 RGB 差值 */
const MAX_RGB_DIFF = 20

function isWhite(r, g, b, threshold) {
  if (r < threshold || g < threshold || b < threshold) return false
  return Math.max(r, g, b) - Math.min(r, g, b) <= MAX_RGB_DIFF
}

function floodFillEdge(width, height, rawRGBA, threshold) {
  const mask = new Uint8Array(width * height)
  const queue = []

  function push(x, y) {
    if (x < 0 || x >= width || y < 0 || y >= height) return
    const idx = y * width + x
    if (mask[idx]) return
    if (!isWhite(rawRGBA[idx*4], rawRGBA[idx*4+1], rawRGBA[idx*4+2], threshold)) return
    mask[idx] = 1
    queue.push(idx)
  }

  for (let x = 0; x < width; x++) { push(x, 0); push(x, height-1) }
  for (let y = 1; y < height-1; y++) { push(0, y); push(width-1, y) }

  let head = 0
  while (head < queue.length) {
    const idx = queue[head++]
    const x = idx % width, y = (idx / width) | 0
    push(x-1, y); push(x+1, y); push(x, y-1); push(x, y+1)
  }

  return mask
}

/**
 * 渐进式降低阈值扩展白色区域
 * 从高阈值开始 flood fill，然后逐步降低阈值并扩展
 */
function progressiveFlood(width, height, rawRGBA) {
  let mask = new Uint8Array(width * height)
  const steps = [250, 245, 240, 235, 228, 220, 210]

  for (const threshold of steps) {
    const newMask = floodFillEdge(width, height, rawRGBA, threshold)
    // 合并：任何在新阈值下被 flood fill 标记的像素
    for (let i = 0; i < mask.length; i++) {
      if (newMask[i]) mask[i] = 1
    }
  }

  // 最终一轮：对已标记区域附近用更低阈值扩展
  let changed = true
  let iter = 0
  while (changed && iter < 5) {
    changed = false
    iter++
    const prev = Buffer.from(mask)
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x
        if (prev[idx]) continue
        const r = rawRGBA[idx*4], g = rawRGBA[idx*4+1], b = rawRGBA[idx*4+2]
        // 只扩展与已标记区域相邻的浅色像素
        if (r < 205 || g < 205 || b < 205) continue
        if (Math.max(r,g,b) - Math.min(r,g,b) > 30) continue

        let adj = false
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue
            const nx = x + dx, ny = y + dy
            if (nx < 0 || nx >= width || ny < 0 || ny >= height) { adj = true; break }
            if (prev[ny * width + nx]) { adj = true; break }
          }
          if (adj) break
        }
        if (adj) { mask[idx] = 1; changed = true }
      }
    }
  }

  return mask
}

async function processPNG(inputPath, outputPath) {
  const { data: rawRGBA, info } = await sharp(inputPath)
    .ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const { width, height } = info
  const total = width * height

  const mask = progressiveFlood(width, height, rawRGBA)

  let trans = 0
  for (let i = 0; i < total; i++) if (mask[i]) trans++

  for (let i = 0; i < total; i++) rawRGBA[i*4+3] = mask[i] ? 0 : 255

  await sharp(rawRGBA, { raw: { width, height, channels: 4 } })
    .png({ compressionLevel: 6 }).toFile(outputPath)

  return { width, height, total, trans, ratio: ((trans/total)*100).toFixed(1)+'%' }
}

async function main() {
  console.log('=== V3 渐进式白色背景去除 ===\n')
  const inputDir = path.resolve(INPUT_DIR)
  const outputDir = path.resolve(OUTPUT_DIR)
  if (!fs.existsSync(inputDir)) { console.error('输入目录不存在'); process.exit(1) }
  fs.mkdirSync(outputDir, { recursive: true })

  const files = ['ticket-img.png', 'sword.png', 'npc-ye.png']
  for (const f of files) {
    const inp = path.join(inputDir, f), out = path.join(outputDir, f)
    if (!fs.existsSync(inp)) { console.log(`跳过: ${f}`); continue }
    try {
      console.log(`处理: ${f} ...`)
      const s = await processPNG(inp, out)
      console.log(`  ✅ ${s.width}x${s.height} | 透明: ${s.trans}/${s.total} (${s.ratio})`)
    } catch(e) { console.error(`  ❌ ${f}: ${e.message}`) }
  }
  console.log('\n完成:', outputDir)
}
main().catch(e => { console.error(e); process.exit(1) })
