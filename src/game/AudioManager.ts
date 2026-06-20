/**
 * AudioManager — 游戏音频管理器（单例）
 *
 * 职责：
 * 1. 背景音乐（BGM）循环播放与音量控制
 * 2. 音效（SFX）播放：点击、成就、任务完成
 * 3. NPC 配音播放：开场白、回复、好感度台词
 * 4. 全局静音开关
 *
 * 使用方式：
 *   import { audioManager } from '../game/AudioManager'
 *   audioManager.playClick()           // 播放点击音效
 *   audioManager.playBGM()             // 播放背景音乐
 *   audioManager.playVoice('cheng_xiaowan', 'greeting')  // 播放配音
 */

import { type ActorId } from './actorDialogueData'

// ============================================================
// 音频文件路径
// ============================================================

const SFX_BASE = '/audio/sfx'
const VOICE_BASE = '/audio/voice'
const BGM_BASE = '/audio/bgm'

/** 音效文件路径映射 */
const SFX_PATHS = {
  click: `${SFX_BASE}/sfx_click_normal_001.wav`,
  achievement: `${SFX_BASE}/sfx_achievement_001.wav`,
  taskComplete: `${SFX_BASE}/sfx_task_complete_001.wav`,
  smallGong: `${SFX_BASE}/sfx_small_gong_001.wav`,
  bigGong: `${SFX_BASE}/sfx_big_gong_001.wav`,
  clapper: `${SFX_BASE}/sfx_clapper_001.wav`,
  pipaUp: `${SFX_BASE}/sfx_pipa_up_001.wav`,
  woodenFish: `${SFX_BASE}/sfx_wooden_fish_001.wav`,
} as const

/** 配音类型 */
export type VoiceType = 'greeting' | 'reply' | 'affinity5'

/** 配音文件路径映射：[actorId][voiceType] → 路径 */
const VOICE_PATHS: Record<ActorId, Record<VoiceType, string>> = {
  cheng_xiaowan: {
    greeting: `${VOICE_BASE}/voice_cheng_xiaowan_greeting.mp3`,
    reply: `${VOICE_BASE}/voice_cheng_xiaowan_reply_01.mp3`,
    affinity5: `${VOICE_BASE}/voice_cheng_xiaowan_affinity5.mp3`,
  },
  pei_yunfei: {
    greeting: `${VOICE_BASE}/voice_pei_yunfei_greeting.mp3`,
    reply: `${VOICE_BASE}/voice_pei_yunfei_reply_01.mp3`,
    affinity5: `${VOICE_BASE}/voice_pei_yunfei_affinity5.mp3`,
  },
  ye_qingshan: {
    greeting: `${VOICE_BASE}/voice_ye_qingshan_greeting.mp3`,
    reply: `${VOICE_BASE}/voice_ye_qingshan_reply_01.mp3`,
    affinity5: `${VOICE_BASE}/voice_ye_qingshan_affinity5.mp3`,
  },
}

/** BGM 路径 */
const BGM_PATH = `${BGM_BASE}/bgm_main_theme.mp3`

// ============================================================
// 音量配置
// ============================================================

const VOLUME = {
  bgm: 0.35,        // 背景音乐音量（偏低，不抢戏）
  sfx: 0.6,         // 音效音量
  voice: 0.85,      // 配音音量（最高，确保听清台词）
  click: 0.35,      // 点击音效单独控制（偏轻，避免烦人）
} as const

// ============================================================
// AudioManager 单例
// ============================================================

class AudioManagerClass {
  /** BGM 音频元素 */
  private bgmAudio: HTMLAudioElement | null = null
  /** 当前正在播放的配音音频元素 */
  private voiceAudio: HTMLAudioElement | null = null
  /** 音效音频元素池（复用避免频繁创建） */
  private sfxPool: HTMLAudioElement[] = []
  private sfxPoolIndex = 0
  private readonly SFX_POOL_SIZE = 6

  /** 是否已初始化（需要用户交互后才能播放） */
  private initialized = false
  /** 是否静音 */
  private muted = false
  /** BGM 是否正在播放 */
  private bgmPlaying = false

  // ---- 预加载缓存 ----
  private preloadedSfx: Map<string, boolean> = new Map()

  /**
   * 初始化音频系统（必须在用户首次交互后调用）
   * 浏览器策略要求音频播放需要用户手势触发
   */
  init(): void {
    if (this.initialized) return

    // 创建 BGM 音频元素
    this.bgmAudio = new Audio(BGM_PATH)
    this.bgmAudio.loop = true
    this.bgmAudio.volume = this.muted ? 0 : VOLUME.bgm
    this.bgmAudio.preload = 'auto'

    // 创建音效池
    for (let i = 0; i < this.SFX_POOL_SIZE; i++) {
      const audio = new Audio()
      audio.volume = this.muted ? 0 : VOLUME.sfx
      this.sfxPool.push(audio)
    }

    // 预加载常用音效
    this.preloadSfx()

    this.initialized = true
  }

  /** 预加载音效文件 */
  private preloadSfx(): void {
    Object.values(SFX_PATHS).forEach((path) => {
      if (!this.preloadedSfx.has(path)) {
        const audio = new Audio(path)
        audio.preload = 'auto'
        this.preloadedSfx.set(path, true)
      }
    })
  }

  // ============================================================
  // BGM 控制
  // ============================================================

