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
  Pencil,
  FileSpreadsheet,
  Trash2,
  TrendingUp,
  Layers,
  Award,
  Eye
} from 'lucide-react';
import { Activity } from '@/lib/types';

interface DashboardViewProps {
  activities: Activity[];
  onOpenNewActivityModal: () => void;
  onSelectActivityForGrading: (act: Activity) => void;
  onEditActivity: (act: Activity) => void;
  onViewActivity?: (act: Activity) => void;
  onGenerateDossier: (act: Activity) => void;
  onDeleteActivity?: (act: Activity) => void;
  title?: string;
  subtitle?: string;
  showStats?: boolean;
  isCorrecoesTab?: boolean;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  activities,
  onOpenNewActivityModal,
  onSelectActivityForGrading,
  onEditActivity,
  onViewActivity,
  onGenerateDossier,
  onDeleteActivity,
  title = 'Studio',
  subtitle = 'Gerencie avaliações, redações e dinâmicas das suas turmas.',
  showStats = true,
  isCorrecoesTab,
}) => {
  const isCorrecoes = isCorrecoesTab || title === 'Correções';
  const [activityToDelete, setActivityToDelete] = useState<Activity | null>(null);

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
        <h2 className="text-xl font-bold text-white tracking-tight">Atividades Recentes</h2>

        <div className="space-y-4">
          {activities.length === 0 ? (
            <div className="glass-panel p-12 text-center rounded-3xl border border-white/10 text-[#bccabb]">
              Nenhuma atividade cadastrada no momento. Clique em &quot;+ Nova Atividade&quot; para começar.
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
                      {onViewActivity && (
                        <button
                          onClick={() => onViewActivity(act)}
                          className="px-4 py-2 bg-[#1d273d] hover:bg-[#283654] text-[#dae2fd] hover:text-white rounded-full text-xs font-bold border border-white/10 flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                          title="Ver detalhes da atividade criada"
                        >
                          <Eye className="w-3.5 h-3.5 text-sky-400" />
                          <span>Ver Atividade</span>
                        </button>
                      )}

                      {isCorrecoes && (
                        <button
                          onClick={() => onSelectActivityForGrading(act)}
                          className="px-4 py-2 bg-[#4ade80] hover:bg-[#6bfb9a] text-[#003919] font-bold rounded-full text-xs flex items-center gap-1.5 transition-all shadow-md shadow-[#4ade80]/10 cursor-pointer"
                        >
                          <CheckCheck className="w-4 h-4 stroke-[2.5]" />
                          <span>{act.pendingCorrection > 0 ? `Corrigir (${act.pendingCorrection})` : 'Acessar Correções'}</span>
                        </button>
                      )}

                      {!isCorrecoes && (
                        <button
                          onClick={() => onEditActivity(act)}
                          className="px-4 py-2 bg-[#171f33] hover:bg-[#222a3d] text-[#dae2fd] hover:text-white rounded-full text-xs font-bold border border-white/10 flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Pencil className="w-3.5 h-3.5 text-[#4ade80]" />
                          <span>Editar</span>
                        </button>
                      )}

                      {act.status === 'Prazo Encerrado' && (
                        <button
                          onClick={() => onGenerateDossier(act)}
                          className="px-4 py-2 bg-[#171f33] hover:bg-[#222a3d] text-[#dae2fd] rounded-full text-xs font-bold border border-white/10 flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5 text-[#c0c1ff]" />
                          <span>Gerar Dossiê</span>
                        </button>
                      )}

                      {!isCorrecoes && onDeleteActivity && (
                        <button
                          onClick={() => setActivityToDelete(act)}
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
              Tem certeza que deseja excluir a atividade <strong className="text-white">"{activityToDelete.title}"</strong>? Todas as entregas e correções associadas a ela serão removidas.
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
    </div>
  );
};

