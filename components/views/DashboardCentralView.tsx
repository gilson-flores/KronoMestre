'use client';

import React, { useMemo } from 'react';
import {
  TrendingUp,
  Layers,
  CheckCircle2,
  Award,
  Users2,
  Clock,
  FileSpreadsheet,
  Heart,
  Plus,
  ArrowRight,
  Sparkles,
  BarChart3,
  FileText,
  Building2,
  CheckCheck,
  AlertCircle
} from 'lucide-react';
import { Activity, StudentUser } from '@/lib/types';
import {
  getActivityStudentAndSubmissionCounts,
  getCanonicalActivities,
  getUnifiedActivityMetrics,
  canStudentAccessActivity,
  getOriginalTurmas,
  isStudentPNE,
  getSubmissionTotalGrade,
} from '@/lib/studentUtils';

interface DashboardCentralViewProps {
  activities: Activity[];
  students: StudentUser[];
  onNavigateToTab: (tab: string) => void;
  onOpenNewActivityModal: () => void;
  onOpenNewStudentModal: () => void;
}

export const DashboardCentralView: React.FC<DashboardCentralViewProps> = ({
  activities = [],
  students = [],
  onNavigateToTab,
  onOpenNewActivityModal,
  onOpenNewStudentModal,
}) => {
  // Atividades canônicas/pedagógicas (atividades centrais + suas adaptações contam como 1 só)
  const canonicalActivities = useMemo(() => getCanonicalActivities(activities), [activities]);
  const totalActivities = canonicalActivities.length;
  const totalStudents = students.length;

  const totalSubmissions = useMemo(() => {
    return canonicalActivities.reduce((acc, a) => {
      const { subCount } = getUnifiedActivityMetrics(a, activities, students);
      return acc + subCount;
    }, 0);
  }, [canonicalActivities, activities, students]);

  const totalExpected = useMemo(() => {
    return canonicalActivities.reduce((acc, a) => {
      const { expectedStudentsCount } = getUnifiedActivityMetrics(a, activities, students);
      return acc + expectedStudentsCount;
    }, 0);
  }, [canonicalActivities, activities, students]);

  const completionRate = totalExpected > 0 ? Math.min(100, Math.round((totalSubmissions / totalExpected) * 100)) : 0;

  const pendingCorrections = useMemo(() => {
    return canonicalActivities.reduce((acc, a) => {
      const { pendingCount } = getUnifiedActivityMetrics(a, activities, students);
      return acc + pendingCount;
    }, 0);
  }, [canonicalActivities, activities, students]);

  // Cálculo preciso da Média Geral a partir de todas as notas avaliadas/lançadas
  const gradesCalculation = useMemo(() => {
    let totalScoreSum = 0;
    let totalGradedCount = 0;
    let activitiesWithGradesCount = 0;

    activities.forEach((act) => {
      let actHasGraded = false;
      const subs = act.submissions || [];
      subs.forEach((s) => {
        if (s.status === 'graded' || (s.essayScore !== undefined && s.essayScore !== null) || Number(s.objectiveScore) > 0) {
          totalScoreSum += getSubmissionTotalGrade(s);
          totalGradedCount += 1;
          actHasGraded = true;
        }
      });

      if (actHasGraded || (act.averageGrade !== undefined && act.averageGrade !== null && act.averageGrade > 0)) {
        activitiesWithGradesCount += 1;
      }
    });

    const average = totalGradedCount > 0 ? (totalScoreSum / totalGradedCount).toFixed(1) : '0.0';

    return {
      overallAverage: average,
      totalGradedCount,
      activitiesWithGradesCount,
    };
  }, [activities]);

  const overallAverage = gradesCalculation.overallAverage;

  // Stats by Activity Type: Contagem estrita por tipo de atividade canônica
  const statsByType = useMemo(() => {
    const counts = {
      Avaliação: 0,
      Simulado: 0,
      Redação: 0,
      Dinâmica: 0,
      'Trabalho em grupo': 0,
      'Projeto de pesquisa': 0,
    };

    canonicalActivities.forEach((act) => {
      const t = (act.type || '').trim().toLowerCase();
      if (t.includes('simulado')) {
        counts.Simulado += 1;
      } else if (t.includes('redação') || t.includes('redacao')) {
        counts.Redação += 1;
      } else if (t.includes('dinâmica') || t.includes('dinamica')) {
        counts.Dinâmica += 1;
      } else if (t.includes('grupo') || t.includes('trabalho')) {
        counts['Trabalho em grupo'] += 1;
      } else if (t.includes('pesquisa') || t.includes('projeto')) {
        counts['Projeto de pesquisa'] += 1;
      } else {
        counts.Avaliação += 1;
      }
    });

    return counts;
  }, [canonicalActivities]);

  // Breakdown by Turma
  const turmasBreakdown = useMemo(() => {
    const list = getOriginalTurmas(students);

    return list.map((turma) => {
      const turmaStudents = students.filter((s) => {
        if (!s.turma) return false;
        const parts = s.turma.split(/[,;]+/).map((t) => t.trim().toLowerCase());
        return parts.includes(turma.toLowerCase());
      });
      const turmaCanonicalActivities = canonicalActivities.filter((a) => canStudentAccessActivity(a.turma, turma));
      
      let turmaExpected = 0;
      let turmaSubmitted = 0;
      let turmaGradeSum = 0;
      let turmaGradedCount = 0;

      turmaCanonicalActivities.forEach((act) => {
        const { subCount, expectedStudentsCount, submissionsList } = getUnifiedActivityMetrics(act, activities, turmaStudents);
        turmaExpected += expectedStudentsCount;
        turmaSubmitted += subCount;
        
        submissionsList.forEach((s) => {
          if (s.status === 'graded' || (s.essayScore !== undefined && s.essayScore !== null) || Number(s.objectiveScore) > 0) {
            turmaGradeSum += getSubmissionTotalGrade(s);
            turmaGradedCount += 1;
          }
        });
      });

      const rate = turmaExpected > 0 ? Math.min(100, Math.round((turmaSubmitted / turmaExpected) * 100)) : 0;
      const avg = turmaGradedCount > 0 ? (turmaGradeSum / turmaGradedCount).toFixed(1) : '-';

      return {
        turma,
        studentsCount: turmaStudents.length,
        activitiesCount: turmaCanonicalActivities.length,
        completionRate: rate,
        averageGrade: avg,
        pneCount: turmaStudents.filter((s) => isStudentPNE(s)).length,
        radCount: turmaStudents.filter((s) => s.tag?.toUpperCase() === 'RAD').length,
      };
    });
  }, [students, activities, canonicalActivities]);

  // Inclusion & Support Stats
  const pneTotal = students.filter((s) => s.tag?.toUpperCase() === 'PNE').length;
  const radTotal = students.filter((s) => s.tag?.toUpperCase() === 'RAD').length;

  return (
    <div className="space-y-8 animate-fadeIn pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#131b2e] p-6 rounded-3xl border border-white/10 shadow-lg">
        <div>
          <div className="flex items-center gap-2 text-[#4ade80] text-xs font-bold uppercase tracking-wider mb-1">
            <TrendingUp className="w-4 h-4" />
            <span>Painel Geral de Gestão Pedagógica</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
            Dashboard do Professor
          </h1>
          <p className="text-xs sm:text-sm text-[#bccabb] mt-1 font-medium max-w-2xl">
            Visão consolidada de indicadores de engajamento, desempenho por turma, produções e pendências.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-center flex-wrap">
          <button
            onClick={() => onNavigateToTab('postagem_rco')}
            className="py-3 px-5 bg-[#171f33] hover:bg-[#222a3d] text-[#4ade80] font-bold rounded-2xl border border-[#4ade80]/30 transition-all text-xs flex items-center gap-2 cursor-pointer shadow-sm active:scale-95"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Postagem RCO</span>
          </button>

          <button
            onClick={onOpenNewActivityModal}
            className="py-3 px-5 bg-[#4ade80] hover:bg-[#6bfb9a] text-[#003919] font-bold rounded-2xl transition-all text-xs flex items-center gap-2 cursor-pointer shadow-md shadow-[#4ade80]/20 active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Nova Atividade</span>
          </button>
        </div>
      </div>

      {/* Primary 4 Global KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Atividades */}
        <div className="glass-panel p-5 rounded-3xl border border-white/10 bg-[#131b2e] relative overflow-hidden group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold tracking-wider text-[#bccabb] uppercase">
              Atividades Criadas
            </span>
            <div className="w-9 h-9 rounded-2xl bg-[#1d273d] text-[#4ade80] flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white mb-1">{totalActivities}</div>
          <div className="text-xs text-[#bccabb]">
            Cadastradas em {turmasBreakdown.length} turmas
          </div>
        </div>

        {/* KPI 2: Entregas & Engajamento */}
        <div className="glass-panel p-5 rounded-3xl border border-white/10 bg-[#131b2e] relative overflow-hidden group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold tracking-wider text-[#bccabb] uppercase">
              Entregas de Alunos
            </span>
            <div className="w-9 h-9 rounded-2xl bg-indigo-500/20 text-[#c0c1ff] flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white mb-1">{totalSubmissions}</div>
          <div className="text-xs text-[#4ade80] font-semibold">
            {completionRate}% de engajamento ({totalExpected} esperadas)
          </div>
        </div>

        {/* KPI 3: Média Geral */}
        <div className="glass-panel p-5 rounded-3xl border border-white/10 bg-[#131b2e] relative overflow-hidden group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold tracking-wider text-[#bccabb] uppercase">
              Média Geral
            </span>
            <div className="w-9 h-9 rounded-2xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white mb-1">{overallAverage}</div>
          <div className="text-xs text-[#bccabb]">
            {gradesCalculation.totalGradedCount > 0
              ? `${gradesCalculation.totalGradedCount} ${gradesCalculation.totalGradedCount === 1 ? 'nota lançada' : 'notas lançadas'}`
              : 'Sem notas ainda'}
          </div>
        </div>

        {/* KPI 4: Pendências de Correção */}
        <div className="glass-panel p-5 rounded-3xl border border-white/10 bg-[#131b2e] relative overflow-hidden group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold tracking-wider text-[#bccabb] uppercase">
              Aguardando Correção
            </span>
            <div className="w-9 h-9 rounded-2xl bg-amber-500/20 text-amber-300 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white mb-1">{pendingCorrections}</div>
          <div className="text-xs text-amber-300/90 font-medium">
            {pendingCorrections > 0 ? (
              <button
                onClick={() => onNavigateToTab('correcoes')}
                className="underline hover:text-white cursor-pointer"
              >
                Clique para abrir correções
              </button>
            ) : (
              'Nenhuma pendência na fila'
            )}
          </div>
        </div>
      </div>

      {/* Production Types & Inclusion Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tipos de Produção Pedagógica */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-3xl border border-white/10 bg-[#131b2e] space-y-4 shadow-md">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[#4ade80]" />
              <span>Distribuição por Tipo de Atividade</span>
            </h2>
            <span className="text-xs text-[#bccabb] font-semibold">{totalActivities} no total</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Object.entries(statsByType).map(([tipo, count]) => (
              <div
                key={tipo}
                className="p-4 rounded-2xl bg-[#0b1326] border border-white/5 flex flex-col justify-between"
              >
                <span className="text-xs text-[#bccabb] font-medium truncate">{tipo}</span>
                <div className="flex items-baseline justify-between mt-2">
                  <span className="text-2xl font-extrabold text-white">{count}</span>
                  <span className="text-[10px] text-[#4ade80] font-bold">
                    {totalActivities > 0 ? `${Math.round((count / totalActivities) * 100)}%` : '0%'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Resumo de Inclusão & Atendimentos */}
        <div className="glass-panel p-6 rounded-3xl border border-white/10 bg-[#131b2e] space-y-4 shadow-md flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2 mb-4">
              <Heart className="w-4 h-4 text-rose-400" />
              <span>Inclusão & Atendimentos</span>
            </h2>

            <div className="space-y-3">
              <div className="p-3.5 rounded-2xl bg-[#0b1326] border border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-300 flex items-center justify-center font-bold text-xs">
                    PNE
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">Alunos com Adaptação (PNE)</span>
                    <span className="text-[10px] text-[#bccabb]">Atendidos pelo 2º Professor</span>
                  </div>
                </div>
                <span className="text-xl font-black text-rose-400">{pneTotal}</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#0b1326] border border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-300 flex items-center justify-center font-bold text-xs">
                    RAD
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">Atendimento Domiciliar (RAD)</span>
                    <span className="text-[10px] text-[#bccabb]">Atestados ≥ 15 dias</span>
                  </div>
                </div>
                <span className="text-xl font-black text-amber-300">{radTotal}</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => onNavigateToTab('atestados_rad')}
            className="w-full py-2.5 px-4 bg-[#171f33] hover:bg-[#222a3d] text-white rounded-2xl text-xs font-bold border border-white/10 flex items-center justify-center gap-1.5 transition-all cursor-pointer mt-2"
          >
            <span>Ver Atestados e RAD</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Turmas Panorama Breakdown Table */}
      <div className="glass-panel p-6 rounded-3xl border border-white/10 bg-[#131b2e] space-y-4 shadow-md">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Users2 className="w-5 h-5 text-[#4ade80]" />
              <span>Panorama de Engajamento por Turma</span>
            </h2>
            <p className="text-xs text-[#bccabb] mt-0.5">
              Comparativo de estudantes, atividades disponibilizadas, taxa de conclusão e média.
            </p>
          </div>

          <button
            onClick={() => onNavigateToTab('postagem_rco')}
            className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold text-[#4ade80] hover:underline cursor-pointer"
          >
            <span>Lançar notas no RCO</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {turmasBreakdown.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#bccabb]">
            Nenhuma turma cadastrada no momento.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#bccabb]">
              <thead className="bg-[#0b1326] text-[11px] font-bold text-[#bccabb] uppercase tracking-wider border-b border-white/10">
                <tr>
                  <th className="py-3 px-4">Turma</th>
                  <th className="py-3 px-4 text-center">Alunos</th>
                  <th className="py-3 px-4 text-center">Atividades</th>
                  <th className="py-3 px-4">Engajamento / Conclusão</th>
                  <th className="py-3 px-4 text-center">Média Geral</th>
                  <th className="py-3 px-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {turmasBreakdown.map((t) => (
                  <tr key={t.turma} className="hover:bg-white/5 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-white flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#4ade80]"></span>
                      <span>Turma {t.turma}</span>
                    </td>
                    <td className="py-3.5 px-4 text-center text-white/90 font-medium">
                      {t.studentsCount} {t.pneCount > 0 && <span className="text-[10px] text-rose-300 font-bold">({t.pneCount} PNE)</span>}
                    </td>
                    <td className="py-3.5 px-4 text-center text-white/90 font-medium">
                      {t.activitiesCount}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 bg-[#0b1326] h-2 rounded-full overflow-hidden max-w-[140px]">
                          <div
                            className="bg-[#4ade80] h-full rounded-full transition-all duration-500"
                            style={{ width: `${t.completionRate}%` }}
                          />
                        </div>
                        <span className="font-bold text-white text-[11px] min-w-[32px]">
                          {t.completionRate}%
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-[#4ade80]">
                      {t.averageGrade}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => onNavigateToTab('postagem_rco')}
                        className="py-1 px-3 bg-[#0b1326] hover:bg-[#171f33] text-[#4ade80] rounded-xl text-[11px] font-bold border border-white/10 transition-all cursor-pointer inline-flex items-center gap-1"
                      >
                        <FileSpreadsheet className="w-3 h-3" />
                        <span>Ver RCO</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardCentralView;
