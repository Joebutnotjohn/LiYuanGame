import { useState, useCallback, useRef } from 'react'
import { gameAssets } from '../game/assets'
import {
  rooms,
  initialTasks,
  initialActors,
  resources,
  getLevelByExp,
  roomRewards,
  initialAchievements,
  type GameTask,
  type ActorState,
  type RoomReward,
  type Achievement,
} from '../game/gameData'
import {
  createInitialTicketProgress,
  type TicketOfficeProgress,
} from '../game/ticketOfficeData'
import {
  createDefaultBackstageProgress,
  type BackstageProgress,
} from '../game/backstageData'
import {
  createInitialMakeupProgress,
  type MakeupRoomProgress,
} from '../game/makeupRoomData'
import {
  createInitialPracticeProgress,
  type PracticeRoomProgress,
  type CharacterStats,
} from '../game/practiceRoomData'
import ResourceBar from './ResourceBar'
import SideTaskPanel from './SideTaskPanel'
import TaskBar, { type RoomId } from './TaskBar'
import TicketOfficeScene from './TicketOfficeScene'
import BackstageScene from './BackstageScene'
import MakeupRoomScene from './MakeupRoomScene'
import PracticeRoomScene from './PracticeRoomScene'
import GuideNPC from './GuideNPC'
import ChatBubbleOverlay, {
  type ChatMessage,
} from './ChatBubbleOverlay'
import StageScene from './StageScene'
import { type StageGrade } from '../game/stageData'
import {
  actorDialogueData,
  matchActorResponse,
  type ActorId,
} from '../game/actorDialogueData'
import { audioManager } from '../game/AudioManager'
import { useBGM, useClickSound } from '../game/useAudio'
import './GameScene.css'

type Scene = 'main' | 'ticketOffice' | 'backstage' | 'makeupRoom' | 'practiceRoom' | 'stage'

/** 箭头图标组件：加载失败时隐藏 */
function ArrowImg() {
  return (
    <img
      className="arrow-icon-img"
      src={gameAssets.icons.arrow}
      alt="指引箭头"
      onError={(e) => {
        (e.currentTarget as HTMLImageElement).style.display = 'none'
      }}
    />
  )
}

/** PNG 图标组件：加载失败时回退 emoji */
function PngIcon({ src, alt, fallback }: { src: string; alt: string; fallback: string }) {
  return (
    <img
      className="corner-btn-png"
      src={src}
      alt={alt}
      draggable={false}
      onError={(e) => {
        const el = e.currentTarget as HTMLImageElement
        el.style.display = 'none'
        const fb = el.nextElementSibling as HTMLElement | null
        if (fb) fb.style.display = 'flex'
      }}
    />
  )
}

/**
 * 根据完成的任务 ID，更新演员状态
 * 规则：
 *  - 完成化妆间 → 程小婉 ready（已定妆）
 *  - 完成练功房 → 裴云飞 ready（已排练）
 *  - 完成戏台   → 全员 ready（已开锣）
 */
function deriveActorsAfterDone(
  prevActors: ActorState[],
  doneTaskId: GameTask['id'],
): ActorState[] {
  return prevActors.map((a) => {
    if (doneTaskId === 'stage') {
      return { ...a, status: 'ready' as const, statusText: '已开锣' }
    }
    if (doneTaskId === 'makeup' && a.id === 'cheng_xiaowan') {
      return { ...a, status: 'ready' as const, statusText: '已定妆' }
    }
    if (doneTaskId === 'practice' && a.id === 'pei_yunfei') {
      return { ...a, status: 'ready' as const, statusText: '已排练' }
    }
    return a
  })
}

