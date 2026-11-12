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

export const CronogramaTabHorario: React.FC<any> = (props) => {
  const { IGNORAR_VALORES, SALA_OPTIONS, activeSubTab, autoClassDuration, autoShiftStart, autoShiftTarget, editingObsModal, editingPlanSlot, formatDataBR, getIntervalsBeforeSlot, grade, handleAddClassSlot, handleAddCustomInterval, handleAutoRecalculateShiftTimes, handleRemoveClassSlot, handleRemoveInterval, handleRestoreDefaultGrade, handleSaveGradeAndIntervals, handleSaveObs, handleSavePlan, handleUpdateGradeMeta, handleUpdateGradeSala, handleUpdateGradeTurma, handleUpdateInterval, intervals, isReadOnly, setAutoClassDuration, setAutoShiftStart, setAutoShiftTarget, setEditingObsModal, setEditingPlanSlot } = props;
  return (
    <>
      {/* =====================================================================
          ABA 2: HORÁRIOS DE INÍCIO/FIM, ATÉ 2 RECREIOS POR TURNO, TURMAS & SALAS
         ===================================================================== */}
      {activeSubTab === 'horario' && (
        <div className="space-y-6">
          {/* PAINEL 1: CONFIGURAÇÃO DE INTERVALOS / RECREIOS (ATÉ 2 RECREIOS POR TURNO) + RECALCULADOR */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Intervalos / Recreios Configuráveis */}
            <div className="lg:col-span-2 p-5 rounded-2xl border border-zinc-800 bg-zinc-950/80 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                    <Coffee className="w-4 h-4 text-amber-400" />
                    <span>Horários de Intervalos / Recreios da Escola (Suporta 1 ou 2 Recreios)</span>
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Ative os recreios da sua escola, defina após qual aula acontecem e ajuste o horário de início e fim.
                  </p>
                </div>
                {!isReadOnly && (
                  <button
                    type="button"
                    onClick={handleAddCustomInterval}
                    className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
                  >
                    <Plus className="w-3.5 h-3.5 text-amber-400" />
                    <span>+ Intervalo</span>
                  </button>
                )}
              </div>

              <div className="space-y-2.5">
                {intervals.map((intItem: any) => (
                  <div
                    key={intItem.id}
                    className={`p-3 rounded-xl border flex flex-wrap items-center justify-between gap-2.5 transition-all ${
                      intItem.ativo
                        ? 'bg-zinc-900/90 border-amber-500/30'
                        : 'bg-zinc-950/50 border-zinc-800/60 opacity-60'
                    }`}
                  >
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={intItem.ativo}
                        disabled={isReadOnly}
                        onChange={(e: any) => handleUpdateInterval(intItem.id, 'ativo', e.target.checked)}
                        className="w-4 h-4 accent-amber-400 rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        value={intItem.label}
                        disabled={isReadOnly}
                        onChange={(e: any) => handleUpdateInterval(intItem.id, 'label', e.target.value)}
                        className="bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1 text-xs font-semibold text-zinc-100 w-48"
                      />
                    </label>

                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        value={intItem.turno}
                        disabled={isReadOnly}
                        onChange={(e: any) => handleUpdateInterval(intItem.id, 'turno', e.target.value)}
                        className="bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1 text-xs text-zinc-200"
                      >
                        <option value="Matutino">Matutino</option>
                        <option value="Vespertino">Vespertino</option>
                        <option value="Noturno">Noturno</option>
                      </select>

                      <div className="flex items-center gap-1 text-xs text-zinc-400">
                        <span>Após:</span>
                        <select
                          value={intItem.afterAulaLabel}
                          disabled={isReadOnly}
                          onChange={(e: any) =>
                            handleUpdateInterval(intItem.id, 'afterAulaLabel', e.target.value)
                          }
                          className="bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1 text-xs font-bold text-amber-300"
                        >
                          {['1ª', '2ª', '3ª', '4ª', '5ª'].map((lbl: any) => (
                            <option key={lbl} value={lbl}>
                              {lbl} Aula
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex items-center gap-1 text-xs font-mono text-zinc-300">
                        <input
                          type="time"
                          value={intItem.inicio}
                          disabled={isReadOnly}
                          onChange={(e: any) => handleUpdateInterval(intItem.id, 'inicio', e.target.value)}
                          className="bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1 text-xs font-mono text-zinc-100"
                        />
                        <span>às</span>
                        <input
                          type="time"
                          value={intItem.fim}
                          disabled={isReadOnly}
                          onChange={(e: any) => handleUpdateInterval(intItem.id, 'fim', e.target.value)}
                          className="bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1 text-xs font-mono text-zinc-100"
                        />
                      </div>

                      {!isReadOnly && intervals.length > 2 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveInterval(intItem.id)}
                          className="p-1.5 rounded-lg bg-zinc-950 hover:bg-rose-950/50 text-zinc-400 hover:text-rose-300 cursor-pointer"
                          title="Remover intervalo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Assistente de Geração / Recálculo de Horários do Turno */}
            <div className="p-5 rounded-2xl border border-zinc-800 bg-zinc-950/80 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="border-b border-zinc-800 pb-3">
                  <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                    <Wand2 className="w-4 h-4 text-emerald-400" />
                    <span>Ajuste Rápido de Horários</span>
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Defina o início da 1ª aula e a duração para recalcular início/fim de todas as aulas do turno automaticamente.
                  </p>
                </div>

                <div className="space-y-2.5">
                  <div>
                    <label className="text-[11px] font-medium text-zinc-400 block mb-1">
                      Turno Alvo:
                    </label>
                    <select
                      value={autoShiftTarget}
                      onChange={(e: any) => {
                        const val = e.target.value;
                        setAutoShiftTarget(val);
                        setAutoShiftStart(
                          val === 'Matutino' ? '07:30' : val === 'Vespertino' ? '13:30' : '18:45'
                        );
                      }}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs font-semibold text-zinc-100"
                    >
                      <option value="Matutino">Matutino</option>
                      <option value="Vespertino">Vespertino</option>
                      <option value="Noturno">Noturno</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] font-medium text-zinc-400 block mb-1">
                        Início da 1ª Aula:
                      </label>
                      <input
                        type="time"
                        value={autoShiftStart}
                        onChange={(e: any) => setAutoShiftStart(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs font-mono text-zinc-100"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-medium text-zinc-400 block mb-1">
                        Duração (min):
                      </label>
                      <input
                        type="number"
                        min={20}
                        max={120}
                        value={autoClassDuration}
                        onChange={(e: any) => setAutoClassDuration(Number(e.target.value))}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs font-mono text-zinc-100"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="button"
                disabled={isReadOnly}
                onClick={handleAutoRecalculateShiftTimes}
                className="w-full py-2.5 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-100 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer"
              >
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                <span>Recalcular Horários do {autoShiftTarget}</span>
              </button>
            </div>
          </div>

          {/* PAINEL 2: GRADE SEMANAL COM HORÁRIO INÍCIO/FIM + TURMA ("201"/"2002") + SALA ("Sala 1" .. "Sala 25") */}
          <div className="p-5 rounded-2xl border border-zinc-800 bg-zinc-950/80 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-4">
              <div>
                <h2 className="text-base font-bold text-zinc-100">
                  Grade de Horários, Turmas (&ldquo;201&rdquo; / &ldquo;2002&rdquo;) e Salas por Dia da Semana
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Em cada dia, digite o número da Turma (ex: <code className="text-emerald-400 font-mono">201</code>, <code className="text-emerald-400 font-mono">2002</code> ou <code className="text-zinc-500 font-mono">x</code> para janela) e escolha a Sala (<code className="text-zinc-300">Sala 1</code> a <code className="text-zinc-300">Sala 25</code>).
                </p>
              </div>
              {!isReadOnly && (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleAddClassSlot('Matutino')}
                    className="px-3 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs font-medium cursor-pointer"
                  >
                    + Aula Matutino
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddClassSlot('Vespertino')}
                    className="px-3 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs font-medium cursor-pointer"
                  >
                    + Aula Vespertino
                  </button>
                  <button
                    type="button"
                    onClick={handleRestoreDefaultGrade}
                    className="px-3 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-200 text-xs font-medium flex items-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Padrão</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveGradeAndIntervals}
                    className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Salvar Grade & Salas</span>
                  </button>
                </div>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs min-w-[820px]">
                <thead>
                  <tr className="bg-zinc-900/80 border-b border-zinc-800 text-zinc-400 uppercase text-[10px] font-bold tracking-wider">
                    <th className="p-2.5 text-left w-24">Turno</th>
                    <th className="p-2.5 text-center w-14">Aula</th>
                    <th className="p-2.5 text-left w-24">Início</th>
                    <th className="p-2.5 text-left w-24">Fim</th>
                    <th className="p-2.5 text-center">Segunda (Turma + Sala)</th>
                    <th className="p-2.5 text-center">Terça (Turma + Sala)</th>
                    <th className="p-2.5 text-center">Quarta (Turma + Sala)</th>
                    <th className="p-2.5 text-center">Quinta (Turma + Sala)</th>
                    <th className="p-2.5 text-center">Sexta (Turma + Sala)</th>
                    {!isReadOnly && <th className="p-2.5 text-center w-10"></th>}
                  </tr>
                </thead>
                <tbody>
                  {grade.map((slot: any, sIdx: any) => {
                    const prevSlot = sIdx > 0 ? grade[sIdx - 1] : null;
                    const isNewTurno = prevSlot && prevSlot.turno !== slot.turno;
                    const breaksBefore = getIntervalsBeforeSlot(sIdx);

                    return (
                      <React.Fragment key={slot.id || sIdx}>
                        {isNewTurno && (
                          <tr className="bg-zinc-900/90">
                            <td
                              colSpan={isReadOnly ? 9 : 10}
                              className="py-2 px-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400"
                            >
                              ─── Turno {slot.turno} ───
                            </td>
                          </tr>
                        )}

                        {breaksBefore.map((brk: any, bIdx: any) => (
                          <tr
                            key={`brk-${sIdx}-${bIdx}`}
                            className="bg-amber-950/20 border-y border-amber-500/25"
                          >
                            <td
                              colSpan={isReadOnly ? 9 : 10}
                              className="py-1.5 px-4 text-center text-[11px] font-semibold text-amber-300"
                            >
                              ☕ {brk.label}: <span className="font-mono">{brk.inicio} às {brk.fim}</span> ({brk.minutes} min)
                            </td>
                          </tr>
                        ))}

                        <tr className="border-b border-zinc-800/70 hover:bg-zinc-900/30 transition-colors">
                          <td className="p-1.5 align-top">
                            <select
                              value={slot.turno}
                              disabled={isReadOnly}
                              onChange={(e: any) =>
                                handleUpdateGradeMeta(sIdx, 'turno', e.target.value)
                              }
                              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5 text-xs font-medium text-zinc-200"
                            >
                              <option value="Matutino">Matutino</option>
                              <option value="Vespertino">Vespertino</option>
                              <option value="Noturno">Noturno</option>
                            </select>
                          </td>
                          <td className="p-1.5 align-top">
                            <input
                              type="text"
                              value={slot.aula_label}
                              disabled={isReadOnly}
                              onChange={(e: any) =>
                                handleUpdateGradeMeta(sIdx, 'aula_label', e.target.value)
                              }
                              className="w-12 bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5 text-xs font-bold text-center text-zinc-100"
                            />
                          </td>
                          <td className="p-1.5 align-top">
                            <input
                              type="time"
                              value={slot.inicio}
                              disabled={isReadOnly}
                              onChange={(e: any) =>
                                handleUpdateGradeMeta(sIdx, 'inicio', e.target.value)
                              }
                              className="bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5 text-xs font-mono text-zinc-100"
                            />
                          </td>
                          <td className="p-1.5 align-top">
                            <input
                              type="time"
                              value={slot.fim}
                              disabled={isReadOnly}
                              onChange={(e: any) =>
                                handleUpdateGradeMeta(sIdx, 'fim', e.target.value)
                              }
                              className="bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5 text-xs font-mono text-zinc-100"
                            />
                          </td>

                          {[0, 1, 2, 3, 4].map((dIdx: any) => {
                            const turmaVal = slot.dias[dIdx] || '';
                            const salaVal = slot.salas?.[dIdx] || '';
                            const isOff = IGNORAR_VALORES.includes(turmaVal.trim().toLowerCase());

                            return (
                              <td key={dIdx} className="p-1.5 align-top">
                                <div
                                  className={`p-1.5 rounded-xl border space-y-1 transition-all ${
                                    isOff
                                      ? 'bg-zinc-950/40 border-zinc-900'
                                      : 'bg-zinc-900/90 border-zinc-700/80'
                                  }`}
                                >
                                  <input
                                    type="text"
                                    value={turmaVal}
                                    disabled={isReadOnly}
                                    onChange={(e: any) =>
                                      handleUpdateGradeTurma(sIdx, dIdx, e.target.value)
                                    }
                                    placeholder="x ou 201"
                                    title="Digite a Turma (ex: 201, 2002) ou x para sem aula"
                                    className={`w-full rounded-lg px-2 py-1 text-xs text-center font-bold focus:outline-none ${
                                      isOff
                                        ? 'bg-transparent text-zinc-600 font-normal italic'
                                        : 'bg-zinc-950 border border-zinc-800 text-emerald-300'
                                    }`}
                                  />

                                  {!isOff && (
                                    <select
                                      value={salaVal}
                                      disabled={isReadOnly}
                                      onChange={(e: any) =>
                                        handleUpdateGradeSala(sIdx, dIdx, e.target.value)
                                      }
                                      className="w-full bg-zinc-950 border border-zinc-800 rounded-md px-1.5 py-0.5 text-[10px] font-medium text-zinc-300 focus:outline-none focus:border-emerald-500"
                                      title="Selecionar Sala (Sala 1 a Sala 25)"
                                    >
                                      <option value="">+ Sala...</option>
                                      {SALA_OPTIONS.filter(Boolean).map((sOpt: any) => (
                                        <option key={sOpt} value={sOpt}>
                                          {sOpt}
                                        </option>
                                      ))}
                                      {salaVal && !SALA_OPTIONS.includes(salaVal) && (
                                        <option value={salaVal}>{salaVal}</option>
                                      )}
                                    </select>
                                  )}
                                </div>
                              </td>
                            );
                          })}

                          {!isReadOnly && (
                            <td className="p-1.5 align-middle text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveClassSlot(slot.id)}
                                className="p-1.5 rounded-lg text-zinc-600 hover:text-rose-400 hover:bg-zinc-900 cursor-pointer"
                                title="Remover esta faixa de aula"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          )}
                        </tr>
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE PLANEJAMENTO DA AULA */}
      {editingPlanSlot && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                  {editingPlanSlot.turno} • {editingPlanSlot.aula_label} Aula ({editingPlanSlot.inicio} – {editingPlanSlot.fim})
                </span>
                <h3 className="text-base font-bold text-zinc-100 mt-0.5">
                  Planejar Aula — Turma {editingPlanSlot.turma_id}{' '}
                  {editingPlanSlot.sala ? `(${editingPlanSlot.sala})` : ''} •{' '}
                  {formatDataBR(editingPlanSlot.data)}
                </h3>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300 block">
                Roteiro / Lembrete Breve da Aula:
              </label>
              <textarea
                value={editingPlanSlot.conteudo}
                onChange={(e: any) =>
                  setEditingPlanSlot({ ...editingPlanSlot, conteudo: e.target.value })
                }
                rows={6}
                placeholder="Digite o que você planeja trabalhar nesta aula..."
                className="w-full bg-zinc-900 border border-zinc-800 focus:border-emerald-500 rounded-xl p-3.5 text-xs sm:text-sm text-zinc-100 focus:outline-none leading-relaxed"
                autoFocus
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingPlanSlot(null)}
                className="px-4 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSavePlan}
                className="px-5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-bold cursor-pointer flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Salvar Planejamento</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE OBSERVAÇÃO PÓS-AULA (ONDE PARAMOS) */}
      {editingObsModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                  Lembrete Automático para a Próxima Aula
                </span>
                <h3 className="text-base font-bold text-zinc-100 mt-0.5">
                  {editingObsModal.id ? 'Editar Observação' : 'Nova Observação'} — Turma{' '}
                  {editingObsModal.turma_id}
                </h3>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300 block">
                O que fizemos hoje / Onde paramos no conteúdo?
              </label>
              <textarea
                value={editingObsModal.texto}
                onChange={(e: any) =>
                  setEditingObsModal({ ...editingObsModal, texto: e.target.value })
                }
                rows={5}
                placeholder="Ex: Paramos no slide 8 sobre Estratificação Social. Falta corrigir a questão 3 na próxima aula..."
                className="w-full bg-zinc-900 border border-zinc-800 focus:border-amber-400 rounded-xl p-3.5 text-xs sm:text-sm text-zinc-100 focus:outline-none leading-relaxed"
                autoFocus
              />
              <p className="text-[11px] text-zinc-400">
                Este lembrete aparecerá automaticamente no topo da próxima aula que a Turma{' '}
                <strong className="text-zinc-200">{editingObsModal.turma_id}</strong> tiver no seu horário.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingObsModal(null)}
                className="px-4 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveObs}
                className="px-5 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-zinc-950 text-xs font-bold cursor-pointer flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Salvar Observação</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
