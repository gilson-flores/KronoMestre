import { PlanningItem } from './types';
import { supabase, isSupabaseConfigured } from './supabase';
import { DEFAULT_LOGO_SANTA_CATARINA_BASE64, formatPlanningTextToHtml } from './googleDocsService';

export const PLANNING_STORAGE_KEY = 'sociologia_plannings';

/**
 * Carrega a lista de planejamentos armazenados (localStorage + Supabase)
 */
export async function fetchAllPlannings(): Promise<PlanningItem[]> {
  let localList: PlanningItem[] = [];
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem(PLANNING_STORAGE_KEY);
      if (saved) {
        localList = JSON.parse(saved).filter((item: PlanningItem) => item.id !== 'plan-1' && item.id !== 'plan-2');
      }
    } catch (e) {
      console.warn('Erro ao ler planejamentos do localStorage:', e);
    }
  }

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('plannings')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        const mapped: PlanningItem[] = data.map((p) => ({
          id: p.id,
          title: p.title,
          createdAt: p.created_at ? new Date(p.created_at).toLocaleDateString('pt-BR') : (p.createdAt || new Date().toLocaleDateString('pt-BR')),
          turmas: p.turmas,
          serie: p.serie || '',
          trimestre: p.trimestre || '',
          period: p.period || p.trimestre || '1º Trimestre',
          startDate: p.start_date,
          endDate: p.end_date,
          subject: p.subject || 'Sociologia',
          type: (p.type as 'Sequência Didática' | 'Plano Anual') || 'Sequência Didática',
          description: p.description,
          objectives: p.objectives,
          bnccSkills: p.bncc_skills,
          fase1Content: p.fase1_content,
          fase2Content: p.fase2_content,
          fase3Content: p.fase3_content,
          currentPhase: (p.current_phase as 1 | 2 | 3) || 1,
          fase2DocUrl: p.fase2_doc_url,
          fase2DocumentId: p.fase2_document_id,
          fase3DocUrl: p.fase3_doc_url,
          fase3DocumentId: p.fase3_document_id,
          googleDocsUrl: p.google_docs_url || p.fase3_doc_url || p.fase2_doc_url,
          driveRepositoryUrl: p.drive_repository_url,
          history: typeof p.history === 'string' ? JSON.parse(p.history) : p.history || [],
        }));

        // Mesclar priorizando dados do Supabase
        if (typeof window !== 'undefined') {
          localStorage.setItem(PLANNING_STORAGE_KEY, JSON.stringify(mapped));
        }
        return mapped;
      }
    } catch (dbErr) {
      console.warn('Erro ao consultar plannings no Supabase (utilizando fallback local):', dbErr);
    }
  }

  return localList;
}

/**
 * Salva ou atualiza um planejamento no banco de dados e no localStorage
 */
