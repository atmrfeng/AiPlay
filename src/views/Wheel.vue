<script setup lang="ts">
// 情侣大转盘：扇区内容化（显示真实任务文本，不再是数字）
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useLibraryStore } from '../stores/packs'
import { buzz, tick } from '../utils/feedback'

const route = useRoute()
const router = useRouter()
const lib = useLibraryStore()

const modeId = computed(() => route.params.modeId as string)
const mode = computed(() => lib.modeById(modeId.value))

const SLICES = 10
const options = ref<string[]>([])
const angle = ref(0)
const spinning = ref(false)
const result = ref<string | null>(null)
/** 只读查看：单个扇区 / 全部内容 */
const peekIdx = ref<number | null>(null)
const showAll = ref(false)

const palette = ['#ffb3c9', '#ffe08a', '#a9c8ff', '#a8e6b8', '#d7b8ff', '#ffc7a8']

function shuffle<T>(a: T[]): T[] {
  const arr = a.slice()
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

function rebuild() {
  const all = shuffle((mode.value?.cards ?? []).map((c) => c.text || '').filter(Boolean))
  options.value = all.slice(0, Math.min(SLICES, all.length || SLICES))
  if (!options.value.length) options.value = ['暂无内容']
}

const seg = computed(() => 360 / Math.max(options.value.length, 1))

const wheelBg = computed(() => {
  const parts = options.value.map((_, i) => {
    const from = i * seg.value
    const to = (i + 1) * seg.value
    return `${palette[i % palette.length]} ${from}deg ${to}deg`
  })
  return `conic-gradient(from -${seg.value / 2}deg, ${parts.join(',')})`
})

function spin() {
  if (spinning.value) return
  spinning.value = true
  result.value = null
  const idx = Math.floor(Math.random() * options.value.length)
  const turns = 5 + Math.floor(Math.random() * 3)
  // conic-gradient 起点在 -seg/2，扇区 i 的中心位于 i*seg
  const target = 360 - idx * seg.value
  angle.value += turns * 360 + ((target - (angle.value % 360)) + 360) % 360
  window.setTimeout(() => {
    spinning.value = false
    result.value = options.value[idx]
    tick(lib.settings.sound, 740, 0.1)
    buzz(lib.settings.vibrate, 24)
    lib.addHistory({ game: 'wheel', modeTitle: mode.value?.title || '', text: result.value })
  }, 4300)
}

onMounted(rebuild)
</script>

<template>
  <div class="page wheel-page">
    <div class="play-bar">
      <button class="bar-btn" @click="router.push('/g/wheel')">‹</button>
      <div class="play-title">{{ mode?.title }}</div>
      <button class="bar-btn" @click="rebuild">↻</button>
    </div>

    <div class="wheel-stage">
      <div class="wheel-outer">
        <div class="wheel-pointer"></div>
        <div
          class="wheel"
          :style="{ background: wheelBg, transform: `rotate(${angle}deg)` }"
          :class="{ spinning }"
        >
          <div v-for="(opt, i) in options" :key="i" class="slice-label" :style="{ transform: `rotate(${i * seg}deg)` }">
            <span
              class="slice-num"
              :style="{ transform: `translateX(-50%) rotate(${-i * seg}deg)` }"
              @click.stop="peekIdx = i"
              :title="opt"
            >{{ i + 1 }}</span>
          </div>
          <div class="wheel-hub">GO</div>
        </div>
      </div>

      <button class="btn btn-primary spin-btn" :disabled="spinning" @click="spin">
        {{ spinning ? '转动中…' : '开始转动' }}
      </button>

      <div class="wheel-hint">共 {{ options.length }} 个选项 · 每次刷新会重新洗牌</div>
      <button class="all-btn" @click="showAll = true">查看全部内容</button>
    </div>

    <!-- 单项只看：点转盘上的数字 -->
    <div v-if="peekIdx !== null" class="sheet-mask" @click.self="peekIdx = null">
      <div class="result-card pop-in">
        <div class="rc-tag">第 {{ peekIdx + 1 }} 项 · 仅查看</div>
        <div class="rc-text">{{ options[peekIdx] }}</div>
        <div class="rc-actions">
          <button class="btn btn-primary" style="flex: 1" @click="peekIdx = null">关闭</button>
        </div>
      </div>
    </div>

    <!-- 全部内容：只读列表 -->
    <div v-if="showAll" class="sheet-mask" @click.self="showAll = false">
      <div class="all-card pop-in">
        <div class="rc-tag">全部 {{ options.length }} 项 · 仅查看</div>
        <div class="all-list">
          <div v-for="(opt, i) in options" :key="i" class="all-row">
            <span class="all-dot" :style="{ background: palette[i % palette.length] }">{{ i + 1 }}</span>
            <span class="all-text">{{ opt }}</span>
          </div>
        </div>
        <button class="btn btn-primary btn-block" @click="showAll = false">关闭</button>
      </div>
    </div>

    <div v-if="result" class="sheet-mask" @click.self="result = null">
      <div class="result-card pop-in">
        <div class="rc-tag">转盘结果</div>
        <div class="rc-text">{{ result }}</div>
        <div class="rc-actions">
          <button class="btn btn-ghost" @click="result = null">关闭</button>
          <button class="btn btn-primary" @click="result = null; spin()">再转一次</button>
        </div>
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
.wheel-page {
  display: flex;
  flex-direction: column;
}
.wheel-stage {
  flex: 1;
  justify-content: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  padding: 14px 16px;
}
.wheel-outer {
  position: relative;
  width: min(74vw, 300px);
  aspect-ratio: 1;
  border-radius: 50%;
  padding: 10px;
  background: linear-gradient(160deg, #fff, #ffe9f1);
  box-shadow: 0 16px 40px rgba(255, 120, 150, 0.3), inset 0 0 0 2px #fff;
}
.wheel-pointer {
  position: absolute;
  top: -4px;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 11px solid transparent;
  border-right: 11px solid transparent;
  border-top: 20px solid #ff3d68;
  filter: drop-shadow(0 3px 4px rgba(180, 40, 70, 0.35));
  z-index: 3;
}
.wheel {
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  transition: transform 4.2s cubic-bezier(0.12, 0.72, 0.06, 1);
  box-shadow: inset 0 0 0 6px rgba(255, 255, 255, 0.85);
  overflow: hidden;
}
.wheel.spinning {
  transition-timing-function: cubic-bezier(0.15, 0.72, 0.05, 1);
}
.slice-label {
  position: absolute;
  inset: 0;
  transform-origin: 50% 50%;
}
.slice-label span {
  position: absolute;
  top: 8%;
  left: 50%;
  width: 40px;
  text-align: center;
  line-height: 1;
}
.slice-label .slice-num {
  font-size: 15px;
  font-weight: 900;
  color: #7d4b5c;
  opacity: 0.85;
  cursor: pointer;
  padding: 2px 4px;
}
.wheel-hub {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 54px;
  height: 54px;
  margin: -27px 0 0 -27px;
  border-radius: 50%;
  background: linear-gradient(150deg, #ff7fa3, #ff2e63);
  color: #fff;
  font-size: 15px;
  font-weight: 900;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 6px 16px rgba(255, 60, 105, 0.4), inset 0 0 0 3px #fff;
  z-index: 2;
}
.spin-btn {
  width: 100%;
  max-width: 300px;
  height: 48px;
}
.wheel-hint {
  font-size: 11.5px;
  color: #c4a8b3;
}
.all-btn {
  margin-top: 6px;
  padding: 6px 16px;
  border-radius: 999px;
  font-size: 11.5px;
  font-weight: 800;
  color: #e2587f;
  background: rgba(255, 120, 150, 0.1);
}
.all-btn:active {
  transform: scale(0.96);
}
.all-card {
  width: 100%;
  max-width: 340px;
  max-height: 72vh;
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: #fff;
  border-radius: 24px;
  padding: 20px 18px 16px;
  box-shadow: 0 24px 60px rgba(160, 60, 90, 0.24);
}
.all-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-right: 2px;
}
.all-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  text-align: left;
}
.all-dot {
  flex: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 900;
  color: #7a3f52;
}
.all-text {
  flex: 1;
  font-size: 12.5px;
  line-height: 1.6;
  color: #6b4552;
}
.result-card {
  width: 100%;
  max-width: 320px;
  background: #fff;
  border-radius: 24px;
  padding: 22px 20px 18px;
  text-align: center;
  box-shadow: 0 24px 60px rgba(160, 60, 90, 0.24);
}
.rc-tag {
  font-size: 11.5px;
  font-weight: 800;
  color: #e2587f;
  background: rgba(255, 90, 130, 0.1);
  display: inline-block;
  padding: 3px 12px;
  border-radius: 999px;
}
.rc-text {
  margin: 16px 0 18px;
  font-size: 18px;
  font-weight: 800;
  line-height: 1.6;
  color: #4a3038;
}
.rc-actions {
  display: flex;
  gap: 10px;
}
.rc-actions .btn {
  flex: 1;
  height: 44px;
  font-size: 14px;
}
</style>
