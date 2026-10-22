<script setup lang="ts">
// 自制玩法（工作台）：新建 / 导入 / 排序 / 编辑 / 删除
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useLibraryStore } from '../stores/packs'
import { parsePack } from '../utils/importer'
import { confirmDialog } from '../utils/confirm'
import { assetUrl } from '../utils/asset'
import { saveImage, shouldUseIdb } from '../utils/imgstore'
import { buzz } from '../utils/feedback'
import type { GameKey } from '../types'

const router = useRouter()
const lib = useLibraryStore()

const fileInput = ref<HTMLInputElement | null>(null)
const photoInput = ref<HTMLInputElement | null>(null)
const msg = ref('')
const showHelp = ref(false)
const showPaste = ref(false)
const pasteText = ref('')
const dragId = ref('')
let pressTimer: number | null = null
let dragging = false
let startX = 0
let startY = 0

const GAME_ITEMS: { key: GameKey; label: string; hint: string; from: string; to: string }[] = [
  { key: 'flying', label: '飞行棋', hint: '一行一条任务', from: '#FF6B9D', to: '#FFB3C7' },
  { key: 'truth', label: '真心话', hint: '分真心话/大冒险', from: '#4A9BFF', to: '#9AC8FF' },
  { key: 'dice', label: '骰子', hint: '动作 + 部位', from: '#3FBFAD', to: '#8FE3D6' },
  { key: 'wheel', label: '转盘', hint: '最多 10 条', from: '#F0A93B', to: '#FFD482' },
  { key: 'mine', label: '扫雷', hint: '一行一条任务', from: '#7C6CF6', to: '#B3A8FF' },
  { key: 'pose', label: '情侣卡牌', hint: '文字或图片', from: '#E2557B', to: '#FFA3B4' },
]

const groups = computed(() =>
  GAME_ITEMS.map((g) => ({
    ...g,
    modes: lib.modesOf(g.key).filter((m) => m.series === 'user'),
  })).filter((g) => g.modes.length),
)

const total = computed(() => groups.value.reduce((s, g) => s + g.modes.length, 0))


function toast(text: string) {
  msg.value = text
  window.setTimeout(() => (msg.value = ''), 3200)
}

async function importText(raw: string, source = '文件') {
  const res = parsePack(raw)
  res.modes.forEach((m) => lib.addUserMode(m))
  if (res.modes.length) {
    toast('已导入 ' + res.modes.length + ' 个玩法' + (res.errors.length ? '（' + res.errors.length + ' 条提示）' : ''))
  } else {
    toast('导入失败：' + (res.errors[0] || '没有可用内容'))
  }
  if (res.errors.length) console.warn('[' + source + '] 导入提示：', res.errors)
}

function pickJson() {
  fileInput.value?.click()
}

async function onJson(e: Event) {
  const input = e.target as HTMLInputElement
  const f = input.files?.[0]
  if (!f) return
  await importText(await f.text(), f.name)
  input.value = ''
}

async function importPaste() {
  if (!pasteText.value.trim()) return
  await importText(pasteText.value, '粘贴')
  pasteText.value = ''
  showPaste.value = false
}

async function importDemo() {
  try {
    const r = await fetch(assetUrl('/demo/demo-pack.json'))
    await importText(await r.text(), '示例包')
  } catch {
    toast('示例包加载失败，请检查网络')
  }
}

// 图片导入：只用于姿势卡
function pickPhoto() {
  photoInput.value?.click()
}

function compress(file: File): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const max = 900
      const scale = Math.min(1, max / Math.max(img.width, img.height))
      const c = document.createElement('canvas')
      c.width = Math.round(img.width * scale)
      c.height = Math.round(img.height * scale)
      c.getContext('2d')?.drawImage(img, 0, 0, c.width, c.height)
      URL.revokeObjectURL(url)
      resolve(c.toDataURL('image/jpeg', 0.72))
    }
    img.onerror = () => resolve('')
    img.src = url
  })
}

