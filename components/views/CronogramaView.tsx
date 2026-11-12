import { CronogramaTabHoje } from "@/components/views/cronograma/CronogramaTabHoje";
import { CronogramaTabHorario } from "@/components/views/cronograma/CronogramaTabHorario";
'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Calendar,
  Clock,
  Coffee,
  CheckCircle2,
  AlertTriangle,
  Pencil,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  StickyNote,
  Table,
  Save,
  RotateCcw,
  Check,
  MapPin,
  Sliders,
  Wand2,
} from 'lucide-react';
import { TeacherUser } from '@/lib/types';
import {
  parseStandardTurmaAndSala,
  isSameStudentTurma,
} from '@/lib/groupActivityUtils';

export interface CronogramaSlot {
  id: string;
  turno: 'Matutino' | 'Vespertino' | 'Noturno' | string;
  aula_label: string;
  inicio: string;
  fim: string;
  dias: [string, string, string, string, string]; // Turmas padronizadas: "201", "2002", ou "x"
  salas?: [string, string, string, string, string]; // Salas: "Sala 1", "Sala 20", etc.
}

export interface CronogramaIntervalConfig {
  id: string;
  turno: string;
  label: string; // Ex: "1º Recreio" ou "2º Recreio"
  afterAulaLabel: string; // Ex: "2ª", "3ª", "4ª"
  inicio: string;
  fim: string;
  ativo: boolean;
}

export interface CronogramaPlanItem {
  id: string;
  data: string; // YYYY-MM-DD
  inicio: string;
  turma: string;
  sala?: string;
  conteudo: string;
}

export interface CronogramaObsItem {
  id: string;
  turma_id: string;
  data_origem: string; // YYYY-MM-DD
  texto: string;
  consumida: boolean;
}

interface CronogramaViewProps {
  teacher: TeacherUser;
  isReadOnly?: boolean;
}

// Opções rápidas de Sala ("Sala 1" até "Sala 25" + ambientes especiais)
const SALA_OPTIONS: string[] = [
  '',
  ...Array.from({ length: 25 }, (_, i) => `Sala ${i + 1}`),
  'Lab. Informática',
  'Espaço Maker',
  'Biblioteca',
  'Auditório',
];

