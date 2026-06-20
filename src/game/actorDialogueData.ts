/**
 * 演员对话数据（方案 A：纯本地规则 + 关键词匹配）
 * 玩家在主页面点击右侧演员列表的头像即可与该演员聊天
 *
 * 设计要点：
 * 1. 每位演员有自己的人设（personality）+ 开场白（greeting）
 * 2. 关键词 → 回答列表（每次随机取一条，避免机械重复）
 * 3. fallback：未匹配关键词时的通用回答
 * 4. affinityLines：好感度达到一定门槛后才会触发的特殊台词
 * 5. rejectionLines：玩家发送无关/恶意内容时的婉拒台词
 */

export type ActorId = 'cheng_xiaowan' | 'pei_yunfei' | 'ye_qingshan'

/** 单条回答配置 */
export interface DialogueResponse {
  /** 触发的关键词（中文，可多个，匹配任一即命中） */
  keywords: string[]
  /** 回答列表（随机抽一条） */
  answers: string[]
  /** 是否提升好感度（默认 +1） */
  affinityGain?: number
  /** 是否降低好感度（默认 0） */
  affinityCost?: number
  /** 触发后是否解锁"特殊话题"标记（用于 UI） */
  tag?: string
}

/** 好感度门槛台词（达到 affinity 时 100% 触发，不消耗关键词匹配） */
export interface AffinityLine {
  /** 好感度门槛（>=） */
  threshold: number
  /** 台词列表（首次到达门槛时随机抽一条） */
  lines: string[]
  /** 是否已播放过（每个门槛只触发一次） */
  played?: boolean
}

export interface ActorDialogue {
  id: ActorId
  name: string
  roleType: string
  /** 性格描述（用于 UI tooltip） */
  personality: string
  /** 头像 emoji（PNG 缺失时的兜底） */
  avatarEmoji: string
  /** 头像 PNG 路径（聊天面板展示用） */
  avatarSrc: string
  /** 头像底色（淡雅中式色） */
  avatarBg: string
  /** 开场白（首次打开聊天时） */
  greeting: string
  /** 关键词回复池 */
  responses: DialogueResponse[]
  /** 未匹配时的默认回复 */
  fallback: string[]
  /** 好感度门槛台词（每达到一个即触发一次） */
  affinityLines: AffinityLine[]
  /** 玩家问禁忌/不当内容时的婉拒 */
  rejection: string[]
}

/** ============================================================
 *  程小婉（饰虞姬 · 花旦）
 *  ============================================================ */
