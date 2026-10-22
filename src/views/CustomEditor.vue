<script setup lang="ts">
// 自定义玩法编辑器：按游戏切换模板（真心话分题型 / 骰子分动作部位 / 转盘限扇区）
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useLibraryStore } from '../stores/packs'
import type { Card, GameKey } from '../types'
import { confirmDialog } from '../utils/confirm'

const route = useRoute()
const router = useRouter()
const lib = useLibraryStore()

const game = computed(() => route.params.game as GameKey)
const editId = computed(() => (route.query.id as string) || '')
const editing = computed(() => !!editId.value)
const gameName = computed(() => lib.games[game.value]?.name ?? '玩法')

const title = ref('')
const sections = ref<{ key: string; label: string; hint: string; kind: string; value: string; max?: number }[]>([])
const msg = ref('')

const TEMPLATES: Record<string, { key: string; label: string; hint: string; kind: string; max?: number }[]> = {
  truth: [
    { key: 'truth', label: '真心话', hint: '一行一条，例如：说出你第一次心动的瞬间', kind: 'truth' },
    { key: 'dare', label: '大冒险', hint: '一行一条，例如：给对方一个 10 秒拥抱', kind: 'dare' },
  ],
  dice: [
    { key: 'action', label: '动作骰（第一颗）', hint: '一行一个动作，例如：亲吻', kind: 'action' },
    { key: 'part', label: '部位骰（第二颗）', hint: '一行一个部位，例如：额头', kind: 'part' },
  ],
  wheel: [{ key: 'option', label: '扇区内容', hint: '一行一个，最多 10 条（对应转盘 10 个扇区）', kind: '', max: 10 }],
}

const schema = computed(() => TEMPLATES[game.value] ?? [{ key: 'task', label: '任务内容', hint: '一行一条，落到棋盘每一格', kind: '' }])

function init() {
  const tpl = schema.value
  if (editing.value) {
    const item = lib.userModes.find((m) => m.id === editId.value)
    if (item) {
      title.value = item.title
      sections.value = tpl.map((t) => {
        const cards = t.kind ? item.cards.filter((c) => c.kind === t.kind) : item.cards
        return { ...t, value: cards.map((c) => c.text || '').filter(Boolean).join('\n') }
      })
      return
    }
  }
  title.value = '我的' + gameName.value
  sections.value = tpl.map((t) => ({ ...t, value: '' }))
}

watch([game, editId], init, { immediate: true })

const counts = computed(() =>
  sections.value.map((s) => s.value.split('\n').map((x) => x.trim()).filter(Boolean).length),
)
const total = computed(() => counts.value.reduce((a, b) => a + b, 0))

function save() {
  const cards: Card[] = []
  sections.value.forEach((s) => {
    const lines = s.value.split('\n').map((x) => x.trim()).filter(Boolean)
    const capped = s.max ? lines.slice(0, s.max) : lines
    capped.forEach((text) => cards.push(s.kind ? { type: 'text', text, kind: s.kind } : { type: 'text', text }))
  })
  if (!cards.length) {
    msg.value = '请至少填写一条内容'
    return
  }
  if (game.value === 'dice' && (counts.value[0] === 0 || counts.value[1] === 0)) {
    msg.value = '骰子需要「动作」和「部位」都有内容'
    return
  }
  if (editing.value) {
    lib.updateUserMode(editId.value, { title: title.value.trim() || '自定义玩法', cards })
    msg.value = '修改已保存'
  } else {
    lib.addUserMode({ game: game.value, title: title.value.trim() || '自定义玩法', cards })
    msg.value = '已保存，可在列表底部找到'
    window.setTimeout(() => router.push('/studio'), 600)
    window.setTimeout(() => router.push('/studio'), 600)
  }
  window.setTimeout(() => (msg.value = ''), 2200)
}

async function remove() {
  if (!editing.value) return
  const ok = await confirmDialog({ title: '删除玩法', text: '删除后不可恢复。', okText: '删除', danger: true })
  if (!ok) return
  lib.removeUserMode(editId.value)
  router.replace('/studio')
}

const mine = computed(() => lib.userModes.filter((m) => m.game === game.value))
</script>

