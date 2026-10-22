// 类型定义 —— 统一内容库 + 棋盘引擎
// 设计原则：所有内容统一抽象为「游戏 → 模式 → 卡片」三层，
// 卡片 type 预留扩展（text / image / pdf），后续导入能力直接往 this 模型里加。

// ---------- 卡片 ----------
export type CardType = 'text' | 'image' | 'pdf'

export interface Card {
  /** 卡片类型 */
  type: CardType
  /** 文本内容 */
  text?: string
  /** 图片地址 */
  image?: string
  /** pdf 地址（预留） */
  pdfUrl?: string
  /** 子类型：真心话/大冒险/骰子动作/骰子部位 */
  kind?: 'truth' | 'dare' | 'action' | 'part' | string
}

// ---------- 游戏与模式 ----------
export type GameKey = 'flying' | 'mine' | 'truth' | 'wheel' | 'dice' | 'pose' | 'traffic'

export interface GameMeta {
  key: GameKey
  name: string
  short: string
  modes: GameMode[]
}

export interface GameMode {
  id: string
  /** 原站点的 vip_id（用于对齐） */
  legacyId?: number
  game: GameKey
  title: string
  /** 现成的横幅卡图（500x100，透明底） */
  banner?: string | null
  /** 是否为「自定义」入口 */
  custom?: boolean
  /** 0 表示免费 */
  price?: number
  /** 是否免费开放 */
  free?: boolean
  /** 'legacy' 表示来自旧三版的补充内容 */
  series?: string
  rule?: string
  cards: Card[]
}

export type GameLibrary = Record<GameKey, GameMeta>

// ---------- 棋盘 ----------
export interface GridCoord {
  row: number
  col: number
}

export type BoardKind = 'auto' | 'ring28' | 'spiral40' | 'grid7'

export interface BoardDef {
  id: BoardKind
  name: string
  rows: number
  cols: number
  path: GridCoord[]
  startIndex: number
  endIndex: number
  center?: { row: number; col: number; rowSpan: number; colSpan: number }
}

// ---------- 对局 ----------
export type Gender = 'male' | 'female'

export interface Player {
  /** 双人模式为 male/female；多人模式为 p0/p1/... */
  id: string
  /** 'm' 男 / 'f' 女 / 未指定（多人模式第三位起） */
  gender?: 'm' | 'f'
  name: string
  color: string
  step: number
}

export type GamePhase = 'rolling' | 'moving' | 'task' | 'won' | 'idle'

export interface GameState {
  board: BoardDef
  modeId: string
  players: Player[]
  turn: number
  phase: GamePhase
  tiles: (Card | null)[]
  over: boolean
  winner: string | null
}