const CHENG_XIAOWAN: ActorDialogue = {
  id: 'cheng_xiaowan',
  name: '程小婉',
  roleType: '花旦 · 虞姬',
  personality: '温婉细腻，言语轻柔，对戏曲身段颇有研究',
  avatarEmoji: '🌸',
  avatarSrc: '/assets/characters/yuji.png',
  avatarBg: 'rgba(232, 184, 200, 0.18)',
  greeting: '呀，班主！我正在描眉，您找我有何吩咐？（微微欠身）',
  responses: [
    {
      keywords: ['你好', '您好', '在吗', '在么', 'hi', 'hello'],
      answers: [
        '班主好！今日戏园里春光正好呢。',
        '班主万福，我在此候着您呢。',
        '您来了呀，我正想念您呢！',
      ],
      tag: '问候',
    },
    {
      keywords: ['虞姬', '今天', '角色', '演谁', '什么戏', '剧目', '扮相'],
      answers: [
        '我今日饰虞姬，一袭素衣，备好剑与酒，与霸王做最后的诀别……',
        '虞姬呀，这出戏唱的是诀别，唱的是心死。我每次登台，都要再死一次呢。',
        '今日《霸王别姬》，霸王与虞姬的最后一夜。我已揣摩多日了。',
      ],
      affinityGain: 2,
      tag: '今日剧目',
    },
    {
      keywords: ['霸王', '项羽', '裴云飞', '搭档'],
      answers: [
        '裴师兄的剑花练得可俊了！我最盼与他同台那一段"虞姬舞剑"。',
        '霸王气概，需裴师兄那般的嗓子与身段方能撑得起。我仰慕已久。',
      ],
      affinityGain: 1,
      tag: '议论同行',
    },
    {
      keywords: ['练功', '基本功', '毯子功', '身段', '把子功', '练'],
      answers: [
        '我自幼练"跷功"，脚尖点地的功夫一练就是十年呐。',
        '花旦讲究"手眼身法步"，光一个眼神就要练上半年。',
        '台上一分钟，台下十年功。班主若有空，我可以为您演示一段~',
      ],
      affinityGain: 2,
      tag: '讨论技艺',
    },
    {
      keywords: ['戏服', '服装', '扮相', '头面', '凤冠'],
      answers: [
        '今日这身素白绣梅花的帔，是我最喜爱的一套。',
        '花旦的头面要戴得端正，眉眼才能传神呢~',
      ],
      affinityGain: 1,
      tag: '扮相',
    },
    {
      keywords: ['吃饭', '吃了', '饿', '茶', '点心', '休息'],
      answers: [
        '我正在节食呢，登台前不宜多食。',
        '谢班主挂念，我喝口香片就好。',
      ],
      tag: '日常寒暄',
    },
    {
      keywords: ['喜欢', '最爱', '最想', '愿望'],
      answers: [
        '我最爱"夜深沉"那段曲牌，胡琴一起，便觉魂入戏中。',
        '若能演一出《贵妃醉酒》，便是我毕生之愿了。',
      ],
      affinityGain: 2,
      tag: '心事',
    },
    {
      keywords: ['故事', '经历', '出身', '家乡', '拜师'],
      answers: [
        '我是苏州人，七岁入科班，拜在梅派门下学艺。',
        '科班那会儿，每天天不亮就要喊嗓子，喊到嗓子冒烟呢。',
      ],
      affinityGain: 3,
      tag: '过往',
    },
    {
      keywords: ['诀别', '舞剑', '自刎', '死', '结局'],
      answers: [
        '诀别那段，我要先笑，再舞剑，最后横剑自刎……观众流泪时，我心里也在哭。',
        '虞姬的死不是屈服，是成全。她不愿霸王分心，便以死明志。',
      ],
      affinityGain: 3,
      tag: '戏中角色',
    },
    {
      keywords: ['班主', '多谢', '谢谢', '感谢', '辛苦'],
      answers: [
        '能入此梨园，是我的福气呢~',
      ],
      affinityGain: 2,
      tag: '客套',
    },
  ],
  fallback: [
    '我愚钝，班主再说一遍可好？',
    '呀，我方才走神了，班主讲的什么呀？',
    '我听不太懂呢，您能换种说法么？',
    '这个嘛……我还得再想想。',
  ],
  affinityLines: [
    {
      threshold: 5,
      lines: [
        '（轻声）班主……我平日里很少与人说这些的，您倒让我觉得贴心。',
        '班主，今日我心情甚好，愿为您唱一段《霸王别姬》的"看大王"可好？',
      ],
    },
    {
      threshold: 10,
      lines: [
        '（眼眶微红）班主待我这样好，我……此生定不忘梨园知遇之恩。',
        '班主，我有一事相托——若我日后唱红了，定要在戏单上写上您的名字。',
      ],
    },
    {
      threshold: 20,
      lines: [
        '（握紧手中帕子）班主，我从未把任何人放在心里过，您是头一个。',
        '班主……我不敢说出口，但您懂的，对吗？',
      ],
    },
    {
      threshold: 35,
      lines: [
        '（低头）班主，您若不嫌……我愿为您守这戏园一辈子。',
        '我此生只愿与班主同台，纵粉身碎骨，亦无悔。',
      ],
    },
  ],
  rejection: [
    '班主说的什么呀，我听不明白呢。',
    '呀，这话我不敢接呢。',
    '班主莫打趣我了~',
  ],
}

/** ============================================================
 *  裴云飞（饰项羽 · 小生/老生兼）
 *  ============================================================ */
