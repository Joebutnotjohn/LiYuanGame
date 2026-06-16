import { useState, useCallback } from 'react'
import { gameAssets } from '../game/assets'
import {
  type GameTask,
  type ActorState,
  type ActorStatus,
  type RoomReward,
  taskStatusLabelMap,
} from '../game/gameData'
import { type RoomId } from './TaskBar'
import './SideTaskPanel.css'

interface SideTaskPanelProps {
  activeTask: RoomId | null
  tasks: GameTask[]
  actors: ActorState[]
  dailyEarnings: RoomReward
  stageCompleted: boolean
}

/** 折叠 section 组件 */
function CollapsibleSection({
  title,
  defaultOpen = true,
  children,
}: {
  title: string
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className={`st-section ${open ? 'st-section--open' : ''}`}>
      <button
        className="st-section-header"
        onClick={() => setOpen((prev) => !prev)}
        title={open ? '收起' : '展开'}
      >
        <span className="st-section-arrow">{open ? '▾' : '▸'}</span>
        <span className="st-section-title">{title}</span>
      </button>
      {open && <div className="st-section-body">{children}</div>}
    </div>
  )
}

/** 演员头像组件 */
function ActorAvatar({ src, name }: { src: string; name: string }) {
  return (
    <div className="st-actor-avatar">
      <img
        src={src}
        alt={name}
        className="st-actor-img"
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).style.display = 'none'
        }}
      />
    </div>
  )
}

/** 演员头像 key → 图片路径 */
const avatarSrcMap: Record<ActorState['avatarKey'], string> = {
  yuji: gameAssets.characters.yuji,
  xiangyu: gameAssets.characters.xiangyu,
  laosheng: gameAssets.characters.laosheng,
}

/** 演员状态 → CSS 修饰类 */
function statusDotClass(status: ActorStatus): string {
  switch (status) {
    case 'ready':
      return 'st-status-dot--ready'
    case 'preparing':
    case 'rehearsing':
      return 'st-status-dot--working'
    case 'tired':
      return 'st-status-dot--tired'
    case 'idle':
    default:
      return 'st-status-dot--idle'
  }
}

