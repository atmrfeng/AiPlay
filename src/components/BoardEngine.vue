<script setup lang="ts">
// 棋盘引擎组件 —— 统一方格网格 + 路径坐标 + 百分比定位棋子
// 解决「棋格 UI 不统一 / 棋子跳出格子」问题：所有格子天生等大同形，
// 棋子用百分比定位，任何屏幕/横竖屏都不会溢出。
import { computed } from 'vue'
import type { BoardDef, Card } from '../types'

const props = defineProps<{
  board: BoardDef
  tiles: (Card | null)[]
  players: { id: string; step: number; color: string; name: string; gender?: string }[]
  currentTurn: number
}>()

defineEmits<{ tileClick: [index: number] }>()

const board = computed(() => props.board)

// 容器纵横比 = 列/行，保证每个格子都是正方形
const aspectRatio = computed(() => `${board.value.cols} / ${board.value.rows}`)

// 棋子直径（占棋盘宽的百分比）：格宽 = 100/cols，棋子取格宽的 76%
const playerSize = computed(() => (props.players.length > 2 ? 52 : 62) / board.value.cols)

// 棋盘宽度：不超过容器，且保证加上周边 UI 后整屏可容纳（纯计算，无测量）
const engineWidth = computed(() => {
  const ar = board.value.cols / board.value.rows
  return `min(100%, calc((100dvh - 215px) * ${ar.toFixed(4)}))`
})

// 中央区域 grid-area 定位
const centerStyle = computed(() => {
  const c = board.value.center
  if (!c) return { display: 'none' }
  return {
    gridArea: `${c.row} / ${c.col} / ${c.row + c.rowSpan} / ${c.col + c.colSpan}`,
  }
})

// 生成所有格子：路径格显式定位到路径坐标，非路径格不渲染
const pathTiles = computed(() => {
  return board.value.path.map((coord, index) => ({
    row: coord.row,
    col: coord.col,
    index,
    area: `${coord.row + 1} / ${coord.col + 1}`,
  }))
})

// 玩家在棋盘上的坐标（百分比）：格子中心 = (coord + 0.5) / rows
function playerPosition(step: number) {
  const coord = board.value.path[step] || board.value.path[0]
  const { rows, cols } = board.value
  const halfW = playerSize.value / 2
  const halfH = (playerSize.value * (cols / rows)) / 2
  const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi)
  return {
    top: clamp(((coord.row + 0.5) / rows) * 100, halfH + 0.6, 100 - halfH - 0.6),
    left: clamp(((coord.col + 0.5) / cols) * 100, halfW + 0.6, 100 - halfW - 0.6),
  }
}

// 同格玩家偏移（避免重叠）
function playerOffset(playerId: string): { dx: number; dy: number } {
  const step = props.players.find((p) => p.id === playerId)?.step ?? 0
  const same = props.players.filter((p) => p.step === step)
  if (same.length <= 1) return { dx: 0, dy: 0 }
  const idx = same.findIndex((p) => p.id === playerId)
  // 同格多人：围成一圈，避免完全重叠
  const angle = (Math.PI * 2 * idx) / same.length - Math.PI / 2
  const r = same.length > 2 ? 30 : 24
  return { dx: Math.cos(angle) * r, dy: Math.sin(angle) * r }
}
</script>

