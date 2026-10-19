'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  FileText,
  AlertCircle,
  CheckCircle2,
  ClipboardX,
  Type,
  Eraser,
  Sparkles,
  BookOpen,
} from 'lucide-react';

interface RuledEssaySheetProps {
  value: string;
  onChange: (value: string) => void;
  maxEssayScore?: number;
  securityBlockPaste?: boolean;
  onSecurityAlert?: (msg: string) => void;
  isReadOnly?: boolean;
  minCharacters?: number;
  keywords?: string;
  statement?: string;
}

export const RuledEssaySheet: React.FC<RuledEssaySheetProps> = ({
  value,
  onChange,
  maxEssayScore = 5.0,
  securityBlockPaste = false,
  onSecurityAlert,
  isReadOnly = false,
  minCharacters = 100,
  keywords,
  statement,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [activeLine, setActiveLine] = useState<number>(1);
  const [fontSize, setFontSize] = useState<'normal' | 'large'>('normal');

  // Quebra o texto por quebras de linha reais
  const currentLinesCount = useMemo(() => {
    if (!value) return 0;
    const lines = value.split('\n');
    return lines.length;
  }, [value]);

  // Contagem de palavras e caracteres
  const stats = useMemo(() => {
    const trimmed = (value || '').trim();
    const chars = trimmed.length;
    const words = trimmed ? trimmed.split(/\s+/).filter(Boolean).length : 0;
    
    // Estimativa pedagógica de linhas reais considerando parágrafos e largura média (aprox 75 caracteres por linha)
    const paragraphs = (value || '').split('\n');
    let estimatedVisualLines = 0;
    paragraphs.forEach((p) => {
      const lineLen = p.length;
      estimatedVisualLines += Math.max(1, Math.ceil(lineLen / 70));
    });

    const displayLines = Math.max(currentLinesCount, estimatedVisualLines);

    return {
      chars,
      words,
      displayLines,
    };
  }, [value, currentLinesCount]);

  // Quantidade de linhas da folha pautada (padrão mínimo 30 linhas, expande se o aluno escrever mais)
  const totalSheetLines = useMemo(() => {
    return Math.max(30, stats.displayLines + 5);
  }, [stats.displayLines]);

  // Detecta linha ativa pelo cursor
  const handleKeyUp = () => {
    if (!textareaRef.current) return;
    const textUpToCursor = textareaRef.current.value.substring(0, textareaRef.current.selectionStart);
    const lineIndex = textUpToCursor.split('\n').length;
    setActiveLine(lineIndex);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    if (securityBlockPaste) {
      e.preventDefault();
      if (onSecurityAlert) {
        onSecurityAlert('❌ Cola (Ctrl+V) bloqueada! A redação exige escrita manual e autoral.');
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    if (securityBlockPaste) {
      e.preventDefault();
      if (onSecurityAlert) {
        onSecurityAlert('❌ Ação de arrastar textos bloqueada para a folha de redação.');
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (securityBlockPaste && (e.ctrlKey || e.metaKey) && ['v', 'V'].includes(e.key)) {
      e.preventDefault();
      if (onSecurityAlert) {
        onSecurityAlert('❌ Atalho de colar (Ctrl+V) desabilitado pelo professor.');
      }
    }
  };

  // Status pedagógico da extensão do texto
  const extensionBadge = useMemo(() => {
    if (stats.chars === 0) {
      return {
        label: 'Folha em Branco',
        color: 'text-muted bg-surface/80 border-border',
        icon: FileText,
      };
    }
    if (stats.displayLines < 7 || stats.chars < (minCharacters || 100)) {
      return {
        label: `Em Desenvolvimento (${stats.displayLines} linhas)`,
        color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
        icon: AlertCircle,
      };
    }
    if (stats.displayLines <= 20) {
      return {
        label: `Boa Extensão (${stats.displayLines} linhas)`,
        color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
        icon: CheckCircle2,
      };
    }
    return {
      label: `Redação Completa (${stats.displayLines} linhas • Padrão ENEM)`,
      color: 'text-purple-300 bg-purple-500/10 border-purple-500/30',
      icon: Sparkles,
    };
  }, [stats, minCharacters]);

  const lineHeightPx = fontSize === 'large' ? 36 : 30;

  return (
    <div className="space-y-3">
      {/* Barra de Ferramentas da Folha de Redação */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 p-3 sm:p-3.5 bg-surface rounded-2xl border border-border text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-extrabold text-foreground flex items-center gap-1.5">
            <BookOpen className="w-4 h-4 text-primary" />
            <span>Folha Oficial de Redação</span>
          </span>

          {/* Badge de Extensão Pedagógica */}
          <span className={`px-2.5 py-0.5 rounded-full border text-[11px] font-bold flex items-center gap-1 ${extensionBadge.color}`}>
            <extensionBadge.icon className="w-3.5 h-3.5 shrink-0" />
            <span>{extensionBadge.label}</span>
          </span>

          {securityBlockPaste && (
            <span className="text-[10px] text-purple-600 font-bold bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20 flex items-center gap-1">
              <ClipboardX className="w-3 h-3 text-purple-400" />
              <span>Sem Cola</span>
            </span>
          )}
        </div>

        {/* Contadores da Produção Textual */}
        <div className="flex items-center gap-3 text-muted text-[11px] font-semibold">
          <span className="bg-background px-2.5 py-1 rounded-lg border border-border">
            <strong className="text-foreground">{stats.displayLines}</strong> / 30 linhas
          </span>
          <span className="bg-background px-2.5 py-1 rounded-lg border border-border">
            <strong className="text-foreground">{stats.words}</strong> palavras
          </span>
          <span className="bg-background px-2.5 py-1 rounded-lg border border-border hidden sm:inline">
            <strong className="text-foreground">{stats.chars}</strong> caracteres
          </span>

          {/* Alternador de Tamanho da Letra */}
          <button
            type="button"
            onClick={() => setFontSize((prev) => (prev === 'normal' ? 'large' : 'normal'))}
            className="px-2.5 py-1 rounded-lg bg-background hover:bg-surface-hover border border-border text-foreground text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer active:scale-95"
            title="Alternar tamanho da pauta e caligrafia"
          >
            <Type className="w-3 h-3 text-primary" />
            <span>{fontSize === 'normal' ? 'Zoom A+' : 'Padrão'}</span>
          </button>
        </div>
      </div>

      {/* RECORTE DA FOLHA DE CADERNO / REDAÇÃO ESCOLAR OFICIAL */}
      <div className="relative rounded-2xl overflow-hidden border-2 border-border/80 shadow-2xl bg-[#0e1424] text-foreground">
        {/* Cabeçalho do Caderno com Picotado e Furos de Espiral */}
        <div className="bg-[#141b2f] border-b border-border/80 px-4 py-2.5 flex items-center justify-between text-[11px] font-bold text-muted select-none">
          <div className="flex items-center gap-2">
            {/* Simulação de Furos de Caderno Universitário */}
            <div className="flex items-center gap-1.5 opacity-60">
              <div className="w-2.5 h-2.5 rounded-full bg-[#060a14] border border-border" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#060a14] border border-border" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#060a14] border border-border" />
            </div>
            <span className="ml-2 uppercase tracking-widest text-[10px] text-primary/80 font-mono">
              FOLHA DE RESPOSTA DISSERTATIVA • VALOR: {maxEssayScore.toFixed(1)} PTS
            </span>
          </div>

          <div className="flex items-center gap-2 text-[10px] text-muted">
            <span>Caneta Azul ou Preta Virtual</span>
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          </div>
        </div>

        {/* ÁREA PAUTADA COM LINHAS NUMERADAS E MARGEM ESCOLAR VERMELHA */}
        <div className="relative flex min-h-[460px] overflow-hidden">
          {/* COLUNA ESQUERDA: Numeração de Linhas (01, 02, 03... 30) */}
          <div
            className="w-11 sm:w-14 shrink-0 bg-[#0b101d] select-none text-right pr-2 sm:pr-3 text-slate-500 font-mono text-[10px] sm:text-[11px] font-bold border-r-2 border-rose-500/40"
            style={{
              paddingTop: '12px',
            }}
          >
            {Array.from({ length: totalSheetLines }, (_, i) => i + 1).map((num) => {
              const isCurrent = num === activeLine;
              return (
                <div
                  key={num}
                  style={{ height: `${lineHeightPx}px`, lineHeight: `${lineHeightPx}px` }}
                  className={`transition-colors flex items-center justify-end ${
                    isCurrent
                      ? 'text-primary font-black scale-105'
                      : num <= stats.displayLines
                      ? 'text-slate-300'
                      : 'text-slate-600'
                  }`}
                >
                  {String(num).padStart(2, '0')}
                </div>
              );
            })}
          </div>

          {/* LINHA GUIA VERTICAL DE MARGEM ESQUERDA (ESTILO CADERNO / REDAÇÃO ENEM) */}
          <div className="absolute left-11 sm:left-14 top-0 bottom-0 w-[2px] bg-rose-500/40 pointer-events-none z-10" />

          {/* ÁREA DO TEXTO COM PAUTA HORIZONTAL ALINHADA */}
          <div className="relative flex-1">
            {/* Fundo pautado horizontal gerado via gradiente milimétrico */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                paddingTop: '12px',
                backgroundImage: `linear-gradient(to bottom, transparent ${lineHeightPx - 1}px, rgba(148, 163, 184, 0.14) ${lineHeightPx}px)`,
                backgroundSize: `100% ${lineHeightPx}px`,
                backgroundPosition: '0 12px',
              }}
            />

            {/* Margem Guia Direita Sutil (Para orientação de translineação) */}
            <div className="absolute right-4 top-0 bottom-0 w-[1px] border-r border-dashed border-slate-700/50 pointer-events-none" />

            <textarea
              ref={textareaRef}
              rows={totalSheetLines}
              value={value || ''}
              onChange={(e) => onChange(e.target.value)}
              onKeyUp={handleKeyUp}
              onClick={handleKeyUp}
              onPaste={handlePaste}
              onDrop={handleDrop}
              onKeyDown={handleKeyDown}
              disabled={isReadOnly}
              placeholder={
                securityBlockPaste
                  ? "Comece a redigir seu texto na Linha 01... (Ação de colar desabilitada para garantir escrita autoral)"
                  : "Comece a redigir seu texto na Linha 01... Respeite os parágrafos, concordância e argumentação conceitual."
              }
              style={{
                paddingTop: '12px',
                paddingLeft: '14px',
                paddingRight: '20px',
                lineHeight: `${lineHeightPx}px`,
                fontSize: fontSize === 'large' ? '15px' : '13px',
              }}
              className="relative w-full h-full min-h-[460px] bg-transparent text-slate-100 placeholder:text-slate-500 font-sans tracking-wide resize-y focus:outline-none focus:ring-0 leading-relaxed border-0 selection:bg-primary/30"
            />
          </div>
        </div>

        {/* Rodapé da Folha com Orientações e Dicas Pedagógicas */}
        <div className="bg-[#141b2f] border-t border-border/80 px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-[10px] text-muted select-none">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-slate-400">Dica Pedagógica:</span>
            <span>Estruture sua resposta em introdução, desenvolvimento e conclusão.</span>
          </div>

          <div className="flex items-center gap-2">
            <span>Margem Direita: Respeite a translineação</span>
            {keywords && (
              <span className="text-primary font-semibold hidden md:inline">
                • Atenção aos conceitos-chave da questão
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