async function onPhotos(e: Event) {
  const input = e.target as HTMLInputElement
  const files = Array.from(input.files || [])
  input.value = ''
  if (!files.length) return
  const cards: any[] = []
  for (const f of files) {
    const data = await compress(f)
    if (!data) continue
    // 图片本体进 IndexedDB，玩法里只存引用，避免撑爆 localStorage
    const stored = shouldUseIdb(data) ? await saveImage(data) : data
    cards.push({ type: 'image', text: f.name.replace(/\.[^.]+$/, ''), image: stored })
  }
  if (!cards.length) {
    toast('图片处理失败，请换一张试试')
    return
  }
  try {
    lib.addUserMode({ game: 'pose', title: '图片卡 · ' + new Date().toLocaleDateString('zh-CN'), cards })
    toast('已导入 ' + cards.length + ' 张图片卡到「情侣卡牌」')
  } catch (err: any) {
    toast(err?.message || '保存失败：存储空间不足')
  }
}

async function removeMode(id: string, title: string) {
  const ok = await confirmDialog({
    title: '删除玩法',
    text: '「' + title + '」将从所有列表中移除，已抽取的记录不受影响。',
    okText: '删除',
    danger: true,
  })
  if (ok) lib.removeUserMode(id)
}

function pressStart(e: PointerEvent, id: string) {
  if (e.button && e.button !== 0) return
  // 点按钮时不要启动长按/捕获，交给按钮自己的 click
  const target = e.target as HTMLElement | null
  if (target && target.closest('button')) return
  clearPress()
  startX = e.clientX
  startY = e.clientY
  pressTimer = window.setTimeout(() => {
    dragging = true
    dragId.value = id
    const row = document.querySelector('.mode-row[data-id="' + id + '"]') as HTMLElement | null
    try {
      row?.setPointerCapture(e.pointerId)
    } catch {
      /* 忽略 */
    }
    buzz(lib.settings.vibrate, 15)
  }, 350)
}

function clearPress() {
  if (pressTimer) {
    window.clearTimeout(pressTimer)
    pressTimer = null
  }
}

function pressMove(e: PointerEvent) {
  if (!dragging) {
    // 长按未触发时，移动超过 10px 视为滚动/误触，取消长按
    if (Math.abs(e.clientX - startX) > 10 || Math.abs(e.clientY - startY) > 10) clearPress()
    return
  }
  if (!dragId.value) return
  e.preventDefault()
  const rows = Array.from(document.querySelectorAll('.studio-page .mode-row')) as HTMLElement[]
  if (!rows.length) return
  let target = rows.length - 1
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i].getBoundingClientRect()
    if (e.clientY < r.top + r.height / 2) {
      target = i
      break
    }
  }
  const ids = rows.map((r) => r.dataset.id || '').filter(Boolean)
  const from = ids.indexOf(dragId.value)
  if (from < 0 || target === from) return
  const next = [...ids]
  next.splice(target, 0, next.splice(from, 1)[0])
  lib.reorderGroup(next)
}

function pressEnd() {
  clearPress()
  dragging = false
  dragId.value = ''
}

function editMode(id: string, game: GameKey) {
  router.push({ path: '/g/' + game + '/custom', query: { id } })
}

