'use client';
import { TurmaFilterDropdown, extractAllTurmasFromData, isTurmaMatchedByFilter } from '@/components/TurmaFilterDropdown';

import React, { useState, useMemo, useEffect } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Search,
  Filter,
  Users,
  ChevronDown,
  ChevronUp,
  FileCheck,
  FileText,
  Clock
} from 'lucide-react';
import { Activity, StudentUser } from '@/lib/types';
import {  getOriginalTurmas, getTurmaLabel, isActivityAdapted , getActivityStudentAndSubmissionCounts } from "@/lib/studentUtils";

interface CorrectionsViewProps {
  onSaveActivity?: (updatedActivity: Activity) => void;
  activities: Activity[];
  students: StudentUser[];
  isLoading: boolean;
  hasError: boolean;
  onRetry: () => void;
  onUpdateSubmission: (
    activityId: string,
    studentId: string,
    essayScore: number,
    feedback: string,
    status: 'graded' | 'returned' | 'draft',
    extraPoints?: number,
    registeredInStateSystem?: boolean
  ) => void;
  initialSelectedActivityId?: string | null;
}

export function formatShortActivityName(act: Activity, allList: Activity[]): string {
  const isRec = Boolean(act.isRecovery || act.type === 'Recuperação Paralela' || act.recoveryFromId);
  if (isRec) {
    const recList = allList.filter((a) => a.isRecovery || a.type === 'Recuperação Paralela' || Boolean(a.recoveryFromId));
    const idx = recList.findIndex((a) => a.id === act.id);
    return `RP${idx >= 0 ? idx + 1 : 1}`;
  }
  const isAdapted = isActivityAdapted(act) || act.activityDomain === 'adapted_aee';
  if (isAdapted) {
    const adpList = allList.filter((a) => isActivityAdapted(a) || a.activityDomain === 'adapted_aee');
    const idx = adpList.findIndex((a) => a.id === act.id);
    return `(AEE) AV${idx >= 0 ? idx + 1 : 1}`;
  }
  const regList = allList.filter((a) => !a.isRecovery && a.type !== 'Recuperação Paralela' && !a.recoveryFromId && !isActivityAdapted(a) && a.activityDomain !== 'adapted_aee');
  const idx = regList.findIndex((a) => a.id === act.id);
  const num = idx >= 0 ? idx + 1 : 1;
  const modeLabel = act.isGameActivity || act.gameData || act.type === 'Jogo Avaliativo' ? 'KronoGame' : act.type || 'Avaliação';
  return `(${modeLabel}) AV${num}`;
}

