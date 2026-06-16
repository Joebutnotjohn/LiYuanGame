import { gameAssets } from '../game/assets'
import { rooms } from '../game/gameData'
import './TaskBar.css'

/** PNG 按钮图片组件：加载失败时显示文字 fallback */
function PngButton({ src, alt }: { src: string; alt: string }) {
  return (
    <img
      className="task-btn-png"
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

/** 按钮配置 */
const buttonConfig = rooms.map((room) => ({
  id: room.id,
  name: room.name,
  imgSrc:
    room.id === 'ticket'
      ? gameAssets.buttons.ticket
      : room.id === 'backstage'
        ? gameAssets.buttons.backstage
        : room.id === 'makeup'
          ? gameAssets.buttons.makeup
          : room.id === 'practice'
            ? gameAssets.buttons.practice
            : gameAssets.buttons.stage,
}))

export type RoomId = (typeof rooms)[number]['id']

interface TaskBarProps {
  activeTask: RoomId | null
  onTaskClick: (roomId: RoomId) => void
}

export default function TaskBar({ activeTask, onTaskClick }: TaskBarProps) {
  return (
    <div className="task-bar">
      <div className="task-bar-bg" />

      <div className="task-buttons">
        {buttonConfig.map((btn) => {
          const isActive = activeTask === btn.id

          return (
            <button
              key={btn.id}
              className={`task-room-btn ${isActive ? 'task-room-active' : ''}`}
              onClick={() => onTaskClick(btn.id)}
              title={btn.name}
            >
              {/* PNG 图片即按钮本体 */}
              <PngButton src={btn.imgSrc} alt={btn.name} />

              {/* 图片加载失败时的文字 fallback */}
              <span className="task-btn-fallback">{btn.name}</span>

              {/* 激活光晕层（叠加在图片上方但用 pointer-events: none） */}
              {isActive && <div className="room-btn-glow" />}
            </button>
          )
        })}
      </div>
    </div>
  )
}
