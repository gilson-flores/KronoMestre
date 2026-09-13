'use client';

import React from 'react';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';

interface LoadingSpinnerProps {
  title?: string;
  subtitle?: string;
  className?: string;
}

/**
 * Componente padrão de Spinner com texto explicativo
 * Reutiliza o padrão visual oficial com Loader2 e paleta primária do sistema
 */
export const StandardLoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  title = 'Carregando dados...',
  subtitle,
  className = '',
}) => {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`py-12 px-4 text-center flex flex-col items-center justify-center space-y-3 ${className}`}
    >
      <Loader2 className="w-9 h-9 animate-spin text-primary shrink-0" />
      <div className="space-y-1">
        <p className="text-sm font-bold text-foreground">{title}</p>
        {subtitle && <p className="text-xs text-text-muted max-w-md mx-auto">{subtitle}</p>}
      </div>
      <span className="sr-only">{title}</span>
    </div>
  );
};

/**
 * Skeleton padronizado para o Dashboard Central do Professor
 * Mantém a estrutura visual dos 6 cards operacionais e da fila operacional
 * evitando saltos de layout e contadores zerados durante a requisição de rede
 */
export const DashboardLoadingSkeleton: React.FC<{ title?: string; subtitle?: string }> = ({
  title = 'Carregando fila operacional...',
  subtitle = 'Sincronizando pendências, contadores e entregas com o banco de dados...',
}) => {
  return (
    <div className="space-y-8 animate-fadeIn max-w-6xl w-full mx-auto" role="status" aria-live="polite">
      {/* Banner de Sincronização em Andamento */}
      <div className="glass-panel p-4 sm:p-5 rounded-3xl border border-primary/20 bg-primary/5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary/15 flex items-center justify-center text-primary shrink-0">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">{title}</h3>
            <p className="text-xs text-text-muted">{subtitle}</p>
          </div>
        </div>
        <span className="text-[11px] font-mono text-primary font-bold px-3 py-1 rounded-full bg-primary/10 border border-primary/20 hidden sm:inline-block">
          Sincronizando...
        </span>
      </div>

      {/* Grid com Skeletons dos 6 Cards de Pendências */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-6 w-32 bg-surface-hover rounded-lg animate-pulse" />
          <div className="h-5 w-24 bg-surface-hover rounded-full animate-pulse" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((idx) => (
            <div
              key={idx}
              className="p-5 rounded-2xl border border-border bg-surface flex flex-col justify-between shadow-sm animate-pulse space-y-4 min-h-[190px]"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-surface-hover" />
                  <div className="w-16 h-5 rounded-lg bg-surface-hover" />
                </div>
                <div className="w-16 h-8 rounded-lg bg-surface-hover mb-2" />
                <div className="w-36 h-4 rounded bg-surface-hover mb-1.5" />
                <div className="w-48 h-3 rounded bg-surface-hover/70" />
              </div>
              <div className="w-full h-11 rounded-xl bg-surface-hover mt-3" />
            </div>
          ))}
        </div>
      </section>

      {/* Skeleton da Fila Operacional Unificada */}
      <section className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <div className="h-6 w-48 bg-surface-hover rounded-lg animate-pulse" />
          <div className="h-8 w-40 bg-surface-hover rounded-xl animate-pulse" />
        </div>

        <div className="space-y-3">
          {[1, 2, 3].map((row) => (
            <div
              key={row}
              className="p-4 sm:p-5 rounded-2xl border border-border bg-surface flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-pulse"
            >
              <div className="flex items-center gap-3.5 w-full sm:w-auto">
                <div className="w-11 h-11 rounded-2xl bg-surface-hover shrink-0" />
                <div className="space-y-2 flex-1">
                  <div className="w-48 sm:w-64 h-4 bg-surface-hover rounded" />
                  <div className="w-32 h-3 bg-surface-hover/70 rounded" />
                </div>
              </div>
              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                <div className="w-20 h-7 rounded-full bg-surface-hover" />
                <div className="w-28 h-9 rounded-xl bg-surface-hover" />
              </div>
            </div>
          ))}
        </div>
      </section>
      <span className="sr-only">Carregando painel e contadores pedagógicos...</span>
    </div>
  );
};

/**
 * Skeleton padronizado para a tela de Correção (GradingView / CorrectionsView)
 * Mantém os contadores superiores e a grade de entregas dos alunos
 * evitando exibição temporária de "Nenhuma entrega" enquanto os dados reais estão carregando
 */
