<script setup lang="ts">
// 情侣骰子：动作骰 + 部位骰，双骰滚动
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import DiceFace from '../components/DiceFace.vue'
import { useLibraryStore } from '../stores/packs'
import { buzz, tick } from '../utils/feedback'

const route = useRoute()
const router = useRouter()
const lib = useLibraryStore()

const modeId = computed(() => route.params.modeId as string)
const mode = computed(() => lib.modeById(modeId.value))
const actions = computed(() => (mode.value?.cards ?? []).filter((c) => c.kind === 'action').map((c) => c.text || ''))
const parts = computed(() => (mode.value?.cards ?? []).filter((c) => c.kind === 'part').map((c) => c.text || ''))

const rolling = ref(false)
const faceA = ref(1)
const faceB = ref(1)
const result = ref<{ action: string; part: string } | null>(null)
const history = ref<string[]>([])

function roll() {
  if (rolling.value) return
  if (!actions.value.length || !parts.value.length) return
  rolling.value = true
  result.value = null
  let ticks = 0
  const timer = window.setInterval(() => {
    ticks++
    faceA.value = Math.floor(Math.random() * 6) + 1
    faceB.value = Math.floor(Math.random() * 6) + 1
    if (ticks < 12) return
    window.clearInterval(timer)
    const a = actions.value[Math.floor(Math.random() * actions.value.length)]
    const p = parts.value[Math.floor(Math.random() * parts.value.length)]
    result.value = { action: a, part: p }
    tick(lib.settings.sound, 660, 0.08)
    buzz(lib.settings.vibrate, 20)
    history.value.unshift(`${a} · ${p}`)
    history.value = history.value.slice(0, 6)
    lib.addHistory({ game: 'dice', modeTitle: mode.value?.title || '', text: a + ' · ' + p })
    rolling.value = false
  }, 80)
}

onMounted(() => {
  // 进入即自动滚一次
  window.setTimeout(roll, 260)
})
</script>

<template>
  <div class="page dice-page">
    <div class="play-bar">
      <button class="bar-btn" @click="router.push('/games')">‹</button>
      <div class="play-title">{{ mode?.title }}</div>
      <button class="bar-btn" @click="roll">↻</button>
    </div>

    <div class="dice-stage">
      <div class="dice-row">
        <div class="die-box">
          <DiceFace :value="faceA" :rolling="rolling" />
          <span class="die-label">动作</span>
        </div>
        <div class="die-plus">+</div>
        <div class="die-box">
          <DiceFace :value="faceB" :rolling="rolling" />
          <span class="die-label">部位</span>
        </div>
      </div>

      <div class="result-box" :class="{ show: !!result }">
        <template v-if="result">
          <span class="r-action">{{ result.action }}</span>
          <span class="r-dot">·</span>
          <span class="r-part">{{ result.part }}</span>
        </template>
        <span v-else class="r-placeholder">摇一摇，看看你们的默契～</span>
      </div>

      <button class="btn btn-primary roll-btn" :disabled="rolling" @click="roll">
        {{ rolling ? '摇骰中…' : '再摇一次' }}
      </button>

      <div v-if="history.length" class="history">
        <div class="h-title">最近结果</div>
        <div v-for="(h, i) in history" :key="i" class="h-item">{{ h }}</div>
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
.dice-page {
  display: flex;
  flex-direction: column;
}
.dice-stage {
  flex: 1;
  justify-content: center;
  padding: 18px 20px 60px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18px;
}
.dice-row {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-top: 6px;
}
.die-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}
.die-box :deep(.dice-face) {
  width: 76px;
  height: 76px;
  border-radius: 20px;
  padding: 12px;
  gap: 3px;
}
.die-label {
  font-size: 11.5px;
  font-weight: 700;
  color: #b08a99;
  letter-spacing: 0.1em;
}
.die-plus {
  font-size: 20px;
  color: #e3bcc9;
  padding-bottom: 20px;
}
.result-box {
  width: 100%;
  max-width: 340px;
  min-height: 96px;
  border-radius: 22px;
  background: #fff;
  box-shadow: 0 12px 30px rgba(255, 130, 160, 0.16);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 16px;
  font-weight: 900;
  opacity: 0.75;
  transition: opacity 0.3s, transform 0.3s;
}
.result-box.show {
  opacity: 1;
  transform: scale(1.01);
}
.r-action {
  font-size: 22px;
  color: #e2264f;
}
.r-dot {
  color: #e9c2ce;
}
.r-part {
  font-size: 22px;
  color: #4d7cff;
}
.r-placeholder {
  font-size: 13px;
  font-weight: 600;
  color: #c4a8b3;
}
.roll-btn {
  width: 100%;
  max-width: 340px;
  height: 48px;
}
.history {
  width: 100%;
  max-width: 340px;
  margin-top: 4px;
}
.h-title {
  font-size: 11.5px;
  color: #c4a8b3;
  margin-bottom: 6px;
  letter-spacing: 0.06em;
}
.h-item {
  font-size: 12.5px;
  color: #9b7f8a;
  padding: 6px 12px;
  background: rgba(255, 255, 255, 0.7);
  border-radius: 10px;
  margin-bottom: 5px;
}
</style>
