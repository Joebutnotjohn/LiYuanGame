/**
 * useAudio — 音频 React Hooks
 *
 * 提供：
 * 1. useClickSound — 全局点击音效（自动监听所有 button/clickable 元素）
 * 2. useBGM — 背景音乐自动播放（组件挂载时启动）
 * 3. useVoice — NPC 配音播放辅助
 */

import { useEffect, useRef, useCallback } from 'react'
import { audioManager, type VoiceType } from './AudioManager'
import { type ActorId } from './actorDialogueData'

// ============================================================
// useBGM — 背景音乐自动播放
// ============================================================

/**
 * 在组件挂载时自动启动背景音乐
 * 组件卸载时不停止（BGM 贯穿整个游戏生命周期）
 */
export function useBGM(): void {
  useEffect(() => {
    audioManager.playBGM()
  }, [])
}

// ============================================================
// useClickSound — 全局点击音效
// ============================================================

/**
 * 全局点击音效 Hook
 * 自动监听 document 上的 click 事件
 * 当点击目标是 button、[role="button"]、或带有 onClick 的元素时播放点击音效
 *
 * @param enabled 是否启用（默认 true）
 */
export function useClickSound(enabled: boolean = true): void {
  const enabledRef = useRef(enabled)
  enabledRef.current = enabled

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (!enabledRef.current) return

      const target = e.target as HTMLElement
      if (!target) return

      // 向上查找最近的交互元素
      const interactive = target.closest(
        'button, [role="button"], .clickable, [data-clickable], a, .room-hotspot, .st-tab, .st-section-header, .st-actor-avatar, .room-panel-complete, .corner-btn, .chat-send, .chat-close, .st-toggle-btn, .popup-close, .room-panel-close, .room-panel-back, .bps-back-btn, .bps-context-menu-item, .bps-culture-close, .bps-modal-close, .bps-desk-chair-tip-close, .bps-npc-bubble-close, .bps-category-tab, .bps-prop-card, .bps-knowledge-task-item, .pr-tab, .pr-start-btn, .pr-action-btn, .pr-close-btn, .mk-back-btn, .mk-action-btn, .mk-item, .to-back-btn, .to-action-btn, .to-ticket-card, .stage-back-btn, .stage-action-btn'
      )

      if (interactive) {
        audioManager.playClick()
      }
    }

    // 使用 capture 阶段，确保在所有业务 onClick 之前触发
    document.addEventListener('click', handleClick, true)
    return () => document.removeEventListener('click', handleClick, true)
  }, [])
}

// ============================================================
// useVoice — NPC 配音播放辅助
// ============================================================

/**
 * NPC 配音播放辅助 Hook
 * 提供 playVoice 和 stopVoice 方法
 */
export function useVoice() {
  const playVoice = useCallback((actorId: ActorId, type: VoiceType) => {
    audioManager.playVoice(actorId, type)
  }, [])

  const stopVoice = useCallback(() => {
    audioManager.stopVoice()
  }, [])

  return { playVoice, stopVoice }
}

// ============================================================
// useAchievementSound — 成就音效
// ============================================================

/**
 * 播放成就解锁音效
 */
export function useAchievementSound() {
  return useCallback(() => {
    audioManager.playAchievement()
  }, [])
}

// ============================================================
// useTaskCompleteSound — 任务完成音效
// ============================================================

/**
 * 播放任务完成音效
 */
export function useTaskCompleteSound() {
  return useCallback(() => {
    audioManager.playTaskComplete()
  }, [])
}
