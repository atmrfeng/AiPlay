<script setup lang="ts">
// 飞行棋对局：棋盘格数跟随内容数量自适应
import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import BoardEngine from '../components/BoardEngine.vue'
import DiceFace from '../components/DiceFace.vue'
import Confetti from '../components/Confetti.vue'
import { useLibraryStore } from '../stores/packs'
import { useGameStore } from '../stores/game'
import { richText } from '../utils/text'
import { paceMs } from '../utils/prefs'
import { buzz, fanfare, tick } from '../utils/feedback'
import ImgRef from '../components/ImgRef.vue'

const route = useRoute()
const router = useRouter()
const lib = useLibraryStore()
const gs = useGameStore()

const modeId = computed(() => route.params.modeId as string)
const mode = computed(() => lib.modeById(modeId.value))
const state = computed(() => gs.game)
const displayDice = ref(1)
const showWin = ref(false)
const lastTask = ref('')
const punish = ref(0)
const penalizing = ref(false)
const showPenaltyEnd = ref(false)

/** 多人模式（仅 flying-16）：开局前可自定义人数与昵称 */
const MULTI_MODE_ID = 'flying-16'
const isMulti = computed(() => mode.value?.id === MULTI_MODE_ID)
const showSetup = ref(false)
const mpCount = ref(4)
const mpNames = ref(['', '', '', '', '', ''])
const MP_COLORS = ['#5b8def', '#ff6b9d', '#3fbfad', '#f0a93b', '#7c6cf6', '#e2557b']
const currentTurn = computed(() => state.value?.turn ?? 0)
const players = computed(() => state.value?.players ?? [])
const tiles = computed(() => state.value?.tiles ?? [])
const me = computed(() => players.value[currentTurn.value])


function start() {
  if (!mode.value) return
  if (isMulti.value) {
    showSetup.value = true
    return
  }
  gs.start(mode.value, lib.settings.nick1, lib.settings.nick2)
  displayDice.value = 1
  showWin.value = false
  lastTask.value = ''
}

function restart() {
  start()
}

function startMulti() {
  if (!mode.value) return
  const n = Math.min(6, Math.max(2, mpCount.value))
  const names = mpNames.value.slice(0, n).map((x, i) => x.trim() || (i === 0 ? lib.settings.nick1 : i === 1 ? lib.settings.nick2 : '玩家' + (i + 1)))
  gs.startWith(mode.value, names)
  showSetup.value = false
}

function setCount(n: number) {
  mpCount.value = Math.min(6, Math.max(2, n))
}

function exit() {
  gs.persist()
  router.push('/g/flying')
}

let timer: number | null = null
function rollDice() {
  if (!state.value || state.value.over || gs.rolling) return
  tick(lib.settings.sound, 620, 0.05)
  buzz(lib.settings.vibrate, 12)
  const result = gs.roll()
  let ticks = 0
  if (timer) window.clearInterval(timer)
  timer = window.setInterval(() => {
    ticks++
    displayDice.value = Math.floor(Math.random() * 6) + 1
    if (ticks < 9) return
    window.clearInterval(timer as number)
    timer = null
    displayDice.value = result
    gs.finishRoll()
    const remain = gs.maxStep - (players.value[currentTurn.value]?.step ?? 0)
    const steps = Math.min(result, remain)
    let moved = 0
    timer = window.setInterval(() => {
      moved++
      gs.stepForward()
      if (moved >= steps) {
        window.clearInterval(timer as number)
        timer = null
        const r = gs.settle()
        if (r === 'won') {
          showWin.value = true
          fanfare(lib.settings.sound)
          buzz(lib.settings.vibrate, [30, 60, 30])
        }
        if (r === 'task') buzz(lib.settings.vibrate, 20)
        if (r === 'task' && gs.taskCard?.text) {
          lastTask.value = gs.taskCard.text
          lib.addHistory({
            game: 'flying',
            modeTitle: mode.value?.title || gs.modeTitle,
            text: gs.taskCard.text,
            image: gs.taskCard.image,
            who: gs.game?.players[gs.game.turn]?.name,
          })
        }
      }
    }, paceMs(lib.settings.pace))
  }, 85)
}

