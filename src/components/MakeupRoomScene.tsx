import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { gameAssets } from '../game/assets'
import {
  characters,
  costumeSets,
  gameGuides,
  type CharacterId,
  type CostumeSetId,
  type MakeupRoomProgress,
} from '../game/makeupRoomData'
import ResourceBar from './ResourceBar'
import './MakeupRoomScene.css'

// ==============================
// Props
// ==============================

interface MakeupRoomSceneProps {
  resources: {
    gold: number
    reputation: number
    heritage: number
    exp: number
    level: number
  }
  makeupProgress: MakeupRoomProgress
  onMakeupProgressChange: (
    next: MakeupRoomProgress | ((prev: MakeupRoomProgress) => MakeupRoomProgress),
  ) => void
  onBack: () => void
  onComplete: () => void
}

// ==============================
// 步骤标签
// ==============================

const STEP_LABELS: Record<string, string> = {
  chooseCharacter: '选择演员',
  chooseSet: '选择套装',
  completed: '已完成换装',
}

// ==============================
// 带 fallback 的图片组件
// ==============================

function SafeImg({
  src,
  alt,
  className,
  style,
}: {
  src: string
  alt: string
  className?: string
  style?: React.CSSProperties
}) {
  return (
    <img
      className={className}
      src={src}
      alt={alt}
      style={style}
      draggable={false}
      onError={(e) => {
        const el = e.currentTarget as HTMLImageElement
        el.style.display = 'none'
      }}
    />
  )
}

// ==============================
// 主组件
// ==============================