export async function persistPlanningToDatabase(plan: PlanningItem): Promise<boolean> {
  // 1. Atualizar localStorage imediatamente
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem(PLANNING_STORAGE_KEY);
      const existing: PlanningItem[] = saved ? JSON.parse(saved) : [];
      const index = existing.findIndex((p) => p.id === plan.id);
      let updated: PlanningItem[];
      if (index >= 0) {
        updated = [...existing];
        updated[index] = plan;
      } else {
        updated = [plan, ...existing];
      }
      localStorage.setItem(PLANNING_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Erro ao persistir planejamento no localStorage:', e);
    }
  }

  // 2. Persistir no Supabase se configurado
  if (isSupabaseConfigured && supabase) {
    try {
      const payload = {
        id: plan.id,
        title: plan.title,
        turmas: plan.turmas,
        serie: plan.serie || null,
        trimestre: plan.trimestre || null,
        period: plan.period || null,
        start_date: plan.startDate || null,
        end_date: plan.endDate || null,
        subject: plan.subject || 'Sociologia',
        type: plan.type || 'Sequência Didática',
        description: plan.description || null,
        objectives: plan.objectives || null,
        bncc_skills: plan.bnccSkills || null,
        fase1_content: plan.fase1Content || null,
        fase2_content: plan.fase2Content || null,
        fase3_content: plan.fase3Content || null,
        current_phase: plan.currentPhase || 1,
        fase2_doc_url: plan.fase2DocUrl || null,
        fase2_document_id: plan.fase2DocumentId || null,
        fase3_doc_url: plan.fase3DocUrl || null,
        fase3_document_id: plan.fase3DocumentId || null,
        drive_repository_url: plan.driveRepositoryUrl || null,
        google_docs_url: plan.googleDocsUrl || plan.fase3DocUrl || plan.fase2DocUrl || null,
        history: plan.history || [],
      };

      const { error } = await supabase.from('plannings').upsert(payload);
      if (error) {
        if (error.code === 'PGRST205') {
          console.warn('A tabela "public.plannings" não foi encontrada no banco Supabase. Execute o script de criação de tabela.');
        } else {
          console.warn('Erro ao executar upsert de planning no Supabase:', error);
        }
        return false;
      }
      return true;
    } catch (err) {
      console.warn('Exceção ao persistir planning no Supabase:', err);
      return false;
    }
  }

  return true;
}

/**
 * Exclui um planejamento no banco de dados e no localStorage
 */
export async function removePlanningFromDatabase(planId: string): Promise<boolean> {
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem(PLANNING_STORAGE_KEY);
      if (saved) {
        const existing: PlanningItem[] = JSON.parse(saved);
        const filtered = existing.filter((p) => p.id !== planId);
        localStorage.setItem(PLANNING_STORAGE_KEY, JSON.stringify(filtered));
      }
    } catch (e) {
      console.warn('Erro ao deletar planejamento do localStorage:', e);
    }
  }

  if (isSupabaseConfigured && supabase) {
    try {
      const { error } = await supabase.from('plannings').delete().eq('id', planId);
      if (error) {
        if (error.code === 'PGRST205') {
          console.warn('A tabela "public.plannings" não foi encontrada no banco Supabase. Execute o script de criação de tabela.');
        } else {
          console.warn('Erro ao excluir planning no Supabase:', error);
        }
        return false;
      }
      return true;
    } catch (err) {
      console.warn('Exceção ao excluir planning no Supabase:', err);
      return false;
    }
  }

  return true;
}

/**
 * Exporta o planejamento como documento visual para Impressão / Salvar como PDF
 */
export function exportPlanningToPdf(plan: PlanningItem, customLogoBase64?: string): void {
  if (typeof window === 'undefined') return;

  const logoSrc = customLogoBase64 || DEFAULT_LOGO_SANTA_CATARINA_BASE64;
  const f1Html = plan.fase1Content ? formatPlanningTextToHtml(plan.fase1Content) : (plan.description ? `<p>${plan.description}</p>` : '');
  const f2Html = plan.fase2Content ? formatPlanningTextToHtml(plan.fase2Content) : '';
  const f3Html = plan.fase3Content ? formatPlanningTextToHtml(plan.fase3Content) : '';

  const periodLabel = plan.startDate && plan.endDate ? `${plan.startDate} a ${plan.endDate}` : plan.period;

  const printHtml = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Planejamento SED-SC - ${plan.title}</title>
  <style>
    @page {
      size: A4;
      margin: 18mm 15mm 18mm 15mm;
    }
    body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 11pt;
      line-height: 1.5;
      color: #1a202c;
      background: #ffffff;
      margin: 0;
      padding: 20px;
    }
    .header-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
      border-bottom: 2px solid #002244;
      padding-bottom: 12px;
    }
    .header-logo {
      width: 100px;
      text-align: left;
      vertical-align: middle;
    }
    .header-logo img {
      max-width: 90px;
      max-height: 70px;
      object-fit: contain;
    }
    .header-text {
      text-align: center;
      vertical-align: middle;
    }
    .header-title {
      font-size: 13pt;
      font-weight: bold;
      color: #002244;
      margin: 0;
      text-transform: uppercase;
    }
    .header-sub {
      font-size: 9.5pt;
      color: #2d3748;
      margin: 2px 0 0 0;
      font-weight: 600;
    }
    .meta-box {
      background: #f7fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 12px 16px;
      margin-bottom: 24px;
      font-size: 10pt;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px 16px;
    }
    .meta-item strong {
      color: #002244;
    }
    .section-title {
      font-size: 13pt;
      font-weight: bold;
      color: #002244;
      background: #edf2f7;
      padding: 6px 10px;
      border-left: 4px solid #002244;
      margin-top: 24px;
      margin-bottom: 12px;
      page-break-after: avoid;
    }
    .content-body {
      margin-bottom: 20px;
    }
    .content-body h1, .content-body h2, .content-body h3 {
      color: #1a365d;
      page-break-after: avoid;
    }
    .footer-note {
      margin-top: 30px;
      border-top: 1px solid #cbd5e0;
      padding-top: 8px;
      font-size: 8.5pt;
      color: #718096;
      text-align: center;
    }
    @media print {
      body {
        padding: 0;
      }
      .no-print {
        display: none !important;
      }
    }
  </style>