  /** 播放背景音乐（循环） */
  playBGM(): void {
    this.init()
    if (!this.bgmAudio || this.bgmPlaying) return

    this.bgmAudio.volume = this.muted ? 0 : VOLUME.bgm
    this.bgmAudio.play().then(() => {
      this.bgmPlaying = true
    }).catch(() => {
      // 自动播放被阻止，等待用户交互后重试
      const retryOnInteraction = () => {
        if (this.bgmAudio) {
          this.bgmAudio.play().then(() => {
            this.bgmPlaying = true
          }).catch(() => {
            // 仍然失败，忽略
          })
        }
        document.removeEventListener('click', retryOnInteraction)
        document.removeEventListener('keydown', retryOnInteraction)
      }
      document.addEventListener('click', retryOnInteraction, { once: true })
      document.addEventListener('keydown', retryOnInteraction, { once: true })
    })
  }

  /** 停止背景音乐 */
  stopBGM(): void {
    if (!this.bgmAudio) return
    this.bgmAudio.pause()
    this.bgmAudio.currentTime = 0
    this.bgmPlaying = false
  }

  /** 暂停背景音乐（不重置进度） */
  pauseBGM(): void {
    if (!this.bgmAudio) return
    this.bgmAudio.pause()
    this.bgmPlaying = false
  }

  // ============================================================
  // SFX 控制
  // ============================================================

  /**
   * 音效白名单（精确控制每个 SFX 通道的播放）
   * 按用户要求：只保留 BGM + 任务完成音效 + 演员配音；
   * 点击 / 成就 / 小锣 / 大锣 / 板鼓 一律静默。
   * 任何 playSfx() 调用前必须先经过本表判断。
   */
  private readonly SFX_ALLOWLIST: ReadonlySet<string> = new Set<string>([
    SFX_PATHS.taskComplete,
  ])

  /** 获取音效池中下一个可用的音频元素 */
  private getSfxAudio(): HTMLAudioElement {
    const audio = this.sfxPool[this.sfxPoolIndex]
    this.sfxPoolIndex = (this.sfxPoolIndex + 1) % this.SFX_POOL_SIZE
    return audio
  }

  /** 播放指定音效（受 SFX_ALLOWLIST 控制） */
  private playSfx(path: string, volume: number = VOLUME.sfx): void {
    this.init()
    if (this.muted) return
    // 白名单过滤：不在白名单的音效一律静默
    if (!this.SFX_ALLOWLIST.has(path)) return

    const audio = this.getSfxAudio()
    audio.src = path
    audio.volume = volume
    audio.currentTime = 0
    audio.play().catch(() => {
      // 忽略播放错误（可能因快速连续点击导致）
    })
  }

  /**
   * 播放点击音效（清脆小锣）
   * 当前为白名单外 — 静默（按用户要求去掉所有点击/按键音效）
   */
  playClick(): void {
    this.playSfx(SFX_PATHS.click, VOLUME.click)
  }

  /**
   * 播放成就解锁音效（锣鼓齐鸣）
   * 当前为白名单外 — 静默
   */
  playAchievement(): void {
    this.playSfx(SFX_PATHS.achievement, VOLUME.sfx)
  }

  /** 播放任务完成音效（京剧欢庆） */
  playTaskComplete(): void {
    this.playSfx(SFX_PATHS.taskComplete, VOLUME.sfx)
  }

  /** 播放小锣音效 */
  playSmallGong(): void {
    this.playSfx(SFX_PATHS.smallGong, VOLUME.sfx)
  }

  /** 播放大锣音效 */
  playBigGong(): void {
    this.playSfx(SFX_PATHS.bigGong, VOLUME.sfx)
  }

  /** 播板鼓音效 */
  playClapper(): void {
    this.playSfx(SFX_PATHS.clapper, VOLUME.sfx)
  }

  // ============================================================
  // 配音控制
  // ============================================================

  /**
   * 播放 NPC 配音
   * @param actorId 演员 ID
   * @param type 配音类型：greeting=开场白, reply=回复, affinity5=好感度5台词
   */
  playVoice(actorId: ActorId, type: VoiceType): void {
    this.init()
    if (this.muted) return

    // 停止当前正在播放的配音
    this.stopVoice()

    const path = VOICE_PATHS[actorId]?.[type]
    if (!path) return

    this.voiceAudio = new Audio(path)
    this.voiceAudio.volume = this.muted ? 0 : VOLUME.voice
    this.voiceAudio.play().catch(() => {
      // 忽略播放错误
    })
  }

  /** 停止当前配音 */
  stopVoice(): void {
    if (this.voiceAudio) {
      this.voiceAudio.pause()
      this.voiceAudio.currentTime = 0
      this.voiceAudio = null
    }
  }

  // ============================================================
  // 全局控制
  // ============================================================

  /** 设置静音 */
  setMuted(muted: boolean): void {
    this.muted = muted
    if (this.bgmAudio) {
      this.bgmAudio.volume = muted ? 0 : VOLUME.bgm
    }
    this.sfxPool.forEach((audio) => {
      audio.volume = muted ? 0 : VOLUME.sfx
    })
    if (this.voiceAudio) {
      this.voiceAudio.volume = muted ? 0 : VOLUME.voice
    }
    if (muted) {
      this.pauseBGM()
    } else {
      this.playBGM()
    }
  }

  /** 获取静音状态 */
  isMuted(): boolean {
    return this.muted
  }

  /** 切换静音 */
  toggleMute(): boolean {
    this.setMuted(!this.muted)
    return this.muted
  }
}

/** 音频管理器单例 */
export const audioManager = new AudioManagerClass()
