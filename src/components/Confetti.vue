<script setup lang="ts">
// 彩带庆祝组件：挂载后自动播放，播放完毕自动移除
import { onMounted, ref } from 'vue'

const canvasRef = ref<HTMLCanvasElement | null>(null)

onMounted(() => {
  const canvas = canvasRef.value
  if (!canvas) return
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const colors = ['#ff5c8a', '#f5d67b', '#5b8def', '#84fab0', '#f368e0', '#ffffff']
  const parts = Array.from({ length: 160 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height * -1,
    w: 6 + Math.random() * 6,
    h: 8 + Math.random() * 8,
    color: colors[Math.floor(Math.random() * colors.length)],
    vy: 2 + Math.random() * 4,
    vx: -2 + Math.random() * 4,
    rot: Math.random() * 360,
    vr: -8 + Math.random() * 16,
  }))
  const start = Date.now()
  const life = 4200

  function frame() {
    const t = Date.now() - start
    ctx!.clearRect(0, 0, canvas!.width, canvas!.height)
    let alive = false
    parts.forEach((p) => {
      p.x += p.vx
      p.y += p.vy
      p.rot += p.vr
      if (p.y < canvas!.height + 30) alive = true
      ctx!.save()
      ctx!.translate(p.x, p.y)
      ctx!.rotate((p.rot * Math.PI) / 180)
      ctx!.globalAlpha = t > life - 800 ? Math.max(0, (life - t) / 800) : 1
      ctx!.fillStyle = p.color
      ctx!.fillRect(-p.w / 2, -p.h / 2, p.w, p.h)
      ctx!.restore()
    })
    if (t < life && alive) requestAnimationFrame(frame)
    else canvas!.remove()
  }
  requestAnimationFrame(frame)
})
</script>

<template>
  <canvas ref="canvasRef" class="confetti"></canvas>
</template>

<style scoped>
.confetti {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 2000;
}
</style>
