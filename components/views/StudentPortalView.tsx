'use client';

import React, { useState } from 'react';
import { StudentUser, Activity, LibraryFile, ActivityQuestion, MultipleChoiceQuestion, EssayQuestion } from '@/lib/types';
import { canStudentAccessActivity, getActivityGradeDistribution } from '@/lib/studentUtils';
import {
  LogOut,
  CheckCircle2,
  FileText,
  Send,
  Award,
  MessageSquare,
  Clock,
  BookOpen,
  FolderDown,
  Download,
  ExternalLink,
  HardDrive,
  HelpCircle,
  AlertCircle,
  Sparkles,
  Check,
  X,
  RotateCcw
} from 'lucide-react';

interface StudentPortalViewProps {
  student: StudentUser;
  activities: Activity[];
  libraryFiles?: LibraryFile[];
  onLogout: () => void;
  onSubmitAnswer: (
    activityId: string,
    studentId: string,
    essayAnswer: string,
    objectiveScore: number,
    maxObjectiveScore: number,
    maxEssayScore: number,
    selectedObjectiveAnswers?: { [questionId: string]: number }
  ) => void;
}

export const StudentPortalView: React.FC<StudentPortalViewProps> = ({
  student,
  activities,
  libraryFiles = [],
  onLogout,
  onSubmitAnswer,
}) => {
  // Tab state: 'atividades' | 'correcoes' | 'arquivos'
  const [activeTab, setActiveTab] = useState<'atividades' | 'correcoes' | 'arquivos'>('atividades');

  // Interactive student answers per activity
  // essayInputs[activityId] -> string
  const [essayInputs, setEssayInputs] = useState<{ [activityId: string]: string }>({});
  // objectiveInputs[activityId][questionId] -> optionIndex (0, 1, 2, 3)
  const [objectiveInputs, setObjectiveInputs] = useState<{ [activityId: string]: { [questionId: string]: number } }>({});

  // Toast / Submission feedback
  const [submissionSuccessMsg, setSubmissionSuccessMsg] = useState<string | null>(null);

  // Filter activities authorized for this student
  const authorizedActivities = activities.filter((a) =>
    canStudentAccessActivity(a.turma, student.turma)
  );

  // Split into "A Fazer" and "Entregues/Corrigidas"
  const pendingActivities = authorizedActivities.filter((act) => {
    const sub = act.submissions.find(
      (s) => s.studentId === student.id || s.studentName === student.fullName
    );
    return !sub || sub.status === 'returned' || sub.status === 'draft';
  });

  const submittedActivities = authorizedActivities.filter((act) => {
    const sub = act.submissions.find(
      (s) => s.studentId === student.id || s.studentName === student.fullName
    );
    return sub && sub.status !== 'returned' && sub.status !== 'draft';
  });

  // Filter library files for this student's turma
  const studentLibraryFiles = libraryFiles.filter((file) =>
    !file.turma || file.turma === 'branco' || file.turma === 'Todas' || canStudentAccessActivity(file.turma, student.turma)
  );

  const handleSelectOption = (activityId: string, questionId: string, optionIndex: number) => {
    setObjectiveInputs((prev) => ({
      ...prev,
      [activityId]: {
        ...(prev[activityId] || {}),
        [questionId]: optionIndex,
      },
    }));
  };

  const handleSubmit = (act: Activity) => {
    const distribution = getActivityGradeDistribution(act);
    const questions = act.questions || [];
    const objectiveQuestions = questions.filter((q) => q.type === 'multiple_choice') as (ActivityQuestion & MultipleChoiceQuestion)[];
    const essayQuestions = questions.filter((q) => q.type === 'essay') as (ActivityQuestion & EssayQuestion)[];

    const existingSub = act.submissions.find(
      (s) => s.studentId === student.id || s.studentName === student.fullName
    );
    const essayText = essayInputs[act.id] !== undefined
      ? essayInputs[act.id]
      : (existingSub?.essayAnswer || '');

    // If there are essay questions, require text
    if (essayQuestions.length > 0 && !essayText.trim()) {
      alert('Por favor, escreva sua resposta dissertativa antes de enviar a atividade.');
      return;
    }

    // Calculate objective score immediately (sai na hora)
    let correctCount = 0;
    const studentChoices = objectiveInputs[act.id] || {};

    objectiveQuestions.forEach((q) => {
      const chosen = studentChoices[q.id];
      if (chosen !== undefined && chosen === q.correctOptionIndex) {
        correctCount += 1;
      }
    });

    let calculatedObjectiveScore = 0;
    if (objectiveQuestions.length > 0) {
      calculatedObjectiveScore = (correctCount / objectiveQuestions.length) * distribution.maxObjectiveGrade;
    } else if (distribution.hasObjective) {
      calculatedObjectiveScore = distribution.maxObjectiveGrade; // Fallback if no questions array defined
    }

    // Submit to parent
    onSubmitAnswer(
      act.id,
      student.id,
      essayText,
      Number(calculatedObjectiveScore.toFixed(1)),
      Number(distribution.maxObjectiveGrade.toFixed(1)),
      Number(distribution.maxEssayGrade.toFixed(1)),
      studentChoices
    );

    const msg = objectiveQuestions.length > 0
      ? `Atividade enviada! Nota objetiva calculada na hora: ${calculatedObjectiveScore.toFixed(1)} / ${distribution.maxObjectiveGrade.toFixed(1)} pts. A parte dissertativa foi enviada para correção.`
      : `Atividade enviada com sucesso! Acompanhe a correção na aba "Correções".`;

    setSubmissionSuccessMsg(msg);
    setTimeout(() => setSubmissionSuccessMsg(null), 5000);

    // Switch to Correções tab automatically
    setActiveTab('correcoes');
  };

  return (
    <div className="min-h-screen bg-[#0b1326] text-[#dae2fd] p-4 sm:p-8 max-w-5xl mx-auto space-y-8 animate-fadeIn">
      {/* Top Banner */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-6 shadow-xl">
        <div className="flex items-center gap-4">
          <img
            src={student.avatarUrl}
            alt={student.fullName}
            className="w-16 h-16 rounded-full object-cover border-2 border-[#4ade80] shadow-md"
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#4ade80] uppercase tracking-wider bg-[#4ade80]/10 px-3 py-0.5 rounded-full border border-[#4ade80]/20">
                Portal do Aluno
              </span>
              <span className="text-xs font-semibold text-[#bccabb]">Sociologia</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
              {student.fullName}
            </h1>
            <div className="flex flex-wrap items-center gap-3 text-xs text-[#bccabb] mt-1.5">
              <span className="bg-[#171f33] px-3 py-1 rounded-full border border-white/10 text-white font-semibold">
                Turma: {student.turma}
              </span>
              <span>Matrícula: {student.matricula}</span>
              {student.tag && (
                <span className="bg-[#4ade80]/20 text-[#4ade80] px-2.5 py-0.5 rounded-md font-bold text-[10px]">
                  {student.tag}
                </span>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={onLogout}
          className="py-2.5 px-5 bg-[#171f33] hover:bg-rose-500/20 text-rose-300 hover:text-rose-200 rounded-full text-xs font-bold border border-white/10 flex items-center gap-2 transition-all self-start sm:self-center cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Sair da Conta</span>
        </button>
      </div>

      {/* Toast Banner on Submission */}
      {submissionSuccessMsg && (
        <div className="p-4 bg-[#4ade80]/20 border border-[#4ade80]/40 rounded-2xl text-xs text-[#4ade80] font-bold flex items-center gap-3 shadow-lg animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{submissionSuccessMsg}</span>
        </div>
      )}

      {/* Main 3 Abas Navigation */}
      <div className="flex items-center gap-2 bg-[#131b2e] p-1.5 rounded-2xl border border-white/10">
        <button
          onClick={() => setActiveTab('atividades')}
          className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'atividades'
              ? 'bg-[#4ade80] text-[#003919] shadow-md'
              : 'text-[#bccabb] hover:text-white hover:bg-white/5'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Atividades a Fazer</span>
          {pendingActivities.length > 0 && (
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                activeTab === 'atividades'
                  ? 'bg-[#003919] text-[#4ade80]'
                  : 'bg-[#4ade80] text-[#003919]'
              }`}
            >
              {pendingActivities.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('correcoes')}
          className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'correcoes'
              ? 'bg-[#4ade80] text-[#003919] shadow-md'
              : 'text-[#bccabb] hover:text-white hover:bg-white/5'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>Correções e Notas</span>
          {submittedActivities.length > 0 && (
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                activeTab === 'correcoes'
                  ? 'bg-[#003919] text-[#4ade80]'
                  : 'bg-[#171f33] text-white border border-white/10'
              }`}
            >
              {submittedActivities.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('arquivos')}
          className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'arquivos'
              ? 'bg-[#4ade80] text-[#003919] shadow-md'
              : 'text-[#bccabb] hover:text-white hover:bg-white/5'
          }`}
        >
          <FolderDown className="w-4 h-4" />
          <span>Arquivos (Google Drive)</span>
          {studentLibraryFiles.length > 0 && (
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                activeTab === 'arquivos'
                  ? 'bg-[#003919] text-[#4ade80]'
                  : 'bg-[#171f33] text-[#bccabb]'
              }`}
            >
              {studentLibraryFiles.length}
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: ATIVIDADES A FAZER */}
      {activeTab === 'atividades' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-[#4ade80]" />
              <span>Atividades Disponíveis</span>
            </h2>
            <span className="text-xs text-[#bccabb]">
              Total pendente: <strong>{pendingActivities.length}</strong>
            </span>
          </div>

          {pendingActivities.length === 0 ? (
            <div className="glass-panel p-12 text-center rounded-3xl border border-white/10 text-[#bccabb] space-y-3 shadow-xl">
              <div className="w-16 h-16 bg-[#4ade80]/10 border border-[#4ade80]/30 rounded-2xl flex items-center justify-center mx-auto text-[#4ade80] text-2xl font-black">
                🍃
              </div>
              <p className="text-base font-extrabold text-white">Nenhuma Missão Pendente na Vila da Folha!</p>
              <p className="text-xs text-[#bccabb] max-w-md mx-auto leading-relaxed">
                Dattebayo! Você concluiu todos os pergaminhos e treinos de Sociologia para a turma <strong className="text-white">{student.turma}</strong>. Descanse no Ichiraku Lamen enquanto o Sensei prepara novas missões! 🍜
              </p>
              <p className="text-[11px] font-semibold text-[#4ade80] pt-2">
                Confira o resultado dos seus jutsus e notas na aba &ldquo;Correções e Notas&rdquo;.
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              {pendingActivities.map((act) => {
                const distribution = getActivityGradeDistribution(act);
                const questions = act.questions || [];
                const objectiveQuestions = questions.filter((q) => q.type === 'multiple_choice') as (ActivityQuestion & MultipleChoiceQuestion)[];
                const essayQuestions = questions.filter((q) => q.type === 'essay') as (ActivityQuestion & EssayQuestion)[];

                const existingSub = act.submissions.find(
                  (s) => s.studentId === student.id || s.studentName === student.fullName
                );

                return (
                  <div
                    key={act.id}
                    className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 space-y-6 shadow-xl relative overflow-hidden"
                  >
                    {/* Banner if activity was returned for re-do */}
                    {existingSub && existingSub.status === 'returned' && (
                      <div className="bg-amber-500/20 border border-amber-500/40 p-4 rounded-2xl text-xs text-amber-200 flex items-start gap-3 shadow-lg">
                        <RotateCcw className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <p className="font-extrabold text-amber-300 text-sm">
                            ⚠️ Atividade Devolvida pelo Professor para Refazer!
                          </p>
                          {existingSub.teacherFeedback ? (
                            <p className="text-white">
                              <strong>Orientações / Observações do Sensei:</strong> &ldquo;{existingSub.teacherFeedback}&rdquo;
                            </p>
                          ) : (
                            <p className="text-[#bccabb]">
                              Ajuste suas respostas e envie o pergaminho novamente para nova avaliação.
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Activity Top Bar */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
                      <div>
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className="text-[11px] font-extrabold bg-[#4ade80]/20 text-[#4ade80] px-3 py-1 rounded-full border border-[#4ade80]/30 uppercase tracking-wide">
                            {act.type}
                          </span>
                          <span className="text-[11px] font-semibold text-[#bccabb] flex items-center gap-1 bg-[#171f33] px-3 py-1 rounded-full border border-white/10">
                            <Clock className="w-3.5 h-3.5 text-amber-400" />
                            <span>Prazo: {act.deadline}</span>
                          </span>
                          <span className="text-[11px] font-bold text-white bg-[#171f33] px-3 py-1 rounded-full border border-white/10">
                            Nota Máxima: {distribution.maxGrade.toFixed(1)} pts
                          </span>
                        </div>
                        <h3 className="text-2xl font-black text-white">{act.title}</h3>
                      </div>
                    </div>

                    {/* Grade Distribution Rule Banner (REGRA 50% / 50%) */}
                    <div className="bg-[#131b2e] p-4 rounded-2xl border border-[#4ade80]/30 flex items-start gap-3 text-xs text-[#dae2fd]">
                      <Sparkles className="w-5 h-5 text-[#4ade80] shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-white">
                          Regra de Pontuação da Atividade:
                        </p>
                        <p className="text-[#bccabb] mt-0.5">
                          {distribution.distributionLabel}.
                        </p>
                        <p className="text-[11px] text-[#4ade80] font-semibold mt-1">
                          ⚡ As questões objetivas têm correção automática instantânea ao enviar. A parte dissertativa é corrigida pelo professor.
                        </p>
                      </div>
                    </div>

                    {/* Description / Statement / Support Material */}
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-xs font-bold text-[#bccabb] uppercase tracking-wider mb-1">
                          Orientações do Professor:
                        </h4>
                        <p className="text-xs text-[#dae2fd] leading-relaxed bg-[#171f33]/60 p-4 rounded-2xl border border-white/5">
                          {act.description}
                        </p>
                      </div>

                      {act.supportMaterial && (
                        <div className="bg-[#171f33] p-4 rounded-2xl border border-white/10 space-y-2">
                          <h5 className="text-xs font-bold text-[#c0c1ff] flex items-center gap-1.5">
                            <BookOpen className="w-4 h-4 text-[#4ade80]" />
                            <span>Texto de Apoio / Leitura Obrigatória:</span>
                          </h5>
                          <p className="text-xs text-[#bccabb] leading-relaxed italic whitespace-pre-wrap">
                            {act.supportMaterial}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* PARTE 1: QUESTÕES OBJETIVAS */}
                    {objectiveQuestions.length > 0 && (
                      <div className="space-y-4 pt-2 border-t border-white/10">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-bold text-white flex items-center gap-2">
                            <HelpCircle className="w-4 h-4 text-[#4ade80]" />
                            <span>Parte 1: Questões Objetivas (Múltipla Escolha)</span>
                          </h4>
                          <span className="text-xs font-bold text-[#4ade80] bg-[#4ade80]/10 px-2.5 py-0.5 rounded-full border border-[#4ade80]/20">
                            Vale {distribution.maxObjectiveGrade.toFixed(1)} pts
                          </span>
                        </div>

                        <div className="space-y-6">
                          {objectiveQuestions.map((q, qIndex) => {
                            const studentChoices = objectiveInputs[act.id] || {};
                            const currentChoice = studentChoices[q.id];

                            return (
                              <div
                                key={q.id || qIndex}
                                className="bg-[#131b2e] p-5 rounded-2xl border border-white/10 space-y-3"
                              >
                                <p className="text-xs font-bold text-white">
                                  Questão {qIndex + 1}: <span className="font-normal text-[#dae2fd]">{q.statement}</span>
                                </p>

                                <div className="space-y-2 pt-1">
                                  {q.options.map((optText, optIdx) => {
                                    const letters = ['A', 'B', 'C', 'D'];
                                    const isSelected = currentChoice === optIdx;

                                    return (
                                      <button
                                        key={optIdx}
                                        type="button"
                                        onClick={() => handleSelectOption(act.id, q.id, optIdx)}
                                        className={`w-full text-left p-3.5 rounded-xl text-xs transition-all flex items-start gap-3 border cursor-pointer ${
                                          isSelected
                                            ? 'bg-[#4ade80]/20 border-[#4ade80] text-white font-bold'
                                            : 'bg-[#171f33] border-white/5 text-[#bccabb] hover:bg-[#222a3d] hover:text-white'
                                        }`}
                                      >
                                        <span
                                          className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold ${
                                            isSelected
                                              ? 'bg-[#4ade80] text-[#003919]'
                                              : 'bg-white/10 text-white'
                                          }`}
                                        >
                                          {letters[optIdx]}
                                        </span>
                                        <span className="mt-0.5 leading-relaxed">{optText}</span>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* PARTE 2: QUESTÃO DISSERTATIVA */}
                    {(essayQuestions.length > 0 || distribution.hasEssay) && (
                      <div className="space-y-4 pt-2 border-t border-white/10">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-bold text-white flex items-center gap-2">
                            <FileText className="w-4 h-4 text-[#4ade80]" />
                            <span>Parte 2: Produção Textual / Resposta Dissertativa</span>
                          </h4>
                          <span className="text-xs font-bold text-[#4ade80] bg-[#4ade80]/10 px-2.5 py-0.5 rounded-full border border-[#4ade80]/20">
                            Vale {distribution.maxEssayGrade.toFixed(1)} pts
                          </span>
                        </div>

                        {essayQuestions.map((eq, eqIdx) => (
                          <div key={eq.id || eqIdx} className="bg-[#131b2e] p-4 rounded-2xl border border-white/10 space-y-2">
                            <p className="text-xs font-semibold text-white">{eq.statement}</p>
                            {eq.keywords && (
                              <p className="text-[11px] text-[#bccabb]">
                                Palavras-chave sugeridas: <span className="text-[#4ade80] font-bold">{eq.keywords}</span>
                              </p>
                            )}
                          </div>
                        ))}

                        <div className="space-y-2">
                          <label className="block text-xs font-bold text-[#dae2fd]">
                            Sua Resposta Dissertativa:
                          </label>
                          <textarea
                            rows={5}
                            value={essayInputs[act.id] !== undefined ? essayInputs[act.id] : (existingSub?.essayAnswer || '')}
                            onChange={(e) =>
                              setEssayInputs({ ...essayInputs, [act.id]: e.target.value })
                            }
                            placeholder="Escreva aqui sua resposta com argumentação fundamentada nos conceitos da disciplina..."
                            className="w-full bg-[#131b2e] border border-white/10 rounded-2xl p-4 text-xs text-white placeholder-[#869486] focus:outline-none focus:border-[#4ade80] leading-relaxed"
                          />
                        </div>
                      </div>
                    )}

                    {/* SUBMIT BUTTON */}
                    <div className="pt-4 border-t border-white/10 flex justify-end">
                      <button
                        onClick={() => handleSubmit(act)}
                        className="py-3.5 px-8 bg-[#4ade80] hover:bg-[#6bfb9a] text-[#003919] font-black rounded-full text-xs flex items-center gap-2 transition-all shadow-xl shadow-[#4ade80]/20 cursor-pointer"
                      >
                        <Send className="w-4 h-4 stroke-[2.5]" />
                        <span>Enviar Resposta da Atividade</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: CORREÇÕES E NOTAS */}
      {activeTab === 'correcoes' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <Award className="w-5 h-5 text-[#4ade80]" />
              <span>Suas Entregas e Notas</span>
            </h2>
            <span className="text-xs text-[#bccabb]">
              Entregas realizadas: <strong>{submittedActivities.length}</strong>
            </span>
          </div>

          {submittedActivities.length === 0 ? (
            <div className="glass-panel p-12 text-center rounded-3xl border border-white/10 text-[#bccabb] space-y-3 shadow-xl">
              <div className="w-16 h-16 bg-[#c0c1ff]/10 border border-[#c0c1ff]/30 rounded-2xl flex items-center justify-center mx-auto text-[#c0c1ff] text-2xl font-black">
                📜
              </div>
              <p className="text-base font-extrabold text-white">Nenhum Pergaminho de Treino Entregue Ainda!</p>
              <p className="text-xs text-[#bccabb] max-w-md mx-auto leading-relaxed">
                Você ainda não entregou nenhum pergaminho para avaliação do Sensei. Acesse a aba <strong>&ldquo;Atividades a Fazer&rdquo;</strong>, concentre seu chakra e envie suas respostas! ⚡
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {submittedActivities.map((act) => {
                const sub = act.submissions.find(
                  (s) => s.studentId === student.id || s.studentName === student.fullName
                );
                if (!sub) return null;

                const distribution = getActivityGradeDistribution(act);
                const isGraded = sub.status === 'graded';
                const totalScore = (sub.objectiveScore || 0) + (sub.essayScore || 0);

                return (
                  <div
                    key={act.id}
                    className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 space-y-6 shadow-xl"
                  >
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[11px] font-bold bg-[#4ade80]/20 text-[#4ade80] px-3 py-0.5 rounded-full border border-[#4ade80]/30">
                            {act.type}
                          </span>
                          <span className="text-[11px] text-[#bccabb]">
                            Prazo: {act.deadline}
                          </span>
                        </div>
                        <h3 className="text-2xl font-bold text-white">{act.title}</h3>
                      </div>

                      <div className="bg-[#131b2e] px-5 py-3 rounded-2xl border border-[#4ade80]/30 text-center shrink-0">
                        <span className="text-[10px] font-bold text-[#bccabb] block uppercase tracking-wider">
                          Sua Nota Final
                        </span>
                        <span className="text-2xl font-black text-[#4ade80]">
                          {totalScore.toFixed(1)} <span className="text-sm font-normal text-[#bccabb]">/ {distribution.maxGrade.toFixed(1)}</span>
                        </span>
                      </div>
                    </div>

                    {/* Grade Detailed Breakdown */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Objective Score (Saiu na Hora) */}
                      <div className="bg-[#131b2e] p-4 rounded-2xl border border-white/10 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[#4ade80] flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Parte Objetiva (Automática):</span>
                          </span>
                          <span className="text-sm font-black text-white">
                            {sub.objectiveScore.toFixed(1)} / {sub.maxObjectiveScore.toFixed(1)} pts
                          </span>
                        </div>
                        <p className="text-[11px] text-[#bccabb]">
                          ⚡ Nota calculada instantaneamente no momento do envio.
                        </p>
                      </div>

                      {/* Essay Score (Aguardando ou Corrigida) */}
                      <div className="bg-[#131b2e] p-4 rounded-2xl border border-white/10 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[#c0c1ff] flex items-center gap-1.5">
                            <FileText className="w-4 h-4" />
                            <span>Parte Dissertativa:</span>
                          </span>
                          {isGraded || sub.essayScore !== undefined ? (
                            <span className="text-sm font-black text-white">
                              {(sub.essayScore || 0).toFixed(1)} / {sub.maxEssayScore.toFixed(1)} pts
                            </span>
                          ) : (
                            <span className="text-[11px] font-bold bg-amber-500/20 text-amber-300 px-2.5 py-0.5 rounded-full border border-amber-500/30">
                              Aguardando Professor
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[#bccabb]">
                          {isGraded
                            ? 'Correção realizada e finalizada pelo professor.'
                            : 'A resposta foi enviada e aguarda a avaliação final do professor.'}
                        </p>
                      </div>
                    </div>

                    {/* Student Essay Response display */}
                    {sub.essayAnswer && (
                      <div className="bg-[#171f33] p-4 rounded-2xl border border-white/5 space-y-1">
                        <span className="text-xs font-bold text-[#bccabb] block">
                          Sua Resposta Enviada:
                        </span>
                        <p className="text-xs text-[#dae2fd] italic leading-relaxed whitespace-pre-wrap">
                          &ldquo;{sub.essayAnswer}&rdquo;
                        </p>
                      </div>
                    )}

                    {/* Teacher Feedback */}
                    {sub.teacherFeedback ? (
                      <div className="bg-[#131b2e] p-5 rounded-2xl border border-[#4ade80]/30 space-y-2">
                        <span className="text-xs font-bold text-[#4ade80] flex items-center gap-2">
                          <MessageSquare className="w-4 h-4" />
                          <span>Feedback e Diagnóstico do Professor:</span>
                        </span>
                        <p className="text-xs text-white leading-relaxed">
                          {sub.teacherFeedback}
                        </p>
                      </div>
                    ) : (
                      <div className="text-xs text-[#bccabb] italic bg-[#171f33]/40 p-3 rounded-xl border border-white/5">
                        O professor ainda não publicou parecer textual adicional para esta entrega.
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: ARQUIVOS */}
      {activeTab === 'arquivos' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <FolderDown className="w-5 h-5 text-[#4ade80]" />
              <span>Arquivos e Materiais Didáticos</span>
            </h2>
          </div>

          {studentLibraryFiles.length === 0 ? (
            <div className="glass-panel p-12 text-center rounded-3xl border border-white/10 text-[#bccabb] space-y-3 shadow-xl">
              <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-center mx-auto text-amber-400 text-2xl font-black">
                🌀
              </div>
              <p className="text-base font-extrabold text-white">Biblioteca do Clã sem Arquivos!</p>
              <p className="text-xs text-[#bccabb] max-w-md mx-auto leading-relaxed">
                Nenhum pergaminho ou documento foi liberado para sua turma ainda. Fique atento aos novos lançamentos do Sensei!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {studentLibraryFiles.map((file) => {
                const driveUrl = file.driveUrl || 'https://drive.google.com/';

                return (
                  <div
                    key={file.id}
                    className="glass-panel p-5 rounded-3xl border border-white/10 flex items-center justify-between gap-4 glass-panel-hover"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-2xl bg-[#171f33] border border-white/10 text-[#4ade80] flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                      <h3 className="text-base font-bold text-white">{file.title}</h3>
                    </div>

                    <a
                      href={driveUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-2.5 px-6 bg-[#4ade80] hover:bg-[#6bfb9a] text-[#003919] font-extrabold rounded-full text-xs transition-all shadow-md flex items-center gap-2 shrink-0 cursor-pointer"
                      title="Baixar arquivo"
                    >
                      <Download className="w-4 h-4 stroke-[2.5]" />
                      <span>Baixar</span>
                    </a>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
