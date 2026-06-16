import { useGame, Task, RoomId } from '../game/GameContext'
import { gameAssets } from '../game/assets'
import './RoomPanel.css'

const roomIcons: Record<RoomId, string> = {
  ticket: '🎫',
  backstage: '🎪',
  dressing: '💄',
  rehearsal: '🎵',
  stage: '🎭',
}

const roomTasks: Record<RoomId, string> = {
  ticket: '当前任务：准备戏票与座次，点击进入',
  backstage: '当前任务：检查道具与布景，点击进入',
  dressing: '当前任务：为演员勾脸梳妆，点击进入',
  rehearsal: '当前任务：演出前最后排练，点击进入',
  stage: '当前任务：粉墨登场演出《霸王别姬》，点击进入',
}

export default function RoomPanel() {
  const { state, dispatch } = useGame()
  const { phase, currentRoom, currentTask, tasks, showArrow, taskHint } = state

  const isArrived = phase === 'arrived'
  const isInRoom = phase === 'in-room' || phase === 'task-active'
  const isShowing = isArrived || isInRoom

  if (!isShowing || !currentRoom) return null

  const room = state.rooms.find(r => r.id === currentRoom)
  if (!room) return null

  const roomTaskList = tasks.filter(t => t.roomId === currentRoom && !t.completed)
  const activeTask = currentTask || roomTaskList[0]

  const handleEnterTask = () => {
    if (!activeTask) return
    dispatch({ type: 'ENTER_ROOM', roomId: currentRoom })
    dispatch({ type: 'START_TASK', task: activeTask })
  }

  const handleCompleteTask = () => {
    dispatch({ type: 'COMPLETE_TASK' })
  }

  const handleLeave = () => {
    dispatch({ type: 'LEAVE_ROOM' })
  }

  return (
    <div className="room-overlay">
      <div className={`ly-board-frame room-panel ${isInRoom ? 'room-panel-expanded' : ''}`}>
        {/* 房间标题栏 */}
        <div className="room-panel-header">
          <div className="room-panel-icon">{roomIcons[currentRoom]}</div>
          <div className="room-panel-title-group">
            <div className="ly-board-title room-panel-name">{room.name}</div>
            <div className="room-panel-desc">{room.description}</div>
          </div>
        </div>

        {/* 任务提示 */}
        {isArrived && (
          <div className="room-task-hint">
            <div className="hint-arrow">📍</div>
            <span>{roomTasks[currentRoom]}</span>
          </div>
        )}

        {/* 进入任务 / 任务内容 */}
        <div className="room-panel-body">
          {isArrived && (
            <button className="btn-enter-room" onClick={handleEnterTask}>
              <span className="btn-enter-icon">🚪</span>
              <span>进入{room.name}</span>
            </button>
          )}

          {isInRoom && activeTask && (
            <div className="task-detail">
              <div className="task-detail-header">
                <span className="task-detail-name">📋 {activeTask.name}</span>
                <span className="task-detail-desc">{activeTask.description}</span>
              </div>

              {/* 任务清单 */}
              <div className="task-checklist">
                <div className="checklist-title">任务清单</div>
                {activeTask.checklist.map((item, i) => (
                  <div key={i} className="checklist-item">
                    <span className={`check-box ${phase === 'task-active' && i < (activeTask.checklist.length - 1) ? 'check-done' : ''}`}>
                      {phase === 'task-active' && i < (activeTask.checklist.length - 1) ? '✓' : '○'}
                    </span>
                    <span className="check-text">{item}</span>
                  </div>
                ))}
              </div>

              {/* 奖励预览 */}
              <div className="task-reward-preview">
                <span className="reward-preview-label">完成奖励：</span>
                {activeTask.reward.coins && (
                  <span className="reward-preview-item reward-coin">
                    <img className="reward-preview-icon" src={gameAssets.icons.coin} alt="宝钱" /> +{activeTask.reward.coins}
                  </span>
                )}
                {activeTask.reward.reputation && (
                  <span className="reward-preview-item reward-rep">
                    <img className="reward-preview-icon" src={gameAssets.icons.reputation} alt="口碑" /> +{activeTask.reward.reputation}
                  </span>
                )}
                {activeTask.reward.heritage && (
                  <span className="reward-preview-item reward-her">
                    <img className="reward-preview-icon" src={gameAssets.icons.heritage} alt="传承值" /> +{activeTask.reward.heritage}
                  </span>
                )}
              </div>

              {/* 操作按钮 */}
              <div className="task-actions">
                {phase === 'task-active' && (
                  <button className="btn-complete" onClick={handleCompleteTask}>
                    <span>✨</span> 完成任务
                  </button>
                )}
                <button className="btn-leave" onClick={handleLeave}>
                  <span>↩</span> 返回主界面
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
