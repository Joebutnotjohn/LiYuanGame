import { useEffect, useState } from 'react'
import './Player.css'

interface PlayerProps {
  x: number
  y: number
}

export default function Player({ x, y }: PlayerProps) {
  const [pos, setPos] = useState({ x: 50, y: 85 })
  const [facing, setFacing] = useState<'down' | 'up' | 'left' | 'right'>('up')

  useEffect(() => {
    const dx = x - pos.x
    const dy = y - pos.y

    if (Math.abs(dx) > Math.abs(dy)) {
      setFacing(dx > 0 ? 'right' : 'left')
    } else {
      setFacing(dy > 0 ? 'down' : 'up')
    }

    const timer = setTimeout(() => {
      setPos({ x, y })
    }, 50)

    return () => clearTimeout(timer)
  }, [x, y])

  return (
    <div
      className={`player player-facing-${facing}`}
      style={{
        left: `${pos.x}%`,
        top: `${pos.y}%`,
        transition: 'left 0.6s cubic-bezier(0.34, 1.56, 0.64, 1), top 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}
    >
      <div className="player-shadow" />
      <div className="player-body">
        <div className="player-head">
          <div className="player-face">
            <span className="player-eye player-eye-left">•</span>
            <span className="player-eye player-eye-right">•</span>
            <span className="player-mouth">﹀</span>
          </div>
          <div className="player-hat">🎩</div>
        </div>
        <div className="player-torso">
          <div className="player-costume" />
          <div className="player-belt" />
        </div>
        <div className="player-feet">
          <div className="player-shoe player-shoe-left" />
          <div className="player-shoe player-shoe-right" />
        </div>
      </div>
    </div>
  )
}
