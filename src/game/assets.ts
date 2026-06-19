/**
 * 梨园一梦 - 统一美术资源配置
 * 所有图片路径集中管理，组件通过 gameAssets 引用，禁止硬编码路径。
 *
 * 路径规则：
 *   - Vite 项目，public/ 下的资源从 /assets/ 开始
 *   - 如文件缺失，组件应 fallback 到 CSS/emoji，不应页面崩溃
 */

export const gameAssets = {
  // ==============================
  // 背景
  // ==============================
  background: {
    main: '/assets/background/main-bg.png',
  },

  // ==============================
  // 底部任务按钮图片（已处理：去除棋盘格背景，真透明 PNG）
  // ==============================
  buttons: {
    ticket: '/assets/processed/buttons/ticket.png',
    backstage: '/assets/processed/buttons/backstage.png',
    makeup: '/assets/processed/buttons/makeup.png',
    practice: '/assets/processed/buttons/practice.png',
    stage: '/assets/processed/buttons/stage.png',
  },

  // ==============================
  // 图标（已处理：去除棋盘格背景，真透明 PNG）
  // ==============================
  icons: {
    arrow: '/assets/processed/icons/arrow.png',
    coin: '/assets/processed/icons/coin.png',
    reputation: '/assets/processed/icons/reputation.png',
    heritage: '/assets/processed/icons/heritage.png',
    journal: '/assets/processed/icons/journal.png',
    rewarding: '/assets/processed/icons/rewarding.png',
    exp: '/assets/processed/icons/exp.png',
  },

  // ==============================
  // 右侧演员列表头像
  // ==============================
  characters: {
    yuji: '/assets/characters/yuji.png',
    xiangyu: '/assets/characters/xiangyu.png',
    laosheng: '/assets/characters/laosheng.png',
  },

  // ==============================
  // 通用 UI 元素
  // ==============================
  ui: {
    board: '/assets/ui/board.png',
    buttonBg: '/assets/processed/ui/button-bg.png',
    taskBoard: '/assets/processed/ui/task-board.png',
  },

  // ==============================
  // 售票口场景素材（processed/ticket-room 目录，已去背景）
  // ==============================
  ticketRoom: {
    ticketImg: '/assets/processed/ticket-room/ticket-img.png',
    light: '/assets/processed/ticket-room/light.png',
    sword: '/assets/processed/ticket-room/sword.png',
    npcXiaowan: '/assets/processed/ticket-room/npc-xiaowan.png',
    npcBoy: '/assets/processed/ticket-room/npc-boy.png',
    npcBoy2: '/assets/processed/ticket-room/npc-boy2.png',
    npcGirl: '/assets/processed/ticket-room/npc-girl.png',
    npcGirl2: '/assets/processed/ticket-room/npc-girl2.png',
    npcAunt: '/assets/processed/ticket-room/npc-aunt.png',
    npcYe: '/assets/processed/ticket-room/npc-ye.png',
  },

  // ==============================
  // 主页面 NPC（移动小人、演员、小动物等）
  // ==============================
  npcs: {
    ticketSeller: '/assets/processed/npcs/ticketSeller.png',
    visitor1: '/assets/processed/npcs/visitor1.png',
    visitor2: '/assets/processed/npcs/visitor2.png',
    yujiActor: '/assets/processed/npcs/yujiActor.png',
    xiangyuActor: '/assets/processed/npcs/xiangyuActor.png',
    /** 导引 NPC（卡通小人，去背景透明PNG） */
    guide: '/assets/processed/npcs/guide.png',
  },

  // ==============================
  // 化妆间玩法素材
  // ==============================
  makeupRoom: {
    /** 化妆间背景 */
    bg: '/assets/makeup-room/bg.png',
    /** 套装图标（img 文件，用于右侧选择面板） */
    setIcons: {
      img1: '/assets/makeup-room/img-1.png',
      img2: '/assets/makeup-room/img-2.png',
      img7: '/assets/makeup-room/img-7.png',
      img8: '/assets/makeup-room/img-8.png',
    },
    /** 角色形象展示图（使用 makeup-room 目录下的最新 look 文件） */
    lookImgs: {
      look1: '/assets/makeup-room/look-1.png',
      look2: '/assets/makeup-room/look-2.png',
      look3: '/assets/makeup-room/look-3.png',
      look4: '/assets/makeup-room/look-4.png',
    },
    /** 角色图标（用于左侧选择列表） */
    characterIcons: {
      yuji: '/assets/characters/yuji.png',
      xiangyu: '/assets/characters/xiangyu.png',
    },
  },

  // ==============================
  // 后台舞台玩法素材（processed 透明图片优先，原始图片 fallback）
  // ==============================
  backstage: {
    /** 后台页面背景图（原始图片，不做去背景处理） */
    bg: '/assets/backsatge/bg.png',
    /** 后台 NPC（processed 透明图片优先） */
    npcs: {
      npc1: '/assets/processed/backstage/npc1.png',
      npc2: '/assets/backstage/npc2.png',
    },
    /** NPC fallback 原始路径 */
    npcsFallback: {
      npc1: '/assets/backsatge/npc1.png',
      npc2: '/assets/backstage/npc2.png',
    },
    props: {
      chair: '/assets/backstage/chair.png',
      desk: '/assets/backstage/desk.png',
      flag: '/assets/processed/backstage/flag.png',
      light: '/assets/processed/backstage/light.png',
      pingfeng: '/assets/backstage/pingfeng.png',
      sword: '/assets/backstage/sword.png',
      wine: '/assets/processed/backstage/wine.png',
      candle: '/assets/processed/backstage/candle.png',
    },
    /** fallback 原始图片路径（processed 图片不存在时使用） */
    propsFallback: {
      chair: '/assets/backstage/chair.png',
      desk: '/assets/backstage/desk.png',
      flag: '/assets/backsatge/flag.png',
      light: '/assets/backsatge/light.png',
      pingfeng: '/assets/backstage/pingfeng.png',
      sword: '/assets/backstage/sword.png',
      wine: '/assets/backsatge/wine.png',
      candle: '/assets/backsatge/candle.png',
    },
  },

  // ==============================
  // 排练房玩法素材
  // ==============================
  practiceRoom: {
    /** 排练房背景 */
    bg: '/assets/practice/bg.png',
  },
} as const

/**
 * 辅助：获取资源 URL，若加载失败可回退
 *
 * 用法：
 *   const src = assetSrc(gameAssets.icons.coin)
 *
 * 组件中可通过 img onError 做二级 fallback：
 *   <img src={src} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
 */
export function assetSrc(path: string): string {
  return path
}

export type GameAssets = typeof gameAssets
