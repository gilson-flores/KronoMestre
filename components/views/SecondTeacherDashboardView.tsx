'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  Users,
  FileCheck,
  Clock,
  BookOpen,
  HeartHandshake,
  CheckCircle2,
  AlertCircle,
  Eye,
  Calendar,
  Sparkles,
  Search,
  ChevronRight,
  ShieldCheck,
  FileSpreadsheet
} from 'lucide-react';
import { TeacherUser, StudentUser, Activity, AtestadoRadRecord } from '@/lib/types';
import { formatAvatarUrl } from '@/lib/utils';
import { getTurmaLabel, isStudentPNE, isActivityAdapted } from '@/lib/studentUtils';
import { supabase } from '@/lib/supabase';
import { getScopedLocalStorageItem, setScopedLocalStorageItem } from '@/lib/cacheUtils';

interface SecondTeacherDashboardViewProps {
  teacher: TeacherUser;
  students: StudentUser[]; // strictly visibleStudentsForRole
  activities: Activity[];
  onNavigateToTab: (tab: string) => void;
  onViewStudentDetails?: (student: StudentUser) => void;
}

export const SecondTeacherDashboardView: React.FC<SecondTeacherDashboardViewProps> = ({
  teacher,
  students,
  activities,
  onNavigateToTab,
  onViewStudentDetails,
}) => {
  const [selectedStudentFilter, setSelectedStudentFilter] = useState<string>('all');
  const [atestados, setAtestados] = useState<AtestadoRadRecord[]>([]);
  const [isLoadingAtestados, setIsLoadingAtestados] = useState(true);

  // Load atestados for tutored students
  useEffect(() => {
    let isSubscribed = true;

    async function loadAtestados() {
      setIsLoadingAtestados(true);
      let loaded: AtestadoRadRecord[] = [];
      const ownerTeacherId = teacher.ownerTeacherId || (teacher as any).owner_teacher_id || teacher.id;

      // 1. Local storage fallback com isolamento por professor titular
      if (typeof window !== 'undefined') {
        try {
          const raw = getScopedLocalStorageItem('local_atestados_rad_data', ownerTeacherId);
          if (raw) {
            loaded = JSON.parse(raw);
          }
        } catch (e) {}
      }

      // 2. Fetch from API Route
      try {
        const res = await fetch('/api/atestados-rad');
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.data)) {
            loaded = json.data;
            if (typeof window !== 'undefined') {
              setScopedLocalStorageItem('local_atestados_rad_data', JSON.stringify(json.data), ownerTeacherId);
            }
          }
        }
      } catch (err) {
        console.warn('Conexão ao carregar atestados no dashboard 2º prof:', err);
      }

      // Filter strictly by the tutored students
      const tutoredIds = new Set(students.map((s) => s.id));
      const tutoredMatriculas = new Set(students.map((s) => s.matricula));
      const tutoredNames = new Set(students.map((s) => s.fullName.toLowerCase().trim()));

      const filtered = loaded.filter(
        (rec) =>
          tutoredIds.has(rec.studentId) ||
          tutoredMatriculas.has(rec.studentId) ||
          tutoredNames.has(rec.studentName?.toLowerCase().trim())
      );

      if (isSubscribed) {
        setAtestados(filtered);
        setIsLoadingAtestados(false);
      }
    }

    loadAtestados();

    return () => {
      isSubscribed = false;
    };
  }, [students]);

  // Compute activities status specifically for tutored students
  const tutoredStudentDeliveries = useMemo(() => {
    const studentIdSet = new Set(students.map((s) => s.id));
    const studentMap = new Map(students.map((s) => [s.id, s]));

    const list: Array<{
      activityId: string;
      activityTitle: string;
      turma: string;
      isAdapted?: boolean;
      studentId: string;
      studentName: string;
      studentTurma: string;
      status: 'submitted' | 'graded' | 'returned' | 'pending';
      submittedAt?: string;
      totalGrade?: number;
      maxGrade?: number;
      teacherFeedback?: string;
    }> = [];

    // For each tutored student and each activity for their class
    students.forEach((student) => {
      activities.forEach((act) => {
        // Check if student belongs to activity turma or is specifically included
        const matchesTurma = act.turma === student.turma || act.turma === 'Todas';
        const isIncludedPne = act.includedPneStudentIds && act.includedPneStudentIds.includes(student.id);

        if (matchesTurma || isIncludedPne) {
          const submission = (act.submissions || []).find(
            (sub) => sub.studentId === student.id || sub.matricula === student.matricula
          );

          if (submission) {
            const hasGrade = submission.essayScore !== undefined || (submission.objectiveScore || 0) > 0;
            const objScore = submission.objectiveScore || 0;
            const essayScore = submission.essayScore || 0;
            const extra = submission.extraPoints || 0;
            const total = objScore + essayScore + extra;
            const maxObj = submission.maxObjectiveScore || 0;
            const maxEss = submission.maxEssayScore || 0;
            const max = maxObj + maxEss || 10;

            list.push({
              activityId: act.id,
              activityTitle: act.title,
              turma: act.turma,
              isAdapted: isActivityAdapted(act),
              studentId: student.id,
              studentName: student.fullName,
              studentTurma: student.turma,
              status: submission.status === 'graded' ? 'graded' : submission.status === 'returned' ? 'returned' : 'submitted',
              submittedAt: submission.submittedAt,
              totalGrade: hasGrade ? total : undefined,
              maxGrade: max,
              teacherFeedback: submission.teacherFeedback,
            });
          } else {
            // Not submitted yet
            list.push({
              activityId: act.id,
              activityTitle: act.title,
              turma: act.turma,
              isAdapted: isActivityAdapted(act),
              studentId: student.id,
              studentName: student.fullName,
              studentTurma: student.turma,
              status: 'pending',
            });
          }
        }
      });
    });

    return list;
  }, [students, activities]);

  // Filtered deliveries by selected student
  const filteredDeliveries = useMemo(() => {
    if (selectedStudentFilter === 'all') return tutoredStudentDeliveries;
    return tutoredStudentDeliveries.filter((d) => d.studentId === selectedStudentFilter);
  }, [tutoredStudentDeliveries, selectedStudentFilter]);

  // Statistics
  const stats = useMemo(() => {
    const totalStudents = students.length;
    const submittedCount = tutoredStudentDeliveries.filter((d) => d.status !== 'pending').length;
    const pendingCount = tutoredStudentDeliveries.filter((d) => d.status === 'pending').length;
    const activeAtestados = atestados.filter((a) => {
      const today = new Date().toISOString().split('T')[0];
      return a.dataAtestado <= today && a.dataFinal >= today;
    }).length;

    return {
      totalStudents,
      submittedCount,
      pendingCount,
      activeAtestados,
      totalAtestados: atestados.length,
    };
  }, [students, tutoredStudentDeliveries, atestados]);

  return (
    <div className="space-y-8 animate-fadeIn pb-12">
      {/* Top Banner Header */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-border relative overflow-hidden bg-gradient-to-r from-surface via-surface to-background shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 bg-primary/20 text-primary border border-primary/40 rounded-full text-xs font-bold tracking-wide uppercase flex items-center gap-1.5">
                <HeartHandshake className="w-3.5 h-3.5" />
                <span>2º Professor • Apoio Pedagógico PNE</span>
              </span>
              <span className="px-2.5 py-0.5 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-full text-[11px] font-semibold">
                Modo Somente Leitura
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
              Olá, {teacher.name || 'Professor(a)'}
            </h1>
            <p className="text-xs sm:text-sm text-muted max-w-2xl leading-relaxed">
              Acompanhamento pedagógico exclusivo dos alunos sob sua tutela. A criação de atividades, avaliações oficiais e lançamentos de notas no RCO são de responsabilidade do professor titular regente.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => onNavigateToTab('alunos')}
              className="py-3 px-5 bg-surface-hover hover:bg-surface text-foreground font-bold rounded-2xl text-xs transition-all border border-border flex items-center gap-2 cursor-pointer shadow-sm active:scale-95"
            >
              <Users className="w-4 h-4 text-primary" />
              <span>Ver Meus Alunos ({students.length})</span>
            </button>
            <button
              onClick={() => onNavigateToTab('atestados_rad')}
              className="py-3 px-5 bg-[#171f33] hover:bg-surface-hover text-primary font-bold rounded-2xl text-xs transition-all border border-primary/30 flex items-center gap-2 cursor-pointer shadow-sm active:scale-95"
            >
              <BookOpen className="w-4 h-4" />
              <span>Atestados & RAD ({atestados.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Alunos sob Tutela */}
        <div className="glass-panel p-5 rounded-3xl border border-border bg-surface flex items-center gap-4 shadow-md">
          <div className="w-12 h-12 rounded-2xl bg-primary/15 border border-primary/30 text-primary flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-muted uppercase tracking-wider block">Alunos Tutelados</span>
            <span className="text-2xl font-extrabold text-foreground">{stats.totalStudents}</span>
            <p className="text-[11px] text-muted mt-0.5">Sob sua orientação direta</p>
          </div>
        </div>

        {/* Card 2: Entregas Realizadas */}
        <div className="glass-panel p-5 rounded-3xl border border-border bg-surface flex items-center gap-4 shadow-md">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-muted uppercase tracking-wider block">Atividades Entregues</span>
            <span className="text-2xl font-extrabold text-foreground">{stats.submittedCount}</span>
            <p className="text-[11px] text-muted mt-0.5">Respostas enviadas</p>
          </div>
        </div>

        {/* Card 3: Entregas Pendentes */}
        <div className="glass-panel p-5 rounded-3xl border border-border bg-surface flex items-center gap-4 shadow-md">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-500 flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-muted uppercase tracking-wider block">Aguardando Envio</span>
            <span className="text-2xl font-extrabold text-foreground">{stats.pendingCount}</span>
            <p className="text-[11px] text-muted mt-0.5">Prazos em andamento</p>
          </div>
        </div>

        {/* Card 4: Atestados e RAD */}
        <div className="glass-panel p-5 rounded-3xl border border-border bg-surface flex items-center gap-4 shadow-md">
          <div className="w-12 h-12 rounded-2xl bg-sky-500/15 border border-sky-500/30 text-sky-500 flex items-center justify-center shrink-0">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-muted uppercase tracking-wider block">Atestados / RAD</span>
            <span className="text-2xl font-extrabold text-foreground">{stats.totalAtestados}</span>
            <p className="text-[11px] text-muted mt-0.5">{stats.activeAtestados} ativo(s) no momento</p>
          </div>
        </div>
      </div>

      {/* Grid: Alunos Tutelados (Cards com foto e detalhes) */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-foreground flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              <span>Alunos Sob Minha Tutela ({students.length})</span>
            </h2>
            <p className="text-xs text-muted">Acompanhe o cadastro e as necessidades de adaptação curricular de cada estudante</p>
          </div>
          <button
            onClick={() => onNavigateToTab('alunos')}
            className="text-xs font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer w-fit"
          >
            <span>Ver listagem completa</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {students.length === 0 ? (
          <div className="glass-panel p-8 text-center rounded-3xl border border-border text-muted text-xs space-y-2">
            <HeartHandshake className="w-8 h-8 text-muted mx-auto opacity-50" />
            <p className="font-semibold text-foreground">Nenhum aluno vinculado a você no momento.</p>
            <p className="text-muted max-w-md mx-auto">
              Os alunos PNE vinculados ao seu registro aparecerão automaticamente aqui quando associados pelo professor titular ou coordenação.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {students.map((student) => {
              const studentDeliveries = tutoredStudentDeliveries.filter((d) => d.studentId === student.id);
              const submittedCount = studentDeliveries.filter((d) => d.status !== 'pending').length;
              const totalActivities = studentDeliveries.length;

              return (
                <div
                  key={student.id}
                  className="glass-panel p-5 rounded-3xl border border-border hover:border-primary/40 transition-all flex flex-col justify-between space-y-4 shadow-sm group"
                >
                  <div className="flex items-start gap-3.5">
                    <img
                      src={formatAvatarUrl(student.avatarUrl)}
                      alt={student.fullName}
                      loading="lazy"
                      decoding="async"
                      className="w-12 h-12 rounded-2xl object-cover border border-border shrink-0"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150';
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-bold text-foreground truncate leading-tight group-hover:text-primary transition-colors">
                        {student.fullName}
                      </h3>
                      <p className="text-xs text-muted mt-0.5">
                        Turma: <span className="font-semibold text-foreground">{student.turma}</span> • Matrícula: {student.matricula}
                      </p>
                      
                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-rose-500/15 text-rose-500 border border-rose-500/30 rounded-full uppercase">
                          {isStudentPNE(student) ? (student.tag || 'PNE') : (student.tag || 'REGULAR')}
                        </span>
                        {student.pneConditions && student.pneConditions.length > 0 && (
                          <span
                            className="text-[10px] font-semibold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 truncate max-w-[140px]"
                            title={student.pneConditions.join(', ')}
                          >
                            {student.pneConditions.join(', ')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-border flex items-center justify-between">
                    <div className="text-[11px] text-muted">
                      Progresso: <span className="font-bold text-foreground">{submittedCount}/{totalActivities}</span> entregas
                    </div>
                    {onViewStudentDetails && (
                      <button
                        onClick={() => onViewStudentDetails(student)}
                        className="py-1.5 px-3 bg-surface-hover hover:bg-primary hover:text-white text-primary text-xs font-bold rounded-xl transition-all border border-primary/30 flex items-center gap-1.5 cursor-pointer shadow-sm"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Ver Ficha</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Seção: Status de Entregas das Atividades dos Alunos Tutelados */}
      <div className="glass-panel p-6 rounded-3xl border border-border space-y-5 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
          <div>
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-primary" />
              <span>Status de Entregas das Atividades dos Tutelados</span>
            </h2>
            <p className="text-xs text-muted mt-0.5">
              Consulta de envio e notas atribuídas pelo professor titular regente. (Somente Leitura)
            </p>
          </div>

          {/* Student Filter */}
          {students.length > 1 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted font-semibold">Filtrar por Aluno:</span>
              <select
                value={selectedStudentFilter}
                onChange={(e) => setSelectedStudentFilter(e.target.value)}
                className="bg-surface border border-border rounded-xl px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary cursor-pointer font-medium"
              >
                <option value="all">Todos os Tutelados ({tutoredStudentDeliveries.length})</option>
                {students.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.fullName} ({st.turma})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {filteredDeliveries.length === 0 ? (
          <div className="p-8 text-center text-muted text-xs">
            Nenhuma atividade vinculada ou entrega registrada para os alunos tutelados selecionados.
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full min-w-[640px] text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border text-muted font-bold tracking-wider uppercase text-[10px]">
                  <th className="py-3 px-3">Atividade / Avaliação</th>
                  <th className="py-3 px-3">Turma</th>
                  <th className="py-3 px-3">Aluno Tutelado</th>
                  <th className="py-3 px-3">Status de Envio</th>
                  <th className="py-3 px-3">Nota (Prof. Titular)</th>
                  <th className="py-3 px-3 text-right">Feedback Pedagógico</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredDeliveries.map((item, index) => (
                  <tr key={`${item.activityId}-${item.studentId}-${index}`} className="hover:bg-surface-hover/50 transition-colors">
                    <td className="py-3 px-3 font-semibold text-foreground">
                      <div className="flex items-center gap-2">
                        <span>{item.activityTitle}</span>
                        {item.isAdapted && (
                          <span className="text-[9px] font-extrabold px-1.5 py-0.5 bg-amber-500/15 text-amber-600 border border-amber-500/30 rounded uppercase">
                            Adaptada
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-muted">{item.turma}</td>
                    <td className="py-3 px-3 font-medium text-foreground">{item.studentName}</td>
                    <td className="py-3 px-3">
                      {item.status === 'submitted' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Entregue {item.submittedAt ? `(${item.submittedAt})` : ''}</span>
                        </span>
                      )}
                      {item.status === 'graded' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/30">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Corrigida pelo Titular</span>
                        </span>
                      )}
                      {item.status === 'returned' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                          <AlertCircle className="w-3 h-3" />
                          <span>Devolvida p/ Ajuste</span>
                        </span>
                      )}
                      {item.status === 'pending' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-muted bg-surface px-2 py-0.5 rounded-full border border-border">
                          <Clock className="w-3 h-3" />
                          <span>Não entregue</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 font-bold text-foreground">
                      {item.totalGrade !== undefined ? (
                        <span className="text-primary font-mono text-sm">
                          {item.totalGrade} / {item.maxGrade}
                        </span>
                      ) : (
                        <span className="text-muted italic text-[11px]">Aguardando regente</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right max-w-xs truncate text-muted text-[11px]">
                      {item.teacherFeedback ? (
                        <span title={item.teacherFeedback} className="italic">
                          &ldquo;{item.teacherFeedback}&rdquo;
                        </span>
                      ) : (
                        <span className="text-muted/60">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Seção: Atestados e RAD dos Tutelados */}
      <div className="glass-panel p-6 rounded-3xl border border-border space-y-4 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
          <div>
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-amber-500" />
              <span>Atestados e RAD Registrados dos Meus Tutelados</span>
            </h2>
            <p className="text-xs text-muted">Histórico de afastamentos médicos e Regime de Atendimento Domiciliar</p>
          </div>
          <button
            onClick={() => onNavigateToTab('atestados_rad')}
            className="text-xs font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer w-fit"
          >
            <span>Ver em Atestados e RAD</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {isLoadingAtestados ? (
          <div className="p-6 text-center text-xs text-muted">Carregando registros de atestados...</div>
        ) : atestados.length === 0 ? (
          <div className="p-6 text-center text-xs text-muted">
            Nenhum atestado ou RAD cadastrado para os seus alunos tutelados.
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full min-w-[620px] text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border text-muted font-bold tracking-wider uppercase text-[10px]">
                  <th className="py-2.5 px-3">Aluno</th>
                  <th className="py-2.5 px-3">Turma</th>
                  <th className="py-2.5 px-3">Tipo</th>
                  <th className="py-2.5 px-3">Período de Afastamento</th>
                  <th className="py-2.5 px-3">Dias</th>
                  <th className="py-2.5 px-3">Motivo / CID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {atestados.map((atest) => (
                  <tr key={atest.id} className="hover:bg-surface-hover/50 transition-colors">
                    <td className="py-2.5 px-3 font-semibold text-foreground">{atest.studentName}</td>
                    <td className="py-2.5 px-3 text-muted">{atest.studentTurma}</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                          atest.tipo === 'RAD'
                            ? 'bg-amber-500/15 text-amber-500 border border-amber-500/30'
                            : 'bg-sky-500/15 text-sky-500 border border-sky-500/30'
                        }`}
                      >
                        {atest.tipo}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-foreground font-mono text-[11px]">
                      {atest.dataAtestado} até {atest.dataFinal}
                    </td>
                    <td className="py-2.5 px-3 text-muted">{atest.diasAtestado} dia(s)</td>
                    <td className="py-2.5 px-3 text-muted max-w-xs truncate">{atest.motivo || 'Não informado'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Diretrizes Pedagógicas de Acessibilidade */}
      <div className="p-5 rounded-3xl border border-primary/30 bg-primary/5 space-y-2">
        <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
          <ShieldCheck className="w-4 h-4" />
          <span>Diretrizes de Regência e Apoio Pedagógico</span>
        </div>
        <p className="text-xs text-muted leading-relaxed">
          Como 2º Professor(a), sua atuação é dedicada ao acompanhamento individualizado dos alunos PNE tutelados, suporte nas adaptações curriculares e comunicação com o professor regente. Conforme as normas pedagógicas, a homologação de notas, correções oficiais de avaliações e registros no sistema RCO são de incumbência exclusiva do Professor Titular regente.
        </p>
      </div>
    </div>
  );
};
export default SecondTeacherDashboardView;
