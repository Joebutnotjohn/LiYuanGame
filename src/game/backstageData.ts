/**
 * 梨园一梦 - 后台玩法数据结构
 *
 * 后台是戏班筹备房间，包含两大模块：
 *   1. 舞台台面配置 / 道具摆放（本次新增核心玩法）
 *   2. 购买桌椅 / 解锁剧本 / 邀请演员 / 扩建场地（旧模块，保留）
 *
 * 与全局 GameResources 联动。
 */

import { GameResources } from './GameContext'

// ============================================
// 一、舞台道具类型
// ============================================

export type PropCategory = 'furniture' | 'prop' | 'decoration'

export interface StageProp {
  id: string
  name: string
  category: PropCategory
  /** 材料消耗（消耗金币） */
  costMaterial: number
  /** 提升舞台清晰度 */
  clarityBonus: number
  /** 提升传统还原度 */
  traditionBonus: number
  /** 提升悲剧美感 */
  tragedyBonus: number
  /** 增加的演出风险 */
  riskBonus: number
  /** 最大可摆放数量 */
  maxCount: number
  /** 道具描述 */
  description: string
}

// ============================================
// 一.B、道具文化说明
// ============================================

export interface PropCultureInfo {
  usage: string
  stageRole: string
  culturalMeaning: string
  scoreImpact: string
  /** 京剧舞台中的常见用法 */
  beijingOperaUsage: string
  /** 在《霸王别姬·帐中诀别》中的作用 */
  playRole: string
  /** 摆放建议 */
  placementAdvice: string
  /** 摆放不当时的提醒 */
  misplacementWarning: string
}

export const propCultureMap: Record<string, PropCultureInfo> = {
  table: {
    usage: '可作为帐中案几，用于放置酒杯、文书或军帐陈设。',
    stageRole: '稳定舞台中心，形成"帐中诀别"的核心空间。',
    culturalMeaning: '京剧舞台常以一桌二椅表现复杂空间，一张桌可以象征军帐、厅堂、城楼等多种场景。',
    scoreImpact: '提升舞台清晰度和传统还原度。',
    beijingOperaUsage: '桌可以代表案几、军帐、城楼、山坡等空间。',
    playRole: '在《霸王别姬·帐中诀别》中，桌可作为帐中案几，稳定核心表演区。',
    placementAdvice: '适合放在台面中部偏后，为酒杯、烛台等小道具提供依托。',
    misplacementWarning: '桌放得太偏，台面中心不稳，演员调度容易失位。',
  },
  chair: {
    usage: '可用于表现项羽、虞姬在帐中的位置关系。',
    stageRole: '辅助演员调度，形成坐、起、转身等身段变化。',
    culturalMeaning: '椅子在传统戏曲中不是单纯家具，而是空间转换和身份关系的提示。',
    scoreImpact: '提升传统还原度。',
    beijingOperaUsage: '椅子可表现人物身份、空间位置和身段调度。',
    playRole: '辅助项羽与虞姬之间的对坐、起身、回望等调度。',
    placementAdvice: '适合围绕桌子两侧摆放，形成一桌二椅结构。',
    misplacementWarning: '椅子离开桌子太远，传统"一桌二椅"的程式感会减弱。',
  },
  wine_cup: {
    usage: '用于表现诀别前的饮酒、悲情与留恋。',
    stageRole: '强化人物情绪，帮助观众理解"别"的氛围。',
    culturalMeaning: '酒在古典戏曲中常与壮别、悲歌、英雄末路相连。',
    scoreImpact: '明显提升悲剧氛围。',
    beijingOperaUsage: '酒杯常用于表现宴饮、诀别、壮行与悲情。',
    playRole: '用于强化帐中诀别前的悲壮情绪。',
    placementAdvice: '适合放在桌面附近，不宜孤立放在边角。',
    misplacementWarning: '酒杯最好靠近桌案，观众更容易理解帐中饮别。',
  },
  sword: {
    usage: '可用于表现项羽的武将身份，也可暗示虞姬自刎的悲剧结局。',
    stageRole: '增强戏剧张力和视觉冲突。',
    culturalMeaning: '剑象征英雄气、决绝和命运转折，是《霸王别姬》悲剧意象的重要道具。',
    scoreImpact: '提升悲剧氛围，但增加演出风险。',
    beijingOperaUsage: '剑可表现武将身份、战场气息和命运转折。',
    playRole: '既提示项羽的英雄身份，也暗示虞姬自刎的悲剧结局。',
    placementAdvice: '适合放在台面侧前方或桌旁，形成视觉张力。',
    misplacementWarning: '剑不要放得太靠中间，容易影响演员走台。',
  },
  screen: {
    usage: '用于营造军帐内部空间，分隔前后景。',
    stageRole: '增强场景层次，让台面更像"帐中"。',
    culturalMeaning: '屏风在古典舞台中常用于表现内外空间、身份距离和含蓄的情绪遮蔽。',
    scoreImpact: '提升舞台清晰度和传统还原度。',
    beijingOperaUsage: '屏风可表现内外空间、遮挡关系和场景层次。',
    playRole: '帮助营造"帐中"空间。',
    placementAdvice: '适合放在台面后部，形成背景层次。',
    misplacementWarning: '屏风放在后侧更像军帐背景。',
  },
  lantern: {
    usage: '用于营造夜晚、军帐和诀别氛围。',
    stageRole: '增强暖色光感，使舞台更有情绪。',
    culturalMeaning: '灯火常象征离别前最后的温情，也可映衬乱世中的孤寂。',
    scoreImpact: '提升舞台清晰度和悲剧氛围。',
    beijingOperaUsage: '灯笼常用于营造夜晚、节庆、宅院或军帐氛围。',
    playRole: '可以加强帐中夜色与诀别氛围。',
    placementAdvice: '适合放在两侧，不宜挡住演员行动路线。',
    misplacementWarning: '灯笼放在中间会阻碍演员走位。',
  },
  banner: {
    usage: '用于表现军营、军令和战争背景。',
    stageRole: '提示项羽所处的战争环境。',
    culturalMeaning: '令旗代表军令、秩序与战场压力，与项羽兵败的背景相呼应。',
    scoreImpact: '提升传统还原度。',
    beijingOperaUsage: '令旗代表军令、战场和军营秩序。',
    playRole: '提示项羽所处的战败军营背景。',
    placementAdvice: '适合放在台面侧边，作为军帐提示物。',
    misplacementWarning: '令旗放在舞台正中会分散观众对表演的注意。',
  },
  candlestick: {
    usage: '用于强化帐中夜谈、诀别和沉重气氛。',
    stageRole: '营造静态、凝重、临别前的时间感。',
    culturalMeaning: '烛火象征短暂、燃尽和命运无常，适合表现悲剧情绪。',
    scoreImpact: '提升悲剧氛围，但略微增加演出风险。',
    beijingOperaUsage: '烛台可营造夜谈、静候、诀别等沉重氛围。',
    playRole: '强化帐中夜色和悲剧情绪。',
    placementAdvice: '适合放在桌旁或台面后侧，不宜靠近行动区域。',
    misplacementWarning: '烛台不要靠近台面正前方演员走位区域。',
  },
}

