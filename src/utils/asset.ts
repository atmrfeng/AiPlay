// 资源路径：兼容 GitHub Pages 子路径部署（vite base 为 './'）
export function assetUrl(p?: string): string {
  if (!p) return ''
  if (/^(https?:|data:|blob:|idb:)/i.test(p)) return p
  const base = import.meta.env.BASE_URL || '/'
  if (p.startsWith('/')) return base.replace(/\/+$/, '') + p
  return p
}
