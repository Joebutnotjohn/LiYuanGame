/**
 * 梨园一梦 - 售票口玩法数据结构
 *
 * 流程：选剧目 → 为当前顾客设计票根 → 制作并出票 → 下一位顾客 → 全部完成
 * 本次只定义数据，不接入 UI，不修改主页面其他逻辑。
 */

// ==============================
// 一、可选剧目数据
// ==============================

export interface PlayData {
  id: string
  name: string
  unlocked: boolean
  scene: string
  style: string
  audienceHint: string
  basePrice: number
}

export const playList: PlayData[] = [
  {
    id: 'bawangbieji',
    name: '霸王别姬',
    unlocked: true,
    scene: '帐中诀别',
    style: '悲壮 / 诀别 / 宿命',
    audienceHint: '老戏迷与年轻观众都感兴趣',
    basePrice: 60,
  },
  {
    id: 'guifeizuijiu',
    name: '贵妃醉酒',
    unlocked: false,
    scene: '醉酒抒怀',
    style: '华丽 / 婉转 / 醉态',
    audienceHint: '喜爱文戏的观众最感兴趣',
    basePrice: 80,
  },
  {
    id: 'kongchengji',
    name: '空城计',
    unlocked: false,
    scene: '城楼抚琴',
    style: '智谋 / 镇定 / 张力',
    audienceHint: '老少皆宜的经典剧目',
    basePrice: 70,
  },
]

// ==============================
// 二、票根制作选项
// ==============================

export interface TicketVisual {
  id: string
  label: string
}

export interface TicketColorTheme {
  id: string
  label: string
}

export interface TicketCopyStyle {
  id: string
  label: string
}

export interface TicketPriceTier {
  id: string
  label: string
  price: number
}

export const ticketVisuals: TicketVisual[] = [
  { id: 'xiangyuyuji', label: '项羽虞姬' },
  { id: 'redcurtain', label: '戏台红幕' },
  { id: 'swordcup', label: '剑与酒杯' },
]

export const ticketColorThemes: TicketColorTheme[] = [
  { id: 'redgold', label: '红金' },
  { id: 'ink', label: '水墨' },
  { id: 'darkred', label: '暗红' },
  { id: 'ricewhite', label: '米白' },
]

export const ticketCopyStyles: TicketCopyStyle[] = [
  { id: 'traditional', label: '传统版' },
  { id: 'youth', label: '青年版' },
  { id: 'tragedy', label: '悲剧版' },
]

export const ticketPriceTiers: TicketPriceTier[] = [
  { id: 'normal', label: '普通票', price: 30 },
  { id: 'good', label: '良座票', price: 60 },
  { id: 'vip', label: '雅座票', price: 100 },
]

// ==============================
// 三、观众队列数据
// ==============================

export interface CustomerState {
  id: string
  name: string
  want: string
  budget: number
  prefer: string // 对应 TicketPriceTier.label
  preferredVisual: string
  preferredColorTheme: string
  preferredCopyStyle: string
  preferredPriceTier: string
  hasTicket: boolean
  ticketMatched: boolean
  paidAmount: number
  npcImage: string // NPC 立绘路径
}

