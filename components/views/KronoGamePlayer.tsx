'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  Gamepad2,
  Trophy,
  Users,
  Sparkles,
  CheckCircle2,
  XCircle,
  Lightbulb,
  ArrowRight,
  RotateCcw,
  Star,
  Crown,
  HeartHandshake,
  Check,
  Zap,
  Volume2,
  VolumeX,
  X,
  Shield,
  Award
} from 'lucide-react';
import { Activity, StudentUser, GameStage, GameData, GameMode } from '@/lib/types';
import { isStudentPNE, isSevereCondition } from '@/lib/studentUtils';

interface KronoGamePlayerProps {
  activity: Activity;
  student: StudentUser;
  allStudents?: StudentUser[];
  onFinishGame: (finalScore: number, groupMembersStr?: string) => void;
  onClose: () => void;
}

// Web Audio API Synthesizer para efeitos sonoros imediatos e sem arquivos externos
function playSound(type: 'correct' | 'wrong' | 'win' | 'click') {
  if (typeof window === 'undefined') return;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    if (type === 'click') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } else if (type === 'correct') {
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.07);
        gain.gain.setValueAtTime(0.08, ctx.currentTime + idx * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.07 + 0.18);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.07);
        osc.stop(ctx.currentTime + idx * 0.07 + 0.18);
      });
    } else if (type === 'wrong') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(140, ctx.currentTime + 0.25);
      gain.gain.setValueAtTime(0.07, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } else if (type === 'win') {
      const arpeggio = [523.25, 659.25, 783.99, 1046.5, 1318.51];
      arpeggio.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.1);
        gain.gain.setValueAtTime(0.1, ctx.currentTime + idx * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.1 + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.1);
        osc.stop(ctx.currentTime + idx * 0.1 + 0.4);
      });
    }
  } catch (e) {
    // Ignore audio errors if browser blocks autoplay
  }
}

