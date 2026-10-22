<script setup lang="ts">
// 我们：纪念日 / 亲密日历 / 重要日子 / 记录 / 收藏 / 心愿
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useLibraryStore } from '../stores/packs'
import { library } from '../data/library'
import type { GameKey } from '../types'
import { fillRoles } from '../utils/text'
import { confirmDialog } from '../utils/confirm'
import ImgRef from '../components/ImgRef.vue'

const router = useRouter()
const lib = useLibraryStore()

type Tab = 'calendar' | 'history' | 'fav' | 'wish'
const tab = ref<Tab>('calendar')
const filter = ref<'all' | GameKey>('all')

const showDate = ref(false)
const dateInput = ref(lib.settings.anniversary)
const showDay = ref(false)
const activeDate = ref('')
const noteInput = ref('')
const showSpecial = ref(false)
const specialTitle = ref('')
const specialDate = ref('')
const wishText = ref('')

const gameLabel = (key: GameKey) => library[key]?.short ?? key

/** 在一起天数 */
const days = computed(() => {
  if (!lib.settings.anniversary) return 0
  const start = new Date(lib.settings.anniversary + 'T00:00:00').getTime()
  return Math.max(1, Math.floor((Date.now() - start) / 86400000) + 1)
})

// ---------------- 亲密日历 ----------------
const cursor = ref(new Date(new Date().getFullYear(), new Date().getMonth(), 1))
const monthLabel = computed(() => `${cursor.value.getFullYear()} 年 ${cursor.value.getMonth() + 1} 月`)

const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

const cells = computed(() => {
  const y = cursor.value.getFullYear()
  const m = cursor.value.getMonth()
  const first = new Date(y, m, 1)
  // 周一为一周起点
  const offset = (first.getDay() + 6) % 7
  const today = fmt(new Date())
  const out: { key: string; day: number; date: string; inMonth: boolean; marked: boolean; today: boolean; future: boolean }[] = []
  for (let i = 0; i < 42; i++) {
    const d = new Date(y, m, 1 - offset + i)
    const ds = fmt(d)
    out.push({
      key: ds + i,
      day: d.getDate(),
      date: ds,
      inMonth: d.getMonth() === m,
      marked: lib.intimacy[ds] !== undefined,
      today: ds === today,
      future: ds > today,
    })
  }
  return out
})

const monthMarked = computed(() => {
  const prefix = `${cursor.value.getFullYear()}-${String(cursor.value.getMonth() + 1).padStart(2, '0')}`
  return Object.keys(lib.intimacy).filter((d) => d.startsWith(prefix)).length
})

const sinceLast = computed(() => {
  const keys = Object.keys(lib.intimacy).sort()
  if (!keys.length) return -1
  const last = new Date(keys[keys.length - 1] + 'T00:00:00').getTime()
  const today = new Date(fmt(new Date()) + 'T00:00:00').getTime()
  return Math.round((today - last) / 86400000)
})

const markedNotes = computed(() =>
  Object.entries(lib.intimacy)
    .filter(([, note]) => !!note)
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .slice(0, 6),
)

function shiftMonth(n: number) {
  cursor.value = new Date(cursor.value.getFullYear(), cursor.value.getMonth() + n, 1)
}

function openDay(date: string) {
  // 未来的日期不允许记录
  if (date > fmt(new Date())) return
  activeDate.value = date
  noteInput.value = lib.intimacy[date] ?? ''
  showDay.value = true
}

function saveDay() {
  if (lib.intimacy[activeDate.value] === undefined) lib.toggleIntimacy(activeDate.value)
  lib.setIntimacyNote(activeDate.value, noteInput.value)
  showDay.value = false
}

function unmarkDay() {
  if (lib.intimacy[activeDate.value] !== undefined) lib.toggleIntimacy(activeDate.value)
  showDay.value = false
}

