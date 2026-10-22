<script setup lang="ts">
// 真心话大冒险：转瓶选人 → 选真心话/大冒险 → 抽卡（含完整动画链）
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useLibraryStore } from '../stores/packs'
import type { Card } from '../types'
import { fillRoles, richText } from '../utils/text'
import { buzz, tick } from '../utils/feedback'
import ImgRef from '../components/ImgRef.vue'

const route = useRoute()
const router = useRouter()
const lib = useLibraryStore()

const modeId = computed(() => route.params.modeId as string)
const mode = computed(() => lib.modeById(modeId.value))

const allCards = computed(() => (mode.value?.cards ?? []).filter((c) => c.text || c.image))
const truthPool = computed(() => {
  const t = allCards.value.filter((c) => c.kind === 'truth')
  return t.length ? t : allCards.value
})
const darePool = computed(() => {
  const d = allCards.value.filter((c) => c.kind === 'dare')
  return d.length ? d : allCards.value
})

const stage = ref<'spin' | 'choose' | 'card'>('spin')
const angle = ref(0)
const spinning = ref(false)
const chosen = ref(0) // 0 = 男方, 1 = 女方
const card = ref<Card | null>(null)
const kindLabel = ref('')
const lastKind = ref<'truth' | 'dare'>('truth')
const drawn = ref(0)

const players = computed(() => [
  { name: lib.settings.nick1 || '男方', emoji: '👦', color: '#5b8def' },
  { name: lib.settings.nick2 || '女方', emoji: '👧', color: '#ff6b9d' },
])

