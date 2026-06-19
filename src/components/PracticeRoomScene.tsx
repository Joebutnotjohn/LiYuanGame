import { useState, useCallback, useRef, useEffect } from 'react'
import { gameAssets } from '../game/assets'
import ResourceBar from './ResourceBar'
import GuideNPC from './GuideNPC'
import { getAchievementById, type Achievement } from '../game/gameData'
import {
  practiceTypes,
  initBodyTraining,
  initEmotionTraining,
  initNextRound,
  getNoteSpeed,
  PERFECT_RANGE,
  GOOD_RANGE,
  getBodyScorePerfect,
  BODY_SCORE_GOOD,
  BODY_SCORE_MISS,
  HOLD_SCORE_PER_SECOND,
  MAX_STAT,
  BODY_TOTAL_ROUNDS,
  calcScriptGain,
  evaluateRank,
  type PracticeType,
  type PracticeRoomProgress,
  type BodyTrainingState,
  type EmotionTrainingState,
  type RhythmNote,
  type EmotionChoice,
  type TrackIndex,
} from '../game/practiceRoomData'
import './PracticeRoomScene.css'

// ============================================
// Props
// ============================================

export interface PracticeRoomSceneProps {
  resources: {
    gold: number
    reputation: number
    heritage: number
    exp: number
    level: number
  }
  practiceProgress: PracticeRoomProgress
  onPracticeProgressChange: (
    next: PracticeRoomProgress | ((prev: PracticeRoomProgress) => PracticeRoomProgress),
  ) => void
  onBack: () => void
  onComplete: (result: {
    bodyGain: number
    emotionGain: number
    scriptGain: number
  }) => void
  /** 解锁成就回调，传入成就 ID */
  onUnlockAchievement?: (achievementId: string) => void
}

// ============================================
// 判定文本映射
// ============================================

const judgeLabels: Record<string, { text: string; cls: string }> = {
  perfect: { text: '完美！', cls: 'pr-judge-perfect' },
  good: { text: '不错', cls: 'pr-judge-good' },
  miss: { text: '失误', cls: 'pr-judge-miss' },
}

// ============================================
// 组件
// ============================================

