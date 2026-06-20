/**
 * 梨园一梦 - 登录页
 *
 * 提供三个入口：
 *   1. 登录账号
 *   2. 注册账号
 *   3. 以游客身份登录
 *
 * 登录信息保存在 localStorage，下次访问自动恢复。
 * 不影响游戏主页面逻辑 — 仅作为入口关卡。
 */

import { useEffect, useState, useCallback, useRef } from 'react'
import { gameAssets } from '../game/assets'
import { audioManager } from '../game/AudioManager'
import { useBGM } from '../game/useAudio'
import './LoginPage.css'

/* ============================================
 *  本地存储
 * ============================================ */

const LS_KEY_USERS = 'liyuan-dream:users'
const LS_KEY_CURRENT = 'liyuan-dream:current-user'

interface StoredUser {
  username: string
  password: string
  createdAt: number
}

function readUsers(): StoredUser[] {
  try {
    const raw = localStorage.getItem(LS_KEY_USERS)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeUsers(users: StoredUser[]): void {
  localStorage.setItem(LS_KEY_USERS, JSON.stringify(users))
}

function readCurrent(): { username: string; isGuest: boolean } | null {
  try {
    const raw = localStorage.getItem(LS_KEY_CURRENT)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed.username === 'string') {
      return { username: parsed.username, isGuest: !!parsed.isGuest }
    }
    return null
  } catch {
    return null
  }
}

function writeCurrent(username: string, isGuest: boolean): void {
  localStorage.setItem(LS_KEY_CURRENT, JSON.stringify({ username, isGuest }))
}

function clearCurrent(): void {
  localStorage.removeItem(LS_KEY_CURRENT)
}

/* ============================================
 *  Props
 * ============================================ */

interface LoginPageProps {
  onLogin: (info: { username: string; isGuest: boolean }) => void
}

/* ============================================
 *  弹窗类型
 * ============================================ */

type ModalKind = 'login' | 'register' | null

/* ============================================
 *  组件
 * ============================================ */

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [modal, setModal] = useState<ModalKind>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const usernameRef = useRef<HTMLInputElement | null>(null)

  // 从登录页就开始播放 BGM（单例 + loop，进入游戏后不会中断）
  useBGM()
  // 注意：登录页不启用 useClickSound — 按用户要求完全去掉登录页的点击音效

  // 打开弹窗时聚焦输入框
  useEffect(() => {
    if (modal) {
      // 等动画帧
      setTimeout(() => usernameRef.current?.focus(), 50)
    }
  }, [modal])

  // 显示 toast 后自动消失
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2200)
    return () => clearTimeout(t)
  }, [toast])

  // 重置表单
  const resetForm = useCallback(() => {
    setUsername('')
    setPassword('')
    setConfirm('')
  }, [])

  const openModal = useCallback(
    (kind: ModalKind) => {
      resetForm()
      setModal(kind)
    },
    [resetForm],
  )

  const closeModal = useCallback(() => setModal(null), [])

  /* ----- 业务动作 ----- */

  const doLogin = useCallback(() => {
    // 首次用户手势兜底：确保 BGM 一定能播
    audioManager.playBGM()
    const u = username.trim()
    const p = password
    if (u.length < 2) {
      setToast('请输入至少 2 个字符的账号')
      return
    }
    if (p.length < 4) {
      setToast('密码至少 4 位')
      return
    }
    const users = readUsers()
    const found = users.find((x) => x.username === u)
    if (!found) {
      setToast('该账号尚未注册，请先注册')
      return
    }
    if (found.password !== p) {
      setToast('密码不正确，请重新输入')
      return
    }
    writeCurrent(u, false)
    onLogin({ username: u, isGuest: false })
  }, [username, password, onLogin])

  const doRegister = useCallback(() => {
    // 首次用户手势兜底
    audioManager.playBGM()
    const u = username.trim()
    const p = password
    if (u.length < 2) {
      setToast('账号至少 2 个字符')
      return
    }
    if (p.length < 4) {
      setToast('密码至少 4 位')
      return
    }
    if (p !== confirm) {
      setToast('两次输入的密码不一致')
      return
    }
    const users = readUsers()
    if (users.some((x) => x.username === u)) {
      setToast('该账号已存在，请直接登录')
      return
    }
    users.push({ username: u, password: p, createdAt: Date.now() })
    writeUsers(users)
    writeCurrent(u, false)
    onLogin({ username: u, isGuest: false })
  }, [username, password, confirm, onLogin])

  const doGuest = useCallback(() => {
    // 首次用户手势兜底
    audioManager.playBGM()
    // 给游客分配一个稳定但唯一的临时名
    let guestName = ''
    try {
      const ts = new Date().toISOString().slice(0, 10).replace(/-/g, '')
      const rand = Math.floor(Math.random() * 9000) + 1000
      guestName = `游客${ts}-${rand}`
    } catch {
      guestName = `游客${Date.now()}`
    }
    writeCurrent(guestName, true)
    onLogin({ username: guestName, isGuest: true })
  }, [onLogin])

  /* ----- 渲染 ----- */

  return (
    <div
      className="login-page"
      style={{ backgroundImage: `url(${gameAssets.background.main})` }}
    >
      {/* 米色半透明遮罩，确保主体可读 */}
      <div className="login-mask" />

      {/* 顶部标题 */}
      <header className="login-header">
        <div className="login-title-row">
          <span className="login-title-deco" aria-hidden="true" />
          <h1 className="login-title">梨园一梦</h1>
          <span className="login-title-deco" aria-hidden="true" />
        </div>
        <p className="login-subtitle">— 京剧文化经营 · 一方戏台百味人生 —</p>
      </header>

      {/* 中部三个选项气泡 */}
      <main className="login-options">
        <button
          type="button"
          className="login-option"
          onClick={() => openModal('login')}
        >
          <span className="login-option-icon login-option-icon--text">登</span>
          <span className="login-option-text">登录账号</span>
          <span className="login-option-hint">已注册的班主可直接进入</span>
        </button>

        <button
          type="button"
          className="login-option"
          onClick={() => openModal('register')}
        >
          <span className="login-option-icon login-option-icon--text">注</span>
          <span className="login-option-text">注册账号</span>
          <span className="login-option-hint">新班主从此开张梨园</span>
        </button>

        <button
          type="button"
          className="login-option"
          onClick={doGuest}
        >
          <span className="login-option-icon login-option-icon--text">客</span>
          <span className="login-option-text">以游客身份登录</span>
          <span className="login-option-hint">无需注册，一键进入戏园</span>
        </button>
      </main>

      {/* 底部水印 */}
      <footer className="login-footer">
        <span>© 梨园一梦 · 京剧经营</span>
      </footer>

      {/* Toast */}
      {toast && <div className="login-toast">{toast}</div>}

      {/* 登录 / 注册 弹窗 */}
      {modal && (
        <div className="login-modal-mask" onClick={closeModal}>
          <div
            className="login-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label={modal === 'login' ? '登录账号' : '注册账号'}
          >
            <div className="login-modal-header">
              <h2 className="login-modal-title">
                {modal === 'login' ? '班主，请登录' : '新班主，请注册'}
              </h2>
              <button
                type="button"
                className="login-modal-close"
                onClick={closeModal}
                aria-label="关闭"
              >
                ×
              </button>
            </div>

            <div className="login-modal-body">
              <label className="login-field">
                <span className="login-field-label">账号</span>
                <input
                  ref={usernameRef}
                  className="login-field-input"
                  type="text"
                  value={username}
                  maxLength={20}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="请输入账号"
                />
              </label>

              <label className="login-field">
                <span className="login-field-label">密码</span>
                <input
                  className="login-field-input"
                  type="password"
                  value={password}
                  maxLength={32}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="至少 4 位"
                />
              </label>

              {modal === 'register' && (
                <label className="login-field">
                  <span className="login-field-label">确认密码</span>
                  <input
                    className="login-field-input"
                    type="password"
                    value={confirm}
                    maxLength={32}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="再次输入密码"
                  />
                </label>
              )}
            </div>

            <div className="login-modal-actions">
              <button
                type="button"
                className="login-modal-btn login-modal-btn--ghost"
                onClick={closeModal}
              >
                取消
              </button>
              <button
                type="button"
                className="login-modal-btn login-modal-btn--primary"
                onClick={() => {
                  // 弹窗主操作按钮也兜底触发 BGM
                  audioManager.playBGM()
                  if (modal === 'login') doLogin()
                  else doRegister()
                }}
              >
                {modal === 'login' ? '进入戏园' : '注册并进入'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ============================================
 *  工具：判断是否已登录（App 初始化时使用）
 * ============================================ */

export function readLoginInfo(): { username: string; isGuest: boolean } | null {
  return readCurrent()
}

export function clearLoginInfo(): void {
  clearCurrent()
}
