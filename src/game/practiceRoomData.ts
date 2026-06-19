/**
 * 梨园一梦 - 排练房数据模型
 * 管理身段训练、情绪训练、角色成长数值等数据
 */

// ============================================
// 训练类型
// ============================================

export type PracticeType = 'body' | 'emotion'

export interface PracticeTypeInfo {
  id: PracticeType
  name: string
  description: string
}

export const practiceTypes: PracticeTypeInfo[] = [
  {
    id: 'body',
    name: '身段训练',
    description: '跟随节奏点击，磨练身段基本功。手眼身法步，一板一眼皆功夫。',
  },
  {
    id: 'emotion',
    name: '情绪训练',
    description: '阅读戏曲情境，选择最贴合的情绪。唱念做打，情动于中方能形于外。',
  },
]

// ============================================
// 身段训练 - 节奏点击玩法
// ============================================

/** 节奏点类型 */
export type NoteKind = 'tap' | 'hold'

/** 轨道索引 0~2 */
export type TrackIndex = 0 | 1 | 2

export interface RhythmNote {
  id: number
  track: TrackIndex
  kind: NoteKind
  /** 0~100，从左侧 0 移动到右侧 100 */
  position: number
  /** 长按型：目标停留时长（帧数，约 60fps 即秒数*60） */
  holdDuration: number
  /** 长按型：已按住帧数 */
  holdProgress: number
  /** 当前移动速度倍率 */
  speedMult: number
  /** 判定结果 */
  result: 'pending' | 'perfect' | 'good' | 'miss'
}

export interface BodyTrainingState {
  notes: RhythmNote[]
  score: number
  combo: number
  maxCombo: number
  perfectCount: number
  goodCount: number
  missCount: number
  /** 当前总身段值增益（最终结算用） */
  bodyGain: number
  /** 当前轮次 0~2 */
  round: number
  /** 总轮数 */
  totalRounds: number
  /** 当前轨道数 */
  trackCount: number
  /** 各轨道判定线 X 位置 0~100 */
  trackJudgePositions: number[]
  /** 长按状态：哪个轨道正在被长按（track index -> note id） */
  holdingTracks: Map<number, number>
  /** 本轮是否已完成 */
  roundCompleted: boolean
  /** 是否为逐个出现模式（第二轮） */
  sequentialMode: boolean
  /** 逐个出现模式下，当前活跃的 note 索引（仅 sequentialMode 有效） */
  sequentialIndex: number
}

/** 节奏点移动基准速度 (每帧百分比) */
export const NOTE_SPEED = 0.5

/** 根据轨道数计算实际速度：轨道越多越慢 */
export function getNoteSpeed(trackCount: number): number {
  const speeds = [0, 0.50, 0.30, 0.18] // 1轨快, 2轨中, 3轨慢
  return speeds[Math.min(trackCount, speeds.length - 1)] ?? 0.50
}

/** 不同轨道判定线位置 */
export const TRACK_JUDGE_POSITIONS: Record<number, number[]> = {
  1: [50],
  2: [35, 65],
  3: [25, 50, 75],
}

/** 判定阈值 */
export const PERFECT_RANGE = 6   // 完美判定范围 ±6%
export const GOOD_RANGE = 16     // 不错判定范围 ±16%

/** 身段训练评分 */
export const BODY_SCORE_GOOD = 2
export const BODY_SCORE_MISS = 0

/** 根据轮次获取完美命中的身段值增益 */
export function getBodyScorePerfect(round: number): number {
  const scores = [2, 5, 10] // 第1轮2分, 第2轮5分, 第3轮10分
  return scores[Math.min(round, scores.length - 1)] ?? 2
}

/** 长按每秒得分 */
export const HOLD_SCORE_PER_SECOND = 2

/** 单轨每轮节奏点数 */
export const NOTES_PER_TRACK_PER_ROUND = 8

/** 长按出现概率（仅在 2轨/3轨 轮次出现） */
export const HOLD_NOTE_CHANCE = 0.3

