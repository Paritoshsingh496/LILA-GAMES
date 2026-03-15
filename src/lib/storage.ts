import type { MatchIndex, MatchData, HeatmapData } from './types'

const DB_NAME = 'lila-viz'
const DB_VERSION = 1
const STORE_NAME = 'appdata'

interface StoredData {
  matchIndex: MatchIndex
  matchDataMap: Record<string, MatchData>
  heatmapData: Record<string, HeatmapData>
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function saveData(data: StoredData): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    store.put(data.matchIndex, 'matchIndex')
    store.put(data.matchDataMap, 'matchDataMap')
    store.put(data.heatmapData, 'heatmapData')
    tx.oncomplete = () => { db.close(); resolve() }
    tx.onerror = () => { db.close(); reject(tx.error) }
  })
}

export async function loadData(): Promise<StoredData | null> {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const r1 = store.get('matchIndex')
      const r2 = store.get('matchDataMap')
      const r3 = store.get('heatmapData')
      tx.oncomplete = () => {
        db.close()
        if (r1.result && r2.result && r3.result) {
          resolve({
            matchIndex: r1.result,
            matchDataMap: r2.result,
            heatmapData: r3.result,
          })
        } else {
          resolve(null)
        }
      }
      tx.onerror = () => { db.close(); reject(tx.error) }
    })
  } catch {
    return null
  }
}

export async function clearStoredData(): Promise<void> {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      tx.objectStore(STORE_NAME).clear()
      tx.oncomplete = () => { db.close(); resolve() }
      tx.onerror = () => { db.close(); reject(tx.error) }
    })
  } catch {
    // ignore
  }
}
