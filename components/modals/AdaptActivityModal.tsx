'use client';

import React, { useState } from 'react';
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
} from 'lucide-react';
import { Activity, ActivityQuestion, MultipleChoiceQuestion, EssayQuestion } from '@/lib/types';
import {
  createAdaptedMildModerateActivity,
  createAdaptedSeverePlayfulActivity,
} from '@/lib/adaptationUtils';

interface AdaptActivityModalProps {
  activity: Activity | null;
  isOpen: boolean;
  onClose: () => void;
  onCreateAdaptedActivity: (adaptedActivity: Activity) => void;
  onUpdateActivityWithAdaptation?: (updatedActivity: Activity) => void;
}

export const AdaptActivityModal: React.FC<AdaptActivityModalProps> = ({
  activity,
  isOpen,
  onClose,
  onCreateAdaptedActivity,
  onUpdateActivityWithAdaptation,
}) => {
  // Permite marcar independentemente as duas opções via caixa de seleção (checkboxes)
  const [includeMildModerate, setIncludeMildModerate] = useState(true);
  const [includeSeverePlayful, setIncludeSeverePlayful] = useState(false);
  const [activeTab, setActiveTab] = useState<'mild_moderate' | 'severe_playful'>('mild_moderate');
  const [saveMode, setSaveMode] = useState<'create_copy' | 'overwrite'>('create_copy');

  // Estado para Adaptação Leve / Moderada com Gemini
  const [isGeneratingMild, setIsGeneratingMild] = useState(false);
  const [mildAdaptedData, setMildAdaptedData] = useState<{
    adaptedTitle?: string;
    adaptedDescription?: string;
    questions: ActivityQuestion[];
  } | null>(null);
  const [mildError, setMildError] = useState<string | null>(null);

  // Estado para Síndromes Severas / Jogos Lúdicos com Gemini
  const [isGeneratingPlayful, setIsGeneratingPlayful] = useState(false);
  const [playfulHtml, setPlayfulHtml] = useState<string | null>(activity?.playfulGameHtml || null);
  const [playfulError, setPlayfulError] = useState<string | null>(null);
  const [previewTab, setPreviewTab] = useState<'game' | 'code'>('game');

  // Estado global de geração conjunta
  const [isGeneratingBoth, setIsGeneratingBoth] = useState(false);

  if (!isOpen || !activity) return null;

  const originalQuestions = activity.questions || [];
  const originalTotal = originalQuestions.length;

  const toggleMildModerate = () => {
    const nextVal = !includeMildModerate;
    // Não permite desmarcar ambas
    if (!nextVal && !includeSeverePlayful) {
      setIncludeSeverePlayful(true);
      setActiveTab('severe_playful');
    }
    setIncludeMildModerate(nextVal);
    if (nextVal) setActiveTab('mild_moderate');
  };

  const toggleSeverePlayful = () => {
    const nextVal = !includeSeverePlayful;
    // Não permite desmarcar ambas
    if (!nextVal && !includeMildModerate) {
      setIncludeMildModerate(true);
      setActiveTab('mild_moderate');
    }
    setIncludeSeverePlayful(nextVal);
    if (nextVal) setActiveTab('severe_playful');
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
          title: activity.title,
          subject: activity.subject || 'Sociologia',
          description: activity.description,
          turma: activity.turma,
          questions: activity.questions || [],
          maxGrade: activity.maxGrade || 10,
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
          title: activity.title,
          subject: activity.subject || 'Sociologia',
          description: activity.description,
          turma: activity.turma,
          questions: activity.questions || [],
          maxGrade: activity.maxGrade || 10,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Erro ao gerar o jogo lúdico com o Gemini.');
      }

      if (!data.html) {
        throw new Error('Nenhum código HTML retornado pelo Gemini.');
      }

      setPlayfulHtml(data.html);
    } catch (err: any) {
      console.error('Erro na geração de jogo lúdico:', err);
      setPlayfulError(err.message || 'Falha ao gerar o jogo lúdico com o Gemini. Tente novamente.');
    } finally {
      setIsGeneratingPlayful(false);
    }
  };

  // Gerar ambas simultaneamente quando ambas as caixas estiverem marcadas
  const handleGenerateAllSelected = async () => {
    setIsGeneratingBoth(true);
    const tasks: Promise<any>[] = [];
    if (includeMildModerate) tasks.push(handleGenerateMildAdaptation());
    if (includeSeverePlayful) tasks.push(handleGeneratePlayfulGame());
    try {
      await Promise.allSettled(tasks);
    } finally {
      setIsGeneratingBoth(false);
    }
  };

  // Salvar adaptações selecionadas
  const handleSaveSelectedAdaptations = () => {
    if (includeMildModerate && (!mildAdaptedData || mildAdaptedData.questions.length === 0)) {
      alert('Gere a adaptação Leve/Moderada com o Gemini antes de salvar.');
      return;
    }
    if (includeSeverePlayful && !playfulHtml) {
      alert('Gere o Jogo Lúdico com o Gemini antes de salvar.');
      return;
    }

    if (includeMildModerate && mildAdaptedData) {
      if (saveMode === 'create_copy' || includeSeverePlayful) {
        const adaptedMild = createAdaptedMildModerateActivity(activity, mildAdaptedData);
        onCreateAdaptedActivity(adaptedMild);
      } else if (onUpdateActivityWithAdaptation) {
        const updated: Activity = {
          ...activity,
          title: mildAdaptedData.adaptedTitle || activity.title,
          description: mildAdaptedData.adaptedDescription || activity.description,
          isAdapted: true,
          adaptationType: 'mild_moderate',
          questions: mildAdaptedData.questions,
        };
        onUpdateActivityWithAdaptation(updated);
      }
    }

    if (includeSeverePlayful && playfulHtml) {
      const adaptedSevere = createAdaptedSeverePlayfulActivity(activity, playfulHtml);
      if (saveMode === 'create_copy' || includeMildModerate) {
        onCreateAdaptedActivity(adaptedSevere);
      } else if (onUpdateActivityWithAdaptation) {
        onUpdateActivityWithAdaptation(adaptedSevere);
      }
    }

    onClose();
  };

  const isBothSelected = includeMildModerate && includeSeverePlayful;
  const isBusy = isGeneratingMild || isGeneratingPlayful || isGeneratingBoth;

  const canSave =
    (!includeMildModerate || (mildAdaptedData && mildAdaptedData.questions.length > 0)) &&
    (!includeSeverePlayful || Boolean(playfulHtml)) &&
    !isBusy;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-fadeIn">
      <div className="bg-[#0e172a] border border-white/15 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-white/10 flex items-center justify-between shrink-0 bg-[#131b2e]/80">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-500/20 rounded-2xl border border-amber-500/30 text-amber-400">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white">Adaptação Pedagógica Inclusiva (PNE)</h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase tracking-wider">
                  100% IA GEMINI
                </span>
              </div>
              <p className="text-xs text-[#bccabb]">
                Marque uma ou ambas as opções com as caixas de seleção para gerar as adaptações com o Gemini.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full text-[#bccabb] hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
          {/* Activity Info Banner */}
          <div className="p-4 bg-[#131b2e] rounded-2xl border border-white/10 flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-bold text-[#869486] uppercase tracking-wider block">
                Atividade Original Selecionada
              </span>
              <h3 className="text-sm font-bold text-white">{activity.title}</h3>
              <p className="text-xs text-[#bccabb]">
                Turma: <strong className="text-white">{activity.turma}</strong> • Disciplina:{' '}
                <strong className="text-white">{activity.subject || 'Sociologia'}</strong> • Valor:{' '}
                <strong className="text-[#4ade80]">{activity.maxGrade || 10} pts</strong>
              </p>
            </div>
            <span className="px-3 py-1 bg-white/5 rounded-xl border border-white/10 text-xs font-semibold text-[#dae2fd]">
              {originalTotal} Questões Originais
            </span>
          </div>

          {/* DUAS OPÇÕES COM CAIXA DE SELEÇÃO (PERMITE MARCAR AS DUAS) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Modalidades de Adaptação (Marque uma ou ambas as caixas)</span>
              </h4>
              {isBothSelected && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Ambas Selecionadas
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Opção 1: Leves e Moderadas (Checkbox independente) */}
              <div
                onClick={toggleMildModerate}
                className={`p-4 rounded-2xl border flex items-start gap-3.5 cursor-pointer transition-all ${
                  includeMildModerate
                    ? 'bg-emerald-500/15 border-emerald-500/50 shadow-lg shadow-emerald-500/10'
                    : 'bg-[#131b2e] border-white/10 opacity-70 hover:opacity-100 hover:bg-[#1a233a]'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-md border mt-0.5 flex items-center justify-center shrink-0 transition-colors ${
                    includeMildModerate
                      ? 'bg-emerald-500 border-emerald-400 text-slate-950'
                      : 'border-white/30 bg-[#0a0f1d]'
                  }`}
                >
                  {includeMildModerate && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <Cpu className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="text-xs font-bold text-white">
                      1. Deficiências Leves e Moderadas
                    </span>
                  </div>
                  <p className="text-[11px] text-[#bccabb] leading-relaxed">
                    Adaptação completa pelo Gemini: redução em ~50% das questões, apenas 2 alternativas por questão objetiva com gabarito preservado e dissertativas com piso zero de caracteres.
                  </p>
                </div>
              </div>

              {/* Opção 2: Síndromes Severas - Jogos Lúdicos (Checkbox independente) */}
              <div
                onClick={toggleSeverePlayful}
                className={`p-4 rounded-2xl border flex items-start gap-3.5 cursor-pointer transition-all ${
                  includeSeverePlayful
                    ? 'bg-amber-500/15 border-amber-500/50 shadow-lg shadow-amber-500/10'
                    : 'bg-[#131b2e] border-white/10 opacity-70 hover:opacity-100 hover:bg-[#1a233a]'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-md border mt-0.5 flex items-center justify-center shrink-0 transition-colors ${
                    includeSeverePlayful
                      ? 'bg-amber-500 border-amber-400 text-slate-950'
                      : 'border-white/30 bg-[#0a0f1d]'
                  }`}
                >
                  {includeSeverePlayful && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <Gamepad2 className="w-4 h-4 text-amber-400 shrink-0" />
                    <span className="text-xs font-bold text-white">
                      2. Síndromes Severas (Jogos Lúdicos)
                    </span>
                  </div>
                  <p className="text-[11px] text-[#bccabb] leading-relaxed">
                    Jogo educativo interativo e gamificado em HTML5/CSS/JS gerado pelo Gemini com botões táteis ampliados, sons suaves, contagem de estrelas e reforço visual positivo.
                  </p>
                </div>
              </div>
            </div>

            {/* Barra de ação quando ambas estiverem marcadas */}
            {isBothSelected && (
              <div className="p-3 bg-gradient-to-r from-emerald-500/10 via-amber-500/10 to-transparent border border-white/10 rounded-2xl flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs text-white">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>Você selecionou ambas as modalidades. É possível gerar as duas simultaneamente.</span>
                </div>
                <button
                  type="button"
                  onClick={handleGenerateAllSelected}
                  disabled={isBusy}
                  className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-amber-500 hover:from-emerald-400 hover:to-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isGeneratingBoth ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Gerando Ambas pelo Gemini...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-3.5 h-3.5" />
                      <span>✨ Gerar Ambas com Gemini</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Abas de Navegação / Visualização quando ambas ou apenas uma estiver marcada */}
          {isBothSelected && (
            <div className="flex border-b border-white/10 gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('mild_moderate')}
                className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all cursor-pointer flex items-center gap-2 border-b-2 ${
                  activeTab === 'mild_moderate'
                    ? 'border-emerald-400 text-emerald-400 bg-emerald-500/10'
                    : 'border-transparent text-[#bccabb] hover:text-white'
                }`}
              >
                <Cpu className="w-4 h-4" />
                <span>1. Leves e Moderadas</span>
                {mildAdaptedData && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('severe_playful')}
                className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all cursor-pointer flex items-center gap-2 border-b-2 ${
                  activeTab === 'severe_playful'
                    ? 'border-amber-400 text-amber-400 bg-amber-500/10'
                    : 'border-transparent text-[#bccabb] hover:text-white'
                }`}
              >
                <Gamepad2 className="w-4 h-4" />
                <span>2. Síndromes Severas (Jogo Lúdico)</span>
                {playfulHtml && <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />}
              </button>
            </div>
          )}

          {/* PAINEL DA MODALIDADE 1: DEFICIÊNCIAS LEVES E MODERADAS (GEMINI) */}
          {(includeMildModerate && (!isBothSelected || activeTab === 'mild_moderate')) && (
            <div className="space-y-5 pt-2 animate-fadeIn">
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-emerald-300 flex items-center gap-1.5">
                      <Cpu className="w-4 h-4 text-emerald-400" />
                      Adaptação por IA Gemini (Leve e Moderada)
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300">
                      Gemini 3.7 Flash
                    </span>
                  </div>
                  <p className="text-xs text-[#bccabb] max-w-xl leading-relaxed">
                    O modelo sintetiza o volume de leitura pela metade, gera 2 opções por questão objetiva e adapta dissertativas com suporte acolhedor sem contagem mínima de caracteres.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleGenerateMildAdaptation}
                  disabled={isGeneratingMild || isGeneratingBoth}
                  className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-2xl text-xs flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                >
                  {isGeneratingMild ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                      <span>Adaptando com Gemini...</span>
                    </>
                  ) : mildAdaptedData ? (
                    <>
                      <RefreshCw className="w-4 h-4 text-slate-950" />
                      <span>Regerar com Gemini</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 text-slate-950" />
                      <span>Gerar Adaptação com Gemini</span>
                    </>
                  )}
                </button>
              </div>

              {mildError && (
                <div className="p-4 bg-rose-500/15 border border-rose-500/30 rounded-2xl flex items-center gap-3 text-xs text-rose-300">
                  <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
                  <span>{mildError}</span>
                </div>
              )}

              {/* Callout quando ainda não gerou */}
              {!mildAdaptedData && !isGeneratingMild && (
                <div className="p-10 bg-[#131b2e] rounded-3xl border border-white/10 text-center space-y-4">
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                    <Cpu className="w-7 h-7" />
                  </div>
                  <div className="max-w-md mx-auto space-y-1">
                    <h4 className="text-sm font-bold text-white">Nenhuma Adaptação Gerada Ainda</h4>
                    <p className="text-xs text-[#bccabb]">
                      Clique no botão acima para o Gemini analisar a atividade e gerar uma versão adaptada com 2 alternativas e carga cognitiva reduzida.
                    </p>
                  </div>
                  <button
                    onClick={handleGenerateMildAdaptation}
                    className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-full text-xs transition-all cursor-pointer"
                  >
                    ✨ Gerar Adaptação com Gemini Agora
                  </button>
                </div>
              )}

              {/* Loading State */}
              {isGeneratingMild && (
                <div className="p-12 bg-[#131b2e] rounded-3xl border border-white/10 text-center space-y-4">
                  <Loader2 className="w-10 h-10 mx-auto animate-spin text-emerald-400" />
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-white">O Gemini está adaptando a atividade...</h4>
                    <p className="text-xs text-[#bccabb]">
                      Simplificando enunciados, estruturando 2 alternativas e calibrando o piso de resposta.
                    </p>
                  </div>
                </div>
              )}

              {/* Preview das Questões Geradas pelo Gemini */}
              {mildAdaptedData && !isGeneratingMild && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <Layers className="w-4 h-4 text-emerald-400" />
                      <span>Questões Adaptadas pelo Gemini ({mildAdaptedData.questions.length})</span>
                    </h4>
                    <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Gerado com Sucesso pela IA
                    </span>
                  </div>

                  <div className="space-y-3 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
                    {mildAdaptedData.questions.map((q, idx) => {
                      if (q.type === 'multiple_choice') {
                        const mcq = q as MultipleChoiceQuestion;
                        return (
                          <div
                            key={mcq.id || idx}
                            className="p-4 bg-[#131b2e] rounded-2xl border border-white/10 space-y-2"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-xs font-bold text-white">
                                <span className="text-emerald-400 mr-1.5 font-extrabold">Q{idx + 1}.</span>
                                {mcq.statement}
                              </p>
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/20 text-amber-300 shrink-0">
                                2 Alternativas
                              </span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                              {(mcq.options || []).map((opt, optIdx) => {
                                const isCorrect = optIdx === mcq.correctOptionIndex;
                                const letters = ['A', 'B'];
                                return (
                                  <div
                                    key={optIdx}
                                    className={`p-2.5 rounded-xl text-xs flex items-center gap-2 border ${
                                      isCorrect
                                        ? 'bg-[#4ade80]/15 border-[#4ade80]/40 text-[#4ade80] font-semibold'
                                        : 'bg-[#171f33] border-white/5 text-[#bccabb]'
                                    }`}
                                  >
                                    <span
                                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                                        isCorrect
                                          ? 'bg-[#4ade80] text-[#003919]'
                                          : 'bg-white/10 text-white'
                                      }`}
                                    >
                                      {letters[optIdx] || optIdx + 1}
                                    </span>
                                    <span className="truncate flex-1">{opt}</span>
                                    {isCorrect && (
                                      <span className="text-[10px] font-extrabold text-[#4ade80] flex items-center gap-0.5 shrink-0">
                                        <Check className="w-3 h-3 stroke-[3]" /> Gabarito
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      }

                      const essay = q as EssayQuestion;
                      return (
                        <div
                          key={essay.id || idx}
                          className="p-4 bg-[#131b2e] rounded-2xl border border-sky-500/20 space-y-2"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-xs font-bold text-white">
                              <span className="text-sky-400 mr-1.5 font-extrabold">Q{idx + 1}.</span>
                              {essay.statement}
                            </p>
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-sky-500/20 text-sky-300 shrink-0">
                              Dissertativa Guiada
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-[11px] text-[#bccabb] pt-1">
                            <span className="text-emerald-400 font-semibold">
                              ✓ Mínimo de Caracteres: 0 (Sem restrição punitiva)
                            </span>
                            {essay.keywords && (
                              <span>
                                Palavras-chave: <strong className="text-white">{essay.keywords}</strong>
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* PAINEL DA MODALIDADE 2: SÍNDROMES SEVERAS - JOGOS LÚDICOS (GEMINI) */}
          {(includeSeverePlayful && (!isBothSelected || activeTab === 'severe_playful')) && (
            <div className="space-y-5 pt-2 animate-fadeIn">
              <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-amber-300 flex items-center gap-1.5">
                      <Gamepad2 className="w-4 h-4 text-amber-400" />
                      Jogo Lúdico e Gamificado com Gemini
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300">
                      HTML5 + Áudio + Estrelas
                    </span>
                  </div>
                  <p className="text-xs text-[#bccabb] max-w-xl leading-relaxed">
                    Gera um jogo interativo completo em HTML com ilustrações emoji, botões táteis grandes, sintetizador sonoro suave e registro de nota para alunos com deficiências severas.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleGeneratePlayfulGame}
                  disabled={isGeneratingPlayful || isGeneratingBoth}
                  className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-2xl text-xs flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-amber-500/20 disabled:opacity-50"
                >
                  {isGeneratingPlayful ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                      <span>Gerando Jogo com Gemini...</span>
                    </>
                  ) : playfulHtml ? (
                    <>
                      <RefreshCw className="w-4 h-4 text-slate-950" />
                      <span>Regerar Jogo Lúdico</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 text-slate-950" />
                      <span>Gerar Jogo com IA Gemini</span>
                    </>
                  )}
                </button>
              </div>

              {playfulError && (
                <div className="p-4 bg-rose-500/15 border border-rose-500/30 rounded-2xl flex items-center gap-3 text-xs text-rose-300">
                  <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
                  <span>{playfulError}</span>
                </div>
              )}

              {/* Callout quando ainda não gerou jogo */}
              {!playfulHtml && !isGeneratingPlayful && (
                <div className="p-10 bg-[#131b2e] rounded-3xl border border-white/10 text-center space-y-4">
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
                    <Gamepad2 className="w-7 h-7" />
                  </div>
                  <div className="max-w-md mx-auto space-y-1">
                    <h4 className="text-sm font-bold text-white">Nenhum Jogo Lúdico Gerado Ainda</h4>
                    <p className="text-xs text-[#bccabb]">
                      Clique no botão acima para o Gemini construir um jogo interativo completo e gamificado baseado no conteúdo desta atividade.
                    </p>
                  </div>
                  <button
                    onClick={handleGeneratePlayfulGame}
                    className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-full text-xs transition-all cursor-pointer"
                  >
                    ✨ Gerar Jogo com Gemini Agora
                  </button>
                </div>
              )}

              {/* Loading State */}
              {isGeneratingPlayful && (
                <div className="p-12 bg-[#131b2e] rounded-3xl border border-white/10 text-center space-y-4">
                  <Loader2 className="w-10 h-10 mx-auto animate-spin text-amber-400" />
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-white">O Gemini está construindo o jogo lúdico...</h4>
                    <p className="text-xs text-[#bccabb]">
                      Criando botões táteis, síntese sonora suave, sistema de estrelas e dinâmicas visuais adaptadas.
                    </p>
                  </div>
                </div>
              )}

              {/* Live Preview do Jogo */}
              {playfulHtml && !isGeneratingPlayful && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <Eye className="w-4 h-4 text-amber-400" />
                      Pré-visualização do Jogo em Tempo Real
                    </span>
                    <div className="flex items-center gap-1 bg-[#131b2e] p-1 rounded-xl border border-white/10">
                      <button
                        type="button"
                        onClick={() => setPreviewTab('game')}
                        className={`px-3 py-1 text-[11px] font-bold rounded-lg transition-colors cursor-pointer ${
                          previewTab === 'game'
                            ? 'bg-amber-500 text-slate-950'
                            : 'text-[#bccabb] hover:text-white'
                        }`}
                      >
                        🎮 Testar Jogo
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewTab('code')}
                        className={`px-3 py-1 text-[11px] font-bold rounded-lg transition-colors cursor-pointer ${
                          previewTab === 'code'
                            ? 'bg-amber-500 text-slate-950'
                            : 'text-[#bccabb] hover:text-white'
                        }`}
                      >
                        📄 Código HTML
                      </button>
                    </div>
                  </div>

                  {previewTab === 'game' ? (
                    <div className="w-full h-[420px] rounded-2xl overflow-hidden border border-amber-500/30 bg-black shadow-inner relative">
                      <iframe
                        srcDoc={playfulHtml}
                        title="Pré-visualização do Jogo Lúdico"
                        className="w-full h-full border-0"
                        sandbox="allow-scripts allow-same-origin allow-modals"
                      />
                    </div>
                  ) : (
                    <div className="w-full h-[420px] rounded-2xl overflow-hidden border border-white/10 bg-[#0a0f1d] p-4">
                      <pre className="text-[11px] text-[#bccabb] font-mono h-full overflow-y-auto custom-scrollbar whitespace-pre-wrap">
                        {playfulHtml}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* MODO DE SALVAMENTO */}
          <div className="p-4 bg-[#131b2e] rounded-2xl border border-white/10 space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Save className="w-4 h-4 text-emerald-400" />
              <span>Modo de Publicação no Studio</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label
                onClick={() => setSaveMode('create_copy')}
                className={`p-3.5 rounded-2xl border flex items-start gap-3 cursor-pointer transition-all ${
                  saveMode === 'create_copy'
                    ? 'bg-[#4ade80]/15 border-[#4ade80]/40 text-white'
                    : 'bg-[#171f33] border-white/5 text-[#bccabb] hover:bg-[#1f2942]'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full border mt-0.5 flex items-center justify-center shrink-0 ${
                    saveMode === 'create_copy'
                      ? 'border-[#4ade80] bg-[#4ade80]'
                      : 'border-[#bccabb]'
                  }`}
                >
                  {saveMode === 'create_copy' && <div className="w-1.5 h-1.5 rounded-full bg-[#003919]" />}
                </div>
                <div>
                  <span className="text-xs font-bold text-white block">
                    Criar nova atividade adaptada (Recomendado)
                  </span>
                  <span className="text-[11px] text-[#bccabb]">
                    Mantém a atividade regular intacta e publica a versão adaptada identificada com tag especial para PNE.
                  </span>
                </div>
              </label>

              <label
                onClick={() => setSaveMode('overwrite')}
                className={`p-3.5 rounded-2xl border flex items-start gap-3 cursor-pointer transition-all ${
                  saveMode === 'overwrite'
                    ? 'bg-[#4ade80]/15 border-[#4ade80]/40 text-white'
                    : 'bg-[#171f33] border-white/5 text-[#bccabb] hover:bg-[#1f2942]'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full border mt-0.5 flex items-center justify-center shrink-0 ${
                    saveMode === 'overwrite'
                      ? 'border-[#4ade80] bg-[#4ade80]'
                      : 'border-[#bccabb]'
                  }`}
                >
                  {saveMode === 'overwrite' && <div className="w-1.5 h-1.5 rounded-full bg-[#003919]" />}
                </div>
                <div>
                  <span className="text-xs font-bold text-white block">
                    Atualizar atividade atual
                  </span>
                  <span className="text-[11px] text-[#bccabb]">
                    Substitui as questões da atividade selecionada pela versão adaptada gerada.
                  </span>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-6 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 bg-[#131b2e]/60 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-full text-xs font-semibold text-[#bccabb] hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleSaveSelectedAdaptations}
            disabled={!canSave}
            className="px-6 py-3 bg-[#4ade80] hover:bg-[#6bfb9a] text-[#003919] font-bold rounded-full text-xs transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-[#4ade80]/20 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Sparkles className="w-4 h-4 stroke-[2.5]" />
            <span>
              {isBothSelected
                ? 'Salvar Ambas as Adaptações'
                : includeMildModerate
                ? 'Salvar Adaptação Leve/Moderada'
                : 'Salvar Jogo Lúdico'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
