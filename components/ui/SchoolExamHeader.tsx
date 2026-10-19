'use client';

import React from 'react';
import { Activity, StudentUser, TeacherUser, ActivitySubmission } from '@/lib/types';
import {
  GraduationCap,
  Clock,
  Award,
  CheckCircle2,
  AlertCircle,
  FileText,
  Calendar,
  Sparkles,
  BookOpen,
} from 'lucide-react';

interface SchoolExamHeaderProps {
  activity: Activity;
  student: StudentUser;
  teacher: TeacherUser;
  submission?: ActivitySubmission;
  maxGrade: number;
}

export const SchoolExamHeader: React.FC<SchoolExamHeaderProps> = ({
  activity,
  student,
  teacher,
  submission,
  maxGrade,
}) => {
  const schoolName = teacher?.school || "EEB Prof. Jandira D'Ávila";
  const subjectName = teacher?.subject || "Sociologia";
  const teacherName = teacher?.name || "Prof. Gilson Flores";

  // Nota obtida ou traço
  const scoreObtained = submission
    ? (
        (submission.objectiveScore || 0) +
        (submission.essayScore || 0) +
        (submission.extraPoints || 0)
      ).toFixed(1)
    : null;

  return (
    <div className="rounded-3xl border-2 border-border/80 bg-[#0d1322] shadow-2xl overflow-hidden text-foreground">
      {/* TIMBRE ESCOLAR OFICIAL / CABEÇALHO DE PROVA IMPRESSA */}
      <div className="bg-[#141b2f] p-4 sm:p-6 border-b-2 border-border/80">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          
          {/* LADO ESQUERDO: Dados da Instituição e Disciplina */}
          <div className="flex items-start gap-3.5 sm:gap-4 flex-1 min-w-0">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-primary/20 border-2 border-primary/40 flex items-center justify-center shrink-0 shadow-lg">
              <GraduationCap className="w-6 h-6 sm:w-7 sm:h-7 text-primary" />
            </div>
            
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider bg-primary/20 text-primary px-2.5 py-0.5 rounded-full border border-primary/30">
                  Documento Oficial de Avaliação
                </span>
                <span className="text-[10px] sm:text-[11px] font-bold text-amber-600 flex items-center gap-1 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                  <Clock className="w-3 h-3 text-amber-400" />
                  <span>Prazo: {activity.deadline || 'Período Regular'}</span>
                </span>
              </div>

              <h2 className="text-base sm:text-xl font-extrabold text-foreground truncate uppercase tracking-tight">
                {schoolName}
              </h2>

              <p className="text-xs sm:text-sm text-muted font-medium">
                Disciplina: <strong className="text-foreground">{subjectName}</strong> • Docente: <strong className="text-foreground">{teacherName}</strong>
              </p>
            </div>
          </div>

          {/* LADO DIREITO: O CLÁSSICO "BOX DE NOTA & VISTO DO PROFESSOR" */}
          <div className="shrink-0 w-full lg:w-auto flex items-center justify-end">
            <div className="w-full sm:w-auto bg-[#090d18] p-3 sm:p-4 rounded-2xl border-2 border-border/90 flex items-center gap-4 shadow-inner">
              {/* Box de Valor e Nota */}
              <div className="text-center px-3 py-1 border-r border-border/80">
                <span className="block text-[10px] font-bold text-muted uppercase tracking-wider">
                  Valor da Prova
                </span>
                <span className="text-lg sm:text-xl font-black text-foreground">
                  {maxGrade.toFixed(1)} <span className="text-xs font-semibold text-muted">pts</span>
                </span>
              </div>

              {/* Box da Nota Obtida */}
              <div className="text-center px-3 py-1">
                <span className="block text-[10px] font-bold text-muted uppercase tracking-wider">
                  Nota Obtida
                </span>
                {scoreObtained !== null ? (
                  <span className="text-xl sm:text-2xl font-black text-primary">
                    {scoreObtained}
                  </span>
                ) : (
                  <span className="text-lg sm:text-xl font-mono font-bold text-slate-500">
                    ___ / {maxGrade.toFixed(1)}
                  </span>
                )}
              </div>

              {/* Carimbo de Visto / Situação */}
              <div className="text-center pl-3 border-l border-border/80">
                <span className="block text-[10px] font-bold text-muted uppercase tracking-wider">
                  Visto Docente
                </span>
                {submission ? (
                  submission.status === 'graded' ? (
                    <span className="inline-block mt-0.5 px-2.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-black uppercase tracking-wider rotate-[-2deg]">
                      ✓ Avaliado
                    </span>
                  ) : submission.status === 'returned' ? (
                    <span className="inline-block mt-0.5 px-2.5 py-0.5 rounded-md bg-rose-100 text-rose-600 border border-rose-200 text-[10px] font-black uppercase tracking-wider">
                      ↩ Devolvido
                    </span>
                  ) : (
                    <span className="inline-block mt-0.5 px-2.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-black uppercase tracking-wider">
                      ⏳ Entregue
                    </span>
                  )
                ) : (
                  <span className="inline-block mt-0.5 px-2 py-0.5 rounded-md bg-white/5 text-slate-400 border border-white/10 text-[10px] font-medium">
                    A Fazer
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* IDENTIFICAÇÃO FORMAL DO ESTUDANTE (GRID DE MATRÍCULA E TURMA) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-4 mt-4 border-t border-border/70 text-xs select-none">
          <div className="bg-[#090d18] px-3.5 py-2 rounded-xl border border-border flex items-center justify-between">
            <span className="text-muted font-bold">Estudante:</span>
            <span className="font-extrabold text-foreground truncate ml-2">{student.fullName}</span>
          </div>

          <div className="bg-[#090d18] px-3.5 py-2 rounded-xl border border-border flex items-center justify-between">
            <span className="text-muted font-bold">Turma:</span>
            <span className="font-extrabold text-foreground">{student.turma}</span>
          </div>

          <div className="bg-[#090d18] px-3.5 py-2 rounded-xl border border-border flex items-center justify-between">
            <span className="text-muted font-bold">Matrícula:</span>
            <span className="font-mono font-bold text-foreground">{student.matricula}</span>
          </div>
        </div>
      </div>

      {/* TÍTULO DA AVALIAÇÃO & ORIENTAÇÕES GERAIS */}
      <div className="p-4 sm:p-6 space-y-4">
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-primary/80">
            Instrumento Avaliativo:
          </span>
          <h1 className="text-lg sm:text-2xl font-black text-foreground mt-0.5">
            {activity.title}
          </h1>
        </div>

        {/* Bloco Notarial de Instruções de Prova */}
        <div className="bg-[#141b2f]/60 p-4 rounded-2xl border border-border/90 text-xs space-y-2">
          <div className="flex items-center gap-2 font-bold text-slate-300">
            <FileText className="w-4 h-4 text-primary" />
            <span>Instruções Gerais de Realização da Avaliação:</span>
          </div>
          <ul className="text-muted text-[11px] sm:text-xs leading-relaxed space-y-1 list-disc pl-5">
            <li>Leia atentamente cada enunciado e texto de apoio antes de registrar suas respostas.</li>
            <li>Nas questões objetivas, apenas uma alternativa é correta. Confira suas marcações no cartão-resposta.</li>
            <li>Nas questões dissertativas, redija sua argumentação na folha pautada, respeitando normas de ortografia e concordância.</li>
            <li>O envio é registrado com data e hora oficiais da plataforma.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
