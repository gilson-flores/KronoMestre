'use client';

import React, { useState, useMemo } from 'react';
import {
  Printer,
  FileText,
  Download,
  Copy,
  Check,
  X,
  Building2,
  Users,
  ShieldCheck,
  Info,
  Calendar,
  Layers,
  GraduationCap,
  ClipboardList,
  CheckCircle2,
  AlertCircle,
  Clock,
  PenLine,
} from 'lucide-react';
import { Activity, StudentUser, TeacherUser, RcoEmissionRecord } from '@/lib/types';
import { canStudentAccessActivity, isStudentPNE, getOriginalTurmas } from '@/lib/studentUtils';
import { initialTeacher } from '@/lib/initialData';
import { saveRcoEmission } from '@/lib/rcoStorage';

interface RcoPdfReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  activities: Activity[];
  students: StudentUser[];
  teacher?: TeacherUser;
  selectedTurmaInitial?: string;
}

export const RcoPdfReportModal: React.FC<RcoPdfReportModalProps> = ({
  isOpen,
  onClose,
  activities = [],
  students = [],
  teacher = initialTeacher,
  selectedTurmaInitial = '',
}) => {
  // Extrair todas as turmas cadastradas
  const allTurmas = useMemo(() => {
    return getOriginalTurmas(students);
  }, [students]);

  // Configurações do Relatório
  const [scope, setScope] = useState<'all' | 'single'>(selectedTurmaInitial ? 'single' : 'all');
  const [activeTurma, setActiveTurma] = useState<string>(selectedTurmaInitial || allTurmas[0] || '');
  const [includeActivityDetails, setIncludeActivityDetails] = useState<boolean>(true);
  const [includeSpecialNeeds, setIncludeSpecialNeeds] = useState<boolean>(true);
  const [includeTeacherNotesColumn, setIncludeTeacherNotesColumn] = useState<boolean>(true);
  const [includeSignatures, setIncludeSignatures] = useState<boolean>(true);
  const [copiedState, setCopiedState] = useState<boolean>(false);

  // Turmas a serem incluídas no documento
  const targetTurmas = useMemo(() => {
    if (scope === 'single' && activeTurma) {
      return [activeTurma];
    }
    return allTurmas.length > 0 ? allTurmas : ['Geral'];
  }, [scope, activeTurma, allTurmas]);

  // Processamento e consolidação de dados por turma focado em CONTROLE DE ATIVIDADES E ENTREGAS
  const turmasReportData = useMemo(() => {
    return targetTurmas.map((turmaName) => {
      // Alunos da turma
      const turmaStudents = students
        .filter((s) => s.turma?.trim().toLowerCase() === turmaName.trim().toLowerCase())
        .sort((a, b) => a.fullName.localeCompare(b.fullName));

      // Atividades da turma: filtrar APENAS atividades regulares e de recuperação paralela (excluindo as adaptadas como colunas separadas)
      const turmaActivities = activities
        .filter((act) => canStudentAccessActivity(act.turma, turmaName) && !act.isAdapted)
        .sort((a, b) => {
          const dateA = new Date(a.deadline || '').getTime() || 0;
          const dateB = new Date(b.deadline || '').getTime() || 0;
          return dateA - dateB;
        });

      // Mapear código curto para cada atividade (A1, A2, A3... ou REC1, REC2... se for Recuperação)
      let actCounter = 0;
      let recCounter = 0;
      const activityMap = turmaActivities.map((act) => {
        const isRec = act.isRecovery || act.type === 'Recuperação Paralela';
        let code = '';
        if (isRec) {
          recCounter++;
          code = `REC${recCounter}`;
        } else {
          actCounter++;
          code = `A${actCounter}`;
        }

        let formattedDeadline = 'Sem prazo';
        if (act.deadline && act.deadline.trim()) {
          try {
            const dt = new Date(act.deadline);
            if (!isNaN(dt.getTime())) {
              formattedDeadline = dt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
            } else {
              formattedDeadline = act.deadline;
            }
          } catch {
            formattedDeadline = act.deadline;
          }
        }

        return {
          code,
          activity: act,
          isRecovery: isRec,
          maxGrade: act.maxGrade || 10,
          deadlineFormatted: formattedDeadline,
        };
      });

      const totalActivitiesCount = activityMap.length;
      let studentsWithAtLeastOneSubmission = 0;
      let studentsWithAllSubmissions = 0;

      const studentRows = turmaStudents.map((st, sIndex) => {
        let completedActivitiesCount = 0;
        const missingActivitiesCodes: string[] = [];
        let usedAdaptationCount = 0;

        const gradesPerAct = activityMap.map((item) => {
          const act = item.activity;
          // Buscar atividade adaptada ou principal correspondente
          const related = activities.filter(
            (a) =>
              a.id === act.id ||
              a.adaptedFromId === act.id ||
              (act.adaptedFromId && a.id === act.adaptedFromId)
          );
          const allSubs = related.flatMap((a) => a.submissions || []);
          const sub = allSubs.find(
            (s) =>
              s.studentId === st.id ||
              (Boolean(st.matricula) && s.matricula === st.matricula) ||
              s.studentName?.trim().toLowerCase() === st.fullName.trim().toLowerCase()
          );

          let grade: number | null = null;
          let hasSubmitted = false;
          let isAdaptedSubmission = false;

          if (sub) {
            hasSubmitted = true;
            // Verificar se a entrega foi feita na versão adaptada
            const submittedAct = activities.find((a) => (a.submissions || []).includes(sub));
            if (submittedAct?.isAdapted) {
              isAdaptedSubmission = true;
              usedAdaptationCount++;
            }

            const obj = Number(sub.objectiveScore) || 0;
            const ess = Number(sub.essayScore) || 0;
            const ext = Number(sub.extraPoints) || 0;
            grade = Number((obj + ess + ext).toFixed(1));
            completedActivitiesCount++;
          } else {
            missingActivitiesCodes.push(item.code);
          }

          return {
            code: item.code,
            activityId: act.id,
            grade,
            maxGrade: item.maxGrade,
            hasSubmitted,
            isAdaptedSubmission,
            isRecovery: item.isRecovery,
          };
        });

        if (completedActivitiesCount > 0) {
          studentsWithAtLeastOneSubmission++;
        }
        if (totalActivitiesCount > 0 && completedActivitiesCount === totalActivitiesCount) {
          studentsWithAllSubmissions++;
        }

        const isPne = isStudentPNE(st);
        const isRad = st.tag?.toUpperCase() === 'RAD';
        const hasUsedAdaptation = usedAdaptationCount > 0;

        // Status pedagógico de entrega
        let deliveryStatusLabel = 'Sem Entregas';
        let deliveryStatusType: 'complete' | 'partial' | 'none' = 'none';

        if (totalActivitiesCount === 0) {
          deliveryStatusLabel = 'Sem atividades';
          deliveryStatusType = 'none';
        } else if (completedActivitiesCount === totalActivitiesCount) {
          deliveryStatusLabel = '✓ Completo';
          deliveryStatusType = 'complete';
        } else if (completedActivitiesCount > 0) {
          deliveryStatusLabel = `${totalActivitiesCount - completedActivitiesCount} Pendência(s)`;
          deliveryStatusType = 'partial';
        } else {
          deliveryStatusLabel = 'Pendente';
          deliveryStatusType = 'none';
        }

        return {
          index: sIndex + 1,
          student: st,
          isPne,
          isRad,
          hasUsedAdaptation,
          usedAdaptationCount,
          gradesPerAct,
          completedCount: completedActivitiesCount,
          totalActivities: totalActivitiesCount,
          missingCodes: missingActivitiesCodes,
          deliveryStatusLabel,
          deliveryStatusType,
        };
      });

      const pneCount = turmaStudents.filter((s) => isStudentPNE(s)).length;
      const radCount = turmaStudents.filter((s) => s.tag?.toUpperCase() === 'RAD').length;
      const studentsWithAdaptationCount = studentRows.filter((r) => r.hasUsedAdaptation).length;
      const engagementPercent =
        turmaStudents.length > 0
          ? Math.round((studentsWithAtLeastOneSubmission / turmaStudents.length) * 100)
          : 0;

      return {
        turmaName,
        studentsCount: turmaStudents.length,
        activitiesCount: turmaActivities.length,
        activityMap,
        studentRows,
        pneCount,
        radCount,
        studentsWithAdaptationCount,
        studentsWithAtLeastOneSubmission,
        studentsWithAllSubmissions,
        engagementPercent,
      };
    });
  }, [targetTurmas, students, activities]);

  // Data atual formatada por extenso
  const currentDateFormatted = useMemo(() => {
    return new Date().toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  }, []);

  // Código de autenticidade estável
  const [emissionHash] = useState<string>(() => {
    const timestamp = typeof Date !== 'undefined' ? Date.now().toString(36).toUpperCase() : '2026';
    return `RCO-2026-SED-${timestamp}`;
  });

  // Copiar Lista de Pendências para repassar à coordenação ou bloco de notas
  const handleCopyPendingList = () => {
    const lines: string[] = [];
    lines.push(`=== MAPA DE CONTROLE DOCENTE • ATIVIDADES E PENDÊNCIAS ===`);
    lines.push(`Escola: ${teacher.school || "EEB Prof. Jandira D'Ávila"}`);
    lines.push(`Professor(a): ${teacher.name || 'Prof. Gilson Flores'} • Disciplina: ${teacher.subject || 'Sociologia'}`);
    lines.push(`Data: ${currentDateFormatted}`);
    lines.push('');

    turmasReportData.forEach((tData) => {
      lines.push(`--- TURMA ${tData.turmaName} (${tData.studentsCount} alunos • ${tData.activitiesCount} atividades) ---`);
      
      const pendingStudents = tData.studentRows.filter((r) => r.completedCount < r.totalActivities);
      
      if (pendingStudents.length === 0) {
        lines.push(`✓ Parabéns! Todos os estudantes estão com as atividades entregues em dia.`);
      } else {
        pendingStudents.forEach((r) => {
          const miss = r.missingCodes.length > 0 ? `[Faltando: ${r.missingCodes.join(', ')}]` : '';
          const tag = r.isPne ? '(PNE)' : r.isRad ? '(RAD)' : '';
          lines.push(`• ${r.student.fullName} ${tag}: ${r.completedCount}/${r.totalActivities} entregues ${miss}`);
        });
      }
      lines.push('');
    });

    navigator.clipboard.writeText(lines.join('\n'));
    setCopiedState(true);
    setTimeout(() => setCopiedState(false), 3000);
  };

  // Exportar CSV de Controle de Entregas
  const handleExportCsv = () => {
    let csvContent = '\uFEFF';
    csvContent += 'Turma,Nº,Nome do Aluno,Matrícula,Atendimento,Entregas,Total Atividades,Status Entrega,Pendências\n';

    turmasReportData.forEach((tData) => {
      tData.studentRows.forEach((row) => {
        const attend = row.isPne ? 'PNE' : row.isRad ? 'RAD' : 'Regular';
        const pend = row.missingCodes.join('; ') || 'Nenhuma';
        csvContent += `"${tData.turmaName}","${row.index}","${row.student.fullName}","${row.student.matricula || ''}","${attend}","${row.completedCount}","${row.totalActivities}","${row.deliveryStatusLabel}","${pend}"\n`;
      });
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `Mapa_Controle_Docente_${scope === 'single' ? `Turma_${activeTurma}` : 'Todas_Turmas'}_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Disparar Impressão / Salvar em PDF e registrar auditoria imutável
  const [isPersistingEmission, setIsPersistingEmission] = useState<boolean>(false);
  const [persistedSuccessNotice, setPersistedSuccessNotice] = useState<boolean>(false);

  const persistEmissionAuditTrail = async () => {
    try {
      setIsPersistingEmission(true);
      const turmasSummary = turmasReportData.map((td) => ({
        turmaName: td.turmaName,
        studentsCount: td.studentsCount,
        activitiesCount: td.activitiesCount,
        averageGrade: 0,
        pneCount: td.pneCount,
        radCount: td.radCount,
      }));

      const snapshot = {
        teacher: {
          id: teacher.id,
          name: teacher.name,
          subject: teacher.subject,
          email: teacher.email,
          school: teacher.school,
          matriculaFuncional: teacher.matriculaFuncional,
          contractStartDate: teacher.contractStartDate,
          contractEndDate: teacher.contractEndDate,
          contractType: teacher.contractType,
        },
        emittedAt: new Date().toISOString(),
        emissionHash,
        scope,
        turma: scope === 'single' ? activeTurma : undefined,
        totalTurmas: turmasReportData.length,
        data: turmasReportData.map((td) => ({
          turmaName: td.turmaName,
          activities: td.activityMap.map((a) => ({ id: a.activity.id, title: a.activity.title, maxGrade: a.maxGrade })),
          students: td.studentRows.map((sr) => ({
            id: sr.student.id,
            name: sr.student.fullName,
            matricula: sr.student.matricula,
            tag: sr.student.tag,
            completedCount: sr.completedCount,
            totalActivities: sr.totalActivities,
            status: sr.deliveryStatusLabel,
          })),
        })),
      };

      const record: RcoEmissionRecord = {
        id: `rco-${Date.now()}`,
        emissionHash,
        teacherId: teacher.id || 'teacher-1',
        teacherName: teacher.name || 'Prof. Gilson Flores',
        subject: teacher.subject || 'Sociologia',
        school: teacher.school || "EEB Prof. Jandira D'Ávila",
        scope,
        turma: scope === 'single' ? activeTurma : undefined,
        totalStudents: students.length,
        totalActivities: activities.length,
        turmasSummary,
        fullSnapshot: snapshot,
        emittedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };

      await saveRcoEmission(record);
      setPersistedSuccessNotice(true);
      setTimeout(() => setPersistedSuccessNotice(false), 5000);
    } catch (err) {
      console.warn('Aviso ao registrar auditoria:', err);
    } finally {
      setIsPersistingEmission(false);
    }
  };

  // Disparar Impressão nativa
  const handlePrint = async () => {
    await persistEmissionAuditTrail();
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      {/* Container Principal do Modal */}
      <div className="rco-modal-dialog bg-[#0b1326] border border-white/15 rounded-3xl w-full max-w-5xl max-h-[95vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header & Toolbar (oculto na impressão com .no-print) */}
        <div className="no-print p-4 sm:p-5 bg-[#131b2e] border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#4ade80]/20 border border-[#4ade80]/30 flex items-center justify-center text-[#4ade80] shrink-0">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white tracking-tight">
                  Mapa de Controle Docente • Lançamento de Atividades
                </h2>
                <span className="bg-[#4ade80]/20 text-[#4ade80] text-[10px] font-bold px-2 py-0.5 rounded-full border border-[#4ade80]/30">
                  Pronto para Impressão
                </span>
              </div>
              <p className="text-xs text-[#bccabb] mt-0.5">
                Organização do dia a dia do professor: conferência de entregas, notas de atividades e controle de pendências.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap self-end sm:self-center">
            <button
              onClick={handlePrint}
              className="py-2.5 px-4 bg-[#4ade80] hover:bg-[#6bfb9a] text-[#003919] font-extrabold rounded-2xl transition-all text-xs flex items-center gap-2 cursor-pointer shadow-lg shadow-[#4ade80]/20 active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir / Salvar em PDF</span>
            </button>

            <button
              onClick={handleCopyPendingList}
              className="py-2.5 px-3 bg-[#171f33] hover:bg-[#222a3d] text-[#dae2fd] font-bold rounded-2xl border border-white/10 transition-all text-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
              title="Copiar lista de pendências para WhatsApp ou bloco de notas"
            >
              {copiedState ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span className="hidden md:inline">{copiedState ? 'Copiado!' : 'Copiar Pendências'}</span>
            </button>

            <button
              onClick={handleExportCsv}
              className="py-2.5 px-3 bg-[#171f33] hover:bg-[#222a3d] text-[#dae2fd] font-bold rounded-2xl border border-white/10 transition-all text-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
              title="Exportar Planilha de Entregas (CSV)"
            >
              <Download className="w-4 h-4" />
              <span className="hidden md:inline">CSV</span>
            </button>

            <button
              onClick={onClose}
              className="p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Notificação de Persistência */}
        {persistedSuccessNotice && (
          <div className="no-print bg-emerald-500/20 border-b border-emerald-500/40 px-5 py-2 text-xs text-emerald-300 flex items-center justify-between animate-fadeIn">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                <strong>Registro de Auditoria Salvo:</strong> Código de autenticidade gravado com sucesso!
              </span>
            </div>
            <button
              onClick={() => setPersistedSuccessNotice(false)}
              className="text-emerald-300 hover:text-white"
            >
              ✕
            </button>
          </div>
        )}

        {/* Options Toolbar (no-print) */}
        <div className="no-print px-5 py-3.5 bg-[#0f172a] border-b border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-[#bccabb] font-bold flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-[#4ade80]" />
              Escopo:
            </span>
            <div className="inline-flex rounded-xl p-1 bg-[#0b1326] border border-white/10">
              <button
                type="button"
                onClick={() => setScope('all')}
                className={`px-3 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                  scope === 'all'
                    ? 'bg-[#4ade80] text-[#003919] shadow-sm'
                    : 'text-[#bccabb] hover:text-white'
                }`}
              >
                Todas as Turmas ({allTurmas.length})
              </button>
              <button
                type="button"
                onClick={() => setScope('single')}
                className={`px-3 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                  scope === 'single'
                    ? 'bg-[#4ade80] text-[#003919] shadow-sm'
                    : 'text-[#bccabb] hover:text-white'
                }`}
              >
                Turma Específica
              </button>
            </div>

            {scope === 'single' && (
              <select
                value={activeTurma}
                onChange={(e) => setActiveTurma(e.target.value)}
                className="bg-[#0b1326] border border-white/15 rounded-xl px-3 py-1.5 text-xs text-white font-bold focus:outline-none focus:border-[#4ade80] cursor-pointer"
              >
                {allTurmas.map((t) => (
                  <option key={t} value={t} className="bg-[#0b1326] text-white">
                    Turma {t}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="flex items-center gap-4 flex-wrap text-[#bccabb]">
            <label className="flex items-center gap-1.5 cursor-pointer hover:text-white">
              <input
                type="checkbox"
                checked={includeActivityDetails}
                onChange={(e) => setIncludeActivityDetails(e.target.checked)}
                className="rounded text-[#4ade80] focus:ring-[#4ade80] cursor-pointer"
              />
              <span>Quadro de Atividades</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer hover:text-white">
              <input
                type="checkbox"
                checked={includeTeacherNotesColumn}
                onChange={(e) => setIncludeTeacherNotesColumn(e.target.checked)}
                className="rounded text-[#4ade80] focus:ring-[#4ade80] cursor-pointer"
              />
              <span>Espaço para Visto / Anotações</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer hover:text-white">
              <input
                type="checkbox"
                checked={includeSpecialNeeds}
                onChange={(e) => setIncludeSpecialNeeds(e.target.checked)}
                className="rounded text-[#4ade80] focus:ring-[#4ade80] cursor-pointer"
              />
              <span>Notas de Inclusão (PNE / RAD)</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer hover:text-white">
              <input
                type="checkbox"
                checked={includeSignatures}
                onChange={(e) => setIncludeSignatures(e.target.checked)}
                className="rounded text-[#4ade80] focus:ring-[#4ade80] cursor-pointer"
              />
              <span>Assinaturas</span>
            </label>
          </div>
        </div>

        {/* Visualizador de Folha / Área de Impressão */}
        <div className="rco-scroll-container flex-1 overflow-y-auto p-4 sm:p-8 bg-[#090e1a] custom-scrollbar">
          {/* Documento A4 Timbrado Limpo */}
          <div className="rco-printable-area bg-white text-slate-900 mx-auto max-w-[210mm] shadow-2xl p-6 sm:p-10 font-sans border border-slate-200 rounded-xl print:rounded-none print:border-none print:shadow-none print:p-0">
            
            {/* SEÇÕES POR TURMA (Uma turma por página na impressão) */}
            {turmasReportData.map((turmaData, tIndex) => {
              const isFirstTurma = tIndex === 0;

              return (
                <div
                  key={turmaData.turmaName}
                  className={`turma-print-block pb-8 print:pb-8 ${!isFirstTurma ? 'rco-page-break' : ''}`}
                >
                  {/* CABEÇALHO OFICIAL INSTITUCIONAL LIMPO */}
                  <div className="border-b-2 border-slate-900 pb-3 mb-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        {/* Brasão / Identificação Estadual */}
                        <div className="w-12 h-12 rounded-lg border border-slate-800 bg-slate-100 flex flex-col items-center justify-center p-1 text-center shrink-0">
                          <span className="text-[8px] font-black text-slate-900 tracking-tighter leading-none">
                            ESTADO DE
                          </span>
                          <span className="text-[10px] font-black text-emerald-800 tracking-tighter leading-none mt-0.5">
                            SANTA
                          </span>
                          <span className="text-[10px] font-black text-emerald-800 tracking-tighter leading-none">
                            CATARINA
                          </span>
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <h1 className="text-xs font-black uppercase text-slate-900 tracking-wide">
                              GOVERNO DO ESTADO DE SANTA CATARINA • SED
                            </h1>
                          </div>
                          <h2 className="text-xs sm:text-sm font-black text-emerald-950 mt-0.5">
                            {teacher.school || "EEB Prof. Jandira D'Ávila"} • Coordenadoria Regional de Educação
                          </h2>
                          <div className="text-[10px] text-slate-600 font-semibold mt-0.5 flex items-center gap-2">
                            <span>Disciplina: <strong className="text-slate-900">{teacher.subject || 'Sociologia'}</strong></span>
                            <span>•</span>
                            <span>Professor: <strong className="text-slate-900">{teacher.name || 'Prof. Gilson Flores'}</strong></span>
                            {teacher.matriculaFuncional && (
                              <>
                                <span>•</span>
                                <span>Matrícula: <strong className="text-slate-900">{teacher.matriculaFuncional}</strong></span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="inline-block bg-slate-900 text-white rounded px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider">
                          Mapa de Lançamento
                        </div>
                        <div className="text-[9px] text-slate-500 font-medium mt-1">
                          Data: {currentDateFormatted}
                        </div>
                        <div className="text-[8px] text-slate-400 font-mono">
                          Ref: {emissionHash}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* IDENTIFICAÇÃO DA TURMA E RESUMO OPERACIONAL */}
                  <div className="bg-slate-900 text-white p-3 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-emerald-400 text-slate-950 font-black flex items-center justify-center text-xs shrink-0 shadow-sm">
                        {turmaData.turmaName.slice(0, 3)}
                      </div>
                      <div>
                        <h3 className="text-sm font-black uppercase tracking-tight">
                          TURMA {turmaData.turmaName} • CONTROLE DE ATIVIDADES E ENTREGAS
                        </h3>
                        <span className="text-[10px] text-slate-300">
                          Ano Letivo 2026 • Acompanhamento e Visto de Sala
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap text-[10px]">
                      <div className="bg-white/10 px-2 py-1 rounded text-slate-200">
                        <strong>{turmaData.studentsCount}</strong> alunos
                      </div>
                      <div className="bg-white/10 px-2 py-1 rounded text-slate-200">
                        <strong>{turmaData.activitiesCount}</strong> atividades
                      </div>
                      <div className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-1 rounded font-bold">
                        {turmaData.studentsWithAtLeastOneSubmission}/{turmaData.studentsCount} com entregas ({turmaData.engagementPercent}%)
                      </div>
                      {(turmaData.pneCount > 0 || turmaData.radCount > 0) && (
                        <div className="bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-1 rounded font-bold">
                          {turmaData.pneCount > 0 ? `${turmaData.pneCount} PNE` : ''}
                          {turmaData.pneCount > 0 && turmaData.radCount > 0 ? ' • ' : ''}
                          {turmaData.radCount > 0 ? `${turmaData.radCount} RAD` : ''}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* QUADRO DE ATIVIDADES AVALIATIVAS E RECUPERAÇÕES APLICADAS */}
                  {includeActivityDetails && turmaData.activityMap.length > 0 && (
                    <div className="mb-3 p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-[10px] rco-avoid-break">
                      <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
                        <strong className="text-[10px] font-black text-slate-900 uppercase tracking-wider">
                          Quadro de Instrumentos Avaliativos e Recuperações Paralelas:
                        </strong>
                        <div className="flex items-center gap-2 text-[8px]">
                          <span className="inline-flex items-center gap-1 font-bold text-slate-700">
                            <span className="w-3.5 h-3.5 rounded bg-slate-900 text-white flex items-center justify-center text-[7px]">A</span> Atividade Regular
                          </span>
                          <span className="inline-flex items-center gap-1 font-bold text-amber-900">
                            <span className="w-3.5 h-3.5 rounded bg-amber-600 text-white flex items-center justify-center text-[7px]">REC</span> Recuperação Paralela
                          </span>
                          <span className="inline-flex items-center gap-1 font-bold text-purple-900">
                            <span className="px-1 rounded bg-purple-100 text-purple-800 border border-purple-300 text-[7px]">Adapt.</span> Adaptação PEI
                          </span>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1.5">
                        {turmaData.activityMap.map((actItem) => (
                          <div
                            key={actItem.code}
                            className={`p-1.5 rounded border flex items-start gap-2 text-[10px] ${
                              actItem.isRecovery
                                ? 'bg-amber-50/70 border-amber-300'
                                : 'bg-white border-slate-200'
                            }`}
                          >
                            <span
                              className={`w-6 h-5 rounded font-black text-[8.5px] flex items-center justify-center shrink-0 ${
                                actItem.isRecovery
                                  ? 'bg-amber-600 text-white'
                                  : 'bg-slate-900 text-white'
                              }`}
                            >
                              {actItem.code}
                            </span>
                            <div className="min-w-0 flex-1">
                              <span className="font-bold text-slate-900 block truncate text-[10px]">
                                {actItem.activity.title}
                              </span>
                              <span className="text-[8px] text-slate-600 block">
                                {actItem.isRecovery ? 'Recuperação Paralela • ' : `Tipo: ${actItem.activity.type || 'Avaliação'} • `}
                                Valor: {actItem.maxGrade} pts • Prazo: {actItem.deadlineFormatted}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* TABELA DE ALUNOS, NOTAS E CONTROLE DE ENTREGAS */}
                  <div className="border border-slate-300 rounded-md mb-4 print:border-none print:rounded-none print:mb-2 overflow-visible">
                    <table className="w-full text-left text-[10px] border-collapse print:text-[9.5px]">
                      <thead className="bg-slate-100 text-slate-900 font-bold border-b border-slate-300 uppercase text-[9px] tracking-wider">
                        <tr className="rco-avoid-break">
                          <th className="py-1.5 px-2 w-7 text-center">Nº</th>
                          <th className="py-1.5 px-2.5">Nome do Aluno</th>
                          <th className="py-1.5 px-2 w-20 text-center">Matrícula</th>
                          <th className="py-1.5 px-1.5 w-12 text-center">Atend.</th>

                          {/* Colunas de Atividades Regulares e Recuperações */}
                          {turmaData.activityMap.map((actItem) => (
                            <th
                              key={actItem.code}
                              className={`py-1.5 px-2 w-10 text-center font-black border-l ${
                                actItem.isRecovery
                                  ? 'bg-amber-100 text-amber-950 border-amber-300'
                                  : 'text-slate-900 border-slate-200'
                              }`}
                              title={`${actItem.code}: ${actItem.activity.title} (${actItem.isRecovery ? 'Recuperação Paralela' : actItem.activity.type || 'Atividade'} - Valor: ${actItem.maxGrade} pts)`}
                            >
                              {actItem.code}
                            </th>
                          ))}

                          {/* Coluna de Entregas */}
                          <th className="py-1.5 px-2 w-16 text-center font-black text-slate-900 bg-slate-200 border-l border-slate-300">
                            Entregas
                          </th>

                          {/* Coluna de Status */}
                          <th className="py-1.5 px-2 w-24 text-center border-l border-slate-200">
                            Status
                          </th>

                          {/* Coluna de Observações do Professor / Visto Manual */}
                          {includeTeacherNotesColumn && (
                            <th className="py-1.5 px-2 text-left border-l border-slate-200 w-36">
                              Anotações / Visto
                            </th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {turmaData.studentRows.length === 0 ? (
                          <tr className="rco-avoid-break">
                            <td
                              colSpan={7 + turmaData.activityMap.length}
                              className="p-4 text-center text-slate-500 italic"
                            >
                              Nenhum aluno cadastrado nesta turma.
                            </td>
                          </tr>
                        ) : (
                          turmaData.studentRows.map((row) => (
                            <tr
                              key={row.student.id}
                              className={`rco-avoid-break hover:bg-slate-50 transition-colors ${
                                row.deliveryStatusType === 'complete'
                                  ? 'bg-emerald-50/20'
                                  : row.deliveryStatusType === 'none'
                                  ? 'bg-slate-50/60'
                                  : ''
                              }`}
                            >
                              {/* Nº */}
                              <td className="py-1.5 px-2 text-center font-bold text-slate-500 text-[10px]">
                                {String(row.index).padStart(2, '0')}
                              </td>

                              {/* Nome Completo + Destaque de Adaptação Realizada */}
                              <td className="py-1.5 px-2.5 font-bold text-slate-900 text-[10px]">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span>{row.student.fullName}</span>
                                  {row.hasUsedAdaptation && (
                                    <span
                                      className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[7.5px] font-black bg-purple-100 text-purple-800 border border-purple-300"
                                      title="Estudante realizou atividade com recurso/formato pedagógico adaptado (PEI/Inclusão)"
                                    >
                                      ★ Ativ. Adaptada
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* Matrícula */}
                              <td className="py-1.5 px-2 text-center font-mono text-slate-600 text-[9px]">
                                {row.student.matricula || '—'}
                              </td>

                              {/* Atendimento */}
                              <td className="py-1.5 px-1.5 text-center">
                                {row.isPne ? (
                                  <span className="px-1 py-0.2 rounded text-[7px] font-black bg-rose-100 text-rose-800 border border-rose-300">
                                    PNE
                                  </span>
                                ) : row.isRad ? (
                                  <span className="px-1 py-0.2 rounded text-[7px] font-black bg-amber-100 text-amber-800 border border-amber-300">
                                    RAD
                                  </span>
                                ) : (
                                  <span className="text-slate-400 text-[8px]">Reg.</span>
                                )}
                              </td>

                              {/* Notas Individuais por Atividade / Recuperação */}
                              {row.gradesPerAct.map((gItem) => (
                                <td
                                  key={gItem.code}
                                  className={`py-1.5 px-2 text-center font-mono font-bold text-[10px] border-l ${
                                    gItem.isRecovery
                                      ? 'bg-amber-50/40 border-amber-200'
                                      : 'border-slate-200'
                                  }`}
                                >
                                  {gItem.grade !== null ? (
                                    <div className="flex flex-col items-center">
                                      <span
                                        className={
                                          gItem.isRecovery
                                            ? 'text-amber-900 font-black'
                                            : 'text-slate-900 font-bold'
                                        }
                                      >
                                        {gItem.grade.toFixed(1).replace('.', ',')}
                                      </span>
                                      {gItem.isAdaptedSubmission && (
                                        <span className="text-[6.5px] font-bold text-purple-700 leading-none">
                                          (adapt.)
                                        </span>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-slate-300 font-normal">—</span>
                                  )}
                                </td>
                              ))}

                              {/* Entregas Feitas / Total */}
                              <td className="py-1.5 px-2 text-center font-mono font-bold text-[10px] bg-slate-100 border-l border-slate-300">
                                <span
                                  className={
                                    row.completedCount === row.totalActivities && row.totalActivities > 0
                                      ? 'text-emerald-900 font-black'
                                      : row.completedCount > 0
                                      ? 'text-amber-800 font-bold'
                                      : 'text-slate-400'
                                  }
                                >
                                  {row.completedCount}/{row.totalActivities}
                                </span>
                              </td>

                              {/* Status de Entrega / Pendência */}
                              <td className="py-1.5 px-2 text-center text-[9px] border-l border-slate-200">
                                {row.deliveryStatusType === 'complete' ? (
                                  <span className="text-emerald-800 font-bold">
                                    ✓ Entregue
                                  </span>
                                ) : row.deliveryStatusType === 'partial' ? (
                                  <span className="text-amber-800 font-semibold" title={`Faltam: ${row.missingCodes.join(', ')}`}>
                                    {row.missingCodes.length} pendente(s)
                                  </span>
                                ) : (
                                  <span className="text-slate-400 italic">
                                    Não entregou
                                  </span>
                                )}
                              </td>

                              {/* Campo de Anotações do Professor / Visto Manual */}
                              {includeTeacherNotesColumn && (
                                <td className="py-1.5 px-2 border-l border-slate-200 text-[8px] text-slate-400">
                                  <div className="h-4 border-b border-dashed border-slate-300 w-full"></div>
                                </td>
                              )}
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Informações Especiais de Inclusão da Turma (PNE e RAD) e Explicação Pedagógica Final */}
                  <div className="space-y-2 mb-4 rco-avoid-break">
                    {includeSpecialNeeds && (turmaData.pneCount > 0 || turmaData.radCount > 0 || turmaData.studentsWithAdaptationCount > 0) && (
                      <div className="p-2.5 bg-amber-50/60 border border-amber-300 rounded-lg text-[9px] text-slate-800 space-y-1">
                        <strong className="font-bold text-amber-950 block uppercase text-[9px]">
                          Atendimento Educacional Especializado & Adaptações Curriculares:
                        </strong>
                        <div className="space-y-0.5">
                          {turmaData.studentRows
                            .filter((r) => r.isPne || r.isRad || r.hasUsedAdaptation)
                            .map((r) => (
                              <div key={r.student.id} className="flex items-start gap-1.5">
                                <span className="font-bold text-slate-900">• {r.student.fullName}:</span>
                                <span className="text-slate-700">
                                  {r.isPne
                                    ? `Estudante com Plano de Ensino Individualizado (PEI) ${r.student.pneConditions ? `- Diagnóstico: ${r.student.pneConditions}` : ''} ${r.student.secondTeacherName ? `| Segundo(a) Professor(a): ${r.student.secondTeacherName}` : ''}`
                                    : r.isRad
                                    ? 'Estudante em Regime de Atividades Domiciliares (RAD / Atestado Médico registrado)'
                                    : 'Atividade realizada com adequação metodológica de acessibilidade'}
                                  {r.hasUsedAdaptation ? ' • [Adaptação Curricular Realizada]' : ''}
                                </span>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* Explicação Final de Registro e Validação Pedagógica */}
                    <div className="p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-[8.5px] text-slate-700 leading-relaxed">
                      <strong className="text-slate-900 font-bold uppercase block text-[9px] mb-0.5">
                        Nota de Validação e Registro Oficial:
                      </strong>
                      <p>
                        Todas as <strong>atividades avaliativas regulares</strong> e <strong>recuperações paralelas</strong> aplicadas no período letivo foram devidamente registradas neste mapa de controle. As adaptações curriculares (PEI) constituem flexibilizações metodológicas e de acessibilidade garantidas por lei aos estudantes da Educação Especial, mantendo a correspondência à atividade base sem gerar colunas adicionais de notas, encontrando-se devidamente identificadas e arquivadas no dossiê pedagógico do docente.
                      </p>
                    </div>
                  </div>

                  {/* ASSINATURA COMPACTA NO FINAL DE CADA TURMA */}
                  {includeSignatures && (
                    <div className="mt-4 pt-3 border-t border-slate-300 rco-avoid-break">
                      <div className="grid grid-cols-2 gap-8 text-center text-[9px]">
                        <div>
                          <div className="border-b border-slate-400 pb-0.5 mb-0.5">
                            <strong className="block text-slate-900 font-bold">
                              {teacher.name || 'Prof. Gilson Flores'}
                            </strong>
                            <span className="text-[8px] text-slate-600">
                              Professor(a) de {teacher.subject || 'Sociologia'}
                            </span>
                          </div>
                          <span className="text-[7px] text-slate-400">Visto do Docente Responsável</span>
                        </div>

                        <div>
                          <div className="border-b border-slate-400 pb-0.5 mb-0.5">
                            <span className="block text-slate-400 font-bold">
                              __________________________________________
                            </span>
                            <span className="text-[8px] text-slate-600 font-bold">
                              Especialista Pedagógico / Direção Escolar
                            </span>
                          </div>
                          <span className="text-[7px] text-slate-400">Visto da Coordenação</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Footer (no-print) */}
        <div className="no-print p-4 bg-[#131b2e] border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-[#bccabb]">
            <Info className="w-4 h-4 text-[#4ade80]" />
            <span>
              Para gerar o PDF físico sem margens cortadas, utilize o comando <strong>Imprimir / Salvar em PDF</strong>.
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="py-2 px-5 bg-white/10 hover:bg-white/15 text-white rounded-full text-xs font-bold transition-all cursor-pointer"
            >
              Fechar Visualização
            </button>
            <button
              onClick={handlePrint}
              className="py-2 px-6 bg-[#4ade80] hover:bg-[#6bfb9a] text-[#003919] font-black rounded-full text-xs transition-all shadow-md cursor-pointer flex items-center gap-2"
            >
              <Printer className="w-4 h-4" />
              <span>Gerar PDF Agora</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RcoPdfReportModal;
