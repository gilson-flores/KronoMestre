import { getAdminDb, getAdminAuth } from '@/lib/firebase-admin';
import { serverCache } from '@/lib/server-cache';

const DEFAULT_ADMIN_UID = '5IdpwffjnhewdZ5dONRB9QoIRBZ2';
const PRIMARY_TENANT_CODE = 'G2U9';
const DEFAULT_ADMIN_CODES = new Set(['G2U9', '755840', 'GILSON', 'PROF755840', 'SOCIO755840']);

export async function resolveOwnerTeacherId(rawCode?: string): Promise<string | null> {
  const clean = String(rawCode || '').trim().toUpperCase();
  if (!clean) return null;

  const cacheKey = `tenant_code_to_id_${clean}`;
  const cached = serverCache.get<string>(cacheKey);
  if (cached) return cached;

  const db = getAdminDb();

  try {
    // 1. Atalho imediato e auto-reparo se o código digitado for G2U9 (ou código oficial do Admin)
    if (DEFAULT_ADMIN_CODES.has(clean)) {
      let targetUid = DEFAULT_ADMIN_UID;
      try {
        const allTenants = await serverCache.getOrSet<any[]>('all_tenants_directory', 1800, async () => {
          const snap = await db.collection('tenants').get();
          return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        });
        const adminTenant = allTenants.find(
          (t) =>
            String(t.tenantCode || '').toUpperCase() === PRIMARY_TENANT_CODE ||
            String(t.email || '').toLowerCase() === '755840@profe.sed.sc.gov.br' ||
            String(t.email || '').toLowerCase() === 'gilsonjuniores@gmail.com' ||
            t.id === DEFAULT_ADMIN_UID
        );
        if (adminTenant?.id) targetUid = adminTenant.id;
      } catch {}

      // Garante que o documento no Firestore tenha sempre G2U9 gravado como tenantCode oficial
      await db.collection('tenants').doc(targetUid).set(
        {
          tenantCode: PRIMARY_TENANT_CODE,
          tenant_code: PRIMARY_TENANT_CODE,
          matriculaFuncional: '755840',
          matricula_funcional: '755840',
        },
        { merge: true }
      ).catch(() => {});

      serverCache.set(cacheKey, targetUid, 1800);
      return targetUid;
    }

    // 2. Busca para outros eventuais professores cadastrados no sistema
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
  } catch (err: any) {
    console.warn('[TenantResolver] Aviso ao resolver tenant:', err?.message);
    if (DEFAULT_ADMIN_CODES.has(clean)) {
      return DEFAULT_ADMIN_UID;
    }
  }

  return null;
}
