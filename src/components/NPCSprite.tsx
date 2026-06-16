import { useState, useEffect, useRef, useCallback } from 'react'
import type { NPCData, Waypoint } from '../game/npcData'
import './NPCSprite.css'

interface NPCSpriteProps {
  npc: NPCData
  /** 画布容器宽度（px），用于百分比→像素换算 */
  canvasWidth: number
  /** 画布容器高度（px），用于百分比→像素换算 */
  canvasHeight: number
}

/** 两个坐标点之间的欧氏距离（百分比坐标） */
function dist(a: Waypoint, b: Waypoint): number {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return Math.sqrt(dx * dx + dy * dy)
}

/** 线性插值 */
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

export default function NPCSprite({ npc, canvasWidth, canvasHeight }: NPCSpriteProps) {
  const route = npc.route
  const speed = npc.speed // 百分比/秒

  // ---- 状态 ----
  const [currentPos, setCurrentPos] = useState<Waypoint>(npc.initialPosition)
  const [facingRight, setFacingRight] = useState(true)
  const [bubbleVisible, setBubbleVisible] = useState(false)
  const [idleFloat, setIdleFloat] = useState(false)

  // 动画帧引用
  const rafRef = useRef<number>(0)
  const waypointIndexRef = useRef(0) // 当前走向哪个路径点
  const progressRef = useRef(0) // 当前段进度 0~1
  const pausedRef = useRef(false)
  const pauseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const bubbleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 上一帧时间戳
  const lastTimeRef = useRef<number>(0)

  /** 随机停留 0.8~1.6 秒 */
  const pauseAtWaypoint = useCallback(
    (cb: () => void) => {
      const duration = 800 + Math.random() * 800
      pausedRef.current = true
      setIdleFloat(true)
      pauseTimerRef.current = setTimeout(() => {
        pausedRef.current = false
        setIdleFloat(false)
        cb()
      }, duration)
    },
    [],
  )

  /** 推进到下一个路径点 */
  const advanceWaypoint = useCallback(() => {
    const nextIdx = (waypointIndexRef.current + 1) % route.length
    waypointIndexRef.current = nextIdx
    progressRef.current = 0
  }, [route.length])

  // ---- 主循环 ----
  useEffect(() => {
    if (!canvasWidth || !canvasHeight) return
    if (route.length < 2) {
      // 单点或空路线：仅 idle
      setIdleFloat(true)
      return
    }

    const animate = (timestamp: number) => {
      if (lastTimeRef.current === 0) {
        lastTimeRef.current = timestamp
      }
      const dt = Math.min((timestamp - lastTimeRef.current) / 1000, 0.1) // 上限 100ms 防跳帧
      lastTimeRef.current = timestamp

      if (!pausedRef.current) {
        const fromIdx = waypointIndexRef.current
        const toIdx = (fromIdx + 1) % route.length
        const from = route[fromIdx]
        const to = route[toIdx]

        const segmentDist = dist(from, to)
        if (segmentDist > 0) {
          const advance = (speed * dt) / segmentDist
          progressRef.current = Math.min(progressRef.current + advance, 1)

          // 更新方向
          if (to.x > from.x) {
            setFacingRight(true)
          } else if (to.x < from.x) {
            setFacingRight(false)
          }

          // 更新位置
          const t = progressRef.current
          setCurrentPos({
            x: lerp(from.x, to.x, t),
            y: lerp(from.y, to.y, t),
          })
        }

        // 到达当前路径点
        if (progressRef.current >= 1) {
          setCurrentPos(to)
          pauseAtWaypoint(advanceWaypoint)
        }
      }

      rafRef.current = requestAnimationFrame(animate)
    }

    rafRef.current = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(rafRef.current)
      if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current)
      if (bubbleTimerRef.current) clearTimeout(bubbleTimerRef.current)
    }
  }, [canvasWidth, canvasHeight, route, speed, pauseAtWaypoint, advanceWaypoint])

  // ---- 点击显示气泡 ----
  const handleClick = useCallback(() => {
    if (bubbleTimerRef.current) clearTimeout(bubbleTimerRef.current)
    setBubbleVisible(true)
    bubbleTimerRef.current = setTimeout(() => {
      setBubbleVisible(false)
    }, 2500 + Math.random() * 500)
  }, [])

  // ---- 计算像素坐标 ----
  const pxX = (currentPos.x / 100) * canvasWidth
  const pxY = (currentPos.y / 100) * canvasHeight

  // ---- NPC 尺寸 ----
  // baseHeight 设为原始图片在页面中的基准高度 (约 140px)
  const baseHeight = npc.type === 'actor' ? 140 : 130
  const npcHeight = baseHeight * npc.scale
  const npcWidth = npcHeight * 0.65 // 假设宽高比约 0.65

  // 是否正在行走（非 idle 且路线 > 1）
  const isWalking = !idleFloat && route.length > 1

  return (
    <div
      className={`npc-sprite ${idleFloat ? 'npc-sprite--idle' : ''} ${isWalking ? 'npc-sprite--walking' : ''}`}
      style={{
        left: `${currentPos.x}%`,
        top: `${currentPos.y}%`,
        transform: `translate(-50%, -100%)`,
        transition: 'none',
      }}
      onClick={handleClick}
    >
      {/* 气泡 */}
      {bubbleVisible && (
        <div className="npc-bubble">
          <span className="npc-bubble-text">{npc.bubbleText}</span>
        </div>
      )}

      {/* 精灵图 */}
      <img
        className="npc-img"
        src={npc.sprite}
        alt={npc.name}
        style={{
          width: npcWidth,
          height: npcHeight,
          transform: `scaleX(${facingRight ? 1 : -1})`,
          objectFit: 'contain',
        }}
        draggable={false}
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).style.display = 'none'
        }}
      />

      {/* 脚下阴影 */}
      <div
        className="npc-shadow"
        style={{ width: npcWidth * 0.75, height: npcHeight * 0.08 }}
      />
    </div>
  )
}
