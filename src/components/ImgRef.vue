<script setup lang="ts">
// 图片引用渲染：支持 idb://（IndexedDB）、本地路径、外链、dataURL
import { computed } from 'vue'
import { useImgSrc } from '../utils/img'

const props = defineProps<{ src?: string }>()

const src = useImgSrc(() => props.src)

const imgClass = computed(() => 'img-ref' + (src.value ? '' : ' empty'))
</script>

<template>
  <img v-if="src" :class="imgClass" :src="src" alt="" />
</template>

<style scoped>
.img-ref {
  max-width: 100%;
  display: block;
}
.img-ref.empty {
  min-height: 60px;
  background: rgba(255, 150, 180, 0.08);
  border-radius: 12px;
}
</style>
