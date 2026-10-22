<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ModeCard from '../components/ModeCard.vue'
import { useLibraryStore } from '../stores/packs'
import type { GameKey, GameMode } from '../types'

const route = useRoute()
const router = useRouter()
const store = useLibraryStore()

const game = computed(() => route.params.game as GameKey)
const modes = computed(() => store.modesOf(game.value).filter((m) => !(m.custom && game.value === 'traffic')))

const showVip = ref(false)
const code = ref('')
const codeError = ref('')
const pending = ref<GameMode | null>(null)
const verifying = ref(false)

function unlocked(m: GameMode) {
  return store.isUnlocked(m)
}

function open(m: GameMode) {
  if (m.custom) {
    router.push(`/g/${game.value}/custom`)
    return
  }
  if (!unlocked(m)) {
    pending.value = m
    code.value = ''
    codeError.value = ''
    showVip.value = true
    return
  }
  router.push(`/g/${game.value}/play/${m.id}`)
}

async function submit() {
  if (verifying.value) return
  verifying.value = true
  const r = await store.activateVip(code.value)
  verifying.value = false
  if (r.ok) {
    showVip.value = false
    const m = pending.value
    pending.value = null
    if (m) router.push(`/g/${game.value}/play/${m.id}`)
  } else {
    codeError.value = r.message || '识别码不正确，请检查后重试'
  }
}

function subOf(m: GameMode) {
  if (m.custom) return '创建属于你们的玩法'
  if (m.series === 'legacy') return '经典内容 · ' + m.cards.length + ' 张卡片'
  if (m.series === 'user') return '我的自制玩法 · ' + m.cards.length + ' 张卡片'
  if (!m.cards.length) return '互动小游戏'
  return m.cards.length + ' 张卡片'
}

const builtin = computed(() => modes.value.filter((m) => !m.custom && m.series !== 'user'))
const mine = computed(() => modes.value.filter((m) => m.series === 'user'))
const creator = computed(() => modes.value.find((m) => m.custom))

const total = computed(() => modes.value.filter((m) => !m.custom).length)
</script>

<template>
  <div class="page list-page">
    <div class="list-head">
      <button class="lh-back" @click="router.push('/games')">‹ 全部游戏</button>
      <span class="lh-count">{{ total }} 种玩法</span>
    </div>

    <div class="mode-list">
      <ModeCard
        v-for="m in builtin"
        :key="m.id"
        :title="m.title"
        :sub="subOf(m)"
        :locked="!unlocked(m)"
        :badge="m.series === 'legacy' ? '经典' : ''"
        @click="open(m)"
      />
    </div>

    <div v-if="!builtin.length" class="empty">没有匹配的玩法</div>

    <!-- 自制玩法固定在底部，附带管理入口 -->
    <div v-if="mine.length || creator" class="mine-head">
      <span class="mh-title">我的自制玩法</span>
      <span class="mh-count">{{ mine.length }}</span>
      <button class="mh-manage" @click="router.push('/studio')">管理 / 新建</button>
    </div>

    <div class="mode-list">
      <ModeCard
        v-for="m in mine"
        :key="m.id"
        :title="m.title"
        :sub="subOf(m)"
        :badge="'自制'"
        @click="open(m)"
      />
      <ModeCard
        v-if="creator"
        title="自定义玩法"
        sub="新建一套属于你们的"
        :badge="'＋'"
        @click="open(creator)"
      />
    </div>

    <p class="list-foot">内容仅用于情侣互动娱乐 · 请理性使用</p>

    <div v-if="showVip" class="sheet-mask" @click.self="showVip = false">
      <div class="sheet">
        <div class="sheet-title">该玩法需要解锁</div>
        <div class="sheet-text">输入识别码即可解锁全部玩法内容，一次解锁长期有效。</div>
        <input v-model="code" class="input" inputmode="numeric" maxlength="12" placeholder="请输入识别码" @keyup.enter="submit" />
        <div v-if="codeError" class="vip-error">{{ codeError }}</div>
        <div class="sheet-foot">
          <button class="btn btn-ghost" @click="showVip = false">取消</button>
          <button class="btn btn-primary" :disabled="verifying" @click="submit">{{ verifying ? '校验中…' : '解锁' }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.list-page {
  padding: 8px 16px 26px;
}
.list-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 2px 0 10px;
  max-width: 1040px;
  margin: 0 auto;
  width: 100%;
  box-sizing: border-box;
}
.lh-count {
  font-size: 11.5px;
  color: #b08a99;
  font-weight: 700;
}
.lh-back {
  font-size: 12px;
  color: #e2587f;
  font-weight: 700;
  padding: 2px 0;
}
.mine-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px 0 8px;
  max-width: 1040px;
  margin: 0 auto;
  width: 100%;
  box-sizing: border-box;
}
.mh-title {
  font-size: 12.5px;
  font-weight: 800;
  color: #6b4552;
}
.mh-count {
  font-size: 10.5px;
  color: #c9a3b1;
  background: rgba(255, 120, 150, 0.1);
  padding: 1px 7px;
  border-radius: 999px;
}
.mh-manage {
  margin-left: auto;
  font-size: 11.5px;
  font-weight: 700;
  color: #e2587f;
  padding: 4px 12px;
  border-radius: 999px;
  background: rgba(255, 90, 130, 0.08);
}
.list-foot {
  margin: 20px 0 8px;
  text-align: center;
  font-size: 10.5px;
  color: #cbb2bb;
}
.vip-error {
  margin-top: 8px;
  font-size: 12px;
  color: #e8384f;
}
</style>
