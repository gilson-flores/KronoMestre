'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  HeartHandshake,
  UserPlus,
  Trash2,
  ShieldCheck,
  Mail,
  Phone,
  BookOpen,
  School,
  Smartphone,
  CheckCircle2,
  Clock,
  RotateCcw,
  Sparkles,
  Search,
  Eye,
  PenTool,
  Gamepad2,
  Star,
  ExternalLink,
  Link2,
  Check,
  AlertCircle,
  HelpCircle,
  User,
  ArrowLeft,
  GraduationCap
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import {
  TeacherUser,
  StudentUser,
  Activity,
  UserRole,
  ActivityQuestion,
  MultipleChoiceQuestion,
  EssayQuestion
} from '@/lib/types';
import { NewSecondTeacherModal } from '@/components/modals/NewSecondTeacherModal';
import {
  canStudentAccessActivity,
  getActivityGradeDistribution,
  isStudentPNE
} from '@/lib/studentUtils';

interface SecondTeachersViewProps {
  teacher: TeacherUser;
  currentUserRole?: UserRole;
  students?: StudentUser[];
  activities?: Activity[];
  onSubmitAnswer?: (
    activityId: string,
    studentId: string,
    essayAnswer: string,
    objectiveScore: number,
    maxObjectiveScore: number,
    maxEssayScore: number,
    selectedObjectiveAnswers?: { [questionId: string]: number },
    groupMembers?: string
  ) => Promise<void> | void;
}