/** 长按持续时间范围（秒） */
export const HOLD_DURATION_MIN = 0.6
export const HOLD_DURATION_MAX = 1.8

/** 变速节奏型配置 */
export const SPEED_PATTERNS: number[][] = [
  // 第1轮：匀速
  [1.0],
  // 第2轮：轻微变化
  [1.0, 1.0, 1.3, 1.0, 0.7, 1.0, 1.0, 1.2],
  // 第3轮：明显板眼节奏
  [1.0, 0.5, 1.5, 1.0, 0.6, 1.4, 1.0, 1.0],
]

/** 段位评价 */
export interface RankEvaluation {
  rank: string
  title: string
  description: string
  color: string
}

/** 根据得分率计算段位 */
export function evaluateRank(
  score: number,
  perfectCount: number,
  goodCount: number,
  totalNotes: number,
  round: number,
): RankEvaluation {
  // 使用该轮完美分值的加权估算
  const maxPerRound = totalNotes * getBodyScorePerfect(round)
  const ratio = maxPerRound > 0 ? score / maxPerRound : 0

  if (ratio >= 0.95 && perfectCount >= totalNotes * 0.8) {
    return { rank: 'S', title: '炉火纯青', description: '手眼身法步，浑然天成，已有大家风范！', color: '#ff6b9d' }
  }
  if (ratio >= 0.85) {
    return { rank: 'A', title: '游刃有余', description: '节奏稳健，功底扎实，登台演出不在话下。', color: '#e8c860' }
  }
  if (ratio >= 0.7) {
    return { rank: 'B', title: '中规中矩', description: '基本工整，尚需打磨，多练几遍必有所成。', color: '#80c0e0' }
  }
  if (ratio >= 0.5) {
    return { rank: 'C', title: '梨园新秀', description: '初窥门径，板眼尚欠火候，还需勤加练习。', color: '#a0d8a0' }
  }
  return { rank: 'D', title: '初学乍练', description: '台上一分钟，台下十年功。不要气馁，继续努力！', color: '#c0b0a0' }
}

/** 为一条轨道生成变速节奏点序列 */
function generateTrackNotes(
  track: TrackIndex,
  trackJudgePos: number,
  baseId: number,
  round: number,
): RhythmNote[] {
  const count = NOTES_PER_TRACK_PER_ROUND
  const notes: RhythmNote[] = []
  const speedPattern = SPEED_PATTERNS[Math.min(round, SPEED_PATTERNS.length - 1)]

  for (let i = 0; i < count; i++) {
    const speedIdx = i % speedPattern.length
    const isHold = round > 0 && Math.random() < HOLD_NOTE_CHANCE
    const holdFrames = isHold
      ? Math.floor((HOLD_DURATION_MIN + Math.random() * (HOLD_DURATION_MAX - HOLD_DURATION_MIN)) * 60)
      : 0

    notes.push({
      id: baseId + i,
      track,
      kind: isHold ? 'hold' : 'tap',
      position: trackJudgePos - 30 - i * 14, // 依次从左进入
      holdDuration: holdFrames,
      holdProgress: 0,
      speedMult: speedPattern[speedIdx],
      result: 'pending',
    })
  }
  return notes
}

/** 生成一轮多轨道节奏点序列 */
export function generateRoundNotes(
  round: number,
  trackCount: number,
  sequential: boolean = false,
): { notes: RhythmNote[]; trackJudgePositions: number[] } {
  const trackPositions = TRACK_JUDGE_POSITIONS[trackCount] ?? TRACK_JUDGE_POSITIONS[1]
  const allNotes: RhythmNote[] = []

  if (sequential) {
    // 逐个出现模式：所有圆点位置固定在判定线上，一个个出现
    const totalNotes = NOTES_PER_TRACK_PER_ROUND // 总共8个圆点
    for (let i = 0; i < totalNotes; i++) {
      const track = (i % trackCount) as TrackIndex
      const judgePos = trackPositions[track]
      allNotes.push({
        id: i + round * 300,
        track,
        kind: 'tap',
        position: judgePos, // 固定在判定线位置，不滚动
        holdDuration: 0,
        holdProgress: 0,
        speedMult: 0, // 不移动
        result: 'pending',
      })
    }
  } else {
    // 正常滚动模式
    for (let t = 0; t < trackCount; t++) {
      const trackNotes = generateTrackNotes(t as TrackIndex, trackPositions[t], t * 100 + round * 300, round)
      allNotes.push(...trackNotes)
    }
  }

  return {
    notes: allNotes,
    trackJudgePositions: trackPositions,
  }
}