const taskFaved = computed(() => (gs.taskCard?.text ? lib.isFavorite(gs.taskCard.text, 'flying') : false))

// ——— 格子内容预览（只读，不改变任何对局状态）———
const peekIndex = ref<number | null>(null)
const peekInfo = computed(() => {
  const i = peekIndex.value
  if (i === null || !state.value) return null
  const b = state.value.board
  const card = tiles.value[i] || null
  const isStart = i === b.startIndex
  const isEnd = i === b.endIndex
  return {
    index: i,
    isStart,
    isEnd,
    kind: isStart ? '起点' : isEnd ? '终点' : card?.text || card?.image ? '任务' : '空地',
    text: card?.text || '',
    image: card?.image || '',
    remaining: Math.max(0, b.path.length - 1 - i),
  }
})

function openPeek(i: number) {
  // 任务弹层打开时不干扰（避免遮罩叠加）
  if (gs.showTask) return
  peekIndex.value = i
}

function closePeek() {
  peekIndex.value = null
}

function toggleTaskFav() {
  const c = gs.taskCard
  if (!c?.text) return
  lib.toggleFavorite({ game: 'flying', modeTitle: mode.value?.title || gs.modeTitle, text: c.text, image: c.image })
}

function done() {
  resetPunish()
  gs.nextTurn()
}

function resetPunish() {
  punish.value = 0
  penalizing.value = false
  showPenaltyEnd.value = false
}

function hasCard(step: number): boolean {
  const c = gs.game?.tiles[step]
  return !!c && (!!c.text || !!c.image)
}

/** 不执行任务：后退惩罚，退到有任务的格子继续执行；退到起点则本回合结束 */
function refuse() {
  if (!gs.game || penalizing.value) return
  punish.value += 1
  penalizing.value = true
  const back = Math.min(1 + punish.value, 3)
  const from = gs.game.players[gs.game.turn].step
  let target = from - back
  while (target > 0 && !hasCard(target)) target--
  animateTo(target, () => {
    penalizing.value = false
    if (target <= 0 || !hasCard(target)) {
      showPenaltyEnd.value = true
      return
    }
    const card = gs.game!.tiles[target]
    gs.taskCard = card
    gs.showTask = true
    lastTask.value = card?.text || ''
  })
}

function animateTo(target: number, cb: () => void) {
  if (timer) window.clearInterval(timer)
  timer = window.setInterval(() => {
    const p = gs.game?.players[gs.game.turn]
    if (!p) { window.clearInterval(timer as number); cb(); return }
    p.step = Math.max(target, p.step - 1)
    if (p.step <= target) {
      window.clearInterval(timer as number)
      timer = null
      gs.persist()
      cb()
    }
  }, paceMs(lib.settings.pace))
}

onMounted(() => {
  if (gs.restore() && gs.game?.modeId === modeId.value) {
    displayDice.value = gs.dice || 1
    return
  }
  start()
})

watch(modeId, () => {
  if (!mode.value) return
  if (gs.game?.modeId === modeId.value) return
  start()
})

onBeforeUnmount(() => {
  if (timer) window.clearInterval(timer)
  gs.persist()
})
</script>

