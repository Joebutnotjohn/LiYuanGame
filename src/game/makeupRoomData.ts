/**
 * 梨园一梦 - 化妆间玩法数据层（重构版 v2）
 * 
 * 新设计：
 * - 左侧：演员选择（显示演员名+饰演角色+行当），双击查看详情
 * - 右上：玩法引导面板
 * - 右下：套装选择（img图标 + 剧目名称）
 *   - 虞姬套装：img-1 → look-1, img-2 → look-2
 *   - 项羽套装：img-7 → look-3, img-8 → look-4
 * - 中央：选套装后显示角色形象（look图片去白底）
 * - 底部：评分（与套装面板分开）
 * - 任务导览缩短
 */

// ============================================================
// 演员角色定义
// ============================================================

export type CharacterId = 'yuji' | 'xiangyu'

/** 京剧行当 */
export type RoleType = '花旦' | '青衣' | '小生' | '武生' | '老生'

export interface CharacterConfig {
  id: CharacterId
  /** 演员名字（如"程小婉"） */
  actorName: string
  /** 饰演角色名 */
  roleName: string
  /** 京剧行当 */
  role: RoleType
  /** 擅长的行当说明 */
  specialtyRoles: string
  /** 角色简介（简短） */
  shortBio: string
  /** 角色详细介绍 */
  longBio: string
  /** 擅长演的剧目列表 */
  specialtyPlays: string[]
  /** 角色头像图标（左侧列表用） */
  iconImg: string
}

export const characters: CharacterConfig[] = [
  {
    id: 'yuji',
    actorName: '程小婉',
    roleName: '虞姬',
    role: '花旦',
    specialtyRoles: '花旦、青衣，尤擅花旦',
    shortBio: '程小婉饰虞姬，楚霸王项羽的爱姬，温柔坚贞，帐中舞剑诀别',
    longBio: '程小婉是梨园名伶，工花旦，兼擅青衣。她容貌秀美，嗓音甜润，做工细腻传神。在《霸王别姬》中饰演虞姬一角，将虞姬的温婉坚贞与诀别时的刚烈诠释得淋漓尽致。她的水袖功夫与剑舞堪称一绝，常在帐中舞剑一折博得满堂彩。程小婉的花旦表演兼具妩媚与英气，是当下梨园最受欢迎的花旦演员之一。',
    specialtyPlays: ['霸王别姬', '贵妃醉酒', '白蛇传', '红娘'],
    iconImg: '/assets/characters/yuji.png',
  },
  {
    id: 'xiangyu',
    actorName: '沈长山',
    roleName: '项羽',
    role: '武生',
    specialtyRoles: '武生、老生，尤擅长靠武生',
    shortBio: '沈长山饰项羽，西楚霸王，力拔山兮气盖世，英雄末路悲歌',
    longBio: '沈长山是梨园武生台柱，工长靠武生，亦能老生。他身材魁梧，嗓音洪亮宽厚，武功扎实稳健。在《霸王别姬》中饰演项羽，将霸王的雄浑气概与末路悲凉刻画得入木三分。他的"力拔山兮气盖世"唱段气势磅礴，与虞姬诀别时的英雄泪洒令观者动容。沈长山的武生表演讲究"威而不猛、刚中见柔"，是当代武生行当的佼佼者。',
    specialtyPlays: ['霸王别姬', '挑滑车', '长坂坡', '定军山'],
    iconImg: '/assets/characters/xiangyu.png',
  },
]

// ============================================================
// 套装（换装方案）定义
//
// 映射规则：
//   虞姬套装（右下显示）：
//     img-1 → set-1（素衣），点击后中间显示 look-1
//     img-2 → set-2（华服），点击后中间显示 look-2
//   项羽套装（右下显示）：
//     img-7 → set-3（战袍），点击后中间显示 look-3
//     img-8 → set-4（锦袍），点击后中间显示 look-4
// ============================================================

export type CostumeSetId = 'set-1' | 'set-2' | 'set-3' | 'set-4'

export interface CostumeSet {
  id: CostumeSetId
  name: string
  /** 套装图标（使用 assets/makeup-room 内的 img 文件） */
  iconImg: string
  /** 适用角色 */
  characterId: CharacterId
  /** 角色形象展示图（look 文件，已去白底处理） */
  lookImg: string
  /** 对应的京剧剧目名称 */
  playName: string
  /** 服装等级 */
  tier: 'normal' | 'luxury'
  /** 文化说明 */
  description: string
}

export const costumeSets: CostumeSet[] = [
  // ---- 虞姬套装（img-1, img-2 → look-1, look-2） ----
  {
    id: 'set-1',
    name: '虞姬·素衣',
    iconImg: '/assets/makeup-room/img-1.png',
    characterId: 'yuji',
    lookImg: '/assets/makeup-room/look-1.png',
    playName: '霸王别姬·帐中舞剑',
    tier: 'normal',
    description: '虞姬日常所穿的素色衣裙，清雅端庄，不失温婉之气。适用于《霸王别姬》帐中诀别一折。',
  },
  {
    id: 'set-2',
    name: '虞姬·华服',
    iconImg: '/assets/makeup-room/img-2.png',
    characterId: 'yuji',
    lookImg: '/assets/makeup-room/look-2.png',
    playName: '贵妃醉酒·霓裳羽衣',
    tier: 'luxury',
    description: '虞姬帐中舞剑时所着华服，金线绣纹，流光溢彩。亦可适用于《贵妃醉酒》中杨贵妃的华美扮相。',
  },
  // ---- 项羽套装（img-7, img-8 → look-3, look-4） ----
  {
    id: 'set-3',
    name: '项羽·战袍',
    iconImg: '/assets/makeup-room/img-7.png',
    characterId: 'xiangyu',
    lookImg: '/assets/makeup-room/look-3.png',
    playName: '霸王别姬·英雄末路',
    tier: 'normal',
    description: '项羽征战所穿的戎装战袍，英武非凡，尽显霸王气概。适用于《霸王别姬》垓下之围一折。',
  },
  {
    id: 'set-4',
    name: '项羽·锦袍',
    iconImg: '/assets/makeup-room/img-8.png',
    characterId: 'xiangyu',
    lookImg: '/assets/makeup-room/look-4.png',
    playName: '霸王别姬·霸王卸甲',
    tier: 'luxury',
    description: '项羽帐中所着锦袍，金甲披身，虽败犹荣，霸气不减。适用于《霸王别姬》终场的悲壮收束。',
  },
]

