'use client';

import React from 'react';
import {
  Plus,
  CheckCircle2,
  BarChart3,
  AlertTriangle,
  FileQuestion,
  FileText,
  Users2,
  Pencil,
  FileSpreadsheet,
  Eye,
  CheckCheck,
  Trash2
} from 'lucide-react';
import { Activity } from '@/lib/types';

interface DashboardViewProps {
  activities: Activity[];
  onOpenNewActivityModal: () => void;
  onSelectActivityForGrading: (act: Activity) => void;
  onEditActivity: (act: Activity) => void;
  onGenerateDossier: (act: Activity) => void;
  onDeleteActivity?: (act: Activity) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  activities,
  onOpenNewActivityModal,
  onSelectActivityForGrading,
  onEditActivity,
  onGenerateDossier,
  onDeleteActivity,
}) => {
  // Calculate top KPI stats from real state
  const totalSubmissions = activities.reduce((acc, a) => acc + a.totalSubmissions, 0);
  const totalExpected = activities.reduce((acc, a) => acc + a.totalStudents, 0);
  const completionRate = totalExpected > 0 ? Math.round((totalSubmissions / totalExpected) * 100) : 0;
  const pendingCorrections = activities.reduce((acc, a) => acc + a.pendingCorrection, 0);

  const activitiesWithGrades = activities.filter((a) => a.averageGrade !== undefined && a.averageGrade > 0);
  const overallAverage = activitiesWithGrades.length > 0
    ? (activitiesWithGrades.reduce((acc, a) => acc + (a.averageGrade || 0), 0) / activitiesWithGrades.length).toFixed(1)
    : '0.0';

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
            Central de Atividades
          </h1>
          <p className="text-sm md:text-base text-[#bccabb] mt-1 font-medium">
            Gerencie avaliações, redações e dinâmicas das suas turmas.
          </p>
        </div>

        <button
          onClick={onOpenNewActivityModal}
          className="self-start sm:self-center py-3 px-6 bg-[#4ade80] hover:bg-[#6bfb9a] text-[#003919] font-bold rounded-full transition-all duration-200 flex items-center gap-2 shadow-lg shadow-[#4ade80]/20 cursor-pointer text-sm"
        >
          <Plus className="w-5 h-5 stroke-[2.5]" />
          <span>Nova Atividade</span>
        </button>
      </div>

      {/* KPI Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Metric 1 */}
        <div className="glass-panel p-6 rounded-3xl border border-white/10 relative overflow-hidden group">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold tracking-wider text-[#bccabb] uppercase">
              Taxa de Conclusão Média
            </span>
            <div className="w-9 h-9 rounded-full bg-indigo-500/20 text-[#c0c1ff] flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="text-4xl font-extrabold text-white mb-2">{completionRate}%</div>
          <div className="flex items-center gap-1.5 text-xs text-[#4ade80] font-semibold">
            <span>{totalSubmissions} entregas de {totalExpected} esperadas</span>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="glass-panel p-6 rounded-3xl border border-white/10 relative overflow-hidden group">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold tracking-wider text-[#bccabb] uppercase">
              Média Geral (Provas)
            </span>
            <div className="w-9 h-9 rounded-full bg-indigo-500/20 text-[#c0c1ff] flex items-center justify-center">
              <BarChart3 className="w-5 h-5" />
            </div>
          </div>
          <div className="text-4xl font-extrabold text-white mb-2">{overallAverage}</div>
          <div className="text-xs text-[#bccabb]">
            {activitiesWithGrades.length > 0 ? `${activitiesWithGrades.length} atividade(s) avaliada(s)` : 'Nenhuma avaliação concluída'}
          </div>
        </div>

        {/* Metric 3 */}
        <div className="glass-panel p-6 rounded-3xl border border-white/10 relative overflow-hidden group">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold tracking-wider text-[#bccabb] uppercase">
              Atividades Pendentes de Correção
            </span>
            <div className="w-9 h-9 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="text-4xl font-extrabold text-white mb-2">{pendingCorrections}</div>
          <div className="flex items-center gap-1.5 text-xs text-rose-300 font-semibold">
            <span>{pendingCorrections > 0 ? 'Aguardando correção pedagógica' : 'Todas as correções em dia'}</span>
          </div>
        </div>
      </div>

      {/* Atividades Recentes List */}
      <div className="space-y-4 pt-2">
        <h2 className="text-xl font-bold text-white tracking-tight">Atividades Recentes</h2>

        <div className="space-y-4">
          {activities.length === 0 ? (
            <div className="glass-panel p-12 text-center rounded-3xl border border-white/10 text-[#bccabb]">
              Nenhuma atividade cadastrada no momento. Clique em "+ Nova Atividade" para começar.
            </div>
          ) : (
            activities.map((act) => {
            let Icon = FileText;
            if (act.type === 'Simulado') Icon = FileQuestion;
            if (act.type === 'Dinâmica') Icon = Users2;

            return (
              <div
                key={act.id}
                className={`glass-panel p-5 md:p-6 rounded-3xl transition-all duration-200 border border-white/10 ${
                  act.pendingCorrection > 0 ? 'ring-1 ring-[#4ade80]/30' : ''
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Left Info */}
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-[#1d273d] border border-white/10 text-[#4ade80] flex items-center justify-center shrink-0 mt-0.5">
                      <Icon className="w-6 h-6" />
                    </div>

                    <div className="space-y-1.5">
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
                          {act.turma}
                        </span>
                      </div>

                      {/* Sub-details */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#bccabb]">
                        {act.totalSubmissions > 0 && (
                          <span>👥 {act.totalSubmissions}/{act.totalStudents} Entregas</span>
                        )}
                        {act.deadline && <span>⏱ Prazo: {act.deadline}</span>}
                        {act.pendingCorrection > 0 && (
                          <span className="text-amber-300 font-semibold">
                            📋 {act.pendingCorrection} Pendentes de Correção
                          </span>
                        )}
                        {act.averageGrade !== undefined && (
                          <span className="text-[#4ade80] font-semibold">
                            📊 Média: {act.averageGrade}
                          </span>
                        )}
                        {act.completedDate && <span>📅 Concluído em {act.completedDate}</span>}
                      </div>
                    </div>
                  </div>

                  {/* Right Actions */}
                  <div className="flex flex-wrap items-center gap-2.5 self-end lg:self-center">
                    {act.status === 'Ativo' && (
                      <>
                        <button
                          onClick={() => onEditActivity(act)}
                          className="px-4 py-2 bg-[#171f33] hover:bg-[#222a3d] text-[#dae2fd] rounded-full text-xs font-bold border border-white/10 flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          <span>Editar</span>
                        </button>
                        <button
                          onClick={() => onSelectActivityForGrading(act)}
                          className="px-5 py-2 bg-[#4ade80] hover:bg-[#6bfb9a] text-[#003919] rounded-full text-xs font-bold flex items-center gap-1.5 transition-colors shadow-md cursor-pointer"
                        >
                          <CheckCheck className="w-4 h-4" />
                          <span>Corrigir</span>
                        </button>
                      </>
                    )}

                    {act.status === 'Prazo Encerrado' && (
                      <>
                        <button
                          onClick={() => onGenerateDossier(act)}
                          className="px-4 py-2 bg-[#171f33] hover:bg-[#222a3d] text-[#dae2fd] rounded-full text-xs font-bold border border-white/10 flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5 text-[#c0c1ff]" />
                          <span>Gerar Dossiê</span>
                        </button>
                        <button
                          onClick={() => onSelectActivityForGrading(act)}
                          className="px-5 py-2 bg-[#4ade80] hover:bg-[#6bfb9a] text-[#003919] rounded-full text-xs font-bold flex items-center gap-1.5 transition-colors shadow-md cursor-pointer"
                        >
                          <CheckCheck className="w-4 h-4" />
                          <span>Corrigir Restantes</span>
                        </button>
                      </>
                    )}

                    {act.status === 'Inativo' && (
                      <button
                        onClick={() => onSelectActivityForGrading(act)}
                        className="px-4 py-2 bg-[#171f33] hover:bg-[#222a3d] text-[#dae2fd] rounded-full text-xs font-bold border border-white/10 flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Ver Resultados</span>
                      </button>
                    )}

                    {onDeleteActivity && (
                      <button
                        onClick={() => {
                          if (window.confirm(`Tem certeza que deseja excluir a atividade "${act.title}"?`)) {
                            onDeleteActivity(act);
                          }
                        }}
                        className="px-3 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 hover:text-rose-200 rounded-full text-xs font-bold border border-rose-500/20 flex items-center gap-1.5 transition-colors cursor-pointer"
                        title="Excluir Atividade"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Excluir</span>
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
    </div>
  );
};