</head>
<body>
  <div class="no-print" style="background: #ebf8ff; border: 1px solid #bee3f8; padding: 12px; margin-bottom: 20px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center;">
    <span style="font-size: 12pt; font-weight: bold; color: #2b6cb0;">📄 Pré-visualização de Impressão / PDF Oficial SED-SC</span>
    <div>
      <button onclick="window.print()" style="background: #3182ce; color: white; border: none; padding: 8px 16px; border-radius: 6px; font-weight: bold; cursor: pointer; margin-right: 8px;">🖨️ Imprimir / Salvar como PDF</button>
      <button onclick="window.close()" style="background: #e2e8f0; color: #4a5568; border: none; padding: 8px 16px; border-radius: 6px; font-weight: bold; cursor: pointer;">Fechar</button>
    </div>
  </div>

  <table class="header-table">
    <tr>
      <td class="header-logo">
        <img src="${logoSrc}" alt="Logo Santa Catarina" />
      </td>
      <td class="header-text">
        <div class="header-title">ESTADO DE SANTA CATARINA</div>
        <div class="header-sub">SECRETARIA DE ESTADO DA EDUCAÇÃO</div>
        <div class="header-sub">DIRETORIA DE ENSINO • COORDENADORIA REGIONAL DE JOINVILLE</div>
        <div class="header-sub" style="color: #002244; font-weight: bold; margin-top: 4px;">EEB PROF. JANDIRA D'ÁVILA</div>
      </td>
    </tr>
  </table>

  <div style="text-align: center; margin-bottom: 16px;">
    <h2 style="font-size: 14pt; font-weight: bold; color: #002244; margin: 0; text-transform: uppercase;">
      ${plan.title}
    </h2>
    <div style="font-size: 10.5pt; color: #4a5568; font-weight: bold; margin-top: 2px;">
      ${plan.type} • Componente Curricular: ${plan.subject || 'Sociologia'}
    </div>
  </div>

  <div class="meta-box">
    <div class="meta-grid">
      <div class="meta-item"><strong>Professor:</strong> Gilson Rodrigo Flores</div>
      <div class="meta-item"><strong>Data de Registro:</strong> ${plan.createdAt}</div>
      <div class="meta-item"><strong>Série / Nível:</strong> ${plan.serie || plan.turmas}</div>
      <div class="meta-item"><strong>Turma(s):</strong> ${plan.turmas}</div>
      <div class="meta-item"><strong>Trimestre:</strong> ${plan.trimestre || plan.period}</div>
      <div class="meta-item"><strong>Período Letivo:</strong> ${periodLabel}</div>
      ${plan.googleDocsUrl ? `<div class="meta-item" style="grid-column: span 2;"><strong>Google Docs:</strong> <a href="${plan.googleDocsUrl}" target="_blank" style="color: #2b6cb0;">${plan.googleDocsUrl}</a></div>` : ''}
    </div>
  </div>

  ${f1Html ? `
    <div class="section-title">FASE 1 — RESUMO E ALINHAMENTO CURRICULAR</div>
    <div class="content-body">${f1Html}</div>
  ` : ''}

  ${f2Html ? `
    <div class="section-title" style="page-break-before: auto;">FASE 2 — SEQUÊNCIA DIDÁTICA (MODELO OFICIAL SED-SC)</div>
    <div class="content-body">${f2Html}</div>
  ` : ''}

  ${f3Html ? `
    <div class="section-title" style="page-break-before: auto;">FASE 3 — PLANOS DE AULA INDIVIDUAIS (MINUTO A MINUTO)</div>
    <div class="content-body">${f3Html}</div>
  ` : ''}

  <div class="footer-note">
    Documento emitido digitalmente pela plataforma pedagógica • EEB Prof. Jandira D'Ávila • SED-SC Joinville
  </div>

  <script>
    window.addEventListener('DOMContentLoaded', () => {
      setTimeout(() => {
        window.print();
      }, 400);
    });
  </script>