// ============================================
// 一.C、道具尺寸配置（台面上显示的百分比宽度）
// ============================================

export interface PropSizeConfig {
  /** 道具在台面上的宽度（占放置区百分比） */
  width: number
  /** z-index 基础值 */
  zIndexBase: number
}

export const propSizeConfig: Record<string, PropSizeConfig> = {
  // 按真实戏曲道具尺寸比例调整（以桌子 = 100cm 真实宽度为基准 19%）
  // 桌子：传统戏台八仙桌（基准件）
  table: { width: 19, zIndexBase: 10 },
  // 椅子：约 55cm（约为桌子的 0.55 倍）
  chair: { width: 10.5, zIndexBase: 20 },
  // 屏风：传统戏曲大屏风，约 250cm（约桌子的 2.5 倍，最大）
  screen: { width: 35, zIndexBase: 5 },
  // 灯笼：中型悬挂物，约 40cm（约为桌子的 0.4 倍）
  lantern: { width: 7.5, zIndexBase: 25 },
  // 剑：传统戏曲长剑，约 90cm（接近桌子宽度）
  sword: { width: 12, zIndexBase: 35 },
  // 酒杯：小件，约 7cm（约为桌子的 0.07 倍，最小）
  wine_cup: { width: 2, zIndexBase: 40 },
  // 旗帜/幡：传统戏曲大幡，约 130cm（约为桌子的 1.3 倍）
  banner: { width: 8, zIndexBase: 30 },
  // 烛台：小件，约 20cm（约为桌子的 0.2 倍）
  candlestick: { width: 4, zIndexBase: 45 },
}

// ============================================
// 一.D、已摆放道具实例
// ============================================

export interface PlacedPropInstance {
  /** 唯一实例 ID */
  instanceId: string
  /** 道具 ID */
  propId: string
  /** 在台面上的 X 位置（百分比，0=最左，100=最右） */
  x: number
  /** 在台面上的 Y 位置（百分比，0=最上，100=最下） */
  y: number
  /** 旋转角度（度） */
  rotation: number
}

