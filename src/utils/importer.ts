// 内容包导入：校验 + 清洗 + 逐条错误提示
import type { Card, GameKey } from '../types'

const GAMES: GameKey[] = ['flying', 'mine', 'truth', 'dice', 'wheel', 'pose']
const LIMITS: Partial<Record<GameKey, number>> = { flying: 46, mine: 46, wheel: 10 }

export interface ImportedMode {
  game: GameKey
  title: string
  cards: Card[]
}

export interface ParseResult {
  modes: ImportedMode[]
  errors: string[]
}

function asString(v: unknown): string {
  return typeof v === 'string' ? v.trim() : ''
}

/** 解析并校验内容包；返回可用模式与错误列表（错误按条目定位） */
export function parsePack(raw: string): ParseResult {
  const errors: string[] = []
  let data: any
  try {
    data = JSON.parse(raw)
  } catch (e: any) {
    return { modes: [], errors: ['JSON 格式错误：' + (e?.message || '无法解析')] }
  }

  const list = Array.isArray(data) ? data : Array.isArray(data?.modes) ? data.modes : null
  if (!list) return { modes: [], errors: ['文件结构不正确：应为数组或包含 modes 数组的对象'] }

  const modes: ImportedMode[] = []
  list.forEach((m: any, i: number) => {
    const at = `第 ${i + 1} 个玩法`
    const game = asString(m?.game) as GameKey
    if (!GAMES.includes(game)) {
      errors.push(`${at}：game 必须是 ${GAMES.join(' / ')} 之一（当前：${m?.game ?? '空'}）`)
      return
    }
    const title = asString(m?.title) || '导入玩法'
    const rawCards = Array.isArray(m?.cards) ? m.cards : null
    if (!rawCards || !rawCards.length) {
      errors.push(`${at}：cards 必须是非空数组`)
      return
    }

    const cards: Card[] = []
    rawCards.forEach((c: any, j: number) => {
      const where = `${at} 第 ${j + 1} 张卡`
      const type = asString(c?.type) || 'text'
      const text = asString(c?.text)
      const image = asString(c?.image)
      const kind = asString(c?.kind)
      if (type !== 'text' && type !== 'image') {
        errors.push(`${where}：type 只能是 text 或 image`)
        return
      }
      if (type === 'text' && !text) {
        errors.push(`${where}：缺少 text`)
        return
      }
      if (type === 'image' && game !== 'pose') {
        errors.push(where + '：只有「情侣卡牌」支持图片卡，其他玩法请用文字')
        return
      }
      if (type === 'image' && !image) {
        errors.push(`${where}：缺少 image 地址`)
        return
      }
      if (game === 'truth' && !['truth', 'dare'].includes(kind)) {
        errors.push(`${where}：真心话的卡片必须带 kind=truth 或 kind=dare`)
        return
      }
      if (game === 'dice' && !['action', 'part'].includes(kind)) {
        errors.push(`${where}：骰子卡片必须带 kind=action 或 kind=part`)
        return
      }
      cards.push({ type, text, image: image || undefined, kind: kind || undefined })
    })

    const limit = LIMITS[game]
    if (limit && cards.length > limit) {
      errors.push(`${at}：卡片超过上限 ${limit} 条，已保留前 ${limit} 条`)
      cards.length = limit
    }
    if (game === 'dice') {
      const hasA = cards.some((c) => c.kind === 'action')
      const hasP = cards.some((c) => c.kind === 'part')
      if (!hasA || !hasP) {
        errors.push(`${at}：骰子需要同时包含 action 与 part 两组`)
        return
      }
    }
    if (!cards.length) {
      errors.push(`${at}：没有可用卡片`)
      return
    }
    modes.push({ game, title, cards })
  })

  return { modes, errors }
}
