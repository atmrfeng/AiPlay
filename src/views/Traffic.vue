<script setup lang="ts">
// 红绿灯：节奏互动（红灯停 / 黄灯慢 / 绿灯继续）
import { computed, onBeforeUnmount, ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

type Light = 'red' | 'yellow' | 'green'
const light = ref<Light>('red')
const running = ref(false)
const rounds = ref(0)
let timer: number | null = null

const LABEL: Record<Light, { text: string; tip: string }> = {
  red: { text: '红灯 · 立刻停下', tip: '保持当前姿势不动，谁动了谁接受惩罚' },
  yellow: { text: '黄灯 · 放慢节奏', tip: '放慢动作，准备切换' },
  green: { text: '绿灯 · 继续', tip: '继续你们的互动任务' },
}

function schedule() {
  if (timer) window.clearTimeout(timer)
  const stay = light.value === 'green' ? 2600 + Math.random() * 2400 : light.value === 'yellow' ? 1400 : 2200 + Math.random() * 1800
  timer = window.setTimeout(() => {
    if (!running.value) return
    const r = Math.random()
    light.value = r < 0.42 ? 'green' : r < 0.7 ? 'yellow' : 'red'
    rounds.value++
    schedule()
  }, stay)
}

function toggle() {
  running.value = !running.value
  if (running.value) {
    rounds.value = 0
    light.value = 'green'
    schedule()
  } else if (timer) {
    window.clearTimeout(timer)
    timer = null
  }
}

const current = computed(() => LABEL[light.value])

onBeforeUnmount(() => {
  if (timer) window.clearTimeout(timer)
})
</script>

<template>
  <div class="page traffic-page">
    <div class="play-bar">
      <button class="bar-btn" @click="router.push('/games')">‹</button>
      <div class="play-title">红绿灯</div>
      <button class="bar-btn" @click="toggle">{{ running ? '❚❚' : '▶' }}</button>
    </div>

    <div class="traffic-stage">
      <div class="light-box" :class="light">
        <div class="bulb red" :class="{ on: light === 'red' }"></div>
        <div class="bulb yellow" :class="{ on: light === 'yellow' }"></div>
        <div class="bulb green" :class="{ on: light === 'green' }"></div>
      </div>

      <div class="traffic-card" :class="light">
        <div class="tc-title">{{ running ? current.text : '点击右上角开始' }}</div>
        <div class="tc-tip">{{ running ? current.tip : '规则：绿灯继续互动，黄灯放慢，红灯立刻停住' }}</div>
      </div>

      <div class="traffic-rounds">已完成 {{ rounds }} 次切换</div>

      <button class="btn btn-primary traffic-btn" @click="toggle">{{ running ? '暂停' : '开始游戏' }}</button>
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
  font-size: 15px;
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
.traffic-stage {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18px;
  padding: 18px 20px;
}
.light-box {
  width: 108px;
  padding: 14px;
  border-radius: 26px;
  background: linear-gradient(160deg, #3d3340, #221c24);
  display: flex;
  flex-direction: column;
  gap: 12px;
  box-shadow: 0 16px 36px rgba(90, 50, 70, 0.3);
}
.bulb {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: #4a4048;
  transition: background 0.25s, box-shadow 0.25s;
}
.bulb.red.on {
  background: radial-gradient(circle at 35% 30%, #ff8a8a, #ff2d2d);
  box-shadow: 0 0 26px rgba(255, 60, 60, 0.75);
}
.bulb.yellow.on {
  background: radial-gradient(circle at 35% 30%, #ffe08a, #ffb703);
  box-shadow: 0 0 26px rgba(255, 190, 40, 0.7);
}
.bulb.green.on {
  background: radial-gradient(circle at 35% 30%, #9bf0a8, #25c451);
  box-shadow: 0 0 26px rgba(60, 210, 110, 0.7);
}
.traffic-card {
  width: 100%;
  max-width: 340px;
  border-radius: 22px;
  padding: 18px;
  text-align: center;
  background: #fff;
  box-shadow: 0 12px 30px rgba(255, 140, 170, 0.16);
  transition: background 0.3s;
}
.traffic-card.red { background: linear-gradient(160deg, #fff1f1, #ffe0e0); }
.traffic-card.yellow { background: linear-gradient(160deg, #fffaef, #fff0cc); }
.traffic-card.green { background: linear-gradient(160deg, #f2fff5, #dcfce5); }
.tc-title {
  font-size: 17px;
  font-weight: 900;
  color: #4a3038;
}
.tc-tip {
  margin-top: 6px;
  font-size: 12px;
  line-height: 1.6;
  color: #9b7f8a;
}
.traffic-rounds {
  font-size: 11.5px;
  color: #c4a8b3;
}
.traffic-btn {
  width: 100%;
  max-width: 340px;
  height: 48px;
}
</style>