export const stageProps: StageProp[] = [
  {
    id: 'table',
    name: '桌',
    category: 'furniture',
    costMaterial: 6,
    clarityBonus: 10,
    traditionBonus: 8,
    tragedyBonus: 0,
    riskBonus: 0,
    maxCount: 1,
    description: '一桌两椅是京剧最基本的舞台陈设，象征千军万马、殿堂楼阁',
  },
  {
    id: 'chair',
    name: '椅',
    category: 'furniture',
    costMaterial: 8,
    clarityBonus: 0,
    traditionBonus: 12,
    tragedyBonus: 0,
    riskBonus: 0,
    maxCount: 2,
    description: '与桌搭配构成戏曲舞台的空间支点，亦可单独作为坐具',
  },
  {
    id: 'wine_cup',
    name: '酒杯',
    category: 'prop',
    costMaterial: 5,
    clarityBonus: 0,
    traditionBonus: 0,
    tragedyBonus: 15,
    riskBonus: 0,
    maxCount: 1,
    description: '霸王举杯，英雄末路。一杯酒承载诀别之痛',
  },
  {
    id: 'sword',
    name: '剑',
    category: 'prop',
    costMaterial: 3,
    clarityBonus: 0,
    traditionBonus: 0,
    tragedyBonus: 18,
    riskBonus: 5,
    maxCount: 1,
    description: '虞姬舞剑，血溅帐中。利器虽美，亦有风险',
  },
  {
    id: 'screen',
    name: '屏风',
    category: 'decoration',
    costMaterial: 4,
    clarityBonus: 8,
    traditionBonus: 6,
    tragedyBonus: 0,
    riskBonus: 0,
    maxCount: 1,
    description: '素绢屏风，隔出虚实相生的舞台空间',
  },
  {
    id: 'lantern',
    name: '灯笼',
    category: 'decoration',
    costMaterial: 7,
    clarityBonus: 6,
    traditionBonus: 0,
    tragedyBonus: 10,
    riskBonus: 0,
    maxCount: 2,
    description: '红烛摇曳，光影斑驳，渲染悲凉氛围',
  },
  {
    id: 'banner',
    name: '令旗',
    category: 'prop',
    costMaterial: 2,
    clarityBonus: 0,
    traditionBonus: 10,
    tragedyBonus: 0,
    riskBonus: 0,
    maxCount: 1,
    description: '一杆令旗，调动三军。传统戏曲的符号化表达',
  },
  {
    id: 'candlestick',
    name: '烛台',
    category: 'decoration',
    costMaterial: 6,
    clarityBonus: 0,
    traditionBonus: 0,
    tragedyBonus: 12,
    riskBonus: 4,
    maxCount: 1,
    description: '烛火摇曳，照见英雄末路。需小心火烛',
  },
]

// ============================================
// 二、舞台评分计算
// ============================================

export interface StageScores {
  clarity: number       // 舞台清晰度
  tradition: number     // 传统还原度
  tragedy: number       // 悲剧美感
  risk: number          // 演出风险
  totalScore: number    // 综合评分
}

/**
 * 根据已摆放道具列表计算舞台评分
 */
export function calculateStageScores(placedPropIds: string[]): StageScores {
  const idCounts = new Map<string, number>()
  for (const id of placedPropIds) {
    idCounts.set(id, (idCounts.get(id) ?? 0) + 1)
  }

  let clarity = 0
  let tradition = 0
  let tragedy = 0
  let risk = 0

  for (const [id, count] of idCounts) {
    const prop = stageProps.find(p => p.id === id)
    if (!prop) continue
    clarity += prop.clarityBonus * count
    tradition += prop.traditionBonus * count
    tragedy += prop.tragedyBonus * count
    risk += prop.riskBonus * count
  }

  // 道具摆得越完整，整体评分加成
  const completionBonus = placedPropIds.length * 2

  // 综合评分：各维度加权，减去风险惩罚
  const totalScore = Math.max(
    0,
    clarity * 1.0 + tradition * 1.2 + tragedy * 1.5 - risk * 2.0 + completionBonus,
  )

  return { clarity, tradition, tragedy, risk, totalScore: Math.round(totalScore) }
}

// ============================================
// 三、后台任务清单
// ============================================

export interface BackstageTask {
  id: string
  name: string
  description: string
  isCompleted: boolean
  checkFn: (placedPropIds: string[]) => boolean
}

/** 关键道具 ID 列表（酒杯、剑、令旗、烛台） */
export const keyPropIds = ['wine_cup', 'sword', 'banner', 'candlestick']

export const backstageTaskDefs: BackstageTask[] = [
  {
    id: 'task_furniture',
    name: '选择桌椅',
    description: '至少摆放 1 个家具类道具',
    isCompleted: false,
    checkFn: (placedPropIds: string[]) => {
      return placedPropIds.some(id => {
        const p = stageProps.find(sp => sp.id === id)
        return p?.category === 'furniture'
      })
    },
  },
  {
    id: 'task_key_prop',
    name: '选择关键道具',
    description: '至少摆放 2 个关键道具（酒杯、剑、令旗、烛台）',
    isCompleted: false,
    checkFn: (placedPropIds: string[]) => {
      const keyCount = placedPropIds.filter(id => keyPropIds.includes(id)).length
      return keyCount >= 2
    },
  },
  {
    id: 'task_layout',
    name: '完成台面布局',
    description: '至少摆放 3 个道具',
    isCompleted: false,
    checkFn: (placedPropIds: string[]) => {
      return placedPropIds.length >= 3
    },
  },
]

/**
 * 根据已摆放道具列表，计算任务完成状态
 */
export function evaluateBackstageTasks(placedPropIds: string[]): BackstageTask[] {
  return backstageTaskDefs.map(t => ({
    ...t,
    isCompleted: t.checkFn(placedPropIds),
  }))
}

/** 检查是否所有任务都已完成 */
export function areAllTasksCompleted(placedPropIds: string[]): boolean {
  return backstageTaskDefs.every(t => t.checkFn(placedPropIds))
}

// ============================================
// 三.B、舞台常识任务
// ============================================

export interface StageKnowledgeTask {
  id: string
  name: string
  description: string
  completedHint: string
  isCompleted: boolean
  checkFn: (placedProps: PlacedPropInstance[], scores: StageScores) => boolean
  /** 完成后给师傅的额外提示 */
  masterComment?: string
}