<template>
  <div class="board-engine" :class="`board-${board.id}`" :style="{ aspectRatio, width: engineWidth }">
    <div
      class="board-grid"
      :style="{
        gridTemplateColumns: `repeat(${board.cols}, minmax(0, 1fr))`,
        gridTemplateRows: `repeat(${board.rows}, minmax(0, 1fr))`,
      }"
    >
      <div
        v-for="t in pathTiles"
        :key="t.index"
        class="tile"
        :class="{
          'tile-start': t.index === board.startIndex,
          'tile-end': t.index === board.endIndex,
        }"
        :style="{ gridArea: t.area }"
        role="button"
        tabindex="0"
        :aria-label="`第 ${t.index + 1} 格`"
        @click="$emit('tileClick', t.index)"
        @keydown.enter.prevent="$emit('tileClick', t.index)"
        @keydown.space.prevent="$emit('tileClick', t.index)"
      >
        <span v-if="t.index === board.startIndex" class="tile-ico">🏠</span>
        <span v-else-if="t.index === board.endIndex" class="tile-ico">🏆</span>
        <span v-else class="tile-num">{{ t.index + 1 }}</span>
      </div>

      <!-- 棋子层 -->
      <div
        v-for="p in players"
        :key="p.id"
        class="player"
        :class="{ active: p.id === (players[currentTurn]?.id) }"
        :style="{
          top: playerPosition(p.step).top + '%',
          left: playerPosition(p.step).left + '%',
          borderColor: '#fff',
          background: p.color,
          width: playerSize + '%',
          transform: `translate(calc(-50% + ${playerOffset(p.id).dx}%), calc(-50% + ${playerOffset(p.id).dy}%))`,
          transitionDelay: '0s',
        }"
      >
        <span class="player-ico">{{
          p.id === 'male'
            ? '♂'
            : p.id === 'female'
              ? '♀'
              : p.gender === 'm'
                ? '♂' + (players.indexOf(p) + 1)
                : p.gender === 'f'
                  ? '♀' + (players.indexOf(p) + 1)
                  : players.indexOf(p) + 1
        }}</span>
      </div>

      <!-- 中央插槽：骰子/规则面板 -->
      <div v-if="$slots.center" class="board-center" :style="centerStyle">
        <slot name="center" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.board-engine {
  max-width: 460px;
  margin: 0 auto;
}

.board-grid {
  position: relative;
  width: 100%;
  height: 100%;
  display: grid;
  gap: 2.2%;
  padding: 1.5%;
}

/* 中央区域：骰子/规则面板 */
.board-center {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  pointer-events: auto;
}

/* 路径格：统一的正方形圆角块（浅色玻璃质感） */
.tile {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 26%;
  background: linear-gradient(155deg, #ffffff, #fff0f5);
  border: 1px solid rgba(255, 140, 170, 0.35);
  box-shadow: 0 2px 5px rgba(255, 150, 175, 0.16), inset 0 1px 0 #fff;
  cursor: pointer;
  transition: transform 0.12s, box-shadow 0.2s;
  -webkit-tap-highlight-color: transparent;
}
.tile:active {
  transform: scale(0.93);
  box-shadow: 0 1px 3px rgba(255, 150, 175, 0.24);
}
.tile:focus-visible {
  outline: 2px solid #ff8fb3;
  outline-offset: 1px;
}
.tile::after {
  content: "";
  position: absolute;
  inset: 14%;
  border-radius: 26%;
  background: radial-gradient(circle at 30% 25%, rgba(255, 255, 255, 0.9), transparent 70%);
  pointer-events: none;
}
.tile:hover {
  box-shadow: 0 0 0 2px rgba(255, 110, 145, 0.3), 0 4px 10px rgba(255, 140, 170, 0.24);
}
.tile:active {
  transform: scale(0.92);
}
.tile-start {
  background: linear-gradient(155deg, #e9fff4, #c9f7dd);
  border-color: rgba(64, 200, 140, 0.45);
}
.tile-end {
  background: linear-gradient(155deg, #fff7e2, #ffe6a8);
  border-color: rgba(240, 180, 60, 0.5);
}
.tile-num {
  position: relative;
  z-index: 1;
  font-size: clamp(11px, 2.6vw, 14px);
  font-weight: 800;
  color: #d1788f;
}
.tile-ico {
  position: relative;
  z-index: 1;
  font-size: clamp(14px, 3.2vw, 20px);
}

/* 棋子：百分比定位 + 百分比尺寸，永不出格 */
.player {
  position: absolute;
  aspect-ratio: 1;
  border-radius: 50%;
  border: 2px solid #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 3px 10px rgba(180, 80, 110, 0.35);
  z-index: 5;
  transition: top 0.45s cubic-bezier(0.3, 0.8, 0.3, 1), left 0.45s cubic-bezier(0.3, 0.8, 0.3, 1), transform 0.45s;
  pointer-events: none;
}
.player.active {
  z-index: 6;
  box-shadow: 0 0 0 3px rgba(255, 90, 130, 0.45), 0 5px 14px rgba(180, 80, 110, 0.4);
}
.player-ico {
  font-size: clamp(12px, 3vw, 18px);
  font-weight: 800;
  color: #fff;
  white-space: nowrap;
}
</style>
