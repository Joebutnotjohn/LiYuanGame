import React, { createContext, useContext, useReducer, ReactNode, Dispatch } from 'react'

// ============================================
// 类型定义
// ============================================

export interface GameResources {
  coins: number
  reputation: number
  heritage: number
  exp: number
  level: number
}

export type RoomId = 'ticket' | 'backstage' | 'dressing' | 'rehearsal' | 'stage'

export interface Room {
  id: RoomId
  name: string
  description: string
  unlocked: boolean
  position: { x: number; y: number }
}

export interface Actor {
  id: string
  name: string
  role: string
  todayRole: string
  status: string
  level: number
  unlocked: boolean
}

export interface Task {
  id: string
  name: string
  description: string
  roomId: RoomId
  reward: Partial<GameResources>
  completed: boolean
  active: boolean
  checklist: string[]
}

export interface Script {
  id: string
  name: string
  currentAct: string
  characters: string
  emotion: string
  category: string
  unlocked: boolean
  progress: number
}

export type GamePhase = 'idle' | 'moving' | 'arrived' | 'in-room' | 'task-active'

export interface PlayerPosition {
  x: number
  y: number
  roomId: RoomId | null
}

export interface GameState {
  resources: GameResources
  rooms: Room[]
  actors: Actor[]
  tasks: Task[]
  scripts: Script[]
  phase: GamePhase
  player: PlayerPosition
  currentRoom: RoomId | null
  currentTask: Task | null
  showArrow: RoomId | null
  taskHint: string | null
  day: number
}

export type GameAction =
  | { type: 'MOVE_PLAYER'; to: { x: number; y: number }; roomId: RoomId | null }
  | { type: 'ARRIVE_AT_ROOM'; roomId: RoomId }
  | { type: 'ENTER_ROOM'; roomId: RoomId }
  | { type: 'LEAVE_ROOM' }
  | { type: 'START_TASK'; task: Task }
  | { type: 'COMPLETE_TASK' }
  | { type: 'SHOW_ARROW'; roomId: RoomId | null; hint: string | null }
  | { type: 'UPDATE_RESOURCES'; changes: Partial<GameResources> }
  | { type: 'UNLOCK_ROOM'; roomId: RoomId }
  | { type: 'UNLOCK_ACTOR'; actorId: string }
  | { type: 'UNLOCK_SCRIPT'; scriptId: string }
  | { type: 'NEXT_DAY' }

// ============================================
// 初始数据
// ============================================

const initialRooms: Room[] = [
  { id: 'ticket', name: '售票口', description: '戏票售卖，招揽观众', unlocked: true, position: { x: 72, y: 66 } },
  { id: 'backstage', name: '后台', description: '演员休息与道具准备', unlocked: true, position: { x: 32, y: 38 } },
  { id: 'dressing', name: '化妆间', description: '妆造扮相，勾脸上妆', unlocked: true, position: { x: 75, y: 40 } },
  { id: 'rehearsal', name: '排练房', description: '排练新戏，磨练技艺', unlocked: true, position: { x: 34, y: 65 } },
  { id: 'stage', name: '戏台', description: '粉墨登场，好戏开锣', unlocked: true, position: { x: 55, y: 33 } },
]

const initialActors: Actor[] = [
  { id: 'a1', name: '程小婉', role: '花旦', todayRole: '虞姬', status: '良好', level: 3, unlocked: true },
  { id: 'a2', name: '裴云飞', role: '小生', todayRole: '项羽', status: '良好', level: 3, unlocked: true },
  { id: 'a3', name: '叶青山', role: '老生', todayRole: '范增', status: '良好', level: 3, unlocked: true },
  { id: 'a4', name: '柳如烟', role: '青衣', todayRole: '—', status: '休息', level: 4, unlocked: false },
]

const initialTasks: Task[] = [
  {
    id: 't1', name: '售票迎客', description: '到售票口准备今日戏票与座次',
    roomId: 'ticket', reward: { coins: 50, reputation: 10 },
    completed: false, active: true,
    checklist: ['清点今日戏票', '布置售票窗口', '张贴戏单海报'],
  },
  {
    id: 't2', name: '后台筹备', description: '前往后台检查道具与布景',
    roomId: 'backstage', reward: { coins: 30, heritage: 10 },
    completed: false, active: true,
    checklist: ['检查兵器道具', '确认布景完好', '准备幕布绳索'],
  },
  {
    id: 't3', name: '妆点扮相', description: '到化妆间为演员勾脸梳妆',
    roomId: 'dressing', reward: { coins: 40, heritage: 15 },
    completed: false, active: true,
    checklist: ['为虞姬勾画旦角妆容', '为项羽描画武生脸谱', '整理头面首饰'],
  },
  {
    id: 't4', name: '排练磨合', description: '前往排练房做演出前最后练习',
    roomId: 'rehearsal', reward: { coins: 40, reputation: 15, heritage: 10 },
    completed: false, active: true,
    checklist: ['对唱一遍核心唱段', '走一遍身段动作', '确认锣鼓配合'],
  },
  {
    id: 't5', name: '粉墨登场', description: '登上戏台正式演出《霸王别姬》',
    roomId: 'stage', reward: { coins: 120, reputation: 30, heritage: 25 },
    completed: false, active: true,
    checklist: ['演员就位', '乐队起鼓', '大幕拉开，好戏开锣！'],
  },
]

