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
} from 'lucide-react';
import { TeacherUser } from '@/lib/types';

export interface CronogramaSlot {
  id: string;
  turno: 'Matutino' | 'Vespertino' | 'Noturno' | string;
  aula_label: string;
  inicio: string;
  fim: string;
  dias: [string, string, string, string, string]; // Seg, Ter, Qua, Qui, Sex
}

export interface CronogramaPlanItem {
  id: string;
  data: string; // YYYY-MM-DD
  inicio: string;
  turma: string;
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

// Grade inicial fiel à planilha Base_de_Dados do Prof. Gilson Flores
export const DEFAULT_CRONOGRAMA_GRADE: CronogramaSlot[] = [
  { id: 'mat-1', turno: 'Matutino', aula_label: '1ª', inicio: '07:30', fim: '08:15', dias: ['S10 201', 'S14 103', 'S10 201', 'S19 101', 'x'] },
  { id: 'mat-2', turno: 'Matutino', aula_label: '2ª', inicio: '08:15', fim: '09:00', dias: ['S12 105', 'S13 104', 'S7 204', 'S11 106', 'x'] },
  { id: 'mat-3', turno: 'Matutino', aula_label: '3ª', inicio: '09:00', fim: '09:45', dias: ['S19 101', 'S6 302', 'S20 102', 'S11 106', 'x'] },
  { id: 'mat-4', turno: 'Matutino', aula_label: '4ª', inicio: '10:00', fim: '10:45', dias: ['S5 301', 'S9 202', 'S14 103', 'S7 204', 'x'] },
  { id: 'mat-5', turno: 'Matutino', aula_label: '5ª', inicio: '10:45', fim: '11:30', dias: ['S20 102', 'S8 203', 'S13 104', 'S9 202', 'x'] },
  { id: 'mat-6', turno: 'Matutino', aula_label: '6ª', inicio: '11:30', fim: '12:15', dias: ['x', 'S8 203', 'x', 'S12 105', 'x'] },
  { id: 'vesp-1', turno: 'Vespertino', aula_label: '1ª', inicio: '13:30', fim: '14:15', dias: ['x', 'x', 'x', 'x', 'x'] },
  { id: 'vesp-2', turno: 'Vespertino', aula_label: '2ª', inicio: '14:15', fim: '15:00', dias: ['x', 'x', 'x', 'x', 'x'] },
  { id: 'vesp-3', turno: 'Vespertino', aula_label: '3ª', inicio: '15:00', fim: '15:45', dias: ['x', 'x', 'x', 'x', 'x'] },
  { id: 'vesp-4', turno: 'Vespertino', aula_label: '4ª', inicio: '16:00', fim: '16:45', dias: ['x', 'x', 'x', 'x', 'x'] },
  { id: 'vesp-5', turno: 'Vespertino', aula_label: '5ª', inicio: '16:45', fim: '17:30', dias: ['x', 'x', 'x', 'x', 'x'] },
  { id: 'vesp-6', turno: 'Vespertino', aula_label: '6ª', inicio: '17:30', fim: '18:15', dias: ['x', 'x', 'x', 'x', 'x'] },
];

const DIAS_SEMANA_LABELS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'];
const DIAS_SEMANA_CURTOS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex'];
const IGNORAR_VALORES = ['x', '-', 'intervalo', 'descanso', 'almoço', 'almoco', 'café', 'cafe', '', '#n/a'];

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

/**
 * Extrai Sala e Turma de um código como "S10 201" -> { sala: "S10", turma: "201", canonical: "S10 201" }
 * Assim, mesmo que o professor escreva "S10 201" ou apenas "201", o sistema reconhece a mesma turma.
 */
function parseSalaETurma(raw: string): { raw: string; sala: string | null; turmaCode: string } {
  const trimmed = (raw || '').trim();
  const parts = trimmed.split(/\s+/);
  if (parts.length >= 2 && /^s\d+/i.test(parts[0])) {
    return {
      raw: trimmed,
      sala: parts[0].toUpperCase(),
      turmaCode: parts.slice(1).join(' '),
    };
  }
  return {
    raw: trimmed,
    sala: null,
    turmaCode: trimmed,
  };
}

function isSameTurma(a: string, b: string): boolean {
  const cleanA = (a || '').trim().toLowerCase();
  const cleanB = (b || '').trim().toLowerCase();
  if (!cleanA || !cleanB) return false;
  if (cleanA === cleanB) return true;
  const parsedA = parseSalaETurma(a);
  const parsedB = parseSalaETurma(b);
  return parsedA.turmaCode.toLowerCase() === parsedB.turmaCode.toLowerCase();
}

export const CronogramaView: React.FC<CronogramaViewProps> = ({ teacher, isReadOnly = false }) => {
  const storageKey = `krono_cronograma_v1_${teacher?.id || 'default'}`;

  const [activeSubTab, setActiveSubTab] = useState<'hoje' | 'horario'>('hoje');
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const now = new Date();
    // Se cair no sábado (6) ou domingo (0), avança para a próxima segunda-feira para já mostrar aulas
    if (now.getDay() === 6) now.setDate(now.getDate() + 2);
    if (now.getDay() === 0) now.setDate(now.getDate() + 1);
    return toLocalYMD(now);
  });

  const [grade, setGrade] = useState<CronogramaSlot[]>(DEFAULT_CRONOGRAMA_GRADE);
  const [planos, setPlanos] = useState<CronogramaPlanItem[]>([]);
  const [observacoes, setObservacoes] = useState<CronogramaObsItem[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [statusToast, setStatusToast] = useState<string | null>(null);

  // Estados de Edição Inline / Modal para Planejamento e Observação
  const [editingPlanSlot, setEditingPlanSlot] = useState<{
    data: string;
    inicio: string;
    fim: string;
    aula_label: string;
    turno: string;
    turma_id: string;
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

  // Hidratação local + Nuvem (Firestore)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const cached = localStorage.getItem(storageKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed.grade) && parsed.grade.length > 0) setGrade(parsed.grade);
        if (Array.isArray(parsed.planos)) setPlanos(parsed.planos);
        if (Array.isArray(parsed.observacoes)) setObservacoes(parsed.observacoes);
      }
    } catch (e) {}

    fetch('/api/cronograma')
      .then((r) => (r.ok ? r.json() : null))
      .then((res) => {
        if (res?.ok && res?.data) {
          const d = res.data;
          if (Array.isArray(d.grade) && d.grade.length > 0) setGrade(d.grade);
          if (Array.isArray(d.planos)) setPlanos(d.planos);
          if (Array.isArray(d.observacoes)) setObservacoes(d.observacoes);
          localStorage.setItem(
            storageKey,
            JSON.stringify({
              grade: Array.isArray(d.grade) && d.grade.length > 0 ? d.grade : DEFAULT_CRONOGRAMA_GRADE,
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
            planos: nextPlanos,
            observacoes: nextObs,
          }),
        });
      } catch (e) {
        console.warn('Aviso ao sincronizar cronograma na nuvem:', e);
      } finally {
        setIsSyncing(false);
      }
    },
    [storageKey, teacher?.id, showToast]
  );

  // Calcula os 5 dias úteis (Seg a Sex) da semana da data selecionada
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
    const day = selectedDateObj.getDay(); // 0=Dom, 1=Seg ... 5=Sex, 6=Sab
    if (day >= 1 && day <= 5) return day - 1;
    return -1; // Fim de semana
  }, [selectedDateObj]);

  // Monta as aulas do dia selecionado + detecta intervalos de 15 min + anexa planejamento e observações
  const aulasDoDia = useMemo(() => {
    if (dayOfWeekIndex < 0 || dayOfWeekIndex > 4) return [];

    const result: Array<{
      slotId: string;
      data: string;
      turno: string;
      aula_label: string;
      inicio: string;
      fim: string;
      turma_id: string;
      sala: string | null;
      turmaCode: string;
      conteudo: string;
      plan_id: string;
      obsPendentes: CronogramaObsItem[];
      obsFeitasHoje: CronogramaObsItem[];
      intervalBeforeMinutes: number;
      intervalStart: string;
      intervalEnd: string;
    }> = [];

    for (let i = 0; i < grade.length; i++) {
      const slot = grade[i];
      const rawCell = String(slot.dias[dayOfWeekIndex] || '').trim();

      // Verifica se houve intervalo de 15 min entre o slot anterior (do mesmo turno) e este
      let intervalBeforeMinutes = 0;
      let intervalStart = '';
      let intervalEnd = '';
      if (i > 0 && grade[i - 1].turno === slot.turno) {
        const diff = getMinutesDiff(grade[i - 1].fim, slot.inicio);
        if (diff > 0 && diff <= 40) {
          intervalBeforeMinutes = diff;
          intervalStart = grade[i - 1].fim;
          intervalEnd = slot.inicio;
        }
      }

      if (IGNORAR_VALORES.includes(rawCell.toLowerCase())) {
        continue;
      }

      const { sala, turmaCode } = parseSalaETurma(rawCell);

      // Busca planejamento salvo para esta data + turma (priorizando mesmo horário de início, ou da mesma turma no dia)
      const exactPlan =
        planos.find(
          (p) =>
            p.data === selectedDate &&
            p.inicio === slot.inicio &&
            isSameTurma(p.turma, rawCell)
        ) ||
        planos.find((p) => p.data === selectedDate && isSameTurma(p.turma, rawCell));

      // Observações pendentes (feitas em aulas ANTERIORES desta mesma turma e ainda não lidas/consumidas)
      const obsPendentes = observacoes
        .filter(
          (o) =>
            isSameTurma(o.turma_id, rawCell) &&
            o.data_origem < selectedDate &&
            !o.consumida
        )
        .sort((a, b) => b.data_origem.localeCompare(a.data_origem));

      // Observações registradas HOJE para esta turma
      const obsFeitasHoje = observacoes.filter(
        (o) => isSameTurma(o.turma_id, rawCell) && o.data_origem === selectedDate
      );

      result.push({
        slotId: slot.id,
        data: selectedDate,
        turno: slot.turno,
        aula_label: slot.aula_label,
        inicio: slot.inicio,
        fim: slot.fim,
        turma_id: rawCell,
        sala,
        turmaCode,
        conteudo: exactPlan?.conteudo || '',
        plan_id: exactPlan?.id || '',
        obsPendentes,
        obsFeitasHoje,
        intervalBeforeMinutes,
        intervalStart,
        intervalEnd,
      });
    }

    return result;
  }, [grade, dayOfWeekIndex, planos, observacoes, selectedDate]);

  // Navegação de data (pula fim de semana automaticamente nos botões Anterior/Próximo)
  const handleStepDay = (delta: number) => {
    const dt = parseYMD(selectedDate);
    dt.setDate(dt.getDate() + delta);
    if (dt.getDay() === 6) dt.setDate(dt.getDate() + (delta > 0 ? 2 : -1));
    if (dt.getDay() === 0) dt.setDate(dt.getDate() + (delta > 0 ? 1 : -2));
    setSelectedDate(toLocalYMD(dt));
  };

  // Salvar Planejamento da Aula
  const handleSavePlan = async () => {
    if (!editingPlanSlot) return;
    const { data, inicio, turma_id, conteudo, plan_id } = editingPlanSlot;
    const newId = plan_id || `PLAN-${Date.now()}`;

    const existingIdx = planos.findIndex(
      (p) =>
        (plan_id && p.id === plan_id) ||
        (p.data === data && p.inicio === inicio && isSameTurma(p.turma, turma_id))
    );

    let nextPlanos: CronogramaPlanItem[];
    if (existingIdx >= 0) {
      nextPlanos = planos.map((item, idx) =>
        idx === existingIdx ? { ...item, conteudo, inicio, turma: turma_id } : item
      );
    } else {
      nextPlanos = [...planos, { id: newId, data, inicio, turma: turma_id, conteudo }];
    }

    setPlanos(nextPlanos);
    setEditingPlanSlot(null);
    await persistAll(grade, nextPlanos, observacoes, `Planejamento de ${turma_id} salvo!`);
  };

  // Salvar Observação (Lembrete para a Próxima Aula)
  const handleSaveObs = async () => {
    if (!editingObsModal || !editingObsModal.texto.trim()) return;
    const { id, turma_id, data_origem, texto } = editingObsModal;

    let nextObs: CronogramaObsItem[];
    if (id) {
      nextObs = observacoes.map((o) =>
        o.id === id ? { ...o, texto: texto.trim() } : o
      );
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
      planos,
      nextObs,
      'Observação registrada! Ela aparecerá automaticamente na próxima aula desta turma.'
    );
  };

  // Marcar Observação Anterior como Lida / Consumida
  const handleConsumeObs = async (obsId: string) => {
    const nextObs = observacoes.map((o) =>
      o.id === obsId ? { ...o, consumida: true } : o
    );
    setObservacoes(nextObs);
    await persistAll(grade, planos, nextObs, 'Lembrete da aula anterior marcado como concluído!');
  };

  const handleDeleteObs = async (obsId: string) => {
    const nextObs = observacoes.filter((o) => o.id !== obsId);
    setObservacoes(nextObs);
    await persistAll(grade, planos, nextObs, 'Observação removida.');
  };

  // Edição da Grade Fixa de Horários
  const handleUpdateGradeCell = (slotIndex: number, dayIdx: number, value: string) => {
    setGrade((prev) =>
      prev.map((slot, i) => {
        if (i !== slotIndex) return slot;
        const nextDias: [string, string, string, string, string] = [...slot.dias] as any;
        nextDias[dayIdx] = value;
        return { ...slot, dias: nextDias };
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

  const handleSaveGradeChanges = async () => {
    await persistAll(grade, planos, observacoes, 'Grade de horários e mapeamento de salas salvos!');
  };

  const handleRestoreDefaultGrade = async () => {
    if (!window.confirm('Restaurar a grade padrão (Matutino e Vespertino)? Seus planejamentos e observações serão mantidos.')) {
      return;
    }
    setGrade(DEFAULT_CRONOGRAMA_GRADE);
    await persistAll(DEFAULT_CRONOGRAMA_GRADE, planos, observacoes, 'Grade padrão restaurada!');
  };

  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
      {/* Cabeçalho Principal */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-border">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <Calendar className="w-5 h-5" />
            </span>
            <span className="text-xs font-black uppercase tracking-wider text-emerald-400">
              Gestão de Rotina Docente • Mapeamento de Salas & Aulas de 45 min
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
            Cronograma & Planejamento de Aulas
          </h1>
          <p className="text-xs sm:text-sm text-muted mt-1">
            Planeje o roteiro do dia e registre onde parou: suas observações reaparecem automaticamente na próxima aula daquela turma.
          </p>
        </div>

        {/* Seletor das 2 Abas: Aulas do Dia vs Grade de Horário e Salas */}
        <div className="flex items-center gap-1.5 p-1.5 bg-surface rounded-2xl border border-border self-start md:self-auto">
          <button
            type="button"
            onClick={() => setActiveSubTab('hoje')}
            className={`px-4 py-2.5 rounded-xl font-black text-xs transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'hoje'
                ? 'bg-emerald-500 text-slate-950 shadow-md'
                : 'text-muted hover:text-foreground'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Aulas do Dia</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('horario')}
            className={`px-4 py-2.5 rounded-xl font-black text-xs transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'horario'
                ? 'bg-emerald-500 text-slate-950 shadow-md'
                : 'text-muted hover:text-foreground'
            }`}
          >
            <Table className="w-4 h-4" />
            <span>Horário & Mapeamento de Salas</span>
          </button>
        </div>
      </div>

      {statusToast && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-400/40 text-emerald-300 text-xs font-bold flex items-center justify-between shadow-lg animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{statusToast}</span>
          </div>
          {isSyncing && <span className="text-[10px] font-mono text-emerald-300/80">Sincronizando nuvem...</span>}
        </div>
      )}

      {/* =====================================================================
          ABA 1: AULAS DO DIA (PLANEJAMENTO & OBSERVAÇÃO / LEMBRETE DA ÚLTIMA AULA)
         ===================================================================== */}
      {activeSubTab === 'hoje' && (
        <div className="space-y-5">
          {/* Barra de Navegação Semanal e Seletor de Data */}
          <div className="glass-panel p-4 rounded-3xl border border-border bg-surface shadow-md space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleStepDay(-1)}
                  className="p-2.5 rounded-xl bg-background hover:bg-surface-hover border border-border text-foreground cursor-pointer"
                  title="Dia útil anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
                  className="bg-background border border-emerald-500/40 rounded-xl px-4 py-2 text-xs sm:text-sm font-black text-foreground focus:outline-none focus:border-emerald-400"
                />
                <button
                  type="button"
                  onClick={() => handleStepDay(1)}
                  className="p-2.5 rounded-xl bg-background hover:bg-surface-hover border border-border text-foreground cursor-pointer"
                  title="Próximo dia útil"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedDate(toLocalYMD(new Date()))}
                  className="px-3 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-black cursor-pointer"
                >
                  Hoje
                </button>
              </div>

              <div className="text-xs font-bold text-muted">
                {dayOfWeekIndex >= 0 ? (
                  <span>
                    📅 <strong className="text-foreground">{DIAS_SEMANA_LABELS[dayOfWeekIndex]}-feira</strong> ({formatDataBR(selectedDate)}) •{' '}
                    <strong className="text-emerald-400">{aulasDoDia.length} aula(s) mapeada(s)</strong>
                  </span>
                ) : (
                  <span className="text-amber-400">Fim de semana selecionado — escolha um dia de Segunda a Sexta abaixo</span>
                )}
              </div>
            </div>

            {/* Pílulas rápidas Segunda a Sexta da semana selecionada */}
            <div className="grid grid-cols-5 gap-2 pt-1">
              {weekDays.map((wd) => {
                const isSelected = wd.ymd === selectedDate;
                const classesCount = grade.filter(
                  (s) => !IGNORAR_VALORES.includes(String(s.dias[wd.offset] || '').trim().toLowerCase())
                ).length;

                return (
                  <button
                    key={wd.ymd}
                    type="button"
                    onClick={() => setSelectedDate(wd.ymd)}
                    className={`p-2.5 rounded-2xl border text-center transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-500/20 border-emerald-400 text-foreground shadow-sm'
                        : 'bg-background hover:bg-surface-hover border-border text-muted'
                    }`}
                  >
                    <span className="text-[11px] font-black uppercase block">{wd.shortLabel}</span>
                    <span className="text-xs font-bold block mt-0.5">{wd.dayMonth}</span>
                    <span className="text-[10px] text-emerald-400 font-semibold block mt-0.5">
                      {classesCount} {classesCount === 1 ? 'aula' : 'aulas'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Lista de Aulas Mapeadas no Dia */}
          {aulasDoDia.length === 0 ? (
            <div className="glass-panel p-12 rounded-3xl border border-border bg-surface text-center space-y-2">
              <Calendar className="w-8 h-8 text-muted mx-auto" />
              <p className="text-sm font-black text-foreground">
                Nenhuma aula mapeada para esta data ({formatDataBR(selectedDate)}).
              </p>
              <p className="text-xs text-muted max-w-md mx-auto">
                Na sua grade de horários, este dia está marcado com &ldquo;x&rdquo; (sem aulas presenciais) ou é fim de semana. Selecione outro dia da semana acima.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {aulasDoDia.map((aula) => (
                <React.Fragment key={`${aula.slotId}-${aula.inicio}`}>
                  {/* Faixa Automática de Recreio / Intervalo (quando há diferença de 15 min entre fim e início) */}
                  {aula.intervalBeforeMinutes > 0 && (
                    <div className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-2xl bg-amber-500/10 border border-dashed border-amber-500/40 text-amber-300 text-xs font-black">
                      <Coffee className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>
                        INTERVALO / RECREIO ({aula.intervalBeforeMinutes} MIN) • {aula.intervalStart} às {aula.intervalEnd}
                      </span>
                    </div>
                  )}

                  {/* Card da Aula */}
                  <div className="glass-panel p-5 rounded-3xl border border-border bg-surface hover:border-emerald-500/40 transition-all shadow-md space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3.5">
                      <div className="flex items-center gap-3">
                        <div className="px-3.5 py-2 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-center shrink-0">
                          <span className="text-[10px] font-black uppercase block">{aula.turno}</span>
                          <span className="text-sm font-black block">{aula.aula_label} Aula</span>
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            {aula.sala && (
                              <span className="px-2.5 py-0.5 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-xs font-black flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                Sala {aula.sala}
                              </span>
                            )}
                            <h3 className="text-lg sm:text-xl font-black text-foreground tracking-tight">
                              Turma {aula.turmaCode}
                            </h3>
                            <span className="text-xs text-muted font-mono">({aula.turma_id})</span>
                          </div>
                          <p className="text-xs text-muted mt-0.5 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-emerald-400" />
                            <span>
                              Horário: <strong className="text-foreground">{aula.inicio} às {aula.fim}</strong> (45 min)
                            </span>
                          </p>
                        </div>
                      </div>

                      {!isReadOnly && (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setEditingPlanSlot({
                                data: aula.data,
                                inicio: aula.inicio,
                                fim: aula.fim,
                                aula_label: aula.aula_label,
                                turno: aula.turno,
                                turma_id: aula.turma_id,
                                conteudo: aula.conteudo,
                                plan_id: aula.plan_id,
                              })
                            }
                            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-100 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                          >
                            <Pencil className="w-3.5 h-3.5 text-emerald-400" />
                            <span>{aula.conteudo ? 'Editar Planejamento' : 'Planejar Aula'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setEditingObsModal({
                                id: null,
                                turma_id: aula.turma_id,
                                data_origem: aula.data,
                                texto: '',
                              })
                            }
                            className="px-3.5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-black flex items-center gap-1.5 cursor-pointer"
                          >
                            <StickyNote className="w-3.5 h-3.5" />
                            <span>+ Observação (Onde Paramos)</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* 1. LEMBRETES PENDENTES DA ÚLTIMA AULA DESTA TURMA (obsPendentes) */}
                    {aula.obsPendentes.length > 0 && (
                      <div className="space-y-2">
                        {aula.obsPendentes.map((obs) => (
                          <div
                            key={obs.id}
                            className="p-4 rounded-2xl bg-amber-500/15 border-l-4 border-amber-400 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 text-amber-300 text-[11px] font-black uppercase">
                                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                                <span>
                                  Lembrete da Aula Anterior ({formatDataBR(obs.data_origem)}) — Onde Paramos:
                                </span>
                              </div>
                              <p className="text-xs sm:text-sm text-amber-100 font-medium whitespace-pre-wrap leading-relaxed">
                                {obs.texto}
                              </p>
                            </div>
                            {!isReadOnly && (
                              <div className="flex items-center gap-2 shrink-0">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setEditingObsModal({
                                      id: obs.id,
                                      turma_id: obs.turma_id,
                                      data_origem: obs.data_origem,
                                      texto: obs.texto,
                                    })
                                  }
                                  className="px-2.5 py-1.5 rounded-lg bg-slate-900/70 hover:bg-slate-900 text-amber-200 text-[11px] font-bold cursor-pointer"
                                >
                                  ✏️ Editar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleConsumeObs(obs.id)}
                                  className="px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-[11px] font-black flex items-center gap-1 cursor-pointer"
                                >
                                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                                  <span>Marcar como Lido</span>
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* 2. PLANEJAMENTO DO DIA PARA ESTA AULA */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-black uppercase tracking-wider text-muted block">
                        📘 Planejamento desta Aula:
                      </span>
                      {aula.conteudo ? (
                        <div className="p-4 rounded-2xl bg-emerald-950/30 border-l-4 border-emerald-400 border border-emerald-500/30 text-xs sm:text-sm text-emerald-100 whitespace-pre-wrap leading-relaxed">
                          {aula.conteudo}
                        </div>
                      ) : (
                        <div
                          onClick={() =>
                            !isReadOnly &&
                            setEditingPlanSlot({
                              data: aula.data,
                              inicio: aula.inicio,
                              fim: aula.fim,
                              aula_label: aula.aula_label,
                              turno: aula.turno,
                              turma_id: aula.turma_id,
                              conteudo: '',
                              plan_id: '',
                            })
                          }
                          className="p-3.5 rounded-2xl bg-background/60 border border-dashed border-border text-xs text-muted italic cursor-pointer hover:border-emerald-500/40 transition-all"
                        >
                          Nenhum planejamento anotado para hoje. Clique para registrar o lembrete do que fazer na aula.
                        </div>
                      )}
                    </div>

                    {/* 3. OBSERVAÇÕES REGISTRADAS HOJE (Ficarão visíveis na próxima aula desta turma) */}
                    {aula.obsFeitasHoje.length > 0 && (
                      <div className="space-y-2 pt-1">
                        {aula.obsFeitasHoje.map((obs) => (
                          <div
                            key={obs.id}
                            className="p-3.5 rounded-2xl bg-cyan-950/30 border border-cyan-500/30 flex items-start justify-between gap-3"
                          >
                            <div className="space-y-1">
                              <span className="text-[10px] font-black uppercase text-cyan-400 block">
                                📌 Observação Registrada Hoje (Aparecerá na próxima aula da Turma {aula.turmaCode}):
                              </span>
                              <p className="text-xs text-cyan-100 whitespace-pre-wrap">{obs.texto}</p>
                            </div>
                            {!isReadOnly && (
                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setEditingObsModal({
                                      id: obs.id,
                                      turma_id: obs.turma_id,
                                      data_origem: obs.data_origem,
                                      texto: obs.texto,
                                    })
                                  }
                                  className="p-1.5 rounded-lg bg-slate-900 text-cyan-300 hover:text-white text-xs cursor-pointer"
                                  title="Editar observação"
                                >
                                  ✏️
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteObs(obs.id)}
                                  className="p-1.5 rounded-lg bg-slate-900 text-rose-400 hover:text-rose-300 text-xs cursor-pointer"
                                  title="Excluir observação"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </React.Fragment>
              ))}
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          ABA 2: GRADE DE HORÁRIO & MAPEAMENTO DE SALAS (ESTILO PLANILHA EDITÁVEL)
         ===================================================================== */}
      {activeSubTab === 'horario' && (
        <div className="glass-panel p-6 rounded-3xl border border-border bg-surface shadow-xl space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
            <div>
              <h2 className="text-lg font-black text-foreground">
                📅 Mapeamento de Salas & Grade Semanal Fixa
              </h2>
              <p className="text-xs text-muted mt-0.5">
                Preencha como na sua planilha (ex: <code className="text-emerald-400 font-bold">S10 201</code> para Sala 10 / Turma 201, ou <code className="text-rose-400 font-bold">x</code> quando não houver aula). O sistema calcula os intervalos de 15 min automaticamente.
              </p>
            </div>
            {!isReadOnly && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleRestoreDefaultGrade}
                  className="px-3.5 py-2 rounded-xl bg-background hover:bg-surface-hover border border-border text-muted hover:text-foreground text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restaurar Padrão</span>
                </button>
                <button
                  type="button"
                  onClick={handleSaveGradeChanges}
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black flex items-center gap-1.5 shadow-md cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Salvar Grade de Horários</span>
                </button>
              </div>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs min-w-[720px]">
              <thead>
                <tr className="bg-background/90 border-b border-border text-muted uppercase text-[11px] font-black">
                  <th className="p-3 text-left">Turno</th>
                  <th className="p-3 text-left w-16">Aula</th>
                  <th className="p-3 text-left w-24">Início</th>
                  <th className="p-3 text-left w-24">Fim</th>
                  <th className="p-3 text-center">Seg</th>
                  <th className="p-3 text-center">Ter</th>
                  <th className="p-3 text-center">Qua</th>
                  <th className="p-3 text-center">Qui</th>
                  <th className="p-3 text-center">Sex</th>
                </tr>
              </thead>
              <tbody>
                {grade.map((slot, sIdx) => {
                  const prevSlot = sIdx > 0 ? grade[sIdx - 1] : null;
                  const gapMinutes =
                    prevSlot && prevSlot.turno === slot.turno
                      ? getMinutesDiff(prevSlot.fim, slot.inicio)
                      : 0;
                  const isNewTurno = prevSlot && prevSlot.turno !== slot.turno;

                  return (
                    <React.Fragment key={slot.id || sIdx}>
                      {gapMinutes > 0 && gapMinutes <= 40 && (
                        <tr className="bg-amber-500/10 border-y border-amber-500/30">
                          <td colSpan={9} className="py-1.5 px-4 text-center text-[11px] font-black text-amber-300">
                            ☕ Intervalo / Recreio detectado automaticamente: {gapMinutes} min ({prevSlot?.fim} às {slot.inicio})
                          </td>
                        </tr>
                      )}
                      {isNewTurno && (
                        <tr className="bg-slate-950/70">
                          <td colSpan={9} className="py-1.5 px-4 text-[10px] font-black uppercase tracking-widest text-cyan-400">
                            ─── Turno {slot.turno} ───
                          </td>
                        </tr>
                      )}
                      <tr className="border-b border-border/60 hover:bg-background/40 transition-colors">
                        <td className="p-2">
                          <input
                            type="text"
                            value={slot.turno}
                            disabled={isReadOnly}
                            onChange={(e) => handleUpdateGradeMeta(sIdx, 'turno', e.target.value)}
                            className="w-24 bg-background border border-border rounded-lg px-2 py-1.5 text-xs font-bold text-foreground"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={slot.aula_label}
                            disabled={isReadOnly}
                            onChange={(e) => handleUpdateGradeMeta(sIdx, 'aula_label', e.target.value)}
                            className="w-14 bg-background border border-border rounded-lg px-2 py-1.5 text-xs font-black text-center text-foreground"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="time"
                            value={slot.inicio}
                            disabled={isReadOnly}
                            onChange={(e) => handleUpdateGradeMeta(sIdx, 'inicio', e.target.value)}
                            className="bg-background border border-border rounded-lg px-2 py-1.5 text-xs font-mono text-foreground"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="time"
                            value={slot.fim}
                            disabled={isReadOnly}
                            onChange={(e) => handleUpdateGradeMeta(sIdx, 'fim', e.target.value)}
                            className="bg-background border border-border rounded-lg px-2 py-1.5 text-xs font-mono text-foreground"
                          />
                        </td>
                        {[0, 1, 2, 3, 4].map((dIdx) => {
                          const cellVal = slot.dias[dIdx] || '';
                          const isOff = IGNORAR_VALORES.includes(cellVal.trim().toLowerCase());
                          return (
                            <td key={dIdx} className="p-1.5">
                              <input
                                type="text"
                                value={cellVal}
                                disabled={isReadOnly}
                                onChange={(e) => handleUpdateGradeCell(sIdx, dIdx, e.target.value)}
                                placeholder="x"
                                className={`w-full rounded-xl px-2.5 py-2 text-xs text-center font-black transition-all focus:outline-none ${
                                  isOff
                                    ? 'bg-background/40 border border-border/50 text-muted/60 font-normal italic'
                                    : 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 shadow-sm'
                                }`}
                              />
                            </td>
                          );
                        })}
                      </tr>
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL DE PLANEJAMENTO DA AULA
         ===================================================================== */}
      {editingPlanSlot && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-emerald-500/40 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-black uppercase text-emerald-400">
                  {editingPlanSlot.turno} • {editingPlanSlot.aula_label} Aula ({editingPlanSlot.inicio} - {editingPlanSlot.fim})
                </span>
                <h3 className="text-base font-black text-white">
                  Planejar Aula — {editingPlanSlot.turma_id} ({formatDataBR(editingPlanSlot.data)})
                </h3>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 block">
                Roteiro / Lembrete Breve da Aula:
              </label>
              <textarea
                value={editingPlanSlot.conteudo}
                onChange={(e) =>
                  setEditingPlanSlot({ ...editingPlanSlot, conteudo: e.target.value })
                }
                rows={6}
                placeholder="Digite o que você planeja trabalhar nesta aula (conceitos, dinâmica, leitura, debate ou correção)..."
                className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-400 rounded-2xl p-3.5 text-xs sm:text-sm text-white focus:outline-none leading-relaxed"
                autoFocus
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingPlanSlot(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSavePlan}
                className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black cursor-pointer flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Salvar Planejamento</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL DE OBSERVAÇÃO PÓS-AULA (LEMBRETE PARA A PRÓXIMA AULA)
         ===================================================================== */}
      {editingObsModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500/40 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-black uppercase text-amber-400">
                  Lembrete Automático para a Próxima Aula
                </span>
                <h3 className="text-base font-black text-white">
                  {editingObsModal.id ? 'Editar Observação' : 'Nova Observação'} — {editingObsModal.turma_id}
                </h3>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 block">
                O que fizemos hoje / Onde paramos no conteúdo?
              </label>
              <textarea
                value={editingObsModal.texto}
                onChange={(e) =>
                  setEditingObsModal({ ...editingObsModal, texto: e.target.value })
                }
                rows={5}
                placeholder="Ex: Paramos no slide 8 sobre Estratificação Social. Falta corrigir a questão 3 na próxima aula..."
                className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-2xl p-3.5 text-xs sm:text-sm text-white focus:outline-none leading-relaxed"
                autoFocus
              />
              <p className="text-[11px] text-amber-300/80">
                💡 Este lembrete aparecerá automaticamente no topo da próxima aula que a turma <strong>{editingObsModal.turma_id}</strong> tiver no seu horário!
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingObsModal(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveObs}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black cursor-pointer flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Salvar Observação</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
