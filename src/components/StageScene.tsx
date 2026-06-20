import { useEffect, useMemo, useRef, useState } from 'react'
import { gameAssets } from '../game/assets'
import type { BackstageProgress } from '../game/backstageData'
import { calcMakeupScores, type MakeupRoomProgress } from '../game/makeupRoomData'
import type { PracticeRoomProgress } from '../game/practiceRoomData'
import type { TicketOfficeProgress } from '../game/ticketOfficeData'
import { playList } from '../game/ticketOfficeData'
import {
  calcOverallScore,
  gradeFromScore,
  GRADE_META,
  STAGE_SETTLE_DURATION,
  STAGE_TOTAL_DURATION,
  type EvaluationItem,
  type StageGrade,
  type StagePhase,
} from '../game/stageData'
import { getCurrentLevelRule, getNextLevelRule } from '../game/gameData'
import './StageScene.css'

export interface StageSceneProps {
  resources: { gold: number; reputation: number; heritage: number; exp: number; level: number }
  backstageProgress: BackstageProgress
  makeupProgress: MakeupRoomProgress
  practiceProgress: PracticeRoomProgress
  ticketProgress: TicketOfficeProgress
  day: number
  onBack: () => void
  onComplete: (result: {
    grade: StageGrade
    overallScore: number
    reward: { gold: number; reputation: number; heritage: number; exp: number }
  }) => void
}