// ============================================
// 情绪训练 - 剧情选择玩法
// ============================================

export interface EmotionScenario {
  id: string
  title: string
  description: string
  /** 场景氛围描述 */
  atmosphere: string
  /** 3个可选情绪 */
  choices: EmotionChoice[]
}

export interface EmotionChoice {
  text: string
  /** 与场景的匹配度：perfect / partial / mismatch */
  match: 'perfect' | 'partial' | 'mismatch'
  /** 情绪感染力增益（基础值，实际值由组合逻辑动态计算） */
  scoreGain: number
  /** 视觉反馈类型 */
  visualEffect: 'dim' | 'red_glow' | 'particle_slow'
}

export interface EmotionTrainingState {
  currentScenarioIndex: number
  scenarios: EmotionScenario[]
  score: number
  emotionGain: number
  completedCount: number
  totalCount: number
}

/** 情绪训练场景库 */
export const emotionScenarios: EmotionScenario[] = [
  {
    id: 'e1',
    title: '帐中诀别',
    description: '夜帐深沉，战鼓渐远。四面楚歌之中，虞姬独坐灯前，望着枕边那柄短剑出神。',
    atmosphere: '悲凉、压抑、诀别',
    choices: [
      { text: '压抑', match: 'partial', scoreGain: 7, visualEffect: 'dim' },
      { text: '决绝', match: 'perfect', scoreGain: 10, visualEffect: 'red_glow' },
      { text: '悲怆', match: 'partial', scoreGain: 7, visualEffect: 'particle_slow' },
    ],
  },
  {
    id: 'e2',
    title: '力拔山兮',
    description: '项羽立于乌江之畔，身后是残存的八百子弟兵。他望着对岸的故乡，心中翻涌万千。',
    atmosphere: '豪迈、不甘、悲壮',
    choices: [
      { text: '激昂', match: 'partial', scoreGain: 7, visualEffect: 'red_glow' },
      { text: '悲壮', match: 'perfect', scoreGain: 10, visualEffect: 'particle_slow' },
      { text: '沉郁', match: 'mismatch', scoreGain: 0, visualEffect: 'dim' },
    ],
  },
  {
    id: 'e3',
    title: '剑舞',
    description: '虞姬拔剑起舞，衣袂翻飞间，剑光如雪。她眼中含笑，却藏着最深的不舍。',
    atmosphere: '凄美、决绝、深情',
    choices: [
      { text: '凄美', match: 'perfect', scoreGain: 10, visualEffect: 'particle_slow' },
      { text: '刚烈', match: 'partial', scoreGain: 7, visualEffect: 'red_glow' },
      { text: '平静', match: 'mismatch', scoreGain: 0, visualEffect: 'dim' },
    ],
  },
  {
    id: 'e4',
    title: '四面楚歌',
    description: '夜半时分，汉营传来楚地歌谣。营中将士纷纷落泪，项羽默然独立，心知大势已去。',
    atmosphere: '绝望、乡愁、宿命',
    choices: [
      { text: '绝望', match: 'partial', scoreGain: 7, visualEffect: 'dim' },
      { text: '悲凉', match: 'perfect', scoreGain: 10, visualEffect: 'particle_slow' },
      { text: '愤怒', match: 'mismatch', scoreGain: 0, visualEffect: 'red_glow' },
    ],
  },
  {
    id: 'e5',
    title: '霸王卸甲',
    description: '最后一战前，项羽缓缓卸下战甲。每一片甲叶落地，都像是一个时代的终结。',
    atmosphere: '沉重、不舍、英雄末路',
    choices: [
      { text: '沉重', match: 'perfect', scoreGain: 10, visualEffect: 'dim' },
      { text: '洒脱', match: 'mismatch', scoreGain: 0, visualEffect: 'red_glow' },
      { text: '悲怆', match: 'partial', scoreGain: 7, visualEffect: 'particle_slow' },
    ],
  },
]

