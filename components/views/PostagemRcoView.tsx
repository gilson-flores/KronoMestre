'use client';

import React, { useState, useMemo, useEffect } from 'react';
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
  FileText,
  CheckSquare,
  Square,
} from 'lucide-react';
import { Activity, StudentUser, TeacherUser } from '@/lib/types';
import {
  canStudentAccessActivity,
  isStudentPNE,
  getOriginalTurmas,
  getChildRecoveryActivities,
  getChildAdaptations,
  isActivityRecovery,
} from '@/lib/studentUtils';
import { formatAvatarUrl } from '@/lib/utils';
import { initialTeacher } from '@/lib/initialData';
import { getScopedLocalStorageItem, setScopedLocalStorageItem } from '@/lib/cacheUtils';
import { RcoPdfReportModal } from '@/components/modals/RcoPdfReportModal';
import { RcoEmissionsHistory } from '@/components/RcoEmissionsHistory';
import { TurmaFilterDropdown } from '@/components/TurmaFilterDropdown';

interface PostagemRcoViewProps {
  activities: Activity[];
  students: StudentUser[];
  onSelectActivityForGrading?: (act: Activity) => void;
  onSaveActivity?: (updatedActivity: Activity) => Promise<void> | void;
  teacher?: TeacherUser;
}

