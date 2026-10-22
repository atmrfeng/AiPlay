// 图片存储：大于阈值的 dataURL 存 IndexedDB，card.image 用 idb://<key> 引用
// 目的：localStorage 只有约 5MB，图片卡放进去很快爆掉；IndexedDB 可存几百 MB。
const DB_NAME = 'cfc-images'
const STORE = 'imgs'
const IDB_THRESHOLD = 32 * 1024 // 超过 32KB 就走 IndexedDB

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('no idb'))
      return
    }
    // 不指定版本：用现有版本打开，避免“请求版本低于现有版本”报错
    const req = indexedDB.open(DB_NAME)
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE)
    }
    req.onsuccess = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        // 库已存在但缺 store：升版本补建
        const cur = db.version
        db.close()
        const req2 = indexedDB.open(DB_NAME, cur + 1)
        req2.onupgradeneeded = () => {
          if (!req2.result.objectStoreNames.contains(STORE)) req2.result.createObjectStore(STORE)
        }
        req2.onsuccess = () => resolve(req2.result)
        req2.onerror = () => reject(req2.error)
        return
      }
      resolve(db)
    }
    req.onerror = () => reject(req.error)
  })
}

function randomKey(): string {
  return 'i-' + Date.now().toString(36) + '-' + Math.floor(Math.random() * 1e6).toString(36)
}

/** 是否已支持 IndexedDB */
export async function idbReady(): Promise<boolean> {
  try {
    const db = await openDB()
    db.close()
    return true
  } catch {
    return false
  }
}

/**
 * 把 dataURL 写入 IndexedDB，返回引用串（idb://key）。
 * 失败时返回原始 dataURL（降级）。
 */
export async function saveImage(dataUrl: string): Promise<string> {
  if (!dataUrl.startsWith('data:')) return dataUrl
  try {
    const db = await openDB()
    const key = randomKey()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).put(dataUrl, key)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
    db.close()
    return 'idb://' + key
  } catch {
    return dataUrl
  }
}

/** 用指定 key 写入（备份恢复时保持引用不变） */
export async function saveImageWithKey(key: string, dataUrl: string): Promise<string> {
  if (!dataUrl.startsWith('data:')) return dataUrl
  try {
    const db = await openDB()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).put(dataUrl, key)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
    db.close()
    return 'idb://' + key
  } catch {
    return dataUrl
  }
}

/** 读取 idb:// 引用；非 idb 引用原样返回 */export async function loadImage(ref: string): Promise<string> {
  if (!ref.startsWith('idb://')) return ref
  const key = ref.slice(6)
  try {
    const db = await openDB()
    const val = await new Promise<string | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly')
      const r = tx.objectStore(STORE).get(key)
      r.onsuccess = () => resolve(r.result as string | undefined)
      r.onerror = () => reject(r.error)
    })
    db.close()
    return val || ''
  } catch {
    return ''
  }
}

/** 删除某张图 */
export async function deleteImage(ref: string): Promise<void> {
  if (!ref.startsWith('idb://')) return
  try {
    const db = await openDB()
    const key = ref.slice(6)
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).delete(key)
      tx.oncomplete = () => resolve()
      tx.onerror = () => resolve()
    })
    db.close()
  } catch {
    /* 忽略 */
  }
}

/** 是否值得入库（小图直接放 localStorage 更简单） */
export function shouldUseIdb(dataUrl: string): boolean {
  return dataUrl.length > IDB_THRESHOLD
}

/** 估算所有 idb 图片总字节 */
export async function estimateIdbSize(): Promise<number> {
  try {
    const db = await openDB()
    const keys = await new Promise<IDBValidKey[]>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly')
      const r = tx.objectStore(STORE).getAllKeys()
      r.onsuccess = () => resolve(r.result)
      r.onerror = () => reject(r.error)
    })
    let total = 0
    for (const k of keys) {
      const val = await new Promise<string | undefined>((resolve, reject) => {
        const tx = db.transaction(STORE, 'readonly')
        const r = tx.objectStore(STORE).get(k)
        r.onsuccess = () => resolve(r.result as string | undefined)
        r.onerror = () => reject(r.error)
      })
      total += (val || '').length
    }
    db.close()
    return total
  } catch {
    return 0
  }
}
