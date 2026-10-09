'use client';

import React from 'react';
import { X, SlidersHorizontal, Heart, Users, Check, RotateCcw } from 'lucide-react';
import { getTurmaLabel } from '@/lib/studentUtils';

interface StudentFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedTurmaFilter: string;
  onSelectTurmaFilter: (turma: string) => void;
  turmasList: string[];
  filterMode: 'all' | 'pne';
  onFilterModeChange: (mode: 'all' | 'pne') => void;
  totalStudentsInActiveTurma: number;
  pneStudentsInActiveTurma: number;
}

export const StudentFilterModal: React.FC<StudentFilterModalProps> = ({
  isOpen,
  onClose,
  selectedTurmaFilter,
  onSelectTurmaFilter,
  turmasList,
  filterMode,
  onFilterModeChange,
  totalStudentsInActiveTurma,
  pneStudentsInActiveTurma,
}) => {
  if (!isOpen) return null;

  const isPneOnly = filterMode === 'pne';

  const handleTogglePne = () => {
    onFilterModeChange(isPneOnly ? 'all' : 'pne');
  };

  const handleToggleAll = () => {
    onFilterModeChange(isPneOnly ? 'all' : 'all');
  };

  const handleReset = () => {
    onFilterModeChange('all');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-surface border border-border rounded-2xl sm:rounded-3xl p-5 sm:p-6 max-w-lg w-full shadow-2xl space-y-6 my-auto max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="filter-modal-title"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-border/60 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 rounded-xl border border-primary/20 text-primary">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <h2 id="filter-modal-title" className="text-lg sm:text-xl font-bold text-foreground">
                Filtrar Alunos
              </h2>
              <p className="text-xs text-muted mt-0.5">
                Alterne a exibição entre todos os alunos e público PNE respeitando a turma ativa.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-muted hover:text-foreground rounded-full hover:bg-surface-hover transition-colors cursor-pointer"
            aria-label="Fechar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Informações da Turma Ativa */}
        <div className="p-4 rounded-xl sm:rounded-2xl bg-[#171f33]/60 border border-border space-y-2.5">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-xs font-bold text-primary uppercase tracking-wider">
              Turma Ativa:
            </span>
            <span className="text-xs font-semibold text-foreground px-2.5 py-1 rounded-lg bg-surface border border-border">
              {selectedTurmaFilter === 'all'
                ? 'Todas as Turmas'
                : getTurmaLabel(selectedTurmaFilter)}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
            <div className="bg-surface/80 p-2.5 rounded-lg border border-border/70 flex items-center justify-between">
              <span className="text-muted">Total na turma:</span>
              <strong className="text-foreground font-bold">{totalStudentsInActiveTurma}</strong>
            </div>
            <div className="bg-surface/80 p-2.5 rounded-lg border border-border/70 flex items-center justify-between">
              <span className="text-muted flex items-center gap-1">
                <Heart className="w-3 h-3 text-rose-400 fill-rose-400/20" /> PNE na turma:
              </span>
              <strong className="text-amber-400 font-bold">{pneStudentsInActiveTurma}</strong>
            </div>
          </div>

          {/* Seletor rápido de turma dentro do modal para conveniência */}
          <div className="pt-2">
            <label htmlFor="modal-turma-select" className="text-[11px] font-bold text-muted block mb-1">
              Trocar Turma Ativa:
            </label>
            <select
              id="modal-turma-select"
              value={selectedTurmaFilter}
              onChange={(e) => onSelectTurmaFilter(e.target.value)}
              className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary cursor-pointer"
            >
              <option value="all">Todas as Turmas</option>
              {turmasList.map((t) => (
                <option key={t} value={t} className="bg-background text-foreground">
                  {getTurmaLabel(t)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Seção de Switches */}
        <div className="space-y-3.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted uppercase tracking-wider">
              Modo de Exibição de Alunos:
            </span>
            <span className="text-[11px] text-primary font-medium">
              {isPneOnly ? 'Apenas Alunos PNE' : 'Todos os Alunos'}
            </span>
          </div>

          {/* Switch 1: Todos os Alunos */}
          <div
            onClick={handleToggleAll}
            className={`p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
              !isPneOnly
                ? 'bg-primary/10 border-primary/40 shadow-sm'
                : 'bg-surface/60 border-border hover:bg-surface-hover'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`p-2 rounded-xl transition-colors shrink-0 ${
                  !isPneOnly ? 'bg-primary text-white' : 'bg-surface text-muted'
                }`}
              >
                <Users className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-foreground">Todos os Alunos</h4>
                <p className="text-xs text-muted leading-tight mt-0.5">
                  Exibe todos os estudantes matriculados na turma ativa ({totalStudentsInActiveTurma})
                </p>
              </div>
            </div>

            {/* Switch UI Toggle */}
            <button
              type="button"
              role="switch"
              aria-checked={!isPneOnly}
              onClick={(e) => {
                e.stopPropagation();
                handleToggleAll();
              }}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary ${
                !isPneOnly ? 'bg-primary' : 'bg-slate-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  !isPneOnly ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Switch 2: Apenas Alunos PNE */}
          <div
            onClick={handleTogglePne}
            className={`p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
              isPneOnly
                ? 'bg-amber-500/10 border-amber-500/40 shadow-sm'
                : 'bg-surface/60 border-border hover:bg-surface-hover'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`p-2 rounded-xl transition-colors shrink-0 ${
                  isPneOnly ? 'bg-amber-500 text-white' : 'bg-surface text-muted'
                }`}
              >
                <Heart className="w-4 h-4 fill-current" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h4 className="text-sm font-bold text-foreground">Apenas Alunos PNE</h4>
                  <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 bg-amber-500/20 text-amber-400 rounded-md">
                    Educação Especial
                  </span>
                </div>
                <p className="text-xs text-muted leading-tight mt-0.5">
                  Filtra exclusivamente alunos com laudo / PNE na turma ativa ({pneStudentsInActiveTurma})
                </p>
              </div>
            </div>

            {/* Switch UI Toggle */}
            <button
              type="button"
              role="switch"
              aria-checked={isPneOnly}
              onClick={(e) => {
                e.stopPropagation();
                handleTogglePne();
              }}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-amber-400 ${
                isPneOnly ? 'bg-amber-500' : 'bg-slate-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  isPneOnly ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Resumo do Filtro Aplicado */}
        <div className="p-3 bg-surface rounded-xl border border-border/80 flex items-center justify-between text-xs">
          <span className="text-muted">Resultado atual:</span>
          <span className="font-bold text-foreground flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400"></span>
            {isPneOnly
              ? `${pneStudentsInActiveTurma} ${pneStudentsInActiveTurma === 1 ? 'aluno PNE encontrado' : 'alunos PNE encontrados'}`
              : `${totalStudentsInActiveTurma} ${totalStudentsInActiveTurma === 1 ? 'aluno encontrado' : 'alunos encontrados'}`}
          </span>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between gap-3 pt-2 border-t border-border/60">
          <button
            type="button"
            onClick={handleReset}
            className="py-2.5 px-4 bg-transparent hover:bg-surface-hover text-muted hover:text-foreground text-xs font-bold rounded-xl border border-border transition-colors flex items-center gap-1.5 cursor-pointer min-h-[42px]"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Redefinir</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 px-5 bg-primary hover:bg-primary-hover text-white text-xs sm:text-sm font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer min-h-[42px]"
          >
            <Check className="w-4 h-4" />
            <span>Aplicar Filtros</span>
          </button>
        </div>
      </div>
    </div>
  );
};
