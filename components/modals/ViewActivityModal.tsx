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
  Key,
  ExternalLink,
  Link2,
  Gamepad2,
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
  if (activity.type === 'Dinâmica' || activity.type === 'Trabalho em grupo') Icon = Users2;
  if (activity.type === 'Projeto de pesquisa') Icon = BookOpen;

  const questions = activity.questions || [];
  const optionLabels = ['A', 'B', 'C', 'D'];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-fadeIn">
      <div className="bg-surface border border-white/15 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        {/* Header */}
        <div className="p-5 sm:p-6 bg-[#131d35] border-b border-border flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#1d273d] border border-border text-primary flex items-center justify-center shrink-0 mt-0.5 shadow-md">
              <Icon className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="text-[11px] font-extrabold uppercase tracking-wider bg-primary/15 text-primary px-3 py-0.5 rounded-full border border-primary/30">
                  {activity.type}
                </span>
                <span
                  className={`text-[11px] font-bold px-3 py-0.5 rounded-full ${
                    activity.status === 'Ativo'
                      ? 'bg-primary/20 text-primary border border-primary/30'
                      : activity.status === 'Prazo Encerrado'
                      ? 'bg-rose-100 text-rose-600 border border-rose-500/30'
                      : 'bg-slate-700/50 text-muted border border-slate-600'
                  }`}
                >
                  {activity.status}
                </span>
                {activity.isAdapted && (
                  <span className="text-[11px] font-bold px-3 py-0.5 rounded-full bg-amber-100 text-amber-600 border border-amber-500/30">
                    Adaptada PNE
                  </span>
                )}
                <span className="text-[11px] font-semibold bg-[#171f33] text-foreground px-3 py-0.5 rounded-full border border-border">
                  Turma: {activity.turma || 'Todas'}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-foreground leading-tight">
                {activity.title}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-surface-hover hover:bg-surface-hover text-muted hover:text-foreground flex items-center justify-center transition-all cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 custom-scrollbar text-xs sm:text-sm text-foreground">
          {/* Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-surface p-3.5 rounded-2xl border border-border flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#869486]">
                Matéria
              </span>
              <span className="font-bold text-foreground text-xs sm:text-sm">
                {activity.subject || 'Sociologia'}
              </span>
            </div>

            <div className="bg-surface p-3.5 rounded-2xl border border-border flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#869486] flex items-center gap-1">
                <Clock className="w-3 h-3 text-sky-400" /> Prazo
              </span>
              <span className="font-bold text-foreground text-xs sm:text-sm">
                {activity.deadline || 'Sem data estipulada'}
              </span>
            </div>

            <div className="bg-surface p-3.5 rounded-2xl border border-border flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#869486] flex items-center gap-1">
                <Award className="w-3 h-3 text-amber-400" /> Nota Máxima
              </span>
              <span className="font-bold text-amber-600 text-xs sm:text-sm">
                {activity.maxGrade ?? 10} Pontos
              </span>
            </div>

            <div className="bg-surface p-3.5 rounded-2xl border border-border flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#869486] flex items-center gap-1">
                <Users className="w-3 h-3 text-emerald-400" /> Entregas
              </span>
              <span className="font-bold text-emerald-600 text-xs sm:text-sm">
                {activity.submissions ? activity.submissions.length : activity.totalSubmissions} / {activity.totalStudents || '—'}
              </span>
            </div>
          </div>

          {/* Description */}
          {activity.description && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-2">
                <AlignLeft className="w-4 h-4 text-primary" />
                Instruções / Descrição da Atividade
              </h3>
              <div className="bg-surface p-4 rounded-2xl border border-border text-foreground whitespace-pre-line leading-relaxed">
                {activity.description}
              </div>
            </div>
          )}

          {/* Support Material */}
          {activity.supportMaterial && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-sky-400" />
                Material de Apoio / Leituras Recomendadas
              </h3>
              <div className="bg-surface p-4 rounded-2xl border border-sky-500/20 text-sky-200 leading-relaxed space-y-2">
                {activity.supportMaterial.split('\n').map((line, i) => {
                  const urlMatch = line.match(/(https?:\/\/[^\s]+)/g);
                  if (urlMatch) {
                    const parts = line.split(/(https?:\/\/[^\s]+)/g);
                    return (
                      <p key={i} className="whitespace-pre-wrap flex flex-wrap items-center gap-1.5 my-1">
                        {parts.map((part, pIdx) => {
                          if (part.match(/^https?:\/\//i)) {
                            return (
                              <a
                                key={pIdx}
                                href={part}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1 bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/40 text-sky-300 font-bold rounded-xl text-xs transition-all underline cursor-pointer shadow-sm active:scale-95 my-0.5"
                              >
                                <Link2 className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                                <span className="truncate max-w-xs">{part}</span>
                                <ExternalLink className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                              </a>
                            );
                          }
                          return <span key={pIdx}>{part}</span>;
                        })}
                      </p>
                    );
                  }
                  return <p key={i} className="whitespace-pre-wrap">{line}</p>;
                })}
              </div>
            </div>
          )}

          {/* Playful Game Preview (PNE Severo) */}
          {(activity.playfulGameHtml || activity.adaptationType === 'severe_playful') && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between border-b border-amber-500/30 pb-3">
                <h3 className="text-sm font-extrabold text-amber-600 uppercase tracking-wider flex items-center gap-2">
                  <Gamepad2 className="w-4 h-4 text-amber-400" />
                  Visualização do Jogo Lúdico Adaptado (PNE Severo)
                </h3>
                <span className="text-xs font-bold text-amber-600 bg-amber-100 border border-amber-500/30 px-3 py-1 rounded-full">
                  ⭐ Interativo / Gamificado
                </span>
              </div>
              <div className="w-full h-[460px] rounded-2xl overflow-hidden border-2 border-amber-200 bg-black relative shadow-xl">
                <iframe
                  srcDoc={activity.playfulGameHtml || '<div style="color:white;padding:20px;font-family:sans-serif;text-align:center;">Carregando jogo interativo...</div>'}
                  title={`Jogo Lúdico - ${activity.title}`}
                  className="w-full h-full border-0 block"
                  allow="autoplay; fullscreen"
                  sandbox="allow-scripts allow-same-origin allow-modals"
                />
              </div>
            </div>
          )}

          {/* Questions Section */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-sm font-extrabold text-foreground uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                Questões Cadastradas ({questions.length})
              </h3>
              {activity.allowGroupWork && (
                <span className="text-xs font-bold text-purple-600 bg-purple-100 border border-purple-500/30 px-3 py-1 rounded-full">
                  👥 Trabalho em Grupo Permitido
                </span>
              )}
            </div>

            {questions.length === 0 ? (
              <div className="bg-surface p-8 rounded-2xl text-center text-muted border border-border space-y-1">
                <p className="font-bold text-foreground text-xs">Nenhuma questão objetiva/dissertativa anexada.</p>
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
                        className="bg-surface p-4 sm:p-5 rounded-2xl border border-border space-y-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <span className="text-xs font-extrabold text-primary bg-primary/10 px-2.5 py-1 rounded-lg border border-primary/20">
                            Questão {idx + 1} (Múltipla Escolha)
                          </span>
                        </div>

                        <p className="font-bold text-foreground text-sm leading-snug">
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
                                    ? 'bg-primary/15 border-primary/50 text-foreground font-bold'
                                    : 'bg-[#171f33] border-border text-muted'
                                }`}
                              >
                                <span className="flex items-center gap-2">
                                  <span
                                    className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[11px] ${
                                      isCorrect
                                        ? 'bg-primary text-white'
                                        : 'bg-surface-hover text-foreground'
                                    }`}
                                  >
                                    {optionLabels[optIdx]}
                                  </span>
                                  <span>{opt || `Opção ${optionLabels[optIdx]}`}</span>
                                </span>

                                {isCorrect && (
                                  <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider font-extrabold text-primary bg-primary/20 px-2 py-0.5 rounded-full">
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
                        className="bg-surface p-4 sm:p-5 rounded-2xl border border-border space-y-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <span className="text-xs font-extrabold text-sky-400 bg-sky-500/10 px-2.5 py-1 rounded-lg border border-sky-500/20">
                            Questão {idx + 1} (Dissertativa)
                          </span>
                          <span className="text-[11px] font-semibold text-muted">
                            Mínimo: {eq.minCharacters || 300} caracteres
                          </span>
                        </div>

                        <p className="font-bold text-foreground text-sm leading-snug">
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
        <div className="p-4 sm:p-5 bg-[#131d35] border-t border-border flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-surface-hover hover:bg-white/15 text-foreground rounded-full text-xs font-bold transition-all cursor-pointer"
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
                className="px-4 py-2.5 bg-[#171f33] hover:bg-surface-hover text-foreground hover:text-foreground rounded-full text-xs font-bold border border-border flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Edit className="w-3.5 h-3.5 text-primary" />
                <span>Editar Atividade</span>
              </button>
            )}

            {onGoToGrading && (
              <button
                onClick={() => {
                  onClose();
                  onGoToGrading(activity);
                }}
                className="px-5 py-2.5 bg-primary hover:bg-primary-hover text-white font-extrabold rounded-full text-xs flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
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

export default ViewActivityModal;