const PEI_YUNFEI: ActorDialogue = {
  id: 'pei_yunfei',
  name: '裴云飞',
  roleType: '小生 · 项羽',
  personality: '豪爽直率，嗓门洪亮，是戏园里最"响"的存在',
  avatarEmoji: '🎋',
  avatarSrc: '/assets/characters/xiangyu.png',
  avatarBg: 'rgba(184, 200, 168, 0.18)',
  greeting: '嘿！班主！来，听我吼一嗓子——"力拔山兮气盖世"！……哈哈，吓着您了？',
  responses: [
    {
      keywords: ['你好', '您好', '在吗', 'hi', 'hello', '嘿'],
      answers: [
        '班主好！今儿个气色不错啊！',
        '嘿！班主您来啦？要不要听我吼一段？',
        '班主万福！今日霸王给您请安了！',
      ],
      tag: '问候',
    },
    {
      keywords: ['项羽', '霸王', '今天', '角色', '剧目', '演谁'],
      answers: [
        '今日演霸王！四面楚歌，十面埋伏，我项羽虽败犹荣！',
        '嘿，霸王这一折，最要紧的是"威"与"悲"——威而不暴，悲而不软。',
        '霸王别姬，演的是英雄末路。今日必让观众流泪！',
      ],
      affinityGain: 2,
      tag: '今日剧目',
    },
    {
      keywords: ['虞姬', '程小婉', '搭档'],
      answers: [
        '程师妹的剑舞得是真俊！跟她同台，我都不敢走神！',
        '小婉啊，她那一双水袖甩出来……我瞧着都发愣。',
        '我们俩从小一块儿练功，配合那是没得说！',
      ],
      affinityGain: 1,
      tag: '议论同行',
    },
    {
      keywords: ['练功', '功夫', '基本功', '练', '把子功', '毯子功'],
      answers: [
        '嘿！我们武生讲究"把子功"，单枪、枪花、剑花，那是一日不练三日空！',
        '我自幼练"翻"——前扑、翻跳、抢背，每日清早五更起。',
        '嗓子靠吼，身段靠摔。这就是武生的命！',
      ],
      affinityGain: 2,
      tag: '讨论技艺',
    },
    {
      keywords: ['兵器', '刀', '枪', '剑'],
      answers: [
        '剑，是武生的魂！项羽那柄剑，得舞得虎虎生风！',
        '我家里光剑就有七把，长短轻重各有不同。',
      ],
      affinityGain: 1,
      tag: '兵器',
    },
    {
      keywords: ['吃', '饭', '酒', '肉', '点心'],
      answers: [
        '嘿！班主这一问，我肚子就咕咕叫了——登台前我得灌两大碗面！',
        '唱武生不吃饱，腿脚没力气。我可不像小婉那般节食！',
        '酒？我登台前可不喝！误事！',
      ],
      tag: '日常',
    },
    {
      keywords: ['力气', '身材', '体格'],
      answers: [
        '武生讲究"膀"——肩宽背厚，扮上才有气势。我每日做两百个俯卧撑！',
        '嘿，您别瞧我瘦，这都是腱子肉！',
      ],
      tag: '身段',
    },
    {
      keywords: ['诀别', '自刎', '死', '乌江', '失败'],
      answers: [
        '项羽不是输给了刘邦，是输给了天命。英雄末路，最是动人。',
        '乌江自刎，那不是认输，是不愿过江东让江东父老失望！',
        '宁可站着死，不愿跪着生——这就是霸王！',
      ],
      affinityGain: 3,
      tag: '戏中角色',
    },
    {
      keywords: ['故事', '经历', '家乡', '拜师', '出身'],
      answers: [
        '俺是山东人，自小在草台班里滚大的——没您这般正经科班。',
        '我爹是个卖艺的，耍中幡的。我七岁跟着他走江湖。',
      ],
      affinityGain: 3,
      tag: '过往',
    },
    {
      keywords: ['喜欢', '最爱', '最想', '愿望'],
      answers: [
        '我裴云飞此生就一个愿望——演一出《长坂坡》！',
        '嘿，要说我最爱的角色？那必须是赵子龙！',
      ],
      affinityGain: 2,
      tag: '心事',
    },
    {
      keywords: ['班主', '多谢', '谢谢', '感谢', '辛苦'],
      answers: [
        '嘿！班主说这话就见外了！戏园就是我家！',
        '多谢班主栽培！云飞定当粉身碎骨！',
      ],
      affinityGain: 2,
      tag: '客套',
    },
  ],
  fallback: [
    '嘿？班主您说啥？我这耳朵一登台就背！',
    '啊？班主您再说一遍，我方才走神了！',
    '嘿，这话我得琢磨琢磨……',
  ],
  affinityLines: [
    {
      threshold: 5,
      lines: [
        '（拱手）班主，您这人实诚！俺裴云飞就爱交这样的朋友！',
        '班主，下回登台后咱哥俩喝两盅去？',
      ],
    },
    {
      threshold: 10,
      lines: [
        '（抱拳）班主！您待我裴云飞这般好，俺这辈子就认您这个班主了！',
        '班主——若您日后有难，我裴云飞第一个来帮忙！',
      ],
    },
    {
      threshold: 20,
      lines: [
        '（沉默片刻）班主……俺这辈子没什么人真心待我，您是头一个。',
        '（低声）班主，我裴云飞这条命，交给您了。',
      ],
    },
    {
      threshold: 35,
      lines: [
        '（眼眶泛红）班主……这梨园就是我的家，您就是我的亲哥！',
        '（抱拳下跪）班主！俺裴云飞此生追随您，肝脑涂地在所不辞！',
      ],
    },
  ],
  rejection: [
    '嘿！班主您说啥呢？我听不明白！',
    '这话可不兴说，俺裴云飞是个粗人！',
  ],
}