export const stageKnowledgeTaskDefs: StageKnowledgeTask[] = [
  {
    id: 'knowledge_desk_chair',
    name: '摆出一桌二椅',
    description: '摆放 1 张桌和至少 2 把椅',
    completedHint: '已理解传统戏曲基础布景',
    isCompleted: false,
    checkFn: (placedProps: PlacedPropInstance[]) => {
      const ids = placedProps.map(p => p.propId)
      const tableCount = ids.filter(id => id === 'table').length
      const chairCount = ids.filter(id => id === 'chair').length
      return tableCount >= 1 && chairCount >= 2
    },
    masterComment: '这就是传统戏曲常说的一桌二椅。桌椅虽少，却能借演员身段变出军帐、厅堂与城楼。',
  },
  {
    id: 'knowledge_screen',
    name: '设置帐中空间',
    description: '摆放屏风营造军帐层次',
    completedHint: '已营造军帐空间层次',
    isCompleted: false,
    checkFn: (placedProps: PlacedPropInstance[]) => {
      return placedProps.some(p => p.propId === 'screen')
    },
  },
  {
    id: 'knowledge_sword_wine',
    name: '强化诀别意象',
    description: '摆放酒杯和剑',
    completedHint: '已突出《霸王别姬》的悲剧意象',
    isCompleted: false,
    checkFn: (placedProps: PlacedPropInstance[]) => {
      const ids = placedProps.map(p => p.propId)
      return ids.includes('wine_cup') && ids.includes('sword')
    },
    masterComment: '酒与剑并置，诀别之意更浓。这是《霸王别姬》帐中诀别的点睛之笔。',
  },
  {
    id: 'knowledge_risk_control',
    name: '控制演出风险',
    description: '演出风险低于 60',
    completedHint: '舞台安全可控',
    isCompleted: false,
    checkFn: (_placedProps: PlacedPropInstance[], scores: StageScores) => {
      return scores.risk < 60
    },
  },
]

/** 根据已摆放道具和评分计算舞台常识任务完成状态 */
export function evaluateStageKnowledgeTasks(
  placedProps: PlacedPropInstance[],
  scores: StageScores,
): StageKnowledgeTask[] {
  return stageKnowledgeTaskDefs.map(t => ({
    ...t,
    isCompleted: t.checkFn(placedProps, scores),
  }))
}

/** 检查是否触发了"一桌二椅"提示（1桌+2椅首次达成） */
export function isOneDeskTwoChairsTriggered(placedProps: PlacedPropInstance[]): boolean {
  const ids = placedProps.map(p => p.propId)
  const tableCount = ids.filter(id => id === 'table').length
  const chairCount = ids.filter(id => id === 'chair').length
  return tableCount >= 1 && chairCount >= 2
}

// ============================================
// 三.C、摆放合理性判断
// ============================================

export interface PlacementJudgment {
  /** 道具 ID */
  propId: string
  /** 是否摆放合理 */
  isGood: boolean
  /** 师傅点评（摆放不合理时给出） */
  comment: string
}

/**
 * 对单个已摆放道具实例做合理性判断
 */
export function judgePlacement(
  instance: PlacedPropInstance,
  allInstances: PlacedPropInstance[],
): PlacementJudgment {
  const { propId, x, y } = instance
  const info = propCultureMap[propId]
  if (!info) return { propId, isGood: true, comment: '' }

  // 找桌子的位置（用于关联判断）
  const tableInstance = allInstances.find(p => p.propId === 'table')

  switch (propId) {
    case 'table':
      // 桌放在台面中部偏后更合理（x 在 30-70，y 在 30-60）
      if (x >= 30 && x <= 70 && y >= 30 && y <= 60) {
        return { propId, isGood: true, comment: '' }
      }
      return { propId, isGood: false, comment: info.misplacementWarning }

    case 'chair': {
      // 椅子靠近桌子两侧更合理
      if (tableInstance) {
        const dx = Math.abs(x - tableInstance.x)
        const dy = Math.abs(y - tableInstance.y)
        if (dx < 35 && dy < 35) {
          return { propId, isGood: true, comment: '' }
        }
      }
      // 如果没有桌子，椅子在偏侧也可以
      if ((x < 35 || x > 65) && y >= 25 && y <= 70) {
        return { propId, isGood: true, comment: '' }
      }
      return { propId, isGood: false, comment: info.misplacementWarning }
    }

    case 'screen':
      // 屏风放在台面后部更合理（y < 40）
      if (y <= 40) {
        return { propId, isGood: true, comment: '' }
      }
      return { propId, isGood: false, comment: info.misplacementWarning }

    case 'wine_cup': {
      // 酒杯靠近桌子更合理
      if (tableInstance) {
        const dx = Math.abs(x - tableInstance.x)
        const dy = Math.abs(y - tableInstance.y)
        if (dx < 30 && dy < 25) {
          return { propId, isGood: true, comment: '' }
        }
      }
      // 没有桌子时，放在中部也还行
      if (x >= 30 && x <= 70 && y >= 35 && y <= 65) {
        return { propId, isGood: true, comment: '' }
      }
      return { propId, isGood: false, comment: info.misplacementWarning }
    }

    case 'sword':
      // 剑放在侧前方或桌旁更合理
      if ((x < 35 || x > 65) && y >= 30 && y <= 70) {
        return { propId, isGood: true, comment: '' }
      }
      if (tableInstance) {
        const dx = Math.abs(x - tableInstance.x)
        const dy = Math.abs(y - tableInstance.y)
        if (dx < 35 && dy < 35) {
          return { propId, isGood: true, comment: '' }
        }
      }
      return { propId, isGood: false, comment: info.misplacementWarning }

    case 'lantern':
      // 灯笼放在两侧更合理
      if (x < 30 || x > 70) {
        return { propId, isGood: true, comment: '' }
      }
      return { propId, isGood: false, comment: info.misplacementWarning }

    case 'banner':
      // 令旗放在侧边
      if (x < 35 || x > 65) {
        return { propId, isGood: true, comment: '' }
      }
      return { propId, isGood: false, comment: info.misplacementWarning }

    case 'candlestick':
      // 烛台不要靠近正前方（y < 30 或 y > 70）
      if (y >= 30 && y <= 70) {
        if (tableInstance) {
          const dx = Math.abs(x - tableInstance.x)
          const dy = Math.abs(y - tableInstance.y)
          if (dx < 30 && dy < 30) {
            return { propId, isGood: true, comment: '' }
          }
        }
        // 在中间偏后位置也可以
        if (x >= 30 && x <= 70 && y >= 25 && y <= 55) {
          return { propId, isGood: true, comment: '' }
        }
      }
      return { propId, isGood: false, comment: info.misplacementWarning }

    default:
      return { propId, isGood: true, comment: '' }
  }
}

