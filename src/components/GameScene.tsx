import { useState, useCallback } from 'react'
import { gameAssets } from '../game/assets'
import {
  rooms,
  initialTasks,
  initialActors,
  resources,
  getLevelByExp,
  roomRewards,
  type GameTask,
  type ActorState,
  type RoomReward,
} from '../game/gameData'
import {
  createInitialTicketProgress,
  type TicketOfficeProgress,
} from '../game/ticketOfficeData'
import {
  createDefaultBackstageProgress,
  type BackstageProgress,
} from '../game/backstageData'
import ResourceBar from './ResourceBar'
import SideTaskPanel from './SideTaskPanel'
import TaskBar, { type RoomId } from './TaskBar'
import TicketOfficeScene from './TicketOfficeScene'
import BackstageScene from './BackstageScene'
import './GameScene.css'

type Scene = 'main' | 'ticketOffice' | 'backstage'

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

  /** 后台资源变更（由 BackstageScene 回调） */
  const handleBackstageResourceChange = useCallback(
    (delta: {
      goldDelta?: number
      reputationDelta?: number
      heritageDelta?: number
      expDelta?: number
    }) => {
      if (delta.goldDelta) setGold((g) => g + delta.goldDelta!)
      if (delta.reputationDelta) setReputation((r) => r + delta.reputationDelta!)
      if (delta.heritageDelta) setHeritage((h) => h + delta.heritageDelta!)
      if (delta.expDelta) {
        setExp((e) => {
          const newExp = e + delta.expDelta!
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
      }
    },
    [],
  )

  /** 从后台返回主页面 */
  const handleBackstageBack = useCallback(() => {
    setScene('main')
  }, [])

  /** 后台任务完成 */
  const handleBackstageComplete = useCallback(() => {
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

    // 回到主页面
    setScene('main')
  }, [])

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

  /** 完成当前激活任务 */
  const handleCompleteTask = useCallback(() => {
    if (!activeTask) return

    // 获取该房间的收益
    const reward = roomRewards[activeTask]
    const isStage = activeTask === 'stage'

    if (isStage) {
      // 戏台开锣：将累计每日收益结算到总量
      setDailyEarnings((prev) => {
        const finalGold = prev.gold + (reward?.gold ?? 0)
        const finalRep = prev.reputation + (reward?.reputation ?? 0)
        const finalHer = prev.heritage + (reward?.heritage ?? 0)
        const finalExp = prev.exp + (reward?.exp ?? 0)

        // 写入总量
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

        // 返回清零后的每日收益
        return { gold: 0, reputation: 0, heritage: 0, exp: 0 }
      })
      setStageCompleted(true)
    } else if (reward) {
      // 非戏台任务：累计到每日收益
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

  // ---- 售票口玩法页面 ----
  if (scene === 'ticketOffice') {
    return (
      <TicketOfficeScene
        ticketProgress={ticketProgress}
        onTicketProgressChange={handleTicketProgressChange}
        onBack={handleTicketOfficeBack}
        onComplete={handleTicketOfficeComplete}
      />
    )
  }

  // ---- 后台玩法页面 ----
  if (scene === 'backstage') {
    return (
      <BackstageScene
        resources={{ gold, reputation, heritage, exp, level }}
        backstageProgress={backstageProgress}
        onBackstageProgressChange={handleBackstageProgressChange}
        onResourceChange={handleBackstageResourceChange}
        onBack={handleBackstageBack}
        onComplete={handleBackstageComplete}
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
        />

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
              {isSelectedRoomOperable && selectedRoom !== 'ticket' && selectedRoom !== 'backstage' && (
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
                  <li className="ly-board-item">
                    <span className="achievement-dot" />
                    初入梨园
                  </li>
                  <li className="ly-board-item">
                    <span className="achievement-dot" />
                    今日开锣
                  </li>
                  <li className="ly-board-item">
                    <span className="achievement-dot" />
                    传承新声
                  </li>
                  <li className="ly-board-item">
                    <span className="achievement-dot" />
                    戏台初成
                  </li>
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
