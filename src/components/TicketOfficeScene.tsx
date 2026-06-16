import { useCallback, useMemo, useState } from 'react'
import { gameAssets } from '../game/assets'
import {
  playList,
  ticketVisuals,
  ticketColorThemes,
  ticketCopyStyles,
  ticketPriceTiers,
  calcTicketOfficeResult,
  type TaskStep,
  type TicketOfficeProgress,
} from '../game/ticketOfficeData'
import './TicketOfficeScene.css'

// ==============================
// Props
// ==============================

interface TicketOfficeSceneProps {
  ticketProgress: TicketOfficeProgress
  onTicketProgressChange: (
    next: TicketOfficeProgress | ((prev: TicketOfficeProgress) => TicketOfficeProgress),
  ) => void
  onBack: () => void
  onComplete: (result: {
    goldDelta: number
    reputationDelta: number
    heritageDelta: number
    expDelta: number
    soldCount: number
    stampedCount: number
    ticketDesignScore: number
  }) => void
}

// ==============================
// NPC 气泡文案：按顾客给出建议
// ==============================

const CUSTOMER_ADVICE: Record<string, string> = {
  customer_1:
    '小婉想看传统味浓一些的《霸王别姬》，可以选"项羽虞姬"主视觉、"红金"色调和"传统版"文案，良座票最合适。',
  customer_2:
    '阿福是第一次看京剧，票根可以做得亲切些。试试"戏台红幕"主视觉、"米白"色调和"青年版"文案，普通票更稳妥。',
  customer_3:
    '宋先生想带朋友看好位置，可以做得更有纪念感。"剑与酒杯"主视觉、"暗红"色调和"悲剧版"文案，雅座票更符合他的期待。',
  customer_4:
    '春梅偏爱文人气韵，可搭配"项羽虞姬"主视觉、"水墨"色调和"传统版"文案，良座票恰如其分。',
  customer_5:
    '刘婶图个热闹气氛，"戏台红幕"主视觉、"米白"色调和"青年版"文案，普通票够用了。',
  customer_6:
    '阿牛想看好戏解闷，用"剑与酒杯"主视觉、"暗红"色调和"悲剧版"文案，雅座票配得上这份期待。',
  customer_7:
    '灵儿第一次来看京剧，选"项羽虞姬"主视觉、"红金"色调和"青年版"文案，普通票即可。',
}

const BUBBLE_STATIC: Record<TaskStep, string> = {
  choosePlay: '先选今日要唱哪一出吧。',
  designTicket: '',
  completed: '今日票根已备好，开锣就等观众入座了。',
}

const BUBBLE_CUSTOMER_DONE = '这位客人已经拿到票了，看看下一位客人的需求吧。'
const BUBBLE_ALL_DONE = '今日售票出票已经完成，票根都送到客人手中了。'

// ==============================
// 票根预览视觉映射
// ==============================

const VISUAL_IMAGE: Record<string, string> = {
  xiangyuyuji: gameAssets.ticketRoom.ticketImg,
  redcurtain: gameAssets.ticketRoom.light,
  swordcup: gameAssets.ticketRoom.sword,
}

const COLOR_BG: Record<string, { bg: string; color: string; border: string }> = {
  redgold: {
    bg: 'linear-gradient(135deg, #8b1a1a, #c9a84c)',
    color: '#f5e6c8',
    border: '#d4a430',
  },
  ink: {
    bg: 'linear-gradient(135deg, #2c2416, #5a4a3a)',
    color: '#e8dcc8',
    border: '#8b7a6a',
  },
  darkred: {
    bg: 'linear-gradient(135deg, #4a1010, #8b2020)',
    color: '#f0d8c0',
    border: '#c04040',
  },
  ricewhite: {
    bg: 'linear-gradient(135deg, #f5edd8, #e8d8b8)',
    color: '#3c3228',
    border: '#c4a47a',
  },
}

const COPY_TEXT: Record<string, string> = {
  traditional: '千古悲欢离合，尽在此台中。',
  youth: '一场戏，一段情，一次相遇。',
  tragedy: '英雄末路，美人迟暮，霸王别姬。',
}

// ==============================
// 步骤标签中文
// ==============================

