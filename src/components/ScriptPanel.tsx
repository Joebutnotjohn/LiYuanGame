import { useGame } from '../game/GameContext'
import './ScriptPanel.css'

export default function ScriptPanel() {
  const { state } = useGame()
  const todayScript = state.scripts.find(s => s.unlocked && s.progress > 0)

  if (!todayScript) return null

  return (
    <div className="script-panel">
      <div className="panel-scroll-top" />
      <div className="panel-scroll-body">
        {/* 面板标题 */}
        <div className="panel-header">
          <div className="header-ornament" />
          <span className="header-text">今日戏本</span>
          <div className="header-ornament header-ornament-right" />
        </div>

        {/* 剧目名 */}
        <div className="script-name-wrap">
          <span className="script-seal">戏</span>
          <span className="script-name">{todayScript.name}</span>
        </div>

        {/* 信息项 */}
        <div className="script-info-list">
          <div className="script-info-item">
            <span className="info-label">当前折子</span>
            <span className="info-value">{todayScript.currentAct}</span>
          </div>
          <div className="script-info-item">
            <span className="info-label">主要人物</span>
            <span className="info-value">{todayScript.characters}</span>
          </div>
          <div className="script-info-item">
            <span className="info-label">核心情绪</span>
            <span className="info-value emotion-tags">
              {todayScript.emotion.split(' / ').map((e, i) => (
                <span key={i} className="emotion-tag">{e}</span>
              ))}
            </span>
          </div>
        </div>

        {/* 进度条 */}
        <div className="script-progress">
          <div className="progress-label">排练进度</div>
          <div className="progress-track">
            <div
              className="progress-fill"
              style={{ width: `${todayScript.progress}%` }}
            />
          </div>
          <div className="progress-value">{todayScript.progress}%</div>
        </div>
      </div>
      <div className="panel-scroll-bottom" />
    </div>
  )
}
