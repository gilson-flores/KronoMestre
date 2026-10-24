'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  Sparkles,
  Users,
  Wrench,
  FolderOpen,
  CheckCircle2,
  Link2,
  ChevronDown,
  ChevronUp,
  Filter,
  Search,
  Check,
  Play,
  Trash2,
  Settings,
  Eye,
  X,
  ArrowLeft,
  ArrowRight,
  RotateCcw
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
  isSevereCondition,
  getOriginalTurmas,
  getTurmaLabel
} from '@/lib/studentUtils';

interface AdaptedActivitiesViewProps {
  activities: Activity[];
  students: StudentUser[];
  teacher: TeacherUser;
  onOpenNewActivityModal?: () => void;
  onDeleteActivity?: (activityId: string) => void;
  onSaveCreatedActivity: (activity: Activity) => Promise<void> | void;
  onPlayGamePreview?: (activity: Activity) => void;
}

const getDefaultAeeDeadlineString = () => {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().split('T')[0];
};

export function formatShortActivityName(act: Activity, allList: Activity[]): string {
  const adpList = allList.filter((a) => isActivityAdapted(a) || a.activityDomain === 'adapted_aee');
  const idx = adpList.findIndex((a) => a.id === act.id);
  const num = idx >= 0 ? idx + 1 : 1;
  return `(AEE) AV${num}`;
}

