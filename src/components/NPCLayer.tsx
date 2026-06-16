import { useState, useEffect, useRef } from 'react'
import { mainPageNPCs } from '../game/npcData'
import NPCSprite from './NPCSprite'
import './NPCLayer.css'

export default function NPCLayer() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [canvasSize, setCanvasSize] = useState({ w: 0, h: 0 })

  // 监听画布容器尺寸变化
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const update = () => {
      const rect = el.getBoundingClientRect()
      setCanvasSize({ w: rect.width, h: rect.height })
    }

    update()

    const ro = new ResizeObserver(update)
    ro.observe(el)

    return () => ro.disconnect()
  }, [])

  return (
    <div className="npc-layer" ref={containerRef}>
      {canvasSize.w > 0 &&
        canvasSize.h > 0 &&
        mainPageNPCs.map((npc) => (
          <NPCSprite
            key={npc.id}
            npc={npc}
            canvasWidth={canvasSize.w}
            canvasHeight={canvasSize.h}
          />
        ))}
    </div>
  )
}