// ============================================
// 角色成长数值
// ============================================

export interface CharacterStats {
  /** 身段值 0~100 */
  body: number
  /** 情绪感染力 0~100 */
  emotionPower: number
  /** 台词理解 0~100 */
  script: number
}

export const MAX_STAT = 100
export const MIN_STAT = 0

/** 根据总训练分数计算台词理解增益 */
export function calcScriptGain(bodyGain: number, emotionGain: number): number {
  return Math.floor((bodyGain + emotionGain) * 0.3)
}

// ============================================
// 排练房完整进度状态
// ============================================

export interface PracticeRoomProgress {
  /** 当前选中的训练类型（null 表示未选择） */
  selectedType: PracticeType | null
  /** 角色成长数值 */
  stats: CharacterStats
  /** 身段训练状态（仅 body 模式有效） */
  bodyTraining: BodyTrainingState | null
  /** 情绪训练状态（仅 emotion 模式有效） */
  emotionTraining: EmotionTrainingState | null
  /** 是否已完成本轮训练 */
  trainingCompleted: boolean
  /** 本轮是否已完成（用于推进到下一轮） */
  roundCompleted: boolean
  /** 已完成训练轮数 */
  trainingRounds: number
}

/** 创建初始排练房进度 */
export function createInitialPracticeProgress(): PracticeRoomProgress {
  return {
    selectedType: null,
    stats: {
      body: 0,
      emotionPower: 0,
      script: 0,
    },
    bodyTraining: null,
    emotionTraining: null,
    trainingCompleted: false,
    roundCompleted: false,
    trainingRounds: 0,
  }
}

/** 总训练轮数 */
export const BODY_TOTAL_ROUNDS = 3

/** 每轮对应的轨道数 */
export const ROUND_TRACK_COUNT = [1, 2, 3]

/** 每轮是否为逐个出现模式（第二轮圆点一个个出现） */
export const ROUND_SEQUENTIAL = [false, true, false]

/** 初始化身段训练状态 */
export function initBodyTraining(): BodyTrainingState {
  const sequential = ROUND_SEQUENTIAL[0]
  const { notes, trackJudgePositions } = generateRoundNotes(0, 1, sequential)
  return {
    notes,
    score: 0,
    combo: 0,
    maxCombo: 0,
    perfectCount: 0,
    goodCount: 0,
    missCount: 0,
    bodyGain: 0,
    round: 0,
    totalRounds: BODY_TOTAL_ROUNDS,
    trackCount: 1,
    trackJudgePositions,
    holdingTracks: new Map(),
    roundCompleted: false,
    sequentialMode: sequential,
    sequentialIndex: 0,
  }
}

/** 初始化下一轮训练 */
export function initNextRound(prevState: BodyTrainingState): BodyTrainingState {
  const nextRound = prevState.round + 1
  if (nextRound >= BODY_TOTAL_ROUNDS) {
    return { ...prevState, roundCompleted: true }
  }
  const trackCount = ROUND_TRACK_COUNT[nextRound]
  const sequential = ROUND_SEQUENTIAL[nextRound]
  const { notes, trackJudgePositions } = generateRoundNotes(nextRound, trackCount, sequential)
  return {
    ...prevState,
    notes,
    round: nextRound,
    trackCount,
    trackJudgePositions,
    holdingTracks: new Map(),
    roundCompleted: false,
    sequentialMode: sequential,
    sequentialIndex: 0,
  }
}

/** 初始化情绪训练状态 */
export function initEmotionTraining(): EmotionTrainingState {
  return {
    currentScenarioIndex: 0,
    scenarios: emotionScenarios,
    score: 0,
    emotionGain: 0,
    completedCount: 0,
    totalCount: emotionScenarios.length,
  }
}
