'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  MessageSquare,
  RefreshCw,
  Search,
  Filter,
  Users,
  ChevronDown,
  ChevronUp,
  FileCheck,
  FileText
} from 'lucide-react';
import { Activity, StudentUser } from '@/lib/types';
import { getOriginalTurmas, getTurmaLabel } from '@/lib/studentUtils';

interface CorrectionsViewProps {
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
  const regList = allList.filter((a) => !a.isRecovery && a.type !== 'Recuperação Paralela' && !a.recoveryFromId);
  const idx = regList.findIndex((a) => a.id === act.id);
  const num = idx >= 0 ? idx + 1 : 1;
  const modeLabel = act.isGameActivity || act.gameData || act.type === 'Jogo Avaliativo' ? 'KronoGame' : act.type || 'Avaliação';
  return `${modeLabel} AV${num}`;
}

export const CorrectionsView: React.FC<CorrectionsViewProps> = ({
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
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  const [expandedActId, setExpandedActId] = useState<string | null>(initialSelectedActivityId || null);
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);

  const [draftScores, setDraftScores] = useState<{ [key: string]: string }>({});
  const [draftFeedbacks, setDraftFeedbacks] = useState<{ [key: string]: string }>({});

  const turmasDisponiveis = useMemo(() => getOriginalTurmas(students), [students]);

  useEffect(() => {
    if (initialSelectedActivityId) {
      setExpandedActId(initialSelectedActivityId);
    }
  }, [initialSelectedActivityId]);

  const activitiesWithPendencies = useMemo(() => {
    return activities.filter((act) => {
      const hasPending = act.submissions?.some((s) => s.status === 'pending');
      if (!hasPending) return false;

      if (selectedTurma !== 'Todas' && act.turma !== selectedTurma && !act.turma.includes(selectedTurma)) {
        return false;
      }

      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return act.title.toLowerCase().includes(q) || act.turma.toLowerCase().includes(q);
      }
      return true;
    });
  }, [activities, selectedTurma, searchQuery]);

  const totalPendingCorrections = useMemo(() => {
    let count = 0;
    activitiesWithPendencies.forEach(act => {
      count += (act.submissions?.filter(s => s.status === 'pending').length || 0);
    });
    return count;
  }, [activitiesWithPendencies]);

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
    
    // Limpar rascunhos após salvar
    setDraftScores(prev => { const next = {...prev}; delete next[subKey]; return next; });
    setDraftFeedbacks(prev => { const next = {...prev}; delete next[subKey]; return next; });
    setExpandedStudentId(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12 text-muted">
        <RefreshCw className="w-6 h-6 animate-spin mr-3" /> Carregando correções pendentes...
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
              Mesa do Professor
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-foreground tracking-tight flex items-center gap-3">
            Central de Correções
            {totalPendingCorrections > 0 && (
              <span className="text-xs px-3 py-1 rounded-full bg-rose-500 text-white shadow-lg shadow-rose-500/30">
                {totalPendingCorrections} pendentes
              </span>
            )}
          </h1>
          <p className="text-xs sm:text-sm text-muted mt-1 max-w-2xl leading-relaxed">
            Avalie redações, julgue missões e atribua notas. Tudo em um fluxo rápido e limpo.
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
                placeholder="Buscar missão pendente..."
                className="w-full bg-background border border-border rounded-2xl pl-10 pr-4 py-2.5 text-xs text-foreground focus:outline-none focus:border-sky-400 transition-all"
              />
            </div>
            
            <button
              onClick={() => setIsFilterExpanded(!isFilterExpanded)}
              className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 border cursor-pointer min-h-[44px] ${
                isFilterExpanded || selectedTurma !== 'Todas'
                  ? 'bg-sky-500/10 border-sky-500/50 text-sky-400'
                  : 'bg-background hover:bg-surface-hover text-muted border-border'
              }`}
            >
              <Filter className="w-4 h-4" />
              <span className="hidden sm:inline">
                {selectedTurma === 'Todas' ? 'Filtrar Turma' : `Turma ${selectedTurma}`}
              </span>
              {isFilterExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
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
        {activitiesWithPendencies.length === 0 ? (
          <div className="p-12 text-center rounded-3xl border border-dashed border-border bg-surface text-muted space-y-3 shadow-sm">
            <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-500/50" />
            <p className="text-base font-bold text-foreground">Caixa de Entrada Limpa!</p>
            <p className="text-xs">Não há nenhuma atividade pendente de correção neste filtro.</p>
          </div>
        ) : (
          activitiesWithPendencies.map((act) => {
            const pendingSubs = act.submissions?.filter((s) => s.status === 'pending') || [];
            const isExpanded = expandedActId === act.id;
            const shortName = formatShortActivityName(act, activities);
            const isRec = Boolean(act.isRecovery || act.type === 'Recuperação Paralela' || act.recoveryFromId);

            return (
              <div key={act.id} className="glass-panel rounded-3xl border border-border bg-surface shadow-md transition-all overflow-hidden">
                {/* Card Minimalista da Atividade */}
                <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-4 min-w-0 flex-1">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border shadow-sm bg-sky-500/10 border-sky-500/30 text-sky-400">
                      <FileCheck className="w-6 h-6" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border ${
                          isRec ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-sky-500/20 text-sky-400 border-sky-500/40'
                        }`}>
                          {shortName}
                        </span>
                        <span className="text-[10px] font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-500/20">
                          {pendingSubs.length} avaliações na fila
                        </span>
                      </div>
                      <h3 className="text-base sm:text-lg font-black text-foreground truncate">{act.title}</h3>
                    </div>
                  </div>

                  <div className="shrink-0 border-t md:border-t-0 border-border pt-3 md:pt-0 mt-3 md:mt-0">
                    <button
                      onClick={() => setExpandedActId(isExpanded ? null : act.id)}
                      className={`w-full md:w-auto py-2 px-6 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 border ${
                        isExpanded ? 'bg-sky-500/20 border-sky-500/50 text-sky-400 shadow-inner' : 'bg-primary hover:bg-primary-hover text-white border-primary shadow-sm'
                      }`}
                    >
                      {isExpanded ? (
                        <><ChevronUp className="w-4 h-4" /> Recolher Fila</>
                      ) : (
                        <><FileText className="w-4 h-4" /> Corrigir Alunos</>
                      )}
                    </button>
                  </div>
                </div>

                {/* Gaveta de Alunos Pendentes */}
                {isExpanded && (
                  <div className="border-t border-border bg-background/50 divide-y divide-border">
                    {pendingSubs.map((sub) => {
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
                                <h4 className="text-sm font-bold text-foreground truncate">{sub.studentName}</h4>
                                <div className="flex items-center gap-2 text-[10px] text-muted mt-0.5">
                                  {sub.isPhysicalDelivery ? (
                                    <span className="bg-cyan-500/20 text-cyan-300 px-1.5 py-0.5 rounded">📄 Físico</span>
                                  ) : (
                                    <span>Entregue: {sub.submittedAt || 'Recente'}</span>
                                  )}
                                  {sub.returnCount ? <span className="text-orange-400">↩️ Devolvida {sub.returnCount}x</span> : null}
                                </div>
                              </div>
                            </div>
                            {isStudentExpanded ? <ChevronUp className="w-4 h-4 text-muted" /> : <ChevronDown className="w-4 h-4 text-muted" />}
                          </div>

                          {/* Formulário de Correção do Aluno */}
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
                                    <div className="flex items-center justify-between bg-[#171f33] p-3 rounded-xl border border-border">
                                      <span className="text-xs font-bold text-muted">Nota Objetiva (Automática):</span>
                                      <span className="text-sm font-black text-emerald-400">{sub.objectiveScore?.toFixed(1) || 0} / {sub.maxObjectiveScore?.toFixed(1) || 0} pts</span>
                                    </div>
                                    
                                    <div className="bg-[#171f33] p-4 rounded-xl border border-border space-y-2">
                                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted block">Resposta Dissertativa:</span>
                                      <p className="text-xs text-foreground italic whitespace-pre-wrap leading-relaxed">
                                        {sub.essayAnswer || <span className="text-muted">Nenhum texto dissertativo enviado.</span>}
                                      </p>
                                    </div>
                                  </>
                                )}
                              </div>

                              {/* Campos de Correção */}
                              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end pt-2">
                                <div className="sm:col-span-3">
                                  <label className="text-[10px] font-bold text-muted uppercase tracking-wider block mb-1">Nota Dissertativa</label>
                                  <input
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    max={sub.maxEssayScore || act.maxGrade || 10}
                                    placeholder={`Máx: ${sub.maxEssayScore || act.maxGrade || 10}`}
                                    value={draftScores[subKey] !== undefined ? draftScores[subKey] : (sub.essayScore || '')}
                                    onChange={(e) => handleScoreChange(subKey, e.target.value)}
                                    className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-xs text-foreground font-bold focus:outline-none focus:border-sky-400"
                                  />
                                </div>
                                <div className="sm:col-span-6">
                                  <label className="text-[10px] font-bold text-muted uppercase tracking-wider block mb-1">Parecer / Feedback (Opcional)</label>
                                  <input
                                    type="text"
                                    placeholder="Deixe um comentário encorajador..."
                                    value={draftFeedbacks[subKey] !== undefined ? draftFeedbacks[subKey] : (sub.teacherFeedback || '')}
                                    onChange={(e) => handleFeedbackChange(subKey, e.target.value)}
                                    className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-xs text-foreground focus:outline-none focus:border-sky-400"
                                  />
                                </div>
                                <div className="sm:col-span-3 flex flex-col gap-2">
                                  <button
                                    onClick={() => handleSaveGrade(act, sub.studentId, 'graded')}
                                    className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5"
                                  >
                                    <CheckCircle2 className="w-4 h-4" /> Aprovar Nota
                                  </button>
                                  <button
                                    onClick={() => handleSaveGrade(act, sub.studentId, 'returned')}
                                    className="w-full py-2 bg-background hover:bg-orange-500/10 text-orange-400 border border-border hover:border-orange-500/40 font-bold text-[10px] rounded-xl transition-all flex items-center justify-center gap-1.5"
                                  >
                                    <RefreshCw className="w-3.5 h-3.5" /> Devolver (Refazer)
                                  </button>
                                </div>
                              </div>

                            </div>
                          )}
                        </div>
                      );
                    })}
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