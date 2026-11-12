'use client';

import React, { useState } from 'react';
import {
  X,
  Plus,
  BookOpen,
  Trash2,
  HelpCircle,
  FileText,
  Users,
  CheckCircle2,
  Link2,
  Sparkles,
  Gamepad2,
  Cpu,
  Loader2,
  Layers,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  KeyRound,
  Lock,
  AlertTriangle,
  AlertCircle,
} from 'lucide-react';
import { Activity, ActivityQuestion, ActivityType, StudentUser, GameMode, GameExecutionContext, GameData } from '@/lib/types';
import { doesTurmaHavePNEStudent, canStudentAccessActivity, isStudentPNE, getOriginalTurmas } from '@/lib/studentUtils';
import { TurmaMultiSelect } from '@/components/TurmaMultiSelect';
import {
  createAdaptedMildModerateActivity,
  createAdaptedSeverePlayfulActivity,
} from '@/lib/adaptationUtils';

export const NewActivityModalBody: React.FC<any> = (props) => {
  const { onClose, availableTurmas, selectedTurmas, setSelectedTurmas, availableParentActivities, pneStudentsInSelectedTurmas, handleGenerateGameWithGemini, handleAddMultipleChoice, handleAddEssay, handleRemoveQuestion, handleUpdateMCQuestion, handleUpdateMCOption, handleUpdateEssayQuestion, handleSubmit, title, setTitle, subject, setSubject, description, setDescription, supportMaterial, setSupportMaterial, supportLinkInput, setSupportLinkInput, type, setType, recoveryFromId, setRecoveryFromId, deadlineDateTime, setDeadlineDateTime, maxGrade, setMaxGrade, allowGroupWork, setAllowGroupWork, isStandaloneAdaptation, setIsStandaloneAdaptation, gameExecutionContext, setGameExecutionContext, gameMode, setGameMode, isGeneratingGame, gameData, gameGenError, includedPneStudentIds, setIncludedPneStudentIds, isPneDropdownOpen, setIsPneDropdownOpen, securityFocusLock, setSecurityFocusLock, securityBlockCopyStatement, setSecurityBlockCopyStatement, securityBlockPasteEssay, setSecurityBlockPasteEssay, questions } = props;
  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="w-full max-w-2xl bg-background rounded-3xl border border-border p-5 sm:p-8 space-y-6 shadow-2xl relative my-auto max-h-[90vh] overflow-y-auto custom-scrollbar animate-fadeIn">
        
        {/* Header */}
        <div className="flex items-start justify-between border-b border-border pb-4 pr-10 relative">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 text-primary rounded-2xl border border-primary/20 shrink-0">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-foreground leading-snug">Criar Atividade no Studio</h2>
              <p className="text-xs text-muted">Cadastre avaliações, redações ou exercícios interativos</p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="p-2.5 text-muted hover:text-foreground rounded-full hover:bg-surface-hover transition-colors cursor-pointer absolute top-0 right-0 min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Fechar Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          
          {/* Título e Disciplina */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-muted mb-1">
                Título da Atividade *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e: any) => setTitle(e.target.value)}
                placeholder="Ex: Simulado: Ação Social e Instituições"
                className="w-full bg-surface border border-border rounded-2xl px-4 py-3 text-sm text-foreground placeholder-[#869486] focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted mb-1">
                Disciplina
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e: any) => setSubject(e.target.value)}
                placeholder="Ex: Sociologia"
                className="w-full bg-surface border border-border rounded-2xl px-4 py-3 text-xs text-foreground placeholder-[#869486] focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          {/* Turmas, Prazo e Tipo */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-muted mb-1">
                Turmas *
              </label>
              <TurmaMultiSelect
                selectedTurmas={selectedTurmas}
                onChange={setSelectedTurmas}
                options={availableTurmas}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted mb-1">
                Prazo Final (Data e Hora)
              </label>
              <input
                type="datetime-local"
                value={deadlineDateTime}
                onChange={(e: any) => setDeadlineDateTime(e.target.value)}
                className="w-full bg-surface border border-border rounded-2xl px-3 py-3 text-xs text-foreground focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted mb-1">
                Tipo
              </label>
              <select
                value={type}
                onChange={(e: any) => {
                  const selectedType = e.target.value as ActivityType;
                  setType(selectedType);
                  if (selectedType === 'Trabalho em grupo') {
                    setAllowGroupWork(true);
                  } else if (selectedType === 'Recuperação Paralela') {
                    setAllowGroupWork(false);
                    // Pre-select first parent activity if available and none selected yet
                    if (!recoveryFromId && availableParentActivities.length > 0) {
                      const firstParent = availableParentActivities[0];
                      setRecoveryFromId(firstParent.id);
                      if (firstParent.turma) {
                        const parsed = firstParent.turma.split(/[,;]+/).map((t: any) => t.trim()).filter(Boolean);
                        if (parsed.length > 0) setSelectedTurmas(parsed);
                      }
                      if (firstParent.subject) setSubject(firstParent.subject);
                      if (firstParent.maxGrade) setMaxGrade(firstParent.maxGrade);
                      const cleanTitle = firstParent.title.replace(/^\[.*?\]\s*/i, '');
                      setTitle(`[Recuperação Paralela] ${cleanTitle}`);
                      if (!description) {
                        setDescription(`Recuperação Paralela com abordagem diferenciada subordinada à avaliação "${cleanTitle}".`);
                      }
                    }
                  }
                }}
                className="w-full bg-surface border border-border rounded-2xl px-3 py-3 text-xs text-foreground focus:outline-none focus:border-primary"
              >
                <option value="Avaliação" className="bg-background">Avaliação</option>
                <option value="Jogo Avaliativo" className="bg-background">🎮 Jogo Avaliativo (KronoGames)</option>
                <option value="Simulado" className="bg-background">Simulado</option>
                <option value="Redação" className="bg-background">Redação</option>
                <option value="Dinâmica" className="bg-background">Dinâmica</option>
                <option value="Trabalho em grupo" className="bg-background">Trabalho em grupo</option>
                <option value="Projeto de pesquisa" className="bg-background">Projeto de pesquisa</option>
                <option value="Recuperação Paralela" className="bg-background">Recuperação Paralela</option>
              </select>
            </div>
          </div>

          {/* KRONOGAMES CONFIGURATION SECTION */}
          {type === 'Jogo Avaliativo' && (
            <div className="bg-gradient-to-br from-primary/10 via-surface to-surface p-5 sm:p-6 rounded-3xl border border-primary/30 space-y-4 shadow-xl animate-fadeIn">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-primary text-black">
                    <Gamepad2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-foreground">
                      Configuração do KronoGame
                    </h4>
                    <p className="text-[11px] text-muted">
                      Jogos avaliativos interativos com inclusão PNE embutida e custo zero na partida
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-primary/20 text-primary border border-primary/30">
                  Custo Zero na Partida
                </span>
              </div>

              {/* Contexto de Execução */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">
                    Contexto de Execução *
                  </label>
                  <select
                    value={gameExecutionContext}
                    onChange={(e: any) => {
                      const ctx = e.target.value as GameExecutionContext;
                      setGameExecutionContext(ctx);
                      if (ctx === 'classroom_group') {
                        setGameMode('millionaire');
                      } else {
                        setGameMode('rpg_campaign');
                      }
                    }}
                    className="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary"
                  >
                    <option value="classroom_group">🏫 Sala de Aula (Dupla ou Grupo com PNE)</option>
                    <option value="homework_individual">🏠 Para Casa (Individual)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">
                    Modo de Jogo *
                  </label>
                  <select
                    value={gameMode}
                    onChange={(e: any) => setGameMode(e.target.value as GameMode)}
                    className="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary"
                  >
                    {gameExecutionContext === 'classroom_group' ? (
                      <>
                        <option value="millionaire">🏆 Arena do Milhão (Escada com Dicas dos Clássicos)</option>
                        <option value="dialectic_tribunal">⚖️ Tribunal Dialético (Julgamento do Senso Comum)</option>
                      </>
                    ) : (
                      <>
                        <option value="rpg_campaign">👑 Crônicas da Pólis (Campanha de RPG em 6 Atos)</option>
                        <option value="real_life_lab">🔬 Laboratório da Vida Real (Estudos de Casos Concretos)</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              {/* Standalone AEE Adaptation toggle */}
              <label className="flex items-start gap-3 p-3 bg-surface/70 rounded-2xl border border-border cursor-pointer hover:border-amber-500/40 transition-colors">
                <input
                  type="checkbox"
                  checked={isStandaloneAdaptation}
                  onChange={(e: any) => setIsStandaloneAdaptation(e.target.checked)}
                  className="w-4 h-4 rounded border-border bg-surface text-primary focus:ring-0 mt-0.5"
                />
                <div>
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    Atividade Adaptada AEE Independente (Sem Vínculo Obrigatório)
                  </span>
                  <p className="text-[10px] text-muted leading-relaxed">
                    Classifica este jogo como adaptação curricular autônoma para estudantes com laudo/deficiências.
                  </p>
                </div>
              </label>

              {/* Botão de Geração com IA */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleGenerateGameWithGemini}
                  disabled={isGeneratingGame}
                  className="w-full py-3.5 px-4 rounded-2xl bg-primary hover:bg-primary-hover text-black font-extrabold text-xs sm:text-sm shadow-lg shadow-primary/20 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
                >
                  {isGeneratingGame ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Gerando Roteiro com Gemini IA (6 Rodadas Inclusivas)...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>{gameData ? 'Regerar Roteiro do Jogo com Gemini' : 'Gerar Roteiro do Jogo com IA (Gemini)'}</span>
                    </>
                  )}
                </button>
              </div>

              {gameGenError && (
                <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl text-xs text-rose-400 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{gameGenError}</span>
                </div>
              )}

              {/* Feedback de sucesso na geração do jogo */}
              {gameData && (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl space-y-2 text-xs text-emerald-400 animate-fadeIn">
                  <div className="flex items-center gap-2 font-bold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Roteiro de 6 Rodadas Gerado com Sucesso!</span>
                  </div>
                  <p className="text-muted text-[11px] leading-relaxed">
                    {gameData.introText}
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1 text-[10px] font-bold">
                    <span className="px-2 py-0.5 rounded-md bg-surface border border-border text-foreground">
                      ✅ 6 Desafios Padrão
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      ✅ Rodadas PNE Leve/Mod Prontas
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      ✅ Cartões Lúdicos PNE Severo Prontos
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">
                      ⚡ Custo Zero: 0 chamadas no jogo dos alunos
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STANDALONE AEE ADAPTATION CHECKBOX FOR CONVENTIONAL ACTIVITIES */}
          {type !== 'Jogo Avaliativo' && (
            <label className="flex items-start gap-3 p-3.5 bg-surface rounded-2xl border border-border cursor-pointer hover:border-amber-500/40 transition-colors">
              <input
                type="checkbox"
                checked={isStandaloneAdaptation}
                onChange={(e: any) => setIsStandaloneAdaptation(e.target.checked)}
                className="w-4 h-4 rounded border-border bg-surface text-primary focus:ring-0 mt-0.5"
              />
              <div>
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  Atividade Adaptada AEE Independente (Sem Vínculo Obrigatório)
                </span>
                <p className="text-[10px] text-muted leading-relaxed">
                  Marque para salvar esta atividade diretamente como adaptação pedagógica autônoma, visível exclusivamente para o 2º Professor e estudantes com necessidades especiais (PNE).
                </p>
              </div>
            </label>
          )}
          {type === 'Recuperação Paralela' && (
            <div className="bg-surface border border-indigo-200 rounded-2xl p-4 space-y-3 shadow-lg animate-fadeIn">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl border border-indigo-500/30">
                  <RotateCcw className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-indigo-600">
                    Avaliação à qual esta Recuperação será subordinada
                  </h4>
                  <p className="text-[11px] text-muted">
                    A recuperação paralela é uma segunda chance para quem não aproveitou a 1ª atividade. Não gera pendência nem espera entrega de quem já entregou a original.
                  </p>
                </div>
              </div>

              {availableParentActivities.length === 0 ? (
                <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-xs text-indigo-200 space-y-1">
                  <p className="font-semibold text-foreground">Nenhuma avaliação base digital encontrada no sistema.</p>
                  <p className="text-[11px] text-muted">
                    Você poderá gravar esta recuperação paralela normalmente como exceção (ex: avaliação original feita em papel ou turma assumida). Ao clicar em Publicar/Gravar, um popup solicitará a digitação manual do nome da atividade e sua senha.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <select
                    value={recoveryFromId}
                    onChange={(e: any) => {
                      const selectedId = e.target.value;
                      setRecoveryFromId(selectedId);
                      if (selectedId) {
                        const parent = availableParentActivities.find((a: any) => a.id === selectedId);
                        if (parent) {
                          if (parent.turma) {
                            const parsed = parent.turma.split(/[,;]+/).map((t: any) => t.trim()).filter(Boolean);
                            if (parsed.length > 0) setSelectedTurmas(parsed);
                          }
                          if (parent.subject) setSubject(parent.subject);
                          if (parent.maxGrade) setMaxGrade(parent.maxGrade);
                          const cleanTitle = parent.title.replace(/^\[.*?\]\s*/i, '');
                          setTitle(`[Recuperação Paralela] ${cleanTitle}`);
                          setDescription(`Recuperação Paralela com abordagem diferenciada subordinada à avaliação "${cleanTitle}".`);
                        }
                      } else {
                        if (!title || title.startsWith('[Recuperação Paralela]')) {
                          setTitle('[Recuperação Paralela] ');
                        }
                      }
                    }}
                    className="w-full bg-surface border border-indigo-200 rounded-xl px-3 py-2.5 text-xs text-foreground focus:outline-none focus:border-indigo-400"
                  >
                    <option value="" className="bg-background text-amber-600">
                      -- Sem atividade mãe vinculada (Exceção: Atividade em Papel / Externa) --
                    </option>
                    {availableParentActivities.map((parent: any) => (
                      <option key={parent.id} value={parent.id} className="bg-background">
                        {parent.title} • Turma: {parent.turma} {parent.subject ? `• ${parent.subject}` : ''}
                      </option>
                    ))}
                  </select>

                  {recoveryFromId ? (
                    <div className="flex items-center gap-2 text-[11px] text-emerald-400 bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span>Subordinação vinculada: As turmas e métricas foram sincronizadas automaticamente com a atividade raiz.</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-[11px] text-amber-600 bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>Modo Exceção: Ao salvar sem vincular, um popup solicitará o nome da atividade em papel e sua senha.</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Janela / Lista Suspensa com Caixas de Seleção para Alunos PNE com Proficiência */}
          {pneStudentsInSelectedTurmas.length > 0 && (
            <div className="bg-surface border border-amber-500/30 rounded-2xl p-4 space-y-3 shadow-inner">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-amber-600 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                      Alunos PNE com Proficiência (Atividade Normal)
                    </span>
                    <span className="text-[10px] font-bold bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full border border-amber-500/30">
                      {pneStudentsInSelectedTurmas.length} PNE na(s) turma(s)
                    </span>
                  </div>
                  <p className="text-[11px] text-muted mt-0.5">
                    Selecione os alunos PNE que já atingiram proficiência para realizarem a <strong>atividade normal</strong> (evita retrocesso por desmotivação).
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsPneDropdownOpen((prev: any) => !prev)}
                  className="flex items-center justify-between sm:justify-center gap-2 px-3.5 py-2 bg-[#1a243c] hover:bg-[#223050] text-xs font-semibold text-foreground rounded-xl border border-border transition-colors cursor-pointer shrink-0"
                >
                  <span>
                    {includedPneStudentIds.length === 0
                      ? 'Nenhum incluído na normal'
                      : `${includedPneStudentIds.length} selecionado(s) para normal`}
                  </span>
                  {isPneDropdownOpen ? (
                    <ChevronUp className="w-4 h-4 text-amber-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-amber-400" />
                  )}
                </button>
              </div>

              {isPneDropdownOpen && (
                <div className="pt-3 border-t border-border space-y-3 animate-fadeIn">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted text-[11px]">
                      Marque para liberar a atividade normal:
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIncludedPneStudentIds(pneStudentsInSelectedTurmas.map((s: any) => s.id))}
                        className="text-[11px] text-primary hover:underline cursor-pointer font-medium"
                      >
                        Marcar todos
                      </button>
                      <span className="text-foreground/20">•</span>
                      <button
                        type="button"
                        onClick={() => setIncludedPneStudentIds([])}
                        className="text-[11px] text-rose-400 hover:underline cursor-pointer font-medium"
                      >
                        Desmarcar todos
                      </button>
                    </div>
                  </div>

                  <div className="max-h-48 overflow-y-auto custom-scrollbar space-y-1.5 pr-1">
                    {pneStudentsInSelectedTurmas.map((st: any) => {
                      const isSelected = includedPneStudentIds.includes(st.id);
                      const conditionText =
                        st.pneConditions && st.pneConditions.length > 0
                          ? st.pneConditions.join(', ')
                          : 'PNE';

                      return (
                        <label
                          key={st.id}
                          className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-amber-500/10 border-amber-200 text-foreground'
                              : 'bg-surface border-border text-muted hover:border-white/15'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e: any) => {
                                if (e.target.checked) {
                                  setIncludedPneStudentIds((prev: any) => [...prev, st.id]);
                                } else {
                                  setIncludedPneStudentIds((prev: any) => prev.filter((id: any) => id !== st.id));
                                }
                              }}
                              className="w-4 h-4 rounded border-border text-amber-500 focus:ring-amber-400 focus:ring-offset-0 bg-surface cursor-pointer"
                            />
                            <div className="truncate">
                              <span className="text-xs font-semibold text-foreground block truncate">
                                {st.fullName}
                              </span>
                              <span className="text-[10px] text-[#869486] block truncate">
                                Turma: <strong className="text-muted">{st.turma}</strong> • {conditionText}
                              </span>
                            </div>
                          </div>

                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0 ml-2 ${
                              isSelected
                                ? 'bg-emerald-100 text-emerald-600 border border-emerald-500/30'
                                : 'bg-surface-hover text-[#869486]'
                            }`}
                          >
                            {isSelected ? 'Atividade Normal' : 'Ativ. Adaptada'}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Nota Máxima e Permitir Trabalho em Grupo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-surface/60 p-4 rounded-2xl border border-border">
            <div>
              <label className="block text-xs font-semibold text-muted mb-1">
                Nota Máxima Oficial (0 a 10)
              </label>
              <input
                type="number"
                min={0}
                max={10}
                step={0.5}
                value={maxGrade}
                onChange={(e: any) => setMaxGrade(Number(e.target.value))}
                className="w-full bg-surface border border-border rounded-2xl px-4 py-2.5 text-sm font-bold text-primary focus:outline-none focus:border-primary"
              />
            </div>

            <div className="flex flex-col justify-center">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allowGroupWork}
                  onChange={(e: any) => setAllowGroupWork(e.target.checked)}
                  className="w-5 h-5 rounded border-border bg-surface text-primary focus:ring-[#4ade80] focus:ring-offset-0 cursor-pointer"
                />
                <div>
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-primary" />
                    Permitir Atividade em Grupo?
                  </span>
                  <p className="text-[10px] text-muted">
                    Quando ativo, os alunos podem escolher os membros da equipe no envio.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Travas de Segurança Anti-Cola */}
          <div className="bg-surface p-4 rounded-2xl border border-amber-500/30 space-y-3">
            <h4 className="text-xs font-bold text-amber-600 uppercase tracking-wider flex items-center gap-2">
              <span>🛡️ Travas de Segurança Anti-Cola</span>
            </h4>
            <p className="text-[11px] text-muted">
              Ative os mecanismos de integridade para avaliações e provas:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <label className="flex items-start gap-2.5 cursor-pointer bg-background p-3 rounded-xl border border-border hover:border-amber-200 transition-colors">
                <input
                  type="checkbox"
                  checked={securityFocusLock}
                  onChange={(e: any) => setSecurityFocusLock(e.target.checked)}
                  className="w-4 h-4 rounded border-border bg-surface text-primary focus:ring-[#4ade80] mt-0.5"
                />
                <div>
                  <span className="text-xs font-bold text-foreground block">Trava de Foco</span>
                  <span className="text-[10px] text-muted block leading-tight mt-0.5">
                    Gera avisos ao sair da tela e auto-entrega no 4º aviso.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-2.5 cursor-pointer bg-background p-3 rounded-xl border border-border hover:border-amber-200 transition-colors">
                <input
                  type="checkbox"
                  checked={securityBlockCopyStatement}
                  onChange={(e: any) => setSecurityBlockCopyStatement(e.target.checked)}
                  className="w-4 h-4 rounded border-border bg-surface text-primary focus:ring-[#4ade80] mt-0.5"
                />
                <div>
                  <span className="text-xs font-bold text-foreground block">Bloquear Cópia</span>
                  <span className="text-[10px] text-muted block leading-tight mt-0.5">
                    Impede copiar enunciados e textos com Ctrl+C e botão direito.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-2.5 cursor-pointer bg-background p-3 rounded-xl border border-border hover:border-amber-200 transition-colors">
                <input
                  type="checkbox"
                  checked={securityBlockPasteEssay}
                  onChange={(e: any) => setSecurityBlockPasteEssay(e.target.checked)}
                  className="w-4 h-4 rounded border-border bg-surface text-primary focus:ring-[#4ade80] mt-0.5"
                />
                <div>
                  <span className="text-xs font-bold text-foreground block">Bloquear Cola</span>
                  <span className="text-[10px] text-muted block leading-tight mt-0.5">
                    Bloqueia colar texto (Ctrl+V) na resposta dissertativa.
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* Material de Apoio / Texto Base */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-muted mb-1">
              Material de Apoio / Texto Base
            </label>
            <textarea
              rows={3}
              value={supportMaterial}
              onChange={(e: any) => setSupportMaterial(e.target.value)}
              placeholder="Insira aqui o texto base para leitura, citações, referências bibliográficas..."
              className="w-full bg-surface border border-border rounded-2xl p-3.5 text-xs text-foreground placeholder-[#869486] focus:outline-none focus:border-primary resize-y"
            />

            {/* Injetor / Adicionador de Links */}
            <div className="bg-background p-3 rounded-2xl border border-border space-y-2">
              <label className="block text-[11px] font-bold text-sky-300 flex items-center gap-1.5">
                <Link2 className="w-3.5 h-3.5 text-sky-400" />
                <span>Adicionar Link ao Material de Apoio (Google Drive, YouTube, Artigo, PDF)</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={supportLinkInput}
                  onChange={(e: any) => setSupportLinkInput(e.target.value)}
                  placeholder="https://drive.google.com/file/... ou https://youtube.com/..."
                  className="flex-1 bg-surface border border-border rounded-xl px-3 py-2 text-xs text-foreground placeholder-[#869486] focus:outline-none focus:border-sky-400 font-mono"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!supportLinkInput.trim()) return;
                    let url = supportLinkInput.trim();
                    if (!url.startsWith('http://') && !url.startsWith('https://')) {
                      url = `https://${url}`;
                    }
                    const linkString = `🔗 Link de Apoio: ${url}`;
                    setSupportMaterial((prev: any) => (prev ? `${prev}\n\n${linkString}` : linkString));
                    setSupportLinkInput('');
                  }}
                  className="px-3.5 py-2 bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 font-bold rounded-xl text-xs border border-sky-400/40 transition-all flex items-center gap-1.5 cursor-pointer shrink-0 active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Adicionar Link</span>
                </button>
              </div>
            </div>
          </div>



          {/* Seção de Questões */}
          <div className="space-y-4 pt-2 border-t border-border">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-primary" />
                  Questões da Atividade ({questions.length})
                </h3>
                <p className="text-[11px] text-muted">Adicione questões objetivas e dissertativas</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAddMultipleChoice}
                  className="px-3 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl text-xs font-bold border border-primary/30 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Add Múltipla Escolha</span>
                </button>

                <button
                  type="button"
                  onClick={handleAddEssay}
                  className="px-3 py-2 bg-primary/10 hover:bg-blue-100 text-primary-hover rounded-xl text-xs font-bold border border-primary/30 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>+ Add Redação / Dissertativa</span>
                </button>
              </div>
            </div>

            {/* Renderizar Lista de Questões */}
            <div className="space-y-4">
              {questions.map((q: any, qIndex: any) => {
                if (q.type === 'multiple_choice') {
                  return (
                    <div
                      key={q.id}
                      className="bg-surface border border-border rounded-2xl p-4 space-y-3 relative group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-full border border-primary/20">
                          Questão {qIndex + 1} • Múltipla Escolha (4 Respostas)
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveQuestion(q.id)}
                          className="text-rose-400 hover:text-rose-600 p-1 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                          title="Remover Questão"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div>
                        <label className="block text-[11px] text-muted font-semibold mb-1">
                          Enunciado da Questão
                        </label>
                        <textarea
                          rows={2}
                          value={q.statement}
                          onChange={(e: any) => handleUpdateMCQuestion(q.id, 'statement', e.target.value)}
                          placeholder="Digite o enunciado da questão..."
                          className="w-full bg-background border border-border rounded-xl p-3 text-xs text-foreground placeholder-[#869486] focus:outline-none focus:border-primary"
                        />
                      </div>

                      <div className="space-y-2 pt-1">
                        <label className="block text-[11px] text-muted font-semibold">
                          Opções de Resposta (Marque a opção correta):
                        </label>
                        {['A', 'B', 'C', 'D'].map((letter: any, optIdx: any) => (
                          <div key={optIdx} className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleUpdateMCQuestion(q.id, 'correctOptionIndex', optIdx)}
                              className={`w-7 h-7 rounded-lg font-bold text-xs flex items-center justify-center transition-all cursor-pointer ${
                                q.correctOptionIndex === optIdx
                                  ? 'bg-primary text-white ring-2 ring-[#4ade80]/50'
                                  : 'bg-background text-muted border border-border hover:border-border'
                              }`}
                              title={`Marcar opção ${letter} como correta`}
                            >
                              {letter}
                            </button>
                            <input
                              type="text"
                              value={q.options[optIdx] || ''}
                              onChange={(e: any) => handleUpdateMCOption(q.id, optIdx, e.target.value)}
                              placeholder={`Opção ${letter}...`}
                              className="flex-1 bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground placeholder-[#869486] focus:outline-none focus:border-primary"
                            />
                            {q.correctOptionIndex === optIdx && (
                              <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }

                // Essay Question
                return (
                  <div
                    key={q.id}
                    className="bg-surface border border-primary/20 rounded-2xl p-4 space-y-3 relative"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-primary-hover bg-primary/10 px-2.5 py-1 rounded-full border border-primary/20">
                        Questão {qIndex + 1} • Redação / Pesquisa Dissertativa
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveQuestion(q.id)}
                        className="text-rose-400 hover:text-rose-600 p-1 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                        title="Remover Questão"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div>
                      <label className="block text-[11px] text-muted font-semibold mb-1">
                        Enunciado ou Tema da Redação/Pesquisa
                      </label>
                      <textarea
                        rows={2}
                        value={q.statement}
                        onChange={(e: any) => handleUpdateEssayQuestion(q.id, 'statement', e.target.value)}
                        placeholder="Ex: Elabore uma dissertação sobre a Teoria do Fato Social de Émile Durkheim..."
                        className="w-full bg-background border border-border rounded-xl p-3 text-xs text-foreground placeholder-[#869486] focus:outline-none focus:border-blue-400"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] text-muted font-semibold mb-1">
                          Mínimo de Caracteres Exigido
                        </label>
                        <input
                          type="number"
                          min={50}
                          step={50}
                          value={q.minCharacters}
                          onChange={(e: any) => handleUpdateEssayQuestion(q.id, 'minCharacters', Number(e.target.value))}
                          className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-primary-hover font-bold focus:outline-none focus:border-blue-400"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] text-muted font-semibold mb-1">
                          Palavras-Chave de Atenção (I.A. e Aluno)
                        </label>
                        <input
                          type="text"
                          value={q.keywords || ''}
                          onChange={(e: any) => handleUpdateEssayQuestion(q.id, 'keywords', e.target.value)}
                          placeholder="Ex: Fato social, Coerção, Durkheim, Anomia"
                          className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground placeholder-[#869486] focus:outline-none focus:border-blue-400"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full py-3.5 bg-primary hover:bg-primary-hover text-white font-bold rounded-full transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20 cursor-pointer text-sm mt-6"
          >
            <Plus className="w-5 h-5 stroke-[2.5]" />
            <span>Publicar Atividade no Studio</span>
          </button>
        </form>
      </div>
    </div>
  );
};
