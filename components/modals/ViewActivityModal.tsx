'use client';

import React from 'react';
import {
  X,
  BookOpen,
  FileText,
  FileQuestion,
  Users2,
  Clock,
  Award,
  Users,
  CheckCircle2,
  Check,
  Edit,
  CheckCheck,
  AlignLeft,
  Sparkles,
  Key
} from 'lucide-react';
import { Activity, MultipleChoiceQuestion, EssayQuestion } from '@/lib/types';

interface ViewActivityModalProps {
  isOpen: boolean;
  activity: Activity | null;
  onClose: () => void;
  onEditActivity?: (act: Activity) => void;
  onGoToGrading?: (act: Activity) => void;
}

export const ViewActivityModal: React.FC<ViewActivityModalProps> = ({
  isOpen,
  activity,
  onClose,
  onEditActivity,
  onGoToGrading,
}) => {
  if (!isOpen || !activity) return null;

  let Icon = FileText;
  if (activity.type === 'Simulado') Icon = FileQuestion;
  if (activity.type === 'Dinâmica') Icon = Users2;

  const questions = activity.questions || [];
  const optionLabels = ['A', 'B', 'C', 'D'];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-fadeIn">
      <div className="bg-[#0e172a] border border-white/15 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        {/* Header */}
        <div className="p-5 sm:p-6 bg-[#131d35] border-b border-white/10 flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#1d273d] border border-white/10 text-[#4ade80] flex items-center justify-center shrink-0 mt-0.5 shadow-md">
              <Icon className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="text-[11px] font-extrabold uppercase tracking-wider bg-[#4ade80]/15 text-[#4ade80] px-3 py-0.5 rounded-full border border-[#4ade80]/30">
                  {activity.type}
                </span>
                <span
                  className={`text-[11px] font-bold px-3 py-0.5 rounded-full ${
                    activity.status === 'Ativo'
                      ? 'bg-[#4ade80]/20 text-[#4ade80] border border-[#4ade80]/30'
                      : activity.status === 'Prazo Encerrado'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      : 'bg-slate-700/50 text-slate-300 border border-slate-600'
                  }`}
                >
                  {activity.status}
                </span>
                <span className="text-[11px] font-semibold bg-[#171f33] text-white px-3 py-0.5 rounded-full border border-white/10">
                  Turma: {activity.turma || 'Todas'}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-white leading-tight">
                {activity.title}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 text-[#bccabb] hover:text-white flex items-center justify-center transition-all cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 custom-scrollbar text-xs sm:text-sm text-[#dae2fd]">
          {/* Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-[#131b2e] p-3.5 rounded-2xl border border-white/5 flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#869486]">
                Matéria
              </span>
              <span className="font-bold text-white text-xs sm:text-sm">
                {activity.subject || 'Sociologia'}
              </span>
            </div>

            <div className="bg-[#131b2e] p-3.5 rounded-2xl border border-white/5 flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#869486] flex items-center gap-1">
                <Clock className="w-3 h-3 text-sky-400" /> Prazo
              </span>
              <span className="font-bold text-white text-xs sm:text-sm">
                {activity.deadline || 'Sem data estipulada'}
              </span>
            </div>

            <div className="bg-[#131b2e] p-3.5 rounded-2xl border border-white/5 flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#869486] flex items-center gap-1">
                <Award className="w-3 h-3 text-amber-400" /> Nota Máxima
              </span>
              <span className="font-bold text-amber-300 text-xs sm:text-sm">
                {activity.maxGrade ?? 10} Pontos
              </span>
            </div>

            <div className="bg-[#131b2e] p-3.5 rounded-2xl border border-white/5 flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#869486] flex items-center gap-1">
                <Users className="w-3 h-3 text-emerald-400" /> Entregas
              </span>
              <span className="font-bold text-emerald-300 text-xs sm:text-sm">
                {activity.totalSubmissions} / {activity.totalStudents || '—'}
              </span>
            </div>
          </div>

          {/* Description */}
          {activity.description && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#bccabb] flex items-center gap-2">
                <AlignLeft className="w-4 h-4 text-[#4ade80]" />
                Instruções / Descrição da Atividade
              </h3>
              <div className="bg-[#131b2e] p-4 rounded-2xl border border-white/5 text-[#dae2fd] whitespace-pre-line leading-relaxed">
                {activity.description}
              </div>
            </div>
          )}

          {/* Support Material */}
          {activity.supportMaterial && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#bccabb] flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-sky-400" />
                Material de Apoio / Leituras Recomendadas
              </h3>
              <div className="bg-[#131b2e] p-4 rounded-2xl border border-sky-500/20 text-sky-200 whitespace-pre-line leading-relaxed">
                {activity.supportMaterial}
              </div>
            </div>
          )}

          {/* Questions Section */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#4ade80]" />
                Questões Cadastradas ({questions.length})
              </h3>
              {activity.allowGroupWork && (
                <span className="text-xs font-bold text-purple-300 bg-purple-500/20 border border-purple-500/30 px-3 py-1 rounded-full">
                  👥 Trabalho em Grupo Permitido
                </span>
              )}
            </div>

            {questions.length === 0 ? (
              <div className="bg-[#131b2e] p-8 rounded-2xl text-center text-[#bccabb] border border-white/5 space-y-1">
                <p className="font-bold text-white text-xs">Nenhuma questão objetiva/dissertativa anexada.</p>
                <p className="text-[11px]">Esta atividade consiste apenas na descrição/instruções gerais do professor.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {questions.map((q, idx) => {
                  if (q.type === 'multiple_choice') {
                    const mcq = q as MultipleChoiceQuestion;
                    return (
                      <div
                        key={q.id || idx}
                        className="bg-[#131b2e] p-4 sm:p-5 rounded-2xl border border-white/10 space-y-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <span className="text-xs font-extrabold text-[#4ade80] bg-[#4ade80]/10 px-2.5 py-1 rounded-lg border border-[#4ade80]/20">
                            Questão {idx + 1} (Múltipla Escolha)
                          </span>
                        </div>

                        <p className="font-bold text-white text-sm leading-snug">
                          {mcq.statement || 'Declaração da questão'}
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                          {mcq.options.map((opt, optIdx) => {
                            const isCorrect = optIdx === mcq.correctOptionIndex;
                            return (
                              <div
                                key={optIdx}
                                className={`p-3 rounded-xl border flex items-center justify-between text-xs transition-all ${
                                  isCorrect
                                    ? 'bg-[#4ade80]/15 border-[#4ade80]/50 text-white font-bold'
                                    : 'bg-[#171f33] border-white/5 text-[#bccabb]'
                                }`}
                              >
                                <span className="flex items-center gap-2">
                                  <span
                                    className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[11px] ${
                                      isCorrect
                                        ? 'bg-[#4ade80] text-[#003919]'
                                        : 'bg-white/10 text-white'
                                    }`}
                                  >
                                    {optionLabels[optIdx]}
                                  </span>
                                  <span>{opt || `Opção ${optionLabels[optIdx]}`}</span>
                                </span>

                                {isCorrect && (
                                  <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider font-extrabold text-[#4ade80] bg-[#4ade80]/20 px-2 py-0.5 rounded-full">
                                    <Check className="w-3 h-3 stroke-[3]" /> Gabarito
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  }

                  if (q.type === 'essay') {
                    const eq = q as EssayQuestion;
                    return (
                      <div
                        key={q.id || idx}
                        className="bg-[#131b2e] p-4 sm:p-5 rounded-2xl border border-white/10 space-y-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <span className="text-xs font-extrabold text-sky-400 bg-sky-500/10 px-2.5 py-1 rounded-lg border border-sky-500/20">
                            Questão {idx + 1} (Dissertativa)
                          </span>
                          <span className="text-[11px] font-semibold text-[#bccabb]">
                            Mínimo: {eq.minCharacters || 300} caracteres
                          </span>
                        </div>

                        <p className="font-bold text-white text-sm leading-snug">
                          {eq.statement || 'Enunciado dissertativo'}
                        </p>

                        {eq.keywords && (
                          <div className="flex items-center gap-2 text-xs bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-xl text-amber-200">
                            <Key className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            <span>
                              <strong>Palavras-chave esperadas:</strong> {eq.keywords}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  }

                  return null;
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 bg-[#131d35] border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-white/10 hover:bg-white/15 text-white rounded-full text-xs font-bold transition-all cursor-pointer"
          >
            Fechar
          </button>

          <div className="flex items-center gap-2.5">
            {onEditActivity && (
              <button
                onClick={() => {
                  onClose();
                  onEditActivity(activity);
                }}
                className="px-4 py-2.5 bg-[#171f33] hover:bg-[#222a3d] text-[#dae2fd] hover:text-white rounded-full text-xs font-bold border border-white/10 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Edit className="w-3.5 h-3.5 text-[#4ade80]" />
                <span>Editar Atividade</span>
              </button>
            )}

            {onGoToGrading && (
              <button
                onClick={() => {
                  onClose();
                  onGoToGrading(activity);
                }}
                className="px-5 py-2.5 bg-[#4ade80] hover:bg-[#6bfb9a] text-[#003919] font-extrabold rounded-full text-xs flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
              >
                <CheckCheck className="w-4 h-4 stroke-[2.5]" />
                <span>Acessar Correções</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