export function createInitialCustomers(): CustomerState[] {
  return [
    {
      id: 'customer_1',
      name: '小婉',
      want: '想看《霸王别姬》',
      budget: 60,
      prefer: '良座票',
      preferredVisual: 'xiangyuyuji',
      preferredColorTheme: 'redgold',
      preferredCopyStyle: 'traditional',
      preferredPriceTier: 'good',
      hasTicket: false,
      ticketMatched: false,
      paidAmount: 0,
      npcImage: '/assets/processed/ticket-room/npc-xiaowan.png',
    },
    {
      id: 'customer_2',
      name: '阿福',
      want: '第一次看京剧',
      budget: 30,
      prefer: '普通票',
      preferredVisual: 'redcurtain',
      preferredColorTheme: 'ricewhite',
      preferredCopyStyle: 'youth',
      preferredPriceTier: 'normal',
      hasTicket: false,
      ticketMatched: false,
      paidAmount: 0,
      npcImage: '/assets/processed/ticket-room/npc-boy.png',
    },
    {
      id: 'customer_3',
      name: '宋先生',
      want: '想带朋友看好位置',
      budget: 100,
      prefer: '雅座票',
      preferredVisual: 'swordcup',
      preferredColorTheme: 'darkred',
      preferredCopyStyle: 'tragedy',
      preferredPriceTier: 'vip',
      hasTicket: false,
      ticketMatched: false,
      paidAmount: 0,
      npcImage: '/assets/processed/ticket-room/npc-ye.png',
    },
    {
      id: 'customer_4',
      name: '春梅',
      want: '想看有文采的戏',
      budget: 60,
      prefer: '良座票',
      preferredVisual: 'xiangyuyuji',
      preferredColorTheme: 'ink',
      preferredCopyStyle: 'traditional',
      preferredPriceTier: 'good',
      hasTicket: false,
      ticketMatched: false,
      paidAmount: 0,
      npcImage: '/assets/processed/ticket-room/npc-girl.png',
    },
    {
      id: 'customer_5',
      name: '刘婶',
      want: '陪小辈来看热闹',
      budget: 30,
      prefer: '普通票',
      preferredVisual: 'redcurtain',
      preferredColorTheme: 'ricewhite',
      preferredCopyStyle: 'youth',
      preferredPriceTier: 'normal',
      hasTicket: false,
      ticketMatched: false,
      paidAmount: 0,
      npcImage: '/assets/processed/ticket-room/npc-aunt.png',
    },
    {
      id: 'customer_6',
      name: '阿牛',
      want: '想看好戏解闷',
      budget: 100,
      prefer: '雅座票',
      preferredVisual: 'swordcup',
      preferredColorTheme: 'darkred',
      preferredCopyStyle: 'tragedy',
      preferredPriceTier: 'vip',
      hasTicket: false,
      ticketMatched: false,
      paidAmount: 0,
      npcImage: '/assets/processed/ticket-room/npc-boy2.png',
    },
    {
      id: 'customer_7',
      name: '灵儿',
      want: '想来见识京剧',
      budget: 30,
      prefer: '普通票',
      preferredVisual: 'xiangyuyuji',
      preferredColorTheme: 'redgold',
      preferredCopyStyle: 'youth',
      preferredPriceTier: 'normal',
      hasTicket: false,
      ticketMatched: false,
      paidAmount: 0,
      npcImage: '/assets/processed/ticket-room/npc-girl2.png',
    },
  ]
}

// ==============================
// 四、售票流程状态
// ==============================

export type TaskStep =
  | 'choosePlay'
  | 'designTicket'
  | 'completed'

/** 票根设计草稿 */
export interface TicketDraft {
  selectedVisual: string | null
  selectedColorTheme: string | null
  selectedCopyStyle: string | null
  selectedPriceTier: string | null
}

/** 售票口持久化进度（由 GameScene 管理） */
export interface TicketOfficeProgress {
  taskStep: TaskStep
  selectedPlayId: string | null
  currentTicketDraft: TicketDraft
  customers: CustomerState[]
  currentCustomerIndex: number
  soldCount: number
  goldEarned: number
  reputationEarned: number
  expEarned: number
  isCompleted: boolean
}

export function createInitialTicketProgress(): TicketOfficeProgress {
  return {
    taskStep: 'choosePlay',
    selectedPlayId: null,
    currentTicketDraft: {
      selectedVisual: null,
      selectedColorTheme: null,
      selectedCopyStyle: null,
      selectedPriceTier: null,
    },
    customers: createInitialCustomers(),
    currentCustomerIndex: 0,
    soldCount: 0,
    goldEarned: 0,
    reputationEarned: 0,
    expEarned: 0,
    isCompleted: false,
  }
}

/** @deprecated 保留旧类型用于兼容，请使用 TicketOfficeProgress */
export interface TicketOfficeState {
  selectedPlayId: string | null
  selectedVisual: string | null
  selectedColorTheme: string | null
  selectedCopyStyle: string | null
  selectedPriceTier: string | null
  soldCount: number
  stampedCount: number
  currentCustomerIndex: number
  taskStep: TaskStep
}

/** @deprecated 保留旧函数用于兼容，请使用 createInitialTicketProgress */
export function createInitialTicketOfficeState(): TicketOfficeState {
  return {
    selectedPlayId: null,
    selectedVisual: null,
    selectedColorTheme: null,
    selectedCopyStyle: null,
    selectedPriceTier: null,
    soldCount: 0,
    stampedCount: 0,
    currentCustomerIndex: 0,
    taskStep: 'choosePlay',
  }
}

// ==============================
// 五、结算数据
// ==============================

export interface TicketOfficeResult {
  goldDelta: number
  reputationDelta: number
  heritageDelta: number
  expDelta: number
  soldCount: number
  stampedCount: number
  ticketDesignScore: number
}

/**
 * 计算售票口结算结果（基于 TicketOfficeProgress）
 */
export function calcTicketOfficeResult(
  soldCount: number,
  priceTierId: string,
  expEarned: number,
): TicketOfficeResult {
  const tier = ticketPriceTiers.find((t) => t.id === priceTierId)
  const unitPrice = tier ? tier.price : 0

  return {
    goldDelta: soldCount * unitPrice,
    reputationDelta: soldCount > 0 ? 5 : 0,
    heritageDelta: 2,
    expDelta: expEarned + 30,
    soldCount,
    stampedCount: soldCount,
    ticketDesignScore: soldCount >= 3 ? 5 : soldCount >= 2 ? 3 : 1,
  }
}
