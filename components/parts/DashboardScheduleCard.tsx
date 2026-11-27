'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, ArrowRight, Clock } from 'lucide-react';
import { TeacherUser } from '@/lib/types';
import {
  CronogramaSlot,
  DEFAULT_CRONOGRAMA_GRADE,
} from '@/components/views/CronogramaView';
import { parseStandardTurmaAndSala } from '@/lib/groupActivityUtils';

interface DashboardScheduleCardProps {
  teacher?: TeacherUser;
  onOpenCronograma: () => void;
}

const WEEK_HEADERS = ['SEG', 'TER', 'QUA', 'QUI', 'SEX'] as const;

export function formatShortSala(rawSala?: string): string {
  const clean = String(rawSala || '').trim();
  if (!clean) return '';
  const salaMatch = clean.match(/^sala\s*(\d+[a-z]?)$/i);
  if (salaMatch) return `S${salaMatch[1].toUpperCase()}`;
  if (/^lab\.?\s*inform/i.test(clean)) return 'LAB';
  if (/^espa[çc]o\s*maker/i.test(clean)) return 'MAKER';
  if (/^bibliot/i.test(clean)) return 'BIB';
  if (/^audit/i.test(clean)) return 'AUD';
  return clean.length > 7 ? clean.slice(0, 7) : clean;
}

export function normalizeScheduleCell(rawTurma?: string, rawSala?: string): {
  turma: string;
  salaShort: string;
  isEmpty: boolean;
} {
  const parsed = parseStandardTurmaAndSala(String(rawTurma || 'x'));
  const turma = parsed.turma;
  const sala = String(rawSala || '').trim() || parsed.sala;
  if (!turma || turma.toLowerCase() === 'x') {
    return { turma: '', salaShort: '', isEmpty: true };
  }
  return {
    turma,
    salaShort: formatShortSala(sala),
    isEmpty: false,
  };
}

export function filterActiveScheduleSlots(grade: CronogramaSlot[]): {
  activeTurnos: string[];
  visibleSlots: CronogramaSlot[];
} {
  const safeGrade = Array.isArray(grade) ? grade : [];
  const activeTurnoSet = new Set<string>();

  for (const slot of safeGrade) {
    const dias = Array.isArray(slot?.dias) ? slot.dias : [];
    const hasAnyClass = dias.some((d) => {
      const clean = String(d || '').trim().toLowerCase();
      return clean !== '' && clean !== 'x';
    });
    if (hasAnyClass && slot.turno) {
      activeTurnoSet.add(slot.turno);
    }
  }

  const orderedTurnos = Array.from(activeTurnoSet);
  const visibleSlots = safeGrade.filter((slot) => activeTurnoSet.has(slot.turno));
  return { activeTurnos: orderedTurnos, visibleSlots };
}

