'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Sparkles,
  Users,
  Gamepad2,
  FileText,
  Plus,
  CheckCircle2,
  AlertCircle,
  BookOpen,
  Send,
  Layers,
  Link2,
  Eye,
  Trash2,
  Clock,
  ShieldCheck,
  ChevronRight,
  Loader2,
  Award,
  ChevronDown,
  Filter,
  Check,
  HeartHandshake,
  Heart,
  Dna,
  Wrench,
  FolderOpen,
  HelpCircle,
  Play
} from 'lucide-react';
import {
  Activity,
  StudentUser,
  TeacherUser,
  AeeMechanic,
  AeePromptSettings,
  GameData,
} from '@/lib/types';
import {
  isStudentPNE,
  isActivityAdapted,
  getRecommendedAdaptationForClass,
  isSevereCondition,
  getOriginalTurmas,
  getTurmaLabel
} from '@/lib/studentUtils';
import { KronoIcon } from '@/components/ui/KronoIcon';

interface AdaptedActivitiesViewProps {
  activities: Activity[];
  students: StudentUser[];
  teacher: TeacherUser;
  onOpenNewActivityModal?: () => void;
  onOpenAdaptActivityModal?: (activity: Activity) => void;
  onDeleteActivity?: (activityId: string) => void;
  onSaveCreatedActivity: (activity: Activity) => Promise<void> | void;
  onPlayGamePreview?: (activity: Activity) => void;
}

const getDefaultAeeDeadlineString = () => {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().split('T')[0];
};

