<script setup lang="ts">
// 游戏分发：按 game 渲染对应玩法视图
import { computed, defineAsyncComponent, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useLibraryStore } from '../stores/packs'
import type { GameKey } from '../types'

const route = useRoute()
const router = useRouter()
const lib = useLibraryStore()
const game = computed(() => route.params.game as GameKey)

const views: Record<GameKey, any> = {
  flying: defineAsyncComponent(() => import('./Board.vue')),
  truth: defineAsyncComponent(() => import('./Truth.vue')),
  dice: defineAsyncComponent(() => import('./Dice.vue')),
  wheel: defineAsyncComponent(() => import('./Wheel.vue')),
  mine: defineAsyncComponent(() => import('./Mine.vue')),
  pose: defineAsyncComponent(() => import('./Pose.vue')),
  traffic: defineAsyncComponent(() => import('./Traffic.vue')),
}
const modeId = computed(() => route.params.modeId as string)

// 门禁兜底：直接输 URL 进锁定玩法时，退回列表，避免绕过识别码
onMounted(() => {
  const m = lib.modeById(modeId.value)
  if (m && !lib.isUnlocked(m)) router.replace('/g/' + game.value)
})
</script>

<template>
  <component :is="views[game]" v-if="views[game]" />
</template>
