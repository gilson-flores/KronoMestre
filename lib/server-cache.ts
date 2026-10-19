/**
 * Cache em Memória do Servidor com Deduplicação de Requisições Concorrentes (In-Flight Coalescing),
 * Circuit Breaker de Cota (RESOURCE_EXHAUSTED) e Gerenciador de Presença em Memória
 * para Eliminar Totalmente Leituras e Gravações Desnecessárias no Firebase Firestore.
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

interface StudentPresenceRecord {
  studentId: string;
  ownerTeacherId: string;
  turma?: string;
  lastActiveAt: number; // timestamp em ms
  isOnline: boolean;
}

type PresenceListener = (payload: { onlineCount: number; onlineStudentIds: string[] }) => void;

class ServerCache {
  private cache = new Map<string, CacheEntry<any>>();
  private lastKnownGood = new Map<string, any>();
  private inFlightPromises = new Map<string, Promise<any>>();
  
  // Circuit breaker para cota do Firebase Firestore
  private quotaExceededUntil: number = 0;

  // Gerenciador de presença 100% em memória (0 leituras e 0 escritas no Firestore)
  private presenceMap = new Map<string, Map<string, StudentPresenceRecord>>();
  private presenceListeners = new Map<string, Set<PresenceListener>>();

  /**
   * Verifica se o Firebase atingiu a cota de leitura/escrita diária (Spark Plan)
   */
  isQuotaBlocked(): boolean {
    return Date.now() < this.quotaExceededUntil;
  }

  /**
   * Aciona circuit breaker por tempo determinado ao detectar RESOURCE_EXHAUSTED
   */
  triggerQuotaCooldown(minutes: number = 10): void {
    this.quotaExceededUntil = Date.now() + minutes * 60 * 1000;
  }

  /**
   * Detecta se um erro é de cota excedida do Firebase Firestore
   */
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

  /**
   * Obtém um valor do cache se não estiver expirado
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Obtém o último dado conhecido com sucesso, mesmo que o TTL tenha expirado.
   * Usado para resiliência quando o Firebase atinge limites de cota temporários.
   */
  getLastKnown<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (entry && entry.data !== undefined) {
      return entry.data as T;
    }
    return (this.lastKnownGood.get(key) as T) ?? null;
  }

  /**
   * Armazena um valor com TTL em segundos
   */
  set<T>(key: string, data: T, ttlSeconds: number = 300): void {
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
    this.lastKnownGood.set(key, data);
  }

  /**
   * Remove uma chave específica
   */
  delete(key: string): void {
    this.cache.delete(key);
    this.lastKnownGood.delete(key);
  }

  /**
   * Remove todas as chaves que começam com um prefixo (ex: 'tenant_123')
   */
  deletePrefix(prefix: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
    for (const key of this.lastKnownGood.keys()) {
      if (key.startsWith(prefix)) {
        this.lastKnownGood.delete(key);
      }
    }
  }

  /**
   * Limpa todo o cache
   */
  clear(): void {
    this.cache.clear();
    this.lastKnownGood.clear();
  }

  /**
   * getOrSet inteligente com Circuit Breaker e Deduplicação Concorrente
   */
  async getOrSet<T>(key: string, ttlSeconds: number, fetcher: () => Promise<T>): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Se o Firebase estiver com cota bloqueada, atende imediatamente pelo fallback sem tentar chamar
    if (this.isQuotaBlocked()) {
      const fallback = this.getLastKnown<T>(key);
      if (fallback !== null && fallback !== undefined) {
        return fallback;
      }
    }

    // Deduplicação concorrente
    const inFlight = this.inFlightPromises.get(key);
    if (inFlight) {
      return inFlight as Promise<T>;
    }

    const promise = (async () => {
      try {
        const result = await fetcher();
        if (result !== undefined && result !== null) {
          this.set(key, result, ttlSeconds);
        }
        return result;
      } catch (fetchErr: any) {
        if (this.checkIsQuotaError(fetchErr)) {
          this.triggerQuotaCooldown(10);
          console.warn(`[ServerCache] Cota do Firebase excedida. Ativando Circuit Breaker de 10 min para poupar acessos.`);
        }
        // Fallback resiliente: se der erro, aproveita o último valor salvo
        const fallback = this.getLastKnown<T>(key);
        if (fallback !== null && fallback !== undefined) {
          console.warn(`[ServerCache] Erro na busca remota para "${key}". Recuperado com sucesso via cache de contingência:`, fetchErr?.message);
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

  // ============================================================================
  // GERENCIADOR DE PRESENÇA EM TEMPO REAL 100% EM MEMÓRIA (0 LEITURAS FIRESTORE)
  // ============================================================================

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
    if (!teacherMap) {
      return { onlineCount: 0, onlineStudentIds: [] };
    }

    const now = Date.now();
    const activeIds: string[] = [];

    for (const [sId, record] of teacherMap.entries()) {
      if (record.isOnline && now - record.lastActiveAt <= windowMs) {
        activeIds.push(sId);
      }
    }

    return {
      onlineCount: activeIds.length,
      onlineStudentIds: activeIds,
    };
  }

  subscribePresence(ownerTeacherId: string, listener: PresenceListener): () => void {
    let listeners = this.presenceListeners.get(ownerTeacherId);
    if (!listeners) {
      listeners = new Set();
      this.presenceListeners.set(ownerTeacherId, listeners);
    }
    listeners.add(listener);

    // Envia o estado atual imediatamente
    listener(this.getOnlinePresence(ownerTeacherId));

    return () => {
      listeners?.delete(listener);
      if (listeners && listeners.size === 0) {
        this.presenceListeners.delete(ownerTeacherId);
      }
    };
  }

  private notifyPresenceListeners(ownerTeacherId: string): void {
    const listeners = this.presenceListeners.get(ownerTeacherId);
    if (!listeners || listeners.size === 0) return;

    const data = this.getOnlinePresence(ownerTeacherId);
    listeners.forEach((fn) => {
      try {
        fn(data);
      } catch {}
    });
  }
}

// Singleton global no Node.js
const globalForCache = globalThis as unknown as { serverCache?: ServerCache };
export const serverCache = globalForCache.serverCache ?? new ServerCache();
if (process.env.NODE_ENV !== 'production') globalForCache.serverCache = serverCache;