export default function PracticeRoomScene({
  resources,
  practiceProgress,
  onPracticeProgressChange,
  onBack,
  onComplete,
  onUnlockAchievement,
}: PracticeRoomSceneProps) {
  // 本地 UI 状态
  const [judgePopup, setJudgePopup] = useState<{ text: string; cls: string; scoreAdd?: number } | null>(null)
  const [emotionFeedback, setEmotionFeedback] = useState<{
    effect: string
    label: string
    scoreAdd: number
  } | null>(null)
  const [trainingActive, setTrainingActive] = useState(false)
  const [trainingFinished, setTrainingFinished] = useState(false)
  // 身段训练：长按状态（track -> 是否正在被鼠标/触摸按住）
  const [holdingInput, setHoldingInput] = useState<Set<number>>(new Set())
  // 段位评价
  const [bodyRank, setBodyRank] = useState<ReturnType<typeof evaluateRank> | null>(null)
  // 引导语阶段
  const [guidePhase, setGuidePhase] = useState<'idle' | 'selected' | 'training' | 'round_end' | 'finished'>('idle')
  // 轮次切换过渡中（暂停游戏循环，给玩家缓冲时间）
  const [roundTransitioning, setRoundTransitioning] = useState(false)
  // 追踪已结算的模块：body / emotion
  const [settledModules, setSettledModules] = useState<Set<string>>(new Set())
  // 暂存本次训练中已结算的增益
  const pendingBodyGainRef = useRef(0)
  const pendingEmotionGainRef = useRef(0)
  // 成就弹窗状态
  const [achievementPopup, setAchievementPopup] = useState<Achievement | null>(null)
  // 追踪哪些成就已在本次会话中解锁（防止重复弹窗）
  const [unlockedAchievements, setUnlockedAchievements] = useState<Set<string>>(new Set())
  // 已解锁成就对应的金币奖励（用于展示）
  const [achievementGoldReward, setAchievementGoldReward] = useState(0)

  // 动画帧引用
  const animFrameRef = useRef<number>(0)
  const lastTimeRef = useRef<number>(0)
  const notesRef = useRef<RhythmNote[]>([])
  const holdingInputRef = useRef<Set<number>>(new Set())
  // 情绪训练：追踪上一个选择是否为完美匹配（用于连击加分）
  const lastEmotionPerfectRef = useRef<boolean>(false)

  // ---- 选择训练类型 ----
  const handleSelectType = useCallback(
    (type: PracticeType) => {
      onPracticeProgressChange((prev) => ({
        ...prev,
        selectedType: type,
        trainingCompleted: false,
      }))
      setTrainingActive(false)
      setTrainingFinished(false)
      setBodyRank(null)
      setGuidePhase('selected')
      // 如果正在结算阶段重新选择训练，不清除 settledModules
    },
    [onPracticeProgressChange],
  )

  // ---- 开始训练 ----
  const handleStartTraining = useCallback(() => {
    const t = practiceProgress.selectedType
    if (!t) return

    if (t === 'body') {
      const bodyState = initBodyTraining()
      notesRef.current = [...bodyState.notes]
      onPracticeProgressChange((prev) => ({
        ...prev,
        bodyTraining: bodyState,
        trainingCompleted: false,
      }))
      setTrainingActive(true)
      setTrainingFinished(false)
      setBodyRank(null)
      setHoldingInput(new Set())
      holdingInputRef.current = new Set()
      setGuidePhase('training')
      lastTimeRef.current = 0
      pendingBodyGainRef.current = 0
    } else {
      const emoState = initEmotionTraining()
      onPracticeProgressChange((prev) => ({
        ...prev,
        emotionTraining: emoState,
        trainingCompleted: false,
      }))
      setTrainingActive(true)
      setTrainingFinished(false)
      setGuidePhase('training')
      lastEmotionPerfectRef.current = false
      pendingEmotionGainRef.current = 0
    }
  }, [practiceProgress.selectedType, onPracticeProgressChange])

  // ---- 触发成就 ----
  const triggerAchievement = useCallback(
    (achievementId: string) => {
      // 防止重复弹窗
      if (unlockedAchievements.has(achievementId)) return

      const ach = getAchievementById(achievementId)
      if (!ach) return

      setUnlockedAchievements((prev) => new Set(prev).add(achievementId))
      setAchievementGoldReward(ach.goldReward)
      setAchievementPopup(ach)

      // 通知父组件解锁成就
      if (onUnlockAchievement) {
        onUnlockAchievement(achievementId)
      }

      // 5秒后自动关闭
      setTimeout(() => {
        setAchievementPopup(null)
        setAchievementGoldReward(0)
      }, 5000)
    },
    [unlockedAchievements, onUnlockAchievement],
  )

  // ---- 身段训练：游戏循环（多轨道 + 长按 + 变速）----
  useEffect(() => {
    if (!trainingActive || practiceProgress.selectedType !== 'body') return
    if (!practiceProgress.bodyTraining) return
    if (roundTransitioning) return

    const bt = practiceProgress.bodyTraining
    const isSequential = bt.sequentialMode

    let running = true

    const loop = (timestamp: number) => {
      if (!running) return

      if (lastTimeRef.current === 0) lastTimeRef.current = timestamp
      const dt = timestamp - lastTimeRef.current
      lastTimeRef.current = timestamp

      if (isSequential) {
        // 逐个出现模式：圆点不移动，仅检查是否全部完成
        onPracticeProgressChange((prev) => {
          if (!prev.bodyTraining) return prev
          const bt2 = prev.bodyTraining
          const allDone = bt2.notes.every((n) => n.result !== 'pending')
          if (allDone && !bt2.roundCompleted) {
            return {
              ...prev,
              bodyTraining: { ...bt2, roundCompleted: true },
              roundCompleted: true,
            }
          }
          return prev
        })
      } else {
        // 正常滚动模式（第一轮、第三轮）
        const heldTracks = holdingInputRef.current

        // 更新节奏点位置
        onPracticeProgressChange((prev) => {
          if (!prev.bodyTraining) return prev
          const bt2 = prev.bodyTraining

          // 本轮是否已经全部判定完毕
          const alreadyAllDone = bt2.notes.every((n) => n.result !== 'pending')

          // 处理长按判定 + 移动位置
          const updatedNotes = bt2.notes.map((n) => {
            // 已经判定完的 note：如果本轮已全部结束，让它们继续向右移动直到消失在画面外
            const speed = getNoteSpeed(bt2.trackCount)
            if (n.result !== 'pending') {
              if (alreadyAllDone) {
                const newPos = n.position + speed * n.speedMult * (dt / 16)
                return { ...n, position: newPos }
              }
              return n
            }

            // 如果该轨道正在被长按且该 note 是 hold 类型且在判定区内
            const judgePos = bt2.trackJudgePositions[n.track] ?? 50
            if (heldTracks.has(n.track) && n.kind === 'hold') {
              const dist = Math.abs(n.position - judgePos)
              if (dist <= GOOD_RANGE) {
                const newProgress = n.holdProgress + dt / 16
                if (newProgress >= n.holdDuration) {
                  // 长按完成 → perfect
                  return { ...n, holdProgress: n.holdDuration, result: 'perfect' as const }
                }
                return { ...n, holdProgress: newProgress }
              }
            }

            // 移动位置
            const newPos = n.position + speed * n.speedMult * (dt / 16)
            if (newPos > 100) {
              // 超出右侧：如果是 hold 且正在长按，仍判定
              if (n.kind === 'hold' && heldTracks.has(n.track) && n.holdProgress > 0) {
                if (n.holdProgress >= n.holdDuration * 0.7) {
                  return { ...n, position: 100, result: 'good' as const }
                }
              }
              return { ...n, position: 100, result: 'miss' as const }
            }
            return { ...n, position: newPos }
          })

          // 统计 miss 变化
          const newMissCount = updatedNotes.filter((n) => n.result === 'miss').length
          const oldMissCount = bt2.notes.filter((n) => n.result === 'miss').length

          // 计算本轮是否全部判定完毕
          const allDone = updatedNotes.every((n) => n.result !== 'pending')
          const doneMissCount = updatedNotes.filter((n) => n.result === 'miss').length

          // 检查是否所有 note 都已消失在画面右侧（position > 110）
          const allOffScreen = updatedNotes.every((n) => n.position > 110)

          // 只有当所有 note 都已判定完毕且全部消失在画面后才标记本轮完成
          const roundComplete = allDone && allOffScreen

          // miss 时重置连击
          const comboReset = newMissCount > oldMissCount ? 0 : bt2.combo

          return {
            ...prev,
            bodyTraining: {
              ...bt2,
              notes: updatedNotes,
              missCount: allDone ? doneMissCount : bt2.missCount + (newMissCount - oldMissCount),
              combo: comboReset,
              roundCompleted: roundComplete,
            },
            trainingCompleted: false,
            roundCompleted: roundComplete,
          }
        })
      }

      animFrameRef.current = requestAnimationFrame(loop)
    }

    animFrameRef.current = requestAnimationFrame(loop)
    return () => {
      running = false
      cancelAnimationFrame(animFrameRef.current)
    }
  }, [trainingActive, practiceProgress.selectedType, onPracticeProgressChange, roundTransitioning, practiceProgress.bodyTraining])

  // ---- 训练完成后的处理（检测本轮完成 → 显示提示）----
  useEffect(() => {
    if (practiceProgress.bodyTraining) {
      const bt = practiceProgress.bodyTraining

      if (bt.roundCompleted && !practiceProgress.trainingCompleted && !roundTransitioning) {
        // 显示「第N轮玩法已结束」提示，等待玩家点击按钮推进
        setRoundTransitioning(true)
      }
    }

    // 情绪训练完成
    if (practiceProgress.emotionTraining && practiceProgress.trainingCompleted && trainingActive) {
      setTrainingActive(false)
      setTrainingFinished(true)
      cancelAnimationFrame(animFrameRef.current)
      setGuidePhase('finished')
      // 触发「身临其境」成就
      triggerAchievement('immersed_in_role')
    }
  }, [practiceProgress.bodyTraining?.roundCompleted, practiceProgress.trainingCompleted, practiceProgress.bodyTraining, practiceProgress.emotionTraining, trainingActive, onPracticeProgressChange, roundTransitioning])

  // ---- 手动推进到下一轮 / 最终结算 ----
  const handleAdvanceRound = useCallback(() => {
    if (!practiceProgress.bodyTraining) return
    const bt = practiceProgress.bodyTraining

    if (bt.round < BODY_TOTAL_ROUNDS - 1) {
      // 推进到下一轮
      lastTimeRef.current = 0
      onPracticeProgressChange((prev) => {
        if (!prev.bodyTraining) return prev
        const nextState = initNextRound(prev.bodyTraining)
        notesRef.current = [...nextState.notes]
        return {
          ...prev,
          bodyTraining: nextState,
        }
      })
      setHoldingInput(new Set())
      holdingInputRef.current = new Set()
      setGuidePhase('training')
    } else {
      // 最后一轮完成，结算
      setTrainingActive(false)
      setTrainingFinished(true)
      cancelAnimationFrame(animFrameRef.current)
      onPracticeProgressChange((prev) => ({
        ...prev,
        trainingCompleted: true,
      }))
      setGuidePhase('finished')
      // 计算段位
      const totalNotes = bt.perfectCount + bt.goodCount + bt.missCount
      setBodyRank(evaluateRank(bt.score, bt.perfectCount, bt.goodCount, totalNotes, bt.round))
      // 触发「梨园新秀」成就
      triggerAchievement('liyuan_rookie')
    }
    setRoundTransitioning(false)
  }, [practiceProgress.bodyTraining, onPracticeProgressChange])

  // ---- 身段训练：点击/触摸判定（多轨道 tap）----
  // 判定逻辑：
  //   完美 = 金色线在圆点整体中心位置 (dist <= PERFECT_RANGE)
  //   不错 = 圆点部分与金色线接触 (PERFECT_RANGE < dist <= GOOD_RANGE)
  //   失误 = 圆点与金色线没有接触 (dist > GOOD_RANGE 或过早点击)
  const handleTrackInteraction = useCallback(
    (trackIdx: number, isPress: boolean) => {
      if (!practiceProgress.bodyTraining || !trainingActive) return

      const bt = practiceProgress.bodyTraining
      const judgePos = bt.trackJudgePositions[trackIdx] ?? 50
      const isSequential = bt.sequentialMode

      if (!isPress) {
        // 松开：仅在非逐个出现模式时处理（逐个出现模式无长按）
        if (isSequential) return
        const currentHolding = new Set(holdingInputRef.current)
        currentHolding.delete(trackIdx)
        holdingInputRef.current = currentHolding
        setHoldingInput(new Set(currentHolding))

        onPracticeProgressChange((prev) => {
          if (!prev.bodyTraining) return prev
          const bt3 = prev.bodyTraining
          const notes = bt3.notes

          // 检查是否有未完成的 hold note
          let missTriggered = false
          const updatedNotes = notes.map((n) => {
            if (
              n.track === trackIdx &&
              n.kind === 'hold' &&
              n.result === 'pending'
            ) {
              const dist = Math.abs(n.position - judgePos)
              if (dist <= GOOD_RANGE && n.holdProgress >= n.holdDuration * 0.7) {
                return { ...n, result: 'good' as const }
              } else if (dist <= GOOD_RANGE && n.holdProgress > 0) {
                missTriggered = true
                return { ...n, result: 'miss' as const }
              }
            }
            return n
          })

          // 检查全部完成
          const allDone = updatedNotes.every((n) => n.result !== 'pending')

          return {
            ...prev,
            bodyTraining: {
              ...bt3,
              notes: updatedNotes,
              missCount: bt3.missCount + (missTriggered ? 1 : 0),
              combo: missTriggered ? 0 : bt3.combo,
              holdingTracks: currentHolding as any,
            },
            roundCompleted: allDone,
          }
        })
        return
      }

      // 按下逻辑
      onPracticeProgressChange((prev) => {
        if (!prev.bodyTraining) return prev
        const bt2 = prev.bodyTraining

        if (isSequential) {
          // ====== 逐个出现模式：只处理当前活跃的圆点 ======
          const notes = bt2.notes
          const activeIdx = bt2.sequentialIndex

          // 找到当前活跃的 pending note
          const pendingNotes = notes
            .map((n, idx) => ({ n, idx }))
            .filter((item) => item.n.result === 'pending')

          if (pendingNotes.length === 0) return prev

          // 当前活跃的 note 是第一个 pending 的
          pendingNotes.sort((a, b) => a.idx - b.idx)
          const activeNote = pendingNotes[0]

          if (!activeNote) return prev

          let judgeResult: 'perfect' | 'good' | 'miss' = 'miss'
          let scoreAdd = 0
          const perfectScore = getBodyScorePerfect(bt2.round)
          const updatedNotes = [...notes]

          if (activeNote.n.track === trackIdx) {
            // 点击了正确的轨道 → 完美消除
            judgeResult = 'perfect'
            scoreAdd = perfectScore
          } else {
            // 点击了错误的轨道 → 失误
            judgeResult = 'miss'
            scoreAdd = BODY_SCORE_MISS
          }

          updatedNotes[activeNote.idx] = { ...activeNote.n, result: judgeResult }

          const newMissCount = judgeResult === 'miss' ? 1 : 0
          const comboAdd = judgeResult === 'miss' ? -bt2.combo : 1
          const allDone = updatedNotes.every((n) => n.result !== 'pending')

          const label = judgeLabels[judgeResult]
          setJudgePopup({ ...label, scoreAdd })
          setTimeout(() => setJudgePopup(null), 800)

          return {
            ...prev,
            bodyTraining: {
              ...bt2,
              notes: updatedNotes,
              score: bt2.score + scoreAdd,
              combo: comboAdd >= 0 ? bt2.combo + comboAdd : 0,
              maxCombo: Math.max(bt2.maxCombo, comboAdd >= 0 ? bt2.combo + comboAdd : bt2.maxCombo),
              perfectCount: bt2.perfectCount + (judgeResult === 'perfect' ? 1 : 0),
              goodCount: bt2.goodCount,
              missCount: bt2.missCount + newMissCount,
              bodyGain: bt2.bodyGain + scoreAdd,
              sequentialIndex: activeIdx + 1,
              roundCompleted: allDone,
            },
            stats: {
              ...prev.stats,
              body: Math.min(MAX_STAT, prev.stats.body + scoreAdd),
            },
            roundCompleted: allDone,
          }
        }

        // ====== 正常滚动模式 ======
        const notes = bt2.notes

        // 找到该轨道所有 pending 的 tap 型节奏点，选离判定线最近的那个
        const pendingTapNotes = notes
          .map((n, idx) => ({ n, idx }))
          .filter(
            (item) =>
              item.n.track === trackIdx &&
              item.n.kind === 'tap' &&
              item.n.result === 'pending',
          )

        // 按距离判定线的远近排序
        pendingTapNotes.sort(
          (a, b) =>
            Math.abs(a.n.position - judgePos) - Math.abs(b.n.position - judgePos),
        )

        const closestNote = pendingTapNotes[0] ?? null

        let updatedNotes = [...notes]
        let scoreAdd = 0
        let perfectAdd = 0
        let goodAdd = 0
        let missAdd = 0
        let comboAdd = 0
        let judgeResult: 'perfect' | 'good' | 'miss' | null = null

        if (closestNote) {
          const dist = Math.abs(closestNote.n.position - judgePos)
          const perfectScore = getBodyScorePerfect(bt2.round)

          if (dist <= PERFECT_RANGE) {
            // 完美：金色线在圆点整体中心位置
            judgeResult = 'perfect'
            scoreAdd = perfectScore
          } else if (dist <= GOOD_RANGE) {
            // 不错：圆点部分与金色线接触
            judgeResult = 'good'
            scoreAdd = BODY_SCORE_GOOD
          } else {
            // 失误：圆点与金色线没有接触（点击过早）
            judgeResult = 'miss'
            scoreAdd = BODY_SCORE_MISS
          }

          updatedNotes = updatedNotes.map((n, i) =>
            i === closestNote.idx ? { ...n, result: judgeResult! } : n,
          )

          if (judgeResult === 'perfect') perfectAdd = 1
          else if (judgeResult === 'good') goodAdd = 1
          else missAdd = 1
          comboAdd = judgeResult === 'miss' ? -bt2.combo : 1

          const label = judgeLabels[judgeResult]
          setJudgePopup({ ...label, scoreAdd })
          setTimeout(() => setJudgePopup(null), 800)
        }

        // 更新长按状态
        const newHolding = new Set(holdingInputRef.current)
        newHolding.add(trackIdx)
        holdingInputRef.current = newHolding
        setHoldingInput(new Set(newHolding))

        // 检查全部完成
        const allDone = updatedNotes.every((n) => n.result !== 'pending')

        return {
          ...prev,
          bodyTraining: {
            ...bt2,
            notes: updatedNotes,
            score: bt2.score + scoreAdd,
            combo: comboAdd >= 0 ? bt2.combo + comboAdd : 0,
            maxCombo: Math.max(bt2.maxCombo, comboAdd >= 0 ? bt2.combo + comboAdd : bt2.maxCombo),
            perfectCount: bt2.perfectCount + perfectAdd,
            goodCount: bt2.goodCount + goodAdd,
            missCount: bt2.missCount + missAdd,
            bodyGain: bt2.bodyGain + scoreAdd,
            holdingTracks: newHolding as any,
          },
          // 实时更新右侧身段值
          stats: {
            ...prev.stats,
            body: Math.min(MAX_STAT, prev.stats.body + scoreAdd),
          },
          roundCompleted: allDone,
        }
      })
    },
    [practiceProgress.bodyTraining, trainingActive, onPracticeProgressChange],
  )

  // ---- 情绪训练：选择情绪 ----
  // 得分规则：
  //   完美匹配 → 基础+10分；若前一个也是完美匹配则连击+15分
  //   不太对   → +7分
  //   不对     → 0分
  const handleEmotionChoice = useCallback(
    (choice: EmotionChoice) => {
      if (!practiceProgress.emotionTraining || !trainingActive) return

      // 计算实际得分
      let actualScoreGain = choice.scoreGain
      if (choice.match === 'perfect') {
        if (lastEmotionPerfectRef.current) {
          // 前一个也是完美 → 连击加分 15
          actualScoreGain = 15
        } else {
          // 首次或前一个不是完美 → 基础 10
          actualScoreGain = 10
        }
        lastEmotionPerfectRef.current = true
      } else {
        // 非完美选择，重置连击
        lastEmotionPerfectRef.current = false
      }

      setEmotionFeedback({
        effect: choice.visualEffect,
        label:
          choice.match === 'perfect'
            ? actualScoreGain === 15
              ? '完美连击!'
              : '完美匹配'
            : choice.match === 'partial'
              ? '不太对'
              : '不对',
        scoreAdd: actualScoreGain,
      })
      setTimeout(() => setEmotionFeedback(null), 1500)

      onPracticeProgressChange((prev) => {
        if (!prev.emotionTraining) return prev

        const nextIdx = prev.emotionTraining.currentScenarioIndex + 1
        const allDone = nextIdx >= prev.emotionTraining.totalCount

        return {
          ...prev,
          emotionTraining: {
            ...prev.emotionTraining,
            score: prev.emotionTraining.score + actualScoreGain,
            emotionGain: prev.emotionTraining.emotionGain + actualScoreGain,
            currentScenarioIndex: allDone ? prev.emotionTraining.currentScenarioIndex : nextIdx,
            completedCount: prev.emotionTraining.completedCount + 1,
          },
          // 实时更新右侧情绪感染力值
          stats: {
            ...prev.stats,
            emotionPower: Math.min(MAX_STAT, prev.stats.emotionPower + actualScoreGain),
          },
          trainingCompleted: allDone,
        }
      })
    },
    [practiceProgress.emotionTraining, trainingActive, onPracticeProgressChange],
  )

  // ---- 返回主页（重置所有本地状态）----
  const handleBackToMain = useCallback(() => {
    setSettledModules(new Set())
    pendingBodyGainRef.current = 0
    pendingEmotionGainRef.current = 0
    setTrainingActive(false)
    setTrainingFinished(false)
    setBodyRank(null)
    setGuidePhase('idle')
    onBack()
  }, [onBack])

  // ---- 结算单个模块的训练结果（数值已在每次判定时实时更新，此处仅记录最终增益并清理状态）----
  const handleSettleModule = useCallback(
    (module: 'body' | 'emotion') => {
      if (module === 'body') {
        const bodyGain = practiceProgress.bodyTraining?.bodyGain ?? 0
        pendingBodyGainRef.current = bodyGain
        // 仅清理训练状态，stats 已在实时判定中累加
        onPracticeProgressChange((prev) => ({
          ...prev,
          bodyTraining: null,
          trainingCompleted: false,
          selectedType: null,
        }))
        setSettledModules((prev) => new Set(prev).add('body'))
        setBodyRank(null)
      } else {
        const emotionGain = practiceProgress.emotionTraining?.emotionGain ?? 0
        pendingEmotionGainRef.current = emotionGain
        // 仅清理训练状态，stats 已在实时判定中累加
        onPracticeProgressChange((prev) => ({
          ...prev,
          emotionTraining: null,
          trainingCompleted: false,
          selectedType: null,
        }))
        setSettledModules((prev) => new Set(prev).add('emotion'))
      }

      setTrainingActive(false)
      setTrainingFinished(false)
      setGuidePhase('idle')
    },
    [practiceProgress.bodyTraining, practiceProgress.emotionTraining, onPracticeProgressChange],
  )

  // ---- 结束训练，回到主页 ----
  const handleFinishTraining = useCallback(() => {
    const bodyGain = pendingBodyGainRef.current
    const emotionGain = pendingEmotionGainRef.current
    const scriptGain = calcScriptGain(bodyGain, emotionGain)

    // 仅写入台词理解（身段、情绪已在实时判定中累加）
    onPracticeProgressChange((prev) => ({
      ...prev,
      stats: {
        ...prev.stats,
        script: Math.min(MAX_STAT, prev.stats.script + scriptGain),
      },
      bodyTraining: null,
      emotionTraining: null,
      trainingCompleted: false,
      trainingRounds: prev.trainingRounds + 1,
    }))

    setSettledModules(new Set())
    pendingBodyGainRef.current = 0
    pendingEmotionGainRef.current = 0
    setTrainingActive(false)
    setTrainingFinished(false)
    setBodyRank(null)
    setGuidePhase('idle')

    onComplete({ bodyGain, emotionGain, scriptGain })
  }, [onPracticeProgressChange, onComplete])

  // ---- 实时引导语生成 ----
  function getGuideText(): string {
    const typeName = currentType?.name ?? ''
    const bt = practiceProgress.bodyTraining

    switch (guidePhase) {
      case 'idle':
        // 两个模块都结算完毕
        if (settledModules.has('body') && settledModules.has('emotion')) {
          return '身段训练、情绪训练都已完成！点击下方"完成训练"结算奖励，回到主页面吧~'
        }
        // 只有一个模块结算完毕
        if (settledModules.has('body')) {
          return '身段训练已完成！接下来从左侧选择"情绪训练"，继续揣摩角色心情吧~'
        }
        if (settledModules.has('emotion')) {
          return '情绪训练已完成！接下来从左侧选择"身段训练"，继续磨练基本功吧~'
        }
        return '欢迎来到排练房~先从左侧选择一项训练吧！身段训练练基本功，情绪训练揣摩角色心情。'
      case 'selected':
        if (practiceProgress.selectedType === 'body') {
          return `已选择「${typeName}」~点击下方"开始训练"按钮，跟随节奏点击圆点，磨练手眼身法步！共${BODY_TOTAL_ROUNDS}轮难度递进哦。`
        }
        return `已选择「${typeName}」~点击下方"开始训练"按钮，阅读《霸王别姬》经典场景，选出最贴合的情绪吧！`
      case 'training':
        if (practiceProgress.selectedType === 'body' && bt) {
          if (bt.trackCount === 1) {
            return '第一轮单轨热身~看到金色圆点到达判定线时点击轨道即可！（●圆点=点击一次，■方框=长按不放）'
          } else if (bt.trackCount === 2) {
            const hasHold = bt.notes.some((n) => n.kind === 'hold' && n.result === 'pending')
            if (hasHold) {
              return '第二轮双轨来咯~注意！红色方框是长按型节奏点，需要按住不放直到它消失！'
            }
            return '第二轮双轨挑战~两条轨道同时有节奏点，眼观两路，手要快！'
          } else {
            const hasHold = bt.notes.some((n) => n.kind === 'hold' && n.result === 'pending')
            if (hasHold) {
              return '第三轮三轨终极考验！板眼节奏有快有慢，长按点更要稳住~加油！'
            }
            return '第三轮三轨巅峰挑战！节奏变化多端，眼明手快方能游刃有余！'
          }
        }
        if (practiceProgress.selectedType === 'emotion') {
          return `正在进行「${typeName}」~仔细阅读场景描述，体会角色心境，选择最贴合的情绪！`
        }
        return '训练进行中，加油！'
      case 'round_end':
        if (bt) {
          const nextRound = bt.round + 1
          if (nextRound < BODY_TOTAL_ROUNDS) {
            const trackHints = ['单轨热身', '双轨挑战', '三轨巅峰']
            return `第${bt.round + 1}轮完成！接下来是第${nextRound + 1}轮「${trackHints[nextRound]}」，准备好了吗？`
          }
        }
        return '本轮完成！'
      case 'finished':
        if (practiceProgress.selectedType === 'body' && bodyRank) {
          return `训练结束！你获得了「${bodyRank.title}」评价——${bodyRank.description}。点击"结束身段训练"结算，然后可以继续做情绪训练~`
        }
        if (practiceProgress.selectedType === 'emotion') {
          return '情绪训练全部完成！点击"结束情绪训练"结算，然后可以继续做身段训练~'
        }
        return '训练完成！点击下方按钮结算本次训练成果~'
      default:
        return '请从左侧选择一项训练开始吧~'
    }
  }

  // ---- 渲染帮助函数 ----
  const currentType = practiceTypes.find((t) => t.id === practiceProgress.selectedType)
  const { stats } = practiceProgress
  const guideText = getGuideText()

  return (
    <div className="pr-overlay">
      <div className="pr-scene">
        {/* 背景层 */}
        <div
          className="pr-bg"
          style={{ backgroundImage: `url(${gameAssets.practiceRoom.bg})` }}
        />

        {/* 顶部 Header */}
        <div className="pr-header">
          <button className="pr-btn-back" onClick={handleBackToMain}>
            ← 返回主页面
          </button>
          <div className="pr-header-title-group">
            <h1 className="pr-header-title">排练房</h1>
            <p className="pr-header-subtitle">台上一分钟，台下十年功</p>
          </div>
          <ResourceBar resources={resources} />
        </div>

        {/* 导引 NPC - 左下角 */}
        <div className="pr-guide-area">
          <GuideNPC
            activeTaskId="practice"
            tasks={[]}
            variant="practice"
            customText={guideText}
          />
        </div>

        {/* 主内容区：三栏布局 */}
        <div className="pr-main">
          {/* 左侧：训练选择区 + 剧本梗概 */}
          <div className="pr-left">
            <h3 className="pr-panel-title">训练选择</h3>
            <div className="pr-type-list">
              {practiceTypes.map((pt) => {
                const isSelected = practiceProgress.selectedType === pt.id
                const isSettled = settledModules.has(pt.id)
                return (
                  <button
                    key={pt.id}
                    className={`pr-type-card ${isSelected ? 'pr-type-card--active' : ''} ${isSettled ? 'pr-type-card--done' : ''}`}
                    onClick={() => handleSelectType(pt.id)}
                    disabled={trainingActive || isSettled}
                  >
                    <div className="pr-type-info">
                      <span className="pr-type-name">
                        {pt.name}
                        {isSettled && <span className="pr-type-done-badge"> ✓ 已完成</span>}
                      </span>
                      <span className="pr-type-desc">{pt.description}</span>
                    </div>
                  </button>
                )
              })}
            </div>

            {/* 情绪训练时显示霸王别姬剧本梗概 */}
            {currentType?.id === 'emotion' && (
              <div className="pr-script-synopsis">
                <h4 className="pr-synopsis-title">《霸王别姬》梗概</h4>
                <div className="pr-synopsis-content">
                  <p>秦末，西楚霸王项羽与汉王刘邦争夺天下。垓下一战，项羽兵困粮绝，汉军四面唱起楚歌，楚军军心涣散。</p>
                  <p>帐中，爱妃虞姬陪伴左右。项羽自知大势已去，慷慨悲歌："力拔山兮气盖世，时不利兮骓不逝。"</p>
                  <p>虞姬拔剑起舞，以慰霸王。舞罢，她毅然自刎，以绝项羽后顾之忧。霸王突围至乌江，自觉无颜见江东父老，亦自刎而亡。</p>
                  <p>此剧以"帐中诀别""剑舞""四面楚歌""霸王卸甲"等经典场景，演绎了英雄末路与美人殉情的千古绝唱。</p>
                </div>
              </div>
            )}
          </div>

          {/* 中间：训练交互区 */}
          <div className="pr-center">
            {!currentType && (
              <div className="pr-placeholder">
                <p>请从左侧选择一项训练开始</p>
              </div>
            )}

            {/* 身段训练 */}
            {currentType?.id === 'body' && (
              <div className="pr-body-training">
                <div className="pr-body-header">
                  <h3>身段训练 · 节奏点击</h3>
                  <div className="pr-body-header-right">
                    {/* 符号说明（非逐个出现模式时才显示长按说明） */}
                    {practiceProgress.bodyTraining && practiceProgress.bodyTraining.trackCount >= 2 && !practiceProgress.bodyTraining.sequentialMode && (
                      <span className="pr-note-legend">
                        <span className="pr-note-legend-item">
                          <span className="pr-note-legend-dot" /> 点击
                        </span>
                        <span className="pr-note-legend-item">
                          <span className="pr-note-legend-hold" /> 长按
                        </span>
                      </span>
                    )}
                    {practiceProgress.bodyTraining && (
                      <span className="pr-round-badge">
                        第{practiceProgress.bodyTraining.round + 1}/{BODY_TOTAL_ROUNDS}轮 · {practiceProgress.bodyTraining.trackCount}轨
                      </span>
                    )}
                    {practiceProgress.bodyTraining && trainingActive && (
                      <span className="pr-combo">
                        连击 ×{practiceProgress.bodyTraining.combo}
                      </span>
                    )}
                  </div>
                </div>

                {/* 多轨道节奏区 */}
                <div className="pr-multi-track-area">
                  {/* 轮次完成提示 */}
                  {roundTransitioning && practiceProgress.bodyTraining && (
                    <div className="pr-round-transition">
                      <span className="pr-round-transition-text">
                        第{practiceProgress.bodyTraining.round + 1}轮玩法已结束
                      </span>
                      <button
                        className="pr-round-transition-btn"
                        onClick={handleAdvanceRound}
                      >
                        {practiceProgress.bodyTraining.round < BODY_TOTAL_ROUNDS - 1
                          ? `进入第${practiceProgress.bodyTraining.round + 2}轮`
                          : '结束训练'
                        }
                      </button>
                    </div>
                  )}
                  {practiceProgress.bodyTraining && (
                    <div className="pr-tracks-container">
                      {Array.from({ length: practiceProgress.bodyTraining.trackCount }).map((_, tIdx) => {
                        const bt = practiceProgress.bodyTraining!
                        const judgePos = bt.trackJudgePositions[tIdx] ?? 50
                        const allTrackNotes = bt.notes.filter((n) => n.track === tIdx)
                        const isSequential = bt.sequentialMode
                        const isHolding = holdingInput.has(tIdx)

                        // 逐个出现模式：只显示第一个待判定的圆点（全轨道只有一个）
                        const visibleNotes = isSequential
                          ? (() => {
                              const firstPending = bt.notes.find((n) => n.result === 'pending')
                              if (!firstPending || firstPending.track !== tIdx) return []
                              return [firstPending]
                            })()
                          : allTrackNotes.filter((n) => n.position <= 110)

                        return (
                          <div
                            key={tIdx}
                            className={`pr-track-row ${isHolding && !isSequential ? 'pr-track-row--holding' : ''}`}
                            onMouseDown={(e) => {
                              e.preventDefault()
                              handleTrackInteraction(tIdx, true)
                            }}
                            onMouseUp={(e) => {
                              e.preventDefault()
                              handleTrackInteraction(tIdx, false)
                            }}
                            onMouseLeave={(e) => {
                              // 如果正在长按此轨道，松开
                              if (holdingInputRef.current.has(tIdx)) {
                                handleTrackInteraction(tIdx, false)
                              }
                            }}
                            onTouchStart={(e) => {
                              e.preventDefault()
                              handleTrackInteraction(tIdx, true)
                            }}
                            onTouchEnd={(e) => {
                              e.preventDefault()
                              handleTrackInteraction(tIdx, false)
                            }}
                          >
                            {/* 轨道背景线 */}
                            <div className="pr-track-bg-line" />

                            {/* 判定区域 */}
                            <div
                              className="pr-judge-zone"
                              style={{ left: `${judgePos}%` }}
                            >
                              <div className="pr-judge-line" />
                              <span className="pr-judge-label">{tIdx === 0 ? (isSequential ? '点击' : '点击/按住') : ''}</span>
                            </div>

                            {/* 节奏点 */}
                            {visibleNotes
                              .map((note) => (
                              <div
                                key={note.id}
                                className={`pr-note pr-note--${note.result} ${note.kind === 'hold' ? 'pr-note--hold' : ''} ${isSequential ? 'pr-note--sequential' : ''}`}
                                style={{
                                  left: `${note.position}%`,
                                  opacity: note.result === 'miss' || note.position > 100 ? 0 : 1,
                                }}
                              >
                                {/* 长按进度条 */}
                                {note.kind === 'hold' && note.result === 'pending' && note.holdProgress > 0 && (
                                  <div
                                    className="pr-note-hold-progress"
                                    style={{
                                      width: `${(note.holdProgress / note.holdDuration) * 100}%`,
                                    }}
                                  />
                                )}
                              </div>
                            ))}
                          </div>
                        )
                      })}

                      {/* 判定弹窗 */}
                      {judgePopup && (
                        <div className={`pr-judge-popup ${judgePopup.cls}`}>
                          <span className="pr-judge-popup-label">{judgePopup.text}</span>
                          {judgePopup.scoreAdd !== undefined && judgePopup.scoreAdd > 0 && (
                            <span className="pr-judge-popup-score">+{judgePopup.scoreAdd}</span>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 得分统计 */}
                {practiceProgress.bodyTraining && (
                  <div className="pr-body-stats">
                    <span className="pr-stat">
                      完美：<strong>{practiceProgress.bodyTraining.perfectCount}</strong>
                    </span>
                    <span className="pr-stat">
                      不错：<strong>{practiceProgress.bodyTraining.goodCount}</strong>
                    </span>
                    <span className="pr-stat">
                      失误：<strong>{practiceProgress.bodyTraining.missCount}</strong>
                    </span>
                    <span className="pr-stat">
                      最高连击：<strong>{practiceProgress.bodyTraining.maxCombo}</strong>
                    </span>
                    <span className="pr-stat">
                      得分：<strong>{practiceProgress.bodyTraining.score}</strong>
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* 情绪训练 */}
            {currentType?.id === 'emotion' && (
              <div className={`pr-emotion-training pr-emotion--${emotionFeedback?.effect ?? ''}`}>
                <div className="pr-emotion-header">
                  <h3>情绪训练 · 剧情理解</h3>
                  {practiceProgress.emotionTraining && trainingActive && (
                    <span className="pr-progress-text">
                      {practiceProgress.emotionTraining.completedCount + 1} /{' '}
                      {practiceProgress.emotionTraining.totalCount}
                    </span>
                  )}
                </div>

                {/* 场景描述 */}
                {practiceProgress.emotionTraining &&
                  !practiceProgress.trainingCompleted && (
                    <div className="pr-scenario">
                      <h4 className="pr-scenario-title">
                        {practiceProgress.emotionTraining.scenarios[
                          practiceProgress.emotionTraining.currentScenarioIndex
                        ]?.title ?? ''}
                      </h4>
                      <p className="pr-scenario-desc">
                        {practiceProgress.emotionTraining.scenarios[
                          practiceProgress.emotionTraining.currentScenarioIndex
                        ]?.description ?? ''}
                      </p>
                      <p className="pr-scenario-atmosphere">
                        氛围：{practiceProgress.emotionTraining.scenarios[
                          practiceProgress.emotionTraining.currentScenarioIndex
                        ]?.atmosphere ?? ''}
                      </p>
                    </div>
                  )}

                {/* 选择按钮 */}
                {practiceProgress.emotionTraining &&
                  !practiceProgress.trainingCompleted &&
                  practiceProgress.emotionTraining.scenarios[
                    practiceProgress.emotionTraining.currentScenarioIndex
                  ]?.choices.map((choice, idx) => (
                    <button
                      key={idx}
                      className="pr-emotion-choice"
                      onClick={() => handleEmotionChoice(choice)}
                    >
                      {choice.text}
                    </button>
                  ))}

                {/* 已完成提示 */}
                {practiceProgress.emotionTraining &&
                  practiceProgress.trainingCompleted && (
                    <div className="pr-scenario-complete">
                      <p>所有场景已过完！</p>
                      <p className="pr-scenario-complete-sub">
                        情绪理解得分：{practiceProgress.emotionTraining.score}
                      </p>
                    </div>
                  )}

                {/* 情绪反馈覆盖 */}
                {emotionFeedback && (
                  <div className={`pr-emotion-feedback pr-emotion-feedback--${emotionFeedback.effect}`}>
                    <span className="pr-emotion-feedback-label">{emotionFeedback.label}</span>
                    {emotionFeedback.scoreAdd > 0 && (
                      <span className="pr-emotion-feedback-score">+{emotionFeedback.scoreAdd}</span>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 训练完成结算 */}
            {trainingFinished && practiceProgress.selectedType && (
              <div className="pr-settle">
                <h4>训练完成！</h4>

                {/* 段位评价 */}
                {bodyRank && (
                  <div className="pr-rank-display" style={{ borderColor: bodyRank.color }}>
                    <div className="pr-rank-badge" style={{ background: bodyRank.color }}>
                      {bodyRank.rank}
                    </div>
                    <div className="pr-rank-info">
                      <span className="pr-rank-title" style={{ color: bodyRank.color }}>{bodyRank.title}</span>
                      <span className="pr-rank-desc">{bodyRank.description}</span>
                    </div>
                  </div>
                )}

                {practiceProgress.bodyTraining && (
                  <div className="pr-settle-detail">
                    <p>
                      身段得分：<strong>{practiceProgress.bodyTraining.score}</strong>
                      <span className="pr-settle-gain">
                        （身段 +{practiceProgress.bodyTraining.bodyGain}）
                      </span>
                    </p>
                    <p>
                      完美 {practiceProgress.bodyTraining.perfectCount} · 不错{' '}
                      {practiceProgress.bodyTraining.goodCount} · 失误{' '}
                      {practiceProgress.bodyTraining.missCount} · 最高连击{' '}
                      {practiceProgress.bodyTraining.maxCombo}
                    </p>
                  </div>
                )}
                {practiceProgress.emotionTraining && (
                  <div className="pr-settle-detail">
                    <p>
                      情绪感染力得分：<strong>{practiceProgress.emotionTraining.score}</strong>
                      <span className="pr-settle-gain">
                        （情绪感染力 +{practiceProgress.emotionTraining.emotionGain}）
                      </span>
                    </p>
                  </div>
                )}
                <button
                  className="pr-btn-settle"
                  onClick={() => {
                    if (practiceProgress.bodyTraining) {
                      handleSettleModule('body')
                    } else if (practiceProgress.emotionTraining) {
                      handleSettleModule('emotion')
                    }
                  }}
                >
                  {practiceProgress.bodyTraining ? '结束身段训练' : '结束情绪训练'}
                </button>
              </div>
            )}

            {/* 全局结算按钮：两个模块均已结算后显示 */}
            {!trainingActive && !trainingFinished && !practiceProgress.selectedType && settledModules.size > 0 && (
              <div className="pr-settle pr-settle--final">
                <h4>排练总结</h4>
                <div className="pr-settle-detail">
                  {settledModules.has('body') && (
                    <p>身段训练已完成 ✓（身段 +{pendingBodyGainRef.current}）</p>
                  )}
                  {settledModules.has('emotion') && (
                    <p>情绪训练已完成 ✓（情绪感染力 +{pendingEmotionGainRef.current}）</p>
                  )}
                  <p className="pr-settle-script-hint">
                    台词理解 +{calcScriptGain(pendingBodyGainRef.current, pendingEmotionGainRef.current)}
                  </p>
                </div>
                <button className="pr-btn-settle" onClick={handleFinishTraining}>
                  结束训练
                </button>
              </div>
            )}
          </div>

          {/* 右侧：角色状态面板 */}
          <div className="pr-right">
            <h3 className="pr-panel-title">角色状态</h3>

            {/* 身段值 */}
            <div className="pr-stat-bar-group">
              <div className="pr-stat-bar-label">
                <span>身段</span>
                <span>{stats.body}/{MAX_STAT}</span>
              </div>
              <div className="pr-stat-bar-track">
                <div
                  className="pr-stat-bar-fill pr-stat-bar-fill--body"
                  style={{ width: `${(stats.body / MAX_STAT) * 100}%` }}
                />
              </div>
            </div>

            {/* 情绪感染力 */}
            <div className="pr-stat-bar-group">
              <div className="pr-stat-bar-label">
                <span>情绪感染力</span>
                <span>{stats.emotionPower}/{MAX_STAT}</span>
              </div>
              <div className="pr-stat-bar-track">
                <div
                  className="pr-stat-bar-fill pr-stat-bar-fill--emotion"
                  style={{ width: `${(stats.emotionPower / MAX_STAT) * 100}%` }}
                />
              </div>
            </div>

            {/* 台词理解 */}
            <div className="pr-stat-bar-group">
              <div className="pr-stat-bar-label">
                <span>台词理解</span>
                <span>{stats.script}/{MAX_STAT}</span>
              </div>
              <div className="pr-stat-bar-track">
                <div
                  className="pr-stat-bar-fill pr-stat-bar-fill--script"
                  style={{ width: `${(stats.script / MAX_STAT) * 100}%` }}
                />
              </div>
            </div>

            {/* 数值说明 */}
            <div className="pr-stats-hint">
              <p>训练中获得的数值将影响戏台演出表现。</p>
              <p>数值越高，演出效果越好，观众评价越佳。</p>
            </div>
          </div>
        </div>

        {/* 底部控制区 */}
        <div className="pr-footer">
          <button className="pr-btn-secondary" onClick={handleBackToMain}>
            返回后台
          </button>

          {currentType && !trainingActive && !trainingFinished && !settledModules.has(currentType.id) && (
            <button className="pr-btn-primary" onClick={handleStartTraining}>
              开始训练
            </button>
          )}

          {trainingActive && (
            <div className="pr-training-hint">训练进行中...</div>
          )}

          {/* 两个训练模块都结算后，显示「结束所有训练」按钮 */}
          {!trainingActive && settledModules.has('body') && settledModules.has('emotion') && (
            <button className="pr-btn-primary" onClick={handleFinishTraining}>
              结束所有训练
            </button>
          )}

          {/* 已结算一个模块，未选新训练时，引导选择另一个 */}
          {!trainingActive && !trainingFinished && !practiceProgress.selectedType && settledModules.size === 1 && !settledModules.has('emotion') && (
            <div className="pr-training-hint">情绪训练还未完成，请从左侧选择~</div>
          )}
          {!trainingActive && !trainingFinished && !practiceProgress.selectedType && settledModules.size === 1 && !settledModules.has('body') && (
            <div className="pr-training-hint">身段训练还未完成，请从左侧选择~</div>
          )}
        </div>

        {/* 成就解锁弹窗 */}
        {achievementPopup && (
          <div className="pr-achievement-overlay" onClick={() => { setAchievementPopup(null); setAchievementGoldReward(0) }}>
            <div className="pr-achievement-bubble" onClick={(e) => e.stopPropagation()}>
              <div className="pr-achievement-gold-text">达成新的成就!</div>
              <div className="pr-achievement-name-tag">{achievementPopup.name}</div>
              <div className="pr-achievement-desc">{achievementPopup.description}</div>
              {achievementPopup.cultureNote && (
                <div className="pr-achievement-culture">
                  <span className="pr-achievement-culture-label">文化小知识</span>
                  <p>{achievementPopup.cultureNote}</p>
                </div>
              )}
              {achievementGoldReward > 0 && (
                <div className="pr-achievement-reward">+{achievementGoldReward} 宝钱</div>
              )}
              <p className="pr-achievement-hint">点击任意处关闭（5秒后自动消失）</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
