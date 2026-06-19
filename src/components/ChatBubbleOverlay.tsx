import { useEffect, useMemo, useRef, useState } from 'react'
import {
  actorDialogueData,
  type ActorId,
} from '../game/actorDialogueData'
import './ChatBubbleOverlay.css'

/** 一条聊天消息 */
export interface ChatMessage {
  id: number
  from: 'actor' | 'player'
  /** 完整文本（已揭晓） */
  text: string
  /** 已显示的字符数（打字机进度） */
  revealed: number
  /** 话题标签（仅 actor） */
  tag?: string
}

export interface ChatBubbleOverlayProps {
  actorId: ActorId
  affinity: number
  messages: ChatMessage[]
  onClose: () => void
  onSend: (text: string) => void
  /** 父级推进消息进度的回调 */
  onAdvance: (msgId: number, newRevealed: number) => void
}

const TYPING_SPEED = 30 // ms/字
const MAX_INPUT_LENGTH = 40

export default function ChatBubbleOverlay({
  actorId,
  affinity,
  messages,
  onClose,
  onSend,
  onAdvance,
}: ChatBubbleOverlayProps) {
  const data = actorDialogueData[actorId]
  const [input, setInput] = useState('')
  const messagesRef = useRef<HTMLDivElement>(null)
  const onAdvanceRef = useRef(onAdvance)
  onAdvanceRef.current = onAdvance

  // 自动滚动到底部
  useEffect(() => {
    const el = messagesRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages])

  // 打字机效果：推进最后一条 actor 消息的 revealed
  useEffect(() => {
    const last = messages[messages.length - 1]
    if (!last) return
    if (last.from === 'player') return
    if (last.revealed >= last.text.length) return

    const t = window.setTimeout(() => {
      onAdvanceRef.current(last.id, last.revealed + 1)
    }, TYPING_SPEED)

    return () => clearTimeout(t)
  }, [messages])

  // 计算下一条 affinity 门槛
  const nextThreshold = useMemo(() => {
    const thresholds = data.affinityLines.map((a) => a.threshold).sort((a, b) => a - b)
    return thresholds.find((t) => affinity < t) ?? null
  }, [data, affinity])

  const handleSend = () => {
    const text = input.trim().slice(0, MAX_INPUT_LENGTH)
    if (!text) return
    setInput('')
    onSend(text)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="chat-overlay" role="dialog" aria-label={`与 ${data.name} 对话`}>
      <div className="chat-card">
        {/* 顶部：演员名 + 亲密度 + 关闭 */}
        <header className="chat-header">
          <div className="chat-header-left">
            <div
              className="chat-avatar"
              style={{ background: data.avatarBg }}
            >
              <img
                className="chat-avatar-img"
                src={data.avatarSrc}
                alt={data.name}
                draggable={false}
                onError={(e) => {
                  const el = e.currentTarget as HTMLImageElement
                  el.style.display = 'none'
                  const fb = el.nextElementSibling as HTMLElement | null
                  if (fb) fb.style.display = 'inline-flex'
                }}
              />
              <span className="chat-avatar-emoji" style={{ display: 'none' }}>
                {data.avatarEmoji}
              </span>
            </div>
            <div className="chat-header-text">
              <div className="chat-name">
                {data.name}
                <span className="chat-role-tag">{data.roleType}</span>
              </div>
              <div className="chat-affinity">
                <span className="chat-affinity-label">亲密度</span>
                <span className="chat-affinity-value">❤ {affinity}</span>
                {nextThreshold !== null && (
                  <span className="chat-affinity-hint">
                    （距下一剧情 {nextThreshold - affinity}）
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            className="chat-close"
            onClick={onClose}
            aria-label="关闭对话"
            title="关闭"
          >
            ✕
          </button>
        </header>

        {/* 消息流 */}
        <div className="chat-messages" ref={messagesRef}>
          {messages.map((m) => {
            const isActor = m.from === 'actor'
            const displayText = m.text.slice(0, m.revealed)
            return (
              <div
                key={m.id}
                className={`chat-msg ${isActor ? 'chat-msg--actor' : 'chat-msg--player'}`}
              >
                {isActor && (
                  <div
                    className="chat-msg-avatar"
                    style={{ background: data.avatarBg }}
                  >
                    <img
                      src={data.avatarSrc}
                      alt={data.name}
                      className="chat-msg-avatar-img"
                      draggable={false}
                      onError={(e) => {
                        const el = e.currentTarget as HTMLImageElement
                        el.style.display = 'none'
                        const fb = el.nextElementSibling as HTMLElement | null
                        if (fb) fb.style.display = 'inline-flex'
                      }}
                    />
                    <span className="chat-msg-avatar-emoji" style={{ display: 'none' }}>
                      {data.avatarEmoji}
                    </span>
                  </div>
                )}
                <div className="chat-msg-bubble">
                  {m.tag && (
                    <span className="chat-msg-tag">【{m.tag}】</span>
                  )}
                  <span className="chat-msg-text">
                    {displayText}
                    {isActor && m.revealed < m.text.length && (
                      <span className="chat-cursor">▍</span>
                    )}
                  </span>
                </div>
              </div>
            )
          })}
        </div>

        {/* 输入框 */}
        <div className="chat-input-bar">
          <textarea
            className="chat-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`对 ${data.name} 说点什么…（Enter 发送，最多 ${MAX_INPUT_LENGTH} 字）`}
            maxLength={MAX_INPUT_LENGTH}
            rows={1}
          />
          <button
            className="chat-send"
            onClick={handleSend}
            disabled={!input.trim()}
          >
            发送
          </button>
        </div>
      </div>
    </div>
  )
}
