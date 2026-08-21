'use client';

import React, { useState, useMemo } from 'react';
import {
  FileCheck2,
  Users,
  BookOpen,
  Search,
  Clock,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ChevronRight,
  ArrowLeft,
  RotateCcw,
  Star,
  Award,
  Filter,
  CheckCheck
} from 'lucide-react';
import { Activity, ActivitySubmission, StudentUser } from '@/lib/types';
import { getOriginalTurmas, sortTurmas, canStudentAccessActivity } from '@/lib/studentUtils';
import { GradingView } from './GradingView';

interface CorrectionsViewProps {
  activities: Activity[];
  students: StudentUser[];
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

export const CorrectionsView: React.FC<CorrectionsViewProps> = ({
  activities = [],
  students = [],
  onUpdateSubmission,
  initialSelectedActivityId = null,
}) => {
  // Lista de Turmas Originais dos alunos ordenadas por ano (1ºs, depois 2ºs, depois 3ºs)
  const originalTurmas = useMemo(() => {
    return getOriginalTurmas(students);
  }, [students]);

  const [selectedTurmaFilter, setSelectedTurmaFilter] = useState<string>('all');
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(initialSelectedActivityId);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'graded'>('all');

  // Atividade atualmente aberta para correção
  const activeGradingActivity = useMemo(() => {
    if (!selectedActivityId) return null;
    return activities.find((a) => a.id === selectedActivityId) || null;
  }, [activities, selectedActivityId]);

  // Contadores globais de correção
  const { totalPendingCount, totalGradedCount, totalDeliveriesCount } = useMemo(() => {
    let pending = 0;
    let graded = 0;
    let deliveries = 0;

    activities.forEach((act) => {
      const subs = act.submissions || [];
      deliveries += subs.length;
      subs.forEach((s) => {
        if (s.status === 'pending' || s.status === 'draft') pending++;
        else if (s.status === 'graded') graded++;
      });
    });

    return {
      totalPendingCount: pending,
      totalGradedCount: graded,
      totalDeliveriesCount: deliveries,
    };
  }, [activities]);

  // Filtrar atividades pela turma selecionada e busca
  const filteredActivities = useMemo(() => {
    return activities.filter((act) => {
      // Filtro de turma original
      if (selectedTurmaFilter !== 'all') {
        const matchesTurma = canStudentAccessActivity(act.turma, selectedTurmaFilter);
        if (!matchesTurma) return false;
      }

      // Filtro de busca por título ou descrição
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTitle = act.title.toLowerCase().includes(q);
        const matchesSubject = act.subject?.toLowerCase().includes(q);
        if (!matchesTitle && !matchesSubject) return false;
      }

      // Filtro de status de correção
      const subs = act.submissions || [];
      const pendingInAct = subs.filter((s) => s.status === 'pending' || s.status === 'draft').length;
      const gradedInAct = subs.filter((s) => s.status === 'graded').length;

      if (statusFilter === 'pending' && pendingInAct === 0) return false;
      if (statusFilter === 'graded' && gradedInAct === 0) return false;

      return true;
    });
  }, [activities, selectedTurmaFilter, searchQuery, statusFilter]);