function shuffle<T>(a: T[]): T[] {
  const arr = a.slice()
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

const truthQueue = ref<Card[]>([])
const dareQueue = ref<Card[]>([])

function reset() {
  stage.value = 'spin'
  card.value = null
  drawn.value = 0
  angle.value = 0
  truthQueue.value = shuffle(truthPool.value)
  dareQueue.value = shuffle(darePool.value)
}

function spin() {
  if (spinning.value) return
  spinning.value = true
  chosen.value = Math.random() < 0.5 ? 0 : 1
  // 指针在正上方，瓶子旋转后指向被选中的人（左右各 90°）
  const base = chosen.value === 0 ? 270 : 90
  const turns = 4 + Math.floor(Math.random() * 3)
  const cur = ((angle.value % 360) + 360) % 360
  angle.value += turns * 360 + (base - cur)
  window.setTimeout(() => {
    spinning.value = false
    stage.value = 'choose'
  }, 2400)
}

/** 把卡片文本中的角色占位替换为真实称呼（抽题人 = role1，对方 = role2） */
function resolvedText(c: Card | null, actor: number): string {
  const raw = c?.text || ''
  const stripped = raw.replace(/^\{\$role[12]\}，?/, '')
  return fillRoles(stripped, players.value[actor].name, players.value[1 - actor].name)
}

function pick(kind: 'truth' | 'dare') {
  const queue = kind === 'truth' ? truthQueue : dareQueue
  if (!queue.value.length) {
    queue.value = shuffle(kind === 'truth' ? truthPool.value : darePool.value)
  }
  card.value = queue.value.shift() ?? null
  kindLabel.value = kind === 'truth' ? '真心话' : '大冒险'
  lastKind.value = kind
  drawn.value++
  stage.value = 'card'
  tick(lib.settings.sound, 720, 0.07)
  buzz(lib.settings.vibrate, 18)
  if (card.value?.text) {
    lib.addHistory({
      game: 'truth',
      modeTitle: mode.value?.title || '',
      text: resolvedText(card.value, chosen.value),
      image: card.value.image,
      who: players.value[chosen.value].name,
    })
  }
}

/** 换一题：同类型立即再抽一张（不再回到转瓶） */
function again() {
  pick(lastKind.value)
}

/** 下一位：换人，由新的人自己选择真心话 / 大冒险 */
function nextPerson() {
  chosen.value = chosen.value === 0 ? 1 : 0
  card.value = null
  stage.value = 'choose'
  // 让瓶口同步转向新的抽题人，避免「换人了但瓶子还指着上一位」
  pointTo(chosen.value)
}

/** 把瓶子转到指向某个人（短动画） */
function pointTo(idx: number) {
  const base = idx === 0 ? 270 : 90
  const cur = ((angle.value % 360) + 360) % 360
  let delta = base - cur
  if (delta > 180) delta -= 360
  if (delta < -180) delta += 360
  angle.value += delta
}

/** 重新转瓶 */
function next() {
  stage.value = 'spin'
  card.value = null
  angle.value = angle.value % 360
}

const cardText = computed(() => resolvedText(card.value, chosen.value))

const faved = computed(() => lib.isFavorite(cardText.value, 'truth'))

function toggleFav() {
  if (!card.value?.text) return
  lib.toggleFavorite({ game: 'truth', modeTitle: mode.value?.title || '', text: cardText.value, image: card.value.image })
}

onMounted(reset)
</script>

<template>
  <div class="page truth-page">
    <div class="play-bar">
      <button class="bar-btn" @click="router.push('/g/truth')">‹</button>
      <div class="play-title">{{ mode?.title }}</div>
      <button class="bar-btn" @click="reset">↻</button>
    </div>

    <div class="truth-stage">
      <!-- 转瓶区 -->
      <div class="bottle-wrap" :class="{ dim: stage === 'card' }">
        <div class="person left" :class="{ picked: stage !== 'spin' && chosen === 0 }">
          <div class="avatar" :style="{ background: players[0].color + '22', color: players[0].color }">👦</div>
          <div class="pname">{{ players[0].name }}</div>
        </div>

        <div class="bottle-box">
          <div class="bottle" :class="{ spinning }" :style="{ transform: `rotate(${angle}deg)` }">
            <svg viewBox="0 0 60 150" width="100%">
              <defs>
                <linearGradient id="btl" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stop-color="#fff0f5" />
                  <stop offset="45%" stop-color="#ffb3c8" />
                  <stop offset="100%" stop-color="#ff5c88" />
                </linearGradient>
              </defs>
              <rect x="23" y="0" width="14" height="20" rx="4" fill="url(#btl)" />
              <path d="M23 18c0 14-19 20-19 46v56a14 14 0 0 0 14 14h24a14 14 0 0 0 14-14V64c0-26-19-32-19-46z" fill="url(#btl)" opacity=".92" />
              <ellipse cx="30" cy="118" rx="16" ry="10" fill="#fff" opacity=".28" />
            </svg>
          </div>
          <button v-if="stage === 'spin'" class="btn btn-primary spin-btn" @click="spin">
            {{ spinning ? '转动中…' : '转动瓶子' }}
          </button>
          <div v-else-if="stage === 'choose'" class="choose-box">
            <div class="choose-who">轮到 {{ players[chosen].name }} 选择</div>
            <div class="choose-row">
              <button class="choose-btn truth" @click="pick('truth')">真心话</button>
              <button class="choose-btn dare" @click="pick('dare')">大冒险</button>
            </div>
          </div>
        </div>

        <div class="person right" :class="{ picked: stage !== 'spin' && chosen === 1 }">
          <div class="avatar" :style="{ background: players[1].color + '22', color: players[1].color }">👧</div>
          <div class="pname">{{ players[1].name }}</div>
        </div>
      </div>

      <!-- 卡片 -->
      <transition name="flip">
        <div v-if="stage === 'card' && card" class="truth-card">
          <div class="tc-kind" :class="kindLabel === '真心话' ? 'truth' : 'dare'">{{ kindLabel }}</div>
          <div class="tc-who">{{ players[chosen].name }}，{{ kindLabel === '真心话' ? '请回答' : '请完成' }}：</div>
          <div class="tc-text" v-html="richText(cardText)"></div>
          <ImgRef v-if="card.image" class="tc-img" :src="card.image" />
          <button class="tc-fav" :class="{ on: faved }" @click="toggleFav">{{ faved ? '♥' : '♡' }}</button>
          <div class="tc-actions">
            <button class="btn btn-ghost" @click="again">换一题</button>
            <button class="btn btn-primary" @click="nextPerson">下一位</button>
          </div>
          <button class="tc-spin-again" @click="next">重新转瓶选人</button>
        </div>
      </transition>

      <div v-if="stage === 'spin'" class="truth-tip">转动瓶子，瓶口指向谁，谁来抽题<br /><span class="tip-count">本副卡组 {{ truthPool.length }} 真心话 · {{ darePool.length }} 大冒险</span></div>
      <div v-else-if="stage === 'card'" class="truth-count">本局已完成 {{ drawn }} 题</div>
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
.truth-page {
  display: flex;
  flex-direction: column;
}
.truth-stage {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 10px 16px 40px;
  gap: 16px;
}
.bottle-wrap {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 4px 0;
  transition: opacity 0.3s;
}
.bottle-wrap.dim {
  opacity: 0.5;
  transform: scale(0.94);
}
.person {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  transition: transform 0.3s;
}
.person.picked {
  transform: scale(1.08);
}
.person.picked .avatar {
  box-shadow: 0 0 0 3px #fff, 0 0 0 6px rgba(255, 90, 130, 0.35);
}
.avatar {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26px;
  background: #ffeef3;
}
.pname {
  font-size: 12px;
  font-weight: 700;
  color: #8d6a78;
  max-width: 72px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.bottle-box {
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
}
.bottle {
  pointer-events: none;
  width: 46px;
  height: 118px;
  transform-origin: 50% 50%;
  transition: transform 2.3s cubic-bezier(0.18, 0.78, 0.16, 1);
  filter: drop-shadow(0 8px 16px rgba(255, 110, 145, 0.35));
}
.bottle.spinning {
  transition-timing-function: cubic-bezier(0.14, 0.72, 0.12, 1);
}
.spin-btn {
  height: 38px;
  padding: 0 20px;
  font-size: 13.5px;
}
.choose-box {
  position: relative;
  z-index: 3;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}
.choose-who {
  font-size: 11.5px;
  color: #b08a99;
  font-weight: 700;
}
.choose-row {
  display: flex;
  gap: 8px;
}
.choose-btn {
  height: 38px;
  padding: 0 16px;
  border-radius: 999px;
  font-size: 13.5px;
  font-weight: 800;
  color: #fff;
}
.choose-btn.truth {
  background: linear-gradient(120deg, #7ba7ff, #4d7cff);
}
.choose-btn.dare {
  background: linear-gradient(120deg, #ff9a6b, #ff5c88);
}
.truth-tip {
  font-size: 12px;
  color: #c4a8b3;
  text-align: center;
  line-height: 1.9;
}
.tip-count {
  font-size: 10.5px;
  color: #d3bcc5;
}
.truth-count {
  font-size: 12px;
  color: #c4a8b3;
}
.truth-card {
  position: relative;
  width: 100%;
  max-width: 340px;
  background: #fff;
  border-radius: 26px;
  padding: 22px 20px 18px;
  text-align: center;
  box-shadow: 0 20px 46px rgba(180, 80, 110, 0.18);
}
.tc-kind {
  display: inline-block;
  padding: 3px 14px;
  border-radius: 999px;
  font-size: 11.5px;
  font-weight: 800;
  color: #fff;
}
.tc-kind.truth {
  background: linear-gradient(120deg, #7ba7ff, #4d7cff);
}
.tc-kind.dare {
  background: linear-gradient(120deg, #ff9a6b, #ff5c88);
}
.tc-who {
  margin-top: 12px;
  font-size: 12px;
  color: #b08a99;
}
.tc-text {
  margin: 10px 0 18px;
  font-size: var(--card-fs, 17px);
  line-height: 1.8;
  font-weight: 600;
  color: #4a3038;
  max-height: 40vh;
  overflow-y: auto;
  word-break: break-word;
}
.tc-img {
  width: 100%;
  border-radius: 14px;
  margin-bottom: 12px;
}
.tc-fav {
  position: absolute;
  right: 12px;
  top: 12px;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  font-size: 18px;
  color: #e0b9c7;
  background: rgba(255, 120, 150, 0.07);
}
.tc-fav.on {
  color: #ff3d68;
}
.tc-spin-again {
  margin-top: 10px;
  font-size: 11.5px;
  color: #b08a99;
  padding: 4px 10px;
}
.tc-actions {
  display: flex;
  gap: 10px;
}
.tc-actions .btn {
  flex: 1;
  height: 44px;
  font-size: 13.5px;
  padding: 0 8px;
}
.flip-enter-active {
  transition: transform 0.45s cubic-bezier(0.34, 1.4, 0.64, 1), opacity 0.3s;
}
.flip-enter-from {
  transform: rotateY(70deg) scale(0.9);
  opacity: 0;
}
</style>
