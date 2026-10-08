'use client';

import React, { useState, useMemo } from 'react';
import {
  FileSpreadsheet,
  Users,
  BookOpen,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  Copy,
  Check,
  Download,
  Filter,
  GraduationCap,
  Sparkles,
  FileText,
  Printer,
  Layers,
  GitFork,
} from 'lucide-react';
import { Activity, StudentUser, TeacherUser } from '@/lib/types';
import {
  canStudentAccessActivity,
  isStudentPNE,
  getOriginalTurmas,
  getChildRecoveryActivities,
  getChildAdaptations,
  isActivityRecovery,
  isActivityAdapted,
} from '@/lib/studentUtils';
import { formatAvatarUrl } from '@/lib/utils';
import { initialTeacher } from '@/lib/initialData';
import { RcoPdfReportModal } from '@/components/modals/RcoPdfReportModal';
import { RcoEmissionsHistory } from '@/components/RcoEmissionsHistory';

interface PostagemRcoViewProps {
  activities: Activity[];
  students: StudentUser[];
  onSelectActivityForGrading?: (act: Activity) => void;
  teacher?: TeacherUser;
}

export const PostagemRcoView: React.FC<PostagemRcoViewProps> = ({
  activities = [],
  students = [],
  onSelectActivityForGrading,
  teacher = initialTeacher,
}) => {
  // Extrair apenas as turmas originais dos alunos (101, 102, 104, 201, 202, 2001, 301, 302, 3001)
  const allTurmas = useMemo(() => {
    return getOriginalTurmas(students);
  }, [students]);

  // Selected filters
  const [userSelectedTurma, setUserSelectedTurma] = useState<string>('');
  const [selectedActivityId, setSelectedActivityId] = useState<string>('all');
  const [searchStudent, setSearchStudent] = useState<string>('');
  const [copiedNotification, setCopiedNotification] = useState<boolean>(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState<boolean>(false);

  // Selected turma that dynamically adapts to active turmas (e.g. after archiving)
  const selectedTurma = useMemo(() => {
    if (userSelectedTurma && allTurmas.includes(userSelectedTurma)) {
      return userSelectedTurma;
    }
    return allTurmas[0] || '';
  }, [userSelectedTurma, allTurmas]);

  // Filter activities available for the selected turma (todas: ativas e inativas)
  const activitiesForTurma = useMemo(() => {
    if (!selectedTurma) return [];
    return activities.filter((act) => {
      return canStudentAccessActivity(act.turma, selectedTurma);
    });
  }, [activities, selectedTurma]);

  // Todas as atividades do sistema (ativas e inativas) ordenadas
  const allSystemActivities = useMemo(() => {
    return [...activities].sort((a, b) => a.title.localeCompare(b.title));
  }, [activities]);

  // Se uma atividade específica for selecionada (busca tanto na turma quanto em todas as atividades)
  const currentActivity = useMemo(() => {
    if (selectedActivityId === 'all' || !selectedActivityId) {
      return null; // modo todas as atividades
    }
    const found = activities.find((a) => a.id === selectedActivityId);
    return found || null;
  }, [activities, selectedActivityId]);

  // All students belonging to the selected turma
  const studentsInTurma = useMemo(() => {
    if (!selectedTurma) return [];
    return students
      .filter((s) => s.turma?.trim().toLowerCase() === selectedTurma.trim().toLowerCase())
      .sort((a, b) => a.fullName.localeCompare(b.fullName));
  }, [students, selectedTurma]);

  // Map each student in the turma with their grades and status across all activities or a single activity
  const studentGradesList = useMemo(() => {
    if (activitiesForTurma.length === 0 || studentsInTurma.length === 0) return [];

    // Se uma atividade específica foi selecionada
    if (currentActivity) {
      const childRecs = getChildRecoveryActivities(currentActivity, activities);
      const childAdaps = getChildAdaptations(currentActivity, activities);
      const relatedActivities = [currentActivity, ...childAdaps, ...childRecs];

      const allRelatedSubmissions = relatedActivities.flatMap((a) => a.submissions || []);

      return studentsInTurma.map((st) => {
        const subsForStudent = allRelatedSubmissions.filter(
          (s) =>
            s.studentId === st.id ||
            (Boolean(st.matricula) && s.matricula === st.matricula) ||
            s.studentName?.trim().toLowerCase() === st.fullName.trim().toLowerCase()
        );

        let status: 'graded' | 'pending' | 'returned' | 'not_submitted' = 'not_submitted';
        let totalGrade: number | null = null;
        let sub: any = null;

        if (subsForStudent.length > 0) {
          // Maior nota obtida entre atividade mãe ou filhas (ex: recuperação)
          let bestGrade = -1;
          let bestSub = subsForStudent[0];

          subsForStudent.forEach((s) => {
            const obj = Number(s.objectiveScore) || 0;
            const ess = Number(s.essayScore) || 0;
            const ext = Number(s.extraPoints) || 0;
            const total = Number((obj + ess + ext).toFixed(1));
            if (total > bestGrade) {
              bestGrade = total;
              bestSub = s;
            }
          });

          sub = bestSub;
          totalGrade = bestGrade >= 0 ? bestGrade : null;

          if (bestSub.status === 'graded') {
            status = 'graded';
          } else if (bestSub.status === 'pending' || bestSub.status === 'draft') {
            status = 'pending';
          } else if (bestSub.status === 'returned') {
            status = 'returned';
          }
        }

        return {
          student: st,
          submission: sub || null,
          status,
          totalGrade,
          maxGrade: currentActivity.maxGrade || 10,
          activityTitle: currentActivity.title,
          activityGrades: [],
        };
      });
    }

    // Modo "Todas as Atividades": calcula média geral e consolida notas por atividade para cada estudante
    return studentsInTurma.map((st) => {
      const perActivityGrades: { activityId: string; activityTitle: string; grade: number | null; maxGrade: number; status: string }[] = [];
      let totalSum = 0;
      let totalMax = 0;
      let gradedCount = 0;
      let pendingCount = 0;

      activitiesForTurma.forEach((act) => {
        // Se a atividade for filha de recuperação ou adaptação, ela já é consolidada pela mãe quando em visão global
        if (isActivityRecovery(act)) {
          return;
        }

        // Buscar filhas de recuperação e adaptação ligadas a esta atividade mãe
        const childRecs = getChildRecoveryActivities(act, activities);
        const childAdaps = getChildAdaptations(act, activities);
        const allRelatedActs = [act, ...childAdaps, ...childRecs];

        const allSubs = allRelatedActs.flatMap((a) => a.submissions || []);
        const subsForStudent = allSubs.filter(
          (s) =>
            s.studentId === st.id ||
            (Boolean(st.matricula) && s.matricula === st.matricula) ||
            s.studentName?.trim().toLowerCase() === st.fullName.trim().toLowerCase()
        );

        let g: number | null = null;
        let stt = 'not_submitted';

        if (subsForStudent.length > 0) {
          // Seleciona a maior nota obtida entre atividade mãe, adaptação ou recuperação paralela
          let bestGrade = -1;
          let bestSub = subsForStudent[0];

          subsForStudent.forEach((sub) => {
            const obj = Number(sub.objectiveScore) || 0;
            const ess = Number(sub.essayScore) || 0;
            const ext = Number(sub.extraPoints) || 0;
            const total = Number((obj + ess + ext).toFixed(1));
            if (total > bestGrade) {
              bestGrade = total;
              bestSub = sub;
            }
          });

          g = bestGrade >= 0 ? bestGrade : null;
          stt = bestSub.status;

          if (bestSub.status === 'graded') {
            gradedCount++;
          } else if (bestSub.status === 'pending' || bestSub.status === 'draft') {
            pendingCount++;
          }
        }

        if (g !== null) {
          totalSum += g;
        }
        totalMax += (act.maxGrade || 10);

        perActivityGrades.push({
          activityId: act.id,
          activityTitle: act.title,
          grade: g,
          maxGrade: act.maxGrade || 10,
          status: stt,
        });
      });

      let overallStatus: 'graded' | 'pending' | 'returned' | 'not_submitted' = 'not_submitted';
      if (gradedCount === activitiesForTurma.length && activitiesForTurma.length > 0) {
        overallStatus = 'graded';
      } else if (pendingCount > 0) {
        overallStatus = 'pending';
      } else if (gradedCount > 0) {
        overallStatus = 'graded';
      }

      // Média proporcional na escala de 0 a 10
      const averageGrade = totalMax > 0 && gradedCount > 0 ? Number(((totalSum / totalMax) * 10).toFixed(1)) : null;

      return {
        student: st,
        submission: null,
        status: overallStatus,
        totalGrade: averageGrade,
        maxGrade: 10,
        activityTitle: 'Todas as Atividades (Média Geral)',
        activityGrades: perActivityGrades,
      };
    });
  }, [currentActivity, activitiesForTurma, activities, studentsInTurma]);

  // Filtered by search query if typed
  const filteredList = useMemo(() => {
    if (!searchStudent.trim()) return studentGradesList;
    const q = searchStudent.toLowerCase().trim();
    return studentGradesList.filter(
      (item) =>
        item.student.fullName.toLowerCase().includes(q) ||
        (item.student.matricula && item.student.matricula.toLowerCase().includes(q))
    );
  }, [studentGradesList, searchStudent]);

  // Copy notes list formatted for RCO pasting
  const handleCopyGradesForRco = () => {
    if (studentGradesList.length === 0) return;

    const lines = studentGradesList.map((item) => {
      const gradeStr = item.totalGrade !== null ? item.totalGrade.toFixed(1).replace('.', ',') : '-';
      return `${item.student.fullName}\t${gradeStr}`;
    });

    const textToCopy = lines.join('\n');
    navigator.clipboard.writeText(textToCopy);
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 3500);
  };

  // Export CSV for RCO
  const handleExportCsv = () => {
    if (studentGradesList.length === 0) return;

    const activityName = currentActivity ? currentActivity.title : 'Todas_as_Atividades';
    const header = 'Nome do Aluno,Matricula,Turma,Atividade,Nota Obtida,Nota Maxima,Status\n';
    const rows = studentGradesList
      .map((item) => {
        const gradeStr = item.totalGrade !== null ? item.totalGrade.toFixed(1).replace('.', ',') : '';
        const statusLabel =
          item.status === 'graded'
            ? 'Avaliado'
            : item.status === 'pending'
            ? 'Pendente de Correção'
            : 'Não Entregue';
        return `"${item.student.fullName}","${item.student.matricula || ''}","${selectedTurma}","${item.activityTitle || activityName}","${gradeStr}","${item.maxGrade}","${statusLabel}"`;
      })
      .join('\n');

    const blob = new Blob(['\uFEFF' + header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `RCO_Notas_${selectedTurma}_${activityName.replace(/[^a-zA-Z0-9]/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface p-5 sm:p-6 rounded-3xl border border-border shadow-lg">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary shrink-0">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
              Postagem RCO
            </h1>
            <p className="text-xs sm:text-sm text-muted font-medium mt-0.5">
              Selecione a turma e a atividade para visualizar e exportar as notas dos alunos.
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2.5 self-start sm:self-center flex-wrap">
          <button
            onClick={() => setIsPdfModalOpen(true)}
            className="py-2.5 px-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black rounded-2xl transition-all text-xs flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/25 active:scale-95 border border-emerald-300/40"
            title="Gerar Livro de Registro RCO oficial timbrado em PDF para transição docente"
          >
            <FileText className="w-4 h-4 text-slate-950" />
            <span>📄 Gerar PDF Timbrado RCO</span>
          </button>

          <button
            onClick={handleCopyGradesForRco}
            disabled={studentGradesList.length === 0}
            className="py-2.5 px-4 bg-[#171f33] hover:bg-surface-hover text-primary font-bold rounded-2xl border border-primary/30 transition-all text-xs flex items-center gap-2 cursor-pointer shadow-sm active:scale-95 disabled:opacity-40"
            title="Copiar lista de nomes e notas para colar no RCO"
          >
            {copiedNotification ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            <span>{copiedNotification ? 'Copiado para o RCO!' : 'Copiar Notas'}</span>
          </button>

          <button
            onClick={handleExportCsv}
            disabled={studentGradesList.length === 0}
            className="py-2.5 px-4 bg-primary hover:bg-primary-hover text-white font-bold rounded-2xl transition-all text-xs flex items-center gap-2 cursor-pointer shadow-md shadow-primary/20 active:scale-95 disabled:opacity-40"
          >
            <Download className="w-4 h-4" />
            <span>Exportar CSV</span>
          </button>
        </div>
      </div>

      {/* Selectors Panel (Turma e Atividade) */}
      <div className="glass-panel p-5 rounded-3xl border border-border bg-surface space-y-4 shadow-md">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Seletor de Turma */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted flex items-center gap-1.5 uppercase tracking-wider">
              <Users className="w-3.5 h-3.5 text-primary" />
              <span>1. Selecione a Turma:</span>
            </label>
            <select
              value={selectedTurma}
              onChange={(e) => {
                setUserSelectedTurma(e.target.value);
                setSelectedActivityId('all'); // Mantem padrão em 'all'
              }}
              className="w-full bg-background border border-white/15 rounded-2xl px-4 py-3 text-sm text-foreground font-bold focus:outline-none focus:border-primary cursor-pointer"
            >
              {allTurmas.length === 0 ? (
                <option value="">Nenhuma turma cadastrada</option>
              ) : (
                allTurmas.map((t) => (
                  <option key={t} value={t} className="bg-background text-foreground py-1">
                    Turma {t} ({students.filter((s) => s.turma === t).length} alunos)
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Seletor de Atividade (Todas as atividades: ativas e inativas) */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted flex items-center gap-1.5 uppercase tracking-wider">
              <BookOpen className="w-3.5 h-3.5 text-primary" />
              <span>2. Selecione a Atividade (Ativas e Inativas):</span>
            </label>
            <select
              value={selectedActivityId}
              onChange={(e) => setSelectedActivityId(e.target.value)}
              disabled={activitiesForTurma.length === 0 && allSystemActivities.length === 0}
              className="w-full bg-background border border-white/15 rounded-2xl px-4 py-3 text-sm text-foreground font-bold focus:outline-none focus:border-primary cursor-pointer disabled:opacity-50"
            >
              {activitiesForTurma.length === 0 ? (
                <option value="">Nenhuma atividade para a turma {selectedTurma}</option>
              ) : (
                <>
                  <option value="all" className="bg-background text-primary font-bold py-1">
                    📚 Todas as Atividades ({activitiesForTurma.length} na turma) • Média Geral
                  </option>
                  
                  {/* Atividades vinculadas à Turma */}
                  <optgroup label={`Atividades da Turma ${selectedTurma} (Ativas e Inativas)`}>
                    {activitiesForTurma.map((act) => {
                      const isInactive = act.status === 'Inativo';
                      const statusIcon = isInactive ? '⏸️ [Inativa]' : act.status === 'Prazo Encerrado' ? '🔒 [Encerrada]' : '✅ [Ativa]';
                      return (
                        <option key={act.id} value={act.id} className="bg-background text-foreground py-1">
                          {statusIcon} {act.title} [{act.type}] • {act.maxGrade || 10} pts {isInactive ? '(Oculta)' : ''}
                        </option>
                      );
                    })}
                  </optgroup>

                  {/* Outras Atividades do Sistema (se houver alguma fora da turma) */}
                  {allSystemActivities.some((act) => !canStudentAccessActivity(act.turma, selectedTurma)) && (
                    <optgroup label="Outras Atividades do Sistema (Ativas / Inativas)">
                      {allSystemActivities
                        .filter((act) => !canStudentAccessActivity(act.turma, selectedTurma))
                        .map((act) => {
                          const isInactive = act.status === 'Inativo';
                          const statusIcon = isInactive ? '⏸️ [Inativa]' : '🌐';
                          return (
                            <option key={act.id} value={act.id} className="bg-background text-foreground/80 py-1">
                              {statusIcon} {act.title} (Turma {act.turma}) • {act.maxGrade || 10} pts
                            </option>
                          );
                        })}
                    </optgroup>
                  )}
                </>
              )}
            </select>
          </div>
        </div>

        {/* Current Activity Info Strip & Student Search */}
        <div className="pt-3 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 flex-wrap text-xs text-muted">
            <span className="font-bold text-foreground text-sm">
              {currentActivity ? currentActivity.title : `Todas as Atividades (${activitiesForTurma.length})`}
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-[#171f33] text-[#c0c1ff] font-semibold border border-border">
              {currentActivity ? currentActivity.type : 'Média Geral das Atividades'}
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-amber-400/10 text-amber-600 font-bold border border-amber-400/20">
              {currentActivity ? `Nota Máxima: ${currentActivity.maxGrade || 10} pontos` : 'Escala: 0 a 10'}
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-primary font-bold border border-emerald-500/20">
              {studentGradesList.filter((item) => item.totalGrade !== null).length} / {studentGradesList.length} notas calculadas
            </span>
          </div>

          {/* Quick Filter by Student Name */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchStudent}
              onChange={(e) => setSearchStudent(e.target.value)}
              placeholder="Filtrar aluno..."
              className="w-full bg-background border border-border rounded-xl pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted/50 focus:outline-none focus:border-primary"
            />
          </div>
        </div>
      </div>

      {/* Tabela de Alunos e Notas */}
      <div className="glass-panel rounded-3xl border border-border bg-surface overflow-hidden shadow-lg">
        {!selectedTurma || (activitiesForTurma.length === 0) ? (
          <div className="p-12 text-center text-muted space-y-3">
            <FileSpreadsheet className="w-12 h-12 text-muted/40 mx-auto" />
            <p className="text-sm font-bold text-foreground">Nenhuma atividade encontrada</p>
            <p className="text-xs max-w-md mx-auto">
              Não há atividades cadastradas para a turma {selectedTurma}.
            </p>
          </div>
        ) : filteredList.length === 0 ? (
          <div className="p-12 text-center text-muted space-y-2">
            <p className="text-sm font-bold text-foreground">Nenhum aluno encontrado nesta turma.</p>
            <p className="text-xs">Verifique o filtro de busca ou cadastre alunos para a turma {selectedTurma}.</p>
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full min-w-[500px] sm:min-w-full text-left text-xs text-muted">
              <thead className="bg-background text-[11px] font-bold text-muted uppercase tracking-wider border-b border-border">
                <tr>
                  <th className="py-3.5 px-4 w-12 text-center">Nº</th>
                  <th className="py-3.5 px-4">Aluno</th>
                  <th className="py-3.5 px-4 hidden sm:table-cell">Matrícula</th>
                  <th className="py-3.5 px-4 hidden md:table-cell">Atendimento</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right font-black text-foreground">Nota</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredList.map((item, index) => {
                  const isPne = isStudentPNE(item.student);
                  const isRad = item.student.tag?.toUpperCase() === 'RAD';

                  return (
                    <tr
                      key={item.student.id}
                      className="hover:bg-surface-hover transition-colors group"
                    >
                      {/* Nº */}
                      <td className="py-3 px-4 text-center font-bold text-foreground/50 text-[11px]">
                        {String(index + 1).padStart(2, '0')}
                      </td>

                      {/* Nome do Aluno */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={formatAvatarUrl(item.student.avatarUrl)}
                            alt={item.student.fullName}
                            loading="lazy"
                            decoding="async"
                            className="w-8 h-8 rounded-full object-cover border border-border shrink-0"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src =
                                'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150';
                            }}
                          />
                          <div className="min-w-0">
                            <span className="font-bold text-foreground block truncate group-hover:text-primary transition-colors">
                              {item.student.fullName}
                            </span>
                            <span className="text-[10px] text-muted sm:hidden">
                              Mat: {item.student.matricula || '-'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Matrícula */}
                      <td className="py-3 px-4 hidden sm:table-cell font-mono text-[11px] text-foreground/80">
                        {item.student.matricula || '-'}
                      </td>

                      {/* Atendimento */}
                      <td className="py-3 px-4 hidden md:table-cell">
                        {isPne ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-600 border border-rose-500/30 inline-flex items-center gap-1">
                            PNE
                          </span>
                        ) : isRad ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/30 inline-flex items-center gap-1">
                            RAD
                          </span>
                        ) : (
                          <span className="text-foreground/40 text-[10px]">Regular</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center">
                        {item.status === 'graded' ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Avaliado</span>
                          </span>
                        ) : item.status === 'pending' ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-600 border border-amber-500/30 inline-flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>Aguardando Correção</span>
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-600/80 border border-rose-500/20 inline-flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            <span>Não Entregue</span>
                          </span>
                        )}
                      </td>

                      {/* Nota */}
                      <td className="py-3 px-4 text-right">
                        {item.totalGrade !== null ? (
                          <div className="inline-flex items-center gap-1">
                            <span className="text-base font-black text-primary">
                              {item.totalGrade.toFixed(1).replace('.', ',')}
                            </span>
                            <span className="text-[10px] text-muted font-semibold">
                              / {item.maxGrade}
                            </span>
                          </div>
                        ) : (
                          <span className="text-foreground/30 font-semibold italic text-[11px]">
                            Sem nota
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Histórico Eterno de Emissões e Comprovantes RCO */}
      <RcoEmissionsHistory teacher={teacher} />

      {/* Modal de Geração e Emissão de PDF Timbrado RCO */}
      <RcoPdfReportModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        activities={activities}
        students={students}
        teacher={teacher}
        selectedTurmaInitial={selectedTurma}
      />
    </div>
  );
};

export default PostagemRcoView;
