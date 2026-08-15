'use client';

import React, { useState } from 'react';
import {
  Plus,
  CheckCircle2,
  CheckCheck,
  BarChart3,
  AlertTriangle,
  FileQuestion,
  FileText,
  Users2,
  BookOpen,
  Pencil,
  FileSpreadsheet,
  Trash2,
  TrendingUp,
  Layers,
  Award,
  Eye,
  ShieldAlert,
  ShieldCheck,
  Lock,
  X,
  CopyX,
  ClipboardX,
  Clock,
  RotateCcw,
  Calendar,
  ExternalLink,
  Download,
  Search,
  Sparkles
} from 'lucide-react';
import { Activity, PlanningItem } from '@/lib/types';
import { exportPlanningToPdf, removePlanningFromDatabase } from '@/lib/planningStorage';
import { gerarArquivoGoogleDocs, formatPlanningTextToHtml } from '@/lib/googleDocsService';

interface DashboardViewProps {
  activities: Activity[];
  plannings?: PlanningItem[];
  onOpenNewActivityModal: () => void;
  onSelectActivityForGrading: (act: Activity) => void;
  onEditActivity: (act: Activity) => void;
  onViewActivity?: (act: Activity) => void;
  onGenerateDossier: (act: Activity) => void;
  onDeleteActivity?: (act: Activity) => void;
  onSaveActivity?: (act: Activity) => void;
  onSavePlanning?: (plan: PlanningItem) => void;
  onDeletePlanning?: (planId: string) => void;
  title?: string;
  subtitle?: string;
  showStats?: boolean;
  isCorrecoesTab?: boolean;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  activities,
  plannings = [],
  onOpenNewActivityModal,
  onSelectActivityForGrading,
  onEditActivity,
  onViewActivity,
  onGenerateDossier,
  onDeleteActivity,
  onSaveActivity,
  onSavePlanning,
  onDeletePlanning,
  title = 'Studio',
  subtitle = 'Gerencie avaliações, redações e dinâmicas das suas turmas.',
  showStats = true,
  isCorrecoesTab,
}) => {
  const isCorrecoes = isCorrecoesTab || title === 'Correções';
  const [activityFilter, setActivityFilter] = useState<'todas' | 'a_fazer' | 'a_corrigir' | 'corrigidas'>('todas');
  const [planningSearch, setPlanningSearch] = useState('');
  const [viewingPlan, setViewingPlan] = useState<PlanningItem | null>(null);
  const [planToDelete, setPlanToDelete] = useState<PlanningItem | null>(null);
  const [activePlanModalTab, setActivePlanModalTab] = useState<'visao_geral' | 'fase1' | 'fase2' | 'fase3' | 'docs'>('visao_geral');
  const [isGeneratingDoc, setIsGeneratingDoc] = useState(false);

  const filteredActivities = activities.filter((act) => {
    if (activityFilter === 'a_fazer') {
      return act.status === 'Ativo' || (act.totalStudents - act.totalSubmissions) > 0;
    }
    if (activityFilter === 'a_corrigir') {
      return act.pendingCorrection > 0;
    }
    if (activityFilter === 'corrigidas') {
      return act.pendingCorrection === 0 && act.totalSubmissions > 0;
    }
    return true;
  });

  const filteredPlannings = plannings.filter((p) => {
    if (!planningSearch.trim()) return true;
    const term = planningSearch.toLowerCase();
    return (
      p.title.toLowerCase().includes(term) ||
      p.turmas.toLowerCase().includes(term) ||
      (p.serie && p.serie.toLowerCase().includes(term)) ||
      (p.period && p.period.toLowerCase().includes(term)) ||
      (p.trimestre && p.trimestre.toLowerCase().includes(term))
    );
  });

  const handleOpenGoogleDocs = async (plan: PlanningItem) => {
    const existingUrl = plan.googleDocsUrl || plan.fase3DocUrl || plan.fase2DocUrl;
    if (existingUrl) {
      if (typeof window !== 'undefined') {
        window.open(existingUrl, '_blank');
      }
      return;
    }

    // Se ainda não gerado, gera dinamicamente e salva
    setIsGeneratingDoc(true);
    const bodyContent = plan.fase3Content
      ? `FASE 3 — PLANOS DE AULA INDIVIDUAIS (PASSO A PASSO / MINUTO A MINUTO)\n\n${plan.fase3Content}\n\n================================================================================\nFASE 2 — SEQUÊNCIA DIDÁTICA (MODELO OFICIAL SED-SC)\n\n${plan.fase2Content || ''}`
      : plan.fase2Content
      ? `FASE 2 — SEQUÊNCIA DIDÁTICA (MODELO OFICIAL SED-SC)\n\n${plan.fase2Content}`
      : plan.fase1Content || plan.description || '';

    try {
      const result = await gerarArquivoGoogleDocs(plan.title, bodyContent);
      const updatedPlan: PlanningItem = {
        ...plan,
        googleDocsUrl: result.url,
        fase2DocUrl: plan.fase2DocUrl || result.url,
        fase2DocumentId: plan.fase2DocumentId || result.documentId,
      };
      if (onSavePlanning) {
        onSavePlanning(updatedPlan);
      }
      if (typeof window !== 'undefined') {
        window.open(result.url, '_blank');
      }
    } catch (err) {
      console.error('Erro ao gerar Google Docs:', err);
    } finally {
      setIsGeneratingDoc(false);
    }
  };

  const handleDownloadPdf = (plan: PlanningItem) => {
    exportPlanningToPdf(plan);
  };

  const handleDeletePlanConfirm = async () => {
    if (!planToDelete) return;
    await removePlanningFromDatabase(planToDelete.id);
    if (onDeletePlanning) {
      onDeletePlanning(planToDelete.id);
    }
    setPlanToDelete(null);
  };
  const [activityToDelete, setActivityToDelete] = useState<Activity | null>(null);
  const [securityModalActivity, setSecurityModalActivity] = useState<Activity | null>(null);

  // Local state inside security modal
  const [secFocusLock, setSecFocusLock] = useState(false);
  const [secCopyStatement, setSecCopyStatement] = useState(false);
  const [secPasteEssay, setSecPasteEssay] = useState(false);

  const handleOpenSecurityModal = (act: Activity) => {
    setSecurityModalActivity(act);
    setSecFocusLock(Boolean(act.securityFocusLock));
    setSecCopyStatement(Boolean(act.securityBlockCopyStatement));
    setSecPasteEssay(Boolean(act.securityBlockPasteEssay));
  };

  const handleSaveSecuritySettings = () => {
    if (!securityModalActivity) return;
    const updated: Activity = {
      ...securityModalActivity,
      securityFocusLock: secFocusLock,
      securityBlockCopyStatement: secCopyStatement,
      securityBlockPasteEssay: secPasteEssay,
    };
    if (onSaveActivity) {
      onSaveActivity(updated);
    }
    setSecurityModalActivity(null);
  };

  // Calculate top KPI stats from real state
  const totalActivities = activities.length;
  const totalSubmissions = activities.reduce((acc, a) => acc + a.totalSubmissions, 0);
  const totalExpected = activities.reduce((acc, a) => acc + a.totalStudents, 0);
  const completionRate = totalExpected > 0 ? Math.round((totalSubmissions / totalExpected) * 100) : 0;
  const pendingCorrections = activities.reduce((acc, a) => acc + a.pendingCorrection, 0);

  const activitiesWithGrades = activities.filter((a) => a.averageGrade !== undefined && a.averageGrade > 0);
  const overallAverage = activitiesWithGrades.length > 0
    ? (activitiesWithGrades.reduce((acc, a) => acc + (a.averageGrade || 0), 0) / activitiesWithGrades.length).toFixed(1)
    : '0.0';

  // Stats grouped by type (Production per type)
  const statsByType = {
    Avaliação: activities.filter((a) => a.type === 'Avaliação'),
    Simulado: activities.filter((a) => a.type === 'Simulado'),
    Redação: activities.filter((a) => a.type === 'Redação'),
    Dinâmica: activities.filter((a) => a.type === 'Dinâmica'),
    'Trabalho em grupo': activities.filter((a) => a.type === 'Trabalho em grupo'),
    'Projeto de pesquisa': activities.filter((a) => a.type === 'Projeto de pesquisa'),
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
            {title}
          </h1>
          <p className="text-sm md:text-base text-[#bccabb] mt-1 font-medium">
            {subtitle}
          </p>
        </div>

        {!isCorrecoes && (
          <button
            onClick={onOpenNewActivityModal}
            className="self-start sm:self-center py-3 px-6 bg-[#4ade80] hover:bg-[#6bfb9a] text-[#003919] font-bold rounded-full transition-all duration-200 flex items-center gap-2 shadow-lg shadow-[#4ade80]/20 cursor-pointer text-sm"
          >
            <Plus className="w-5 h-5 stroke-[2.5]" />
            <span>Nova Atividade</span>
          </button>
        )}
      </div>

      {/* Production Dashboard (Painel de Informações de Produção) */}
      {showStats && (
        <div className="space-y-5">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[#4ade80]" />
            <h2 className="text-lg font-bold text-white tracking-tight">Dashboard de Produção Pedagógica</h2>
          </div>

          {/* Primary KPI Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* KPI 1 */}
            <div className="glass-panel p-5 rounded-3xl border border-white/10 relative overflow-hidden group">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold tracking-wider text-[#bccabb] uppercase">
                  Atividades Criadas
                </span>
                <div className="w-8 h-8 rounded-full bg-[#1d273d] text-[#4ade80] flex items-center justify-center">
                  <Layers className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-white mb-1">{totalActivities}</div>
              <div className="text-xs text-[#bccabb]">Total cadastradas no sistema</div>
            </div>

            {/* KPI 2 */}
            <div className="glass-panel p-5 rounded-3xl border border-white/10 relative overflow-hidden group">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold tracking-wider text-[#bccabb] uppercase">
                  Produções Entregues
                </span>
                <div className="w-8 h-8 rounded-full bg-indigo-500/20 text-[#c0c1ff] flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-white mb-1">{totalSubmissions}</div>
              <div className="text-xs text-[#4ade80] font-semibold">
                {completionRate}% de engajamento ({totalExpected} esperadas)
              </div>
            </div>

            {/* KPI 3 */}
            <div className="glass-panel p-5 rounded-3xl border border-white/10 relative overflow-hidden group">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold tracking-wider text-[#bccabb] uppercase">
                  Média Geral
                </span>
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center">
                  <Award className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-white mb-1">{overallAverage}</div>
              <div className="text-xs text-[#bccabb]">
                {activitiesWithGrades.length > 0 ? `${activitiesWithGrades.length} atividades avaliadas` : 'Sem notas ainda'}
              </div>
            </div>

            {/* KPI 4 */}
            <div className="glass-panel p-5 rounded-3xl border border-white/10 relative overflow-hidden group">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold tracking-wider text-[#bccabb] uppercase">
                  Pendentes de Correção
                </span>
                <div className="w-8 h-8 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-white mb-1">{pendingCorrections}</div>
              <div className="text-xs text-rose-300 font-semibold">
                {pendingCorrections > 0 ? 'Aguardando avaliação do professor' : 'Em dia'}
              </div>
            </div>
          </div>

          {/* Secondary Production Breakdown Grid by Category */}
          <div className="glass-panel p-5 rounded-3xl border border-white/10 space-y-3">
            <h3 className="text-xs font-bold text-[#bccabb] uppercase tracking-wider">
              Produções por Categoria
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Object.entries(statsByType).map(([catType, items]) => {
                const subCount = items.reduce((acc, i) => acc + i.totalSubmissions, 0);
                const expCount = items.reduce((acc, i) => acc + i.totalStudents, 0);
                const catRate = expCount > 0 ? Math.round((subCount / expCount) * 100) : 0;

                return (
                  <div key={catType} className="bg-[#131b2e] p-3.5 rounded-2xl border border-white/5 space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-bold text-white">
                      <span>{catType}s</span>
                      <span className="text-[#4ade80]">{items.length} ativ.</span>
                    </div>
                    <div className="text-xs text-[#bccabb] flex items-center justify-between">
                      <span>{subCount} entregas</span>
                      <span className="font-semibold text-white">{catRate}%</span>
                    </div>
                    <div className="w-full bg-[#0b1326] h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-[#4ade80] h-full rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(catRate, 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Atividades Recentes List */}
      <div className="space-y-4 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <span>Missões & Atividades</span>
            <span className="text-xs font-normal text-[#bccabb]">
              ({filteredActivities.length} {filteredActivities.length === 1 ? 'item' : 'itens'})
            </span>
          </h2>

          {/* List Filter Tabs */}
          <div className="flex items-center gap-1 bg-[#131b2e] p-1 rounded-xl border border-white/10 text-xs overflow-x-auto">
            <button
              onClick={() => setActivityFilter('todas')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
                activityFilter === 'todas'
                  ? 'bg-[#4ade80] text-[#003919]'
                  : 'text-[#bccabb] hover:text-white'
              }`}
            >
              Todas
            </button>
            <button
              onClick={() => setActivityFilter('a_fazer')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
                activityFilter === 'a_fazer'
                  ? 'bg-[#4ade80] text-[#003919]'
                  : 'text-[#bccabb] hover:text-white'
              }`}
            >
              📜 A Fazer
            </button>
            <button
              onClick={() => setActivityFilter('a_corrigir')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
                activityFilter === 'a_corrigir'
                  ? 'bg-[#4ade80] text-[#003919]'
                  : 'text-[#bccabb] hover:text-white'
              }`}
            >
              ⏳ A Corrigir ({activities.reduce((acc, a) => acc + a.pendingCorrection, 0)})
            </button>
            <button
              onClick={() => setActivityFilter('corrigidas')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
                activityFilter === 'corrigidas'
                  ? 'bg-[#4ade80] text-[#003919]'
                  : 'text-[#bccabb] hover:text-white'
              }`}
            >
              ✅ Corrigidas
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {filteredActivities.length === 0 ? (
            <div className="glass-panel p-12 text-center rounded-3xl border border-white/10 text-[#bccabb] space-y-2">
              <p className="font-bold text-white text-base">Nenhuma missão encontrada para este filtro.</p>
              <p className="text-xs text-[#bccabb]">Clique em &quot;+ Nova Atividade&quot; para criar novos pergaminhos ou troque o filtro acima.</p>
            </div>
          ) : (
            filteredActivities.map((act) => {
              let Icon = FileText;
              if (act.type === 'Simulado') Icon = FileQuestion;
              if (act.type === 'Dinâmica' || act.type === 'Trabalho em grupo') Icon = Users2;
              if (act.type === 'Projeto de pesquisa') Icon = BookOpen;

              // Calculate submission return breakdowns
              const ret1x = act.submissions.filter((s) => s.status === 'returned' && (s.returnCount === 1 || !s.returnCount)).length;
              const ret2x = act.submissions.filter((s) => s.status === 'returned' && s.returnCount === 2).length;
              const ret3x = act.submissions.filter((s) => s.status === 'returned' && s.returnCount === 3).length;
              const gradedCount = act.submissions.filter((s) => s.status === 'graded').length;

              return (
                <div
                  key={act.id}
                  onClick={() => {
                    if (onViewActivity) onViewActivity(act);
                  }}
                  className={`glass-panel p-5 md:p-6 rounded-3xl transition-all duration-200 border border-white/10 hover:border-[#4ade80]/40 cursor-pointer ${
                    act.pendingCorrection > 0 ? 'ring-1 ring-[#4ade80]/30' : ''
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Left Info */}
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-[#1d273d] border border-white/10 text-[#4ade80] flex items-center justify-center shrink-0 mt-0.5">
                        <Icon className="w-6 h-6" />
                      </div>

                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base md:text-lg font-bold text-white leading-snug">
                            {act.title}
                          </h3>

                          {/* Status Badge */}
                          <span
                            className={`text-[11px] font-bold px-3 py-0.5 rounded-full ${
                              act.status === 'Ativo'
                                ? 'bg-[#4ade80]/20 text-[#4ade80] border border-[#4ade80]/30'
                                : act.status === 'Prazo Encerrado'
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                : 'bg-slate-700/50 text-slate-300 border border-slate-600'
                            }`}
                          >
                            {act.status}
                          </span>

                          {/* Turma Badge */}
                          <span className="text-[11px] font-semibold bg-[#171f33] text-[#bccabb] px-3 py-0.5 rounded-full border border-white/5">
                            Turma: {act.turma}
                          </span>

                          {/* Anti-Cola Badges */}
                          {act.securityFocusLock && (
                            <span className="text-[10px] font-bold bg-amber-500/20 text-amber-300 px-2.5 py-0.5 rounded-full border border-amber-500/30 flex items-center gap-1" title="Trava de Foco: Avisos ao mudar de tela (auto-entrega no 4º desvio)">
                              <ShieldAlert className="w-3 h-3 text-amber-400" />
                              <span>Trava de Foco</span>
                            </span>
                          )}
                          {act.securityBlockCopyStatement && (
                            <span className="text-[10px] font-bold bg-rose-500/20 text-rose-300 px-2.5 py-0.5 rounded-full border border-rose-500/30 flex items-center gap-1" title="Cópia dos enunciados bloqueada">
                              <CopyX className="w-3 h-3 text-rose-400" />
                              <span>Sem Cópia</span>
                            </span>
                          )}
                          {act.securityBlockPasteEssay && (
                            <span className="text-[10px] font-bold bg-purple-500/20 text-purple-300 px-2.5 py-0.5 rounded-full border border-purple-500/30 flex items-center gap-1" title="Colar em respostas dissertativas bloqueado">
                              <ClipboardX className="w-3 h-3 text-purple-400" />
                              <span>Sem Cola</span>
                            </span>
                          )}
                        </div>

                        {/* Subtle Deadline & Status Breakdown Row */}
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          {/* Subtle Highlighted Deadline Badge */}
                          <span className="px-3 py-1 rounded-xl text-xs font-bold bg-[#131b2e] text-amber-300 border border-amber-500/30 flex items-center gap-1.5 shadow-sm">
                            <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            <span>Prazo Limite: {act.deadline || 'Sem data'}</span>
                          </span>

                          {/* Submission Status Badges */}
                          {act.totalSubmissions > 0 ? (
                            <span className="px-3 py-1 rounded-xl text-xs font-semibold bg-[#131b2e] text-white border border-white/10 flex items-center gap-1.5">
                              👥 {act.totalSubmissions}/{act.totalStudents} Entregas
                            </span>
                          ) : (
                            <span className="px-3 py-1 rounded-xl text-xs font-semibold bg-[#131b2e] text-[#bccabb] border border-white/5">
                              📜 0 Entregas (Pendente)
                            </span>
                          )}

                          {act.pendingCorrection > 0 && (
                            <span className="px-3 py-1 rounded-xl text-xs font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1.5">
                              ⏳ {act.pendingCorrection} A Corrigir pelo Sensei
                            </span>
                          )}

                          {gradedCount > 0 && (
                            <span className="px-3 py-1 rounded-xl text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                              ✅ {gradedCount} Corrigidas
                            </span>
                          )}

                          {/* Returned Badges */}
                          {ret1x > 0 && (
                            <span className="px-2.5 py-1 rounded-xl text-xs font-semibold bg-orange-500/15 text-orange-300 border border-orange-500/30">
                              ↩️ {ret1x} Devolvida 1x
                            </span>
                          )}
                          {ret2x > 0 && (
                            <span className="px-2.5 py-1 rounded-xl text-xs font-semibold bg-orange-600/20 text-orange-200 border border-orange-500/40">
                              ↩️ {ret2x} Devolvida 2x
                            </span>
                          )}
                          {ret3x > 0 && (
                            <span className="px-2.5 py-1 rounded-xl text-xs font-extrabold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                              🚨 {ret3x} Devolvida 3x
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right Actions */}
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="flex flex-wrap items-center gap-2 w-full lg:w-auto pt-2 lg:pt-0 border-t lg:border-t-0 border-white/5"
                    >
                      {onViewActivity && (
                        <button
                          onClick={() => onViewActivity(act)}
                          className="flex-1 sm:flex-none px-4 py-2.5 bg-[#1d273d] hover:bg-[#283654] text-[#dae2fd] hover:text-white rounded-full text-xs font-bold border border-white/10 flex items-center justify-center gap-1.5 transition-colors cursor-pointer min-h-[44px]"
                          title="Ver detalhes e formulário da atividade"
                        >
                          <Eye className="w-4 h-4 text-sky-400 shrink-0" />
                          <span>Abrir Atividade</span>
                        </button>
                      )}

                      <button
                        onClick={() => onSelectActivityForGrading(act)}
                        className="flex-1 sm:flex-none px-4 py-2.5 bg-[#4ade80] hover:bg-[#6bfb9a] text-[#003919] font-bold rounded-full text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-[#4ade80]/10 cursor-pointer min-h-[44px]"
                      >
                        <CheckCheck className="w-4 h-4 stroke-[2.5] shrink-0" />
                        <span>{act.pendingCorrection > 0 ? `Corrigir (${act.pendingCorrection})` : 'Acessar Correções'}</span>
                      </button>

                      {!isCorrecoes && (
                        <>
                          <button
                            onClick={() => handleOpenSecurityModal(act)}
                            className="flex-1 sm:flex-none px-4 py-2.5 bg-[#171f33] hover:bg-[#222a3d] text-[#dae2fd] hover:text-white rounded-full text-xs font-bold border border-white/10 flex items-center justify-center gap-1.5 transition-colors cursor-pointer min-h-[44px]"
                            title="Configurar Trava de Foco, Cópia de Enunciado e Cola de Redação"
                          >
                            <ShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            <span>Anti-Cola</span>
                            {(act.securityFocusLock || act.securityBlockCopyStatement || act.securityBlockPasteEssay) && (
                              <span className="w-2 h-2 rounded-full bg-[#4ade80]" />
                            )}
                          </button>

                          <button
                            onClick={() => onEditActivity(act)}
                            className="flex-1 sm:flex-none px-4 py-2.5 bg-[#171f33] hover:bg-[#222a3d] text-[#dae2fd] hover:text-white rounded-full text-xs font-bold border border-white/10 flex items-center justify-center gap-1.5 transition-colors cursor-pointer min-h-[44px]"
                          >
                            <Pencil className="w-3.5 h-3.5 text-[#4ade80] shrink-0" />
                            <span>Editar</span>
                          </button>
                        </>
                      )}

                      {act.status === 'Prazo Encerrado' && (
                        <button
                          onClick={() => onGenerateDossier(act)}
                          className="flex-1 sm:flex-none px-4 py-2.5 bg-[#171f33] hover:bg-[#222a3d] text-[#dae2fd] rounded-full text-xs font-bold border border-white/10 flex items-center justify-center gap-1.5 transition-colors cursor-pointer min-h-[44px]"
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5 text-[#c0c1ff] shrink-0" />
                          <span>Gerar Dossiê</span>
                        </button>
                      )}

                      {!isCorrecoes && onDeleteActivity && (
                        <button
                          onClick={() => setActivityToDelete(act)}
                          className="px-3.5 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 hover:text-rose-200 rounded-full text-xs font-bold border border-rose-500/20 flex items-center justify-center gap-1.5 transition-colors cursor-pointer min-h-[44px]"
                          title="Excluir Atividade"
                        >
                          <Trash2 className="w-3.5 h-3.5 shrink-0" />
                          <span>Excluir</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Tabela de Planejamentos Pedagógicos & Sequências Didáticas (ERP) */}
      {!isCorrecoes && (
        <div className="bg-[#0e172a] border border-white/10 rounded-3xl p-6 md:p-8 space-y-6 shadow-xl animate-fadeIn">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
            <div>
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-[#4ade80]/10 text-[#4ade80] border border-[#4ade80]/20">
                  <Calendar className="w-5 h-5" />
                </div>
                <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">
                  Planejamentos Pedagógicos & Sequências Didáticas
                </h2>
              </div>
              <p className="text-xs text-[#bccabb] mt-1">
                Registros sincronizados de Sequências Didáticas (Fase 2) e Planos de Aula (Fase 3) com o Google Workspace.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="w-4 h-4 text-[#bccabb] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={planningSearch}
                  onChange={(e) => setPlanningSearch(e.target.value)}
                  placeholder="Buscar planejamento..."
                  className="pl-9 pr-4 py-2 bg-[#131b2e] border border-white/10 rounded-full text-xs text-white placeholder:text-[#bccabb]/50 focus:outline-none focus:border-[#4ade80] w-48 sm:w-64 transition-all"
                />
              </div>
              <div className="px-3.5 py-1.5 rounded-full bg-[#171f33] border border-white/10 text-xs font-bold text-[#4ade80] shrink-0">
                {filteredPlannings.length} {filteredPlannings.length === 1 ? 'registro' : 'registros'}
              </div>
            </div>
          </div>

          {filteredPlannings.length === 0 ? (
            <div className="text-center py-12 bg-[#131b2e]/50 rounded-2xl border border-dashed border-white/10 space-y-3">
              <div className="p-3 bg-white/5 rounded-2xl w-fit mx-auto text-[#bccabb]">
                <Calendar className="w-8 h-8 opacity-60" />
              </div>
              <p className="text-sm font-semibold text-white">Nenhum planejamento registrado ainda</p>
              <p className="text-xs text-[#bccabb] max-w-md mx-auto">
                Crie e execute uma Sequência Didática com o GEM na aba <strong className="text-white">Planejamento</strong> para sincronizar automaticamente os dados aqui.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-[#bccabb] font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3.5 px-4">Data</th>
                    <th className="py-3.5 px-4">Turma(s) & Série</th>
                    <th className="py-3.5 px-4">Trimestre & Período</th>
                    <th className="py-3.5 px-4">Fase 2 (Seq. Didática)</th>
                    <th className="py-3.5 px-4">Fase 3 (Planos de Aula)</th>
                    <th className="py-3.5 px-4">Google Docs</th>
                    <th className="py-3.5 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredPlannings.map((plan) => {
                    const hasFase2 = Boolean(plan.fase2Content);
                    const hasFase3 = Boolean(plan.fase3Content);
                    const docLink = plan.googleDocsUrl || plan.fase3DocUrl || plan.fase2DocUrl;

                    return (
                      <tr
                        key={plan.id}
                        className="hover:bg-white/[0.02] transition-colors group"
                      >
                        {/* Data */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Clock className="w-3.5 h-3.5 text-[#bccabb]" />
                            <span className="font-semibold text-white">{plan.createdAt}</span>
                          </div>
                        </td>

                        {/* Turmas & Série */}
                        <td className="py-4 px-4">
                          <div className="space-y-0.5">
                            <p className="font-bold text-white text-xs line-clamp-1">{plan.title}</p>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-300 border border-blue-500/20 text-[10px] font-bold">
                                {plan.serie || '1ª Série Regular'}
                              </span>
                              <span className="text-[#bccabb] text-[11px] font-medium">
                                {plan.turmas}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Trimestre / Período */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          <div className="space-y-0.5">
                            <span className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-[10px] font-bold">
                              {plan.trimestre || plan.period || '1º Trimestre'}
                            </span>
                            {plan.startDate && plan.endDate && (
                              <p className="text-[10px] text-[#bccabb]">
                                {plan.startDate} até {plan.endDate}
                              </p>
                            )}
                          </div>
                        </td>

                        {/* Conteúdo Fase 2 */}
                        <td className="py-4 px-4">
                          {hasFase2 ? (
                            <div className="space-y-1">
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#4ade80] bg-[#4ade80]/10 px-2 py-0.5 rounded-md border border-[#4ade80]/20">
                                <CheckCircle2 className="w-3 h-3" /> Gerada
                              </span>
                              <p className="text-[11px] text-[#bccabb] line-clamp-1 max-w-[200px]">
                                {plan.fase2Content?.substring(0, 60)}...
                              </p>
                            </div>
                          ) : (
                            <span className="inline-block text-[10px] font-semibold text-[#bccabb]/60 bg-white/5 px-2 py-0.5 rounded-md border border-white/5">
                              Pendente
                            </span>
                          )}
                        </td>

                        {/* Conteúdo Fase 3 */}
                        <td className="py-4 px-4">
                          {hasFase3 ? (
                            <div className="space-y-1">
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded-md border border-purple-500/20">
                                <CheckCircle2 className="w-3 h-3" /> Concluída
                              </span>
                              <p className="text-[11px] text-[#bccabb] line-clamp-1 max-w-[200px]">
                                {plan.fase3Content?.substring(0, 60)}...
                              </p>
                            </div>
                          ) : (
                            <span className="inline-block text-[10px] font-semibold text-[#bccabb]/60 bg-white/5 px-2 py-0.5 rounded-md border border-white/5">
                              Pendente
                            </span>
                          )}
                        </td>

                        {/* Google Docs */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          {docLink ? (
                            <a
                              href={docLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border border-blue-500/20 text-[11px] font-bold transition-colors cursor-pointer"
                              title="Abrir no Google Docs"
                            >
                              <FileText className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                              <span>Docs Drive</span>
                              <ExternalLink className="w-3 h-3 shrink-0" />
                            </a>
                          ) : (
                            <button
                              onClick={() => handleOpenGoogleDocs(plan)}
                              disabled={isGeneratingDoc}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[#bccabb] hover:text-white border border-white/10 text-[11px] font-bold transition-colors cursor-pointer"
                            >
                              <FileText className="w-3.5 h-3.5 shrink-0" />
                              <span>Sincronizar</span>
                            </button>
                          )}
                        </td>

                        {/* Botões de Ação */}
                        <td className="py-4 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* 1. Visualizar */}
                            <button
                              onClick={() => {
                                setViewingPlan(plan);
                                setActivePlanModalTab('visao_geral');
                              }}
                              className="px-2.5 py-1.5 bg-white/10 hover:bg-white/15 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                              title="Visualizar Planejamento em Tela"
                            >
                              <Eye className="w-3.5 h-3.5 text-[#4ade80]" />
                              <span>Visualizar</span>
                            </button>

                            {/* 2. Abrir Google Docs */}
                            <button
                              onClick={() => handleOpenGoogleDocs(plan)}
                              className="px-2.5 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border border-blue-500/20 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                              title="Abrir Google Docs"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span className="hidden xl:inline">Abrir</span> Google Docs
                            </button>

                            {/* 3. Baixar PDF */}
                            <button
                              onClick={() => handleDownloadPdf(plan)}
                              className="px-2.5 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/20 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                              title="Baixar PDF / Imprimir"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>Baixar PDF</span>
                            </button>

                            {/* 4. Excluir */}
                            <button
                              onClick={() => setPlanToDelete(plan)}
                              className="px-2.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 hover:text-rose-200 border border-rose-500/20 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                              title="Excluir Registro"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Excluir</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal de Visualização Completa do Planejamento */}
      {viewingPlan && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn overflow-y-auto">
          <div className="bg-[#0e172a] border border-white/15 rounded-3xl p-6 md:p-8 max-w-4xl w-full shadow-2xl space-y-6 relative my-auto max-h-[90vh] flex flex-col">
            {/* Cabeçalho Institucional do Modal */}
            <div className="flex items-start justify-between border-b border-white/10 pb-4 pr-10 shrink-0">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#4ade80] bg-[#4ade80]/10 px-2.5 py-0.5 rounded-full border border-[#4ade80]/20">
                    Documento Oficial SED-SC
                  </span>
                  <span className="text-xs text-[#bccabb]">•</span>
                  <span className="text-xs text-[#bccabb]">EEB Prof. Jandira D&apos;Ávila</span>
                </div>
                <h3 className="text-xl md:text-2xl font-black text-white tracking-tight">
                  {viewingPlan.title}
                </h3>
                <div className="flex items-center gap-2 flex-wrap pt-1">
                  <span className="px-2.5 py-0.5 rounded-md bg-blue-500/10 text-blue-300 border border-blue-500/20 text-xs font-bold">
                    Série: {viewingPlan.serie || '1ª Série Regular'}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-md bg-white/5 text-[#dae2fd] border border-white/10 text-xs font-medium">
                    Turmas: {viewingPlan.turmas}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-xs font-bold">
                    {viewingPlan.trimestre || viewingPlan.period || '1º Trimestre'}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-md bg-purple-500/10 text-purple-300 border border-purple-500/20 text-xs font-bold">
                    Bloco: 45 min
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingPlan(null)}
                className="p-2 text-[#bccabb] hover:text-white rounded-full hover:bg-white/5 transition-colors cursor-pointer absolute top-4 right-4 min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Fechar"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Tabs do Modal */}
            <div className="flex items-center gap-2 border-b border-white/10 pb-2 overflow-x-auto shrink-0">
              <button
                type="button"
                onClick={() => setActivePlanModalTab('visao_geral')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  activePlanModalTab === 'visao_geral'
                    ? 'bg-[#4ade80] text-[#003919] shadow-md'
                    : 'bg-[#171f33] text-[#bccabb] hover:text-white'
                }`}
              >
                Visão Geral
              </button>
              <button
                type="button"
                onClick={() => setActivePlanModalTab('fase1')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  activePlanModalTab === 'fase1'
                    ? 'bg-[#4ade80] text-[#003919] shadow-md'
                    : 'bg-[#171f33] text-[#bccabb] hover:text-white'
                }`}
              >
                Fase 1: Alinhamento
              </button>
              <button
                type="button"
                onClick={() => setActivePlanModalTab('fase2')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  activePlanModalTab === 'fase2'
                    ? 'bg-[#4ade80] text-[#003919] shadow-md'
                    : 'bg-[#171f33] text-[#bccabb] hover:text-white'
                }`}
              >
                Fase 2: Sequência Didática (SED-SC)
              </button>
              <button
                type="button"
                onClick={() => setActivePlanModalTab('fase3')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  activePlanModalTab === 'fase3'
                    ? 'bg-[#4ade80] text-[#003919] shadow-md'
                    : 'bg-[#171f33] text-[#bccabb] hover:text-white'
                }`}
              >
                Fase 3: Planos de Aula (Minuto a Minuto)
              </button>
              <button
                type="button"
                onClick={() => setActivePlanModalTab('docs')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  activePlanModalTab === 'docs'
                    ? 'bg-[#4ade80] text-[#003919] shadow-md'
                    : 'bg-[#171f33] text-[#bccabb] hover:text-white'
                }`}
              >
                Google Workspace
              </button>
            </div>

            {/* Conteúdo Dinâmico das Tabs */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {activePlanModalTab === 'visao_geral' && (
                <div className="space-y-4 text-xs text-[#dae2fd]">
                  <div className="bg-[#131b2e] p-4 rounded-2xl border border-white/10 space-y-3">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-[#4ade80]" />
                      Identificação & Contexto Pedagógico
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-[#bccabb] block">Professor:</span>
                        <strong className="text-white">Gilson Rodrigo Flores</strong>
                      </div>
                      <div>
                        <span className="text-[#bccabb] block">Componente Curricular:</span>
                        <strong className="text-white">{viewingPlan.subject || 'Sociologia'}</strong>
                      </div>
                      <div>
                        <span className="text-[#bccabb] block">Período / Trimestre:</span>
                        <strong className="text-white">{viewingPlan.trimestre || viewingPlan.period || '1º Trimestre'}</strong>
                      </div>
                      <div>
                        <span className="text-[#bccabb] block">Intervalo de Datas:</span>
                        <strong className="text-white">
                          {viewingPlan.startDate && viewingPlan.endDate
                            ? `${viewingPlan.startDate} a ${viewingPlan.endDate}`
                            : 'Conforme calendário escolar'}
                        </strong>
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#131b2e] p-4 rounded-2xl border border-white/10 space-y-2">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <Award className="w-4 h-4 text-blue-400" />
                      Competências & Habilidades da BNCC
                    </h4>
                    <p className="text-[#bccabb] font-mono text-xs bg-[#0e172a] p-3 rounded-xl border border-white/5">
                      {viewingPlan.bnccSkills || 'EM13CHS101, EM13CHS102, EM13CHS201, EM13CHS401'}
                    </p>
                  </div>

                  <div className="bg-[#131b2e] p-4 rounded-2xl border border-white/10 space-y-2">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <FileText className="w-4 h-4 text-purple-400" />
                      Resumo da Proposta
                    </h4>
                    <p className="text-[#bccabb] leading-relaxed whitespace-pre-wrap">
                      {viewingPlan.description || viewingPlan.objectives}
                    </p>
                  </div>
                </div>
              )}

              {activePlanModalTab === 'fase1' && (
                <div className="bg-[#131b2e] p-5 rounded-2xl border border-white/10 space-y-4">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-[#4ade80]" />
                      Fase 1: Resumo, Cronograma e Alinhamento Curricular
                    </h4>
                    <span className="text-[10px] text-[#bccabb]">Gemini 2.5 Pro</span>
                  </div>
                  <div className="text-xs text-[#dae2fd] leading-relaxed whitespace-pre-wrap font-sans bg-[#0e172a] p-4 rounded-xl border border-white/5 max-h-96 overflow-y-auto">
                    {viewingPlan.fase1Content || viewingPlan.description || 'Nenhum resumo da Fase 1 registrado.'}
                  </div>
                </div>
              )}

              {activePlanModalTab === 'fase2' && (
                <div className="bg-[#131b2e] p-5 rounded-2xl border border-white/10 space-y-4">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#4ade80]" />
                      Fase 2: Sequência Didática Oficial SED-SC
                    </h4>
                    <span className="text-[10px] text-[#4ade80] font-bold bg-[#4ade80]/10 px-2 py-0.5 rounded-full border border-[#4ade80]/20">
                      Modelo Oficial SED-SC
                    </span>
                  </div>
                  {viewingPlan.fase2Content ? (
                    <div className="text-xs text-[#dae2fd] leading-relaxed whitespace-pre-wrap font-sans bg-[#0e172a] p-4 rounded-xl border border-white/5 max-h-96 overflow-y-auto">
                      {viewingPlan.fase2Content}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-[#bccabb] bg-[#0e172a] rounded-xl border border-dashed border-white/10 space-y-2">
                      <p className="font-semibold text-white">Fase 2 ainda não gerada</p>
                      <p className="text-xs">Abra a aba Planejamento e aprove a Fase 1 para gerar a Sequência Didática.</p>
                    </div>
                  )}
                </div>
              )}

              {activePlanModalTab === 'fase3' && (
                <div className="bg-[#131b2e] p-5 rounded-2xl border border-white/10 space-y-4">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <Layers className="w-4 h-4 text-purple-400" />
                      Fase 3: Planos de Aula Individuais (Minuto a Minuto)
                    </h4>
                    <span className="text-[10px] text-purple-300 font-bold bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20">
                      Blocos de 45 min
                    </span>
                  </div>
                  {viewingPlan.fase3Content ? (
                    <div className="text-xs text-[#dae2fd] leading-relaxed whitespace-pre-wrap font-sans bg-[#0e172a] p-4 rounded-xl border border-white/5 max-h-96 overflow-y-auto">
                      {viewingPlan.fase3Content}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-[#bccabb] bg-[#0e172a] rounded-xl border border-dashed border-white/10 space-y-2">
                      <p className="font-semibold text-white">Fase 3 ainda não gerada</p>
                      <p className="text-xs">Aprove a Fase 2 na aba Planejamento para disparar a geração dos planos de aula individuais.</p>
                    </div>
                  )}
                </div>
              )}

              {activePlanModalTab === 'docs' && (
                <div className="bg-[#131b2e] p-5 rounded-2xl border border-white/10 space-y-4">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-400" />
                    Integração Google Workspace (Drive & Docs)
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="bg-[#0e172a] p-4 rounded-xl border border-white/5 space-y-2">
                      <span className="font-bold text-white block">Documento Google Docs:</span>
                      <p className="text-[11px] text-[#bccabb]">Arquivo formatado com o brasão de Santa Catarina e cabeçalho oficial.</p>
                      {viewingPlan.googleDocsUrl || viewingPlan.fase3DocUrl || viewingPlan.fase2DocUrl ? (
                        <a
                          href={viewingPlan.googleDocsUrl || viewingPlan.fase3DocUrl || viewingPlan.fase2DocUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-xl text-xs transition-all shadow-md mt-2"
                        >
                          <ExternalLink className="w-4 h-4" />
                          <span>Abrir no Google Docs</span>
                        </a>
                      ) : (
                        <button
                          onClick={() => handleOpenGoogleDocs(viewingPlan)}
                          className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl text-xs transition-all mt-2"
                        >
                          Gerar Documento Agora
                        </button>
                      )}
                    </div>

                    <div className="bg-[#0e172a] p-4 rounded-xl border border-white/5 space-y-2">
                      <span className="font-bold text-white block">Repositório Digital Drive:</span>
                      <p className="text-[11px] text-[#bccabb]">Pasta da escola onde os planos individuais ficam organizados.</p>
                      <a
                        href={viewingPlan.driveRepositoryUrl || 'https://drive.google.com/drive/folders/ee-b-prof-jandira-davila-planos-individuais'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-all shadow-md mt-2"
                      >
                        <ExternalLink className="w-4 h-4" />
                        <span>Acessar Pasta no Drive</span>
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Rodapé de Ações do Modal */}
            <div className="flex items-center justify-between gap-3 pt-4 border-t border-white/10 shrink-0">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenGoogleDocs(viewingPlan)}
                  className="px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-full text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <FileText className="w-4 h-4" />
                  <span>Abrir Google Docs</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadPdf(viewingPlan)}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Baixar PDF Oficial</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setViewingPlan(null)}
                className="px-5 py-2.5 bg-white/10 hover:bg-white/15 text-white rounded-full text-xs font-bold transition-all cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão do Planejamento */}
      {planToDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[#0e172a] border border-white/15 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-3 bg-rose-500/10 rounded-2xl border border-rose-500/20">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Excluir Planejamento</h3>
                <p className="text-xs text-[#bccabb]">Esta ação é irreversível.</p>
              </div>
            </div>

            <p className="text-xs text-[#dae2fd] bg-[#131b2e] p-4 rounded-2xl border border-white/5 leading-relaxed">
              Tem certeza que deseja excluir o planejamento <strong className="text-white">&quot;{planToDelete.title}&quot;</strong>? Esta ação removerá o registro do banco de dados e do dashboard do ERP.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setPlanToDelete(null)}
                className="px-4 py-2.5 bg-white/10 hover:bg-white/15 text-white rounded-full text-xs font-bold transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeletePlanConfirm}
                className="px-5 py-2.5 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-full text-xs transition-all shadow-md shadow-rose-500/20 cursor-pointer"
              >
                Sim, Excluir Planejamento
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Delete Confirmation Modal */}
      {activityToDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[#0e172a] border border-white/15 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-3 bg-rose-500/10 rounded-2xl border border-rose-500/20">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Excluir Atividade</h3>
                <p className="text-xs text-[#bccabb]">Esta ação é irreversível.</p>
              </div>
            </div>

            <p className="text-xs text-[#dae2fd] bg-[#131b2e] p-4 rounded-2xl border border-white/5 leading-relaxed">
              Tem certeza que deseja excluir a atividade <strong className="text-white">&quot;{activityToDelete.title}&quot;</strong>? Todas as entregas e correções associadas a ela serão removidas.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setActivityToDelete(null)}
                className="px-4 py-2.5 bg-white/10 hover:bg-white/15 text-white rounded-full text-xs font-bold transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onDeleteActivity) {
                    onDeleteActivity(activityToDelete);
                  }
                  setActivityToDelete(null);
                }}
                className="px-5 py-2.5 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-full text-xs transition-all shadow-md shadow-rose-500/20 cursor-pointer"
              >
                Sim, Excluir Atividade
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Anti-Cola Security Configuration Modal */}
      {securityModalActivity && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn overflow-y-auto">
          <div className="bg-[#0e172a] border border-white/15 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-6 relative my-auto">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-white/10 pb-4 pr-8">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-amber-500/10 text-amber-400 rounded-2xl border border-amber-500/20 shrink-0">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-white">Seguranças Anti-Cola (Studio)</h3>
                  <p className="text-xs text-[#bccabb]">
                    Atividade: <span className="text-white font-semibold">{securityModalActivity.title}</span> ({securityModalActivity.turma})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSecurityModalActivity(null)}
                className="p-2 text-[#bccabb] hover:text-white rounded-full hover:bg-white/5 transition-colors cursor-pointer absolute top-4 right-4 min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Toggles */}
            <div className="space-y-4">
              
              {/* Trava 1: Trava de Foco */}
              <div className="bg-[#131b2e] p-4 rounded-2xl border border-white/10 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      <ShieldAlert className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">1. Trava de Foco (Desvio de Tela)</h4>
                      <p className="text-[11px] text-amber-300 font-semibold">
                        Aviso ao sair da tela • Máx 4 avisos • Auto-entrega
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSecFocusLock(!secFocusLock)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer min-h-[38px] ${
                      secFocusLock
                        ? 'bg-[#4ade80] text-[#003919] shadow-md shadow-[#4ade80]/10'
                        : 'bg-[#171f33] text-[#bccabb] border border-white/10'
                    }`}
                  >
                    {secFocusLock ? 'ATIVADA' : 'DESATIVADA'}
                  </button>
                </div>
                <p className="text-[11px] text-[#bccabb] leading-relaxed pl-1 pt-1 border-t border-white/5">
                  Se o aluno mudar de aba, janela ou aplicativo durante a prova, recebe um alerta. No 4º aviso, a atividade é finalizada e entregue automaticamente do jeito que está.
                </p>
              </div>

              {/* Trava 2: Trava de Cópia dos Enunciados */}
              <div className="bg-[#131b2e] p-4 rounded-2xl border border-white/10 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
                      <CopyX className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">2. Trava de Cópia dos Enunciados</h4>
                      <p className="text-[11px] text-rose-300 font-semibold">
                        Bloqueia seleção e Ctrl+C nos enunciados
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSecCopyStatement(!secCopyStatement)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer min-h-[38px] ${
                      secCopyStatement
                        ? 'bg-[#4ade80] text-[#003919] shadow-md shadow-[#4ade80]/10'
                        : 'bg-[#171f33] text-[#bccabb] border border-white/10'
                    }`}
                  >
                    {secCopyStatement ? 'ATIVADA' : 'DESATIVADA'}
                  </button>
                </div>
                <p className="text-[11px] text-[#bccabb] leading-relaxed pl-1 pt-1 border-t border-white/5">
                  Cancela a seleção de texto, atalho de cópia (Ctrl+C) e o menu de contexto do botão direito nos textos e questões da atividade.
                </p>
              </div>

              {/* Trava 3: Trava de Copia e Cola nas Respostas Dissertativas */}
              <div className="bg-[#131b2e] p-4 rounded-2xl border border-white/10 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                      <ClipboardX className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">3. Trava de Colar nas Respostas Dissertativas</h4>
                      <p className="text-[11px] text-purple-300 font-semibold">
                        Bloqueia Ctrl+V nas caixas de resposta
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSecPasteEssay(!secPasteEssay)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer min-h-[38px] ${
                      secPasteEssay
                        ? 'bg-[#4ade80] text-[#003919] shadow-md shadow-[#4ade80]/10'
                        : 'bg-[#171f33] text-[#bccabb] border border-white/10'
                    }`}
                  >
                    {secPasteEssay ? 'ATIVADA' : 'DESATIVADA'}
                  </button>
                </div>
                <p className="text-[11px] text-[#bccabb] leading-relaxed pl-1 pt-1 border-t border-white/5">
                  Cancela a ação de colar textos (Ctrl+V) ou arrastar arquivos para dentro dos campos de resposta dissertativa / redação.
                </p>
              </div>

            </div>

            {/* Modal Footer Actions */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setSecurityModalActivity(null)}
                className="px-5 py-2.5 bg-white/10 hover:bg-white/15 text-white rounded-full text-xs font-bold transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveSecuritySettings}
                className="px-6 py-2.5 bg-[#4ade80] hover:bg-[#6bfb9a] text-[#003919] font-extrabold rounded-full text-xs transition-all shadow-md cursor-pointer flex items-center gap-2"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Salvar Seguranças</span>
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