/**
 * 检查整体布局是否过度集中（道具堆在一角会降低清晰度）
 */
export function isOverClustered(placedProps: PlacedPropInstance[]): boolean {
  if (placedProps.length < 3) return false
  // 计算所有道具 x、y 坐标的标准差
  const xs = placedProps.map(p => p.x)
  const ys = placedProps.map(p => p.y)
  const avgX = xs.reduce((a, b) => a + b, 0) / xs.length
  const avgY = ys.reduce((a, b) => a + b, 0) / ys.length
  const varX = xs.reduce((sum, x) => sum + (x - avgX) ** 2, 0) / xs.length
  const varY = ys.reduce((sum, y) => sum + (y - avgY) ** 2, 0) / ys.length
  // 如果 x 和 y 方差都小于 100，说明过度集中
  return varX < 100 && varY < 100
}

// ============================================
// 三.D、评分联动
// ============================================

/**
 * 增强版评分计算：融入舞台常识任务和摆放合理性
 */
export function calculateEnhancedStageScores(
  placedProps: PlacedPropInstance[],
): StageScores {
  const base = calculateStageScores(placedProps.map(p => p.propId))

  let clarity = base.clarity
  let tradition = base.tradition
  let tragedy = base.tragedy
  let risk = base.risk

  // 一桌二椅加成
  if (isOneDeskTwoChairsTriggered(placedProps)) {
    tradition += 12
  }

  // 酒杯和剑同时摆放
  const ids = placedProps.map(p => p.propId)
  if (ids.includes('wine_cup') && ids.includes('sword')) {
    tragedy += 8
  }

  // 屏风放在后部（y < 40）
  const screenInst = placedProps.find(p => p.propId === 'screen')
  if (screenInst && screenInst.y <= 40) {
    clarity += 6
    tradition += 4
  }

  // 道具过多增加风险
  if (placedProps.length >= 6) {
    risk += 10
  }
  if (placedProps.length >= 7) {
    risk += 15
  }

  // 过度集中降低清晰度
  if (isOverClustered(placedProps)) {
    clarity = Math.max(0, clarity - 8)
  }

  // 布局合理加成
  const judgments = placedProps.map(p => judgePlacement(p, placedProps))
  const goodCount = judgments.filter(j => j.isGood).length
  const badCount = judgments.length - goodCount
  // 每有1个合理摆放 +2 clarity
  clarity += goodCount * 2
  // 每有1个不合理摆放 +2 risk
  risk += badCount * 2

  const completionBonus = placedProps.length * 2
  const totalScore = Math.max(
    0,
    clarity * 1.0 + tradition * 1.2 + tragedy * 1.5 - risk * 2.0 + completionBonus,
  )

  return { clarity, tradition, tragedy, risk, totalScore: Math.round(totalScore) }
}

// ============================================
// 三.E、增强版师傅建议（含摆放合理性点评）
// ============================================