export const SecondTeachersView: React.FC<SecondTeachersViewProps> = ({
  teacher,
  currentUserRole = 'second_teacher',
  students = [],
  activities = [],
  onSubmitAnswer,
}) => {
  // Main view tab: 'atividades_alunos' (Alunos e Atividades Adaptadas) | 'professores_apoio' (Cadastro de 2º Professores)
  const isSecondTeacher = currentUserRole === 'second_teacher';
  const [activeTab, setActiveTab] = useState<'atividades_alunos' | 'professores_apoio'>('atividades_alunos');

  // Second teachers list state (for regente view)
  const [secondTeachers, setSecondTeachers] = useState<TeacherUser[]>([]);
  const [isLoadingTeachers, setIsLoadingTeachers] = useState(true);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Search & Filter for students
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  // Selected Activity for mobile assist solving
  const [executingActivityId, setExecutingActivityId] = useState<string | null>(null);
  const [viewingActivityDetailId, setViewingActivityDetailId] = useState<string | null>(null);

  // Answers state while solving with the student
  const [essayInput, setEssayInput] = useState<string>('');
  const [objectiveInputs, setObjectiveInputs] = useState<{ [questionId: string]: number }>({});
  const [playfulScore, setPlayfulScore] = useState<{ score: number; maxScore: number; grade: number } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionFeedback, setSubmissionFeedback] = useState<string | null>(null);

  // Fetch second teachers
  const fetchSecondTeachers = async () => {
    setIsLoadingTeachers(true);
    if (!supabase) return;

    try {
      const { data, error } = await supabase
        .from('second_teachers')
        .select('*')
        .order('name');

      if (error) {
        console.error('Erro ao buscar 2º professores:', error);
        if (error.code === 'PGRST205') {
          setErrorMsg('A tabela "second_teachers" não foi encontrada. Por favor, execute a migration SQL mais recente no painel do Supabase.');
        } else {
          setErrorMsg('Erro ao carregar lista de professores de apoio.');
        }
      } else if (data) {
        const formatted: TeacherUser[] = data.map((d) => ({
          id: d.id,
          name: d.name,
          email: d.email,
          subject: d.subject || 'AEE / Inclusão Escolar',
          avatarUrl: d.avatar_url || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=250',
          phone: d.phone || '',
          school: d.school || '',
        }));
        setSecondTeachers(formatted);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingTeachers(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchSecondTeachers();
  }, []);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Deseja realmente remover o acesso de ${name}?`)) return;

    if (!supabase) return;

    try {
      const { error } = await supabase.from('second_teachers').delete().eq('id', id);

      if (error) throw error;

      setSuccessMsg(`Professor ${name} removido com sucesso.`);
      fetchSecondTeachers();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Erro ao remover professor: ' + err.message);
      setTimeout(() => setErrorMsg(''), 3000);
    }
  };

  // Filter inclusion/PNE students
  // 1. Students bound to this second teacher OR all PNE students
  const boundOrPneStudents = useMemo(() => {
    return students.filter((s) => {
      const isBound =
        (s.secondTeacherId && s.secondTeacherId === teacher.id) ||
        (s.secondTeacherName && s.secondTeacherName.toLowerCase() === teacher.name?.toLowerCase());

      const isPne = isStudentPNE(s) || (s.pneConditions && s.pneConditions.length > 0);

      // If user is second_teacher, show bound students or all PNE students
      return isBound || isPne;
    });
  }, [students, teacher.id, teacher.name]);

  // Filtered by search query
  const filteredStudents = useMemo(() => {
    if (!studentSearch.trim()) return boundOrPneStudents;
    const q = studentSearch.toLowerCase().trim();
    return boundOrPneStudents.filter(
      (s) =>
        s.fullName.toLowerCase().includes(q) ||
        s.turma.toLowerCase().includes(q) ||
        (s.matricula && s.matricula.toLowerCase().includes(q)) ||
        (s.pneConditions && s.pneConditions.some((c) => c.toLowerCase().includes(q)))
    );
  }, [boundOrPneStudents, studentSearch]);

  const activeStudent = useMemo(() => {
    if (selectedStudentId) {
      const found = students.find((s) => s.id === selectedStudentId);
      if (found) return found;
    }
    return filteredStudents[0] || null;
  }, [students, selectedStudentId, filteredStudents]);

  // Adapted activities available for the active student
  const studentAdaptedActivities = useMemo(() => {
    if (!activeStudent) return [];

    return activities.filter((act) => {
      // 1. Must be accessible by student's class (turma)
      if (!canStudentAccessActivity(act.turma, activeStudent.turma)) {
        return false;
      }
      // 2. Prioritize adapted activities, but include all accessible if none specifically flagged
      return Boolean(act.isAdapted || act.adaptationType);
    });
  }, [activities, activeStudent]);

  // If no explicitly adapted activities exist for the class, show all activities of the class
  const displayedActivities = useMemo(() => {
    if (!activeStudent) return [];
    if (studentAdaptedActivities.length > 0) return studentAdaptedActivities;
    return activities.filter((act) => canStudentAccessActivity(act.turma, activeStudent.turma));
  }, [studentAdaptedActivities, activities, activeStudent]);

  // Listen to playful game events from iframe
  useEffect(() => {
    const handleGameMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'PLAYFUL_GAME_COMPLETED') {
        const { score = 10, maxScore = 10, finalGrade } = event.data;
        const calcGrade =
          finalGrade !== undefined
            ? Number(finalGrade)
            : (Number(score) / (Number(maxScore) || 1)) * 10;

        setPlayfulScore({
          score: Number(score),
          maxScore: Number(maxScore),
          grade: Number(calcGrade.toFixed(1)),
        });
      }
    };

    window.addEventListener('message', handleGameMessage);
    return () => window.removeEventListener('message', handleGameMessage);
  }, []);

  // Open activity to solve with the student
  const handleStartSolving = (act: Activity) => {
    if (!activeStudent) return;
    setExecutingActivityId(act.id);
    setViewingActivityDetailId(null);
    setPlayfulScore(null);

    // Pre-populate if student already has a draft or submission
    const existingSub = act.submissions?.find(
      (s) => s.studentId === activeStudent.id || s.matricula === activeStudent.matricula
    );

    setEssayInput(existingSub?.essayAnswer || '');
    setObjectiveInputs(existingSub?.selectedObjectiveAnswers || {});
  };

  // Submit activity on behalf of the student
  const handleConfirmSubmit = async (act: Activity) => {
    if (!activeStudent || !onSubmitAnswer) return;

    setIsSubmitting(true);
    try {
      const distribution = getActivityGradeDistribution(act);
      const isPlayful = Boolean(act.playfulGameHtml || act.adaptationType === 'severe_playful');

      let calculatedObjectiveScore = 0;
      let calculatedEssayScore = 0;

      if (isPlayful) {
        const finalScore = playfulScore?.grade || act.maxGrade || 10;
        const maxScore = act.maxGrade || 10;

        await onSubmitAnswer(
          act.id,
          activeStudent.id,
          `Atividade Lúdica Adaptada concluída com apoio do 2º Professor (${teacher.name}).`,
          finalScore,
          maxScore,
          0,
          {},
          undefined
        );

        setSubmissionFeedback(`🎉 Atividade lúdica concluída com o(a) aluno(a) ${activeStudent.fullName}! Pontuação de ${finalScore.toFixed(1)} / ${maxScore} pts enviada para o ciclo de correção.`);
      } else {
        const questions = act.questions || [];
        const objectiveQuestions = questions.filter((q) => q.type === 'multiple_choice') as (ActivityQuestion & MultipleChoiceQuestion)[];

        let correctCount = 0;
        objectiveQuestions.forEach((q) => {
          const chosen = objectiveInputs[q.id];
          if (chosen !== undefined && chosen === q.correctOptionIndex) {
            correctCount += 1;
          }
        });

        if (objectiveQuestions.length > 0) {
          calculatedObjectiveScore = (correctCount / objectiveQuestions.length) * distribution.maxObjectiveGrade;
        } else if (distribution.hasObjective) {
          calculatedObjectiveScore = distribution.maxObjectiveGrade;
        }

        await onSubmitAnswer(
          act.id,
          activeStudent.id,
          essayInput,
          Number(calculatedObjectiveScore.toFixed(1)),
          Number(distribution.maxObjectiveGrade.toFixed(1)),
          Number(distribution.maxEssayGrade.toFixed(1)),
          objectiveInputs,
          undefined
        );

        setSubmissionFeedback(`✅ Atividade enviada com sucesso para ${activeStudent.fullName}! A atividade já está registrada no portal do aluno e na fila de correções do professor regente.`);
      }

      setExecutingActivityId(null);
      setTimeout(() => setSubmissionFeedback(null), 6000);
    } catch (err: any) {
      console.error('Erro ao enviar atividade:', err);
      alert('Erro ao enviar atividade: ' + (err?.message || 'Tente novamente.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const executingActivity = useMemo(() => {
    return activities.find((a) => a.id === executingActivityId) || null;
  }, [activities, executingActivityId]);

  return (
    <div className="space-y-8 animate-fadeIn max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-amber-400 tracking-widest uppercase flex items-center gap-1.5">
            <HeartHandshake className="w-4 h-4" />
            Atendimento Educacional Especializado (AEE)
          </span>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight mt-1">
            {isSecondTeacher ? 'Ambiente do 2º Professor' : 'Inclusão & 2º Professores'}
          </h1>
          <p className="text-xs sm:text-sm text-[#bccabb] mt-1">
            Acompanhe os estudantes de inclusão, execute atividades adaptadas em visão móvel e acompanhe o ciclo de correção.
          </p>
        </div>

        {/* Tab switcher for regente or quick actions */}
        <div className="flex items-center gap-2">
          {!isSecondTeacher && (
            <div className="flex bg-[#131b2e] p-1 rounded-2xl border border-white/10">
              <button
                onClick={() => setActiveTab('atividades_alunos')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'atividades_alunos'
                    ? 'bg-amber-400 text-black shadow-md'
                    : 'text-[#bccabb] hover:text-white'
                }`}
              >
                <Smartphone className="w-4 h-4" />
                <span>Alunos & Atividades</span>
              </button>
              <button
                onClick={() => setActiveTab('professores_apoio')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'professores_apoio'
                    ? 'bg-amber-400 text-black shadow-md'
                    : 'text-[#bccabb] hover:text-white'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Professores AEE ({secondTeachers.length})</span>
              </button>
            </div>
          )}

          {activeTab === 'professores_apoio' && (
            <button
              onClick={() => setIsNewModalOpen(true)}
              className="py-2.5 px-5 bg-amber-400 hover:bg-amber-300 text-black font-bold rounded-full transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-amber-400/20 cursor-pointer text-xs"
            >
              <UserPlus className="w-4 h-4 stroke-[2.5]" />
              <span>Novo 2º Professor</span>
            </button>
          )}
        </div>
      </div>

      {/* Global Status messages */}
      {errorMsg && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-2xl text-sm font-medium">
          {errorMsg}
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-[#4ade80]/20 border border-[#4ade80]/40 text-[#4ade80] rounded-2xl text-sm font-medium">
          {successMsg}
        </div>
      )}

      {submissionFeedback && (
        <div className="p-4 bg-[#4ade80]/20 border border-[#4ade80]/40 text-[#4ade80] rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-3 shadow-xl animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-[#4ade80]" />
          <span>{submissionFeedback}</span>
        </div>
      )}

      {/* TAB 1: ALUNOS & ATIVIDADES ADAPTADAS (AEE WORKSPACE) */}
      {activeTab === 'atividades_alunos' && (
        <div className="space-y-6">
          {/* Main Layout: Left Column (Student selector) + Right Column (Activities & Cellphone runner) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Lista de Alunos de Inclusão */}
            <div className="lg:col-span-4 space-y-4">
              <div className="glass-panel p-5 rounded-3xl border border-white/10 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                      <GraduationCap className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-sm">Alunos Vinculados</h3>
                      <p className="text-[11px] text-[#bccabb]">Estudantes com suporte e AEE</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 bg-amber-400/10 text-amber-400 border border-amber-400/20 rounded-full text-[10px] font-bold">
                    {filteredStudents.length} Alunos
                  </span>
                </div>

                {/* Search */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-[#bccabb] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    placeholder="Buscar por nome, turma, CID..."
                    className="w-full bg-[#131b2e] border border-white/10 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder:text-[#bccabb]/60 focus:outline-none focus:border-amber-400"
                  />
                </div>

                {/* Student list */}
                <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                  {filteredStudents.length === 0 ? (
                    <div className="py-8 text-center text-xs text-[#bccabb]">
                      Nenhum aluno de inclusão encontrado.
                    </div>
                  ) : (
                    filteredStudents.map((s) => {
                      const isSelected = activeStudent?.id === s.id;
                      const hasBound = s.secondTeacherId === teacher.id || s.secondTeacherName === teacher.name;

                      return (
                        <button
                          key={s.id}
                          onClick={() => {
                            setSelectedStudentId(s.id);
                            setExecutingActivityId(null);
                            setViewingActivityDetailId(null);
                          }}
                          className={`w-full text-left p-3 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                            isSelected
                              ? 'bg-amber-400/15 border-amber-400/50 shadow-md ring-1 ring-amber-400/30'
                              : 'bg-[#131b2e] border-white/5 hover:border-white/20 hover:bg-[#171f33]'
                          }`}
                        >
                          <div className="relative shrink-0">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={s.avatarUrl}
                              alt={s.fullName}
                              className="w-10 h-10 rounded-full object-cover border border-amber-400/40"
                            />
                            <span className="absolute -bottom-1 -right-1 px-1.5 py-0.2 bg-amber-400 text-black font-extrabold text-[8px] rounded-full">
                              PNE
                            </span>
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-1">
                              <h4 className="font-bold text-white text-xs truncate">{s.fullName}</h4>
                              <span className="text-[10px] text-amber-300 font-semibold shrink-0">
                                T: {s.turma}
                              </span>
                            </div>

                            {/* Conditions tags */}
                            <div className="flex flex-wrap gap-1 mt-1">
                              {s.pneConditions && s.pneConditions.length > 0 ? (
                                s.pneConditions.slice(0, 2).map((c, i) => (
                                  <span
                                    key={i}
                                    className="px-1.5 py-0.5 bg-white/5 border border-white/10 rounded text-[9px] text-[#dae2fd] truncate max-w-[120px]"
                                  >
                                    {c}
                                  </span>
                                ))
                              ) : (
                                <span className="text-[9px] text-[#bccabb]">Atendimento AEE</span>
                              )}
                              {hasBound && (
                                <span className="px-1.5 py-0.5 bg-emerald-500/20 border border-emerald-500/30 text-[#4ade80] rounded text-[8px] font-bold">
                                  Vinculado a Você
                                </span>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Active student info summary */}
              {activeStudent && (
                <div className="glass-panel p-4 rounded-3xl border border-white/10 space-y-2 text-xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                    Dados do Acompanhamento
                  </span>
                  <p className="text-white font-bold">{activeStudent.fullName}</p>
                  <p className="text-[#bccabb]">
                    Matrícula: <strong className="text-white">{activeStudent.matricula}</strong> | Turma: <strong className="text-white">{activeStudent.turma}</strong>
                  </p>
                  {activeStudent.pedagogicalNotes && (
                    <div className="mt-2 p-2.5 bg-[#131b2e] rounded-xl border border-white/5 text-[11px] text-[#bccabb] leading-relaxed">
                      <strong>Observações do PEI / Laudo:</strong> {activeStudent.pedagogicalNotes}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right Column: Atividades Adaptadas e Execução no Celular com o Aluno */}
            <div className="lg:col-span-8 space-y-6">
              {/* If an activity is currently being executed in mobile view with the student */}
              {executingActivity ? (
                <div className="glass-panel p-4 sm:p-6 rounded-3xl border-2 border-amber-400/40 space-y-6 shadow-2xl bg-[#0e162a]">
                  {/* Top Bar of Mobile Simulator */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setExecutingActivityId(null)}
                        className="py-2 px-3 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Voltar</span>
                      </button>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-amber-400/20 text-amber-300 border border-amber-400/30 rounded-full text-[10px] font-extrabold flex items-center gap-1">
                            <Smartphone className="w-3 h-3" />
                            Modo Celular com Aluno
                          </span>
                          <span className="text-xs text-white font-semibold truncate">
                            {activeStudent?.fullName}
                          </span>
                        </div>
                        <h2 className="text-lg font-black text-white mt-0.5">{executingActivity.title}</h2>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-[#4ade80] bg-[#4ade80]/10 px-3 py-1 rounded-full border border-[#4ade80]/30">
                        Valor: {getActivityGradeDistribution(executingActivity).maxGrade.toFixed(1)} pts
                      </span>
                    </div>
                  </div>

                  {/* Simulator Screen Container (Responsive Mobile Frame) */}
                  <div className="max-w-2xl mx-auto bg-[#131b2e] rounded-3xl border border-white/15 p-4 sm:p-6 space-y-6 shadow-inner">
                    {/* Device Header Banner */}
                    <div className="bg-[#171f33] p-3.5 rounded-2xl border border-white/10 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={activeStudent?.avatarUrl}
                          alt={activeStudent?.fullName}
                          className="w-8 h-8 rounded-full object-cover border border-amber-400"
                        />
                        <div>
                          <p className="font-bold text-white leading-tight">{activeStudent?.fullName}</p>
                          <p className="text-[10px] text-amber-400 font-semibold">
                            Turma {activeStudent?.turma} • Atividade Adaptada PNE
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full font-bold border border-amber-500/30">
                        Apoio AEE
                      </span>
                    </div>

                    {/* Description & Support Material */}
                    <div className="space-y-3">
                      <div>
                        <h4 className="text-[11px] font-bold text-[#bccabb] uppercase tracking-wider mb-1">
                          Orientações da Atividade:
                        </h4>
                        <p className="text-xs text-white leading-relaxed bg-[#0b1326] p-3.5 rounded-xl border border-white/5">
                          {executingActivity.description || 'Siga as orientações das questões abaixo com o estudante.'}
                        </p>
                      </div>

                      {executingActivity.supportMaterial && (
                        <div className="bg-[#0b1326] p-3.5 rounded-xl border border-white/10 space-y-1.5 text-xs text-[#bccabb]">
                          <h5 className="font-bold text-amber-300 flex items-center gap-1.5 text-xs">
                            <BookOpen className="w-3.5 h-3.5" />
                            <span>Material de Apoio e Leitura:</span>
                          </h5>
                          <p className="whitespace-pre-wrap leading-relaxed">{executingActivity.supportMaterial}</p>
                        </div>
                      )}
                    </div>

                    {/* JOGO LÚDICO INTERATIVO (Para Síndromes Severas) */}
                    {(executingActivity.playfulGameHtml || executingActivity.adaptationType === 'severe_playful') && (
                      <div className="space-y-4 pt-2 border-t border-amber-500/30">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h4 className="text-sm font-bold text-amber-300 flex items-center gap-1.5">
                            <Gamepad2 className="w-4 h-4 text-amber-400" />
                            <span>Jogo Lúdico Educativo Gamificado</span>
                          </h4>
                          {playfulScore ? (
                            <span className="px-3 py-1 bg-[#4ade80]/20 text-[#4ade80] font-bold text-xs rounded-full border border-[#4ade80]/30 flex items-center gap-1 animate-bounce">
                              <Star className="w-3.5 h-3.5 fill-[#4ade80]" />
                              Nota: {playfulScore.grade} / {executingActivity.maxGrade || 10} pts
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 bg-amber-500/20 text-amber-300 font-bold text-[10px] rounded-full border border-amber-500/30">
                              🌟 Jogue na tela com o aluno para pontuar
                            </span>
                          )}
                        </div>

                        <div className="w-full h-[460px] rounded-2xl overflow-hidden border-2 border-amber-500/40 shadow-xl bg-black relative">
                          <iframe
                            srcDoc={
                              executingActivity.playfulGameHtml ||
                              '<div style="color:white;padding:20px;font-family:sans-serif;">Carregando jogo...</div>'
                            }
                            title={`Jogo Lúdico - ${executingActivity.title}`}
                            className="w-full h-full border-0"
                            sandbox="allow-scripts allow-same-origin allow-modals"
                          />
                        </div>
                      </div>
                    )}

                    {/* QUESTÕES OBJETIVAS ADAPTADAS */}
                    {executingActivity.questions &&
                      executingActivity.questions.filter((q) => q.type === 'multiple_choice').length > 0 &&
                      !(executingActivity.playfulGameHtml || executingActivity.adaptationType === 'severe_playful') && (
                        <div className="space-y-4 pt-2 border-t border-white/10">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                              <HelpCircle className="w-4 h-4 text-[#4ade80]" />
                              <span>Questões Objetivas Adaptadas (Múltipla Escolha)</span>
                            </h4>
                            <span className="text-[10px] font-bold text-[#4ade80] bg-[#4ade80]/10 px-2 py-0.5 rounded-full border border-[#4ade80]/20">
                              Correção Automática
                            </span>
                          </div>

                          <div className="space-y-4">
                            {executingActivity.questions
                              .filter((q) => q.type === 'multiple_choice')
                              .map((q: any, qIdx: number) => {
                                const currentChoice = objectiveInputs[q.id];

                                return (
                                  <div
                                    key={q.id || qIdx}
                                    className="bg-[#0b1326] p-4 rounded-2xl border border-white/10 space-y-3"
                                  >
                                    <p className="text-xs font-bold text-white">
                                      {qIdx + 1}. <span className="text-[#dae2fd] font-normal">{q.statement}</span>
                                    </p>

                                    <div className="space-y-2 pt-1">
                                      {q.options?.map((optText: string, optIdx: number) => {
                                        const isSelected = currentChoice === optIdx;

                                        return (
                                          <button
                                            key={optIdx}
                                            type="button"
                                            onClick={() =>
                                              setObjectiveInputs((prev) => ({
                                                ...prev,
                                                [q.id]: optIdx,
                                              }))
                                            }
                                            className={`w-full text-left p-3 rounded-xl text-xs transition-all flex items-center gap-3 border cursor-pointer ${
                                              isSelected
                                                ? 'bg-amber-400/20 border-amber-400 text-white font-bold shadow-md'
                                                : 'bg-[#171f33] border-white/5 text-[#bccabb] hover:bg-[#222a3d] hover:text-white'
                                            }`}
                                          >
                                            <span
                                              className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-black ${
                                                isSelected
                                                  ? 'bg-amber-400 text-black'
                                                  : 'bg-white/10 text-white'
                                              }`}
                                            >
                                              {String.fromCharCode(65 + optIdx)}
                                            </span>
                                            <span className="flex-1 text-xs">{optText}</span>
                                            {isSelected && <Check className="w-4 h-4 text-amber-400 shrink-0" />}
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

                    {/* QUESTÕES DISSERTATIVAS ADAPTADAS */}
                    {executingActivity.questions &&
                      executingActivity.questions.filter((q) => q.type === 'essay').length > 0 && (
                        <div className="space-y-4 pt-2 border-t border-white/10">
                          <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                            <PenTool className="w-4 h-4 text-[#c0c1ff]" />
                            <span>Questão Dissertativa Adaptada</span>
                          </h4>

                          {executingActivity.questions
                            .filter((q) => q.type === 'essay')
                            .map((q: any, qIdx: number) => (
                              <div
                                key={q.id || qIdx}
                                className="bg-[#0b1326] p-4 rounded-2xl border border-white/10 space-y-2"
                              >
                                <p className="text-xs font-bold text-white">
                                  Enunciado: <span className="text-[#dae2fd] font-normal">{q.statement}</span>
                                </p>
                              </div>
                            ))}

                          <div className="space-y-1.5">
                            <label className="block text-[11px] font-bold text-[#bccabb]">
                              Resposta do Estudante (Digitada com auxílio do 2º Professor):
                            </label>
                            <textarea
                              rows={4}
                              value={essayInput}
                              onChange={(e) => setEssayInput(e.target.value)}
                              placeholder="Digite a resposta formulada com o estudante durante a mediação..."
                              className="w-full bg-[#0b1326] border border-white/15 rounded-2xl p-4 text-xs text-white placeholder:text-[#bccabb]/50 focus:outline-none focus:border-amber-400 leading-relaxed resize-y"
                            />
                          </div>
                        </div>
                      )}

                    {/* Submit Actions */}
                    <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
                      <button
                        onClick={() => setExecutingActivityId(null)}
                        className="w-full sm:w-auto py-2.5 px-5 bg-white/5 hover:bg-white/10 text-[#bccabb] hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer border border-white/5"
                      >
                        Cancelar
                      </button>

                      <button
                        disabled={isSubmitting}
                        onClick={() => handleConfirmSubmit(executingActivity)}
                        className="w-full sm:w-auto py-3 px-7 bg-amber-400 hover:bg-amber-300 text-black font-extrabold text-xs rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-amber-400/20 disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>{isSubmitting ? 'Enviando...' : 'Concluir e Enviar Atividade com o Aluno'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* Atividades listadas para o aluno selecionado */
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h3 className="text-xl font-extrabold text-white flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-amber-400" />
                        <span>Atividades Adaptadas para {activeStudent?.fullName}</span>
                      </h3>
                      <p className="text-xs text-[#bccabb] mt-0.5">
                        Turma <strong className="text-white">{activeStudent?.turma}</strong> • Atividades disponíveis para resolução assistida
                      </p>
                    </div>
                  </div>

                  {displayedActivities.length === 0 ? (
                    <div className="glass-panel p-12 rounded-3xl border border-white/10 text-center space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto text-amber-400">
                        <Sparkles className="w-6 h-6" />
                      </div>
                      <h4 className="font-bold text-white text-base">Nenhuma Atividade Encontrada para esta Turma</h4>
                      <p className="text-xs text-[#bccabb] max-w-md mx-auto">
                        O professor regente ainda não publicou atividades para a turma {activeStudent?.turma}. Assim que forem disponibilizadas ou adaptadas pela IA, elas aparecerão aqui automaticamente.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4">
                      {displayedActivities.map((act) => {
                        const sub = act.submissions?.find(
                          (s) =>
                            s.studentId === activeStudent?.id ||
                            s.matricula === activeStudent?.matricula ||
                            s.studentName === activeStudent?.fullName
                        );

                        const isPending = !sub || sub.status === 'returned' || sub.status === 'draft';
                        const isToCorrect = sub && sub.status === 'pending';
                        const isGraded = sub && sub.status === 'graded';
                        const isReturned = sub && sub.status === 'returned';

                        const totalScore = sub && isGraded ? (sub.objectiveScore || 0) + (sub.essayScore || 0) : null;
                        const distribution = getActivityGradeDistribution(act);

                        return (
                          <div
                            key={act.id}
                            className="glass-panel p-5 sm:p-6 rounded-3xl border border-white/10 hover:border-amber-400/40 transition-all space-y-4 shadow-xl"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                              <div className="space-y-2 max-w-2xl">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-[10px] font-extrabold bg-amber-400/20 text-amber-300 px-3 py-0.5 rounded-full border border-amber-400/30 uppercase tracking-wide">
                                    {act.isAdapted ? '✨ Adaptada PNE' : act.type}
                                  </span>

                                  {act.adaptationType === 'severe_playful' && (
                                    <span className="text-[10px] font-extrabold bg-purple-500/20 text-purple-300 px-2.5 py-0.5 rounded-full border border-purple-500/30">
                                      🎮 Jogo Gamificado
                                    </span>
                                  )}

                                  <span className="text-[11px] font-bold text-amber-300 flex items-center gap-1 bg-[#131b2e] px-3 py-0.5 rounded-full border border-amber-500/30">
                                    <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                    <span>Prazo: {act.deadline || 'Sem data'}</span>
                                  </span>

                                  {/* Status Badges */}
                                  {isPending && (
                                    <span className="text-[10px] font-extrabold bg-amber-500/20 text-amber-300 px-2.5 py-0.5 rounded-full border border-amber-500/40">
                                      📜 A Fazer
                                    </span>
                                  )}
                                  {isToCorrect && (
                                    <span className="text-[10px] font-extrabold bg-sky-500/20 text-sky-300 px-2.5 py-0.5 rounded-full border border-sky-500/40">
                                      ⏳ Aguardando Correção do Professor Regente
                                    </span>
                                  )}
                                  {isGraded && (
                                    <span className="text-[10px] font-extrabold bg-emerald-500/20 text-[#4ade80] px-2.5 py-0.5 rounded-full border border-emerald-500/40">
                                      ✅ Corrigida (Nota: {totalScore !== null ? totalScore.toFixed(1) : 0} / {distribution.maxGrade || 10} pts)
                                    </span>
                                  )}
                                  {isReturned && (
                                    <span className="text-[10px] font-extrabold bg-rose-500/20 text-rose-300 px-2.5 py-0.5 rounded-full border border-rose-500/40">
                                      ↩️ Devolvida para Ajuste
                                    </span>
                                  )}
                                </div>

                                <h4 className="text-lg font-bold text-white tracking-tight">{act.title}</h4>
                                {act.description && (
                                  <p className="text-xs text-[#bccabb] line-clamp-2 leading-relaxed">{act.description}</p>
                                )}

                                <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#bccabb] pt-1">
                                  <span>Turma: <strong className="text-white">{act.turma}</strong></span>
                                  <span>•</span>
                                  <span>Questões: <strong className="text-white">{act.questions?.length || 0}</strong></span>
                                  <span>•</span>
                                  <span>Valor: <strong className="text-white">{distribution.maxGrade.toFixed(1)} pts</strong></span>
                                </div>

                                {/* Feedback from teacher if graded or returned */}
                                {sub && (sub.teacherFeedback || isGraded) && (
                                  <div className="mt-3 p-3 bg-[#131b2e] rounded-2xl border border-white/10 space-y-1 text-xs">
                                    <div className="flex items-center justify-between">
                                      <span className="font-bold text-[#4ade80] text-[11px]">
                                        Parecer do Professor Regente ({teacher.name}):
                                      </span>
                                      {isGraded && (
                                        <span className="font-black text-white text-xs bg-[#4ade80]/20 px-2 py-0.5 rounded-full border border-[#4ade80]/30">
                                          Nota: {totalScore !== null ? totalScore.toFixed(1) : 0} pts
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-[#dae2fd] text-[11px] leading-relaxed italic">
                                      &ldquo;{sub.teacherFeedback || 'Atividade avaliada e registrada no diário de classe.'}&rdquo;
                                    </p>
                                  </div>
                                )}
                              </div>

                              {/* Action Buttons */}
                              <div className="shrink-0 flex flex-col gap-2 pt-2 sm:pt-0">
                                <button
                                  onClick={() => handleStartSolving(act)}
                                  className="py-3 px-5 bg-amber-400 hover:bg-amber-300 text-black font-extrabold text-xs rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-amber-400/20 active:scale-95"
                                >
                                  <Smartphone className="w-4 h-4" />
                                  <span>
                                    {isPending ? 'Fazer no Celular com o Aluno' : 'Refazer / Editar Resposta'}
                                  </span>
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CADASTRO DE 2º PROFESSORES (REGENTE / ADMIN) */}
      {activeTab === 'professores_apoio' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">Professores de Apoio (AEE) Cadastrados</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {isLoadingTeachers ? (
              <div className="col-span-full py-12 text-center text-[#bccabb]">Carregando profissionais...</div>
            ) : secondTeachers.length === 0 ? (
              <div className="col-span-full glass-panel p-8 rounded-3xl border border-white/10 text-center flex flex-col items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-4 text-amber-400">
                  <HeartHandshake className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Nenhum 2º Professor Cadastrado</h3>
                <p className="text-sm text-[#bccabb] max-w-md mx-auto mb-6">
                  Adicione profissionais de Atendimento Educacional Especializado (AEE) para auxiliarem no acompanhamento de alunos de inclusão.
                </p>
                <button
                  onClick={() => setIsNewModalOpen(true)}
                  className="py-2.5 px-6 bg-white/5 hover:bg-white/10 text-white font-bold rounded-full border border-white/10 transition-all text-sm cursor-pointer"
                >
                  Cadastrar Agora
                </button>
              </div>
            ) : (
              secondTeachers.map((st) => (
                <div
                  key={st.id}
                  className="glass-panel p-5 rounded-3xl border border-white/10 flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-amber-500/30 shadow-md">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={st.avatarUrl} alt={st.name} className="w-full h-full object-cover" />
                      </div>
                      <span className="flex items-center gap-1 bg-amber-500/10 text-amber-400 px-2.5 py-1 rounded-full text-[10px] font-bold border border-amber-500/20">
                        <ShieldCheck className="w-3 h-3" /> AEE
                      </span>
                    </div>
                    <h3 className="font-bold text-white text-lg mb-1 truncate">{st.name}</h3>

                    <div className="space-y-2 mt-4">
                      <div className="flex items-center gap-2 text-xs text-[#bccabb]">
                        <Mail className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{st.email}</span>
                      </div>
                      {st.phone && (
                        <div className="flex items-center gap-2 text-xs text-[#bccabb]">
                          <Phone className="w-3.5 h-3.5 shrink-0" />
                          <span>{st.phone}</span>
                        </div>
                      )}
                      {st.subject && (
                        <div className="flex items-center gap-2 text-xs text-[#bccabb]">
                          <BookOpen className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{st.subject}</span>
                        </div>
                      )}
                      {st.school && (
                        <div className="flex items-center gap-2 text-xs text-[#bccabb]">
                          <School className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{st.school}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-white/10 flex justify-end">
                    <button
                      onClick={() => handleDelete(st.id, st.name)}
                      className="p-2 text-rose-400 hover:text-white hover:bg-rose-500 rounded-xl transition-all cursor-pointer"
                      title="Remover acesso"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <NewSecondTeacherModal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        defaultSchool={teacher.school}
        onCreateSecondTeacher={() => {
          setSuccessMsg('Professor cadastrado com sucesso!');
          fetchSecondTeachers();
          setTimeout(() => setSuccessMsg(''), 3000);
        }}
      />
    </div>
  );
};
