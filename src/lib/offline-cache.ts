import type { QueryClient, QueryKey } from "@tanstack/react-query";

/**
 * TanStack Query-ийн сонгосон query-нүүдийн сүүлийн амжилттай үр дүнг IndexedDB-д
 * хадгалж, дараагийн ачаалалт дээр (офлайн байсан ч) сэргээнэ. Нэмэлт package
 * шаардлагагүй — bun.lock-д өөрчлөлт орохгүй.
 *
 * Тоног төхөөрөмжийн жагсаалт RLS-ээр нийтэд унших эрхтэй тул хэрэглэгчээр
 * салгаж хадгалах шаардлагагүй.
 */

const DB_NAME = "asset-mongol-hub";
const STORE = "query-cache";
/** Equipment-ийн бүтэц эвдрэх өөрчлөлт орвол нэмэгдүүлнэ — хуучин хуулбар үл тоогдоно. */
const SCHEMA_VERSION = 1;

export const PERSISTED_QUERY_KEYS: QueryKey[] = [["equipment"]];

type Persisted = { v: number; savedAt: number; data: unknown };

const keyOf = (key: QueryKey) => JSON.stringify(key);

let dbPromise: Promise<IDBDatabase> | null = null;
function openDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    dbPromise.catch(() => {
      dbPromise = null;
    });
  }
  return dbPromise;
}

async function idbGet<T>(key: string): Promise<T | undefined> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE, "readonly").objectStore(STORE).get(key);
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror = () => reject(req.error);
  });
}

async function idbSet(key: string, value: unknown): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Root дээр нэг удаа дуудна. Буцаах функц нь subscription-ийг цуцална. */
export function setupQueryPersistence(queryClient: QueryClient): () => void {
  if (typeof window === "undefined" || !("indexedDB" in window)) return () => {};

  const persistedHashes = new Set(PERSISTED_QUERY_KEYS.map(keyOf));

  // 1) Сэргээх. Сүлжээнээс илүү шинэ өгөгдөл аль хэдийн ирсэн бол дарж бичихгүй.
  for (const key of PERSISTED_QUERY_KEYS) {
    idbGet<Persisted>(keyOf(key))
      .then((saved) => {
        if (!saved || saved.v !== SCHEMA_VERSION) return;
        const current = queryClient.getQueryState(key);
        if (current && current.dataUpdatedAt >= saved.savedAt) return;
        queryClient.setQueryData(key, saved.data, { updatedAt: saved.savedAt });
      })
      .catch((err) => console.warn("[offline-cache] Сэргээж чадсангүй:", err));
  }

  // 2) Сүлжээнээс амжилттай татах бүрт хадгалах (setQueryData-гаар сэргээснийг дахин бичихгүй).
  return queryClient.getQueryCache().subscribe((event) => {
    if (event.type !== "updated" || event.action.type !== "success" || event.action.manual) return;
    const { query } = event;
    if (!persistedHashes.has(keyOf(query.queryKey))) return;
    const record: Persisted = {
      v: SCHEMA_VERSION,
      savedAt: query.state.dataUpdatedAt,
      data: query.state.data,
    };
    idbSet(keyOf(query.queryKey), record).catch((err) =>
      console.warn("[offline-cache] Хадгалж чадсангүй:", err),
    );
  });
}