export const AdaptedActivitiesView: React.FC<AdaptedActivitiesViewProps> = ({
  activities,
  students,
  teacher,
  onOpenAdaptActivityModal,
  onDeleteActivity,
  onSaveCreatedActivity,
  onPlayGamePreview,
}) => {
  // Menu Superior Exclusivo da Central AEE:
  // 1. Radar Neuro-Pedagógico da Turma (Anti-Fragmentação)
  // 2. Construtor AEE (Estrutura de Pedidos Adaptados)
  // 3. Banco de Atividades Adaptadas Ativas
  const [activeMenuTab, setActiveMenuTab] = useState<'radar' | 'builder' | 'bank'>('radar');

  // Turmas da escola
  const turmasList = useMemo(() => getOriginalTurmas(students), [students]);
  const [selectedTurma, setSelectedTurma] = useState<string>(turmasList[0] || '101');

  // Alunos PNE da turma selecionada
  const pneStudentsInTurma = useMemo(() => {
    return students.filter((s) => s.turma === selectedTurma && isStudentPNE(s));
  }, [students, selectedTurma]);

  // Diagnóstico / Radar Neuro-Pedagógico Anti-Fragmentação
  const classRecommendation = useMemo(() => {
    return getRecommendedAdaptationForClass(selectedTurma, students);
  }, [selectedTurma, students]);

  // Atividades Adaptadas existentes no banco
  const adaptedActivitiesList = useMemo(() => {
    return activities.filter((act) => {
      const adapted = isActivityAdapted(act) || act.activityDomain === 'adapted_aee';
      if (!adapted) return false;
      if (selectedTurma === 'todas') return true;
      return act.turma === selectedTurma || act.turma?.includes(selectedTurma);
    });
  }, [activities, selectedTurma]);

  // Atividades Regulares da turma para vínculo opcional
  const regularActivitiesInTurma = useMemo(() => {
    return activities.filter((act) => !isActivityAdapted(act) && act.activityDomain !== 'adapted_aee' && act.turma === selectedTurma);
  }, [activities, selectedTurma]);

  // ==========================================
  // ESTADOS DO CONSTRUTOR AEE
  // ==========================================
  const [aeeTopic, setAeeTopic] = useState('');
  const [aeeMaterial, setAeeMaterial] = useState('');
  const [aeeDeadline, setAeeDeadline] = useState(getDefaultAeeDeadlineString);
  const [selectedMechanic, setSelectedMechanic] = useState<AeeMechanic>('visual_cards');
  
  // Painel de Diretrizes Sensoriais e Cognitivas
  const [promptSettings, setPromptSettings] = useState<AeePromptSettings>({
    literalLanguage: true,
    cognitiveReduction: true,
    uppercaseText: false,
    concreteExamples: true,
  });

  // Gestor de Vínculo Opcional
  const [bindingMode, setBindingMode] = useState<'standalone' | 'linked'>('standalone');
  const [linkedParentId, setLinkedParentId] = useState<string>('');

  // Estados de IA e Pré-Publicação
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedGameData, setGeneratedGameData] = useState<GameData | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Iniciar criação direta a partir da recomendação do radar
  const handleApplyRecommendationToBuilder = () => {
    if (classRecommendation.recommendedType === 'severe_playful') {
      setSelectedMechanic('visual_cards');
      setPromptSettings((prev) => ({ ...prev, uppercaseText: true, literalLanguage: true }));
    } else {
      setSelectedMechanic('binary_trail');
      setPromptSettings((prev) => ({ ...prev, cognitiveReduction: true, literalLanguage: true }));
    }
    setActiveMenuTab('builder');
  };

  // Gerar Atividade Adaptada com IA
  const handleGenerateAeeActivity = async () => {
    if (!aeeTopic.trim()) {
      alert('Informe o tema ou objetivo de aprendizagem para gerar a atividade adaptada.');
      return;
    }

    setIsGenerating(true);
    try {
      const res = await fetch('/api/gemini/generate-interactive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'adapted_aee',
          title: `[AEE Adaptada] ${aeeTopic}`,
          subject: teacher.subject || 'Educação Especial / AEE',
          topic: aeeTopic.trim(),
          supportMaterial: aeeMaterial.trim(),
          aeeMechanic: selectedMechanic,
          aeePromptSettings: promptSettings,
          adaptationRecommendation: classRecommendation,
        }),
      });

      if (!res.ok) throw new Error('Falha ao gerar atividade adaptada');
      const data = await res.json();

      if (data.gameData) {
        setGeneratedGameData(data.gameData);
      }
    } catch (err: any) {
      console.error('Erro ao compilar atividade AEE:', err);
      alert('Houve um erro ao gerar a atividade adaptada. Tente novamente.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Publicar Atividade Adaptada na Central
  const handlePublishAdaptedActivity = async () => {
    if (!generatedGameData) return;

    const newActivity: Activity = {
      id: `aee_${Date.now()}`,
      title: `[AEE Inclusiva] ${aeeTopic.trim() || 'Atividade Adaptada'}`,
      subject: teacher.subject || 'Educação Especial',
      turma: selectedTurma,
      deadline: aeeDeadline,
      description: generatedGameData.introText || `Atividade adaptada de inclusão para os alunos PNE da turma ${selectedTurma}.`,
      supportMaterial: aeeMaterial || '',
      type: 'Jogo Avaliativo',
      status: 'Ativo',
      maxGrade: 10,
      allowGroupWork: false, // Atividades adaptadas são individuais e focadas na autonomia
      isAdapted: true,
      activityDomain: 'adapted_aee',
      isStandaloneAdaptation: bindingMode === 'standalone',
      adaptedFromId: bindingMode === 'linked' ? linkedParentId : undefined,
      adaptationType: classRecommendation.recommendedType === 'severe_playful' ? 'severe_playful' : 'mild_moderate',
      adaptationReason: classRecommendation.summaryText,
      aeeMechanic: selectedMechanic,
      aeePromptSettings: promptSettings,
      isGameActivity: true,
      gameData: generatedGameData,
      submissions: [],
      totalSubmissions: 0,
      totalStudents: pneStudentsInTurma.length,
      pendingCorrection: 0,
    };

    await onSaveCreatedActivity(newActivity);
    setSuccessBanner(`✨ Atividade Inclusiva publicada com sucesso para os ${pneStudentsInTurma.length} alunos PNE da Turma ${selectedTurma}!`);
    setGeneratedGameData(null);
    setAeeTopic('');
    setAeeMaterial('');
    setActiveMenuTab('bank');
    setTimeout(() => setSuccessBanner(null), 5000);
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-fadeIn pb-12">
      {/* Header Central AEE */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-border">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Sparkles className="w-5 h-5" />
            </span>
            <span className="text-xs font-black uppercase tracking-wider text-amber-400">
              Educação Inclusiva & AEE • Ensino Médio
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-foreground tracking-tight">
            Central de Atividades Adaptadas
          </h1>
          <p className="text-xs sm:text-sm text-muted mt-1 max-w-2xl leading-relaxed">
            Área exclusiva para adaptação neuro-pedagógica com motor anti-fragmentação de laudos. Alunos regulares nunca têm acesso e a 2ª Professora acompanha tudo em tempo real.
          </p>
        </div>

        {/* Seletor Rápido de Turma */}
        <div className="flex items-center gap-2 bg-surface p-2 rounded-2xl border border-border">
          <span className="text-xs font-bold text-muted pl-1">Turma:</span>
          <select
            value={selectedTurma}
            onChange={(e) => setSelectedTurma(e.target.value)}
            className="bg-background border border-border rounded-xl px-3 py-1.5 text-xs text-foreground font-bold focus:outline-none focus:border-primary"
          >
            {turmasList.map((t) => (
              <option key={t} value={t}>Turma {getTurmaLabel(t)}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Menu Superior Exclusivo da Central AEE */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border pb-3">
        <button
          type="button"
          onClick={() => setActiveMenuTab('radar')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 cursor-pointer border ${
            activeMenuTab === 'radar'
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-md ring-1 ring-amber-400/30'
              : 'bg-surface hover:bg-surface-hover text-muted border-border'
          }`}
        >
          <Dna className="w-4 h-4 text-amber-400" />
          <span>🧬 Radar Neuro-Pedagógico (Anti-Fragmentação)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMenuTab('builder')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 cursor-pointer border ${
            activeMenuTab === 'builder'
              ? 'bg-primary/20 text-primary border-primary/50 shadow-md ring-1 ring-primary/30'
              : 'bg-surface hover:bg-surface-hover text-muted border-border'
          }`}
        >
          <Wrench className="w-4 h-4 text-primary" />
          <span>🛠️ Construtor AEE (Pedidos Adaptados)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMenuTab('bank')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 cursor-pointer border ${
            activeMenuTab === 'bank'
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-md ring-1 ring-emerald-400/30'
              : 'bg-surface hover:bg-surface-hover text-muted border-border'
          }`}
        >
          <FolderOpen className="w-4 h-4 text-emerald-400" />
          <span>📂 Banco de Atividades Adaptadas</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-surface-hover font-mono font-bold">
            {adaptedActivitiesList.length}
          </span>
        </button>
      </div>

      {/* Banner de Sucesso */}
      {successBanner && (
        <div className="p-4 bg-emerald-500/15 border border-emerald-400/50 text-emerald-300 rounded-2xl text-xs sm:text-sm flex items-center gap-3 animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
          <span className="font-bold">{successBanner}</span>
        </div>
      )}

      {/* =========================================================================
          ABA 1: RADAR NEURO-PEDAGÓGICO DA TURMA (ANTI-FRAGMENTAÇÃO DE LAUDOS)
      ========================================================================= */}
      {activeMenuTab === 'radar' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="glass-panel p-6 rounded-3xl border border-amber-500/30 space-y-5 bg-gradient-to-br from-amber-500/5 via-surface to-background shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border">
              <div className="flex items-center gap-3">
                <span className="p-3 rounded-2xl bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  <Dna className="w-6 h-6" />
                </span>
                <div>
                  <h2 className="text-lg sm:text-xl font-black text-foreground">
                    Diagnóstico Neuro-Pedagógico da Turma {selectedTurma}
                  </h2>
                  <p className="text-xs text-muted">
                    Motor Anti-Fragmentação: Agrupa todos os laudos da turma e recomenda uma única estratégia inclusiva integrada.
                  </p>
                </div>
              </div>

              <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-500/15 text-amber-300 border border-amber-500/30 w-fit">
                {pneStudentsInTurma.length} Aluno(s) PNE na Turma
              </span>
            </div>

            {/* Resumo da Recomendação Anti-Fragmentação */}
            <div className="p-4 bg-surface rounded-2xl border border-border space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                  Diretriz Pedagógica Consolidada:
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary font-bold">
                  {classRecommendation.recommendedType === 'severe_playful'
                    ? 'Adaptação Lúdica / Visual (Laudos Severos Presentes)'
                    : 'Adaptação Curricular Leve/Moderada (Cognição Preservada)'}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-foreground leading-relaxed font-medium">
                {classRecommendation.summaryText}
              </p>
            </div>

            {/* Lista de Alunos e Laudos Agrupados */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-muted uppercase tracking-wider">
                Alunos com Laudo PNE / AEE nesta Turma:
              </h3>

              {pneStudentsInTurma.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted border border-dashed border-border rounded-2xl">
                  Nenhum aluno com laudo PNE cadastrado na Turma {selectedTurma}.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {pneStudentsInTurma.map((st) => (
                    <div
                      key={st.id}
                      className="p-3.5 rounded-2xl bg-surface border border-border flex items-start gap-3 shadow-sm"
                    >
                      <img
                        src={st.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
                        alt={st.fullName}
                        className="w-10 h-10 rounded-full object-cover border border-amber-500/40 shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <strong className="text-xs font-bold text-foreground block truncate">
                          {st.fullName}
                        </strong>
                        <span className="text-[10px] text-muted block">Matrícula: {st.matricula}</span>
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {(st.pneConditions && st.pneConditions.length > 0
                            ? st.pneConditions
                            : ['Laudo PNE Geral']
                          ).map((c, idx) => (
                            <span
                              key={idx}
                              className={`text-[9px] px-1.5 py-0.2 rounded-md font-bold ${
                                isSevereCondition(c)
                                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              }`}
                            >
                              {c}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Ação Rápida: Transição Direta para o Construtor */}
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={handleApplyRecommendationToBuilder}
                className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs sm:text-sm rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer"
              >
                <span>Aplicar Diretriz no Construtor AEE</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          ABA 2: CONSTRUTOR AEE (ESTRUTURA DE PEDIDOS ADAPTADOS COM IA)
      ========================================================================= */}
      {activeMenuTab === 'builder' && (
        <div className="space-y-6 max-w-4xl mx-auto animate-fadeIn">
          <div className="glass-panel p-6 rounded-3xl border border-primary/30 space-y-6 shadow-xl bg-surface">
            <div className="border-b border-border pb-4">
              <div className="flex items-center gap-3">
                <span className="p-2.5 rounded-2xl bg-primary/10 text-primary border border-primary/20">
                  <Wrench className="w-6 h-6" />
                </span>
                <div>
                  <h2 className="text-xl font-black text-foreground">
                    Construtor de Atividades Adaptadas (Central AEE)
                  </h2>
                  <p className="text-xs text-muted">
                    Configure a mecânica inclusiva, ajuste as diretrizes cognitivas e compile a atividade com apoio pedagógico.
                  </p>
                </div>
              </div>
            </div>

            {/* 1. Escolha da Mecânica Inclusiva */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-foreground block">
                1. Escolha a Mecânica Pedagógica Inclusiva:
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedMechanic('visual_cards')}
                  className={`p-3.5 rounded-2xl border text-left space-y-1 transition-all cursor-pointer ${
                    selectedMechanic === 'visual_cards'
                      ? 'bg-amber-500/20 border-amber-400 ring-2 ring-amber-400/30'
                      : 'bg-background hover:bg-surface-hover border-border'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-xs sm:text-sm text-amber-400">
                    <span>🃏 Mapa Visual Lúdico</span>
                    <span className="text-[10px] px-2 py-0.2 rounded-full bg-amber-500/20 text-amber-300 font-extrabold">Laudos Severos</span>
                  </div>
                  <p className="text-[11px] text-muted leading-snug">
                    Cartões ilustrados com emojis gigantes e resposta por toque visual direto.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedMechanic('binary_trail')}
                  className={`p-3.5 rounded-2xl border text-left space-y-1 transition-all cursor-pointer ${
                    selectedMechanic === 'binary_trail'
                      ? 'bg-primary/20 border-primary ring-2 ring-primary/30'
                      : 'bg-background hover:bg-surface-hover border-border'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-xs sm:text-sm text-primary">
                    <span>⚡ Trilha Guiada de 2 Escolhas</span>
                    <span className="text-[10px] px-2 py-0.2 rounded-full bg-primary/20 text-primary font-extrabold">Leve / Moderado</span>
                  </div>
                  <p className="text-[11px] text-muted leading-snug">
                    Apenas 2 alternativas contrastantes, eliminando sobrecarga cognitiva.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedMechanic('social_story')}
                  className={`p-3.5 rounded-2xl border text-left space-y-1 transition-all cursor-pointer ${
                    selectedMechanic === 'social_story'
                      ? 'bg-purple-500/20 border-purple-400 ring-2 ring-purple-400/30'
                      : 'bg-background hover:bg-surface-hover border-border'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-xs sm:text-sm text-purple-400">
                    <span>📖 História Social Cotidiana</span>
                    <span className="text-[10px] px-2 py-0.2 rounded-full bg-purple-500/20 text-purple-300 font-extrabold">Foco TEA</span>
                  </div>
                  <p className="text-[11px] text-muted leading-snug">
                    Narrativa linear passo a passo com situações concretas do dia a dia.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedMechanic('block_builder')}
                  className={`p-3.5 rounded-2xl border text-left space-y-1 transition-all cursor-pointer ${
                    selectedMechanic === 'block_builder'
                      ? 'bg-emerald-500/20 border-emerald-400 ring-2 ring-emerald-400/30'
                      : 'bg-background hover:bg-surface-hover border-border'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-xs sm:text-sm text-emerald-400">
                    <span>🧱 Oficina de Blocos de Ideias</span>
                    <span className="text-[10px] px-2 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 font-extrabold">Sem Digitação</span>
                  </div>
                  <p className="text-[11px] text-muted leading-snug">
                    Montagem estruturada de ideias por blocos conceituais guiados.
                  </p>
                </button>
              </div>
            </div>

            {/* 2. Painel de Diretrizes Sensoriais e Cognitivas */}
            <div className="p-4 bg-background rounded-2xl border border-border space-y-3">
              <label className="text-xs font-bold text-foreground block">
                2. Diretrizes Sensoriais e Cognitivas (AEE):
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <label className="flex items-center gap-2.5 p-2 rounded-xl bg-surface border border-border cursor-pointer">
                  <input
                    type="checkbox"
                    checked={promptSettings.literalLanguage}
                    onChange={(e) => setPromptSettings({ ...promptSettings, literalLanguage: e.target.checked })}
                    className="accent-primary w-4 h-4 rounded"
                  />
                  <span>Linguagem 100% Literal (Sem Metáforas)</span>
                </label>

                <label className="flex items-center gap-2.5 p-2 rounded-xl bg-surface border border-border cursor-pointer">
                  <input
                    type="checkbox"
                    checked={promptSettings.cognitiveReduction}
                    onChange={(e) => setPromptSettings({ ...promptSettings, cognitiveReduction: e.target.checked })}
                    className="accent-primary w-4 h-4 rounded"
                  />
                  <span>Enunciados Curtos (Redução Cognitiva)</span>
                </label>

                <label className="flex items-center gap-2.5 p-2 rounded-xl bg-surface border border-border cursor-pointer">
                  <input
                    type="checkbox"
                    checked={promptSettings.uppercaseText}
                    onChange={(e) => setPromptSettings({ ...promptSettings, uppercaseText: e.target.checked })}
                    className="accent-primary w-4 h-4 rounded"
                  />
                  <span>Texto em Caixa Alta (MAIÚSCULAS)</span>
                </label>

                <label className="flex items-center gap-2.5 p-2 rounded-xl bg-surface border border-border cursor-pointer">
                  <input
                    type="checkbox"
                    checked={promptSettings.concreteExamples}
                    onChange={(e) => setPromptSettings({ ...promptSettings, concreteExamples: e.target.checked })}
                    className="accent-primary w-4 h-4 rounded"
                  />
                  <span>Exemplos da Vida Diária e Cotidiano</span>
                </label>
              </div>
            </div>

            {/* 3. Tema e Conteúdo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-foreground block mb-1">Tema / Conteúdo Adaptado</label>
                <input
                  type="text"
                  value={aeeTopic}
                  onChange={(e) => setAeeTopic(e.target.value)}
                  placeholder="Ex: Cidadania e Regras de Convivência"
                  className="w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-foreground block mb-1">Prazo de Entrega</label>
                <input
                  type="date"
                  value={aeeDeadline}
                  onChange={(e) => setAeeDeadline(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-foreground block mb-1">Material de Apoio / Instruções para a IA (Opcional)</label>
              <textarea
                value={aeeMaterial}
                onChange={(e) => setAeeMaterial(e.target.value)}
                rows={2}
                placeholder="Insira conceitos centrais ou termos específicos da aula para orientar a adaptação..."
                className="w-full bg-background border border-border rounded-xl p-3 text-xs text-foreground focus:outline-none focus:border-primary"
              />
            </div>

            {/* 4. Gestor de Vínculo Opcional */}
            <div className="p-4 bg-background rounded-2xl border border-border space-y-3">
              <label className="text-xs font-bold text-foreground flex items-center gap-2">
                <Link2 className="w-4 h-4 text-primary" />
                <span>Gestão de Vínculo com Atividades Regulares da Turma:</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label
                  className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition-all ${
                    bindingMode === 'standalone'
                      ? 'bg-primary/10 border-primary text-foreground'
                      : 'bg-surface border-border text-muted'
                  }`}
                >
                  <input
                    type="radio"
                    name="bindingModeAee"
                    checked={bindingMode === 'standalone'}
                    onChange={() => setBindingMode('standalone')}
                    className="accent-primary"
                  />
                  <div>
                    <strong className="text-xs block">Atividade AEE Independente</strong>
                    <span className="text-[10px] text-muted">Sem vínculo com provas regulares da turma.</span>
                  </div>
                </label>

                <label
                  className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition-all ${
                    bindingMode === 'linked'
                      ? 'bg-primary/10 border-primary text-foreground'
                      : 'bg-surface border-border text-muted'
                  }`}
                >
                  <input
                    type="radio"
                    name="bindingModeAee"
                    checked={bindingMode === 'linked'}
                    onChange={() => setBindingMode('linked')}
                    className="accent-primary"
                  />
                  <div>
                    <strong className="text-xs block">Vincular a uma Prova da Turma</strong>
                    <span className="text-[10px] text-muted">Substitui formalmente a avaliação mãe para os PNEs.</span>
                  </div>
                </label>
              </div>

              {bindingMode === 'linked' && (
                <div className="pt-2 animate-fadeIn">
                  <select
                    value={linkedParentId}
                    onChange={(e) => setLinkedParentId(e.target.value)}
                    className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none"
                  >
                    <option value="">-- Selecione a atividade formal da turma {selectedTurma} --</option>
                    {regularActivitiesInTurma.map((act) => (
                      <option key={act.id} value={act.id}>
                        {act.title} (Prazo: {act.deadline})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Botão de Compilação */}
            <button
              type="button"
              onClick={handleGenerateAeeActivity}
              disabled={isGenerating}
              className="w-full py-3.5 bg-gradient-to-r from-amber-500 via-primary to-emerald-500 hover:from-amber-400 hover:to-emerald-400 text-slate-950 font-black text-sm rounded-2xl transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="w-5 h-5 fill-current" />
              <span>{isGenerating ? 'Compilando 6 Estágios Adaptados...' : 'Gerar 6 Fases AEE com IA ✨'}</span>
            </button>
          </div>

          {/* Pré-Visualização e Confirmação da Publicação */}
          {generatedGameData && (
            <div className="p-6 bg-surface border-2 border-emerald-500/50 rounded-3xl shadow-xl space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-base font-bold text-foreground">
                    Atividade Adaptada Compilada ({generatedGameData.stages.length} Fases)
                  </h3>
                </div>
                <span className="text-xs font-bold text-emerald-400">Pronta para Publicação</span>
              </div>

              <p className="text-xs text-muted leading-relaxed italic">
                &ldquo;{generatedGameData.introText}&rdquo;
              </p>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {generatedGameData.stages.map((stg, idx) => (
                  <div key={idx} className="p-3 bg-background rounded-xl border border-border text-xs space-y-1">
                    <strong className="text-foreground block">{stg.title}</strong>
                    <p className="text-muted">{stg.scenario}</p>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setGeneratedGameData(null)}
                  className="px-4 py-2 bg-surface hover:bg-surface-hover text-muted rounded-xl text-xs font-bold"
                >
                  Descartar
                </button>

                <button
                  type="button"
                  onClick={handlePublishAdaptedActivity}
                  className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs sm:text-sm rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Publicar para os Alunos PNE 🚀</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          ABA 3: BANCO DE ATIVIDADES ADAPTADAS ATIVAS
      ========================================================================= */}
      {activeMenuTab === 'bank' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-black text-foreground">
              Atividades Adaptadas da Turma {selectedTurma}
            </h2>
            <span className="text-xs text-muted">
              Total: <strong>{adaptedActivitiesList.length}</strong> atividades inclusivas
            </span>
          </div>

          {adaptedActivitiesList.length === 0 ? (
            <div className="p-12 text-center rounded-3xl border border-dashed border-border bg-surface text-muted space-y-3">
              <FolderOpen className="w-12 h-12 mx-auto text-muted/50" />
              <p className="text-sm font-bold text-foreground">Nenhuma atividade adaptada criada para esta turma.</p>
              <p className="text-xs text-muted max-w-md mx-auto">
                Utilize a aba &ldquo;Construtor AEE&rdquo; para criar tarefas inclusivas alinhadas aos laudos dos estudantes.
              </p>
              <button
                type="button"
                onClick={() => setActiveMenuTab('builder')}
                className="px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary-hover cursor-pointer"
              >
                Abrir Construtor AEE
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {adaptedActivitiesList.map((act) => {
                const subsCount = act.submissions?.length || 0;
                const totalTarget = pneStudentsInTurma.length || 1;

                return (
                  <div
                    key={act.id}
                    className="p-5 rounded-2xl bg-surface border border-border hover:border-amber-500/40 transition-all shadow-md flex flex-col justify-between gap-4 group"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-500/15 text-amber-300 border border-amber-500/30">
                          {act.adaptationType === 'severe_playful' ? 'Lúdico / Visual' : 'Cognição Adaptada'}
                        </span>

                        <span className="text-[11px] font-bold text-muted">
                          Turma {act.turma}
                        </span>
                      </div>

                      <h3 className="text-sm sm:text-base font-extrabold text-foreground group-hover:text-amber-400 transition-colors line-clamp-2">
                        {act.title}
                      </h3>

                      <p className="text-xs text-muted line-clamp-2 leading-relaxed">
                        {act.description}
                      </p>

                      <div className="flex items-center gap-3 pt-2 text-[11px] text-muted border-t border-border">
                        <span>PNEs Realizados: <strong className="text-emerald-400">{subsCount}/{totalTarget}</strong></span>
                        {act.adaptedFromId && (
                          <>
                            <span>•</span>
                            <span className="text-primary flex items-center gap-1">
                              <Link2 className="w-3 h-3" /> Vinculada
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-3 border-t border-border">
                      {onPlayGamePreview && (
                        <button
                          type="button"
                          onClick={() => onPlayGamePreview(act)}
                          className="flex-1 py-2 px-3 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold text-xs rounded-xl border border-amber-500/30 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Testar AEE</span>
                        </button>
                      )}

                      {onDeleteActivity && (
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Deseja realmente excluir a atividade adaptada "${act.title}"?`)) {
                              onDeleteActivity(act.id);
                            }
                          }}
                          className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-xl border border-rose-500/30 transition-all cursor-pointer"
                          title="Excluir atividade adaptada"
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
    </div>
  );
};
