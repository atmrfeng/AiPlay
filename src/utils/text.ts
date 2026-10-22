// 文本工具：转义 + 轻量 Markdown（**加粗**）+ 角色占位替换
export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))
}

/** 将 {$role1}/{$role2} 或 {p1}/{p2} 替换为昵称 */
export function fillRoles(text: string, p1: string, p2: string): string {
  return text
    .replace(/\{\$role1\}/g, p1)
    .replace(/\{\$role2\}/g, p2)
    .replace(/\{p1\}/g, p1)
    .replace(/\{p2\}/g, p2)
}

/** 轻量 Markdown → HTML（仅加粗与换行，内容已转义） */
export function richText(text: string): string {
  return escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>')
}