export function getEnhancedMasterAdvice(
  placedProps: PlacedPropInstance[],
): string {
  const ids = placedProps.map(p => p.propId)
  const scores = calculateEnhancedStageScores(placedProps)

  // 风险过高优先提示
  if (scores.risk >= 60) {
    return '剑与烛台虽能加重气氛，但风险已经很高了，建议减少高风险道具。'
  }

  // 一桌二椅未触发
  const hasTable = ids.includes('table')
  const chairCount = ids.filter(id => id === 'chair').length
  if (!hasTable || chairCount < 2) {
    if (!hasTable && chairCount === 0) {
      return '先摆桌椅，传统戏台讲究一桌二椅，台面才稳。'
    }
    if (!hasTable) {
      return '还差一张桌，摆上桌子台面才有重心。'
    }
    if (chairCount < 2) {
      return '再添把椅子吧，一桌二椅是传统戏曲的基础布景。'
    }
  }

  // 检查不合理摆放
  const badPlacements = placedProps
    .map(p => judgePlacement(p, placedProps))
    .filter(j => !j.isGood)

  if (badPlacements.length > 0) {
    return badPlacements[0].comment
  }

  // 检查过度集中
  if (isOverClustered(placedProps)) {
    return '道具都挤在一处了，散开些舞台会更有层次。'
  }

  // 没有酒杯或剑
  const hasWine = ids.includes('wine_cup')
  const hasSword = ids.includes('sword')
  if (!hasWine || !hasSword) {
    if (!hasWine && !hasSword) {
      return '《霸王别姬》的帐中诀别少不了酒与剑，它们能把悲剧意味立起来。'
    }
    if (!hasWine) {
      return '再加一杯酒，诀别前的悲壮情绪会更浓。'
    }
    if (!hasSword) {
      return '添一柄剑吧，既能表现项羽的武将身份，也暗示虞姬自刎的结局。'
    }
  }

  // 没有屏风
  if (!ids.includes('screen')) {
    return '若想更像军帐，可添一扇屏风，让空间层次更清楚。'
  }

  // 布局完整
  if (placedProps.length >= 4) {
    return '这个台面已经有帐中诀别的气氛了，可以提交配置。'
  }

  return '舞台还在搭建中，继续添加道具吧。屏风和灯笼能增色不少。'
}

/**
 * 增强版奖励预览（融入常识任务加成）
 */
export function getEnhancedRewardPreview(
  placedProps: PlacedPropInstance[],
  scores: StageScores,
): { gold: number; exp: number; heritage: number; reputation: number } {
  let gold = 0
  let exp = 50
  let heritage = 10
  let reputation = 5

  // 一桌二椅额外经验奖励
  if (isOneDeskTwoChairsTriggered(placedProps)) {
    exp += 20
    heritage += 5
  }

  // 酒杯和剑同时摆放
  const ids = placedProps.map(p => p.propId)
  if (ids.includes('wine_cup') && ids.includes('sword')) {
    exp += 10
    reputation += 3
  }

  // 根据综合评分微调
  if (scores.totalScore >= 60) {
    gold += 10
    reputation += 2
  }

  // 风险过高降低奖励
  if (scores.risk >= 60) {
    exp = Math.max(10, exp - 15)
    reputation = Math.max(0, reputation - 3)
  }

  return { gold, exp, heritage, reputation }
}

/**
 * 完整推荐方案文本
 */
export const fullRecommendation = '建议先摆出一桌二椅，再在桌旁放酒杯，侧前方放剑，后侧放屏风，两侧用灯笼补足氛围。这样既符合传统戏曲舞台程式，也能突出《霸王别姬》的悲剧意味。'

// ============================================
// 四、家具 / 道具类型（旧模块，保留）
// ============================================

export interface FurnitureItem {
  id: string
  name: string
  description: string
  costGold: number
  capacityBonus: number
  comfortBonus: number
  requiredLevel: number
}

export const furnitureItems: FurnitureItem[] = [
  {
    id: 'bench_basic',
    name: '木质长凳',
    description: '最朴素的看戏座位，结实耐用',
    costGold: 100,
    capacityBonus: 2,
    comfortBonus: 1,
    requiredLevel: 1,
  },
  {
    id: 'tea_table',
    name: '雕花茶桌',
    description: '配有茶具的雅致桌席，客官可边品茗边赏戏',
    costGold: 180,
    capacityBonus: 2,
    comfortBonus: 3,
    requiredLevel: 1,
  },
  {
    id: 'screen_seat',
    name: '雅座屏风',
    description: '半隔断的雅致座位，兼顾私密与视野',
    costGold: 300,
    capacityBonus: 4,
    comfortBonus: 5,
    requiredLevel: 2,
  },
  {
    id: 'vip_chair',
    name: '贵宾席软椅',
    description: '铺锦垫绣的软椅，专为贵客而设',
    costGold: 500,
    capacityBonus: 6,
    comfortBonus: 8,
    requiredLevel: 3,
  },
]

// ============================================
// 五、剧本解锁类型（旧模块，保留）
// ============================================

export interface ScriptItem {
  id: string
  name: string
  description: string
  costHeritage: number
  requiredLevel: number
  unlockedByDefault: boolean
}

export const scriptItems: ScriptItem[] = [
  {
    id: 'bawangbieji',
    name: '霸王别姬',
    description: '楚汉相争，英雄末路，虞姬一曲断人肠',
    costHeritage: 0,
    requiredLevel: 1,
    unlockedByDefault: true,
  },
  {
    id: 'guifeizuijiu',
    name: '贵妃醉酒',
    description: '百花亭中，杨妃醉态，衔杯卧鱼尽风流',
    costHeritage: 30,
    requiredLevel: 2,
    unlockedByDefault: false,
  },
  {
    id: 'kongchengji',
    name: '空城计',
    description: '城门大开，抚琴退敌，诸葛孔明智谋深',
    costHeritage: 50,
    requiredLevel: 3,
    unlockedByDefault: false,
  },
]

// ============================================
// 六、演员邀请类型（旧模块，保留）
// ============================================

export interface ActorRecruitItem {
  id: string
  name: string
  description: string
  roleType: string
  costHeritage: number
  requiredHeritage: number
  requiredLevel: number
  performanceBonus: number
}