<template>
  <div class="page play-page">
    <div class="play-side">
    <div class="play-bar">
      <button class="bar-btn" @click="exit">‹</button>
      <div class="play-title">{{ gs.modeTitle || mode?.title }}</div>
      <button class="bar-btn" @click="restart">↻</button>
    </div>

    <div class="board-meta">
      <span class="bm-chip">{{ gs.cellCount }} 格</span>
      <span class="bm-text">格数按内容自动生成 · 每格都有任务</span>
    </div>

    <div v-if="showSetup && isMulti" class="sheet-mask">
      <div class="setup-card pop-in">
        <div class="sc-title">多人模式设置</div>
        <div class="sc-sub">2–6 人同场，轮流掷骰；不执行任务会后退惩罚</div>
        <div class="sc-count">
          <button @click="setCount(mpCount - 1)">−</button>
          <span>{{ mpCount }} 人</span>
          <button @click="setCount(mpCount + 1)">＋</button>
        </div>
        <div class="sc-names">
          <label v-for="i in mpCount" :key="i" class="sc-row">
            <span class="sc-dot" :style="{ background: MP_COLORS[(i - 1) % MP_COLORS.length] }"></span>
            <input
              v-model="mpNames[i - 1]"
              maxlength="8"
              :placeholder="i === 1 ? '男方昵称' : i === 2 ? '女方昵称' : '玩家' + i"
            />
          </label>
        </div>
        <button class="btn btn-primary btn-block" @click="startMulti">开始（{{ mpCount }} 人）</button>
      </div>
    </div>

    <BoardEngine
      v-if="state"
      :board="state.board"
      :tiles="tiles"
      :players="players"
      :current-turn="currentTurn"
      @tile-click="openPeek"
    >
      <template #center>
        <button class="dice-btn" :class="{ rolling: gs.rolling }" :disabled="penalizing || state.over" @click="rollDice">
          <DiceFace :value="displayDice" :rolling="gs.rolling" />
        </button>
        <div class="turn-chip" v-if="!state.over">
          <span class="dot" :style="{ background: me?.color }"></span>{{ me?.name }}的回合
        </div>
        <div class="turn-chip over" v-else>本局结束</div>
      </template>
    </BoardEngine>

    <aside class="play-info">
      <div class="pi-title">对局信息</div>
      <div class="pi-mode">{{ mode?.title }}</div>
      <div class="pi-meta">{{ gs.cellCount }} 格 · 终点在第 {{ gs.maxStep }} 步</div>
      <div class="pi-players">
        <div v-for="(p, i) in players" :key="p.id" class="pi-p" :class="{ on: currentTurn === i }">
          <span class="pi-dot" :style="{ background: p.color }"></span>
          <span class="pi-name">{{ p.name }}</span>
          <span class="pi-step">{{ p.step }} / {{ gs.maxStep }}</span>
        </div>
      </div>
      <div class="pi-tip">{{ gs.rolling ? '掷骰中…' : penalizing ? '惩罚后退中…' : punish > 0 ? '惩罚中：不执行会继续后退' : '点击棋盘中央的骰子前进' }}</div>
      <div v-if="lastTask" class="pi-last">
        <div class="pl-label">最近任务</div>
        <div class="pl-text">{{ lastTask }}</div>
      </div>
      <div class="pi-rule">
        <div class="pl-label">规则</div>
        <div class="pr-text">摇骰前行，落在哪格就执行该格任务；率先到达终点者获胜。</div>
      </div>
    </aside>

    <div class="play-hint">点击骰子前进 · 每格都有任务 · 先到终点获胜</div>
    </div>

    <!-- 格子内容预览（只读，不影响对局） -->
    <div v-if="peekInfo" class="sheet-mask" @click.self="closePeek">
      <div class="peek-card pop-in">
        <div class="peek-head">
          <span class="peek-idx">第 {{ peekInfo.index + 1 }} 格</span>
          <span class="peek-kind" :class="{ empty: peekInfo.kind === '空地', end: peekInfo.isEnd, start: peekInfo.isStart }">
            {{ peekInfo.kind }}
          </span>
          <span v-if="!peekInfo.isEnd && !peekInfo.isStart" class="peek-left">距终点 {{ peekInfo.remaining }} 格</span>
        </div>
        <div v-if="peekInfo.text" class="peek-body" v-html="richText(peekInfo.text)"></div>
        <ImgRef v-if="peekInfo.image" class="peek-img" :src="peekInfo.image" />
        <div v-if="!peekInfo.text && !peekInfo.image" class="peek-empty">
          <span v-if="peekInfo.isStart">这里是起点，出发不需要抽任务。</span>
          <span v-else-if="peekInfo.isEnd">走到这里就赢了。</span>
          <span v-else>这一格没有安排内容。</span>
        </div>
        <div class="peek-tip">仅查看，不影响对局</div>
        <button class="btn btn-ghost btn-block" @click="closePeek">关闭</button>
      </div>
    </div>

    <!-- 任务卡 -->
    <div v-if="gs.showTask && gs.taskCard" class="sheet-mask" @click.self="done">
      <div class="task-card pop-in">
        <div class="task-tag">
          {{ me?.name }} · 第 {{ (me?.step ?? 0) + 1 }} 格
          <em v-if="punish > 0" class="punish-tag">惩罚中 · 已后退 {{ punish }} 次</em>
        </div>
        <div class="task-body" v-html="richText(gs.taskCard.text || '')"></div>
        <ImgRef v-if="gs.taskCard.image" class="task-img" :src="gs.taskCard.image" />
        <button class="task-fav" :class="{ on: taskFaved }" @click="toggleTaskFav">{{ taskFaved ? '♥' : '♡' }}</button>
        <div class="task-actions">
          <button class="btn btn-ghost danger" @click="refuse">不执行 · 后退惩罚</button>
          <button class="btn btn-primary" @click="done">已完成</button>
        </div>
      </div>
    </div>

    <!-- 惩罚：退回起点 -->
    <div v-if="showPenaltyEnd" class="sheet-mask" @click.self="done">
      <div class="task-card pop-in warn">
        <div class="task-tag">回到起点</div>
        <div class="task-body">连续不执行任务，已退回起点，本回合结束。</div>
        <div class="task-actions">
          <button class="btn btn-primary btn-block" @click="done">知道了</button>
        </div>
      </div>
    </div>

    <!-- 胜利 -->
    <template v-if="showWin">
      <Confetti />
      <div class="sheet-mask" @click.self="showWin = false">
        <div class="win-card pop-in">
          <div class="win-emoji">🏆</div>
          <div class="win-title">{{ state?.winner === 'male' ? players[0].name : players[1].name }} 获胜</div>
          <div class="win-sub">恭喜率先抵达终点<br />可以要求对方做任何事情哦～</div>
          <button class="btn btn-primary btn-block" @click="restart">再来一局</button>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.play-page {
  display: flex;
  flex-direction: column;
  padding: 6px 14px 12px;
}
.play-side {
  display: contents;
}
.play-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 2px 2px 8px;
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
.board-meta {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-bottom: 8px;
}
.bm-chip {
  font-size: 10.5px;
  font-weight: 800;
  color: #e2587f;
  background: rgba(255, 90, 130, 0.1);
  padding: 2px 9px;
  border-radius: 999px;
}
.bm-text {
  font-size: 10.5px;
  color: #c4a8b3;
}
.play-page :deep(.board-engine) {
  flex: none;
}
.dice-btn {
  border: none;
  width: 66px;
  height: 66px;
  border-radius: 50%;
  background: transparent;
  box-shadow: none;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.12s;
}
.dice-btn:active .dice-face {
  transform: scale(0.9);
}
.dice-btn :deep(.dice-face) {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  background: #ffffff;
  border: 2px solid #ffe1ea;
  box-shadow: 0 8px 18px rgba(255, 90, 130, 0.22);
}
.turn-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-weight: 700;
  color: #a3748a;
  background: rgba(255, 255, 255, 0.72);
  padding: 3px 10px;
  border-radius: 999px;
  white-space: nowrap;
}
.turn-chip .dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}
.play-hint {
  text-align: center;
  font-size: 11px;
  color: #c4a8b3;
  padding-top: 10px;
}

