<script setup lang="ts">
// 玩法总入口：所有游戏集中一页
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import TabIcon from '../components/TabIcon.vue'
import { useLibraryStore } from '../stores/packs'
import { useGameStore } from '../stores/game'
import { library } from '../data/library'
import type { GameKey } from '../types'

const router = useRouter()
const lib = useLibraryStore()
const gs = useGameStore()

const GAMES: { key: GameKey; label: string; desc: string; from: string; to: string; icon: 'plane' | 'heart' | 'chat' | 'cards' | 'me' | 'dice' | 'wheel' | 'pose' | 'traffic' }[] = [
  { key: 'flying', label: '情侣飞行棋', desc: '掷骰前进 · 落格抽任务', from: '#FF6B9D', to: '#FFB3C7', icon: 'plane' },
  { key: 'mine', label: '情侣扫雷', desc: '翻格有惊喜 · 踩雷惩罚', from: '#7C6CF6', to: '#B3A8FF', icon: 'heart' },
  { key: 'truth', label: '真心话大冒险', desc: '转瓶选人 · 抽题互动', from: '#4A9BFF', to: '#9AC8FF', icon: 'chat' },
  { key: 'wheel', label: '情侣大转盘', desc: '转出今晚的小任务', from: '#F0A93B', to: '#FFD482', icon: 'wheel' },
  { key: 'dice', label: '情侣骰子', desc: '动作 × 部位 双骰', from: '#3FBFAD', to: '#8FE3D6', icon: 'dice' },
  { key: 'pose', label: '情侣卡牌', desc: '翻牌抽卡 · 图片或文字', from: '#E2557B', to: '#FFA3B4', icon: 'pose' },
  { key: 'traffic', label: '红绿灯', desc: '节奏互动小游戏', from: '#5EC26A', to: '#A8E6A3', icon: 'traffic' },
]

const saveInfo = computed(() => {
  if (!gs.game || gs.game.over) return null
  const ps = gs.game.players
  const leader = ps.reduce((a, b) => (b.step > a.step ? b : a), ps[0])
  return { title: gs.modeTitle || '未命名对局', count: ps.length, leader: leader?.name || '', leaderStep: leader?.step ?? 0 }
})

onMounted(() => {
  // 大厅也要能显示续局卡：从存档恢复一次
  if (!gs.game) gs.restore()
})

function modeCount(key: GameKey) {
  return lib.modesOf(key).filter((m) => !m.custom).length
}

const totalModes = computed(() => (Object.keys(library) as GameKey[]).reduce((s, k) => s + modeCount(k), 0))
</script>

<template>
  <div class="page games-page">
    <button class="search-entry" @click="router.push('/search')">
      <span class="se-ico">🔍</span>
      <span class="se-text">搜索玩法 / 卡片内容</span>
      <span class="se-go">›</span>
    </button>

    <button v-if="saveInfo" class="resume" @click="router.push('/g/flying/play/' + gs.game!.modeId)">
      <span class="rs-tag">继续对局</span>
      <span class="rs-title">{{ saveInfo.title }}</span>
      <span class="rs-meta">
        {{ saveInfo.count }} 人对局 · 领先 {{ saveInfo.leader }} {{ saveInfo.leaderStep }} 格
      </span>
    </button>

    <div class="games-grid">
      <button
        v-for="g in GAMES"
        :key="g.key"
        class="gcard"
        :style="{ '--from': g.from, '--to': g.to }"
        @click="router.push('/g/' + g.key)"
      >
        <span class="gcard-ico"><TabIcon :name="g.icon" /></span>
        <span class="gcard-name">{{ g.label }}</span>
        <span class="gcard-desc">{{ g.desc }}</span>
        <span class="gcard-count">{{ modeCount(g.key) }} 种玩法</span>
      </button>
      <button class="gcard" :style="{ '--from': '#7C8CFF', '--to': '#B9C4FF' }" @click="router.push('/studio')">
        <span class="gcard-ico"><TabIcon name="cards" /></span>
        <span class="gcard-name">自制玩法</span>
        <span class="gcard-desc">新建 / 导入 / 排序</span>
        <span class="gcard-count">{{ lib.userModes.length }} 个自制</span>
      </button>
    </div>

    <div class="vip-strip" :class="{ on: lib.vip }" @click="router.push('/me')">
      <div>
        <div class="vs-title">{{ lib.vip ? '全部内容已解锁' : '识别码解锁全部玩法' }}</div>
        <div class="vs-sub">{{ lib.vip ? '无需登录 · 本机长期有效' : '一次输入，长期有效' }}</div>
      </div>
      <span class="vs-btn">{{ lib.vip ? '查看' : '去解锁' }}</span>
    </div>

    <p class="games-foot">共 {{ totalModes }} 种玩法 · 内容持续更新</p>
  </div>
