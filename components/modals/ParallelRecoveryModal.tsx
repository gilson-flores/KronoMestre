'use client';

import React, { useState } from 'react';
import {
  X,
  Sparkles,
  RotateCcw,
  BookOpen,
  HelpCircle,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Layers,
  FileText,
  Lightbulb,
} from 'lucide-react';
import { Activity, ActivityQuestion } from '@/lib/types';
import { createParallelRecoveryActivity } from '@/lib/studentUtils';

interface ParallelRecoveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  parentActivity: Activity | null;
  onCreateActivity: (activity: Activity) => void;
}

export const ParallelRecoveryModal: React.FC<ParallelRecoveryModalProps> = ({
  isOpen,
  onClose,
  parentActivity,
  onCreateActivity,
}) => {
  const [prevParentId, setPrevParentId] = useState<string | null>(null);
  const [approachType, setApproachType] = useState<
    'practical_cases' | 'step_by_step_guided' | 'conceptual_reinforcement' | 'custom'
  >('practical_cases');
  const [customApproach, setCustomApproach] = useState('');
  const [deadline, setDeadline] = useState('');
  const [recoveryTitle, setRecoveryTitle] = useState('');
  const [recoveryDescription, setRecoveryDescription] = useState('');
  const [recoveryApproachSummary, setRecoveryApproachSummary] = useState('');
  const [questions, setQuestions] = useState<ActivityQuestion[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync state when parentActivity changes (render phase state adjustment)
  if (parentActivity && parentActivity.id !== prevParentId) {
    setPrevParentId(parentActivity.id);
    const cleanTitle = parentActivity.title.replace(/^\[(PNE.*?|Recuperação.*?)\]\s*/i, '');
    setRecoveryTitle(`[Recuperação Paralela] ${cleanTitle}`);
    setRecoveryDescription(
      `Avaliação de Recuperação Paralela vinculada à atividade "${cleanTitle}". Abordagem pedagógica alternativa para consolidação da aprendizagem e reavaliação de competências.`
    );
    setDeadline(parentActivity.deadline || '');
    setQuestions(parentActivity.questions || []);
    setApproachType('practical_cases');
    setCustomApproach('');
    setRecoveryApproachSummary('Estudos de caso e aplicações práticas do cotidiano');
    setErrorMessage(null);
  }

  if (!isOpen || !parentActivity) return null;

  const handleGenerateAiApproach = async () => {
    setIsGenerating(true);
    setErrorMessage(null);

    try {
      const response = await fetch('/api/gemini/create-parallel-recovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: parentActivity.title,
          subject: parentActivity.subject || 'Sociologia',
          description: parentActivity.description || '',
          turma: parentActivity.turma || '',
          questions: parentActivity.questions || [],
          maxGrade: parentActivity.maxGrade || 10,
          approachType,
          customApproach: approachType === 'custom' ? customApproach : undefined,
        }),
      });

      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data.error || 'Erro ao gerar recuperação paralela via IA.');
      }

      if (data.recoveryTitle) setRecoveryTitle(data.recoveryTitle);
      if (data.recoveryDescription) setRecoveryDescription(data.recoveryDescription);
      if (data.recoveryApproach) setRecoveryApproachSummary(data.recoveryApproach);
      if (Array.isArray(data.questions) && data.questions.length > 0) {
        setQuestions(data.questions);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Falha na geração com IA. Você pode editar manualmente abaixo.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveRecovery = () => {
    if (!recoveryTitle.trim()) {
      setErrorMessage('Por favor, informe o título da recuperação paralela.');
      return;
    }

    const newRecoveryAct = createParallelRecoveryActivity(parentActivity, {
      recoveryTitle: recoveryTitle.trim(),
      recoveryDescription: recoveryDescription.trim(),
      recoveryApproach: recoveryApproachSummary || 'Abordagem Pedagógica Diferenciada',
      deadline: deadline || parentActivity.deadline,
      questions,
    });

    onCreateActivity(newRecoveryAct);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-fadeIn">
      <div className="w-full max-w-3xl bg-[#0e172a] rounded-3xl border border-white/15 p-5 sm:p-7 space-y-6 shadow-2xl relative my-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-[#4ade80]/15 text-[#4ade80] rounded-2xl border border-[#4ade80]/30 shadow-inner">
              <RotateCcw className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white">Criar Recuperação Paralela</h3>
                <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-[#4ade80]/20 text-[#4ade80] border border-[#4ade80]/30">
                  Abordagem Diferente
                </span>
              </div>
              <p className="text-xs text-[#bccabb]">
                Vinculada à avaliação raiz <strong className="text-white">&quot;{parentActivity.title}&quot;</strong> (Turma {parentActivity.turma}).
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-[#bccabb] hover:text-white rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Warning / Pedagogical Rule Banner */}
        <div className="p-3.5 rounded-2xl bg-[#131b2e] border border-[#4ade80]/20 flex items-start gap-3">
          <Lightbulb className="w-5 h-5 text-[#4ade80] shrink-0 mt-0.5" />
          <div className="text-xs text-[#bccabb] space-y-1">
            <p className="font-semibold text-white">Regra de Ouro do Engajamento da Turma:</p>
            <p>
              A recuperação paralela fica vinculada à atividade raiz. O aluno que não fez a primeira avaliação e entregar a recuperação{' '}
              <strong className="text-[#4ade80]">terá sua entrega considerada no número geral e na taxa de conclusão da turma</strong>.
            </p>
          </div>
        </div>

        {/* Error message */}
        {errorMessage && (
          <div className="p-3 bg-rose-500/20 border border-rose-500/40 rounded-2xl text-xs text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Approach Selection & AI Generation */}
        <div className="space-y-3 bg-[#131b2e]/60 p-4 rounded-2xl border border-white/10">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-white flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-amber-400" />
              <span>Escolha a Abordagem Pedagógica Diferenciada:</span>
            </label>
            <button
              type="button"
              onClick={handleGenerateAiApproach}
              disabled={isGenerating}
              className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-emerald-500 hover:from-amber-400 hover:to-emerald-400 text-[#09101d] font-extrabold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              <span>{isGenerating ? 'Gerando Abordagem...' : '✨ Gerar Questões via IA'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <button
              type="button"
              onClick={() => setApproachType('practical_cases')}
              className={`p-3 rounded-xl border text-left transition-all ${
                approachType === 'practical_cases'
                  ? 'bg-[#1d273d] border-[#4ade80] text-white shadow-md'
                  : 'bg-[#171f33] border-white/10 text-[#bccabb] hover:border-white/20'
              }`}
            >
              <div className="text-xs font-bold text-white mb-1">🏢 Estudos de Caso</div>
              <div className="text-[11px] leading-tight">Foco em situações práticas e dilemas do cotidiano.</div>
            </button>

            <button
              type="button"
              onClick={() => setApproachType('step_by_step_guided')}
              className={`p-3 rounded-xl border text-left transition-all ${
                approachType === 'step_by_step_guided'
                  ? 'bg-[#1d273d] border-[#4ade80] text-white shadow-md'
                  : 'bg-[#171f33] border-white/10 text-[#bccabb] hover:border-white/20'
              }`}
            >
              <div className="text-xs font-bold text-white mb-1">🪜 Raciocínio Guiado</div>
              <div className="text-[11px] leading-tight">Roteiro passo a passo com perguntas reflexivas.</div>
            </button>

            <button
              type="button"
              onClick={() => setApproachType('conceptual_reinforcement')}
              className={`p-3 rounded-xl border text-left transition-all ${
                approachType === 'conceptual_reinforcement'
                  ? 'bg-[#1d273d] border-[#4ade80] text-white shadow-md'
                  : 'bg-[#171f33] border-white/10 text-[#bccabb] hover:border-white/20'
              }`}
            >
              <div className="text-xs font-bold text-white mb-1">🎯 Reforço Conceitual</div>
              <div className="text-[11px] leading-tight">Foco nas ideias-chave e conceitos essenciais.</div>
            </button>
          </div>

          {approachType === 'custom' && (
            <textarea
              value={customApproach}
              onChange={(e) => setCustomApproach(e.target.value)}
              placeholder="Instruções personalizadas do professor sobre como abordar a recuperação..."
              className="w-full bg-[#0a0f1d] border border-white/15 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#4ade80]"
              rows={2}
            />
          )}
        </div>

        {/* Basic Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-[#bccabb] block mb-1">Título da Recuperação</label>
            <input
              type="text"
              value={recoveryTitle}
              onChange={(e) => setRecoveryTitle(e.target.value)}
              className="w-full bg-[#131b2e] border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#4ade80]"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-[#bccabb] block mb-1">Prazo de Entrega</label>
            <input
              type="text"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              placeholder="Ex: Sexta, 23:59"
              className="w-full bg-[#131b2e] border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#4ade80]"
            />
          </div>
        </div>

        {/* Questions Preview */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-[#4ade80]" />
              <span>Questões da Recuperação ({questions.length})</span>
            </h4>
            <span className="text-[11px] text-[#bccabb]">
              {questions.filter((q) => q.type === 'multiple_choice').length} Objetivas |{' '}
              {questions.filter((q) => q.type === 'essay').length} Dissertativas
            </span>
          </div>

          <div className="max-h-56 overflow-y-auto space-y-2.5 pr-1">
            {questions.map((q, idx) => (
              <div key={q.id || idx} className="p-3 bg-[#131b2e] rounded-xl border border-white/10 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-[#4ade80]">
                    Questão {idx + 1} ({q.type === 'multiple_choice' ? 'Objetiva' : 'Dissertativa'})
                  </span>
                </div>
                <p className="text-xs text-white">{q.statement || 'Enunciado da questão'}</p>
                {q.type === 'multiple_choice' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 mt-1 text-[11px] text-[#bccabb]">
                    {q.options.map((opt, oIdx) => (
                      <div
                        key={oIdx}
                        className={`p-1.5 rounded-lg border ${
                          q.correctOptionIndex === oIdx
                            ? 'bg-[#4ade80]/15 border-[#4ade80]/40 text-[#4ade80] font-bold'
                            : 'bg-black/20 border-white/5'
                        }`}
                      >
                        {String.fromCharCode(65 + oIdx)}) {opt}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-full text-xs font-bold text-[#bccabb] hover:text-white hover:bg-white/10 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSaveRecovery}
            className="px-6 py-2.5 bg-[#4ade80] hover:bg-[#6bfb9a] text-[#003919] font-bold rounded-full text-xs flex items-center gap-2 transition-all shadow-lg shadow-[#4ade80]/20 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Salvar e Vincular Recuperação</span>
          </button>
        </div>
      </div>
    </div>
  );
};
