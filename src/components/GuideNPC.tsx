import { useMemo } from 'react'
import { gameAssets } from '../game/assets'
import { type GameTask } from '../game/gameData'
import './GuideNPC.css'

export interface GuideNPCProps {
  /** 当前激活的任务 ID */
  activeTaskId: string | null
  /** 任务列表 */
  tasks: GameTask[]
  /** 额外的自定义引导文案（优先级最高） */
  customText?: string
  /** 显示位置：main=主页面, backstage=后台页面, practice=排练房 */
  variant?: 'main' | 'backstage' | 'practice'
}

/** 任务对应的中文按钮名（用于引导文案中明确指向） */
const BUTTON_NAME: Record<string, string> = {
  ticket: '售票口',
  backstage: '后台',
  makeup: '化妆间',
  practice: '排练房',
  stage: '戏台',
}

/** 根据任务状态生成可爱的引导文案 */
function getGuideText(activeTaskId: string | null, tasks: GameTask[]): string {
  // 优先从 tasks 中查找 status === 'active' 的任务
  const activeTask = tasks.find(t => t.status === 'active')

  if (activeTask) {
    return getActiveGuide(activeTask.id)
  }

  // 没有激活任务，查找第一个未完成的任务
  const firstTodo = tasks.find(t => t.status === 'todo')
  const firstLocked = tasks.find(t => t.status === 'locked')

  if (firstTodo) {
    return getTodoGuide(firstTodo.id)
  }
  if (firstLocked) {
    return getLockedGuide(firstLocked.id)
  }
  // 全部完成
  return '太棒啦~所有任务都完成咯！今天的戏园完美收官，快去休息一下吧~🎉'
}

function getTodoGuide(taskId: string): string {
  const btn = BUTTON_NAME[taskId] ?? '对应'
  const guides: Record<string, string> = {
    ticket: `嘿咻~我们先开始售票口吧！需要确定今天的剧目，再给客人们制作票根~

👇 请点击页面下方「${btn}」按钮，进入房间完成任务！`,
    backstage: `接下来去后台准备道具吧~把桌椅和道具摆到舞台上！

👇 请点击页面下方「${btn}」按钮，进入房间完成任务！`,
    makeup: `演员们该化妆咯~帮程小婉扮上虞姬的妆，再给裴云飞定项羽的扮相吧！

👇 请点击页面下方「${btn}」按钮，进入房间完成任务！`,
    practice: `来排练房和演员们聊聊剧本吧~一起揣摩角色心情！

👇 请点击页面下方「${btn}」按钮，进入房间完成任务！`,
    stage: `终于到戏台啦~走台、预演、开锣，好戏就要上演咯！

👇 请点击页面下方「${btn}」按钮，进入房间完成任务！`,
  }
  return guides[taskId] ?? `👇 请点击页面下方「${btn}」按钮，进入房间完成任务！`
}

function getActiveGuide(taskId: string): string {
  const btn = BUTTON_NAME[taskId] ?? '当前'
  const guides: Record<string, string> = {
    ticket: `售票口正在进行中哟~快进去卖票吧，今天的观众们都在排队等着呢！

👇 请点击页面下方「${btn}」按钮，进入房间完成任务！`,
    backstage: `后台任务进行中~去后台页面摆放道具吧，记得摆出一桌二椅的经典配置哦！

👇 请点击页面下方「${btn}」按钮，进入房间完成任务！`,
    makeup: `化妆间开门啦~去帮程小婉扮上虞姬的妆，再给裴云飞定项羽的扮相吧！

👇 请点击页面下方「${btn}」按钮，进入房间完成任务！`,
    practice: `排练房热闹着呐~去和演员们排练剧本，揣摩《霸王别姬》的诀别之情吧！

👇 请点击页面下方「${btn}」按钮，进入房间完成任务！`,
    stage: `戏台已就绪~走台排演后就可以开锣啦，今天一定是一场精彩的演出！

👇 请点击页面下方「${btn}」按钮，进入房间完成任务！`,
  }
  return guides[taskId] ?? `当前任务进行中~加油加油！

👇 请点击页面下方「${btn}」按钮，进入房间完成任务！`
}

function getLockedGuide(taskId: string): string {
  // 找出"应该点哪个 button"（第一个 todo 任务）
  const guides: Record<string, string> = {
    ticket: '售票口暂时锁住了呢~别急，先完成前面的任务就好啦！',
    backstage: `后台还没解锁呢~先完成售票口任务就能布置舞台咯！

👇 请先点击页面下方「${BUTTON_NAME.ticket}」按钮！`,
    makeup: `化妆间锁着在~等后台任务完成之后，就能来帮演员们化妆啦！

👇 请先点击页面下方「${BUTTON_NAME.backstage}」按钮！`,
    practice: `排练房还进不去哦~先完成化妆间的任务吧！

👇 请先点击页面下方「${BUTTON_NAME.makeup}」按钮！`,
    stage: `戏台还没开放呢~把前面的任务都做完，好戏就能开场啦！

👇 请先点击页面下方「${BUTTON_NAME.practice}」按钮！`,
  }
  return guides[taskId] ?? '这个任务暂时还不能做呢~先完成前面的任务吧！'
}

export default function GuideNPC({ activeTaskId, tasks, customText, variant = 'main' }: GuideNPCProps) {
  const guideText = useMemo(
    () => customText ?? getGuideText(activeTaskId, tasks),
    [activeTaskId, tasks, customText],
  )

  return (
    <div className={`guide-npc-bar guide-npc-bar--${variant}`}>
      {/* 导引小人 */}
      <div className="guide-npc-avatar">
        <img
          className="guide-npc-img"
          src={gameAssets.npcs.guide}
          alt="导引小精灵"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = 'none'
          }}
        />
      </div>

      {/* 对话气泡 */}
      <div className="guide-npc-bubble">
        <div className="guide-npc-bubble-arrow" />
        <div
          className="guide-npc-text"
          dangerouslySetInnerHTML={{ __html: guideText }}
        />
      </div>
    </div>
  )
}
