export type RevBackend = {
  readMeta(owner: string): Promise<Record<string, Record<string, number>> | null>;
  flush(owner: string, increments: Record<string, number>, instanceId: string): Promise<void>;
};

const TRACKED = ['students', 'activities', 'messages', 'library', 'second_teachers', 'atestados_rad', 'rco_emissions'] as const;
export type TrackedCollection = (typeof TRACKED)[number];

export function parseTrackedKey(key: string): { collection: TrackedCollection; owner: string } | null {
  const sorted = [...TRACKED].sort((a, b) => b.length - a.length);
  for (const c of sorted) {
    if (key.startsWith(c + '_')) {
      const owner = key.slice(c.length + 1);
      if (owner) return { collection: c, owner };
    }
  }
  return null;
}

export class RevTracker {
  private remote = new Map<string, { at: number; data: Record<string, Record<string, number>> }>();
  private inflightRead = new Map<string, Promise<void>>();
  private own = new Map<string, number>();
  private pending = new Map<string, Record<string, number>>();
  private timers = new Map<string, ReturnType<typeof setTimeout>>();

  constructor(
    public readonly instanceId: string,
    private backend: RevBackend,
    private opts: { readThrottleMs: number; flushDelayMs: number } = { readThrottleMs: 20_000, flushDelayMs: 1_500 }
  ) {}

  private async refresh(owner: string): Promise<void> {
    const cached = this.remote.get(owner);
    if (cached && Date.now() - cached.at < this.opts.readThrottleMs) return;

    let p = this.inflightRead.get(owner);
    if (!p) {
      p = (async () => {
        try {
          const data = await this.backend.readMeta(owner);
          this.remote.set(owner, { at: Date.now(), data: data || {} });
        } catch {
          this.remote.set(owner, { at: Date.now(), data: cached?.data || {} });
        } finally {
          this.inflightRead.delete(owner);
        }
      })();
      this.inflightRead.set(owner, p);
    }
    await p;
  }

  async othersRev(owner: string, collection: string): Promise<number> {
    await this.refresh(owner);
    const perInstance = this.remote.get(owner)?.data?.[collection] || {};
    let sum = 0;
    for (const [inst, n] of Object.entries(perInstance)) {
      if (inst !== this.instanceId) sum += Number(n) || 0;
    }
    return sum;
  }

  async totalRev(owner: string, collection: string): Promise<number> {
    const others = await this.othersRev(owner, collection);
    const remoteOwn = Number(this.remote.get(owner)?.data?.[collection]?.[this.instanceId]) || 0;
    const localOwn = this.own.get(`${owner}|${collection}`) || 0;
    return others + Math.max(remoteOwn, localOwn);
  }

  noteWrite(owner: string, collection: string): void {
    const k = `${owner}|${collection}`;
    this.own.set(k, (this.own.get(k) || 0) + 1);

    const p = this.pending.get(owner) || {};
    p[collection] = (p[collection] || 0) + 1;
    this.pending.set(owner, p);

    if (this.timers.has(owner)) return;
    const t = setTimeout(() => {
      this.timers.delete(owner);
      void this.flushNow(owner);
    }, this.opts.flushDelayMs);
    (t as any).unref?.();
    this.timers.set(owner, t);
  }

  async flushNow(owner: string): Promise<void> {
    const inc = this.pending.get(owner);
    if (!inc || Object.keys(inc).length === 0) return;
    this.pending.delete(owner);
    try {
      await this.backend.flush(owner, inc, this.instanceId);
    } catch {
      const again = this.pending.get(owner) || {};
      for (const [c, n] of Object.entries(inc)) again[c] = (again[c] || 0) + n;
      this.pending.set(owner, again);
    }
  }
}

export function createFirestoreBackend(): RevBackend {
  return {
    async readMeta(owner) {
      const { getAdminDb } = await import('./firebase-admin');
      const snap = await getAdminDb().collection('tenants').doc(owner).collection('meta').doc('cache_rev').get();
      return (snap.exists ? (snap.data()?.r as any) : null) || null;
    },
    async flush(owner, increments, instanceId) {
      const { getAdminDb } = await import('./firebase-admin');
      const { FieldValue } = await import('firebase-admin/firestore');
      const r: Record<string, any> = {};
      for (const [c, n] of Object.entries(increments)) r[c] = { [instanceId]: FieldValue.increment(n) };
      await getAdminDb().collection('tenants').doc(owner).collection('meta').doc('cache_rev').set({ r, updatedAt: new Date().toISOString() }, { merge: true });
    },
  };
}
