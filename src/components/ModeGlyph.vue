<script setup lang="ts">
// 自绘图标集：统一线性风格，避免直接使用他人素材
import type { GlyphName } from '../utils/theme'

defineProps<{ name: GlyphName }>()
</script>

<template>
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
    <template v-if="name === 'heart'">
      <path d="M12 20.3C7.2 17.2 4.3 14.4 4.3 11.2A4.45 4.45 0 0 1 12 8.2a4.45 4.45 0 0 1 7.7 3c0 3.2-2.9 6-7.7 9.1Z" />
    </template>
    <template v-else-if="name === 'flame'">
      <path d="M12 3c3.2 3.4 5.6 6 5.6 9.3a5.6 5.6 0 0 1-11.2 0C6.4 9 8.8 6.4 12 3Z" />
      <path d="M12 20.2a2.6 2.6 0 0 0 2.6-2.6c0-1.6-1.3-2.7-2.6-4.3-1.3 1.6-2.6 2.7-2.6 4.3A2.6 2.6 0 0 0 12 20.2Z" />
    </template>
    <template v-else-if="name === 'sparkle'">
      <path d="M12 3.5l1.7 4.6 4.6 1.7-4.6 1.7L12 16.1l-1.7-4.6L5.7 9.8l4.6-1.7L12 3.5Z" />
      <path d="M18.5 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2Z" />
    </template>
    <template v-else-if="name === 'flower'">
      <circle cx="12" cy="12" r="2.4" />
      <path d="M12 9.6c0-2.7-1.3-4.3-3.2-4.3-1.6 0-2.6 1.3-2.6 2.7C6.2 9.8 8 11 12 9.6Z" />
      <path d="M14.4 12c2.7 0 4.3-1.3 4.3-3.2 0-1.6-1.3-2.6-2.7-2.6C14.2 6.2 13 8 14.4 12Z" />
      <path d="M12 14.4c0 2.7 1.3 4.3 3.2 4.3 1.6 0 2.6-1.3 2.6-2.7 0-1.8-1.8-3-5.8-1.6Z" />
      <path d="M9.6 12c-2.7 0-4.3 1.3-4.3 3.2 0 1.6 1.3 2.6 2.7 2.6 1.8 0 3-1.8 1.6-5.8Z" />
    </template>
    <template v-else-if="name === 'bolt'">
      <path d="M13.5 2.5 6.8 13.2h4.4l-1.2 8.3 7.2-11h-4.5l.8-8Z" />
    </template>
    <template v-else-if="name === 'users'">
      <circle cx="9" cy="8.4" r="3.1" />
      <path d="M3.4 20c0-2.9 2.5-5 5.6-5s5.6 2.1 5.6 5" />
      <path d="M16.2 5.7a3.1 3.1 0 0 1 0 5.6M17.4 15.2c2 .5 3.4 2.3 3.4 4.8" />
    </template>
    <template v-else-if="name === 'mic'">
      <rect x="9.2" y="2.8" width="5.6" height="10.4" rx="2.8" />
      <path d="M5.8 11.2a6.2 6.2 0 0 0 12.4 0M12 17.4V21" />
    </template>
    <template v-else-if="name === 'globe'">
      <circle cx="12" cy="12" r="8.6" />
      <path d="M3.4 12h17.2M12 3.4c2.4 2.4 3.6 5.3 3.6 8.6s-1.2 6.2-3.6 8.6c-2.4-2.4-3.6-5.3-3.6-8.6S9.6 5.8 12 3.4Z" />
    </template>
    <template v-else-if="name === 'chat'">
      <path d="M20.4 11.4c0 3.7-3.7 6.7-8.4 6.7-.9 0-1.8-.1-2.6-.3L4.6 19.8l1.4-3.2c-1.2-1.2-1.9-2.7-1.9-4.5 0-3.7 3.7-6.7 8.4-6.7s7.9 3 7.9 6Z" />
    </template>
    <template v-else-if="name === 'wand'">
      <path d="M4 20 15.2 8.8" />
      <path d="M17 3.2l.9 2.4 2.4.9-2.4.9-.9 2.4-.9-2.4-2.4-.9 2.4-.9.9-2.4Z" />
      <path d="M6.5 4.2l.5 1.4 1.4.5-1.4.5-.5 1.4-.5-1.4L4.6 6.1l1.4-.5.5-1.4Z" />
    </template>
    <template v-else-if="name === 'gift'">
      <rect x="3.6" y="8.6" width="16.8" height="11.8" rx="2.2" />
      <path d="M3.6 12.6h16.8M12 8.6v11.8" />
      <path d="M12 8.6C10.4 5.8 9.2 4.4 7.6 4.4a2.2 2.2 0 0 0 0 4.2H12Zm0 0c1.6-2.8 2.8-4.2 4.4-4.2a2.2 2.2 0 0 1 0 4.2H12Z" />
    </template>
    <template v-else>
      <rect x="7.4" y="3.2" width="8.2" height="11.4" rx="1.9" transform="rotate(12 11.5 8.9)" />
      <rect x="7" y="9.6" width="8.2" height="11.4" rx="1.9" transform="rotate(-9 11.1 15.3)" />
      <path d="M10.4 14.4c.5-1 1.8-1 2.3 0" />
    </template>
  </svg>
</template>