export default function StageScene({
  resources,
  backstageProgress,
  makeupProgress,
  practiceProgress,
  ticketProgress,
  day,
  onBack,
  onComplete,
}: StageSceneProps) {
  // ---- 经验进度（与主页 ResourceBar 算法一致）----
  const expProgress = useMemo(() => {
    const exp = resources.exp
    const currentRule = getCurrentLevelRule(exp)
    const nextRule = getNextLevelRule(exp)
    if (!nextRule) return { current: exp, next: exp, pct: 100 }
    const total = nextRule.requiredExp - currentRule.requiredExp
    const done = exp - currentRule.requiredExp
    return { current: done, next: total, pct: Math.min(100, Math.round((done / total) * 100)) }
  }, [resources.exp])

  // ---- 计算综合分（仅在演出前算好）----
  const { stageScores, makeupScores, stats, overallResult, playInfo, popularity } =
    useMemo(() => {
      const stageScores = backstageProgress.stageScores ?? {
        clarity: 0,
        tradition: 0,
        tragedy: 0,
        risk: 0,
        totalScore: 0,
      }
      // 化妆间评分：根据当前选中的演员和套装动态计算
      const makeupScores = calcMakeupScores(
        makeupProgress.selectedCharacter,
        makeupProgress.selectedSet,
      )
      const stats = practiceProgress.stats ?? {
        body: 0,
        emotionPower: 0,
        script: 0,
      }
      const overallResult = calcOverallScore({
        stage: stageScores,
        makeup: makeupScores,
        stats,
        soldCount: ticketProgress.soldCount,
        totalCustomers: ticketProgress.customers.length,
      })
      const playInfo = playList.find((p) => p.id === ticketProgress.selectedPlayId)
        ?? playList[0]
      return {
        stageScores,
        makeupScores,
        stats,
        overallResult,
        playInfo,
        popularity: overallResult.popularity,
      }
    }, [backstageProgress, makeupProgress, practiceProgress, ticketProgress])

  // ---- 演出状态机 ----
  const [phase, setPhase] = useState<StagePhase>('idle')
  const [animScore, setAnimScore] = useState(0)        // 0 ~ overall
  const [activeItemCount, setActiveItemCount] = useState(0) // 已亮起的评估项
  const [finalGrade, setFinalGrade] = useState<StageGrade | null>(null)
  const rafRef = useRef<number>(0)
  const startTimeRef = useRef<number>(0)

  // 开锣 → playing
  const handleStart = () => {
    if (phase !== 'idle') return
    setPhase('playing')
    startTimeRef.current = performance.now()
    setAnimScore(0)
    setActiveItemCount(0)
    setFinalGrade(null)

    const tick = (now: number) => {
      const elapsed = now - startTimeRef.current
      const ratio = Math.min(1, elapsed / STAGE_TOTAL_DURATION)
      // 缓动：先快后慢
      const eased = 1 - Math.pow(1 - ratio, 2)
      const curScore = Math.round(overallResult.overall * eased)
      setAnimScore(curScore)
      setActiveItemCount(Math.floor(ratio * overallResult.items.length))
      if (ratio < 1) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        // 演出结束 → 结算
        setPhase('settling')
        window.setTimeout(() => {
          const grade = gradeFromScore(overallResult.overall)
          setFinalGrade(grade)
          setPhase('finished')
        }, STAGE_SETTLE_DURATION)
      }
    }
    rafRef.current = requestAnimationFrame(tick)
  }

  useEffect(() => {
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  // finished 时通知父级（结算奖励）
  useEffect(() => {
    if (phase === 'finished' && finalGrade) {
      onComplete({
        grade: finalGrade,
        overallScore: overallResult.overall,
        reward: GRADE_META[finalGrade].reward,
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, finalGrade])

  // 评估项：仅展示前 activeItemCount 个
  const visibleItems: (EvaluationItem & { active: boolean })[] = overallResult.items.map(
    (it, i) => ({ ...it, active: i < activeItemCount }),
  )

  // 分数环：周长 = 2πr
  const RING_RADIUS = 100
  const RING_CIRC = 2 * Math.PI * RING_RADIUS
  const ringOffset = RING_CIRC * (1 - animScore / 100)

  // 当前显示评级（finished 后才完全显示）
  const showGrade = finalGrade ? GRADE_META[finalGrade] : null

  return (
    <div
      className={`stg-root ${phase === 'playing' ? 'stg-root--playing' : ''}`}
    >
      {/* 背景 */}
      <div className="stg-bg" />
      <div className="stg-bg-overlay" />

      {/* 顶部 */}
      <div className="stg-top">
        <button className="stg-back" onClick={onBack} aria-label="返回" title="返回">
          ◀
        </button>
        <div style={{ textAlign: 'center' }}>
          <div className="stg-title">戏台 · 粉墨登场</div>
          <div className="stg-subtitle">
            {phase === 'idle' && '万事俱备，只欠开锣'}
            {phase === 'playing' && '好戏上演……'}
            {phase === 'settling' && '评定演出中……'}
            {phase === 'finished' && showGrade && showGrade.title}
          </div>
        </div>
        {/* 占位让标题居中：宽度等同资源条 */}
        <div style={{ width: 470 }} />
      </div>

      {/* 右上：4 项资源胶囊（与主页面 ResourceBar 同结构） */}
      <div className="stg-resources">
        {/* 宝钱 */}
        <div className="stg-resource-item res-gold">
          <div className="resource-bg" />
          <div className="resource-icon-png">
            <img
              className="res-icon-img"
              src={gameAssets.icons.coin}
              alt="宝钱"
              onError={(e) => {
                const el = e.currentTarget
                el.style.display = 'none'
              }}
            />
            <span className="resource-emoji-fb" style={{ display: 'none' }}>🪙</span>
          </div>
          <span className="resource-value">{resources.gold.toLocaleString()}</span>
          <span className="resource-label">宝钱</span>
        </div>

        {/* 口碑 */}
        <div className="stg-resource-item res-reputation">
          <div className="resource-bg" />
          <div className="resource-icon-png">
            <img
              className="res-icon-img"
              src={gameAssets.icons.reputation}
              alt="口碑"
              onError={(e) => {
                const el = e.currentTarget
                el.style.display = 'none'
              }}
            />
            <span className="resource-emoji-fb" style={{ display: 'none' }}>👏</span>
          </div>
          <span className="resource-value">{resources.reputation.toLocaleString()}</span>
          <span className="resource-label">口碑</span>
        </div>

        {/* 传承值 */}
        <div className="stg-resource-item res-heritage">
          <div className="resource-bg" />
          <div className="resource-icon-png">
            <img
              className="res-icon-img"
              src={gameAssets.icons.heritage}
              alt="传承值"
              onError={(e) => {
                const el = e.currentTarget
                el.style.display = 'none'
              }}
            />
            <span className="resource-emoji-fb" style={{ display: 'none' }}>📜</span>
          </div>
          <span className="resource-value">{resources.heritage.toLocaleString()}</span>
          <span className="resource-label">传承值</span>
        </div>

        {/* 等级 + 经验进度（与主页一致） */}
        <div className="stg-resource-item res-level">
          <div className="resource-bg" />
          <div className="resource-icon-png">
            <img
              className="res-icon-img"
              src={gameAssets.icons.exp}
              alt="经验"
              onError={(e) => {
                const el = e.currentTarget
                el.style.display = 'none'
              }}
            />
            <span className="resource-emoji-fb" style={{ display: 'none' }}>✨</span>
          </div>
          <div className="resource-level-info">
            <span className="resource-value res-level-lv">Lv.{resources.level}</span>
            <div className="res-exp-bar-wrap">
              <div
                className="res-exp-bar-fill"
                style={{ width: `${expProgress.pct}%` }}
              />
            </div>
            <span className="res-exp-text">经验 {expProgress.current}/{expProgress.next}</span>
          </div>
        </div>
      </div>

      {/* 左侧：化妆间 + 排练房分数 */}
      <aside className="stg-left">
        <div className="stg-score-card">
          <div className="stg-score-head">
            <span className="stg-score-title">化妆间</span>
            <span className="stg-score-overall">
              综合 <span className="num">{Math.round(makeupScores.overall)}</span>
            </span>
          </div>
          <div className="stg-score-rows">
            <BarRow label="传统" value={makeupScores.tradition} />
            <BarRow label="美感" value={makeupScores.beauty} />
            <BarRow label="契合" value={makeupScores.fit} />
          </div>
        </div>

        <div className="stg-score-card">
          <div className="stg-score-head">
            <span className="stg-score-title">排练房</span>
            <span className="stg-score-overall">
              综合 <span className="num">
                {Math.round((stats.body + stats.emotionPower + stats.script) / 3)}
              </span>
            </span>
          </div>
          <div className="stg-score-rows">
            <BarRow label="身段" value={stats.body} />
            <BarRow label="情绪" value={stats.emotionPower} />
            <BarRow label="台词" value={stats.script} />
          </div>
        </div>

        {/* 评级徽章（放在排练房分数下方） */}
        {showGrade && (
          <div className="stg-grade stg-grade--inline">
            <div
              className="stg-grade-letter"
              style={{ color: showGrade.color }}
            >
              {showGrade.grade}
            </div>
            <div className="stg-grade-title">{showGrade.title}</div>
            <div className="stg-grade-comment">「{showGrade.comment}」</div>
          </div>
        )}
      </aside>

      {/* 右上方：演出信息 */}
      <section className="stg-info">
        <div className="stg-info-head">演出信息</div>
        <div className="stg-info-row">
          <span className="label">演出剧目</span>
          <span className="value value--play">{playInfo.name}</span>
        </div>
        <div className="stg-info-row">
          <span className="label">演出时间</span>
          <span className="value">第 {day} 日 · 戌时</span>
        </div>
        <div className="stg-info-row">
          <span className="label">热度</span>
          <span className="value value--pop">
            {ticketProgress.soldCount}/{ticketProgress.customers.length}
          </span>
        </div>
        <div className="stg-pop-track">
          <div className="stg-pop-fill" style={{ width: `${popularity}%` }} />
        </div>
        <div className="stg-pop-label">{popularityLabel(popularity)}</div>
      </section>

      {/* 右下方：评估列表 */}
      <section className="stg-eval">
        <div className="stg-eval-head">
          <span>舞台评估</span>
          <span className="status-text">
            {phase === 'idle' && '待开锣'}
            {phase === 'playing' && `评估中 ${activeItemCount}/${overallResult.items.length}`}
            {(phase === 'settling' || phase === 'finished') && '评估完毕'}
          </span>
        </div>
        <div className="stg-eval-list">
          {visibleItems.map((it, idx) => (
            <EvalRow key={idx} item={it} />
          ))}
        </div>
      </section>

      {/* 中央：分数环 + 开锣按钮 */}
      <div className="stg-center">
        <div className="stg-ring">
          <svg viewBox="0 0 240 240">
            <defs>
              <linearGradient id="stgRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#8e4a3a" />
                <stop offset="50%" stopColor="#c2787a" />
                <stop offset="100%" stopColor="#c9a86a" />
              </linearGradient>
            </defs>
            <circle
              className="stg-ring-bg"
              cx="120"
              cy="120"
              r={RING_RADIUS}
            />
            <circle
              className="stg-ring-fg"
              cx="120"
              cy="120"
              r={RING_RADIUS}
              strokeDasharray={RING_CIRC}
              strokeDashoffset={ringOffset}
            />
          </svg>
          <div className="stg-ring-center">
            <div className="stg-ring-num">
              {animScore}
              <span className="unit">分</span>
            </div>
            <div className="stg-ring-label">综合评分</div>
          </div>
        </div>

        <button
          className={`stg-open-btn ${
            phase === 'settling' ? 'stg-open-btn--settle' : ''
          } ${phase !== 'idle' ? 'stg-open-btn--disabled' : ''}`}
          onClick={handleStart}
          disabled={phase !== 'idle'}
        >
          {phase === 'idle' && '开 锣'}
          {phase === 'playing' && '演出中'}
          {phase === 'settling' && '评定'}
          {phase === 'finished' && (showGrade?.grade ?? '')}
        </button>
      </div>


      {/* 评级徽章已移至左侧排练房分数下方 */}



      {/* 结算奖励 */}
      {phase === 'finished' && showGrade && (
        <>
          <div className="stg-reward">
            <div className="stg-reward-item">
              <span className="stg-reward-label">宝钱</span>
              <span className="stg-reward-value">+{showGrade.reward.gold}</span>
            </div>
            <div className="stg-reward-item">
              <span className="stg-reward-label">口碑</span>
              <span className="stg-reward-value">+{showGrade.reward.reputation}</span>
            </div>
            <div className="stg-reward-item">
              <span className="stg-reward-label">传承</span>
              <span className="stg-reward-value">+{showGrade.reward.heritage}</span>
            </div>
            <div className="stg-reward-item">
              <span className="stg-reward-label">经验</span>
              <span className="stg-reward-value">+{showGrade.reward.exp}</span>
            </div>
          </div>
          <button className="stg-reward-back" onClick={onBack}>
            返回主页面
          </button>
        </>
      )}
    </div>
  )
}

// ============================================================
// 子组件：分数条
// ============================================================

function BarRow({ label, value }: { label: string; value: number }) {
  const v = Math.max(0, Math.min(100, value))
  const cls = v >= 80 ? 'good' : v >= 50 ? 'fair' : 'poor'
  return (
    <div className="stg-score-row">
      <span className="label">{label}</span>
      <div className="bar-track">
        <div
          className={`bar-fill bar-fill--${cls}`}
          style={{ width: `${v}%` }}
        />
      </div>
      <span className="num">{Math.round(v)}</span>
    </div>
  )
}

// ============================================================
// 子组件：评估项
// ============================================================

function EvalRow({ item }: { item: EvaluationItem & { active: boolean } }) {
  return (
    <div
      className={`stg-eval-row ${
        item.active ? `stg-eval-row--${item.status}` : ''
      }`}
    >
      <span className="stg-eval-dot" />
      <span className="stg-eval-label">{item.label}</span>
      <span className="stg-eval-value">
        {item.active ? item.value.toFixed(1) : '—'}
      </span>
    </div>
  )
}

// ============================================================
// 热度等级文案
// ============================================================

function popularityLabel(p: number): string {
  if (p >= 90) return '一票难求'
  if (p >= 70) return '门庭若市'
  if (p >= 50) return '热闹'
  if (p >= 30) return '尚可'
  if (p > 0) return '冷清'
  return '无人问津'
}
