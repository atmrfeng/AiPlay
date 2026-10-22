// 内容库 store：内置模式 + 用户自定义模式 + VIP 状态 + 对局设置
import { defineStore } from 'pinia'
import { library } from '../data/library'
import { extraModes } from '../data/extras'
import { contentModes } from '../data/generated-content'
import { loadImage, saveImageWithKey } from '../utils/imgstore'
import { checkUnlocked, clearUnlock, verifyCode } from '../utils/vip'
import type { Card, GameKey, GameMode } from '../types'

const CUSTOM_KEY = 'cfc_user_modes'
const SETTINGS_KEY = 'cfc_settings'
const HISTORY_KEY = 'cfc_history'
const FAV_KEY = 'cfc_favorites'
const WISH_KEY = 'cfc_wishes'
const INTIMACY_KEY = 'cfc_intimacy'
const SPECIAL_KEY = 'cfc_special_days'
const ORDER_KEY = 'cfc_mode_order'

export interface UserMode {
  id: string
  game: GameKey
  title: string
  cards: Card[]
  createdAt: number
}

export interface HistoryItem {
  id: string
  game: GameKey
  modeTitle: string
  text: string
  image?: string
  at: number
  /** 对局上下文：多人模式记录玩家名，双人记录当前回合方 */
  who?: string
}

export interface Settings {
  /** 昵称（本机档案，无需后端） */
  nick1: string
  nick2: string
  sound: boolean
  vibrate: boolean
  /** 在一起的日期 YYYY-MM-DD */
  anniversary: string
  /** 走棋节奏 */
  pace: 'slow' | 'normal' | 'fast'
  /** 任务卡字号 */
  cardSize: 'small' | 'normal' | 'large'
}

export interface SpecialDay {
  id: string
  title: string
  date: string
}

export interface Wish {
  id: string
  text: string
  done: boolean
  at: number
}

function safeSet(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch (e: any) {
    throw new Error('本机存储空间不足，请先删除部分图片玩法或清空记录后重试')
  }
}

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