export const GradingLoadingSkeleton: React.FC<{ title?: string; subtitle?: string }> = ({
  title = 'Carregando entregas para correção...',
  subtitle = 'Recuperando respostas dos alunos e notas lançadas no banco de dados...',
}) => {
  return (
    <div className="space-y-6 animate-fadeIn w-full" role="status" aria-live="polite">
      {/* Banner de Sincronização */}
      <div className="glass-panel p-4 sm:p-5 rounded-3xl border border-primary/20 bg-primary/5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary/15 flex items-center justify-center text-primary shrink-0">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">{title}</h3>
            <p className="text-xs text-text-muted">{subtitle}</p>
          </div>
        </div>
        <span className="text-[11px] font-mono text-primary font-bold px-3 py-1 rounded-full bg-primary/10 border border-primary/20 hidden sm:inline-block">
          Sincronizando entregas...
        </span>
      </div>

      {/* Skeletons dos Contadores do GradingView */}
      <div className="glass-panel p-4 sm:p-5 rounded-3xl border border-border flex items-center justify-around gap-4 animate-pulse">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="text-center space-y-1.5 flex-1">
            <div className="w-10 h-6 bg-surface-hover rounded mx-auto" />
            <div className="w-16 h-3 bg-surface-hover/70 rounded mx-auto" />
          </div>
        ))}
      </div>

      {/* Skeletons das Submissões dos Alunos (Grid 2 colunas como o GradingView real) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2, 3, 4].map((card) => (
          <div
            key={card}
            className="glass-panel p-6 rounded-3xl border border-border space-y-4 animate-pulse bg-surface/60"
          >
            {/* Cabeçalho do Card de Submissão: Avatar + Nome + Turma */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-surface-hover shrink-0" />
                <div className="space-y-1.5">
                  <div className="w-36 h-4 bg-surface-hover rounded" />
                  <div className="w-20 h-3 bg-surface-hover/70 rounded" />
                </div>
              </div>
              <div className="w-20 h-6 rounded-full bg-surface-hover" />
            </div>

            {/* Resposta do Aluno (Placeholder de Texto) */}
            <div className="p-4 rounded-2xl bg-surface-hover/40 border border-border/40 space-y-2">
              <div className="w-24 h-3 bg-surface-hover rounded" />
              <div className="w-full h-3 bg-surface-hover/60 rounded" />
              <div className="w-5/6 h-3 bg-surface-hover/60 rounded" />
            </div>

            {/* Ações de Nota e Feedback */}
            <div className="flex items-center gap-3 pt-2">
              <div className="w-28 h-10 rounded-xl bg-surface-hover" />
              <div className="flex-1 h-10 rounded-xl bg-surface-hover" />
            </div>
          </div>
        ))}
      </div>
      <span className="sr-only">Carregando lista de entregas para correção...</span>
    </div>
  );
};

interface StandardErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

/**
 * Componente padronizado para exibição de erros amigáveis sem jargão técnico.
 * Reutiliza o mesmo DNA visual (glass-panel, bordas suaves, tipografia do sistema).
 * Nunca expõe stack traces, nomes de tabelas ou códigos HTTP diretamente na tela.
 */
export const StandardErrorState: React.FC<StandardErrorStateProps> = ({
  title = 'Não foi possível carregar os dados agora.',
  message = 'Verifique sua conexão com a internet e tente novamente.',
  onRetry,
  retryLabel = 'Tentar novamente',
  className = '',
}) => {
  return (
    <div
      role="alert"
      aria-live="polite"
      className={`glass-panel p-6 sm:p-8 rounded-3xl border border-border bg-surface text-center flex flex-col items-center justify-center space-y-4 max-w-2xl mx-auto my-6 shadow-sm animate-fadeIn ${className}`}
    >
      <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-500 shrink-0">
        <AlertCircle className="w-7 h-7" />
      </div>

      <div className="space-y-1.5 max-w-md mx-auto">
        <h3 className="text-base sm:text-lg font-bold text-foreground tracking-tight">
          {title}
        </h3>
        <p className="text-xs sm:text-sm text-text-muted leading-relaxed">
          {message}
        </p>
      </div>

      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-2 min-h-[44px] min-w-[44px] py-2.5 px-5 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl text-xs sm:text-sm transition-all cursor-pointer flex items-center gap-2 shadow-md active:scale-95"
        >
          <RefreshCw className="w-4 h-4 stroke-[2.5]" />
          <span>{retryLabel}</span>
        </button>
      )}
    </div>
  );
};
