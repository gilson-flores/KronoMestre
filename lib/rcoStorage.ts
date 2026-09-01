import { supabase, isSupabaseConfigured } from './supabase';
import { RcoEmissionRecord } from './types';

const LOCAL_STORAGE_KEY = 'local_rco_emissions_v1';

/**
 * Salva uma nova emissão imutável de RCO no Supabase e no Cache Local com fallback resiliente
 */
export async function saveRcoEmission(emission: RcoEmissionRecord): Promise<{ success: boolean; data?: RcoEmissionRecord; error?: string; isLocalOnly?: boolean }> {
  try {
    // 1. Salvar no localStorage para resiliência instantânea
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
        const list: RcoEmissionRecord[] = cached ? JSON.parse(cached) : [];
        // Inserir no topo (mais recente primeiro)
        const updated = [emission, ...list.filter((item) => item.emissionHash !== emission.emissionHash)];
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
      } catch (err) {
        console.warn('Aviso ao salvar RCO emission no cache local:', err);
      }
    }

    // 2. Salvar no Supabase se configurado
    if (isSupabaseConfigured && supabase) {
      const dbPayload = {
        emission_hash: emission.emissionHash,
        teacher_id: emission.teacherId,
        teacher_name: emission.teacherName,
        subject: emission.subject,
        school: emission.school,
        scope: emission.scope,
        turma: emission.turma || null,
        total_students: emission.totalStudents,
        total_activities: emission.totalActivities,
        turmas_summary: emission.turmasSummary,
        full_snapshot: emission.fullSnapshot,
        emitted_at: emission.emittedAt,
      };

      try {
        const { error } = await supabase
          .from('rco_emissions')
          .insert([dbPayload]);

        if (error) {
          // Se a tabela rco_emissions ainda não foi criada no Supabase (PGRST205 / 42P01), mantém no cache local silenciosamente
          if (error.code === 'PGRST205' || error.message?.includes('schema cache') || error.message?.includes('relation') || error.code === '42P01') {
            console.warn('Aviso: Tabela rco_emissions aguardando execução de migration no Supabase SQL Editor. Registro mantido em cache local seguro.');
            return { success: true, data: emission, isLocalOnly: true };
          }
          console.warn('Aviso ao persistir rco_emission no Supabase:', error.message || error);
          return { success: true, data: emission, isLocalOnly: true };
        }

        return { success: true, data: emission, isLocalOnly: false };
      } catch (dbErr: any) {
        console.warn('Aviso de conexão Supabase ao salvar rco_emission:', dbErr?.message || dbErr);
        return { success: true, data: emission, isLocalOnly: true };
      }
    }

    return { success: true, data: emission, isLocalOnly: true };
  } catch (err: any) {
    console.warn('Aviso ao registrar emissão RCO:', err);
    return { success: false, error: err?.message || 'Erro ao registrar emissão' };
  }
}

/**
 * Carrega o histórico de emissões do RCO com sincronização bidirecional
 */
export async function fetchRcoEmissions(teacherId?: string): Promise<RcoEmissionRecord[]> {
  let localList: RcoEmissionRecord[] = [];
  if (typeof window !== 'undefined') {
    const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (cached) {
      try {
        localList = JSON.parse(cached);
      } catch {
        localList = [];
      }
    }
  }

  try {
    if (isSupabaseConfigured && supabase) {
      let query = supabase
        .from('rco_emissions')
        .select('*')
        .order('emitted_at', { ascending: false });

      if (teacherId) {
        query = query.eq('teacher_id', teacherId);
      }

      const { data, error } = await query;
      if (!error && data && Array.isArray(data)) {
        const formatted: RcoEmissionRecord[] = data.map((d: any) => ({
          id: d.id,
          emissionHash: d.emission_hash,
          teacherId: d.teacher_id,
          teacherName: d.teacher_name,
          subject: d.subject,
          school: d.school,
          scope: d.scope,
          turma: d.turma || undefined,
          totalStudents: d.total_students || 0,
          totalActivities: d.total_activities || 0,
          turmasSummary: d.turmas_summary || [],
          fullSnapshot: d.full_snapshot || {},
          emittedAt: d.emitted_at || d.created_at,
          createdAt: d.created_at,
        }));

        // Merge: manter itens locais que ainda não subiram
        const dbHashes = new Set(formatted.map((f) => f.emissionHash));
        const pendingLocal = localList.filter((l) => !dbHashes.has(l.emissionHash));
        const merged = [...formatted, ...pendingLocal];

        // Sincronizar itens pendentes para o banco
        if (pendingLocal.length > 0) {
          const syncPayload = pendingLocal.map((item) => ({
            emission_hash: item.emissionHash,
            teacher_id: item.teacherId,
            teacher_name: item.teacherName,
            subject: item.subject,
            school: item.school,
            scope: item.scope,
            turma: item.turma || null,
            total_students: item.totalStudents,
            total_activities: item.totalActivities,
            turmas_summary: item.turmasSummary,
            full_snapshot: item.fullSnapshot,
            emitted_at: item.emittedAt,
          }));

          supabase
            .from('rco_emissions')
            .upsert(syncPayload, { onConflict: 'emission_hash' })
            .then(({ error: syncErr }) => {
              if (syncErr) {
                // Tabela pode estar pendente de criação, ignora silenciosamente
              }
            });
        }

        if (typeof window !== 'undefined' && merged.length > 0) {
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(merged));
        }

        return merged;
      } else if (error) {
        // Tabela ainda não existe ou sem permissão - retorna cache local perfeitamente
        if (error.code !== 'PGRST205' && !error.message?.includes('schema cache')) {
          console.warn('Aviso ao consultar rco_emissions:', error.message);
        }
      }
    }
  } catch (err: any) {
    console.warn('Aviso ao carregar rco_emissions:', err?.message || err);
  }

  return localList;
}
