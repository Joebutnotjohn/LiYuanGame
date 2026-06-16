import { GameProvider } from './game/GameContext'
import GameScene from './components/GameScene'
import './App.css'

/**
 * App - 游戏根组件
 *
 * 当前阶段（2A）：仅渲染背景画布 + 标题占位
 * 后续阶段逐步接入 ResourceBar / TaskBar / ScriptPanel / ActorList / RoomPanel
 */
export default function App() {
  return (
    <GameProvider>
      <GameScene />
    </GameProvider>
  )
}