export const AdaptedActivitiesView: React.FC<AdaptedActivitiesViewProps> = ({
  activities,
  students,
  teacher,
  onDeleteActivity,
  onSaveCreatedActivity,
  onPlayGamePreview,
}) => {
  const [activeMenuTab, setActiveMenuTab] = useState<'builder' | 'bank'>('builder');

  const turmasList = useMemo(() => getOriginalTurmas(students), [students]);
  const [selectedTurma, setSelectedTurma] = useState<string>('Todas');
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedActId, setExpandedActId] = useState<string | null>(null);

  const pneStudentsInTurma = useMemo(() => {
    return students.filter((s) => {
      if (!isStudentPNE(s)) return false;
      if (selectedTurma === 'Todas') return true;
      return s.turma === selectedTurma || s.turma?.includes(selectedTurma);
    });
  }, [students, selectedTurma]);

  const adaptedActivitiesList = useMemo(() => {
    return activities.filter((act) => {
      const adapted = isActivityAdapted(act) || act.activityDomain === 'adapted_aee';
      if (!adapted) return false;
      if (selectedTurma !== 'Todas' && act.turma !== selectedTurma && !act.turma?.includes(selectedTurma)) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return act.title.toLowerCase().includes(q) || act.description.toLowerCase().includes(q);
      }
      return true;
    });
  }, [activities, selectedTurma, searchQuery]);

  const regularActivitiesInTurma = useMemo(() => {
    return activities.filter((act) => !isActivityAdapted(act) && act.activityDomain !== 'adapted_aee' && (selectedTurma === 'Todas' || act.turma === selectedTurma));
  }, [activities, selectedTurma]);

  const [aeeTopic, setAeeTopic] = useState('');
  const [aeeMaterial, setAeeMaterial] = useState('');
  const [aeeDeadline, setAeeDeadline] = useState(getDefaultAeeDeadlineString);
  const [selectedMechanic, setSelectedMechanic] = useState<AeeMechanic>('visual_cards');
  const [selectedTargetIds, setSelectedTargetIds] = useState<string[]>([]);
  
  const [promptSettings, setPromptSettings] = useState<AeePromptSettings>({
    literalLanguage: true,
    cognitiveReduction: true,
    uppercaseText: true,
    concreteExamples: true,
  });

  const [bindingMode, setBindingMode] = useState<'standalone' | 'linked'>('standalone');
  const [linkedParentId, setLinkedParentId] = useState<string>('');

  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedGameData, setGeneratedGameData] = useState<GameData | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // ==========================================
  // ESTADOS DO SIMULADOR INTERATIVO AEE
  // ==========================================
  const [simulatedActivity, setSimulatedActivity] = useState<{
    title: string;
    mechanic: AeeMechanic;
    gameData: GameData;
  } | null>(null);
  const [simStageIndex, setSimStageIndex] = useState(0);
  const [simSelectedOption, setSimSelectedOption] = useState<number | null>(null);
  const [simFeedback, setSimFeedback] = useState<{ text: string; isCorrect: boolean } | null>(null);
  const [simViewMode, setSimViewMode] = useState<'severe' | 'mild'>('severe');

  const openSimulation = (title: string, mechanic: AeeMechanic, gameData?: GameData) => {
    if (!gameData || !gameData.stages || gameData.stages.length === 0) {
      alert('Esta atividade não possui fases interativas estruturadas para simulação.');
      return;
    }
    setSimulatedActivity({ title, mechanic, gameData });
    setSimStageIndex(0);
    setSimSelectedOption(null);
    setSimFeedback(null);
    setSimViewMode(mechanic === 'visual_cards' || mechanic === 'social_story' ? 'severe' : 'mild');
  };

  useEffect(() => {
    const autoSelectedIds = pneStudentsInTurma.filter((st) => {
      const hasSevere = st.pneConditions?.some(isSevereCondition);
      if (selectedMechanic === 'visual_cards' || selectedMechanic === 'social_story') {
        return hasSevere;
      } else {
        return !hasSevere;
      }
    }).map((st) => st.id);

    setSelectedTargetIds(autoSelectedIds);

    if (selectedMechanic === 'visual_cards') {
      setPromptSettings({ literalLanguage: true, cognitiveReduction: true, uppercaseText: true, concreteExamples: true });
    } else {
      setPromptSettings((prev) => ({ ...prev, uppercaseText: false }));
    }
  }, [selectedMechanic, pneStudentsInTurma]);

  const handleToggleStudentTarget = (studentId: string) => {
    setSelectedTargetIds((prev) => 
      prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId]
    );
  };

  const handleGenerateAeeActivity = async () => {
    if (!aeeTopic.trim()) {
      alert('Informe o tema ou objetivo de aprendizagem para gerar a atividade adaptada.');
      return;
    }
    if (selectedTargetIds.length === 0) {
      alert('Selecione pelo menos um aluno PNE alvo para esta atividade.');
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
          adaptationRecommendation: { recommendedType: selectedMechanic === 'visual_cards' ? 'severe_playful' : 'mild_moderate', summaryText: 'Adaptação dirigida manual' },
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

  const handlePublishAdaptedActivity = async () => {
    if (!generatedGameData) return;

    const newActivity: Activity = {
      id: `aee_${Date.now()}`,
      title: `[AEE Inclusiva] ${aeeTopic.trim() || 'Atividade Adaptada'}`,
      subject: teacher.subject || 'Educação Especial',
      turma: selectedTurma === 'Todas' ? pneStudentsInTurma[0]?.turma || 'Geral' : selectedTurma,
      deadline: aeeDeadline,
      description: generatedGameData.introText || `Atividade adaptada de inclusão para os alunos PNE selecionados.`,
      supportMaterial: aeeMaterial || '',
      type: 'Jogo Avaliativo',
      status: 'Ativo',
      maxGrade: 10,
      allowGroupWork: false,
      isAdapted: true,
      activityDomain: 'adapted_aee',
      isStandaloneAdaptation: bindingMode === 'standalone',
      adaptedFromId: bindingMode === 'linked' ? linkedParentId : undefined,
      adaptationType: (selectedMechanic === 'visual_cards' || selectedMechanic === 'social_story') ? 'severe_playful' : 'mild_moderate',
      adaptationReason: `Adaptado via Construtor para ${selectedTargetIds.length} aluno(s)`,
      aeeMechanic: selectedMechanic,
      aeePromptSettings: promptSettings,
      isGameActivity: true,
      gameData: generatedGameData,
      submissions: [],
      totalSubmissions: 0,
      totalStudents: selectedTargetIds.length,
      pendingCorrection: 0,
      includedPneStudentIds: selectedTargetIds,
    };

    await onSaveCreatedActivity(newActivity);
    setSuccessBanner(`✨ Atividade Inclusiva publicada com sucesso para ${selectedTargetIds.length} aluno(s) PNE!`);
    setGeneratedGameData(null);
    setAeeTopic('');
    setAeeMaterial('');
    setActiveMenuTab('bank');
    setTimeout(() => setSuccessBanner(null), 5000);
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-fadeIn pb-12">
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
            Área exclusiva para adaptação neuro-pedagógica de estudantes PNE. Direcione metodologias inclusivas de forma cirúrgica para cada laudo.
          </p>
        </div>
      </div>

      <div className="glass-panel p-4 sm:p-5 rounded-3xl border border-border bg-surface shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-1 items-center gap-2">
            {activeMenuTab === 'bank' && (
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar atividade adaptada..."
                  className="w-full bg-background border border-border rounded-2xl pl-10 pr-4 py-2.5 text-xs text-foreground focus:outline-none focus:border-amber-400 transition-all"
                />
              </div>
            )}
            
            <button
              onClick={() => setIsFilterExpanded(!isFilterExpanded)}
              className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 border cursor-pointer min-h-[44px] ${
                isFilterExpanded || selectedTurma !== 'Todas'
                  ? 'bg-amber-500/10 border-amber-500/50 text-amber-400'
                  : 'bg-background hover:bg-surface-hover text-muted border-border'
              }`}
            >
              <Filter className="w-4 h-4" />
              <span className="hidden sm:inline">
                {selectedTurma === 'Todas' ? 'Filtrar Turma' : `Turma ${selectedTurma}`}
              </span>
              {isFilterExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>

          <div className="flex items-center gap-1.5 p-1 bg-background rounded-2xl border border-border">
            <button
              type="button"
              onClick={() => setActiveMenuTab('builder')}
              className={`px-4 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-2 cursor-pointer ${
                activeMenuTab === 'builder'
                  ? 'bg-amber-500 text-slate-900 shadow-sm'
                  : 'text-muted hover:text-foreground hover:bg-surface-hover'
              }`}
            >
              <Wrench className="w-4 h-4" />
              <span className="hidden sm:inline">Criar Atividade</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveMenuTab('bank')}
              className={`px-4 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-2 cursor-pointer ${
                activeMenuTab === 'bank'
                  ? 'bg-amber-500 text-slate-900 shadow-sm'
                  : 'text-muted hover:text-foreground hover:bg-surface-hover'
              }`}
            >
              <FolderOpen className="w-4 h-4" />
              <span className="hidden sm:inline">Atividades Criadas</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/20 text-current font-mono font-bold">
                {adaptedActivitiesList.length}
              </span>
            </button>
          </div>
        </div>

        {isFilterExpanded && (
          <div className="pt-3 border-t border-border animate-fadeIn flex flex-wrap gap-2">
            <button
              onClick={() => { setSelectedTurma('Todas'); setIsFilterExpanded(false); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                selectedTurma === 'Todas' ? 'bg-amber-500 text-slate-900 border-amber-500' : 'bg-background text-muted border-border hover:border-amber-500/50'
              }`}
            >
              Todas as Turmas
            </button>
            {turmasList.map((t) => (
              <button
                key={t}
                onClick={() => { setSelectedTurma(t); setIsFilterExpanded(false); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border flex items-center gap-1.5 ${
                  selectedTurma === t ? 'bg-amber-500 text-slate-900 border-amber-500' : 'bg-background text-muted border-border hover:border-amber-500/50'
                }`}
              >
                <Users className="w-3.5 h-3.5 opacity-70" />
                Turma {getTurmaLabel(t)}
              </button>
            ))}
          </div>
        )}
      </div>

      {successBanner && (
        <div className="p-4 bg-emerald-500/15 border border-emerald-400/50 text-emerald-300 rounded-2xl text-xs sm:text-sm flex items-center gap-3 animate-fadeIn shadow-md">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
          <span className="font-bold">{successBanner}</span>
        </div>
      )}

      {activeMenuTab === 'builder' && (
        <div className="space-y-6 max-w-4xl mx-auto animate-fadeIn">
          <div className="glass-panel p-6 rounded-3xl border border-amber-500/30 space-y-6 shadow-xl bg-surface">
            
            <div className="border-b border-border pb-4">
              <div className="flex items-center gap-3">
                <span className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <Wrench className="w-6 h-6" />
                </span>
                <div>
                  <h2 className="text-xl font-black text-foreground">
                    Construtor de Atividades Adaptadas
                  </h2>
                  <p className="text-xs text-muted">
                    Selecione a mecânica, os alunos alvo e gere o conteúdo acessível.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-foreground block uppercase tracking-wider">
                1. Selecione a Mecânica Pedagógica Inclusiva:
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
                    Cartões ilustrados gigantes. Seleciona alunos severos automaticamente.
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
                    <span>⚡ Trilha de 2 Escolhas</span>
                    <span className="text-[10px] px-2 py-0.2 rounded-full bg-primary/20 text-primary font-extrabold">Leve / Moderado</span>
                  </div>
                  <p className="text-[11px] text-muted leading-snug">
                    Apenas 2 alternativas. Seleciona alunos leves/TDAH automaticamente.
                  </p>
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-foreground uppercase tracking-wider">
                  2. Alunos PNE Alvo da Atividade:
                </label>
                <span className="text-[10px] font-bold text-amber-400">
                  {selectedTargetIds.length} selecionado(s)
                </span>
              </div>

              {pneStudentsInTurma.length === 0 ? (
                <div className="p-4 text-center text-xs text-muted border border-dashed border-border rounded-2xl bg-background">
                  Nenhum aluno PNE encontrado para o filtro atual. Se precisar, altere o filtro de Turmas no topo.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                  {pneStudentsInTurma.map((st) => {
                    const isSelected = selectedTargetIds.includes(st.id);
                    const isSevere = st.pneConditions?.some(isSevereCondition);

                    return (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => handleToggleStudentTarget(st.id)}
                        className={`p-2.5 rounded-xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-amber-500/10 border-amber-500/40 shadow-sm'
                            : 'bg-background border-border hover:bg-surface-hover'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${isSelected ? 'bg-amber-500 border-amber-500 text-slate-900' : 'border-muted'}`}>
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className={`text-xs font-bold truncate block ${isSelected ? 'text-foreground' : 'text-muted'}`}>
                            {st.fullName}
                          </span>
                          <span className={`text-[10px] truncate block ${isSevere ? 'text-rose-400' : 'text-primary'}`}>
                            {st.pneConditions?.join(', ') || 'Laudo PNE'}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="p-4 bg-background rounded-2xl border border-border space-y-3">
              <label className="text-xs font-bold text-foreground block">
                3. Diretrizes Sensoriais e Cognitivas (AEE):
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <label className="flex items-center gap-2.5 p-2 rounded-xl bg-surface border border-border cursor-pointer">
                  <input type="checkbox" checked={promptSettings.literalLanguage} onChange={(e) => setPromptSettings({ ...promptSettings, literalLanguage: e.target.checked })} className="accent-amber-500 w-4 h-4 rounded" />
                  <span>Linguagem 100% Literal (Sem Metáforas)</span>
                </label>
                <label className="flex items-center gap-2.5 p-2 rounded-xl bg-surface border border-border cursor-pointer">
                  <input type="checkbox" checked={promptSettings.cognitiveReduction} onChange={(e) => setPromptSettings({ ...promptSettings, cognitiveReduction: e.target.checked })} className="accent-amber-500 w-4 h-4 rounded" />
                  <span>Enunciados Curtos (Redução Cognitiva)</span>
                </label>
                <label className="flex items-center gap-2.5 p-2 rounded-xl bg-surface border border-border cursor-pointer">
                  <input type="checkbox" checked={promptSettings.uppercaseText} onChange={(e) => setPromptSettings({ ...promptSettings, uppercaseText: e.target.checked })} className="accent-amber-500 w-4 h-4 rounded" />
                  <span>Texto em Caixa Alta (MAIÚSCULAS)</span>
                </label>
                <label className="flex items-center gap-2.5 p-2 rounded-xl bg-surface border border-border cursor-pointer">
                  <input type="checkbox" checked={promptSettings.concreteExamples} onChange={(e) => setPromptSettings({ ...promptSettings, concreteExamples: e.target.checked })} className="accent-amber-500 w-4 h-4 rounded" />
                  <span>Exemplos da Vida Diária e Cotidiano</span>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-foreground block mb-1">Tema / Conteúdo</label>
                <input type="text" value={aeeTopic} onChange={(e) => setAeeTopic(e.target.value)} placeholder="Ex: Cidadania e Regras..." className="w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-xs text-foreground focus:outline-none focus:border-amber-400" />
              </div>
              <div>
                <label className="text-xs font-bold text-foreground block mb-1">Prazo de Entrega</label>
                <input type="date" value={aeeDeadline} onChange={(e) => setAeeDeadline(e.target.value)} className="w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-xs text-foreground focus:outline-none focus:border-amber-400" />
              </div>
            </div>

            <div className="p-4 bg-background rounded-2xl border border-border space-y-3">
              <label className="text-xs font-bold text-foreground flex items-center gap-2">
                <Link2 className="w-4 h-4 text-amber-500" />
                <span>Vínculo com Atividade Regular (Opcional):</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition-all ${bindingMode === 'standalone' ? 'bg-amber-500/10 border-amber-500 text-foreground' : 'bg-surface border-border text-muted'}`}>
                  <input type="radio" checked={bindingMode === 'standalone'} onChange={() => setBindingMode('standalone')} className="accent-amber-500" />
                  <div>
                    <strong className="text-xs block">Atividade Independente</strong>
                    <span className="text-[10px] text-muted">Apenas para os PNEs selecionados.</span>
                  </div>
                </label>
                <label className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition-all ${bindingMode === 'linked' ? 'bg-amber-500/10 border-amber-500 text-foreground' : 'bg-surface border-border text-muted'}`}>
                  <input type="radio" checked={bindingMode === 'linked'} onChange={() => setBindingMode('linked')} className="accent-amber-500" />
                  <div>
                    <strong className="text-xs block">Substituir Prova Regular</strong>
                    <span className="text-[10px] text-muted">Isenta o PNE da prova formal da turma.</span>
                  </div>
                </label>
              </div>

              {bindingMode === 'linked' && (
                <select value={linkedParentId} onChange={(e) => setLinkedParentId(e.target.value)} className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none">
                  <option value="">-- Selecione a avaliação formal --</option>
                  {regularActivitiesInTurma.map((act) => (
                    <option key={act.id} value={act.id}>{act.title} (Turma {act.turma})</option>
                  ))}
                </select>
              )}
            </div>

            <button
              type="button"
              onClick={handleGenerateAeeActivity}
              disabled={isGenerating}
              className="w-full py-3.5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-sm rounded-2xl transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="w-5 h-5 fill-current" />
              <span>{isGenerating ? 'Compilando Adaptação...' : 'Gerar Fases AEE com IA ✨'}</span>
            </button>
          </div>

          {generatedGameData && (
            <div className="p-6 bg-surface border-2 border-emerald-500/50 rounded-3xl shadow-xl space-y-4 animate-fadeIn">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border pb-3 gap-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-base font-bold text-foreground">
                    Atividade Compilada ({generatedGameData.stages.length} Fases)
                  </h3>
                </div>
                <span className="text-xs font-bold text-emerald-400">Pronta para Simulação e Publicação</span>
              </div>

              <p className="text-xs text-muted leading-relaxed">
                {generatedGameData.introText}
              </p>

              <div className="flex flex-wrap items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setGeneratedGameData(null)}
                  className="px-4 py-2.5 bg-background hover:bg-surface-hover text-muted rounded-xl text-xs font-bold border border-border cursor-pointer"
                >
                  Descartar
                </button>

                <button
                  type="button"
                  onClick={() =>
                    openSimulation(
                      `[AEE Inclusiva] ${aeeTopic.trim() || 'Atividade Adaptada'}`,
                      selectedMechanic,
                      generatedGameData
                    )
                  }
                  className="px-5 py-2.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-black text-xs rounded-xl flex items-center gap-2 cursor-pointer transition-all"
                >
                  <Eye className="w-4 h-4" />
                  <span>Simular Visão do Aluno</span>
                </button>

                <button
                  type="button"
                  onClick={handlePublishAdaptedActivity}
                  className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow-md flex items-center gap-2 cursor-pointer transition-all"
                >
                  <Check className="w-4 h-4" />
                  <span>Publicar aos {selectedTargetIds.length} Aluno(s)</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {activeMenuTab === 'bank' && (
        <div className="space-y-4 animate-fadeIn">
          {adaptedActivitiesList.length === 0 ? (
            <div className="p-12 text-center rounded-3xl border border-dashed border-border bg-surface text-muted space-y-3 shadow-sm">
              <FolderOpen className="w-12 h-12 mx-auto opacity-50" />
              <p className="text-base font-bold text-foreground">Nenhuma atividade adaptada encontrada.</p>
              <p className="text-xs text-muted max-w-md mx-auto">
                Utilize a aba "Criar Atividade" para gerar tarefas inclusivas focadas em laudos específicos.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {adaptedActivitiesList.map((act) => {
                const isExpanded = expandedActId === act.id;
                const subsCount = act.submissions?.length || 0;
                const totalTarget = act.includedPneStudentIds?.length || 1;
                const shortName = formatShortActivityName(act, adaptedActivitiesList);
                const progress = totalTarget > 0 ? Math.round((subsCount / totalTarget) * 100) : 0;

                return (
                  <div key={act.id} className="glass-panel rounded-3xl border border-border bg-surface shadow-md transition-all overflow-hidden">
                    <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-start gap-4 min-w-0 flex-1">
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border shadow-sm bg-amber-500/10 border-amber-500/30 text-amber-500">
                          <Sparkles className="w-6 h-6" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40">
                              {shortName}
                            </span>
                            <span className="text-[10px] font-bold text-muted border border-border px-2 py-0.5 rounded-md">
                              {act.adaptationType === 'severe_playful' ? 'Lúdico Visual' : 'Cognição Adaptada'}
                            </span>
                          </div>
                          <h3 className="text-base sm:text-lg font-black text-foreground truncate">{act.title}</h3>
                          
                          <div className="flex items-center gap-3 mt-2 max-w-sm">
                            <div className="flex-1 h-1.5 bg-background rounded-full overflow-hidden border border-border">
                              <div className="h-full rounded-full bg-amber-400" style={{ width: `${progress}%` }} />
                            </div>
                            <span className="text-[10px] font-bold text-muted whitespace-nowrap">
                              {subsCount}/{totalTarget} entregas
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 border-t md:border-t-0 border-border pt-3 md:pt-0 mt-3 md:mt-0">
                        <button
                          type="button"
                          onClick={() => {
                            if (act.gameData) {
                              openSimulation(act.title, act.aeeMechanic || 'visual_cards', act.gameData);
                            } else if (onPlayGamePreview) {
                              onPlayGamePreview(act);
                            }
                          }}
                          className="flex-1 md:flex-none py-2 px-4 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
                        >
                          <Play className="w-4 h-4" />
                          <span>Simular</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setExpandedActId(isExpanded ? null : act.id)}
                          className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-center ${
                            isExpanded ? 'bg-amber-500/20 border-amber-500/50 text-amber-400' : 'bg-background border-border text-muted hover:text-foreground hover:bg-surface-hover'
                          }`}
                          title="Detalhes"
                        >
                          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <Settings className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="p-4 sm:p-5 border-t border-border bg-background/50 animate-fadeIn space-y-4">
                        <div className="text-xs space-y-1">
                          <p className="text-muted"><strong>Alunos Alvo (PNE):</strong> {act.includedPneStudentIds?.length || 0} vinculados.</p>
                          <p className="text-muted"><strong>Descrição:</strong> {act.description}</p>
                        </div>
                        <div className="pt-3 border-t border-border flex justify-end">
                          <button
                            type="button"
                            onClick={() => { if(confirm(`Deseja excluir a atividade adaptada "${act.title}"?`)) onDeleteActivity?.(act.id); }}
                            className="px-3 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Excluir
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          MODAL SIMULADOR INTERATIVO DE ATIVIDADE ADAPTADA (VISÃO DO ALUNO PNE)
      ========================================================================= */}
      {simulatedActivity && (() => {
        const stages = simulatedActivity.gameData.stages || [];
        const currentStage = stages[simStageIndex];
        if (!currentStage) return null;

        const visualCards = currentStage.pneSevereStage?.visualCards || [];
        const mildOptions = currentStage.pneMildStage?.options || currentStage.options || [];

        return (
          <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
            <div className="bg-surface border-2 border-amber-500/40 rounded-3xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
              
              {/* Top Header do Simulador */}
              <div className="p-4 sm:p-5 bg-background border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-500 text-slate-950">
                      Modo Simulação AEE
                    </span>
                    <span className="text-xs font-bold text-muted">
                      Fase {simStageIndex + 1} de {stages.length}
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-black text-foreground truncate mt-1">
                    {simulatedActivity.title}
                  </h3>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {/* Alternador de Visão (Severo vs Leve/Moderado) */}
                  <div className="flex items-center bg-surface p-1 rounded-xl border border-border text-[11px] font-bold">
                    <button
                      type="button"
                      onClick={() => {
                        setSimViewMode('severe');
                        setSimSelectedOption(null);
                        setSimFeedback(null);
                      }}
                      className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                        simViewMode === 'severe' ? 'bg-amber-500 text-slate-950 font-black' : 'text-muted hover:text-foreground'
                      }`}
                    >
                      🃏 Cartões (Severo)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSimViewMode('mild');
                        setSimSelectedOption(null);
                        setSimFeedback(null);
                      }}
                      className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                        simViewMode === 'mild' ? 'bg-primary text-white font-black' : 'text-muted hover:text-foreground'
                      }`}
                    >
                      ⚡ 2 Escolhas (Leve)
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSimulatedActivity(null)}
                    className="p-2 rounded-full bg-surface hover:bg-rose-500/20 text-muted hover:text-rose-400 border border-border cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Corpo Interativo da Fase */}
              <div className="p-5 sm:p-8 overflow-y-auto flex-1 space-y-6">
                <div className="space-y-2 text-center">
                  <span className="text-xs font-black uppercase tracking-wider text-amber-400">
                    {currentStage.title}
                  </span>
                  <h4 className="text-lg sm:text-xl font-black text-foreground leading-relaxed">
                    {simViewMode === 'severe'
                      ? currentStage.pneSevereStage?.playfulPrompt || currentStage.scenario
                      : currentStage.pneMildStage?.scenario || currentStage.scenario}
                  </h4>
                  {currentStage.clue && (
                    <p className="text-xs text-amber-300/90 bg-amber-500/10 border border-amber-500/20 py-1.5 px-3 rounded-full inline-block">
                      💡 {currentStage.clue}
                    </p>
                  )}
                </div>

                {/* MODO 1: CARTÕES VISUAIS LÚDICOS (LAUDOS SEVEROS) */}
                {simViewMode === 'severe' && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                    {visualCards.map((card, idx) => {
                      const isSelected = simSelectedOption === idx;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setSimSelectedOption(idx);
                            setSimFeedback({ text: card.feedback, isCorrect: card.isCorrect });
                          }}
                          className={`p-6 rounded-3xl border-2 flex flex-col items-center justify-center gap-3 text-center transition-all cursor-pointer active:scale-95 ${
                            isSelected
                              ? card.isCorrect
                                ? 'bg-emerald-500/20 border-emerald-400 shadow-lg shadow-emerald-500/10'
                                : 'bg-rose-500/20 border-rose-400'
                              : 'bg-background hover:bg-surface-hover border-border hover:border-amber-400/50'
                          }`}
                        >
                          <span className="text-5xl sm:text-6xl select-none">{card.iconEmoji}</span>
                          <span className="text-sm sm:text-base font-black text-foreground">{card.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* MODO 2: TRILHA GUIADA DE 2 ESCOLHAS (LEVE / MODERADO) */}
                {simViewMode === 'mild' && (
                  <div className="space-y-3 max-w-xl mx-auto pt-2">
                    {mildOptions.map((opt, idx) => {
                      const isSelected = simSelectedOption === idx;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setSimSelectedOption(idx);
                            setSimFeedback({ text: opt.feedback, isCorrect: opt.isCorrect });
                          }}
                          className={`w-full p-4 sm:p-5 rounded-2xl border-2 text-left flex items-center gap-4 transition-all cursor-pointer active:scale-[0.99] ${
                            isSelected
                              ? opt.isCorrect
                                ? 'bg-emerald-500/20 border-emerald-400'
                                : 'bg-rose-500/20 border-rose-400'
                              : 'bg-background hover:bg-surface-hover border-border hover:border-primary/50'
                          }`}
                        >
                          <span className="w-8 h-8 rounded-full bg-surface border border-border flex items-center justify-center font-black text-xs shrink-0">
                            {idx + 1}
                          </span>
                          <span className="text-sm sm:text-base font-bold text-foreground leading-snug">
                            {opt.text}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Feedback Imediato da Escolha */}
                {simFeedback && (
                  <div
                    className={`p-4 rounded-2xl border text-center space-y-1 animate-fadeIn ${
                      simFeedback.isCorrect
                        ? 'bg-emerald-500/15 border-emerald-400/50 text-emerald-300'
                        : 'bg-amber-500/15 border-amber-400/50 text-amber-300'
                    }`}
                  >
                    <p className="text-sm font-black">
                      {simFeedback.isCorrect ? '🎉 Resposta Correta!' : '💡 Tente observar novamente:'}
                    </p>
                    <p className="text-xs font-semibold">{simFeedback.text}</p>
                  </div>
                )}
              </div>

              {/* Rodapé de Navegação entre Fases */}
              <div className="p-4 bg-background border-t border-border flex items-center justify-between gap-3">
                <button
                  type="button"
                  disabled={simStageIndex === 0}
                  onClick={() => {
                    setSimStageIndex((i) => Math.max(0, i - 1));
                    setSimSelectedOption(null);
                    setSimFeedback(null);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-surface hover:bg-surface-hover disabled:opacity-40 text-foreground border border-border text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Fase Anterior</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSimStageIndex(0);
                    setSimSelectedOption(null);
                    setSimFeedback(null);
                  }}
                  className="px-3 py-2 rounded-xl text-muted hover:text-foreground text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Reiniciar</span>
                </button>

                {simStageIndex < stages.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSimStageIndex((i) => Math.min(stages.length - 1, i + 1));
                      setSimSelectedOption(null);
                      setSimFeedback(null);
                    }}
                    className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1.5 cursor-pointer shadow-md"
                  >
                    <span>Próxima Fase</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setSimulatedActivity(null)}
                    className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center gap-1.5 cursor-pointer shadow-md"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Concluir Simulação</span>
                  </button>
                )}
              </div>

            </div>
          </div>
        );
      })()}
    </div>
  );
};
