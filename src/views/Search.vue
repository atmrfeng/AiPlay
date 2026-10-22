<script setup lang="ts">
// 全局搜索：一次检索所有游戏 / 自制玩法 / 卡片内容
import { computed, nextTick, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useLibraryStore } from '../stores/packs'
import { fillRoles } from '../utils/text'
import { library } from '../data/library'
import type { GameKey, GameMode } from '../types'

const router = useRouter()
const lib = useLibraryStore()

const keyword = ref('')
const inputRef = ref<HTMLInputElement | null>(null)

const GAME_STYLE: Record<GameKey, { from: string; to: string }> = {
  flying: { from: '#FF6B9D', to: '#FFB3C7' },
  mine: { from: '#7C6CF6', to: '#B3A8FF' },
  truth: { from: '#4A9BFF', to: '#9AC8FF' },
  wheel: { from: '#F0A93B', to: '#FFD482' },
  dice: { from: '#3FBFAD', to: '#8FE3D6' },
  pose: { from: '#E2557B', to: '#FFA3B4' },
  traffic: { from: '#5EC26A', to: '#A8E6A3' },
}

interface Hit {
  game: GameKey
  mode: GameMode
  title: string
  snippet: string
  custom: boolean
  locked: boolean
}

const allModes = computed(() => {
  const out: { game: GameKey; mode: GameMode }[] = []
  for (const key of Object.keys(library) as GameKey[]) {
    for (const mode of lib.modesOf(key)) {
      if (mode.custom) continue
      out.push({ game: key, mode })
    }
  }
  return out
})

function makeSnippet(raw: string, k: string): string {
  const text = fillRoles(raw, '男方', '女方')
  if (!k) return text.slice(0, 46)
  const i = text.indexOf(k)
  if (i < 0) return text.slice(0, 46)
  const start = Math.max(0, i - 14)
  return (start > 0 ? '…' : '') + text.slice(start, start + 48)
}

const hits = computed<Hit[]>(() => {
  const k = keyword.value.trim()
  if (!k) return []
  const res: Hit[] = []
  for (const { game, mode } of allModes.value) {
    const titleHit = mode.title.includes(k)
    const card = mode.cards.find((c) => (c.text || '').includes(k))
    if (!titleHit && !card) continue
    res.push({
      game,
      mode,
      title: mode.title,
      snippet: titleHit ? makeSnippet(mode.cards[0]?.text || '', '') : makeSnippet(card!.text || '', k),
      custom: mode.series === 'user',
      locked: !lib.isUnlocked(mode),
    })
  }
  // 标题命中优先，其次按游戏聚合顺序
  res.sort((a, b) => Number(b.title.includes(k)) - Number(a.title.includes(k)))
  return res.slice(0, 60)
})

const grouped = computed(() => {
  const map = new Map<GameKey, Hit[]>()
  for (const h of hits.value) {
    if (!map.has(h.game)) map.set(h.game, [])
    map.get(h.game)!.push(h)
  }
  return [...map.entries()]
})

const hot = computed(() => library.flying.modes.slice(0, 3).map((m) => m.title))

function open(h: Hit) {
  if (h.custom) {
    router.push({ path: '/g/' + h.game + '/custom', query: { id: h.mode.id } })
    return
  }
  if (h.locked) {
    router.push('/g/' + h.game)
    return
  }
  router.push('/g/' + h.game + '/play/' + h.mode.id)
}

function fill(text: string) {
  keyword.value = text
  inputRef.value?.focus()
}

onMounted(() => nextTick(() => inputRef.value?.focus()))
</script>

