/**
 * 梨园一梦 - 后台玩法数据结构
 *
 * 后台是戏班筹备房间，用于：
 *   - 购买桌椅道具（消耗宝钱）
 *   - 解锁剧本（消耗传承值）
 *   - 邀请演员（消耗传承值，受传承值上限限制）
 *   - 扩建场地（消耗口碑 + 宝钱）
 *
 * 与全局 GameResources 联动。
 * 本次只定义数据和工具函数，不接入页面、不修改 UI。
 */

import { GameResources } from './GameContext'

// ============================================
// 一、家具 / 道具类型
// ============================================

export interface FurnitureItem {
  id: string
  name: string
  description: string
  costGold: number
  capacityBonus: number      // 观众容量加成
  comfortBonus: number       // 舒适度加成（影响筹备评分）
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
// 二、剧本解锁类型
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
// 三、演员邀请类型
// ============================================

export interface ActorRecruitItem {
  id: string
  name: string
  description: string
  roleType: string
  costHeritage: number         // 邀请消耗传承值
  requiredHeritage: number     // 需要持有的传承值门槛
  requiredLevel: number
  performanceBonus: number     // 演出加成
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
// 四、场地扩建类型
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
// 五、后台整体状态
// ============================================

export interface BackstageProgress {
  ownedFurnitureIds: string[]
  ownedScriptIds: string[]
  hiredActorIds: string[]
  venueLevel: number
  capacityBonus: number
  preparationScore: number
  isCompleted: boolean
}

export function createDefaultBackstageProgress(): BackstageProgress {
  // 默认解锁的剧本
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
    isCompleted: false,
  }
}

// ============================================
// 六、工具函数
// ============================================

/**
 * 检查是否可以购买指定家具
 */
export function canBuyFurniture(
  item: FurnitureItem,
  resources: GameResources,
): boolean {
  return (
    resources.level >= item.requiredLevel &&
    resources.coins >= item.costGold
  )
}

/**
 * 检查是否可以解锁指定剧本
 */
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

/**
 * 检查是否可以邀请指定演员
 */
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

/**
 * 检查是否可以扩建场地到指定等级
 */
export function canUpgradeVenue(
  item: VenueUpgradeItem,
  resources: GameResources,
): boolean {
  return (
    resources.reputation >= item.requiredReputation &&
    resources.coins >= item.costGold
  )
}

/**
 * 计算后台筹备评分
 *
 * 评分由以下因素加权得出：
 *   - 家具舒适度总和 × 1.0
 *   - 已解锁剧本数量 × 5
 *   - 已邀请演员的演出加成总和 × 3
 *   - 场地等级 × 10
 */
export function calculatePreparationScore(
  progress: BackstageProgress,
): number {
  // 家具舒适度
  const comfortScore = progress.ownedFurnitureIds.reduce((sum, fid) => {
    const item = furnitureItems.find(f => f.id === fid)
    return sum + (item?.comfortBonus ?? 0)
  }, 0)

  // 剧本数量
  const scriptCount = progress.ownedScriptIds.length
  const scriptScore = scriptCount * 5

  // 演员演出加成
  const actorScore = progress.hiredActorIds.reduce((sum, aid) => {
    const actor = actorRecruitItems.find(a => a.id === aid)
    return sum + (actor?.performanceBonus ?? 0)
  }, 0) * 3

  // 场地等级
  const venueScore = progress.venueLevel * 10

  return comfortScore + scriptScore + actorScore + venueScore
}

/**
 * 根据口碑和场地等级计算观众容量
 *
 * 基础容量 = 当前场地等级的 audienceCapacity
 * 额外容量 = 已购买家具的 capacityBonus 总和
 */
export function getAudienceCapacityByReputation(
  reputation: number,
  venueLevel: number,
  furnitureBonus: number = 0,
): number {
  // 根据当前口碑找到能使用的最高场地等级
  let effectiveLevel = 1
  for (const v of venueUpgradeItems) {
    if (reputation >= v.requiredReputation && v.venueLevel <= venueLevel) {
      effectiveLevel = v.venueLevel
    }
  }

  // 查找对应等级的容量
  const venue = venueUpgradeItems.find(v => v.venueLevel === effectiveLevel)
  const baseCapacity = venue?.audienceCapacity ?? 3

  return baseCapacity + furnitureBonus
}
