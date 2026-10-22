<script setup lang="ts">
// 统一玩法卡片（自绘 UI，不使用他人成品图）
import { computed } from 'vue'
import ModeGlyph from './ModeGlyph.vue'
import { styleOf } from '../utils/theme'

const props = withDefaults(
  defineProps<{
    title: string
    sub?: string
    locked?: boolean
    badge?: string
    count?: number
  }>(),
  { sub: '', locked: false, badge: '', count: 0 },
)

const style = computed(() => styleOf(props.title))
</script>

<template>
  <button
    class="mcard"
    :class="{ locked }"
    :style="{ '--from': style.from, '--to': style.to }"
  >
    <span class="mcard-ico">
      <ModeGlyph :name="style.glyph" />
    </span>
    <span class="mcard-main">
      <span class="mcard-title">
        {{ title }}
        <em v-if="badge" class="mcard-badge">{{ badge }}</em>
      </span>
      <span class="mcard-sub">{{ sub || (count ? count + ' 张卡片' : '开始体验') }}</span>
    </span>
    <span class="mcard-right">
      <svg v-if="!locked" viewBox="0 0 24 24" class="chev" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <path d="M9 5.5 15.5 12 9 18.5" />
      </svg>
      <span v-else class="lock">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round">
          <rect x="5" y="10.5" width="14" height="10" rx="3" />
          <path d="M8.4 10.5V8a3.6 3.6 0 0 1 7.2 0v2.5" />
        </svg>
      </span>
    </span>
  </button>
</template>

<style scoped>
.mcard {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 19px;
  background: linear-gradient(100deg, color-mix(in srgb, var(--from) 9%, #fff), #fff 52%);
  border: 1px solid color-mix(in srgb, var(--from) 16%, #fff);
  box-shadow: 0 6px 16px rgba(190, 120, 145, 0.1), inset 0 1px 0 #fff;
  transition: transform 0.14s ease, box-shadow 0.2s;
  text-align: left;
}
.mcard:active {
  transform: scale(0.975);
}
.mcard.locked {
  background: linear-gradient(100deg, color-mix(in srgb, var(--from) 5%, #fff), #fff 52%);
  border-color: color-mix(in srgb, var(--from) 10%, #fff);
}
.mcard-ico {
  flex: none;
  width: 42px;
  height: 42px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  background: linear-gradient(140deg, var(--from), var(--to));
  box-shadow: 0 6px 14px color-mix(in srgb, var(--from) 34%, transparent), inset 0 1px 0 rgba(255, 255, 255, 0.5);
}
.mcard.locked .mcard-ico {
  filter: saturate(0.85);
  opacity: 0.95;
  box-shadow: none;
}
.mcard-ico svg {
  width: 23px;
  height: 23px;
}
.mcard-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.mcard-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 15.5px;
  font-weight: 800;
  color: #4a2f38;
  letter-spacing: 0.01em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.mcard.locked .mcard-title {
  color: #5d444d;
}
.mcard-badge {
  flex: none;
  font-style: normal;
  font-size: 9.5px;
  font-weight: 800;
  line-height: 15px;
  padding: 0 6px;
  border-radius: 6px;
  color: #fff;
  background: linear-gradient(120deg, #ffb3c4, #ff6f95);
}
.mcard-sub {
  font-size: 11.5px;
  color: #b08a99;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.mcard-right {
  flex: none;
  width: 24px;
  display: flex;
  justify-content: flex-end;
  color: #e6bdcc;
}
.chev {
  width: 18px;
  height: 18px;
}
.lock {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: rgba(255, 120, 150, 0.1);
  color: #d986a1;
  display: flex;
  align-items: center;
  justify-content: center;
}
.lock svg {
  width: 13px;
  height: 13px;
}
</style>
