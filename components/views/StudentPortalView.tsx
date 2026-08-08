'use client';

import React, { useState } from 'react';
import { StudentUser, Activity, ActivitySubmission } from '@/lib/types';
import { canStudentAccessActivity } from '@/lib/studentUtils';
import { GraduationCap, LogOut, CheckCircle2, FileText, Send, Award, MessageSquare } from 'lucide-react';

interface StudentPortalViewProps {
  student: StudentUser;
  activities: Activity[];
  onLogout: () => void;
  onSubmitAnswer: (activityId: string, studentId: string, essayAnswer: string) => void;
}

export const StudentPortalView: React.FC<StudentPortalViewProps> = ({
  student,
  activities,
  onLogout,
  onSubmitAnswer,
}) => {
  // Filter activities authorized for this student based on turma rules
  const studentActivities = activities.filter((a) =>
    canStudentAccessActivity(a.turma, student.turma)
  );

  const [essayInputs, setEssayInputs] = useState<{ [activityId: string]: string }>({});
  const [submittedIds, setSubmittedIds] = useState<{ [activityId: string]: boolean }>({});

  const handleSubmit = (activityId: string) => {
    const text = essayInputs[activityId] || '';
    if (!text.trim()) {
      alert('Por favor, escreva sua resposta antes de enviar.');
      return;
    }

    onSubmitAnswer(activityId, student.id, text);
    setSubmittedIds((prev) => ({ ...prev, [activityId]: true }));
  };

  return (
    <div className="min-h-screen bg-[#0b1326] text-[#dae2fd] p-4 sm:p-8 max-w-5xl mx-auto space-y-8 animate-fadeIn">
      {/* Top Banner */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-6 shadow-xl">
        <div className="flex items-center gap-4">
          <img
            src={student.avatarUrl}
            alt={student.fullName}
            className="w-16 h-16 rounded-full object-cover border-2 border-[#4ade80]"
          />
          <div>
            <span className="text-xs font-bold text-[#4ade80] uppercase tracking-wider">
              Portal do Aluno • Sociologia
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-0.5">
              {student.fullName}
            </h1>
            <div className="flex items-center gap-3 text-xs text-[#bccabb] mt-1">
              <span className="bg-[#171f33] px-3 py-0.5 rounded-full border border-white/10">
                Turma: {student.turma}
              </span>
              <span>Matrícula: {student.matricula}</span>
            </div>
          </div>
        </div>

        <button
          onClick={onLogout}
          className="py-2.5 px-5 bg-[#171f33] hover:bg-rose-500/20 text-rose-300 rounded-full text-xs font-bold border border-white/10 flex items-center gap-2 transition-all self-start sm:self-center cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Sair da Conta</span>
        </button>
      </div>

      {/* Activities Section */}
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <FileText className="w-5 h-5 text-[#4ade80]" />
          <span>Suas Atividades e Avaliações</span>
        </h2>

        {studentActivities.length === 0 ? (
          <div className="glass-panel p-12 text-center rounded-3xl border border-white/10 text-[#bccabb]">
            Nenhuma atividade cadastrada para sua turma no momento.
          </div>
        ) : (
          <div className="space-y-6">
            {studentActivities.map((act) => {
              // Find submission for this student if present
              const submission = act.submissions.find(
                (s) => s.studentId === student.id || s.studentName === student.fullName
              );

              const isSubmitted = Boolean(submission?.essayAnswer) || Boolean(submittedIds[act.id]);

              return (
                <div
                  key={act.id}
                  className="glass-panel p-6 rounded-3xl border border-white/10 space-y-6"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/5">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[11px] font-bold bg-[#4ade80]/20 text-[#4ade80] px-3 py-0.5 rounded-full border border-[#4ade80]/30">
                          {act.type}
                        </span>
                        <span className="text-[11px] font-semibold text-[#bccabb]">
                          Prazo: {act.deadline}
                        </span>
                      </div>
                      <h3 className="text-xl font-bold text-white">{act.title}</h3>
                      <p className="text-xs text-[#bccabb] mt-1">{act.description}</p>
                    </div>

                    <div className="self-start sm:self-center">
                      {isSubmitted ? (
                        <span className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-[#4ade80]/20 text-[#4ade80] rounded-full text-xs font-bold border border-[#4ade80]/30">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Entregue</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-amber-500/20 text-amber-300 rounded-full text-xs font-bold border border-amber-500/30">
                          <span>Pendente</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Submission & Feedback details */}
                  {submission && submission.status === 'graded' ? (
                    <div className="space-y-4 bg-[#131b2e] p-5 rounded-2xl border border-[#4ade80]/20">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#4ade80] uppercase tracking-wider flex items-center gap-1.5">
                          <Award className="w-4 h-4" />
                          <span>Resultado e Nota Atribuída</span>
                        </span>
                        <span className="text-lg font-extrabold text-white">
                          {(
                            (submission.objectiveScore || 0) + (submission.essayScore || 0)
                          ).toFixed(1)}{' '}
                          / 10.0
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="bg-[#171f33] p-3 rounded-xl border border-white/5">
                          <span className="text-[#bccabb] block">Questões Objetivas:</span>
                          <span className="text-base font-bold text-[#4ade80]">
                            {submission.objectiveScore} / 5.0
                          </span>
                        </div>
                        <div className="bg-[#171f33] p-3 rounded-xl border border-white/5">
                          <span className="text-[#bccabb] block">Questão Dissertativa:</span>
                          <span className="text-base font-bold text-[#4ade80]">
                            {submission.essayScore ?? 0} / 5.0
                          </span>
                        </div>
                      </div>

                      {submission.teacherFeedback && (
                        <div className="bg-[#171f33] p-4 rounded-xl border border-white/5 space-y-1">
                          <span className="text-xs font-bold text-[#c0c1ff] flex items-center gap-1.5">
                            <MessageSquare className="w-4 h-4" />
                            <span>Feedback do Professor:</span>
                          </span>
                          <p className="text-xs text-[#dae2fd] italic">
                            &ldquo;{submission.teacherFeedback}&rdquo;
                          </p>
                        </div>
                      )}
                    </div>
                  ) : isSubmitted ? (
                    <div className="bg-[#131b2e] p-4 rounded-2xl border border-white/5 text-xs text-[#bccabb] italic">
                      Sua resposta foi enviada ao professor e está aguardando correção.
                    </div>
                  ) : (
                    /* Response Input Area */
                    <div className="space-y-3">
                      <label className="block text-xs font-bold text-[#dae2fd]">
                        Sua Resposta Dissertativa:
                      </label>
                      <textarea
                        rows={4}
                        value={essayInputs[act.id] || ''}
                        onChange={(e) =>
                          setEssayInputs({ ...essayInputs, [act.id]: e.target.value })
                        }
                        placeholder="Digite aqui sua análise e fundamentação sociológica..."
                        className="w-full bg-[#131b2e] border border-white/10 rounded-2xl p-4 text-xs text-white placeholder-[#869486] focus:outline-none focus:border-[#4ade80]"
                      />
                      <button
                        onClick={() => handleSubmit(act.id)}
                        className="py-3 px-6 bg-[#4ade80] hover:bg-[#6bfb9a] text-[#003919] font-bold rounded-full text-xs flex items-center gap-2 transition-all shadow-md cursor-pointer"
                      >
                        <Send className="w-4 h-4" />
                        <span>Enviar Resposta da Atividade</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
