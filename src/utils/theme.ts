// 玩法卡片的分类配色与图标映射（统一 UI 的唯一来源）
export interface CategoryStyle {
  from: string
  to: string
  glyph: GlyphName
}

export type GlyphName =
  | 'sparkle' | 'heart' | 'flame' | 'flower' | 'bolt'
  | 'users' | 'mic' | 'globe' | 'chat' | 'wand' | 'gift' | 'cards'

const MAP: { test: RegExp; style: CategoryStyle }[] = [
  { test: /基础|体验/, style: { from: '#6C8CFF', to: '#A5B9FF', glyph: 'sparkle' } },
  { test: /情侣|恋爱|热恋|甜蜜/, style: { from: '#FF6B9D', to: '#FFA6C1', glyph: 'heart' } },
  { test: /羞羞|私密|缠绵|道具|御奴|绅士|甜心/, style: { from: '#A78BFA', to: '#CBA6FF', glyph: 'flame' } },
  { test: /百合/, style: { from: '#FF9A76', to: '#FFC3A8', glyph: 'flower' } },
  { test: /四人|聚会|酒桌|多人/, style: { from: '#3FBFAD', to: '#8FE3D6', glyph: 'users' } },
  { test: /K歌|歌/, style: { from: '#7C6CF6', to: '#B3A8FF', glyph: 'mic' } },
  { test: /异地|距离/, style: { from: '#4A9BFF', to: '#9AC8FF', glyph: 'globe' } },
  { test: /高阶|炸裂|SM|sm/, style: { from: '#F0A93B', to: '#FFD482', glyph: 'bolt' } },
  { test: /dirty|对话|趣味/, style: { from: '#F472B6', to: '#FBA7CF', glyph: 'chat' } },
  { test: /定制|情景|修仙|护士|秘书/, style: { from: '#2FB98A', to: '#8FE0BE', glyph: 'wand' } },
  { test: /七夕|礼物|未来|结婚/, style: { from: '#E2557B', to: '#FFA3B4', glyph: 'gift' } },
]

export function styleOf(title: string): CategoryStyle {
  for (const m of MAP) if (m.test.test(title)) return m.style
  return { from: '#FF7FA3', to: '#FFB6C9', glyph: 'cards' }
}
