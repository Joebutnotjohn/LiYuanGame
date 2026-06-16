import { useCallback, useMemo, useState } from 'react'
import { gameAssets } from '../game/assets'
import {
  furnitureItems,
  scriptItems,
  actorRecruitItems,
  venueUpgradeItems,
  calculatePreparationScore,
  getAudienceCapacityByReputation,
  type BackstageProgress,
} from '../game/backstageData'
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
}

// ==============================
// 组件
// ==============================

export default function BackstageScene({
  resources,
  backstageProgress: p,
  onBackstageProgressChange: setP,
  onResourceChange,
  onBack,
  onComplete,
}: BackstageSceneProps) {
  const [toastMsg, setToastMsg] = useState<string | null>(null)

  // ---- 派生数据 ----
  const audienceCapacity = useMemo(
    () => getAudienceCapacityByReputation(resources.reputation, p.venueLevel, p.capacityBonus),
    [resources.reputation, p.venueLevel, p.capacityBonus],
  )

  const preparationScore = useMemo(() => calculatePreparationScore(p), [p])

  // 完成条件：任意满足两项
  const hasFurniture = p.ownedFurnitureIds.length > 0
  const hasScript = p.ownedScriptIds.filter(id => {
    const s = scriptItems.find(si => si.id === id)
    return s && !s.unlockedByDefault
  }).length > 0
  const hasActor = p.hiredActorIds.length > 0
  const venueUpgraded = p.venueLevel > 1

  const completedConditions = [hasFurniture, hasScript, hasActor, venueUpgraded]
  const completedCount = completedConditions.filter(Boolean).length
  const canFinish = completedCount >= 2 && !p.isCompleted

  // ---- Toast 辅助 ----
  const showToast = useCallback((msg: string) => {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(null), 2000)
  }, [])

  // ==============================
  // 家具购买
  // ==============================

  const handleBuyFurniture = useCallback(
    (itemId: string) => {
      const item = furnitureItems.find(f => f.id === itemId)
      if (!item) return

      // 已购买
      if (p.ownedFurnitureIds.includes(itemId)) {
        showToast('已购买该道具')
        return
      }

      // 等级不足
      if (resources.level < item.requiredLevel) {
        showToast(`需要等级 ${item.requiredLevel} 才能购买`)
        return
      }

      // 宝钱不足
      if (resources.gold < item.costGold) {
        showToast('宝钱不足')
        return
      }

      // 购买
      const newOwned = [...p.ownedFurnitureIds, itemId]
      const newBonus = p.capacityBonus + item.capacityBonus

      setP({
        ...p,
        ownedFurnitureIds: newOwned,
        capacityBonus: newBonus,
        preparationScore: calculatePreparationScore({
          ...p,
          ownedFurnitureIds: newOwned,
          capacityBonus: newBonus,
        }),
      })

      onResourceChange({ goldDelta: -item.costGold })
      showToast(`已购买「${item.name}」`)
    },
    [p, resources, setP, onResourceChange, showToast],
  )

  // ==============================
  // 剧本解锁
  // ==============================

  const handleUnlockScript = useCallback(
    (itemId: string) => {
      const item = scriptItems.find(s => s.id === itemId)
      if (!item) return

      // 已解锁
      if (p.ownedScriptIds.includes(itemId)) {
        showToast('该剧本已解锁')
        return
      }

      // 默认解锁
      if (item.unlockedByDefault) {
        showToast('该剧本默认已解锁')
        return
      }

      // 等级不足
      if (resources.level < item.requiredLevel) {
        showToast(`需要等级 ${item.requiredLevel} 才能解锁`)
        return
      }

      // 传承值不足
      if (resources.heritage < item.costHeritage) {
        showToast('传承值不足')
        return
      }

      // 解锁
      const newOwned = [...p.ownedScriptIds, itemId]
      setP({
        ...p,
        ownedScriptIds: newOwned,
      })
      onResourceChange({ heritageDelta: -item.costHeritage })
      showToast(`已解锁「${item.name}」`)
    },
    [p, resources, setP, onResourceChange, showToast],
  )

  // ==============================
  // 演员邀请
  // ==============================

  const handleRecruitActor = useCallback(
    (itemId: string) => {
      const item = actorRecruitItems.find(a => a.id === itemId)
      if (!item) return

      // 已邀请
      if (p.hiredActorIds.includes(itemId)) {
        showToast('该演员已邀请')
        return
      }

      // 等级不足
      if (resources.level < item.requiredLevel) {
        showToast(`需要等级 ${item.requiredLevel} 才能邀请`)
        return
      }

      // 传承值门槛不足
      if (resources.heritage < item.requiredHeritage) {
        showToast(`需要传承值达到 ${item.requiredHeritage} 才能邀请`)
        return
      }

      // 传承值不足
      if (resources.heritage < item.costHeritage) {
        showToast('传承值不足')
        return
      }

      // 邀请
      const newHired = [...p.hiredActorIds, itemId]
      setP({
        ...p,
        hiredActorIds: newHired,
        preparationScore: calculatePreparationScore({
          ...p,
          hiredActorIds: newHired,
        }),
      })
      onResourceChange({ heritageDelta: -item.costHeritage })
      showToast(`已邀请「${item.name}」`)
    },
    [p, resources, setP, onResourceChange, showToast],
  )

  // ==============================
  // 场地扩建
  // ==============================

  const handleUpgradeVenue = useCallback(
    (targetLevel: number) => {
      // 只能逐级扩建
      if (targetLevel !== p.venueLevel + 1) {
        showToast('只能逐级扩建')
        return
      }

      // 已经是最高等级
      if (targetLevel > venueUpgradeItems.length) {
        showToast('已是最高等级')
        return
      }

      const item = venueUpgradeItems.find(v => v.venueLevel === targetLevel)
      if (!item) return

      // 口碑不足
      if (resources.reputation < item.requiredReputation) {
        showToast(`需要口碑 ${item.requiredReputation} 才能扩建`)
        return
      }

      // 宝钱不足
      if (resources.gold < item.costGold) {
        showToast('宝钱不足')
        return
      }

      // 扩建
      setP({
        ...p,
        venueLevel: targetLevel,
        preparationScore: calculatePreparationScore({
          ...p,
          venueLevel: targetLevel,
        }),
      })
      onResourceChange({ goldDelta: -item.costGold })
      showToast(`已扩建为「${item.name}」`)
    },
    [p, resources, setP, onResourceChange, showToast],
  )

  // ==============================
  // 完成后台筹备
  // ==============================

  const handleFinish = useCallback(() => {
    if (!canFinish) return
    setP({ ...p, isCompleted: true })
    onResourceChange({
      expDelta: 30,
      reputationDelta: 3,
    })
    onComplete()
  }, [canFinish, p, setP, onResourceChange, onComplete])

  // ==============================
  // 渲染
  // ==============================

  return (
    <div className="bks-overlay">
      <div className="bks-scene">
        {/* Toast */}
        {toastMsg && <div className="bks-toast">{toastMsg}</div>}

        {/* 顶部标题栏 */}
        <header className="bks-header">
          <button className="bks-back-btn" onClick={onBack}>
            ← 返回主页面
          </button>
          <div className="bks-title-group">
            <h1 className="bks-title">后台筹备</h1>
            <p className="bks-subtitle">
              添置行头 · 解锁剧本 · 邀请名角 · 扩建戏台
            </p>
          </div>
        </header>

        {/* 资源概览条 */}
        <div className="bks-resource-bar">
          <span className="bks-res-item">
            <img className="bks-res-icon" src={gameAssets.icons.coin} alt="宝钱" />
            宝钱 {resources.gold}
          </span>
          <span className="bks-res-item">
            <img className="bks-res-icon" src={gameAssets.icons.reputation} alt="口碑" />
            口碑 {resources.reputation}
          </span>
          <span className="bks-res-item">
            <img className="bks-res-icon" src={gameAssets.icons.heritage} alt="传承值" />
            传承值 {resources.heritage}
          </span>
          <span className="bks-res-item">Lv.{resources.level}</span>
          <span className="bks-res-divider" />
          <span className="bks-res-item">场地 Lv.{p.venueLevel}</span>
          <span className="bks-res-item">观众容量 {audienceCapacity}</span>
          <span className="bks-res-item">筹备评分 {preparationScore}</span>
        </div>

        {/* 主体四栏 */}
        <div className="bks-body">
          {/* 一、桌椅道具采买 */}
          <section className="bks-panel">
            <h2 className="bks-panel-title">桌椅道具</h2>
            <div className="bks-item-list">
              {furnitureItems.map(item => {
                const owned = p.ownedFurnitureIds.includes(item.id)
                const levelOk = resources.level >= item.requiredLevel
                const goldOk = resources.gold >= item.costGold
                return (
                  <div
                    key={item.id}
                    className={`bks-item-card ${owned ? 'bks-item-card--owned' : ''}`}
                  >
                    <div className="bks-item-info">
                      <span className="bks-item-name">{item.name}</span>
                      <span className="bks-item-desc">{item.description}</span>
                      <div className="bks-item-stats">
                        <span>宝钱 {item.costGold}</span>
                        <span>Lv.{item.requiredLevel}</span>
                        <span>容量 +{item.capacityBonus}</span>
                        <span>舒适 +{item.comfortBonus}</span>
                      </div>
                    </div>
                    <button
                      className={`bks-buy-btn ${owned ? 'bks-buy-btn--owned' : ''}`}
                      disabled={owned}
                      onClick={() => handleBuyFurniture(item.id)}
                    >
                      {owned ? '已购买' : !levelOk ? '等级不足' : !goldOk ? '宝钱不足' : '购买'}
                    </button>
                  </div>
                )
              })}
            </div>
          </section>

          {/* 二、剧本解锁 */}
          <section className="bks-panel">
            <h2 className="bks-panel-title">剧本解锁</h2>
            <div className="bks-item-list">
              {scriptItems.map(item => {
                const owned = p.ownedScriptIds.includes(item.id)
                const levelOk = resources.level >= item.requiredLevel
                const heritageOk = resources.heritage >= item.costHeritage
                return (
                  <div
                    key={item.id}
                    className={`bks-item-card ${owned ? 'bks-item-card--owned' : ''}`}
                  >
                    <div className="bks-item-info">
                      <span className="bks-item-name">《{item.name}》</span>
                      <span className="bks-item-desc">{item.description}</span>
                      <div className="bks-item-stats">
                        <span>传承值 {item.costHeritage}</span>
                        <span>Lv.{item.requiredLevel}</span>
                      </div>
                    </div>
                    <button
                      className={`bks-buy-btn ${owned ? 'bks-buy-btn--owned' : ''}`}
                      disabled={owned || item.unlockedByDefault}
                      onClick={() => handleUnlockScript(item.id)}
                    >
                      {owned || item.unlockedByDefault
                        ? '已解锁'
                        : !levelOk
                          ? '等级不足'
                          : !heritageOk
                            ? '传承值不足'
                            : '解锁'}
                    </button>
                  </div>
                )
              })}
            </div>
          </section>

          {/* 三、演员邀请 */}
          <section className="bks-panel">
            <h2 className="bks-panel-title">演员邀请</h2>
            <div className="bks-item-list">
              {actorRecruitItems.map(item => {
                const hired = p.hiredActorIds.includes(item.id)
                const levelOk = resources.level >= item.requiredLevel
                const heritageThresholdOk = resources.heritage >= item.requiredHeritage
                const heritageOk = resources.heritage >= item.costHeritage
                return (
                  <div
                    key={item.id}
                    className={`bks-item-card ${hired ? 'bks-item-card--owned' : ''}`}
                  >
                    <div className="bks-item-info">
                      <span className="bks-item-name">{item.name}</span>
                      <span className="bks-item-desc">{item.description}</span>
                      <div className="bks-item-stats">
                        <span>行当：{item.roleType}</span>
                        <span>传承值 {item.costHeritage}</span>
                        <span>门槛 {item.requiredHeritage}</span>
                        <span>Lv.{item.requiredLevel}</span>
                        <span>演出 +{item.performanceBonus}</span>
                      </div>
                    </div>
                    <button
                      className={`bks-buy-btn ${hired ? 'bks-buy-btn--owned' : ''}`}
                      disabled={hired}
                      onClick={() => handleRecruitActor(item.id)}
                    >
                      {hired
                        ? '已邀请'
                        : !levelOk
                          ? '等级不足'
                          : !heritageThresholdOk
                            ? `传承值门槛 ${item.requiredHeritage}`
                            : !heritageOk
                              ? '传承值不足'
                              : '邀请'}
                    </button>
                  </div>
                )
              })}
            </div>
          </section>

          {/* 四、场地扩建 */}
          <section className="bks-panel">
            <h2 className="bks-panel-title">场地扩建</h2>
            <div className="bks-item-list">
              {venueUpgradeItems.map(item => {
                const isCurrent = p.venueLevel === item.venueLevel
                const isPast = p.venueLevel > item.venueLevel
                const isNext = item.venueLevel === p.venueLevel + 1
                const repOk = resources.reputation >= item.requiredReputation
                const goldOk = resources.gold >= item.costGold
                const canUpgrade = isNext && repOk && goldOk

                return (
                  <div
                    key={item.venueLevel}
                    className={`bks-item-card ${isCurrent ? 'bks-item-card--current' : ''} ${isPast ? 'bks-item-card--owned' : ''}`}
                  >
                    <div className="bks-item-info">
                      <span className="bks-item-name">
                        Lv.{item.venueLevel} {item.name}
                      </span>
                      <span className="bks-item-desc">{item.description}</span>
                      <div className="bks-item-stats">
                        <span>口碑 {item.requiredReputation}</span>
                        <span>宝钱 {item.costGold}</span>
                        <span>容量 {item.audienceCapacity}</span>
                      </div>
                    </div>
                    {isCurrent && (
                      <span className="bks-venue-current">当前场地</span>
                    )}
                    {isPast && (
                      <span className="bks-venue-done">已建成</span>
                    )}
                    {!isCurrent && !isPast && (
                      <button
                        className={`bks-buy-btn ${canUpgrade ? 'bks-buy-btn--ready' : ''}`}
                        disabled={!canUpgrade}
                        onClick={() => handleUpgradeVenue(item.venueLevel)}
                      >
                        {!isNext
                          ? '需逐级扩建'
                          : !repOk
                            ? '口碑不足'
                            : !goldOk
                              ? '宝钱不足'
                              : '扩建'}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        </div>

        {/* 底部完成区 */}
        <footer className="bks-footer">
          {/* 完成条件提示 */}
          <div className="bks-condition-bar">
            <span className={`bks-cond ${hasFurniture ? 'bks-cond--met' : ''}`}>
              {hasFurniture ? '✓' : '○'} 购买道具
            </span>
            <span className={`bks-cond ${hasScript ? 'bks-cond--met' : ''}`}>
              {hasScript ? '✓' : '○'} 解锁剧本
            </span>
            <span className={`bks-cond ${hasActor ? 'bks-cond--met' : ''}`}>
              {hasActor ? '✓' : '○'} 邀请演员
            </span>
            <span className={`bks-cond ${venueUpgraded ? 'bks-cond--met' : ''}`}>
              {venueUpgraded ? '✓' : '○'} 扩建场地
            </span>
            <span className="bks-cond-count">
              （{completedCount}/2 满足）
            </span>
          </div>

          {/* 完成按钮 */}
          {!p.isCompleted && (
            <button
              className={`bks-finish-btn ${canFinish ? 'bks-finish-btn--ready' : ''}`}
              disabled={!canFinish}
              onClick={handleFinish}
            >
              {canFinish
                ? '完成后台筹备（经验 +30 · 口碑 +3）'
                : '满足任意两项条件后可完成'}
            </button>
          )}

          {p.isCompleted && (
            <div className="bks-done-tag">后台筹备已完成</div>
          )}
        </footer>
      </div>
    </div>
  )
}
