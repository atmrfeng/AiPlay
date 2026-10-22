// 统一图片 src 解析：支持 idb:// 引用、本地路径、外链、dataURL
import { ref, watch } from 'vue'
import { loadImage } from './imgstore'
import { assetUrl } from './asset'

const cache = new Map<string, string>()

/** 立即返回可显示的 src（idb:// 未命中缓存时先返回空，命中后异步更新） */
export function useImgSrc(ref_: () => string | undefined) {
  const src = ref('')
  const key = ref('')

  async function resolve(v: string) {
    if (!v) {
      src.value = ''
      return
    }
    if (v.startsWith('idb://')) {
      const hit = cache.get(v)
      if (hit) {
        src.value = hit
        return
      }
      const real = await loadImage(v)
      cache.set(v, real)
      // 期间引用可能已切换
      if (key.value === v) src.value = real
      return
    }
    src.value = assetUrl(v)
  }

  watch(ref_, (v) => {
    key.value = v || ''
    resolve(v || '')
  }, { immediate: true })

  return src
}
