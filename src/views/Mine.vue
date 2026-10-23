<script setup lang="ts">
// 情侣扫雷：翻格抽任务（内含地雷格，踩到有「惩罚」彩蛋）
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useLibraryStore } from '../stores/packs'
import type { Card } from '../types'
import { richText } from '../utils/text'
import { buzz, tick } from '../utils/feedback'
import ImgRef from '../components/ImgRef.vue'

const route = useRoute()
const router = useRouter()
const lib = useLibraryStore()

const modeId = computed(() => route.params.modeId as string)
const mode = computed(() => lib.modeById(modeId.value))

const COLS = 6
const MAX = 36
const cells = ref<{ card: Card; mine: boolean; open: boolean }[]>([])
const active = ref<{ card: Card; mine: boolean } | null>(null)
const finished = ref(false)
const boom = ref(false)
/** 只读查看已翻开的格子（不写记录、不改局面） */
const peek = ref(false)

function shuffle<T>(a: T[]): T[] {
  const arr = a.slice()
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

function build() {
  const pool = (mode.value?.cards ?? []).filter((c) => c.text || c.image)
  const picked = shuffle(pool).slice(0, Math.min(MAX, pool.length))
  // 每 9 格埋 1 颗雷（约 11%）
  const mineCount = Math.max(1, Math.round(picked.length / 9))
  const mineIdx = new Set(shuffle(picked.map((_, i) => i)).slice(0, mineCount))
  cells.value = picked.map((card, i) => ({ card, mine: mineIdx.has(i), open: false }))
  active.value = null
  finished.value = false
  boom.value = false
  peek.value = false
}

function openCell(i: number) {
  const c = cells.value[i]
  if (!c) return
  // 已翻开的格子：再次点击 = 只读查看，不重复写记录、不改变对局
  if (c.open) {
    active.value = { card: c.card, mine: c.mine }
    peek.value = true
    boom.value = false
    return
  }
  if (finished.value) return
  c.open = true
  active.value = { card: c.card, mine: c.mine }
  peek.value = false
  tick(lib.settings.sound, c.mine ? 320 : 560, 0.08)
  buzz(lib.settings.vibrate, c.mine ? [24, 40, 24] : 16)
  if (c.card.text) lib.addHistory({ game: 'mine', modeTitle: mode.value?.title || '', text: c.card.text, image: c.card.image })
  boom.value = c.mine
  if (cells.value.every((x) => x.open)) finished.value = true
}

const openedCount = computed(() => cells.value.filter((c) => c.open).length)
const total = computed(() => cells.value.length)

onMounted(build)
</script>

<template>
  <div class="page mine-page">
    <div class="play-bar">
      <button class="bar-btn" @click="router.push('/g/mine')">‹</button>
      <div class="play-title">{{ mode?.title }}</div>
      <button class="bar-btn" @click="build">↻</button>
    </div>

    <div class="mine-progress">
      <div class="mp-bar"><span :style="{ width: (openedCount / Math.max(total, 1)) * 100 + '%' }"></span></div>
      <div class="mp-text">{{ openedCount }} / {{ total }}</div>
    </div>

    <div class="mine-grid" :style="{ gridTemplateColumns: `repeat(${COLS}, 1fr)` }">
      <button
        v-for="(c, i) in cells"
        :key="i"
        class="mine-cell"
        :class="{ open: c.open, mine: c.open && c.mine }"
        @click="openCell(i)"
      >
        <template v-if="c.open">
          <span v-if="c.mine">💥</span>
          <span v-else>💗</span>
        </template>
        <span v-else class="q">?</span>
      </button>
    </div>

    <div class="mine-hint">点开格子领取任务 · 再点已翻开的格子可重看内容 · 踩到 💥 要接受对方的小惩罚</div>

    <div v-if="active" class="sheet-mask" @click.self="active = null">
      <div class="task-card pop-in" :class="{ boom }">
        <div class="task-tag">{{ peek ? '查看内容' : boom ? '踩到雷啦 💥 接受惩罚' : '任务' }}</div>
        <div class="task-body" v-html="richText(active.card.text || '')"></div>
        <ImgRef v-if="active.card.image" class="task-img" :src="active.card.image" />
        <button v-if="peek" class="btn btn-primary btn-block" @click="active = null; peek = false">关闭</button>
        <button v-else class="btn btn-primary btn-block" @click="active = null; finished && build()">
          {{ finished ? '再来一局' : '完成' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.play-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px 4px;
}
.bar-btn {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: #fff;
  color: #e2587f;
  font-size: 17px;
  box-shadow: 0 3px 10px rgba(255, 130, 160, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
}
.play-title {
  flex: 1;
  text-align: center;
  font-size: 15px;
  font-weight: 800;
  color: #6b4552;
}
.mine-progress {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 4px 18px 10px;
}
.mp-bar {
  flex: 1;
  height: 7px;
  border-radius: 999px;
  background: rgba(255, 120, 150, 0.14);
  overflow: hidden;
}
.mp-bar span {
  display: block;
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #ffb0c6, #ff3d68);
  transition: width 0.3s;
}
.mp-text {
  font-size: 11px;
  color: #b08a99;
  font-weight: 700;
}
.mine-grid {
  display: grid;
  gap: 8px;
  padding: 4px 16px;
}
.mine-cell {
  aspect-ratio: 1;
  border-radius: 14px;
  background: linear-gradient(150deg, #fff, #ffeef4);
  box-shadow: 0 5px 12px rgba(255, 140, 170, 0.18), inset 0 0 0 1px rgba(255, 255, 255, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 17px;
  transition: transform 0.14s;
}
.mine-cell:active {
  transform: scale(0.92);
}
.mine-cell.open {
  background: linear-gradient(150deg, #fff7fa, #ffe3ec);
  box-shadow: inset 0 2px 6px rgba(255, 140, 170, 0.16);
}
.mine-cell.open { font-size: 18px; }
.mine-cell.mine {
  background: linear-gradient(150deg, #fff1f1, #ffdada);
}
.q {
  font-size: 14px;
  font-weight: 900;
  color: #e7bccb;
}
.mine-hint {
  text-align: center;
  font-size: 11.5px;
  color: #c4a8b3;
  padding: 14px 0;
}
.task-card {
  width: 100%;
  max-width: 340px;
  background: linear-gradient(180deg, #fffdfd, #fff4f7);
  border-radius: 26px;
  padding: 22px 20px 18px;
  box-shadow: 0 26px 60px rgba(160, 60, 90, 0.24);
  text-align: center;
}
.task-card.boom {
  background: linear-gradient(180deg, #fff9f5, #ffe9e0);
}
.task-tag {
  display: inline-block;
  font-size: 11px;
  font-weight: 800;
  color: #e2587f;
  background: rgba(255, 90, 130, 0.1);
  padding: 3px 12px;
  border-radius: 999px;
}
.task-body {
  margin: 16px 0 18px;
  font-size: var(--card-fs, 17px);
  line-height: 1.75;
  font-weight: 600;
  color: #4a3038;
  word-break: break-word;
}
.task-img {
  width: 100%;
  border-radius: 14px;
  margin-bottom: 12px;
}
</style>