export const actorRecruitItems: ActorRecruitItem[] = [
  {
    id: 'actor_qingyi_new',
    name: '青衣新秀',
    description: '初出茅庐的青衣，嗓音清亮，假以时日必成大器',
    roleType: '青衣',
    costHeritage: 20,
    requiredHeritage: 20,
    requiredLevel: 1,
    performanceBonus: 2,
  },
  {
    id: 'actor_wusheng',
    name: '武生好手',
    description: '功底扎实的武生，翻打跌扑样样精通',
    roleType: '武生',
    costHeritage: 35,
    requiredHeritage: 35,
    requiredLevel: 2,
    performanceBonus: 4,
  },
  {
    id: 'actor_master',
    name: '名伶客座',
    description: '名震一方的角儿，能请到便是戏班的福气',
    roleType: '名角',
    costHeritage: 70,
    requiredHeritage: 70,
    requiredLevel: 3,
    performanceBonus: 8,
  },
]

// ============================================
// 七、场地扩建类型（旧模块，保留）
// ============================================

export interface VenueUpgradeItem {
  venueLevel: number
  name: string
  description: string
  requiredReputation: number
  costGold: number
  audienceCapacity: number
}

export const venueUpgradeItems: VenueUpgradeItem[] = [
  {
    venueLevel: 1,
    name: '小戏台',
    description: '一方小小的戏台，三五观众便是满堂彩',
    requiredReputation: 0,
    costGold: 0,
    audienceCapacity: 3,
  },
  {
    venueLevel: 2,
    name: '扩建看台',
    description: '加盖看台，多了几排座位，戏班的声名渐起',
    requiredReputation: 40,
    costGold: 300,
    audienceCapacity: 5,
  },
  {
    venueLevel: 3,
    name: '梨园大堂',
    description: '气派的大堂戏院，能容纳八方来客，真正的一方梨园',
    requiredReputation: 80,
    costGold: 700,
    audienceCapacity: 8,
  },
]

// ============================================
// 八、后台整体状态
// ============================================

export interface BackstageProgress {
  // ---- 旧模块 ----
  ownedFurnitureIds: string[]
  ownedScriptIds: string[]
  hiredActorIds: string[]
  venueLevel: number
  capacityBonus: number
  preparationScore: number

  // ---- 新增：舞台道具摆放 ----
  /** 已摆放的道具实例（带位置和角度） */
  placedProps: PlacedPropInstance[]
  /** 已摆放到舞台上的道具 ID 列表（向后兼容，从 placedProps 派生） */
  placedPropIds: string[]
  /** 舞台评分（实时计算） */
  stageScores: StageScores
  /** 后台任务完成状态 */
  backstageTasks: BackstageTask[]
  /** 舞台常识任务完成状态 */
  stageKnowledgeTasks: StageKnowledgeTask[]
  /** 是否已触发一桌二椅提示 */
  oneDeskTwoChairsShown: boolean
  /** 是否已提交后台配置 */
  isSubmitted: boolean
  /** 是否已完成后台任务 */
  isCompleted: boolean
}

export function createDefaultBackstageProgress(): BackstageProgress {
  const defaultScriptIds = scriptItems
    .filter(s => s.unlockedByDefault)
    .map(s => s.id)

  return {
    ownedFurnitureIds: [],
    ownedScriptIds: defaultScriptIds,
    hiredActorIds: [],
    venueLevel: 1,
    capacityBonus: 0,
    preparationScore: 0,
    placedProps: [],
    placedPropIds: [],
    stageScores: { clarity: 0, tradition: 0, tragedy: 0, risk: 0, totalScore: 0 },
    backstageTasks: backstageTaskDefs.map(t => ({ ...t, isCompleted: false })),
    stageKnowledgeTasks: stageKnowledgeTaskDefs.map(t => ({ ...t, isCompleted: false })),
    oneDeskTwoChairsShown: false,
    isSubmitted: false,
    isCompleted: false,
  }
}

/** 从 PlacedPropInstance[] 提取 propId 列表 */
export function placedPropsToIds(placedProps: PlacedPropInstance[]): string[] {
  return placedProps.map(p => p.propId)
}

/** 生成唯一实例 ID */
let _instanceIdCounter = 0
export function generateInstanceId(): string {
  _instanceIdCounter++
  return `prop_${Date.now()}_${_instanceIdCounter}`
}

// ============================================
// 九、工具函数
// ============================================

/** 检查是否可以购买指定家具 */
export function canBuyFurniture(
  item: FurnitureItem,
  resources: GameResources,
): boolean {
  return (
    resources.level >= item.requiredLevel &&
    resources.coins >= item.costGold
  )
}

/** 检查是否可以解锁指定剧本 */
export function canUnlockScript(
  item: ScriptItem,
  resources: GameResources,
): boolean {
  if (item.unlockedByDefault) return true
  return (
    resources.level >= item.requiredLevel &&
    resources.heritage >= item.costHeritage
  )
}

/** 检查是否可以邀请指定演员 */
export function canRecruitActor(
  item: ActorRecruitItem,
  resources: GameResources,
): boolean {
  return (
    resources.level >= item.requiredLevel &&
    resources.heritage >= item.requiredHeritage &&
    resources.heritage >= item.costHeritage
  )
}

/** 检查是否可以扩建场地到指定等级 */
export function canUpgradeVenue(
  item: VenueUpgradeItem,
  resources: GameResources,
): boolean {
  return (
    resources.reputation >= item.requiredReputation &&
    resources.coins >= item.costGold
  )
}

