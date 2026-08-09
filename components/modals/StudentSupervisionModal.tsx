'use client';

import React, { useState } from 'react';
import {
  X,
  ShieldCheck,
  Award,
  BookOpen,
  Clock,
  RotateCcw,
  MessageSquare,
  Printer,
  FileText,
  CheckCircle2,
  AlertTriangle,
  User,
  TrendingUp,
  BarChart2,
  Save,
  Check,
  FileCheck2,
  Lock,
} from 'lucide-react';
import { StudentUser, Activity, ActivitySubmission } from '@/lib/types';
import { getTurmaLabel } from '@/lib/studentUtils';
import {
  canEmitDossier,
  emitNewDossier,
  getDossierIssuances,
  DossierIssuanceRecord,
} from '@/lib/dossierStorage';

interface StudentSupervisionModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: StudentUser | null;
  activities: Activity[];
  onSendMessage?: (student: StudentUser) => void;
}

export const StudentSupervisionModal: React.FC<StudentSupervisionModalProps> = ({
  isOpen,
  onClose,
  student,
  activities,
  onSendMessage,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'relatorio' | 'atividades' | 'anotacoes'>('relatorio');
  const [teacherNotes, setTeacherNotes] = useState('');
  const [isSavedNotes, setIsSavedNotes] = useState(false);

  // Dossier Proof Copy modal state
  const [selectedActivityForDossier, setSelectedActivityForDossier] = useState<Activity | null>(null);
  const [activeDossierRecord, setActiveDossierRecord] = useState<DossierIssuanceRecord | null>(null);
  const [limitAlert, setLimitAlert] = useState<{ activityTitle: string; count: number } | null>(null);

  if (!isOpen || !student) return null;

  // Filter activities assigned to this student's turma
  const studentActivities = activities.filter(
    (act) => !act.turma || act.turma === student.turma || act.turma === 'Todas'
  );

  // Submissions breakdown
  const studentSubmissions = studentActivities.map((act) => {
    const sub = act.submissions?.find(
      (s) => s.studentId === student.id || s.matricula === student.matricula || s.studentName === student.fullName
    );
    return {
      activity: act,
      submission: sub,
    };
  });

  const completedCount = studentSubmissions.filter((item) => item.submission && item.submission.status !== 'draft').length;
  const gradedSubmissions = studentSubmissions.filter((item) => item.submission && item.submission.status === 'graded');
  const returnedCount = studentSubmissions.reduce(
    (acc, item) => acc + (item.submission?.returnCount || (item.submission?.status === 'returned' ? 1 : 0)),
    0
  );

  // Grades calculation
  let totalObjectiveScore = 0;
  let totalEssayScore = 0;
  let maxPossibleScore = 0;
  let totalGradeEarned = 0;

  gradedSubmissions.forEach((item) => {
    const sub = item.submission!;
    const objScore = sub.objectiveScore || 0;
    const essayScore = sub.essayScore || 0;
    const extraPoints = sub.extraPoints || 0;
    const itemMax = item.activity.maxGrade || 10;

    totalObjectiveScore += objScore;
    totalEssayScore += essayScore;
    totalGradeEarned += objScore + essayScore + extraPoints;
    maxPossibleScore += itemMax;
  });

  const averageGrade = gradedSubmissions.length > 0
    ? (totalGradeEarned / gradedSubmissions.length).toFixed(1)
    : 'N/A';

  const completionPercentage = studentActivities.length > 0
    ? Math.round((completedCount / studentActivities.length) * 100)
    : 0;

  const handleSaveNotes = () => {
    setIsSavedNotes(true);
    setTimeout(() => setIsSavedNotes(false), 3000);
  };

  // Handler to emit / view dossier proof copy for a specific activity
  const handleGenerateDossierForActivity = (act: Activity) => {
    const { allowed, currentCount } = canEmitDossier(student.id, act.id);

    if (!allowed) {
      setLimitAlert({
        activityTitle: act.title,
        count: currentCount,
      });
      return;
    }

    const result = emitNewDossier(
      student.id,
      act.id,
      student.fullName,
      student.matricula,
      act.title,
      'Sensei Responsável'
    );

    if (result.success && result.record) {
      setActiveDossierRecord(result.record);
      setSelectedActivityForDossier(act);
    } else {
      setLimitAlert({
        activityTitle: act.title,
        count: result.currentCount,
      });
    }
  };

  // Re-open an existing dossier record if available
  const handleViewExistingDossier = (act: Activity, record: DossierIssuanceRecord) => {
    setActiveDossierRecord(record);
    setSelectedActivityForDossier(act);
  };

  const handlePrintWindow = () => {
    window.print();
  };

  // Selected submission for dossier document view
  const currentDossierSubmission = selectedActivityForDossier
    ? selectedActivityForDossier.submissions?.find(
        (s) => s.studentId === student.id || s.matricula === student.matricula || s.studentName === student.fullName
      )
    : null;

  return (
    <div className="fixed inset-[#0] z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn overflow-y-auto">
      {/* ----------------- DOSSIER PRINT / EXAM PROOF MODAL ----------------- */}
      {selectedActivityForDossier && activeDossierRecord && (
        <div className="fixed inset-[#0] z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-lg overflow-y-auto animate-fadeIn">
          <div className="dossier-printable-area w-full max-w-3xl bg-white text-slate-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col my-6 border border-slate-300">
            {/* Header Controls (Hidden on Print) */}
            <div className="no-print p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-700">
              <div className="flex items-center gap-2">
                <FileCheck2 className="w-5 h-5 text-emerald-400" />
                <span className="font-bold text-sm">Cópia Impressa da Prova (Dossiê Comprovante)</span>
                <span className="text-xs bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-mono border border-emerald-500/30">
                  Emissão {activeDossierRecord.issueNumber} de 3
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrintWindow}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimir / Salvar PDF</span>
                </button>
                <button
                  onClick={() => {
                    setSelectedActivityForDossier(null);
                    setActiveDossierRecord(null);
                  }}
                  className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors cursor-pointer"
                  title="Fechar"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Printable Document Body */}
            <div className="p-8 space-y-6 text-slate-900 bg-white">
              {/* Document Header */}
              <div className="border-b-2 border-slate-900 pb-4 text-center space-y-1">
                <h1 className="text-xl font-black uppercase tracking-wider text-slate-900">
                  ESCOLA NINJA - VILA DA FOLHA
                </h1>
                <h2 className="text-sm font-bold uppercase text-slate-700 tracking-wide">
                  COMPROVANTE OFICIAL DE PROVA E NOTA - DOSSIÊ PEDAGÓGICO
                </h2>
                <div className="flex justify-between items-center text-[11px] text-slate-600 font-mono mt-3 pt-2 border-t border-slate-200">
                  <span>ID DO COMPROVANTE: <strong>{activeDossierRecord.id}</strong></span>
                  <span>
                    EMISSÃO: <strong>VIA {activeDossierRecord.issueNumber} DE 3</strong>
                  </span>
                  <span>
                    DATA/HORA: <strong>{new Date(activeDossierRecord.issuedAt).toLocaleString('pt-BR')}</strong>
                  </span>
                </div>
              </div>

              {/* Student & Activity Info */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <div className="space-y-1">
                  <p><strong>Aluno(a):</strong> {student.fullName}</p>
                  <p><strong>Matrícula:</strong> {student.matricula}</p>
                  <p><strong>Turma:</strong> {getTurmaLabel(student.turma)}</p>
                  <p><strong>Categoria/Tag:</strong> {student.tag || 'REGULAR'}</p>
                </div>
                <div className="space-y-1">
                  <p><strong>Atividade / Prova:</strong> {selectedActivityForDossier.title}</p>
                  <p><strong>Tipo:</strong> {selectedActivityForDossier.type}</p>
                  <p><strong>Disciplina:</strong> {selectedActivityForDossier.subject || 'Geral'}</p>
                  <p><strong>Valor Total da Prova:</strong> {selectedActivityForDossier.maxGrade || 10} pts</p>
                </div>
              </div>

              {/* Grade Verification Summary */}
              <div className="p-4 bg-emerald-50 border-2 border-emerald-600/30 rounded-xl flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-emerald-900 uppercase text-[11px] block">
                    Status da Nota do Aluno
                  </span>
                  <span className="text-emerald-800 font-medium">
                    {currentDossierSubmission?.status === 'graded'
                      ? '✅ NOTA LANÇADA E CONFIRMADA NO PERFIL DO ALUNO'
                      : currentDossierSubmission?.status === 'pending'
                      ? '⏳ AVALIAÇÃO EM FASE DE CORREÇÃO PELO SENSEI'
                      : '📜 ATIVIDADE ENTREGUE'}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-emerald-800 uppercase block font-semibold">Nota Final Concedida</span>
                  <span className="text-2xl font-black text-emerald-950">
                    {currentDossierSubmission?.status === 'graded'
                      ? `${(
                          (currentDossierSubmission.objectiveScore || 0) +
                          (currentDossierSubmission.essayScore || 0) +
                          (currentDossierSubmission.extraPoints || 0)
                        ).toFixed(1)} / ${selectedActivityForDossier.maxGrade || 10}`
                      : 'Pendente'}
                  </span>
                </div>
              </div>

              {/* Exam Content & Questions Breakdown (Proof Copy) */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold border-b border-slate-300 pb-1 text-slate-800 uppercase tracking-wide">
                  Cópia das Questões da Prova e Respostas Registradas
                </h3>

                {selectedActivityForDossier.questions && selectedActivityForDossier.questions.length > 0 ? (
                  selectedActivityForDossier.questions.map((q, idx) => {
                    if (q.type === 'multiple_choice') {
                      const selectedOpt = currentDossierSubmission?.selectedObjectiveAnswers?.[q.id];
                      const isCorrect = selectedOpt === q.correctOptionIndex;

                      return (
                        <div key={q.id || idx} className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-2">
                          <div className="flex justify-between font-bold text-slate-800">
                            <span>Questão {idx + 1} (Múltipla Escolha)</span>
                            {selectedOpt !== undefined && (
                              <span className={isCorrect ? 'text-emerald-700 font-bold' : 'text-rose-700 font-bold'}>
                                {isCorrect ? '✓ CORRETA' : '✗ INCORRETA'}
                              </span>
                            )}
                          </div>
                          <p className="text-slate-900 font-medium">{q.statement}</p>
                          <div className="grid grid-cols-2 gap-2 mt-2">
                            {q.options.map((opt, oIdx) => {
                              const wasChosen = selectedOpt === oIdx;
                              const isAnswerKey = q.correctOptionIndex === oIdx;

                              return (
                                <div
                                  key={oIdx}
                                  className={`p-2 rounded border text-[11px] ${
                                    wasChosen && isAnswerKey
                                      ? 'bg-emerald-100 border-emerald-500 font-bold text-emerald-900'
                                      : wasChosen && !isAnswerKey
                                      ? 'bg-rose-100 border-rose-400 text-rose-900 line-through'
                                      : isAnswerKey
                                      ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-semibold'
                                      : 'bg-white border-slate-200 text-slate-700'
                                  }`}
                                >
                                  <strong>{['A', 'B', 'C', 'D'][oIdx]})</strong> {opt}
                                  {wasChosen && ' (Opção do Aluno)'}
                                  {isAnswerKey && !wasChosen && ' (Gabarito)'}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    } else {
                      return (
                        <div key={q.id || idx} className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-2">
                          <div className="font-bold text-slate-800">
                            <span>Questão {idx + 1} (Discursiva / Redação)</span>
                          </div>
                          <p className="text-slate-900 font-medium">{q.statement}</p>
                          <div className="p-2.5 bg-white border border-slate-300 rounded text-slate-900 italic font-mono text-[11px] whitespace-pre-wrap">
                            {currentDossierSubmission?.essayAnswer || 'Sem resposta dissertativa registrada.'}
                          </div>
                        </div>
                      );
                    }
                  })
                ) : (
                  <div className="p-3 bg-slate-50 rounded border border-slate-200 text-xs text-slate-700">
                    <p><strong>Resposta Dissertativa do Aluno:</strong></p>
                    <p className="italic font-mono mt-1 text-slate-900">
                      {currentDossierSubmission?.essayAnswer || 'Resposta registrada na plataforma.'}
                    </p>
                  </div>
                )}

                {/* Teacher Feedback / Observations */}
                {currentDossierSubmission?.teacherFeedback && (
                  <div className="p-3 bg-slate-100 border border-slate-300 rounded text-xs text-slate-800 space-y-1">
                    <strong>Parecer / Observação do Sensei:</strong>
                    <p className="italic">&ldquo;{currentDossierSubmission.teacherFeedback}&rdquo;</p>
                  </div>
                )}
              </div>

              {/* Signatures Section (COMPROVAR A NOTA E ASSINAR) */}
              <div className="pt-8 border-t-2 border-slate-900 space-y-6">
                <p className="text-[11px] text-slate-600 text-center font-semibold uppercase tracking-wider">
                  DECLARAÇÃO DE CONFERÊNCIA E ASSINATURA DE COMPROVAÇÃO DE NOTA
                </p>

                <div className="grid grid-cols-2 gap-8 pt-4">
                  <div className="text-center space-y-1">
                    <div className="border-b border-slate-900 w-full mb-2"></div>
                    <p className="text-xs font-bold text-slate-900">{student.fullName}</p>
                    <p className="text-[10px] text-slate-600">Assinatura do(a) Aluno(a)</p>
                  </div>

                  <div className="text-center space-y-1">
                    <div className="border-b border-slate-900 w-full mb-2"></div>
                    <p className="text-xs font-bold text-slate-900">{activeDossierRecord.teacherName || 'Sensei Responsável'}</p>
                    <p className="text-[10px] text-slate-600">Assinatura do Professor / Sensei</p>
                  </div>
                </div>

                <p className="text-[9px] text-slate-500 text-center font-mono pt-2">
                  Documento emitido via Sistema Ninja de Gestão Escolar. Registrado sob o ID {activeDossierRecord.id}. Válido como comprovante físico assinado.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ----------------- ALERT MODAL: EMISSION LIMIT REACHED ----------------- */}
      {limitAlert && (
        <div className="fixed inset-[#0] z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#131b2e] border-2 border-rose-500/50 rounded-3xl p-6 max-w-md w-full text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto border border-rose-500/40">
              <Lock className="w-6 h-6" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-extrabold text-white">
                Limite de Emissões Atingido!
              </h3>
              <p className="text-xs text-[#bccabb] leading-relaxed">
                O Dossiê Comprovante da Prova para a atividade <strong className="text-white">&ldquo;{limitAlert.activityTitle}&rdquo;</strong> já foi emitido o limite máximo de <strong className="text-rose-400">3 vezes</strong>.
              </p>
              <p className="text-[11px] text-rose-300 bg-rose-500/10 p-3 rounded-xl border border-rose-500/20">
                ⚠️ Conforme a regra do sistema, não é permitido emitir mais de 3 vias do dossiê para a mesma atividade.
              </p>
            </div>
            <button
              onClick={() => setLimitAlert(null)}
              className="w-full py-2.5 bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-lg"
            >
              Entendido
            </button>
          </div>
        </div>
      )}

      {/* ----------------- MAIN SUPERVISOR MODAL CONTAINER ----------------- */}
      <div className="glass-panel w-full max-w-4xl bg-[#0b1326] border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col my-8 max-h-[90vh]">
        {/* Header */}
        <div className="p-6 bg-[#131b2e] border-b border-white/10 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#4ade80]/20 border border-[#4ade80]/40 flex items-center justify-center text-[#4ade80]">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
                <span>Supervisão de Desempenho Ninja</span>
                <span className="text-xs bg-[#4ade80]/20 text-[#4ade80] px-2.5 py-0.5 rounded-full border border-[#4ade80]/30 font-bold">
                  MODO SENSEI
                </span>
              </h2>
              <p className="text-xs text-[#bccabb]">
                Relatório analítico, conferência de notas e dossiê oficial do aluno
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2.5 bg-white/5 hover:bg-white/10 text-[#bccabb] hover:text-white rounded-full transition-colors cursor-pointer"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
          {/* Student Profile Card */}
          <div className="p-6 bg-[#131b2e]/80 rounded-2xl border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <img
                src={student.avatarUrl}
                alt={student.fullName}
                className="w-16 h-16 rounded-full object-cover border-2 border-[#4ade80]/50 shadow-lg shrink-0"
              />
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-xl font-bold text-white tracking-tight">{student.fullName}</h3>
                  <span className="text-[11px] font-extrabold bg-[#4ade80]/20 text-[#4ade80] px-3 py-0.5 rounded-full border border-[#4ade80]/30">
                    {student.tag || 'REGULAR'}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-[#bccabb] mt-1 font-medium">
                  <span>Matrícula: <strong className="text-white">{student.matricula}</strong></span>
                  <span>•</span>
                  <span>Turma: <strong className="text-white">{getTurmaLabel(student.turma)}</strong></span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              {onSendMessage && (
                <button
                  onClick={() => onSendMessage(student)}
                  className="flex-1 sm:flex-none py-2.5 px-4 bg-[#171f33] hover:bg-[#222a3d] text-[#4ade80] font-bold rounded-xl text-xs border border-[#4ade80]/30 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Enviar Mensagem</span>
                </button>
              )}
            </div>
          </div>

          {/* Navigation Sub-Tabs */}
          <div className="flex items-center gap-2 p-1.5 bg-[#131b2e] rounded-2xl border border-white/10">
            <button
              onClick={() => setActiveSubTab('relatorio')}
              className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeSubTab === 'relatorio'
                  ? 'bg-[#4ade80] text-[#003919] shadow-md'
                  : 'text-[#bccabb] hover:text-white hover:bg-white/5'
              }`}
            >
              <BarChart2 className="w-4 h-4 shrink-0" />
              <span>Visão Geral & Métricas</span>
            </button>

            <button
              onClick={() => setActiveSubTab('atividades')}
              className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeSubTab === 'atividades'
                  ? 'bg-[#4ade80] text-[#003919] shadow-md'
                  : 'text-[#bccabb] hover:text-white hover:bg-white/5'
              }`}
            >
              <BookOpen className="w-4 h-4 shrink-0" />
              <span>Histórico de Atividades & Dossiês ({studentActivities.length})</span>
            </button>

            <button
              onClick={() => setActiveSubTab('anotacoes')}
              className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeSubTab === 'anotacoes'
                  ? 'bg-[#4ade80] text-[#003919] shadow-md'
                  : 'text-[#bccabb] hover:text-white hover:bg-white/5'
              }`}
            >
              <FileText className="w-4 h-4 shrink-0" />
              <span>Anotações Pedagógicas</span>
            </button>
          </div>

          {/* SUB-TAB 1: VISÃO GERAL & MÉTRICAS */}
          {activeSubTab === 'relatorio' && (
            <div className="space-y-6">
              {/* KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Card 1: Média Geral */}
                <div className="p-5 bg-[#131b2e] rounded-2xl border border-white/10 space-y-2 relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#bccabb] font-semibold">Média de Notas</span>
                    <div className="w-8 h-8 rounded-xl bg-[#4ade80]/20 text-[#4ade80] flex items-center justify-center">
                      <Award className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl font-black text-white">
                    {averageGrade} <span className="text-xs text-[#bccabb] font-normal">/ 10.0</span>
                  </div>
                  <p className="text-[11px] text-[#4ade80] font-medium">
                    {gradedSubmissions.length} atividade(s) avaliada(s)
                  </p>
                </div>

                {/* Card 2: Engajamento / Conclusão */}
                <div className="p-5 bg-[#131b2e] rounded-2xl border border-white/10 space-y-2 relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#bccabb] font-semibold">Conclusão de Missões</span>
                    <div className="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl font-black text-white">
                    {completedCount} <span className="text-xs text-[#bccabb] font-normal">/ {studentActivities.length}</span>
                  </div>
                  {/* Progress Bar */}
                  <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-[#4ade80] h-full rounded-full transition-all"
                      style={{ width: `${completionPercentage}%` }}
                    />
                  </div>
                </div>

                {/* Card 3: Devoluções */}
                <div className="p-5 bg-[#131b2e] rounded-2xl border border-white/10 space-y-2 relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#bccabb] font-semibold">Devoluções / Refazer</span>
                    <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                      <RotateCcw className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl font-black text-white">
                    {returnedCount} <span className="text-xs text-[#bccabb] font-normal">vezes</span>
                  </div>
                  <p className="text-[11px] text-amber-300 font-medium">
                    Atividades enviadas para ajuste pelo Sensei
                  </p>
                </div>

                {/* Card 4: Desempenho Tático */}
                <div className="p-5 bg-[#131b2e] rounded-2xl border border-white/10 space-y-2 relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#bccabb] font-semibold">Aproveitamento Tático</span>
                    <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl font-black text-white">
                    {completionPercentage}%
                  </div>
                  <p className="text-[11px] text-purple-300 font-medium">
                    Taxa geral de participação
                  </p>
                </div>
              </div>

              {/* Technical Performance Summary */}
              <div className="p-6 bg-[#131b2e] rounded-2xl border border-white/10 space-y-4">
                <h4 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-[#4ade80]" />
                  <span>Análise de Desempenho Objetiva vs. Discursiva</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-[#0b1326] rounded-xl border border-white/5 space-y-2">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-[#bccabb]">Questões Múltipla Escolha:</span>
                      <span className="text-emerald-400 font-black">{totalObjectiveScore.toFixed(1)} pts acumulados</span>
                    </div>
                    <p className="text-[11px] text-[#bccabb]">
                      Correção automática instantânea do sistema de treino ninja.
                    </p>
                  </div>

                  <div className="p-4 bg-[#0b1326] rounded-xl border border-white/5 space-y-2">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-[#bccabb]">Pergaminhos Discursivos / Redação:</span>
                      <span className="text-sky-400 font-black">{totalEssayScore.toFixed(1)} pts acumulados</span>
                    </div>
                    <p className="text-[11px] text-[#bccabb]">
                      Avaliação qualitativa e argumentativa do professor.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SUB-TAB 2: HISTÓRICO DE ATIVIDADES & EMISSÃO DE DOSSIÊS */}
          {activeSubTab === 'atividades' && (
            <div className="space-y-4">
              {studentActivities.length === 0 ? (
                <div className="p-8 text-center text-[#bccabb] bg-[#131b2e] rounded-2xl border border-white/10">
                  Nenhuma atividade atribuída a esta turma até o momento.
                </div>
              ) : (
                studentSubmissions.map(({ activity, submission }) => {
                  const isGraded = submission?.status === 'graded';
                  const isPending = submission?.status === 'pending';
                  const isReturned = submission?.status === 'returned';
                  const isNotSubmitted = !submission || submission.status === 'draft';

                  const totalScore = isGraded
                    ? (submission.objectiveScore || 0) + (submission.essayScore || 0) + (submission.extraPoints || 0)
                    : null;

                  const issuances = getDossierIssuances(student.id, activity.id);
                  const isLimitReached = issuances.length >= 3;

                  return (
                    <div
                      key={activity.id}
                      className="p-5 bg-[#131b2e] rounded-2xl border border-white/10 space-y-4"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-bold bg-[#4ade80]/20 text-[#4ade80] px-2.5 py-0.5 rounded-full border border-[#4ade80]/30">
                              {activity.type}
                            </span>
                            <span className="text-xs font-bold text-white">{activity.title}</span>
                          </div>
                          <p className="text-xs text-[#bccabb]">
                            Prazo: {activity.deadline || 'Sem data'} • Valor máximo: {activity.maxGrade || 10} pts
                          </p>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          {isGraded && (
                            <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 font-black text-xs rounded-full border border-emerald-500/30">
                              Nota Lançada: {totalScore !== null ? totalScore.toFixed(1) : '0'}/{activity.maxGrade || 10}
                            </span>
                          )}
                          {isPending && (
                            <span className="px-3 py-1 bg-sky-500/20 text-sky-300 font-bold text-xs rounded-full border border-sky-500/30">
                              ⏳ A Corrigir pelo Sensei
                            </span>
                          )}
                          {isReturned && (
                            <span className="px-3 py-1 bg-amber-500/20 text-amber-300 font-bold text-xs rounded-full border border-amber-500/30">
                              ↩️ Devolvida ({submission?.returnCount || 1}x)
                            </span>
                          )}
                          {isNotSubmitted && (
                            <span className="px-3 py-1 bg-white/10 text-[#bccabb] font-semibold text-xs rounded-full border border-white/10">
                              📜 Não Entregue / Pendente
                            </span>
                          )}
                        </div>
                      </div>

                      {submission?.teacherFeedback && (
                        <div className="p-3 bg-[#0b1326] rounded-xl border border-white/5 text-xs text-[#bccabb]">
                          <strong className="text-white">Parecer do Professor:</strong> &ldquo;{submission.teacherFeedback}&rdquo;
                        </div>
                      )}

                      {/* DOSSIER ISSUANCE BAR */}
                      <div className="pt-3 border-t border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-[#0b1326]/60 p-3 rounded-xl">
                        <div className="flex items-center gap-2 text-xs">
                          <FileCheck2 className="w-4 h-4 text-[#4ade80]" />
                          <span className="text-white font-semibold">Cópia Impressa do Dossiê:</span>
                          <span
                            className={`font-mono text-[11px] px-2 py-0.5 rounded-full font-bold border ${
                              isLimitReached
                                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                                : issuances.length > 0
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                : 'bg-white/10 text-[#bccabb] border-white/10'
                            }`}
                          >
                            {issuances.length} / 3 vias emitidas
                          </span>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-end">
                          {/* List existing emissions if available */}
                          {issuances.map((rec) => (
                            <button
                              key={rec.id}
                              onClick={() => handleViewExistingDossier(activity, rec)}
                              className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-white text-[11px] font-mono rounded-lg transition-all border border-white/10 cursor-pointer"
                              title={`Ver Via ${rec.issueNumber} - ID: ${rec.id}`}
                            >
                              📄 Via {rec.issueNumber}
                            </button>
                          ))}

                          <button
                            onClick={() => handleGenerateDossierForActivity(activity)}
                            disabled={isLimitReached}
                            className={`py-1.5 px-3.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-md ${
                              isLimitReached
                                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20 cursor-not-allowed opacity-75'
                                : 'bg-[#4ade80] hover:bg-[#6bfb9a] text-[#003919]'
                            }`}
                          >
                            {isLimitReached ? (
                              <>
                                <Lock className="w-3.5 h-3.5" />
                                <span>Limite 3/3 Atingido</span>
                              </>
                            ) : (
                              <>
                                <Printer className="w-3.5 h-3.5" />
                                <span>Emitir Dossiê da Prova</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* SUB-TAB 3: ANOTAÇÕES PEDAGÓGICAS */}
          {activeSubTab === 'anotacoes' && (
            <div className="p-6 bg-[#131b2e] rounded-2xl border border-white/10 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#4ade80]" />
                    <span>Caderno de Supervisão Pedagógica & Observações</span>
                  </h4>
                  <p className="text-xs text-[#bccabb]">
                    Registre anotações sigilosas do Sensei sobre o acompanhamento, dificuldades ou destaques deste aluno.
                  </p>
                </div>

                {isSavedNotes && (
                  <span className="text-xs font-bold text-[#4ade80] flex items-center gap-1.5 animate-fadeIn">
                    <Check className="w-4 h-4" />
                    <span>Anotações Salvas!</span>
                  </span>
                )}
              </div>

              <textarea
                rows={6}
                value={teacherNotes}
                onChange={(e) => setTeacherNotes(e.target.value)}
                placeholder="Escreva aqui observações pedagógicas sobre o progresso, participação, dúvidas frequentes ou histórico do aluno..."
                className="w-full bg-[#0b1326] border border-white/10 rounded-2xl p-4 text-xs text-white placeholder-[#869486] focus:outline-none focus:border-[#4ade80] leading-relaxed resize-none"
              />

              <div className="flex justify-end">
                <button
                  onClick={handleSaveNotes}
                  className="py-2.5 px-6 bg-[#4ade80] hover:bg-[#6bfb9a] text-[#003919] font-bold text-xs rounded-xl flex items-center gap-2 transition-all cursor-pointer shadow-md"
                >
                  <Save className="w-4 h-4" />
                  <span>Salvar Anotações</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-[#131b2e] border-t border-white/10 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="py-2.5 px-6 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl transition-all cursor-pointer border border-white/10"
          >
            Fechar Janela
          </button>
        </div>
      </div>
    </div>
  );
};
