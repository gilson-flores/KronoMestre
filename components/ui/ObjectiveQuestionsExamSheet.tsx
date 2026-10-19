'use client';

import React from 'react';
import { MultipleChoiceQuestion } from '@/lib/types';
import {
  HelpCircle,
  CheckCircle2,
  AlertCircle,
  CopyX,
  FileCheck,
  Sparkles,
} from 'lucide-react';

interface ObjectiveQuestionsExamSheetProps {
  questions: MultipleChoiceQuestion[];
  selectedAnswers: { [questionId: string]: number };
  onSelectAnswer: (questionId: string, optionIndex: number) => void;
  maxObjectiveGrade: number;
  securityBlockCopy?: boolean;
  onSecurityAlert?: (msg: string) => void;
  isReadOnly?: boolean;
}

export const ObjectiveQuestionsExamSheet: React.FC<ObjectiveQuestionsExamSheetProps> = ({
  questions,
  selectedAnswers,
  onSelectAnswer,
  maxObjectiveGrade,
  securityBlockCopy = false,
  onSecurityAlert,
  isReadOnly = false,
}) => {
  if (!questions || questions.length === 0) return null;

  const totalQuestions = questions.length;
  const answeredCount = Object.keys(selectedAnswers || {}).length;
  const isAllAnswered = answeredCount === totalQuestions;
  const pointsPerQuestion = totalQuestions > 0 ? maxObjectiveGrade / totalQuestions : 0;

  const letters = ['A', 'B', 'C', 'D', 'E'];

  const scrollToQuestion = (index: number) => {
    const el = document.getElementById(`exam-question-${index}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  return (
    <div className="space-y-6">
      {/* ========================================================================= */}
      {/* CARTÃO-RESPOSTA OFICIAL DE CONFERÊNCIA RÁPIDA (ESTILO ENEM / VESTIBULAR) */}
      {/* ========================================================================= */}
      <div className="rounded-2xl border-2 border-border/90 bg-[#0f172a] p-4 sm:p-5 shadow-xl select-none text-foreground space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/80">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary/20 flex items-center justify-center text-primary font-black text-sm">
              <FileCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-foreground">
                Cartão-Resposta Oficial • Múltipla Escolha
              </h3>
              <p className="text-[11px] text-muted">
                Confira o preenchimento das suas alternativas antes da entrega final.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <span
              className={`text-[11px] sm:text-xs font-black px-3 py-1 rounded-full border flex items-center gap-1.5 ${
                isAllAnswered
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
                  : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
              }`}
            >
              {isAllAnswered ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Gabarito Completo ({answeredCount}/{totalQuestions})</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                  <span>
                    {answeredCount} de {totalQuestions} preenchidas (Faltam {totalQuestions - answeredCount})
                  </span>
                </>
              )}
            </span>
          </div>
        </div>

        {/* GRADE DO GABARITO (CLICÁVEL PARA NAVEGAÇÃO IMEDIATA) */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {questions.map((q, idx) => {
            const answerIndex = selectedAnswers[q.id];
            const hasAnswered = answerIndex !== undefined;
            const letter = hasAnswered ? letters[answerIndex] : null;

            return (
              <button
                key={q.id || idx}
                type="button"
                onClick={() => scrollToQuestion(idx)}
                className={`min-h-[44px] min-w-[54px] px-3 py-2 rounded-xl text-xs font-mono font-bold flex items-center justify-between gap-2 border transition-all cursor-pointer active:scale-95 shadow-sm ${
                  hasAnswered
                    ? 'bg-[#18233c] border-primary/50 text-foreground shadow-primary/10'
                    : 'bg-[#0b101d] border-amber-500/40 text-amber-400 hover:border-amber-400'
                }`}
                title={`Ir para Questão ${idx + 1}`}
              >
                <span className="text-[10px] text-muted font-sans font-medium">Q{idx + 1}</span>
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-xs ${
                    hasAnswered
                      ? 'bg-primary text-white shadow-md'
                      : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                  }`}
                >
                  {letter || '—'}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* CADERNO DE QUESTÕES (ESTILO PROVA ESCOLAR IMPRESSA)                       */}
      {/* ========================================================================= */}
      <div className="space-y-5">
        {questions.map((q, qIndex) => {
          const currentChoice = selectedAnswers[q.id];

          return (
            <div
              id={`exam-question-${qIndex}`}
              key={q.id || qIndex}
              className="rounded-3xl border-2 border-border/80 bg-[#0e1424] shadow-xl overflow-hidden transition-all duration-200"
            >
              {/* TOPO DA QUESTÃO: TARJA DE PROVA IMPRESSA */}
              <div className="bg-[#141b2f] px-4 sm:px-6 py-3 border-b border-border/80 flex flex-wrap items-center justify-between gap-2 select-none">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-lg bg-primary/20 text-primary border border-primary/40 font-mono font-black text-xs flex items-center justify-center">
                    {String(qIndex + 1).padStart(2, '0')}
                  </span>
                  <span className="font-black text-xs sm:text-sm uppercase tracking-wider text-foreground">
                    Questão {String(qIndex + 1).padStart(2, '0')}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-xs font-bold">
                  <span className="text-[11px] text-muted">
                    Valor: <strong className="text-foreground">{pointsPerQuestion.toFixed(1)} pts</strong>
                  </span>

                  {currentChoice !== undefined ? (
                    <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      <span>Alternativa {letters[currentChoice]}</span>
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      Não Respondida
                    </span>
                  )}
                </div>
              </div>

              {/* ENUNCIADO DA QUESTÃO COM SUPORTE A BLOQUEIO DE CÓPIA ANTI-COLA */}
              <div
                className={`p-4 sm:p-6 space-y-4 ${securityBlockCopy ? 'select-none' : ''}`}
                onCopy={(e) => {
                  if (securityBlockCopy) {
                    e.preventDefault();
                    if (onSecurityAlert) onSecurityAlert('❌ Cópia de enunciados de prova bloqueada pelo sistema.');
                  }
                }}
              >
                <div className="text-xs sm:text-sm text-foreground leading-relaxed break-words font-medium pl-1 sm:pl-2 border-l-2 border-primary/50">
                  {q.statement}
                </div>

                {/* OPÇÕES COM BOLHAS DE CARTÃO-RESPOSTA ESTILO CANETA ESFEROGRÁFICA */}
                <div className="space-y-2.5 pt-2">
                  {q.options.map((optText, optIdx) => {
                    const isSelected = currentChoice === optIdx;
                    const letter = letters[optIdx] || String.fromCharCode(65 + optIdx);

                    return (
                      <button
                        key={optIdx}
                        type="button"
                        disabled={isReadOnly}
                        onClick={() => onSelectAnswer(q.id, optIdx)}
                        className={`w-full text-left p-3.5 sm:p-4 rounded-2xl text-xs sm:text-sm transition-all flex items-start gap-3 sm:gap-4 border-2 cursor-pointer active:scale-[0.99] select-none ${
                          isSelected
                            ? 'bg-[#152340] border-primary text-white font-semibold shadow-lg shadow-primary/10'
                            : 'bg-[#101728] border-border/70 text-slate-300 hover:border-slate-500 hover:bg-[#141d33] hover:text-white'
                        }`}
                      >
                        {/* BOLHA DO GABARITO (ESTILO CANETA AZUL/PRETA PREENCHIDA) */}
                        <div
                          className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shrink-0 font-mono font-black text-xs sm:text-sm border-2 transition-all mt-0.5 ${
                            isSelected
                              ? 'bg-primary border-primary text-white ring-4 ring-primary/20 shadow-inner'
                              : 'border-slate-500/60 bg-[#090d18] text-slate-400'
                          }`}
                        >
                          {letter}
                        </div>

                        {/* TEXTO DA ALTERNATIVA */}
                        <div className="flex-1 min-w-0 leading-relaxed pt-0.5">
                          <span className="break-words">{optText}</span>
                        </div>

                        {/* ÍCONE DE CONFIRMAÇÃO SELECIONADA */}
                        {isSelected && (
                          <div className="shrink-0 self-center hidden sm:flex items-center gap-1 text-[11px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/30">
                            <span>Marcada</span>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