// Grade oficial padronizada ("201", "105", etc. + Salas "Sala 10", "Sala 20" separadas)
export const DEFAULT_CRONOGRAMA_GRADE: CronogramaSlot[] = [
  {
    id: 'mat-1',
    turno: 'Matutino',
    aula_label: '1ª',
    inicio: '07:30',
    fim: '08:15',
    dias: ['201', '103', '201', '101', 'x'],
    salas: ['Sala 10', 'Sala 14', 'Sala 10', 'Sala 19', ''],
  },
  {
    id: 'mat-2',
    turno: 'Matutino',
    aula_label: '2ª',
    inicio: '08:15',
    fim: '09:00',
    dias: ['105', '104', '204', '106', 'x'],
    salas: ['Sala 12', 'Sala 13', 'Sala 7', 'Sala 11', ''],
  },
  {
    id: 'mat-3',
    turno: 'Matutino',
    aula_label: '3ª',
    inicio: '09:00',
    fim: '09:45',
    dias: ['101', '302', '102', '106', 'x'],
    salas: ['Sala 19', 'Sala 6', 'Sala 20', 'Sala 11', ''],
  },
  {
    id: 'mat-4',
    turno: 'Matutino',
    aula_label: '4ª',
    inicio: '10:00',
    fim: '10:45',
    dias: ['301', '202', '103', '204', 'x'],
    salas: ['Sala 5', 'Sala 9', 'Sala 14', 'Sala 7', ''],
  },
  {
    id: 'mat-5',
    turno: 'Matutino',
    aula_label: '5ª',
    inicio: '10:45',
    fim: '11:30',
    dias: ['102', '203', '104', '202', 'x'],
    salas: ['Sala 20', 'Sala 8', 'Sala 13', 'Sala 9', ''],
  },
  {
    id: 'mat-6',
    turno: 'Matutino',
    aula_label: '6ª',
    inicio: '11:30',
    fim: '12:15',
    dias: ['x', '203', 'x', '105', 'x'],
    salas: ['', 'Sala 8', '', 'Sala 12', ''],
  },
  {
    id: 'vesp-1',
    turno: 'Vespertino',
    aula_label: '1ª',
    inicio: '13:30',
    fim: '14:15',
    dias: ['x', 'x', 'x', 'x', 'x'],
    salas: ['', '', '', '', ''],
  },
  {
    id: 'vesp-2',
    turno: 'Vespertino',
    aula_label: '2ª',
    inicio: '14:15',
    fim: '15:00',
    dias: ['x', 'x', 'x', 'x', 'x'],
    salas: ['', '', '', '', ''],
  },
  {
    id: 'vesp-3',
    turno: 'Vespertino',
    aula_label: '3ª',
    inicio: '15:00',
    fim: '15:45',
    dias: ['x', 'x', 'x', 'x', 'x'],
    salas: ['', '', '', '', ''],
  },
  {
    id: 'vesp-4',
    turno: 'Vespertino',
    aula_label: '4ª',
    inicio: '16:00',
    fim: '16:45',
    dias: ['x', 'x', 'x', 'x', 'x'],
    salas: ['', '', '', '', ''],
  },
  {
    id: 'vesp-5',
    turno: 'Vespertino',
    aula_label: '5ª',
    inicio: '16:45',
    fim: '17:30',
    dias: ['x', 'x', 'x', 'x', 'x'],
    salas: ['', '', '', '', ''],
  },
  {
    id: 'vesp-6',
    turno: 'Vespertino',
    aula_label: '6ª',
    inicio: '17:30',
    fim: '18:15',
    dias: ['x', 'x', 'x', 'x', 'x'],
    salas: ['', '', '', '', ''],
  },
];

// Configuração padrão de até 2 Recreios / Intervalos por turno
export const DEFAULT_CRONOGRAMA_INTERVALS: CronogramaIntervalConfig[] = [
  {
    id: 'int-mat-1',
    turno: 'Matutino',
    label: '1º Recreio / Intervalo (Matutino)',
    afterAulaLabel: '3ª',
    inicio: '09:45',
    fim: '10:00',
    ativo: true,
  },
  {
    id: 'int-mat-2',
    turno: 'Matutino',
    label: '2º Recreio / Intervalo (Matutino)',
    afterAulaLabel: '4ª',
    inicio: '10:45',
    fim: '11:00',
    ativo: false,
  },
  {
    id: 'int-vesp-1',
    turno: 'Vespertino',
    label: '1º Recreio / Intervalo (Vespertino)',
    afterAulaLabel: '3ª',
    inicio: '15:45',
    fim: '16:00',
    ativo: true,
  },
  {
    id: 'int-vesp-2',
    turno: 'Vespertino',
    label: '2º Recreio / Intervalo (Vespertino)',
    afterAulaLabel: '4ª',
    inicio: '16:45',
    fim: '17:00',
    ativo: false,
  },
];

const DIAS_SEMANA_LABELS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'];
const DIAS_SEMANA_CURTOS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex'];
const IGNORAR_VALORES = ['x', '-', 'intervalo', 'recreio', 'descanso', 'almoço', 'almoco', 'café', 'cafe', '', '#n/a'];

function toLocalYMD(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseYMD(ymd: string): Date {
  const clean = (ymd || '').substring(0, 10);
  const [y, m, d] = clean.split('-').map(Number);
  if (!y || !m || !d) return new Date();
  return new Date(y, m - 1, d, 12, 0, 0);
}

function formatDataBR(ymd: string): string {
  if (!ymd) return '';
  const [y, m, d] = ymd.substring(0, 10).split('-');
  if (!y || !m || !d) return ymd;
  return `${d}/${m}/${y}`;
}

function getMondayOfDate(d: Date): Date {
  const copy = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0);
  const day = copy.getDay();
  const diff = copy.getDate() - day + (day === 0 ? -6 : 1);
  copy.setDate(diff);
  return copy;
}

