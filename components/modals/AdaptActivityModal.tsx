'use client';

import React, { useState, useMemo } from 'react';
import {
  X,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Layers,
  Check,
  Save,
  Gamepad2,
  Cpu,
  Loader2,
  RefreshCw,
  Eye,
  Zap,
  GraduationCap,
  Trophy,
  Link2,
  Unlink,
  BookOpen,
  ArrowRight,
  Shield,
  Crown,
} from 'lucide-react';
import {
  Activity,
  ActivityQuestion,
  StudentUser,
  GameMode,
  GameExecutionContext,
  GameData,
} from '@/lib/types';
import {
  createAdaptedMildModerateActivity,
  createAdaptedSeverePlayfulActivity,
  extractCleanHtml,
} from '@/lib/adaptationUtils';
import { getRecommendedAdaptationForClass, AdaptationRecommendation } from '@/lib/studentUtils';

interface AdaptActivityModalProps {
  activity: Activity | null;
  students?: StudentUser[];
  activities?: Activity[];
  isOpen: boolean;
  onClose: () => void;
  onCreateAdaptedActivity: (adaptedActivity: Activity) => void;
  onUpdateActivityWithAdaptation?: (updatedActivity: Activity) => void;
}

export const AdaptActivityModal: React.FC<AdaptActivityModalProps> = ({
  activity,
  students = [],
  activities = [],
  isOpen,
  onClose,
  onCreateAdaptedActivity,
  onUpdateActivityWithAdaptation,
}) => {
  // Configuração de Vínculo: Opcional (Com Vínculo vs Independente/Standalone)
  const [isStandalone, setIsStandalone] = useState<boolean>(() => !activity);
  const [selectedParentId, setSelectedParentId] = useState<string>(() => activity?.id || '');

  // Campos para Atividade Adaptada Independente (sem vínculo obrigatório)
  const [standaloneTitle, setStandaloneTitle] = useState(
    activity ? `[PNE] ${activity.title.replace(/^\[.*?\]\s*/i, '')}` : 'Atividade Adaptada Inclusiva (AEE)'
  );
  const [standaloneSubject, setStandaloneSubject] = useState(activity?.subject || 'Sociologia');
  const [standaloneTurma, setStandaloneTurma] = useState(
    activity?.turma || students[0]?.turma || 'Turma AEE'
  );
  const [standaloneDescription, setStandaloneDescription] = useState(
    activity?.description || 'Atividade com adaptação curricular especializada para Atendimento Educacional Especializado (AEE).'
  );

  // Atividade alvo efetiva
  const effectiveParentActivity: Activity | null = useMemo(() => {
    if (activity && !isStandalone) return activity;
    if (selectedParentId && activities.length > 0) {
      return activities.find((a) => a.id === selectedParentId) || null;
    }
    return null;
  }, [activity, isStandalone, selectedParentId, activities]);

  const targetTitle = isStandalone ? standaloneTitle : (effectiveParentActivity?.title || 'Atividade');
  const targetSubject = isStandalone ? standaloneSubject : (effectiveParentActivity?.subject || 'Sociologia');
  const targetTurma = isStandalone ? standaloneTurma : (effectiveParentActivity?.turma || 'Geral');
  const targetDescription = isStandalone ? standaloneDescription : (effectiveParentActivity?.description || '');
  const targetQuestions = isStandalone ? [] : (effectiveParentActivity?.questions || []);

  // Decisão pedagógica automática baseada nas deficiências dos alunos da turma
  const recommendation: AdaptationRecommendation = useMemo(() => {
    return getRecommendedAdaptationForClass(targetTurma, students);
  }, [targetTurma, students]);

  // Ferramentas AEE Selecionadas (Checkboxes independentes)
  const [includeMildModerate, setIncludeMildModerate] = useState(
    () => recommendation.recommendedType === 'mild_moderate' || recommendation.recommendedType === 'both'
  );
  const [includeSeverePlayful, setIncludeSeverePlayful] = useState(
    () => recommendation.recommendedType === 'severe_playful' || recommendation.recommendedType === 'both'
  );
  const [includeKronoGames, setIncludeKronoGames] = useState(false);

  const [activeTab, setActiveTab] = useState<'mild_moderate' | 'severe_playful' | 'kronogames'>('mild_moderate');
  const [saveMode, setSaveMode] = useState<'create_copy' | 'overwrite'>('create_copy');

  // Estado para Ferramenta 1: Leve / Moderada (Gemini)
  const [isGeneratingMild, setIsGeneratingMild] = useState(false);
  const [mildAdaptedData, setMildAdaptedData] = useState<{
    adaptedTitle?: string;
    adaptedDescription?: string;
    questions: ActivityQuestion[];
  } | null>(null);
  const [mildError, setMildError] = useState<string | null>(null);

  // Estado para Ferramenta 2: Síndromes Severas (HTML Playful)
  const [customPrompt, setCustomPrompt] = useState('');
  const [isGeneratingPlayful, setIsGeneratingPlayful] = useState(false);
  const [playfulHtml, setPlayfulHtml] = useState<string | null>(
    activity?.playfulGameHtml ? extractCleanHtml(activity.playfulGameHtml) : null
  );
  const [playfulError, setPlayfulError] = useState<string | null>(null);
  const [previewTab, setPreviewTab] = useState<'game' | 'code'>('game');

  // Estado para Ferramenta 3: KronoGames Inclusivo AEE (6 rodadas em dupla/grupo/individual)
  const [kronoGameMode, setKronoGameMode] = useState<GameMode>('millionaire');
  const [kronoGameContext, setKronoGameContext] = useState<GameExecutionContext>('classroom_group');
  const [kronoGameData, setKronoGameData] = useState<GameData | null>(null);
  const [isGeneratingKronoGame, setIsGeneratingKronoGame] = useState(false);
  const [kronoGameError, setKronoGameError] = useState<string | null>(null);

  // Estado global de geração conjunta
  const [isGeneratingBoth, setIsGeneratingBoth] = useState(false);

  if (!isOpen) return null;

  const toggleMildModerate = () => {
    const nextVal = !includeMildModerate;
    if (!nextVal && !includeSeverePlayful && !includeKronoGames) {
      setIncludeSeverePlayful(true);
      setActiveTab('severe_playful');
    }
    setIncludeMildModerate(nextVal);
    if (nextVal) setActiveTab('mild_moderate');
  };

  const toggleSeverePlayful = () => {
    const nextVal = !includeSeverePlayful;
    if (!nextVal && !includeMildModerate && !includeKronoGames) {
      setIncludeMildModerate(true);
      setActiveTab('mild_moderate');
    }
    setIncludeSeverePlayful(nextVal);
    if (nextVal) setActiveTab('severe_playful');
  };

  const toggleKronoGames = () => {
    const nextVal = !includeKronoGames;
    if (!nextVal && !includeMildModerate && !includeSeverePlayful) {
      setIncludeMildModerate(true);
      setActiveTab('mild_moderate');
    }
    setIncludeKronoGames(nextVal);
    if (nextVal) setActiveTab('kronogames');
  };

  // Gerar Adaptação Leve / Moderada via Gemini
  const handleGenerateMildAdaptation = async () => {
    setIsGeneratingMild(true);
    setMildError(null);
    try {
      const response = await fetch('/api/gemini/adapt-mild-moderate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: targetTitle,
          subject: targetSubject,
          description: targetDescription,
          turma: targetTurma,
          questions: targetQuestions,
          maxGrade: 10,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Erro ao gerar adaptação leve/moderada com o Gemini.');
      }

      if (!data.questions || data.questions.length === 0) {
        throw new Error('O Gemini não retornou questões adaptadas válidas.');
      }

      setMildAdaptedData({
        adaptedTitle: data.adaptedTitle,
        adaptedDescription: data.adaptedDescription,
        questions: data.questions,
      });
    } catch (err: any) {
      console.error('Erro na adaptação leve/moderada:', err);
      setMildError(err.message || 'Falha ao adaptar com o Gemini. Tente novamente.');
    } finally {
      setIsGeneratingMild(false);
    }
  };

  // Gerar Jogo Lúdico para Síndromes Severas via Gemini
  const handleGeneratePlayfulGame = async () => {
    setIsGeneratingPlayful(true);
    setPlayfulError(null);
    try {
      const response = await fetch('/api/gemini/adapt-playful', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: targetTitle,
          subject: targetSubject,
          description: targetDescription,
          turma: targetTurma,
          questions: targetQuestions,
          maxGrade: 10,
          customPrompt,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Erro ao gerar o jogo lúdico com o Gemini.');
      }

      if (!data.html) {
        throw new Error('Nenhum código HTML retornado pelo Gemini.');
      }

      setPlayfulHtml(extractCleanHtml(data.html));
    } catch (err: any) {
      console.error('Erro na geração de jogo lúdico:', err);
      setPlayfulError(err.message || 'Falha ao gerar o jogo lúdico com o Gemini. Tente novamente.');
    } finally {
      setIsGeneratingPlayful(false);
    }
  };

  // Gerar KronoGames Inclusivo AEE (6 rodadas gamificadas com inclusão PNE embutida)
  const handleGenerateKronoGame = async () => {
    setIsGeneratingKronoGame(true);
    setKronoGameError(null);
    try {
      const response = await fetch('/api/gemini/generate-game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: targetTitle,
          subject: targetSubject,
          topic: targetTitle,
          supportMaterial: targetDescription,
          gameMode: kronoGameMode,
          isAdaptedOnly: true,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Erro ao gerar KronoGame Inclusivo.');
      }

      setKronoGameData(data.gameData);
    } catch (err: any) {
      console.error('Erro na geração de KronoGame AEE:', err);
      setKronoGameError(err.message || 'Falha ao gerar KronoGame com o Gemini.');
    } finally {
      setIsGeneratingKronoGame(false);
    }
  };

  // Gerar todas as ferramentas selecionadas
  const handleGenerateAllSelected = async () => {
    setIsGeneratingBoth(true);
    const tasks: Promise<any>[] = [];
    if (includeMildModerate) tasks.push(handleGenerateMildAdaptation());
    if (includeSeverePlayful) tasks.push(handleGeneratePlayfulGame());
    if (includeKronoGames) tasks.push(handleGenerateKronoGame());
    try {
      await Promise.allSettled(tasks);
    } finally {
      setIsGeneratingBoth(false);
    }
  };

  // Salvar adaptações
  const handleSaveSelectedAdaptations = () => {
    const parentIdToLink = isStandalone ? undefined : (effectiveParentActivity?.id || undefined);

    const baseActivityTemplate: Activity = effectiveParentActivity || {
      id: `act-standalone-${Date.now()}`,
      title: targetTitle,
      subject: targetSubject,
      description: targetDescription,
      turma: targetTurma,
      type: 'Avaliação',
      status: 'Ativo',
      deadline: 'Amanhã, 23:59',
      maxGrade: 10,
      totalSubmissions: 0,
      totalStudents: 1,
      pendingCorrection: 0,
      submissions: [],
    };

    if (includeMildModerate && mildAdaptedData) {
      const adaptedMild = createAdaptedMildModerateActivity(baseActivityTemplate, mildAdaptedData);
      adaptedMild.isAdapted = true;
      adaptedMild.isStandaloneAdaptation = isStandalone ? true : undefined;
      adaptedMild.adaptedFromId = parentIdToLink;
      onCreateAdaptedActivity(adaptedMild);
    }

    if (includeSeverePlayful && playfulHtml) {
      const adaptedSevere = createAdaptedSeverePlayfulActivity(baseActivityTemplate, playfulHtml);
      adaptedSevere.isAdapted = true;
      adaptedSevere.isStandaloneAdaptation = isStandalone ? true : undefined;
      adaptedSevere.adaptedFromId = parentIdToLink;
      onCreateAdaptedActivity(adaptedSevere);
    }

    if (includeKronoGames && kronoGameData) {
      const adaptedKrono: Activity = {
        id: `act-krono-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        title: `[AEE KronoGames] ${targetTitle.replace(/^\[.*?\]\s*/i, '')}`,
        subject: targetSubject,
        description: targetDescription || 'Jogo avaliativo adaptado KronoGames com inclusão automática.',
        turma: targetTurma,
        type: 'Jogo Avaliativo',
        status: 'Ativo',
        deadline: 'Amanhã, 23:59',
        maxGrade: 10,
        allowGroupWork: kronoGameContext === 'classroom_group',
        isAdapted: true,
        adaptationType: 'mild_moderate',
        isStandaloneAdaptation: isStandalone ? true : undefined,
        adaptedFromId: parentIdToLink,
        isGameActivity: true,
        gameMode: kronoGameMode,
        executionContext: kronoGameContext,
        gameData: kronoGameData,
        submissions: [],
        totalSubmissions: 0,
        totalStudents: 1,
        pendingCorrection: 0,
      };
      onCreateAdaptedActivity(adaptedKrono);
    }

    onClose();
  };

  const isBusy = isGeneratingMild || isGeneratingPlayful || isGeneratingKronoGame || isGeneratingBoth;

  const canSave =
    (
      (includeMildModerate && Boolean(mildAdaptedData && mildAdaptedData.questions.length > 0)) ||
      (includeSeverePlayful && Boolean(playfulHtml)) ||
      (includeKronoGames && Boolean(kronoGameData))
    ) && !isBusy;

  const activeSelectedCount =
    (includeMildModerate ? 1 : 0) + (includeSeverePlayful ? 1 : 0) + (includeKronoGames ? 1 : 0);

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-2.5 sm:p-4 md:p-6 overflow-y-auto animate-fadeIn">
      <div className="bg-surface border border-white/15 rounded-2xl sm:rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto text-foreground">
        
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-border flex items-start sm:items-center justify-between gap-3 shrink-0 bg-surface/80">
          <div className="min-w-0 pr-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" /> Central de Atividades Adaptadas (AEE)
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-foreground leading-snug truncate">
              {isStandalone ? 'Criação de Atividade Adaptada Independente' : `Adaptação da Atividade: ${targetTitle}`}
            </h2>
            <p className="text-xs text-muted mt-0.5 line-clamp-2 sm:line-clamp-1">
              Ferramentas de redução cognitiva, jogos lúdicos táteis e motor KronoGames com vínculo opcional.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-surface-hover rounded-full text-muted hover:text-foreground transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="p-3.5 sm:p-6 overflow-y-auto space-y-4 sm:space-y-6 flex-1 custom-scrollbar">
          
          {/* VÍNCULO OPCIONAL: SELETOR DE VÍNCULO OU STANDALONE */}
          <div className="p-4 bg-surface rounded-2xl border border-border space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold text-foreground flex items-center gap-2">
                <Link2 className="w-4 h-4 text-primary" />
                Vínculo com Atividade Mãe (Opcional):
              </span>
              <div className="flex items-center gap-1 bg-surface-hover p-1 rounded-xl border border-border text-xs">
                <button
                  type="button"
                  onClick={() => setIsStandalone(false)}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    !isStandalone
                      ? 'bg-primary text-black shadow-sm'
                      : 'text-muted hover:text-foreground'
                  }`}
                >
                  <Link2 className="w-3.5 h-3.5" />
                  <span>Com Vínculo</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsStandalone(true)}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    isStandalone
                      ? 'bg-amber-500 text-black shadow-sm'
                      : 'text-muted hover:text-foreground'
                  }`}
                >
                  <Unlink className="w-3.5 h-3.5" />
                  <span>Independente / Standalone</span>
                </button>
              </div>
            </div>

            {/* Vínculo Selecionado */}
            {!isStandalone ? (
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-muted">
                  Selecione a Avaliação Mãe a vincular:
                </label>
                <select
                  value={selectedParentId}
                  onChange={(e) => setSelectedParentId(e.target.value)}
                  className="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary"
                >
                  {activity && <option value={activity.id}>{activity.title} ({activity.turma})</option>}
                  {activities
                    .filter((a) => !activity || a.id !== activity.id)
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.title} ({a.turma})
                      </option>
                    ))}
                </select>
                <p className="text-[11px] text-muted">
                  Esta adaptação responderá como versão PNE subordinada à avaliação selecionada.
                </p>
              </div>
            ) : (
              /* Standalone form inputs */
              <div className="space-y-3 pt-1 border-t border-border">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-muted mb-1">
                      Título da Atividade Adaptada *
                    </label>
                    <input
                      type="text"
                      value={standaloneTitle}
                      onChange={(e) => setStandaloneTitle(e.target.value)}
                      placeholder="Ex: [AEE] Cidadania e Direitos Sociais"
                      className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-amber-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted mb-1">
                      Turma(s) *
                    </label>
                    <input
                      type="text"
                      value={standaloneTurma}
                      onChange={(e) => setStandaloneTurma(e.target.value)}
                      placeholder="Ex: 101, 102"
                      className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">
                    Tema / Orientações Inclusivas
                  </label>
                  <textarea
                    rows={2}
                    value={standaloneDescription}
                    onChange={(e) => setStandaloneDescription(e.target.value)}
                    placeholder="Instruções pedagógicas de mediação e foco de aprendizagem..."
                    className="w-full bg-surface border border-border rounded-xl p-3 text-xs text-foreground focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>
            )}
          </div>

          {/* DECISÃO PEDAGÓGICA AUTOMÁTICA PELA DEFICIÊNCIA DO ALUNO */}
          <div className="p-4 bg-emerald-950/30 border border-emerald-500/30 rounded-2xl flex items-start gap-3.5">
            <div className="p-2.5 bg-emerald-100 rounded-xl text-emerald-400 border border-emerald-500/30 shrink-0 mt-0.5">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div className="space-y-1.5 text-xs flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-bold text-emerald-600">
                  Decisão Pedagógica Automática (AEE)
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-600 border border-emerald-500/30">
                  {recommendation.recommendedType === 'severe_playful'
                    ? 'Recomendado: Jogo Lúdico'
                    : recommendation.recommendedType === 'both'
                    ? 'Recomendado: Ambas as Modalidades'
                    : 'Recomendado: Leve / Moderada'}
                </span>
              </div>
              <p className="text-foreground leading-relaxed">
                {recommendation.summaryText}
              </p>
            </div>
          </div>

          {/* AS 3 FERRAMENTAS DA CENTRAL DE ATIVIDADES ADAPTADAS */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Ferramentas da Central AEE (Selecione uma ou mais)</span>
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Ferramenta 1: Leves e Moderadas */}
              <div
                onClick={toggleMildModerate}
                className={`p-4 rounded-2xl border flex items-start gap-3 cursor-pointer transition-all ${
                  includeMildModerate
                    ? 'bg-emerald-500/15 border-emerald-500/50 shadow-md'
                    : 'bg-surface border-border opacity-70 hover:opacity-100'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-md border mt-0.5 flex items-center justify-center shrink-0 ${
                    includeMildModerate ? 'bg-emerald-500 text-black border-emerald-400' : 'border-border'
                  }`}
                >
                  {includeMildModerate && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <Cpu className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="text-xs font-bold text-foreground truncate">1. Leve / Moderada</span>
                  </div>
                  <p className="text-[11px] text-muted leading-relaxed">
                    Redução de 50% de carga cognitiva, 2 opções por objetiva e piso zero de caracteres.
                  </p>
                </div>
              </div>

              {/* Ferramenta 2: Síndromes Severas (HTML) */}
              <div
                onClick={toggleSeverePlayful}
                className={`p-4 rounded-2xl border flex items-start gap-3 cursor-pointer transition-all ${
                  includeSeverePlayful
                    ? 'bg-amber-500/15 border-amber-500/50 shadow-md'
                    : 'bg-surface border-border opacity-70 hover:opacity-100'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-md border mt-0.5 flex items-center justify-center shrink-0 ${
                    includeSeverePlayful ? 'bg-amber-500 text-black border-amber-400' : 'border-border'
                  }`}
                >
                  {includeSeverePlayful && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <Gamepad2 className="w-4 h-4 text-amber-400 shrink-0" />
                    <span className="text-xs font-bold text-foreground truncate">2. Jogo Lúdico HTML</span>
                  </div>
                  <p className="text-[11px] text-muted leading-relaxed">
                    Jogo gamificado em tela cheia com botões táteis, áudios suaves e estrelas.
                  </p>
                </div>
              </div>

              {/* Ferramenta 3: KronoGames Inclusivo AEE */}
              <div
                onClick={toggleKronoGames}
                className={`p-4 rounded-2xl border flex items-start gap-3 cursor-pointer transition-all ${
                  includeKronoGames
                    ? 'bg-cyan-500/15 border-cyan-500/50 shadow-md'
                    : 'bg-surface border-border opacity-70 hover:opacity-100'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-md border mt-0.5 flex items-center justify-center shrink-0 ${
                    includeKronoGames ? 'bg-cyan-500 text-black border-cyan-400' : 'border-border'
                  }`}
                >
                  {includeKronoGames && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <Trophy className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span className="text-xs font-bold text-foreground truncate">3. KronoGames AEE</span>
                  </div>
                  <p className="text-[11px] text-muted leading-relaxed">
                    Motor de 6 rodadas com Arena do Milhão, Tribunal, RPG e Laboratório, com laudos embutidos.
                  </p>
                </div>
              </div>
            </div>

            {/* Ação Conjunta */}
            {activeSelectedCount > 1 && (
              <div className="p-3 bg-gradient-to-r from-emerald-500/10 via-amber-500/10 to-cyan-500/10 border border-border rounded-2xl flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs text-foreground font-semibold flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  {activeSelectedCount} ferramentas selecionadas para geração simultânea
                </span>
                <button
                  type="button"
                  onClick={handleGenerateAllSelected}
                  disabled={isBusy}
                  className="px-4 py-2 bg-gradient-to-r from-emerald-500 via-amber-500 to-cyan-500 hover:opacity-90 text-black font-extrabold rounded-xl text-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isGeneratingBoth ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Gerando Todas pelo Gemini...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-3.5 h-3.5" />
                      <span>Gerar Todas com Gemini</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Abas de Navegação / Ferramentas */}
          <div className="flex border-b border-border gap-2 overflow-x-auto custom-scrollbar">
            {includeMildModerate && (
              <button
                type="button"
                onClick={() => setActiveTab('mild_moderate')}
                className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all cursor-pointer flex items-center gap-2 border-b-2 whitespace-nowrap ${
                  activeTab === 'mild_moderate'
                    ? 'border-emerald-400 text-emerald-400 bg-emerald-500/10'
                    : 'border-transparent text-muted hover:text-foreground'
                }`}
              >
                <Cpu className="w-4 h-4" />
                <span>1. Leve / Moderada</span>
                {mildAdaptedData && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
              </button>
            )}

            {includeSeverePlayful && (
              <button
                type="button"
                onClick={() => setActiveTab('severe_playful')}
                className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all cursor-pointer flex items-center gap-2 border-b-2 whitespace-nowrap ${
                  activeTab === 'severe_playful'
                    ? 'border-amber-400 text-amber-400 bg-amber-500/10'
                    : 'border-transparent text-muted hover:text-foreground'
                }`}
              >
                <Gamepad2 className="w-4 h-4" />
                <span>2. Jogo Lúdico HTML</span>
                {playfulHtml && <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />}
              </button>
            )}

            {includeKronoGames && (
              <button
                type="button"
                onClick={() => setActiveTab('kronogames')}
                className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all cursor-pointer flex items-center gap-2 border-b-2 whitespace-nowrap ${
                  activeTab === 'kronogames'
                    ? 'border-cyan-400 text-cyan-400 bg-cyan-500/10'
                    : 'border-transparent text-muted hover:text-foreground'
                }`}
              >
                <Trophy className="w-4 h-4" />
                <span>3. KronoGames AEE</span>
                {kronoGameData && <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />}
              </button>
            )}
          </div>

          {/* PAINEL 1: LEVE E MODERADA */}
          {activeTab === 'mild_moderate' && includeMildModerate && (
            <div className="space-y-4 pt-1 animate-fadeIn">
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                    <Cpu className="w-4 h-4" /> Adaptação Curricular Leve/Moderada (Gemini)
                  </span>
                  <p className="text-xs text-muted max-w-lg">
                    Gera enunciados objetivos com 2 opções diretas e dissertativas com roteiro facilitado.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleGenerateMildAdaptation}
                  disabled={isGeneratingMild || isGeneratingBoth}
                  className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold rounded-xl text-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isGeneratingMild ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Adaptando...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>{mildAdaptedData ? 'Regerar com Gemini' : 'Gerar com Gemini'}</span>
                    </>
                  )}
                </button>
              </div>

              {mildError && (
                <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl text-xs text-rose-400 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{mildError}</span>
                </div>
              )}

              {mildAdaptedData && (
                <div className="p-4 bg-surface border border-emerald-500/30 rounded-2xl space-y-3">
                  <h4 className="text-xs font-bold text-emerald-400">
                    {mildAdaptedData.adaptedTitle} ({mildAdaptedData.questions.length} Questões Adaptadas)
                  </h4>
                  <p className="text-xs text-muted leading-relaxed">
                    {mildAdaptedData.adaptedDescription}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* PAINEL 2: JOGO LÚDICO HTML */}
          {activeTab === 'severe_playful' && includeSeverePlayful && (
            <div className="space-y-4 pt-1 animate-fadeIn">
              <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                    <Gamepad2 className="w-4 h-4" /> Jogo Lúdico Gamificado em HTML (Síndromes Severas)
                  </span>
                  <p className="text-xs text-muted max-w-lg">
                    Gera um jogo em tela cheia com ilustrações, botões ampliados e áudios comemorativos.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleGeneratePlayfulGame}
                  disabled={isGeneratingPlayful || isGeneratingBoth}
                  className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-extrabold rounded-xl text-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isGeneratingPlayful ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Gerando Jogo HTML...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>{playfulHtml ? 'Regerar Jogo HTML' : 'Gerar Jogo Lúdico HTML'}</span>
                    </>
                  )}
                </button>
              </div>

              {playfulError && (
                <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl text-xs text-rose-400 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{playfulError}</span>
                </div>
              )}

              {playfulHtml && (
                <div className="p-4 bg-surface border border-amber-500/30 rounded-2xl space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Código do Jogo Lúdico HTML5 Gerado e Pronto para Execução!</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* PAINEL 3: KRONOGAMES AEE */}
          {activeTab === 'kronogames' && includeKronoGames && (
            <div className="space-y-4 pt-1 animate-fadeIn">
              <div className="p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-2xl space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
                      <Trophy className="w-4 h-4" /> Motor KronoGames Inclusivo AEE (6 Rodadas)
                    </span>
                    <p className="text-xs text-muted max-w-lg">
                      Gera roteiro com 6 desafios e adaptações integradas para duplas e grupos com colegas PNE.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleGenerateKronoGame}
                    disabled={isGeneratingKronoGame || isGeneratingBoth}
                    className="px-4 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold rounded-xl text-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isGeneratingKronoGame ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Gerando KronoGame...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>{kronoGameData ? 'Regerar KronoGame' : 'Gerar KronoGame com IA'}</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Seletores de Contexto e Modo */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-border">
                  <div>
                    <label className="block text-xs font-semibold text-muted mb-1">Contexto:</label>
                    <select
                      value={kronoGameContext}
                      onChange={(e) => {
                        const ctx = e.target.value as GameExecutionContext;
                        setKronoGameContext(ctx);
                        setKronoGameMode(ctx === 'classroom_group' ? 'millionaire' : 'rpg_campaign');
                      }}
                      className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-cyan-400"
                    >
                      <option value="classroom_group">🏫 Sala de Aula (Dupla ou Grupo)</option>
                      <option value="homework_individual">🏠 Para Casa (Individual)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted mb-1">Modo de Jogo:</label>
                    <select
                      value={kronoGameMode}
                      onChange={(e) => setKronoGameMode(e.target.value as GameMode)}
                      className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-cyan-400"
                    >
                      {kronoGameContext === 'classroom_group' ? (
                        <>
                          <option value="millionaire">🏆 Arena do Milhão</option>
                          <option value="dialectic_tribunal">⚖️ Tribunal Dialético</option>
                        </>
                      ) : (
                        <>
                          <option value="rpg_campaign">👑 Crônicas da Pólis (RPG)</option>
                          <option value="real_life_lab">🔬 Laboratório da Vida Real</option>
                        </>
                      )}
                    </select>
                  </div>
                </div>
              </div>

              {kronoGameError && (
                <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl text-xs text-rose-400 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{kronoGameError}</span>
                </div>
              )}

              {kronoGameData && (
                <div className="p-4 bg-surface border border-cyan-500/30 rounded-2xl space-y-2 text-xs text-cyan-400 animate-fadeIn">
                  <div className="flex items-center gap-2 font-bold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Roteiro de 6 Rodadas Inclusivas Pronto!</span>
                  </div>
                  <p className="text-muted text-[11px] leading-relaxed">
                    {kronoGameData.introText}
                  </p>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="p-3.5 sm:p-6 border-t border-border flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3 bg-surface/80 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 rounded-full text-xs font-semibold text-muted hover:text-foreground hover:bg-surface-hover transition-colors cursor-pointer min-h-[44px] flex items-center justify-center"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleSaveSelectedAdaptations}
            disabled={!canSave}
            className="w-full sm:w-auto px-6 py-3 bg-primary hover:bg-primary-hover text-black font-extrabold rounded-full text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-primary/20 disabled:opacity-40 disabled:cursor-not-allowed min-h-[44px]"
          >
            <Sparkles className="w-4 h-4 stroke-[2.5]" />
            <span>Salvar Atividades Adaptadas Selecionadas</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdaptActivityModal;
