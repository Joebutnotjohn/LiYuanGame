/**
 * 戏台玩法 - 综合评分 / 评级 / 评估项
 *
 * 数据来源（来自玩家之前的玩法）：
 *  - 后台：StageScores { clarity, tradition, tragedy, risk, totalScore }
 *  - 化妆间：MakeupScores { tradition, beauty, fit, overall }
 *  - 排练房：CharacterStats { body, emotionPower, script }
 *  - 售票口：soldCount / totalCustomers（热度）
 *
 * 玩法流程：
 *  idle -> playing (6s 演出 + 分数环 + 评估项依次点亮)
 *       -> settling (2s 结算动画 + 评级徽章弹出)
 *       -> finished (评级卡 + 奖励 + 回到主页)
 */

import type { StageScores } from './backstageData'
import type { MakeupScores } from './makeupRoomData'
import type { CharacterStats } from './practiceRoomData'

// ============================================================
// 评级
// ============================================================

export type StageGrade = 'SSS' | 'SS' | 'S' | 'A' | 'B' | 'C' | 'D'

export interface GradeMeta {
  grade: StageGrade
  /** 中文称号 */
  title: string
  /** 一句话评语 */
  comment: string
  /** 暗色饱和度低的主色（暗金/暗红等） */
  color: string
  /** 奖励（宝钱/口碑/传承/经验） */
  reward: { gold: number; reputation: number; heritage: number; exp: number }
}

export const GRADE_META: Record<StageGrade, GradeMeta> = {
  SSS: {
    grade: 'SSS',
    title: '梨园绝响',
    comment: '千古绝唱，万人空巷。',
    color: '#C9A86A',
    reward: { gold: 320, reputation: 60, heritage: 40, exp: 120 },
  },
  SS: {
    grade: 'SS',
    title: '名动京华',
    comment: '满城争说，梨园新帜。',
    color: '#B89260',
    reward: { gold: 240, reputation: 45, heritage: 30, exp: 90 },
  },
  S: {
    grade: 'S',
    title: '炉火纯青',
    comment: '声情并茂，已臻化境。',
    color: '#A37F50',
    reward: { gold: 180, reputation: 32, heritage: 22, exp: 70 },
  },
  A: {
    grade: 'A',
    title: '游刃有余',
    comment: '渐入佳境，颇有可观。',
    color: '#8E6E48',
    reward: { gold: 130, reputation: 24, heritage: 16, exp: 55 },
  },
  B: {
    grade: 'B',
    title: '中规中矩',
    comment: '四平八稳，仍需精进。',
    color: '#7A5E40',
    reward: { gold: 90, reputation: 16, heritage: 10, exp: 40 },
  },
  C: {
    grade: 'C',
    title: '略显稚嫩',
    comment: '初窥门径，犹待磨练。',
    color: '#6A4E36',
    reward: { gold: 55, reputation: 9, heritage: 5, exp: 25 },
  },
  D: {
    grade: 'D',
    title: '差强人意',
    comment: '尚需勤学，方可登台。',
    color: '#5A3E2A',
    reward: { gold: 25, reputation: 4, heritage: 1, exp: 12 },
  },
}

/** 综合分 0~100 → 评级 */
export function gradeFromScore(score: number): StageGrade {
  if (score >= 95) return 'SSS'
  if (score >= 88) return 'SS'
  if (score >= 78) return 'S'
  if (score >= 65) return 'A'
  if (score >= 50) return 'B'
  if (score >= 35) return 'C'
  return 'D'
}

// ============================================================
// 综合分计算
// ============================================================

export interface OverallInput {
  stage: StageScores          // 后台评分
  makeup: MakeupScores        // 化妆间评分
  stats: CharacterStats       // 排练房数值
  soldCount: number           // 售票口卖出票数
  totalCustomers: number      // 总顾客数
}

export interface OverallBreakdown {
  /** 0~100 总分 */
  overall: number
  /** 各项贡献 0~100（用于评估列表显示） */
  items: EvaluationItem[]
  /** 演出热度 0~100 */
  popularity: number
}

