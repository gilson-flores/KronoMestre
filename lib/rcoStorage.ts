import { RcoEmissionRecord } from './types';

const LOCAL_STORAGE_KEY = 'local_rco_emissions_v1';

function readLocal(): RcoEmissionRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
    return cached ? JSON.parse(cached) : [];
  } catch {
    return [];
  }
}

export async function saveRcoEmission(emission: RcoEmissionRecord): Promise<{ success: boolean; data?: RcoEmissionRecord; error?: string; isLocalOnly?: boolean }> {
  try {
    if (typeof window !== 'undefined') {
      try {
        const list = readLocal();
        const updated = [emission, ...list.filter((item) => item.emissionHash !== emission.emissionHash)];
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
      } catch (err) {
        console.warn('Aviso ao salvar RCO emission no cache local:', err);
      }
    }

    try {
      const res = await fetch('/api/rco-emissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emission),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        console.warn('Aviso ao persistir rco_emission no Firestore:', errData.error || res.statusText);
        return { success: true, data: emission, isLocalOnly: true };
      }
      return { success: true, data: emission, isLocalOnly: false };
    } catch (dbErr: any) {
      console.warn('Aviso de conexão ao salvar rco_emission:', dbErr?.message || dbErr);
      return { success: true, data: emission, isLocalOnly: true };
    }
  } catch (err: any) {
    console.warn('Aviso ao registrar emissão RCO:', err);
    return { success: false, error: err?.message || 'Erro ao registrar emissão' };
  }
}

export async function fetchRcoEmissions(_teacherId?: string): Promise<RcoEmissionRecord[]> {
  const localList = readLocal();

  try {
    const res = await fetch('/api/rco-emissions');
    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        const formatted: RcoEmissionRecord[] = json.data;
        const dbHashes = new Set(formatted.map((f) => f.emissionHash));
        const pendingLocal = localList.filter((l) => !dbHashes.has(l.emissionHash));
        const merged = [...formatted, ...pendingLocal];

        if (pendingLocal.length > 0) {
          fetch('/api/rco-emissions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(pendingLocal),
          }).catch(() => {});
        }

        if (typeof window !== 'undefined' && merged.length > 0) {
          try {
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(merged));
          } catch {}
        }

        return merged;
      }
    }
  } catch (err: any) {
    console.warn('Aviso ao carregar rco_emissions:', err?.message || err);
  }

  return localList;
}
