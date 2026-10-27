import { RevTracker, createFirestoreBackend, parseTrackedKey } from './cache-rev';

const BOOT_ID = Math.random().toString(36).slice(2, 8);
const BOOT_AT = Date.now();

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

interface StudentPresenceRecord {
  studentId: string;
  ownerTeacherId: string;
  turma?: string;
  lastActiveAt: number;
  isOnline: boolean;
}

type PresenceListener = (payload: { onlineCount: number; onlineStudentIds: string[] }) => void;

export class ServerCache {
  private knownOthers = new Map<string, number>();
  private tracker: RevTracker;

  constructor(tracker?: RevTracker) {
    this.tracker = tracker || new RevTracker(BOOT_ID, createFirestoreBackend());
  }

  private noteWriteForKey(key: string): void {
    const t = parseTrackedKey(key);
    if (t) this.tracker.noteWrite(t.owner, t.collection);
  }

  async getRevision(owner: string, collections: string[]): Promise<Record<string, number>> {
    const out: Record<string, number> = {};
    if (this.isQuotaBlocked()) return out;
    for (const c of collections) out[c] = await this.tracker.totalRev(owner, c);
    return out;
  }

  private cache = new Map<string, CacheEntry<any>>();
  private lastKnownGood = new Map<string, any>();
  private inFlightPromises = new Map<string, Promise<any>>();
  private quotaExceededUntil: number = 0;
  private presenceMap = new Map<string, Map<string, StudentPresenceRecord>>();
  private presenceListeners = new Map<string, Set<PresenceListener>>();

  isQuotaBlocked(): boolean {
    return Date.now() < this.quotaExceededUntil;
  }

  triggerQuotaCooldown(minutes: number = 10): void {
    this.quotaExceededUntil = Date.now() + minutes * 60 * 1000;
  }

  checkIsQuotaError(err: any): boolean {
    if (!err) return false;
    const msg = String(err?.message || err || '');
    const code = err?.code;
    return (
      code === 8 ||
      code === 'resource-exhausted' ||
      code === 'RESOURCE_EXHAUSTED' ||
      msg.includes('RESOURCE_EXHAUSTED') ||
      msg.includes('Quota exceeded') ||
      msg.includes('exceeded its quota') ||
      msg.includes('429')
    );
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.data as T;
  }