export interface EvaluationItem {
  /** 显示名 */
  label: string
  /** 类别 */
  category: '舞台' | '妆造' | '身段' | '情绪' | '整体'
  /** 0~100 */
  value: number
  /** 评价等级（影响颜色） */
  status: 'excellent' | 'good' | 'fair' | 'poor'
}

/**
 * 计算综合评分（0~100）。
 * 权重：
 *   后台舞台（舞台清晰度 / 传统 / 悲剧 / 风险反向） ≈ 40%
 *   化妆间综合 ≈ 25%
 *   排练房综合 ≈ 25%
 *   演出热度 ≈ 10%
 */
export function calcOverallScore(input: OverallInput): OverallBreakdown {
  // 1) 舞台（0~100，去掉风险负向）
  const riskPenalty = Math.min(20, Math.max(0, input.stage.risk) * 0.3)
  const stageAvg = Math.max(
    0,
    Math.min(
      100,
      (input.stage.clarity + input.stage.tradition + input.stage.tragedy) / 3 -
        riskPenalty,
    ),
  )

  // 2) 化妆间
  const makeupAvg = Math.max(
    0,
    Math.min(
      100,
      (input.makeup.tradition + input.makeup.beauty + input.makeup.fit) / 3,
    ),
  )

  // 3) 排练房
  const practiceAvg = Math.max(
    0,
    Math.min(100, (input.stats.body + input.stats.emotionPower + input.stats.script) / 3),
  )

  // 4) 热度
  const popularity = input.totalCustomers > 0
    ? Math.round((input.soldCount / input.totalCustomers) * 100)
    : 0

  // 综合
  const overall = Math.round(
    stageAvg * 0.4 + makeupAvg * 0.25 + practiceAvg * 0.25 + popularity * 0.1,
  )

  const items: EvaluationItem[] = [
    { label: '舞台清晰', category: '舞台', value: round1(input.stage.clarity), status: statusOf(input.stage.clarity) },
    { label: '传统还原', category: '舞台', value: round1(input.stage.tradition), status: statusOf(input.stage.tradition) },
    { label: '悲剧美感', category: '舞台', value: round1(input.stage.tragedy), status: statusOf(input.stage.tradition) },
    { label: '风险控制', category: '舞台', value: round1(Math.max(0, 100 - input.stage.risk)), status: statusOf(100 - input.stage.risk) },
    { label: '妆造传统', category: '妆造', value: round1(input.makeup.tradition), status: statusOf(input.makeup.tradition) },
    { label: '妆造美感', category: '妆造', value: round1(input.makeup.beauty), status: statusOf(input.makeup.beauty) },
    { label: '人戏契合', category: '妆造', value: round1(input.makeup.fit), status: statusOf(input.makeup.fit) },
    { label: '身段扎实', category: '身段', value: round1(input.stats.body), status: statusOf(input.stats.body) },
    { label: '情绪感染', category: '情绪', value: round1(input.stats.emotionPower), status: statusOf(input.stats.emotionPower) },
    { label: '台词理解', category: '整体', value: round1(input.stats.script), status: statusOf(input.stats.script) },
  ]

  return {
    overall: Math.max(0, Math.min(100, overall)),
    items,
    popularity,
  }
}

function statusOf(v: number): EvaluationItem['status'] {
  if (v >= 80) return 'excellent'
  if (v >= 60) return 'good'
  if (v >= 40) return 'fair'
  return 'poor'
}

function round1(v: number): number {
  return Math.round(v * 10) / 10
}

// ============================================================
// 演出状态机
// ============================================================

export type StagePhase = 'idle' | 'playing' | 'settling' | 'finished'

/** 演出总时长：6 秒 */
export const STAGE_TOTAL_DURATION = 6000
/** 结算动画：2.5 秒 */
export const STAGE_SETTLE_DURATION = 2500
