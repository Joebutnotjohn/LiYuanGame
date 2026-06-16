/**
 * 梨园一梦 - 游戏基础数据
 * 管理主页面资源、房间、任务、演员等核心数据
 */

// ---- 基础数据（保持不变） ----

export const resources = {
  gold: 1200,   // 宝钱
  reputation: 35,
  heritage: 20,
  exp: 0,
  level: 1,
}

export const rooms = [
  {
    id: 'ticket',
    name: '售票口',
    taskName: '确定今日剧目与制作票根',
    x: 18,
    y: 62,
  },
  {
    id: 'backstage',
    name: '后台',
    taskName: '准备桌椅与道具',
    x: 32,
    y: 34,
  },
  {
    id: 'makeup',
    name: '化妆间',
    taskName: '为角色定妆造',
    x: 78,
    y: 34,
  },
  {
    id: 'practice',
    name: '练功房',
    taskName: '与演员交流剧本内容',
    x: 78,
    y: 64,
  },
  {
    id: 'stage',
    name: '戏台',
    taskName: '走台、预演与开锣',
    x: 53,
    y: 24,
  },
]

export const playInfo = {
  title: '霸王别姬',
  scene: '帐中诀别',
  characters: ['项羽', '虞姬'],
  emotions: ['悲壮', '诀别', '宿命'],
}

// ---- 旧版演员数据（保持向后兼容） ----

export const actors = [
  {
    id: 'cheng_xiaowan',
    name: '程小婉',
    roleType: '花旦',
    todayRole: '虞姬',
    status: '良好',
    avatarKey: 'yuji' as const,
  },
  {
    id: 'pei_yunfei',
    name: '裴云飞',
    roleType: '小生',
    todayRole: '项羽',
    status: '良好',
    avatarKey: 'xiangyu' as const,
  },
  {
    id: 'ye_qingshan',
    name: '叶青山',
    roleType: '老生',
    todayRole: '范增',
    status: '良好',
    avatarKey: 'laosheng' as const,
  },
]

export const taskStatusMap: Record<string, string> = {
  ticket: '未开始',
  backstage: '未开始',
  makeup: '未开始',
  practice: '未开始',
  stage: '未开始',
}

// ============================================================
// 新增：可扩展的任务状态 & 演员状态数据结构
// ============================================================

// ---- 任务状态类型 ----

export type TaskStatus = 'locked' | 'todo' | 'active' | 'done'

export interface GameTask {
  id: 'ticket' | 'backstage' | 'makeup' | 'practice' | 'stage'
  name: string
  roomName: string
  description: string
  status: TaskStatus
  order: number
}

export const taskStatusLabelMap: Record<TaskStatus, string> = {
  locked: '未解锁',
  todo: '未开始',
  active: '进行中',
  done: '已完成',
}

/** 初始任务列表 */
export const initialTasks: GameTask[] = [
  {
    id: 'ticket',
    name: '售票口',
    roomName: '售票口',
    description: '确定今日剧目与制作票根',
    status: 'active',
    order: 1,
  },
  {
    id: 'backstage',
    name: '后台',
    roomName: '后台',
    description: '准备桌椅与道具',
    status: 'todo',
    order: 2,
  },
  {
    id: 'makeup',
    name: '化妆间',
    roomName: '化妆间',
    description: '为角色定妆造',
    status: 'todo',
    order: 3,
  },
  {
    id: 'practice',
    name: '练功房',
    roomName: '练功房',
    description: '与演员交流剧本内容',
    status: 'todo',
    order: 4,
  },
  {
    id: 'stage',
    name: '戏台',
    roomName: '戏台',
    description: '走台、预演与开锣',
    status: 'todo',
    order: 5,
  },
]

// ---- 演员状态类型 ----

export type ActorStatus = 'idle' | 'preparing' | 'rehearsing' | 'ready' | 'tired'

export interface ActorState {
  id: string
  name: string
  roleType: string
  todayRole: string
  status: ActorStatus
  statusText: string
  avatarKey: 'yuji' | 'xiangyu' | 'laosheng'
  affinity: number
}

export const actorStatusLabelMap: Record<ActorStatus, string> = {
  idle: '候场中',
  preparing: '准备中',
  rehearsing: '排练中',
  ready: '已就绪',
  tired: '疲惫',
}

/** 初始演员列表 */
export const initialActors: ActorState[] = [
  {
    id: 'cheng_xiaowan',
    name: '程小婉',
    roleType: '花旦',
    todayRole: '虞姬',
    status: 'preparing',
    statusText: '定妆中',
    avatarKey: 'yuji',
    affinity: 20,
  },
  {
    id: 'pei_yunfei',
    name: '裴云飞',
    roleType: '小生',
    todayRole: '项羽',
    status: 'rehearsing',
    statusText: '练功中',
    avatarKey: 'xiangyu',
    affinity: 15,
  },
  {
    id: 'ye_qingshan',
    name: '叶青山',
    roleType: '老生',
    todayRole: '范增',
    status: 'idle',
    statusText: '候场中',
    avatarKey: 'laosheng',
    affinity: 10,
  },
]

// ============================================================
// 戏园等级规则
// ============================================================

export interface LevelRule {
  level: number
  requiredExp: number
  unlockScripts: string[]
  unlockTicketStyles: string[]
}

export const levelRules: LevelRule[] = [
  { level: 1, requiredExp: 0,    unlockScripts: ['霸王别姬'], unlockTicketStyles: ['基础票根'] },
  { level: 2, requiredExp: 100,  unlockScripts: ['贵妃醉酒'], unlockTicketStyles: ['雅致票根'] },
  { level: 3, requiredExp: 250,  unlockScripts: ['空城计'],   unlockTicketStyles: ['典藏票根'] },
]

// ============================================================
// 等级工具函数
// ============================================================

/** 根据经验值获取当前等级 */
export function getLevelByExp(exp: number): number {
  let level = 1
  for (const rule of levelRules) {
    if (exp >= rule.requiredExp) {
      level = rule.level
    }
  }
  return level
}

/** 根据经验值获取当前等级规则 */
export function getCurrentLevelRule(exp: number): LevelRule {
  let rule = levelRules[0]
  for (const r of levelRules) {
    if (exp >= r.requiredExp) {
      rule = r
    }
  }
  return rule
}

/** 根据经验值获取下一级规则（若已是最高级返回 null） */
export function getNextLevelRule(exp: number): LevelRule | null {
  const current = getCurrentLevelRule(exp)
  const idx = levelRules.findIndex(r => r.level === current.level)
  if (idx < levelRules.length - 1) {
    return levelRules[idx + 1]
  }
  return null
}

// ============================================================
// 资源说明映射
// ============================================================

export const resourceDescriptions: Record<string, string> = {
  gold: '用于购买桌椅、道具、戏服、妆造材料',
  reputation: '影响顾客数量',
  heritage: '影响可邀请演员品质',
  exp: '影响戏园等级、剧本解锁、票根样式解锁',
}

// ============================================================
// 各房间任务完成收益（非售票口）
// ============================================================

export interface RoomReward {
  gold: number
  reputation: number
  heritage: number
  exp: number
}

export const roomRewards: Record<string, RoomReward> = {
  backstage: { gold: 80, reputation: 10, heritage: 3, exp: 25 },
  makeup:    { gold: 60, reputation: 15, heritage: 5, exp: 30 },
  practice:  { gold: 40, reputation: 10, heritage: 8, exp: 35 },
  stage:     { gold: 100, reputation: 20, heritage: 10, exp: 50 },
}