<template>
  <div class="page search-page">
    <div class="play-bar">
      <button class="bar-btn" @click="router.back()">‹</button>
      <div class="play-title">搜索</div>
      <span class="bar-space"></span>
    </div>

    <div class="search-box">
      <span class="sb-ico">🔍</span>
      <input ref="inputRef" v-model="keyword" class="sb-input" placeholder="搜玩法名称，或卡片里的内容…" />
      <button v-if="keyword" class="sb-clear" @click="keyword = ''">×</button>
    </div>

    <div v-if="!keyword.trim()" class="hint-area">
      <div class="hint-title">可以搜什么</div>
      <div class="hint-list">
        <span class="hint-chip" v-for="t in hot" :key="t" @click="fill(t)">{{ t }}</span>
        <span class="hint-chip" @click="fill('拥抱')">拥抱</span>
        <span class="hint-chip" @click="fill('异地')">异地</span>
      </div>
      <div class="hint-note">支持玩法名、卡片正文；结果会标注所属玩法与是否自制。</div>
    </div>

    <template v-else>
      <div class="sum">共 {{ hits.length }} 条结果<span v-if="hits.length >= 60">（仅显示前 60 条）</span></div>

      <div v-if="!hits.length" class="empty-box">
        <div class="eb-emoji">🔍</div>
        <div class="eb-title">没有找到「{{ keyword }}」</div>
        <div class="eb-sub">换个关键词试试，或去「自制玩法」新建一套</div>
        <button class="btn btn-primary" @click="router.push('/studio')">去自制玩法</button>
      </div>

      <div v-for="[g, list] in grouped" :key="g" class="group">
        <div class="g-head">
          <span class="g-dot" :style="{ background: `linear-gradient(140deg, ${GAME_STYLE[g].from}, ${GAME_STYLE[g].to})` }"></span>
          <span class="g-name">{{ library[g].name }}</span>
          <span class="g-count">{{ list.length }}</span>
        </div>
        <button v-for="h in list" :key="h.mode.id" class="hit" @click="open(h)">
          <div class="hit-main">
            <div class="hit-title">
              {{ h.title }}
              <em v-if="h.custom" class="tag user">自制</em>
              <em v-else-if="h.locked" class="tag lock">需解锁</em>
              <em v-else-if="h.mode.series === 'legacy'" class="tag legacy">经典</em>
            </div>
            <div class="hit-snippet">{{ h.snippet || '（无文字内容）' }}</div>
          </div>
          <span class="hit-go">›</span>
        </button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.search-page {
  padding: 4px 14px 24px;
}
.play-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 0 8px;
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
.bar-space {
  width: 34px;
}
.search-box {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 auto 10px;
  max-width: 720px;
  width: 100%;
  box-sizing: border-box;
  padding: 0 12px;
  height: 46px;
  border-radius: 16px;
  background: #fff;
  border: 1px solid rgba(255, 120, 150, 0.2);
  box-shadow: 0 6px 16px rgba(255, 150, 180, 0.1);
}
.sb-ico {
  font-size: 15px;
}
.sb-input {
  flex: 1;
  font-size: 14px;
  background: transparent;
  border: none;
  padding: 0;
  outline: none;
  -webkit-tap-highlight-color: transparent;
}
.search-box:focus-within {
  border-color: rgba(255, 110, 145, 0.45);
  box-shadow: 0 0 0 3px rgba(255, 120, 150, 0.12);
}
.sb-clear {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: rgba(255, 120, 150, 0.12);
  color: #b08a99;
  font-size: 14px;
  line-height: 1;
}
.hint-area {
  padding: 6px 18px;
}
.hint-title {
  font-size: 11.5px;
  font-weight: 800;
  color: #b08a99;
  margin-bottom: 8px;
}
.hint-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.hint-chip {
  padding: 6px 13px;
  border-radius: 999px;
  font-size: 12px;
  color: #a8838f;
  background: #fff;
  border: 1px solid rgba(255, 140, 170, 0.18);
}
.hint-note {
  margin-top: 12px;
  font-size: 11px;
  line-height: 1.7;
  color: #c4a8b3;
}
.sum {
  padding: 0 18px 6px;
  font-size: 11px;
  color: #b08a99;
}
.group {
  margin: 6px 16px 10px;
  background: #fff;
  border-radius: 18px;
  padding: 4px 14px;
  box-shadow: 0 8px 20px rgba(255, 150, 180, 0.09);
}
.g-head {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 10px 0 6px;
}
.g-dot {
  width: 8px;
  height: 8px;
  border-radius: 3px;
}
.g-name {
  font-size: 12px;
  font-weight: 800;
  color: #6b4552;
}
.g-count {
  font-size: 10px;
  color: #c9a3b1;
  background: rgba(255, 120, 150, 0.1);
  padding: 0 6px;
  border-radius: 999px;
}
.hit {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 0;
  border-top: 1px solid rgba(255, 140, 170, 0.1);
  text-align: left;
}
.hit-main {
  flex: 1;
  min-width: 0;
}
.hit-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13.5px;
  font-weight: 700;
  color: #4a3038;
}
.tag {
  font-style: normal;
  font-size: 9px;
  font-weight: 800;
  padding: 1px 5px;
  border-radius: 5px;
}
.tag.user {
  color: #fff;
  background: linear-gradient(120deg, #8fa4ff, #6b7df0);
}
.tag.lock {
  color: #b08a99;
  background: rgba(160, 140, 150, 0.14);
}
.tag.legacy {
  color: #e2587f;
  background: rgba(255, 90, 130, 0.1);
}
.hit-snippet {
  margin-top: 3px;
  font-size: 11.5px;
  color: #a8838f;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.hit-go {
  flex: none;
  color: #e6bdcc;
  font-size: 18px;
}
.empty-box {
  margin: 16px;
  padding: 26px 20px;
  border-radius: 22px;
  background: #fff;
  text-align: center;
  box-shadow: 0 8px 20px rgba(255, 150, 180, 0.1);
}
.eb-emoji {
  font-size: 32px;
}
.eb-title {
  margin-top: 6px;
  font-size: 14.5px;
  font-weight: 800;
  color: #4a2f38;
}
.eb-sub {
  margin: 6px 0 14px;
  font-size: 11.5px;
  color: #b08a99;
}
.empty-box .btn {
  height: 40px;
  font-size: 13px;
}
</style>