<template>
  <div class="page custom-page">
    <div class="play-bar">
      <button class="bar-btn" @click="router.push(`/g/${game}`)">‹</button>
      <div class="play-title">{{ editing ? '编辑玩法' : '新建玩法' }}</div>
      <button class="bar-btn" @click="init">↻</button>
    </div>

    <div class="editor">
      <label class="field">
        <span class="label">玩法名称</span>
        <input v-model="title" class="text-input" maxlength="16" placeholder="例如：我们的专属任务" />
      </label>

      <label v-for="(s, i) in sections" :key="s.key" class="field">
        <span class="label">
          {{ s.label }}
          <em>{{ counts[i] }} 条<template v-if="s.max">（上限 {{ s.max }}）</template></em>
        </span>
        <textarea v-model="s.value" class="textarea" :rows="counts[i] > 6 ? 8 : 5" :placeholder="s.hint"></textarea>
      </label>

      <div class="row">
        <button class="btn btn-primary" @click="save">{{ editing ? '保存修改' : '保存玩法' }}</button>
        <button v-if="editing" class="btn btn-danger" @click="remove">删除</button>
      </div>

      <div v-if="msg" class="tip">{{ msg }}</div>
      <div class="sum">共 {{ total }} 条内容</div>

      <div v-if="mine.length" class="mine-list">
        <div class="ml-title">这个游戏下的自制玩法</div>
        <div v-for="m in mine" :key="m.id" class="ml-item">
          <div class="ml-name">{{ m.title }}</div>
          <div class="ml-count">{{ m.cards.length }} 条</div>
          <button class="ml-edit" @click="router.push({ path: `/g/${game}/custom`, query: { id: m.id } })">编辑</button>
        </div>
      </div>

      <p class="editor-hint">内容只保存在本机；「我的」里可导出 JSON 备份或分享。</p>
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
.editor {
  padding: 10px 16px 24px;
}
.field {
  display: block;
  margin-bottom: 14px;
}
.label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  font-weight: 700;
  color: #b08a99;
  margin-bottom: 6px;
}
.label em {
  font-style: normal;
  font-weight: 600;
  font-size: 11px;
  color: #cbb2bb;
}
.text-input {
  width: 100%;
  height: 44px;
  border-radius: 14px;
  background: #fff;
  border: 1px solid rgba(255, 120, 150, 0.2);
  padding: 0 14px;
  font-size: 14.5px;
}
.textarea {
  width: 100%;
  border-radius: 16px;
  background: #fff;
  border: 1px solid rgba(255, 120, 150, 0.2);
  padding: 12px 14px;
  font-size: 14px;
  line-height: 1.7;
  resize: vertical;
}
.row {
  display: flex;
  gap: 10px;
}
.row .btn {
  flex: 1;
  height: 45px;
}
.btn-danger {
  flex: 0 0 96px;
  background: #fff1f3;
  color: #e8384f;
  box-shadow: none;
}
.tip {
  margin-top: 10px;
  font-size: 12px;
  color: #e2587f;
  text-align: center;
}
.sum {
  margin-top: 8px;
  font-size: 11px;
  color: #c4a8b3;
  text-align: center;
}
.mine-list {
  margin-top: 18px;
  background: #fff;
  border-radius: 18px;
  padding: 12px 14px;
  box-shadow: 0 8px 20px rgba(255, 150, 180, 0.1);
}
.ml-title {
  font-size: 11.5px;
  font-weight: 800;
  color: #c9a3b1;
  margin-bottom: 6px;
}
.ml-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 0;
  border-top: 1px solid rgba(255, 140, 170, 0.12);
  font-size: 13.5px;
}
.ml-name {
  flex: 1;
  color: #5d3743;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ml-count {
  font-size: 11.5px;
  color: #b08a99;
}
.ml-edit {
  font-size: 11.5px;
  color: #e2587f;
  padding: 3px 10px;
  border-radius: 8px;
  background: rgba(255, 90, 130, 0.08);
}
.editor-hint {
  margin-top: 16px;
  font-size: 11px;
  color: #c4a8b3;
  text-align: center;
  line-height: 1.6;
}
</style>
