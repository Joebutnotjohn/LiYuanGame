import { useCallback, useMemo, useRef, useState, useEffect } from 'react'
import { gameAssets } from '../game/assets'
import {
  stageProps,
  evaluateBackstageTasks,
  areAllTasksCompleted,
  canAddProp,
  getTaskProgress,
  placedPropsToIds,
  generateInstanceId,
  propCultureMap,
  propSizeConfig,
  calculateEnhancedStageScores,
  getEnhancedMasterAdvice,
  getEnhancedRewardPreview,
  evaluateStageKnowledgeTasks,
  isOneDeskTwoChairsTriggered,
  judgePlacement,
  fullRecommendation,
  stageKnowledgeTaskDefs,
  type BackstageProgress,
  type StageProp,
  type BackstageTask,
  type StageKnowledgeTask,
  type PropCategory,
  type PlacedPropInstance,
  type PropCultureInfo,
} from '../game/backstageData'
import { getAchievementById, type Achievement } from '../game/gameData'
import GuideNPC from './GuideNPC'
import ResourceBar from './ResourceBar'
import './BackstageScene.css'

// ==============================
// Props
// ==============================

export interface BackstageSceneProps {
  resources: {
    gold: number
    reputation: number
    heritage: number
    exp: number
    level: number
  }
  backstageProgress: BackstageProgress
  onBackstageProgressChange: (next: BackstageProgress) => void
  onResourceChange: (delta: {
    goldDelta?: number
    reputationDelta?: number
    heritageDelta?: number
    expDelta?: number
  }) => void
  onBack: () => void
  onComplete: () => void
  /** 导引 NPC 文案（可选） */
  guideText?: string
}

// ==============================
// 道具 ID → 资源 key 映射
// ==============================

const propImageKeyMap: Record<string, keyof typeof gameAssets.backstage.props> = {
  table: 'desk',
  chair: 'chair',
  wine_cup: 'wine',
  sword: 'sword',
  screen: 'pingfeng',
  lantern: 'light',
  banner: 'flag',
  candlestick: 'candle',
}

function getPropImageSrc(propId: string): string {
  const key = propImageKeyMap[propId]
  if (!key) return ''
  return gameAssets.backstage.props[key]
}

function getPropFallbackSrc(propId: string): string {
  const key = propImageKeyMap[propId]
  if (!key) return ''
  return gameAssets.backstage.propsFallback[key]
}

function getPropEmoji(id: string): string {
  const map: Record<string, string> = {
    table: '🪑', chair: '💺', wine_cup: '🍶', sword: '⚔️',
    screen: '🖼️', lantern: '🏮', banner: '🚩', candlestick: '🕯️',
  }
  return map[id] ?? '📦'
}


// ==============================
// 道具卡片（仓库侧边栏）
// ==============================

function PropCard({
  prop,
  isSelected,
  currentCount,
  disabled,
  reason,
  isDragging,
  onMouseDown,
  onInfoClick,
  onDoubleClick,
}: {
  prop: StageProp
  isSelected: boolean
  currentCount: number
  disabled: boolean
  reason?: string
  isDragging: boolean
  onMouseDown: (e: React.MouseEvent) => void
  onInfoClick: () => void
  onDoubleClick?: () => void
}) {
  const categoryLabel: Record<PropCategory, string> = {
    furniture: '家具', prop: '道具', decoration: '装饰',
  }

  const imgSrc = getPropImageSrc(prop.id)
  const fallbackSrc = getPropFallbackSrc(prop.id)

  return (
    <div
      className={`bps-prop-card ${isSelected ? 'bps-prop-card--selected' : ''} ${disabled ? 'bps-prop-card--disabled' : ''} ${isDragging ? 'bps-prop-card--dragging' : ''}`}
      onMouseDown={disabled ? undefined : onMouseDown}
      onDoubleClick={onDoubleClick}
    >
      <div className="bps-prop-card-icon">
        {imgSrc ? (
          <img
            src={imgSrc}
            alt={prop.name}
            className="bps-prop-img"
            draggable={false}
            onError={(e) => {
              const img = e.currentTarget as HTMLImageElement
              if (img.src === fallbackSrc) {
                img.style.display = 'none'
                const fb = img.nextElementSibling as HTMLElement | null
                if (fb) fb.style.display = 'flex'
              } else {
                img.src = fallbackSrc
              }
            }}
          />
        ) : null}
        <span className="bps-prop-img-fallback">{getPropEmoji(prop.id)}</span>
      </div>
      <div className="bps-prop-card-info">
        <div className="bps-prop-card-name">
          <span className="bps-prop-cat-tag">{categoryLabel[prop.category]}</span>
          {prop.name}
        </div>
        <div className="bps-prop-card-stats">
          {prop.clarityBonus > 0 && <span className="bps-stat-clarity">清晰 +{prop.clarityBonus}</span>}
          {prop.traditionBonus > 0 && <span className="bps-stat-tradition">传统 +{prop.traditionBonus}</span>}
          {prop.tragedyBonus > 0 && <span className="bps-stat-tragedy">悲剧 +{prop.tragedyBonus}</span>}
          {prop.riskBonus > 0 && <span className="bps-stat-risk">风险 +{prop.riskBonus}</span>}
        </div>
        <div className="bps-prop-card-bottom">
          <span className="bps-prop-cost">材料 {prop.costMaterial}</span>
          <span className="bps-prop-limit">
            {currentCount}/{prop.maxCount}
          </span>
        </div>
      </div>
      {disabled && reason && <div className="bps-prop-card-reason">{reason}</div>}
      <button
        className="bps-prop-info-btn"
        onClick={(e) => { e.stopPropagation(); onInfoClick() }}
        title="查看道具说明"
      >
        ?
      </button>
    </div>
  )
}

// ==============================
// 道具说明面板
// ==============================

