'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { GameSevereStage } from '@/lib/types';
import { CheckCircle2, RotateCcw, Sparkles, Link2, Layers, Type, Image as ImageIcon } from 'lucide-react';

interface PlayfulPolymorphicStageViewProps {
  stageId: string;
  severeStage: GameSevereStage;
  disabled?: boolean;
  isAnswerRevealed?: boolean;
  onSelectResult: (isCorrect: boolean, feedback: string) => void;
}

export const PlayfulPolymorphicStageView: React.FC<PlayfulPolymorphicStageViewProps> = ({
  stageId,
  severeStage,
  disabled = false,
  isAnswerRevealed = false,
  onSelectResult,
}) => {
  const subMechanic = useMemo(() => {
    if (severeStage.subMechanic) return severeStage.subMechanic;
    if (severeStage.wordPairs && severeStage.wordPairs.length >= 2) return 'word_match';
    if (severeStage.categoryItems && severeStage.categoryItems.length >= 2 && severeStage.categories) return 'category_sort';
    if (severeStage.sentenceBlank && severeStage.sentenceBlank.correctChip) return 'sentence_chips';
    return 'visual_cards';
  }, [severeStage]);

  // Estado 1: Cartões Visuais
  const [selectedCardIdx, setSelectedCardIdx] = useState<number | null>(null);

  // Estado 2: Ligar Palavras (word_match)
  const [activeLeftIdx, setActiveLeftIdx] = useState<number | null>(null);
  const [connections, setConnections] = useState<Record<number, number>>({});

  // Estado 3: Classificar em Caixas (category_sort)
  const [boxAssignments, setBoxAssignments] = useState<Record<number, 0 | 1>>({});

  // Estado 4: Completar Frase com Chips (sentence_chips)
  const [selectedChip, setSelectedChip] = useState<string | null>(null);

  useEffect(() => {
    setSelectedCardIdx(null);
    setActiveLeftIdx(null);
    setConnections({});
    setBoxAssignments({});
    setSelectedChip(null);
  }, [stageId, subMechanic]);

  const wordPairs = severeStage.wordPairs || [];
  const shuffledRightItems = useMemo(() => {
    return wordPairs.map((p, originalIdx) => ({ text: p.right, originalIdx })).reverse();
  }, [wordPairs]);

  const allSentenceChips = useMemo(() => {
    if (!severeStage.sentenceBlank) return [];
    const raw = [
      severeStage.sentenceBlank.correctChip,
      ...(severeStage.sentenceBlank.distractorChips || []),
    ].filter(Boolean);
    return Array.from(new Set(raw));
  }, [severeStage.sentenceBlank]);

  // Handler: Ligar Palavras
  const handlePairRightClick = (rightOriginalIdx: number) => {
    if (disabled || isAnswerRevealed || activeLeftIdx === null) return;
    const next = { ...connections, [activeLeftIdx]: rightOriginalIdx };
    setConnections(next);
    setActiveLeftIdx(null);

    if (Object.keys(next).length === wordPairs.length) {
      const allCorrect = wordPairs.every((_, lIdx) => next[lIdx] === lIdx);
      onSelectResult(
        allCorrect,
        allCorrect
          ? 'Excelente! Você conectou todos os conceitos do livro corretamente!'
          : 'Alguns pares ficaram trocados. Observe a relação entre cada conceito e seu exemplo!'
      );
    }
  };

  // Handler: Classificar em Caixas
  const categoryItems = severeStage.categoryItems || [];
  const categories = severeStage.categories || ['Categoria 1', 'Categoria 2'];

  const handleAssignCategory = (itemIdx: number, catIdx: 0 | 1) => {
    if (disabled || isAnswerRevealed) return;
    const next = { ...boxAssignments, [itemIdx]: catIdx };
    setBoxAssignments(next);

    if (Object.keys(next).length === categoryItems.length) {
      const allCorrect = categoryItems.every((item, idx) => next[idx] === item.categoryIndex);
      onSelectResult(
        allCorrect,
        allCorrect
          ? 'Muito bem! Todos os exemplos foram classificados nas caixas corretas!'
          : 'Quase lá! Confira qual exemplo pertence a cada categoria do capítulo.'
      );
    }
  };

  // Handler: Frase Guiada por Chips
  const handleSelectSentenceChip = (chip: string) => {
    if (disabled || isAnswerRevealed || !severeStage.sentenceBlank) return;
    setSelectedChip(chip);
    const isCorrect = chip.trim().toLowerCase() === severeStage.sentenceBlank.correctChip.trim().toLowerCase();
    onSelectResult(
      isCorrect,
      isCorrect
        ? 'Perfeito! A frase sociológica ficou completa e correta!'
        : `Tente novamente! A palavra que completa a ideia do livro é "${severeStage.sentenceBlank.correctChip}".`
    );
  };

  const badgeConfig = {
    visual_cards: { label: 'Identificação Visual e Cena', icon: ImageIcon, color: 'text-amber-400 border-amber-500/30 bg-amber-500/10' },
    word_match: { label: 'Ligar Palavras e Conceitos', icon: Link2, color: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10' },
    category_sort: { label: 'Classificar nas Caixas', icon: Layers, color: 'text-purple-400 border-purple-500/30 bg-purple-500/10' },
    sentence_chips: { label: 'Completar Ideia com Blocos', icon: Type, color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' },
  }[subMechanic];

  const BadgeIcon = badgeConfig.icon;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-center">
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider border ${badgeConfig.color}`}>
          <BadgeIcon className="w-3.5 h-3.5" />
          <span>Dinâmica Lúdica: {badgeConfig.label}</span>
        </span>
      </div>

      {/* MECÂNICA 1: LIGAR PALAVRAS (WORD MATCH) */}
      {subMechanic === 'word_match' && wordPairs.length >= 2 && (
        <div className="space-y-3 pt-1">
          <p className="text-xs text-center text-muted font-semibold">
            Toque primeiro em um item da <strong className="text-cyan-400">Coluna A</strong> e depois no seu par na <strong className="text-amber-400">Coluna B</strong>:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <span className="text-[11px] font-black uppercase text-cyan-400 block px-1">Coluna A • Conceitos</span>
              {wordPairs.map((pair, lIdx) => {
                const isSelected = activeLeftIdx === lIdx;
                const matchedRightIdx = connections[lIdx];
                const isMatched = matchedRightIdx !== undefined;
                return (
                  <button
                    key={lIdx}
                    type="button"
                    disabled={disabled || isAnswerRevealed}
                    onClick={() => setActiveLeftIdx(lIdx)}
                    className={`w-full p-3.5 rounded-2xl border-2 text-left flex items-center justify-between gap-2 transition-all cursor-pointer min-h-[52px] ${
                      isSelected
                        ? 'bg-cyan-500/20 border-cyan-400 ring-2 ring-cyan-400/30'
                        : isMatched
                        ? 'bg-emerald-500/10 border-emerald-500/40'
                        : 'bg-background hover:bg-surface-hover border-border'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-2xl shrink-0">{pair.iconEmoji || '🔹'}</span>
                      <span className="text-xs sm:text-sm font-black text-foreground">{pair.left}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-surface border border-border shrink-0">
                      {isMatched ? `Par #${lIdx + 1} ✓` : `#${lIdx + 1}`}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="space-y-2">
              <span className="text-[11px] font-black uppercase text-amber-400 block px-1">Coluna B • Exemplos / Sentidos</span>
              {shuffledRightItems.map((rItem, rRenderIdx) => {
                const connectedLeftEntry = Object.entries(connections).find(([, val]) => val === rItem.originalIdx);
                const connectedLeftIdx = connectedLeftEntry ? Number(connectedLeftEntry[0]) : null;
                const isCorrectPair = isAnswerRevealed && connectedLeftIdx === rItem.originalIdx;
                const isWrongPair = isAnswerRevealed && connectedLeftIdx !== null && connectedLeftIdx !== rItem.originalIdx;

                return (
                  <button
                    key={rRenderIdx}
                    type="button"
                    disabled={disabled || isAnswerRevealed || activeLeftIdx === null}
                    onClick={() => handlePairRightClick(rItem.originalIdx)}
                    className={`w-full p-3.5 rounded-2xl border-2 text-left flex items-center justify-between gap-2 transition-all cursor-pointer min-h-[52px] ${
                      isCorrectPair
                        ? 'bg-emerald-500/20 border-emerald-400'
                        : isWrongPair
                        ? 'bg-rose-500/20 border-rose-400'
                        : connectedLeftIdx !== null
                        ? 'bg-amber-500/15 border-amber-400'
                        : activeLeftIdx !== null
                        ? 'bg-background hover:bg-amber-500/10 border-amber-400/50 animate-pulse'
                        : 'bg-background border-border opacity-85'
                    }`}
                  >
                    <span className="text-xs sm:text-sm font-bold text-foreground leading-snug">{rItem.text}</span>
                    {connectedLeftIdx !== null && (
                      <span className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-amber-500 text-slate-950 shrink-0">
                        Ligado ao #{connectedLeftIdx + 1}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {!isAnswerRevealed && Object.keys(connections).length > 0 && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setConnections({});
                  setActiveLeftIdx(null);
                }}
                className="text-xs text-muted hover:text-foreground flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Limpar conexões
              </button>
            </div>
          )}
        </div>
      )}

      {/* MECÂNICA 2: CLASSIFICAR EM CAIXAS (CATEGORY SORT) */}
      {subMechanic === 'category_sort' && categoryItems.length >= 2 && (
        <div className="space-y-3 pt-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-center">
              <span className="text-[10px] font-black uppercase text-cyan-400 block">Caixa A</span>
              <strong className="text-xs sm:text-sm text-foreground">{categories[0]}</strong>
            </div>
            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-center">
              <span className="text-[10px] font-black uppercase text-amber-400 block">Caixa B</span>
              <strong className="text-xs sm:text-sm text-foreground">{categories[1]}</strong>
            </div>
          </div>

          <div className="space-y-2.5">
            {categoryItems.map((item, idx) => {
              const chosen = boxAssignments[idx];
              const isItemCorrect = isAnswerRevealed && chosen === item.categoryIndex;
              const isItemWrong = isAnswerRevealed && chosen !== undefined && chosen !== item.categoryIndex;

              return (
                <div
                  key={idx}
                  className={`p-3.5 rounded-2xl border-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isItemCorrect
                      ? 'bg-emerald-500/15 border-emerald-400'
                      : isItemWrong
                      ? 'bg-rose-500/15 border-rose-400'
                      : 'bg-background border-border'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-3xl select-none">{item.iconEmoji || '📌'}</span>
                    <span className="text-xs sm:text-sm font-black text-foreground">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      disabled={disabled || isAnswerRevealed}
                      onClick={() => handleAssignCategory(idx, 0)}
                      className={`px-3 py-2 rounded-xl text-xs font-black border transition-all cursor-pointer min-h-[42px] ${
                        chosen === 0
                          ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-md'
                          : 'bg-surface hover:bg-surface-hover text-muted border-border'
                      }`}
                    >
                      📦 {categories[0]}
                    </button>
                    <button
                      type="button"
                      disabled={disabled || isAnswerRevealed}
                      onClick={() => handleAssignCategory(idx, 1)}
                      className={`px-3 py-2 rounded-xl text-xs font-black border transition-all cursor-pointer min-h-[42px] ${
                        chosen === 1
                          ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md'
                          : 'bg-surface hover:bg-surface-hover text-muted border-border'
                      }`}
                    >
                      📦 {categories[1]}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MECÂNICA 3: COMPLETAR FRASE COM BLOCOS / CHIPS (SENTENCE CHIPS) */}
      {subMechanic === 'sentence_chips' && severeStage.sentenceBlank && (
        <div className="space-y-4 pt-1">
          <div className="p-5 rounded-3xl bg-background border-2 border-emerald-500/30 text-center space-y-2">
            <span className="text-4xl block">{severeStage.sentenceBlank.iconEmoji || '🧩'}</span>
            <p className="text-sm sm:text-base font-black text-foreground leading-relaxed">
              {severeStage.sentenceBlank.sentenceWithBlank.split('_____').map((part, i, arr) => (
                <React.Fragment key={i}>
                  {part}
                  {i < arr.length - 1 && (
                    <span className="inline-block mx-1.5 px-3 py-1 rounded-xl bg-amber-500/20 border-2 border-amber-400 text-amber-300 font-black">
                      {selectedChip || ' [ TOQUE EM UM BLOCO ABAIXO ] '}
                    </span>
                  )}
                </React.Fragment>
              ))}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {allSentenceChips.map((chip, idx) => {
              const isSelected = selectedChip === chip;
              const isCorrectChip =
                chip.trim().toLowerCase() === severeStage.sentenceBlank!.correctChip.trim().toLowerCase();

              return (
                <button
                  key={idx}
                  type="button"
                  disabled={disabled || isAnswerRevealed}
                  onClick={() => handleSelectSentenceChip(chip)}
                  className={`p-4 rounded-2xl border-2 font-black text-xs sm:text-sm transition-all cursor-pointer min-h-[54px] ${
                    isAnswerRevealed
                      ? isCorrectChip
                        ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                        : isSelected
                        ? 'bg-rose-500/20 border-rose-400 text-rose-300'
                        : 'opacity-40 border-border text-muted'
                      : isSelected
                      ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-lg'
                      : 'bg-background hover:bg-surface-hover border-border text-foreground'
                  }`}
                >
                  🧩 {chip}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* MECÂNICA 4 (OU FALLBACK): IDENTIFICAÇÃO VISUAL / CARTÕES (VISUAL CARDS) */}
      {(subMechanic === 'visual_cards' ||
        (subMechanic === 'word_match' && wordPairs.length < 2) ||
        (subMechanic === 'category_sort' && categoryItems.length < 2) ||
        (subMechanic === 'sentence_chips' && !severeStage.sentenceBlank)) && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          {(severeStage.visualCards || []).map((card, idx) => {
            const isSelected = selectedCardIdx === idx;
            return (
              <button
                key={idx}
                type="button"
                disabled={disabled || isAnswerRevealed}
                onClick={() => {
                  setSelectedCardIdx(idx);
                  onSelectResult(card.isCorrect, card.feedback);
                }}
                className={`p-5 rounded-3xl border-2 flex flex-col items-center justify-center gap-3 text-center transition-all cursor-pointer active:scale-95 min-h-[140px] ${
                  isAnswerRevealed
                    ? card.isCorrect
                      ? 'bg-emerald-500/20 border-emerald-400 shadow-lg'
                      : isSelected
                      ? 'bg-rose-500/20 border-rose-400'
                      : 'opacity-40 border-border'
                    : isSelected
                    ? 'bg-amber-500/20 border-amber-400 ring-2 ring-amber-400/40 shadow-lg'
                    : 'bg-background hover:bg-surface-hover border-border hover:border-amber-400/50'
                }`}
              >
                <span className="text-5xl sm:text-6xl select-none">{card.iconEmoji}</span>
                <span className="text-xs sm:text-sm font-black text-foreground">{card.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
