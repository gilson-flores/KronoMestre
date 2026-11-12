'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  HeartHandshake,
  UserPlus, Users,
  Trash2,
  ShieldCheck,
  Mail,
  Phone,
  BookOpen,
  School,
  Smartphone,
  CheckCircle2,
  Clock,
  Sparkles,
  Search,
  PenTool,
  Gamepad2,
  Star,
  Check,
  HelpCircle,
  ArrowLeft,
  GraduationCap,
  KeyRound,
  X,
  ChevronDown,
  ChevronUp,
  FileText,
  Layers,
  ChevronRight,
  Info,
  MessageSquare,
  Pencil,
  Loader2
} from 'lucide-react';
import { hashPassword } from '@/lib/crypto';
import {
  TeacherUser,
  StudentUser,
  Activity,
  UserRole,
  ActivityQuestion,
  MultipleChoiceQuestion,
  EssayQuestion,
  ChatMessage
} from '@/lib/types';
import { NewSecondTeacherModal } from '@/components/modals/NewSecondTeacherModal';
import { EditSecondTeacherModal } from '@/components/modals/EditSecondTeacherModal';
import { ManageTutelageModal } from '@/components/modals/ManageTutelageModal';
import { SecondTeacherMessagesModal } from '@/components/modals/SecondTeacherMessagesModal';
import { ResetPasswordByTeacherModal } from '@/components/modals/ResetPasswordByTeacherModal';
import {
  canStudentAccessActivity,
  getActivityGradeDistribution,
  isStudentPNE
} from '@/lib/studentUtils';
import { extractCleanHtml } from '@/lib/adaptationUtils';
import { scrollToTop } from '@/lib/utils';
import { getScopedLocalStorageItem, setScopedLocalStorageItem } from '@/lib/cacheUtils';