const initialScripts: Script[] = [
  {
    id: 's1', name: '霸王别姬', currentAct: '帐中诀别',
    characters: '项羽 / 虞姬', emotion: '悲壮 / 诀别 / 宿命',
    category: '经典剧目', unlocked: true, progress: 60,
  },
  { id: 's2', name: '贵妃醉酒', currentAct: '—', characters: '—', emotion: '—', category: '经典剧目', unlocked: false, progress: 0 },
  { id: 's3', name: '空城计', currentAct: '—', characters: '—', emotion: '—', category: '三国戏', unlocked: false, progress: 0 },
  { id: 's4', name: '白蛇传', currentAct: '—', characters: '—', emotion: '—', category: '神话戏', unlocked: false, progress: 0 },
]

const initialState: GameState = {
  resources: { coins: 320, reputation: 65, heritage: 42, exp: 0, level: 1 },
  rooms: initialRooms,
  actors: initialActors,
  tasks: initialTasks,
  scripts: initialScripts,
  phase: 'idle',
  player: { x: 50, y: 88, roomId: null },
  currentRoom: null,
  currentTask: null,
  showArrow: null,
  taskHint: null,
  day: 1,
}

// ============================================
// Reducer
// ============================================

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'MOVE_PLAYER':
      return {
        ...state,
        phase: 'moving',
        player: { ...state.player, x: action.to.x, y: action.to.y, roomId: action.roomId },
      }

    case 'ARRIVE_AT_ROOM':
      return {
        ...state,
        phase: 'arrived',
        currentRoom: action.roomId,
      }

    case 'ENTER_ROOM':
      return {
        ...state,
        phase: 'in-room',
        currentRoom: action.roomId,
      }

    case 'LEAVE_ROOM':
      return {
        ...state,
        phase: 'idle',
        currentRoom: null,
        currentTask: null,
        showArrow: null,
        taskHint: null,
        player: { ...state.player, x: 50, y: 88, roomId: null },
      }

    case 'START_TASK':
      return {
        ...state,
        phase: 'task-active',
        currentTask: action.task,
      }

    case 'COMPLETE_TASK': {
      if (!state.currentTask) return state
      const reward = state.currentTask.reward
      return {
        ...state,
        phase: 'in-room',
        resources: {
          coins: state.resources.coins + (reward.coins || 0),
          reputation: state.resources.reputation + (reward.reputation || 0),
          heritage: state.resources.heritage + (reward.heritage || 0),
          exp: state.resources.exp + (reward.exp || 0),
          level: state.resources.level,
        },
        tasks: state.tasks.map(t =>
          t.id === state.currentTask!.id ? { ...t, completed: true, active: false } : t
        ),
        currentTask: null,
      }
    }

    case 'SHOW_ARROW':
      return {
        ...state,
        showArrow: action.roomId,
        taskHint: action.hint,
      }

    case 'UPDATE_RESOURCES':
      return {
        ...state,
        resources: {
          coins: state.resources.coins + (action.changes.coins || 0),
          reputation: state.resources.reputation + (action.changes.reputation || 0),
          heritage: state.resources.heritage + (action.changes.heritage || 0),
          exp: state.resources.exp + (action.changes.exp || 0),
          level: state.resources.level + (action.changes.level || 0),
        },
      }

    case 'UNLOCK_ROOM':
      return {
        ...state,
        rooms: state.rooms.map(r =>
          r.id === action.roomId ? { ...r, unlocked: true } : r
        ),
      }

    case 'UNLOCK_ACTOR':
      return {
        ...state,
        actors: state.actors.map(a =>
          a.id === action.actorId ? { ...a, unlocked: true } : a
        ),
      }

    case 'UNLOCK_SCRIPT':
      return {
        ...state,
        scripts: state.scripts.map(s =>
          s.id === action.scriptId ? { ...s, unlocked: true } : s
        ),
      }

    case 'NEXT_DAY':
      return {
        ...state,
        day: state.day + 1,
        phase: 'idle',
        currentRoom: null,
        currentTask: null,
        showArrow: null,
        taskHint: null,
        player: { x: 50, y: 88, roomId: null },
      }

    default:
      return state
  }
}

// ============================================
// Context
// ============================================

interface GameContextType {
  state: GameState
  dispatch: Dispatch<GameAction>
}

const GameContext = createContext<GameContextType | null>(null)

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, initialState)
  return (
    <GameContext.Provider value={{ state, dispatch }}>
      {children}
    </GameContext.Provider>
  )
}

export function useGame() {
  const ctx = useContext(GameContext)
  if (!ctx) throw new Error('useGame must be used within GameProvider')
  return ctx
}
