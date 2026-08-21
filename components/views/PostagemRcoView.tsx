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
  Sparkles
} from 'lucide-react';
import { Activity, StudentUser } from '@/lib/types';
import { canStudentAccessActivity, isStudentPNE, getOriginalTurmas } from '@/lib/studentUtils';
import { formatAvatarUrl } from '@/lib/utils';

interface PostagemRcoViewProps {
  activities: Activity[];
  students: StudentUser[];
  onSelectActivityForGrading?: (act: Activity) => void;
}

export const PostagemRcoView: React.FC<PostagemRcoViewProps> = ({
  activities = [],
  students = [],
  onSelectActivityForGrading,
}) => {
  // Extrair apenas as turmas originais dos alunos (101, 102, 104, 201, 202, 2001, 301, 302, 3001)
  const allTurmas = useMemo(() => {
    return getOriginalTurmas(students);
  }, [students]);

  // Selected filters
  const [selectedTurma, setSelectedTurma] = useState<string>(allTurmas[0] || '');
  const [selectedActivityId, setSelectedActivityId] = useState<string>('all');
  const [searchStudent, setSearchStudent] = useState<string>('');
  const [copiedNotification, setCopiedNotification] = useState<boolean>(false);

  // Filter activities available for the selected turma
  const activitiesForTurma = useMemo(() => {
    if (!selectedTurma) return [];
    return activities.filter((act) => {
      return canStudentAccessActivity(act.turma, selectedTurma);
    });
  }, [activities, selectedTurma]);

  // If selected activity doesn't belong to current turma, default to 'all' or specific activity
  const currentActivity = useMemo(() => {
    if (selectedActivityId === 'all' || !selectedActivityId) {
      return null; // modo todas as atividades
    }
    const found = activitiesForTurma.find((a) => a.id === selectedActivityId);
    return found || null;
  }, [activitiesForTurma, selectedActivityId]);

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
      const relatedActivities = activities.filter(
        (a) =>
          a.id === currentActivity.id ||
          a.adaptedFromId === currentActivity.id ||
          (currentActivity.adaptedFromId && a.id === currentActivity.adaptedFromId)
      );

      const allRelatedSubmissions = relatedActivities.flatMap((a) => a.submissions || []);

      return studentsInTurma.map((st) => {
        const sub = allRelatedSubmissions.find(
          (s) =>
            s.studentId === st.id ||
            (Boolean(st.matricula) && s.matricula === st.matricula) ||
            s.studentName?.trim().toLowerCase() === st.fullName.trim().toLowerCase()
        );

        let status: 'graded' | 'pending' | 'returned' | 'not_submitted' = 'not_submitted';
        let totalGrade: number | null = null;

        if (sub) {
          const obj = Number(sub.objectiveScore) || 0;
          const ess = Number(sub.essayScore) || 0;
          const ext = Number(sub.extraPoints) || 0;
          const computedGrade = Number((obj + ess + ext).toFixed(1));

          if (sub.status === 'graded') {
            status = 'graded';
            totalGrade = computedGrade;
          } else if (sub.status === 'pending' || sub.status === 'draft') {
            status = 'pending';
            totalGrade = computedGrade;
          } else if (sub.status === 'returned') {
            status = 'returned';
            totalGrade = computedGrade;
          } else {
            totalGrade = computedGrade;
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

        let g: number | null = null;
        let stt = 'not_submitted';

        if (sub) {
          const obj = Number(sub.objectiveScore) || 0;
          const ess = Number(sub.essayScore) || 0;
          const ext = Number(sub.extraPoints) || 0;
          g = Number((obj + ess + ext).toFixed(1));
          stt = sub.status;

          if (sub.status === 'graded') {
            gradedCount++;
          } else if (sub.status === 'pending' || sub.status === 'draft') {
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#131b2e] p-5 sm:p-6 rounded-3xl border border-white/10 shadow-lg">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-[#4ade80]/20 border border-[#4ade80]/30 flex items-center justify-center text-[#4ade80] shrink-0">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Postagem RCO
            </h1>
            <p className="text-xs sm:text-sm text-[#bccabb] font-medium mt-0.5">
              Selecione a turma e a atividade para visualizar e exportar as notas dos alunos.
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2.5 self-start sm:self-center flex-wrap">
          <button
            onClick={handleCopyGradesForRco}
            disabled={studentGradesList.length === 0}
            className="py-2.5 px-4 bg-[#171f33] hover:bg-[#222a3d] text-[#4ade80] font-bold rounded-2xl border border-[#4ade80]/30 transition-all text-xs flex items-center gap-2 cursor-pointer shadow-sm active:scale-95 disabled:opacity-40"
            title="Copiar lista de nomes e notas para colar no RCO"
          >
            {copiedNotification ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            <span>{copiedNotification ? 'Copiado para o RCO!' : 'Copiar Notas'}</span>
          </button>

          <button
            onClick={handleExportCsv}
            disabled={studentGradesList.length === 0}
            className="py-2.5 px-4 bg-[#4ade80] hover:bg-[#6bfb9a] text-[#003919] font-bold rounded-2xl transition-all text-xs flex items-center gap-2 cursor-pointer shadow-md shadow-[#4ade80]/20 active:scale-95 disabled:opacity-40"
          >
            <Download className="w-4 h-4" />
            <span>Exportar Planilha (CSV)</span>
          </button>
        </div>
      </div>

      {/* Selectors Panel (Turma e Atividade) */}
      <div className="glass-panel p-5 rounded-3xl border border-white/10 bg-[#131b2e] space-y-4 shadow-md">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Seletor de Turma */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#bccabb] flex items-center gap-1.5 uppercase tracking-wider">
              <Users className="w-3.5 h-3.5 text-[#4ade80]" />
              <span>1. Selecione a Turma:</span>
            </label>
            <select
              value={selectedTurma}
              onChange={(e) => {
                setSelectedTurma(e.target.value);
                setSelectedActivityId('all'); // Mantem padrão em 'all'
              }}
              className="w-full bg-[#0b1326] border border-white/15 rounded-2xl px-4 py-3 text-sm text-white font-bold focus:outline-none focus:border-[#4ade80] cursor-pointer"
            >
              {allTurmas.length === 0 ? (
                <option value="">Nenhuma turma cadastrada</option>
              ) : (
                allTurmas.map((t) => (
                  <option key={t} value={t} className="bg-[#0b1326] text-white py-1">
                    Turma {t} ({students.filter((s) => s.turma === t).length} alunos)
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Seletor de Atividade */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#bccabb] flex items-center gap-1.5 uppercase tracking-wider">
              <BookOpen className="w-3.5 h-3.5 text-[#4ade80]" />
              <span>2. Selecione a Atividade:</span>
            </label>
            <select
              value={selectedActivityId}
              onChange={(e) => setSelectedActivityId(e.target.value)}
              disabled={activitiesForTurma.length === 0}
              className="w-full bg-[#0b1326] border border-white/15 rounded-2xl px-4 py-3 text-sm text-white font-bold focus:outline-none focus:border-[#4ade80] cursor-pointer disabled:opacity-50"
            >
              {activitiesForTurma.length === 0 ? (
                <option value="">Nenhuma atividade para a turma {selectedTurma}</option>
              ) : (
                <>
                  <option value="all" className="bg-[#0b1326] text-[#4ade80] font-bold py-1">
                    📚 Todas as Atividades ({activitiesForTurma.length} no total) • Média Geral
                  </option>
                  {activitiesForTurma.map((act) => (
                    <option key={act.id} value={act.id} className="bg-[#0b1326] text-white py-1">
                      {act.title} [{act.type}] • Valor: {act.maxGrade || 10} pts
                    </option>
                  ))}
                </>
              )}
            </select>
          </div>
        </div>

        {/* Current Activity Info Strip & Student Search */}
        <div className="pt-3 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 flex-wrap text-xs text-[#bccabb]">
            <span className="font-bold text-white text-sm">
              {currentActivity ? currentActivity.title : `Todas as Atividades (${activitiesForTurma.length})`}
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-[#171f33] text-[#c0c1ff] font-semibold border border-white/10">
              {currentActivity ? currentActivity.type : 'Média Geral das Atividades'}
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-amber-400/10 text-amber-300 font-bold border border-amber-400/20">
              {currentActivity ? `Nota Máxima: ${currentActivity.maxGrade || 10} pontos` : 'Escala: 0 a 10'}
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-[#4ade80] font-bold border border-emerald-500/20">
              {studentGradesList.filter((item) => item.totalGrade !== null).length} / {studentGradesList.length} notas calculadas
            </span>
          </div>

          {/* Quick Filter by Student Name */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-[#bccabb] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchStudent}
              onChange={(e) => setSearchStudent(e.target.value)}
              placeholder="Filtrar aluno..."
              className="w-full bg-[#0b1326] border border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-[#bccabb]/50 focus:outline-none focus:border-[#4ade80]"
            />
          </div>
        </div>
      </div>

      {/* Tabela de Alunos e Notas */}
      <div className="glass-panel rounded-3xl border border-white/10 bg-[#131b2e] overflow-hidden shadow-lg">
        {!selectedTurma || (activitiesForTurma.length === 0) ? (
          <div className="p-12 text-center text-[#bccabb] space-y-3">
            <FileSpreadsheet className="w-12 h-12 text-[#bccabb]/40 mx-auto" />
            <p className="text-sm font-bold text-white">Nenhuma atividade encontrada</p>
            <p className="text-xs max-w-md mx-auto">
              Não há atividades cadastradas para a turma {selectedTurma}.
            </p>
          </div>
        ) : filteredList.length === 0 ? (
          <div className="p-12 text-center text-[#bccabb] space-y-2">
            <p className="text-sm font-bold text-white">Nenhum aluno encontrado nesta turma.</p>
            <p className="text-xs">Verifique o filtro de busca ou cadastre alunos para a turma {selectedTurma}.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#bccabb]">
              <thead className="bg-[#0b1326] text-[11px] font-bold text-[#bccabb] uppercase tracking-wider border-b border-white/10">
                <tr>
                  <th className="py-3.5 px-4 w-12 text-center">Nº</th>
                  <th className="py-3.5 px-4">Aluno</th>
                  <th className="py-3.5 px-4 hidden sm:table-cell">Matrícula</th>
                  <th className="py-3.5 px-4 hidden md:table-cell">Atendimento</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right font-black text-white">Nota</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredList.map((item, index) => {
                  const isPne = isStudentPNE(item.student);
                  const isRad = item.student.tag?.toUpperCase() === 'RAD';

                  return (
                    <tr
                      key={item.student.id}
                      className="hover:bg-white/5 transition-colors group"
                    >
                      {/* Nº */}
                      <td className="py-3 px-4 text-center font-bold text-white/50 text-[11px]">
                        {String(index + 1).padStart(2, '0')}
                      </td>

                      {/* Nome do Aluno */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={formatAvatarUrl(item.student.avatarUrl)}
                            alt={item.student.fullName}
                            className="w-8 h-8 rounded-full object-cover border border-white/10 shrink-0"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src =
                                'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150';
                            }}
                          />
                          <div className="min-w-0">
                            <span className="font-bold text-white block truncate group-hover:text-[#4ade80] transition-colors">
                              {item.student.fullName}
                            </span>
                            <span className="text-[10px] text-[#bccabb] sm:hidden">
                              Mat: {item.student.matricula || '-'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Matrícula */}
                      <td className="py-3 px-4 hidden sm:table-cell font-mono text-[11px] text-white/80">
                        {item.student.matricula || '-'}
                      </td>

                      {/* Atendimento */}
                      <td className="py-3 px-4 hidden md:table-cell">
                        {isPne ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-300 border border-rose-500/30 inline-flex items-center gap-1">
                            PNE
                          </span>
                        ) : isRad ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30 inline-flex items-center gap-1">
                            RAD
                          </span>
                        ) : (
                          <span className="text-white/40 text-[10px]">Regular</span>
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
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 inline-flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>Aguardando Correção</span>
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-300/80 border border-rose-500/20 inline-flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            <span>Não Entregue</span>
                          </span>
                        )}
                      </td>

                      {/* Nota */}
                      <td className="py-3 px-4 text-right">
                        {item.totalGrade !== null ? (
                          <div className="inline-flex items-center gap-1">
                            <span className="text-base font-black text-[#4ade80]">
                              {item.totalGrade.toFixed(1).replace('.', ',')}
                            </span>
                            <span className="text-[10px] text-[#bccabb] font-semibold">
                              / {item.maxGrade}
                            </span>
                          </div>
                        ) : (
                          <span className="text-white/30 font-semibold italic text-[11px]">
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
    </div>
  );
};

export default PostagemRcoView;
