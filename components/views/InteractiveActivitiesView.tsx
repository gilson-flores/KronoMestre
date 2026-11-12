import { InteractiveCreatorBody } from "@/components/parts/InteractiveCreatorBody";
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
import { TurmaFilterDropdown } from '@/components/TurmaFilterDropdown';

interface InteractiveActivitiesViewProps {
  activities: Activity[];
  students: StudentUser[];
  teacher: TeacherUser;
  onOpenNewActivityModal?: () => void;
  onSaveCreatedActivity: (activity: Activity) => Promise<void> | void;
  onEditActivity?: (activity: Activity) => void;
  onDeleteActivity?: (activityId: string) => void;
  onPlayGamePreview?: (activity: Activity) => void;
}

const getDefaultGameDeadlineString = () => {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().split('T')[0];
};

export const InteractiveActivitiesView: React.FC<InteractiveActivitiesViewProps> = ({
  activities,
  students,
  teacher,
  onSaveCreatedActivity,
  onEditActivity,
  onDeleteActivity,
  onPlayGamePreview,
}) => {
  // Navegação Interna: Galeria, Criar Jogo de Sala (Dupla/Grupo), Criar Missão de Casa (Individual)
  const [internalTab, setInternalTab] = useState<'gallery' | 'create_classroom' | 'create_homework'>('gallery');

  // Turmas extraídas dos alunos
  const turmasList = useMemo(() => getOriginalTurmas(students), [students]);
  const [selectedGalleryTurmas, setSelectedGalleryTurmas] = useState<string[]>([]);
  const selectedTurmaFilter = selectedGalleryTurmas.length === 0 ? 'todas' : selectedGalleryTurmas[0];
  const [isTurmaDropdownOpen, setIsTurmaDropdownOpen] = useState(false);
  const turmaDropdownRef = useRef<HTMLDivElement>(null);

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (turmaDropdownRef.current && !turmaDropdownRef.current.contains(event.target as Node)) {
        setIsTurmaDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Estúdio KronoGames: Lista APENAS os jogos e missões interativas criadas nativamente aqui
  const interactiveActivities = useMemo(() => {
    return activities.filter((act) => {
      const isGame = Boolean(act.isGameActivity || act.gameData || act.isInteractive || act.activityDomain === 'interactive_game' || act.playfulGameHtml);
      if (!isGame) return false;
      if (isActivityAdapted(act) || act.activityDomain === 'adapted_aee') return false;
      if (selectedGalleryTurmas.length === 0) return true;
      return selectedGalleryTurmas.some((t) => act.turma === t || act.turma?.includes(t));
    });
  }, [activities, selectedGalleryTurmas]);

  // Atividades formais para vínculo opcional
  const formalActivitiesForBinding = useMemo(() => {
    return activities.filter((act) => !act.isInteractive && act.activityDomain !== 'interactive_game' && !act.isAdapted);
  }, [activities]);

  // ==========================================
  // ESTADOS DO FORMULÁRIO DE CRIAÇÃO
  // ==========================================
  const [targetTurmas, setTargetTurmas] = useState<string[]>([]);
  const targetTurma = targetTurmas.length === 0 ? turmasList.join(', ') : targetTurmas.join(', ');
  const [gameTitle, setGameTitle] = useState('');
  const [gameTopic, setGameTopic] = useState('');
  const [gameMaterial, setGameMaterial] = useState('');
  const [aiCustomPrompt, setAiCustomPrompt] = useState('');
  const [aiQuestionCount, setAiQuestionCount] = useState<number>(6);
  const [selectedGameMode, setSelectedGameMode] = useState<GameMode>('millionaire');

  // Limpa ou ajusta o texto base ao alternar o modo de jogo
  const MODE_DEFAULT_GUIDELINES: Record<GameMode, { label: string; guideline: string }> = {
    millionaire: {
      label: 'Arena do Milhão Sociológica',
      guideline: 'ROTEIRO ARENA DO MILHÃO (SOCIOLOGIA):\nElabore 6 rodadas progressivas de análise sociológica conectando conceitos clássicos e contemporâneos à realidade brasileira.',
    },
    dialectic_tribunal: {
      label: 'Tribunal Dialético de Sociologia',
      guideline: 'ROTEIRO TRIBUNAL DIALÉTICO (SOCIOLOGIA):\nEstruture 6 casos de julgamento sociológico analisando teses históricas, direitos humanos, relações de poder e desigualdades.',
    },
    structural_detective: {
      label: 'Detetive Estrutural Sociológico',
      guideline: 'ROTEIRO DETETIVE ESTRUTURAL (SOCIOLOGIA):\nCrie 6 cenas de investigação sociológica onde evidências do cotidiano revelam causas estruturais, instituições e ideologias.',
    },
    rpg_campaign: {
      label: 'Crônicas da Pólis (RPG Sociológico)',
      guideline: 'ROTEIRO CRÔNICAS DA PÓLIS (RPG):\nCrie 6 capítulos onde o estudante toma decisões éticas, políticas e cidadãs diante de problemas reais da comunidade.',
    },
    real_life_lab: {
      label: 'Laboratório da Vida Real',
      guideline: 'ROTEIRO LABORATÓRIO DA VIDA REAL:\nCrie 6 simulações práticas do cotidiano brasileiro aplicando teorias sociológicas a dilemas juvenis e comunitários.',
    },
    debate_paperless: {
      label: 'Debate Sociológico Sem Papel',
      guideline: 'ROTEIRO DO DEBATE SOCIOLÓGICO SEM PAPEL (18 QUESTÕES ISOLADAS POR GRUPO):\n1. Time PRÓ (Grupo): Recebe 6 questões dissertativas norteadoras favoráveis (isoladas).\n2. Time CONTRA (Grupo): Recebe 6 questões dissertativas norteadoras críticas (isoladas).\n3. Corpo de JURADOS (3 alunos): Recebe 6 questões preparatórias e 2 Checklists de julgamento.\n4. Pós-Pesquisa: A IA gera 1 resumo exclusivo para cada um dos 3 grupos.',
    },
  };

  const handleSelectGameMode = (mode: GameMode) => {
    setSelectedGameMode(mode);
    setStagedGameData(null);
    setIsReviewOpen(false);
    setGameMaterial(MODE_DEFAULT_GUIDELINES[mode]?.guideline || '');
  };
  const [deadline, setDeadline] = useState(getDefaultGameDeadlineString);
  const [bindingMode, setBindingMode] = useState<'standalone' | 'linked'>('standalone');
  const [linkedFormalActivityId, setLinkedFormalActivityId] = useState<string>('');

  // Estados de IA e Pré-Publicação
  const [isGenerating, setIsGenerating] = useState(false);
  const [stagedGameData, setStagedGameData] = useState<GameData | null>(null);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Iniciar criação para Sala
  const handleOpenCreateClassroom = () => {
    handleSelectGameMode('millionaire');
    setInternalTab('create_classroom');
  };

  // Iniciar criação para Casa
  const handleOpenCreateHomework = () => {
    handleSelectGameMode('rpg_campaign');
    setInternalTab('create_homework');
  };

  // Disparar geração com IA
  const handleGenerateGame = async () => {
    if (!gameTopic.trim() && !gameTitle.trim()) {
      alert('Por favor, informe o tema ou título do jogo antes de gerar.');
      return;
    }

    setIsGenerating(true);
    try {
      const res = await fetch('/api/gemini/generate-interactive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'krono_game',
          title: gameTitle.trim() || `Missão de ${teacher.subject || 'Sociologia'}`,
          subject: teacher.subject || 'Sociologia',
          topic: gameTopic.trim(),
          supportMaterial: gameMaterial.trim(),
          gameMode: selectedGameMode,
        }),
      });

      if (!res.ok) throw new Error('Falha ao gerar o jogo');
      const data = await res.json();

      if (data.gameData && Array.isArray(data.gameData.stages)) {
        setStagedGameData(data.gameData);
        setIsReviewOpen(true);
      }
    } catch (err: any) {
      console.error('Erro na rota de IA:', err);
      alert('Houve um erro ao processar o jogo. Tente novamente.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Publicar KronoGame
  const handlePublishGame = async () => {
    if (!stagedGameData) return;

    const isGroup = internalTab === 'create_classroom';
    const executionContext: GameExecutionContext = isGroup ? 'classroom_group' : 'homework_individual';

    const mappedQuestions =
      selectedGameMode === 'debate_paperless' && stagedGameData.debateConfig
        ? [
            ...((stagedGameData.debateConfig?.proQuestions || []) || []).map((q, idx) => ({
              id: q.id || `pro_q_${idx + 1}`,
              type: 'essay' as const,
              statement: `[BANCADA PRÓ • Questão Norteadora ${idx + 1} - ${q.sociologicalConcept}] ${q.prompt}\n💡 O que pesquisar: ${q.researchHint}`,
              expectedAnswer: q.researchHint,
              minCharacters: 50,
              points: Number((5 / Math.max(1, ((stagedGameData.debateConfig?.proQuestions || []) || []).length)).toFixed(2)),
            })),
            ...((stagedGameData.debateConfig?.contraQuestions || []) || []).map((q, idx) => ({
              id: q.id || `contra_q_${idx + 1}`,
              type: 'essay' as const,
              statement: `[TIME CONTRA • Questão Norteadora ${idx + 1} - ${q.sociologicalConcept}] ${q.prompt}\n💡 O que pesquisar: ${q.researchHint}`,
              expectedAnswer: q.researchHint,
              minCharacters: 50,
              points: Number((5 / Math.max(1, ((stagedGameData.debateConfig?.proQuestions || []) || []).length)).toFixed(2)),
            })),
            ...((stagedGameData.debateConfig?.jurorQuestions || []) || []).map((q, idx) => ({
              id: q.id || `juror_q_${idx + 1}`,
              type: 'essay' as const,
              statement: `[JURADOS • Questão Preparatória ${idx + 1} - ${q.sociologicalConcept}] ${q.prompt}\n💡 O que observar: ${q.researchHint}`,
              expectedAnswer: q.researchHint,
              minCharacters: 50,
              points: Number((5 / Math.max(1, ((stagedGameData.debateConfig?.proQuestions || []) || []).length)).toFixed(2)),
            })),
          ]
        : (stagedGameData.stages || []).map((stg, idx) => {
            const opts = (stg.options || []).map((o) => o.text);
            const correctIdx = Math.max(0, (stg.options || []).findIndex((o) => o.isCorrect));
            return {
              id: stg.id || `q_stage_${idx + 1}`,
              type: 'multiple_choice' as const,
              statement: `[${stg.title || `Fase ${idx + 1}`}] ${stg.scenario}${stg.clue ? `\n💡 Pista: ${stg.clue}` : ''}`,
              options: opts.length >= 2 ? opts : ['Opção A', 'Opção B'],
              correctOptionIndex: correctIdx,
              points: Number((10 / Math.max(1, stagedGameData.stages.length)).toFixed(2)),
            };
          });

    const targetStudentsCount = targetTurmas.length === 0
      ? students.length
      : students.filter((s) => targetTurmas.includes(s.turma)).length;

    const newActivity: Activity = {
      id: `game_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title: gameTitle.trim() || `[${MODE_DEFAULT_GUIDELINES[selectedGameMode]?.label || 'KronoGame'}] ${gameTopic || 'Sociologia'}`, 
      subject: teacher.subject || 'Sociologia',
      turma: targetTurma || turmasList.join(', ') || 'Todas',
      deadline,
      description: stagedGameData.introText || `Jogo avaliativo interativo sobre ${gameTopic}.`,
      supportMaterial: gameMaterial || '',
      type: 'Jogo Avaliativo',
      status: 'Ativo',
      maxGrade: 10,
      allowGroupWork: isGroup,
      isInteractive: true,
      activityDomain: 'interactive_game',
      isGameActivity: true,
      gameMode: selectedGameMode,
      executionContext,
      linkedActivityId: bindingMode === 'linked' ? linkedFormalActivityId : undefined,
      gameData: stagedGameData,
      questions: mappedQuestions,
      submissions: [],
      totalSubmissions: 0,
      totalStudents: targetStudentsCount,
      pendingCorrection: 0,
    };

    await onSaveCreatedActivity(newActivity);
    setSuccessBanner(`🎮 Jogo "${newActivity.title}" publicado com sucesso para a Turma ${targetTurma}!`);
    setStagedGameData(null);
    setIsReviewOpen(false);
    setGameTitle('');
    setGameTopic('');
    setGameMaterial('');
    setInternalTab('gallery');
    setTimeout(() => setSuccessBanner(null), 5000);
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-fadeIn pb-12 bg-[#09101f] text-slate-100 min-h-screen p-4 sm:p-6 rounded-3xl border border-cyan-500/20 shadow-2xl">
      {/* Top Header com Identidade KronoGames Neon */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-cyan-500/20">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-xl bg-cyan-500/15 border border-cyan-400/40 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
              <Gamepad2 className="w-5 h-5" />
            </span>
            <span className="text-xs font-black uppercase tracking-wider text-cyan-400">
              Estúdio de Avaliações Gamificadas
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight flex items-center gap-3">
            <span>KronoGames</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 font-bold uppercase">
              Interativo
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Desenvolva missões em dupla/grupo para a sala de aula ou campanhas individuais para casa, com co-op inclusivo automático e correção instantânea com custo zero de API na execução.
          </p>
        </div>

        {/* Menu Superior de Acesso Rápido Reorganizado em Barra Única */}
        <div className="inline-flex flex-wrap sm:flex-nowrap items-center gap-2 p-1.5 rounded-2xl bg-slate-900/90 border border-slate-800 shrink-0 self-start md:self-center">
          <button
            type="button"
            onClick={() => setInternalTab('gallery')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 cursor-pointer border ${
              internalTab === 'gallery'
                ? 'bg-cyan-500 text-slate-950 border-cyan-300 shadow-[0_0_20px_rgba(6,182,212,0.4)]'
                : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 border-slate-700'
            }`}
          >
            <Gamepad2 className="w-4 h-4" />
            <span>🕹️ Galeria de Jogos</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/20 font-mono">
              {interactiveActivities.length}
            </span>
          </button>

          <button
            type="button"
            onClick={handleOpenCreateClassroom}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 cursor-pointer border ${
              internalTab === 'create_classroom'
                ? 'bg-amber-500 text-slate-950 border-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.4)]'
                : 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border-amber-500/30'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>🏛️ Jogo de Sala (Grupo)</span>
          </button>

          <button
            type="button"
            onClick={handleOpenCreateHomework}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 cursor-pointer border ${
              internalTab === 'create_homework'
                ? 'bg-purple-500 text-slate-950 border-purple-300 shadow-[0_0_20px_rgba(168,85,247,0.4)]'
                : 'bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border-purple-500/30'
            }`}
          >
            <Home className="w-4 h-4" />
            <span>🏠 Missão de Casa (Individual)</span>
          </button>
        </div>
      </div>

      {/* Banner de Sucesso */}
      {successBanner && (
        <div className="p-4 bg-emerald-500/20 border border-emerald-400 text-emerald-300 rounded-2xl text-xs sm:text-sm flex items-center gap-3 animate-fadeIn shadow-lg">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
          <span className="font-bold">{successBanner}</span>
        </div>
      )}

      {/* =========================================================================
          ABA 1: GALERIA DE JOGOS DA TURMA
      ========================================================================= */}
      {internalTab === 'gallery' && (
        <div className="space-y-6">
          {/* Barra de Filtro de Turmas (Padrão Unificado Dropdown) */}
          <div className="glass-panel p-4 sm:p-5 rounded-3xl border border-border bg-surface flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md">
            <div className="flex flex-wrap items-center gap-3">
              <TurmaFilterDropdown
                turmasList={turmasList}
                selectedTurmas={selectedGalleryTurmas}
                onChange={setSelectedGalleryTurmas}
                students={students}
                totalCountLabel="alunos"
              />
              {selectedGalleryTurmas.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedGalleryTurmas([])}
                  className="text-xs font-bold text-cyan-400 hover:text-cyan-300 underline cursor-pointer"
                >
                  Limpar filtro (Ver Todas)
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs text-muted">
                Total de Jogos no Estúdio: <strong className="text-cyan-400 font-black">{interactiveActivities.length}</strong>
              </span>
            </div>
          </div>

          {/* Grid de Cards de Jogos */}
          {interactiveActivities.length === 0 ? (
            <div className="p-12 text-center rounded-3xl border border-dashed border-slate-800 bg-slate-900/40 text-slate-400 space-y-3">
              <Gamepad2 className="w-12 h-12 text-slate-600 mx-auto" />
              <p className="text-base font-bold text-slate-300">Nenhum KronoGame ativo para esta turma.</p>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Crie um jogo cooperativo de sala ou uma missão individual de casa usando o gerador com IA.
              </p>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={handleOpenCreateClassroom}
                  className="px-4 py-2 bg-amber-500 text-slate-950 rounded-xl text-xs font-bold hover:bg-amber-400 cursor-pointer shadow-md"
                >
                  Criar Jogo de Sala
                </button>
                <button
                  onClick={handleOpenCreateHomework}
                  className="px-4 py-2 bg-purple-500 text-slate-950 rounded-xl text-xs font-bold hover:bg-purple-400 cursor-pointer shadow-md"
                >
                  Criar Missão de Casa
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {interactiveActivities.map((game) => {
                const isGroup = game.allowGroupWork || game.executionContext === 'classroom_group';
                const stagesCount = game.gameData?.stages?.length || 6;
                const subsCount = game.submissions?.length || 0;

                return (
                  <div
                    key={game.id}
                    className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-cyan-500/50 transition-all shadow-xl hover:shadow-cyan-500/10 flex flex-col justify-between gap-4 group"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border ${
                            isGroup
                              ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                              : 'bg-purple-500/15 text-purple-300 border-purple-500/30'
                          }`}
                        >
                          {isGroup ? '🏛️ Sala (Dupla/Grupo)' : '🏠 Casa (Individual)'}
                        </span>

                        <span className="text-[11px] font-bold text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded-md border border-cyan-800/50">
                          Turma {game.turma}
                        </span>
                      </div>

                      <h3 className="text-base font-extrabold text-white group-hover:text-cyan-300 transition-colors line-clamp-2">
                        {game.title}
                      </h3>

                      <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                        {game.description}
                      </p>

                      <div className="flex items-center gap-3 pt-2 text-[11px] text-slate-400 border-t border-slate-800/80">
                        <span>Fases: <strong className="text-slate-200">{stagesCount}</strong></span>
                        <span>•</span>
                        <span>Entregas: <strong className="text-emerald-400">{subsCount}</strong></span>
                        {game.linkedActivityId && (
                          <>
                            <span>•</span>
                            <span className="text-amber-400 flex items-center gap-1" title="Vinculado a uma atividade formal">
                              <Link2 className="w-3 h-3" /> Vinculado
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-800">
                      {onPlayGamePreview && (
                        <button
                          type="button"
                          onClick={() => onPlayGamePreview(game)}
                          className="flex-1 py-2 px-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Simular como Aluno 👁️‍🗨️</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={async () => {
                          const duplicated: Activity = {
                            ...game,
                            id: `game_${Date.now()}_dup`,
                            title: `${game.title} (Cópia)`,
                            submissions: [],
                            totalSubmissions: 0,
                            pendingCorrection: 0,
                          };
                          await onSaveCreatedActivity(duplicated);
                          setSuccessBanner(`📋 Jogo "${game.title}" duplicado com sucesso!`);
                          setTimeout(() => setSuccessBanner(null), 4000);
                        }}
                        className="p-2 bg-slate-800 hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-300 rounded-xl border border-slate-700 hover:border-cyan-500/40 transition-all cursor-pointer"
                        title="Duplicar este jogo (decisão do professor)"
                      >
                        <Layers className="w-4 h-4" />
                      </button>

                      {onEditActivity && (
                        <button
                          type="button"
                          onClick={() => onEditActivity(game)}
                          className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700 transition-all cursor-pointer"
                          title="Editar jogo"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      )}

                      {onDeleteActivity && (
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Deseja realmente excluir o jogo "${game.title}"?`)) {
                              onDeleteActivity(game.id);
                            }
                          }}
                          className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-xl border border-rose-500/30 transition-all cursor-pointer"
                          title="Excluir jogo"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          ABA 2 & 3: FORMULÁRIO DE CRIAÇÃO (SALA EM GRUPO OU MISSÃO DE CASA)
      ========================================================================= */}
      <InteractiveCreatorBody {...{ activities, students, turmasList, MODE_DEFAULT_GUIDELINES, handleSelectGameMode, handleGenerateGame, handlePublishGame, internalTab, setInternalTab, targetTurmas, setTargetTurmas, gameTitle, setGameTitle, gameTopic, setGameTopic, gameMaterial, setGameMaterial, selectedGameMode, deadline, setDeadline, bindingMode, setBindingMode, linkedFormalActivityId, setLinkedFormalActivityId, isGenerating, stagedGameData, setStagedGameData, isReviewOpen, setIsReviewOpen }} />
    </div>
  );
};