export const DashboardScheduleCard: React.FC<DashboardScheduleCardProps> = ({
  teacher,
  onOpenCronograma,
}) => {
  const storageKey = `krono_cronograma_v1_${teacher?.id || 'default'}`;
  const [grade, setGrade] = useState<CronogramaSlot[]>(DEFAULT_CRONOGRAMA_GRADE);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const loadFromStorage = () => {
      try {
        const raw = localStorage.getItem(storageKey);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed?.grade) && parsed.grade.length > 0) {
          setGrade(parsed.grade);
        }
      } catch {}
    };

    loadFromStorage();

    fetch('/api/cronograma', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((res) => {
        if (res?.ok && res?.data && Array.isArray(res.data.grade) && res.data.grade.length > 0) {
          setGrade(res.data.grade);
          try {
            localStorage.setItem(storageKey, JSON.stringify(res.data));
          } catch {}
        }
      })
      .catch(() => {});

    const onUpdated = (ev: Event) => {
      const detail = (ev as CustomEvent)?.detail;
      if (Array.isArray(detail?.grade) && detail.grade.length > 0) {
        setGrade(detail.grade);
      } else {
        loadFromStorage();
      }
    };

    const onStorage = (ev: StorageEvent) => {
      if (ev.key === storageKey) loadFromStorage();
    };

    window.addEventListener('krono-cronograma-updated', onUpdated);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('krono-cronograma-updated', onUpdated);
      window.removeEventListener('storage', onStorage);
    };
  }, [storageKey]);

  const { activeTurnos, visibleSlots } = useMemo(() => filterActiveScheduleSlots(grade), [grade]);

  const todayIndex = useMemo(() => {
    const day = new Date().getDay();
    return day >= 1 && day <= 5 ? day - 1 : -1;
  }, []);

  const todayClassesCount = useMemo(() => {
    if (todayIndex < 0) return 0;
    return visibleSlots.reduce((acc, slot) => {
      const cell = normalizeScheduleCell(slot.dias?.[todayIndex], slot.salas?.[todayIndex]);
      return acc + (cell.isEmpty ? 0 : 1);
    }, 0);
  }, [visibleSlots, todayIndex]);

  return (
    <section
      aria-labelledby="heading-horario-geral"
      className="rounded-2xl border border-emerald-500/25 bg-surface shadow-sm overflow-hidden"
    >
      {/* Barra superior com identidade própria do Horário Geral */}
      <div className="px-5 py-3.5 border-b border-border bg-emerald-500/[0.06] flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
            <CalendarDays className="w-4 h-4" />
          </div>
          <h2 id="heading-horario-geral" className="text-base sm:text-lg font-black text-foreground tracking-tight">
            Horário Geral
          </h2>
          {activeTurnos.map((turno) => (
            <span
              key={turno}
              className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
            >
              {turno}
            </span>
          ))}
          {todayIndex >= 0 && (
            <span className="text-[11px] font-semibold text-text-muted flex items-center gap-1 ml-1">
              <Clock className="w-3 h-3 text-emerald-400" />
              Hoje ({WEEK_HEADERS[todayIndex]}): <strong className="text-foreground">{todayClassesCount} aula{todayClassesCount === 1 ? '' : 's'}</strong>
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={onOpenCronograma}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"
        >
          <span>Abrir Cronograma</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Tabela limpa sincronizada com os turnos ativos */}
      {visibleSlots.length === 0 ? (
        <div className="p-6 text-center space-y-2">
          <p className="text-sm text-text-muted">
            Nenhuma aula cadastrada na grade semanal ainda.
          </p>
          <button
            type="button"
            onClick={onOpenCronograma}
            className="px-3.5 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-bold cursor-pointer"
          >
            Configurar Horários e Turmas
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[560px]">
            <thead>
              <tr className="border-b border-border bg-background/50">
                <th className="py-2.5 px-4 text-[11px] font-extrabold uppercase tracking-wider text-text-muted w-36">
                  AULA
                </th>
                {WEEK_HEADERS.map((dayLabel, idx) => {
                  const isToday = idx === todayIndex;
                  return (
                    <th
                      key={dayLabel}
                      className={`py-2.5 px-3 text-[11px] font-extrabold uppercase tracking-wider ${
                        isToday
                          ? 'text-emerald-300 bg-emerald-500/10'
                          : 'text-text-muted'
                      }`}
                    >
                      <span className="inline-flex items-center gap-1.5">
                        {dayLabel}
                        {isToday && (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" title="Dia atual" />
                        )}
                      </span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {visibleSlots.map((slot, rowIdx) => {
                const prevTurno = rowIdx > 0 ? visibleSlots[rowIdx - 1].turno : slot.turno;
                const isNewTurno = rowIdx > 0 && prevTurno !== slot.turno;
                return (
                  <tr
                    key={slot.id}
                    className={`hover:bg-surface-hover/50 transition-colors ${
                      isNewTurno ? 'border-t-2 border-emerald-500/30' : ''
                    }`}
                  >
                    <td className="py-2.5 px-4 align-middle">
                      <div className="flex flex-col leading-tight">
                        <span className="text-[10px] font-semibold text-text-muted">
                          {slot.turno} • {slot.inicio}
                        </span>
                        <span className="text-xs sm:text-sm font-black text-foreground">
                          {slot.aula_label}
                        </span>
                      </div>
                    </td>
                    {[0, 1, 2, 3, 4].map((dayIdx) => {
                      const cell = normalizeScheduleCell(slot.dias?.[dayIdx], slot.salas?.[dayIdx]);
                      const isToday = dayIdx === todayIndex;
                      return (
                        <td
                          key={dayIdx}
                          className={`py-2.5 px-3 align-middle whitespace-nowrap ${
                            isToday ? 'bg-emerald-500/[0.06]' : ''
                          }`}
                        >
                          {cell.isEmpty ? (
                            <span className="text-xs text-text-muted/40 font-medium select-none">-</span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-xs sm:text-[13px] font-extrabold text-foreground tracking-tight">
                              {cell.salaShort && (
                                <span className="text-emerald-400 font-bold">{cell.salaShort}</span>
                              )}
                              <span>{cell.turma}</span>
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};
