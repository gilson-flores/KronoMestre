'use client';

import React, { useState, useEffect } from 'react';
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
  HeartHandshake,
} from 'lucide-react';
import { StudentUser, Activity, ActivitySubmission } from '@/lib/types';
import {
  canStudentAccessActivity,
  getTurmaLabel,
  getCanonicalActivities,
  getChildRecoveryActivities,
  getChildAdaptations,
  getSubmissionTotalGrade,
} from '@/lib/studentUtils';
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
  onSaveNotes?: (studentId: string, notes: string) => void;
}

export const StudentSupervisionModal: React.FC<StudentSupervisionModalProps> = ({
  isOpen,
  onClose,
  student,
  activities,
  onSendMessage,
  onSaveNotes,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'relatorio' | 'atividades' | 'anotacoes'>('relatorio');
  const [prevStudentId, setPrevStudentId] = useState<string | null>(null);
  const [teacherNotes, setTeacherNotes] = useState('');
  const [isSavedNotes, setIsSavedNotes] = useState(false);

  if (student && student.id !== prevStudentId) {
    setPrevStudentId(student.id);
    setTeacherNotes(student.pedagogicalNotes || '');
  }

  // Dossier Proof Copy modal state
  const [selectedActivityForDossier, setSelectedActivityForDossier] = useState<Activity | null>(null);
  const [activeDossierRecord, setActiveDossierRecord] = useState<DossierIssuanceRecord | null>(null);
  const [limitAlert, setLimitAlert] = useState<{ activityTitle: string; count: number } | null>(null);

  if (!isOpen || !student) return null;

  // Canonical activities assigned to this student's turma (treats main + parallel recovery + PNE as 1 single learning milestone)
  const canonicalStudentActivities = getCanonicalActivities(activities).filter((act) =>
    canStudentAccessActivity(act.turma, student.turma)
  );

  // Submissions breakdown per canonical activity (takes student submission from main, recovery, or adapted)
  const studentSubmissions = canonicalStudentActivities.map((canonicalAct) => {
    const childRecoveries = getChildRecoveryActivities(canonicalAct, activities);
    const childAdaptations = getChildAdaptations(canonicalAct, activities);
    const allRelatedActs = [canonicalAct, ...childRecoveries, ...childAdaptations];

    let bestSub: ActivitySubmission | undefined;
    let selectedAct: Activity = canonicalAct;

    for (const act of allRelatedActs) {
      const foundSub = act.submissions?.find(
        (s) =>
          s.studentId === student.id ||
          (Boolean(student.matricula) && s.matricula === student.matricula) ||
          s.studentName?.trim().toLowerCase() === student.fullName?.trim().toLowerCase()
      );

      if (foundSub) {
        if (
          !bestSub ||
          (foundSub.status === 'graded' && bestSub.status !== 'graded') ||
          getSubmissionTotalGrade(foundSub) > getSubmissionTotalGrade(bestSub)
        ) {
          bestSub = foundSub;
          selectedAct = act;
        }
      }
    }

    return {
      activity: selectedAct,
      canonicalActivity: canonicalAct,
      submission: bestSub,
    };
  });

  const studentActivities = canonicalStudentActivities;
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
    if (student && onSaveNotes) {
      onSaveNotes(student.id, teacherNotes);
    }
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
    try {
      const printContent = document.querySelector('.dossier-printable-area');
      if (printContent) {
        const printIframe = document.createElement('iframe');
        printIframe.style.position = 'fixed';
        printIframe.style.right = '0';
        printIframe.style.bottom = '0';
        printIframe.style.width = '0';
        printIframe.style.height = '0';
        printIframe.style.border = '0';
        printIframe.style.visibility = 'hidden';
        document.body.appendChild(printIframe);

        const doc = printIframe.contentWindow?.document;
        if (doc) {
          const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
            .map((s) => s.outerHTML)
            .join('\n');

          const clone = printContent.cloneNode(true) as HTMLElement;
          clone.querySelectorAll('.no-print').forEach((el) => el.remove());

          doc.open();
          doc.write(`
            <!DOCTYPE html>
            <div className="print-html">
              <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Dossiê Oficial - ${student.fullName}</title>
                ${styles}
                <style>
                  @page {
                    size: A4 portrait;
                    margin: 10mm;
                  }
                  body {
                    background: white !important;
                    color: black !important;
                    font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
                    padding: 0 !important;
                    margin: 0 !important;
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                  }
                  .dossier-printable-area {
                    width: 100% !important;
                    max-width: 100% !important;
                    box-shadow: none !important;
                    border: none !important;
                    margin: 0 !important;
                    padding: 0 !important;
                  }
                  .no-print {
                    display: none !important;
                  }
                </style>
              </head>
              <body>
                ${clone.outerHTML}
              </body>
            </div>
          `);
          doc.close();

          setTimeout(() => {
            try {
              printIframe.contentWindow?.focus();
              printIframe.contentWindow?.print();
            } catch (err) {
              console.error('Iframe print error, falling back:', err);
              window.focus();
              window.print();
            }
            setTimeout(() => {
              if (document.body.contains(printIframe)) {
                document.body.removeChild(printIframe);
              }
            }, 2000);
          }, 350);
          return;
        }
      }
    } catch (err) {
      console.error('Print error:', err);
    }

    window.focus();
    window.print();
  };

  // Selected submission for dossier document view
  const currentDossierSubmission = selectedActivityForDossier
    ? selectedActivityForDossier.submissions?.find(
        (s) => s.studentId === student.id || s.matricula === student.matricula || s.studentName === student.fullName
      )
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-2 sm:p-4 md:p-6 bg-black/80 backdrop-blur-md animate-fadeIn overflow-y-auto">
      {/* ----------------- DOSSIER PRINT / EXAM PROOF MODAL ----------------- */}
      {selectedActivityForDossier && activeDossierRecord && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center p-2 sm:p-4 md:p-6 bg-black/90 backdrop-blur-lg overflow-y-auto animate-fadeIn">
          <div className="dossier-printable-area w-full max-w-3xl bg-white text-slate-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col my-2 sm:my-auto border border-slate-300">
            {/* Header Controls (Hidden on Print) */}
            <div className="no-print sticky top-0 z-20 p-3 sm:p-4 bg-slate-950 text-foreground flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-slate-800 shadow-md">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-400 flex items-center justify-center border border-emerald-500/30 shrink-0">
                  <FileCheck2 className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-extrabold text-xs sm:text-sm block leading-tight text-foreground">
                    Cópia Impressa da Prova (Dossiê Comprovante)
                  </span>
                  <span className="text-[10px] sm:text-[11px] text-emerald-400 font-mono font-medium">
                    Emissão Oficial • Via {activeDossierRecord.issueNumber} de 3
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 justify-end">
                <button
                  onClick={handlePrintWindow}
                  className="flex-1 sm:flex-none px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-emerald-500/20 active:scale-95 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimir Dossiê / Salvar PDF</span>
                </button>
                <button
                  onClick={() => {
                    setSelectedActivityForDossier(null);
                    setActiveDossierRecord(null);
                  }}
                  className="p-2 bg-surface-hover hover:bg-white/20 text-foreground rounded-xl transition-all active:scale-95 cursor-pointer shrink-0"
                  title="Fechar Cópia"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Printable Document Body */}
            <div className="p-4 sm:p-6 md:p-8 space-y-5 sm:space-y-6 text-slate-900 bg-white relative overflow-x-hidden">
              {/* Institutional Watermark Badge */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03] pointer-events-none select-none text-center hidden sm:block">
                <ShieldCheck className="w-96 h-96 mx-auto text-slate-900" />
                <span className="text-4xl font-black tracking-widest text-slate-900 uppercase block mt-2">
                  DOCUMENTO OFICIAL
                </span>
              </div>

              {/* Document Header */}
              <div className="border-b-2 border-slate-900 pb-3 sm:pb-4 text-center space-y-1.5 relative">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 rounded-full text-[9px] sm:text-[10px] font-black uppercase text-slate-700 tracking-widest mb-1 border border-slate-300">
                  <ShieldCheck className="w-3.5 h-3.5 text-slate-900 shrink-0" />
                  <span>Sistema Escolar da Vila da Folha</span>
                </div>
                <h1 className="text-lg sm:text-2xl font-black uppercase tracking-wider text-slate-900 leading-tight">
                  ESCOLA NINJA DE FORMAÇÃO ACADÊMICA
                </h1>
                <h2 className="text-[10px] sm:text-xs font-extrabold uppercase text-slate-700 tracking-widest leading-normal">
                  COMPROVANTE PEDAGÓGICO DE PROVA & NOTA FINAL (DOSSIÊ OFICIAL)
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[10px] text-slate-700 font-mono mt-3 pt-2.5 border-t border-slate-300 bg-slate-50/80 p-2.5 rounded-lg text-center sm:text-left">
                  <div>
                    <span className="text-muted block text-[9px]">REGISTRO DO DOSSIÊ:</span>
                    <strong className="text-slate-900 font-bold break-all">{activeDossierRecord.id}</strong>
                  </div>
                  <div className="sm:text-center">
                    <span className="text-muted block text-[9px]">STATUS DE EMISSÃO:</span>
                    <strong className="text-slate-900 font-bold">VIA {activeDossierRecord.issueNumber} DE 3 (MÁXIMO)</strong>
                  </div>
                  <div className="sm:text-right">
                    <span className="text-muted block text-[9px]">DATA E HORA:</span>
                    <strong className="text-slate-900 font-bold">{new Date(activeDossierRecord.issuedAt).toLocaleString('pt-BR')}</strong>
                  </div>
                </div>
              </div>

              {/* Student & Activity Metadata */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 p-3.5 sm:p-4 bg-slate-50 rounded-xl border border-slate-300 text-xs shadow-sm">
                <div className="space-y-1.5">
                  <p className="border-b border-slate-200 pb-1">
                    <span className="text-muted font-semibold uppercase text-[10px] block">Nome do Aluno(a):</span>
                    <strong className="text-slate-900 text-xs sm:text-sm break-words">{student.fullName}</strong>
                  </p>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <p>
                      <span className="text-muted font-semibold text-[10px] block">Matrícula:</span>
                      <strong className="text-slate-900 font-mono">{student.matricula}</strong>
                    </p>
                    <p>
                      <span className="text-muted font-semibold text-[10px] block">Turma:</span>
                      <strong className="text-slate-900">{getTurmaLabel(student.turma)}</strong>
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <p className="border-b border-slate-200 pb-1">
                    <span className="text-muted font-semibold uppercase text-[10px] block">Atividade / Avaliação:</span>
                    <strong className="text-slate-900 text-xs sm:text-sm break-words">{selectedActivityForDossier.title}</strong>
                  </p>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <p>
                      <span className="text-muted font-semibold text-[10px] block">Tipo de Prova:</span>
                      <strong className="text-slate-900">{selectedActivityForDossier.type}</strong>
                    </p>
                    <p>
                      <span className="text-muted font-semibold text-[10px] block">Valor Máximo:</span>
                      <strong className="text-slate-900 font-bold">{selectedActivityForDossier.maxGrade || 10} pts</strong>
                    </p>
                  </div>
                </div>
              </div>

              {/* Grade Verification Summary Box */}
              <div className="p-3.5 sm:p-4 bg-emerald-50/80 border-2 border-emerald-600/40 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs shadow-sm">
                <div className="space-y-0.5">
                  <span className="font-black text-emerald-950 uppercase text-[10px] tracking-wider block">
                    SITUAÇÃO REGISTRADA DA NOTA
                  </span>
                  <span className="text-emerald-900 font-extrabold text-xs sm:text-sm flex items-center gap-1.5 flex-wrap">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                    <span>
                      {currentDossierSubmission?.status === 'graded'
                        ? 'NOTA OFICIAL LANÇADA E VALIDADA PELO SENSEI'
                        : currentDossierSubmission?.status === 'pending'
                        ? 'PROVA ENTREGUE - EM FASE DE CORREÇÃO'
                        : 'PROVA CONCLUÍDA PELO ALUNO'}
                    </span>
                  </span>
                </div>
                <div className="w-full sm:w-auto text-left sm:text-right bg-white px-4 py-2 rounded-lg border border-emerald-300 shadow-inner shrink-0">
                  <span className="text-[10px] text-emerald-800 uppercase block font-bold">Nota Final Concedida</span>
                  <span className="text-xl sm:text-2xl font-black text-emerald-950">
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
                <h3 className="text-xs font-black border-b-2 border-slate-900 pb-1 text-slate-900 uppercase tracking-wider flex items-center justify-between flex-wrap gap-1">
                  <span>RESPOSTAS E CONTEÚDO REGISTRADO NA PROVA</span>
                  <span className="text-[10px] font-normal text-muted font-mono">
                    {selectedActivityForDossier.questions?.length || 0} QUESTÕES
                  </span>
                </h3>

                {selectedActivityForDossier.questions && selectedActivityForDossier.questions.length > 0 ? (
                  selectedActivityForDossier.questions.map((q, idx) => {
                    if (q.type === 'multiple_choice') {
                      const selectedOpt = currentDossierSubmission?.selectedObjectiveAnswers?.[q.id];
                      const isCorrect = selectedOpt === q.correctOptionIndex;

                      return (
                        <div key={q.id || idx} className="p-3 bg-slate-50 rounded-lg border border-slate-300 text-xs space-y-2">
                          <div className="flex justify-between font-bold text-slate-800 border-b border-slate-200 pb-1 flex-wrap gap-1">
                            <span>Questão {idx + 1} (Múltipla Escolha)</span>
                            {selectedOpt !== undefined && (
                              <span className={isCorrect ? 'text-emerald-700 font-extrabold' : 'text-rose-700 font-extrabold'}>
                                {isCorrect ? '✓ CORRETA' : '✗ INCORRETA'}
                              </span>
                            )}
                          </div>
                          <p className="text-slate-900 font-semibold leading-snug">{q.statement}</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                            {q.options.map((opt, oIdx) => {
                              const wasChosen = selectedOpt === oIdx;
                              const isAnswerKey = q.correctOptionIndex === oIdx;

                              return (
                                <div
                                  key={oIdx}
                                  className={`p-2 rounded border text-[11px] ${
                                    wasChosen && isAnswerKey
                                      ? 'bg-emerald-100 border-emerald-600 font-bold text-emerald-950 shadow-sm'
                                      : wasChosen && !isAnswerKey
                                      ? 'bg-rose-100 border-rose-400 text-rose-950 line-through'
                                      : isAnswerKey
                                      ? 'bg-emerald-50 border-emerald-400 text-emerald-900 font-semibold'
                                      : 'bg-white border-slate-200 text-slate-700'
                                  }`}
                                >
                                  <strong>{['A', 'B', 'C', 'D'][oIdx]})</strong> {opt}
                                  {wasChosen && ' (Escolha do Aluno)'}
                                  {isAnswerKey && !wasChosen && ' (Gabarito)'}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    } else {
                      return (
                        <div key={q.id || idx} className="p-3 bg-slate-50 rounded-lg border border-slate-300 text-xs space-y-2">
                          <div className="font-bold text-slate-800 border-b border-slate-200 pb-1">
                            <span>Questão {idx + 1} (Discursiva / Redação)</span>
                          </div>
                          <p className="text-slate-900 font-semibold leading-snug">{q.statement}</p>
                          <div className="p-3 bg-white border border-slate-300 rounded-lg text-slate-900 italic font-mono text-[11px] whitespace-pre-wrap leading-relaxed shadow-inner break-words">
                            {currentDossierSubmission?.essayAnswer || 'Sem resposta dissertativa registrada.'}
                          </div>
                        </div>
                      );
                    }
                  })
                ) : (
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-300 text-xs text-slate-700 space-y-1">
                    <p className="font-bold text-slate-900">Resposta do Aluno:</p>
                    <p className="italic font-mono text-slate-900 bg-white p-3 rounded border border-slate-200 break-words">
                      {currentDossierSubmission?.essayAnswer || 'Resposta registrada na plataforma.'}
                    </p>
                  </div>
                )}

                {/* Teacher Feedback / Observations */}
                {currentDossierSubmission?.teacherFeedback && (
                  <div className="p-3 bg-slate-100 border border-slate-300 rounded-lg text-xs text-slate-800 space-y-1">
                    <strong className="text-slate-900 uppercase text-[10px] block font-extrabold">Parecer Pedagógico do Sensei:</strong>
                    <p className="italic font-medium">&ldquo;{currentDossierSubmission.teacherFeedback}&rdquo;</p>
                  </div>
                )}
              </div>

              {/* Signatures & Official Certification Section */}
              <div className="pt-6 sm:pt-8 border-t-2 border-slate-900 space-y-5 sm:space-y-6">
                <p className="text-[9px] sm:text-[10px] text-slate-700 text-center font-extrabold uppercase tracking-wider sm:tracking-widest bg-slate-100 py-1.5 px-2 rounded-lg border border-slate-200">
                  DECLARAÇÃO DE CONFERÊNCIA E ASSINATURA DE COMPROVAÇÃO DE NOTA
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-12 pt-2 sm:pt-4">
                  <div className="text-center space-y-1">
                    <div className="border-b-2 border-slate-900 w-full mb-2"></div>
                    <p className="text-xs font-black text-slate-900 uppercase">{student.fullName}</p>
                    <p className="text-[10px] font-bold text-slate-600">Assinatura do(a) Aluno(a)</p>
                  </div>

                  <div className="text-center space-y-1">
                    <div className="border-b-2 border-slate-900 w-full mb-2"></div>
                    <p className="text-xs font-black text-slate-900 uppercase">{activeDossierRecord.teacherName || 'Sensei Responsável'}</p>
                    <p className="text-[10px] font-bold text-slate-600">Assinatura do Professor / Sensei</p>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-[9px] text-muted font-mono gap-1 text-center sm:text-left">
                  <span>Documento emitido via Sistema Ninja de Gestão Escolar</span>
                  <span className="font-bold text-slate-700">ID Autenticador: {activeDossierRecord.id}</span>
                  <span>Válido como comprovante físico assinado</span>
                </div>
              </div>

              {/* Bottom Print Action Bar (Hidden on Print) */}
              <div className="no-print pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50 p-3 sm:p-4 rounded-2xl border border-slate-300">
                <div className="flex items-center gap-2 text-xs text-slate-600 font-medium text-center sm:text-left">
                  <Printer className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Pronto para impressão em formato A4/PDF em dispositivos móveis e desktop.</span>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={handlePrintWindow}
                    className="flex-1 sm:flex-none px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-foreground font-black text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Imprimir Dossiê</span>
                  </button>
                  <button
                    onClick={() => {
                      setSelectedActivityForDossier(null);
                      setActiveDossierRecord(null);
                    }}
                    className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-xl transition-all active:scale-95 cursor-pointer"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ----------------- ALERT MODAL: EMISSION LIMIT REACHED ----------------- */}
      {limitAlert && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-surface border-2 border-rose-500/50 rounded-3xl p-6 max-w-md w-full text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-400 flex items-center justify-center mx-auto border border-rose-200">
              <Lock className="w-6 h-6" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-extrabold text-foreground">
                Limite de Emissões Atingido!
              </h3>
              <p className="text-xs text-muted leading-relaxed">
                O Dossiê Comprovante da Prova para a atividade <strong className="text-foreground">&ldquo;{limitAlert.activityTitle}&rdquo;</strong> já foi emitido o limite máximo de <strong className="text-rose-400">3 vezes</strong>.
              </p>
              <p className="text-[11px] text-rose-600 bg-rose-500/10 p-3 rounded-xl border border-rose-500/20">
                ⚠️ Conforme a regra do sistema, não é permitido emitir mais de 3 vias do dossiê para a mesma atividade.
              </p>
            </div>
            <button
              onClick={() => setLimitAlert(null)}
              className="w-full py-2.5 bg-rose-500 hover:bg-rose-600 text-foreground font-bold text-xs rounded-xl transition-all cursor-pointer shadow-lg"
            >
              Entendido
            </button>
          </div>
        </div>
      )}

      {/* ----------------- MAIN SUPERVISOR MODAL CONTAINER ----------------- */}
      <div className="glass-panel w-full max-w-4xl bg-background border border-border rounded-3xl shadow-2xl overflow-hidden flex flex-col my-8 max-h-[90vh]">
        {/* Header */}
        <div className="p-6 bg-surface border-b border-border flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/20 border border-primary/40 flex items-center justify-center text-primary">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-foreground tracking-tight flex items-center gap-2">
                <span>Supervisão de Desempenho Ninja</span>
                <span className="text-xs bg-primary/20 text-primary px-2.5 py-0.5 rounded-full border border-primary/30 font-bold">
                  MODO SENSEI
                </span>
              </h2>
              <p className="text-xs text-muted">
                Relatório analítico, conferência de notas e dossiê oficial do aluno
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2.5 bg-surface-hover hover:bg-surface-hover text-muted hover:text-foreground rounded-full transition-colors cursor-pointer"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
          {/* Student Profile Card */}
          <div className="p-6 bg-surface/80 rounded-2xl border border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <img
                src={student.avatarUrl}
                alt={student.fullName}
                loading="lazy"
                decoding="async"
                className="w-16 h-16 rounded-full object-cover border-2 border-primary/50 shadow-lg shrink-0"
              />
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-xl font-bold text-foreground tracking-tight">{student.fullName}</h3>
                  <span className="text-[11px] font-extrabold bg-primary/20 text-primary px-3 py-0.5 rounded-full border border-primary/30">
                    {student.tag || 'REGULAR'}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted mt-1 font-medium flex-wrap">
                  <span>Matrícula: <strong className="text-foreground">{student.matricula}</strong></span>
                  <span>•</span>
                  <span>Turma: <strong className="text-foreground">{getTurmaLabel(student.turma)}</strong></span>
                  {student.tag === 'PNE' && (
                    <>
                      {student.pneConditions && student.pneConditions.length > 0 && (
                        <>
                          <span>•</span>
                          <span className="text-amber-600 bg-amber-500/15 px-2.5 py-0.5 rounded-full border border-amber-500/30 font-semibold text-[11px]">
                            {student.pneConditions.join(', ')}
                          </span>
                        </>
                      )}
                      <span>•</span>
                      <span className="flex items-center gap-1 text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                        <HeartHandshake className="w-3.5 h-3.5 text-amber-400" />
                        <span>2º Professor: <strong className="text-foreground">{student.secondTeacherName || 'Não vinculado'}</strong></span>
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              {onSendMessage && (
                <button
                  onClick={() => onSendMessage(student)}
                  className="flex-1 sm:flex-none py-2.5 px-4 bg-gradient-to-r from-[#172238] to-[#1e2a45] hover:from-[#1e2c4a] hover:to-[#263757] text-primary font-bold rounded-xl text-xs border border-primary/40 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md hover:shadow-[#4ade80]/10 active:scale-95"
                >
                  <MessageSquare className="w-4 h-4 text-primary" />
                  <span>Enviar Mensagem ao Aluno</span>
                </button>
              )}
            </div>
          </div>

          {/* Navigation Sub-Tabs */}
          <div className="grid grid-cols-3 gap-1.5 sm:gap-2 p-1.5 bg-surface rounded-2xl border border-border shadow-inner">
            <button
              onClick={() => setActiveSubTab('relatorio')}
              className={`py-2 sm:py-2.5 px-1.5 sm:px-3 rounded-xl text-[10px] sm:text-xs font-bold transition-all flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 cursor-pointer active:scale-95 text-center leading-tight ${
                activeSubTab === 'relatorio'
                  ? 'bg-gradient-to-r from-[#4ade80] to-[#22c55e] text-white shadow-lg shadow-primary/20 font-extrabold'
                  : 'text-muted hover:text-foreground hover:bg-surface-hover'
              }`}
            >
              <BarChart2 className="w-4 h-4 shrink-0" />
              <span className="text-center sm:text-left">Visão Geral & Métricas</span>
            </button>

            <button
              onClick={() => setActiveSubTab('atividades')}
              className={`py-2 sm:py-2.5 px-1.5 sm:px-3 rounded-xl text-[10px] sm:text-xs font-bold transition-all flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 cursor-pointer active:scale-95 text-center leading-tight ${
                activeSubTab === 'atividades'
                  ? 'bg-gradient-to-r from-[#4ade80] to-[#22c55e] text-white shadow-lg shadow-primary/20 font-extrabold'
                  : 'text-muted hover:text-foreground hover:bg-surface-hover'
              }`}
            >
              <BookOpen className="w-4 h-4 shrink-0" />
              <span className="text-center sm:text-left">Histórico & Dossiês ({studentActivities.length})</span>
            </button>

            <button
              onClick={() => setActiveSubTab('anotacoes')}
              className={`py-2 sm:py-2.5 px-1.5 sm:px-3 rounded-xl text-[10px] sm:text-xs font-bold transition-all flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 cursor-pointer active:scale-95 text-center leading-tight ${
                activeSubTab === 'anotacoes'
                  ? 'bg-gradient-to-r from-[#4ade80] to-[#22c55e] text-white shadow-lg shadow-primary/20 font-extrabold'
                  : 'text-muted hover:text-foreground hover:bg-surface-hover'
              }`}
            >
              <FileText className="w-4 h-4 shrink-0" />
              <span className="text-center sm:text-left">Anotações Pedagógicas</span>
            </button>
          </div>

          {/* SUB-TAB 1: VISÃO GERAL & MÉTRICAS */}
          {activeSubTab === 'relatorio' && (
            <div className="space-y-6">
              {/* KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Card 1: Média Geral */}
                <div className="p-5 bg-surface rounded-2xl border border-border space-y-2 relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted font-semibold">Média de Notas</span>
                    <div className="w-8 h-8 rounded-xl bg-primary/20 text-primary flex items-center justify-center">
                      <Award className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl font-black text-foreground">
                    {averageGrade} <span className="text-xs text-muted font-normal">/ 10.0</span>
                  </div>
                  <p className="text-[11px] text-primary font-medium">
                    {gradedSubmissions.length} atividade(s) avaliada(s)
                  </p>
                </div>

                {/* Card 2: Engajamento / Conclusão */}
                <div className="p-5 bg-surface rounded-2xl border border-border space-y-2 relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted font-semibold">Conclusão de Missões</span>
                    <div className="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl font-black text-foreground">
                    {completedCount} <span className="text-xs text-muted font-normal">/ {studentActivities.length}</span>
                  </div>
                  {/* Progress Bar */}
                  <div className="w-full bg-surface-hover rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-primary h-full rounded-full transition-all"
                      style={{ width: `${completionPercentage}%` }}
                    />
                  </div>
                </div>

                {/* Card 3: Devoluções */}
                <div className="p-5 bg-surface rounded-2xl border border-border space-y-2 relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted font-semibold">Devoluções / Refazer</span>
                    <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-400 flex items-center justify-center">
                      <RotateCcw className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl font-black text-foreground">
                    {returnedCount} <span className="text-xs text-muted font-normal">vezes</span>
                  </div>
                  <p className="text-[11px] text-amber-600 font-medium">
                    Atividades enviadas para ajuste pelo Sensei
                  </p>
                </div>

                {/* Card 4: Desempenho Tático */}
                <div className="p-5 bg-surface rounded-2xl border border-border space-y-2 relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted font-semibold">Aproveitamento Tático</span>
                    <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-400 flex items-center justify-center">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl font-black text-foreground">
                    {completionPercentage}%
                  </div>
                  <p className="text-[11px] text-purple-600 font-medium">
                    Taxa geral de participação
                  </p>
                </div>
              </div>

              {/* Technical Performance Summary */}
              <div className="p-6 bg-surface rounded-2xl border border-border space-y-4">
                <h4 className="text-sm font-bold text-foreground tracking-tight flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-primary" />
                  <span>Análise de Desempenho Objetiva vs. Discursiva</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-background rounded-xl border border-border space-y-2">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-muted">Questões Múltipla Escolha:</span>
                      <span className="text-emerald-400 font-black">{totalObjectiveScore.toFixed(1)} pts acumulados</span>
                    </div>
                    <p className="text-[11px] text-muted">
                      Correção automática instantânea do sistema de treino ninja.
                    </p>
                  </div>

                  <div className="p-4 bg-background rounded-xl border border-border space-y-2">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-muted">Pergaminhos Discursivos / Redação:</span>
                      <span className="text-sky-400 font-black">{totalEssayScore.toFixed(1)} pts acumulados</span>
                    </div>
                    <p className="text-[11px] text-muted">
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
                <div className="p-8 text-center text-muted bg-surface rounded-2xl border border-border">
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
                      className="p-5 bg-surface rounded-2xl border border-border space-y-4"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-bold bg-primary/20 text-primary px-2.5 py-0.5 rounded-full border border-primary/30">
                              {activity.type}
                            </span>
                            <span className="text-xs font-bold text-foreground">{activity.title}</span>
                          </div>
                          <p className="text-xs text-muted">
                            Prazo: {activity.deadline || 'Sem data'} • Valor máximo: {activity.maxGrade || 10} pts
                          </p>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          {isGraded && (
                            <span className="px-3 py-1 bg-emerald-100 text-emerald-600 font-black text-xs rounded-full border border-emerald-500/30">
                              Nota Lançada: {totalScore !== null ? totalScore.toFixed(1) : '0'}/{activity.maxGrade || 10}
                            </span>
                          )}
                          {isPending && (
                            <span className="px-3 py-1 bg-sky-500/20 text-sky-300 font-bold text-xs rounded-full border border-sky-500/30">
                              ⏳ A Corrigir pelo Sensei
                            </span>
                          )}
                          {isReturned && (
                            <span className="px-3 py-1 bg-amber-100 text-amber-600 font-bold text-xs rounded-full border border-amber-500/30">
                              ↩️ Devolvida ({submission?.returnCount || 1}x)
                            </span>
                          )}
                          {isNotSubmitted && (
                            <span className="px-3 py-1 bg-surface-hover text-muted font-semibold text-xs rounded-full border border-border">
                              📜 Não Entregue / Pendente
                            </span>
                          )}
                        </div>
                      </div>

                      {submission?.teacherFeedback && (
                        <div className="p-3 bg-background rounded-xl border border-border text-xs text-muted">
                          <strong className="text-foreground">Parecer do Professor:</strong> &ldquo;{submission.teacherFeedback}&rdquo;
                        </div>
                      )}

                      {/* DOSSIER ISSUANCE BAR */}
                      <div className="pt-3 border-t border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-background/60 p-3 rounded-xl">
                        <div className="flex items-center gap-2 text-xs">
                          <FileCheck2 className="w-4 h-4 text-primary" />
                          <span className="text-foreground font-semibold">Cópia Impressa do Dossiê:</span>
                          <span
                            className={`font-mono text-[11px] px-2 py-0.5 rounded-full font-bold border ${
                              isLimitReached
                                ? 'bg-rose-100 text-rose-600 border-rose-200'
                                : issuances.length > 0
                                ? 'bg-amber-100 text-amber-600 border-amber-200'
                                : 'bg-surface-hover text-muted border-border'
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
                              className="px-3 py-1.5 bg-surface-hover hover:bg-white/20 active:scale-95 text-foreground text-[11px] font-mono font-bold rounded-xl transition-all border border-white/15 hover:border-emerald-400/50 cursor-pointer flex items-center gap-1 shadow-sm"
                              title={`Ver Via ${rec.issueNumber} - ID: ${rec.id}`}
                            >
                              <FileText className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Via {rec.issueNumber}</span>
                            </button>
                          ))}

                          <button
                            onClick={() => handleGenerateDossierForActivity(activity)}
                            disabled={isLimitReached}
                            className={`py-2 px-4 rounded-xl font-extrabold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-md active:scale-95 ${
                              isLimitReached
                                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30 cursor-not-allowed opacity-80'
                                : 'bg-gradient-to-r from-[#4ade80] to-[#22c55e] hover:from-[#6bfb9a] hover:to-[#34d399] text-white shadow-primary/20 hover:shadow-lg'
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
            <div className="p-6 bg-surface rounded-2xl border border-border space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-foreground tracking-tight flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" />
                    <span>Caderno de Supervisão Pedagógica & Observações</span>
                  </h4>
                  <p className="text-xs text-muted">
                    Registre anotações sigilosas do Sensei sobre o acompanhamento, dificuldades ou destaques deste aluno.
                  </p>
                </div>

                {isSavedNotes && (
                  <span className="text-xs font-bold text-primary flex items-center gap-1.5 animate-fadeIn bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
                    <Check className="w-4 h-4" />
                    <span>Anotações Salvas com Sucesso!</span>
                  </span>
                )}
              </div>

              <textarea
                rows={6}
                value={teacherNotes}
                onChange={(e) => setTeacherNotes(e.target.value)}
                placeholder="Escreva aqui observações pedagógicas sobre o progresso, participação, dúvidas frequentes ou histórico do aluno..."
                className="w-full bg-background border border-border rounded-2xl p-4 text-xs text-foreground placeholder-[#869486] focus:outline-none focus:border-primary leading-relaxed resize-none shadow-inner"
              />

              <div className="flex justify-end">
                <button
                  onClick={handleSaveNotes}
                  className="py-2.5 px-6 bg-gradient-to-r from-[#4ade80] to-[#22c55e] hover:from-[#6bfb9a] hover:to-[#34d399] text-white font-extrabold text-xs rounded-xl flex items-center gap-2 transition-all cursor-pointer shadow-md shadow-primary/20 active:scale-95"
                >
                  <Save className="w-4 h-4" />
                  <span>Salvar Anotações</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-surface border-t border-border flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="py-2.5 px-6 bg-surface-hover hover:bg-white/20 active:scale-95 text-foreground font-bold text-xs rounded-xl transition-all cursor-pointer border border-border shadow-sm"
          >
            Fechar Janela
          </button>
        </div>
      </div>
    </div>
  );
};

export default StudentSupervisionModal;
