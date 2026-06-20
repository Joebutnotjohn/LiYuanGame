import { useState, useCallback } from 'react'
import { GameProvider } from './game/GameContext'
import GameScene from './components/GameScene'
import LoginPage, { clearLoginInfo } from './components/LoginPage'
import './App.css'

/**
 * App - 游戏根组件
 *
 * 启动流程（每次打开浏览器）：
 *   1. 初始 loginInfo = null → 渲染 <LoginPage>（每次都走登录页）
 *   2. 登录/注册/游客成功后 → 渲染 <GameScene>（进入主页面）
 *
 * 注意：
 *   - 不再从 localStorage 读 current-user 自动恢复登录（每次打开浏览器都要走 LoginPage）
 *   - 仍保留 localStorage 中的账号数据（users）以便用户登录时校验
 *   - 不影响游戏主页面逻辑 — 仅为入口关卡
 */
export default function App() {
  // 每次打开浏览器都从 LoginPage 开始（不读取 localStorage 自动登录）
  const [loginInfo, setLoginInfo] = useState<{ username: string; isGuest: boolean } | null>(null)

  const handleLogin = useCallback((info: { username: string; isGuest: boolean }) => {
    setLoginInfo(info)
  }, [])

  const handleLogout = useCallback(() => {
    clearLoginInfo()
    setLoginInfo(null)
  }, [])

  if (!loginInfo) {
    return <LoginPage onLogin={handleLogin} />
  }

  return (
    <GameProvider>
      <GameScene />
    </GameProvider>
  )
}
