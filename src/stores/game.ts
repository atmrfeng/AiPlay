// 对局 store：飞行棋状态 + localStorage 存档（刷新可续局）
import { defineStore } from 'pinia'
import { buildBoard, getBoard } from '../data/boards'
import type { Card, GameMode, GameState } from '../types'

const SAVE_KEY = 'cfc_board_save'

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const COLORS = ['#5b8def', '#ff6b9d', '#3fbfad', '#f0a93b', '#7c6cf6', '#e2557b']

/** 每个格子都有内容：起点 + 任务格 + 终点，任务格数量 = 卡片数（上限 46） */
function newGame(mode: GameMode, names: string[]): GameState {
  const cards = shuffle(mode.cards.filter((c) => c.text || c.image)).slice(0, 46)
  const cells = Math.max(cards.length, 8)
  const board = buildBoard(cells + 2)
  const tiles: (Card | null)[] = new Array(board.path.length).fill(null)
  cards.forEach((card, i) => {
    if (i + 1 < tiles.length - 1) tiles[i + 1] = card
  })
  const players = names.map((n, i) => ({
    id: i === 0 ? 'male' : i === 1 ? 'female' : 'p' + i,
    gender: (i === 0 ? 'm' : i === 1 ? 'f' : undefined) as 'm' | 'f' | undefined,
    name: (n || '').trim() || (i === 0 ? '男方' : i === 1 ? '女方' : '玩家' + (i + 1)),
    color: COLORS[i % COLORS.length],
    step: 0,
  }))
  return {
    board,
    modeId: mode.id,
    players,
    turn: Math.floor(Math.random() * players.length),
    phase: 'idle',
    tiles,
    over: false,
    winner: null,
  }
}

export const useGameStore = defineStore('game', {
  state: () => ({
    game: null as GameState | null,
    modeTitle: '',
    dice: 1,
    rolling: false,
    taskCard: null as Card | null,
    showTask: false,
  }),

  getters: {
    maxStep(state): number {
      return state.game ? state.game.board.path.length - 1 : 0
    },
    cellCount(state): number {
      return state.game ? state.game.board.path.length : 0
    },
  },

  actions: {
    start(mode: GameMode, name1: string, name2: string) {
      this.startWith(mode, [name1, name2])
    },
    /** 多人开局（多人模式使用） */
    startWith(mode: GameMode, names: string[]) {
      this.game = newGame(mode, names)
      this.modeTitle = mode.title
      this.taskCard = null
      this.showTask = false
      this.dice = 1
      this.persist()
    },
    persist() {
      if (this.game) localStorage.setItem(SAVE_KEY, JSON.stringify({ game: this.game, modeTitle: this.modeTitle }))
      else localStorage.removeItem(SAVE_KEY)
    },
    restore(): boolean {
      try {
        const raw = localStorage.getItem(SAVE_KEY)
        if (!raw) return false
        const saved = JSON.parse(raw)
        const g = saved.game
        if (!g || g.over) return false
        // 兼容旧存档：boardId → board 对象
        if (!g.board && g.boardId) {
          g.board = getBoard(g.boardId)
          delete g.boardId
        }
        this.game = g
        this.modeTitle = saved.modeTitle || ''
        return true
      } catch {
        return false
      }
    },
    clearSave() {
      localStorage.removeItem(SAVE_KEY)
      this.game = null
    },

    roll(): number {
      if (!this.game || this.game.over || this.rolling) return 0
      this.rolling = true
      this.game.phase = 'rolling'
      const n = Math.floor(Math.random() * 6) + 1
      this.dice = n
      return n
    },
    finishRoll() {
      this.rolling = false
    },

    stepForward(): boolean {
      if (!this.game) return false
      const player = this.game.players[this.game.turn]
      if (player.step >= this.maxStep) return false
      player.step++
      this.persist()
      return player.step < this.maxStep
    },

    settle(): 'won' | 'task' | 'pass' {
      if (!this.game) return 'pass'
      const player = this.game.players[this.game.turn]
      if (player.step >= this.maxStep) {
        this.game.over = true
        this.game.winner = player.id
        this.game.phase = 'won'
        this.persist()
        return 'won'
      }
      const card = this.game.tiles[player.step]
      if (card && (card.text || card.image)) {
        this.taskCard = card
        this.showTask = true
        this.game.phase = 'task'
        this.persist()
        return 'task'
      }
      this.nextTurn()
      return 'pass'
    },

    nextTurn() {
      if (!this.game) return
      this.showTask = false
      this.taskCard = null
      this.game.turn = (this.game.turn + 1) % this.game.players.length
      this.game.phase = 'idle'
      this.persist()
    },

    skipTask() {
      if (!this.game) return
      this.showTask = false
      this.taskCard = null
      this.game.phase = 'idle'
      this.nextTurn()
    },
  },
})
