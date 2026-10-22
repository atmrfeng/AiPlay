// 轻量反馈：音效（WebAudio 合成，无需音频文件）与震动
let ctx: AudioContext | null = null

function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const AC = window.AudioContext || (window as any).webkitAudioContext
  if (!AC) return null
  if (!ctx) ctx = new AC()
  return ctx
}

/** 短促“卡嗒”声：用于掷骰、抽卡、翻格 */
export function tick(enabled: boolean, freq = 520, duration = 0.06): void {
  if (!enabled) return
  const ac = audio()
  if (!ac) return
  try {
    if (ac.state === 'suspended') ac.resume()
    const osc = ac.createOscillator()
    const gain = ac.createGain()
    osc.type = 'sine'
    osc.frequency.value = freq
    gain.gain.setValueAtTime(0.06, ac.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + duration)
    osc.connect(gain).connect(ac.destination)
    osc.start()
    osc.stop(ac.currentTime + duration)
  } catch {
    /* 忽略音频失败 */
  }
}

/** 胜利音：三连音 */
export function fanfare(enabled: boolean): void {
  if (!enabled) return
  ;[523, 659, 784].forEach((f, i) => window.setTimeout(() => tick(true, f, 0.16), i * 130))
}

/** 震动 */
export function buzz(enabled: boolean, pattern: number | number[] = 16): void {
  if (!enabled) return
  const nav = navigator as Navigator & { vibrate?: (p: number | number[]) => boolean }
  if (typeof nav.vibrate === 'function') nav.vibrate(pattern)
}
