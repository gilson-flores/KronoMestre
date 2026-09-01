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
  BookOpen,
  Award,
  ShieldCheck,
  Sparkles,
  Info,
  Calendar,
  Layers,
  GraduationCap,
  FileSpreadsheet,
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
  const [includeTransitionTerm, setIncludeTransitionTerm] = useState<boolean>(true);
  const [includeActivityDetails, setIncludeActivityDetails] = useState<boolean>(true);
  const [includeSpecialNeeds, setIncludeSpecialNeeds] = useState<boolean>(true);
  const [includeSignatures, setIncludeSignatures] = useState<boolean>(true);
  const [copiedState, setCopiedState] = useState<boolean>(false);

  // Turmas a serem incluídas no documento
  const targetTurmas = useMemo(() => {
    if (scope === 'single' && activeTurma) {
      return [activeTurma];
    }
    return allTurmas.length > 0 ? allTurmas : ['Geral'];
  }, [scope, activeTurma, allTurmas]);

  // Processamento e consolidação de dados por turma
  const turmasReportData = useMemo(() => {
    return targetTurmas.map((turmaName) => {
      // Alunos da turma
      const turmaStudents = students
        .filter((s) => s.turma?.trim().toLowerCase() === turmaName.trim().toLowerCase())
        .sort((a, b) => a.fullName.localeCompare(b.fullName));

      // Atividades da turma
      const turmaActivities = activities
        .filter((act) => canStudentAccessActivity(act.turma, turmaName))
        .sort((a, b) => {
          const dateA = new Date(a.deadline || '').getTime() || 0;
          const dateB = new Date(b.deadline || '').getTime() || 0;
          return dateA - dateB;
        });

      // Mapear código curto para cada atividade (A1, A2, A3...)
      const activityMap = turmaActivities.map((act, idx) => ({
        code: `A${idx + 1}`,
        activity: act,
        maxGrade: act.maxGrade || 10,
      }));

      // Processar notas de cada aluno
      let sumTurmaAverages = 0;
      let studentsWithGradeCount = 0;

      const studentRows = turmaStudents.map((st, sIndex) => {
        let totalPointsObtained = 0;
        let totalMaxPossible = 0;
        let gradedActivitiesCount = 0;

        const gradesPerAct = activityMap.map((item) => {
          const act = item.activity;
          // Buscar atividade adaptada ou principal
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
          let status: 'graded' | 'pending' | 'returned' | 'not_submitted' = 'not_submitted';

          if (sub) {
            const obj = Number(sub.objectiveScore) || 0;
            const ess = Number(sub.essayScore) || 0;
            const ext = Number(sub.extraPoints) || 0;
            grade = Number((obj + ess + ext).toFixed(1));
            status = (sub.status as any) || 'graded';

            if (sub.status === 'graded') {
              gradedActivitiesCount++;
            }
          }

          if (grade !== null) {
            totalPointsObtained += grade;
          }
          totalMaxPossible += item.maxGrade;

          return {
            code: item.code,
            activityId: act.id,
            grade,
            maxGrade: item.maxGrade,
            status,
          };
        });

        // Média do aluno na escala de 0 a 10
        const calculatedAverage =
          totalMaxPossible > 0 && gradedActivitiesCount > 0
            ? Number(((totalPointsObtained / totalMaxPossible) * 10).toFixed(1))
            : null;

        if (calculatedAverage !== null) {
          sumTurmaAverages += calculatedAverage;
          studentsWithGradeCount++;
        }

        const isPne = isStudentPNE(st);
        const isRad = st.tag?.toUpperCase() === 'RAD';

        return {
          index: sIndex + 1,
          student: st,
          isPne,
          isRad,
          gradesPerAct,
          calculatedAverage,
          gradedCount: gradedActivitiesCount,
          totalActivities: activityMap.length,
          statusText:
            calculatedAverage !== null
              ? calculatedAverage >= 6.0
                ? 'Apto / Regular'
                : 'Atenção / Recuperação'
              : 'Sem Entregas',
        };
      });

      const turmaAverageGrade =
        studentsWithGradeCount > 0
          ? Number((sumTurmaAverages / studentsWithGradeCount).toFixed(1))
          : 0;

      const pneCount = turmaStudents.filter((s) => isStudentPNE(s)).length;
      const radCount = turmaStudents.filter((s) => s.tag?.toUpperCase() === 'RAD').length;

      return {
        turmaName,
        studentsCount: turmaStudents.length,
        activitiesCount: turmaActivities.length,
        activityMap,
        studentRows,
        turmaAverageGrade,
        pneCount,
        radCount,
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

  // Copiar dados formatados para colar no RCO
  const handleCopyForRco = () => {
    const lines: string[] = [];
    turmasReportData.forEach((tData) => {
      lines.push(`=== TURMA ${tData.turmaName} - REGISTRO DE NOTAS RCO ===`);
      lines.push(`Aluno\tMatrícula\tMédia RCO\tSituação`);
      tData.studentRows.forEach((row) => {
        const avg = row.calculatedAverage !== null ? row.calculatedAverage.toFixed(1).replace('.', ',') : '-';
        lines.push(`${row.student.fullName}\t${row.student.matricula || '-'}\t${avg}\t${row.statusText}`);
      });
      lines.push('');
    });

    navigator.clipboard.writeText(lines.join('\n'));
    setCopiedState(true);
    setTimeout(() => setCopiedState(false), 3000);
  };

  // Exportar CSV consolidado
  const handleExportCsvConsolidated = () => {
    let csvContent = '\uFEFF';
    csvContent += 'Turma,Nº,Nome do Aluno,Matrícula,Atendimento,Média RCO (0-10),Situação\n';

    turmasReportData.forEach((tData) => {
      tData.studentRows.forEach((row) => {
        const avg = row.calculatedAverage !== null ? row.calculatedAverage.toFixed(1).replace('.', ',') : '';
        const attend = row.isPne ? 'PNE' : row.isRad ? 'RAD' : 'Regular';
        csvContent += `"${tData.turmaName}","${row.index}","${row.student.fullName}","${row.student.matricula || ''}","${attend}","${avg}","${row.statusText}"\n`;
      });
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `Livro_Registro_RCO_Consolidado_${scope === 'single' ? `Turma_${activeTurma}` : 'Todas_Turmas'}_${new Date().toISOString().slice(0, 10)}.csv`
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
        averageGrade: td.turmaAverageGrade,
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
            calculatedAverage: sr.calculatedAverage,
            status: sr.statusText,
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
      setTimeout(() => setPersistedSuccessNotice(false), 6000);
    } catch (err) {
      console.warn('Erro ao salvar auditoria de emissão RCO:', err);
    } finally {
      setIsPersistingEmission(false);
    }
  };

  // Disparar Impressão / Salvar em PDF
  const handlePrint = async () => {
    // 1. Gravar no banco de auditoria
    await persistEmissionAuditTrail();

    // 2. Abrir diálogo nativo de impressão
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      {/* Container Principal do Modal (com barra de ferramentas no topo e preview com scroll) */}
      <div className="bg-[#0b1326] border border-white/15 rounded-3xl w-full max-w-5xl max-h-[95vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header & Toolbar (oculto na impressão com .no-print) */}
        <div className="no-print p-4 sm:p-5 bg-[#131b2e] border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#4ade80]/20 border border-[#4ade80]/30 flex items-center justify-center text-[#4ade80] shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white tracking-tight">
                  Livro de Registro RCO • Transição Docente
                </h2>
                <span className="bg-[#4ade80]/20 text-[#4ade80] text-[10px] font-bold px-2 py-0.5 rounded-full border border-[#4ade80]/30">
                  Timbrado Oficial
                </span>
              </div>
              <p className="text-xs text-[#bccabb] mt-0.5">
                Relatório pedagógico completo com notas, turmas e atividades para transição de cargo.
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
              onClick={handleCopyForRco}
              className="py-2.5 px-3 bg-[#171f33] hover:bg-[#222a3d] text-[#dae2fd] font-bold rounded-2xl border border-white/10 transition-all text-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
              title="Copiar texto para colar no RCO"
            >
              {copiedState ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span className="hidden md:inline">{copiedState ? 'Copiado!' : 'Copiar'}</span>
            </button>

            <button
              onClick={handleExportCsvConsolidated}
              className="py-2.5 px-3 bg-[#171f33] hover:bg-[#222a3d] text-[#dae2fd] font-bold rounded-2xl border border-white/10 transition-all text-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
              title="Exportar CSV Consolidado"
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

        {/* Options Toolbar (no-print) */}
        {persistedSuccessNotice && (
          <div className="no-print bg-emerald-500/20 border-b border-emerald-500/40 px-5 py-2 text-xs text-emerald-300 flex items-center justify-between animate-fadeIn">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                <strong>Emissão Registrada Eternamente:</strong> Hash de autenticidade gravado no histórico imutável com sucesso!
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
                checked={includeTransitionTerm}
                onChange={(e) => setIncludeTransitionTerm(e.target.checked)}
                className="rounded text-[#4ade80] focus:ring-[#4ade80] cursor-pointer"
              />
              <span>Termo de Transição</span>
            </label>

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
                checked={includeSignatures}
                onChange={(e) => setIncludeSignatures(e.target.checked)}
                className="rounded text-[#4ade80] focus:ring-[#4ade80] cursor-pointer"
              />
              <span>Assinaturas</span>
            </label>
          </div>
        </div>

        {/* Visualizador de Folha / Área de Impressão (Scrollável no modal e perfeito no print) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-[#090e1a] custom-scrollbar">
          {/* Documento A4 Timbrado */}
          <div className="rco-printable-area bg-white text-slate-900 mx-auto max-w-[210mm] shadow-2xl p-6 sm:p-10 font-sans border border-slate-200 rounded-xl print:rounded-none print:border-none print:shadow-none print:p-0">
            {/* CABEÇALHO OFICIAL INSTITUCIONAL TIMBRADO */}
            <div className="border-b-2 border-slate-900 pb-4 mb-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  {/* Brasão / Identificação Institucional */}
                  <div className="w-14 h-14 rounded-xl border-2 border-slate-800 bg-slate-100 flex flex-col items-center justify-center p-1 text-center shrink-0">
                    <span className="text-[9px] font-black text-slate-900 tracking-tighter leading-none">
                      ESTADO DE
                    </span>
                    <span className="text-[11px] font-black text-emerald-800 tracking-tighter leading-none mt-0.5">
                      SANTA
                    </span>
                    <span className="text-[11px] font-black text-emerald-800 tracking-tighter leading-none">
                      CATARINA
                    </span>
                  </div>

                  <div>
                    <h1 className="text-xs sm:text-sm font-black uppercase text-slate-900 tracking-wider">
                      GOVERNO DO ESTADO DE SANTA CATARINA
                    </h1>
                    <h2 className="text-[11px] sm:text-xs font-bold text-slate-700 uppercase">
                      SECRETARIA DE ESTADO DA EDUCAÇÃO • SED
                    </h2>
                    <h3 className="text-sm sm:text-base font-black text-emerald-900 mt-0.5">
                      {teacher.school || "EEB Prof. Jandira D'Ávila"} • Coordenadoria Regional de Educação
                    </h3>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="inline-block bg-slate-100 border border-slate-300 rounded px-2.5 py-1 text-[10px] font-mono font-bold text-slate-800">
                    REGISTRO RCO • SED
                  </div>
                  <div className="text-[10px] text-slate-500 font-semibold mt-1">
                    Emissão: {currentDateFormatted}
                  </div>
                  <div className="text-[9px] text-slate-400 font-mono">
                    Autenticidade: {emissionHash}
                  </div>
                </div>
              </div>

              {/* Faixa com Dados da Disciplina e Regência */}
              <div className="mt-4 pt-3 border-t border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] bg-slate-50 p-2.5 rounded-lg border">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Disciplina:</span>
                  <strong className="text-slate-900 text-xs font-black">{teacher.subject || 'Sociologia'}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Professor Titular:</span>
                  <strong className="text-slate-900 text-xs font-bold">{teacher.name || 'Prof. Gilson Flores'}</strong>
                  {teacher.matriculaFuncional && (
                    <span className="text-[9px] text-slate-500 block">Matrícula: {teacher.matriculaFuncional}</span>
                  )}
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Vigência de Contrato:</span>
                  <strong className="text-slate-900 text-[11px] font-bold block">
                    {teacher.contractStartDate && teacher.contractEndDate
                      ? `${new Date(teacher.contractStartDate + 'T00:00:00').toLocaleDateString('pt-BR')} a ${new Date(teacher.contractEndDate + 'T00:00:00').toLocaleDateString('pt-BR')}`
                      : 'Ano Letivo 2026 • Regular'}
                  </strong>
                  <span className="text-[9px] text-emerald-800 font-semibold uppercase">{teacher.contractType || 'ACT / Contratado'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Contato Institucional:</span>
                  <strong className="text-slate-900 text-[10px] font-medium block truncate">{teacher.email || 'gilson.flores@escola.edu.br'}</strong>
                </div>
              </div>
            </div>

            {/* TÍTULO PRINCIPAL DO DOCUMENTO */}
            <div className="text-center my-5 pb-3 border-b border-slate-300">
              <h2 className="text-base sm:text-lg font-black uppercase tracking-tight text-slate-900">
                LIVRO DE REGISTRO DE CLASSE ONLINE (RCO)
              </h2>
              <p className="text-xs font-bold text-slate-600 uppercase tracking-widest mt-0.5">
                CONSOLIDAÇÃO GERAL DE ATIVIDADES, NOTAS E TRANSIÇÃO DE REGÊNCIA DOCENTE
              </p>
            </div>

            {/* TERMO DE TRANSIÇÃO E DIRETRIZES PEDAGÓGICAS */}
            {includeTransitionTerm && (
              <div className="mb-6 bg-emerald-50/70 border border-emerald-300 p-4 rounded-xl text-xs text-slate-800 space-y-2 rco-avoid-break">
                <div className="flex items-center gap-2 font-black text-emerald-950 uppercase text-[11px]">
                  <Building2 className="w-4 h-4 text-emerald-800 shrink-0" />
                  <span>Termo de Transição Pedagógica • Para o Sucessor e Coordenação</span>
                </div>
                <p className="text-[11px] leading-relaxed text-slate-700">
                  O presente documento tem por finalidade registrar e oficializar todo o histórico de avaliações, redações dissertativas, dinâmicas e notas parciais acumuladas pelos estudantes das turmas sob minha regência na disciplina de <strong>{teacher.subject || 'Sociologia'}</strong>.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-[10px]">
                  <div className="bg-white p-2 rounded border border-emerald-200">
                    <strong className="block text-emerald-900 font-bold mb-0.5">1. Critérios de Avaliação</strong>
                    <span>Atividades objetivas com correção automatizada + questões dissertativas com rubrica analítica (Escala 0 a 10).</span>
                  </div>
                  <div className="bg-white p-2 rounded border border-emerald-200">
                    <strong className="block text-emerald-900 font-bold mb-0.5">2. Recuperação Paralela</strong>
                    <span>Direito contínuo de recuperação após o vencimento, integrado à nota consolidada da turma.</span>
                  </div>
                  <div className="bg-white p-2 rounded border border-emerald-200">
                    <strong className="block text-emerald-900 font-bold mb-0.5">3. Inclusão (PNE / RAD)</strong>
                    <span>Adaptações curriculares específicas registradas para estudantes com necessidades especiais e atestados.</span>
                  </div>
                </div>
              </div>
            )}

            {/* RESUMO GERAL DAS TURMAS (SE FOR LIVRO COMPLETO) */}
            {scope === 'all' && turmasReportData.length > 1 && (
              <div className="mb-6 rco-avoid-break">
                <h3 className="text-xs font-black uppercase text-slate-900 mb-2 flex items-center gap-1.5">
                  <GraduationCap className="w-3.5 h-3.5 text-emerald-800" />
                  <span>Quadro Resumo Consolidado das Turmas</span>
                </h3>
                <div className="border border-slate-300 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-slate-100 font-bold text-slate-800 border-b border-slate-300">
                      <tr>
                        <th className="py-2 px-3">Turma</th>
                        <th className="py-2 px-3 text-center">Nº Alunos</th>
                        <th className="py-2 px-3 text-center">Atividades Aplicadas</th>
                        <th className="py-2 px-3 text-center">PNE / RAD</th>
                        <th className="py-2 px-3 text-right">Média Geral da Turma</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {turmasReportData.map((tItem) => (
                        <tr key={tItem.turmaName} className="hover:bg-slate-50">
                          <td className="py-2 px-3 font-bold text-slate-900">
                            Turma {tItem.turmaName}
                          </td>
                          <td className="py-2 px-3 text-center text-slate-700">
                            {tItem.studentsCount}
                          </td>
                          <td className="py-2 px-3 text-center text-slate-700">
                            {tItem.activitiesCount}
                          </td>
                          <td className="py-2 px-3 text-center">
                            {tItem.pneCount > 0 || tItem.radCount > 0 ? (
                              <span className="text-[10px] font-bold text-slate-800">
                                {tItem.pneCount} PNE {tItem.radCount > 0 ? `• ${tItem.radCount} RAD` : ''}
                              </span>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-right font-black text-emerald-800">
                            {tItem.turmaAverageGrade.toFixed(1).replace('.', ',')} pts
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* SEÇÕES POR TURMA (COM QUEBRA DE PÁGINA) */}
            {turmasReportData.map((turmaData, tIndex) => {
              const isFirstTurma = tIndex === 0;

              return (
                <div
                  key={turmaData.turmaName}
                  className={`mt-8 ${!isFirstTurma ? 'rco-page-break pt-6' : ''}`}
                >
                  {/* Cabeçalho da Turma */}
                  <div className="bg-slate-900 text-white p-3.5 rounded-t-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-emerald-400 text-slate-950 font-black flex items-center justify-center text-xs shrink-0">
                        {turmaData.turmaName.slice(0, 3)}
                      </div>
                      <div>
                        <h3 className="text-sm font-black uppercase tracking-tight">
                          TURMA {turmaData.turmaName} • DIÁRIO E NOTAS RCO
                        </h3>
                        <span className="text-[10px] text-slate-300">
                          {turmaData.studentsCount} alunos matriculados • {turmaData.activitiesCount} atividades registradas
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-xs self-start sm:self-center">
                      <span className="text-slate-300 text-[11px]">
                        Média da Turma:
                      </span>
                      <strong className="text-sm font-black text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-500/40">
                        {turmaData.turmaAverageGrade.toFixed(1).replace('.', ',')} / 10
                      </strong>
                    </div>
                  </div>

                  {/* Quadro de Atividades Realizadas na Turma */}
                  {includeActivityDetails && turmaData.activityMap.length > 0 && (
                    <div className="p-3 bg-slate-50 border-x border-b border-slate-300 text-[10px] text-slate-700 space-y-1.5 rco-avoid-break">
                      <strong className="text-[11px] font-bold text-slate-900 block uppercase">
                        Quadro de Atividades Avaliativas Aplicadas:
                      </strong>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                        {turmaData.activityMap.map((actItem) => (
                          <div
                            key={actItem.code}
                            className="bg-white p-2 rounded border border-slate-200 flex items-start gap-2 shadow-xs"
                          >
                            <span className="w-5 h-5 rounded bg-emerald-800 text-white font-black text-[10px] flex items-center justify-center shrink-0">
                              {actItem.code}
                            </span>
                            <div className="min-w-0">
                              <span className="font-bold text-slate-900 block truncate text-[11px]">
                                {actItem.activity.title}
                              </span>
                              <span className="text-[9px] text-slate-500 block">
                                Tipo: {actItem.activity.type} • Valor: {actItem.maxGrade} pts
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Tabela Matriz de Alunos e Notas RCO */}
                  <div className="border border-slate-300 rounded-b-xl overflow-hidden mt-0">
                    <table className="w-full text-left text-[10px]">
                      <thead className="bg-slate-200 text-slate-900 font-bold border-b border-slate-300 uppercase text-[9px] tracking-wider">
                        <tr>
                          <th className="py-2 px-2 w-8 text-center">Nº</th>
                          <th className="py-2 px-3">Aluno</th>
                          <th className="py-2 px-2 text-center">Matrícula</th>
                          <th className="py-2 px-2 text-center">Atend.</th>

                          {/* Colunas de Atividades (A1, A2, A3...) */}
                          {turmaData.activityMap.map((actItem) => (
                            <th
                              key={actItem.code}
                              className="py-2 px-2 text-center font-black text-slate-900 border-l border-slate-300"
                              title={`${actItem.code}: ${actItem.activity.title}`}
                            >
                              {actItem.code}
                            </th>
                          ))}

                          <th className="py-2 px-3 text-right font-black text-slate-950 bg-slate-300 border-l border-slate-400">
                            Média RCO
                          </th>
                          <th className="py-2 px-2 text-center">Situação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {turmaData.studentRows.length === 0 ? (
                          <tr>
                            <td
                              colSpan={6 + turmaData.activityMap.length}
                              className="p-4 text-center text-slate-500 italic"
                            >
                              Nenhum aluno cadastrado nesta turma.
                            </td>
                          </tr>
                        ) : (
                          turmaData.studentRows.map((row) => (
                            <tr
                              key={row.student.id}
                              className="hover:bg-slate-50 transition-colors"
                            >
                              {/* Nº */}
                              <td className="py-1.5 px-2 text-center font-bold text-slate-500 text-[10px]">
                                {String(row.index).padStart(2, '0')}
                              </td>

                              {/* Nome Completo */}
                              <td className="py-1.5 px-3 font-bold text-slate-900 text-[11px]">
                                {row.student.fullName}
                              </td>

                              {/* Matrícula */}
                              <td className="py-1.5 px-2 text-center font-mono text-slate-600 text-[10px]">
                                {row.student.matricula || '-'}
                              </td>

                              {/* Atendimento */}
                              <td className="py-1.5 px-2 text-center">
                                {row.isPne ? (
                                  <span className="px-1.5 py-0.5 rounded text-[8px] font-black bg-rose-100 text-rose-800 border border-rose-300">
                                    PNE
                                  </span>
                                ) : row.isRad ? (
                                  <span className="px-1.5 py-0.5 rounded text-[8px] font-black bg-amber-100 text-amber-800 border border-amber-300">
                                    RAD
                                  </span>
                                ) : (
                                  <span className="text-slate-400 text-[9px]">Reg.</span>
                                )}
                              </td>

                              {/* Notas Individuais por Atividade */}
                              {row.gradesPerAct.map((gItem) => (
                                <td
                                  key={gItem.code}
                                  className="py-1.5 px-2 text-center font-mono font-bold text-[10px] border-l border-slate-200"
                                >
                                  {gItem.grade !== null ? (
                                    <span className="text-slate-900 font-black">
                                      {gItem.grade.toFixed(1).replace('.', ',')}
                                    </span>
                                  ) : (
                                    <span className="text-slate-300 font-normal">-</span>
                                  )}
                                </td>
                              ))}

                              {/* Média Final RCO */}
                              <td className="py-1.5 px-3 text-right font-mono font-black text-xs bg-slate-100 border-l border-slate-300">
                                {row.calculatedAverage !== null ? (
                                  <span
                                    className={
                                      row.calculatedAverage >= 6.0
                                        ? 'text-emerald-900'
                                        : 'text-rose-900'
                                    }
                                  >
                                    {row.calculatedAverage.toFixed(1).replace('.', ',')}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 italic text-[10px]">Sem nota</span>
                                )}
                              </td>

                              {/* Situação */}
                              <td className="py-1.5 px-2 text-center text-[9px] font-bold">
                                {row.calculatedAverage !== null ? (
                                  row.calculatedAverage >= 6.0 ? (
                                    <span className="text-emerald-800">Apto</span>
                                  ) : (
                                    <span className="text-rose-800">Recup.</span>
                                  )
                                ) : (
                                  <span className="text-slate-400">Pendente</span>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Informações Especiais de Inclusão da Turma (PNE e RAD) */}
                  {includeSpecialNeeds && (turmaData.pneCount > 0 || turmaData.radCount > 0) && (
                    <div className="mt-3 p-3 bg-amber-50/70 border border-amber-300 rounded-lg text-[10px] text-slate-800 space-y-1 rco-avoid-break">
                      <strong className="font-bold text-amber-950 block uppercase text-[10px]">
                        Observações Pedagógicas de Atendimento Inclusivo da Turma:
                      </strong>
                      <div className="space-y-0.5">
                        {turmaData.studentRows
                          .filter((r) => r.isPne || r.isRad)
                          .map((r) => (
                            <div key={r.student.id} className="flex items-center gap-2">
                              <span className="font-bold text-slate-900">• {r.student.fullName}:</span>
                              <span className="text-slate-700">
                                {r.isPne
                                  ? `Estudante PNE (Inclusão) ${r.student.pneConditions ? `- Laudo: ${r.student.pneConditions}` : ''} ${r.student.secondTeacherName ? `(Acompanhamento: ${r.student.secondTeacherName})` : ''}`
                                  : 'Estudante em Regime de Atividades Domiciliares (RAD / Atestados)'}
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* TERMO DE ENCERRAMENTO E ASSINATURAS OFICIAIS */}
            {includeSignatures && (
              <div className="mt-10 pt-6 border-t-2 border-slate-800 rco-avoid-break">
                <div className="text-center text-[11px] text-slate-600 mb-8">
                  Documento lavrado e consolidado na EEB Prof. Jandira D&apos;Ávila em <strong>{currentDateFormatted}</strong> para fins de registro oficial no RCO e continuidade do ano letivo.
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center text-xs">
                  {/* Assinatura 1: Professor Titular */}
                  <div className="space-y-1">
                    <div className="border-b border-slate-900 pb-1 mb-1">
                      <strong className="block text-slate-900 font-black text-[11px]">
                        {teacher.name || 'Prof. Gilson Flores'}
                      </strong>
                      <span className="text-[10px] text-slate-600 block">
                        Professor Titular de {teacher.subject || 'Sociologia'}
                      </span>
                    </div>
                    <span className="text-[9px] text-slate-400">Responsável pelos Lançamentos</span>
                  </div>

                  {/* Assinatura 2: Professor Sucessor */}
                  <div className="space-y-1">
                    <div className="border-b border-slate-900 pb-1 mb-1">
                      <span className="block text-slate-400 font-bold text-[11px]">
                        __________________________________
                      </span>
                      <span className="text-[10px] text-slate-600 block font-bold">
                        Professor(a) Sucessor(a)
                      </span>
                    </div>
                    <span className="text-[9px] text-slate-400">Assumindo a Regência das Turmas</span>
                  </div>

                  {/* Assinatura 3: Direção / Especialista Pedagógico */}
                  <div className="space-y-1">
                    <div className="border-b border-slate-900 pb-1 mb-1">
                      <span className="block text-slate-400 font-bold text-[11px]">
                        __________________________________
                      </span>
                      <span className="text-[10px] text-slate-600 block font-bold">
                        Especialista / Direção Escolar
                      </span>
                    </div>
                    <span className="text-[9px] text-slate-400">Visto e Homologação Pedagógica</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer (no-print) */}
        <div className="no-print p-4 bg-[#131b2e] border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-[#bccabb]">
            <Info className="w-4 h-4 text-[#4ade80]" />
            <span>
              Para gerar o PDF físico, selecione <strong>Salvar como PDF</strong> no diálogo de impressão do seu navegador.
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
              <span>Gerar PDF Timbrado Agora</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RcoPdfReportModal;