export const PostagemRcoView: React.FC<PostagemRcoViewProps> = ({
  activities = [],
  students = [],
  onSelectActivityForGrading,
  onSaveActivity,
  teacher = initialTeacher,
}) => {
  const allTurmas = useMemo(() => Array.from(new Set((students || []).map(s => (s.turma || '').trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })), [students]);

  const [selectedTurmas, setSelectedTurmas] = useState<string[]>(['all']);
  const [userSelectedTurma, setUserSelectedTurma] = useState<string>('');
  const [selectedActivityId, setSelectedActivityId] = useState<string>('all');
  const [searchStudent, setSearchStudent] = useState<string>('');
  const [rcoLaunchFilter, setRcoLaunchFilter] = useState<'all' | 'pending_rco' | 'posted_rco'>('all');
  const [copiedNotification, setCopiedNotification] = useState<boolean>(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState<boolean>(false);

  // Mapa local persistente por vínculo/professor para controle individual de lançamento RCO
  const [localPostedMap, setLocalPostedMap] = useState<Record<string, string[]>>({});

  useEffect(() => {
    try {
      const saved = getScopedLocalStorageItem('krono_rco_posted_students_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          // eslint-disable-next-line react-hooks/set-state-in-effect
      setLocalPostedMap(parsed);
        }
      }
    } catch (e) {
      console.error('Erro ao carregar controle local do RCO:', e);
    }
  }, [teacher?.id, teacher?.school]);

  const turmaSubmissionsCountMap = useMemo(() => {
    const map = new Map<string, number>();
    const allSubs = activities.flatMap((a) => a.submissions || []);
    allTurmas.forEach((turmaCode) => {
      const turmaStudents = students.filter(
        (s) => s.turma?.trim().toLowerCase() === turmaCode.trim().toLowerCase()
      );
      const studentIdSet = new Set(turmaStudents.map((s) => s.id));
      const matriculaSet = new Set(turmaStudents.map((s) => s.matricula).filter(Boolean));
      const nameSet = new Set(
        turmaStudents.map((s) => s.fullName?.trim().toLowerCase()).filter(Boolean)
      );

      const count = allSubs.filter(
        (sub) =>
          (sub.studentId && studentIdSet.has(sub.studentId)) ||
          (sub.matricula && matriculaSet.has(sub.matricula)) ||
          (sub.studentName && nameSet.has(sub.studentName.trim().toLowerCase()))
      ).length;

      map.set(turmaCode, count);
    });
    return map;
  }, [activities, allTurmas, students]);

  const selectedTurma = useMemo(() => {
    if (userSelectedTurma && allTurmas.includes(userSelectedTurma)) {
      return userSelectedTurma;
    }
    const turmaWithSubs = allTurmas.find((t) => (turmaSubmissionsCountMap.get(t) || 0) > 0);
    return turmaWithSubs || allTurmas[0] || '';
  }, [userSelectedTurma, allTurmas, turmaSubmissionsCountMap]);

  // Adaptador para usar o TurmaFilterDropdown padronizado (Passo 10) selecionando a turma ativa
  const handleTurmaDropdownChange = (selected: string[]) => {
    const valid = selected.filter((t) => t !== 'all' && t !== 'none');
    if (valid.length > 0) {
      const nextTurma = valid[valid.length - 1];
      setUserSelectedTurma(nextTurma);
      setSelectedActivityId('all');
    } else if (selected.includes('all') && allTurmas.length > 0) {
      setUserSelectedTurma(allTurmas[0]);
      setSelectedActivityId('all');
    }
  };

  const activitiesForTurma = useMemo(() => {
    if (selectedTurmas.includes('none')) return [];
    const isAll = selectedTurmas.length === 0 || selectedTurmas.includes('all') || (allTurmas.length > 0 && selectedTurmas.length >= allTurmas.length);
    if (isAll) return activities;
    return activities.filter((act) => selectedTurmas.some((sel) => canStudentAccessActivity(act.turma, sel)));
  }, [activities, selectedTurmas, allTurmas]);

  const allSystemActivities = useMemo(() => {
    return [...activities].sort((a, b) => a.title.localeCompare(b.title));
  }, [activities]);

  const currentActivity = useMemo(() => {
    if (selectedActivityId === 'all' || !selectedActivityId) {
      return null;
    }
    return activities.find((a) => a.id === selectedActivityId) || null;
  }, [activities, selectedActivityId]);

  const studentsInTurma = useMemo(() => {
    if (selectedTurmas.includes('none')) return [];
    const isAll = selectedTurmas.length === 0 || selectedTurmas.includes('all') || (allTurmas.length > 0 && selectedTurmas.length >= allTurmas.length);
    return [...students]
      .filter((s) => {
        if (isAll) return true;
        const stTurma = (s.turma || '').trim().toLowerCase();
        return selectedTurmas.some((sel) => sel.trim().toLowerCase() === stTurma);
      })
      .sort((a, b) => a.fullName.localeCompare(b.fullName));
  }, [students, selectedTurmas, allTurmas]);

  // Chave de contexto atual (Turma + Atividade ou Média Geral)
  const rcoContextKey = useMemo(() => {
    return `${selectedTurma || 'geral'}::${currentActivity ? currentActivity.id : 'all_average'}`;
  }, [selectedTurma, currentActivity]);

  // Conjunto de IDs de alunos já lançados no RCO para o contexto atual
  const postedStudentIdsSet = useMemo(() => {
    const fromLocal = localPostedMap[rcoContextKey] || [];
    const fromActivity = currentActivity?.rcoPostedStudentIds || [];
    // Se a atividade inteira estava marcada como isRcoPosted legado e não há lista individual ainda
    if (currentActivity?.isRcoPosted && fromLocal.length === 0 && fromActivity.length === 0) {
      return new Set(studentsInTurma.map((s) => s.id));
    }
    return new Set([...fromLocal, ...fromActivity]);
  }, [localPostedMap, rcoContextKey, currentActivity, studentsInTurma]);

  const persistPostedIds = (nextIds: string[]) => {
    const uniqueIds = Array.from(new Set(nextIds));
    const updatedMap = { ...localPostedMap, [rcoContextKey]: uniqueIds };
    setLocalPostedMap(updatedMap);
    try {
      setScopedLocalStorageItem('krono_rco_posted_students_v1', JSON.stringify(updatedMap));
    } catch (e) {
      console.error('Erro ao salvar controle RCO no storage:', e);
    }

    if (currentActivity && onSaveActivity) {
      const allStudentsPosted =
        studentsInTurma.length > 0 &&
        studentsInTurma.every((st) => uniqueIds.includes(st.id));
      onSaveActivity({
        ...currentActivity,
        rcoPostedStudentIds: uniqueIds,
        isRcoPosted: allStudentsPosted,
      });
    }
  };

  const handleToggleStudentRcoPosted = (studentId: string) => {
    const currentList = Array.from(postedStudentIdsSet);
    if (postedStudentIdsSet.has(studentId)) {
      persistPostedIds(currentList.filter((id) => id !== studentId));
    } else {
      persistPostedIds([...currentList, studentId]);
    }
  };

  const handleBatchSetRcoPosted = (studentIds: string[], markAsPosted: boolean) => {
    const currentSet = new Set(postedStudentIdsSet);
    studentIds.forEach((id) => {
      if (markAsPosted) currentSet.add(id);
      else currentSet.delete(id);
    });
    persistPostedIds(Array.from(currentSet));
  };

  const studentGradesList = useMemo(() => {
    if (studentsInTurma.length === 0) return [];

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
          let bestGrade = -1;
          let bestSub = subsForStudent[0];
          let hasCalculatedGrade = false;

          subsForStudent.forEach((s) => {
            const hasScoreIndicator =
              s.status === 'graded' ||
              (s.essayScore !== undefined && s.essayScore !== null) ||
              Number(s.objectiveScore) > 0;
            if (hasScoreIndicator) {
              hasCalculatedGrade = true;
            }

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
          totalGrade = hasCalculatedGrade && bestGrade >= 0 ? bestGrade : null;

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
          isRcoPosted: postedStudentIdsSet.has(st.id),
        };
      });
    }

    return studentsInTurma.map((st) => {
      const perActivityGrades: {
        activityId: string;
        activityTitle: string;
        grade: number | null;
        maxGrade: number;
        status: string;
      }[] = [];
      let totalSum = 0;
      let totalMax = 0;
      let gradedCount = 0;
      let pendingCount = 0;

      activitiesForTurma.forEach((act) => {
        if (isActivityRecovery(act)) return;

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
          let bestGrade = -1;
          let bestSub = subsForStudent[0];
          let hasCalculatedGrade = false;

          subsForStudent.forEach((sub) => {
            const hasScoreIndicator =
              sub.status === 'graded' ||
              (sub.essayScore !== undefined && sub.essayScore !== null) ||
              Number(sub.objectiveScore) > 0;
            if (hasScoreIndicator) {
              hasCalculatedGrade = true;
            }

            const obj = Number(sub.objectiveScore) || 0;
            const ess = Number(sub.essayScore) || 0;
            const ext = Number(sub.extraPoints) || 0;
            const total = Number((obj + ess + ext).toFixed(1));
            if (total > bestGrade) {
              bestGrade = total;
              bestSub = sub;
            }
          });

          g = hasCalculatedGrade && bestGrade >= 0 ? bestGrade : null;
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
        totalMax += act.maxGrade || 10;

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

      const averageGrade =
        totalMax > 0 && gradedCount > 0 ? Number(((totalSum / totalMax) * 10).toFixed(1)) : null;

      return {
        student: st,
        submission: null,
        status: overallStatus,
        totalGrade: averageGrade,
        maxGrade: 10,
        activityTitle: 'Todas as Atividades (Média Geral)',
        activityGrades: perActivityGrades,
        isRcoPosted: postedStudentIdsSet.has(st.id),
      };
    });
  }, [currentActivity, activitiesForTurma, activities, studentsInTurma, postedStudentIdsSet]);

  // Contadores de lançamento RCO
  const rcoStats = useMemo(() => {
    const total = studentGradesList.length;
    const posted = studentGradesList.filter((i) => i.isRcoPosted).length;
    const pending = total - posted;
    return { total, posted, pending };
  }, [studentGradesList]);

  // Lista filtrada por busca + filtro de status de lançamento RCO (Passo 11)
  const filteredList = useMemo(() => {
    return studentGradesList.filter((item) => {
      if (rcoLaunchFilter === 'pending_rco' && item.isRcoPosted) return false;
      if (rcoLaunchFilter === 'posted_rco' && !item.isRcoPosted) return false;

      if (!searchStudent.trim()) return true;
      const q = searchStudent.toLowerCase().trim();
      return (
        item.student.fullName.toLowerCase().includes(q) ||
        Boolean(item.student.matricula && item.student.matricula.toLowerCase().includes(q))
      );
    });
  }, [studentGradesList, searchStudent, rcoLaunchFilter]);

  const handleCopyGradesForRco = () => {
    if (filteredList.length === 0) return;

    const lines = filteredList.map((item) => {
      const gradeStr = item.totalGrade !== null ? item.totalGrade.toFixed(1).replace('.', ',') : '-';
      return `${item.student.fullName}\t${gradeStr}`;
    });

    navigator.clipboard.writeText(lines.join('\n'));
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 3500);
  };

  const handleExportCsv = () => {
    if (filteredList.length === 0) return;

    const activityName = currentActivity ? currentActivity.title : 'Todas_as_Atividades';
    const header = 'Nome do Aluno,Matricula,Turma,Atividade,Nota Obtida,Nota Maxima,Status Avaliacao,Status RCO SED\n';
    const rows = filteredList
      .map((item) => {
        const gradeStr = item.totalGrade !== null ? item.totalGrade.toFixed(1).replace('.', ',') : '';
        const statusLabel =
          item.status === 'graded'
            ? 'Avaliado'
            : item.status === 'pending'
            ? 'Pendente de Correção'
            : 'Não Entregue';
        const rcoLabel = item.isRcoPosted ? 'Lancado no RCO' : 'Pendente de Lancamento';
        return `"${item.student.fullName}","${item.student.matricula || ''}","${selectedTurma}","${item.activityTitle || activityName}","${gradeStr}","${item.maxGrade}","${statusLabel}","${rcoLabel}"`;
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
              Postagem RCO • Controle SED
            </h1>
            <p className="text-xs sm:text-sm text-muted font-medium mt-0.5">
              Controle individual de lançamento de notas por aluno no portal oficial do Estado (SED).
            </p>
          </div>
        </div>

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
            disabled={filteredList.length === 0}
            className="py-2.5 px-4 bg-[#171f33] hover:bg-surface-hover text-primary font-bold rounded-2xl border border-primary/30 transition-all text-xs flex items-center gap-2 cursor-pointer shadow-sm active:scale-95 disabled:opacity-40"
            title="Copiar lista de nomes e notas visíveis para colar no RCO"
          >
            {copiedNotification ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            <span>{copiedNotification ? 'Copiado para o RCO!' : 'Copiar Notas'}</span>
          </button>

          <button
            onClick={handleExportCsv}
            disabled={filteredList.length === 0}
            className="py-2.5 px-4 bg-primary hover:bg-primary-hover text-white font-bold rounded-2xl transition-all text-xs flex items-center gap-2 cursor-pointer shadow-md shadow-primary/20 active:scale-95 disabled:opacity-40"
          >
            <Download className="w-4 h-4" />
            <span>Exportar CSV</span>
          </button>
        </div>
      </div>

      {/* Painel de Filtros Padronizados (Turma, Atividade e Status de Lançamento RCO) */}
      <div className="glass-panel p-5 rounded-3xl border border-border bg-surface space-y-4 shadow-md">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
          {/* 1. Filtro de Turma Padronizado (Idêntico à área de Alunos) */}
          <div className="lg:col-span-4 space-y-1.5">
            <label className="text-xs font-bold text-muted flex items-center gap-1.5 uppercase tracking-wider">
              <Users className="w-3.5 h-3.5 text-primary" />
              <span>1. Turma Selecionada:</span>
            </label>
            <TurmaFilterDropdown
              turmasList={allTurmas}
              selectedTurmas={selectedTurmas}
              onChange={setSelectedTurmas}
              students={students}
              totalCountLabel="alunos"
            />
          </div>

          {/* 2. Seletor de Atividade */}
          <div className="lg:col-span-8 space-y-1.5">
            <label className="text-xs font-bold text-muted flex items-center gap-1.5 uppercase tracking-wider">
              <BookOpen className="w-3.5 h-3.5 text-primary" />
              <span>2. Selecione a Atividade (Ativas e Inativas):</span>
            </label>
            <select
              value={selectedActivityId}
              onChange={(e) => setSelectedActivityId(e.target.value)}
              disabled={activitiesForTurma.length === 0 && allSystemActivities.length === 0}
              className="w-full bg-background border border-border rounded-2xl px-4 py-2.5 text-xs sm:text-sm text-foreground font-bold focus:outline-none focus:border-primary cursor-pointer disabled:opacity-50"
            >
              {activitiesForTurma.length === 0 ? (
                <option value="">Nenhuma atividade para a turma {selectedTurma}</option>
              ) : (
                <>
                  <option value="all" className="bg-background text-primary font-bold py-1">
                    📚 Todas as Atividades ({activitiesForTurma.length} na turma) • Média Geral
                  </option>

                  <optgroup label={`Atividades da Turma ${selectedTurma} (Ativas e Inativas)`}>
                    {activitiesForTurma.map((act) => {
                      const isInactive = act.status === 'Inativo';
                      const statusIcon = isInactive
                        ? '⏸️ [Inativa]'
                        : act.status === 'Prazo Encerrado'
                        ? '🔒 [Encerrada]'
                        : '✅ [Ativa]';
                      return (
                        <option key={act.id} value={act.id} className="bg-background text-foreground py-1">
                          {statusIcon} {act.title} [{act.type}] • {act.maxGrade || 10} pts {isInactive ? '(Oculta)' : ''}
                        </option>
                      );
                    })}
                  </optgroup>

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

        {/* Atalhos Rápidos de Troca de Turma */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          {allTurmas.map((turmaCode) => {
            const countStudents = students.filter((s) => s.turma === turmaCode).length;
            const isSelected = selectedTurma === turmaCode;
            return (
              <button
                key={turmaCode}
                type="button"
                onClick={() => { setSelectedTurmas([turmaCode]); setSelectedActivityId('all'); }}
                className={`py-1.5 px-3 rounded-xl text-[11px] font-bold transition-all cursor-pointer border ${
                  isSelected
                    ? 'bg-primary text-white border-primary shadow-sm'
                    : 'bg-background text-muted hover:text-foreground border-border hover:bg-surface-hover'
                }`}
              >
                Turma {turmaCode} ({countStudents})
              </button>
            );
          })}
        </div>

        {/* Barra de Filtros de Status RCO (Passo 11: Todos / Pendentes de Lançamento / Já Lançados) + Busca */}
        <div className="pt-3 border-t border-border flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setRcoLaunchFilter('all')}
              className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer border flex items-center gap-1.5 ${
                rcoLaunchFilter === 'all'
                  ? 'bg-primary text-white border-primary shadow-sm'
                  : 'bg-background text-muted border-border hover:text-foreground hover:bg-surface-hover'
              }`}
            >
              <span>Todos os Alunos</span>
              <span className="px-1.5 py-0.2 rounded-full bg-black/20 text-[10px]">{rcoStats.total}</span>
            </button>

            <button
              type="button"
              onClick={() => setRcoLaunchFilter('pending_rco')}
              className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer border flex items-center gap-1.5 ${
                rcoLaunchFilter === 'pending_rco'
                  ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-sm'
                  : 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Pendentes de Lançamento</span>
              <span className="px-1.5 py-0.2 rounded-full bg-black/20 text-[10px]">{rcoStats.pending}</span>
            </button>

            <button
              type="button"
              onClick={() => setRcoLaunchFilter('posted_rco')}
              className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer border flex items-center gap-1.5 ${
                rcoLaunchFilter === 'posted_rco'
                  ? 'bg-emerald-500 text-slate-950 border-emerald-500 shadow-sm'
                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Já Lançados no RCO</span>
              <span className="px-1.5 py-0.2 rounded-full bg-black/20 text-[10px]">{rcoStats.posted}</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Ações em lote para marcar/desmarcar alunos visíveis */}
            {filteredList.length > 0 && (
              <div className="flex items-center gap-1.5 bg-background px-2.5 py-1.5 rounded-xl border border-border text-[11px]">
                <button
                  type="button"
                  onClick={() =>
                    handleBatchSetRcoPosted(
                      filteredList.map((i) => i.student.id),
                      true
                    )
                  }
                  className="font-bold text-emerald-400 hover:underline cursor-pointer"
                >
                  Marcar Visíveis
                </button>
                <span className="text-border">•</span>
                <button
                  type="button"
                  onClick={() =>
                    handleBatchSetRcoPosted(
                      filteredList.map((i) => i.student.id),
                      false
                    )
                  }
                  className="font-bold text-rose-400 hover:underline cursor-pointer"
                >
                  Desmarcar Visíveis
                </button>
              </div>
            )}

            <div className="relative w-full sm:w-60">
              <Search className="w-3.5 h-3.5 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchStudent}
                onChange={(e) => setSearchStudent(e.target.value)}
                placeholder="Buscar aluno ou matrícula..."
                className="w-full bg-background border border-border rounded-xl pl-8 pr-3 py-2 text-xs text-foreground placeholder:text-muted/50 focus:outline-none focus:border-primary"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Tabela de Alunos, Notas e Checkbox Individual de Lançamento RCO */}
      <div className="glass-panel rounded-3xl border border-border bg-surface overflow-hidden shadow-lg">
        {studentsInTurma.length === 0 ? (
          <div className="p-12 text-center text-muted space-y-3">
            <FileSpreadsheet className="w-12 h-12 text-muted/40 mx-auto" />
            <p className="text-sm font-bold text-foreground">Nenhuma atividade encontrada</p>
            <p className="text-xs max-w-md mx-auto">
              Não há atividades cadastradas para a turma {selectedTurma}.
            </p>
          </div>
        ) : filteredList.length === 0 ? (
          <div className="p-12 text-center text-muted space-y-2">
            <p className="text-sm font-bold text-foreground">
              Nenhum aluno encontrado para o filtro selecionado.
            </p>
            <p className="text-xs">
              Altere o filtro entre &quot;Todos&quot;, &quot;Pendentes de Lançamento&quot; ou &quot;Já Lançados no RCO&quot;.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full min-w-[600px] sm:min-w-full text-left text-xs text-muted">
              <thead className="bg-background text-[11px] font-bold text-muted uppercase tracking-wider border-b border-border">
                <tr>
                  <th className="py-3.5 px-4 w-12 text-center">Nº</th>
                  <th className="py-3.5 px-4">Aluno</th>
                  <th className="py-3.5 px-4 hidden sm:table-cell">Matrícula</th>
                  <th className="py-3.5 px-4 hidden md:table-cell">Atendimento</th>
                  <th className="py-3.5 px-4 text-center">Status Entrega</th>
                  <th className="py-3.5 px-4 text-right font-black text-foreground">Nota</th>
                  <th className="py-3.5 px-4 text-center font-black text-emerald-400">
                    Lançado RCO (SED)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredList.map((item, index) => {
                  const isPne = isStudentPNE(item.student);
                  const isRad = item.student.tag?.toUpperCase() === 'RAD';

                  return (
                    <tr
                      key={item.student.id}
                      onClick={() => handleToggleStudentRcoPosted(item.student.id)}
                      className={`transition-colors group cursor-pointer ${
                        item.isRcoPosted
                          ? 'bg-emerald-500/5 hover:bg-emerald-500/10'
                          : 'hover:bg-surface-hover'
                      }`}
                    >
                      <td className="py-3 px-4 text-center font-bold text-foreground/50 text-[11px]">
                        {String(index + 1).padStart(2, '0')}
                      </td>

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
                            <span
                              className={`font-bold block truncate transition-colors ${
                                item.isRcoPosted
                                  ? 'text-emerald-300 line-through decoration-emerald-500/40'
                                  : 'text-foreground group-hover:text-primary'
                              }`}
                            >
                              {item.student.fullName}
                            </span>
                            <span className="text-[10px] text-muted sm:hidden">
                              Mat: {item.student.matricula || '-'}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4 hidden sm:table-cell font-mono text-[11px] text-foreground/80">
                        {item.student.matricula || '-'}
                      </td>

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

                      {/* CHECKBOX INDIVIDUAL DE LANÇAMENTO NO RCO/SED (PASSO 11) */}
                      <td
                        className="py-3 px-4 text-center"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleStudentRcoPosted(item.student.id);
                        }}
                      >
                        <button
                          type="button"
                          className={`px-3 py-1.5 rounded-xl text-[11px] font-extrabold inline-flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                            item.isRcoPosted
                              ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-sm'
                              : 'bg-background hover:bg-surface-hover text-muted hover:text-foreground border-border'
                          }`}
                          title={
                            item.isRcoPosted
                              ? 'Clique para desmarcar o lançamento no RCO'
                              : 'Clique para marcar como nota já lançada no RCO/SED'
                          }
                        >
                          {item.isRcoPosted ? (
                            <>
                              <CheckSquare className="w-3.5 h-3.5 stroke-[2.5]" />
                              <span>Lançado</span>
                            </>
                          ) : (
                            <>
                              <Square className="w-3.5 h-3.5" />
                              <span>Marcar</span>
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <RcoEmissionsHistory teacher={teacher} />

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
