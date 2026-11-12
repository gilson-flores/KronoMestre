'use client';

import React, { useState, useMemo } from 'react';
import {
  Printer,
  FileText,
  Download,
  Copy,
  Check,
  X,
  Building2,
  Users,
  ShieldCheck,
  Info,
  Calendar,
  Layers,
  GraduationCap,
  ClipboardList,
  CheckCircle2,
  AlertCircle,
  Clock,
  PenLine,
} from 'lucide-react';
import { Activity, StudentUser, TeacherUser, RcoEmissionRecord } from '@/lib/types';
import { canStudentAccessActivity, isStudentPNE, getOriginalTurmas } from '@/lib/studentUtils';
import { initialTeacher } from '@/lib/initialData';
import { saveRcoEmission } from '@/lib/rcoStorage';

export const RcoPdfReportModalBody: React.FC<any> = (props) => {
  const { onClose, teacher, allTurmas, activeTurma, turmasReportData, currentDateFormatted, handleCopyPendingList, handleExportCsv, handlePrint, scope, setScope, setUserActiveTurma, includeActivityDetails, setIncludeActivityDetails, includeSpecialNeeds, setIncludeSpecialNeeds, includeSignatures, setIncludeSignatures, copiedState, emissionHash, persistedSuccessNotice, setPersistedSuccessNotice } = props;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn print:static print:p-0 print:m-0 print:bg-white print:overflow-visible">
      {/* Container Principal do Modal */}
      <div className="rco-modal-dialog bg-background border border-white/15 rounded-3xl w-full max-w-5xl max-h-[95vh] flex flex-col shadow-2xl overflow-hidden print:border-none print:shadow-none print:max-h-none print:overflow-visible print:bg-white print:w-full print:max-w-none print:rounded-none">
        {/* Modal Header & Toolbar (oculto na impressão com .no-print) */}
        <div className="no-print p-4 sm:p-5 bg-surface border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary shrink-0">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-foreground tracking-tight">
                  Mapa de Controle Docente • Lançamento de Atividades
                </h2>
                <span className="bg-primary/20 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full border border-primary/30">
                  Pronto para Impressão
                </span>
              </div>
              <p className="text-xs text-muted mt-0.5">
                Organização do dia a dia do professor: conferência de entregas, notas de atividades e controle de pendências.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap self-end sm:self-center">
            <button
              onClick={handlePrint}
              className="py-2.5 px-4 bg-primary hover:bg-primary-hover text-white font-extrabold rounded-2xl transition-all text-xs flex items-center gap-2 cursor-pointer shadow-lg shadow-primary/20 active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir / Salvar em PDF</span>
            </button>

            <button
              onClick={handleCopyPendingList}
              className="py-2.5 px-3 bg-[#171f33] hover:bg-surface-hover text-foreground font-bold rounded-2xl border border-border transition-all text-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
              title="Copiar lista de pendências para WhatsApp ou bloco de notas"
            >
              {copiedState ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span className="hidden md:inline">{copiedState ? 'Copiado!' : 'Copiar Pendências'}</span>
            </button>

            <button
              onClick={handleExportCsv}
              className="py-2.5 px-3 bg-[#171f33] hover:bg-surface-hover text-foreground font-bold rounded-2xl border border-border transition-all text-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
              title="Exportar Planilha de Entregas (CSV)"
            >
              <Download className="w-4 h-4" />
              <span className="hidden md:inline">CSV</span>
            </button>

            <button
              onClick={onClose}
              className="p-2.5 rounded-2xl bg-surface-hover hover:bg-surface-hover text-foreground/70 hover:text-foreground transition-colors cursor-pointer"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Notificação de Persistência */}
        {persistedSuccessNotice && (
          <div className="no-print bg-emerald-100 border-b border-emerald-200 px-5 py-2 text-xs text-emerald-600 flex items-center justify-between animate-fadeIn">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                <strong>Registro de Auditoria Salvo:</strong> Código de autenticidade gravado com sucesso!
              </span>
            </div>
            <button
              onClick={() => setPersistedSuccessNotice(false)}
              className="text-emerald-600 hover:text-foreground"
            >
              ✕
            </button>
          </div>
        )}

        {/* Options Toolbar (no-print) */}
        <div className="no-print px-5 py-3.5 bg-surface border-b border-border flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-muted font-bold flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-primary" />
              Escopo / Turma:
            </span>
            <div className="inline-flex rounded-xl p-1 bg-background border border-border">
              <button
                type="button"
                onClick={() => setScope('all')}
                className={`px-3 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                  scope === 'all'
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-muted hover:text-foreground'
                }`}
              >
                Todas as Turmas (Relatório Geral)
              </button>
              <button
                type="button"
                onClick={() => setScope('single')}
                className={`px-3 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                  scope === 'single'
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-muted hover:text-foreground'
                }`}
              >
                Turma Específica
              </button>
            </div>

            <select
              value={scope === 'all' ? 'ALL' : activeTurma}
              onChange={(e: any) => {
                if (e.target.value === 'ALL') {
                  setScope('all');
                } else {
                  setScope('single');
                  setUserActiveTurma(e.target.value);
                }
              }}
              className="bg-background border border-white/15 rounded-xl px-3 py-1.5 text-xs text-foreground font-bold focus:outline-none focus:border-primary cursor-pointer"
            >
              <option value="ALL" className="bg-background text-primary font-bold">
                📋 Todas as Turmas (Relatório Geral - {allTurmas.length} turmas)
              </option>
              {allTurmas.map((t: any) => (
                <option key={t} value={t} className="bg-background text-foreground">
                  Turma {t}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-4 flex-wrap text-muted">
            <label className="flex items-center gap-1.5 cursor-pointer hover:text-foreground">
              <input
                type="checkbox"
                checked={includeActivityDetails}
                onChange={(e: any) => setIncludeActivityDetails(e.target.checked)}
                className="rounded text-primary focus:ring-[#4ade80] cursor-pointer"
              />
              <span>Quadro de Atividades</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer hover:text-foreground">
              <input
                type="checkbox"
                checked={includeSpecialNeeds}
                onChange={(e: any) => setIncludeSpecialNeeds(e.target.checked)}
                className="rounded text-primary focus:ring-[#4ade80] cursor-pointer"
              />
              <span>Notas de Inclusão (PNE / RAD)</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer hover:text-foreground">
              <input
                type="checkbox"
                checked={includeSignatures}
                onChange={(e: any) => setIncludeSignatures(e.target.checked)}
                className="rounded text-primary focus:ring-[#4ade80] cursor-pointer"
              />
              <span>Assinaturas</span>
            </label>
          </div>
        </div>

        {/* Visualizador de Folha / Área de Impressão */}
        <div className="rco-scroll-container flex-1 overflow-y-auto overflow-x-auto p-2 sm:p-6 md:p-8 bg-[#090e1a] custom-scrollbar print:p-0 print:m-0 print:bg-white print:overflow-visible print:h-auto print:max-h-none">
          {/* Documento A4 Timbrado Limpo */}
          <div
            id="rco-printable-document"
            className="rco-printable-area bg-white text-slate-900 mx-auto w-full max-w-[210mm] min-w-[700px] sm:min-w-0 shadow-2xl p-4 sm:p-8 md:p-10 font-sans border border-slate-200 rounded-xl print:rounded-none print:border-none print:shadow-none print:p-0 print:max-w-none print:w-full print:m-0 print:min-w-full"
          >
            
            {/* SEÇÕES POR TURMA (Uma turma por página na impressão) */}
            {turmasReportData.map((turmaData: any, tIndex: any) => {
              const isFirstTurma = tIndex === 0;

              return (
                <div
                  key={turmaData.turmaName}
                  className={`turma-print-block pb-8 print:pb-8 ${!isFirstTurma ? 'rco-page-break' : ''}`}
                >
                  {/* CABEÇALHO OFICIAL INSTITUCIONAL LIMPO */}
                  <div className="border-b-2 border-slate-900 pb-3 mb-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        {/* Brasão / Identificação Estadual */}
                        <div className="w-12 h-12 rounded-lg border border-slate-800 bg-slate-100 flex flex-col items-center justify-center p-1 text-center shrink-0">
                          <span className="text-[8px] font-black text-slate-900 tracking-tighter leading-none">
                            ESTADO DE
                          </span>
                          <span className="text-[10px] font-black text-emerald-800 tracking-tighter leading-none mt-0.5">
                            SANTA
                          </span>
                          <span className="text-[10px] font-black text-emerald-800 tracking-tighter leading-none">
                            CATARINA
                          </span>
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <h1 className="text-xs font-black uppercase text-slate-900 tracking-wide">
                              GOVERNO DO ESTADO DE SANTA CATARINA • SED
                            </h1>
                          </div>
                          <h2 className="text-xs sm:text-sm font-black text-emerald-950 mt-0.5">
                            {teacher.school || "EEB Prof. Jandira D'Ávila"} • Coordenadoria Regional de Educação
                          </h2>
                          <div className="text-[10px] text-slate-600 font-semibold mt-0.5 flex items-center gap-2">
                            <span>Disciplina: <strong className="text-slate-900">{teacher.subject || 'Sociologia'}</strong></span>
                            <span>•</span>
                            <span>Professor: <strong className="text-slate-900">{teacher.name || 'Prof. Gilson Flores'}</strong></span>
                            {teacher.matriculaFuncional && (
                              <>
                                <span>•</span>
                                <span>Matrícula: <strong className="text-slate-900">{teacher.matriculaFuncional}</strong></span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="inline-block bg-slate-900 text-foreground rounded px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider">
                          Mapa de Lançamento
                        </div>
                        <div className="text-[9px] text-muted font-medium mt-1">
                          Data: {currentDateFormatted}
                        </div>
                        <div className="text-[8px] text-muted font-mono">
                          Ref: {emissionHash}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* IDENTIFICAÇÃO DA TURMA E RESUMO OPERACIONAL */}
                  <div className="bg-slate-900 text-foreground p-3 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-emerald-400 text-slate-950 font-black flex items-center justify-center text-xs shrink-0 shadow-sm">
                        {turmaData.turmaName.slice(0, 3)}
                      </div>
                      <div>
                        <h3 className="text-sm font-black uppercase tracking-tight">
                          TURMA {turmaData.turmaName} • CONTROLE DE ATIVIDADES E ENTREGAS
                        </h3>
                        <span className="text-[10px] text-muted">
                          Ano Letivo 2026 • Acompanhamento e Visto de Sala
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap text-[10px]">
                      <div className="bg-surface-hover px-2 py-1 rounded text-slate-200">
                        <strong>{turmaData.studentsCount}</strong> alunos
                      </div>
                      <div className="bg-surface-hover px-2 py-1 rounded text-slate-200">
                        <strong>{turmaData.activitiesCount}</strong> atividades
                      </div>
                      <div className="bg-emerald-100 text-emerald-600 border border-emerald-500/30 px-2 py-1 rounded font-bold">
                        {turmaData.studentsWithAtLeastOneSubmission}/{turmaData.studentsCount} com entregas ({turmaData.engagementPercent}%)
                      </div>
                      {(turmaData.pneCount > 0 || turmaData.radCount > 0) && (
                        <div className="bg-amber-100 text-amber-600 border border-amber-500/30 px-2 py-1 rounded font-bold">
                          {turmaData.pneCount > 0 ? `${turmaData.pneCount} PNE` : ''}
                          {turmaData.pneCount > 0 && turmaData.radCount > 0 ? ' • ' : ''}
                          {turmaData.radCount > 0 ? `${turmaData.radCount} RAD` : ''}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* QUADRO DE ATIVIDADES AVALIATIVAS E RECUPERAÇÕES APLICADAS */}
                  {includeActivityDetails && turmaData.activityMap.length > 0 && (
                    <div className="mb-3 p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-[10px] rco-avoid-break">
                      <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
                        <strong className="text-[10px] font-black text-slate-900 uppercase tracking-wider">
                          Quadro de Instrumentos Avaliativos e Recuperações Paralelas:
                        </strong>
                        <div className="flex items-center gap-2 text-[8px]">
                          <span className="inline-flex items-center gap-1 font-bold text-slate-700">
                            <span className="w-3.5 h-3.5 rounded bg-slate-900 text-foreground flex items-center justify-center text-[7px]">A</span> Atividade Regular
                          </span>
                          <span className="inline-flex items-center gap-1 font-bold text-amber-900">
                            <span className="w-3.5 h-3.5 rounded bg-amber-600 text-foreground flex items-center justify-center text-[7px]">REC</span> Recuperação Paralela
                          </span>
                          <span className="inline-flex items-center gap-1 font-bold text-purple-900">
                            <span className="px-1 rounded bg-purple-100 text-purple-800 border border-purple-300 text-[7px]">Adapt.</span> Adaptação PEI
                          </span>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1.5">
                        {turmaData.activityMap.map((actItem: any) => (
                          <div
                            key={actItem.code}
                            className={`p-1.5 rounded border flex items-start gap-2 text-[10px] ${
                              actItem.isRecovery
                                ? 'bg-amber-50/70 border-amber-300'
                                : 'bg-white border-slate-200'
                            }`}
                          >
                            <span
                              className={`w-6 h-5 rounded font-black text-[8.5px] flex items-center justify-center shrink-0 ${
                                actItem.isRecovery
                                  ? 'bg-amber-600 text-foreground'
                                  : 'bg-slate-900 text-foreground'
                              }`}
                            >
                              {actItem.code}
                            </span>
                            <div className="min-w-0 flex-1">
                              <span className="font-bold text-slate-900 block truncate text-[10px]">
                                {actItem.activity.title}
                              </span>
                              <span className="text-[8px] text-slate-600 block">
                                {actItem.isRecovery ? 'Recuperação Paralela • ' : `Tipo: ${actItem.activity.type || 'Avaliação'} • `}
                                Valor: {actItem.maxGrade} pts • Prazo: {actItem.deadlineFormatted}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* TABELA DE ALUNOS, NOTAS E CONTROLE DE ENTREGAS */}
                  <div className="border border-slate-300 rounded-md mb-4 print:border-none print:rounded-none print:mb-2 overflow-visible">
                    <table className="w-full text-left text-[10px] border-collapse print:text-[9.5px]">
                      <thead className="bg-slate-100 text-slate-900 font-bold border-b border-slate-300 uppercase text-[9px] tracking-wider">
                        <tr className="rco-avoid-break">
                          <th className="py-1.5 px-2 w-7 text-center">Nº</th>
                          <th className="py-1.5 px-2.5">Nome do Aluno</th>
                          <th className="py-1.5 px-2 w-20 text-center">Matrícula</th>
                          <th className="py-1.5 px-1.5 w-12 text-center">Atend.</th>

                          {/* Colunas de Atividades Regulares e Recuperações */}
                          {turmaData.activityMap.map((actItem: any) => (
                            <th
                              key={actItem.code}
                              className={`py-1.5 px-2 w-10 text-center font-black border-l ${
                                actItem.isRecovery
                                  ? 'bg-amber-100 text-amber-950 border-amber-300'
                                  : 'text-slate-900 border-slate-200'
                              }`}
                              title={`${actItem.code}: ${actItem.activity.title} (${actItem.isRecovery ? 'Recuperação Paralela' : actItem.activity.type || 'Atividade'} - Valor: ${actItem.maxGrade} pts)`}
                            >
                              {actItem.code}
                            </th>
                          ))}

                          {/* Coluna de Entregas */}
                          <th className="py-1.5 px-2 w-16 text-center font-black text-slate-900 bg-slate-200 border-l border-slate-300">
                            Entregas
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {turmaData.studentRows.length === 0 ? (
                          <tr className="rco-avoid-break">
                            <td
                              colSpan={5 + turmaData.activityMap.length}
                              className="p-4 text-center text-muted italic"
                            >
                              Nenhum aluno cadastrado nesta turma.
                            </td>
                          </tr>
                        ) : (
                          turmaData.studentRows.map((row: any) => (
                            <tr
                              key={row.student.id}
                              className={`rco-avoid-break hover:bg-slate-50 transition-colors ${
                                row.deliveryStatusType === 'complete'
                                  ? 'bg-emerald-50/20'
                                  : row.deliveryStatusType === 'none'
                                  ? 'bg-slate-50/60'
                                  : ''
                              }`}
                            >
                              {/* Nº */}
                              <td className="py-1.5 px-2 text-center font-bold text-muted text-[10px]">
                                {String(row.index).padStart(2, '0')}
                              </td>

                              {/* Nome Completo + Destaque de Adaptação Realizada */}
                              <td className="py-1.5 px-2.5 font-bold text-slate-900 text-[10px]">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span>{row.student.fullName}</span>
                                  {row.hasUsedAdaptation && (
                                    <span
                                      className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[7.5px] font-black bg-purple-100 text-purple-800 border border-purple-300"
                                      title="Estudante realizou atividade com recurso/formato pedagógico adaptado (PEI/Inclusão)"
                                    >
                                      ★ Ativ. Adaptada
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* Matrícula */}
                              <td className="py-1.5 px-2 text-center font-mono text-slate-600 text-[9px]">
                                {row.student.matricula || '—'}
                              </td>

                              {/* Atendimento */}
                              <td className="py-1.5 px-1.5 text-center">
                                {row.isPne ? (
                                  <span className="px-1 py-0.2 rounded text-[7px] font-black bg-rose-100 text-rose-800 border border-rose-300">
                                    PNE
                                  </span>
                                ) : row.isRad ? (
                                  <span className="px-1 py-0.2 rounded text-[7px] font-black bg-amber-100 text-amber-800 border border-amber-300">
                                    RAD
                                  </span>
                                ) : (
                                  <span className="text-muted text-[8px]">Reg.</span>
                                )}
                              </td>

                              {/* Notas Individuais por Atividade / Recuperação */}
                              {row.gradesPerAct.map((gItem: any) => (
                                <td
                                  key={gItem.code}
                                  className={`py-1.5 px-2 text-center font-mono font-bold text-[10px] border-l ${
                                    gItem.isRecovery
                                      ? 'bg-amber-50/40 border-amber-200'
                                      : 'border-slate-200'
                                  }`}
                                >
                                  {gItem.grade !== null ? (
                                    <div className="flex flex-col items-center">
                                      <span
                                        className={
                                          gItem.isRecovery
                                            ? 'text-amber-900 font-black'
                                            : 'text-slate-900 font-bold'
                                        }
                                      >
                                        {gItem.grade.toFixed(1).replace('.', ',')}
                                      </span>
                                      {gItem.isAdaptedSubmission && (
                                        <span className="text-[6.5px] font-bold text-purple-700 leading-none">
                                          (adapt.)
                                        </span>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-muted font-normal">—</span>
                                  )}
                                </td>
                              ))}

                              {/* Entregas Feitas / Total */}
                              <td className="py-1.5 px-2 text-center font-mono font-bold text-[10px] bg-slate-100 border-l border-slate-300">
                                <span
                                  className={
                                    row.completedCount === row.totalActivities && row.totalActivities > 0
                                      ? 'text-emerald-900 font-black'
                                      : row.completedCount > 0
                                      ? 'text-amber-800 font-bold'
                                      : 'text-muted'
                                  }
                                >
                                  {row.completedCount}/{row.totalActivities}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Informações Especiais de Inclusão da Turma (PNE e RAD) e Explicação Pedagógica Final */}
                  <div className="space-y-2 mb-4 rco-avoid-break">
                    {includeSpecialNeeds && (turmaData.pneCount > 0 || turmaData.radCount > 0 || turmaData.studentsWithAdaptationCount > 0) && (
                      <div className="p-2.5 bg-amber-50/60 border border-amber-300 rounded-lg text-[9px] text-slate-800 space-y-1">
                        <strong className="font-bold text-amber-950 block uppercase text-[9px]">
                          Atendimento Educacional Especializado & Adaptações Curriculares:
                        </strong>
                        <div className="space-y-0.5">
                          {turmaData.studentRows
                            .filter((r: any) => r.isPne || r.isRad || r.hasUsedAdaptation)
                            .map((r: any) => (
                              <div key={r.student.id} className="flex items-start gap-1.5">
                                <span className="font-bold text-slate-900">• {r.student.fullName}:</span>
                                <span className="text-slate-700">
                                  {r.isPne
                                    ? `Estudante com Plano de Ensino Individualizado (PEI) ${r.student.pneConditions ? `- Diagnóstico: ${r.student.pneConditions}` : ''} ${r.student.secondTeacherName ? `| Segundo(a) Professor(a): ${r.student.secondTeacherName}` : ''}`
                                    : r.isRad
                                    ? 'Estudante em Regime de Atividades Domiciliares (RAD / Atestado Médico registrado)'
                                    : 'Atividade realizada com adequação metodológica de acessibilidade'}
                                  {r.hasUsedAdaptation ? ' • [Adaptação Curricular Realizada]' : ''}
                                </span>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* Explicação Final de Registro e Validação Pedagógica */}
                    <div className="p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-[8.5px] text-slate-700 leading-relaxed">
                      <strong className="text-slate-900 font-bold uppercase block text-[9px] mb-0.5">
                        Nota de Validação e Registro Oficial:
                      </strong>
                      <p>
                        Todas as <strong>atividades avaliativas regulares</strong> e <strong>recuperações paralelas</strong> aplicadas no período letivo foram devidamente registradas neste mapa de controle. As adaptações curriculares (PEI) constituem flexibilizações metodológicas e de acessibilidade garantidas por lei aos estudantes da Educação Especial, mantendo a correspondência à atividade base sem gerar colunas adicionais de notas, encontrando-se devidamente identificadas e arquivadas no dossiê pedagógico do docente.
                      </p>
                    </div>
                  </div>

                  {/* ASSINATURA COMPACTA NO FINAL DE CADA TURMA */}
                  {includeSignatures && (
                    <div className="mt-4 pt-3 border-t border-slate-300 rco-avoid-break">
                      <div className="grid grid-cols-2 gap-8 text-center text-[9px]">
                        <div>
                          <div className="border-b border-slate-400 pb-0.5 mb-0.5">
                            <strong className="block text-slate-900 font-bold">
                              {teacher.name || 'Prof. Gilson Flores'}
                            </strong>
                            <span className="text-[8px] text-slate-600">
                              Professor(a) de {teacher.subject || 'Sociologia'}
                            </span>
                          </div>
                          <span className="text-[7px] text-muted">Visto do Docente Responsável</span>
                        </div>

                        <div>
                          <div className="border-b border-slate-400 pb-0.5 mb-0.5">
                            <span className="block text-muted font-bold">
                              __________________________________________
                            </span>
                            <span className="text-[8px] text-slate-600 font-bold">
                              Especialista Pedagógico / Direção Escolar
                            </span>
                          </div>
                          <span className="text-[7px] text-muted">Visto da Coordenação</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Footer (no-print) */}
        <div className="no-print p-4 bg-surface border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-muted">
            <Info className="w-4 h-4 text-primary" />
            <span>
              Para gerar o PDF físico sem margens cortadas, utilize o comando <strong>Imprimir / Salvar em PDF</strong>.
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="py-2 px-5 bg-surface-hover hover:bg-white/15 text-foreground rounded-full text-xs font-bold transition-all cursor-pointer"
            >
              Fechar Visualização
            </button>
            <button
              onClick={handlePrint}
              className="py-2 px-6 bg-primary hover:bg-primary-hover text-white font-black rounded-full text-xs transition-all shadow-md cursor-pointer flex items-center gap-2"
            >
              <Printer className="w-4 h-4" />
              <span>Gerar PDF Agora</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