  getLastKnown<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (entry && entry.data !== undefined) {
      return entry.data as T;
    }
    return (this.lastKnownGood.get(key) as T) ?? null;
  }

  set<T>(key: string, data: T, ttlSeconds: number = 300): void {
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
    this.lastKnownGood.set(key, data);
  }

  delete(key: string): void {
    this.cache.delete(key);
    this.lastKnownGood.delete(key);
    this.knownOthers.delete(key);
    this.noteWriteForKey(key);
  }

  deletePrefix(prefix: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) this.cache.delete(key);
    }
    for (const key of this.lastKnownGood.keys()) {
      if (key.startsWith(prefix)) this.lastKnownGood.delete(key);
    }
  }

  clear(): void {
    this.cache.clear();
    this.lastKnownGood.clear();
  }

  async getOrSet<T>(key: string, ttlSeconds: number, fetcher: () => Promise<T>): Promise<T> {
    const tracked = parseTrackedKey(key);
    let othersAtStart: number | null = null;
    if (tracked && !this.isQuotaBlocked()) {
      try {
        othersAtStart = await this.tracker.othersRev(tracked.owner, tracked.collection);
        const known = this.knownOthers.get(key);
        if (known !== undefined && known !== othersAtStart) {
          this.cache.delete(key);
          this.knownOthers.delete(key);
        }
      } catch {
        othersAtStart = null;
      }
    }

    const cached = this.get<T>(key);
    if (cached !== null) return cached;

    if (this.isQuotaBlocked()) {
      const fallback = this.getLastKnown<T>(key);
      if (fallback !== null && fallback !== undefined) return fallback;
    }

    const inFlight = this.inFlightPromises.get(key);
    if (inFlight) return inFlight as Promise<T>;

    const promise = (async () => {
      try {
        const result = await fetcher();
        if (result !== undefined && result !== null) {
          this.set(key, result, ttlSeconds);
          if (othersAtStart !== null) this.knownOthers.set(key, othersAtStart);
        }
        try {
          const docs = Array.isArray(result) ? result.length : result ? 1 : 0;
          console.log(`[FS-READ] key=${key} docs=${docs} instance=${BOOT_ID} uptime=${Math.round((Date.now() - BOOT_AT) / 1000)}s`);
        } catch {}
        return result;
      } catch (fetchErr: any) {
        if (this.checkIsQuotaError(fetchErr)) {
          this.triggerQuotaCooldown(10);
          console.warn(`[ServerCache] Cota do Firebase excedida. Ativando Circuit Breaker de 10 min.`);
        }
        const fallback = this.getLastKnown<T>(key);
        if (fallback !== null && fallback !== undefined) {
          return fallback;
        }
        throw fetchErr;
      } finally {
        this.inFlightPromises.delete(key);
      }
    })();

    this.inFlightPromises.set(key, promise);
    return promise;
  }

  private lastPresencePersist = new Map<string, number>();

  shouldPersistPresence(ownerTeacherId: string, studentId: string, minIntervalMs: number = 5 * 60 * 1000): boolean {
    const key = `${ownerTeacherId}:${studentId}`;
    const now = Date.now();
    const last = this.lastPresencePersist.get(key) || 0;
    if (now - last < minIntervalMs) return false;
    this.lastPresencePersist.set(key, now);
    return true;
  }

  patchListItems(key: string, ttlSeconds: number, patcher: (item: any) => any): boolean {
    const current = this.cache.get(key);
    if (!current || !Array.isArray(current.data)) return false;
    const next = current.data.map(patcher);
    this.set(key, next, ttlSeconds);
    this.noteWriteForKey(key);
    return true;
  }

  upsertListItem(key: string, ttlSeconds: number, item: any, opts?: { append?: boolean }): boolean {
    const current = this.cache.get(key);
    if (!current || !Array.isArray(current.data) || !item || item.id === undefined) return false;
    const list: any[] = current.data;
    const idx = list.findIndex((x) => x && String(x.id) === String(item.id));
    let next: any[];
    if (idx >= 0) {
      next = list.slice();
      next[idx] = { ...list[idx], ...item };
    } else {
      next = opts?.append ? [...list, item] : [item, ...list];
    }
    this.set(key, next, ttlSeconds);
    this.noteWriteForKey(key);
    return true;
  }

  removeListItem(key: string, ttlSeconds: number, id: string): boolean {
    const current = this.cache.get(key);
    if (!current || !Array.isArray(current.data)) return false;
    this.set(key, current.data.filter((x: any) => !(x && String(x.id) === String(id))), ttlSeconds);
    this.noteWriteForKey(key);
    return true;
  }

  recordPresence(ownerTeacherId: string, studentId: string, isOnline: boolean, metadata?: { turma?: string }): void {
    if (!ownerTeacherId || !studentId) return;
    let teacherMap = this.presenceMap.get(ownerTeacherId);
    if (!teacherMap) {
      teacherMap = new Map();
      this.presenceMap.set(ownerTeacherId, teacherMap);
    }
    teacherMap.set(studentId, {
      studentId,
      ownerTeacherId,
      turma: metadata?.turma,
      lastActiveAt: Date.now(),
      isOnline,
    });
    this.notifyPresenceListeners(ownerTeacherId);
  }

  getOnlinePresence(ownerTeacherId: string, windowMs: number = 5 * 60 * 1000): { onlineCount: number; onlineStudentIds: string[] } {
    const teacherMap = this.presenceMap.get(ownerTeacherId);
    if (!teacherMap) return { onlineCount: 0, onlineStudentIds: [] };
    const now = Date.now();
    const activeIds: string[] = [];
    for (const [sId, record] of teacherMap.entries()) {
      if (record.isOnline && now - record.lastActiveAt <= windowMs) activeIds.push(sId);
    }
    return { onlineCount: activeIds.length, onlineStudentIds: activeIds };
  }

  subscribePresence(ownerTeacherId: string, listener: PresenceListener): () => void {
    let listeners = this.presenceListeners.get(ownerTeacherId);
    if (!listeners) {
      listeners = new Set();
      this.presenceListeners.set(ownerTeacherId, listeners);
    }
    listeners.add(listener);
    listener(this.getOnlinePresence(ownerTeacherId));
    return () => {
      listeners?.delete(listener);
      if (listeners && listeners.size === 0) this.presenceListeners.delete(ownerTeacherId);
    };
  }

  private notifyPresenceListeners(ownerTeacherId: string): void {
    const listeners = this.presenceListeners.get(ownerTeacherId);
    if (!listeners || listeners.size === 0) return;
    const data = this.getOnlinePresence(ownerTeacherId);
    listeners.forEach((fn) => {
      try { fn(data); } catch {}
    });
  }
}

const globalForCache = globalThis as unknown as { serverCache?: ServerCache };
export const serverCache = globalForCache.serverCache ?? new ServerCache();
globalForCache.serverCache = serverCache;
