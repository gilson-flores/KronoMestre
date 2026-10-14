'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  FileText,
  CheckCircle2,
  Clock,
  MessageSquare,
  Save,
  Eye,
  Lock,
  Unlock,
  FileCheck,
  TrendingUp,
  Award,
  AlertTriangle,
  BarChart3,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { StudentUser, Activity } from '@/lib/types';
import { canStudentAccessActivity, isStudentPNE, isActivityAdapted } from '@/lib/studentUtils';

interface StudentSupervisionModalProps {
  isOpen: boolean;
  student: StudentUser | null;
  activities: Activity[];
  onClose: () => void;
  onSaveNotes: (studentId: string, notes: string) => void;
  onSendMessage?: () => void;
  onSimulateStudent?: (student: StudentUser) => void;
  onMarkPhysicalDelivery?: (activityId: string, student: StudentUser) => void;
  onToggleRecoveryAuthorization?: (recoveryActivityId: string, student: StudentUser) => void;
}

// Formata o nome curto padronizado: "Redação AV1", "Simulado AV2", "RP1"
export function formatShortActivityName(act: Activity, allList: Activity[]): string {
  const isRec = Boolean(act.isRecovery || act.type === 'Recuperação Paralela' || act.recoveryFromId);
  if (isRec) {
    const recList = allList.filter(
      (a) => a.isRecovery || a.type === 'Recuperação Paralela' || Boolean(a.recoveryFromId)
    );
    const idx = recList.findIndex((a) => a.id === act.id);
    return `RP${idx >= 0 ? idx + 1 : 1}`;
  }

  const regList = allList.filter(
    (a) => !a.isRecovery && a.type !== 'Recuperação Paralela' && !a.recoveryFromId
  );
  const idx = regList.findIndex((a) => a.id === act.id);
  const num = idx >= 0 ? idx + 1 : 1;
  const modeLabel =
    act.isGameActivity || act.gameData || act.type === 'Jogo Avaliativo'
      ? 'KronoGame'
      : act.type || 'Avaliação';

  return `${modeLabel} AV${num}`;
}