function CulturePanel({
  prop,
  info,
  onClose,
}: {
  prop: StageProp
  info: PropCultureInfo
  onClose: () => void
}) {
  const categoryLabel: Record<PropCategory, string> = {
    furniture: '家具', prop: '道具', decoration: '装饰',
  }

  return (
    <div className="bps-culture-overlay" onClick={onClose}>
      <div className="bps-culture-panel" onClick={(e) => e.stopPropagation()}>
        <button className="bps-culture-close" onClick={onClose}>✕</button>

        <div className="bps-culture-header">
          <div className="bps-culture-icon-wrap">
            <img
              src={getPropImageSrc(prop.id)}
              alt={prop.name}
              className="bps-culture-icon"
              draggable={false}
              onError={(e) => {
                const img = e.currentTarget as HTMLImageElement
                img.style.display = 'none'
                const fb = img.nextElementSibling as HTMLElement | null
                if (fb) fb.style.display = 'flex'
              }}
            />
            <span className="bps-culture-emoji-fb">{getPropEmoji(prop.id)}</span>
          </div>
          <div>
            <h2 className="bps-culture-name">{prop.name}</h2>
            <span className="bps-culture-category">{categoryLabel[prop.category]}</span>
          </div>
        </div>

        <div className="bps-culture-body">
          <div className="bps-culture-section">
            <h4>京剧舞台用法</h4>
            <p>{info.beijingOperaUsage}</p>
          </div>
          <div className="bps-culture-section">
            <h4>本剧作用</h4>
            <p>{info.playRole}</p>
          </div>
          <div className="bps-culture-section">
            <h4>推荐摆法</h4>
            <p>{info.placementAdvice}</p>
          </div>
          <div className="bps-culture-section">
            <h4>文化内涵</h4>
            <p>{info.culturalMeaning}</p>
          </div>
          <div className="bps-culture-section">
            <h4>评分影响</h4>
            <p>{info.scoreImpact}</p>
            <div className="bps-culture-scores">
              {prop.clarityBonus > 0 && <span className="bps-stat-clarity">清晰度 +{prop.clarityBonus}</span>}
              {prop.traditionBonus > 0 && <span className="bps-stat-tradition">传统还原度 +{prop.traditionBonus}</span>}
              {prop.tragedyBonus > 0 && <span className="bps-stat-tragedy">悲剧氛围 +{prop.tragedyBonus}</span>}
              {prop.riskBonus > 0 && <span className="bps-stat-risk">演出风险 +{prop.riskBonus}</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ==============================
// 成就解锁通知（浮层，不改变布局）
// ==============================

function AchievementUnlockPopup({
  achievement,
  onDismiss,
}: {
  achievement: Achievement
  onDismiss: () => void
}) {
  return (
    <div className="bps-achievement-overlay" onClick={onDismiss}>
      <div className="bps-achievement-popup" onClick={(e) => e.stopPropagation()}>
        <div className="bps-achievement-badge">🏆</div>
        <h2 className="bps-achievement-title">新的成就达成！</h2>
        <div className="bps-achievement-name">{achievement.name}</div>
        <p className="bps-achievement-desc">{achievement.description}</p>
        {achievement.cultureNote && (
          <div className="bps-achievement-culture">
            <div className="bps-achievement-culture-title">文化小知识</div>
            <p>{achievement.cultureNote}</p>
          </div>
        )}
        {achievement.goldReward > 0 && (
          <div className="bps-achievement-reward">
            +{achievement.goldReward} 宝钱
          </div>
        )}
        <p className="bps-achievement-hint">点击任意处关闭（5秒后自动消失）</p>
      </div>
    </div>
  )
}

// ==============================
// 一桌二椅触发提示横条（顶部中间）
// ==============================

function OneDeskTwoChairsTip({ text, onDismiss }: { text: string; onDismiss: () => void }) {
  return (
    <div className="bps-desk-chair-tip-bar">
      <div className="bps-desk-chair-tip-icon">📖</div>
      <span className="bps-desk-chair-tip-text">{text}</span>
      <button className="bps-desk-chair-tip-close" onClick={onDismiss}>✕</button>
    </div>
  )
}

// ==============================
// 评分面板组件
// ==============================

function ScorePanel({
  scores,
  tasks,
  placedPropIds,
  knowledgeTasks,
  rewardPreview,
  onKnowledgeTaskClick,
}: {
  scores: BackstageProgress['stageScores']
  tasks: BackstageTask[]
  placedPropIds: string[]
  knowledgeTasks: StageKnowledgeTask[]
  rewardPreview: { gold: number; exp: number; heritage: number; reputation: number }
  onKnowledgeTaskClick: (task: StageKnowledgeTask) => void
}) {
  const scoreItems = [
    { key: 'clarity', label: '舞台清晰度', value: scores.clarity, cls: 'clarity' },
    { key: 'tradition', label: '传统还原度', value: scores.tradition, cls: 'tradition' },
    { key: 'tragedy', label: '悲剧氛围', value: scores.tragedy, cls: 'tragedy' },
    { key: 'risk', label: '演出风险', value: scores.risk, cls: 'risk' },
  ]

  const rewardItems = [
    { key: 'exp', label: '经验值', value: rewardPreview.exp, icon: gameAssets.icons.exp, fallback: '⭐' },
    { key: 'heritage', label: '传承值', value: rewardPreview.heritage, icon: gameAssets.icons.heritage, fallback: '📜' },
    { key: 'reputation', label: '口碑', value: rewardPreview.reputation, icon: gameAssets.icons.reputation, fallback: '🎭' },
  ]

  return (
    <div className="bps-score-panel">
      <div className="bps-score-section">
        <h3 className="bps-score-title">舞台效果评价</h3>
        <div className="bps-score-list">
          {scoreItems.map((item) => (
            <div key={item.key} className="bps-score-row">
              <span className="bps-score-label">{item.label}</span>
              <div className="bps-score-bar-wrap">
                <div
                  className={`bps-score-bar bps-score-bar--${item.cls}`}
                  style={{ width: `${Math.min(item.value, 100)}%` }}
                />
              </div>
              <span className={`bps-score-val ${item.cls === 'risk' && item.value >= 60 ? 'bps-score-val--danger' : ''}`}>{item.value}</span>
            </div>
          ))}
        </div>
        {scores.risk >= 60 && (
          <div className="bps-risk-warning bps-risk-warning--high">⚠ 风险过高！奖励将降低</div>
        )}
        {scores.risk > 15 && scores.risk < 60 && (
          <div className="bps-risk-warning">⚠ 风险偏高可能影响演出效果</div>
        )}
        <div className="bps-total-score">
          综合评分：<strong>{scores.totalScore}</strong> 分
        </div>
      </div>

      <div className="bps-task-section">
        <h3 className="bps-task-title">任务清单</h3>
        <ul className="bps-task-list">
          {tasks.map((t) => {
            const prog = getTaskProgress(t.id, placedPropIds)
            return (
              <li key={t.id} className={`bps-task-item ${t.isCompleted ? 'bps-task-item--done' : ''}`}>
                <span className="bps-task-check">{t.isCompleted ? '✓' : '○'}</span>
                <div className="bps-task-info">
                  <span className="bps-task-name">{t.name}</span>
                  <span className="bps-task-desc">
                    {t.description} ({prog.current}/{prog.target})
                  </span>
                </div>
              </li>
            )
          })}
        </ul>
      </div>

      {/* 舞台常识任务 */}
      <div className="bps-task-section bps-knowledge-section">
        <h3 className="bps-task-title bps-knowledge-title">舞台常识</h3>
        <ul className="bps-task-list">
          {knowledgeTasks.map((kt) => (
            <li
              key={kt.id}
              className={`bps-task-item bps-knowledge-item ${kt.isCompleted ? 'bps-task-item--done' : ''}`}
              onClick={() => onKnowledgeTaskClick(kt)}
              title={kt.isCompleted ? '点击查看详情' : undefined}
            >
              <span className="bps-task-check">{kt.isCompleted ? '✓' : '○'}</span>
              <div className="bps-task-info">
                <span className="bps-task-name">{kt.name}</span>
                <span className="bps-task-desc">
                  {kt.isCompleted ? kt.completedHint : kt.description}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="bps-reward-section">
        <h3 className="bps-reward-title">完成后可获得</h3>
        <div className="bps-reward-grid">
          {rewardItems.map((item) => (
            <div key={item.key} className="bps-reward-item">
              <div className="bps-reward-icon-wrap">
                <img
                  className="bps-reward-icon-img"
                  src={item.icon}
                  alt={item.label}
                  onError={(e) => {
                    const img = e.currentTarget as HTMLImageElement
                    img.style.display = 'none'
                    const fb = img.nextElementSibling as HTMLElement | null
                    if (fb) fb.style.display = 'inline'
                  }}
                />
                <span className="bps-reward-icon-fb">{item.fallback}</span>
              </div>
              <span className="bps-reward-label">{item.label}</span>
              <span className="bps-reward-val">+{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ==============================
// 弹窗组件
// ==============================

function ModalOverlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="bps-modal-overlay" onClick={onClose}>
      <div className="bps-modal" onClick={(e) => e.stopPropagation()}>
        <button className="bps-modal-close" onClick={onClose}>✕</button>
        {children}
      </div>
    </div>
  )
}

// ==============================
// 台面道具上下文菜单
// ==============================

function PropContextMenu({
  x,
  y,
  onInfo,
  onRotate,
  onRemove,
  onClose,
}: {
  x: number
  y: number
  onInfo: () => void
  onRotate: () => void
  onRemove: () => void
  onClose: () => void
}) {
  // Close on outside click
  const menuRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    // Delay adding listener to avoid immediate trigger
    const timer = setTimeout(() => document.addEventListener('mousedown', handler), 0)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('mousedown', handler)
    }
  }, [onClose])

  return (
    <div className="bps-context-menu" style={{ left: x, top: y }} ref={menuRef}>
      <button className="bps-context-menu-item" onClick={() => { onInfo(); onClose() }}>
        <span className="bps-context-menu-icon">📖</span>
        查看说明
      </button>
      <button className="bps-context-menu-item" onClick={() => { onRotate(); onClose() }}>
        <span className="bps-context-menu-icon">🔄</span>
        旋转
      </button>
      <button className="bps-context-menu-item bps-context-menu-item--danger" onClick={() => { onRemove(); onClose() }}>
        <span className="bps-context-menu-icon">🗑️</span>
        移除
      </button>
    </div>
  )
}

// ==============================
// NPC 组件
// ==============================

function StageNPC({
  npcId,
  position,
  onClick,
  defaultBubble,
}: {
  npcId: 'npc1' | 'npc2'
  position: 'left' | 'right'
  onClick: () => void
  defaultBubble: string
}) {
  const src = gameAssets.backstage.npcs[npcId]
  const fallback = gameAssets.backstage.npcsFallback[npcId]
  const label = npcId === 'npc1' ? '助手' : '师傅'

  return (
    <div
      className={`bps-stage-npc bps-stage-npc--${position}`}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
    >
      {/* 默认气泡，无需点击即可显示 */}
      <div className="bps-npc-default-bubble">
        <div className="bps-npc-default-bubble-inner">
          {defaultBubble}
        </div>
        <div className="bps-npc-default-bubble-arrow" />
      </div>
      {src ? (
        <img
          src={src}
          alt={label}
          className="bps-npc-img"
          onError={(e) => {
            const img = e.currentTarget as HTMLImageElement
            if (img.src === fallback) {
              img.style.display = 'none'
              const fb = img.nextElementSibling as HTMLElement | null
              if (fb) fb.style.display = 'flex'
            } else {
              img.src = fallback
            }
          }}
        />
      ) : null}
      <span className="bps-npc-fallback">{npcId === 'npc1' ? '🧑' : '👴'}</span>
      <span className="bps-npc-label">{label}</span>
    </div>
  )
}

// ==============================
// 主组件
// ==============================

export default function BackstageScene({
  resources,
  backstageProgress: p,
  onBackstageProgressChange: setP,
  onResourceChange,
  onBack,
  onComplete,
  guideText,
}: BackstageSceneProps) {
  const [categoryFilter, setCategoryFilter] = useState<PropCategory | 'all'>('all')
  const [toastMsg, setToastMsg] = useState<string | null>(null)
  const [modalType, setModalType] = useState<'recommend' | 'advice' | 'npc2' | 'confirmReset' | 'knowledgeTask' | null>(null)
  const [npcBubble, setNpcBubble] = useState<{ type: 'npc2'; text: string } | null>(null)
  const [selectedKnowledgeTask, setSelectedKnowledgeTask] = useState<StageKnowledgeTask | null>(null)
  const [oneDeskTwoChairsTip, setOneDeskTwoChairsTip] = useState<string | null>(null)
  const [achievementPopup, setAchievementPopup] = useState<Achievement | null>(null)

  // ---- 拖拽状态 ----
  const [draggingPropId, setDraggingPropId] = useState<string | null>(null)
  const [dragPreviewPos, setDragPreviewPos] = useState<{ x: number; y: number } | null>(null)
  const [isOverStage, setIsOverStage] = useState(false)
  const [isOverWarehouse, setIsOverWarehouse] = useState(false)
  const sceneRef = useRef<HTMLDivElement>(null)
  const stageAreaRef = useRef<HTMLDivElement>(null)
  const stageWrapperRef = useRef<HTMLDivElement>(null)
  const warehouseRef = useRef<HTMLDivElement>(null)

  // ---- 选中道具 ----
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null)
  const [contextMenu, setContextMenu] = useState<{
    x: number; y: number; instanceId: string
  } | null>(null)

  // ---- 文化说明面板 ----
  const [culturePanelPropId, setCulturePanelPropId] = useState<string | null>(null)

  // ---- 拖拽时显示道具说明 ----
  const [dragInfoText, setDragInfoText] = useState<string | null>(null)

  // ---- 派生数据 ----
  const placedPropIds = useMemo(() => placedPropsToIds(p.placedProps), [p.placedProps])

  const scores = useMemo(() => {
    if (p.isSubmitted) return p.stageScores
    return calculateEnhancedStageScores(p.placedProps)
  }, [p.placedProps, p.isSubmitted, p.stageScores])

  const tasks = useMemo(() => {
    if (p.isSubmitted) return p.backstageTasks
    return evaluateBackstageTasks(placedPropIds)
  }, [placedPropIds, p.isSubmitted, p.backstageTasks])

  const knowledgeTasks = useMemo(() => {
    if (p.isSubmitted) return p.stageKnowledgeTasks
    return evaluateStageKnowledgeTasks(p.placedProps, scores)
  }, [p.placedProps, p.isSubmitted, p.stageKnowledgeTasks, scores])

  const allTasksDone = useMemo(
    () => areAllTasksCompleted(placedPropIds),
    [placedPropIds],
  )

  const rewardPreview = useMemo(
    () => getEnhancedRewardPreview(p.placedProps, scores),
    [p.placedProps, scores],
  )

  const masterAdvice = useMemo(
    () => getEnhancedMasterAdvice(p.placedProps),
    [p.placedProps],
  )

  // ---- Toast 辅助 ----
  const showToast = useCallback((msg: string) => {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(null), 2000)
  }, [])

  // ---- 同步 placedPropIds 到 progress ----
  const syncPlacedProps = useCallback(
    (newPlacedProps: PlacedPropInstance[]) => {
      const newIds = placedPropsToIds(newPlacedProps)
      const newScores = calculateEnhancedStageScores(newPlacedProps)
      const newTasks = evaluateBackstageTasks(newIds)
      const newKnowledgeTasks = evaluateStageKnowledgeTasks(newPlacedProps, newScores)
      // 检测一桌二椅是否首次触发
      const triggered = isOneDeskTwoChairsTriggered(newPlacedProps)
      const wasTriggered = p.oneDeskTwoChairsShown

      setP({
        ...p,
        placedProps: newPlacedProps,
        placedPropIds: newIds,
        stageScores: newScores,
        backstageTasks: newTasks,
        stageKnowledgeTasks: newKnowledgeTasks,
        oneDeskTwoChairsShown: p.oneDeskTwoChairsShown || triggered,
      })

      // 一桌二椅首次触发，顶部显示提示 + 成就解锁
      if (triggered && !wasTriggered) {
        const task = stageKnowledgeTaskDefs.find(t => t.id === 'knowledge_desk_chair')
        setOneDeskTwoChairsTip(task?.masterComment ?? '这就是传统戏曲常说的一桌二椅。桌椅虽少，却能借演员身段变出军帐、厅堂与城楼。')

        // 成就解锁
        const ach = getAchievementById('one_desk_two_chairs')
        if (ach) {
          setAchievementPopup({ ...ach })
          // 发放200宝钱
          onResourceChange({ goldDelta: ach.goldReward })
          // 5秒后自动关闭
          setTimeout(() => setAchievementPopup(null), 5000)
        }
      }

      // 诀别意象首次触发
      const newIdsArr = newPlacedProps.map(p => p.propId)
      const oldIdsArr = p.placedProps.map(p => p.propId)
      if (
        newIdsArr.includes('wine_cup') && newIdsArr.includes('sword') &&
        (!oldIdsArr.includes('wine_cup') || !oldIdsArr.includes('sword'))
      ) {
        const task = stageKnowledgeTaskDefs.find(t => t.id === 'knowledge_sword_wine')
        if (task?.masterComment) {
          setTimeout(() => {
            setNpcBubble({ type: 'npc2', text: task.masterComment! })
          }, 500)
        }
      }
    },
    [p, setP],
  )

  // ---- 添加道具到台面 ----
  const addPropToStage = useCallback(
    (propId: string, xPercent: number, yPercent: number) => {
      if (p.isCompleted) {
        showToast('后台任务已完成，无法修改舞台配置')
        return false
      }

      const result = canAddProp(propId, placedPropIds, { gold: resources.gold })
      if (!result.allowed) {
        showToast(result.reason ?? '无法添加')
        return false
      }

      const prop = stageProps.find(sp => sp.id === propId)!
      const newInstance: PlacedPropInstance = {
        instanceId: generateInstanceId(),
        propId,
        // 整个后台页面坐标系：不再 clamp 到 [0, 100]，允许任意位置
        x: xPercent,
        y: yPercent,
        rotation: 0,
      }

      const newPlaced = [...p.placedProps, newInstance]
      syncPlacedProps(newPlaced)
      onResourceChange({ goldDelta: -prop.costMaterial })

      // 摆放合理性点评
      const judgment = judgePlacement(newInstance, newPlaced)
      if (judgment.isGood) {
        showToast(`已摆放「${prop.name}」`)
      } else {
        showToast(`已摆放「${prop.name}」— ${judgment.comment}`)
      }
      return true
    },
    [p, placedPropIds, resources, syncPlacedProps, onResourceChange, showToast],
  )

  // ---- 移除道具 ----
  const removeProp = useCallback(
    (instanceId: string) => {
      if (p.isCompleted) {
        showToast('后台任务已完成，无法修改舞台配置')
        return
      }

      const instance = p.placedProps.find(inst => inst.instanceId === instanceId)
      if (!instance) return

      const prop = stageProps.find(sp => sp.id === instance.propId)
      const newPlaced = p.placedProps.filter(inst => inst.instanceId !== instanceId)
      syncPlacedProps(newPlaced)

      if (prop) {
        onResourceChange({ goldDelta: prop.costMaterial })
        showToast(`已移除「${prop.name}」（退还材料 ${prop.costMaterial}）`)
      }

      if (selectedInstanceId === instanceId) setSelectedInstanceId(null)
    },
    [p, syncPlacedProps, onResourceChange, showToast, selectedInstanceId],
  )

  // ---- 旋转道具 ----
  const rotateProp = useCallback(
    (instanceId: string) => {
      if (p.isCompleted) return

      const newPlaced = p.placedProps.map(inst => {
        if (inst.instanceId !== instanceId) return inst
        return { ...inst, rotation: (inst.rotation + 45) % 360 }
      })
      syncPlacedProps(newPlaced)
    },
    [p, syncPlacedProps],
  )

  // ---- 移动已摆放道具 ----
  const movePlacedProp = useCallback(
    (instanceId: string, xPercent: number, yPercent: number) => {
      if (p.isCompleted) return

      const newPlaced = p.placedProps.map(inst => {
        if (inst.instanceId !== instanceId) return inst
        return {
          ...inst,
          // 整个后台页面坐标系：不再 clamp 到 [0, 100]
          x: xPercent,
          y: yPercent,
        }
      })
      syncPlacedProps(newPlaced)
    },
    [p, syncPlacedProps],
  )

  // ---- 点击已摆放道具 ----
  const handlePlacedPropClick = useCallback(
    (instanceId: string, e: React.MouseEvent) => {
      e.stopPropagation()
      if (p.isCompleted) return

      setSelectedInstanceId(instanceId)
      // Show context menu
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
      setContextMenu({
        x: rect.right + 4,
        y: rect.top,
        instanceId,
      })
    },
    [p.isCompleted],
  )

  // ---- 双击已摆放道具：打开常识面板 ----
  const handlePlacedPropDoubleClick = useCallback(
    (instanceId: string, e: React.MouseEvent) => {
      e.stopPropagation()
      if (p.isCompleted) return
      const inst = p.placedProps.find(i => i.instanceId === instanceId)
      if (inst) {
        setContextMenu(null)
        setCulturePanelPropId(inst.propId)
      }
    },
    [p.isCompleted, p.placedProps],
  )

  // ---- 拖拽：从仓库开始 ----
  const handlePropDragStart = useCallback(
    (propId: string, e: React.MouseEvent) => {
      if (p.isCompleted) return
      e.preventDefault()

      const result = canAddProp(propId, placedPropIds, { gold: resources.gold })
      if (!result.allowed) {
        showToast(result.reason ?? '无法添加')
        return
      }

      setDraggingPropId(propId)
      setDragPreviewPos({ x: e.clientX, y: e.clientY })
      // 拖拽时显示道具简短说明
      const info = propCultureMap[propId]
      if (info) {
        setDragInfoText(`${info.placementAdvice}`)
      }
    },
    [p.isCompleted, placedPropIds, resources.gold, showToast],
  )

  // ---- 拖拽：已摆放道具开始拖动 ----
  const handlePlacedPropDragStart = useCallback(
    (instanceId: string, e: React.MouseEvent) => {
      if (p.isCompleted) return
      e.preventDefault()
      e.stopPropagation()
      setContextMenu(null)

      setDraggingPropId(instanceId) // reuse draggingPropId, but distinguish by checking placedProps
      setDragPreviewPos({ x: e.clientX, y: e.clientY })
    },
    [p.isCompleted],
  )

  // ---- 全局鼠标移动 ----
  useEffect(() => {
    if (!draggingPropId) return

    const handleMove = (e: MouseEvent) => {
      setDragPreviewPos({ x: e.clientX, y: e.clientY })

      // Check if over stage area
      if (stageAreaRef.current) {
        const rect = stageAreaRef.current.getBoundingClientRect()
        const isOver = (
          e.clientX >= rect.left &&
          e.clientX <= rect.right &&
          e.clientY >= rect.top &&
          e.clientY <= rect.bottom
        )
        setIsOverStage(isOver)
      }

      // Check if over warehouse area (for returning placed props)
      if (warehouseRef.current) {
        const rect = warehouseRef.current.getBoundingClientRect()
        const isOver = (
          e.clientX >= rect.left &&
          e.clientX <= rect.right &&
          e.clientY >= rect.top &&
          e.clientY <= rect.bottom
        )
        setIsOverWarehouse(isOver)
      }
    }

    const handleUp = (e: MouseEvent) => {
      // Determine if this is a placed prop being moved, or a new prop from warehouse
      const isPlacedInstance = p.placedProps.some(inst => inst.instanceId === draggingPropId)

      // 整个后台页面坐标系：sceneRef 覆盖仓库、舞台、评分、按钮、标题栏全部范围
      const sceneRect = sceneRef.current?.getBoundingClientRect()

      if (isPlacedInstance) {
        // Moving an existing placed prop
        if (isOverWarehouse) {
          // Dragged back to warehouse — return the prop
          removeProp(draggingPropId)
        } else if (sceneRect) {
          const xPercent = ((e.clientX - sceneRect.left) / sceneRect.width) * 100
          const yPercent = ((e.clientY - sceneRect.top) / sceneRect.height) * 100
          movePlacedProp(draggingPropId, xPercent, yPercent)
        }
      } else {
        // New prop from warehouse
        if (sceneRect) {
          const xPercent = ((e.clientX - sceneRect.left) / sceneRect.width) * 100
          const yPercent = ((e.clientY - sceneRect.top) / sceneRect.height) * 100
          addPropToStage(draggingPropId, xPercent, yPercent)
        }
      }

      setDraggingPropId(null)
      setDragPreviewPos(null)
      setIsOverStage(false)
      setIsOverWarehouse(false)
      setDragInfoText(null)
    }

    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleUp)
    return () => {
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleUp)
    }
  }, [draggingPropId, isOverStage, isOverWarehouse, p.placedProps, addPropToStage, movePlacedProp, removeProp, showToast])

  // ---- 重置 ----
  const handleReset = useCallback(() => {
    if (p.isCompleted) return
    setModalType('confirmReset')
  }, [p.isCompleted])

  const confirmReset = useCallback(() => {
    let totalRefund = 0
    for (const inst of p.placedProps) {
      const prop = stageProps.find(sp => sp.id === inst.propId)
      if (prop) totalRefund += prop.costMaterial
    }

    setP({
      ...p,
      placedProps: [],
      placedPropIds: [],
      stageScores: { clarity: 0, tradition: 0, tragedy: 0, risk: 0, totalScore: 0 },
      backstageTasks: evaluateBackstageTasks([]),
      stageKnowledgeTasks: stageKnowledgeTaskDefs.map(t => ({ ...t, isCompleted: false })),
      oneDeskTwoChairsShown: false,
    })

    if (totalRefund > 0) {
      onResourceChange({ goldDelta: totalRefund })
    }

    setSelectedInstanceId(null)
    setModalType(null)
    showToast('舞台已重置，材料已退还')
  }, [p, setP, onResourceChange, showToast])

  // ---- NPC 点击 ----
  const handleNpc2Click = useCallback(() => {
    setNpcBubble(prev =>
      prev?.type === 'npc2' ? null : { type: 'npc2', text: masterAdvice }
    )
  }, [masterAdvice])

  // ---- 舞台常识任务点击 ----
  const handleKnowledgeTaskClick = useCallback((task: StageKnowledgeTask) => {
    if (task.isCompleted) {
      setSelectedKnowledgeTask(task)
      setModalType('knowledgeTask')
    }
  }, [])

  // ---- 提交配置 ----
  const handleSubmit = useCallback(() => {
    if (p.isCompleted) return
    if (placedPropIds.length === 0) {
      showToast('请先摆放至少一件道具')
      return
    }
    if (!allTasksDone) {
      showToast('请先完成所有任务再提交')
      return
    }

    const finalScores = calculateEnhancedStageScores(p.placedProps)
    const finalTasks = evaluateBackstageTasks(placedPropIds)
    const finalKnowledgeTasks = evaluateStageKnowledgeTasks(p.placedProps, finalScores)
    const rewards = getEnhancedRewardPreview(p.placedProps, finalScores)

    setP({
      ...p,
      stageScores: finalScores,
      backstageTasks: finalTasks,
      stageKnowledgeTasks: finalKnowledgeTasks,
      isSubmitted: true,
      isCompleted: true,
      preparationScore: finalScores.totalScore,
    })

    onResourceChange({
      expDelta: rewards.exp,
      heritageDelta: rewards.heritage,
      reputationDelta: rewards.reputation,
      goldDelta: rewards.gold,
    })

    showToast('后台筹备已提交！奖励已发放')
    onComplete()
  }, [p, placedPropIds, setP, onResourceChange, onComplete, showToast, allTasksDone])

  // ---- 道具计数 ----
  const propCounts = useMemo(() => {
    const map = new Map<string, number>()
    for (const inst of p.placedProps) {
      map.set(inst.propId, (map.get(inst.propId) ?? 0) + 1)
    }
    return map
  }, [p.placedProps])

  // ---- 筛选道具 ----
  const filteredProps = useMemo(() => {
    if (categoryFilter === 'all') return stageProps
    return stageProps.filter(prop => prop.category === categoryFilter)
  }, [categoryFilter])

  const sortedProps = useMemo(() => {
    const order: Record<string, number> = { furniture: 0, prop: 1, decoration: 2 }
    return [...filteredProps].sort(
      (a, b) => (order[a.category] ?? 99) - (order[b.category] ?? 99),
    )
  }, [filteredProps])

  // ---- 文化说明面板的道具 ----
  const cultureProp = useMemo(
    () => culturePanelPropId ? stageProps.find(sp => sp.id === culturePanelPropId) : null,
    [culturePanelPropId],
  )
  const cultureInfo = useMemo(
    () => culturePanelPropId ? propCultureMap[culturePanelPropId] : null,
    [culturePanelPropId],
  )

  // ---- 获取被拖拽道具的图片 ----
  const draggingImageSrc = useMemo(() => {
    if (!draggingPropId) return null
    // Check if it's a placed instance ID or a prop ID
    const placed = p.placedProps.find(inst => inst.instanceId === draggingPropId)
    const propId = placed ? placed.propId : draggingPropId
    return getPropImageSrc(propId)
  }, [draggingPropId, p.placedProps])

  // ---- 渲染 ----
  const categoryTabs: { key: PropCategory | 'all'; label: string }[] = [
    { key: 'all', label: '全部' },
    { key: 'furniture', label: '家具' },
    { key: 'prop', label: '道具' },
    { key: 'decoration', label: '装饰' },
  ]

  return (
    <div className="bps-overlay">
      {/* NPC 气泡 */}
      {npcBubble && (
        <div className="bps-npc-bubble-container" onClick={() => setNpcBubble(null)}>
          <div
            className={`bps-npc-bubble bps-npc-bubble--${npcBubble.type}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bps-npc-bubble-speaker">
              后台师傅
            </div>
            <div className="bps-npc-bubble-text">{npcBubble.text}</div>
            <button className="bps-npc-bubble-close" onClick={() => setNpcBubble(null)}>✕</button>
          </div>
        </div>
      )}

      {/* 成就解锁弹窗（浮层，不改变布局） */}
      {achievementPopup && (
        <AchievementUnlockPopup
          achievement={achievementPopup}
          onDismiss={() => setAchievementPopup(null)}
        />
      )}

      <div className="bps-scene" ref={sceneRef}>
        {/* 背景图层 */}
        <div
          className="bps-bg-layer"
          style={{ backgroundImage: `url(${gameAssets.backstage.bg})` }}
          onError={(e) => {
            const el = e.currentTarget as HTMLDivElement
            el.style.backgroundImage = 'none'
            el.style.background = 'linear-gradient(180deg, #2a1f14 0%, #1a1410 50%, #3a2818 100%)'
          }}
        />
        {/* 暖色遮罩 */}
        <div className="bps-warm-overlay" />

        {/* Toast */}
        {toastMsg && <div className="bps-toast">{toastMsg}</div>}

        {/* 顶部标题栏 */}
        <header className="bps-header">
          <button className="bps-back-btn" onClick={onBack}>
            ← 返回主页面
          </button>
          <div className="bps-title-group">
            <h1 className="bps-title">后台</h1>
            <p className="bps-subtitle">准备桌椅与道具，完成舞台台面配置</p>
          </div>
          <ResourceBar resources={resources} />
        </header>

        {/* 一桌二椅触发提示（顶部中间） */}
        {oneDeskTwoChairsTip && (
          <OneDeskTwoChairsTip
            text={oneDeskTwoChairsTip}
            onDismiss={() => setOneDeskTwoChairsTip(null)}
          />
        )}

        {/* 主体三栏 */}
        <div className="bps-body">
          {/* 左栏：道具仓库 + 导引 NPC */}
          <div className="bps-left-col">
            <section
              className={`bps-warehouse ${isOverWarehouse ? 'bps-warehouse--over' : ''}`}
              ref={warehouseRef}
            >
            <h2 className="bps-warehouse-title">道具仓库</h2>

            <div className="bps-category-tabs">
              {categoryTabs.map((tab) => (
                <button
                  key={tab.key}
                  className={`bps-cat-tab ${categoryFilter === tab.key ? 'bps-cat-tab--active' : ''}`}
                  onClick={() => setCategoryFilter(tab.key)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="bps-prop-list">
              {sortedProps.map(prop => {
                const currentCount = propCounts.get(prop.id) ?? 0
                const result = canAddProp(prop.id, placedPropIds, { gold: resources.gold })
                const isFull = currentCount >= prop.maxCount
                const disabled = p.isCompleted || !result.allowed || isFull
                const reason = isFull ? `已满 (${prop.maxCount}/${prop.maxCount})` : result.reason

                return (
                  <PropCard
                    key={prop.id}
                    prop={prop}
                    isSelected={false}
                    currentCount={currentCount}
                    disabled={disabled}
                    reason={reason}
                    isDragging={draggingPropId === prop.id}
                    onMouseDown={(e) => handlePropDragStart(prop.id, e)}
                    onInfoClick={() => setCulturePanelPropId(prop.id)}
                    onDoubleClick={() => setCulturePanelPropId(prop.id)}
                  />
                )
              })}
            </div>

            <div className="bps-warehouse-hint">
              {dragInfoText ? dragInfoText : '将道具拖拽至中央戏台'}
            </div>
          </section>

          {/* 导引 NPC（道具仓库右侧，顶部对齐） */}
          {guideText && (
            <GuideNPC
              activeTaskId="backstage"
              tasks={[]}
              customText={guideText}
              variant="backstage"
            />
          )}
          </div>

          {/* 中栏：舞台背景 + 台面放置区 */}
          <section className="bps-stage-col">
            <div className="bps-stage-wrapper" ref={stageWrapperRef}>
              {/* 舞台锚点 stage-anchor：唯一坐标参考系，drop-zone 视觉层 */}
              <div className="bps-stage-anchor">
                {/* 台面放置区（透明覆盖层，铺满锚点，仅作视觉提示） */}
                <div
                  className={`bps-stage-area ${isOverStage ? 'bps-stage-area--over' : ''}`}
                  ref={stageAreaRef}
                  onClick={() => {
                    setSelectedInstanceId(null)
                    setContextMenu(null)
                  }}
                >
                  {/* 空台面提示 */}
                  {p.placedProps.length === 0 && (
                    <div className="bps-stage-empty-hint">
                      将道具拖拽至中央戏台
                    </div>
                  )}
                </div>
              </div>

              {/* 拖拽预览（跟随鼠标） */}
              {draggingPropId && dragPreviewPos && draggingImageSrc && (
                <div
                  className="bps-drag-preview"
                  style={{
                    left: dragPreviewPos.x,
                    top: dragPreviewPos.y,
                    position: 'fixed',
                  }}
                >
                  <img
                    src={draggingImageSrc}
                    alt=""
                    className="bps-drag-preview-img"
                    draggable={false}
                  />
                </div>
              )}

              {/* 拖拽时道具说明提示 */}
              {dragInfoText && draggingPropId && (
                <div className="bps-drag-info-hint">{dragInfoText}</div>
              )}
            </div>

            {/* NPC */}
            <div className="bps-npc-row">
              <StageNPC npcId="npc2" position="right" onClick={handleNpc2Click} defaultBubble={masterAdvice} />
            </div>

            {/* 按钮组 */}
            <div className="bps-btn-row">
              <button
                className="bps-btn bps-btn--secondary"
                onClick={() => {
                  if (p.placedProps.length === 0) {
                    showToast('没有可撤销的操作')
                    return
                  }
                  const last = p.placedProps[p.placedProps.length - 1]
                  removeProp(last.instanceId)
                }}
              >
                ↩ 撤销
              </button>
              <button className="bps-btn bps-btn--secondary" onClick={handleReset}>
                ↻ 重置
              </button>
              <button
                className="bps-btn bps-btn--secondary"
                onClick={() => setModalType('recommend')}
              >
                📖 查看推荐
              </button>
              <button
                className="bps-btn bps-btn--secondary"
                onClick={() => setModalType('advice')}
              >
                💬 与师傅交流
              </button>
            </div>

            {/* 提交按钮 */}
            <div className="bps-submit-area">
              {!p.isCompleted ? (
                <button
                  className={`bps-submit-btn ${allTasksDone ? 'bps-submit-btn--ready' : ''}`}
                  disabled={!allTasksDone}
                  onClick={handleSubmit}
                >
                  {allTasksDone
                    ? '提交配置（完成后台筹备）'
                    : placedPropIds.length === 0
                      ? '请先摆放道具'
                      : '请完成所有任务后提交'}
                </button>
              ) : (
                <div className="bps-done-tag">✓ 后台筹备已完成</div>
              )}
            </div>
          </section>

          {/* 右栏：效果评价 */}
          <section className="bps-eval-col">
            <ScorePanel
              scores={scores}
              tasks={tasks}
              placedPropIds={placedPropIds}
              knowledgeTasks={knowledgeTasks}
              rewardPreview={rewardPreview}
              onKnowledgeTaskClick={handleKnowledgeTaskClick}
            />
          </section>
        </div>

        {/* 已摆放的道具（挂到 bps-scene 作为直接子元素，
            % 父级 = 整个后台页面，松手点 xPercent 真正对应后台视口位置） */}
        {p.placedProps
          .slice()
          .sort((a, b) => a.y - b.y) // 按 y 排序：越靠下的道具渲染在上层
          .map((inst) => {
            const prop = stageProps.find(sp => sp.id === inst.propId)
            if (!prop) return null
            const size = propSizeConfig[inst.propId] ?? { width: 14, zIndexBase: 20 }
            const isSelected = selectedInstanceId === inst.instanceId
            // z-index 基于 y 坐标：越靠下（y越大）渲染在越上层
            const zIndex = size.zIndexBase + Math.round(inst.y)

            return (
              <div
                key={inst.instanceId}
                className={`bps-placed-prop ${isSelected ? 'bps-placed-prop--selected' : ''}`}
                style={{
                  left: `${inst.x}%`,
                  top: `${inst.y}%`,
                  width: `${size.width}%`,
                  transform: `translate(-50%, -50%) rotate(${inst.rotation}deg)`,
                  zIndex,
                }}
                onClick={(e) => handlePlacedPropClick(inst.instanceId, e)}
                onDoubleClick={(e) => handlePlacedPropDoubleClick(inst.instanceId, e)}
                onMouseDown={(e) => handlePlacedPropDragStart(inst.instanceId, e)}
              >
                <img
                  src={getPropImageSrc(inst.propId)}
                  alt={prop.name}
                  className="bps-placed-prop-img"
                  draggable={false}
                  onError={(e) => {
                    const img = e.currentTarget as HTMLImageElement
                    const fb = img.nextElementSibling as HTMLElement | null
                    img.style.display = 'none'
                    if (fb) fb.style.display = 'flex'
                  }}
                />
                <span className="bps-placed-prop-emoji">{getPropEmoji(inst.propId)}</span>
                <div className="bps-placed-prop-shadow" />
              </div>
            )
          })}
      </div>

      {/* 道具上下文菜单 */}
      {contextMenu && (
        <PropContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onInfo={() => {
            const inst = p.placedProps.find(i => i.instanceId === contextMenu.instanceId)
            if (inst) setCulturePanelPropId(inst.propId)
          }}
          onRotate={() => rotateProp(contextMenu.instanceId)}
          onRemove={() => removeProp(contextMenu.instanceId)}
          onClose={() => setContextMenu(null)}
        />
      )}

      {/* 文化说明面板 */}
      {culturePanelPropId && cultureProp && cultureInfo && (
        <CulturePanel
          prop={cultureProp}
          info={cultureInfo}
          onClose={() => setCulturePanelPropId(null)}
        />
      )}

      {/* 弹窗：查看推荐 */}
      {modalType === 'recommend' && (
        <ModalOverlay onClose={() => setModalType(null)}>
          <h3 className="bps-modal-title">后台师傅的推荐方案</h3>
          <div className="bps-modal-content">
            <p className="bps-modal-text">{fullRecommendation}</p>
          </div>
        </ModalOverlay>
      )}

      {/* 弹窗：舞台常识任务详情 */}
      {modalType === 'knowledgeTask' && selectedKnowledgeTask && (
        <ModalOverlay onClose={() => { setModalType(null); setSelectedKnowledgeTask(null) }}>
          <h3 className="bps-modal-title">{selectedKnowledgeTask.name}</h3>
          <div className="bps-modal-content">
            <p className="bps-modal-text">{selectedKnowledgeTask.completedHint}</p>
            {selectedKnowledgeTask.masterComment && (
              <div className="bps-advice-bubble" style={{ marginTop: '12px' }}>
                {selectedKnowledgeTask.masterComment}
              </div>
            )}
          </div>
        </ModalOverlay>
      )}

      {/* 弹窗：与师傅交流 */}
      {modalType === 'advice' && (
        <ModalOverlay onClose={() => setModalType(null)}>
          <h3 className="bps-modal-title">后台师傅说</h3>
          <div className="bps-modal-content">
            <div className="bps-advice-bubble">{masterAdvice}</div>
          </div>
        </ModalOverlay>
      )}

      {/* 弹窗：确认重置 */}
      {modalType === 'confirmReset' && (
        <ModalOverlay onClose={() => setModalType(null)}>
          <h3 className="bps-modal-title">确认重置</h3>
          <div className="bps-modal-content">
            <p className="bps-modal-text">
              确定要清空当前舞台摆放吗？已消耗的材料将退还。
            </p>
            <div className="bps-modal-btns">
              <button className="bps-btn bps-btn--secondary" onClick={() => setModalType(null)}>
                取消
              </button>
              <button className="bps-btn bps-btn--danger" onClick={confirmReset}>
                确认重置
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}
    </div>
  )
}
