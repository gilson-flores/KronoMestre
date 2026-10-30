'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Filter, ChevronDown, Check, Users } from 'lucide-react';
import { StudentUser } from '@/lib/types';
import { getTurmaLabel, isStudentPNE } from '@/lib/studentUtils';

interface TurmaFilterDropdownProps {
  turmasList: string[];
  selectedTurmas: string[];
  onChange: (selected: string[]) => void;
  students?: StudentUser[];
  totalCountLabel?: string;
}

export const TurmaFilterDropdown: React.FC<TurmaFilterDropdownProps> = ({
  turmasList,
  selectedTurmas,
  onChange,
  students = [],
  totalCountLabel = 'alunos',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isNoneSelected = selectedTurmas.includes('none');

  const isAllSelected = useMemo(() => {
    if (isNoneSelected) return false;
    return (
      selectedTurmas.length === 0 ||
      selectedTurmas.includes('all') ||
      (turmasList.length > 0 && selectedTurmas.length === turmasList.length)
    );
  }, [selectedTurmas, turmasList, isNoneSelected]);

  const isTurmaChecked = (t: string) => {
    if (isNoneSelected) return false;
    if (isAllSelected) return true;
    return selectedTurmas.includes(t);
  };

  const toggleTurma = (t: string) => {
    if (isNoneSelected) {
      onChange([t]);
      return;
    }
    if (isAllSelected) {
      const remaining = turmasList.filter((item) => item !== t);
      onChange(remaining.length === 0 ? ['none'] : remaining);
      return;
    }
    if (selectedTurmas.includes(t)) {
      const next = selectedTurmas.filter((item) => item !== t);
      onChange(next.length === 0 ? ['none'] : next);
    } else {
      const next = [...selectedTurmas, t];
      if (next.length === turmasList.length) {
        onChange(['all']);
      } else {
        onChange(next);
      }
    }
  };

  const handleSelectAll = () => onChange(['all']);
  const handleClearAll = () => onChange(['none']);

  const handleSelectOnly = (t: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([t]);
    setIsOpen(false);
  };

  const dropdownLabel = useMemo(() => {
    if (isNoneSelected) return 'Nenhuma turma marcada';
    if (isAllSelected) return `Todas as Turmas (${turmasList.length})`;
    if (selectedTurmas.length === 1) return `Turma ${getTurmaLabel(selectedTurmas[0])}`;
    return `${selectedTurmas.length} turmas selecionadas`;
  }, [isNoneSelected, isAllSelected, selectedTurmas, turmasList]);

  return (
    <div className="relative min-w-[240px]" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-2xl border text-xs font-bold transition-all cursor-pointer ${
          !isAllSelected
            ? 'bg-primary/15 border-primary text-primary shadow-sm'
            : 'bg-background border-border text-foreground hover:border-primary/40'
        }`}
      >
        <div className="flex items-center gap-2 truncate">
          <span className="p-1 rounded-lg bg-primary/15 text-primary shrink-0">
            <Filter className="w-3.5 h-3.5" />
          </span>
          <span className="truncate">{dropdownLabel}</span>
        </div>
        <ChevronDown
          className={`w-4 h-4 shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-primary' : 'text-muted'
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 sm:w-[340px] mt-2 bg-surface border border-border rounded-2xl shadow-2xl z-50 p-3 space-y-2 animate-fadeIn">
          <div className="flex items-center justify-between pb-2 border-b border-border px-1">
            <span className="text-[11px] font-extrabold text-muted uppercase tracking-wider flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-primary" />
              Turmas do Professor
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-[11px] font-bold text-primary hover:underline cursor-pointer"
              >
                Marcar Tudo
              </button>
              <span className="text-border">•</span>
              <button
                type="button"
                onClick={handleClearAll}
                className="text-[11px] font-bold text-rose-400 hover:text-rose-300 hover:underline cursor-pointer"
              >
                Desmarcar Tudo
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => (isAllSelected ? handleClearAll() : handleSelectAll())}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
              isAllSelected
                ? 'bg-primary/15 border-primary/40 text-primary'
                : 'bg-background/60 border-border text-foreground hover:bg-surface-hover'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div
                className={`w-4 h-4 rounded flex items-center justify-center border transition-all ${
                  isAllSelected ? 'bg-primary border-primary text-white' : 'border-muted bg-background'
                }`}
              >
                {isAllSelected && <Check className="w-3 h-3 stroke-[3]" />}
              </div>
              <span>Todas as Turmas (Todas as classes)</span>
            </div>
            {students.length > 0 && (
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-surface border border-border text-muted">
                {students.length} {totalCountLabel}
              </span>
            )}
          </button>

          <div className="max-h-60 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
            {turmasList.map((t) => {
              const checked = isTurmaChecked(t);
              const countInTurma = students.filter((s) => s.turma === t).length;
              const pneInTurma = students.filter((s) => s.turma === t && isStudentPNE(s)).length;

              return (
                <div
                  key={t}
                  onClick={() => toggleTurma(t)}
                  className={`group flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all cursor-pointer border ${
                    checked
                      ? 'bg-primary/10 border-primary/30 text-foreground font-bold'
                      : 'bg-background/30 border-transparent text-muted hover:bg-surface-hover hover:text-foreground'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-4 h-4 rounded flex items-center justify-center border transition-all shrink-0 ${
                        checked ? 'bg-primary border-primary text-white' : 'border-muted bg-background'
                      }`}
                    >
                      {checked && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <span className="truncate">{getTurmaLabel(t)}</span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {pneInTurma > 0 && (
                      <span
                        className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30"
                        title={`${pneInTurma} aluno(s) PNE nesta turma`}
                      >
                        {pneInTurma} PNE
                      </span>
                    )}
                    {students.length > 0 && (
                      <span className="text-[10px] font-semibold text-muted px-1.5 py-0.5 rounded bg-surface">
                        {countInTurma}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={(e) => handleSelectOnly(t, e)}
                      className="opacity-70 group-hover:opacity-100 text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-primary/20 text-primary hover:bg-primary hover:text-white transition-all cursor-pointer"
                      title="Filtrar apenas esta turma"
                    >
                      Apenas
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default TurmaFilterDropdown;
