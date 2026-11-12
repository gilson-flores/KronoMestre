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

export const CronogramaTabHoje: React.FC<any> = (props) => {
  const { DIAS_SEMANA_LABELS, IGNORAR_VALORES, activeSubTab, aulasDoDia, dayOfWeekIndex, formatDataBR, grade, handleConsumeObs, handleDeleteObs, handleStepDay, isReadOnly, selectedDate, setEditingObsModal, setEditingPlanSlot, setSelectedDate, toLocalYMD, weekDays } = props;
  return (
    <>
      {/* =====================================================================
          ABA 1: AULAS DO DIA (PLANEJAMENTO + OBSERVAÇÃO / ONDE PARAMOS)
         ===================================================================== */}
      {activeSubTab === 'hoje' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl border border-zinc-800/90 bg-zinc-950/70 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleStepDay(-1)}
                  className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 cursor-pointer"
                  title="Dia útil anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e: any) => e.target.value && setSelectedDate(e.target.value)}
                  className="bg-zinc-900 border border-zinc-700 rounded-lg px-3.5 py-1.5 text-xs sm:text-sm font-mono font-semibold text-zinc-100 focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => handleStepDay(1)}
                  className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 cursor-pointer"
                  title="Próximo dia útil"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedDate(toLocalYMD(new Date()))}
                  className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs font-semibold cursor-pointer"
                >
                  Hoje
                </button>
              </div>

              <div className="text-xs text-zinc-400">
                {dayOfWeekIndex >= 0 ? (
                  <span>
                    <strong className="text-zinc-100">{DIAS_SEMANA_LABELS[dayOfWeekIndex]}-feira</strong> ({formatDataBR(selectedDate)}) •{' '}
                    <strong className="text-emerald-400">{aulasDoDia.length} aula(s)</strong>
                  </span>
                ) : (
                  <span className="text-amber-400">Fim de semana — selecione um dia de Segunda a Sexta abaixo</span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-5 gap-2">
              {weekDays.map((wd: any) => {
                const isSelected = wd.ymd === selectedDate;
                const classesCount = grade.filter(
                  (s: any) => !IGNORAR_VALORES.includes(String(s.dias[wd.offset] || '').trim().toLowerCase())
                ).length;

                return (
                  <button
                    key={wd.ymd}
                    type="button"
                    onClick={() => setSelectedDate(wd.ymd)}
                    className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-zinc-100 text-zinc-950 border-zinc-100 font-semibold shadow-sm'
                        : 'bg-zinc-900/60 hover:bg-zinc-900 border-zinc-800/80 text-zinc-400'
                    }`}
                  >
                    <span className="text-[11px] uppercase tracking-wider block font-bold">{wd.shortLabel}</span>
                    <span className="text-xs font-mono block mt-0.5">{wd.dayMonth}</span>
                    <span
                      className={`text-[10px] font-medium block mt-0.5 ${
                        isSelected ? 'text-emerald-700 font-bold' : 'text-emerald-400/90'
                      }`}
                    >
                      {classesCount} {classesCount === 1 ? 'aula' : 'aulas'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {aulasDoDia.length === 0 ? (
            <div className="p-12 rounded-2xl border border-zinc-800/80 bg-zinc-950/50 text-center space-y-2">
              <Calendar className="w-7 h-7 text-zinc-500 mx-auto" />
              <p className="text-sm font-semibold text-zinc-200">
                Nenhuma aula programada para {formatDataBR(selectedDate)}.
              </p>
              <p className="text-xs text-zinc-500 max-w-md mx-auto">
                Este dia está marcado com &ldquo;x&rdquo; na sua grade semanal ou é fim de semana.
              </p>
            </div>
          ) : (
            <div className="space-y-3.5">
              {aulasDoDia.map((aula: any) => (
                <React.Fragment key={`${aula.slotId}-${aula.inicio}`}>
                  {/* Faixas de Recreio / Intervalo (Suporta 1 ou 2 recreios configurados ou automáticos) */}
                  {aula.breaksBefore.map((brk: any, bIdx: any) => (
                    <div
                      key={bIdx}
                      className="flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-amber-950/30 border border-amber-500/30 text-amber-300 text-xs font-semibold"
                    >
                      <Coffee className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>
                        {brk.label} • <span className="font-mono">{brk.inicio} às {brk.fim}</span> ({brk.minutes} min)
                      </span>
                    </div>
                  ))}

                  {/* Card da Aula (Visual Linear/Apple limpo) */}
                  <div className="p-5 rounded-2xl border border-zinc-800/90 bg-zinc-950/80 hover:border-zinc-700 transition-all space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-3.5">
                      <div className="flex items-center gap-3">
                        <div className="px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 text-center shrink-0">
                          <span className="text-[10px] uppercase tracking-wider text-zinc-400 block">
                            {aula.turno}
                          </span>
                          <span className="text-sm font-bold block">{aula.aula_label} Aula</span>
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-lg font-bold text-zinc-100 tracking-tight">
                              Turma {aula.turmaCode}
                            </h3>
                            {aula.sala && (
                              <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {aula.sala}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-zinc-400 mt-0.5 flex items-center gap-1.5 font-mono">
                            <Clock className="w-3.5 h-3.5 text-zinc-500" />
                            <span>
                              {aula.inicio} – {aula.fim}
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
                                turma_id: aula.turmaCode,
                                sala: aula.sala,
                                conteudo: aula.conteudo,
                                plan_id: aula.plan_id,
                              })
                            }
                            className="px-3.5 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-100 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                          >
                            <Pencil className="w-3.5 h-3.5 text-emerald-400" />
                            <span>{aula.conteudo ? 'Editar Planejamento' : 'Planejar Aula'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setEditingObsModal({
                                id: null,
                                turma_id: aula.turmaCode,
                                data_origem: aula.data,
                                texto: '',
                              })
                            }
                            className="px-3.5 py-2 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                          >
                            <StickyNote className="w-3.5 h-3.5" />
                            <span>+ Observação (Onde Paramos)</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* 1. LEMBRETES DA ÚLTIMA AULA DESTA TURMA (obsPendentes) */}
                    {aula.obsPendentes.length > 0 && (
                      <div className="space-y-2">
                        {aula.obsPendentes.map((obs: any) => (
                          <div
                            key={obs.id}
                            className="p-3.5 rounded-xl bg-amber-950/30 border-l-4 border-amber-400 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 text-amber-300 text-[11px] font-bold uppercase tracking-wide">
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                <span>
                                  Lembrete da Aula Anterior ({formatDataBR(obs.data_origem)}) — Onde Paramos:
                                </span>
                              </div>
                              <p className="text-xs sm:text-sm text-amber-100 whitespace-pre-wrap leading-relaxed">
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
                                      turma_id: aula.turmaCode,
                                      data_origem: obs.data_origem,
                                      texto: obs.texto,
                                    })
                                  }
                                  className="px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-amber-200 text-[11px] font-medium cursor-pointer"
                                >
                                  Editar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleConsumeObs(obs.id)}
                                  className="px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-zinc-950 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                                >
                                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                                  <span>Marcar como Lido</span>
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* 2. PLANEJAMENTO DO DIA */}
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 block">
                        Planejamento desta Aula:
                      </span>
                      {aula.conteudo ? (
                        <div className="p-3.5 rounded-xl bg-zinc-900/90 border-l-4 border-emerald-500 border border-zinc-800 text-xs sm:text-sm text-zinc-100 whitespace-pre-wrap leading-relaxed">
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
                              turma_id: aula.turmaCode,
                              sala: aula.sala,
                              conteudo: '',
                              plan_id: '',
                            })
                          }
                          className="p-3.5 rounded-xl bg-zinc-900/40 border border-dashed border-zinc-800 text-xs text-zinc-500 cursor-pointer hover:border-zinc-700 transition-all"
                        >
                          Nenhum planejamento registrado para hoje. Clique para anotar o roteiro da aula.
                        </div>
                      )}
                    </div>

                    {/* 3. OBSERVAÇÕES REGISTRADAS HOJE */}
                    {aula.obsFeitasHoje.length > 0 && (
                      <div className="space-y-2 pt-1">
                        {aula.obsFeitasHoje.map((obs: any) => (
                          <div
                            key={obs.id}
                            className="p-3.5 rounded-xl bg-zinc-900/80 border border-zinc-800 flex items-start justify-between gap-3"
                          >
                            <div className="space-y-1">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">
                                📌 Registrado Hoje (Aparecerá na próxima aula da Turma {aula.turmaCode}):
                              </span>
                              <p className="text-xs text-zinc-200 whitespace-pre-wrap">{obs.texto}</p>
                            </div>
                            {!isReadOnly && (
                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setEditingObsModal({
                                      id: obs.id,
                                      turma_id: aula.turmaCode,
                                      data_origem: obs.data_origem,
                                      texto: obs.texto,
                                    })
                                  }
                                  className="px-2 py-1 rounded bg-zinc-800 text-zinc-300 hover:text-white text-[11px] cursor-pointer"
                                >
                                  Editar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteObs(obs.id)}
                                  className="p-1.5 rounded bg-zinc-800 text-rose-400 hover:text-rose-300 text-xs cursor-pointer"
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

    </>
  );
};