export default function MakeupRoomScene({
  resources: res,
  makeupProgress: p,
  onMakeupProgressChange: setP,
  onBack,
  onComplete,
}: MakeupRoomSceneProps) {
  const { selectedCharacter, selectedSet, isCompleted, completedCharacters } = p

  // 测量玩法引导面板高度，用于定位套装面板
  const guidePanelRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const el = guidePanelRef.current
    const scene = sceneRef.current
    if (!el || !scene) return
    const update = () => {
      const h = el.getBoundingClientRect().height
      scene.style.setProperty('--mrs-guide-height', `${h}px`)
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // 当前步骤
  const currentStep = useMemo(() => {
    if (isCompleted) return 'completed'
    if (selectedCharacter && selectedSet) return 'chooseSet'
    if (selectedCharacter) return 'chooseSet'
    return 'chooseCharacter'
  }, [selectedCharacter, selectedSet, isCompleted])

  // 当前角色可用的套装
  const availableSets = useMemo(() => {
    if (!selectedCharacter) return costumeSets
    return costumeSets.filter((s) => s.characterId === selectedCharacter)
  }, [selectedCharacter])

  // 当前选中数据
  const selectedSetData = useMemo(
    () => costumeSets.find((s) => s.id === selectedSet),
    [selectedSet],
  )
  const selectedCharData = useMemo(
    () => characters.find((c) => c.id === selectedCharacter),
    [selectedCharacter],
  )

  // ---- 双击查看演员详情（独立于选中） ----
  const [detailCharId, setDetailCharId] = useState<CharacterId | null>(null)
  const detailCharData = useMemo(
    () => (detailCharId ? characters.find((c) => c.id === detailCharId) : null),
    [detailCharId],
  )
  const handleCharDoubleClick = useCallback(
    (charId: CharacterId) => {
      setDetailCharId((prev: CharacterId | null) => (prev === charId ? null : charId))
    },
    [],
  )

  // ==============================
  // 动作处理
  // ==============================

  const handleSelectCharacter = useCallback(
    (charId: CharacterId) => {
      if (isCompleted) return
      setP((prev) => ({
        ...prev,
        selectedCharacter: prev.selectedCharacter === charId ? null : charId,
        selectedSet: null,
      }))
    },
    [isCompleted, setP],
  )

  const handleSelectSet = useCallback(
    (setId: CostumeSetId) => {
      if (isCompleted) return
      setP((prev) => ({
        ...prev,
        selectedSet: prev.selectedSet === setId ? null : setId,
      }))
    },
    [isCompleted, setP],
  )

  const handleConfirm = useCallback(() => {
    if (!selectedCharacter || !selectedSet) return

    setP((prev) => {
      const newCompleted = prev.completedCharacters.includes(selectedCharacter)
        ? prev.completedCharacters
        : [...prev.completedCharacters, selectedCharacter]

      const allDone = newCompleted.length >= 2

      return {
        ...prev,
        completedCharacters: newCompleted,
        isCompleted: allDone,
        selectedCharacter: allDone ? prev.selectedCharacter : null,
        selectedSet: allDone ? prev.selectedSet : null,
      }
    })
  }, [selectedCharacter, selectedSet, setP])

  const handleFinish = useCallback(() => {
    onComplete()
  }, [onComplete])

  // ==============================
  // 渲染
  // ==============================

  return (
    <div className="mrs-overlay">
      <div className="mrs-scene" ref={sceneRef}>
        {/* ======== 全屏背景 ======== */}
        <img
          className="mrs-bg-img"
          src={gameAssets.makeupRoom.bg}
          alt=""
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = 'none'
          }}
        />

        {/* ======== 顶部标题栏 ======== */}
        <header className="mrs-header">
          <button className="mrs-back-btn" onClick={onBack}>
            ← 返回
          </button>
          <div className="mrs-title-group">
            <h1 className="mrs-title">化妆间</h1>
            <p className="mrs-subtitle">
              {STEP_LABELS[currentStep]}
              {selectedCharData && (
                <> · 正在为 <strong>{selectedCharData.actorName}</strong> 换装</>
              )}
              {isCompleted && <> · 换装完成</>}
            </p>
          </div>

          {/* 资源栏 */}
          <ResourceBar resources={res} />
        </header>

        {/* ======== 左上：演员选择面板 ======== */}
        <section className="mrs-left-panel">
          <h2 className="mrs-panel-title">演员选择</h2>
          <div className="mrs-character-list">
            {characters.map((char) => {
              const isSel = selectedCharacter === char.id
              const isDone = completedCharacters.includes(char.id)
              const isDetailOpen = detailCharId === char.id
              return (
                <button
                  key={char.id}
                  className={`mrs-char-card ${isSel ? 'mrs-char-card--active' : ''} ${isDone ? 'mrs-char-card--done' : ''} ${isDetailOpen ? 'mrs-char-card--detail-open' : ''}`}
                  onClick={() => handleSelectCharacter(char.id)}
                  onDoubleClick={() => handleCharDoubleClick(char.id)}
                  title="单击选择 / 双击查看详情"
                >
                  <div className="mrs-char-icon-wrap">
                    <SafeImg className="mrs-char-icon" src={char.iconImg} alt={char.actorName} />
                  </div>
                  <div className="mrs-char-info">
                    <span className="mrs-char-name">{char.actorName}</span>
                    <span className="mrs-char-role-name">饰 {char.roleName}</span>
                    <span className="mrs-char-role-type">{char.specialtyRoles}</span>
                  </div>
                  {isDone && <span className="mrs-char-done-badge">&#10003;</span>}
                  {isSel && !isDone && <span className="mrs-char-active-badge">当前</span>}
                  {isDetailOpen && <span className="mrs-char-detail-tag">详情</span>}
                </button>
              )
            })}
          </div>

          {/* 选中演员的详情信息（独立于 selectedCharacter，由 detailCharId 控制） */}
          {detailCharData && (
            <div className="mrs-char-detail">
              <div className="mrs-char-detail-header">
                <div className="mrs-char-detail-avatar-wrap">
                  <SafeImg
                    className="mrs-char-detail-avatar"
                    src={detailCharData.iconImg}
                    alt={detailCharData.actorName}
                  />
                </div>
                <div className="mrs-char-detail-title-group">
                  <span className="mrs-char-detail-name">{detailCharData.actorName}</span>
                  <span className="mrs-char-detail-subtitle">饰演 {detailCharData.roleName}</span>
                  <span className="mrs-char-detail-role-badge">
                    {detailCharData.specialtyRoles}
                  </span>
                </div>
                <button
                  className="mrs-char-detail-close"
                  onClick={() => setDetailCharId(null)}
                  title="收起详情"
                >
                  ✕
                </button>
              </div>
              <div className="mrs-char-detail-section">
                <h3 className="mrs-char-detail-section-title">演员小传</h3>
                <p className="mrs-char-detail-text">{detailCharData.longBio}</p>
              </div>
              <div className="mrs-char-detail-section">
                <h3 className="mrs-char-detail-section-title">擅长剧目</h3>
                <div className="mrs-char-detail-plays">
                  {detailCharData.specialtyPlays.map((play) => (
                    <span key={play} className="mrs-char-detail-play-tag">{play}</span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>

        {/* ======== 右上：玩法引导面板 ======== */}
        <section className="mrs-guide-panel" ref={guidePanelRef}>
          <h2 className="mrs-panel-title">玩法引导</h2>
          <div className="mrs-guide-list">
            {gameGuides.map((item) => (
              <details key={item.step} className="mrs-guide-item">
                <summary className="mrs-guide-summary">
                  <span className="mrs-guide-step">{item.step}</span>
                  {item.title}
                </summary>
                <p className="mrs-guide-content">{item.content}</p>
              </details>
            ))}
          </div>
        </section>

        {/* ======== 中部：角色形象展示区 ======== */}
        <div className="mrs-character-display">
          {selectedSet && selectedSetData ? (
            <div className="mrs-display-stage">
              <SafeImg
                className={`mrs-display-look-img ${selectedSet === 'set-3' || selectedSet === 'set-4' ? 'mrs-display-look-img--scale-up' : ''}`}
                src={selectedSetData.lookImg}
                alt={selectedSetData.name}
              />
              <div className="mrs-display-label">
                {selectedCharData?.actorName}
                {selectedSetData && ` · ${selectedSetData.name}`}
              </div>
            </div>
          ) : selectedCharacter ? (
            <div className="mrs-display-placeholder">
              <span className="mrs-placeholder-text">请在右下方选择套装</span>
            </div>
          ) : (
            <div className="mrs-display-placeholder">
              <span className="mrs-placeholder-text">请在左侧选择演员</span>
            </div>
          )}
        </div>

        {/* ======== 右下：套装选择面板 ======== */}
        <section className="mrs-right-panel">
          <h2 className="mrs-panel-title">套装选择</h2>
          {!selectedCharacter ? (
            <p className="mrs-select-hint">请先在左侧选择演员</p>
          ) : (
            <>
              <div className="mrs-set-grid">
                {availableSets.map((set) => {
                  const isSel = selectedSet === set.id
                  return (
                    <button
                      key={set.id}
                      className={`mrs-set-card ${isSel ? 'mrs-set-card--active' : ''}`}
                      onClick={() => handleSelectSet(set.id)}
                      title={set.description}
                    >
                      <div className="mrs-set-icon-wrap">
                        <SafeImg
                          className="mrs-set-icon"
                          src={set.iconImg}
                          alt={set.name}
                        />
                      </div>
                      <span className="mrs-set-name">{set.name}</span>
                      <span className={`mrs-set-tier mrs-tier--${set.tier}`}>
                        {set.tier === 'luxury' ? '华丽' : '普通'}
                      </span>
                      <span className="mrs-set-play">{set.playName}</span>
                    </button>
                  )
                })}
              </div>

              {selectedSetData && (
                <div className="mrs-set-info">
                  <p className="mrs-set-info-text">{selectedSetData.description}</p>
                </div>
              )}
            </>
          )}

          {selectedCharacter && selectedSet && !isCompleted && (
            <button className="mrs-confirm-btn" onClick={handleConfirm}>
              {completedCharacters.includes(selectedCharacter)
                ? `重新为 ${selectedCharData?.actorName} 换装`
                : `为 ${selectedCharData?.actorName} 确认换装`}
            </button>
          )}
          {isCompleted && (
            <button className="mrs-finish-btn" onClick={handleFinish}>
              完成化妆间任务
            </button>
          )}
        </section>

        {/* ======== 左下：导引 NPC（小精灵 + 气泡） ======== */}
        <aside className="mrs-guide-tip" aria-label="化妆间导引">
          <div className="mrs-guide-tip-avatar">
            <img
              className="mrs-guide-tip-img"
              src={gameAssets.npcs.guide}
              alt="导引小精灵"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = 'none'
              }}
            />
          </div>
          <div className="mrs-guide-tip-bubble">
            <div className="mrs-guide-tip-arrow" />
            <p className="mrs-guide-tip-text">
              {!selectedCharacter && (
                <>👈 1️⃣ 先在<strong>左侧</strong>选择一位演员<br />
                💡 <strong>双击</strong>演员卡片可查看详细介绍</>
              )}
              {selectedCharacter && !selectedSet && (
                <>2️⃣ 再到<strong>右下方</strong>为该演员选择一套戏服</>
              )}
              {selectedCharacter && selectedSet && !isCompleted && (
                <>✅ 选好了！点击右下角「确认换装」即可~</>
              )}
              {isCompleted && (
                <>🎉 两位演员都已换装完成！可点击右下「完成化妆间任务」</>
              )}
            </p>
          </div>
        </aside>

      </div>
    </div>
  )
}
