// 识别码校验：PBKDF2-SHA256（21 万次迭代）+ 设备绑定令牌 + 失败节流
// 说明：纯前端无法做到“绝对不可破解”（代码在用户浏览器里），
// 这里的目标是：不出现明文识别码、不能靠改 localStorage 布尔值绕过、暴力尝试被限速。

const SALT_B64 = 'Rl7HM4KmRsvW/Ohch1AAMg=='
const HASH_B64 = '4/26KX30IZCpi9S8hcL8YyBmKkb7pjuQHZMeJkhoZRU='
const ITERATIONS = 210000

const TOKEN_KEY = 'cfc_vip_token'
const DEVICE_KEY = 'cfc_device_id'
const FAIL_KEY = 'cfc_vip_fail'
const MAX_FAILS = 5
const LOCK_MS = 60_000

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

function bytesToB64(bytes: Uint8Array): string {
  let bin = ''
  bytes.forEach((b) => (bin += String.fromCharCode(b)))
  return btoa(bin)
}

function subtle(): SubtleCrypto | null {
  return typeof crypto !== 'undefined' && crypto.subtle ? crypto.subtle : null
}

async function digest(text: string): Promise<string> {
  const s = subtle()
  if (!s) return ''
  const buf = await s.digest('SHA-256', new TextEncoder().encode(text))
  return bytesToB64(new Uint8Array(buf))
}

function deviceId(): string {
  let id = localStorage.getItem(DEVICE_KEY)
  if (!id) {
    const bytes = new Uint8Array(16)
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) crypto.getRandomValues(bytes)
    else for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256)
    id = bytesToB64(bytes)
    localStorage.setItem(DEVICE_KEY, id)
  }
  return id
}

/** 期望的解锁令牌：由哈希 + 设备 id 派生，换设备/改值都不认 */
async function expectedToken(): Promise<string> {
  return digest(HASH_B64 + '|' + deviceId())
}

interface FailState {
  count: number
  until: number
}

function readFail(): FailState {
  try {
    return JSON.parse(localStorage.getItem(FAIL_KEY) || '{"count":0,"until":0}')
  } catch {
    return { count: 0, until: 0 }
  }
}

function writeFail(s: FailState): void {
  localStorage.setItem(FAIL_KEY, JSON.stringify(s))
}

/** 剩余锁定秒数（0 表示未锁定） */
export function lockRemain(): number {
  const { until } = readFail()
  return until > Date.now() ? Math.ceil((until - Date.now()) / 1000) : 0
}

export interface VerifyResult {
  ok: boolean
  message?: string
}

export async function verifyCode(input: string): Promise<VerifyResult> {
  const code = input.trim()
  if (!code) return { ok: false, message: '请输入识别码' }
  if (!subtle()) return { ok: false, message: '当前环境不支持安全校验，请用 https 或 localhost 打开' }

  const remain = lockRemain()
  if (remain > 0) return { ok: false, message: `尝试次数过多，请 ${remain} 秒后再试` }

  try {
    const key = await subtle()!.importKey('raw', new TextEncoder().encode(code), 'PBKDF2', false, ['deriveBits'])
    const bits = await subtle()!.deriveBits(
      { name: 'PBKDF2', salt: b64ToBytes(SALT_B64) as unknown as BufferSource, iterations: ITERATIONS, hash: 'SHA-256' },
      key,
      256,
    )
    const got = bytesToB64(new Uint8Array(bits))
    // 定长比较，避免时序差异
    let diff = 0
    for (let i = 0; i < Math.max(got.length, HASH_B64.length); i++) {
      diff |= (got.charCodeAt(i) || 0) ^ (HASH_B64.charCodeAt(i) || 0)
    }
    if (diff === 0) {
      writeFail({ count: 0, until: 0 })
      localStorage.setItem(TOKEN_KEY, await expectedToken())
      return { ok: true }
    }
    const st = readFail()
    const count = st.count + 1
    if (count >= MAX_FAILS) {
      writeFail({ count: 0, until: Date.now() + LOCK_MS })
      return { ok: false, message: '识别码错误次数过多，已锁定 60 秒' }
    }
    writeFail({ count, until: 0 })
    return { ok: false, message: `识别码不正确，还可尝试 ${MAX_FAILS - count} 次` }
  } catch {
    return { ok: false, message: '校验失败，请稍后重试' }
  }
}

/** 当前设备是否已解锁（令牌必须与“哈希+设备”派生值一致） */
export async function checkUnlocked(): Promise<boolean> {
  const token = localStorage.getItem(TOKEN_KEY)
  if (!token) return false
  if (!subtle()) return false
  return token === (await expectedToken())
}

export function clearUnlock(): void {
  localStorage.removeItem(TOKEN_KEY)
}
