<script setup lang="ts">
defineProps<{ name: 'plane' | 'heart' | 'chat' | 'cards' | 'me' | 'grid' | 'dice' | 'wheel' | 'pose' | 'traffic' }>()
</script>

<template>
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <template v-if="name === 'plane'">
      <path d="M3.5 12.5 20 4l-4.2 16-3.9-5.6-4.2 2.3z" />
      <path d="M11.9 14.4 20 4" />
    </template>
    <template v-else-if="name === 'heart'">
      <path d="M12 20c-4.4-2.9-7.2-5.5-7.2-8.6A4.2 4.2 0 0 1 12 8.6a4.2 4.2 0 0 1 7.2 2.8c0 3.1-2.8 5.7-7.2 8.6Z" />
    </template>
    <template v-else-if="name === 'chat'">
      <path d="M20.5 11.4c0 3.9-3.8 7-8.5 7-1 0-2-.1-2.9-.4L4 20l1.5-3.4c-1.3-1.3-2-2.9-2-4.8 0-3.9 3.8-7 8.5-7s8.5 3.1 8.5 6.6Z" />
      <path d="M8.6 11.4h.01M12 11.4h.01M15.4 11.4h.01" stroke-width="2.4" />
    </template>
    <template v-else-if="name === 'cards'">
      <rect x="8.4" y="3.2" width="7.6" height="10.6" rx="1.8" transform="rotate(14 12.2 8.5)" />
      <rect x="8" y="10" width="7.6" height="10.6" rx="1.8" transform="rotate(-8 11.8 15.3)" />
      <path d="M11.3 14.5c.5-1 1.9-1 2.4 0" />
    </template>
    <template v-else-if="name === 'dice'">
      <rect x="3.6" y="3.6" width="16.8" height="16.8" rx="4" />
      <circle cx="8.4" cy="8.4" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="15.6" cy="15.6" r="1.1" fill="currentColor" stroke="none" />
    </template>
    <template v-else-if="name === 'wheel'">
      <circle cx="12" cy="12" r="8.6" />
      <path d="M12 3.4v3.2M12 17.4v3.2M3.4 12h3.2M17.4 12h3.2" />
      <circle cx="12" cy="12" r="2" />
    </template>
    <template v-else-if="name === 'pose'">
      <circle cx="12" cy="5.6" r="2.6" />
      <path d="M12 8.4v6.2M12 14.6l-3.2 6M12 14.6l3.2 6M7.4 10.6 12 9.4l4.6 1.2" />
    </template>
    <template v-else-if="name === 'traffic'">
      <rect x="7" y="2.8" width="10" height="18.4" rx="5" />
      <circle cx="12" cy="7.4" r="1.5" />
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="12" cy="16.6" r="1.5" />
    </template>
    <template v-else-if="name === 'grid'">
      <rect x="3.6" y="3.6" width="7.4" height="7.4" rx="2.2" />
      <rect x="13" y="3.6" width="7.4" height="7.4" rx="2.2" />
      <rect x="3.6" y="13" width="7.4" height="7.4" rx="2.2" />
      <rect x="13" y="13" width="7.4" height="7.4" rx="2.2" />
    </template>
    <template v-else>
      <circle cx="12" cy="12" r="8.6" />
      <path d="M8.6 14.2c.9 1.3 2 2 3.4 2s2.5-.7 3.4-2" />
      <path d="M9 9.5h.01M15 9.5h.01" stroke-width="2.6" />
    </template>
  </svg>
</template>
