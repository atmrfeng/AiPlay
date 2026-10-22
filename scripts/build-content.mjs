// 构建期内容打包器：把 content/*.json 校验后编译进 src/data/generated-content.ts
// 用法：npm run content（npm run build 会自动先执行）
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const contentDir = path.join(root, 'content')
const outFile = path.join(root, 'src/data/generated-content.ts')

const LIMITS = { flying: 46, mine: 46, truth: 999, dice: 999, wheel: 10, pose: 999 }
const GAMES = Object.keys(LIMITS)

const errors = []
const warnings = []
const modes = []

function isStr(v) {
  return typeof v === 'string' && v.trim().length > 0
}

function loadFile(file) {
  const base = path.basename(file, '.json')
  let raw
  try {
    raw = JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch (e) {
    errors.push(`${base}：JSON 解析失败（${e.message}）`)
    return
  }
  const list = Array.isArray(raw) ? raw : Array.isArray(raw?.modes) ? raw.modes : null
  if (!list) {
    errors.push(`${base}：应为数组或 { "modes": [...] }`)
    return
  }
  list.forEach((m, i) => {
    const at = `${base} 第 ${i + 1} 个玩法`
    const game = String(m?.game || '').trim()
    if (!GAMES.includes(game)) {
      errors.push(`${at}：game 必须是 ${GAMES.join('/')} 之一（当前 ${game || '空'}）`)
      return
    }
    const title = String(m?.title || '').trim()
    if (!title) {
      errors.push(`${at}：缺少 title`)
      return
    }
    const cardsIn = Array.isArray(m?.cards) ? m.cards : null
    if (!cardsIn || !cardsIn.length) {
      errors.push(`${at}：cards 不能为空`)
      return
    }
    const cards = []
    cardsIn.forEach((c, j) => {
      const where = `${at} 第 ${j + 1} 张卡`
      const type = String(c?.type || 'text').trim()
      const text = String(c?.text || '').trim()
      const image = String(c?.image || '').trim()
      const kind = String(c?.kind || '').trim()
      if (type === 'text' && !text) return errors.push(`${where}：缺少 text`)
      if (type === 'image') {
        if (game !== 'pose') return errors.push(`${where}：只有 pose（情侣卡牌）支持图片卡`)
        if (!image) return errors.push(`${where}：缺少 image`)
      }
      if (type !== 'text' && type !== 'image') return errors.push(`${where}：type 只能是 text/image`)
      if (game === 'truth' && !['truth', 'dare'].includes(kind)) {
        return errors.push(`${where}：truth 需要 kind=truth/dare`)
      }
      if (game === 'dice' && !['action', 'part'].includes(kind)) {
        return errors.push(`${where}：dice 需要 kind=action/part`)
      }
      cards.push({ type, text, ...(image ? { image } : {}), ...(kind ? { kind } : {}) })
    })
    if (game === 'dice') {
      const hasA = cards.some((c) => c.kind === 'action')
      const hasP = cards.some((c) => c.kind === 'part')
      if (!hasA || !hasP) errors.push(`${at}：骰子需要同时有 action 与 part`)
    }
    const limit = LIMITS[game]
    if (cards.length > limit) {
      warnings.push(`${at}：卡片 ${cards.length} 条，超过上限 ${limit}，已截断`)
      cards.length = limit
    }
    modes.push({
      id: `pack-${base}-${i + 1}`,
      game,
      title,
      free: Boolean(m?.free ?? true),
      price: 0,
      series: 'builtin',
      cards,
    })
  })
}

fs.mkdirSync(contentDir, { recursive: true })
const files = fs
  .readdirSync(contentDir)
  .filter((f) => f.endsWith('.json') && !f.startsWith('_'))
  .map((f) => path.join(contentDir, f))

files.forEach(loadFile)

if (errors.length) {
  console.error('\n✗ 内容校验失败：')
  errors.forEach((e) => console.error('  - ' + e))
  process.exit(1)
}

const header = `// 由 scripts/build-content.mjs 自动生成，请勿手改。
// 源文件：content/*.json
import type { GameMode } from '../types'

export const contentModes: GameMode[] = ${JSON.stringify(modes, null, 2)}

export const contentPackInfo = {
  files: ${JSON.stringify(files.map((f) => path.basename(f)))},
  modes: ${modes.length},
  builtAt: ${JSON.stringify(new Date().toISOString())},
}
`
fs.writeFileSync(outFile, header, 'utf8')

console.log(`✓ 内容打包完成：${files.length} 个文件 / ${modes.length} 个玩法 → src/data/generated-content.ts`)
warnings.forEach((w) => console.warn('  ! ' + w))
