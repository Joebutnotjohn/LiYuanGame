import { useGame } from '../game/GameContext'
import './ActorList.css'

const statusColors: Record<string, { bg: string; dot: string; text: string }> = {
  '良好': { bg: 'rgba(106, 154, 122, 0.08)', dot: '#6A9A7A', text: '#4A7A5A' },
  '休息': { bg: 'rgba(139, 157, 175, 0.08)', dot: '#8B9DAF', text: '#6A7A8A' },
}

export default function ActorList() {
  const { state } = useGame()
  const unlockedActors = state.actors.filter(a => a.unlocked)

  return (
    <div className="actor-panel">
      {/* 木牌顶部 */}
      <div className="wood-board-top">
        <div className="board-grain" />
        <span className="board-title">演员列表</span>
      </div>

      {/* 演员卡片列表 */}
      <div className="actor-list">
        {unlockedActors.map((actor) => {
          const sc = statusColors[actor.status] || statusColors['良好']
          return (
            <div key={actor.id} className="actor-card">
              {/* 头像区域 */}
              <div className="actor-avatar-wrap">
                <div className="actor-avatar" style={{ backgroundColor: sc.bg }}>
                  <span className="actor-avatar-emoji">
                    {actor.role === '花旦' && '🌸'}
                    {actor.role === '小生' && '🎋'}
                    {actor.role === '老生' && '🎭'}
                    {actor.role === '青衣' && '🪷'}
                  </span>
                  <div className="avatar-level">Lv.{actor.level}</div>
                </div>
              </div>

              {/* 信息区 */}
              <div className="actor-info">
                <div className="actor-name">{actor.name}</div>
                <div className="actor-role-tag">{actor.role}</div>
                <div className="actor-today">
                  <span className="today-label">今日</span>
                  <span className="today-role">{actor.todayRole}</span>
                </div>
              </div>

              {/* 状态指示 */}
              <div className="actor-status">
                <span className="status-dot" style={{ backgroundColor: sc.dot }} />
                <span className="status-text" style={{ color: sc.text }}>{actor.status}</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* 木牌底部 */}
      <div className="wood-board-bottom">
        <div className="board-grain" />
      </div>
    </div>
  )
}
