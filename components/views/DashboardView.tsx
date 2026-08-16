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
  Sparkles,
  Gamepad2,
  Cpu,
} from 'lucide-react';
import { Activity, StudentUser } from '@/lib/types';
import { canStudentAccessActivity, doesTurmaHavePNEStudent } from '@/lib/studentUtils';
import { AdaptActivityModal } from '@/components/modals/AdaptActivityModal';

interface DashboardViewProps {
  activities: Activity[];
  students?: StudentUser[];
  onOpenNewActivityModal: () => void;
  onSelectActivityForGrading: (act: Activity) => void;
  onEditActivity: (act: Activity) => void;
  onViewActivity?: (act: Activity) => void;
  onGenerateDossier: (act: Activity) => void;
  onDeleteActivity?: (act: Activity) => void;
  onSaveActivity?: (act: Activity) => void;
  onCreateAdaptedActivity?: (act: Activity) => void;
  title?: string;
  subtitle?: string;
  showStats?: boolean;
  isCorrecoesTab?: boolean;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  activities,
  students = [],
  onOpenNewActivityModal,
  onSelectActivityForGrading,
  onEditActivity,
  onViewActivity,
  onGenerateDossier,
  onDeleteActivity,
  onSaveActivity,
  onCreateAdaptedActivity,
  title = 'Studio',
  subtitle = 'Gerencie avaliações, redações e dinâmicas das suas turmas.',
  showStats = true,
  isCorrecoesTab,
}) => {
  const isCorrecoes = isCorrecoesTab || title === 'Correções';
  const [activityFilter, setActivityFilter] = useState<'todas' | 'a_fazer' | 'a_corrigir' | 'corrigidas'>('todas');

  const filteredActivities = activities.filter((act) => {
    const subCount = act.submissions ? act.submissions.length : (act.totalSubmissions || 0);
    const pendingCount = act.submissions ? act.submissions.filter((s) => s.status === 'pending' || s.status === 'draft').length : (act.pendingCorrection || 0);
    const enrolledStudentsCount = students.length > 0
      ? students.filter((st) => canStudentAccessActivity(act.turma, st.turma)).length
      : (act.totalStudents || 35);

    if (activityFilter === 'a_fazer') {
      return act.status === 'Ativo' || (enrolledStudentsCount - subCount) > 0;
    }
    if (activityFilter === 'a_corrigir') {
      return pendingCount > 0;
    }
    if (activityFilter === 'corrigidas') {
      return pendingCount === 0 && subCount > 0;
    }
    return true;
  });
  const [activityToDelete, setActivityToDelete] = useState<Activity | null>(null);
  const [securityModalActivity, setSecurityModalActivity] = useState<Activity | null>(null);
  const [adaptModalActivity, setAdaptModalActivity] = useState<Activity | null>(null);

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
  const totalSubmissions = activities.reduce((acc, a) => acc + (a.submissions ? a.submissions.length : (a.totalSubmissions || 0)), 0);
  const totalExpected = activities.reduce((acc, a) => {
    const enrolledCount = students.length > 0
      ? students.filter((st) => canStudentAccessActivity(a.turma, st.turma)).length
      : 0;
    return acc + (enrolledCount > 0 ? enrolledCount : (a.totalStudents || 35));
  }, 0);
  const completionRate = totalExpected > 0 ? Math.round((totalSubmissions / totalExpected) * 100) : 0;
  const pendingCorrections = activities.reduce((acc, a) => acc + (a.submissions ? a.submissions.filter(s => s.status === 'pending' || s.status === 'draft').length : (a.pendingCorrection || 0)), 0);

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
                const subCount = items.reduce((acc, i) => acc + (i.submissions ? i.submissions.length : (i.totalSubmissions || 0)), 0);
                const expCount = items.reduce((acc, i) => {
                  const enrolledCount = students.length > 0
                    ? students.filter((st) => canStudentAccessActivity(i.turma, st.turma)).length
                    : 0;
                  return acc + (enrolledCount > 0 ? enrolledCount : (i.totalStudents || 35));
                }, 0);
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
              ⏳ A Corrigir ({pendingCorrections})
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

              // Calculate submission and status breakdowns from real submissions
              const subCount = act.submissions ? act.submissions.length : (act.totalSubmissions || 0);
              const ret1x = act.submissions ? act.submissions.filter((s) => s.status === 'returned' && (s.returnCount === 1 || !s.returnCount)).length : 0;
              const ret2x = act.submissions ? act.submissions.filter((s) => s.status === 'returned' && s.returnCount === 2).length : 0;
              const ret3x = act.submissions ? act.submissions.filter((s) => s.status === 'returned' && s.returnCount === 3).length : 0;
              const gradedCount = act.submissions ? act.submissions.filter((s) => s.status === 'graded').length : 0;
              const pendingCount = act.submissions ? act.submissions.filter((s) => s.status === 'pending' || s.status === 'draft').length : (act.pendingCorrection || 0);

              const enrolledStudentsCount = students.length > 0
                ? students.filter((st) => canStudentAccessActivity(act.turma, st.turma)).length
                : 0;
              const expectedStudentsCount = enrolledStudentsCount > 0 ? enrolledStudentsCount : (act.totalStudents || 35);

              return (
                <div
                  key={act.id}
                  onClick={() => {
                    if (onViewActivity) onViewActivity(act);
                  }}
                  className={`glass-panel p-5 md:p-6 rounded-3xl transition-all duration-200 border border-white/10 hover:border-[#4ade80]/40 cursor-pointer ${
                    pendingCount > 0 ? 'ring-1 ring-[#4ade80]/30' : ''
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

                          {/* PNE & Anti-Cola Badges */}
                          {act.isAdapted && act.adaptationType === 'severe_playful' && (
                            <span className="text-[10px] font-bold bg-amber-500/20 text-amber-300 px-2.5 py-0.5 rounded-full border border-amber-500/30 flex items-center gap-1" title="Jogo Lúdico Gamificado em HTML (Síndromes Severas)">
                              <Gamepad2 className="w-3 h-3 text-amber-400" />
                              <span>PNE Lúdica (Jogo)</span>
                            </span>
                          )}
                          {act.isAdapted && act.adaptationType === 'mild_moderate' && (
                            <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1" title="Atividade Adaptada Leve/Moderada (50% questões, 2 alternativas, sem caracteres mín.)">
                              <Cpu className="w-3 h-3 text-emerald-400" />
                              <span>PNE Leve/Mod</span>
                            </span>
                          )}
                          {act.isAdapted && !act.adaptationType && (
                            <span className="text-[10px] font-bold bg-amber-500/20 text-amber-300 px-2.5 py-0.5 rounded-full border border-amber-500/30 flex items-center gap-1" title="Atividade Adaptada para PNE">
                              <Sparkles className="w-3 h-3 text-amber-400" />
                              <span>Adaptada PNE</span>
                            </span>
                          )}
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
                          {subCount > 0 ? (
                            <span className="px-3 py-1 rounded-xl text-xs font-semibold bg-[#131b2e] text-white border border-white/10 flex items-center gap-1.5">
                              👥 {subCount}/{expectedStudentsCount} Entregas
                            </span>
                          ) : (
                            <span className="px-3 py-1 rounded-xl text-xs font-semibold bg-[#131b2e] text-[#bccabb] border border-white/5">
                              📜 0/{expectedStudentsCount} Entregas (Pendente)
                            </span>
                          )}

                          {pendingCount > 0 && (
                            <span className="px-3 py-1 rounded-xl text-xs font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1.5">
                              ⏳ {pendingCount} A Corrigir pelo Sensei
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
                        <span>{pendingCount > 0 ? `Corrigir (${pendingCount})` : 'Acessar Correções'}</span>
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

                          {doesTurmaHavePNEStudent(act.turma, students) && (
                            <button
                              onClick={() => setAdaptModalActivity(act)}
                              className="flex-1 sm:flex-none px-4 py-2.5 bg-[#171f33] hover:bg-[#222a3d] text-amber-300 hover:text-amber-200 rounded-full text-xs font-bold border border-amber-500/20 flex items-center justify-center gap-1.5 transition-colors cursor-pointer min-h-[44px]"
                              title="Adaptar Atividade para PNE (Metade das questões e 2 alternativas por objetiva)"
                            >
                              <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                              <span>Adaptar (PNE)</span>
                            </button>
                          )}

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
      {/* Custom Adapt Activity for PNE Modal */}
      {adaptModalActivity && (
        <AdaptActivityModal
          activity={adaptModalActivity}
          isOpen={Boolean(adaptModalActivity)}
          onClose={() => setAdaptModalActivity(null)}
          onCreateAdaptedActivity={(adapted) => {
            if (onCreateAdaptedActivity) {
              onCreateAdaptedActivity(adapted);
            }
          }}
          onUpdateActivityWithAdaptation={(updated) => {
            if (onSaveActivity) {
              onSaveActivity(updated);
            }
          }}
        />
      )}
    </div>
  );
};

