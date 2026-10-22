// 玩法偏好：走棋节奏 / 任务卡字号
export const PACE_MS: Record<string, number> = { slow: 650, normal: 380, fast: 210 }
export const CARD_FONT: Record<string, string> = { small: '15px', normal: '17px', large: '19.5px' }

export function paceMs(pace: string): number {
  return PACE_MS[pace] ?? PACE_MS.normal
}

export function cardFont(size: string): string {
  return CARD_FONT[size] ?? CARD_FONT.normal
}
