'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Gamepad2,
  Users,
  Trophy,
  Sparkles,
  Play,
  Plus,
  Trash2,
  Pencil,
  Eye,
  CheckCircle2,
  Clock,
  Layers,
  Link2,
  ShieldAlert,
  ChevronDown,
  Filter,
  Check,
  Zap,
  HelpCircle,
  Home,
  Building2,
  Swords,
  Scale,
  Search,
  FlaskConical,
  RotateCcw
} from 'lucide-react';
import {
  Activity,
  StudentUser,
  TeacherUser,
  GameMode,
  GameData,
  GameStage,
  GameExecutionContext,
} from '@/lib/types';
import { getOriginalTurmas, getTurmaLabel, isActivityAdapted, getLinkableActivitiesWithLabels } from '@/lib/studentUtils';
import { KronoIcon } from '@/components/ui/KronoIcon';
import { SOCIOLOGIA_EM_MOVIMENTO_CHAPTERS, getTextbookMarkdownSlice } from '@/lib/textbookMarkdownIndex';
import { TurmaFilterDropdown } from '@/components/TurmaFilterDropdown';

export const InteractiveCreatorBody: React.FC<any> = (props) => {
  const [selectedBookChapter, setSelectedBookChapter] = useState('cap_1');
  const [quickPasteText, setQuickPasteText] = useState('');
  const [showQuickPaste, setShowQuickPaste] = useState(false);
  const { activities, students, turmasList, MODE_DEFAULT_GUIDELINES, handleSelectGameMode, handleGenerateGame, handlePublishGame, internalTab, setInternalTab, targetTurmas, setTargetTurmas, gameTitle, setGameTitle, gameTopic, setGameTopic, gameMaterial, setGameMaterial, selectedGameMode, deadline, setDeadline, bindingMode, setBindingMode, linkedFormalActivityId, setLinkedFormalActivityId, isGenerating, stagedGameData, setStagedGameData, isReviewOpen, setIsReviewOpen } = props;
  return (
    <>
      {(internalTab === 'create_classroom' || internalTab === 'create_homework') && (
        <div className="space-y-6 max-w-4xl mx-auto">
          <div className="p-6 bg-slate-900/90 border border-cyan-500/30 rounded-3xl shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <span className="p-2.5 rounded-2xl bg-cyan-500/20 text-cyan-300 border border-cyan-400/40">
                  <Sparkles className="w-6 h-6" />
                </span>
                <div>
                  <h2 className="text-xl font-black text-white">
                    {internalTab === 'create_classroom'
                      ? 'Novo Jogo Cooperativo de Sala (Dupla / Grupo)'
                      : 'Nova Missão Individual de Casa (Gamificada)'}
                  </h2>
                  <p className="text-xs text-slate-400">
                    {internalTab === 'create_classroom'
                      ? 'Lobby em equipe automático com suporte a rodadas inclusivas PNE na mesma tela.'
                      : 'Missão reflexiva gamificada focada no progresso individual com notas automáticas.'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setInternalTab('gallery')}
                className="text-xs text-slate-400 hover:text-white underline cursor-pointer"
              >
                Voltar à Galeria
              </button>
            </div>

            {/* Seleção do Modo de Jogo */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 block">
                Escolha a Mecânica Pedagógica do KronoGame:
              </label>

              {internalTab === 'create_classroom' ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => handleSelectGameMode('millionaire')}
                    className={`p-3.5 rounded-2xl border text-left space-y-1.5 transition-all cursor-pointer ${
                      selectedGameMode === 'millionaire'
                        ? 'bg-amber-500/20 border-amber-400 ring-2 ring-amber-400/30 text-white'
                        : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-black text-xs sm:text-sm text-amber-300">
                      <Trophy className="w-4 h-4 text-amber-400" />
                      <span>Arena do Milhão</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-snug">
                      Escalada coletiva de 6 rodadas com pistas reflexivas e debate em equipe.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectGameMode('dialectic_tribunal')}
                    className={`p-3.5 rounded-2xl border text-left space-y-1.5 transition-all cursor-pointer ${
                      selectedGameMode === 'dialectic_tribunal'
                        ? 'bg-cyan-500/20 border-cyan-400 ring-2 ring-cyan-400/30 text-white'
                        : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-black text-xs sm:text-sm text-cyan-300">
                      <Scale className="w-4 h-4 text-cyan-400" />
                      <span>Tribunal Dialético</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-snug">
                      Julgamento de dilemas sociais com identificação de argumentos e falácias.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectGameMode('structural_detective')}
                    className={`p-3.5 rounded-2xl border text-left space-y-1.5 transition-all cursor-pointer ${
                      selectedGameMode === 'structural_detective'
                        ? 'bg-emerald-500/20 border-emerald-400 ring-2 ring-emerald-400/30 text-white'
                        : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-black text-xs sm:text-sm text-emerald-300">
                      <Search className="w-4 h-4 text-emerald-400" />
                      <span>Detetive Estrutural</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-snug">
                      Investigação de causas sociais invisíveis e interesses estratégicos dos atores.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      handleSelectGameMode('debate_paperless');
                      if (!gameMaterial.trim()) {
                        setGameMaterial(
`ESTRUTURA DO DEBATE SEM PAPEL (KRONOMESTRE):
1. Equipes de Debate (Bancadas Pró e Contra): Documentos digitais compartilhados para defesa, notícias, dados estatísticos e divisão de falas na tela do celular.
2. Audiência Analítica (Alunos Avaliadores): Votação em tempo real avaliando Qualidade dos argumentos, Respeito ao tempo (KronoMestre) e Uso de dados.
3. Interação e Perguntas da Plateia (Q&A): Envio anônimo de perguntas digitais pelo celular para a fase de réplica.
4. Registro Final e Portfólio: Produção de Infográfico Digital no Canva ou Mini-Podcast de 2 minutos resumindo o aprendizado.`
                        );
                      }
                    }}
                    className={`p-3.5 rounded-2xl border text-left space-y-1.5 transition-all cursor-pointer sm:col-span-3 ${
                      selectedGameMode === 'debate_paperless'
                        ? 'bg-rose-500/20 border-rose-400 ring-2 ring-rose-400/30 text-white'
                        : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 font-black text-xs sm:text-sm text-rose-300">
                        <Users className="w-4 h-4 text-rose-400" />
                        <span>🎙️ Debate Convenção Francesa: Girondinos vs. Jacobinos + Júri de Analistas (2 Aulas)</span>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-400/30 font-bold">
                        100% Digital • Projetor & QR Code
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-snug">
                      1) Alunos se cadastram em Pró, Contra ou 3 Jurados; 2) 6 questões dissertativas Pró e 6 Contra (Peso 5); 3) IA gera 3 resumos exclusivos por grupo; 4) Timer de Réplica/Tréplica e 2 Checklists dos Jurados com nota individual ou em grupo.
                    </p>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleSelectGameMode('rpg_campaign')}
                    className={`p-3.5 rounded-2xl border text-left space-y-1.5 transition-all cursor-pointer ${
                      selectedGameMode === 'rpg_campaign'
                        ? 'bg-purple-500/20 border-purple-400 ring-2 ring-purple-400/30 text-white'
                        : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-black text-xs sm:text-sm text-purple-300">
                      <Swords className="w-4 h-4 text-purple-400" />
                      <span>Crônicas da Pólis (RPG)</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-snug">
                      Jornada heroica de tomada de decisões cívicas e impacto comunitário.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectGameMode('real_life_lab')}
                    className={`p-3.5 rounded-2xl border text-left space-y-1.5 transition-all cursor-pointer ${
                      selectedGameMode === 'real_life_lab'
                        ? 'bg-blue-500/20 border-blue-400 ring-2 ring-blue-400/30 text-white'
                        : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-black text-xs sm:text-sm text-blue-300">
                      <FlaskConical className="w-4 h-4 text-blue-400" />
                      <span>Laboratório da Vida Real</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-snug">
                      Simulação prática de dilemas do cotidiano e consequências sociais.
                    </p>
                  </button>
                </div>
              )}
            </div>

            {/* Informações Básicas */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Destinação de Turmas (Todas ou Seleção)
                </label>
                <div className="flex items-center gap-2">
                  <TurmaFilterDropdown
                    turmasList={turmasList}
                    selectedTurmas={targetTurmas}
                    onChange={setTargetTurmas}
                    students={students}
                    totalCountLabel="alunos"
                  />
                </div>
                <span className="text-[10px] text-cyan-400 block mt-1">
                  {targetTurmas.length === 0
                    ? `✓ Destinado a Todas as Turmas (${turmasList.length} turmas)`
                    : `✓ Selecionadas: ${targetTurmas.join(', ')}`}
                </span>
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-bold text-slate-300 block mb-1">Tema da Missão / Conteúdo</label>
                <input
                  type="text"
                  value={gameTopic}
                  onChange={(e: any) => setGameTopic(e.target.value)}
                  placeholder="Ex: Cidadania, Direitos Humanos, Desigualdade Social..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-400 placeholder:text-slate-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Título Personalizado (Opcional)</label>
                <input
                  type="text"
                  value={gameTitle}
                  onChange={(e: any) => setGameTitle(e.target.value)}
                  placeholder="Ex: Arena do Milhão: O Caso da Cidadania"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-400 placeholder:text-slate-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Prazo de Entrega</label>
                <input
                  type="date"
                  value={deadline}
                  onChange={(e: any) => setDeadline(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            {/* Fonte do Livro Didático (.MD da Área de Arquivos) + Colagem Rápida */}
            <div className="p-4 rounded-2xl bg-slate-800/80 border border-cyan-500/30 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-black uppercase text-cyan-300">
                  📚 Livro Didático (.MD na Área de Arquivos) & Colagem Rápida
                </span>
                <button
                  type="button"
                  onClick={() => setShowQuickPaste(!showQuickPaste)}
                  className="px-3 py-1 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-300 text-[11px] font-black cursor-pointer"
                >
                  {showQuickPaste ? 'Fechar Colagem Rápida' : '⚡ Abrir Colagem Rápida de Questões'}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <select
                  value={selectedBookChapter}
                  onChange={(e) => {
                    const chId = e.target.value;
                    setSelectedBookChapter(chId);
                    const slice = getTextbookMarkdownSlice(chId);
                    setGameMaterial(slice.markdownSlice);
                    const chObj = SOCIOLOGIA_EM_MOVIMENTO_CHAPTERS.find((c) => c.id === chId);
                    if (chObj && !gameTopic.trim()) setGameTopic(chObj.title);
                  }}
                  className="sm:col-span-2 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                >
                  {SOCIOLOGIA_EM_MOVIMENTO_CHAPTERS.map((ch) => (
                    <option key={ch.id} value={ch.id}>
                      {ch.title} ({ch.pages})
                    </option>
                  ))}
                </select>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      const slice = getTextbookMarkdownSlice(selectedBookChapter);
                      setGameMaterial(slice.markdownSlice);
                    }}
                    className="flex-1 px-2.5 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-200 text-xs font-black cursor-pointer"
                  >
                    Carregar (.MD)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const slice = getTextbookMarkdownSlice(selectedBookChapter);
                      const chObj = SOCIOLOGIA_EM_MOVIMENTO_CHAPTERS.find((c) => c.id === selectedBookChapter);
                      setGameMaterial(slice.markdownSlice);
                      if (chObj && chObj.topics.length > 0) {
                        const shuffled = [...chObj.topics].sort(() => Math.random() - 0.5);
                        const picked = shuffled.slice(0, 2).join(' + ');
                        setGameTopic(`${chObj.title} — Foco: ${picked}`);
                      }
                    }}
                    title="Sortear aleatoriamente novos subtemas deste capítulo para gerar uma missão inédita"
                    className="px-2.5 py-2 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-400/40 text-purple-200 text-xs font-black cursor-pointer shrink-0"
                  >
                    🎲 Sortear Foco
                  </button>
                </div>
              </div>

              {showQuickPaste && (
                <div className="p-3 rounded-xl bg-slate-950 border border-amber-500/40 space-y-2">
                  <p className="text-[11px] text-amber-300 font-bold">
                    Cole 1 pergunta por linha para preencher automaticamente as fases ou bancadas (Girondinos, Jacobinos e Júri):
                  </p>
                  <textarea
                    rows={4}
                    value={quickPasteText}
                    onChange={(e) => setQuickPasteText(e.target.value)}
                    placeholder="Linha 1: Primeira pergunta...
Linha 2: Segunda pergunta..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-white"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const lines = quickPasteText
                        .split('\n')
                        .map((l) => l.replace(/^\d+[\.)\-]\s*/, '').trim())
                        .filter(Boolean);
                      if (lines.length === 0) return;
                      if (selectedGameMode === 'debate_paperless') {
                        const third = Math.max(1, Math.ceil(lines.length / 3));
                        const proLines = lines.slice(0, third);
                        const contraLines = lines.slice(third, third * 2);
                        const jurorLines = lines.slice(third * 2);
                        setStagedGameData({
                          introText: `Debate Convenção Francesa (Girondinos vs. Jacobinos): ${gameTopic || 'Sociologia'}`,
                          stages: [],
                          debateConfig: {
                            maxJurors: 3,
                            proQuestions: (proLines.length ? proLines : lines).map((p, i) => ({
                              id: `pro_q_${i + 1}`,
                              number: i + 1,
                              side: 'pro',
                              sociologicalConcept: `Tese Girondina #${i + 1}`,
                              prompt: p,
                              researchHint: '',
                            })),
                            contraQuestions: (contraLines.length ? contraLines : lines).map((p, i) => ({
                              id: `contra_q_${i + 1}`,
                              number: i + 1,
                              side: 'contra',
                              sociologicalConcept: `Tese Jacobina #${i + 1}`,
                              prompt: p,
                              researchHint: '',
                            })),
                            jurorQuestions: (jurorLines.length ? jurorLines : lines).map((p, i) => ({
                              id: `juror_q_${i + 1}`,
                              number: i + 1,
                              side: 'juror',
                              sociologicalConcept: `Análise do Júri #${i + 1}`,
                              prompt: p,
                              researchHint: '',
                            })),
                            checklistCriteria: [
                              { id: 'crit_1', number: 1, title: 'Domínio Conceitual e Histórico', description: 'Mobilizou conceitos do livro didático sem cair no senso comum.' },
                              { id: 'crit_2', number: 2, title: 'Consistência na Exposição', description: 'Apresentou tese clara dentro do tempo de Exposição.' },
                              { id: 'crit_3', number: 3, title: 'Poder de Réplica e Tréplica', description: 'Refutou diretamente os argumentos da facção adversária.' },
                              { id: 'crit_4', number: 4, title: 'Evidências do Relatório (Aula 1)', description: 'Sustentou a fala nos dados pesquisados no relatório.' },
                            ],
                            jurorInitialGuide: 'Avaliem Girondinos e Jacobinos durante a Exposição, Réplica e Tréplica.',
                            proSummaryAI: '',
                            contraSummaryAI: '',
                            jurorGuideAI: '',
                            participants: [],
                            proAnswers: {},
                            contraAnswers: {},
                            jurorVerdicts: [],
                          },
                        });
                      } else {
                        setStagedGameData({
                          introText: `Missão Autoral: ${gameTopic || 'Sociologia'}`,
                          stages: lines.map((p, i) => ({
                            id: `stage-${i + 1}`,
                            title: `Fase ${i + 1}`,
                            scenario: p,
                            clue: 'Consulte o livro Sociologia em Movimento.',
                            options: [
                              { text: 'Alternativa correta (edite abaixo)', isCorrect: true, pointsWeight: 10, feedback: 'Correto!', iconEmoji: '🎯' },
                              { text: 'Distrator 1 (edite abaixo)', isCorrect: false, pointsWeight: 0, feedback: 'Revise o conceito.', iconEmoji: '❌' },
                              { text: 'Distrator 2 (edite abaixo)', isCorrect: false, pointsWeight: 0, feedback: 'Revise o conceito.', iconEmoji: '⚠️' },
                            ],
                          })),
                        });
                      }
                      setIsReviewOpen(true);
                      setShowQuickPaste(false);
                    }}
                    className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-black text-xs cursor-pointer"
                  >
                    Aplicar Colagem Rápida & Abrir Revisão
                  </button>
                </div>
              )}
            </div>

            {/* Material de Apoio */}
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Texto Base / Material de Apoio (Opcional)</label>
              <textarea
                value={gameMaterial}
                onChange={(e: any) => setGameMaterial(e.target.value)}
                rows={3}
                placeholder="Cole um resumo, trecho de livro ou conceitos fundamentais que a IA deve utilizar para compor as fases..."
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-cyan-400 placeholder:text-slate-500"
              />
            </div>

            {/* Seletor de Vínculo Opcional */}
            <div className="p-4 bg-slate-800/60 rounded-2xl border border-slate-700 space-y-3">
              <label className="text-xs font-bold text-cyan-300 flex items-center gap-2">
                <Link2 className="w-4 h-4" />
                <span>Vínculo com Avaliação Formal (Opcional):</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label
                  className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition-all ${
                    bindingMode === 'standalone'
                      ? 'bg-cyan-500/15 border-cyan-400 text-white'
                      : 'bg-slate-800 border-slate-700 text-slate-400'
                  }`}
                >
                  <input
                    type="radio"
                    name="bindingMode"
                    checked={bindingMode === 'standalone'}
                    onChange={() => setBindingMode('standalone')}
                    className="accent-cyan-400"
                  />
                  <div>
                    <strong className="text-xs block text-slate-200">Avaliação Autônoma</strong>
                    <span className="text-[10px] text-slate-400">Existe por conta própria, com nota individual/grupo.</span>
                  </div>
                </label>

                <label
                  className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition-all ${
                    bindingMode === 'linked'
                      ? 'bg-cyan-500/15 border-cyan-400 text-white'
                      : 'bg-slate-800 border-slate-700 text-slate-400'
                  }`}
                >
                  <input
                    type="radio"
                    name="bindingMode"
                    checked={bindingMode === 'linked'}
                    onChange={() => setBindingMode('linked')}
                    className="accent-cyan-400"
                  />
                  <div>
                    <strong className="text-xs block text-slate-200">Vincular a uma Prova Formal</strong>
                    <span className="text-[10px] text-slate-400">Conta como etapa gamificada da avaliação mãe.</span>
                  </div>
                </label>
              </div>

              {bindingMode === 'linked' && (
                <div className="pt-2 animate-fadeIn">
                  <select
                  value={linkedFormalActivityId}
                  onChange={(e: any) => setLinkedFormalActivityId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-400"
                >
                  <option value="">🎯 Avaliação Formal Própria (Cria coluna AV autônoma no Diário)</option>
                  {(() => {
                    const { formalOptions, recoveryOptions } = getLinkableActivitiesWithLabels(activities);
                    return (
                      <>
                        {formalOptions.length > 0 && (
                          <optgroup label="📘 Vincular a Avaliação Formal Existente (AV1, AV2, AV3...)">
                            {formalOptions.map((opt: any) => (
                              <option key={opt.id} value={opt.id}>
                                {opt.label}
                              </option>
                            ))}
                          </optgroup>
                        )}
                        {recoveryOptions.length > 0 && (
                          <optgroup label="🔄 Vincular como Recuperação Paralela (RP1, RP2, RP3...)">
                            {recoveryOptions.map((rp: any) => (
                              <option key={rp.id} value={`RP:${rp.parentAvId}`}>
                                {rp.label} (Substitui a menor nota)
                              </option>
                            ))}
                          </optgroup>
                        )}
                      </>
                    );
                  })()}
                </select>
                </div>
              )}
            </div>

            {/* Botões de Geração Completa com IA ou Criação Manual pelo Professor */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={handleGenerateGame}
                disabled={isGenerating}
                className="flex-1 py-3.5 bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 font-black text-sm rounded-2xl transition-all shadow-[0_0_25px_rgba(6,182,212,0.4)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Sparkles className="w-5 h-5 fill-current" />
                <span>{isGenerating ? 'Gerando Estudo de Caso e Critérios do Júri...' : selectedGameMode === 'debate_paperless' ? 'Gerar Critérios do Júri & Perguntas Sugeridas (Opcional) ✨' : 'Gerar Estudos de Caso do Jogo com IA (Preso ao Livro .MD) ✨'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (!stagedGameData) {
                    setStagedGameData({
                      introText: gameMaterial.trim() || `Atividade gamificada sobre ${gameTopic || "Sociologia"}.`,
                      stages: Array.from({ length: 6 }).map((_: any, i: any) => ({
                        id: `stage-${i + 1}`,
                        title: `Fase ${i + 1}`,
                        scenario: `Digite o desafio ou etapa ${i + 1} do seu roteiro...`,
                        clue: "Dica conceitual ou estratégica...",
                        options: [
                          { text: "Alternativa correta", isCorrect: true, pointsWeight: 10, feedback: "Excelente análise!", iconEmoji: "🎯" },
                          { text: "Alternativa incorreta 1", isCorrect: false, pointsWeight: 0, feedback: "Revise o conceito.", iconEmoji: "❌" },
                        ],
                      })),
                    });
                  }
                  setIsReviewOpen(true);
                }}
                className="px-5 py-3.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/40 font-bold text-xs sm:text-sm rounded-2xl transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Pencil className="w-4 h-4" />
                <span>Criar / Editar Fases Manualmente</span>
              </button>
            </div>
          </div>

          {/* =========================================================================
              EDITOR DE FASES PRÉ-PUBLICAÇÃO
          ========================================================================= */}
          {isReviewOpen && stagedGameData && (
            <div className="p-6 bg-slate-900 border-2 border-cyan-400/50 rounded-3xl shadow-2xl space-y-6 animate-fadeIn">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="p-2 rounded-xl bg-cyan-500/20 text-cyan-300">
                    <CheckCircle2 className="w-5 h-5" />
                  </span>
                  <div>
                    <h3 className="text-base font-black text-white">
                      {selectedGameMode === 'debate_paperless'
                        ? 'Revisão Pré-Publicação das 18 Questões Isoladas por Grupo (6 Pró + 6 Contra + 6 Jurados)'
                        : `Revisão Pré-Publicação • ${MODE_DEFAULT_GUIDELINES[selectedGameMode]?.label || '6 Fases'}`}
                    </h3>
                    <p className="text-xs text-slate-400">Edite enunciados e confira as rodadas adaptadas antes de publicar para os alunos.</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsReviewOpen(false)}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Recolher
                </button>
              </div>

              {/* Texto de Introdução */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">Texto Introdutório do Jogo:</label>
                <textarea
                  value={stagedGameData.introText}
                  onChange={(e: any) => setStagedGameData({ ...stagedGameData, introText: e.target.value })}
                  rows={2}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none"
                />
              </div>

              {/* Fases ou 18 Questões do Debate */}
              {selectedGameMode === 'debate_paperless' && stagedGameData.debateConfig ? (
                <div className="space-y-6 max-h-[540px] overflow-y-auto pr-1">
                  {/* BLOCO 1: QUESTÕES LIVRES BANCADA DOS GIRONDINOS */}
                  <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/40 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black text-emerald-400 uppercase">
                        📘 Grupo 1: Perguntas Norteadoras • BANCADA DOS GIRONDINOS ({(stagedGameData.debateConfig?.proQuestions || []).length} pergunta(s))
                      </h4>
                      <button
                        type="button"
                        onClick={() => {
                          const current = stagedGameData.debateConfig!.proQuestions || [];
                          const nextNum = current.length + 1;
                          const nextPro = [
                            ...current,
                            {
                              id: `pro_q_${Date.now()}`,
                              number: nextNum,
                              side: 'pro' as const,
                              sociologicalConcept: `Eixo Pró #${nextNum}`,
                              prompt: '',
                              researchHint: '',
                            },
                          ];
                          setStagedGameData({
                            ...stagedGameData,
                            debateConfig: { ...stagedGameData.debateConfig!, proQuestions: nextPro },
                          });
                        }}
                        className="px-3 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/50 text-emerald-300 text-[11px] font-black cursor-pointer"
                      >
                        + Adicionar Pergunta Girondinos
                      </button>
                    </div>
                    {(stagedGameData.debateConfig?.proQuestions || []).map((q: any, idx: any) => (
                      <div key={q.id || idx} className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-black text-emerald-300">
                            Pergunta Girondinos #{idx + 1}
                          </span>
                          {stagedGameData.debateConfig!.proQuestions.length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                const nextPro = stagedGameData.debateConfig!.proQuestions
                                  .filter((_: any, i: any) => i !== idx)
                                  .map((item: any, i: any) => ({ ...item, number: i + 1 }));
                                setStagedGameData({
                                  ...stagedGameData,
                                  debateConfig: { ...stagedGameData.debateConfig!, proQuestions: nextPro },
                                });
                              }}
                              className="text-[10px] font-bold text-rose-400 hover:underline cursor-pointer"
                            >
                              Remover
                            </button>
                          )}
                        </div>
                        <textarea
                          value={q.prompt}
                          placeholder="Digite aqui a pergunta norteadora de pesquisa para o Girondinos..."
                          onChange={(e: any) => {
                            const nextPro = [...stagedGameData.debateConfig!.proQuestions];
                            nextPro[idx] = { ...nextPro[idx], prompt: e.target.value };
                            setStagedGameData({
                              ...stagedGameData,
                              debateConfig: { ...stagedGameData.debateConfig!, proQuestions: nextPro },
                            });
                          }}
                          rows={2}
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white"
                        />
                      </div>
                    ))}
                  </div>

                  {/* BLOCO 2: QUESTÕES LIVRES BANCADA DOS JACOBINOS */}
                  <div className="p-4 rounded-2xl bg-rose-950/20 border border-rose-500/40 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black text-rose-400 uppercase">
                        📕 Grupo 2: Perguntas Norteadoras • BANCADA DOS JACOBINOS ({(stagedGameData.debateConfig?.contraQuestions || []).length} pergunta(s))
                      </h4>
                      <button
                        type="button"
                        onClick={() => {
                          const current = stagedGameData.debateConfig!.contraQuestions || [];
                          const nextNum = current.length + 1;
                          const nextContra = [
                            ...current,
                            {
                              id: `contra_q_${Date.now()}`,
                              number: nextNum,
                              side: 'contra' as const,
                              sociologicalConcept: `Eixo Contra #${nextNum}`,
                              prompt: '',
                              researchHint: '',
                            },
                          ];
                          setStagedGameData({
                            ...stagedGameData,
                            debateConfig: { ...stagedGameData.debateConfig!, contraQuestions: nextContra },
                          });
                        }}
                        className="px-3 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400/50 text-rose-300 text-[11px] font-black cursor-pointer"
                      >
                        + Adicionar Pergunta Jacobinos
                      </button>
                    </div>
                    {(stagedGameData.debateConfig?.contraQuestions || []).map((q: any, idx: any) => (
                      <div key={q.id || idx} className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-black text-rose-300">
                            Pergunta Jacobinos #{idx + 1}
                          </span>
                          {stagedGameData.debateConfig!.contraQuestions.length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                const nextContra = stagedGameData.debateConfig!.contraQuestions
                                  .filter((_: any, i: any) => i !== idx)
                                  .map((item: any, i: any) => ({ ...item, number: i + 1 }));
                                setStagedGameData({
                                  ...stagedGameData,
                                  debateConfig: { ...stagedGameData.debateConfig!, contraQuestions: nextContra },
                                });
                              }}
                              className="text-[10px] font-bold text-rose-400 hover:underline cursor-pointer"
                            >
                              Remover
                            </button>
                          )}
                        </div>
                        <textarea
                          value={q.prompt}
                          placeholder="Digite aqui a pergunta norteadora de pesquisa para o Jacobinos..."
                          onChange={(e: any) => {
                            const nextContra = [...stagedGameData.debateConfig!.contraQuestions];
                            nextContra[idx] = { ...nextContra[idx], prompt: e.target.value };
                            setStagedGameData({
                              ...stagedGameData,
                              debateConfig: { ...stagedGameData.debateConfig!, contraQuestions: nextContra },
                            });
                          }}
                          rows={2}
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white"
                        />
                      </div>
                    ))}
                  </div>

                  {/* BLOCO 3: QUESTÕES LIVRES CORPO DE JÚRI DE ANALISTAS */}
                  <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-500/40 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black text-amber-400 uppercase">
                        ⚖️ Grupo 3: Perguntas Norteadoras • JÚRI DE ANALISTAS ({((stagedGameData.debateConfig?.jurorQuestions || []) || []).length} pergunta(s))
                      </h4>
                      <button
                        type="button"
                        onClick={() => {
                          const current = stagedGameData.debateConfig!.jurorQuestions || [];
                          const nextNum = current.length + 1;
                          const nextJuror = [
                            ...current,
                            {
                              id: `juror_q_${Date.now()}`,
                              number: nextNum,
                              side: 'juror' as const,
                              sociologicalConcept: `Eixo Jurados #${nextNum}`,
                              prompt: '',
                              researchHint: '',
                            },
                          ];
                          setStagedGameData({
                            ...stagedGameData,
                            debateConfig: { ...stagedGameData.debateConfig!, jurorQuestions: nextJuror },
                          });
                        }}
                        className="px-3 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/50 text-amber-300 text-[11px] font-black cursor-pointer"
                      >
                        + Adicionar Pergunta Jurados
                      </button>
                    </div>
                    {((stagedGameData.debateConfig?.jurorQuestions || []) || []).map((q: any, idx: any) => (
                      <div key={q.id || idx} className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-black text-amber-300">
                            Pergunta Jurados #{idx + 1}
                          </span>
                          {(stagedGameData.debateConfig!.jurorQuestions || []).length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                const nextJuror = (stagedGameData.debateConfig!.jurorQuestions || [])
                                  .filter((_: any, i: any) => i !== idx)
                                  .map((item: any, i: any) => ({ ...item, number: i + 1 }));
                                setStagedGameData({
                                  ...stagedGameData,
                                  debateConfig: { ...stagedGameData.debateConfig!, jurorQuestions: nextJuror },
                                });
                              }}
                              className="text-[10px] font-bold text-rose-400 hover:underline cursor-pointer"
                            >
                              Remover
                            </button>
                          )}
                        </div>
                        <textarea
                          value={q.prompt}
                          placeholder="Digite aqui a pergunta preparatória para o Corpo de Jurados..."
                          onChange={(e: any) => {
                            const nextJuror = [...(stagedGameData.debateConfig!.jurorQuestions || [])];
                            nextJuror[idx] = { ...nextJuror[idx], prompt: e.target.value };
                            setStagedGameData({
                              ...stagedGameData,
                              debateConfig: { ...stagedGameData.debateConfig!, jurorQuestions: nextJuror },
                            });
                          }}
                          rows={2}
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                {stagedGameData.stages.map((stg: any, sIdx: any) => (
                  <div key={stg.id || sIdx} className="p-4 bg-slate-800/80 rounded-2xl border border-slate-700 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-cyan-400 uppercase tracking-wider">
                        Fase {sIdx + 1}: {stg.title}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold">
                        Co-Op Inclusivo Ativo
                      </span>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-400">Enunciado Regular:</label>
                      <textarea
                        value={stg.scenario}
                        onChange={(e: any) => {
                          const updated = [...stagedGameData.stages];
                          updated[sIdx].scenario = e.target.value;
                          setStagedGameData({ ...stagedGameData, stages: updated });
                        }}
                        rows={2}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white"
                      />
                    </div>

                    {/* Alternativas Editáveis pelo Professor */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {stg.options.map((opt: any, oIdx: any) => (
                        <div
                          key={oIdx}
                          className={`p-2 rounded-xl border text-xs flex items-center gap-2 ${
                            opt.isCorrect
                              ? 'bg-emerald-950/40 border-emerald-500/60 text-emerald-200'
                              : 'bg-slate-900 border-slate-700 text-slate-300'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              const updated = [...stagedGameData.stages];
                              updated[sIdx].options = updated[sIdx].options.map((o: any, idx: any) => ({
                                ...o,
                                isCorrect: idx === oIdx,
                                pointsWeight: idx === oIdx ? 10 : 0,
                              }));
                              setStagedGameData({ ...stagedGameData, stages: updated });
                            }}
                            className={`px-2 py-1 rounded-lg text-[10px] font-black shrink-0 cursor-pointer ${
                              opt.isCorrect ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400 hover:text-white'
                            }`}
                            title="Clique para definir como correta"
                          >
                            {opt.isCorrect ? '✓ Correta' : 'Distrator'}
                          </button>
                          <input
                            type="text"
                            value={opt.text}
                            onChange={(e: any) => {
                              const updated = [...stagedGameData.stages];
                              updated[sIdx].options[oIdx].text = e.target.value;
                              setStagedGameData({ ...stagedGameData, stages: updated });
                            }}
                            className="w-full bg-transparent text-xs text-white focus:outline-none border-b border-transparent focus:border-cyan-400"
                          />
                        </div>
                      ))}
                    </div>

                    {/* Destaque Inclusivo PNE */}
                    <div className="p-3 bg-cyan-950/30 rounded-xl border border-cyan-800/40 flex items-center justify-between text-xs text-slate-300">
                      <span>🌟 <strong>Rodada Inclusiva Integrada:</strong> Caso haja colega PNE no grupo em sala, a tela alternará automaticamente para opções diretas e cartões ilustrados.</span>
                    </div>
                  </div>
                ))}
              </div>

              )}

              {/* Botão Final de Publicação */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsReviewOpen(false)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold"
                >
                  Continuar Editando
                </button>

                <button
                  type="button"
                  onClick={handlePublishGame}
                  className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs sm:text-sm rounded-xl transition-all shadow-lg shadow-emerald-500/20 cursor-pointer flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>Publicar KronoGame 🚀</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

    </>
  );
};