// ============================================================
// 化妆间进度状态
// ============================================================

export interface MakeupRoomProgress {
  /** 当前选中的演员 */
  selectedCharacter: CharacterId | null
  /** 当前选中的套装 */
  selectedSet: CostumeSetId | null
  /** 是否已完成全部 */
  isCompleted: boolean
  /** 已完成换装的演员 */
  completedCharacters: CharacterId[]
}

export function createInitialMakeupProgress(): MakeupRoomProgress {
  return {
    selectedCharacter: null,
    selectedSet: null,
    isCompleted: false,
    completedCharacters: [],
  }
}

// ============================================================
// 任务步骤（缩短版）
// ============================================================

export type MakeupTaskStep = 'chooseCharacter' | 'chooseSet' | 'completed'

export interface MakeupChecklistItem {
  id: string
  label: string
  step: MakeupTaskStep
}

export const makeupChecklist: MakeupChecklistItem[] = [
  { id: 'choose_character', label: '选演员', step: 'chooseCharacter' },
  { id: 'choose_set', label: '选套装', step: 'chooseSet' },
  { id: 'complete', label: '完成', step: 'completed' },
]

// ============================================================
// 评分系统
// ============================================================

export interface MakeupScores {
  tradition: number
  beauty: number
  fit: number
  heritageImpact: number
  overall: number
  grade: string
  comment: string
}

export function calcMakeupScores(
  characterId: CharacterId | null,
  setId: CostumeSetId | null,
): MakeupScores {
  if (!characterId || !setId) {
    return {
      tradition: 0, beauty: 0, fit: 0,
      heritageImpact: 0, overall: 0,
      grade: '—',
      comment: '请先选择演员和套装',
    }
  }

  const set = costumeSets.find((s) => s.id === setId)
  if (!set) {
    return {
      tradition: 0, beauty: 0, fit: 0,
      heritageImpact: 0, overall: 0,
      grade: '—',
      comment: '配置异常',
    }
  }

  // 传统还原度
  let tradition = 60
  if (set.characterId === characterId) tradition += 25
  else tradition -= 10

  // 舞台美感
  let beauty = 50
  if (set.tier === 'luxury') beauty += 30
  else beauty += 15
  if (set.characterId === characterId) beauty += 20

  // 角色契合度
  let fit = 40
  if (set.characterId === characterId) fit += 40
  else fit -= 20

  tradition = Math.max(0, Math.min(100, tradition))
  beauty = Math.max(0, Math.min(100, beauty))
  fit = Math.max(0, Math.min(100, fit))

  const heritageImpact = Math.round((tradition + fit) / 20)
  const overall = Math.round((tradition + beauty + fit) / 3)

  let grade: string
  let comment: string

  if (overall >= 90) {
    grade = '绝妙'
    comment = '扮相尽善尽美，堪称梨园典范！'
  } else if (overall >= 75) {
    grade = '上佳'
    comment = '搭配得体，观众定会满意。'
  } else if (overall >= 60) {
    grade = '尚可'
    comment = '中规中矩，还有提升空间。'
  } else if (overall >= 40) {
    grade = '欠妥'
    comment = '搭配有些问题，请重新选择。'
  } else {
    grade = '不当'
    comment = '角色与套装严重不匹配！'
  }

  return { tradition, beauty, fit, heritageImpact, overall, grade, comment }
}

// ============================================================
// 玩法引导（右上角显示）
// ============================================================

export interface GameGuide {
  step: number
  title: string
  content: string
}

export const gameGuides: GameGuide[] = [
  {
    step: 1,
    title: '第一步：选择演员',
    content: '在左侧演员列表中单击选择一位演员。双击演员卡片可查看该演员的详细介绍，包括其饰演角色、所属行当和擅长剧目。',
  },
  {
    step: 2,
    title: '第二步：选择套装',
    content: '选好演员后，在右下方的套装面板中点击套装图标，为该演员选择合适的戏服。每个套装下方标注了适用的京剧剧目名称。',
  },
  {
    step: 3,
    title: '第三步：预览与确认',
    content: '选择套装后，画面中央会展示角色穿着该套戏服的形象。右下角的评分系统会根据演员与套装的匹配程度给出评价。确认无误后点击"确认换装"按钮。',
  },
  {
    step: 4,
    title: '关于京剧行当',
    content: '京剧行当分为生、旦、净、丑四大类。花旦扮演活泼娇美的青年女性，武生扮演勇武刚毅的男性。不同行当的演员各有其擅长的角色类型和表演风格。',
  },
]