// ---------------- 重要日子 ----------------
function daysUntil(date: string) {
  const now = new Date(fmt(new Date()) + 'T00:00:00')
  let target = new Date(date + 'T00:00:00')
  target = new Date(now.getFullYear(), target.getMonth(), target.getDate())
  if (target < now) target = new Date(now.getFullYear() + 1, target.getMonth(), target.getDate())
  return Math.round((target.getTime() - now.getTime()) / 86400000)
}

const specials = computed(() =>
  [...lib.specialDays].sort((a, b) => daysUntil(a.date) - daysUntil(b.date)),
)

function saveSpecial() {
  lib.addSpecialDay(specialTitle.value, specialDate.value)
  specialTitle.value = ''
  specialDate.value = ''
  showSpecial.value = false
}

// ---------------- 记录 / 收藏 ----------------
const dayLabel = (at: number) => {
  const d = new Date(at)
  const today = new Date()
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
  const diff = Math.round((startOf(today) - startOf(d)) / 86400000)
  if (diff <= 0) return '今天'
  if (diff === 1) return '昨天'
  if (diff < 7) return '本周'
  return `${d.getMonth() + 1} 月 ${d.getDate()} 日`
}

const history = computed(() => (filter.value === 'all' ? lib.history : lib.history.filter((h) => h.game === filter.value)))
const favorites = computed(() => (filter.value === 'all' ? lib.favorites : lib.favorites.filter((h) => h.game === filter.value)))
const list = computed(() => (tab.value === 'fav' ? favorites.value : history.value))

const groups = computed(() => {
  const map = new Map<string, typeof list.value>()
  for (const item of list.value) {
    const key = dayLabel(item.at)
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(item)
  }
  return [...map.entries()]
})

const usedGames = computed(() => {
  const set = new Set<GameKey>()
  for (const h of lib.history) set.add(h.game)
  return [...set]
})

const wishDone = computed(() => lib.wishes.filter((w) => w.done).length)

function saveDate() {
  lib.saveSettings({ anniversary: dateInput.value })
  showDate.value = false
}

async function clearHistory() {
  const ok = await confirmDialog({ title: '清空记录', text: '全部抽卡记录会被删除，收藏不受影响。', okText: '清空', danger: true })
  if (ok) lib.clearHistory()
}

function addWish() {
  lib.addWish(wishText.value)
  wishText.value = ''
}

</script>

