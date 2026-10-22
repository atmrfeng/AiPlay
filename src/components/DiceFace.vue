<script setup lang="ts">
// 骰子面：纯 CSS 点数，1-6
const props = defineProps<{ value: number; rolling?: boolean }>()
const layouts: Record<number, number[]> = {
  1: [5],
  2: [1, 9],
  3: [1, 5, 9],
  4: [1, 3, 7, 9],
  5: [1, 3, 5, 7, 9],
  6: [1, 3, 4, 6, 7, 9],
}
</script>

<template>
  <div class="dice-face" :class="{ rolling: props.rolling }">
    <span
      v-for="pos in layouts[props.value] || layouts[1]"
      :key="pos"
      class="pip"
      :style="{ gridArea: `${Math.ceil(pos / 3)} / ${((pos - 1) % 3) + 1}` }"
    />
  </div>
</template>

<style scoped>
.dice-face {
  width: 46px;
  height: 46px;
  border-radius: 13px;
  background: linear-gradient(150deg, #ffffff, #ffe9f0);
  box-shadow: 0 5px 14px rgba(255, 110, 145, 0.35), inset 0 -2px 4px rgba(255, 150, 175, 0.35), inset 0 2px 2px #fff;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(3, 1fr);
  padding: 7px;
  gap: 2px;
}
.dice-face.rolling {
  animation: diceShake 0.16s infinite;
}
.pip {
  border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, #ff7f9f, #e2264f);
  box-shadow: inset 0 -1px 1px rgba(0, 0, 0, 0.12);
}
@keyframes diceShake {
  0%, 100% { transform: rotate(0) scale(1); }
  30% { transform: rotate(-9deg) scale(1.05); }
  70% { transform: rotate(9deg) scale(1.05); }
}
</style>