function exportModes() {
  const blob = new Blob([JSON.stringify({ version: 1, modes: lib.userModes }, null, 2)], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = 'my-modes.json'
  a.click()
  URL.revokeObjectURL(a.href)
  toast('已导出 ' + lib.userModes.length + ' 个自制玩法')
}
</script>

<template>
  <div class="page studio-page">
    <div class="list-head">
      <button class="lh-back" @click="router.push('/games')">‹ 全部游戏</button>
      <span class="lh-count">{{ total }} 个玩法</span>
    </div>

    <div class="intro">
      <div class="intro-title">自己做一套</div>
      <div class="intro-sub">文字为主，一行一条；图片只建议用在「情侣卡牌」。自制玩法会出现在对应游戏列表底部。</div>
    </div>

    <div class="section-title">新建</div>
    <div class="new-grid">
      <button
        v-for="g in GAME_ITEMS"
        :key="g.key"
        class="new-card"
        :style="{ '--from': g.from, '--to': g.to }"
        @click="router.push('/g/' + g.key + '/custom')"
      >
        <span class="nc-title">{{ g.label }}</span>
        <span class="nc-hint">{{ g.hint }}</span>
      </button>
    </div>

    <div class="section-title">导入</div>
    <div class="import-card">
      <div class="cell" @click="pickJson">
        <span class="c-label">导入 JSON 玩法</span>
        <span class="c-value">文件</span>
      </div>
      <div class="cell" @click="showPaste = true">
        <span class="c-label">粘贴 JSON 文本</span>
        <span class="c-value">直接粘贴</span>
      </div>
      <div class="cell" @click="pickPhoto">
        <span class="c-label">图片导入</span>
        <span class="c-value">仅情侣卡牌</span>
      </div>
      <div class="cell" @click="importDemo">
        <span class="c-label">导入示例包</span>
        <span class="c-value">看效果</span>
      </div>
      <div class="cell" @click="exportModes">
        <span class="c-label">导出我的玩法</span>
        <span class="c-value">JSON</span>
      </div>
      <input ref="fileInput" type="file" accept=".json,application/json" hidden @change="onJson" />
      <input ref="photoInput" type="file" accept="image/*" capture="environment" multiple hidden @change="onPhotos" />
      <div class="import-tip" @click="showHelp = !showHelp">
        {{ showHelp ? '收起格式说明' : '每种导入方式需要什么格式？点这里' }}
      </div>
      <div v-if="showHelp" class="help">
        <p><b>1. 新建（推荐新用户）</b>：选上面的游戏 → 按模板逐行填写 → 保存。</p>
        <p><b>2. JSON 文件</b>：结构为 <code>{ "modes": [ { "game": "flying", "title": "名称", "cards": [ { "type": "text", "text": "内容" } ] } ] }</code></p>
        <p><b>3. 粘贴 JSON</b>：把同样的内容直接粘进来，适合从聊天/文档复制。</p>
        <p><b>4. 图片导入</b>：只能生成<strong>情侣卡牌</strong>（图片卡在飞行棋/扫雷里体验差，已限制），支持多选，自动压缩。</p>
        <p class="help-note">完整字段、各游戏示例与常见错误见 <code>docs/内容导入说明.md</code>。</p>
      </div>
    </div>

    <div class="section-title">
      我的玩法
      <span v-if="total" class="st-hint">长按拖动排序，也可用 ↑↓</span>
    </div>

    <div v-if="!total" class="empty-box">
      <div class="eb-emoji">🧩</div>
      <div class="eb-title">还没有自制玩法</div>
      <div class="eb-sub">从上面选一个游戏开始，或导入 JSON / 示例包</div>
    </div>

    <div v-for="g in groups" :key="g.key" class="group" :data-g="g.key">
      <div class="g-title">{{ g.label }}<span>{{ g.modes.length }}</span></div>
      <div
        v-for="(m, i) in g.modes"
        :key="m.id"
        class="mode-row"
        :class="{ dragging: dragId === m.id }"
        :data-id="m.id"
        @pointerdown="pressStart($event, m.id)"
        @pointermove="pressMove"
        @pointerup="pressEnd"
        @pointercancel="pressEnd"
      >
        <div class="mr-main">
          <div class="mr-title">{{ m.title }}</div>
          <div class="mr-sub">{{ m.cards.length }} 条内容 · 自定义</div>
        </div>
        <div class="mr-actions">
          <button class="icon-btn" :disabled="i === 0" @click="lib.moveUserMode(m.id, -1)">↑</button>
          <button class="icon-btn" :disabled="i === g.modes.length - 1" @click="lib.moveUserMode(m.id, 1)">↓</button>
          <button class="text-btn" @click="editMode(m.id, g.key)">编辑</button>
          <button class="text-btn danger" @click="removeMode(m.id, m.title)">删除</button>
        </div>
      </div>
    </div>

    <p class="foot">自制玩法会同时出现在这里和对应游戏的列表底部，编辑与删除只在这里操作。</p>

    <div v-if="showPaste" class="sheet-mask" @click.self="showPaste = false">
      <div class="sheet">
        <div class="sheet-title">粘贴 JSON</div>
        <div class="sheet-text">支持数组或 <code>{ "modes": [...] }</code> 结构。</div>
        <textarea v-model="pasteText" class="paste" rows="8" placeholder='{"modes":[{"game":"flying","title":"我的任务","cards":[{"type":"text","text":"给对方一个拥抱"}]}]}'></textarea>
        <div class="sheet-foot">
          <button class="btn btn-ghost" @click="showPaste = false">取消</button>
          <button class="btn btn-primary" @click="importPaste">导入</button>
        </div>
      </div>
    </div>

    <div v-if="msg" class="toast show">{{ msg }}</div>
  </div>
</template>

<style scoped>
.studio-page {
  padding: 8px 16px 26px;
}
.intro {
  margin: 0 0 4px;
  padding: 14px 16px;
  border-radius: 18px;
  background: linear-gradient(120deg, #fff, #fff2f6);
  border: 1px solid rgba(255, 140, 170, 0.16);
}
.intro-title {
  font-size: 15px;
  font-weight: 900;
  color: #4a2f38;
}
.intro-sub {
  margin-top: 4px;
  font-size: 11.5px;
  line-height: 1.7;
  color: #b08a99;
}
/* 与全局 .list-head 规则（1080）区分：这里限定为 studio 的 1040 */
.app-shell .studio-page .list-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 2px 0 10px;
  max-width: 1040px;
  margin: 0 auto;
  width: 100%;
  box-sizing: border-box;
}
.lh-back {
  font-size: 12px;
  color: #e2587f;
  font-weight: 700;
  padding: 2px 0;
}
.lh-count {
  font-size: 11.5px;
  color: #b08a99;
  font-weight: 700;
}
.hero {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 18px;
  border-radius: 22px;
  background: linear-gradient(125deg, #fff, #fff0f5 60%, #ffe6ef);
  border: 1px solid rgba(255, 140, 170, 0.18);
  box-shadow: 0 10px 24px rgba(255, 150, 180, 0.14);
}
.hero-main {
  flex: 1;
}
.hero-title {
  font-size: 17px;
  font-weight: 900;
  color: #4a2f38;
}
.hero-sub {
  margin-top: 3px;
  font-size: 11.5px;
  color: #b08a99;
}
.hero-count {
  font-size: 12px;
  font-weight: 800;
  color: #e2587f;
  background: rgba(255, 90, 130, 0.1);
  padding: 4px 12px;
  border-radius: 999px;
}
.section-title {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin: 16px 0 8px;
  font-size: 12.5px;
  font-weight: 800;
  color: #b08a99;
  letter-spacing: 0.04em;
}
.st-hint {
  font-size: 10px;
  font-weight: 500;
  color: #cbb2bb;
}
.new-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 9px;
}
.new-card {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 12px 10px;
  border-radius: 16px;
  background: linear-gradient(150deg, color-mix(in srgb, var(--from) 12%, #fff), #fff 70%);
  border: 1px solid color-mix(in srgb, var(--from) 18%, #fff);
  text-align: left;
}
.nc-title {
  font-size: 13.5px;
  font-weight: 800;
  color: #4a2f38;
}
.nc-hint {
  font-size: 10px;
  color: #b08a99;
}
.import-card {
  background: #fff;
  border-radius: 20px;
  padding: 4px 14px 10px;
  box-shadow: 0 8px 20px rgba(255, 150, 180, 0.1);
}
.cell {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 0;
  border-top: 1px solid rgba(255, 140, 170, 0.12);
  font-size: 13.5px;
}
.import-card .cell:first-child {
  border-top: none;
}
.c-label {
  flex: 1;
  color: #5d3743;
  font-weight: 600;
}
.c-value {
  font-size: 11.5px;
  color: #b08a99;
}
.import-tip {
  margin-top: 4px;
  padding: 9px 0 2px;
  border-top: 1px dashed rgba(255, 140, 170, 0.2);
  font-size: 11.5px;
  color: #e2587f;
  text-align: center;
}
.help {
  margin-top: 8px;
  padding: 12px;
  border-radius: 14px;
  background: #fff8fb;
  font-size: 11.5px;
  line-height: 1.8;
  color: #8d6a78;
}
.help p {
  margin-bottom: 4px;
}
.help code {
  font-size: 10.5px;
  background: rgba(255, 120, 150, 0.1);
  padding: 1px 4px;
  border-radius: 4px;
  word-break: break-all;
}
.help-note {
  color: #b08a99;
}
.group {
  margin-top: 10px;
  background: #fff;
  border-radius: 18px;
  padding: 6px 14px;
  box-shadow: 0 8px 20px rgba(255, 150, 180, 0.09);
}
.g-title {
  display: flex;
  gap: 6px;
  padding: 10px 0 4px;
  font-size: 11.5px;
  font-weight: 800;
  color: #c9a3b1;
}
.g-title span {
  color: #dcc3cc;
}
.mode-row {
  touch-action: pan-y;
  transition: background 0.15s;
}
.mode-row.dragging {
  background: #fff7fa;
  box-shadow: inset 0 0 0 1px rgba(255, 120, 150, 0.35);
  border-radius: 12px;
  opacity: 0.92;
}
.mode-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 0;
  border-top: 1px solid rgba(255, 140, 170, 0.12);
}
.mr-main {
  flex: 1;
  min-width: 0;
}
.mr-title {
  font-size: 13.5px;
  font-weight: 700;
  color: #4a3038;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.mr-sub {
  margin-top: 2px;
  font-size: 10.5px;
  color: #b08a99;
}
.mr-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}
.icon-btn {
  width: 24px;
  height: 24px;
  border-radius: 8px;
  background: rgba(255, 120, 150, 0.08);
  color: #d1788f;
  font-size: 12px;
}
.icon-btn[disabled] {
  opacity: 0.35;
}
.text-btn {
  font-size: 11.5px;
  color: #5b7bd5;
  padding: 3px 8px;
  border-radius: 8px;
  background: rgba(91, 123, 213, 0.08);
}
.text-btn.danger {
  color: #e2587f;
  background: rgba(255, 90, 130, 0.08);
}
.foot {
  margin-top: 16px;
  text-align: center;
  font-size: 10.5px;
  color: #cbb2bb;
  line-height: 1.7;
}
.empty-box {
  padding: 24px 20px;
  border-radius: 20px;
  background: #fff;
  text-align: center;
  box-shadow: 0 8px 20px rgba(255, 150, 180, 0.09);
}
.eb-emoji {
  font-size: 34px;
}
.eb-title {
  margin-top: 6px;
  font-size: 14.5px;
  font-weight: 800;
  color: #4a2f38;
}
.eb-sub {
  margin-top: 5px;
  font-size: 11.5px;
  color: #b08a99;
}
.paste {
  width: 100%;
  margin-top: 12px;
  border-radius: 14px;
  border: 1px solid rgba(255, 120, 150, 0.2);
  background: #fff8fb;
  padding: 12px;
  font-size: 12px;
  line-height: 1.6;
  font-family: ui-monospace, Menlo, Consolas, monospace;
  resize: vertical;
}
</style>
