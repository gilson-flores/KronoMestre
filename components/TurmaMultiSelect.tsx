'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Users } from 'lucide-react';
import { DEFAULT_TURMAS } from '@/lib/studentUtils';

interface TurmaMultiSelectProps {
  selectedTurmas: string[];
  onChange: (selected: string[]) => void;
  options?: string[];
  label?: string;
  placeholder?: string;
}

export const TurmaMultiSelect: React.FC<TurmaMultiSelectProps> = ({
  selectedTurmas,
  onChange,
  options = DEFAULT_TURMAS,
  placeholder = 'Selecione as turmas...',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Combine default options with any custom options present in selectedTurmas
  const allOptions = Array.from(
    new Set([...options, ...selectedTurmas.filter(Boolean)])
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleTurma = (turma: string) => {
    if (selectedTurmas.includes(turma)) {
      onChange(selectedTurmas.filter((t) => t !== turma));
    } else {
      onChange([...selectedTurmas, turma]);
    }
  };

  const isAllSelected =
    allOptions.length > 0 && allOptions.every((t) => selectedTurmas.includes(t));

  const toggleSelectAll = () => {
    if (isAllSelected) {
      onChange([]);
    } else {
      onChange([...allOptions]);
    }
  };

  const getDisplayText = () => {
    if (selectedTurmas.length === 0) return placeholder;
    if (isAllSelected) return `Todas as turmas (${allOptions.length})`;
    if (selectedTurmas.length === 1) return `Turma ${selectedTurmas[0]}`;
    return `Turmas: ${selectedTurmas.join(', ')}`;
  };

  return (
    <div className="relative w-full" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-surface border border-border rounded-2xl px-3.5 py-3 text-xs text-foreground flex items-center justify-between gap-2 focus:outline-none focus:border-primary transition-colors cursor-pointer text-left"
      >
        <span className={`truncate font-medium ${selectedTurmas.length === 0 ? 'text-[#869486]' : 'text-foreground'}`}>
          {getDisplayText()}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-[#869486] shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1.5 bg-surface border border-white/15 rounded-2xl shadow-2xl p-2.5 space-y-1.5 max-h-60 overflow-y-auto backdrop-blur-xl">
          {/* Select All Option */}
          <button
            type="button"
            onClick={toggleSelectAll}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-amber-600 hover:bg-surface-hover transition-colors cursor-pointer border-b border-border pb-2 mb-1"
          >
            <div
              className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                isAllSelected
                  ? 'bg-amber-400 border-amber-400 text-black'
                  : 'border-border bg-surface'
              }`}
            >
              {isAllSelected && <Check className="w-3 h-3 stroke-[3]" />}
            </div>
            <span>Selecionar Todas ({allOptions.length})</span>
          </button>

          {/* Individual Options */}
          {allOptions.map((turma) => {
            const isChecked = selectedTurmas.includes(turma);
            return (
              <label
                key={turma}
                onClick={() => toggleTurma(turma)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer select-none ${
                  isChecked
                    ? 'bg-primary/15 text-foreground font-semibold'
                    : 'text-foreground hover:bg-surface-hover'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0 ${
                    isChecked
                      ? 'bg-primary border-primary text-white'
                      : 'border-border bg-surface'
                  }`}
                >
                  {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
                <Users className="w-3.5 h-3.5 text-[#869486] shrink-0" />
                <span>Turma {turma}</span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TurmaMultiSelect;
