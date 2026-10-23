<script setup lang="ts">
// 姿势卡：翻牌抽取（图片卡组）
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useLibraryStore } from '../stores/packs'
import ImgRef from '../components/ImgRef.vue'

const route = useRoute()
const router = useRouter()
const lib = useLibraryStore()

const modeId = computed(() => route.params.modeId as string)
const mode = computed(() => lib.modeById(modeId.value))

const deck = ref<{ image?: string; text?: string }[]>([])
const index = ref(0)
const flipped = ref(false)
/** 本次开局里「已经翻开过」的卡片下标，用于统计已抽张数（重复翻同一张不重复计数） */
const seen = new Set<number>()
const drawn = ref(0)
const lastRecorded = ref(-1)

function shuffle<T>(a: T[]): T[] {
  const arr = a.slice()
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

function build() {
  deck.value = shuffle((mode.value?.cards ?? []).filter((c) => c.image || c.text))
  index.value = 0
  flipped.value = false
  seen.clear()
  drawn.value = 0
  lastRecorded.value = -1
}

function flip() {
  flipped.value = !flipped.value
  const c = current.value
  if (flipped.value && c) {
    if (!seen.has(index.value)) {
      seen.add(index.value)
      drawn.value = seen.size
    }
    if (lastRecorded.value !== index.value) {
      lastRecorded.value = index.value
      lib.addHistory({ game: 'pose', modeTitle: mode.value?.title || '', text: c.text || '姿势卡', image: c.image })
    }
  }
}

function next() {
  if (!deck.value.length) return
  index.value = (index.value + 1) % deck.value.length
  flipped.value = false
}

const current = computed(() => deck.value[index.value])

onMounted(build)
</script>

<template>
  <div class="page pose-page">
    <div class="play-bar">
      <button class="bar-btn" @click="router.push('/g/pose')">‹</button>
      <div class="play-title">{{ mode?.title }}</div>
      <button class="bar-btn" @click="build">↻</button>
    </div>

    <div class="pose-stage">
      <div class="card-scene" @click="flip">
        <div class="flip-card" :class="{ flipped }">
          <div class="face back">
            <div class="back-emoji">💞</div>
            <div class="back-text">点击翻牌</div>
            <div class="back-sub">{{ deck.length }} 张卡 · 第 {{ index + 1 }} 张</div>
          </div>
          <div class="face front">
            <ImgRef v-if="current?.image" class="pose-img" :src="current.image" />
            <div v-else class="front-text">{{ current?.text }}</div>
            <div class="front-tag">敢挑战吗</div>
          </div>
        </div>
      </div>

      <div class="pose-actions">
        <button class="btn btn-ghost" @click="build">重新洗牌</button>
        <button class="btn btn-primary" @click="next">下一张</button>
      </div>
      <div class="pose-hint">共 {{ deck.length }} 张 · 已抽 {{ drawn }} 张</div>
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
.pose-stage {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18px;
  padding: 16px;
}
.card-scene {
  width: min(70vw, 290px);
  aspect-ratio: 3 / 4;
  perspective: 1200px;
}
.flip-card {
  position: relative;
  width: 100%;
  height: 100%;
  transform-style: preserve-3d;
  transition: transform 0.6s cubic-bezier(0.3, 0.8, 0.3, 1);
}
.flip-card.flipped {
  transform: rotateY(180deg);
}
.face {
  position: absolute;
  inset: 0;
  border-radius: 24px;
  backface-visibility: hidden;
  overflow: hidden;
  box-shadow: 0 18px 44px rgba(255, 120, 150, 0.28);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
}
.back {
  background: linear-gradient(150deg, #ffd0de, #ff8fb1 55%, #ff5c88);
  color: #fff;
}
.back-emoji {
  font-size: 54px;
  filter: drop-shadow(0 8px 14px rgba(150, 40, 80, 0.3));
  animation: floatY 2.4s ease-in-out infinite;
}
.back-text {
  font-size: 16px;
  font-weight: 900;
  letter-spacing: 0.1em;
}
.back-sub {
  font-size: 11px;
  opacity: 0.8;
}
.front {
  background: #fff;
  transform: rotateY(180deg);
  padding: 0;
}
.front img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  background: #fffafc;
  padding: 8px;
}
.front-text {
  font-size: 20px;
  font-weight: 900;
  color: #e2264f;
}
.front-tag {
  position: absolute;
  left: 50%;
  bottom: 14px;
  transform: translateX(-50%);
  padding: 4px 14px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 800;
  color: #fff;
  background: rgba(40, 20, 28, 0.45);
  backdrop-filter: blur(4px);
  white-space: nowrap;
}
.pose-actions {
  display: flex;
  gap: 10px;
  width: 100%;
  max-width: 300px;
}
.pose-actions .btn {
  flex: 1;
  height: 46px;
}
.pose-hint {
  font-size: 11.5px;
  color: #c4a8b3;
}
</style>