function getMinutesDiff(timeEnd: string, timeStart: string): number {
  if (!timeEnd || !timeStart || !timeEnd.includes(':') || !timeStart.includes(':')) return 0;
  const [h1, m1] = timeEnd.split(':').map(Number);
  const [h2, m2] = timeStart.split(':').map(Number);
  if (isNaN(h1) || isNaN(m1) || isNaN(h2) || isNaN(m2)) return 0;
  return h2 * 60 + m2 - (h1 * 60 + m1);
}

function addMinutesToTime(timeStr: string, minutesToAdd: number): string {
  const [h, m] = (timeStr || '07:30').split(':').map(Number);
  const total = (isNaN(h) ? 7 : h) * 60 + (isNaN(m) ? 30 : m) + minutesToAdd;
  const nh = Math.floor(total / 60) % 24;
  const nm = total % 60;
  return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`;
}

/**
 * Converte automaticamente qualquer slot antigo (ex: "S10 201") para o novo padrão
 * com turma ("201" ou "2002") e sala ("Sala 10") separadas.
 */
function migrateAndNormalizeSlots(rawSlots: any[]): CronogramaSlot[] {
  if (!Array.isArray(rawSlots) || rawSlots.length === 0) return DEFAULT_CRONOGRAMA_GRADE;

  return rawSlots.map((slot, idx) => {
    const rawDias = Array.isArray(slot.dias) ? slot.dias : ['x', 'x', 'x', 'x', 'x'];
    const rawSalas = Array.isArray(slot.salas) ? slot.salas : ['', '', '', '', ''];

    const nextDias: [string, string, string, string, string] = ['x', 'x', 'x', 'x', 'x'];
    const nextSalas: [string, string, string, string, string] = ['', '', '', '', ''];

    for (let i = 0; i < 5; i++) {
      const cellVal = String(rawDias[i] ?? 'x').trim();
      const existingSala = String(rawSalas[i] ?? '').trim();
      const parsed = parseStandardTurmaAndSala(cellVal);
      nextDias[i] = parsed.turma;
      nextSalas[i] = existingSala || parsed.sala;
    }

    return {
      id: slot.id || `slot-${idx + 1}`,
      turno: slot.turno || 'Matutino',
      aula_label: slot.aula_label || `${idx + 1}ª`,
      inicio: slot.inicio || '07:30',
      fim: slot.fim || '08:15',
      dias: nextDias,
      salas: nextSalas,
    };
  });
}

export const CronogramaView: React.FC<CronogramaViewProps> = ({ teacher, isReadOnly = false }) => {
  const storageKey = `krono_cronograma_v1_${teacher?.id || 'default'}`;

  const [activeSubTab, setActiveSubTab] = useState<'hoje' | 'horario'>('hoje');
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const now = new Date();
    if (now.getDay() === 6) now.setDate(now.getDate() + 2);
    if (now.getDay() === 0) now.setDate(now.getDate() + 1);
    return toLocalYMD(now);
  });

  const [grade, setGrade] = useState<CronogramaSlot[]>(DEFAULT_CRONOGRAMA_GRADE);
  const [intervals, setIntervals] = useState<CronogramaIntervalConfig[]>(DEFAULT_CRONOGRAMA_INTERVALS);
  const [planos, setPlanos] = useState<CronogramaPlanItem[]>([]);
  const [observacoes, setObservacoes] = useState<CronogramaObsItem[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [statusToast, setStatusToast] = useState<string | null>(null);

  // Assistente rápido para recalcular horários de um turno (ex: 45 min + recreios)
  const [autoShiftTarget, setAutoShiftTarget] = useState<string>('Matutino');
  const [autoShiftStart, setAutoShiftStart] = useState<string>('07:30');
  const [autoClassDuration, setAutoClassDuration] = useState<number>(45);

  // Modais de Planejamento e Observação
  const [editingPlanSlot, setEditingPlanSlot] = useState<{
    data: string;
    inicio: string;
    fim: string;
    aula_label: string;
    turno: string;
    turma_id: string;
    sala: string;
    conteudo: string;
    plan_id?: string;
  } | null>(null);

  const [editingObsModal, setEditingObsModal] = useState<{
    id: string | null;
    turma_id: string;
    data_origem: string;
    texto: string;
  } | null>(null);

  const showToast = useCallback((msg: string) => {
    setStatusToast(msg);
    setTimeout(() => {
      setStatusToast((curr) => (curr === msg ? null : curr));
    }, 3500);
  }, []);

  // Hidratação Local + Nuvem com migração automática para Turmas "201"/"2002" e Salas separadas
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const cached = localStorage.getItem(storageKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed.grade) && parsed.grade.length > 0) {
          setGrade(migrateAndNormalizeSlots(parsed.grade));
        }
        if (Array.isArray(parsed.intervals) && parsed.intervals.length > 0) {
          setIntervals(parsed.intervals);
        }
        if (Array.isArray(parsed.planos)) setPlanos(parsed.planos);
        if (Array.isArray(parsed.observacoes)) setObservacoes(parsed.observacoes);
      }
    } catch (e) {}

    fetch('/api/cronograma')
      .then((r) => (r.ok ? r.json() : null))
      .then((res) => {
        if (res?.ok && res?.data) {
          const d = res.data;
          const normalizedGrade =
            Array.isArray(d.grade) && d.grade.length > 0
              ? migrateAndNormalizeSlots(d.grade)
              : DEFAULT_CRONOGRAMA_GRADE;
          const loadedIntervals =
            Array.isArray(d.intervals) && d.intervals.length > 0
              ? d.intervals
              : DEFAULT_CRONOGRAMA_INTERVALS;

          setGrade(normalizedGrade);
          setIntervals(loadedIntervals);
          if (Array.isArray(d.planos)) setPlanos(d.planos);
          if (Array.isArray(d.observacoes)) setObservacoes(d.observacoes);

          localStorage.setItem(
            storageKey,
            JSON.stringify({
              grade: normalizedGrade,
              intervals: loadedIntervals,
              planos: d.planos || [],
              observacoes: d.observacoes || [],
            })
          );
        }
      })
      .catch(() => {});
  }, [storageKey]);

  const persistAll = useCallback(
    async (
      nextGrade: CronogramaSlot[],
      nextIntervals: CronogramaIntervalConfig[],
      nextPlanos: CronogramaPlanItem[],
      nextObs: CronogramaObsItem[],
      toastMessage?: string
    ) => {
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(
            storageKey,
            JSON.stringify({
              grade: nextGrade,
              intervals: nextIntervals,
              planos: nextPlanos,
              observacoes: nextObs,
            })
          );
        } catch (e) {}
      }

      if (toastMessage) showToast(toastMessage);

      setIsSyncing(true);
      try {
        await fetch('/api/cronograma', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            teacherId: teacher?.id,
            grade: nextGrade,
            intervals: nextIntervals,
            planos: nextPlanos,
            observacoes: nextObs,
          }),
        });
      } catch (e) {
        console.warn('Aviso ao sincronizar cronograma:', e);
      } finally {
        setIsSyncing(false);
      }
    },
    [storageKey, teacher?.id, showToast]
  );

  // Calcula os 5 dias úteis (Seg a Sex) da semana selecionada
  const weekDays = useMemo(() => {
    const dt = parseYMD(selectedDate);
    const monday = getMondayOfDate(dt);
    return [0, 1, 2, 3, 4].map((offset) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + offset);
      const ymd = toLocalYMD(d);
      return {
        offset,
        shortLabel: DIAS_SEMANA_CURTOS[offset],
        fullLabel: DIAS_SEMANA_LABELS[offset],
        ymd,
        dayMonth: `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`,
      };
    });
  }, [selectedDate]);

  const selectedDateObj = useMemo(() => parseYMD(selectedDate), [selectedDate]);
  const dayOfWeekIndex = useMemo(() => {
    const day = selectedDateObj.getDay();
    if (day >= 1 && day <= 5) return day - 1;
    return -1;
  }, [selectedDateObj]);

  // Verifica intervalos ativos após uma determinada aula ou por diferença de início/fim
  const getIntervalsBeforeSlot = useCallback(
    (slotIndex: number): Array<{ label: string; inicio: string; fim: string; minutes: number }> => {
      if (slotIndex <= 0) return [];
      const currSlot = grade[slotIndex];
      const prevSlot = grade[slotIndex - 1];
      if (!currSlot || !prevSlot || currSlot.turno !== prevSlot.turno) return [];

      const matchedExplicit = intervals.filter(
        (intItem) =>
          intItem.ativo &&
          intItem.turno.trim().toLowerCase() === currSlot.turno.trim().toLowerCase() &&
          intItem.afterAulaLabel.trim().toLowerCase() === prevSlot.aula_label.trim().toLowerCase()
      );

      if (matchedExplicit.length > 0) {
        return matchedExplicit.map((m) => ({
          label: m.label,
          inicio: m.inicio,
          fim: m.fim,
          minutes: Math.max(5, getMinutesDiff(m.inicio, m.fim) || 15),
        }));
      }

      const diff = getMinutesDiff(prevSlot.fim, currSlot.inicio);
      if (diff > 0 && diff <= 45) {
        return [
          {
            label: 'Intervalo / Recreio',
            inicio: prevSlot.fim,
            fim: currSlot.inicio,
            minutes: diff,
          },
        ];
      }

      return [];
    },
    [grade, intervals]
  );

  // Monta as aulas do dia selecionado com Turma padronizada ("201"/"2002"), Sala ("Sala 10") e Recreios
  const aulasDoDia = useMemo(() => {
    if (dayOfWeekIndex < 0 || dayOfWeekIndex > 4) return [];

    const result: Array<{
      slotId: string;
      data: string;
      turno: string;
      aula_label: string;
      inicio: string;
      fim: string;
      turmaCode: string;
      sala: string;
      conteudo: string;
      plan_id: string;
      obsPendentes: CronogramaObsItem[];
      obsFeitasHoje: CronogramaObsItem[];
      breaksBefore: Array<{ label: string; inicio: string; fim: string; minutes: number }>;
    }> = [];

    for (let i = 0; i < grade.length; i++) {
      const slot = grade[i];
      const rawTurmaCell = String(slot.dias[dayOfWeekIndex] || '').trim();
      const rawSalaCell = String(slot.salas?.[dayOfWeekIndex] || '').trim();

      const breaksBefore = getIntervalsBeforeSlot(i);

      if (IGNORAR_VALORES.includes(rawTurmaCell.toLowerCase())) {
        continue;
      }

      const parsed = parseStandardTurmaAndSala(rawTurmaCell);
      const turmaCode = parsed.turma === 'x' ? rawTurmaCell : parsed.turma;
      const sala = rawSalaCell || parsed.sala;

      const exactPlan =
        planos.find(
          (p) =>
            p.data === selectedDate &&
            p.inicio === slot.inicio &&
            isSameStudentTurma(p.turma, turmaCode)
        ) ||
        planos.find((p) => p.data === selectedDate && isSameStudentTurma(p.turma, turmaCode));

      const obsPendentes = observacoes
        .filter(
          (o) =>
            isSameStudentTurma(o.turma_id, turmaCode) &&
            o.data_origem < selectedDate &&
            !o.consumida
        )
        .sort((a, b) => b.data_origem.localeCompare(a.data_origem));

      const obsFeitasHoje = observacoes.filter(
        (o) => isSameStudentTurma(o.turma_id, turmaCode) && o.data_origem === selectedDate
      );

      result.push({
        slotId: slot.id,
        data: selectedDate,
        turno: slot.turno,
        aula_label: slot.aula_label,
        inicio: slot.inicio,
        fim: slot.fim,
        turmaCode,
        sala,
        conteudo: exactPlan?.conteudo || '',
        plan_id: exactPlan?.id || '',
        obsPendentes,
        obsFeitasHoje,
        breaksBefore,
      });
    }

    return result;
  }, [grade, dayOfWeekIndex, planos, observacoes, selectedDate, getIntervalsBeforeSlot]);

  const handleStepDay = (delta: number) => {
    const dt = parseYMD(selectedDate);
    dt.setDate(dt.getDate() + delta);
    if (dt.getDay() === 6) dt.setDate(dt.getDate() + (delta > 0 ? 2 : -1));
    if (dt.getDay() === 0) dt.setDate(dt.getDate() + (delta > 0 ? 1 : -2));
    setSelectedDate(toLocalYMD(dt));
  };

  // Salvar Planejamento do Dia
  const handleSavePlan = async () => {
    if (!editingPlanSlot) return;
    const { data, inicio, turma_id, sala, conteudo, plan_id } = editingPlanSlot;
    const newId = plan_id || `PLAN-${Date.now()}`;

    const existingIdx = planos.findIndex(
      (p) =>
        (plan_id && p.id === plan_id) ||
        (p.data === data && p.inicio === inicio && isSameStudentTurma(p.turma, turma_id))
    );

    let nextPlanos: CronogramaPlanItem[];
    if (existingIdx >= 0) {
      nextPlanos = planos.map((item, idx) =>
        idx === existingIdx ? { ...item, conteudo, inicio, turma: turma_id, sala } : item
      );
    } else {
      nextPlanos = [...planos, { id: newId, data, inicio, turma: turma_id, sala, conteudo }];
    }

    setPlanos(nextPlanos);
    setEditingPlanSlot(null);
    await persistAll(
      grade,
      intervals,
      nextPlanos,
      observacoes,
      `Planejamento da Turma ${turma_id} salvo!`
    );
  };

  // Salvar Observação Pós-Aula (Lembrete Automático para a Próxima Aula)
  const handleSaveObs = async () => {
    if (!editingObsModal || !editingObsModal.texto.trim()) return;
    const { id, turma_id, data_origem, texto } = editingObsModal;

    let nextObs: CronogramaObsItem[];
    if (id) {
      nextObs = observacoes.map((o) => (o.id === id ? { ...o, texto: texto.trim() } : o));
    } else {
      const newObs: CronogramaObsItem = {
        id: `OBS-${Date.now()}`,
        turma_id,
        data_origem,
        texto: texto.trim(),
        consumida: false,
      };
      nextObs = [...observacoes, newObs];
    }

    setObservacoes(nextObs);
    setEditingObsModal(null);
    await persistAll(
      grade,
      intervals,
      planos,
      nextObs,
      `Observação salva! Ela aparecerá automaticamente na próxima aula da Turma ${turma_id}.`
    );
  };

  const handleConsumeObs = async (obsId: string) => {
    const nextObs = observacoes.map((o) => (o.id === obsId ? { ...o, consumida: true } : o));
    setObservacoes(nextObs);
    await persistAll(
      grade,
      intervals,
      planos,
      nextObs,
      'Lembrete da aula anterior marcado como concluído!'
    );
  };

  const handleDeleteObs = async (obsId: string) => {
    const nextObs = observacoes.filter((o) => o.id !== obsId);
    setObservacoes(nextObs);
    await persistAll(grade, intervals, planos, nextObs, 'Observação removida.');
  };

  // Edição de Turma ("201", "2002") e Sala ("Sala 1" .. "Sala 25") na Grade
  const handleUpdateGradeTurma = (slotIndex: number, dayIdx: number, rawValue: string) => {
    setGrade((prev) =>
      prev.map((slot, i) => {
        if (i !== slotIndex) return slot;
        const nextDias: [string, string, string, string, string] = [...slot.dias] as any;
        const nextSalas: [string, string, string, string, string] = [
          ...(slot.salas || ['', '', '', '', '']),
        ] as any;

        // Se o professor digitar "S10 201", separa automaticamente Sala 10 e Turma 201
        if (/^[sS]\d+\s+/.test(rawValue.trim())) {
          const parsed = parseStandardTurmaAndSala(rawValue);
          nextDias[dayIdx] = parsed.turma;
          if (parsed.sala) nextSalas[dayIdx] = parsed.sala;
        } else {
          nextDias[dayIdx] = rawValue;
          if (IGNORAR_VALORES.includes(rawValue.trim().toLowerCase())) {
            nextSalas[dayIdx] = '';
          }
        }

        return { ...slot, dias: nextDias, salas: nextSalas };
      })
    );
  };

  const handleUpdateGradeSala = (slotIndex: number, dayIdx: number, salaValue: string) => {
    setGrade((prev) =>
      prev.map((slot, i) => {
        if (i !== slotIndex) return slot;
        const nextSalas: [string, string, string, string, string] = [
          ...(slot.salas || ['', '', '', '', '']),
        ] as any;
        nextSalas[dayIdx] = salaValue;
        return { ...slot, salas: nextSalas };
      })
    );
  };

  const handleUpdateGradeMeta = (
    slotIndex: number,
    field: 'turno' | 'aula_label' | 'inicio' | 'fim',
    value: string
  ) => {
    setGrade((prev) =>
      prev.map((slot, i) => (i === slotIndex ? { ...slot, [field]: value } : slot))
    );
  };

  const handleAddClassSlot = (targetTurno: string) => {
    const turnoSlots = grade.filter((s) => s.turno === targetTurno);
    const nextNumber = turnoSlots.length + 1;
    const lastSlot = turnoSlots[turnoSlots.length - 1];
    const start = lastSlot ? lastSlot.fim : targetTurno === 'Matutino' ? '07:30' : '13:30';
    const end = addMinutesToTime(start, 45);

    const newSlot: CronogramaSlot = {
      id: `${targetTurno.toLowerCase().slice(0, 3)}-${Date.now()}`,
      turno: targetTurno,
      aula_label: `${nextNumber}ª`,
      inicio: start,
      fim: end,
      dias: ['x', 'x', 'x', 'x', 'x'],
      salas: ['', '', '', '', ''],
    };

    setGrade((prev) => [...prev, newSlot]);
  };

  const handleRemoveClassSlot = (slotId: string) => {
    if (grade.length <= 1) return;
    setGrade((prev) => prev.filter((s) => s.id !== slotId));
  };

  // Recalcular automaticamente os horários de um turno respeitando a duração da aula e os recreios ativos
  const handleAutoRecalculateShiftTimes = () => {
    let cursor = autoShiftStart || '07:30';
    const duration = Math.max(15, Math.min(120, autoClassDuration || 45));

    const nextGrade = grade.map((slot) => {
      if (slot.turno.trim().toLowerCase() !== autoShiftTarget.trim().toLowerCase()) {
        return slot;
      }
      const start = cursor;
      const end = addMinutesToTime(start, duration);
      cursor = end;

      // Verifica se há recreio ativo configurado após esta aula
      const activeBreaksAfter = intervals.filter(
        (intItem) =>
          intItem.ativo &&
          intItem.turno.trim().toLowerCase() === slot.turno.trim().toLowerCase() &&
          intItem.afterAulaLabel.trim().toLowerCase() === slot.aula_label.trim().toLowerCase()
      );

      activeBreaksAfter.forEach((brk) => {
        const brkMinutes = Math.max(5, getMinutesDiff(brk.inicio, brk.fim) || 15);
        cursor = addMinutesToTime(cursor, brkMinutes);
      });

      return {
        ...slot,
        inicio: start,
        fim: end,
      };
    });

    setGrade(nextGrade);
    showToast(`Horários do turno ${autoShiftTarget} recalculados (${duration} min por aula + intervalos ativos)!`);
  };

  // Gerenciamento de Intervalos / Recreios (Até 2 recreios ou mais por turno)
  const handleUpdateInterval = (
    id: string,
    field: keyof CronogramaIntervalConfig,
    value: any
  ) => {
    setIntervals((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleAddCustomInterval = () => {
    const newInt: CronogramaIntervalConfig = {
      id: `int-${Date.now()}`,
      turno: 'Matutino',
      label: `Recreio Extra`,
      afterAulaLabel: '2ª',
      inicio: '09:00',
      fim: '09:15',
      ativo: true,
    };
    setIntervals((prev) => [...prev, newInt]);
  };

  const handleRemoveInterval = (id: string) => {
    setIntervals((prev) => prev.filter((item) => item.id !== id));
  };

  const handleSaveGradeAndIntervals = async () => {
    const normalized = migrateAndNormalizeSlots(grade);
    setGrade(normalized);
    await persistAll(
      normalized,
      intervals,
      planos,
      observacoes,
      'Horários, recreios, turmas padronizadas e salas salvos com sucesso!'
    );
  };

  const handleRestoreDefaultGrade = async () => {
    if (
      !window.confirm(
        'Restaurar a grade e intervalos padrão? Seus planejamentos e observações serão mantidos.'
      )
    ) {
      return;
    }
    setGrade(DEFAULT_CRONOGRAMA_GRADE);
    setIntervals(DEFAULT_CRONOGRAMA_INTERVALS);
    await persistAll(
      DEFAULT_CRONOGRAMA_GRADE,
      DEFAULT_CRONOGRAMA_INTERVALS,
      planos,
      observacoes,
      'Grade e intervalos padrão restaurados!'
    );
  };

  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
      {/* Cabeçalho Linear / Apple Style */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-zinc-800/80">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-emerald-400">
              <Calendar className="w-4 h-4" />
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400">
              Rotina Docente • Turmas Padronizadas (&ldquo;201&rdquo; / &ldquo;2002&rdquo;) & Salas
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
            Cronograma & Planejamento de Aulas
          </h1>
          <p className="text-xs sm:text-sm text-muted mt-1">
            Configure início/fim das aulas, até 2 recreios por turno, turmas e salas. Suas observações reaparecem automaticamente na próxima aula da turma.
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-zinc-900/90 rounded-xl border border-zinc-800 self-start md:self-auto">
          <button
            type="button"
            onClick={() => setActiveSubTab('hoje')}
            className={`px-4 py-2 rounded-lg font-semibold text-xs transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'hoje'
                ? 'bg-zinc-100 text-zinc-950 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-100'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Aulas do Dia</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('horario')}
            className={`px-4 py-2 rounded-lg font-semibold text-xs transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'horario'
                ? 'bg-zinc-100 text-zinc-950 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-100'
            }`}
          >
            <Table className="w-3.5 h-3.5" />
            <span>Horários, Recreios, Turmas & Salas</span>
          </button>
        </div>
      </div>

      {statusToast && (
        <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-500/30 text-emerald-200 text-xs font-medium flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{statusToast}</span>
          </div>
          {isSyncing && <span className="text-[10px] font-mono text-emerald-400">Sincronizando...</span>}
        </div>
      )}

      <CronogramaTabHoje {...{ DIAS_SEMANA_LABELS, IGNORAR_VALORES, activeSubTab, aulasDoDia, dayOfWeekIndex, formatDataBR, grade, handleConsumeObs, handleDeleteObs, handleStepDay, isReadOnly, selectedDate, setEditingObsModal, setEditingPlanSlot, setSelectedDate, toLocalYMD, weekDays }} />
      <CronogramaTabHorario {...{ IGNORAR_VALORES, SALA_OPTIONS, activeSubTab, autoClassDuration, autoShiftStart, autoShiftTarget, editingObsModal, editingPlanSlot, formatDataBR, getIntervalsBeforeSlot, grade, handleAddClassSlot, handleAddCustomInterval, handleAutoRecalculateShiftTimes, handleRemoveClassSlot, handleRemoveInterval, handleRestoreDefaultGrade, handleSaveGradeAndIntervals, handleSaveObs, handleSavePlan, handleUpdateGradeMeta, handleUpdateGradeSala, handleUpdateGradeTurma, handleUpdateInterval, intervals, isReadOnly, setAutoClassDuration, setAutoShiftStart, setAutoShiftTarget, setEditingObsModal, setEditingPlanSlot }} />
    </div>
  );
};