export const SecondTeachersActivitiesTab: React.FC<any> = (props) => {
  const { activeStudent, activeTab, awaitingCorrectionActivities, boundOrPneStudents, essayInput, executingActivity, expandedActivityNotes, filteredStudents, getStudentBoundTeacherName, gradedActivities, handleConfirmSubmit, handleStartSolving, isAwaitingSectionOpen, isGradedSectionOpen, isMetricsRetractableOpen, isMobileSupportMaterialOpen, isPendingSectionOpen, isSecondTeacher, isStudentDossierOpen, isSubmitting, myTutelageStudents, objectiveInputs, pendingActivities, playfulScore, setEssayInput, setExecutingActivityId, setIsAwaitingSectionOpen, setIsGradedSectionOpen, setIsMetricsRetractableOpen, setIsMobileSupportMaterialOpen, setIsPendingSectionOpen, setIsStudentDossierOpen, setObjectiveInputs, setSelectedStudentId, setStudentSearch, setTutelaScope, studentAdaptedActivities, studentSearch, teacher, toggleActivityNotes, tutelaScope, tutelageMetrics } = props;
  return (
    <>
      {/* TAB 1: ALUNOS & ATIVIDADES ADAPTADAS */}
      {activeTab === 'atividades_alunos' && (
        <div className="space-y-5">
          {/* MENU RETRÁTIL 1: PAINEL DE MÉTRICAS & RESUMO */}
          <div className="glass-panel rounded-3xl border border-border bg-surface overflow-hidden transition-all shadow-md">
            <button
              onClick={() => setIsMetricsRetractableOpen(!isMetricsRetractableOpen)}
              className="w-full p-3.5 sm:p-4 flex items-center justify-between gap-3 text-left hover:bg-surface-hover transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-xl bg-amber-100 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                  <Layers className="w-3.5 h-3.5" />
                </div>
                <span className="font-bold text-foreground text-xs sm:text-sm">Resumo da Tutela AEE</span>
                <div className="hidden sm:flex items-center gap-2 text-[11px] text-muted border-l border-border pl-3">
                  <span className="bg-amber-400/10 text-amber-600 border border-amber-400/20 px-2 py-0.5 rounded-full font-bold">
                    {tutelageMetrics.totalTutelageStudents} {tutelageMetrics.totalTutelageStudents === 1 ? 'Aluno' : 'Alunos'}
                  </span>
                  <span className="bg-surface-hover text-muted px-2 py-0.5 rounded-full">
                    {tutelageMetrics.totalPending} Pendentes
                  </span>
                  <span className="bg-emerald-500/10 text-primary border border-emerald-500/20 px-2 py-0.5 rounded-full">
                    {tutelageMetrics.totalGraded} Concluídas
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-amber-400 font-bold shrink-0">
                <span>{isMetricsRetractableOpen ? 'Recolher' : 'Expandir'}</span>
                {isMetricsRetractableOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </button>

            {/* Expanded Metrics Content */}
            {isMetricsRetractableOpen && (
              <div className="p-4 pt-1 border-t border-border grid grid-cols-2 md:grid-cols-4 gap-3 animate-fadeIn">
                <div className="p-3.5 rounded-2xl border border-amber-400/30 bg-amber-500/10 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-400/20 border border-amber-400/30 flex items-center justify-center text-amber-600 shrink-0">
                    <GraduationCap className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[9px] font-bold uppercase text-amber-600 tracking-wider">Sob Sua Tutela</p>
                    <p className="text-lg font-black text-foreground">{tutelageMetrics.totalTutelageStudents} <span className="text-[10px] font-normal text-muted">Alunos</span></p>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl border border-border bg-background flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[9px] font-bold uppercase text-muted tracking-wider">A Fazer com Apoio</p>
                    <p className="text-lg font-black text-foreground">{tutelageMetrics.totalPending} <span className="text-[10px] font-normal text-muted">Atividades</span></p>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl border border-border bg-background flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 shrink-0">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[9px] font-bold uppercase text-muted tracking-wider">Em Análise (Regente)</p>
                    <p className="text-lg font-black text-foreground">{tutelageMetrics.totalToCorrect} <span className="text-[10px] font-normal text-muted">Enviadas</span></p>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl border border-border bg-background flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-primary shrink-0">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[9px] font-bold uppercase text-muted tracking-wider">Concluídas / Avaliadas</p>
                    <p className="text-lg font-black text-foreground">{tutelageMetrics.totalGraded} <span className="text-[10px] font-normal text-muted">Finalizadas</span></p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Main Layout: Left Column (Student List) + Right Column (Activities) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left Column: Lista de Alunos */}
            <div className="lg:col-span-4 space-y-4">
              <div className="glass-panel p-4 rounded-3xl border border-border bg-surface space-y-3 shadow-md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-amber-400" />
                    <h3 className="font-bold text-foreground text-xs sm:text-sm">
                      {isSecondTeacher ? 'Meus Alunos Tutelados' : 'Estudantes AEE'}
                    </h3>
                  </div>
                  <span className="px-2 py-0.5 bg-amber-400/10 text-amber-400 border border-amber-400/20 rounded-full text-[10px] font-bold">
                    {filteredStudents.length} {filteredStudents.length === 1 ? 'Aluno' : 'Alunos'}
                  </span>
                </div>

                {/* Se for Professor Regente, permite alternar escopo */}
                {!isSecondTeacher && (
                  <div className="grid grid-cols-2 p-1 bg-background rounded-2xl border border-border text-xs">
                    <button
                      onClick={() => setTutelaScope('minha_tutela')}
                      className={`py-1 px-2 rounded-xl font-bold transition-all cursor-pointer text-center text-[10px] ${
                        tutelaScope === 'minha_tutela'
                          ? 'bg-amber-400 text-black shadow'
                          : 'text-muted hover:text-foreground border border-transparent'
                      }`}
                    >
                      Minha Tutela ({myTutelageStudents.length})
                    </button>
                    <button
                      onClick={() => setTutelaScope('todos_pne')}
                      className={`py-1 px-2 rounded-xl font-bold transition-all cursor-pointer text-center text-[10px] ${
                        tutelaScope === 'todos_pne'
                          ? 'bg-amber-400 text-black shadow'
                          : 'text-muted hover:text-foreground border border-transparent'
                      }`}
                    >
                      Todos AEE ({boundOrPneStudents.length})
                    </button>
                  </div>
                )}

                {/* Search */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={studentSearch}
                    onChange={(e: any) => setStudentSearch(e.target.value)}
                    placeholder="Buscar aluno por nome, turma..."
                    className="w-full bg-background border border-border rounded-xl pl-8 pr-3 py-2 text-xs text-foreground placeholder:text-muted/50 focus:outline-none focus:border-amber-400"
                  />
                </div>

                {/* Student list */}
                <div className="space-y-1.5 max-h-[480px] overflow-y-auto pr-1">
                  {filteredStudents.length === 0 ? (
                    <div className="py-8 text-center text-xs text-muted space-y-2">
                      <p>Nenhum aluno encontrado para este filtro.</p>
                      {isSecondTeacher && (
                        <p className="text-[11px] text-muted/70">
                          Apenas os alunos vinculados a você ({teacher.name}) são exibidos aqui.
                        </p>
                      )}
                    </div>
                  ) : (
                    filteredStudents.map((s: any) => {
                      const isSelected = activeStudent?.id === s.id;
                      const boundTeacherName = getStudentBoundTeacherName(s);
                      const isBoundToMe =
                        s.secondTeacherId === teacher.id ||
                        (s.secondTeacherName && s.secondTeacherName.toLowerCase() === teacher.name?.toLowerCase()) ||
                        boundTeacherName === teacher.name;

                      return (
                        <div
                          key={s.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => {
                            setSelectedStudentId(s.id);
                            setExecutingActivityId(null);
                          }}
                          onKeyDown={(e: any) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              setSelectedStudentId(s.id);
                              setExecutingActivityId(null);
                            }
                          }}
                          className={`w-full text-left p-2.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-2.5 ${
                            isSelected
                              ? 'bg-amber-400/20 border-amber-400/60 shadow-md ring-1 ring-amber-400/40'
                              : 'bg-background border-border hover:border-border hover:bg-[#141e33]'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={s.avatarUrl}
                              alt={s.fullName}
                              loading="lazy"
                              decoding="async"
                              className="w-9 h-9 rounded-full object-cover border border-amber-400/40 shrink-0"
                            />
                            <div className="min-w-0 flex-1">
                              <h4 className="font-bold text-foreground text-xs truncate leading-tight">{s.fullName}</h4>
                              <p className="text-[10px] text-amber-600 font-medium truncate mt-0.5">
                                Turma {s.turma} {s.matricula ? `• Matrícula ${s.matricula}` : ''}
                              </p>
                            </div>
                          </div>

                          <ChevronRight className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-amber-400' : 'text-muted/40'}`} />
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Work Area & Activities */}
            <div className="lg:col-span-8 space-y-4">
              {/* If solving activity in fullscreen playful mode */}
              {executingActivity && (executingActivity.playfulGameHtml || executingActivity.adaptationType === 'severe_playful') ? (
                <div className="fixed inset-0 z-50 w-screen h-screen bg-[#070d19] flex flex-col p-2 sm:p-4 animate-fadeIn">
                  <div className="flex items-center justify-between gap-3 pb-2 px-2 border-b border-border">
                    <button
                      onClick={() => setExecutingActivityId(null)}
                      className="px-3.5 py-2 bg-[#171f33] hover:bg-[#222c42] text-foreground font-bold text-xs rounded-xl border border-border transition-all flex items-center gap-1.5 cursor-pointer shadow active:scale-95 shrink-0"
                    >
                      <ArrowLeft className="w-3.5 h-3.5 text-amber-400" />
                      <span>Voltar</span>
                    </button>

                    <div className="flex items-center gap-2 min-w-0">
                      <Gamepad2 className="w-4 h-4 text-amber-400 shrink-0" />
                      <span className="font-bold text-foreground text-xs sm:text-sm truncate">
                        {executingActivity.title}
                      </span>
                      <span className="text-[11px] text-amber-600 font-semibold bg-[#171f33] px-2 py-0.5 rounded-full border border-amber-500/30 hidden sm:inline">
                        Aluno: {activeStudent?.fullName}
                      </span>
                      {playfulScore && (
                        <span className="px-2.5 py-0.5 bg-primary/20 text-primary font-bold text-xs rounded-full border border-primary/30 hidden sm:flex items-center gap-1 shrink-0">
                          <Star className="w-3 h-3 fill-[#4ade80]" />
                          {playfulScore.grade} / {executingActivity.maxGrade || 10} pts
                        </span>
                      )}
                    </div>

                    <button
                      disabled={isSubmitting}
                      onClick={() => handleConfirmSubmit(executingActivity)}
                      className="px-4 py-2 bg-primary hover:bg-primary-hover text-white font-black text-xs rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-1.5 active:scale-95 shrink-0 disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{isSubmitting ? 'Enviando...' : 'Enviar Atividade'}</span>
                    </button>
                  </div>

                  <div className="flex-1 w-full rounded-2xl overflow-hidden border border-border bg-black shadow-2xl relative mt-2">
                    <iframe
                      srcDoc={
                        executingActivity.playfulGameHtml
                          ? extractCleanHtml(executingActivity.playfulGameHtml)
                          : '<div style="color:white;padding:20px;font-family:sans-serif;text-align:center;">Carregando jogo interativo...</div>'
                      }
                      title={`Jogo Lúdico - ${executingActivity.title}`}
                      className="w-full h-full border-0 block"
                      allow="autoplay; fullscreen"
                      sandbox="allow-scripts allow-same-origin allow-modals"
                    />
                  </div>
                </div>
              ) : executingActivity ? (
                /* Mobile Assist Simulator */
                <div className="glass-panel p-4 sm:p-5 rounded-3xl border border-amber-400/40 space-y-4 shadow-xl bg-[#0e162a]">
                  <div className="flex items-center justify-between gap-3 pb-3 border-b border-border">
                    <button
                      onClick={() => setExecutingActivityId(null)}
                      className="py-1.5 px-3 bg-surface-hover hover:bg-white/20 text-foreground rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5 text-amber-400" />
                      <span>Voltar</span>
                    </button>

                    <div className="flex items-center gap-2 truncate">
                      <Smartphone className="w-4 h-4 text-amber-400 shrink-0" />
                      <span className="font-bold text-foreground text-xs sm:text-sm truncate">
                        {executingActivity.title}
                      </span>
                    </div>

                    <span className="text-[10px] font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-full border border-primary/30 shrink-0">
                      {getActivityGradeDistribution(executingActivity).maxGrade.toFixed(1)} pts
                    </span>
                  </div>

                  {/* Simulator Screen Container */}
                  <div className="max-w-2xl mx-auto bg-surface rounded-2xl border border-white/15 p-4 sm:p-5 space-y-4 shadow-inner">
                    <div className="bg-[#171f33] p-3 rounded-xl border border-border flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={activeStudent?.avatarUrl}
                          alt={activeStudent?.fullName}
                          className="w-7 h-7 rounded-full object-cover border border-amber-400"
                        />
                        <div>
                          <p className="font-bold text-foreground leading-tight">{activeStudent?.fullName}</p>
                          <p className="text-[10px] text-amber-400">Turma {activeStudent?.turma}</p>
                        </div>
                      </div>
                      <span className="text-[9px] bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full font-bold border border-amber-500/30">
                        Resolução com Apoio AEE
                      </span>
                    </div>

                    {/* MENU RETRÁTIL NO SIMULADOR: Orientações & Material de Apoio */}
                    {(executingActivity.description || executingActivity.supportMaterial) && (
                      <div className="border border-border rounded-xl bg-background overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setIsMobileSupportMaterialOpen(!isMobileSupportMaterialOpen)}
                          className="w-full p-2.5 flex items-center justify-between text-left text-xs font-bold text-amber-600 hover:bg-surface-hover cursor-pointer"
                        >
                          <span className="flex items-center gap-1.5">
                            <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                            <span>Orientações & Material de Apoio</span>
                          </span>
                          {isMobileSupportMaterialOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>

                        {isMobileSupportMaterialOpen && (
                          <div className="p-3 pt-1 border-t border-border text-xs text-muted space-y-2">
                            {executingActivity.description && (
                              <p className="text-foreground leading-relaxed">{executingActivity.description}</p>
                            )}
                            {executingActivity.supportMaterial && (
                              <div className="p-2.5 bg-black/30 rounded-lg text-[11px] whitespace-pre-wrap">
                                {executingActivity.supportMaterial}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Multiple Choice Questions */}
                    {executingActivity.questions &&
                      executingActivity.questions.filter((q: any) => q.type === 'multiple_choice').length > 0 && (
                        <div className="space-y-3 pt-1">
                          <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                            <HelpCircle className="w-3.5 h-3.5 text-primary" />
                            <span>Questões Objetivas Adaptadas</span>
                          </h4>

                          {executingActivity.questions
                            .filter((q: any) => q.type === 'multiple_choice')
                            .map((q: any, qIdx: number) => {
                              const currentChoice = objectiveInputs[q.id];

                              return (
                                <div key={q.id || qIdx} className="bg-background p-3.5 rounded-xl border border-border space-y-2.5">
                                  <p className="text-xs font-bold text-foreground">
                                    {qIdx + 1}. <span className="text-foreground font-normal">{q.statement}</span>
                                  </p>

                                  <div className="space-y-1.5 pt-1">
                                    {q.options?.map((optText: string, optIdx: number) => {
                                      const isSelected = currentChoice === optIdx;

                                      return (
                                        <button
                                          key={optIdx}
                                          type="button"
                                          onClick={() =>
                                            setObjectiveInputs((prev: any) => ({
                                              ...prev,
                                              [q.id]: optIdx,
                                            }))
                                          }
                                          className={`w-full text-left p-2.5 rounded-xl text-xs transition-all flex items-center gap-2.5 border cursor-pointer ${
                                            isSelected
                                              ? 'bg-amber-400/20 border-amber-400 text-foreground font-bold shadow'
                                              : 'bg-[#171f33] border-border text-muted hover:bg-surface-hover hover:text-foreground'
                                          }`}
                                        >
                                          <span
                                            className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px] font-black ${
                                              isSelected ? 'bg-amber-400 text-black' : 'bg-surface-hover text-foreground'
                                            }`}
                                          >
                                            {String.fromCharCode(65 + optIdx)}
                                          </span>
                                          <span className="flex-1 text-xs">{optText}</span>
                                          {isSelected && <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      )}

                    {/* Essay Questions */}
                    {executingActivity.questions &&
                      executingActivity.questions.filter((q: any) => q.type === 'essay').length > 0 && (
                        <div className="space-y-3 pt-1">
                          <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                            <PenTool className="w-3.5 h-3.5 text-[#c0c1ff]" />
                            <span>Questão Dissertativa Adaptada</span>
                          </h4>

                          {executingActivity.questions
                            .filter((q: any) => q.type === 'essay')
                            .map((q: any, qIdx: number) => (
                              <div key={q.id || qIdx} className="bg-background p-3 rounded-xl border border-border">
                                <p className="text-xs text-foreground">{q.statement}</p>
                              </div>
                            ))}

                          <textarea
                            rows={4}
                            value={essayInput}
                            onChange={(e: any) => setEssayInput(e.target.value)}
                            placeholder="Digite a resposta com o estudante durante a mediação..."
                            className="w-full bg-background border border-white/15 rounded-xl p-3 text-xs text-foreground placeholder:text-muted/50 focus:outline-none focus:border-amber-400 leading-relaxed"
                          />
                        </div>
                      )}

                    {/* Actions */}
                    <div className="pt-3 border-t border-border flex items-center justify-between gap-3">
                      <button
                        onClick={() => setExecutingActivityId(null)}
                        className="py-2 px-4 bg-surface-hover hover:bg-surface-hover text-muted hover:text-foreground rounded-xl text-xs font-bold transition-all cursor-pointer"
                      >
                        Cancelar
                      </button>

                      <button
                        disabled={isSubmitting}
                        onClick={() => handleConfirmSubmit(executingActivity)}
                        className="py-2.5 px-5 bg-amber-400 hover:bg-amber-300 text-black font-extrabold text-xs rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-md disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>{isSubmitting ? 'Enviando...' : 'Concluir Atividade'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* Atividades listadas para o estudante selecionado */
                <div className="space-y-4">
                  {/* Selected Student Banner + MENU RETRÁTIL 2: FICHA DO ESTUDANTE / PEI */}
                  {activeStudent && (
                    <div className="glass-panel p-4 rounded-3xl border border-amber-400/30 bg-surface shadow-md space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={activeStudent.avatarUrl}
                            alt={activeStudent.fullName}
                            className="w-11 h-11 rounded-full object-cover border-2 border-amber-400/60 shrink-0"
                          />
                          <div className="min-w-0">
                            <h2 className="text-foreground font-extrabold text-sm sm:text-base truncate leading-tight">
                              {activeStudent.fullName}
                            </h2>
                            <p className="text-[11px] text-muted mt-0.5 truncate">
                              Turma <strong className="text-foreground">{activeStudent.turma}</strong>
                              {activeStudent.matricula && (
                                <> • Matrícula: <strong className="text-foreground">{activeStudent.matricula}</strong></>
                              )}
                            </p>
                          </div>
                        </div>

                        {/* Botão Retrátil da Ficha do PEI */}
                        <button
                          onClick={() => setIsStudentDossierOpen(!isStudentDossierOpen)}
                          className="py-1.5 px-3 bg-surface-hover hover:bg-surface-hover text-amber-600 font-bold rounded-xl border border-border transition-all flex items-center gap-1.5 cursor-pointer text-[11px] shrink-0"
                        >
                          <FileText className="w-3.5 h-3.5 text-amber-400" />
                          <span>{isStudentDossierOpen ? 'Recolher Ficha' : 'Ficha & PEI'}</span>
                          {isStudentDossierOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      </div>

                      {/* Conteúdo Retrátil da Ficha & PEI */}
                      {isStudentDossierOpen && (
                        <div className="pt-3 border-t border-border space-y-3 text-xs animate-fadeIn">
                          {activeStudent.pneConditions && activeStudent.pneConditions.length > 0 && (
                            <div className="space-y-1">
                              <p className="text-[10px] font-bold text-muted uppercase">Necessidades & Diagnósticos:</p>
                              <div className="flex flex-wrap gap-1">
                                {activeStudent.pneConditions.map((cond: any, i: any) => (
                                  <span
                                    key={i}
                                    className="px-2 py-0.5 bg-amber-400/15 text-amber-600 border border-amber-400/30 rounded-lg text-[10px] font-semibold"
                                  >
                                    {cond}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {activeStudent.pedagogicalNotes ? (
                            <div className="p-3 bg-background rounded-xl border border-border text-[11px] text-foreground leading-relaxed space-y-1">
                              <p className="font-bold text-amber-600 text-[10px] uppercase flex items-center gap-1">
                                <BookOpen className="w-3 h-3" /> Observações do PEI / Laudo
                              </p>
                              <p className="whitespace-pre-wrap">{activeStudent.pedagogicalNotes}</p>
                            </div>
                          ) : (
                            <p className="text-[11px] text-muted italic">Sem observações de PEI cadastradas.</p>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* MENUS RETRÁTEIS 3: ATIVIDADES POR STATUS (SANFONA / ACCORDION) */}
                  {studentAdaptedActivities.length === 0 ? (
                    <div className="glass-panel p-8 rounded-3xl border border-border bg-surface text-center space-y-2">
                      <Sparkles className="w-8 h-8 text-amber-400 mx-auto opacity-70" />
                      <h4 className="font-bold text-foreground text-sm">Nenhuma Atividade Adaptada para esta Turma</h4>
                      <p className="text-xs text-muted max-w-sm mx-auto">
                        Quando o professor regente disponibilizar ou adaptar atividades para a turma {activeStudent?.turma}, elas aparecerão aqui.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {/* ACCORDION 1: ATIVIDADES A FAZER */}
                      <div className="glass-panel rounded-3xl border border-border bg-surface overflow-hidden shadow-md">
                        <button
                          onClick={() => setIsPendingSectionOpen(!isPendingSectionOpen)}
                          className="w-full p-3.5 flex items-center justify-between gap-3 text-left hover:bg-surface-hover cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-amber-400" />
                            <h3 className="font-bold text-foreground text-xs sm:text-sm">
                              Atividades a Fazer com Suporte
                            </h3>
                            <span className="px-2 py-0.5 bg-amber-400/20 text-amber-600 border border-amber-400/30 rounded-full text-[10px] font-extrabold">
                              {pendingActivities.length}
                            </span>
                          </div>
                          <div className="text-xs text-amber-400 font-bold flex items-center gap-1">
                            {isPendingSectionOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </div>
                        </button>

                        {isPendingSectionOpen && (
                          <div className="p-3.5 pt-0 space-y-2.5 border-t border-border animate-fadeIn">
                            {pendingActivities.length === 0 ? (
                              <p className="text-xs text-muted italic py-2">Nenhuma atividade pendente a fazer para este aluno.</p>
                            ) : (
                              pendingActivities.map((act: any) => {
                                const distribution = getActivityGradeDistribution(act);
                                const isNotesOpen = Boolean(expandedActivityNotes[act.id]);

                                return (
                                  <div
                                    key={act.id}
                                    className="p-3.5 rounded-2xl border border-border bg-background space-y-2.5 hover:border-amber-400/40 transition-all"
                                  >
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                      <div>
                                        <div className="flex items-center gap-2">
                                          <span className="text-[9px] font-extrabold bg-amber-400/20 text-amber-600 px-2 py-0.2 rounded-full border border-amber-400/30">
                                            {act.isAdapted ? 'Adaptada PNE' : act.type}
                                          </span>
                                          {act.adaptationType === 'severe_playful' && (
                                            <span className="text-[9px] font-extrabold bg-purple-100 text-purple-600 px-2 py-0.2 rounded-full border border-purple-500/30">
                                              🎮 Lúdica
                                            </span>
                                          )}
                                          <span className="text-[10px] text-muted">
                                            Prazo: {act.deadline || 'Sem data'}
                                          </span>
                                        </div>
                                        <h4 className="text-sm font-bold text-foreground mt-1">{act.title}</h4>
                                      </div>

                                      <button
                                        onClick={() => handleStartSolving(act)}
                                        className="py-2 px-4 bg-amber-400 hover:bg-amber-300 text-black font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md shrink-0 active:scale-95"
                                      >
                                        <Smartphone className="w-3.5 h-3.5" />
                                        <span>Fazer no Celular com o Aluno</span>
                                      </button>
                                    </div>

                                    {/* Retractable activity description */}
                                    {act.description && (
                                      <div className="pt-1">
                                        <button
                                          type="button"
                                          onClick={() => toggleActivityNotes(act.id)}
                                          className="text-[10px] text-amber-600 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                                        >
                                          <Info className="w-3 h-3" />
                                          <span>{isNotesOpen ? 'Ocultar Orientações' : 'Ver Orientações'}</span>
                                        </button>
                                        {isNotesOpen && (
                                          <p className="text-xs text-muted mt-1.5 leading-relaxed bg-surface p-2.5 rounded-xl border border-border animate-fadeIn">
                                            {act.description}
                                          </p>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              })
                            )}
                          </div>
                        )}
                      </div>

                      {/* ACCORDION 2: AGUARDANDO CORREÇÃO DO REGENTE */}
                      <div className="glass-panel rounded-3xl border border-border bg-surface overflow-hidden shadow-md">
                        <button
                          onClick={() => setIsAwaitingSectionOpen(!isAwaitingSectionOpen)}
                          className="w-full p-3.5 flex items-center justify-between gap-3 text-left hover:bg-surface-hover cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-sky-400" />
                            <h3 className="font-bold text-foreground text-xs sm:text-sm">
                              Enviadas / Aguardando Parecer do Regente
                            </h3>
                            <span className="px-2 py-0.5 bg-sky-500/20 text-sky-300 border border-sky-500/30 rounded-full text-[10px] font-extrabold">
                              {awaitingCorrectionActivities.length}
                            </span>
                          </div>
                          <div className="text-xs text-sky-400 font-bold flex items-center gap-1">
                            {isAwaitingSectionOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </div>
                        </button>

                        {isAwaitingSectionOpen && (
                          <div className="p-3.5 pt-0 space-y-2.5 border-t border-border animate-fadeIn">
                            {awaitingCorrectionActivities.length === 0 ? (
                              <p className="text-xs text-muted italic py-2">Nenhuma atividade aguardando correção.</p>
                            ) : (
                              awaitingCorrectionActivities.map((act: any) => (
                                <div
                                  key={act.id}
                                  className="p-3.5 rounded-2xl border border-border bg-background flex items-center justify-between gap-3"
                                >
                                  <div>
                                    <span className="text-[9px] font-extrabold bg-sky-500/20 text-sky-300 px-2 py-0.2 rounded-full border border-sky-500/30">
                                      ⏳ Em Análise
                                    </span>
                                    <h4 className="text-sm font-bold text-foreground mt-1">{act.title}</h4>
                                  </div>

                                  <button
                                    onClick={() => handleStartSolving(act)}
                                    className="py-1.5 px-3 bg-surface-hover hover:bg-white/20 text-foreground font-bold text-xs rounded-xl transition-all cursor-pointer shrink-0"
                                  >
                                    Editar Resposta
                                  </button>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>

                      {/* ACCORDION 3: CONCLUÍDAS E AVALIADAS */}
                      <div className="glass-panel rounded-3xl border border-border bg-surface overflow-hidden shadow-md">
                        <button
                          onClick={() => setIsGradedSectionOpen(!isGradedSectionOpen)}
                          className="w-full p-3.5 flex items-center justify-between gap-3 text-left hover:bg-surface-hover cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-primary" />
                            <h3 className="font-bold text-foreground text-xs sm:text-sm">
                              Concluídas e Avaliadas
                            </h3>
                            <span className="px-2 py-0.5 bg-emerald-100 text-primary border border-emerald-500/30 rounded-full text-[10px] font-extrabold">
                              {gradedActivities.length}
                            </span>
                          </div>
                          <div className="text-xs text-primary font-bold flex items-center gap-1">
                            {isGradedSectionOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </div>
                        </button>

                        {isGradedSectionOpen && (
                          <div className="p-3.5 pt-0 space-y-2.5 border-t border-border animate-fadeIn">
                            {gradedActivities.length === 0 ? (
                              <p className="text-xs text-muted italic py-2">Nenhuma atividade avaliada ainda.</p>
                            ) : (
                              gradedActivities.map((act: any) => {
                                const sub = act.submissions?.find(
                                  (s: any) =>
                                    s.studentId === activeStudent?.id ||
                                    s.matricula === activeStudent?.matricula ||
                                    s.studentName === activeStudent?.fullName
                                );
                                const totalScore = (sub?.objectiveScore || 0) + (sub?.essayScore || 0);

                                return (
                                  <div
                                    key={act.id}
                                    className="p-3.5 rounded-2xl border border-border bg-background space-y-2"
                                  >
                                    <div className="flex items-center justify-between gap-2">
                                      <h4 className="text-sm font-bold text-foreground">{act.title}</h4>
                                      <span className="font-extrabold text-xs text-primary bg-primary/15 px-2.5 py-0.5 rounded-full border border-primary/30 shrink-0">
                                        Nota: {totalScore.toFixed(1)} pts
                                      </span>
                                    </div>
                                    {sub?.teacherFeedback && (
                                      <p className="text-xs text-foreground italic bg-surface p-2 rounded-lg">
                                        &ldquo;{sub.teacherFeedback}&rdquo;
                                      </p>
                                    )}
                                  </div>
                                );
                              })
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </>
  );
};