/** ============================================================
 *  叶青山（饰范增 · 老生）
 *  ============================================================ */
const YE_QINGSHAN: ActorDialogue = {
  id: 'ye_qingshan',
  name: '叶青山',
  roleType: '老生 · 范增',
  personality: '沉稳老练，话不多但句句在理，是戏园里的"定海神针"',
  avatarEmoji: '🎭',
  avatarSrc: '/assets/characters/laosheng.png',
  avatarBg: 'rgba(184, 168, 140, 0.18)',
  greeting: '（抚须）班主，老朽候您多时了。今日戏码可还有变？',
  responses: [
    {
      keywords: ['你好', '您好', '在吗', 'hi', 'hello'],
      answers: [
        '（点头）班主好。',
        '（抚须）嗯，班主您来了。',
        '（拱手）见过班主。',
      ],
      tag: '问候',
    },
    {
      keywords: ['范增', '今天', '角色', '剧目', '演谁', '亚父'],
      answers: [
        '老朽今日饰范增——项羽的亚父。鞠躬尽瘁，死而后已。',
        '范增这一折戏，演的是忠臣。忠言逆耳啊。',
        '今日《霸王别姬》，老朽在帐外候着，看那对璧人诀别。',
      ],
      affinityGain: 2,
      tag: '今日剧目',
    },
    {
      keywords: ['项羽', '裴云飞', '霸王', '搭档'],
      answers: [
        '云飞这小子，有股子虎劲，演霸王正合适。但还欠火候，再磨十年方成大器。',
        '裴云飞嘛，嗓子是好的，身段还差些意思。慢慢来。',
      ],
      affinityGain: 1,
      tag: '议论同行',
    },
    {
      keywords: ['虞姬', '程小婉'],
      answers: [
        '小婉那丫头，扮相是好，可心性还稚嫩，再过几年方能撑得起青衣。',
        '程小婉……眼神尚可，但"悲"字还差一层意思。',
      ],
      affinityGain: 1,
      tag: '议论同行',
    },
    {
      keywords: ['练功', '基本功', '功夫', '练', '嗓子', '吊嗓'],
      answers: [
        '（抚须）老朽日日清晨吊嗓，五十年来不曾间断。',
        '老生讲究"丹田气"，气沉丹田，音始能远。',
        '一日不练自己知，两日不练同行知，三日不练观众知。',
      ],
      affinityGain: 2,
      tag: '讨论技艺',
    },
    {
      keywords: ['诀别', '自刎', '乌江', '失败', '死'],
      answers: [
        '（长叹）项羽之败，败在不纳忠言。老朽劝过多次，奈他不听啊。',
        '范增临死前最后一句话是"夺项王天下者，必刘邦也"——他看得透。',
        '英雄末路，最痛的不是刀剑，是孤独。',
      ],
      affinityGain: 3,
      tag: '戏中角色',
    },
    {
      keywords: ['历史', '典故', '故事', '来历'],
      answers: [
        '（抚须）霸王别姬出自《史记·项羽本纪》。楚汉相争，垓下之围。',
        '京剧里的"别姬"是梅兰芳先生与杨小楼先生首演于 1922 年。',
      ],
      affinityGain: 3,
      tag: '文化',
    },
    {
      keywords: ['班主', '谢', '感激', '栽培'],
      answers: [
        '（拱手）班主抬爱。老朽能在这戏园里安度晚年，已是福分。',
        '（点头）多谢班主关怀。',
      ],
      affinityGain: 2,
      tag: '客套',
    },
    {
      keywords: ['经验', '教', '建议', '指点'],
      answers: [
        '（抚须）老朽有几句肺腑之言——梨园这碗饭，靠的不是一时风光，是十年功夫。',
        '（点头）演戏先做人。德在人先，艺在身从。',
        '（长叹）班主莫急，慢慢来。老朽当年也吃过大苦头。',
      ],
      affinityGain: 3,
      tag: '前辈指点',
    },
    {
      keywords: ['范增', '张良', '刘邦', '军师', '计谋'],
      answers: [
        '老朽与张良对过阵——他是谋士，老朽也是谋士。但他比老朽识时务。',
        '刘邦能用张良、能用韩信——项羽身边却只有一个老朽。',
      ],
      affinityGain: 3,
      tag: '历史评论',
    },
    {
      keywords: ['吃', '茶', '酒', '点心'],
      answers: [
        '（摆手）老朽戒酒多年，登台前只饮清茶一盏。',
        '粗茶淡饭，养人。',
      ],
      tag: '日常',
    },
  ],
  fallback: [
    '（摇头）老朽愚钝，班主再说明白些。',
    '（抚须）这话老朽还需琢磨琢磨。',
    '（点头）嗯……',
  ],
  affinityLines: [
    {
      threshold: 5,
      lines: [
        '（微笑）班主，您有慧根。难得。',
        '（点头）嗯，您这孩子，是个实诚人。',
      ],
    },
    {
      threshold: 10,
      lines: [
        '（长叹）班主，老朽纵横梨园四十载，见过太多班主。您是少数能听进话的人。',
        '（拱手）班主——您若不弃，老朽愿将毕生所学倾囊相授。',
      ],
    },
    {
      threshold: 20,
      lines: [
        '（眼眶微红）班主……老朽此生无儿无女，您便如我半个亲人。',
        '（低声）班主，老朽走后，这戏园就托付给您了。',
      ],
    },
    {
      threshold: 35,
      lines: [
        '（起身作揖）班主——此生能遇您，老朽死而无憾。',
        '（点头微笑）班主，这戏园，有您，老朽安心了。',
      ],
    },
  ],
  rejection: [
    '（摇头）班主此言差矣。',
    '（抚须）老朽不知班主何意。',
  ],
}

