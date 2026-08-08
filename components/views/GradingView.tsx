'use client';

import React, { useState } from 'react';
import { ArrowLeft, Save, RotateCcw, Check, UserCheck } from 'lucide-react';
import { Activity, ActivitySubmission } from '@/lib/types';

interface GradingViewProps {
  activity: Activity;
  onBack: () => void;
  onUpdateSubmission: (
    activityId: string,
    studentId: string,
    essayScore: number,
    feedback: string,
    status: 'graded' | 'returned' | 'draft'
  ) => void;
}

export const GradingView: React.FC<GradingViewProps> = ({
  activity,
  onBack,
  onUpdateSubmission,
}) => {
  // Local state for interactive editing of scores & feedback
  const [submissions, setSubmissions] = useState<ActivitySubmission[]>(activity.submissions);
  const [savedSuccessId, setSavedSuccessId] = useState<string | null>(null);

  const handleScoreChange = (studentId: string, scoreVal: string) => {
    const val = parseFloat(scoreVal);
    setSubmissions((prev) =>
      prev.map((sub) =>
        sub.studentId === studentId ? { ...sub, essayScore: isNaN(val) ? undefined : val } : sub
      )
    );
  };

  const handleFeedbackChange = (studentId: string, text: string) => {
    setSubmissions((prev) =>
      prev.map((sub) => (sub.studentId === studentId ? { ...sub, teacherFeedback: text } : sub))
    );
  };

  const handleSave = (studentId: string, status: 'graded' | 'returned' | 'draft') => {
    const sub = submissions.find((s) => s.studentId === studentId);
    if (!sub) return;

    onUpdateSubmission(
      activity.id,
      studentId,
      sub.essayScore ?? 0,
      sub.teacherFeedback ?? '',
      status
    );

    setSavedSuccessId(studentId);
    setTimeout(() => setSavedSuccessId(null), 2500);
  };

  const gradedCount = submissions.filter((s) => s.status === 'graded').length;
  const pendingCount = submissions.length - gradedCount;

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Top Navigation */}
      <button
        onClick={onBack}
        className="inline-flex items-center gap-2 px-4 py-2 bg-[#171f33] hover:bg-[#222a3d] text-[#dae2fd] rounded-full text-xs font-bold transition-all border border-white/10 cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Voltar para Atividades</span>
      </button>

      {/* Title & Stats Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-2">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-bold bg-[#4ade80]/20 text-[#4ade80] px-3 py-1 rounded-full border border-[#4ade80]/30 uppercase">
              {activity.turma}
            </span>
            <span className="text-xs font-bold bg-[#171f33] text-[#c0c1ff] px-3 py-1 rounded-full border border-white/10 uppercase">
              {activity.type}
            </span>
          </div>

          <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
            {activity.title}
          </h1>
          <p className="text-sm text-[#bccabb] mt-1 font-medium">
            {activity.description}
          </p>
        </div>

        {/* Counter Badge */}
        <div className="glass-panel px-6 py-3 rounded-full border border-white/10 flex items-center gap-6 shrink-0 self-start lg:self-center">
          <div className="text-center">
            <span className="text-xl font-extrabold text-[#4ade80]">{gradedCount}/{submissions.length}</span>
            <span className="block text-[10px] font-bold text-[#bccabb] tracking-wider uppercase">
              Corrigidos
            </span>
          </div>
          <div className="w-px h-8 bg-white/10"></div>
          <div className="text-center">
            <span className="text-xl font-extrabold text-white">{pendingCount}</span>
            <span className="block text-[10px] font-bold text-[#bccabb] tracking-wider uppercase">
              Pendentes
            </span>
          </div>
        </div>
      </div>

      {/* Student Cards Grid */}
      {submissions.length === 0 ? (
        <div className="glass-panel p-12 text-center rounded-3xl border border-white/10 text-[#bccabb]">
          Nenhuma resposta enviada para esta atividade ainda.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {submissions.map((sub) => {
          const isSaved = savedSuccessId === sub.studentId;

          return (
            <div
              key={sub.studentId}
              className="glass-panel p-6 rounded-3xl border border-white/10 space-y-6 relative flex flex-col justify-between"
            >
              {/* Student Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img
                    src={sub.avatarUrl}
                    alt={sub.studentName}
                    className="w-12 h-12 rounded-full object-cover border-2 border-white/10"
                  />
                  <div>
                    <h3 className="text-base font-bold text-white">{sub.studentName}</h3>
                    <p className="text-xs text-[#bccabb] uppercase tracking-wider">
                      MATRÍCULA: {sub.matricula}
                    </p>
                  </div>
                </div>

                {sub.tag && (
                  <span
                    className={`text-xs font-bold px-3 py-1 rounded-full ${
                      sub.tag === 'PNE'
                        ? 'bg-[#4ade80]/20 text-[#4ade80] border border-[#4ade80]/30'
                        : sub.tag === 'RAD'
                        ? 'bg-[#c0c1ff]/20 text-[#c0c1ff] border border-[#c0c1ff]/30'
                        : 'bg-[#171f33] text-[#bccabb]'
                    }`}
                  >
                    {sub.tag}
                  </span>
                )}
              </div>

              {/* Student Essay Response Content */}
              {sub.essayAnswer && (
                <div className="bg-[#131b2e] p-4 rounded-2xl border border-white/5 text-xs text-[#dae2fd]">
                  <p className="font-semibold text-[#bccabb] mb-1">Resposta do Aluno:</p>
                  <p className="italic leading-relaxed">"{sub.essayAnswer}"</p>
                </div>
              )}

              {/* Score breakdown pills */}
              <div className="grid grid-cols-2 gap-3">
                {/* Auto Score */}
                <div className="bg-[#131b2e] p-4 rounded-2xl border border-white/5">
                  <span className="block text-[10px] font-bold text-[#bccabb] uppercase tracking-wider mb-1">
                    Objetivas (Auto-Calculado)
                  </span>
                  <div className="text-2xl font-extrabold text-[#4ade80]">
                    {sub.objectiveScore.toFixed(1)}{' '}
                    <span className="text-sm text-[#bccabb] font-normal">/ {sub.maxObjectiveScore.toFixed(1)}</span>
                  </div>
                </div>

                {/* Manual Score */}
                <div className="bg-[#131b2e] p-4 rounded-2xl border border-white/5">
                  <span className="block text-[10px] font-bold text-[#bccabb] uppercase tracking-wider mb-1">
                    Dissertativa (Manual)
                  </span>
                  <div className="flex items-baseline gap-1">
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max="5"
                      value={sub.essayScore !== undefined ? sub.essayScore : ''}
                      onChange={(e) => handleScoreChange(sub.studentId, e.target.value)}
                      placeholder="-"
                      className="w-16 bg-[#171f33] border border-white/10 rounded-xl px-2 py-1 text-xl font-extrabold text-white text-center focus:outline-none focus:border-[#4ade80]"
                    />
                    <span className="text-sm text-[#bccabb] font-normal">/ {sub.maxEssayScore.toFixed(1)}</span>
                  </div>
                </div>
              </div>

              {/* Teacher Feedback Textarea */}
              <div>
                <label className="block text-xs font-bold text-[#bccabb] uppercase tracking-wider mb-2">
                  Feedback Pedagógico
                </label>
                <textarea
                  rows={3}
                  value={sub.teacherFeedback || ''}
                  onChange={(e) => handleFeedbackChange(sub.studentId, e.target.value)}
                  placeholder="Insira suas observações aqui..."
                  className="w-full bg-[#131b2e] border border-white/10 rounded-2xl p-4 text-xs text-[#dae2fd] placeholder-[#869486] focus:outline-none focus:border-[#4ade80] transition-all resize-none"
                />
              </div>

              {/* Saved feedback toast alert */}
              {isSaved && (
                <div className="p-3 bg-[#4ade80]/20 border border-[#4ade80]/40 text-[#4ade80] rounded-2xl text-xs font-bold flex items-center gap-2">
                  <UserCheck className="w-4 h-4" />
                  <span>Nota e feedback salvos com sucesso!</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={() => handleSave(sub.studentId, 'graded')}
                  className="py-3 px-4 bg-[#4ade80] hover:bg-[#6bfb9a] text-[#003919] font-bold rounded-full text-xs flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{sub.status === 'graded' ? 'Salvar Nota' : 'Salvar Rascunho'}</span>
                </button>

                <button
                  onClick={() => handleSave(sub.studentId, 'returned')}
                  className="py-3 px-4 bg-transparent hover:bg-white/5 text-[#dae2fd] font-bold rounded-full text-xs border border-white/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Devolver para Refazer</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
      )}
    </div>
  );
};
