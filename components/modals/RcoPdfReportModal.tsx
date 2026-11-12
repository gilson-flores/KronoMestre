import { RcoPdfReportModalBody } from "@/components/parts/RcoPdfReportModalBody";
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
  const [userActiveTurma, setUserActiveTurma] = useState<string>(selectedTurmaInitial || '');
  const [includeActivityDetails, setIncludeActivityDetails] = useState<boolean>(true);
  const [includeSpecialNeeds, setIncludeSpecialNeeds] = useState<boolean>(true);
  const [includeSignatures, setIncludeSignatures] = useState<boolean>(true);
  const [copiedState, setCopiedState] = useState<boolean>(false);

  // Derived activeTurma ensuring no stale residual turma after archiving
  const activeTurma = useMemo(() => {
    if (userActiveTurma && allTurmas.includes(userActiveTurma)) {
      return userActiveTurma;
    }
    return allTurmas[0] || '';
  }, [userActiveTurma, allTurmas]);

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

  // Disparar Impressão isolada e compatível com Desktop, Tablet e Celular
  const handlePrint = async () => {
    await persistEmissionAuditTrail();

    if (typeof window === 'undefined') return;

    const printableElement = document.getElementById('rco-printable-document');
    if (!printableElement) {
      window.print();
      return;
    }

    try {
      // 1. Salvar display original de todos os filhos do body e ocultá-los
      const originalDisplays = new Map<Element, string>();
      Array.from(document.body.children).forEach((child) => {
        if (
          child.tagName !== 'SCRIPT' &&
          child.tagName !== 'STYLE' &&
          child.id !== 'rco-isolated-print-container'
        ) {
          originalDisplays.set(child, (child as HTMLElement).style.display);
          (child as HTMLElement).style.display = 'none';
        }
      });

      // 2. Criar container exclusivo para a impressão no body
      const printContainer = document.createElement('div');
      printContainer.id = 'rco-isolated-print-container';
      printContainer.style.width = '100%';
      printContainer.style.backgroundColor = '#ffffff';
      printContainer.style.margin = '0';
      printContainer.style.padding = '0';
      printContainer.style.position = 'absolute'; // Para garantir topo absoluto visual no print se necessário, ou static
      printContainer.style.top = '0';
      printContainer.style.left = '0';

      // 3. Clonar o conteúdo (isso herda todo o CSS do Tailwind já carregado)
      const clone = printableElement.cloneNode(true);
      printContainer.appendChild(clone);
      document.body.appendChild(printContainer);

      // 4. Disparar a impressão e depois restaurar a tela original
      setTimeout(() => {
        try {
          window.print();
        } finally {
          // Cleanup
          if (document.body.contains(printContainer)) {
            document.body.removeChild(printContainer);
          }
          originalDisplays.forEach((display, child) => {
            (child as HTMLElement).style.display = display;
          });
        }
      }, 150);
    } catch (e) {
      console.warn('Erro ao preparar impressão isolada:', e);
      window.print();
    }
  };

  if (!isOpen) return null;

  return <RcoPdfReportModalBody {...{ onClose, teacher, allTurmas, activeTurma, turmasReportData, currentDateFormatted, handleCopyPendingList, handleExportCsv, handlePrint, scope, setScope, setUserActiveTurma, includeActivityDetails, setIncludeActivityDetails, includeSpecialNeeds, setIncludeSpecialNeeds, includeSignatures, setIncludeSignatures, copiedState, emissionHash, persistedSuccessNotice, setPersistedSuccessNotice }} />;
};

export default RcoPdfReportModal;