</body>
</html>
  `;

  const printWin = window.open('', '_blank');
  if (printWin) {
    printWin.document.open();
    printWin.document.write(printHtml);
    printWin.document.close();
  } else {
    // Fallback se bloqueado popup
    exportPlanningToTxt(plan);
  }
}

/**
 * Exporta o arquivo TXT oficial
 */
export function exportPlanningToTxt(plan: PlanningItem): void {
  if (typeof window === 'undefined') return;

  const periodLine = plan.type === 'Sequência Didática'
    ? `Trimestre: ${plan.trimestre || plan.period}\nPeríodo de Duração: ${plan.startDate && plan.endDate ? `${plan.startDate} a ${plan.endDate}` : 'Não informado'}`
    : `Trimestre: ${plan.period}`;

  const content = `================================================================================
ESTADO DE SANTA CATARINA
SECRETARIA DE ESTADO DA EDUCAÇÃO
DIRETORIA DE ENSINO
COORDENADORIA REGIONAL DE EDUCAÇÃO DE JOINVILLE
EEB PROF. JANDIRA D'ÁVILA
================================================================================
PLANO DE AULA / SEQUÊNCIA DIDÁTICA: ${plan.title.toUpperCase()}

Professor Responsável: Gilson Rodrigo Flores
Unidade Escolar: EEB Prof. Jandira D'Ávila
Área de Conhecimento: Ciências Humanas e Sociais Aplicadas
Componente Curricular: ${plan.subject || 'Sociologia'}
Ano / Série: ${plan.serie || plan.turmas}
Turma(s): ${plan.turmas}
${periodLine}
Data de Criação: ${plan.createdAt}
Link Google Docs: ${plan.googleDocsUrl || plan.fase3DocUrl || plan.fase2DocUrl || 'Não gerado'}

================================================================================
FASE 1 — RESUMO E CONFERÊNCIA CURRICULAR
================================================================================
${plan.fase1Content || plan.description || 'Nenhum resumo textual registrado.'}

${plan.fase2Content ? `================================================================================
FASE 2 — SEQUÊNCIA DIDÁTICA (MODELO OFICIAL SED-SC)
================================================================================
${plan.fase2Content}` : ''}

${plan.fase3Content ? `================================================================================
FASE 3 — PLANOS DE AULA INDIVIDUAIS (PASSO A PASSO / MINUTO A MINUTO)
================================================================================
${plan.fase3Content}` : ''}

================================================================================
Documento Oficial — EEB Prof. Jandira D'Ávila — Coordenadoria Regional de Joinville
================================================================================
`;

  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const sanitizedTitle = plan.title.replace(/[^a-zA-Z0-9_\-]/g, '_');
  link.download = `Planejamento_SED_SC_${sanitizedTitle}.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
