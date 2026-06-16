import { useState, useCallback, useMemo } from 'react'
import { gameAssets } from '../game/assets'
import {
  resources as defaultResources,
  getCurrentLevelRule,
  getNextLevelRule,
} from '../game/gameData'
import './ResourceBar.css'

interface ResourceValues {
  gold: number
  reputation: number
  heritage: number
  exp: number
  level: number
}

/** 图标图片组件：加载失败时回退 emoji */
function IconImg({ src, alt, fallback }: { src: string; alt: string; fallback: string }) {
  return (
    <img
      className="res-icon-img"
      src={src}
      alt={alt}
      onError={(e) => {
        const el = e.currentTarget
        el.style.display = 'none'
        const sib = el.nextElementSibling as HTMLElement | null
        if (sib) sib.style.display = 'inline'
      }}
    />
  )
}

/** 资源项描述 */
interface ResourceItem {
  key: 'gold' | 'reputation' | 'heritage' | 'level'
  label: string
  icon: string
  fallback: string
  description: string
  colorClass: string
}

const resourceList: ResourceItem[] = [
  {
    key: 'gold',
    label: '宝钱',
    icon: gameAssets.icons.coin,
    fallback: '🪙',
    description: '宝钱可用于购买更好的桌椅、道具、戏服和妆造材料。',
    colorClass: 'res-gold',
  },
  {
    key: 'reputation',
    label: '口碑',
    icon: gameAssets.icons.reputation,
    fallback: '👏',
    description: '口碑越高，来的顾客越多，售票收益越高。',
    colorClass: 'res-reputation',
  },
  {
    key: 'heritage',
    label: '传承值',
    icon: gameAssets.icons.heritage,
    fallback: '📜',
    description: '传承值越高，可以邀请更好的演员。',
    colorClass: 'res-heritage',
  },
  {
    key: 'level',
    label: '等级',
    icon: gameAssets.icons.coin,
    fallback: '⭐',
    description: '等级越高，可选择的京剧剧本越多；等级越高，可解锁更好看的票根样式。',
    colorClass: 'res-level',
  },
]

interface ResourceBarProps {
  resources?: ResourceValues
}

export default function ResourceBar({ resources }: ResourceBarProps) {
  const resValues = resources ?? defaultResources
  const [hovered, setHovered] = useState<string | null>(null)
  const [popup, setPopup] = useState<'journal' | 'achievement' | null>(null)

  const closePopup = useCallback(() => setPopup(null), [])

  // 经验进度计算
  const expProgress = useMemo(() => {
    const exp = resValues.exp
    const currentRule = getCurrentLevelRule(exp)
    const nextRule = getNextLevelRule(exp)
    if (!nextRule) return { current: exp, next: exp, pct: 100 }
    const total = nextRule.requiredExp - currentRule.requiredExp
    const done = exp - currentRule.requiredExp
    return { current: done, next: total, pct: Math.min(100, Math.round((done / total) * 100)) }
  }, [resValues.exp])

  return (
    <>
      {/* ====== 右上角 HUD 条 ====== */}
      <div className="resource-bar">
        {/* 四个资源胶囊 */}
        {resourceList.map((res) => {
          const isLevel = res.key === 'level'
          const value = isLevel ? resValues.level : resValues[res.key]
          const isHovered = hovered === res.key
          return (
            <div
              key={res.key}
              className={`resource-item ${res.colorClass}${isLevel ? ' resource-item--level' : ''}`}
              onMouseEnter={() => setHovered(res.key)}
              onMouseLeave={() => setHovered(null)}
            >
              {/* button-bg 背景层 */}
              <div className="resource-bg" />

              {/* 图标 PNG 直接显示，无圆形背景 */}
              <div className="resource-icon-png">
                <IconImg src={res.icon} alt={res.label} fallback={res.fallback} />
                <span className="resource-emoji-fb">{res.fallback}</span>
              </div>

              {isLevel ? (
                <div className="resource-level-info">
                  <span className="resource-value res-level-lv">Lv.{value}</span>
                  <div className="res-exp-bar-wrap">
                    <div className="res-exp-bar-fill" style={{ width: `${expProgress.pct}%` }} />
                  </div>
                  <span className="res-exp-text">经验 {expProgress.current}/{expProgress.next}</span>
                </div>
              ) : (
                <>
                  <span className="resource-value">{value.toLocaleString()}</span>
                  <span className="resource-label">{res.label}</span>
                </>
              )}

              {/* hover 说明浮层 */}
              {isHovered && (
                <div className="resource-tooltip">
                  <div className="tooltip-arrow" />
                  <div className="tooltip-content">
                    <div className="tooltip-title">{res.label}</div>
                    <div className="tooltip-desc">{res.description}</div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ====== 弹窗浮层 ====== */}
      {popup === 'journal' && (
        <div className="popup-overlay" onClick={closePopup}>
          <div className="ly-board-frame popup-panel" onClick={(e) => e.stopPropagation()}>
            <button className="popup-close" onClick={closePopup}>✕</button>
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

      {popup === 'achievement' && (
        <div className="popup-overlay" onClick={closePopup}>
          <div className="ly-board-frame popup-panel" onClick={(e) => e.stopPropagation()}>
            <button className="popup-close" onClick={closePopup}>✕</button>
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
    </>
  )
}