const STEP_LABEL_MAP: Record<TaskStep, string> = {
  choosePlay: '选择剧目',
  designTicket: '设计票根',
  completed: '已完成',
}

// ==============================
// 组件
// ==============================

export default function TicketOfficeScene({
  ticketProgress: p,
  onTicketProgressChange: setP,
  onBack,
  onComplete,
}: TicketOfficeSceneProps) {
  const {
    taskStep,
    selectedPlayId,
    currentTicketDraft: draft,
    customers,
    currentCustomerIndex,
    soldCount,
    goldEarned,
    reputationEarned,
    expEarned,
    isCompleted,
  } = p

  // ---- 临时提示消息 ----
  const [toastMsg, setToastMsg] = useState<string | null>(null)
  // 顾客反馈气泡：{ customerId, matched, message }
  const [feedbackBubble, setFeedbackBubble] = useState<{
    customerId: string
    matched: boolean
    message: string
  } | null>(null)

  // ---- 派生数据 ----
  const selectedPlay = playList.find((pl) => pl.id === selectedPlayId)
  const currentCustomer =
    currentCustomerIndex < customers.length ? customers[currentCustomerIndex] : null
  const ticketReady =
    draft.selectedVisual &&
    draft.selectedColorTheme &&
    draft.selectedCopyStyle &&
    draft.selectedPriceTier

  const priceValue = useMemo(() => {
    const tier = ticketPriceTiers.find((t) => t.id === draft.selectedPriceTier)
    return tier ? tier.price : 0
  }, [draft.selectedPriceTier])

  const visualLabel = draft.selectedVisual
    ? ticketVisuals.find((v) => v.id === draft.selectedVisual)?.label
    : ''
  const colorLabel = draft.selectedColorTheme
    ? ticketColorThemes.find((c) => c.id === draft.selectedColorTheme)?.label
    : ''
  const copyLabel = draft.selectedCopyStyle
    ? ticketCopyStyles.find((c) => c.id === draft.selectedCopyStyle)?.label
    : ''
  const priceLabel = draft.selectedPriceTier
    ? ticketPriceTiers.find((pr) => pr.id === draft.selectedPriceTier)?.label
    : ''

  // ---- NPC 气泡：根据当前顾客动态变化 ----'
  const bubbleText = useMemo(() => {
    // 全部完成
    if (taskStep === 'completed' || isCompleted) {
      return BUBBLE_ALL_DONE
    }
    // 选剧阶段
    if (taskStep === 'choosePlay') {
      return BUBBLE_STATIC.choosePlay
    }
    // 设计票根阶段
    if (taskStep === 'designTicket') {
      if (!currentCustomer) {
        return BUBBLE_STATIC.designTicket
      }
      // 当前顾客已拿到票 → 提示看下一位
      if (currentCustomer.hasTicket) {
        return BUBBLE_CUSTOMER_DONE
      }
      // 给出该顾客的具体建议
      return CUSTOMER_ADVICE[currentCustomer.id] || BUBBLE_STATIC.designTicket
    }
    return ''
  }, [taskStep, isCompleted, currentCustomer])

  const theme = draft.selectedColorTheme
    ? COLOR_BG[draft.selectedColorTheme]
    : COLOR_BG['redgold']
  const copySample = draft.selectedCopyStyle ? COPY_TEXT[draft.selectedCopyStyle] : ''

  // 顾客偏好标签
  const customerPreferLabel = useMemo(() => {
    if (!currentCustomer) return {}
    return {
      visual: ticketVisuals.find((v) => v.id === currentCustomer.preferredVisual)?.label ?? '',
      color: ticketColorThemes.find((c) => c.id === currentCustomer.preferredColorTheme)?.label ?? '',
      copy: ticketCopyStyles.find((c) => c.id === currentCustomer.preferredCopyStyle)?.label ?? '',
      price: ticketPriceTiers.find((t) => t.id === currentCustomer.preferredPriceTier)?.label ?? '',
    }
  }, [currentCustomer])

  // 统计已出票人数
  const ticketedCount = useMemo(
    () => customers.filter((c) => c.hasTicket).length,
    [customers],
  )

  // ==============================
  // 动作处理
  // ==============================

  /** 选择剧目 → 自动进入 designTicket */
  const handleSelectPlay = useCallback(
    (playId: string) => {
      const play = playList.find((pl) => pl.id === playId)
      if (!play || !play.unlocked) return
      setP((prev) => ({
        ...prev,
        selectedPlayId: playId,
        taskStep: 'designTicket',
      }))
    },
    [setP],
  )

  /** 选择票根选项 */
  const handleSelectOption = useCallback(
    (key: 'visual' | 'color' | 'copy' | 'price', value: string) => {
      if (p.taskStep !== 'designTicket') return
      setP((prev) => ({
        ...prev,
        currentTicketDraft: {
          ...prev.currentTicketDraft,
          ...(key === 'visual'
            ? { selectedVisual: value }
            : key === 'color'
              ? { selectedColorTheme: value }
              : key === 'copy'
                ? { selectedCopyStyle: value }
                : { selectedPriceTier: value }),
        },
      }))
    },
    [p.taskStep, setP],
  )

  /** 制作并出票给当前顾客 */
  const handleMakeAndSell = useCallback(() => {
    const d = p.currentTicketDraft
    if (!d.selectedVisual || !d.selectedColorTheme || !d.selectedCopyStyle || !d.selectedPriceTier) return
    if (!currentCustomer) return

    const tier = ticketPriceTiers.find((t) => t.id === d.selectedPriceTier)
    const ticketPrice = tier ? tier.price : 0

    // 判断是否匹配顾客偏好
    const matched =
      d.selectedVisual === currentCustomer.preferredVisual &&
      d.selectedColorTheme === currentCustomer.preferredColorTheme &&
      d.selectedCopyStyle === currentCustomer.preferredCopyStyle &&
      d.selectedPriceTier === currentCustomer.preferredPriceTier

    setP((prev) => {
      const newCustomers = prev.customers.map((c, i) => {
        if (i === prev.currentCustomerIndex) {
          return {
            ...c,
            hasTicket: true,
            ticketMatched: matched,
            paidAmount: matched ? ticketPrice : 0,
          }
        }
        return c
      })

      const newGold = prev.goldEarned + (matched ? ticketPrice : 0)
      const newRep = prev.reputationEarned + (matched ? 5 : 0)
      const newExp = prev.expEarned + (matched ? 20 : 0)
      const newSoldCount = prev.soldCount + 1

      // 找下一个未出票的顾客
      const nextIndex = newCustomers.findIndex(
        (c, i) => i > prev.currentCustomerIndex && !c.hasTicket,
      )
      const allDone = nextIndex === -1

      return {
        ...prev,
        customers: newCustomers,
        soldCount: newSoldCount,
        goldEarned: newGold,
        reputationEarned: newRep,
        expEarned: newExp,
        currentCustomerIndex: allDone ? prev.currentCustomerIndex : nextIndex,
        currentTicketDraft: {
          selectedVisual: null,
          selectedColorTheme: null,
          selectedCopyStyle: null,
          selectedPriceTier: null,
        },
        taskStep: allDone ? 'completed' : 'designTicket',
        isCompleted: allDone,
      }
    })

    if (!matched) {
      // 未匹配：暗红色气泡
      const failMessages = [
        '这戏园子的审美堪忧啊……',
        '对您的审美感到汗颜。',
        '这票根设计……实在不敢恭维。',
        '失望，完全没对上口味。',
        '这水平还敢开戏园子？',
      ]
      const msg = failMessages[Math.floor(Math.random() * failMessages.length)]
      setFeedbackBubble({
        customerId: currentCustomer.id,
        matched: false,
        message: msg,
      })
      setTimeout(() => setFeedbackBubble(null), 3500)
    } else {
      // 匹配成功：墨绿色气泡
      const successMessages = [
        '太好了，正是我想要的！多谢多谢！',
        '妙哉！这票根太合心意了！',
        '感激不尽，这设计深得我心。',
        '好！这票根值得珍藏！',
        '多谢！期待开锣之日！',
      ]
      const msg = successMessages[Math.floor(Math.random() * successMessages.length)]
      setFeedbackBubble({
        customerId: currentCustomer.id,
        matched: true,
        message: msg,
      })
      setTimeout(() => setFeedbackBubble(null), 3500)
    }
  }, [p.currentTicketDraft, currentCustomer, setP])

  /** 完成售票口任务 */
  const handleComplete = useCallback(() => {
    const result = calcTicketOfficeResult(p.soldCount, p.currentTicketDraft.selectedPriceTier ?? 'normal', p.expEarned)
    onComplete({
      goldDelta: p.goldEarned,
      reputationDelta: p.reputationEarned,
      heritageDelta: 2,
      expDelta: result.expDelta,
      soldCount: p.soldCount,
      stampedCount: p.soldCount,
      ticketDesignScore: result.ticketDesignScore,
    })
  }, [onComplete, p.soldCount, p.goldEarned, p.reputationEarned, p.expEarned, p.currentTicketDraft.selectedPriceTier])

  // ==============================
  // 渲染
  // ==============================

  return (
    <div className="tos-overlay">
      <div className="tos-scene">
        {/* Toast 提示 */}
        {toastMsg && <div className="tos-toast">{toastMsg}</div>}

        {/* 顾客反馈气泡 */}
        {feedbackBubble && (
          <div className={`tos-feedback-bubble ${feedbackBubble.matched ? 'tos-feedback--success' : 'tos-feedback--fail'}`}>
            <span className="tos-feedback-text">{feedbackBubble.message}</span>
          </div>
        )}

        {/* ======== 顶部标题栏 ======== */}
        <header className="tos-header">
          <button className="tos-back-btn" onClick={onBack}>
            ← 返回主页面
          </button>
          <div className="tos-title-group">
            <h1 className="tos-title">售票口</h1>
            <p className="tos-subtitle">
              当前步骤：{STEP_LABEL_MAP[taskStep]}
              {taskStep === 'designTicket' && currentCustomer && (
                <> · 正在为 <strong>{currentCustomer.name}</strong> 制作票根</>
              )}
              {taskStep === 'completed' && <> · 售票出票已完成</>}
            </p>
          </div>
        </header>

        {/* ======== 主体三栏 ======== */}
        <div className="tos-body">
          {/* ---- 左栏：剧目选择 ---- */}
          <section className="tos-panel tos-left">
            <h2 className="tos-panel-title">今日剧目</h2>
            <div className="tos-play-list">
              {playList.map((play) => {
                const isSelected = selectedPlayId === play.id
                const isUnlocked = play.unlocked
                return (
                  <button
                    key={play.id}
                    className={`tos-play-card ${isSelected ? 'tos-play-card--active' : ''} ${!isUnlocked ? 'tos-play-card--locked' : ''}`}
                    disabled={!isUnlocked || taskStep !== 'choosePlay'}
                    onClick={() => handleSelectPlay(play.id)}
                    title={
                      !isUnlocked
                        ? '该剧目暂未解锁'
                        : taskStep !== 'choosePlay'
                          ? '剧目已选定'
                          : `选择《${play.name}》`
                    }
                  >
                    <span className="tos-play-name">
                      {isUnlocked ? '' : '🔒 '}《{play.name}》
                    </span>
                    <span className="tos-play-status">
                      {isUnlocked ? (isSelected ? '已选中' : '可上演') : '未解锁'}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* 剧目详情 */}
            {selectedPlay && (
              <div className="tos-play-detail">
                <h3 className="tos-detail-title">剧目详情</h3>
                <p>折子：{selectedPlay.scene}</p>
                <p>风格：{selectedPlay.style}</p>
                <p>建议票价：{selectedPlay.basePrice}</p>
                <p>观众：{selectedPlay.audienceHint}</p>
              </div>
            )}


          </section>

          {/* ---- 中栏：票根制作台 ---- */}
          <section className="tos-panel tos-center">
            <h2 className="tos-panel-title">票根制作台</h2>

            {/* 当前顾客需求提示 */}
            {taskStep === 'designTicket' && currentCustomer && (
              <div className="tos-customer-brief">
                <span className="tos-customer-brief-name">{currentCustomer.name}</span>
                <span className="tos-customer-brief-want">{currentCustomer.want}</span>
                <div className="tos-customer-brief-prefs">
                  <span>偏好：{customerPreferLabel.visual} · {customerPreferLabel.color} · {customerPreferLabel.copy} · {customerPreferLabel.price}</span>
                  <span>预算：{currentCustomer.budget}</span>
                </div>
              </div>
            )}

            {/* 选项组 */}
            <div className="tos-design-groups">
              {/* 主视觉 */}
              <div className="tos-option-group">
                <span className="tos-option-label">主视觉</span>
                <div className="tos-option-row">
                  {ticketVisuals.map((v) => (
                    <button
                      key={v.id}
                      className={`tos-opt-btn tos-opt-btn--visual ${draft.selectedVisual === v.id ? 'tos-opt-btn--active' : ''}`}
                      onClick={() => handleSelectOption('visual', v.id)}
                      disabled={taskStep !== 'designTicket'}
                    >
                      <img
                        className="tos-visual-thumb"
                        src={VISUAL_IMAGE[v.id]}
                        alt={v.label}
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = 'none'
                        }}
                      />
                      <span>{v.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 色调 */}
              <div className="tos-option-group">
                <span className="tos-option-label">色调</span>
                <div className="tos-option-row">
                  {ticketColorThemes.map((c) => (
                    <button
                      key={c.id}
                      className={`tos-opt-btn ${draft.selectedColorTheme === c.id ? 'tos-opt-btn--active' : ''}`}
                      onClick={() => handleSelectOption('color', c.id)}
                      disabled={taskStep !== 'designTicket'}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 宣传文案 */}
              <div className="tos-option-group">
                <span className="tos-option-label">宣传文案</span>
                <div className="tos-option-row">
                  {ticketCopyStyles.map((c) => (
                    <button
                      key={c.id}
                      className={`tos-opt-btn ${draft.selectedCopyStyle === c.id ? 'tos-opt-btn--active' : ''}`}
                      onClick={() => handleSelectOption('copy', c.id)}
                      disabled={taskStep !== 'designTicket'}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 票价 */}
              <div className="tos-option-group">
                <span className="tos-option-label">票价</span>
                <div className="tos-option-row">
                  {ticketPriceTiers.map((pr) => (
                    <button
                      key={pr.id}
                      className={`tos-opt-btn ${draft.selectedPriceTier === pr.id ? 'tos-opt-btn--active' : ''}`}
                      onClick={() => handleSelectOption('price', pr.id)}
                      disabled={taskStep !== 'designTicket'}
                    >
                      {pr.label} {pr.price}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 制作并出票按钮 */}
            {taskStep === 'designTicket' && (
              <button
                className={`tos-design-confirm ${ticketReady ? 'tos-design-confirm--ready' : ''}`}
                disabled={!ticketReady}
                onClick={handleMakeAndSell}
              >
                {ticketReady
                  ? currentCustomer
                    ? `制作并出票给 ${currentCustomer.name}`
                    : '制作并出票'
                  : '请选择全部票根选项'}
              </button>
            )}

            {/* 票根预览 */}
            {selectedPlay && (
              <div
                className="tos-ticket-preview"
                style={{
                  background: theme.bg,
                  color: theme.color,
                  borderColor: theme.border,
                }}
              >
                <div className="tos-ticket-header">
                  <span className="tos-ticket-play">《{selectedPlay.name}》</span>
                  <span className="tos-ticket-scene">{selectedPlay.scene}</span>
                </div>
                <div className="tos-ticket-visual">
                  {draft.selectedVisual ? (
                    <img
                      className="tos-ticket-visual-img"
                      src={VISUAL_IMAGE[draft.selectedVisual]}
                      alt={visualLabel}
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = 'none'
                      }}
                    />
                  ) : (
                    <span className="tos-ticket-visual-placeholder">🎫</span>
                  )}
                </div>
                <div className="tos-ticket-meta">
                  {visualLabel && <span>主视觉：{visualLabel}</span>}
                  {colorLabel && <span>色调：{colorLabel}</span>}
                  {copyLabel && <span>文案：{copyLabel}</span>}
                  {priceLabel && <span>票价：{priceLabel} {priceValue}</span>}
                </div>
                <div className="tos-ticket-copy">{copySample}</div>
                <div className="tos-ticket-barcode">
                  ▮▮▯▮▯▯▮▯▮▮▯▮▯▮▯▯▮▮
                </div>
                <div className="tos-ticket-footer">梨园一梦 戏票</div>
              </div>
            )}
          </section>

          {/* ---- 右栏：顾客出票状态区 ---- */}
          <section className="tos-panel tos-right">
            <h2 className="tos-panel-title">
              顾客队列
              <span className="tos-panel-subtitle-right">
                {ticketedCount}/{customers.length} 已出票
              </span>
            </h2>

            {/* 顾客列表 */}
            <div className="tos-customer-queue">
              {customers.map((cust, idx) => {
                const isCurrent = idx === currentCustomerIndex && taskStep === 'designTicket'
                const hasGotTicket = cust.hasTicket
                const isDone = hasGotTicket

                return (
                  <div
                    key={cust.id}
                    className={`tos-customer-card ${isCurrent ? 'tos-customer-card--current' : ''} ${isDone ? 'tos-customer-card--done' : ''} ${!isCurrent && !isDone ? 'tos-customer-card--waiting' : ''}`}
                  >
                    {/* NPC 立绘 + 信息横排 */}
                    <div className="tos-customer-row">
                      <img
                        className="tos-customer-npc-img"
                        src={cust.npcImage}
                        alt={cust.name}
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = 'none'
                        }}
                      />
                      <div className="tos-customer-info">
                        <span className="tos-customer-name">{cust.name}</span>
                        <span className="tos-customer-want">{cust.want}</span>
                        <span className="tos-customer-budget">
                          预算 {cust.budget} · 偏好{cust.prefer}
                        </span>
                      </div>
                    </div>

                    {/* 已出票状态 */}
                    {isDone && (
                      <div className="tos-customer-done-tag">
                        {cust.ticketMatched ? (
                          <span className="tos-tag-matched">✓ 已得到票 / 需求匹配</span>
                        ) : (
                          <span className="tos-tag-unmatched">✓ 已得到票 / 需求未完全匹配</span>
                        )}
                      </div>
                    )}

                    {/* 当前正在服务的顾客 */}
                    {isCurrent && (
                      <div className="tos-customer-step-hint">
                        等待制作票根…
                      </div>
                    )}

                    {/* 排队中 */}
                    {!isCurrent && !isDone && (
                      <div className="tos-customer-wait-tag">排队中…</div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* 完成状态 */}
            {(taskStep === 'completed' || isCompleted) && (
              <div className="tos-completed-section">
                <p className="tos-completed-msg">售票出票已完成</p>
                <button className="tos-complete-btn" onClick={handleComplete}>
                  完成售票口任务
                </button>
              </div>
            )}

            {/* 售卖统计 */}
            <div className="tos-stats">
              <div className="tos-stats-row">
                <span>已售：{soldCount} / {customers.length} 张</span>
                <span>出票完成：{soldCount} 张</span>
              </div>
              {draft.selectedPriceTier && (
                <div className="tos-stats-row">
                  <span>当前票价：{priceValue}</span>
                </div>
              )}
            </div>

            {/* 收益显示 */}
            {(taskStep === 'designTicket' || taskStep === 'completed') && (
              <div className="tos-earnings">
                <h3 className="tos-earnings-title">本场收益</h3>
                <div className="tos-earnings-row">
                  <span className="tos-earnings-item tos-earnings-gold">
                    <img className="tos-earnings-icon" src={gameAssets.icons.coin} alt="宝钱" /> 宝钱 +{goldEarned}
                  </span>
                  <span className="tos-earnings-item tos-earnings-rep">
                    <img className="tos-earnings-icon" src={gameAssets.icons.reputation} alt="口碑" /> 口碑 +{reputationEarned}
                  </span>
                  <span className="tos-earnings-item tos-earnings-heritage">
                    <img className="tos-earnings-icon" src={gameAssets.icons.heritage} alt="传承值" /> 传承值 +{soldCount > 0 ? 2 : 0}
                  </span>
                  <span className="tos-earnings-item tos-earnings-exp">
                    ✨ 经验值 +{expEarned}
                  </span>
                </div>
              </div>
            )}
          </section>
        </div>

        {/* ======== 底部 NPC 对话区 ======== */}
        <footer className="tos-footer">
          <div className="tos-npc-area">
            <img
              className="tos-npc-img"
              src={gameAssets.npcs.ticketSeller}
              alt="售票员"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = 'none'
              }}
            />
            <div className="tos-npc-bubble">
              <span className="tos-npc-bubble-text">{bubbleText}</span>
            </div>
          </div>


        </footer>
      </div>
    </div>
  )
}
