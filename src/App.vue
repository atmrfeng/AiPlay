<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import TabIcon from './components/TabIcon.vue'
import ConfirmHost from './components/ConfirmHost.vue'
import { useLibraryStore } from './stores/packs'
import { cardFont } from './utils/prefs'
import { library } from './data/library'
import type { GameKey } from './types'

const route = useRoute()
const router = useRouter()
const store = useLibraryStore()

const isLandscape = ref(false)
const isDesktop = ref(false)


const tabs = [
  { path: '/memories', label: '我们', icon: 'heart' as const },
  { path: '/games', label: '玩法', icon: 'grid' as const },
  { path: '/me', label: '小窝', icon: 'me' as const },
]

const currentGame = computed<GameKey | null>(() => {
  const g = route.params.game as GameKey
  return g && library[g] ? g : null
})

const isPlay = computed(() => route.name === 'play' || route.name === 'custom' || route.name === 'search')

const header = computed(() => {
  if (route.name === 'memories') return { icon: 'heart' as const, title: '我们', sub: '纪念日 · 日历 · 记录 · 心愿' }
  if (route.name === 'studio') return { icon: 'cards' as const, title: '自制玩法', sub: '新建、导入、排序与管理' }
  if (route.name === 'me') return { icon: 'me' as const, title: '小窝', sub: '识别码、备份与偏好设置' }
  const g = currentGame.value
  if (g) {
    const map = { flying: 'plane', mine: 'heart', truth: 'chat', wheel: 'cards', dice: 'cards', pose: 'cards', traffic: 'cards' } as const
    return { icon: map[g], title: library[g].name, sub: '和心爱的 TA 共享此刻～' }
  }
  return { icon: 'grid' as const, title: '情侣小游戏', sub: '和心爱的 TA 共享此刻～' }
})

const activeTab = computed(() => {
  if (route.name === 'memories') return '/memories'
  if (route.name === 'me') return '/me'
  return '/games'
})

function detectOrientation() {
  isDesktop.value = window.innerWidth >= 900
  isLandscape.value = window.innerWidth > window.innerHeight && window.innerHeight < 520 && window.innerWidth < 900
}

onMounted(() => {
  store.refreshVip()
  detectOrientation()
  window.addEventListener('resize', detectOrientation)
  window.addEventListener('orientationchange', detectOrientation)
})
onBeforeUnmount(() => {
  window.removeEventListener('resize', detectOrientation)
  window.removeEventListener('orientationchange', detectOrientation)
})

function openVip() {
  router.push('/me')
}</script>

<template>
  <div class="app-shell" :class="{ landscape: isLandscape }" :style="{ '--card-fs': cardFont(store.settings.cardSize) }">
    <header v-if="!isPlay" class="app-header">
      <div class="header-deco"></div>
      <span class="header-icon"><TabIcon :name="header.icon" /></span>
      <div class="header-titles">
        <div class="header-title">{{ header.title }}</div>
        <div class="header-sub">{{ header.sub }}</div>
      </div>
      <button class="vip-pill" :class="{ on: store.vip }" @click="openVip">
        {{ store.vip ? '已解锁' : '会员' }}
      </button>
    </header>

    <main class="app-main">
      <router-view v-slot="{ Component }">
        <transition name="page-fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>

    <nav v-if="!isPlay || isDesktop" class="app-tabbar">
      <button
        v-for="t in tabs"
        :key="t.path"
        class="tab-item"
        :class="{ active: activeTab === t.path }"
        @click="router.push(t.path)"
      >
        <TabIcon class="tab-ico" :name="t.icon" />
        <span>{{ t.label }}</span>
      </button>
    </nav>

    <ConfirmHost />
  </div>
</template>

<style scoped>
.vip-error {
  margin-top: 8px;
  font-size: 12px;
  color: #e8384f;
}
</style>
