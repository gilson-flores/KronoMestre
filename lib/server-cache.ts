/**
 * Cache em Memória do Servidor com Deduplicação de Requisições Concorrentes (In-Flight Coalescing)
 * e Invalidação Inteligente para Reduzir Drasticamente Leituras no Firebase Firestore.
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

class ServerCache {
  private cache = new Map<string, CacheEntry<any>>();
  private inFlightPromises = new Map<string, Promise<any>>();

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
   * Armazena um valor com TTL em segundos
   */
  set<T>(key: string, data: T, ttlSeconds: number = 180): void {
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  /**
   * Remove uma chave específica
   */
  delete(key: string): void {
    this.cache.delete(key);
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
  }

  /**
   * Limpa todo o cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * getOrSet inteligente:
   * 1. Retorna do cache se válido.
   * 2. Se requisição idêntica já estiver em andamento (in-flight), aguarda a mesma Promise.
   * 3. Executa o fetcher apenas uma vez, popula o cache e retorna.
   */
  async getOrSet<T>(key: string, ttlSeconds: number, fetcher: () => Promise<T>): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
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
      } finally {
        this.inFlightPromises.delete(key);
      }
    })();

    this.inFlightPromises.set(key, promise);
    return promise;
  }
}

// Singleton global no Node.js
const globalForCache = globalThis as unknown as { serverCache?: ServerCache };
export const serverCache = globalForCache.serverCache ?? new ServerCache();
if (process.env.NODE_ENV !== 'production') globalForCache.serverCache = serverCache;