export const StudentSupervisionModal: React.FC<StudentSupervisionModalProps> = ({
  isOpen,
  student,
  activities,
  onClose,
  onSaveNotes,
  onSendMessage,
  onSimulateStudent,
  onMarkPhysicalDelivery,
  onToggleRecoveryAuthorization,
}) => {
  const [notes, setNotes] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [selectedPhysicalActivityId, setSelectedPhysicalActivityId] = useState<string>('');
  const [expandedActivityId, setExpandedActivityId] = useState<string | null>(null);

  const studentActivities = useMemo(() => {
    if (!student) return [];
    const isPne = isStudentPNE(student);

    return activities.filter((act) => {
      if (!canStudentAccessActivity(act.turma, student.turma)) return false;
      const adapted = isActivityAdapted(act);
      if (isPne) return adapted || act.includedPneStudentIds?.includes(student.id);
      return !adapted;
    });
  }, [activities, student]);

  useEffect(() => {
    if (student) {
      setNotes(student.pedagogicalNotes || '');
      setSavedSuccess(false);
      // Pré-seleciona a primeira atividade ainda não entregue pelo aluno
      const firstPending = studentActivities.find((act) => {
        const sub = act.submissions?.find(
          (s) =>
            s.studentId === student.id ||
            (Boolean(student.matricula) && s.matricula === student.matricula) ||
            s.studentName?.toLowerCase() === student.fullName?.toLowerCase()
        );
        return !sub || sub.status === 'returned';
      });
      setSelectedPhysicalActivityId(firstPending?.id || studentActivities[0]?.id || '');
    }
  }, [student, studentActivities]);

  // Métricas completas do Dashboard de Desempenho do Aluno
  const performanceStats = useMemo(() => {
    if (!student) {
      return {
        total: 0,
        gradedCount: 0,
        pendingCorrectionCount: 0,
        missingCount: 0,
        returnedCount: 0,
        averageGrade: 0,
        deliveryRate: 0,
      };
    }

    let gradedCount = 0;
    let pendingCorrectionCount = 0;
    let missingCount = 0;
    let returnedCount = 0;
    let sumGrades = 0;

    studentActivities.forEach((act) => {
      const sub = act.submissions?.find(
        (s) =>
          s.studentId === student.id ||
          (Boolean(student.matricula) && s.matricula === student.matricula) ||
          s.studentName?.toLowerCase() === student.fullName?.toLowerCase()
      );

      if (!sub || sub.status === 'draft') {
        missingCount++;
      } else if (sub.status === 'graded') {
        gradedCount++;
        const score =
          (Number(sub.objectiveScore) || 0) +
          (Number(sub.essayScore) || 0) +
          (Number(sub.extraPoints) || 0);
        sumGrades += score;
      } else if (sub.status === 'pending') {
        pendingCorrectionCount++;
      } else if (sub.status === 'returned') {
        returnedCount++;
      }
    });

    const total = studentActivities.length;
    const delivered = gradedCount + pendingCorrectionCount;
    const deliveryRate = total > 0 ? Math.round((delivered / total) * 100) : 0;
    const averageGrade = gradedCount > 0 ? Number((sumGrades / gradedCount).toFixed(1)) : 0;

    return {
      total,
      gradedCount,
      pendingCorrectionCount,
      missingCount,
      returnedCount,
      averageGrade,
      deliveryRate,
    };
  }, [student, studentActivities]);

  if (!isOpen || !student) return null;

  const handleSave = () => {
    onSaveNotes(student.id, notes);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleConfirmPhysicalSelect = () => {
    if (!selectedPhysicalActivityId || !onMarkPhysicalDelivery) return;
    onMarkPhysicalDelivery(selectedPhysicalActivityId, student);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2.5 sm:p-4 animate-fadeIn">
      <div className="bg-surface border border-border rounded-3xl w-full max-w-4xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden">
        {/* TOP HEADER DO ALUNO + BOTÃO SIMULAR ALUNO */}
        <div className="p-4 sm:p-6 border-b border-border bg-background/70 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3.5 min-w-0">
            <img
              src={student.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
              alt={student.fullName}
              className="w-12 h-12 sm:w-14 sm:h-14 rounded-full object-cover border-2 border-primary shrink-0 shadow-md"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/30">
                  Dashboard de Supervisão
                </span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-surface border border-border text-foreground">
                  Turma {student.turma}
                </span>
                {student.tag && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {student.tag}
                  </span>
                )}
              </div>
              <h2 className="text-base sm:text-xl font-black text-foreground truncate mt-1">
                {student.fullName}
              </h2>
              <p className="text-[11px] text-muted">Matrícula: {student.matricula}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {onSimulateStudent && (
              <button
                type="button"
                onClick={() => onSimulateStudent(student)}
                className="px-3.5 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 font-extrabold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                title="Simular Portal deste Aluno"
              >
                <Eye className="w-4 h-4 text-emerald-400" />
                <span>Simular Aluno</span>
              </button>
            )}

            {onSendMessage && (
              <button
                type="button"
                onClick={onSendMessage}
                className="px-3.5 py-2 rounded-xl bg-primary/15 hover:bg-primary/25 text-primary border border-primary/30 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Mensagem</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-full bg-surface hover:bg-rose-500/20 text-muted hover:text-rose-400 border border-border transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* CORPO DO DASHBOARD DE SUPERVISÃO */}
        <div className="p-4 sm:p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
          {/* 1. CARDS DE DESEMPENHO DO ALUNO */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3.5">
            <div className="p-3.5 rounded-2xl bg-background border border-border space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted flex items-center gap-1">
                <Award className="w-3.5 h-3.5 text-primary" /> Média Geral
              </span>
              <div className="text-xl sm:text-2xl font-black text-foreground">
                {performanceStats.gradedCount > 0 ? performanceStats.averageGrade.toFixed(1) : '-'}
                <span className="text-xs font-normal text-muted"> / 10</span>
              </div>
              <span
                className={`text-[10px] font-bold block ${
                  performanceStats.averageGrade >= 6 ? 'text-emerald-400' : 'text-amber-400'
                }`}
              >
                {performanceStats.gradedCount === 0
                  ? 'Sem notas lançadas'
                  : performanceStats.averageGrade >= 6
                  ? '✅ Na Média / Aprovado'
                  : '⚠️ Abaixo de 6,0'}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-background border border-border space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" /> Taxa de Entrega
              </span>
              <div className="text-xl sm:text-2xl font-black text-emerald-400">
                {performanceStats.deliveryRate}%
              </div>
              <span className="text-[10px] text-muted block">
                {performanceStats.gradedCount + performanceStats.pendingCorrectionCount} de{' '}
                {performanceStats.total} entregues
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-background border border-border space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-sky-400" /> Em Correção
              </span>
              <div className="text-xl sm:text-2xl font-black text-sky-400">
                {performanceStats.pendingCorrectionCount}
              </div>
              <span className="text-[10px] text-muted block">Aguardando avaliação</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-background border border-border space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" /> Pendentes
              </span>
              <div className="text-xl sm:text-2xl font-black text-rose-400">
                {performanceStats.missingCount + performanceStats.returnedCount}
              </div>
              <span className="text-[10px] text-muted block">
                {performanceStats.returnedCount > 0
                  ? `${performanceStats.returnedCount} devolvida(s)`
                  : 'Não realizadas'}
              </span>
            </div>
          </div>

          {/* 2. SELETOR DE ENTREGA FÍSICA (ALUNOS SEM INTERNET) */}
          {onMarkPhysicalDelivery && studentActivities.length > 0 && (
            <div className="p-4 rounded-2xl bg-cyan-950/20 border border-cyan-500/30 space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-cyan-400 shrink-0" />
                  <h3 className="text-xs sm:text-sm font-black text-foreground">
                    Registrar Entrega Física no Papel (Aluno sem Internet)
                  </h3>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300">
                  Envia direto para a aba Correções
                </span>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                <select
                  value={selectedPhysicalActivityId}
                  onChange={(e) => setSelectedPhysicalActivityId(e.target.value)}
                  className="flex-1 bg-background border border-border rounded-xl px-3.5 py-2.5 text-xs text-foreground font-semibold focus:outline-none focus:border-cyan-400"
                >
                  {studentActivities.map((act) => {
                    const shortName = formatShortActivityName(act, studentActivities);
                    const sub = act.submissions?.find(
                      (s) =>
                        s.studentId === student.id ||
                        (Boolean(student.matricula) && s.matricula === student.matricula) ||
                        s.studentName?.toLowerCase() === student.fullName?.toLowerCase()
                    );
                    const statusLabel = !sub
                      ? 'Não Entregue'
                      : sub.isPhysicalDelivery
                      ? 'Já marcada como Física'
                      : sub.status === 'graded'
                      ? 'Já Corrigida'
                      : 'Na Fila';

                    return (
                      <option key={act.id} value={act.id}>
                        {shortName} — {act.title} ({statusLabel})
                      </option>
                    );
                  })}
                </select>

                <button
                  type="button"
                  onClick={handleConfirmPhysicalSelect}
                  className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0 shadow-md"
                >
                  <FileCheck className="w-4 h-4" />
                  <span>📄 Marcar Entregue Fisicamente</span>
                </button>
              </div>
            </div>
          )}

          {/* 3. BOLETIM DETALHADO POR AVALIAÇÃO + AUTORIZAÇÃO DE RECUPERAÇÃO PARALELA */}
          <div className="space-y-3">
            <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-foreground flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              <span>Desempenho por Avaliação & Controle de Recuperação ({studentActivities.length})</span>
            </h3>

            <div className="space-y-2.5">
              {studentActivities.map((act) => {
                const shortName = formatShortActivityName(act, studentActivities);
                const sub = act.submissions?.find(
                  (s) =>
                    s.studentId === student.id ||
                    (Boolean(student.matricula) && s.matricula === student.matricula) ||
                    s.studentName?.toLowerCase() === student.fullName?.toLowerCase()
                );

                const isRecovery = Boolean(
                  act.isRecovery || act.type === 'Recuperação Paralela' || act.recoveryFromId
                );

                let parentScore: number | null = null;
                if (isRecovery) {
                  const parentAct =
                    activities.find((p) => p.id === act.recoveryFromId) ||
                    activities.find(
                      (p) =>
                        !p.isRecovery &&
                        p.type !== 'Recuperação Paralela' &&
                        p.turma === act.turma &&
                        p.id !== act.id
                    );
                  const parentSub = parentAct?.submissions?.find(
                    (s) =>
                      s.studentId === student.id ||
                      (Boolean(student.matricula) && s.matricula === student.matricula) ||
                      s.studentName?.toLowerCase() === student.fullName?.toLowerCase()
                  );
                  if (parentSub) {
                    parentScore =
                      (Number(parentSub.objectiveScore) || 0) +
                      (Number(parentSub.essayScore) || 0) +
                      (Number(parentSub.extraPoints) || 0);
                  }
                }

                const isLockedByGradeAboveSix = isRecovery && parentScore !== null && parentScore >= 6.0;
                const isManuallyAuthorized = Boolean(
                  act.authorizedRecoveryStudentIds?.includes(student.id) ||
                    (student.matricula && act.authorizedRecoveryStudentIds?.includes(student.matricula)) ||
                    student.authorizedRecoveryActivityIds?.includes(act.id)
                );

                const totalScore = sub
                  ? (Number(sub.objectiveScore) || 0) +
                    (Number(sub.essayScore) || 0) +
                    (Number(sub.extraPoints) || 0)
                  : null;

                const isExpanded = expandedActivityId === act.id;

                return (
                  <div
                    key={act.id}
                    className="p-3.5 rounded-2xl bg-background border border-border space-y-2.5"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <div className="flex items-center gap-2 flex-wrap min-w-0">
                        <span
                          className={`text-xs font-black px-2.5 py-1 rounded-lg border ${
                            isRecovery
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                              : 'bg-primary/20 text-primary border-primary/40'
                          }`}
                        >
                          {shortName}
                        </span>

                        {sub?.isPhysicalDelivery && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                            📄 Papel
                          </span>
                        )}

                        {!sub ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-500/15 text-rose-400 border border-rose-500/30">
                            Pendente
                          </span>
                        ) : sub.status === 'pending' ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-sky-500/20 text-sky-300 border border-sky-500/40">
                            ⏳ A Corrigir
                          </span>
                        ) : sub.status === 'graded' ? (
                          <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                            Nota: {totalScore?.toFixed(1)} / {act.maxGrade || 10}
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-orange-500/20 text-orange-300 border border-orange-500/40">
                            ↩️ Devolvida
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        {isRecovery && isLockedByGradeAboveSix && onToggleRecoveryAuthorization && (
                          <button
                            type="button"
                            onClick={() => onToggleRecoveryAuthorization(act.id, student)}
                            className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-1 border transition-all cursor-pointer ${
                              isManuallyAuthorized
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            }`}
                          >
                            {isManuallyAuthorized ? (
                              <>
                                <Unlock className="w-3.5 h-3.5" />
                                <span>RP Liberada (Bloquear)</span>
                              </>
                            ) : (
                              <>
                                <Lock className="w-3.5 h-3.5" />
                                <span>🔓 Autorizar RP (Nota ≥ 6)</span>
                              </>
                            )}
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => setExpandedActivityId(isExpanded ? null : act.id)}
                          className="px-2.5 py-1.5 rounded-xl bg-surface hover:bg-surface-hover text-muted hover:text-foreground border border-border text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <span>Detalhes</span>
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="p-3 rounded-xl bg-surface border border-border text-xs space-y-1.5 animate-fadeIn">
                        <p className="font-bold text-foreground">Título Original: {act.title}</p>
                        <p className="text-muted">Prazo: {act.deadline || 'Sem data'}</p>
                        {sub && (
                          <div className="pt-1 border-t border-border space-y-1">
                            <p className="text-muted">
                              Objetiva: <strong>{sub.objectiveScore?.toFixed(1) || 0}</strong> | Dissertativa:{' '}
                              <strong>{sub.essayScore?.toFixed(1) || 0}</strong>
                            </p>
                            {sub.essayAnswer && (
                              <p className="text-foreground italic bg-background p-2 rounded-lg border border-border">
                                &ldquo;{sub.essayAnswer}&rdquo;
                              </p>
                            )}
                            {sub.teacherFeedback && (
                              <p className="text-primary">
                                <strong>Parecer:</strong> {sub.teacherFeedback}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 4. ANOTAÇÕES PEDAGÓGICAS */}
          <div className="space-y-2 pt-2 border-t border-border">
            <label className="text-xs font-bold text-muted uppercase tracking-wider block">
              Anotações Pedagógicas do Aluno:
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Registre observações individuais, entregas físicas ou combinados..."
              className="w-full bg-background border border-border rounded-2xl p-3 text-xs text-foreground focus:outline-none focus:border-primary"
            />
            <div className="flex items-center justify-between">
              {savedSuccess ? (
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> Salvo com sucesso!
                </span>
              ) : (
                <span />
              )}
              <button
                type="button"
                onClick={handleSave}
                className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <Save className="w-4 h-4" />
                <span>Salvar Anotações</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