export const useLibraryStore = defineStore('library', {
  state: () => ({
    userModes: read<UserMode[]>(CUSTOM_KEY, []),
    vip: false,
    settings: read<Settings>(SETTINGS_KEY, { nick1: '男方', nick2: '女方', sound: true, vibrate: true, anniversary: '', pace: 'normal', cardSize: 'normal' }),
    intimacy: read<Record<string, string>>(INTIMACY_KEY, {}),
    specialDays: read<SpecialDay[]>(SPECIAL_KEY, []),
    modeOrder: read<string[]>(ORDER_KEY, []),
    wishes: read<Wish[]>(WISH_KEY, []),
    history: read<HistoryItem[]>(HISTORY_KEY, []),
    favorites: read<HistoryItem[]>(FAV_KEY, []),
  }),

  getters: {
    games: () => library,

    /** 某游戏全部模式（内置 + 自定义） */
    modesOf(state) {
      return (game: GameKey): GameMode[] => {
        const builtin = [
          ...(library[game]?.modes ?? []),
          ...extraModes.filter((m) => m.game === game),
          ...contentModes.filter((m) => m.game === game),
        ]
        const mine: GameMode[] = state.userModes
          .filter((m) => m.game === game)
          .map((m) => ({
            id: m.id,
            game: m.game,
            title: m.title,
            custom: false,
            price: 0,
            free: true,
            series: 'user',
            cards: m.cards,
          }))
        const rank = (id: string) => {
          const i = state.modeOrder.indexOf(id)
          return i < 0 ? 9999 : i
        }
        mine.sort((a, b) => rank(a.id) - rank(b.id))
        return [...builtin, ...mine]
      }
    },

    modeById(state) {
      return (id: string): GameMode | undefined => {
        for (const key of Object.keys(library) as GameKey[]) {
          // 内置库 + 补充库
          const hit = [
            ...(library[key]?.modes ?? []),
            ...extraModes.filter((m) => m.game === key),
            ...contentModes.filter((m) => m.game === key),
          ].find((m) => m.id === id)
          if (hit) return hit
        }
        const mine = state.userModes.find((m) => m.id === id)
        if (mine) return { id: mine.id, game: mine.game, title: mine.title, cards: mine.cards, free: true, series: 'user' }
        return undefined
      }
    },

    /** 是否已解锁：免费或已激活 VIP */
    isUnlocked(state) {
      return (mode: GameMode): boolean => !!state.vip || !!mode.free || !!mode.custom || (mode.price ?? 0) === 0
    },
  },

  actions: {
    toggleIntimacy(date: string) {
      const next = { ...this.intimacy }
      if (next[date] !== undefined) delete next[date]
      else next[date] = ''
      this.intimacy = next
      localStorage.setItem(INTIMACY_KEY, JSON.stringify(next))
    },
    setIntimacyNote(date: string, note: string) {
      this.intimacy = { ...this.intimacy, [date]: note.trim() }
      localStorage.setItem(INTIMACY_KEY, JSON.stringify(this.intimacy))
    },
    addSpecialDay(title: string, date: string) {
      const t = title.trim()
      if (!t || !date) return
      this.specialDays = [...this.specialDays, { id: 's-' + Date.now(), title: t, date }]
      localStorage.setItem(SPECIAL_KEY, JSON.stringify(this.specialDays))
    },
    removeSpecialDay(id: string) {
      this.specialDays = this.specialDays.filter((x) => x.id !== id)
      localStorage.setItem(SPECIAL_KEY, JSON.stringify(this.specialDays))
    },
    /** 全量导出：idb:// 图片会单独打包进 images 字段，避免 localStorage 爆掉 */
    async exportAll(): Promise<string> {
      const images: Record<string, string> = {}
      const refs = new Set<string>()
      const collect = (list: any[]) => {
        for (const item of list) {
          const img = item?.image
          if (typeof img === 'string' && img.startsWith('idb://')) refs.add(img)
        }
      }
      collect(this.userModes.flatMap((m) => m.cards))
      collect(this.history)
      collect(this.favorites)
      for (const ref of refs) images[ref.slice(6)] = await loadImage(ref)

      const data: Record<string, unknown> = {
        _app: 'couple-games',
        _version: 3,
        schemaVersion: 3,
        exportedAt: new Date().toISOString(),
        settings: this.settings,
        userModes: this.userModes,
        history: this.history,
        favorites: this.favorites,
        wishes: this.wishes,
        intimacy: this.intimacy,
        specialDays: this.specialDays,
        images,
      }
      return JSON.stringify(data, null, 2)
    },
    async importAll(raw: string): Promise<string> {
      const d = JSON.parse(raw)
      if (!d || d._app !== 'couple-games') throw new Error('不是本应用导出的文件')
      const version = Number(d.schemaVersion ?? d._version ?? 1)
      if (version > 3) throw new Error('备份来自更新版本，请升级后再导入')

      // 旧版备份：把 dataURL 图片转存 IndexedDB，保持新格式
      if (version < 3 && d.images && typeof d.images === 'object') {
        for (const [key, val] of Object.entries(d.images)) {
          if (typeof val === 'string') await saveImageWithKey(key, val as string)
        }
      }
      if (d.settings) { this.settings = { ...this.settings, ...d.settings }; this.persistSettings() }
      if (Array.isArray(d.userModes)) { this.userModes = d.userModes; localStorage.setItem(CUSTOM_KEY, JSON.stringify(this.userModes)) }
      if (Array.isArray(d.history)) { this.history = d.history; localStorage.setItem(HISTORY_KEY, JSON.stringify(this.history)) }
      if (Array.isArray(d.favorites)) { this.favorites = d.favorites; localStorage.setItem(FAV_KEY, JSON.stringify(this.favorites)) }
      if (Array.isArray(d.wishes)) { this.wishes = d.wishes; localStorage.setItem(WISH_KEY, JSON.stringify(this.wishes)) }
      if (d.intimacy) { this.intimacy = d.intimacy; localStorage.setItem(INTIMACY_KEY, JSON.stringify(this.intimacy)) }
      if (Array.isArray(d.specialDays)) { this.specialDays = d.specialDays; localStorage.setItem(SPECIAL_KEY, JSON.stringify(this.specialDays)) }
      return '导入完成'
    },
    updateUserMode(id: string, patch: { title?: string; cards?: Card[] }) {
      this.userModes = this.userModes.map((m) => (m.id === id ? { ...m, ...patch } : m))
      localStorage.setItem(CUSTOM_KEY, JSON.stringify(this.userModes))
    },
    addWish(text: string) {
      const t = text.trim()
      if (!t) return
      this.wishes = [{ id: 'w-' + Date.now(), text: t, done: false, at: Date.now() }, ...this.wishes]
      localStorage.setItem(WISH_KEY, JSON.stringify(this.wishes))
    },
    toggleWish(id: string) {
      this.wishes = this.wishes.map((w) => (w.id === id ? { ...w, done: !w.done } : w))
      localStorage.setItem(WISH_KEY, JSON.stringify(this.wishes))
    },
    removeWish(id: string) {
      this.wishes = this.wishes.filter((w) => w.id !== id)
      localStorage.setItem(WISH_KEY, JSON.stringify(this.wishes))
    },
    addHistory(item: Omit<HistoryItem, 'id' | 'at'>) {
      const record: HistoryItem = { ...item, id: 'h-' + Date.now() + '-' + Math.floor(Math.random() * 1000), at: Date.now() }
      this.history = [record, ...this.history].slice(0, 60)
      localStorage.setItem(HISTORY_KEY, JSON.stringify(this.history))
      return record
    },
    clearHistory() {
      this.history = []
      localStorage.removeItem(HISTORY_KEY)
    },
    isFavorite(text: string, game?: GameKey) {
      return this.favorites.some((f) => f.text === text && (!game || f.game === game))
    },
    toggleFavorite(item: Omit<HistoryItem, 'id' | 'at'>) {
      const hit = this.favorites.find((f) => f.text === item.text && f.game === item.game)
      if (hit) this.favorites = this.favorites.filter((f) => f.id !== hit.id)
      else this.favorites = [{ ...item, id: 'f-' + Date.now(), at: Date.now() }, ...this.favorites]
      localStorage.setItem(FAV_KEY, JSON.stringify(this.favorites))
    },
    async refreshVip() {
      this.vip = await checkUnlocked()
    },
    async activateVip(code: string) {
      const r = await verifyCode(code)
      if (r.ok) this.vip = true
      return r
    },
    deactivateVip() {
      this.vip = false
      clearUnlock()
    },
    saveSettings(patch: Partial<Settings>) {
      this.settings = { ...this.settings, ...patch }
      this.persistSettings()
    },
    persistSettings() {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings))
    },
    addUserMode(mode: Omit<UserMode, 'id' | 'createdAt'>) {
      const item: UserMode = { ...mode, id: `u-${mode.game}-${Date.now()}`, createdAt: Date.now() }
      this.userModes.unshift(item)
      this.modeOrder = [item.id, ...this.modeOrder.filter((x) => x !== item.id)]
      safeSet(ORDER_KEY, JSON.stringify(this.modeOrder))
      safeSet(CUSTOM_KEY, JSON.stringify(this.userModes))
      return item
    },
    removeUserMode(id: string) {
      this.userModes = this.userModes.filter((m) => m.id !== id)
      this.modeOrder = this.modeOrder.filter((x) => x !== id)
      safeSet(ORDER_KEY, JSON.stringify(this.modeOrder))
      safeSet(CUSTOM_KEY, JSON.stringify(this.userModes))
    },
    /** 按给定顺序重排一组自制玩法（仅调整这些 id 的相对位置） */
    reorderGroup(ids: string[]) {
      const slots: number[] = []
      this.modeOrder.forEach((id, i) => {
        if (ids.includes(id)) slots.push(i)
      })
      if (!slots.length) return
      const next = [...this.modeOrder]
      const ordered = ids.filter((id) => this.modeOrder.includes(id))
      slots.forEach((slot, i) => {
        if (ordered[i]) next[slot] = ordered[i]
      })
      this.modeOrder = next
      safeSet(ORDER_KEY, JSON.stringify(next))
    },
    /** 调整自定义玩法顺序：dir = -1 上移 / 1 下移 */
    moveUserMode(id: string, dir: -1 | 1) {
      const ids = this.userModes.map((m) => m.id)
      const order = [
        ...this.modeOrder.filter((x) => ids.includes(x)),
        ...ids.filter((x) => !this.modeOrder.includes(x)),
      ]
      const i = order.indexOf(id)
      const j = i + dir
      if (i < 0 || j < 0 || j >= order.length) return
      ;[order[i], order[j]] = [order[j], order[i]]
      this.modeOrder = order
      safeSet(ORDER_KEY, JSON.stringify(order))
    },
  },
})
