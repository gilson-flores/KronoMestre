import { GradingViewMainBody } from "@/components/parts/GradingViewMainBody";
'use client';

import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Save,
  RotateCcw,
  UserCheck,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Award,
  FileCheck2,
  FileText,
  Clock,
  UserX,
  ChevronDown,
  Check,
  Send,
  Loader2,
  Filter,
  GraduationCap,
  Zap,
  TrendingUp,
  ArrowRight,
  BookOpenCheck,
  Maximize2,
  ExternalLink,
} from 'lucide-react';
import { Activity, ActivitySubmission, StudentUser, EssayQuestion } from '@/lib/types';
import {
  canStudentAccessActivity,
  normalizeStudentName,
  getActivityGradeDistribution,
  isStudentPNE,
  getChildRecoveryActivities,
  getChildAdaptations,
  isActivityRecovery,
  isActivityAdapted,
  getSubmissionTotalGrade,
} from '@/lib/studentUtils';
import { GradeConsolidationModal } from '@/components/modals/GradeConsolidationModal';
import { Layers, GitFork, CheckCheck, HelpCircle } from 'lucide-react';
import { GradingLoadingSkeleton, StandardErrorState } from '@/components/LoadingState';

export const GradingSubmissionCardBody: React.FC<any> = (props) => {
  const { sub, activity, students, handleGenerateAiFeedback, handleScoreChange, handleExtraPointsChange, handleFeedbackChange, handleToggleStateSystem, handleSave, handleAiCorrection, distribution, isSaved, isLoadingAi, aiDiag, objectiveScore, essayScore, extraPoints, totalScore, maxEssayValue, studentInfo, recoveryLinkData, generatingFeedbackState, setConsolidationModalData } = props;
  return (
    <>
      <div
        key={sub.studentId}
        className="glass-panel p-4 sm:p-6 rounded-3xl border border-border space-y-4 sm:space-y-5 relative flex flex-col justify-between"
      >
        {/* Card Header: Student Info & Badges */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={sub.avatarUrl}
              alt={sub.studentName}
              loading="lazy"
              decoding="async"
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover border-2 border-border shrink-0"
            />
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-foreground truncate">{sub.studentName}</h3>
              <p className="text-[10px] text-text-muted uppercase tracking-wider truncate">
                {studentInfo?.turma ? `TURMA: ${studentInfo.turma} • ` : ''}MATRÍCULA: {sub.matricula}
              </p>
              {sub.groupMembers && (
                <p className="text-[10px] text-purple-600 mt-0.5 font-medium break-words">
                  👥 Grupo: {sub.groupMembers}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap sm:flex-col sm:items-end gap-1.5 w-full sm:w-auto">
            {/* Return Count Badge */}
            {(sub as any).originKind && (sub as any).originKind !== 'canonical' && (
              <span
                className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border flex items-center gap-1 ${
                  (sub as any).originKind === 'adapted'
                    ? 'bg-purple-100 text-purple-700 border-purple-300'
                    : 'bg-emerald-100 text-emerald-700 border-emerald-300'
                }`}
                title={`Entregue via ${(sub as any).originActivityTitle || 'atividade filha'}`}
              >
                <GitFork className="w-2.5 h-2.5" />
                {(sub as any).originKind === 'adapted' ? 'Adaptada PNE' : 'Recuperação'}
              </span>
            )}

            {sub.returnCount && sub.returnCount > 0 ? (
              <span
                className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                  sub.returnCount === 3
                    ? 'bg-rose-100 text-rose-600 border-rose-200'
                    : sub.returnCount === 2
                    ? 'bg-orange-600/20 text-orange-200 border-orange-500/40'
                    : 'bg-orange-500/20 text-orange-300 border-orange-500/30'
                }`}
              >
                ↩️ Devolvida {sub.returnCount}x {sub.returnCount >= 3 ? '(4ª Bloqueada)' : ''}
              </span>
            ) : null}

            {sub.tag && (
              <span
                className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                  sub.tag === 'PNE'
                    ? 'bg-primary/20 text-primary border border-primary/30'
                    : sub.tag === 'RAD'
                    ? 'bg-[#c0c1ff]/20 text-[#c0c1ff] border border-[#c0c1ff]/30'
                    : 'bg-[#171f33] text-text-muted'
                }`}
              >
                {sub.tag}
              </span>
            )}

            {/* Recovery status badge if linked */}
            {recoveryLinkData && (
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30 flex items-center gap-1">
                <RotateCcw className="w-3 h-3" />
                {recoveryLinkData.isRecoveryView ? 'Fez Recuperação' : 'Teve Recuperação'}
              </span>
            )}

            {/* Registration status badge in State System */}
            {sub.registeredInStateSystem ? (
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-600 border border-emerald-200 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                No RCO/SED
              </span>
            ) : (
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/30">
                Pendente RCO
              </span>
            )}
          </div>
        </div>

        {/* Student Essay Response Block */}
        {sub.essayAnswer && (
          <div className="bg-surface p-4 rounded-2xl border border-border space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-xs text-text-muted">
                Resposta Dissertativa do Aluno:
              </span>
              <span className="text-[10px] text-text-muted">
                {sub.essayAnswer.length} caracteres
              </span>
            </div>
            <p className="italic text-xs text-foreground leading-relaxed bg-background p-3 rounded-xl border border-border">
              &ldquo;{sub.essayAnswer}&rdquo;
            </p>

            {/* AI Correction Trigger Button */}
            <button
              onClick={() => handleAiCorrection(sub)}
              disabled={isLoadingAi}
              className="w-full mt-2 py-2.5 px-4 min-h-[44px] min-w-[44px] bg-gradient-to-r from-purple-600 via-indigo-600 to-primary-hover hover:from-purple-500 hover:to-primary text-foreground font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer disabled:opacity-50"
            >
              <Sparkles className={`w-4 h-4 ${isLoadingAi ? 'animate-spin' : ''}`} />
              <span>
                {isLoadingAi
                  ? 'Gemini analisando tema, palavras-chave e gramática...'
                  : 'Corrigir Produção Textual com Gemini (IA)'}
              </span>
            </button>
          </div>
        )}

        {/* AI Diagnostic Results Accordion / Card */}
        {aiDiag && (
          <div className="bg-[#1e1b4b]/60 border border-purple-500/30 rounded-2xl p-4 space-y-2.5 text-xs text-foreground animate-fadeIn">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-purple-500/20 pb-2">
              <div className="flex items-center gap-2 text-purple-600 font-bold">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span>Diagnóstico IA - Google Gemini</span>
              </div>
              {typeof aiDiag.aiUsagePercentage === 'number' && (
                <div
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold border ${
                    aiDiag.aiUsagePercentage <= 25
                      ? 'bg-emerald-100 text-emerald-600 border-emerald-200'
                      : aiDiag.aiUsagePercentage <= 60
                      ? 'bg-amber-100 text-amber-600 border-amber-200'
                      : 'bg-rose-100 text-rose-600 border-rose-200'
                  }`}
                >
                  <span>🤖 Uso Estimado de IA: {Math.round(aiDiag.aiUsagePercentage)}%</span>
                  {aiDiag.aiUsagePercentage <= 25 ? (
                    <span className="text-[10px] font-normal text-emerald-200">(Autoria & Pesquisa Recompensada ✨)</span>
                  ) : aiDiag.aiUsagePercentage > 60 ? (
                    <span className="text-[10px] font-normal text-rose-200">(Suspeita de Cópia Integral)</span>
                  ) : null}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1">
              <div className="bg-surface/80 p-2.5 rounded-xl border border-border">
                <span className="text-purple-600 font-bold block mb-0.5">🎯 Fidelidade ao Tema:</span>
                <p className="text-text-muted">{aiDiag.themeFidelity}</p>
              </div>

              <div className="bg-surface/80 p-2.5 rounded-xl border border-border">
                <span className="text-purple-600 font-bold block mb-0.5">🔑 Uso de Palavras-Chave:</span>
                <p className="text-text-muted">{aiDiag.keywordsCheck}</p>
              </div>

              <div className="bg-surface/80 p-2.5 rounded-xl border border-border">
                <span className="text-purple-600 font-bold block mb-0.5">📝 Estrutura Textual:</span>
                <p className="text-text-muted">{aiDiag.structureCheck}</p>
              </div>

              <div className="bg-surface/80 p-2.5 rounded-xl border border-border">
                <span className="text-purple-600 font-bold block mb-0.5">✍️ Gramática e Ortografia:</span>
                <p className="text-text-muted">{aiDiag.grammarCheck}</p>
              </div>

              {aiDiag.aiUsageAnalysis && (
                <div className="sm:col-span-2 bg-surface/90 p-2.5 rounded-xl border border-purple-500/20 flex flex-col gap-1">
                  <span className="text-purple-600 font-bold flex items-center gap-1.5">
                    <span>🔬 Análise de Autoria, Pesquisa e Uso de IA:</span>
                  </span>
                  <p className="text-foreground text-[11px] leading-relaxed">
                    {aiDiag.aiUsageAnalysis}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Scores & Extra Points Input Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3">
          {/* Objective Score (Only shown if activity has objective questions) */}
          {distribution.hasObjective && (
            <div className="col-span-2 sm:col-span-1 bg-surface p-3 rounded-2xl border border-border flex sm:block items-center justify-between">
              <span className="block text-[9px] font-bold text-text-muted uppercase tracking-wider sm:mb-1">
                Objetivas
              </span>
              <div className="text-base sm:text-lg font-extrabold text-primary">
                {objectiveScore.toFixed(1)}{' '}
                <span className="text-xs text-text-muted font-normal">/ {distribution.maxObjectiveGrade.toFixed(1)}</span>
              </div>
            </div>
          )}

          {/* Essay Score */}
          <div className="bg-surface p-3 rounded-2xl border border-border">
            <span className="block text-[9px] font-bold text-text-muted uppercase tracking-wider mb-1">
              Dissertativa
            </span>
            <div className="flex items-baseline gap-1">
              <input
                type="number"
                step="0.5"
                min="0"
                max={maxEssayValue}
                value={sub.essayScore !== undefined ? sub.essayScore : ''}
                onChange={(e: any) => handleScoreChange(sub.studentId, e.target.value)}
                placeholder="-"
                className="w-12 sm:w-14 bg-[#171f33] border border-border rounded-xl px-2 py-1 text-base font-extrabold text-foreground text-center focus:outline-none focus:border-primary"
              />
              <span className="text-xs text-text-muted font-normal">/ {maxEssayValue.toFixed(1)}</span>
            </div>
          </div>

          {/* Extra Points by Teacher */}
          <div className="bg-surface p-3 rounded-2xl border border-amber-500/20">
            <span className="block text-[9px] font-bold text-amber-600 uppercase tracking-wider mb-1 flex items-center gap-1 truncate">
              <Award className="w-3 h-3 shrink-0" /> Ponto Extra
            </span>
            <input
              type="number"
              step="0.5"
              min="0"
              max="3"
              value={sub.extraPoints || 0}
              onChange={(e: any) => handleExtraPointsChange(sub.studentId, e.target.value)}
              className="w-full bg-[#171f33] border border-amber-500/30 rounded-xl px-2 py-1 text-base font-extrabold text-amber-600 text-center focus:outline-none focus:border-amber-400"
            />
          </div>
        </div>

        {/* Calculated Final Total Score Banner */}
        <div className="bg-gradient-to-r from-[#171f33] to-[#1e293b] p-3 rounded-2xl border border-border flex items-center justify-between">
          <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
            <Award className="w-4 h-4 text-amber-400" />
            Nota Final Total:
          </span>
          <span className="text-xl font-extrabold text-primary">
            {totalScore.toFixed(1)}{' '}
            <span className="text-xs text-text-muted">
              / {distribution.maxGrade.toFixed(1)}
            </span>
          </span>
        </div>

        {/* Visual Link: Consolidação de Notas da Recuperação Paralela (Resumo Compacto + Botão Janela Popup) */}
        {recoveryLinkData && (
          <div className="p-3 rounded-2xl bg-surface border border-primary/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-2 bg-primary/20 text-primary rounded-xl shrink-0">
                <RotateCcw className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-bold text-foreground">
                    Recuperação Paralela Vinculada
                  </span>
                  {recoveryLinkData.recalculatedFinalGrade !== null && (
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      Consolidada: {recoveryLinkData.recalculatedFinalGrade.toFixed(1)}
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-text-muted truncate">
                  {recoveryLinkData.isRecoveryView
                    ? `Raiz: "${recoveryLinkData.parentTitle}"`
                    : `Recuperação: "${recoveryLinkData.recoveryTitle}"`}
                </p>
              </div>
            </div>

            {/* Botão para Abrir Janela Popup Completa de Consolidação */}
            <button
              type="button"
              onClick={() => {
                const currentStudentUser = students.find((s: any) => s.id === sub.studentId);
                setConsolidationModalData({
                  data: recoveryLinkData,
                  studentName: sub.studentName || currentStudentUser?.fullName || 'Aluno',
                  matricula: currentStudentUser?.matricula || sub.matricula,
                  turma: currentStudentUser?.turma || activity.turma,
                });
              }}
              className="w-full sm:w-auto justify-center px-3.5 py-1.5 min-h-[44px] min-w-[44px] bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
              title="Abrir registros detalhados de consolidação em janela popup"
            >
              <Maximize2 className="w-3.5 h-3.5 shrink-0" />
              <span>Ver Consolidação Completa</span>
            </button>
          </div>
        )}

        {/* Teacher Feedback Textarea */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-1.5 gap-2">
            <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wider">
              Feedback Pedagógico ao Aluno
            </label>
            <div className="flex items-center gap-1.5 flex-wrap">
              {/* Botão Feedback Gamificado (400 chars) */}
              <button
                type="button"
                onClick={() => handleGenerateAiFeedback(sub, sub.status === 'returned' ? 'returned' : 'graded', 'gamified')}
                disabled={Boolean(generatingFeedbackState?.studentId === sub.studentId)}
                className="px-2.5 py-1 min-h-[44px] min-w-[44px] bg-amber-100 hover:bg-amber-500/30 border border-amber-200 text-amber-600 font-bold rounded-lg text-[10px] flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                title="Gerar feedback pedagógico e descontraído limitado a 400 caracteres com Gemini"
              >
                {generatingFeedbackState?.studentId === sub.studentId && generatingFeedbackState?.type === 'gamified' ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin text-amber-400" />
                    <span>Gerando criatividade... 🚀</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    <span>Feedback Descontraído ⚡</span>
                  </>
                )}
              </button>

              {/* Botão Feedback do Professor (400 chars) */}
              <button
                type="button"
                onClick={() => handleGenerateAiFeedback(sub, sub.status === 'returned' ? 'returned' : 'graded', 'serious')}
                disabled={Boolean(generatingFeedbackState?.studentId === sub.studentId)}
                className="px-2.5 py-1 min-h-[44px] min-w-[44px] bg-blue-100 hover:bg-primary/30 border border-blue-200 text-primary-hover font-bold rounded-lg text-[10px] flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                title="Gerar feedback pedagógico do professor (acolhedor e motivador, limitado a 400 caracteres) com Gemini"
              >
                {generatingFeedbackState?.studentId === sub.studentId && generatingFeedbackState?.type === 'serious' ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin text-blue-400" />
                    <span>Gerando Feedback... 🎓</span>
                  </>
                ) : (
                  <>
                    <GraduationCap className="w-3.5 h-3.5 text-blue-400" />
                    <span>Feedback Professor 🎓</span>
                  </>
                )}
              </button>

              <span className="text-[10px] text-text-muted font-medium ml-1">
                {(sub.teacherFeedback || '').length}/400
              </span>
            </div>
          </div>
          <textarea
            rows={3}
            maxLength={400}
            value={sub.teacherFeedback || ''}
            onChange={(e: any) => handleFeedbackChange(sub.studentId, e.target.value)}
            placeholder="Feedback motivacional ou formal, observações sobre a resposta e recomendações de estudo..."
            className="w-full bg-surface border border-border rounded-2xl p-3.5 text-xs text-foreground placeholder-text-muted focus:outline-none focus:border-primary transition-all resize-none"
          />
        </div>

        {/* Checkbox for Registration in State System */}
        <div className="pt-1">
          <label className="flex items-start sm:items-center gap-2.5 cursor-pointer text-xs text-foreground select-none bg-surface p-3 rounded-2xl border border-border hover:bg-[#1a243b] transition-colors">
            <input
              type="checkbox"
              checked={!!sub.registeredInStateSystem}
              onChange={() => handleToggleStateSystem(sub.studentId)}
              className="w-4 h-4 accent-[#4ade80] rounded cursor-pointer shrink-0 mt-0.5 sm:mt-0"
            />
            <span className="font-semibold leading-tight sm:leading-normal">
              Atividade já registrada no sistema do estado (RCO / SED)
            </span>
          </label>
        </div>

        {/* Save success feedback toast */}
        {isSaved && (
          <div className={`p-3 rounded-2xl text-xs font-bold flex items-center gap-2 ${
            sub.status === 'returned'
              ? 'bg-amber-100 border border-amber-200 text-amber-600'
              : 'bg-primary/20 border border-primary/40 text-primary'
          }`}>
            <UserCheck className="w-4 h-4 shrink-0" />
            <span>
              {sub.status === 'returned'
                ? 'Atividade devolvida ao aluno para refazer!'
                : 'Nota e feedback registrados com sucesso!'}
            </span>
          </div>
        )}

        {/* Action Buttons: Save Grade / Return for Re-do */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 pt-2">
          <button
            onClick={() => handleSave(sub.studentId, 'graded')}
            className="w-full py-3 px-4 min-h-[44px] min-w-[44px] bg-primary hover:bg-primary-hover text-white font-bold rounded-full text-xs flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer text-center"
          >
            <Save className="w-4 h-4 shrink-0" />
            <span>{sub.status === 'graded' ? 'Salvar Nota' : 'Salvar e Finalizar'}</span>
          </button>

          {(sub.returnCount || 0) >= 3 ? (
            <button
              type="button"
              onClick={() => {
                alert('🚨 Bloqueio: Esta atividade já foi devolvida 3 vezes ao aluno. A 4ª devolução está BLOQUEADA! Por favor, atribua a nota final e clique em Salvar e Finalizar.');
              }}
              className="w-full py-3 px-4 min-h-[44px] min-w-[44px] bg-rose-500/10 text-rose-600 font-bold rounded-full text-xs border border-rose-500/30 flex items-center justify-center gap-2 transition-all cursor-not-allowed opacity-90 text-center"
              title="A 4ª devolução está bloqueada pelo sistema. Atribua a nota final."
            >
              <RotateCcw className="w-4 h-4 text-rose-400 shrink-0" />
              <span>Devolvida 3x (4ª Bloqueada)</span>
            </button>
          ) : (
            <button
              onClick={() => handleSave(sub.studentId, 'returned')}
              className="w-full py-3 px-4 min-h-[44px] min-w-[44px] bg-transparent hover:bg-surface-hover text-foreground font-bold rounded-full text-xs border border-border flex items-center justify-center gap-2 transition-all cursor-pointer text-center"
            >
              <RotateCcw className="w-4 h-4 shrink-0" />
              <span>
                {sub.returnCount ? `Devolver para Refazer (${sub.returnCount}x)` : 'Devolver para Refazer'}
              </span>
            </button>
          )}
        </div>
      </div>
    </>
  );
};