export default function GameScene() {
  const [scene, setScene] = useState<Scene>('main')
  const [tasks, setTasks] = useState<GameTask[]>(initialTasks)
  const [actors, setActors] = useState<ActorState[]>(initialActors)
  const [activeTask, setActiveTask] = useState<RoomId | null>(null)
  const [selectedRoom, setSelectedRoom] = useState<RoomId | null>(null)
  const [cornerPopup, setCornerPopup] = useState<'journal' | 'achievement' | null>(null)
  const [gold, setGold] = useState(resources.gold)
  const [reputation, setReputation] = useState(resources.reputation)
  const [heritage, setHeritage] = useState(resources.heritage)
  const [exp, setExp] = useState(resources.exp)
  const [level, setLevel] = useState(getLevelByExp(resources.exp))
  const [levelUpToast, setLevelUpToast] = useState<string | null>(null)
  const [stageCompleted, setStageCompleted] = useState(false)
  const [dailyEarnings, setDailyEarnings] = useState<RoomReward>({
    gold: 0,
    reputation: 0,
    heritage: 0,
    exp: 0,
  })
  const [ticketProgress, setTicketProgress] = useState<TicketOfficeProgress>(
    createInitialTicketProgress,
  )
  const [backstageProgress, setBackstageProgress] = useState<BackstageProgress>(
    createDefaultBackstageProgress,
  )
  const [makeupProgress, setMakeupProgress] = useState<MakeupRoomProgress>(
    createInitialMakeupProgress,
  )
  const [practiceProgress, setPracticeProgress] = useState<PracticeRoomProgress>(
    createInitialPracticeProgress,
  )
  const [practiceStats, setPracticeStats] = useState<CharacterStats>({
    body: 0,
    emotionPower: 0,
    script: 0,
  })
  const [achievements, setAchievements] = useState<Achievement[]>(initialAchievements)
  const [audioMuted, setAudioMuted] = useState(false)

  // ---- 演员对话系统状态 ----
  /** 当前正在与哪位演员聊天（null = 关闭） */
  const [chatActorId, setChatActorId] = useState<ActorId | null>(null)
  /** 每个演员的聊天记录（独立维护） */
  const [chatMessages, setChatMessages] = useState<Record<ActorId, ChatMessage[]>>({
    cheng_xiaowan: [],
    pei_yunfei: [],
    ye_qingshan: [],
  })
  /** 已触发过的亲密度门槛（避免重复触发台词） */
  const [playedAffinityThresholds, setPlayedAffinityThresholds] = useState<
    Record<ActorId, number[]>
  >({
    cheng_xiaowan: [],
    pei_yunfei: [],
    ye_qingshan: [],
  })
  /** 消息 ID 自增计数器 */
  const chatIdCounterRef = useRef(1)

  // ============================================================
  // 音频系统：背景音乐 + 全局点击音效
  // ============================================================
  useBGM()
  useClickSound()

  // ============================================================
  // 演员对话回调
  // ============================================================

  /** 打开与某位演员的聊天面板（首次打开时插入开场白） */
  const handleOpenChat = useCallback((actorId: ActorId) => {
    setChatActorId(actorId)
    // 播放点击音效
    audioManager.playClick()
    setChatMessages((prev) => {
      const existed = prev[actorId]
      if (existed && existed.length > 0) return prev
      // 首次打开：插入开场白 + 播放开场白配音
      const greeting = actorDialogueData[actorId].greeting
      // 播放开场白配音
      audioManager.playVoice(actorId, 'greeting')
      return {
        ...prev,
        [actorId]: [
          {
            id: chatIdCounterRef.current++,
            from: 'actor' as const,
            text: greeting,
            revealed: greeting.length, // 开场白直接显示全（不打字机）
            tag: '开场',
          },
        ],
      }
    })
  }, [])

  /** 关闭聊天面板 */
  const handleCloseChat = useCallback(() => {
    setChatActorId(null)
    // 停止当前配音
    audioManager.stopVoice()
  }, [])

  /** 推进某条消息的打字机进度（由 ChatBubbleOverlay 每 30ms 触发） */
  const handleAdvanceMessage = useCallback((msgId: number, newRevealed: number) => {
    setChatMessages((prev) => {
      if (!chatActorId) return prev
      const list = prev[chatActorId]
      const idx = list.findIndex((m) => m.id === msgId)
      if (idx < 0) return prev
      // 已达到完整长度就不再继续
      if (list[idx].revealed >= list[idx].text.length) return prev
      const nextList = list.slice()
      nextList[idx] = { ...list[idx], revealed: newRevealed }
      return { ...prev, [chatActorId]: nextList }
    })
  }, [chatActorId])

  /** 玩家发送一条消息 */
  const handleSendMessage = useCallback(
    (text: string) => {
      if (!chatActorId) return
      const actorId = chatActorId
      const playerMsg: ChatMessage = {
        id: chatIdCounterRef.current++,
        from: 'player',
        text,
        revealed: text.length,
      }
      // 1) 插入玩家消息
      setChatMessages((prev) => ({
        ...prev,
        [actorId]: [...prev[actorId], playerMsg],
      }))
      // 2) 计算演员回复
      const matched = matchActorResponse(actorId, text)
      // 3) 等玩家消息稳定显示后（约 250ms）插入演员回复（带打字机）
      window.setTimeout(() => {
        const actorMsg: ChatMessage = {
          id: chatIdCounterRef.current++,
          from: 'actor',
          text: matched.text,
          revealed: 0,
          tag: matched.tag,
        }
        setChatMessages((prev) => ({
          ...prev,
          [actorId]: [...prev[actorId], actorMsg],
        }))
        // 播放演员回复配音
        audioManager.playVoice(actorId, 'reply')
      }, 280)
      // 4) 亲密度变化
      if (matched.affinityGain && matched.affinityGain !== 0) {
        setActors((prevActors) => {
          return prevActors.map((a) => {
            if (a.id !== actorId) return a
            const newAff = Math.max(0, a.affinity + matched.affinityGain)
            return { ...a, affinity: newAff }
          })
        })
        // 5) 检查是否达到新门槛 → 触发特殊台词
        if (matched.affinityGain > 0) {
          const newAffinity =
            (actors.find((a) => a.id === actorId)?.affinity ?? 0) +
            matched.affinityGain
          const data = actorDialogueData[actorId]
          const playedList = playedAffinityThresholds[actorId] ?? []
          const nextThreshold = data.affinityLines
            .map((a) => a.threshold)
            .sort((a, b) => a - b)
            .find((t) => newAffinity >= t && !playedList.includes(t))
          if (nextThreshold !== undefined) {
            // 标记已播
            setPlayedAffinityThresholds((prev) => ({
              ...prev,
              [actorId]: [...(prev[actorId] ?? []), nextThreshold],
            }))
            // 选一条台词
            const lineObj = data.affinityLines.find(
              (a) => a.threshold === nextThreshold,
            )
            const line = lineObj
              ? lineObj.lines[
                  Math.floor(Math.random() * lineObj.lines.length)
                ]
              : '……'
            window.setTimeout(() => {
              const specialMsg: ChatMessage = {
                id: chatIdCounterRef.current++,
                from: 'actor',
                text: line,
                revealed: 0,
                tag: `亲密度 ${nextThreshold}`,
              }
              setChatMessages((prev) => ({
                ...prev,
                [actorId]: [...prev[actorId], specialMsg],
              }))
              // 播放好感度门槛配音（目前有 affinity5 的配音）
              if (nextThreshold === 5) {
                audioManager.playVoice(actorId, 'affinity5')
              } else {
                // 其他门槛使用 reply 配音作为替代
                audioManager.playVoice(actorId, 'reply')
              }
            }, 1500) // 在常规回复之后再播
          }
        }
      }
    },
    [chatActorId, actors, playedAffinityThresholds],
  )

  /** 点击底部任务按钮：激活/取消任务，或查看已完成任务 */
  const handleTaskClick = useCallback(
    (roomId: RoomId) => {
      const task = tasks.find((t) => t.id === roomId)

      // 已完成的任务：只打开弹窗查看，不重新激活
      if (task?.status === 'done') {
        setSelectedRoom(roomId)
        return
      }

      setActiveTask((prev) => {
        const nextActive = prev === roomId ? null : roomId
        // 同步更新 tasks 状态
        setTasks((prevTasks2) =>
          prevTasks2.map((t) => {
            if (t.id === roomId && nextActive !== null) {
              return { ...t, status: 'active' as const }
            }
            // 取消激活时，如果之前是 active 且未完成，回退到 todo
            if (t.id === roomId && nextActive === null && t.status === 'active') {
              return { ...t, status: 'todo' as const }
            }
            return t
          }),
        )
        return nextActive
      })
      setSelectedRoom(null)
    },
    [tasks],
  )

  const handleRoomClick = useCallback((roomId: RoomId) => {
    setSelectedRoom(roomId)
  }, [])

  /** 进入售票口玩法页面 */
  const handleEnterTicketOffice = useCallback(() => {
    setSelectedRoom(null)
    setScene('ticketOffice')
  }, [])

  /** 售票口进度变更（由 TicketOfficeScene 回调） */
  const handleTicketProgressChange = useCallback(
    (next: TicketOfficeProgress | ((prev: TicketOfficeProgress) => TicketOfficeProgress)) => {
      setTicketProgress(next)
    },
    [],
  )

  /** 从售票口返回主页面 */
  const handleTicketOfficeBack = useCallback(() => {
    setScene('main')
  }, [])

  /** 进入后台玩法页面 */
  const handleEnterBackstage = useCallback(() => {
    setSelectedRoom(null)
    setScene('backstage')
  }, [])

  /** 后台进度变更 */
  const handleBackstageProgressChange = useCallback(
    (next: BackstageProgress | ((prev: BackstageProgress) => BackstageProgress)) => {
      setBackstageProgress(next)
    },
    [],
  )

  /** 后台资源变更（由 BackstageScene 回调）—— 统一暂存到每日收益，开锣时结算 */
  const handleBackstageResourceChange = useCallback(
    (delta: {
      goldDelta?: number
      reputationDelta?: number
      heritageDelta?: number
      expDelta?: number
    }) => {
      setDailyEarnings((prev) => ({
        gold: prev.gold + (delta.goldDelta ?? 0),
        reputation: prev.reputation + (delta.reputationDelta ?? 0),
        heritage: prev.heritage + (delta.heritageDelta ?? 0),
        exp: prev.exp + (delta.expDelta ?? 0),
      }))
    },
    [],
  )

  /** 从后台返回主页面 */
  const handleBackstageBack = useCallback(() => {
    setScene('main')
  }, [])

  /** 后台任务完成 */
  const handleBackstageComplete = useCallback(() => {
    // 播放任务完成音效
    audioManager.playTaskComplete()
    // 标记 backstage 为 done，makeup 为 active
    setTasks((prevTasks) => {
      let nextTasks = prevTasks.map((t) => {
        if (t.id === 'backstage') return { ...t, status: 'done' as const }
        return t
      })
      nextTasks = nextTasks.map((t) => {
        if (t.id === 'makeup') return { ...t, status: 'active' as const }
        return t
      })
      return nextTasks
    })

    // 切换 activeTask 到 makeup
    setActiveTask('makeup')

    // 更新演员状态
    setActors((prev) => deriveActorsAfterDone(prev, 'backstage'))

    // 如果触发了一桌二椅，解锁对应成就 + 发放成就宝钱
    if (backstageProgress.oneDeskTwoChairsShown) {
      // 播放成就解锁音效
      audioManager.playAchievement()
      setAchievements((prev) => {
        const ach = prev.find((a) => a.id === 'one_desk_two_chairs')
        if (ach && !ach.isUnlocked && ach.goldReward > 0) {
          setDailyEarnings((prevEarn) => ({
            ...prevEarn,
            gold: prevEarn.gold + ach.goldReward,
          }))
        }
        return prev.map((a) =>
          a.id === 'one_desk_two_chairs' ? { ...a, isUnlocked: true } : a,
        )
      })
    }

    // 累计后台任务完成收益到每日收益
    const reward = roomRewards['backstage']
    setDailyEarnings((prev) => ({
      gold: prev.gold + (reward?.gold ?? 0),
      reputation: prev.reputation + (reward?.reputation ?? 0),
      heritage: prev.heritage + (reward?.heritage ?? 0),
      exp: prev.exp + (reward?.exp ?? 0),
    }))

    // 回到主页面
    setScene('main')
  }, [backstageProgress.oneDeskTwoChairsShown])

  /** 进入化妆间玩法页面 */
  const handleEnterMakeupRoom = useCallback(() => {
    setSelectedRoom(null)
    setScene('makeupRoom')
  }, [])

  /** 化妆间进度变更 */
  const handleMakeupProgressChange = useCallback(
    (next: MakeupRoomProgress | ((prev: MakeupRoomProgress) => MakeupRoomProgress)) => {
      setMakeupProgress(next)
    },
    [],
  )

  /** 从化妆间返回主页面 */
  const handleMakeupRoomBack = useCallback(() => {
    setScene('main')
  }, [])

  /** 化妆间任务完成 */
  const handleMakeupRoomComplete = useCallback(() => {
    // 播放任务完成音效
    audioManager.playTaskComplete()
    // 标记 makeup 为 done，practice 为 active
    setTasks((prevTasks) => {
      let nextTasks = prevTasks.map((t) => {
        if (t.id === 'makeup') return { ...t, status: 'done' as const }
        return t
      })
      nextTasks = nextTasks.map((t) => {
        if (t.id === 'practice') return { ...t, status: 'active' as const }
        return t
      })
      return nextTasks
    })

    // 切换 activeTask 到 practice
    setActiveTask('practice')

    // 更新演员状态
    setActors((prev) => deriveActorsAfterDone(prev, 'makeup'))

    // 累计收益到每日收益
    setDailyEarnings((prev) => ({
      gold: prev.gold + 60,
      reputation: prev.reputation + 15,
      heritage: prev.heritage + 5,
      exp: prev.exp + 30,
    }))

    // 回到主页面
    setScene('main')
  }, [])

  /** 进入排练房玩法页面 */
  const handleEnterPracticeRoom = useCallback(() => {
    setSelectedRoom(null)
    setScene('practiceRoom')
  }, [])

  /** 排练房进度变更 */
  const handlePracticeProgressChange = useCallback(
    (next: PracticeRoomProgress | ((prev: PracticeRoomProgress) => PracticeRoomProgress)) => {
      setPracticeProgress(next)
    },
    [],
  )

  /** 从排练房返回主页面 */
  const handlePracticeRoomBack = useCallback(() => {
    setScene('main')
  }, [])

  /** 进入戏台 */
  const handleEnterStage = useCallback(() => {
    setSelectedRoom(null)
    setScene('stage')
  }, [])

  /** 从戏台返回主页面（玩家手动点返回） */
  const handleStageBack = useCallback(() => {
    setScene('main')
  }, [])

  /**
   * 戏台演出完成 —— 统一结算点
   * 1) 把「今日收益」（售票口 / 后台 / 化妆间 / 排练房 / 排练房成就 的累计）写入主页总量
   * 2) 加上本场戏台评级奖励
   * 3) 清零今日收益
   * 4) 标记 stage 任务为 done，解锁「今日开锣」成就
   */
  const handleStageComplete = useCallback(
    (result: {
      grade: StageGrade
      overallScore: number
      reward: { gold: number; reputation: number; heritage: number; exp: number }
    }) => {
      // 一次性把今日收益 + 评级奖励写入总量
      setDailyEarnings((prev) => {
        const finalGold = prev.gold + result.reward.gold
        const finalRep = prev.reputation + result.reward.reputation
        const finalHer = prev.heritage + result.reward.heritage
        const finalExp = prev.exp + result.reward.exp

        setGold((g) => g + finalGold)
        setReputation((r) => r + finalRep)
        setHeritage((h) => h + finalHer)
        setExp((e) => {
          const newExp = e + finalExp
          const newLevel = getLevelByExp(newExp)
          setLevel((prevLevel) => {
            if (newLevel > prevLevel) {
              setLevelUpToast(`戏园等级提升至 Lv.${newLevel}`)
              setTimeout(() => setLevelUpToast(null), 4000)
            }
            return newLevel
          })
          return newExp
        })

        // 清零今日收益
        return { gold: 0, reputation: 0, heritage: 0, exp: 0 }
      })

      // 标记 stage 任务为 done
      setTasks((prevTasks) =>
        prevTasks.map((t) =>
          t.id === 'stage' ? { ...t, status: 'done' as const } : t,
        ),
      )

      // 解锁「今日开锣」成就 + 发放宝钱（如有）
      // 播放成就解锁音效 + 任务完成音效
      audioManager.playAchievement()
      audioManager.playTaskComplete()
      setAchievements((prev) => {
        const ach = prev.find((a) => a.id === 'today_open')
        if (ach && !ach.isUnlocked && ach.goldReward > 0) {
          setGold((g) => g + ach.goldReward)
        }
        return prev.map((a) =>
          a.id === 'today_open' ? { ...a, isUnlocked: true } : a,
        )
      })

      setStageCompleted(true)
    },
    [],
  )

  /** 排练房训练完成（结算收益） */
  const handlePracticeRoomComplete = useCallback(
    (result: { bodyGain: number; emotionGain: number; scriptGain: number }) => {
      // 播放任务完成音效
      audioManager.playTaskComplete()
      // 存储排练房最终的 stats 供后续戏台表演效果参考
      setPracticeStats({
        body: practiceProgress.stats.body,
        emotionPower: practiceProgress.stats.emotionPower,
        script: practiceProgress.stats.script,
      })

      // 累计收益到每日收益
      const totalScore = result.bodyGain + result.emotionGain + result.scriptGain
      const reward = roomRewards['practice']

      setDailyEarnings((prev) => ({
        gold: prev.gold + (reward?.gold ?? 0),
        reputation: prev.reputation + (reward?.reputation ?? 0),
        heritage: prev.heritage + (reward?.heritage ?? 0),
        exp: prev.exp + (reward?.exp ?? 0) + totalScore, // 训练表现额外经验
      }))

      // 标记 practice 为 done，stage 为 active
      setTasks((prevTasks) => {
        let nextTasks = prevTasks.map((t) => {
          if (t.id === 'practice') return { ...t, status: 'done' as const }
          return t
        })
        nextTasks = nextTasks.map((t) => {
          if (t.id === 'stage') return { ...t, status: 'active' as const }
          return t
        })
        return nextTasks
      })

      // 切换 activeTask 到 stage
      setActiveTask('stage')

      // 更新演员状态
      setActors((prev) => deriveActorsAfterDone(prev, 'practice'))

      // 回到主页面
      setScene('main')
    },
    [practiceProgress.stats],
  )

  /** 售票口任务完成 */
  const handleTicketOfficeComplete = useCallback(
    (result: {
      goldDelta: number
      reputationDelta: number
      heritageDelta: number
      expDelta: number
      soldCount: number
      stampedCount: number
      ticketDesignScore: number
    }) => {
      // 播放任务完成音效
      audioManager.playTaskComplete()
      // 售票口收益暂存到每日收益，等戏台演出结束后再结算到总量
      setDailyEarnings((prev) => ({
        gold: prev.gold + result.goldDelta,
        reputation: prev.reputation + result.reputationDelta,
        heritage: prev.heritage + result.heritageDelta,
        exp: prev.exp + result.expDelta,
      }))

      // 标记 ticket 为 done，backstage 为 active
      setTasks((prevTasks) => {
        let nextTasks = prevTasks.map((t) => {
          if (t.id === 'ticket') return { ...t, status: 'done' as const }
          return t
        })
        nextTasks = nextTasks.map((t) => {
          if (t.id === 'backstage') return { ...t, status: 'active' as const }
          return t
        })
        return nextTasks
      })

      // 切换 activeTask 到 backstage
      setActiveTask('backstage')

      // 更新演员状态
      setActors((prev) => deriveActorsAfterDone(prev, 'ticket'))

      // 重置售票进度，防止重复进入时累加
      setTicketProgress(createInitialTicketProgress)

      // 回到主页面
      setScene('main')
    },
    [],
  )

  const closeRoomPanel = useCallback(() => setSelectedRoom(null), [])
  const closeCornerPopup = useCallback(() => setCornerPopup(null), [])

  /** 排练房解锁成就回调（同时发放成就宝钱奖励） */
  const handlePracticeAchievement = useCallback(
    (achievementId: string) => {
      // 播放成就解锁音效
      audioManager.playAchievement()
      setAchievements((prev) => {
        const ach = prev.find((a) => a.id === achievementId)
        // 仅在「未解锁」时发放奖励，避免重复触发
        if (ach && !ach.isUnlocked && ach.goldReward > 0) {
          setDailyEarnings((prevEarn) => ({
            ...prevEarn,
            gold: prevEarn.gold + ach.goldReward,
          }))
        }
        return prev.map((a) =>
          a.id === achievementId ? { ...a, isUnlocked: true } : a,
        )
      })
    },
    [],
  )

  /** 完成当前激活任务（非戏台：累计到每日收益；戏台由 handleStageComplete 统一结算） */
  const handleCompleteTask = useCallback(() => {
    if (!activeTask) return
    if (activeTask === 'stage') {
      // 戏台已通过 handleStageComplete 结算，此处不再重复发放
      return
    }

    // 播放任务完成音效
    audioManager.playTaskComplete()

    // 累计到每日收益
    const reward = roomRewards[activeTask]
    if (reward) {
      setDailyEarnings((prev) => ({
        gold: prev.gold + reward.gold,
        reputation: prev.reputation + reward.reputation,
        heritage: prev.heritage + reward.heritage,
        exp: prev.exp + reward.exp,
      }))
    }

    let nextActiveId: RoomId | null = null

    setTasks((prevTasks) => {
      // 将当前任务标记为 done
      let nextTasks = prevTasks.map((t) =>
        t.id === activeTask ? { ...t, status: 'done' as const } : t,
      )

      // 找到下一个 status 为 todo 的任务，设为 active
      const nextTodo = nextTasks.find((t) => t.status === 'todo')
      if (nextTodo) {
        nextTasks = nextTasks.map((t) =>
          t.id === nextTodo.id ? { ...t, status: 'active' as const } : t,
        )
        nextActiveId = nextTodo.id
      }

      return nextTasks
    })

    // 更新演员状态
    setActors((prev) => deriveActorsAfterDone(prev, activeTask as GameTask['id']))

    // 自动切换到下一个任务
    setActiveTask(nextActiveId)
    setSelectedRoom(null)
  }, [activeTask])

  const activeRoom = rooms.find((r) => r.id === activeTask)
  const selectedRoomData = rooms.find((r) => r.id === selectedRoom)
  const selectedTask = tasks.find((t) => t.id === selectedRoom)

  // 判断选中房间的任务是否可操作（activeTask 匹配 且 任务状态为 active）
  const isSelectedRoomOperable = selectedRoom != null && activeTask === selectedRoom
  const isSelectedTaskDone = selectedTask?.status === 'done'
  const isSelectedTaskLocked = selectedTask?.status === 'todo' && !isSelectedRoomOperable

  // ---- 化妆间玩法页面 ----
  if (scene === 'makeupRoom') {
    return (
      <MakeupRoomScene
        resources={{ gold, reputation, heritage, exp, level }}
        makeupProgress={makeupProgress}
        onMakeupProgressChange={handleMakeupProgressChange}
        onBack={handleMakeupRoomBack}
        onComplete={handleMakeupRoomComplete}
      />
    )
  }

  // ---- 排练房玩法页面 ----
  if (scene === 'practiceRoom') {
    return (
      <PracticeRoomScene
        resources={{ gold, reputation, heritage, exp, level }}
        practiceProgress={practiceProgress}
        onPracticeProgressChange={handlePracticeProgressChange}
        onBack={handlePracticeRoomBack}
        onComplete={handlePracticeRoomComplete}
        onUnlockAchievement={handlePracticeAchievement}
      />
    )
  }

  // ---- 戏台玩法页面 ----
  if (scene === 'stage') {
    return (
      <StageScene
        resources={{ gold, reputation, heritage, exp, level }}
        backstageProgress={backstageProgress}
        makeupProgress={makeupProgress}
        practiceProgress={practiceProgress}
        ticketProgress={ticketProgress}
        day={1}
        onBack={handleStageBack}
        onComplete={handleStageComplete}
      />
    )
  }

  // ---- 售票口玩法页面 ----
  if (scene === 'ticketOffice') {
    return (
      <TicketOfficeScene
        resources={{ gold, reputation, heritage, exp, level }}
        ticketProgress={ticketProgress}
        onTicketProgressChange={handleTicketProgressChange}
        onBack={handleTicketOfficeBack}
        onComplete={handleTicketOfficeComplete}
      />
    )
  }

  // ---- 后台玩法页面 ----
  if (scene === 'backstage') {
    const backstageGuideText = activeTask === 'backstage'
      ? '后台任务进行中~👈 1️⃣ 从<strong>左侧道具仓库</strong>选中道具\n2️⃣ <strong>拖拽</strong>到<strong>中央戏台</strong>摆好位置\n💡 <strong>双击</strong>道具卡片可查看道具说明（京剧用法 / 摆放建议）\n⭐ 先试试摆<strong>一桌二椅</strong>的经典配置哟~'
      : '来后台布置舞台道具吧~从左侧道具仓库选中道具，<strong>拖拽</strong>到<strong>中央戏台</strong>，摆出好看的配置！\n💡 <strong>双击</strong>道具卡片可查看详细说明'

    return (
      <BackstageScene
        resources={{ gold, reputation, heritage, exp, level }}
        backstageProgress={backstageProgress}
        onBackstageProgressChange={handleBackstageProgressChange}
        onResourceChange={handleBackstageResourceChange}
        onBack={handleBackstageBack}
        onComplete={handleBackstageComplete}
        guideText={backstageGuideText}
      />
    )
  }

  return (
    <div className="game-shell">
      <div className="game-canvas">
        {/* 背景层 */}
        <div
          className="scene-bg-overlay"
          style={{ backgroundImage: `url(${gameAssets.background.main})` }}
        />

        {/* NPC 层 — 动态角色（暂离停用） */}
        {/* <NPCLayer /> */}

        {/* 顶部 HUD */}
        <div className="hud-layer">
          <ResourceBar resources={{ gold, reputation, heritage, exp, level }} />
        </div>

        {/* 导引 NPC（主页面左上方） */}
        <GuideNPC
          activeTaskId={activeTask}
          tasks={tasks}
          variant="main"
        />

        {/* 等级提升提示 */}
        {levelUpToast && (
          <div className="level-up-toast">{levelUpToast}</div>
        )}

        {/* 左右侧边列表面板 */}
        <SideTaskPanel
          activeTask={activeTask}
          tasks={tasks}
          actors={actors}
          dailyEarnings={dailyEarnings}
          stageCompleted={stageCompleted}
          onActorClick={handleOpenChat}
          chattingActorId={chatActorId}
        />

        {/* 演员对话悬浮面板 */}
        {chatActorId && (
          <ChatBubbleOverlay
            actorId={chatActorId}
            affinity={actors.find((a) => a.id === chatActorId)?.affinity ?? 0}
            messages={chatMessages[chatActorId]}
            onClose={handleCloseChat}
            onSend={handleSendMessage}
            onAdvance={handleAdvanceMessage}
          />
        )}

        {/* 左下角：任务日志按钮 */}
        <button
          className={`corner-btn corner-btn--left ${cornerPopup === 'journal' ? 'corner-btn--active' : ''}`}
          onClick={() => setCornerPopup(cornerPopup === 'journal' ? null : 'journal')}
          title="任务日志"
        >
          <PngIcon src={gameAssets.icons.journal} alt="任务日志" fallback="📋" />
          <span className="corner-btn-fallback">📋</span>
        </button>

        {/* 右下角：成就按钮 */}
        <button
          className={`corner-btn corner-btn--right ${cornerPopup === 'achievement' ? 'corner-btn--active' : ''}`}
          onClick={() => setCornerPopup(cornerPopup === 'achievement' ? null : 'achievement')}
          title="成就"
        >
          <PngIcon src={gameAssets.icons.rewarding} alt="成就" fallback="🏆" />
          <span className="corner-btn-fallback">🏆</span>
        </button>

        {/* 右下角偏左：音频开关 */}
        <button
          className="corner-btn corner-btn--audio"
          onClick={() => {
            const muted = audioManager.toggleMute()
            setAudioMuted(muted)
          }}
          title={audioMuted ? '开启声音' : '静音'}
        >
          <span className="corner-btn-fallback">{audioMuted ? '🔇' : '🔊'}</span>
        </button>

        {/* 房间热点 — 透明点击区，仅 hover/active 显示光晕反馈 */}
        {rooms.map((room) => {
          const isActive = activeTask === room.id
          return (
            <div
              key={room.id}
              className={`room-hotspot ${isActive ? 'room-hotspot--active' : ''}`}
              style={{ left: `${room.x}%`, top: `${room.y}%` }}
              onClick={() => handleRoomClick(room.id)}
            >
              {/* hover 光晕环 */}
              <div className="room-ring" />

              {/* 激活高亮光晕 */}
              {isActive && <div className="room-highlight" />}

              {/* 浮动箭头 */}
              {isActive && (
                <div className="room-arrow">
                  <div className="arrow-glow" />
                  <ArrowImg />
                  <span className="arrow-fallback">▼</span>
                </div>
              )}
            </div>
          )
        })}

        {/* 任务提示气泡 */}
        {activeRoom && (
          <div
            className={`ly-board-frame task-bubble ${activeRoom.id === 'stage' ? 'task-bubble--below' : ''}`}
            style={{
              left: `${activeRoom.x}%`,
              top: activeRoom.id === 'stage' ? `${activeRoom.y + 8}%` : `${activeRoom.y - 10}%`,
            }}
          >
            <div className="ly-board-frame__content task-bubble-inner">
              <p className="task-bubble-line1">当前任务：{activeRoom.taskName}</p>
              <p className="task-bubble-line2">点击房间进入</p>
            </div>
          </div>
        )}

        {/* 房间详情弹窗 */}
        {selectedRoomData && (
          <div className="room-panel-overlay" onClick={closeRoomPanel}>
            <div className="room-panel" onClick={(e) => e.stopPropagation()}>
              <button className="room-panel-close" onClick={closeRoomPanel}>
                ✕
              </button>

              <h2 className="room-panel-name">{selectedRoomData.name}</h2>

              <div className="room-panel-section">
                <h3 className="room-panel-section-title">任务导览</h3>
                <p className="room-panel-desc">{selectedRoomData.taskName}</p>
              </div>

              <div className="room-panel-section">
                <h3 className="room-panel-section-title">今日任务清单</h3>
                <ul className="room-panel-checklist">
                  <li>确认任务目标</li>
                  <li>准备所需物品</li>
                  <li>完成流程操作</li>
                </ul>
              </div>

              {isSelectedTaskDone && (
                <div className="room-panel-complete room-panel-complete--done">
                  ✓ 任务已完成
                </div>
              )}

              {isSelectedTaskLocked && (
                <div className="room-panel-locked-hint">
                  前置任务尚未完成，暂无法进行此任务
                </div>
              )}

              {isSelectedRoomOperable && selectedRoom === 'ticket' && (
                <button className="room-panel-complete room-panel-complete--gold" onClick={handleEnterTicketOffice}>
                  进入售票口
                </button>
              )}
              {isSelectedRoomOperable && selectedRoom === 'backstage' && (
                <button className="room-panel-complete" onClick={handleEnterBackstage}>
                  进入后台
                </button>
              )}
              {isSelectedRoomOperable && selectedRoom === 'makeup' && (
                <button className="room-panel-complete room-panel-complete--gold" onClick={handleEnterMakeupRoom}>
                  进入化妆间
                </button>
              )}
              {isSelectedRoomOperable && selectedRoom === 'practice' && (
                <button className="room-panel-complete room-panel-complete--gold" onClick={handleEnterPracticeRoom}>
                  进入排练房
                </button>
              )}
              {isSelectedRoomOperable && selectedRoom === 'stage' && (
                <button className="room-panel-complete room-panel-complete--gold" onClick={handleEnterStage}>
                  进入戏台
                </button>
              )}
              {isSelectedRoomOperable && selectedRoom !== 'ticket' && selectedRoom !== 'backstage' && selectedRoom !== 'makeup' && selectedRoom !== 'practice' && selectedRoom !== 'stage' && (
                <button className="room-panel-complete" onClick={handleCompleteTask}>
                  完成任务
                </button>
              )}
              <button className="room-panel-back" onClick={closeRoomPanel}>
                返回主界面
              </button>
            </div>
          </div>
        )}

        {/* 任务日志弹窗 */}
        {cornerPopup === 'journal' && (
          <div className="popup-overlay" onClick={closeCornerPopup}>
            <div className="ly-board-frame popup-panel" onClick={(e) => e.stopPropagation()}>
              <button className="popup-close" onClick={closeCornerPopup}>✕</button>
              <h3 className="ly-board-title popup-title">任务日志</h3>
              <div className="popup-body">
                <p className="popup-line">今日任务：完成《霸王别姬·帐中诀别》的筹演</p>
                <div className="popup-flow">
                  <span>当前流程：</span>
                  <span className="flow-item">售票口</span>
                  <span className="flow-sep">/</span>
                  <span className="flow-item">后台</span>
                  <span className="flow-sep">/</span>
                  <span className="flow-item">化妆间</span>
                  <span className="flow-sep">/</span>
                  <span className="flow-item">练功房</span>
                  <span className="flow-sep">/</span>
                  <span className="flow-item">戏台</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 成就弹窗 */}
        {cornerPopup === 'achievement' && (
          <div className="popup-overlay" onClick={closeCornerPopup}>
            <div className="ly-board-frame popup-panel" onClick={(e) => e.stopPropagation()}>
              <button className="popup-close" onClick={closeCornerPopup}>✕</button>
              <h3 className="ly-board-title popup-title">成就</h3>
              <div className="popup-body">
                <ul className="ly-board-list">
                  {achievements.map((ach) => (
                    <li
                      key={ach.id}
                      className={`ly-board-item ${ach.isUnlocked ? 'ly-board-item--unlocked' : ''}`}
                    >
                      <div className="achievement-row">
                        <span className={`achievement-dot ${ach.isUnlocked ? 'achievement-dot--unlocked' : ''}`} />
                        <div className="achievement-info">
                          <span className={`achievement-name ${ach.isUnlocked ? '' : 'achievement-locked-text'}`}>
                            {ach.name}
                          </span>
                          {ach.isUnlocked && (
                            <span className="achievement-desc-text">{ach.description}</span>
                          )}
                          {ach.isUnlocked && ach.cultureNote && (
                            <span className="achievement-culture-text">{ach.cultureNote}</span>
                          )}
                        </div>
                        {ach.isUnlocked && ach.goldReward > 0 && (
                          <span className="achievement-gold">+{ach.goldReward}💰</span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* 底部任务栏 */}
        <TaskBar activeTask={activeTask} onTaskClick={handleTaskClick} />
      </div>
    </div>
  )
}
