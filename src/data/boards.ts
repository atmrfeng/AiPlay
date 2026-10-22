// 棋盘定义 —— 路径坐标引擎
// 棋盘 = 统一方格网格 + 一条路径坐标数组；格子天然等大同形，棋子按百分比定位。
// 默认按内容数量自适应（buildBoard），并保留两种经典布局兼容旧存档。
import type { BoardDef, GridCoord } from '../types'

function ring28Path(): GridCoord[] {
  const p: GridCoord[] = []
  for (let i = 0; i < 6; i++) p.push({ row: 0, col: 5 - i })
  for (let r = 1; r <= 8; r++) p.push({ row: r, col: 0 })
  for (let c = 0; c < 6; c++) p.push({ row: 9, col: c })
  for (let r = 8; r >= 1; r--) p.push({ row: r, col: 5 })
  return p
}

function spiral40Path(): GridCoord[] {
  const p: GridCoord[] = []
  for (let i = 0; i < 7; i++) p.push({ row: 0, col: 6 - i })
  for (let c = 0; c < 7; c++) p.push({ row: 1, col: c })
  for (let i = 0; i < 7; i++) p.push({ row: 2, col: 6 - i })
  for (let c = 0; c < 6; c++) p.push({ row: 3, col: c })
  for (let r = 4; r <= 7; r++) p.push({ row: r, col: 6 })
  for (let c = 5; c >= 1; c--) p.push({ row: 8, col: c })
  for (let r = 7; r >= 4; r--) p.push({ row: r, col: 0 })
  return p
}

function grid7Path(): GridCoord[] {
  const p: GridCoord[] = []
  for (let r = 0; r < 7; r++) {
    for (let c = 0; c < 7; c++) p.push({ row: r, col: r % 2 === 0 ? c : 6 - c })
  }
  return p
}

export const boards: Record<string, BoardDef> = {
  ring28: {
    id: 'ring28',
    name: '经典 28 格',
    rows: 10,
    cols: 6,
    path: ring28Path(),
    startIndex: 0,
    endIndex: 27,
    center: { row: 2, col: 2, rowSpan: 8, colSpan: 4 },
  },
  spiral40: {
    id: 'spiral40',
    name: '豪华 40 格',
    rows: 9,
    cols: 7,
    path: spiral40Path(),
    startIndex: 0,
    endIndex: 39,
    center: { row: 5, col: 2, rowSpan: 4, colSpan: 5 },
  },
  grid7: {
    id: 'grid7',
    name: '7×7 网格',
    rows: 7,
    cols: 7,
    path: grid7Path(),
    startIndex: 0,
    endIndex: 48,
    center: { row: 2, col: 2, rowSpan: 5, colSpan: 5 },
  },
}

export function getBoard(id: string): BoardDef {
  return boards[id] ?? boards.ring28
}

/** 一圈一圈向内：先外圈，再内圈，最后一圈按需截断，中心自然留空给骰子 */
function ringsPath(rows: number, cols: number, count: number): GridCoord[] {
  const path: GridCoord[] = []
  let level = 0
  while (path.length < count) {
    const r0 = level
    const r1 = rows - 1 - level
    const c0 = level
    const c1 = cols - 1 - level
    if (r0 > r1 || c0 > c1) break
    const ring: GridCoord[] = []
    for (let c = c0; c <= c1; c++) ring.push({ row: r0, col: c })
    for (let r = r0 + 1; r <= r1; r++) ring.push({ row: r, col: c1 })
    for (let c = c1 - 1; c >= c0; c--) ring.push({ row: r1, col: c })
    for (let r = r1 - 1; r > r0; r--) ring.push({ row: r, col: c0 })
    path.push(...ring.slice(0, count - path.length))
    level++
  }
  return path
}

/**
 * 按格子数量生成自适应棋盘：
 * - 格子数 = 内容数 + 起点终点，上限 48
 * - 由外圈逐层向内铺，最后一圈按需截断，中心留空放骰子
 * - 每个路径格都有内容：不重复、不空置
 */
export function buildBoard(total: number): BoardDef {
  const cells = Math.max(16, Math.min(48, total))
  let best = { rows: 9, cols: 6, score: Infinity }
  for (let rows = 7; rows <= 12; rows++) {
    for (let cols = 5; cols <= 8; cols++) {
      const area = rows * cols
      const hole = area - cells
      if (hole < 14) continue
      const outer = 2 * (rows + cols) - 4
      const inner = 2 * (rows - 2 + cols - 2) - 4
      // 优先让内容刚好铺满一圈（或两圈），再兼顾竖向比例与中央留白
      const ringFit = outer >= cells ? Math.abs(outer - cells) : Math.abs(outer + inner - cells) * 0.5
      const score = ringFit * 0.6 + Math.abs(cols / rows - 0.7) * 12 + Math.max(0, 20 - hole) * 0.8
      if (score < best.score) best = { rows, cols, score }
    }
  }
  const { rows, cols } = best
  const path = ringsPath(rows, cols, cells)

  // 中央留白 = 未被路径占用的格子 → 取包围盒作为骰子区域
  const used = new Set(path.map((p) => p.row + ',' + p.col))
  let minR = rows
  let maxR = -1
  let minC = cols
  let maxC = -1
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (used.has(r + ',' + c)) continue
      minR = Math.min(minR, r)
      maxR = Math.max(maxR, r)
      minC = Math.min(minC, c)
      maxC = Math.max(maxC, c)
    }
  }
  const center =
    maxR >= minR && maxC >= minC
      ? { row: minR + 1, col: minC + 1, rowSpan: maxR - minR + 1, colSpan: maxC - minC + 1 }
      : { row: Math.floor(rows / 2), col: Math.floor(cols / 2), rowSpan: 1, colSpan: 1 }

  return {
    id: 'auto',
    name: `${cells} 格`,
    rows,
    cols,
    path,
    startIndex: 0,
    endIndex: cells - 1,
    center,
  }
}