export const CorrectionsView: React.FC<CorrectionsViewProps> = ({
  onSaveActivity,
  activities,
  students,
  isLoading,
  hasError,
  onRetry,
  onUpdateSubmission,
  initialSelectedActivityId,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTurma, setSelectedTurma] = useState<string>('Todas');
  const [selectedTurmas, setSelectedTurmas] = useState<string[]>(['all']);
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  
  // Novo Estado de Filtro de Correção
  const [correctionFilter, setCorrectionFilter] = useState<'pendentes' | 'corrigidas' | 'inativas' | 'todas'>('todas');
  
  const [expandedActId, setExpandedActId] = useState<string | null>(initialSelectedActivityId || null);
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);

  const [draftScores, setDraftScores] = useState<{ [key: string]: string }>({});
  const [draftFeedbacks, setDraftFeedbacks] = useState<{ [key: string]: string }>({});
  const [aiLoadingKey, setAiLoadingKey] = useState<string | null>(null);
  const [aiAnalysisMap, setAiAnalysisMap] = useState<Record<string, {
    suggestedScore: number;
    feedback: string;
    themeFidelity: string;
    keywordsCheck: string;
    structureCheck: string;
    grammarCheck: string;
    aiUsagePercentage: number;
    aiUsageAnalysis: string;
    charCount: number;
    minChars: number;
  }>>({});

  const handleToggleStudentRco = (originalAct: Activity, studentId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!onSaveActivity) return;
    const currentList = Array.isArray(originalAct.rcoPostedStudentIds) ? originalAct.rcoPostedStudentIds : [];
    const exists = currentList.includes(studentId);
    const nextList = exists ? currentList.filter((id) => id !== studentId) : [...currentList, studentId];
    const totalSubs = (originalAct.submissions || []).length;
    const allPosted = totalSubs > 0 && (originalAct.submissions || []).every((s) => nextList.includes(s.studentId));
    onSaveActivity({
      ...originalAct,
      rcoPostedStudentIds: nextList,
      isRcoPosted: allPosted,
    });
  };

  const handleRunAiEssayCorrection = async (act: Activity, sub: any) => {
    const subKey = `${act.id}_${sub.studentId}`;
    const essayText = (sub.essayAnswer || "").trim();
    if (!essayText) return;
    setAiLoadingKey(subKey);
    try {
      const essayQuestion = (act.questions || []).find((q: any) => q.type === "essay") || (act.questions || [])[0];
      const questionStatement = essayQuestion?.statement || act.description || act.title || "Questão dissertativa de Sociologia";
      const keywords = (essayQuestion as any)?.keywords || (act as any).keywords || "";
      const minChars = Number((essayQuestion as any)?.minChars || (act as any).minChars || 150);
      const maxEssayScore = Number(sub.maxEssayScore || act.maxGrade || 10);

      const res = await fetch("/api/gemini/correct-essay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          essayAnswer: essayText,
          questionStatement,
          keywords,
          turma: act.turma || "Ensino Médio",
          maxEssayScore,
          minChars,
        }),
      });
      const data = await res.json();
      if (data) {
        const suggested = data.suggestedScore !== undefined ? Number(data.suggestedScore) : maxEssayScore * 0.8;
        const fb = data.feedback || "Boa argumentação sociológica.";
        setDraftScores((prev) => ({ ...prev, [subKey]: String(suggested) }));
        setDraftFeedbacks((prev) => ({ ...prev, [subKey]: fb }));
        setAiAnalysisMap((prev) => ({
          ...prev,
          [subKey]: {
            suggestedScore: suggested,
            feedback: fb,
            themeFidelity: data.themeFidelity || "Adequado ao tema proposto.",
            keywordsCheck: data.keywordsCheck || "Conceitos avaliados.",
            structureCheck: data.structureCheck || "Estrutura avaliada.",
            grammarCheck: data.grammarCheck || "Norma padrão verificada.",
            aiUsagePercentage: Number(data.aiUsagePercentage ?? 0),
            aiUsageAnalysis: data.aiUsageAnalysis || "Análise de autoria concluída.",
            charCount: essayText.length,
            minChars,
          },
        }));
      }
    } catch (err) {
      console.error("Erro na correção por IA:", err);
    } finally {
      setAiLoadingKey(null);
    }
  };

  const turmasDisponiveis = useMemo(() => extractAllTurmasFromData(students, activities.map((a) => a.turma)), [students, activities]);

  useEffect(() => {
    if (initialSelectedActivityId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setExpandedActId(initialSelectedActivityId);
      // Se abriu via atalho, garante que o filtro seja "todas" para não esconder a atividade se ela já estiver corrigida
      setCorrectionFilter('todas');
    }
  }, [initialSelectedActivityId]);

  // Filtra as atividades que possuem envios baseados no filtro atual (Pendentes, Corrigidas ou Todas com entregas)
  const filteredActivities = useMemo(() => {
    return activities.filter((act) => {
      if (!isTurmaMatchedByFilter(act.turma, selectedTurmas, turmasDisponiveis, 'activity')) {
        return false;
      }

      const targetStudents = students.filter((s) =>
        isTurmaMatchedByFilter(s.turma, selectedTurmas, turmasDisponiveis, 'student')
      );
      const metrics = getActivityStudentAndSubmissionCounts(act, activities, targetStudents);
      const subs = (metrics.submissionsList && metrics.submissionsList.length > 0)
        ? metrics.submissionsList
        : (act.submissions || []);

      const isInactiveOrClosed = act.status === 'Inativo' || act.status === 'Prazo Encerrado';

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTitle = Boolean(act.title && act.title.toLowerCase().includes(q));
        const matchesTurma = Boolean(act.turma && act.turma.toLowerCase().includes(q));
        const matchesStudent = subs.some((sub) => {
          const st = students.find((s) => s.id === sub.studentId || (s.matricula && s.matricula === sub.matricula));
          const nameToMatch = (st ? (st.fullName || st.name) : sub.studentName) || '';
          return nameToMatch.toLowerCase().includes(q);
        });
        if (!matchesTitle && !matchesTurma && !matchesStudent) return false;
        return true;
      }

      if (correctionFilter === 'inativas') {
        return isInactiveOrClosed;
      }
      if (correctionFilter === 'pendentes') {
        return subs.some((s) => s.status === 'pending');
      }
      if (correctionFilter === 'corrigidas') {
        return subs.length > 0 && subs.some((s) => s.status === 'graded' || s.status === 'returned');
      }

      // 'todas': exibe todas as atividades com entregas OU inativas/encerradas para consulta e devolução
      return subs.length > 0 || isInactiveOrClosed;
    });
  }, [activities, selectedTurmas, turmasDisponiveis, searchQuery, correctionFilter, students]);

  const totalPendingGlobal = useMemo(() => {
    let count = 0;
    activities.forEach(act => {
      count += (act.submissions?.filter(s => s.status === 'pending').length || 0);
    });
    return count;
  }, [activities]);

  const handleScoreChange = (subKey: string, val: string) => {
    setDraftScores((prev) => ({ ...prev, [subKey]: val }));
  };

  const handleFeedbackChange = (subKey: string, val: string) => {
    setDraftFeedbacks((prev) => ({ ...prev, [subKey]: val }));
  };

  const handleSaveGrade = (act: Activity, studentId: string, action: 'graded' | 'returned') => {
    const subKey = `${act.id}_${studentId}`;
    const rawScore = draftScores[subKey];
    let parsedScore = parseFloat(rawScore?.replace(',', '.') || '0');

    if (action === 'graded' && (isNaN(parsedScore) || parsedScore < 0)) {
      parsedScore = 0;
    }

    const feedback = draftFeedbacks[subKey] || '';
    onUpdateSubmission(act.id, studentId, parsedScore, feedback, action);
    
    setDraftScores(prev => { const next = {...prev}; delete next[subKey]; return next; });
    setDraftFeedbacks(prev => { const next = {...prev}; delete next[subKey]; return next; });
    setExpandedStudentId(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12 text-muted animate-pulse">
        <RefreshCw className="w-6 h-6 animate-spin mr-3" /> Carregando mesa de correções...
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="p-8 text-center bg-rose-500/10 border border-rose-500/20 rounded-3xl">
        <AlertTriangle className="w-10 h-10 text-rose-400 mx-auto mb-3" />
        <p className="text-rose-400 font-bold mb-4">Falha ao carregar as pendências de correção.</p>
        <button onClick={onRetry} className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-bold">
          Tentar Novamente
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8 animate-fadeIn pb-12">
      {/* Header Central de Correções */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-border">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-400">
              <FileCheck className="w-5 h-5" />
            </span>
            <span className="text-xs font-black uppercase tracking-wider text-sky-400">
              Mesa de Trabalho do Professor
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-foreground tracking-tight flex items-center gap-3">
            Central de Correções
            {totalPendingGlobal > 0 && (
              <span className="text-xs px-3 py-1 rounded-full bg-rose-500 text-white shadow-lg shadow-rose-500/30">
                {totalPendingGlobal} na fila geral
              </span>
            )}
          </h1>
          <p className="text-xs sm:text-sm text-muted mt-1 max-w-2xl leading-relaxed">
            Avalie redações, revise entregas físicas e devolva missões para os alunos refazerem. Foco total no rendimento.
          </p>
        </div>
      </div>

      {/* Barra de Filtros Inteligente */}
      <div className="glass-panel p-4 sm:p-5 rounded-3xl border border-border bg-surface shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-1 items-center gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar atividade por título ou turma..."
                className="w-full bg-background border border-border rounded-2xl pl-10 pr-4 py-2.5 text-xs text-foreground focus:outline-none focus:border-sky-400 transition-all"
              />
            </div>
            
            <TurmaFilterDropdown
              turmasList={turmasDisponiveis}
              selectedTurmas={selectedTurmas}
              onChange={setSelectedTurmas}
              students={students}
              totalCountLabel="alunos"
            />
          </div>

          {/* Filtro de Status de Correção (Pílulas) */}
          <div className="flex items-center gap-1.5 p-1 bg-background rounded-2xl border border-border overflow-x-auto">
            <button
              onClick={() => setCorrectionFilter('pendentes')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                correctionFilter === 'pendentes'
                  ? 'bg-sky-500 text-slate-900 shadow-sm'
                  : 'text-muted hover:text-foreground hover:bg-surface-hover'
              }`}
            >
              Fila Pendente
            </button>
            <button
              onClick={() => setCorrectionFilter('corrigidas')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                correctionFilter === 'corrigidas'
                  ? 'bg-sky-500 text-slate-900 shadow-sm'
                  : 'text-muted hover:text-foreground hover:bg-surface-hover'
              }`}
            >
              Já Corrigidas
            </button>
            <button
              onClick={() => setCorrectionFilter('inativas')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                correctionFilter === 'inativas'
                  ? 'bg-amber-500 text-slate-900 shadow-sm'
                  : 'text-amber-400 hover:bg-amber-500/10'
              }`}
            >
              Inativas / Encerradas
            </button>
            <button
              onClick={() => setCorrectionFilter('todas')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                correctionFilter === 'todas'
                  ? 'bg-sky-500 text-slate-900 shadow-sm'
                  : 'text-muted hover:text-foreground hover:bg-surface-hover'
              }`}
            >
              Ver Todas
            </button>
          </div>
        </div>

        {isFilterExpanded && (
          <div className="pt-3 border-t border-border animate-fadeIn flex flex-wrap gap-2">
            <button
              onClick={() => { setSelectedTurma('Todas'); setIsFilterExpanded(false); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                selectedTurma === 'Todas' ? 'bg-sky-500 text-slate-900 border-sky-500' : 'bg-background text-muted border-border hover:border-sky-500/50'
              }`}
            >
              Todas as Turmas
            </button>
            {turmasDisponiveis.map((t) => (
              <button
                key={t}
                onClick={() => { setSelectedTurma(t); setIsFilterExpanded(false); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border flex items-center gap-1.5 ${
                  selectedTurma === t ? 'bg-sky-500 text-slate-900 border-sky-500' : 'bg-background text-muted border-border hover:border-sky-500/50'
                }`}
              >
                <Users className="w-3.5 h-3.5 opacity-70" />
                Turma {getTurmaLabel(t)}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lista de Atividades para Correção */}
      <div className="space-y-4">
        {filteredActivities.length === 0 ? (
          <div className="p-12 text-center rounded-3xl border border-dashed border-border bg-surface text-muted space-y-3 shadow-sm">
            <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-500/50" />
            <p className="text-base font-bold text-foreground">Sua mesa está limpa!</p>
            <p className="text-xs">Não há nenhuma entrega de aluno correspondente a este filtro.</p>
          </div>
        ) : (
          filteredActivities.map((originalAct) => {
            const targetStudents = selectedTurma === "Todas" ? students : students.filter(s => s.turma && s.turma.includes(selectedTurma));
            const metrics = getActivityStudentAndSubmissionCounts(originalAct, activities, targetStudents);
            const act = { ...originalAct, submissions: metrics.submissionsList, totalStudents: metrics.expectedStudentsCount };
            const subs = act.submissions || [];
            let displaySubs = subs;
          if (searchQuery) {
            const q = searchQuery.toLowerCase();
            displaySubs = subs.filter(sub => {
              const st = students.find(s => s.id === sub.studentId || (s.matricula && s.matricula === sub.matricula));
              const nameToMatch = (st ? (st.fullName || st.name) : sub.studentName) || "";
              return nameToMatch.toLowerCase().includes(q) || (act.title && act.title.toLowerCase().includes(q));
            });
            if (displaySubs.length === 0) return null; // Oculta tudo se não for o aluno pesquisado
          }
          const pendingSubs = displaySubs.filter((s) => s.status === 'pending');
          const gradedSubs = displaySubs.filter((s) => s.status === 'graded');
          const returnedSubs = displaySubs.filter((s) => s.status === 'returned');
          if (searchQuery.trim()) {
            if (correctionFilter === 'pendentes' && pendingSubs.length === 0 && returnedSubs.length === 0) return null;
            if (correctionFilter === 'corrigidas' && gradedSubs.length === 0) return null;
          }

          const isExpanded = expandedActId === act.id || Boolean(searchQuery.trim());
            const shortName = formatShortActivityName(act, activities);
            const isRec = Boolean(act.isRecovery || act.type === 'Recuperação Paralela' || act.recoveryFromId);

            const totalStudents = act.totalStudents || 1;
            const totalDelivered = subs.length;
            const progress = totalStudents > 0 ? Math.round((totalDelivered / totalStudents) * 100) : 0;

            return (
              <div key={act.id} className="glass-panel rounded-3xl border border-border bg-surface shadow-md transition-all overflow-hidden">
                {/* Card Minimalista da Atividade (Com Progress Bar) */}
                <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-4 min-w-0 flex-1">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border shadow-sm ${
                      pendingSubs.length > 0 ? 'bg-sky-500/10 border-sky-500/30 text-sky-400' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    }`}>
                      {pendingSubs.length > 0 ? <FileCheck className="w-6 h-6" /> : <CheckCircle2 className="w-6 h-6" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border ${
                          isRec ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-sky-500/20 text-sky-400 border-sky-500/40'
                        }`}>
                          {shortName}
                        </span>
                        
                        {pendingSubs.length > 0 && (
                          <span className="text-[10px] font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-500/20">
                            {pendingSubs.length} na fila
                          </span>
                        )}
                        {gradedSubs.length > 0 && (
                          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                            {gradedSubs.length} corrigidas
                          </span>
                        )}
                        {act.isRcoPosted && (
                          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">✅ RCO Lançado</span>
                        )}
                      </div>
                      
                      <h3 className="text-base sm:text-lg font-black text-foreground truncate">{act.title}</h3>
                      
                      {/* Barra de Progresso Visível */}
                      <div className="flex items-center gap-3 mt-2 max-w-sm">
                        <div className="flex-1 h-1.5 bg-background rounded-full overflow-hidden border border-border">
                          <div className={`h-full rounded-full ${pendingSubs.length > 0 ? 'bg-sky-400' : 'bg-emerald-400'}`} style={{ width: `${progress}%` }} />
                        </div>
                        <span className="text-[10px] font-bold text-muted whitespace-nowrap">
                          {totalDelivered}/{totalStudents} entregas
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 border-t md:border-t-0 border-border pt-3 md:pt-0 mt-3 md:mt-0 flex flex-wrap items-center gap-2">
                    <div className="py-2 px-3.5 font-bold text-xs rounded-xl flex items-center gap-1.5 border bg-background border-border text-muted">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>
                        RCO: {subs.filter((s) => (originalAct.rcoPostedStudentIds || []).includes(s.studentId)).length}/{subs.length} lançados
                      </span>
                    </div>
                    <button
                      onClick={() => setExpandedActId(isExpanded ? null : act.id)}
                      className={`w-full md:w-auto py-2 px-6 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 border ${
                        isExpanded ? 'bg-sky-500/20 border-sky-500/50 text-sky-400 shadow-inner' : 'bg-[#171f33] hover:bg-sky-500 text-white border-border hover:border-sky-400 shadow-sm'
                      }`}
                    >
                      {isExpanded ? (
                        <><ChevronUp className="w-4 h-4" /> Fechar Fila</>
                      ) : (
                        <><FileText className="w-4 h-4" /> Abrir Correções</>
                      )}
                    </button>
                  </div>
                </div>

                {/* Gaveta de Alunos Pendentes / Corrigidos */}
                {isExpanded && (
                  <div className="border-t border-border bg-background/50 divide-y divide-border">
                    {/* Filtra as submissões dentro da gaveta com base no filtro global, e ordena pendentes primeiro */}
                    {displaySubs
                      .filter(sub => {
                        if (correctionFilter === 'pendentes') return sub.status === 'pending' || sub.status === 'returned';
                        if (correctionFilter === 'corrigidas') return sub.status === 'graded';
                        return true;
                      })
                      .sort((a, b) => {
                        if (a.status === 'pending' && b.status !== 'pending') return -1;
                        if (a.status !== 'pending' && b.status === 'pending') return 1;
                        if (a.status === 'returned' && b.status === 'graded') return -1;
                        if (a.status === 'graded' && b.status === 'returned') return 1;
                        return 0;
                      })
                      .map((sub) => {
                      const isStudentExpanded = expandedStudentId === sub.studentId;
                      const subKey = `${act.id}_${sub.studentId}`;
                      
                      return (
                        <div key={sub.studentId} className="animate-fadeIn">
                          {/* Linha do Aluno */}
                          <div 
                            className={`p-4 flex items-center justify-between gap-4 cursor-pointer transition-colors ${isStudentExpanded ? 'bg-surface' : 'hover:bg-surface-hover'}`}
                            onClick={() => setExpandedStudentId(isStudentExpanded ? null : sub.studentId)}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <img src={sub.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'} alt={sub.studentName} className="w-10 h-10 rounded-full border border-border shrink-0" />
                              <div className="min-w-0">
                                <h4 className="text-sm font-bold text-foreground truncate flex items-center gap-2">
                                  {sub.studentName}
                                  {sub.status === 'graded' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                                  {sub.status === 'returned' && <RefreshCw className="w-3.5 h-3.5 text-orange-400" />}
                                </h4>
                                <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted mt-0.5">
                                  {sub.isPhysicalDelivery ? (
                                    <span className="bg-cyan-500/20 text-cyan-300 px-1.5 py-0.5 rounded">📄 Físico</span>
                                  ) : (
                                    <span>{sub.status === 'graded' ? 'Avaliada' : 'Entregue'}: {sub.submittedAt || 'Recente'}</span>
                                  )}
                                  {sub.status === 'graded' && (
                                    <span className="text-emerald-400 font-bold ml-1">Nota: {(Number(sub.objectiveScore||0) + Number(sub.essayScore||0) + Number(sub.extraPoints||0)).toFixed(1)}</span>
                                  )}
                                  {sub.returnCount ? <span className="text-orange-400">↩️ Devolvida {sub.returnCount}x</span> : null}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={(e) => handleToggleStudentRco(originalAct, sub.studentId, e)}
                                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer flex items-center gap-1 ${
                                  (originalAct.rcoPostedStudentIds || []).includes(sub.studentId)
                                    ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/30"
                                    : "bg-background hover:bg-surface-hover text-muted hover:text-foreground border-border"
                                }`}
                                title="Marcar/Desmarcar que a nota deste aluno já foi lançada no RCO"
                              >
                                <CheckCircle2 className="w-3 h-3" />
                                <span>
                                  {(originalAct.rcoPostedStudentIds || []).includes(sub.studentId)
                                    ? "RCO Lançado"
                                    : "Marcar RCO"}
                                </span>
                              </button>
                              {sub.status === 'pending' && <span className="hidden sm:inline text-[10px] font-bold text-sky-400">Avaliar</span>}
                              {isStudentExpanded ? <ChevronUp className="w-4 h-4 text-muted" /> : <ChevronDown className="w-4 h-4 text-muted" />}
                            </div>
                          </div>

                          {/* Formulário de Correção / Re-Correção do Aluno */}
                          {isStudentExpanded && (
                            <div className="p-4 bg-surface/50 border-t border-border space-y-4">
                              
                              {/* Respostas do Aluno */}
                              <div className="space-y-3">
                                {sub.isPhysicalDelivery ? (
                                  <div className="bg-cyan-950/20 p-4 rounded-xl border border-cyan-500/30 text-xs text-cyan-200">
                                    <strong>Atenção:</strong> Esta avaliação foi entregue fisicamente (em papel). Digite a nota final e o parecer abaixo.
                                  </div>
                                ) : (
                                  <>
                                    {Number(sub.maxObjectiveScore) > 0 && (
<div className="flex flex-wrap items-center justify-between bg-[#171f33] p-3 rounded-xl border border-border gap-2">
                                      <span className="text-xs font-bold text-muted">Nota Objetiva (Automática):</span>
                                      <span className="text-sm font-black text-emerald-400">{sub.objectiveScore?.toFixed(1) || 0} / {sub.maxObjectiveScore?.toFixed(1) || 0} pts</span>
                                    </div>
)}
                                    
                                    <div className="bg-[#171f33] p-4 rounded-2xl border border-border space-y-3">
                                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-[10px] font-black uppercase tracking-wider text-sky-400">
                                              Resposta Dissertativa do Aluno
                                            </span>
                                            {(() => {
                                              const charLen = (sub.essayAnswer || "").trim().length;
                                              const essayQ = (act.questions || []).find((q: any) => q.type === "essay") || (act.questions || [])[0];
                                              const minC = Number((essayQ as any)?.minChars || (act as any).minChars || 150);
                                              const reachedMin = charLen >= minC;
                                              return (
                                                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-lg border ${
                                                  reachedMin
                                                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                                                    : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                                                }`}>
                                                  📏 {charLen} / mín. {minC} caracteres {reachedMin ? "✓ Meta atingida" : "⚠️ Abaixo do mínimo"}
                                                </span>
                                              );
                                            })()}
                                          </div>

                                          {Boolean(sub.essayAnswer && sub.essayAnswer.trim()) && (
                                            <button
                                              type="button"
                                              onClick={() => handleRunAiEssayCorrection(act, sub)}
                                              disabled={aiLoadingKey === subKey}
                                              className="px-3.5 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm disabled:opacity-50 active:scale-95"
                                            >
                                              <RefreshCw className={`w-3.5 h-3.5 ${aiLoadingKey === subKey ? "animate-spin" : ""}`} />
                                              <span>
                                                {aiLoadingKey === subKey
                                                  ? "Analisando texto com IA..."
                                                  : aiAnalysisMap[subKey]
                                                  ? "✨ Reanalisar com IA"
                                                  : "✨ Analisar Resposta com IA"}
                                              </span>
                                            </button>
                                          )}
                                        </div>

                                        <p className="text-xs sm:text-sm text-foreground whitespace-pre-wrap leading-relaxed bg-background/60 p-3.5 rounded-xl border border-border/50">
                                          {sub.essayAnswer || <span className="text-muted italic">Nenhum texto dissertativo enviado.</span>}
                                        </p>

                                        {/* Painel Completo de Diagnóstico da IA (Restaurado do GradingView) */}
                                        {aiAnalysisMap[subKey] && (
                                          <div className="mt-3 p-4 rounded-2xl bg-background/90 border border-purple-500/30 space-y-3 animate-fadeIn">
                                            <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-border">
                                              <div className="flex items-center gap-2">
                                                <span className="text-xs font-black uppercase tracking-wider text-purple-300">
                                                  🤖 Laudo Pedagógico da IA
                                                </span>
                                                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-lg bg-sky-500/20 text-sky-300 border border-sky-500/30">
                                                  Nota Sugerida: {aiAnalysisMap[subKey].suggestedScore.toFixed(1)} pts
                                                </span>
                                              </div>

                                              <div className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border flex items-center gap-1.5 ${
                                                aiAnalysisMap[subKey].aiUsagePercentage <= 25
                                                  ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                                                  : aiAnalysisMap[subKey].aiUsagePercentage <= 60
                                                  ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                                                  : "bg-rose-500/15 text-rose-300 border-rose-500/30"
                                              }`}>
                                                <span>🤖 Uso Estimado de IA: {Math.round(aiAnalysisMap[subKey].aiUsagePercentage)}%</span>
                                                <span>
                                                  {aiAnalysisMap[subKey].aiUsagePercentage <= 25
                                                    ? "(Autoral)"
                                                    : aiAnalysisMap[subKey].aiUsagePercentage <= 60
                                                    ? "(Misto / Suspeito)"
                                                    : "(Alta Probabilidade de IA)"}
                                                </span>
                                              </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
                                              <div className="p-3 rounded-xl bg-surface border border-border space-y-1">
                                                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 block">
                                                  ✅ Resposta Correta & Fidelidade ao Tema
                                                </span>
                                                <p className="text-muted leading-relaxed">{aiAnalysisMap[subKey].themeFidelity}</p>
                                              </div>

                                              <div className="p-3 rounded-xl bg-surface border border-border space-y-1">
                                                <span className="text-[10px] font-black uppercase tracking-wider text-sky-400 block">
                                                  🔑 Uso das Palavras-Chave
                                                </span>
                                                <p className="text-muted leading-relaxed">{aiAnalysisMap[subKey].keywordsCheck}</p>
                                              </div>

                                              <div className="p-3 rounded-xl bg-surface border border-border space-y-1">
                                                <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 block">
                                                  ✍️ Gramática, Ortografia e Acentuação
                                                </span>
                                                <p className="text-muted leading-relaxed">{aiAnalysisMap[subKey].grammarCheck}</p>
                                              </div>

                                              <div className="p-3 rounded-xl bg-surface border border-border space-y-1">
                                                <span className="text-[10px] font-black uppercase tracking-wider text-purple-300 block">
                                                  📐 Extensão ({aiAnalysisMap[subKey].charCount}/{aiAnalysisMap[subKey].minChars} caract.) & Autoria
                                                </span>
                                                <p className="text-muted leading-relaxed">
                                                  {aiAnalysisMap[subKey].structureCheck} {aiAnalysisMap[subKey].aiUsageAnalysis ? `— ${aiAnalysisMap[subKey].aiUsageAnalysis}` : ""}
                                                </p>
                                              </div>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                  </>
                                )}
                              </div>

                              {/* Campos de Correção / Edição */}
                              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end pt-2">
                                <div className="sm:col-span-3">
                                  <label className="text-[10px] font-bold text-muted uppercase tracking-wider block mb-1">Nota Dissertativa</label>
                                  <input
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    max={sub.maxEssayScore || act.maxGrade || 10}
                                    placeholder={`Máx: ${sub.maxEssayScore || act.maxGrade || 10}`}
                                    value={draftScores[subKey] !== undefined ? draftScores[subKey] : (sub.essayScore !== undefined ? sub.essayScore : '')}
                                    onChange={(e) => handleScoreChange(subKey, e.target.value)}
                                    className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-xs text-foreground font-bold focus:outline-none focus:border-sky-400"
                                  />
                                </div>
                                <div className="sm:col-span-5">
                                  <label className="text-[10px] font-bold text-muted uppercase tracking-wider block mb-1">Parecer / Feedback</label>
                                  <input
                                    type="text"
                                    placeholder="Deixe um comentário encorajador..."
                                    value={draftFeedbacks[subKey] !== undefined ? draftFeedbacks[subKey] : (sub.teacherFeedback || '')}
                                    onChange={(e) => handleFeedbackChange(subKey, e.target.value)}
                                    className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-xs text-foreground focus:outline-none focus:border-sky-400"
                                  />
                                </div>
                                <div className="sm:col-span-4 flex flex-col sm:flex-row gap-2">
                                  <button
                                    onClick={() => handleSaveGrade(act, sub.studentId, 'graded')}
                                    className={`flex-1 py-2.5 px-3 font-black text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 ${
                                      sub.status === 'graded' 
                                        ? 'bg-[#171f33] hover:bg-sky-500 text-sky-400 hover:text-white border border-border hover:border-sky-400' 
                                        : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                                    }`}
                                  >
                                    <CheckCircle2 className="w-4 h-4" /> {sub.status === 'graded' ? 'Atualizar Nota' : 'Aprovar Nota'}
                                  </button>
                                  <button
                                    onClick={() => handleSaveGrade(act, sub.studentId, 'returned')}
                                    className="py-2.5 px-3 bg-background hover:bg-orange-500/10 text-orange-400 border border-border hover:border-orange-500/40 font-bold text-[10px] rounded-xl transition-all flex items-center justify-center gap-1.5"
                                    title="Devolver para o aluno refazer"
                                  >
                                    <RefreshCw className="w-4 h-4" /> <span className="sm:hidden">Devolver (Refazer)</span>
                                  </button>
                                </div>
                              </div>

                            </div>
                          )}
                        </div>
                      );
                    })}
                    
                    {/* Mensagem se não houver submissões no filtro atual da gaveta */}
                    {subs.filter(sub => {
                      if (correctionFilter === 'pendentes') return sub.status === 'pending' || sub.status === 'returned';
                      if (correctionFilter === 'corrigidas') return sub.status === 'graded';
                      return true;
                    }).length === 0 && (
                      <div className="p-4 text-center text-xs text-muted">
                        Nenhum aluno nesta atividade corresponde ao filtro &quot;{correctionFilter}&quot;.
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};