export default function SideTaskPanel({ activeTask, tasks, actors, dailyEarnings, stageCompleted }: SideTaskPanelProps) {
  const [leftOpen, setLeftOpen] = useState(true)
  const [rightOpen, setRightOpen] = useState(true)

  const toggleLeft = useCallback(() => setLeftOpen((prev) => !prev), [])
  const toggleRight = useCallback(() => setRightOpen((prev) => !prev), [])

  return (
    <>
      {/* ==================== 左侧面板：今日戏本 ==================== */}
      <div className={`st-side-panel st-side-panel--left ${leftOpen ? 'st-side-panel--expanded' : ''}`}>
        {/* 收起时显示的窄条标签 */}
        <div className="st-tab" onClick={toggleLeft}>
          <span className="st-tab-text">今日戏本</span>
          <span className="st-tab-arrow">{leftOpen ? '◀' : '▶'}</span>
        </div>

        {/* 面板内容 */}
        <div className="st-panel-content">
          <div className="st-panel-inner">
            {/* 标题栏 */}
            <div className="st-panel-header">
              <h3 className="st-panel-title">今日戏本</h3>
              <button className="st-toggle-btn" onClick={toggleLeft} title="收起面板">
                ◀
              </button>
            </div>

            {/* 面板主体 */}
            <div className="st-panel-body">
              {/* Section 1: 剧本内容 */}
              <CollapsibleSection title="剧本内容">
                <div className="st-script-info">
                  <div className="st-info-row">
                    <span className="st-info-label">剧目</span>
                    <span className="st-info-value st-info-value--highlight">《霸王别姬》</span>
                  </div>
                  <div className="st-info-row">
                    <span className="st-info-label">折子</span>
                    <span className="st-info-value">帐中诀别</span>
                  </div>
                  <div className="st-info-row">
                    <span className="st-info-label">主要人物</span>
                    <span className="st-info-value">项羽 / 虞姬</span>
                  </div>
                  <div className="st-info-row">
                    <span className="st-info-label">核心情绪</span>
                    <span className="st-info-value st-info-value--emotion">悲壮 / 诀别 / 宿命</span>
                  </div>
                  <div className="st-info-row st-info-row--prompt">
                    <span className="st-info-label">剧情提示</span>
                    <span className="st-info-value st-info-value--prompt">
                      楚帐夜深，四面楚歌，霸王与虞姬迎来最后诀别。
                    </span>
                  </div>
                </div>
              </CollapsibleSection>

              {/* Section 2: 今日收益 */}
              <CollapsibleSection title="今日收益">
                <div className="st-earnings-list">
                  <div className="st-earn-row">
                    <img className="st-earn-icon-img" src={gameAssets.icons.coin} alt="宝钱" />
                    <span className="st-earn-label">宝钱</span>
                    <span className="st-earn-value st-earn-gold">+{dailyEarnings.gold}</span>
                  </div>
                  <div className="st-earn-row">
                    <img className="st-earn-icon-img" src={gameAssets.icons.reputation} alt="口碑" />
                    <span className="st-earn-label">口碑</span>
                    <span className="st-earn-value st-earn-rep">+{dailyEarnings.reputation}</span>
                  </div>
                  <div className="st-earn-row">
                    <img className="st-earn-icon-img" src={gameAssets.icons.heritage} alt="传承值" />
                    <span className="st-earn-label">传承值</span>
                    <span className="st-earn-value st-earn-her">+{dailyEarnings.heritage}</span>
                  </div>
                  <div className="st-earn-row">
                    <span className="st-earn-icon">✨</span>
                    <span className="st-earn-label">经验值</span>
                    <span className="st-earn-value st-earn-exp">+{dailyEarnings.exp}</span>
                  </div>
                </div>
                {stageCompleted && (
                  <div className="st-earn-settled">✓ 已开锣结算</div>
                )}
              </CollapsibleSection>

              {/* Section 3: 任务进度 — 古风纸页列表 */}
              <CollapsibleSection title="任务进度">
                <ul className="st-task-list">
                  {tasks.map((task) => {
                    const isCurrentActive = activeTask === task.id
                    return (
                      <li
                        key={task.id}
                        className={`st-task-item ${isCurrentActive ? 'st-task-item--active' : ''} ${task.status === 'done' ? 'st-task-item--done' : ''}`}
                      >
                        <span className={`st-task-dot st-task-dot--${task.status}`} />
                        <span className="st-task-label">
                          {task.roomName}：{task.description}
                        </span>
                        <span className={`st-task-status st-task-status--${task.status}`}>
                          {taskStatusLabelMap[task.status]}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              </CollapsibleSection>
            </div>
          </div>
        </div>
      </div>

      {/* ==================== 右侧面板：今日在班 ==================== */}
      <div className={`st-side-panel st-side-panel--right ${rightOpen ? 'st-side-panel--expanded' : ''}`}>
        {/* 收起时显示的窄条标签 */}
        <div className="st-tab st-tab--right" onClick={toggleRight}>
          <span className="st-tab-arrow">{rightOpen ? '▶' : '◀'}</span>
          <span className="st-tab-text">今日在班</span>
        </div>

        {/* 面板内容 */}
        <div className="st-panel-content">
          <div className="st-panel-inner">
            {/* 标题栏 */}
            <div className="st-panel-header">
              <button className="st-toggle-btn st-toggle-btn--right" onClick={toggleRight} title="收起面板">
                ▶
              </button>
              <h3 className="st-panel-title">今日在班</h3>
            </div>

            {/* 面板主体 — 古风纸页演员列表 */}
            <div className="st-panel-body">
              <div className="st-actor-list">
                {actors.map((actor) => (
                  <div key={actor.id} className="st-actor-row">
                    <ActorAvatar src={avatarSrcMap[actor.avatarKey]} name={actor.name} />
                    <div className="st-actor-info">
                      <div className="st-actor-name">{actor.name}</div>
                      <div className="st-actor-details">
                        <span className="st-actor-tag">{actor.roleType}</span>
                        <span className="st-actor-sep">·</span>
                        <span className="st-actor-role">今日：{actor.todayRole}</span>
                      </div>
                    </div>
                    <div className="st-actor-status">
                      <span className={`st-status-dot ${statusDotClass(actor.status)}`} />
                      <span className={`st-actor-status-text st-actor-status-text--${actor.status}`}>
                        {actor.statusText}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
