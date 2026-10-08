'use client';

import React from 'react';
import {
  X,
  Award,
  CheckCircle2,
  TrendingUp,
  RotateCcw,
  Sparkles,
  BookOpen,
  ArrowRight,
  HelpCircle,
  FileCheck,
} from 'lucide-react';

export interface GradeConsolidationModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: {
    isRecoveryView: boolean;
    isParentView: boolean;
    parentGrade: number | null;
    parentTitle: string;
    recoveryGrade: number | null;
    recoveryTitle: string;
    recalculatedFinalGrade: number | null;
    gradeEvolution: number | null;
  } | null;
  studentName?: string;
  matricula?: string;
  turma?: string;
}

export const GradeConsolidationModal: React.FC<GradeConsolidationModalProps> = ({
  isOpen,
  onClose,
  data,
  studentName = 'Aluno',
  matricula,
  turma,
}) => {
  if (!isOpen || !data) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-surface border border-border rounded-2xl sm:rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col my-auto max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-6 border-b border-border flex items-start justify-between gap-3 sm:gap-4 bg-surface-hover/50">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 bg-primary/20 text-primary rounded-2xl border border-primary/30 shrink-0">
              <Award className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base sm:text-lg font-bold text-foreground truncate">
                Consolidação de Notas: Recuperação
              </h3>
              <p className="text-xs text-muted mt-0.5 truncate">
                {studentName} {turma ? `• Turma ${turma}` : ''} {matricula ? `• Matrícula: ${matricula}` : ''}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-muted hover:text-foreground hover:bg-surface-hover rounded-full transition-colors cursor-pointer shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center"
            title="Fechar"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 overflow-y-auto custom-scrollbar">
          {/* Vínculo Pedagógico Banner */}
          <div className="p-4 rounded-2xl bg-surface-hover border border-border space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-foreground">
              <RotateCcw className="w-4 h-4 text-primary" />
              <span>Vínculo de Recuperação Paralela</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
              <div className="p-2.5 rounded-xl bg-background border border-border">
                <span className="text-[10px] text-muted block uppercase font-bold tracking-wider">
                  Avaliação Raiz (Mãe)
                </span>
                <p className="font-semibold text-foreground truncate mt-0.5" title={data.parentTitle}>
                  {data.parentTitle || 'Avaliação Original'}
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-background border border-border">
                <span className="text-[10px] text-primary block uppercase font-bold tracking-wider">
                  Recuperação Paralela
                </span>
                <p className="font-semibold text-primary truncate mt-0.5" title={data.recoveryTitle}>
                  {data.recoveryTitle || 'Recuperação Paralela'}
                </p>
              </div>
            </div>
          </div>

          {/* Comparativo de Notas em Cards Lado a Lado */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {/* 1. Nota Original */}
            <div className="p-3.5 rounded-2xl bg-surface-hover border border-border text-center">
              <span className="text-[10px] text-muted uppercase font-bold tracking-wider block">
                Nota Original
              </span>
              <div className="mt-1 flex items-baseline justify-center gap-1">
                <span className="text-2xl font-black text-foreground">
                  {data.parentGrade !== null ? data.parentGrade.toFixed(1) : 'Sem entrega'}
                </span>
                {data.parentGrade !== null && <span className="text-xs text-muted">/ 10</span>}
              </div>
              {data.parentGrade !== null && data.parentGrade < 6.0 && (
                <span className="text-[10px] font-bold text-rose-400 mt-1 block">Abaixo de 6.0</span>
              )}
            </div>

            {/* 2. Recuperação */}
            <div className="p-3.5 rounded-2xl bg-primary/10 border border-primary/30 text-center">
              <span className="text-[10px] text-primary uppercase font-bold tracking-wider block">
                Recuperação
              </span>
              <div className="mt-1 flex items-baseline justify-center gap-1">
                <span className="text-2xl font-black text-primary">
                  {data.recoveryGrade !== null ? data.recoveryGrade.toFixed(1) : '-'}
                </span>
                <span className="text-xs text-muted">/ 10</span>
              </div>
              {data.recoveryGrade !== null && data.recoveryGrade >= 6.0 && (
                <span className="text-[10px] font-bold text-emerald-400 mt-1 block">Meta atingida</span>
              )}
            </div>

            {/* 3. Evolução */}
            <div className="col-span-2 sm:col-span-1 p-3.5 rounded-2xl bg-surface-hover border border-border text-center flex flex-col justify-center">
              <span className="text-[10px] text-muted uppercase font-bold tracking-wider block">
                Evolução
              </span>
              <div className="mt-1 flex items-center justify-center gap-1">
                {data.gradeEvolution !== null ? (
                  data.gradeEvolution > 0 ? (
                    <>
                      <TrendingUp className="w-4 h-4 text-emerald-400" />
                      <span className="text-lg font-black text-emerald-400">
                        +{data.gradeEvolution.toFixed(1)}
                      </span>
                    </>
                  ) : data.gradeEvolution === 0 ? (
                    <span className="text-sm font-bold text-muted">Manteve nota</span>
                  ) : (
                    <span className="text-base font-bold text-muted">
                      {data.gradeEvolution.toFixed(1)} pts
                    </span>
                  )
                ) : (
                  <span className="text-xs font-bold text-emerald-400">1ª Avaliação</span>
                )}
              </div>
            </div>
          </div>

          {/* Destaque da Nota Final Consolidada */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/15 via-emerald-500/10 to-transparent border border-emerald-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                Nota Final Consolidada (Maior Nota)
              </span>
              <p className="text-xs text-muted mt-0.5">
                O sistema adota a maior nota atingida entre a avaliação original e a recuperação para fins de RCO.
              </p>
            </div>
            <div className="text-left sm:text-right shrink-0 sm:pl-3">
              <span className="text-2xl sm:text-3xl font-black text-emerald-400">
                {data.recalculatedFinalGrade !== null ? data.recalculatedFinalGrade.toFixed(1) : '-'}
              </span>
              <span className="text-xs text-muted inline sm:block ml-1 sm:ml-0">/ 10.0</span>
            </div>
          </div>

          {/* Regra Pedagógica Oficial */}
          <div className="p-3.5 rounded-xl bg-background border border-border text-[11px] text-muted space-y-1">
            <span className="font-bold text-foreground flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
              Diretriz de Recuperação Paralela
            </span>
            <p>
              A realização da recuperação paralela visa a garantia do direito à aprendizagem. O sistema
              registra a evolução diagnóstica e preserva a melhor pontuação para a composição do boletim bimestral e RCO.
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-border bg-surface-hover/30 flex items-center justify-end">
          <button
            onClick={onClose}
            className="w-full sm:w-auto justify-center min-h-[44px] min-w-[44px] px-5 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-full text-xs font-bold transition-all shadow-md cursor-pointer flex items-center"
          >
            Entendido e Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
