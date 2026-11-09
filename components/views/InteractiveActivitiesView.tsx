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
                        <span>🎙️ Debate Sociológico Sem Papel (6 Questões Pró + 6 Contra + 3 Resumos IA + 3 Jurados com 2 Checklists)</span>
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
                  onChange={(e) => setGameTopic(e.target.value)}
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
                  onChange={(e) => setGameTitle(e.target.value)}
                  placeholder="Ex: Arena do Milhão: O Caso da Cidadania"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-400 placeholder:text-slate-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Prazo de Entrega</label>
                <input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            {/* Material de Apoio */}
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Texto Base / Material de Apoio (Opcional)</label>
              <textarea
                value={gameMaterial}
                onChange={(e) => setGameMaterial(e.target.value)}
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
                  onChange={(e) => setLinkedFormalActivityId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-400"
                >
                  <option value="">🎯 Avaliação Formal Própria (Cria coluna AV autônoma no Diário)</option>
                  {(() => {
                    const { formalOptions, recoveryOptions } = getLinkableActivitiesWithLabels(activities);
                    return (
                      <>
                        {formalOptions.length > 0 && (
                          <optgroup label="📘 Vincular a Avaliação Formal Existente (AV1, AV2, AV3...)">
                            {formalOptions.map((opt) => (
                              <option key={opt.id} value={opt.id}>
                                {opt.label}
                              </option>
                            ))}
                          </optgroup>
                        )}
                        {recoveryOptions.length > 0 && (
                          <optgroup label="🔄 Vincular como Recuperação Paralela (RP1, RP2, RP3...)">
                            {recoveryOptions.map((rp) => (
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
                <span>{isGenerating ? 'Criando Jogo Inédito Baseado no seu Roteiro...' : 'Gerar Atividade Completa com IA (Baseada no Roteiro) ✨'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (!stagedGameData) {
                    setStagedGameData({
                      introText: gameMaterial.trim() || `Atividade gamificada sobre ${gameTopic || "Sociologia"}.`,
                      stages: Array.from({ length: 6 }).map((_, i) => ({
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
                  onChange={(e) => setStagedGameData({ ...stagedGameData, introText: e.target.value })}
                  rows={2}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none"
                />
              </div>

              {/* Fases ou 18 Questões do Debate */}
              {selectedGameMode === 'debate_paperless' && stagedGameData.debateConfig ? (
                <div className="space-y-6 max-h-[540px] overflow-y-auto pr-1">
                  {/* BLOCO 1: QUESTÕES LIVRES TIME PRÓ */}
                  <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/40 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black text-emerald-400 uppercase">
                        📘 Grupo 1: Perguntas Norteadoras • TIME PRÓ ({(stagedGameData.debateConfig?.proQuestions || []).length} pergunta(s))
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
                        + Adicionar Pergunta Pró
                      </button>
                    </div>
                    {(stagedGameData.debateConfig?.proQuestions || []).map((q, idx) => (
                      <div key={q.id || idx} className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-black text-emerald-300">
                            Pergunta Pró #{idx + 1}
                          </span>
                          {stagedGameData.debateConfig!.proQuestions.length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                const nextPro = stagedGameData.debateConfig!.proQuestions
                                  .filter((_, i) => i !== idx)
                                  .map((item, i) => ({ ...item, number: i + 1 }));
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
                          placeholder="Digite aqui a pergunta norteadora de pesquisa para o Time Pró..."
                          onChange={(e) => {
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

                  {/* BLOCO 2: QUESTÕES LIVRES TIME CONTRA */}
                  <div className="p-4 rounded-2xl bg-rose-950/20 border border-rose-500/40 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black text-rose-400 uppercase">
                        📕 Grupo 2: Perguntas Norteadoras • TIME CONTRA ({(stagedGameData.debateConfig?.contraQuestions || []).length} pergunta(s))
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
                        + Adicionar Pergunta Contra
                      </button>
                    </div>
                    {(stagedGameData.debateConfig?.contraQuestions || []).map((q, idx) => (
                      <div key={q.id || idx} className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-black text-rose-300">
                            Pergunta Contra #{idx + 1}
                          </span>
                          {stagedGameData.debateConfig!.contraQuestions.length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                const nextContra = stagedGameData.debateConfig!.contraQuestions
                                  .filter((_, i) => i !== idx)
                                  .map((item, i) => ({ ...item, number: i + 1 }));
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
                          placeholder="Digite aqui a pergunta norteadora de pesquisa para o Time Contra..."
                          onChange={(e) => {
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

                  {/* BLOCO 3: QUESTÕES LIVRES CORPO DE JURADOS */}
                  <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-500/40 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black text-amber-400 uppercase">
                        ⚖️ Grupo 3: Perguntas Norteadoras • JURADOS ({((stagedGameData.debateConfig?.jurorQuestions || []) || []).length} pergunta(s))
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
                    {((stagedGameData.debateConfig?.jurorQuestions || []) || []).map((q, idx) => (
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
                                  .filter((_, i) => i !== idx)
                                  .map((item, i) => ({ ...item, number: i + 1 }));
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
                          onChange={(e) => {
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
                {stagedGameData.stages.map((stg, sIdx) => (
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
                        onChange={(e) => {
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
                      {stg.options.map((opt, oIdx) => (
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
                              updated[sIdx].options = updated[sIdx].options.map((o, idx) => ({
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
                            onChange={(e) => {
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
    </div>
  );
};
