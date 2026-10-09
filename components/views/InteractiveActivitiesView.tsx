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
import { getOriginalTurmas, getTurmaLabel } from '@/lib/studentUtils';
import { KronoIcon } from '@/components/ui/KronoIcon';

interface InteractiveActivitiesViewProps {
  activities: Activity[];
  students: StudentUser[];
  teacher: TeacherUser;
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
  const [selectedTurmaFilter, setSelectedTurmaFilter] = useState<string>('todas');
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

  // Jogos Interativos existentes (filtrados por turma se selecionada)
  const interactiveActivities = useMemo(() => {
    return activities.filter((act) => {
      const isGame = act.isInteractive === true || act.activityDomain === 'interactive_game' || act.isGameActivity === true;
      if (!isGame) return false;
      if (selectedTurmaFilter === 'todas') return true;
      return act.turma === selectedTurmaFilter || act.turma?.includes(selectedTurmaFilter);
    });
  }, [activities, selectedTurmaFilter]);

  // Atividades formais para vínculo opcional
  const formalActivitiesForBinding = useMemo(() => {
    return activities.filter((act) => !act.isInteractive && act.activityDomain !== 'interactive_game' && !act.isAdapted);
  }, [activities]);

  // ==========================================
  // ESTADOS DO FORMULÁRIO DE CRIAÇÃO
  // ==========================================
  const [targetTurma, setTargetTurma] = useState<string>(turmasList[0] || '101');
  const [gameTitle, setGameTitle] = useState('');
  const [gameTopic, setGameTopic] = useState('');
  const [gameMaterial, setGameMaterial] = useState('');
  const [selectedGameMode, setSelectedGameMode] = useState<GameMode>('millionaire');
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
    setSelectedGameMode('millionaire');
    setInternalTab('create_classroom');
  };

  // Iniciar criação para Casa
  const handleOpenCreateHomework = () => {
    setSelectedGameMode('rpg_campaign');
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

    const newActivity: Activity = {
      id: `game_${Date.now()}`,
      title: gameTitle.trim() || `[KronoGame] ${gameTopic || 'Missão Interativa'}`,
      subject: teacher.subject || 'Sociologia',
      turma: targetTurma,
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
      submissions: [],
      totalSubmissions: 0,
      totalStudents: students.filter((s) => s.turma === targetTurma).length,
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

        {/* Menu Superior de Acesso Rápido */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
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
          {/* Barra de Filtro de Turmas */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-slate-900/80 rounded-2xl border border-slate-800">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Filtrar por Turma:</span>
              <div className="relative" ref={turmaDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsTurmaDropdownOpen(!isTurmaDropdownOpen)}
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded-xl text-xs font-bold border border-cyan-500/30 flex items-center gap-2 transition-all cursor-pointer"
                >
                  <Filter className="w-3.5 h-3.5" />
                  <span>{selectedTurmaFilter === 'todas' ? 'Todas as Turmas' : `Turma ${selectedTurmaFilter}`}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {isTurmaDropdownOpen && (
                  <div className="absolute left-0 mt-2 w-48 bg-slate-900 border border-cyan-500/30 rounded-xl shadow-2xl p-1 z-30 space-y-1">
                    <button
                      type="button"
                      onClick={() => { setSelectedTurmaFilter('todas'); setIsTurmaDropdownOpen(false); }}
                      className={`w-full text-left px-3 py-1.5 text-xs rounded-lg transition-all ${
                        selectedTurmaFilter === 'todas' ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      Todas as Turmas
                    </button>
                    {turmasList.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => { setSelectedTurmaFilter(t); setIsTurmaDropdownOpen(false); }}
                        className={`w-full text-left px-3 py-1.5 text-xs rounded-lg transition-all ${
                          selectedTurmaFilter === t ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        Turma {getTurmaLabel(t)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <span className="text-xs text-slate-400">
              Total de Jogos Interativos: <strong className="text-cyan-300">{interactiveActivities.length}</strong>
            </span>
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
                          <span>Testar Jogo</span>
                        </button>
                      )}

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
                    onClick={() => setSelectedGameMode('millionaire')}
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
                    onClick={() => setSelectedGameMode('dialectic_tribunal')}
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
                    onClick={() => setSelectedGameMode('structural_detective')}
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
                      Investigação de causas sociais invisíveis a partir de indícios do caso.
                    </p>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedGameMode('rpg_campaign')}
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
                    onClick={() => setSelectedGameMode('real_life_lab')}
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
                <label className="text-xs font-bold text-slate-300 block mb-1">Turma Alvo</label>
                <select
                  value={targetTurma}
                  onChange={(e) => setTargetTurma(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-400"
                >
                  {turmasList.map((t) => (
                    <option key={t} value={t}>Turma {getTurmaLabel(t)}</option>
                  ))}
                </select>
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
                    className="w-full bg-slate-900 border border-cyan-500/40 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  >
                    <option value="">-- Selecione a atividade formal da turma --</option>
                    {formalActivitiesForBinding.map((act) => (
                      <option key={act.id} value={act.id}>
                        {act.title} (Turma {act.turma})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Botão de Geração */}
            <button
              type="button"
              onClick={handleGenerateGame}
              disabled={isGenerating}
              className="w-full py-3.5 bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 font-black text-sm rounded-2xl transition-all shadow-[0_0_25px_rgba(6,182,212,0.4)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="w-5 h-5 fill-current" />
              <span>{isGenerating ? 'Compilando 6 Estágios com a IA...' : 'Gerar 6 Fases com Co-Op Inclusivo ✨'}</span>
            </button>
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
                    <h3 className="text-base font-black text-white">Revisão Pré-Publicação das 6 Fases</h3>
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

              {/* Fases */}
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

                    {/* Alternativas Regulares */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {stg.options.map((opt, oIdx) => (
                        <div
                          key={oIdx}
                          className={`p-2.5 rounded-xl border text-xs flex items-center justify-between gap-2 ${
                            opt.isCorrect
                              ? 'bg-emerald-950/40 border-emerald-500/60 text-emerald-200'
                              : 'bg-slate-900 border-slate-700 text-slate-300'
                          }`}
                        >
                          <span className="truncate">{opt.iconEmoji || '•'} {opt.text}</span>
                          <span className="text-[10px] font-bold shrink-0">
                            {opt.isCorrect ? '✓ Correta' : 'Distrator'}
                          </span>
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