/* 格子内容预览（只读，不复用任务卡，避免误触任务逻辑） */
.peek-card {
  width: 100%;
  max-width: 340px;
  background: linear-gradient(180deg, #fffefe, #fff6f9);
  border-radius: 24px;
  padding: 18px 20px 16px;
  box-shadow: 0 24px 56px rgba(160, 60, 90, 0.22);
  border: 1px solid rgba(255, 255, 255, 0.9);
  text-align: center;
}
.peek-head {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 14px;
}
.peek-idx {
  font-size: 12px;
  font-weight: 800;
  color: #6b4552;
}
.peek-kind {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.04em;
  color: #e2587f;
  background: rgba(255, 90, 130, 0.1);
  padding: 2px 9px;
  border-radius: 999px;
}
.peek-kind.empty {
  color: #b08a99;
  background: rgba(176, 138, 153, 0.12);
}
.peek-kind.start {
  color: #5b8def;
  background: rgba(91, 141, 239, 0.12);
}
.peek-kind.end {
  color: #d99a22;
  background: rgba(217, 154, 34, 0.14);
}
.peek-left {
  font-size: 10px;
  color: #b08a99;
}
.peek-body {
  font-size: calc(var(--card-fs, 16px) * 0.94);
  line-height: 1.75;
  font-weight: 600;
  color: #4a3038;
  word-break: break-word;
  max-height: 46vh;
  overflow-y: auto;
}
.peek-body :deep(strong) {
  color: #e2264f;
}
.peek-img {
  width: 100%;
  border-radius: 14px;
  margin-top: 4px;
  max-height: 46vh;
  object-fit: contain;
}
.peek-empty {
  font-size: 13px;
  color: #8d6a78;
  line-height: 1.7;
  padding: 10px 0 4px;
}
.peek-tip {
  margin: 14px 0 10px;
  font-size: 10px;
  color: #c4a8b3;
}
.task-card {
  position: relative;
  width: 100%;
  max-width: 340px;
  background: linear-gradient(180deg, #fffdfd, #fff4f7);
  border-radius: 26px;
  padding: 22px 20px 18px;
  box-shadow: 0 26px 60px rgba(160, 60, 90, 0.24);
  text-align: center;
  border: 1px solid rgba(255, 255, 255, 0.9);
}
.setup-card {
  width: 100%;
  max-width: 340px;
  background: #fff;
  border-radius: 24px;
  padding: 22px 20px 18px;
  box-shadow: 0 24px 60px rgba(160, 60, 90, 0.24);
}
.sc-title {
  font-size: 17px;
  font-weight: 900;
  color: #4a2f38;
  text-align: center;
}
.sc-sub {
  margin-top: 6px;
  font-size: 11.5px;
  line-height: 1.6;
  color: #b08a99;
  text-align: center;
}
.sc-count {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 18px;
  margin: 16px 0 12px;
}
.sc-count button {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: rgba(255, 120, 150, 0.1);
  color: #e2587f;
  font-size: 17px;
  line-height: 1;
}
.sc-count span {
  font-size: 15px;
  font-weight: 900;
  color: #4a2f38;
  min-width: 56px;
  text-align: center;
}
.sc-names {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 14px;
}
.sc-row {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 0 12px;
  height: 42px;
  border-radius: 12px;
  background: #fff8fb;
  border: 1px solid rgba(255, 140, 170, 0.18);
}
.sc-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  flex: none;
}
.sc-row input {
  flex: 1;
  min-width: 0;
  border: none;
  background: transparent;
  outline: none;
  font-size: 13.5px;
  color: #4a3038;
}
.punish-tag {
  margin-left: 6px;
  font-style: normal;
  color: #fff;
  background: rgba(200, 60, 90, 0.35);
  padding: 1px 7px;
  border-radius: 999px;
}
.btn.danger {
  background: #fff1f3;
  color: #e8384f;
  box-shadow: none;
}
.task-card.warn {
  background: linear-gradient(180deg, #fff9f7, #fff0ee);
}
.task-tag {
  display: inline-block;
  font-size: 11px;
  font-weight: 700;
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
.task-body :deep(strong) {
  color: #e2264f;
}
.task-img {
  width: 100%;
  border-radius: 14px;
  margin-bottom: 12px;
}
.task-fav {
  position: absolute;
  right: 12px;
  top: 12px;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  font-size: 17px;
  color: #e0b9c7;
  background: rgba(255, 120, 150, 0.07);
}
.task-fav.on {
  color: #ff3d68;
}
.task-actions {
  display: flex;
  gap: 10px;
}
.task-actions .btn {
  flex: 1;
  height: 44px;
  font-size: 14.5px;
}

.win-card {
  width: 100%;
  max-width: 320px;
  background: #fff;
  border-radius: 26px;
  padding: 26px 22px 20px;
  text-align: center;
  box-shadow: 0 26px 60px rgba(160, 60, 90, 0.26);
}
.win-emoji {
  font-size: 46px;
  animation: floatY 1.6s ease-in-out infinite;
}
.win-title {
  margin-top: 6px;
  font-size: 20px;
  font-weight: 900;
  color: #e2264f;
}
.win-sub {
  margin: 8px 0 18px;
  font-size: 13px;
  line-height: 1.7;
  color: #9b7f8a;
}
</style>

<style>
/* 横屏：单列居中，压缩多余信息，让棋盘尽量大 */
.app-shell.landscape .play-page {
  align-items: center;
  justify-content: flex-start;
  padding: 4px 18px 8px;
}
.app-shell.landscape .play-side {
  display: contents;
}
.app-shell.landscape .play-bar {
  width: 100%;
  max-width: 620px;
}
.app-shell.landscape .play-hint {
  display: none;
}
.app-shell.landscape .board-engine {
  height: calc(100dvh - 132px);
}
</style>

<style>
/* 宽屏：棋盘 + 右侧对局信息 */
.play-info {
  display: none;
}
@media (min-width: 900px) {
  .app-shell .play-page {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 300px;
    grid-template-rows: auto 1fr;
    align-items: start;
    column-gap: 26px;
    padding: 10px 0 16px;
    max-width: 1040px;
    margin: 0 auto;
  }
  .app-shell .play-page .play-side {
    display: contents;
  }
  .app-shell .play-page .play-bar {
    grid-column: 1;
    grid-row: 1;
    width: 100%;
    max-width: none;
    justify-self: stretch;
    padding-left: 0;
    padding-right: 0;
  }
  .app-shell .play-page .board-meta {
    display: none;
  }
  .pi-meta {
    margin-top: 3px;
    font-size: 10.5px;
    color: #b08a99;
  }
  .app-shell .play-page .board-engine {
    grid-column: 1;
    grid-row: 2;
    height: calc(100dvh - 140px);
    width: auto;
    max-width: none;
    justify-self: center;
  }
  .app-shell .play-page .play-hint {
    display: none;
  }
  .app-shell .play-page .play-info {
    grid-column: 2;
    grid-row: 1 / 3;
    display: block;
    position: sticky;
    top: 0;
    background: #fff;
    border-radius: 22px;
    padding: 18px;
    box-shadow: 0 12px 30px rgba(255, 150, 180, 0.14);
  }
  .pi-title {
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.1em;
    color: #c9a3b1;
  }
  .pi-mode {
    margin-top: 4px;
    font-size: 16px;
    font-weight: 900;
    color: #4a2f38;
  }
  .pi-players {
    margin-top: 14px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .pi-p {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 9px 12px;
    border-radius: 14px;
    background: #fff8fb;
    font-size: 13px;
    color: #6b4552;
  }
  .pi-p.on {
    background: linear-gradient(120deg, #fff0f5, #ffe3ec);
    box-shadow: inset 0 0 0 1px rgba(255, 120, 150, 0.28);
  }
  .pi-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
  }
  .pi-name {
    flex: 1;
    font-weight: 700;
  }
  .pi-step {
    font-size: 11.5px;
    color: #b08a99;
  }
  .pi-tip {
    margin-top: 12px;
    font-size: 11.5px;
    color: #b08a99;
    line-height: 1.6;
  }
  .pi-last,
  .pi-rule {
    margin-top: 14px;
    padding-top: 12px;
    border-top: 1px dashed rgba(255, 140, 170, 0.22);
  }
  .pl-label {
    font-size: 10.5px;
    font-weight: 800;
    color: #c9a3b1;
    letter-spacing: 0.08em;
  }
  .pl-text {
    margin-top: 5px;
    font-size: 12.5px;
    line-height: 1.65;
    color: #5d444d;
    display: -webkit-box;
    -webkit-line-clamp: 4;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .pr-text {
    margin-top: 5px;
    font-size: 11.5px;
    line-height: 1.7;
    color: #9b7f8a;
  }
}
</style>
