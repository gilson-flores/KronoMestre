'use client';

import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Save,
  RotateCcw,
  UserCheck,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Award,
  FileCheck2,
  FileText,
  Clock,
  UserX,
  ChevronDown,
  Check,
  Send,
  Loader2,
  Filter,
  GraduationCap,
  Zap,
  TrendingUp,
  ArrowRight,
  BookOpenCheck,
  Maximize2,
  ExternalLink,
} from 'lucide-react';
import { Activity, ActivitySubmission, StudentUser, EssayQuestion } from '@/lib/types';
import {
  canStudentAccessActivity,
  normalizeStudentName,
  getActivityGradeDistribution,
  isStudentPNE,
  getChildRecoveryActivities,
  getChildAdaptations,
  isActivityRecovery,
  isActivityAdapted,
  getSubmissionTotalGrade,
} from '@/lib/studentUtils';
import { GradeConsolidationModal } from '@/components/modals/GradeConsolidationModal';
import { Layers, GitFork, CheckCheck, HelpCircle } from 'lucide-react';
import { GradingLoadingSkeleton, StandardErrorState } from '@/components/LoadingState';

export const GradingViewMainBody: React.FC<any> = (props) => {
  const { activity, allActivities, isLoading, hasError, onRetry, onSelectActivity, onBack, handleRefreshDeliveries, activityTurmas, hasMultipleTurmas, getSubmissionTurma, childRecoveries, childAdaptations, hasLinkedChildren, effectiveSubmissions, pendingQueue, gradedQueue, returnedQueue, missingStudents, selectedTurmaFilter, setSelectedTurmaFilter, includeChildActivities, setIncludeChildActivities, isRefreshing, refreshError, setRefreshError, refreshToast, activeTab, setActiveTab, isActivityDropdownOpen, setIsActivityDropdownOpen, aiErrorMessage, setAiErrorMessage, consolidationModalData, setConsolidationModalData, renderSubmissionCard } = props;
  return (
    <>
      {/* Top Header Controls Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
        <button
          onClick={onBack}
          className="w-full sm:w-auto inline-flex items-center justify-center sm:justify-start gap-2 px-4 py-2 min-h-[44px] min-w-[44px] bg-[#171f33] hover:bg-surface-hover text-foreground rounded-full text-xs font-bold transition-all border border-border cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 shrink-0" />
          <span>Voltar para Atividades</span>
        </button>

        {/* Action Buttons: Refresh Deliveries & Select Activity */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
          {/* Botão de Atualizar Entregas */}
          <button
            onClick={handleRefreshDeliveries}
            disabled={isRefreshing}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 min-h-[44px] bg-surface hover:bg-[#1c263f] text-primary rounded-full text-xs font-bold transition-all border border-primary/30 cursor-pointer shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 shrink-0 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Sincronizando...' : 'Atualizar Entregas'}</span>
          </button>

          {/* Botão de Corrigir Atividade (Seletor) */}
          <div className="relative w-full sm:w-auto">
            <button
              onClick={() => setIsActivityDropdownOpen(!isActivityDropdownOpen)}
              className="w-full inline-flex items-center justify-between gap-2 px-4 py-2 min-h-[44px] min-w-[44px] bg-primary hover:bg-primary-hover text-white rounded-full text-xs font-bold transition-all shadow-md cursor-pointer"
            >
              <div className="flex items-center gap-1.5 truncate">
                <FileCheck2 className="w-4 h-4 shrink-0" />
                <span className="truncate">Corrigir Atividade</span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 shrink-0" />
            </button>

            {/* Dropdown Menu of Activities */}
            {isActivityDropdownOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-surface border border-border rounded-2xl shadow-2xl p-2 z-50 space-y-1">
                <div className="px-3 py-2 text-[10px] font-bold text-text-muted uppercase tracking-wider border-b border-border">
                  Selecione para Corrigir
                </div>
                <div className="max-h-60 overflow-y-auto space-y-1">
                  {allActivities.length === 0 ? (
                    <div className="p-3 text-xs text-text-muted">Nenhuma outra atividade.</div>
                  ) : (
                    allActivities.map((act: any) => (
                      <button
                        key={act.id}
                        onClick={() => {
                          if (onSelectActivity) onSelectActivity(act);
                          setIsActivityDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2.5 rounded-xl text-xs transition-all flex items-center justify-between cursor-pointer ${
                          act.id === activity.id
                            ? 'bg-primary/20 text-primary font-bold'
                            : 'text-foreground hover:bg-surface-hover'
                        }`}
                      >
                        <span className="truncate">{act.title}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-surface-hover text-text-muted">
                          {act.turma}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Toast Alert for Deliveries Refresh */}
      {refreshToast && (
        <div className="p-4 bg-primary/20 border border-primary/40 text-primary rounded-2xl text-xs font-bold flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4" />
          <span>Entregas sincronizadas e atualizadas com sucesso!</span>
        </div>
      )}

      {/* Activity Title & General Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-2">
        <div>
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="text-xs font-bold bg-primary/20 text-primary px-3 py-1 rounded-full border border-primary/30 uppercase">
              {activity.turma || 'Todas as Turmas'}
            </span>
            <span className="text-xs font-bold bg-[#171f33] text-[#c0c1ff] px-3 py-1 rounded-full border border-border uppercase">
              {activity.type}
            </span>
            {activity.deadline && (
              <span className="text-xs font-bold bg-amber-100 text-amber-600 px-3 py-1 rounded-full border border-amber-500/30 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Prazo: {activity.deadline}
              </span>
            )}
          </div>

          <h1 className="text-2xl md:text-3xl font-extrabold text-foreground tracking-tight">
            {activity.title}
          </h1>
          <p className="text-xs md:text-sm text-text-muted mt-1 font-medium max-w-3xl">
            {activity.description}
          </p>

          {/* Display essay question keywords if defined */}
          {activity.questions?.some((q: any) => q.type === 'essay' && q.keywords) && (
            <div className="mt-3 inline-flex items-center gap-2 bg-primary/10 border border-primary/30 px-3 py-1.5 rounded-xl text-xs text-primary-hover">
              <span className="font-bold">Palavras-Chave Exigidas:</span>
              <span>
                {activity.questions
                  .filter((q: any) => q.type === 'essay' && q.keywords)
                  .map((q: any) => q.keywords)
                  .join(', ')}
              </span>
            </div>
          )}
        </div>

        {/* Counter Badge */}
        <div className="glass-panel p-3.5 sm:px-6 sm:py-3.5 rounded-3xl border border-border grid grid-cols-2 sm:grid-cols-4 lg:flex lg:items-center gap-3 sm:gap-4 lg:gap-6 w-full lg:w-auto shrink-0">
          <div className="text-center">
            <span className="text-lg sm:text-xl font-extrabold text-primary flex items-center justify-center min-h-[28px]">
              {isLoading || isRefreshing ? (
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              ) : (
                gradedQueue.length
              )}
            </span>
            <span className="block text-[10px] font-bold text-text-muted tracking-wider uppercase">
              Já Corrigidas
            </span>
          </div>
          <div className="hidden lg:block w-px h-8 bg-surface-hover"></div>
          <div className="text-center">
            <span className="text-lg sm:text-xl font-extrabold text-amber-400 flex items-center justify-center min-h-[28px]">
              {isLoading || isRefreshing ? (
                <Loader2 className="w-5 h-5 animate-spin text-amber-400" />
              ) : (
                pendingQueue.length
              )}
            </span>
            <span className="block text-[10px] font-bold text-text-muted tracking-wider uppercase">
              Na Fila
            </span>
          </div>
          <div className="hidden lg:block w-px h-8 bg-surface-hover"></div>
          <div className="text-center">
            <span className="text-lg sm:text-xl font-extrabold text-sky-400 flex items-center justify-center min-h-[28px]">
              {isLoading || isRefreshing ? (
                <Loader2 className="w-5 h-5 animate-spin text-sky-400" />
              ) : (
                returnedQueue.length
              )}
            </span>
            <span className="block text-[10px] font-bold text-text-muted tracking-wider uppercase">
              Devolvidas
            </span>
          </div>
          <div className="hidden lg:block w-px h-8 bg-surface-hover"></div>
          <div className="text-center">
            <span className="text-lg sm:text-xl font-extrabold text-rose-400 flex items-center justify-center min-h-[28px]">
              {isLoading || isRefreshing ? (
                <Loader2 className="w-5 h-5 animate-spin text-rose-400" />
              ) : (
                missingStudents.length
              )}
            </span>
            <span className="block text-[10px] font-bold text-text-muted tracking-wider uppercase">
              Não Fizeram
            </span>
          </div>
        </div>
      </div>

      {/* Barra de Controle da Visão Total (Atividades Filhas: PNE e Recuperações Paralelas) */}
      {hasLinkedChildren && (
        <div className="bg-surface/80 p-4 rounded-3xl border border-border shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-black text-foreground">
                  Visão Unificada do Ciclo Pedagógico
                </span>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30">
                  {childAdaptations.length + childRecoveries.length} filhas vinculadas
                </span>
              </div>
              <p className="text-[11px] text-text-muted">
                {includeChildActivities
                  ? 'Mostrando em conjunto a atividade principal e todas as entregas das adaptações PNE e recuperações.'
                  : 'Modo isolado ativo: exibindo estritamente as entregas desta atividade específica.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto sm:self-center shrink-0">
            <button
              onClick={() => setIncludeChildActivities(!includeChildActivities)}
              className={`w-full sm:w-auto justify-center px-4 py-2 min-h-[44px] min-w-[44px] rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 border ${
                includeChildActivities
                  ? 'bg-primary text-white border-primary shadow-sm'
                  : 'bg-background text-text-muted hover:text-foreground border-border'
              }`}
            >
              <GitFork className="w-3.5 h-3.5" />
              <span>{includeChildActivities ? 'Visão Total Ativa' : 'Ativar Visão Total'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Turma Filter Bar (Exibido quando a atividade possui mais de uma turma associada ou em visão unificada) */}
      {(hasMultipleTurmas || (includeChildActivities && hasLinkedChildren)) && (
        <div className="flex flex-wrap items-center gap-2 p-3 sm:p-3.5 bg-surface rounded-2xl border border-border">
          <div className="w-full sm:w-auto flex items-center gap-1.5 text-xs font-bold text-text-muted mr-1">
            <Filter className="w-3.5 h-3.5 text-primary shrink-0" />
            <span>Filtrar por Turma:</span>
          </div>
          <button
            onClick={() => setSelectedTurmaFilter('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer min-h-[36px] ${
              selectedTurmaFilter === 'all'
                ? 'bg-primary text-white shadow-sm font-extrabold'
                : 'bg-[#171f33] text-text-muted hover:text-foreground hover:bg-surface-hover border border-border'
            }`}
          >
            Todas as Turmas ({effectiveSubmissions.length})
          </button>
          {activityTurmas.map((turmaCode: any) => {
            const countInTurma = effectiveSubmissions.filter((s: any) => {
              const stTurma = getSubmissionTurma(s);
              return stTurma ? canStudentAccessActivity(turmaCode, stTurma) : true;
            }).length;
            return (
              <button
                key={turmaCode}
                onClick={() => setSelectedTurmaFilter(turmaCode)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer min-h-[36px] ${
                  selectedTurmaFilter === turmaCode
                    ? 'bg-primary text-white shadow-sm font-extrabold'
                    : 'bg-[#171f33] text-text-muted hover:text-foreground hover:bg-surface-hover border border-border'
                }`}
              >
                Turma {turmaCode} ({countInTurma})
              </button>
            );
          })}
        </div>
      )}

      {/* Correction Sub-Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 border-b border-border pb-2">
        <button
          onClick={() => setActiveTab('fila')}
          className={`px-2.5 sm:px-4 py-2.5 sm:py-3 rounded-2xl text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer min-h-[44px] ${
            activeTab === 'fila'
              ? 'bg-primary text-white shadow-md'
              : 'bg-surface text-text-muted hover:text-foreground hover:bg-[#1c263f]'
          }`}
        >
          <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
          <span>Fila ({pendingQueue.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('corrigidas')}
          className={`px-2.5 sm:px-4 py-2.5 sm:py-3 rounded-2xl text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer min-h-[44px] ${
            activeTab === 'corrigidas'
              ? 'bg-primary text-white shadow-md'
              : 'bg-surface text-text-muted hover:text-foreground hover:bg-[#1c263f]'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
          <span>Corrigidas ({gradedQueue.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('devolvidas')}
          className={`px-2.5 sm:px-4 py-2.5 sm:py-3 rounded-2xl text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer min-h-[44px] ${
            activeTab === 'devolvidas'
              ? 'bg-sky-500 text-foreground shadow-md'
              : 'bg-surface text-text-muted hover:text-foreground hover:bg-[#1c263f]'
          }`}
        >
          <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
          <span>Devolvidas ({returnedQueue.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('nao_fizeram')}
          className={`px-2.5 sm:px-4 py-2.5 sm:py-3 rounded-2xl text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer min-h-[44px] ${
            activeTab === 'nao_fizeram'
              ? 'bg-rose-500 text-white shadow-md'
              : 'bg-surface text-text-muted hover:text-foreground hover:bg-[#1c263f]'
          }`}
        >
          <UserX className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
          <span>Pendentes ({missingStudents.length})</span>
        </button>
      </div>

      {/* Global Error Banner */}
      {aiErrorMessage && (
        <div className="p-4 bg-rose-100 border border-rose-200 text-rose-600 rounded-2xl text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{aiErrorMessage}</span>
          </div>
          <button
            onClick={() => setAiErrorMessage(null)}
            className="text-foreground hover:underline text-[10px] uppercase font-bold cursor-pointer"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Visualização das Entregas e Fila de Correção */}
      {isLoading || isRefreshing ? (
        <GradingLoadingSkeleton
          title={isRefreshing ? 'Atualizando entregas...' : 'Carregando entregas para correção...'}
          subtitle="Sincronizando respostas dos alunos e notas com o banco de dados..."
        />
      ) : hasError || refreshError ? (
        <StandardErrorState
          title="Não conseguimos carregar as entregas para correção agora."
          message="Verifique sua conexão com a internet e tente novamente."
          onRetry={() => {
            setRefreshError(false);
            if (refreshError) {
              handleRefreshDeliveries();
            } else if (onRetry) {
              onRetry();
            }
          }}
          retryLabel="Tentar novamente"
        />
      ) : (
        <>
          {/* TAB 1: FILA DE CORREÇÃO */}
          {activeTab === 'fila' && (
            <>
              {pendingQueue.length === 0 ? (
                <div className="glass-panel p-12 text-center rounded-3xl border border-border text-text-muted space-y-2">
                  <CheckCircle2 className="w-10 h-10 text-primary mx-auto opacity-80" />
                  <p className="text-sm font-bold text-foreground">Nenhuma entrega pendente na fila!</p>
                  <p className="text-xs">Todas as respostas enviadas para esta atividade já foram corrigidas.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {pendingQueue.map((sub: any) => renderSubmissionCard(sub))}
                </div>
              )}
            </>
          )}

          {/* TAB 2: JÁ CORRIGIDAS */}
          {activeTab === 'corrigidas' && (
            <>
              {gradedQueue.length === 0 ? (
                <div className="glass-panel p-12 text-center rounded-3xl border border-border text-text-muted space-y-2">
                  <Clock className="w-10 h-10 text-amber-400 mx-auto opacity-80" />
                  <p className="text-sm font-bold text-foreground">Nenhuma atividade corrigida ainda.</p>
                  <p className="text-xs">As atividades avaliadas e finalizadas aparecerão nesta aba.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {gradedQueue.map((sub: any) => renderSubmissionCard(sub))}
                </div>
              )}
            </>
          )}

          {/* TAB 3: DEVOLVIDAS PARA REFAZER */}
          {activeTab === 'devolvidas' && (
            <>
              {returnedQueue.length === 0 ? (
                <div className="glass-panel p-12 text-center rounded-3xl border border-border text-text-muted space-y-2">
                  <RotateCcw className="w-10 h-10 text-sky-400 mx-auto opacity-80" />
                  <p className="text-sm font-bold text-foreground">Nenhuma atividade devolvida no momento.</p>
                  <p className="text-xs">Quando você clicar em &ldquo;Devolver para Refazer&rdquo;, a atividade aparecerá aqui e o aluno poderá enviar uma nova resposta no portal.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {returnedQueue.map((sub: any) => renderSubmissionCard(sub))}
                </div>
              )}
            </>
          )}

          {/* TAB 3: NÃO FIZERAM */}
          {activeTab === 'nao_fizeram' && (
            <div className="space-y-4">
              {missingStudents.length === 0 ? (
                <div className="glass-panel p-12 text-center rounded-3xl border border-border text-text-muted">
                  🎉 Todos os alunos da turma enviaram a atividade!
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {missingStudents.map((st: any) => (
                    <div
                      key={st.id}
                      className="glass-panel p-4 sm:p-5 rounded-3xl border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={st.avatarUrl}
                          alt={st.fullName}
                          loading="lazy"
                          decoding="async"
                          className="w-10 h-10 sm:w-11 sm:h-11 rounded-full object-cover border-2 border-rose-500/30 shrink-0"
                        />
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-foreground truncate">{st.fullName}</h4>
                          <p className="text-[10px] text-text-muted truncate">
                            Turma: {st.turma} • Matrícula: {st.matricula}
                          </p>
                          {st.tag && (
                            <span className="inline-block mt-1 text-[9px] font-bold px-2 py-0.5 rounded-md bg-rose-100 text-rose-600 border border-rose-500/30">
                              {st.tag}
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => alert(`Lembrete enviado para o aluno ${st.fullName}!`)}
                        className="w-full sm:w-auto px-3 py-2 min-h-[44px] bg-[#171f33] hover:bg-surface-hover text-rose-600 rounded-xl text-xs font-bold border border-rose-500/30 transition-all cursor-pointer flex items-center justify-center shrink-0"
                      >
                        Enviar Lembrete
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Modal Popup de Consolidação de Notas de Recuperação Paralela */}
      <GradeConsolidationModal
        isOpen={Boolean(consolidationModalData)}
        onClose={() => setConsolidationModalData(null)}
        data={consolidationModalData?.data || null}
        studentName={consolidationModalData?.studentName}
        matricula={consolidationModalData?.matricula}
        turma={consolidationModalData?.turma}
      />

    </>
  );
};