export const KronoGamePlayer: React.FC<KronoGamePlayerProps> = ({
  activity,
  student,
  allStudents = [],
  onFinishGame,
  onClose,
}) => {
  const gameData: GameData = activity.gameData || {
    introText: 'Partida pedagógica KronoGames iniciada.',
    stages: [],
  };

  const stages = gameData.stages || [];
  const maxGrade = activity.maxGrade || 10;
  const isClassroomGroup = activity.executionContext === 'classroom_group' || activity.allowGroupWork;

  // Sound toggle
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Group members selection (if classroom_group)
  const [selectedGroupMembers, setSelectedGroupMembers] = useState<StudentUser[]>([]);
  const [customMembersText, setCustomMembersText] = useState('');
  const [isSetupDone, setIsSetupDone] = useState(false);

  // Filter students from the same turma
  const classmates = useMemo(() => {
    return allStudents.filter(
      (s) => s.id !== student.id && s.turma === student.turma && !s.isArchived
    );
  }, [allStudents, student.id, student.turma]);

  // Check if team has PNE members
  const teamHasPne = useMemo(() => {
    if (isStudentPNE(student)) return true;
    return selectedGroupMembers.some((m) => isStudentPNE(m));
  }, [student, selectedGroupMembers]);

  // Check if team has severe conditions
  const teamHasSeverePne = useMemo(() => {
    const checkConds = (s: StudentUser) => {
      const conds = s.pneConditions || [];
      return conds.some((c) => isSevereCondition(c));
    };
    if (checkConds(student)) return true;
    return selectedGroupMembers.some((m) => checkConds(m));
  }, [student, selectedGroupMembers]);

  // Game execution state
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null);
  const [selectedSevereCardIndex, setSelectedSevereCardIndex] = useState<number | null>(null);
  const [isAnswerRevealed, setIsAnswerRevealed] = useState(false);
  const [stageResults, setStageResults] = useState<boolean[]>([]);
  const [showClue, setShowClue] = useState(false);
  const [isGameFinished, setIsGameFinished] = useState(false);

  // Manual toggle for team to play the Inclusive PNE variation of the stage
  const [viewPneMode, setViewPneMode] = useState<boolean>(() => {
    return teamHasPne;
  });

  // When game starts or stage changes, reset stage choices
  const currentStage: GameStage | undefined = stages[currentStageIndex];

  const handleToggleMember = (st: StudentUser) => {
    if (selectedGroupMembers.some((m) => m.id === st.id)) {
      setSelectedGroupMembers((prev) => prev.filter((m) => m.id !== st.id));
    } else {
      setSelectedGroupMembers((prev) => [...prev, st]);
    }
  };

  const handleStartGame = () => {
    if (soundEnabled) playSound('click');
    setIsSetupDone(true);
  };

  const handleSelectStandardOption = (idx: number) => {
    if (isAnswerRevealed) return;
    if (soundEnabled) playSound('click');
    setSelectedOptionIndex(idx);
  };

  const handleSelectSevereCard = (idx: number) => {
    if (isAnswerRevealed) return;
    if (soundEnabled) playSound('click');
    setSelectedSevereCardIndex(idx);
  };

  const handleConfirmAnswer = () => {
    if (!currentStage || isAnswerRevealed) return;

    let isCorrect = false;

    if (viewPneMode && teamHasSeverePne && currentStage.pneSevereStage) {
      if (selectedSevereCardIndex === null) return;
      const card = currentStage.pneSevereStage.visualCards[selectedSevereCardIndex];
      isCorrect = Boolean(card?.isCorrect);
    } else if (viewPneMode && currentStage.pneMildStage) {
      if (selectedOptionIndex === null) return;
      const opt = currentStage.pneMildStage.options[selectedOptionIndex];
      isCorrect = Boolean(opt?.isCorrect);
    } else {
      if (selectedOptionIndex === null) return;
      const opt = currentStage.options[selectedOptionIndex];
      isCorrect = Boolean(opt?.isCorrect);
    }

    setIsAnswerRevealed(true);
    setStageResults((prev) => [...prev, isCorrect]);

    if (soundEnabled) {
      if (isCorrect) playSound('correct');
      else playSound('wrong');
    }
  };

  const handleNextStage = () => {
    if (soundEnabled) playSound('click');
    setIsAnswerRevealed(false);
    setSelectedOptionIndex(null);
    setSelectedSevereCardIndex(null);
    setShowClue(false);

    if (currentStageIndex + 1 < stages.length) {
      setCurrentStageIndex((prev) => prev + 1);
    } else {
      // Finished all stages
      if (soundEnabled) playSound('win');
      setIsGameFinished(true);
    }
  };

  // Final score calculation (0 to maxGrade)
  const correctCount = stageResults.filter(Boolean).length;
  const finalScore = useMemo(() => {
    if (stages.length === 0) return maxGrade;
    const calc = (correctCount / stages.length) * maxGrade;
    return Number(calc.toFixed(1));
  }, [correctCount, stages.length, maxGrade]);

  const groupMembersString = useMemo(() => {
    const list = [student.fullName];
    selectedGroupMembers.forEach((m) => {
      if (!list.includes(m.fullName)) list.push(m.fullName);
    });
    if (customMembersText.trim()) {
      customMembersText.split(',').forEach((n) => {
        const clean = n.trim();
        if (clean && !list.includes(clean)) list.push(clean);
      });
    }
    return list.join(', ');
  }, [student.fullName, selectedGroupMembers, customMembersText]);

  const handleSubmitFinal = () => {
    onFinishGame(finalScore, groupMembersString);
  };

  // Mode Header Details
  const modeInfo: Record<GameMode, { label: string; icon: any; color: string }> = {
    millionaire: { label: 'Arena do Milhão', icon: Trophy, color: 'text-amber-500' },
    dialectic_tribunal: { label: 'Tribunal Dialético', icon: Shield, color: 'text-indigo-500' },
    rpg_campaign: { label: 'Crônicas da Pólis (RPG)', icon: Crown, color: 'text-emerald-500' },
    real_life_lab: { label: 'Laboratório da Vida Real', icon: Zap, color: 'text-cyan-500' },
  };

  const currentMode = activity.gameMode || 'millionaire';
  const info = modeInfo[currentMode] || modeInfo.millionaire;
  const ModeIcon = info.icon;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-2.5 sm:p-4 md:p-6 overflow-y-auto">
      <div className="w-full max-w-3xl bg-background rounded-3xl border border-border shadow-2xl overflow-hidden flex flex-col max-h-[94vh] animate-fadeIn">
        
        {/* Top Bar Header */}
        <div className="bg-surface/80 border-b border-border px-4 sm:px-6 py-3.5 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`p-2.5 rounded-2xl bg-primary/10 border border-primary/20 ${info.color} shrink-0`}>
              <ModeIcon className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-primary">
                  KronoGames • {info.label}
                </span>
                {activity.executionContext === 'classroom_group' && (
                  <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded-full border border-indigo-500/20">
                    <Users className="w-3 h-3" /> Em Grupo
                  </span>
                )}
              </div>
              <h2 className="text-sm sm:text-base font-bold text-foreground truncate">
                {activity.title}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setSoundEnabled((prev) => !prev)}
              className="p-2 rounded-xl text-muted hover:text-foreground hover:bg-surface-hover transition-colors"
              title={soundEnabled ? 'Silenciar Áudio' : 'Ativar Áudio'}
            >
              {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5 text-rose-400" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-muted hover:text-foreground hover:bg-surface-hover transition-colors"
              title="Fechar Jogo"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 md:p-8 overflow-y-auto custom-scrollbar flex-1 space-y-6">
          
          {/* SCREEN 1: Setup & Formation of Group */}
          {!isSetupDone && (
            <div className="space-y-6 animate-fadeIn">
              <div className="p-4 sm:p-5 rounded-2xl bg-surface border border-border space-y-2">
                <div className="flex items-center gap-2 text-primary font-bold text-sm">
                  <Sparkles className="w-4 h-4" />
                  <span>Apresentação da Partida</span>
                </div>
                <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed">
                  {gameData.introText}
                </p>
                <div className="pt-2 flex flex-wrap gap-3 text-xs text-muted">
                  <span>🎯 <strong>6 Rodadas</strong> do Conhecimento</span>
                  <span>⭐ Vale até <strong>{maxGrade.toFixed(1)} Pontos</strong></span>
                  <span>⚡ Correção 100% Automática</span>
                </div>
              </div>

              {/* Group Formation if classroom_group */}
              {isClassroomGroup && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-2">
                      <Users className="w-4 h-4 text-primary" />
                      Quem está jogando nesta equipe?
                    </label>
                    <span className="text-[11px] text-muted">
                      {selectedGroupMembers.length + 1} integrante(s)
                    </span>
                  </div>

                  <p className="text-xs text-muted">
                    Marque os colegas que estão jogando com você. Ao concluir o jogo, a nota será atribuída instantaneamente para todos no sistema!
                  </p>

                  {/* Student Chip List */}
                  <div className="max-h-44 overflow-y-auto custom-scrollbar border border-border rounded-2xl p-2 bg-surface/50 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {/* Logged in student */}
                    <div className="p-2.5 rounded-xl bg-primary/15 border border-primary/30 flex items-center gap-2 text-xs font-bold text-primary">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span className="truncate">{student.fullName} (Você)</span>
                    </div>

                    {classmates.map((st) => {
                      const isSelected = selectedGroupMembers.some((m) => m.id === st.id);
                      const isPne = isStudentPNE(st);
                      return (
                        <button
                          key={st.id}
                          type="button"
                          onClick={() => handleToggleMember(st)}
                          className={`p-2.5 rounded-xl border text-left flex items-center justify-between text-xs transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-primary/10 border-primary text-foreground font-semibold shadow-sm'
                              : 'bg-surface border-border text-foreground hover:bg-surface-hover'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div className={`w-4 h-4 rounded border flex items-center justify-center ${isSelected ? 'bg-primary border-primary text-white' : 'border-muted'}`}>
                              {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>
                            <span className="truncate">{st.fullName}</span>
                          </div>
                          {isPne && (
                            <span className="text-[10px] font-bold bg-amber-500/10 text-amber-500 px-1.5 py-0.5 rounded border border-amber-500/20 shrink-0">
                              AEE
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* PNE Team Awareness Banner */}
                  {teamHasPne && (
                    <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-3 text-xs text-amber-500 animate-fadeIn">
                      <HeartHandshake className="w-5 h-5 shrink-0 text-amber-400" />
                      <span>
                        <strong>Inclusão Automática Ativada:</strong> Há colegas PNE na sua equipe! O jogo preparou rodadas adaptadas e cartões visuais para inclusão plena de todos.
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Start Button */}
              <button
                type="button"
                onClick={handleStartGame}
                className="w-full py-4 rounded-2xl bg-primary hover:bg-primary-hover text-white font-extrabold text-sm sm:text-base shadow-xl shadow-primary/25 flex items-center justify-center gap-2 transition-transform hover:scale-[1.01] cursor-pointer"
              >
                <Gamepad2 className="w-5 h-5" />
                <span>Começar Partida do KronoGames</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* SCREEN 2: Active Gameplay (Stages 1 to 6) */}
          {isSetupDone && !isGameFinished && currentStage && (
            <div className="space-y-6 animate-fadeIn">
              
              {/* Progress & Stage Info */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-muted">
                  <span className="flex items-center gap-1.5 text-primary">
                    <Sparkles className="w-4 h-4" />
                    Rodada {currentStageIndex + 1} de {stages.length}
                  </span>
                  <span>
                    Acertos: {correctCount} / {stages.length}
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-2.5 bg-surface border border-border rounded-full overflow-hidden flex">
                  {stages.map((_, idx) => {
                    const isDone = idx < currentStageIndex;
                    const isCurrent = idx === currentStageIndex;
                    const result = stageResults[idx];
                    let barColor = 'bg-surface';
                    if (isDone) {
                      barColor = result ? 'bg-emerald-500' : 'bg-rose-500';
                    } else if (isCurrent) {
                      barColor = 'bg-primary animate-pulse';
                    }
                    return (
                      <div
                        key={idx}
                        className={`flex-1 border-r border-background last:border-0 ${barColor}`}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Inclusion Switcher (se houver aluno PNE na equipe) */}
              {teamHasPne && (
                <div className="flex items-center justify-between p-2.5 bg-surface rounded-2xl border border-border text-xs">
                  <div className="flex items-center gap-2 text-foreground font-semibold">
                    <HeartHandshake className="w-4 h-4 text-amber-500" />
                    <span>Modo Inclusivo AEE (Vez do Colega PNE):</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (!isAnswerRevealed) {
                        setViewPneMode((prev) => !prev);
                        setSelectedOptionIndex(null);
                        setSelectedSevereCardIndex(null);
                      }
                    }}
                    disabled={isAnswerRevealed}
                    className={`px-3 py-1.5 rounded-xl font-bold transition-colors cursor-pointer ${
                      viewPneMode
                        ? 'bg-amber-500 text-black shadow-sm'
                        : 'bg-surface-hover text-muted hover:text-foreground'
                    }`}
                  >
                    {viewPneMode ? 'Ativado ✨' : 'Alternar para PNE'}
                  </button>
                </div>
              )}

              {/* Stage Card */}
              <div className="p-5 sm:p-6 rounded-3xl bg-surface border border-border space-y-4 shadow-sm">
                <div className="flex items-center justify-between gap-2 border-b border-border pb-3">
                  <h3 className="text-sm sm:text-base font-extrabold text-foreground">
                    {currentStage.title}
                  </h3>
                  {currentStage.clue && !isAnswerRevealed && (
                    <button
                      type="button"
                      onClick={() => setShowClue((prev) => !prev)}
                      className="text-xs font-bold text-amber-500 hover:text-amber-400 flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-500/10 border border-amber-500/20 transition-colors cursor-pointer"
                    >
                      <Lightbulb className="w-3.5 h-3.5" />
                      <span>{showClue ? 'Ocultar Pista' : 'Ver Pista'}</span>
                    </button>
                  )}
                </div>

                {/* Clue Box */}
                {showClue && currentStage.clue && (
                  <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-500 flex items-start gap-2.5 animate-fadeIn">
                    <Lightbulb className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{currentStage.clue}</span>
                  </div>
                )}

                {/* Scenario Statement */}
                <p className="text-xs sm:text-sm md:text-base text-foreground font-medium leading-relaxed">
                  {viewPneMode && teamHasSeverePne && currentStage.pneSevereStage
                    ? currentStage.pneSevereStage.playfulPrompt
                    : viewPneMode && currentStage.pneMildStage
                    ? currentStage.pneMildStage.scenario
                    : currentStage.scenario}
                </p>

                {/* OPTIONS: Severe Playful Cards Mode */}
                {viewPneMode && teamHasSeverePne && currentStage.pneSevereStage ? (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                    {currentStage.pneSevereStage.visualCards.map((card, cIdx) => {
                      const isSelected = selectedSevereCardIndex === cIdx;
                      let cardStyle = 'bg-surface hover:bg-surface-hover border-border text-foreground';

                      if (isAnswerRevealed) {
                        if (card.isCorrect) {
                          cardStyle = 'bg-emerald-500/15 border-emerald-500 text-emerald-400 ring-2 ring-emerald-500/30';
                        } else if (isSelected && !card.isCorrect) {
                          cardStyle = 'bg-rose-500/15 border-rose-500 text-rose-400';
                        } else {
                          cardStyle = 'opacity-40 border-border text-muted';
                        }
                      } else if (isSelected) {
                        cardStyle = 'bg-primary/15 border-primary text-primary ring-2 ring-primary/40';
                      }

                      return (
                        <button
                          key={cIdx}
                          type="button"
                          disabled={isAnswerRevealed}
                          onClick={() => handleSelectSevereCard(cIdx)}
                          className={`p-4 rounded-2xl border text-center flex flex-col items-center justify-center gap-2 transition-all cursor-pointer ${cardStyle}`}
                        >
                          <span className="text-4xl sm:text-5xl drop-shadow-sm">{card.iconEmoji}</span>
                          <span className="text-xs sm:text-sm font-extrabold">{card.label}</span>
                          {isAnswerRevealed && isSelected && (
                            <span className="text-[11px] font-medium mt-1">
                              {card.feedback}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ) : viewPneMode && currentStage.pneMildStage ? (
                  /* OPTIONS: Mild Stage Mode (2 Options) */
                  <div className="space-y-2.5 pt-2">
                    {currentStage.pneMildStage.options.map((opt, oIdx) => {
                      const isSelected = selectedOptionIndex === oIdx;
                      let optStyle = 'bg-surface hover:bg-surface-hover border-border text-foreground';

                      if (isAnswerRevealed) {
                        if (opt.isCorrect) {
                          optStyle = 'bg-emerald-500/15 border-emerald-500 text-emerald-400 font-semibold';
                        } else if (isSelected && !opt.isCorrect) {
                          optStyle = 'bg-rose-500/15 border-rose-500 text-rose-400 font-semibold';
                        } else {
                          optStyle = 'opacity-40 border-border text-muted';
                        }
                      } else if (isSelected) {
                        optStyle = 'bg-primary/15 border-primary text-primary font-semibold ring-2 ring-primary/30';
                      }

                      return (
                        <button
                          key={oIdx}
                          type="button"
                          disabled={isAnswerRevealed}
                          onClick={() => handleSelectStandardOption(oIdx)}
                          className={`w-full p-4 rounded-2xl border text-left flex items-start gap-3 transition-all cursor-pointer ${optStyle}`}
                        >
                          <div className="w-6 h-6 rounded-full border flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold">
                            {oIdx === 0 ? 'A' : 'B'}
                          </div>
                          <div className="flex-1">
                            <span className="text-xs sm:text-sm block">{opt.text}</span>
                            {isAnswerRevealed && isSelected && (
                              <span className="text-xs text-muted block mt-1 font-normal">
                                {opt.feedback}
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  /* OPTIONS: Standard Mode (4 Options) */
                  <div className="space-y-2.5 pt-2">
                    {currentStage.options.map((opt, oIdx) => {
                      const isSelected = selectedOptionIndex === oIdx;
                      const letters = ['A', 'B', 'C', 'D'];
                      let optStyle = 'bg-surface hover:bg-surface-hover border-border text-foreground';

                      if (isAnswerRevealed) {
                        if (opt.isCorrect) {
                          optStyle = 'bg-emerald-500/15 border-emerald-500 text-emerald-400 font-semibold';
                        } else if (isSelected && !opt.isCorrect) {
                          optStyle = 'bg-rose-500/15 border-rose-500 text-rose-400 font-semibold';
                        } else {
                          optStyle = 'opacity-40 border-border text-muted';
                        }
                      } else if (isSelected) {
                        optStyle = 'bg-primary/15 border-primary text-primary font-semibold ring-2 ring-primary/30';
                      }

                      return (
                        <button
                          key={oIdx}
                          type="button"
                          disabled={isAnswerRevealed}
                          onClick={() => handleSelectStandardOption(oIdx)}
                          className={`w-full p-3.5 sm:p-4 rounded-2xl border text-left flex items-start gap-3 transition-all cursor-pointer ${optStyle}`}
                        >
                          <div className="w-6 h-6 rounded-full border border-current flex items-center justify-center shrink-0 mt-0.5 text-xs font-extrabold">
                            {letters[oIdx]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-xs sm:text-sm block">{opt.text}</span>
                            {isAnswerRevealed && (isSelected || opt.isCorrect) && (
                              <span className="text-xs text-muted block mt-1 font-normal">
                                {opt.feedback}
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-2">
                {!isAnswerRevealed ? (
                  <button
                    type="button"
                    onClick={handleConfirmAnswer}
                    disabled={
                      viewPneMode && teamHasSeverePne
                        ? selectedSevereCardIndex === null
                        : selectedOptionIndex === null
                    }
                    className="w-full py-4 rounded-2xl bg-primary hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed text-white font-extrabold text-sm sm:text-base shadow-xl shadow-primary/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Confirmar Resposta da Equipe</span>
                    <Check className="w-5 h-5 stroke-[2.5]" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleNextStage}
                    className="w-full py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-black font-extrabold text-sm sm:text-base shadow-xl shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer animate-fadeIn"
                  >
                    <span>{currentStageIndex + 1 < stages.length ? 'Avançar para Próxima Rodada' : 'Ver Resultado Final'}</span>
                    <ArrowRight className="w-5 h-5 stroke-[2.5]" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* SCREEN 3: Victory / Final Screen */}
          {isGameFinished && (
            <div className="space-y-6 text-center py-4 animate-fadeIn">
              <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 shadow-xl">
                <Trophy className="w-10 h-10 sm:w-12 sm:h-12" />
              </div>

              <div className="space-y-2">
                <h3 className="text-xl sm:text-2xl font-black text-foreground">
                  Partida Concluída com Sucesso!
                </h3>
                <p className="text-xs sm:text-sm text-muted max-w-md mx-auto">
                  Parabéns a toda a equipe pela dedicação e cooperação nos 6 desafios pedagógicos de {activity.title}.
                </p>
              </div>

              {/* Score Box */}
              <div className="p-6 rounded-3xl bg-surface border border-border max-w-sm mx-auto space-y-2 shadow-inner">
                <span className="text-xs font-bold uppercase tracking-wider text-muted">
                  Nota Conquistada
                </span>
                <div className="text-4xl sm:text-5xl font-black text-primary">
                  {finalScore.toFixed(1)} <span className="text-lg text-muted">/ {maxGrade.toFixed(1)}</span>
                </div>
                <p className="text-xs text-muted">
                  {correctCount} de {stages.length} rodadas resolvidas corretamente
                </p>
              </div>

              {/* Members receiving score */}
              <div className="p-4 rounded-2xl bg-surface/50 border border-border max-w-md mx-auto text-left space-y-1.5 text-xs">
                <span className="font-bold text-foreground flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-emerald-500" />
                  Alunos com nota lançada no sistema:
                </span>
                <p className="text-muted leading-relaxed">
                  {groupMembersString}
                </p>
              </div>

              <button
                type="button"
                onClick={handleSubmitFinal}
                className="w-full max-w-md mx-auto py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-black font-extrabold text-sm sm:text-base shadow-xl shadow-emerald-500/30 flex items-center justify-center gap-2 cursor-pointer transition-transform hover:scale-[1.01]"
              >
                <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
                <span>Gravar Nota e Enviar ao Professor</span>
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
