<script setup lang="ts">
// 小窝：档案 / 识别码 / 自制玩法入口 / 数据备份 / 偏好
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useLibraryStore } from '../stores/packs'
import { useGameStore } from '../stores/game'
import { confirmDialog } from '../utils/confirm'
import { library } from '../data/library'
import type { GameKey } from '../types'

const lib = useLibraryStore()
const router = useRouter()
const gs = useGameStore()

const showEdit = ref(false)
const n1 = ref(lib.settings.nick1)
const n2 = ref(lib.settings.nick2)
const showVip = ref(false)
const code = ref('')
const codeError = ref('')
const verifying = ref(false)
const dataInput = ref<HTMLInputElement | null>(null)
const dataMsg = ref('')
const showDisclaimer = ref(false)

const DISCLAIMER = [
  {
    t: '一、应用性质',
    d: '本应用是一款运行于浏览器本地的情侣互动小游戏合集，所有内容、数据均保存在您自己的设备（浏览器 localStorage 与 IndexedDB）中，开发者不收集、不上传、不存储任何用户信息。',
  },
  {
    t: '二、内容用途与对象',
    d: '应用内部分玩法（如情侣卡牌、高阶任务等）包含成人向的亲密互动内容，仅供已成年的、处于稳定亲密关系中的双方，在彼此知情、自愿、舒适的前提下使用。未满 18 周岁者请勿使用本应用。',
  },
  {
    t: '三、自愿与边界',
    d: '所有任务、惩罚与挑战均属游戏性质。执行前请务必与伴侣充分沟通，尊重对方意愿；任何一方都有权随时拒绝执行某项内容，且拒绝不应受到指责。请勿将游戏内容用于强迫、威胁、伤害他人的场合。',
  },
  {
    t: '四、健康与安全',
    d: '请理性游戏，避免过度沉迷影响正常生活与休息。涉及身体接触的任务请量力而行，注意人身安全与卫生；如您或伴侣存在健康方面顾虑，请优先咨询专业人士。',
  },
  {
    t: '五、内容来源与版权',
    d: '内置玩法内容整理自网络公开资源，仅供学习与个人娱乐，不代表开发者立场。您通过「自制玩法 / 内容导入」功能添加的内容由您自行负责，请勿导入侵犯他人版权或违反法律法规的信息。',
  },
  {
    t: '六、免责条款',
    d: '本应用按“现状”提供，开发者不对内容的适用性、完整性作任何保证。因使用或滥用本应用内容导致的任何直接或间接后果（包括但不限于感情纠纷、身体伤害、法律争议），均由使用者自行承担。',
  },
  {
    t: '七、其他',
    d: '继续使用本应用即表示您已阅读、理解并同意以上全部内容。如不同意，请停止使用并清除本地数据（小窝 → 数据与备份 → 清除）。',
  },
]

const totals = computed(() => {
  let modes = 0
  let cards = 0
  for (const key of Object.keys(library) as GameKey[]) {
    for (const m of library[key].modes) {
      if (!m.custom) modes++
      cards += m.cards.length
    }
  }
  return { modes, cards }
})

function saveProfile() {
  lib.saveSettings({ nick1: n1.value.trim() || '男方', nick2: n2.value.trim() || '女方' })
  showEdit.value = false
}

async function clearSave() {
  const ok = await confirmDialog({ title: '清除对局存档', text: '当前未完成的对局会被清空，无法恢复。', okText: '清除', danger: true })
  if (ok) gs.clearSave()
}

async function submitVip() {
  if (verifying.value) return
  verifying.value = true
  const r = await lib.activateVip(code.value)
  verifying.value = false
  if (r.ok) {
    showVip.value = false
    code.value = ''
    codeError.value = ''
  } else {
    codeError.value = r.message || '识别码不正确，请检查后重试'
  }
}