/** 计算后台筹备评分（旧模块） */
export function calculatePreparationScore(
  progress: BackstageProgress,
): number {
  const comfortScore = progress.ownedFurnitureIds.reduce((sum, fid) => {
    const item = furnitureItems.find(f => f.id === fid)
    return sum + (item?.comfortBonus ?? 0)
  }, 0)

  const scriptCount = progress.ownedScriptIds.length
  const scriptScore = scriptCount * 5

  const actorScore = progress.hiredActorIds.reduce((sum, aid) => {
    const actor = actorRecruitItems.find(a => a.id === aid)
    return sum + (actor?.performanceBonus ?? 0)
  }, 0) * 3

  const venueScore = progress.venueLevel * 10

  return comfortScore + scriptScore + actorScore + venueScore
}

/** 根据口碑和场地等级计算观众容量 */
export function getAudienceCapacityByReputation(
  reputation: number,
  venueLevel: number,
  furnitureBonus: number = 0,
): number {
  let effectiveLevel = 1
  for (const v of venueUpgradeItems) {
    if (reputation >= v.requiredReputation && v.venueLevel <= venueLevel) {
      effectiveLevel = v.venueLevel
    }
  }

  const venue = venueUpgradeItems.find(v => v.venueLevel === effectiveLevel)
  const baseCapacity = venue?.audienceCapacity ?? 3

  return baseCapacity + furnitureBonus
}

/**
 * 检查是否可以添加道具到舞台
 */
export function canAddProp(
  propId: string,
  placedPropIds: string[],
  resources: { gold: number },
): { allowed: boolean; reason?: string } {
  const prop = stageProps.find(p => p.id === propId)
  if (!prop) return { allowed: false, reason: '未知道具' }

  // 检查最大数量限制
  const currentCount = placedPropIds.filter(id => id === propId).length
  if (currentCount >= prop.maxCount) {
    return { allowed: false, reason: `最多摆放 ${prop.maxCount} 个「${prop.name}」` }
  }

  // 检查材料（金币）消耗
  if (resources.gold < prop.costMaterial) {
    return { allowed: false, reason: '宝钱不足' }
  }

  return { allowed: true }
}

// ============================================
// 十、后台师傅推荐 & 交流系统
// ============================================

/** 师傅推荐提示（基于《霸王别姬·帐中诀别》） */
export const masterRecommendation = `《霸王别姬·帐中诀别》情绪悲壮，建议摆放屏风、桌椅、酒杯、剑与灯笼。屏风和桌椅能稳定场面，酒杯与剑能强化诀别氛围，但剑和烛台不要过多，以免演出风险过高。`

/**
 * 师傅根据当前摆放状态给建议
 */
export function getMasterAdvice(placedPropIds: string[]): string {
  const hasTable = placedPropIds.includes('table')
  const hasChair = placedPropIds.includes('chair')
  const hasDesk = hasTable || hasChair
  const hasWineOrSword = placedPropIds.includes('wine_cup') || placedPropIds.includes('sword')
  const hasScreen = placedPropIds.includes('screen')
  const keyCount = placedPropIds.filter(id => keyPropIds.includes(id)).length
  const scores = calculateStageScores(placedPropIds)

  // 风险过高
  if (scores.risk >= 9) {
    return '剑与烛台虽能加重气氛，但摆得太多，走台时会增加风险。'
  }

  // 没有桌椅
  if (!hasDesk) {
    return '先摆桌椅，传统戏台讲究一桌二椅，台面才稳。'
  }

  // 没有酒杯或剑
  if (!hasWineOrSword) {
    return '《霸王别姬》的帐中诀别少不了酒与剑，它们能把悲剧意味立起来。'
  }

  // 没有屏风
  if (!hasScreen) {
    return '若想更像军帐，可添一扇屏风，让空间层次更清楚。'
  }

  // 布局完整
  if (placedPropIds.length >= 4 && keyCount >= 2) {
    return '这个台面已经有帐中诀别的气氛了，可以提交配置。'
  }

  // 默认建议
  return '舞台还在搭建中，继续添加道具吧。屏风和灯笼能增色不少。'
}

/** 计算任务进度（用于 UI 显示如 "1/2"） */
export function getTaskProgress(
  taskId: string,
  placedPropIds: string[],
): { current: number; target: number } {
  switch (taskId) {
    case 'task_furniture': {
      const count = placedPropIds.filter(id => {
        const p = stageProps.find(sp => sp.id === id)
        return p?.category === 'furniture'
      }).length
      return { current: Math.min(count, 1), target: 1 }
    }
    case 'task_key_prop': {
      const count = placedPropIds.filter(id => keyPropIds.includes(id)).length
      return { current: Math.min(count, 2), target: 2 }
    }
    case 'task_layout': {
      return { current: Math.min(placedPropIds.length, 3), target: 3 }
    }
    default:
      return { current: 0, target: 1 }
  }
}

/** 奖励预览（固定值，不随评分浮动） */
export function getRewardPreview(_scores: StageScores): {
  gold: number
  exp: number
  heritage: number
  reputation: number
} {
  return {
    gold: 0,
    exp: 50,
    heritage: 10,
    reputation: 5,
  }
}