<template>
  <div class="page us-page">
    <!-- 纪念日 -->
    <div class="hero">
      <div class="hero-bg"></div>
      <div class="hero-main">
        <div class="hero-label">我们在一起</div>
        <div class="hero-days">
          <span class="num">{{ days || '—' }}</span>
          <span class="unit">天</span>
        </div>
        <div class="hero-sub">{{ lib.settings.anniversary ? '从 ' + lib.settings.anniversary + ' 开始' : '设置一个开始的日子吧' }}</div>
      </div>
      <button class="hero-edit" @click="showDate = true">{{ lib.settings.anniversary ? '修改' : '设置' }}</button>
    </div>

    <div class="seg seg4">
      <button class="seg-btn" :class="{ active: tab === 'calendar' }" @click="tab = 'calendar'">日历</button>
      <button class="seg-btn" :class="{ active: tab === 'history' }" @click="tab = 'history'">记录 <em>{{ lib.history.length }}</em></button>
      <button class="seg-btn" :class="{ active: tab === 'fav' }" @click="tab = 'fav'">收藏 <em>{{ lib.favorites.length }}</em></button>
      <button class="seg-btn" :class="{ active: tab === 'wish' }" @click="tab = 'wish'">心愿 <em>{{ lib.wishes.length }}</em></button>
    </div>

    <!-- 日历 -->
    <template v-if="tab === 'calendar'">
      <div class="cal-row">
      <div class="cal-card">
        <div class="cal-head">
          <button class="cal-nav" @click="shiftMonth(-1)">‹</button>
          <div class="cal-month">{{ monthLabel }}</div>
          <button class="cal-nav" @click="shiftMonth(1)">›</button>
        </div>
        <div class="cal-stats">
          <div class="cs-item"><span class="cs-num">{{ monthMarked }}</span><span class="cs-label">本月记录</span></div>
          <div class="cs-split"></div>
          <div class="cs-item"><span class="cs-num">{{ sinceLast < 0 ? '—' : sinceLast }}</span><span class="cs-label">距上次（天）</span></div>
        </div>
        <div class="cal-week">
          <span v-for="w in ['一', '二', '三', '四', '五', '六', '日']" :key="w">{{ w }}</span>
        </div>
        <div class="cal-grid">
          <button
            v-for="c in cells"
            :key="c.key"
            class="cal-cell"
            :class="{ out: !c.inMonth, marked: c.marked, today: c.today, future: c.future }"
            :disabled="c.future"
            @click="c.inMonth && !c.future && openDay(c.date)"
          >
            <span class="cd">{{ c.day }}</span>
            <span v-if="c.marked" class="cm">♥</span>
          </button>
        </div>
        <div class="cal-tip">点今天及以前的日期可标记 / 取消，可写一句备注</div>

        <div v-if="markedNotes.length" class="cal-notes">
          <div v-for="[d, note] in markedNotes" :key="d" class="cn-item">
            <span class="cn-date">{{ d.slice(5) }}</span>
            <span class="cn-text">{{ note }}</span>
          </div>
        </div>
      </div>

      <!-- 重要日子 -->
      <div class="special-card">
        <div class="sp-head">
          <div class="sp-title">重要日子</div>
          <button class="sp-add" @click="showSpecial = true">＋ 添加</button>
        </div>
        <div v-if="!specials.length" class="sp-empty">添加生日、周年、第一次约会…展示还有多少天</div>
        <div v-for="s in specials" :key="s.id" class="sp-item">
          <div class="sp-left">
            <div class="sp-name">{{ s.title }}</div>
            <div class="sp-date">{{ s.date }}</div>
          </div>
          <div class="sp-days" :class="{ soon: daysUntil(s.date) <= 7 }">
            <span class="n">{{ daysUntil(s.date) }}</span> 天
          </div>
          <button class="sp-del" @click="lib.removeSpecialDay(s.id)">×</button>
        </div>
      </div>
      </div>
    </template>

    <!-- 心愿单 -->
    <template v-else-if="tab === 'wish'">
      <div class="wish-add">
        <input v-model="wishText" class="wish-input" maxlength="40" placeholder="想和 TA 一起做的事…" @keyup.enter="addWish" />
        <button class="wish-btn" @click="addWish">添加</button>
      </div>
      <div v-if="lib.wishes.length" class="wish-progress">
        <div class="wp-bar"><span :style="{ width: (wishDone / lib.wishes.length) * 100 + '%' }"></span></div>
        <div class="wp-text">已完成 {{ wishDone }} / {{ lib.wishes.length }}</div>
      </div>
      <div v-if="!lib.wishes.length" class="empty-box">
        <div class="eb-emoji">🌠</div>
        <div class="eb-title">写下第一个心愿</div>
        <div class="eb-sub">比如「一起看一次日出」「去海边拍一组照片」</div>
      </div>
      <div v-else class="wish-list">
        <div v-for="w in lib.wishes" :key="w.id" class="wish-item" :class="{ done: w.done }">
          <button class="wi-check" @click="lib.toggleWish(w.id)">{{ w.done ? '✓' : '' }}</button>
          <span class="wi-text">{{ w.text }}</span>
          <button class="wi-del" @click="lib.removeWish(w.id)">×</button>
        </div>
      </div>
    </template>

    <!-- 记录 / 收藏 -->
    <template v-else>
      <div v-if="usedGames.length" class="filters">
        <button class="filter" :class="{ on: filter === 'all' }" @click="filter = 'all'">全部</button>
        <button v-for="g in usedGames" :key="g" class="filter" :class="{ on: filter === g }" @click="filter = g">
          {{ gameLabel(g) }}
        </button>
      </div>

      <div v-if="!list.length" class="empty-box">
        <div class="eb-emoji">💌</div>
        <div class="eb-title">{{ tab === 'history' ? '还没有记录' : '还没有收藏' }}</div>
        <div class="eb-sub">{{ tab === 'history' ? '去玩一局，抽到的内容会自动留在这里' : '在任务卡上点 ♡ 就能收藏' }}</div>
        <button class="btn btn-primary" @click="router.push('/games')">去选个玩法</button>
      </div>

      <div v-else class="groups">
        <div v-for="[label, items] in groups" :key="label" class="group">
          <div class="g-day">{{ label }}<span>{{ items.length }}</span></div>
          <div v-for="it in items" :key="it.id" class="rec">
            <div class="rec-head">
              <span class="rec-game">{{ gameLabel(it.game) }}</span>
              <span v-if="it.who" class="rec-who">{{ it.who }}</span>
              <span class="rec-mode">{{ it.modeTitle }}</span>
              <span class="rec-time">{{ new Date(it.at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) }}</span>
            </div>
            <div class="rec-text">{{ fillRoles(it.text, lib.settings.nick1, lib.settings.nick2) }}</div>
            <ImgRef v-if="it.image" class="rec-img" :src="it.image" />
            <button
              class="rec-fav"
              :class="{ on: lib.isFavorite(it.text, it.game) }"
              @click="lib.toggleFavorite({ game: it.game, modeTitle: it.modeTitle, text: it.text, image: it.image })"
            >
              {{ lib.isFavorite(it.text, it.game) ? '♥' : '♡' }}
            </button>
          </div>
        </div>
        <button v-if="tab === 'history'" class="clear" @click="clearHistory()">清空记录</button>
      </div>
    </template>

    <!-- 纪念日设置 -->
    <div v-if="showDate" class="sheet-mask" @click.self="showDate = false">
      <div class="sheet">
        <div class="sheet-title">设置纪念日</div>
        <div class="sheet-text">用来计算「在一起第几天」，只保存在本机。</div>
        <input v-model="dateInput" type="date" class="input" />
        <div class="sheet-foot">
          <button class="btn btn-ghost" @click="showDate = false">取消</button>
          <button class="btn btn-primary" @click="saveDate">保存</button>
        </div>
      </div>
    </div>

    <!-- 标记某天 -->
    <div v-if="showDay" class="sheet-mask" @click.self="showDay = false">
      <div class="sheet">
        <div class="sheet-title">{{ activeDate }}</div>
        <div class="sheet-text">{{ lib.intimacy[activeDate] !== undefined ? '今天已记录，可补充备注' : '标记这一天，并写一句备注（可留空）' }}</div>
        <input v-model="noteInput" class="input" maxlength="30" placeholder="例如：看完电影之后" />
        <div class="sheet-foot">
          <button class="btn btn-ghost" @click="unmarkDay">取消标记</button>
          <button class="btn btn-primary" @click="saveDay">保存</button>
        </div>
      </div>
    </div>

    <!-- 添加重要日子 -->
    <div v-if="showSpecial" class="sheet-mask" @click.self="showSpecial = false">
      <div class="sheet">
        <div class="sheet-title">添加重要日子</div>
        <div class="sheet-text">生日、周年、第一次见面…每年循环提醒。</div>
        <input v-model="specialTitle" class="input" maxlength="12" placeholder="名称，例如：她的生日" />
        <input v-model="specialDate" type="date" class="input" />
        <div class="sheet-foot">
          <button class="btn btn-ghost" @click="showSpecial = false">取消</button>
          <button class="btn btn-primary" @click="saveSpecial">添加</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.us-page {
  padding: 8px 16px 26px;
}
.hero {
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  padding: 16px 18px;
  border-radius: 24px;
  background: linear-gradient(125deg, #fff, #ffeef4 60%, #ffe1ea);
  border: 1px solid rgba(255, 140, 170, 0.18);
  box-shadow: 0 12px 28px rgba(255, 140, 170, 0.16);
}
.hero-bg {
  position: absolute;
  right: -30px;
  top: -40px;
  width: 140px;
  height: 140px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 130, 160, 0.28), transparent 70%);
}
.hero-main {
  flex: 1;
}
.hero-label {
  font-size: 11.5px;
  font-weight: 700;
  color: #b08a99;
  letter-spacing: 0.08em;
}
.hero-days {
  display: flex;
  align-items: baseline;
  gap: 4px;
  margin: 2px 0;
}
.hero-days .num {
  font-size: 34px;
  font-weight: 900;
  line-height: 1.1;
  color: #e2264f;
}
.hero-days .unit {
  font-size: 13px;
  font-weight: 700;
  color: #d1788f;
}
.hero-sub {
  font-size: 10.5px;
  color: #c098a6;
}
.hero-edit {
  position: relative;
  flex: none;
  padding: 7px 14px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 800;
  color: #e2587f;
  background: rgba(255, 255, 255, 0.85);
  box-shadow: 0 4px 12px rgba(255, 120, 150, 0.16);
}
.resume {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 12px;
  padding: 13px 16px;
  border-radius: 20px;
  background: #fff;
  border: 1px solid rgba(255, 120, 150, 0.18);
  text-align: left;
}
.rs-left {
  flex: 1;
  min-width: 0;
}
.rs-tag {
  display: inline-block;
  font-size: 9.5px;
  font-weight: 800;
  color: #fff;
  background: linear-gradient(120deg, #ff8fb1, #ff3d68);
  padding: 1px 7px;
  border-radius: 6px;
}
.rs-title {
  margin-top: 4px;
  font-size: 14.5px;
  font-weight: 800;
  color: #4a2f38;
}
.rs-meta {
  margin-top: 2px;
  font-size: 11px;
  color: #b08a99;
}
.rs-go {
  flex: none;
  padding: 6px 15px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 800;
  color: #fff;
  background: linear-gradient(120deg, #ff8fb1, #ff3d68);
}
.seg {
  display: flex;
  gap: 4px;
  padding: 4px;
  margin: 14px 0 12px;
  border-radius: 999px;
  background: rgba(255, 120, 150, 0.1);
}
.seg-btn {
  flex: 1;
  height: 34px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 800;
  color: #b98a99;
}
.seg-btn em {
  font-style: normal;
  font-size: 10px;
  opacity: 0.7;
}
.seg-btn.active {
  background: #fff;
  color: var(--brand);
  box-shadow: 0 3px 10px rgba(255, 120, 150, 0.2);
}
/* 日历 */
.cal-card {
  background: #fff;
  border-radius: 22px;
  padding: 14px 14px 12px;
  box-shadow: 0 10px 26px rgba(255, 150, 180, 0.12);
}
.cal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.cal-month {
  font-size: 14px;
  font-weight: 800;
  color: #4a2f38;
}
.cal-nav {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  color: #e2587f;
  background: rgba(255, 120, 150, 0.08);
  font-size: 16px;
  line-height: 1;
}
.cal-stats {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 18px;
  margin: 8px 0 6px;
  padding: 8px 0;
  border-radius: 14px;
  background: linear-gradient(120deg, #fff6f9, #ffeef4);
}
.cs-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.cs-num {
  font-size: 18px;
  font-weight: 900;
  color: #e2264f;
  line-height: 1.1;
}
.cs-label {
  font-size: 10px;
  color: #b08a99;
}
.cs-split {
  width: 1px;
  height: 22px;
  background: rgba(255, 130, 160, 0.25);
}
.cal-week {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  margin-top: 6px;
  text-align: center;
  font-size: 10.5px;
  color: #c4a8b3;
}
.cal-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
  margin-top: 4px;
}
.cal-cell {
  position: relative;
  aspect-ratio: 1;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12.5px;
  color: #5d444d;
  transition: background 0.15s;
}
.cal-cell.out {
  color: #e2d3d9;
}
.cal-cell.future {
  color: #e8dde2;
  pointer-events: none;
}
.cal-cell.today {
  box-shadow: inset 0 0 0 1.5px rgba(255, 110, 145, 0.5);
}
.cal-cell.marked {
  background: linear-gradient(140deg, #ff9dbb, #ff4677);
  color: #fff;
  box-shadow: 0 4px 10px rgba(255, 90, 130, 0.28);
}
.cd {
  line-height: 1;
}
.cm {
  position: absolute;
  right: 4px;
  bottom: 2px;
  font-size: 8px;
  opacity: 0.9;
}
.cal-tip {
  margin-top: 8px;
  text-align: center;
  font-size: 10.5px;
  color: #c4a8b3;
}
.cal-notes {
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px dashed rgba(255, 140, 170, 0.22);
}
.cn-item {
  display: flex;
  gap: 8px;
  font-size: 11.5px;
  color: #8d6a78;
  padding: 3px 0;
}
.cn-date {
  flex: none;
  color: #e2587f;
  font-weight: 700;
}
.cn-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
/* 重要日子 */
.special-card {
  margin-top: 12px;
  background: #fff;
  border-radius: 22px;
  padding: 14px;
  box-shadow: 0 10px 26px rgba(255, 150, 180, 0.1);
}
.sp-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.sp-title {
  font-size: 13px;
  font-weight: 800;
  color: #4a2f38;
}
.sp-add {
  font-size: 11.5px;
  font-weight: 700;
  color: #e2587f;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(255, 90, 130, 0.08);
}
.sp-empty {
  font-size: 11.5px;
  color: #c4a8b3;
  padding: 4px 0 8px;
  line-height: 1.6;
}
.sp-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 0;
  border-top: 1px solid rgba(255, 140, 170, 0.12);
}
.sp-left {
  flex: 1;
  min-width: 0;
}
.sp-name {
  font-size: 13px;
  font-weight: 700;
  color: #4a3038;
}
.sp-date {
  font-size: 10.5px;
  color: #b08a99;
  margin-top: 1px;
}
.sp-days {
  flex: none;
  font-size: 10.5px;
  color: #b08a99;
}
.sp-days .n {
  font-size: 16px;
  font-weight: 900;
  color: #e2264f;
}
.sp-days.soon .n {
  color: #ff2d55;
}
.sp-del {
  flex: none;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  color: #cbb2bb;
  font-size: 15px;
}
/* 记录 / 收藏 / 心愿 */
.filters {
  display: flex;
  gap: 7px;
  overflow-x: auto;
  padding-bottom: 8px;
  scrollbar-width: none;
}
.filters::-webkit-scrollbar {
  display: none;
}
.filter {
  flex: none;
  padding: 5px 13px;
  border-radius: 999px;
  font-size: 11.5px;
  font-weight: 700;
  color: #a8838f;
  background: #fff;
  border: 1px solid rgba(255, 140, 170, 0.18);
}
.filter.on {
  color: #fff;
  background: linear-gradient(120deg, #ff8fb1, #ff3d68);
  border-color: transparent;
}
.groups {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.g-day {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 8px 2px 6px;
  font-size: 11.5px;
  font-weight: 800;
  color: #b08a99;
}
.g-day span {
  font-weight: 600;
  color: #d3bcc5;
}
.rec {
  position: relative;
  padding: 12px 42px 12px 14px;
  margin-bottom: 8px;
  border-radius: 18px;
  background: #fff;
  border: 1px solid rgba(255, 150, 175, 0.14);
  box-shadow: 0 5px 14px rgba(255, 150, 180, 0.07);
}
.rec-head {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
}
.rec-game {
  font-size: 9.5px;
  font-weight: 800;
  color: #e2587f;
  background: rgba(255, 90, 130, 0.1);
  padding: 1px 7px;
  border-radius: 6px;
}
.rec-who {
  flex: none;
  font-size: 9.5px;
  font-weight: 800;
  color: #5b7bd5;
  background: rgba(91, 123, 213, 0.1);
  padding: 1px 7px;
  border-radius: 6px;
}
.rec-mode {
  font-size: 10.5px;
  color: #b08a99;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.rec-time {
  margin-left: auto;
  flex: none;
  font-size: 10px;
  color: #cbb2bb;
}
.rec-text {
  font-size: 13.5px;
  line-height: 1.6;
  color: #4a3038;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.rec-img {
  margin-top: 8px;
  width: 100%;
  border-radius: 12px;
}
.rec-fav {
  position: absolute;
  right: 9px;
  top: 9px;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  font-size: 15px;
  color: #e0b9c7;
  background: rgba(255, 120, 150, 0.06);
}
.rec-fav.on {
  color: #ff3d68;
}
.clear {
  margin: 6px auto 0;
  font-size: 11.5px;
  color: #c4a8b3;
  padding: 8px 16px;
  border-radius: 999px;
  background: rgba(255, 120, 150, 0.07);
}
.empty-box {
  margin-top: 18px;
  padding: 26px 20px;
  border-radius: 24px;
  background: #fff;
  text-align: center;
  box-shadow: 0 10px 26px rgba(255, 150, 180, 0.1);
}
.eb-emoji {
  font-size: 36px;
}
.eb-title {
  margin-top: 8px;
  font-size: 15px;
  font-weight: 800;
  color: #4a2f38;
}
.eb-sub {
  margin: 6px 0 16px;
  font-size: 11.5px;
  line-height: 1.7;
  color: #b08a99;
}
.empty-box .btn {
  height: 42px;
  font-size: 13.5px;
}
.wish-add {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}
.wish-input {
  flex: 1;
  height: 44px;
  border-radius: 14px;
  background: #fff;
  border: 1px solid rgba(255, 120, 150, 0.2);
  padding: 0 14px;
  font-size: 14px;
}
.wish-btn {
  flex: none;
  padding: 0 18px;
  border-radius: 14px;
  font-size: 13.5px;
  font-weight: 800;
  color: #fff;
  background: linear-gradient(120deg, #ff8fb1, #ff3d68);
  box-shadow: 0 6px 16px rgba(255, 90, 130, 0.26);
}
.wish-progress {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}
.wp-bar {
  flex: 1;
  height: 6px;
  border-radius: 999px;
  background: rgba(255, 120, 150, 0.14);
  overflow: hidden;
}
.wp-bar span {
  display: block;
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #ffb0c6, #ff3d68);
  transition: width 0.3s;
}
.wp-text {
  font-size: 10.5px;
  color: #b08a99;
  font-weight: 700;
}
.wish-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.wish-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border-radius: 16px;
  background: #fff;
  border: 1px solid rgba(255, 150, 175, 0.14);
}
.wi-check {
  flex: none;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 1.5px solid rgba(255, 120, 150, 0.45);
  color: #fff;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.wish-item.done .wi-check {
  background: linear-gradient(140deg, #ff8fb1, #ff3d68);
  border-color: transparent;
}
.wi-text {
  flex: 1;
  font-size: 13.5px;
  color: #4a3038;
  line-height: 1.5;
}
.wish-item.done .wi-text {
  color: #b8a0aa;
  text-decoration: line-through;
}
.wi-del {
  flex: none;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  color: #cbb2bb;
  font-size: 16px;
}
</style>