async function doExportAll() {
  dataMsg.value = '正在打包…'
  try {
    const json = await lib.exportAll()
    const blob = new Blob([json], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'couple-data-' + new Date().toISOString().slice(0, 10) + '.json'
    a.click()
    URL.revokeObjectURL(a.href)
    dataMsg.value = '已导出全部数据（含图片）'
  } catch {
    dataMsg.value = '导出失败，请重试'
  }
  window.setTimeout(() => (dataMsg.value = ''), 2400)
}

function pickData() {
  dataInput.value?.click()
}

async function onDataFile(e: Event) {
  const input = e.target as HTMLInputElement
  const f = input.files?.[0]
  if (!f) return
  try {
    lib.importAll(await f.text())
    dataMsg.value = '导入完成，已恢复全部数据'
  } catch (err: any) {
    dataMsg.value = '导入失败：' + (err?.message || '文件格式不正确')
  }
  input.value = ''
  window.setTimeout(() => (dataMsg.value = ''), 2600)
}
</script>

<template>
  <div class="page me-page">
    <div class="profile-card">
      <div class="pc-avatar">🐻</div>
      <div class="pc-info">
        <div class="pc-name">{{ lib.settings.nick1 }} & {{ lib.settings.nick2 }}</div>
        <div class="pc-sub">{{ lib.vip ? '已解锁全部内容' : '本机档案 · 无需登录' }}</div>
      </div>
      <button class="pc-edit" @click="showEdit = true">编辑</button>
    </div>

    <div class="stats">
      <div class="stat">
        <div class="st-num">{{ totals.modes }}</div>
        <div class="st-label">玩法模式</div>
      </div>
      <div class="stat">
        <div class="st-num">{{ totals.cards }}</div>
        <div class="st-label">内容卡片</div>
      </div>
      <div class="stat">
        <div class="st-num">{{ lib.userModes.length }}</div>
        <div class="st-label">自制玩法</div>
      </div>
    </div>

    <div class="me-cols">
      <div class="me-col">
        <div class="group">
          <div class="g-title">识别码</div>
          <div class="cell" @click="!lib.vip && (showVip = true)">
            <span class="c-label">解锁状态</span>
            <span class="c-value" :class="{ on: lib.vip }">{{ lib.vip ? '已解锁' : '未解锁 · 点击输入识别码' }}</span>
          </div>
          <div v-if="lib.vip" class="cell" @click="lib.deactivateVip()">
            <span class="c-label">取消解锁</span>
            <span class="c-value">退出</span>
          </div>
        </div>

        <div class="group">
          <div class="g-title">自制玩法</div>
          <div class="cell" @click="router.push('/studio')">
            <span class="c-label">管理自制玩法</span>
            <span class="c-value">{{ lib.userModes.length }} 个 · 去管理</span>
          </div>
          <div class="c-empty">新建、导入、排序与删除都在「自制玩法」里；这里只保留入口与备份。</div>
        </div>

        <div class="group">
          <div class="g-title">免责声明</div>
          <div class="cell" @click="showDisclaimer = true">
            <span class="c-label">查看完整声明</span>
            <span class="c-value">重要 · 请阅读</span>
          </div>
          <div class="c-empty">本应用为纯前端工具，内容仅供成年人情侣在双方自愿的前提下娱乐使用。</div>
        </div>
      </div>

      <div class="me-col">
        <div class="group">
          <div class="g-title">数据与备份</div>
          <div class="cell" @click="doExportAll">
            <span class="c-label">导出全部数据</span>
            <span class="c-value">JSON</span>
          </div>
          <div class="cell" @click="pickData">
            <span class="c-label">导入全部数据</span>
            <span class="c-value">恢复 / 换机</span>
          </div>
          <input ref="dataInput" type="file" accept=".json,application/json" hidden @change="onDataFile" />
          <div class="c-empty">包含：识别码状态、自制玩法、记录、收藏、心愿、日历、偏好设置；格式说明见 docs/内容导入说明.md</div>
        </div>

        <div class="group">
          <div class="g-title">玩法偏好</div>
          <div class="cell">
            <span class="c-label">走棋节奏</span>
            <div class="choices">
              <button
                v-for="p in [{ k: 'slow', t: '慢' }, { k: 'normal', t: '标准' }, { k: 'fast', t: '快' }]"
                :key="p.k"
                class="choice"
                :class="{ on: lib.settings.pace === p.k }"
                @click="lib.saveSettings({ pace: p.k as any })"
              >
                {{ p.t }}
              </button>
            </div>
          </div>
          <div class="cell">
            <span class="c-label">任务卡字号</span>
            <div class="choices">
              <button
                v-for="p in [{ k: 'small', t: '小' }, { k: 'normal', t: '标准' }, { k: 'large', t: '大' }]"
                :key="p.k"
                class="choice"
                :class="{ on: lib.settings.cardSize === p.k }"
                @click="lib.saveSettings({ cardSize: p.k as any })"
              >
                {{ p.t }}
              </button>
            </div>
          </div>
          <div class="cell">
            <span class="c-label">音效</span>
            <label class="switch">
              <input type="checkbox" :checked="lib.settings.sound" @change="lib.saveSettings({ sound: ($event.target as HTMLInputElement).checked })" />
              <span class="knob"></span>
            </label>
          </div>
          <div class="cell">
            <span class="c-label">震动</span>
            <label class="switch">
              <input type="checkbox" :checked="lib.settings.vibrate" @change="lib.saveSettings({ vibrate: ($event.target as HTMLInputElement).checked })" />
              <span class="knob"></span>
            </label>
          </div>
        </div>

        <div class="group">
          <div class="g-title">其他</div>
          <div class="cell" @click="clearSave">
            <span class="c-label">清除对局存档</span>
            <span class="c-value">清空</span>
          </div>
          <div class="cell">
            <span class="c-label">版本</span>
            <span class="c-value">v1.0 · 纯前端</span>
          </div>
        </div>
      </div>
    </div>

    <p class="me-foot">内容仅用于情侣互动娱乐 · 请理性使用</p>

    <div v-if="showEdit" class="sheet-mask" @click.self="showEdit = false">
      <div class="sheet">
        <div class="sheet-title">你们的称呼</div>
        <div class="sheet-text">仅保存在本机，用于任务文案里的角色替换。</div>
        <input v-model="n1" class="input" maxlength="8" placeholder="男方昵称" />
        <input v-model="n2" class="input" maxlength="8" placeholder="女方昵称" />
        <div class="sheet-foot">
          <button class="btn btn-ghost" @click="showEdit = false">取消</button>
          <button class="btn btn-primary" @click="saveProfile">保存</button>
        </div>
      </div>
    </div>

    <div v-if="showVip" class="sheet-mask" @click.self="showVip = false">
      <div class="sheet">
        <div class="sheet-title">输入识别码</div>
        <div class="sheet-text">解锁全部玩法与内容，长期有效。</div>
        <input v-model="code" class="input" inputmode="numeric" maxlength="12" placeholder="请输入识别码" @keyup.enter="submitVip" />
        <div v-if="codeError" class="vip-error">{{ codeError }}</div>
        <div class="sheet-foot">
          <button class="btn btn-ghost" @click="showVip = false">取消</button>
          <button class="btn btn-primary" :disabled="verifying" @click="submitVip">{{ verifying ? '校验中…' : '解锁' }}</button>
        </div>
      </div>
    </div>

    <div v-if="showDisclaimer" class="sheet-mask" @click.self="showDisclaimer = false">
      <div class="sheet disclaimer-sheet">
        <div class="sheet-title">免责声明</div>
        <div class="disclaimer-body">
          <section v-for="sec in DISCLAIMER" :key="sec.t">
            <h4>{{ sec.t }}</h4>
            <p>{{ sec.d }}</p>
          </section>
          <p class="d-foot">最后更新：2026-10-22</p>
        </div>
        <div class="sheet-foot">
          <button class="btn btn-primary" @click="showDisclaimer = false">我已阅读并同意</button>
        </div>
      </div>
    </div>

    <div v-if="dataMsg" class="toast show">{{ dataMsg }}</div>
  </div>
</template>

<style scoped>
.me-page {
  padding: 10px 16px 24px;
}
.profile-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px;
  border-radius: 24px;
  background: linear-gradient(130deg, #fff, #fff2f6);
  box-shadow: 0 12px 30px rgba(255, 140, 170, 0.16);
}
.pc-avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: linear-gradient(140deg, #ffe6b8, #ffc98a);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 30px;
  box-shadow: inset 0 0 0 2px #fff;
}
.pc-info {
  flex: 1;
  min-width: 0;
}
.pc-name {
  font-size: 16px;
  font-weight: 900;
  color: #5d3743;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.pc-sub {
  margin-top: 3px;
  font-size: 11.5px;
  color: #b08a99;
}
.pc-edit {
  flex: none;
  padding: 6px 14px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 800;
  color: #fff;
  background: linear-gradient(120deg, #ffb0c6, #ff5c88);
}
.stats {
  display: flex;
  gap: 10px;
  margin-top: 12px;
}
.stat {
  flex: 1;
  background: #fff;
  border-radius: 18px;
  padding: 12px 8px;
  text-align: center;
  box-shadow: 0 8px 20px rgba(255, 150, 180, 0.12);
}
.st-num {
  font-size: 18px;
  font-weight: 900;
  color: #e2264f;
}
.st-label {
  margin-top: 2px;
  font-size: 10.5px;
  color: #b08a99;
}
.group {
  margin-top: 16px;
  background: #fff;
  border-radius: 20px;
  padding: 6px 14px;
  box-shadow: 0 8px 20px rgba(255, 150, 180, 0.1);
}
.g-title {
  font-size: 11.5px;
  font-weight: 800;
  color: #c9a3b1;
  padding: 10px 2px 4px;
  letter-spacing: 0.06em;
}
.cell {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 13px 2px;
  border-top: 1px solid rgba(255, 140, 170, 0.12);
  font-size: 13.5px;
}
.g-title + .cell {
  border-top: none;
}
.c-label {
  flex: 1;
  color: #5d3743;
  font-weight: 600;
}
.c-value {
  font-size: 12px;
  color: #b08a99;
}
.c-value.on {
  color: #e2264f;
  font-weight: 700;
}
.c-edit {
  font-size: 11.5px;
  color: #5b7bd5;
  padding: 3px 8px;
  border-radius: 8px;
  background: rgba(91, 123, 213, 0.08);
}
.c-del {
  font-size: 11.5px;
  color: #e2587f;
  padding: 3px 8px;
  border-radius: 8px;
  background: rgba(255, 90, 130, 0.08);
}
.c-empty {
  font-size: 12px;
  color: #c4a8b3;
  padding: 6px 2px 14px;
  line-height: 1.6;
}
.choices {
  display: flex;
  gap: 4px;
  padding: 2px;
  border-radius: 999px;
  background: rgba(255, 120, 150, 0.09);
}
.choice {
  padding: 4px 11px;
  border-radius: 999px;
  font-size: 11.5px;
  font-weight: 700;
  color: #b08a99;
}
.choice.on {
  background: #fff;
  color: #e2264f;
  box-shadow: 0 2px 6px rgba(255, 120, 150, 0.22);
}
.disclaimer-sheet {
  max-width: 460px;
}
.disclaimer-body {
  max-height: 52vh;
  overflow-y: auto;
  text-align: left;
  padding-right: 4px;
  margin-top: 12px;
}
.disclaimer-body section {
  margin-bottom: 12px;
}
.disclaimer-body h4 {
  font-size: 12.5px;
  font-weight: 800;
  color: #6b4552;
  margin-bottom: 3px;
}
.disclaimer-body p {
  font-size: 11.5px;
  line-height: 1.8;
  color: #8d6a78;
}
.d-foot {
  font-size: 10px;
  color: #c4a8b3;
  text-align: center;
}
.switch {
  position: relative;
  width: 44px;
  height: 26px;
  display: inline-block;
}
.switch input {
  display: none;
}
.knob {
  position: absolute;
  inset: 0;
  border-radius: 999px;
  background: #f0dde3;
  transition: background 0.22s;
}
.knob::after {
  content: "";
  position: absolute;
  width: 20px;
  height: 20px;
  left: 3px;
  top: 3px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 2px 6px rgba(180, 100, 130, 0.3);
  transition: transform 0.22s;
}
.switch input:checked + .knob {
  background: linear-gradient(120deg, #ff8fb1, #ff3d68);
}
.switch input:checked + .knob::after {
  transform: translateX(18px);
}
.me-foot {
  margin-top: 18px;
  text-align: center;
  font-size: 10.5px;
  color: #cbb2bb;
}
.chip-row {
  display: flex;
  gap: 8px;
  margin-top: 14px;
  flex-wrap: wrap;
  justify-content: center;
}
.chip {
  padding: 7px 14px;
  border-radius: 999px;
  font-size: 12.5px;
  font-weight: 700;
  color: #a8838f;
  background: #fff5f8;
  border: 1px solid rgba(255, 140, 170, 0.2);
}
.chip.on {
  color: #fff;
  background: linear-gradient(120deg, #ff8fb1, #ff3d68);
  border-color: transparent;
  box-shadow: 0 4px 12px rgba(255, 90, 130, 0.26);
}
.vip-error {
  margin-top: 8px;
  font-size: 12px;
  color: #e8384f;
}
</style>