  // Se uma atividade foi selecionada, renderiza o GradingView integrado com navegação facilitada
  if (activeGradingActivity) {
    return (
      <div className="space-y-6 animate-fadeIn pb-12">
        {/* Barra superior de contexto da Correção */}
        <div className="bg-[#131b2e] p-4 sm:p-5 rounded-3xl border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedActivityId(null)}
              className="p-2.5 bg-[#171f33] hover:bg-[#222a3d] text-[#dae2fd] hover:text-white rounded-2xl border border-white/10 transition-all cursor-pointer flex items-center gap-2 text-xs font-bold"
              title="Voltar para a lista de correções"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Ver Todas as Atividades</span>
            </button>

            <div className="h-6 w-px bg-white/10 hidden sm:block" />

            <div>
              <span className="text-[11px] font-bold text-[#4ade80] uppercase tracking-wider block">
                Painel de Correção & Atribuição de Notas
              </span>
              <h2 className="text-lg sm:text-xl font-black text-white truncate max-w-md sm:max-w-xl">
                {activeGradingActivity.title}
              </h2>
            </div>
          </div>

          {/* Seletor rápido de atividade para alternar sem voltar */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <label className="text-xs font-bold text-[#bccabb] whitespace-nowrap hidden md:inline">
              Trocar Atividade:
            </label>
            <select
              value={activeGradingActivity.id}
              onChange={(e) => setSelectedActivityId(e.target.value)}
              className="bg-[#0b1326] border border-white/15 rounded-2xl px-3 py-2 text-xs text-white font-bold focus:outline-none focus:border-[#4ade80] cursor-pointer w-full sm:w-64"
            >
              {activities.map((a) => {
                const pend = (a.submissions || []).filter((s) => s.status === 'pending' || s.status === 'draft').length;
                return (
                  <option key={a.id} value={a.id} className="bg-[#0b1326] text-white">
                    {a.title} {pend > 0 ? `(⏳ ${pend} pendentes)` : ''}
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        {/* View Completa de Correção */}
        <GradingView
          activity={activeGradingActivity}
          allActivities={activities}
          students={students}
          onBack={() => setSelectedActivityId(null)}
          onSelectActivity={(act) => setSelectedActivityId(act.id)}
          onUpdateSubmission={onUpdateSubmission}
        />
      </div>
    );
  }

  // Lista/Seletor de Atividades para Correção
  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Header com Estatísticas de Correção */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#131b2e] p-5 sm:p-6 rounded-3xl border border-white/10 shadow-lg">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <FileCheck2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Central de Correções
              </h1>
              {totalPendingCount > 0 && (
                <span className="px-3 py-0.5 rounded-full text-xs font-black bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                  ⏳ {totalPendingCount} pendentes
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-[#bccabb] font-medium mt-0.5">
              Selecione uma atividade para corrigir redações, atribuir notas, gerar feedback e lançar avaliações.
            </p>
          </div>
        </div>

        {/* Resumo Rápido em Cartões Compactos */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="px-4 py-2.5 rounded-2xl bg-[#0b1326] border border-amber-500/30 text-left">
            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
              A Corrigir
            </span>
            <span className="text-lg font-black text-amber-300">{totalPendingCount}</span>
          </div>

          <div className="px-4 py-2.5 rounded-2xl bg-[#0b1326] border border-emerald-500/30 text-left">
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">
              Corrigidas
            </span>
            <span className="text-lg font-black text-emerald-300">{totalGradedCount}</span>
          </div>

          <div className="px-4 py-2.5 rounded-2xl bg-[#0b1326] border border-white/10 text-left">
            <span className="text-[10px] font-bold text-[#bccabb] uppercase tracking-wider block">
              Total Entregas
            </span>
            <span className="text-lg font-black text-white">{totalDeliveriesCount}</span>
          </div>
        </div>
      </div>

      {/* Barra de Filtros: Turmas Originais e Busca */}
      <div className="glass-panel p-4 sm:p-5 rounded-3xl border border-white/10 bg-[#131b2e] space-y-4 shadow-md">
        {/* Seletor de Turmas Originais em Abas/Pills */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-[#bccabb] flex items-center gap-1.5 uppercase tracking-wider">
            <Users className="w-3.5 h-3.5 text-[#4ade80]" />
            <span>Filtrar por Turma:</span>
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setSelectedTurmaFilter('all')}
              className={`py-2 px-4 rounded-full text-xs font-bold transition-all cursor-pointer ${
                selectedTurmaFilter === 'all'
                  ? 'bg-[#4ade80] text-[#003919] shadow-md shadow-[#4ade80]/20'
                  : 'bg-[#0b1326] text-[#bccabb] hover:text-white border border-white/10'
              }`}
            >
              Todas as Turmas
            </button>

            {originalTurmas.map((turmaCode) => {
              const countStudents = students.filter((s) => s.turma === turmaCode).length;
              return (
                <button
                  key={turmaCode}
                  onClick={() => setSelectedTurmaFilter(turmaCode)}
                  className={`py-2 px-4 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    selectedTurmaFilter === turmaCode
                      ? 'bg-[#4ade80] text-[#003919] shadow-md shadow-[#4ade80]/20'
                      : 'bg-[#0b1326] text-[#bccabb] hover:text-white border border-white/10'
                  }`}
                >
                  <span>Turma {turmaCode}</span>
                  <span className="text-[10px] opacity-75 font-mono">({countStudents})</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Linha de Busca e Subfiltros */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-3 border-t border-white/10">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-[#869486]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar atividade por título..."
              className="w-full bg-[#0b1326] border border-white/10 rounded-full pl-11 pr-4 py-2.5 text-xs sm:text-sm text-white placeholder-[#869486] focus:outline-none focus:border-[#4ade80]"
            />
          </div>

          <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-[#1d273d] text-[#4ade80] border border-[#4ade80]/30'
                  : 'bg-[#0b1326] text-[#bccabb] hover:text-white border border-white/10'
              }`}
            >
              Todas ({activities.length})
            </button>
            <button
              onClick={() => setStatusFilter('pending')}
              className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 ${
                statusFilter === 'pending'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-[#0b1326] text-[#bccabb] hover:text-white border border-white/10'
              }`}
            >
              <span>⏳ Pendentes</span>
            </button>
            <button
              onClick={() => setStatusFilter('graded')}
              className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 ${
                statusFilter === 'graded'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-[#0b1326] text-[#bccabb] hover:text-white border border-white/10'
              }`}
            >
              <span>✅ Concluídas</span>
            </button>
          </div>
        </div>
      </div>

      {/* Lista de Atividades para Correção */}
      <div className="space-y-3">
        {filteredActivities.length === 0 ? (
          <div className="glass-panel p-12 text-center rounded-3xl border border-white/10 bg-[#131b2e] text-[#bccabb] space-y-2">
            <CheckCircle2 className="w-12 h-12 text-[#4ade80] mx-auto opacity-80" />
            <p className="font-bold text-white text-base">
              Nenhuma atividade encontrada com os filtros selecionados.
            </p>
            <p className="text-xs text-[#bccabb]">
              Selecione outra turma ou limpe o termo de busca para visualizar as atividades.
            </p>
          </div>
        ) : (
          filteredActivities.map((act) => {
            const subs = act.submissions || [];
            const pendingCount = subs.filter((s) => s.status === 'pending' || s.status === 'draft').length;
            const gradedCount = subs.filter((s) => s.status === 'graded').length;
            const totalSubs = subs.length;

            // Calcular média real das notas lançadas
            const gradedSubs = subs.filter((s) => s.status === 'graded');
            let avgScore = 0;
            if (gradedSubs.length > 0) {
              const sum = gradedSubs.reduce((acc, curr) => {
                const total = (Number(curr.objectiveScore) || 0) + (Number(curr.essayScore) || 0) + (Number(curr.extraPoints) || 0);
                return acc + total;
              }, 0);
              avgScore = Number((sum / gradedSubs.length).toFixed(1));
            }

            return (
              <div
                key={act.id}
                onClick={() => setSelectedActivityId(act.id)}
                className="glass-panel p-4 sm:p-5 rounded-3xl border border-white/10 bg-[#131b2e] hover:border-[#4ade80]/40 transition-all cursor-pointer shadow-md hover:shadow-xl hover:scale-[1.005] group"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Informações da Atividade */}
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-bold bg-[#171f33] text-[#bccabb] px-3 py-0.5 rounded-full border border-white/5">
                        Turma: <strong className="text-white">{act.turma}</strong>
                      </span>
                      <span className="text-[11px] font-bold bg-[#171f33] text-[#4ade80] px-3 py-0.5 rounded-full border border-white/5">
                        {act.type}
                      </span>
                      {act.isAdapted && (
                        <span className="text-[10px] font-bold bg-amber-500/20 text-amber-300 px-2.5 py-0.5 rounded-full border border-amber-500/30 flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-amber-400" />
                          <span>PNE Adaptada</span>
                        </span>
                      )}
                    </div>

                    <h3 className="text-base sm:text-lg font-black text-white group-hover:text-[#4ade80] transition-colors leading-tight">
                      {act.title}
                    </h3>

                    {act.description && (
                      <p className="text-xs text-[#bccabb] line-clamp-1">
                        {act.description}
                      </p>
                    )}
                  </div>

                  {/* Badges de Entregas, Pendências e Notas */}
                  <div className="flex flex-wrap items-center gap-3 shrink-0">
                    {/* Status da Fila de Correção */}
                    {pendingCount > 0 ? (
                      <div className="px-3.5 py-2 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-300 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider block leading-none">
                            Aguardando
                          </span>
                          <span className="text-sm font-black">{pendingCount} a corrigir</span>
                        </div>
                      </div>
                    ) : (
                      <div className="px-3.5 py-2 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 flex items-center gap-2">
                        <CheckCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider block leading-none">
                            Correções
                          </span>
                          <span className="text-sm font-black">Em dia</span>
                        </div>
                      </div>
                    )}

                    {/* Total de Entregas e Corrigidas */}
                    <div className="px-3.5 py-2 rounded-2xl bg-[#0b1326] border border-white/10 text-left">
                      <span className="text-[10px] font-bold text-[#bccabb] uppercase tracking-wider block leading-none">
                        Entregas
                      </span>
                      <span className="text-sm font-black text-white">
                        {gradedCount}/{totalSubs} <span className="text-xs text-[#869486]">corrigidas</span>
                      </span>
                    </div>

                    {/* Média da Atividade (Notas) */}
                    {gradedSubs.length > 0 && (
                      <div className="px-3.5 py-2 rounded-2xl bg-sky-500/10 border border-sky-500/30 text-sky-300 text-left">
                        <span className="text-[10px] font-bold uppercase tracking-wider block leading-none flex items-center gap-1">
                          <Star className="w-3 h-3 text-sky-400" />
                          <span>Média</span>
                        </span>
                        <span className="text-sm font-black">
                          {avgScore.toFixed(1)} <span className="text-[10px] opacity-75">/ {act.maxGrade || 10}</span>
                        </span>
                      </div>
                    )}

                    {/* Botão de Acesso */}
                    <div className="p-3 rounded-2xl bg-[#4ade80] text-[#003919] font-bold group-hover:bg-[#6bfb9a] transition-all flex items-center justify-center shadow-md">
                      <ChevronRight className="w-5 h-5 stroke-[2.5]" />
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