/** 所有演员的对话数据 */
export const actorDialogueData: Record<ActorId, ActorDialogue> = {
  cheng_xiaowan: CHENG_XIAOWAN,
  pei_yunfei: PEI_YUNFEI,
  ye_qingshan: YE_QINGSHAN,
}

/** 获取所有演员 ID */
export function getAllActorIds(): ActorId[] {
  return ['cheng_xiaowan', 'pei_yunfei', 'ye_qingshan']
}

/**
 * 匹配玩家输入 → 返回匹配的回答
 * @returns { text: 回复文本, affinityGain: 好感度变化, tag: 话题标签 } | null
 */
export interface MatchedResponse {
  text: string
  affinityGain: number
  tag?: string
}

export function matchActorResponse(
  actorId: ActorId,
  userInput: string,
): MatchedResponse {
  const data = actorDialogueData[actorId]
  const input = userInput.trim()
  if (!input) return { text: pickRandom(data.fallback), affinityGain: 0 }

  // 1) 简单"禁忌"判断（空话/单字符/全是标点）
  if (input.length < 2 || /^[\s\p{P}]+$/u.test(input)) {
    return { text: pickRandom(data.rejection), affinityGain: 0 }
  }

  // 2) 关键词命中
  for (const r of data.responses) {
    if (r.keywords.some((k) => input.includes(k))) {
      return {
        text: pickRandom(r.answers),
        affinityGain: r.affinityGain ?? 0,
        tag: r.tag,
      }
    }
  }

  // 3) fallback
  return { text: pickRandom(data.fallback), affinityGain: 0 }
}

/** 工具：随机取一条 */
function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}
