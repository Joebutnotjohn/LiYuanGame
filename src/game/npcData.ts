/**
 * 梨园一梦 - 主页面 NPC 数据配置
 * 定义 NPC 类型、位置、移动路线等静态数据。
 * 本次仅定义数据，不接入页面渲染，不写动画逻辑。
 *
 * 坐标使用百分比 x/y，基于 16:9 画布。
 * 房间参考坐标：
 *   售票口 (18, 62)  后台 (32, 34)  化妆间 (78, 34)
 *   练功房 (78, 64)  戏台 (53, 24)
 */

import { gameAssets } from './assets'

// ---- NPC 类型 ----

export type NPCType = 'staff' | 'visitor' | 'actor' | 'worker'

// ---- 路径点 ----

export interface Waypoint {
  x: number  // 百分比 0-100
  y: number  // 百分比 0-100
}

// ---- NPC 数据结构 ----

export interface NPCData {
  id: string
  name: string
  type: NPCType
  /** 精灵图路径，从 gameAssets.npcs 读取 */
  sprite: string
  /** 缩放比例 */
  scale: number
  /** 初始出生位置 */
  initialPosition: Waypoint
  /** 移动路线（循环） */
  route: Waypoint[]
  /** 移动速度（百分比/秒，即每秒移动画布宽度的百分比） */
  speed: number
  /** 头顶气泡文字 */
  bubbleText: string
}

// ============================================================
//  NPC 实例
// ============================================================

export const mainPageNPCs: NPCData[] = [
  // ---- 售票员 (height ~110px, scale 0.85) ----
  {
    id: 'ticketSeller',
    name: '售票员',
    type: 'staff',
    sprite: gameAssets.npcs.ticketSeller,
    scale: 0.85,
    initialPosition: { x: 18, y: 62 },
    route: [
      { x: 18, y: 62 },
      { x: 19, y: 60 },
      { x: 17, y: 63 },
    ],
    speed: 0.55,
    bubbleText: '今日《霸王别姬》正在预售中。',
  },

  // ---- 路人 1 (height ~110px, scale 0.78) ----
  {
    id: 'visitor1',
    name: '看戏路人',
    type: 'visitor',
    sprite: gameAssets.npcs.visitor1,
    scale: 0.78,
    initialPosition: { x: 14, y: 60 },
    route: [
      { x: 14, y: 60 },
      { x: 22, y: 56 },
      { x: 10, y: 64 },
    ],
    speed: 1.0,
    bubbleText: '听说今晚要演《霸王别姬》。',
  },

  // ---- 路人 2 (height ~115px, scale 0.82) ----
  {
    id: 'visitor2',
    name: '参访客人',
    type: 'visitor',
    sprite: gameAssets.npcs.visitor2,
    scale: 0.82,
    initialPosition: { x: 22, y: 58 },
    route: [
      { x: 22, y: 58 },
      { x: 28, y: 54 },
      { x: 16, y: 62 },
    ],
    speed: 0.9,
    bubbleText: '我想买一张靠前的位置。',
  },

  // ---- 项羽演员 (height ~140px, scale 1.0) ----
  {
    id: 'xiangyuActor',
    name: '项羽演员',
    type: 'actor',
    sprite: gameAssets.npcs.xiangyuActor,
    scale: 1.0,
    initialPosition: { x: 78, y: 58 },
    route: [
      { x: 78, y: 58 },
      { x: 62, y: 48 },
      { x: 55, y: 32 },
      { x: 62, y: 48 },
    ],
    speed: 1.3,
    bubbleText: '走台前，我想再排一遍身段。',
  },

  // ---- 虞姬演员 (height ~135px, scale 0.95) ----
  {
    id: 'yujiActor',
    name: '虞姬演员',
    type: 'actor',
    sprite: gameAssets.npcs.yujiActor,
    scale: 0.95,
    initialPosition: { x: 76, y: 36 },
    route: [
      { x: 76, y: 36 },
      { x: 72, y: 40 },
      { x: 68, y: 48 },
      { x: 72, y: 40 },
    ],
    speed: 1.15,
    bubbleText: '我的妆造还需要最后确认。',
  },
]