</template>

<style scoped>
.games-page {
  padding: 8px 16px 26px;
}
.resume {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 3px;
  padding: 14px 16px;
  margin-bottom: 14px;
  border-radius: 20px;
  background: linear-gradient(120deg, #fff, #fff1f5);
  border: 1px solid rgba(255, 120, 150, 0.18);
  box-shadow: 0 8px 20px rgba(255, 140, 170, 0.12);
}
.rs-tag {
  font-size: 10px;
  font-weight: 800;
  color: #fff;
  background: linear-gradient(120deg, #ff8fb1, #ff3d68);
  padding: 1px 8px;
  border-radius: 6px;
}
.rs-title {
  font-size: 15px;
  font-weight: 800;
  color: #4a2f38;
}
.rs-meta {
  font-size: 11px;
  color: #b08a99;
}
.search-entry {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 9px;
  height: 44px;
  padding: 0 14px;
  margin-bottom: 12px;
  border-radius: 14px;
  background: #fff;
  border: 1px solid rgba(255, 120, 150, 0.18);
  box-shadow: 0 6px 16px rgba(255, 150, 180, 0.08);
  text-align: left;
}
.se-ico {
  font-size: 14px;
}
.se-text {
  flex: 1;
  font-size: 12.5px;
  color: #b08a99;
}
.se-go {
  color: #e6bdcc;
  font-size: 17px;
}
.games-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.gcard {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 3px;
  padding: 16px 14px 14px;
  border-radius: 22px;
  background: linear-gradient(155deg, color-mix(in srgb, var(--from) 13%, #fff), #fff 58%);
  border: 1px solid color-mix(in srgb, var(--from) 18%, #fff);
  box-shadow: 0 8px 20px rgba(190, 120, 145, 0.1);
  text-align: left;
  transition: transform 0.15s;
  overflow: hidden;
}
.gcard:active {
  transform: scale(0.97);
}
.gcard-ico {
  width: 42px;
  height: 42px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  background: linear-gradient(140deg, var(--from), var(--to));
  box-shadow: 0 6px 14px color-mix(in srgb, var(--from) 34%, transparent), inset 0 1px 0 rgba(255, 255, 255, 0.45);
  margin-bottom: 6px;
}
.gcard-ico :deep(svg) {
  width: 23px;
  height: 23px;
}
.gcard-name {
  font-size: 15px;
  font-weight: 900;
  color: #4a2f38;
}
.gcard-desc {
  font-size: 10.5px;
  color: #a8838f;
  line-height: 1.4;
}
.gcard-count {
  margin-top: 6px;
  font-size: 10px;
  font-weight: 800;
  color: color-mix(in srgb, var(--from) 78%, #7a4356);
  background: color-mix(in srgb, var(--from) 14%, #fff);
  padding: 2px 8px;
  border-radius: 7px;
}
.gcard.import {
  background: linear-gradient(150deg, #fff, #fff8fb);
  border: 1.5px dashed rgba(255, 140, 170, 0.45);
}
.gcard-ico.plus {
  background: #fff;
  color: #ff7fa3;
  border: 1.5px dashed rgba(255, 140, 170, 0.6);
  box-shadow: none;
  font-size: 22px;
  font-weight: 700;
}
.gcard-count.plain {
  color: #b08a99;
  background: rgba(255, 140, 170, 0.08);
}
.vip-strip {
  margin-top: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 15px 18px;
  border-radius: 20px;
  background: linear-gradient(120deg, #fff2f6, #ffe3ec);
  box-shadow: 0 8px 20px rgba(255, 150, 180, 0.12);
}
.vip-strip.on {
  background: linear-gradient(120deg, #fff9ec, #ffedcd);
}
.vs-title {
  font-size: 14px;
  font-weight: 900;
  color: #6b4552;
}
.vs-sub {
  margin-top: 2px;
  font-size: 10.5px;
  color: #b08a99;
}
.vs-btn {
  margin-left: auto;
  flex: none;
  padding: 7px 15px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 800;
  color: #fff;
  background: linear-gradient(120deg, #ff8fb1, #ff3d68);
  box-shadow: 0 5px 14px rgba(255, 90, 130, 0.28);
}
.games-foot {
  margin-top: 16px;
  text-align: center;
  font-size: 10.5px;
  color: #cbb2bb;
}
</style>
