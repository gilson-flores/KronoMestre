'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, X, Search, Sparkles } from 'lucide-react';
import { PNE_CONDITIONS_LIST } from '@/lib/types';

interface PneConditionsSelectProps {
  selectedConditions: string[];
  onChange: (conditions: string[]) => void;
  label?: string;
  placeholder?: string;
}

export const PneConditionsSelect: React.FC<PneConditionsSelectProps> = ({
  selectedConditions = [],
  onChange,
  label = 'Doenças, Deficiências ou Necessidades Específicas',
  placeholder = 'Selecione a(s) condição(ões) / deficiência(s)...',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Guarantee strict Brazilian Portuguese alphabetical order
  const sortedConditions = React.useMemo(() => {
    return [...PNE_CONDITIONS_LIST].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, []);

  const filteredConditions = sortedConditions.filter((c) =>
    c.toLowerCase().includes(searchQuery.toLowerCase().trim())
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

  const toggleCondition = (condition: string) => {
    if (selectedConditions.includes(condition)) {
      onChange(selectedConditions.filter((c) => c !== condition));
    } else {
      onChange([...selectedConditions, condition]);
    }
  };

  const removeCondition = (condition: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selectedConditions.filter((c) => c !== condition));
  };

  const handleClearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
  };

  const getSummaryText = () => {
    if (selectedConditions.length === 0) return placeholder;
    if (selectedConditions.length === 1) return selectedConditions[0];
    return `${selectedConditions.length} condições selecionadas (${selectedConditions.slice(0, 2).join(', ')}${
      selectedConditions.length > 2 ? '...' : ''
    })`;
  };

  return (
    <div className="space-y-2" ref={dropdownRef}>
      {label && (
        <div className="flex items-center justify-between">
          <label className="block text-xs font-semibold text-[#bccabb]">
            {label}
          </label>
          {selectedConditions.length > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              className="text-[11px] text-amber-400 hover:text-amber-300 transition-colors cursor-pointer"
            >
              Limpar seleção ({selectedConditions.length})
            </button>
          )}
        </div>
      )}

      {/* Dropdown Trigger Button */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full bg-[#131b2e] border rounded-2xl px-4 py-3 text-xs text-white flex items-center justify-between gap-2 focus:outline-none transition-all cursor-pointer text-left min-h-[46px] ${
            isOpen ? 'border-amber-400 ring-1 ring-amber-400/30' : 'border-white/10 hover:border-white/20'
          }`}
        >
          <span
            className={`truncate font-medium ${
              selectedConditions.length === 0 ? 'text-[#869486]' : 'text-white'
            }`}
          >
            {getSummaryText()}
          </span>
          <div className="flex items-center gap-1.5 shrink-0">
            {selectedConditions.length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                {selectedConditions.length}
              </span>
            )}
            <ChevronDown
              className={`w-4 h-4 text-[#869486] transition-transform duration-200 ${
                isOpen ? 'rotate-180 text-amber-400' : ''
              }`}
            />
          </div>
        </button>

        {/* Suspended Dropdown List */}
        {isOpen && (
          <div className="absolute z-50 left-0 right-0 mt-1.5 bg-[#0e172a] border border-white/15 rounded-2xl shadow-2xl p-2.5 space-y-2 backdrop-blur-xl animate-fadeIn max-h-72 flex flex-col">
            {/* Search filter input */}
            <div className="relative shrink-0">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#869486]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar doença ou deficiência..."
                className="w-full bg-[#131b2e] border border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-[#869486] focus:outline-none focus:border-amber-400"
                autoFocus
              />
            </div>

            {/* List with Checkboxes (em ordem alfabética) */}
            <div className="space-y-1 overflow-y-auto pr-1 flex-1 custom-scrollbar">
              {filteredConditions.length === 0 ? (
                <div className="p-3 text-center text-xs text-[#869486]">
                  Nenhuma condição encontrada com &quot;{searchQuery}&quot;.
                </div>
              ) : (
                filteredConditions.map((condition) => {
                  const isChecked = selectedConditions.includes(condition);
                  return (
                    <button
                      key={condition}
                      type="button"
                      onClick={() => toggleCondition(condition)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs text-left transition-all cursor-pointer ${
                        isChecked
                          ? 'bg-amber-500/15 text-amber-200 border border-amber-500/30 font-semibold'
                          : 'text-[#dae2fd] hover:bg-white/5 hover:text-white border border-transparent'
                      }`}
                    >
                      {/* Caixa de seleção (Checkbox) */}
                      <div
                        className={`w-4 h-4 rounded-md border flex items-center justify-center transition-colors shrink-0 ${
                          isChecked
                            ? 'bg-amber-400 border-amber-400 text-[#003919]'
                            : 'border-white/30 bg-[#131b2e]'
                        }`}
                      >
                        {isChecked && <Check className="w-3 h-3 stroke-[3] text-black" />}
                      </div>
                      <span className="truncate flex-1">{condition}</span>
                    </button>
                  );
                })
              )}
            </div>

            {/* Footer Summary */}
            <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-[#bccabb] px-1 shrink-0">
              <span className="flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>{selectedConditions.length} selecionada(s)</span>
              </span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-amber-400 font-bold hover:text-amber-300 cursor-pointer"
              >
                Concluir
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Selected Tags Display */}
      {selectedConditions.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {selectedConditions.map((c) => (
            <span
              key={c}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30 animate-fadeIn"
            >
              <span>{c}</span>
              <button
                type="button"
                onClick={(e) => removeCondition(c, e)}
                className="p-0.5 hover:bg-amber-500/30 rounded-full transition-colors cursor-pointer"
                title={`Remover ${c}`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default PneConditionsSelect;
