import { getAdminDb, getAdminAuth } from '@/lib/firebase-admin';
import { serverCache } from '@/lib/server-cache';

const DEFAULT_ADMIN_UID = '5IdpwffjnhewdZ5dONRB9QoIRBZ2';
const DEFAULT_ADMIN_CODES = new Set(['755840', 'GILSON', 'PROF755840', 'SOCIO755840']);

export async function resolveOwnerTeacherId(rawCode?: string): Promise<string | null> {
  const clean = String(rawCode || '').trim().toUpperCase();
  if (!clean) return null;

  const cacheKey = `tenant_code_to_id_${clean}`;
  const cached = serverCache.get<string>(cacheKey);
  if (cached) return cached;

  const db = getAdminDb();

  try {
    // 1. Carrega lista de tenants em cache de 30 min (evita múltiplos .where e problemas de tipo number vs string)
    const allTenants = await serverCache.getOrSet<any[]>('all_tenants_directory', 1800, async () => {
      const snap = await db.collection('tenants').get();
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    });

    for (const t of allTenants) {
      const candidates = [
        t.id,
        t.tenantCode,
        t.tenant_code,
        t.matriculaFuncional,
        t.matricula_funcional,
        t.teacherCode,
        t.teacher_code,
        t.code,
        t.email ? String(t.email).split('@')[0] : '',
      ]
        .filter((v) => v !== undefined && v !== null && String(v).trim() !== '')
        .map((v) => String(v).trim().toUpperCase());

      if (candidates.includes(clean)) {
        serverCache.set(cacheKey, t.id, 1800);
        return t.id;
      }
    }

    // 2. Se só existe 1 tenant cadastrado no Firestore, vincula a ele e auto-preenche o código
    if (allTenants.length === 1) {
      const onlyId = allTenants[0].id;
      serverCache.set(cacheKey, onlyId, 1800);
      await db.collection('tenants').doc(onlyId).set(
        { tenantCode: clean, matriculaFuncional: clean },
        { merge: true }
      ).catch(() => {});
      serverCache.delete('all_tenants_directory');
      return onlyId;
    }

    // 3. Fallback para o Admin Supremo (Matrícula 755840 ou documento virtual sem campos raiz)
    if (DEFAULT_ADMIN_CODES.has(clean) || allTenants.length === 0) {
      let targetUid = DEFAULT_ADMIN_UID;
      try {
        const authUser = await getAdminAuth().getUserByEmail('755840@profe.sed.sc.gov.br');
        if (authUser?.uid) targetUid = authUser.uid;
      } catch {}

      await db.collection('tenants').doc(targetUid).set(
        {
          tenantCode: clean,
          matriculaFuncional: '755840',
          matricula_funcional: '755840',
          email: '755840@profe.sed.sc.gov.br',
          name: 'Gilson Flores',
        },
        { merge: true }
      ).catch(() => {});

      serverCache.delete('all_tenants_directory');
      serverCache.set(cacheKey, targetUid, 1800);
      return targetUid;
    }
  } catch (err: any) {
    console.warn('[TenantResolver] Aviso ao resolver tenant:', err?.message);
    if (DEFAULT_ADMIN_CODES.has(clean)) {
      return DEFAULT_ADMIN_UID;
    }
  }

  return null;
}
