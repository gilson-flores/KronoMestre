'use client';

import React, { useState } from 'react';
import { X, Save, Pencil, AlertTriangle } from 'lucide-react';
import { StudentUser } from '@/lib/types';
import {
  normalizeStudentName,
  validateStudentName,
  isValidTurmaCode,
} from '@/lib/studentUtils';

interface EditStudentModalProps {
  isOpen: boolean;
  student: StudentUser | null;
  onClose: () => void;
  onSaveStudent: (updatedStudent: StudentUser) => void;
}

export const EditStudentModal: React.FC<EditStudentModalProps> = ({
  isOpen,
  student,
  onClose,
  onSaveStudent,
}) => {
  const [prevStudentId, setPrevStudentId] = useState(student?.id);
  const [fullName, setFullName] = useState(student?.fullName || '');
  const [turma, setTurma] = useState(student?.turma || '301');
  const [matricula, setMatricula] = useState(student?.matricula || '');
  const [tag, setTag] = useState<'REGULAR' | 'PNE' | 'RAD'>(student?.tag || 'REGULAR');
  const [formError, setFormError] = useState('');

  if (student && student.id !== prevStudentId) {
    setPrevStudentId(student.id);
    setFullName(student.fullName);
    setTurma(student.turma);
    setMatricula(student.matricula);
    setTag(student.tag || 'REGULAR');
    setFormError('');
  }

  if (!isOpen || !student) return null;

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const normalized = normalizeStudentName(raw);
    setFullName(normalized);
    if (formError) setFormError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const nameVal = validateStudentName(fullName);
    if (!nameVal.isValid) {
      setFormError(nameVal.errorMessage || 'Nome do aluno inválido.');
      return;
    }

    if (!turma.trim() || !isValidTurmaCode(turma.trim())) {
      setFormError('Código de turma inválido. Deve ter 3 dígitos (ex: 301) ou 4 dígitos (ex: 3001).');
      return;
    }

    onSaveStudent({
      ...student,
      fullName: nameVal.normalized, // GUARANTEED UPPERCASE AND NO SPECIAL CHARACTERS
      turma: turma.trim(),
      matricula,
      tag,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg glass-panel rounded-3xl border border-white/10 p-6 sm:p-8 space-y-6 shadow-2xl relative animate-fadeIn">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-[#bccabb] hover:text-white rounded-full hover:bg-white/5 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="p-3 bg-[#4ade80]/10 text-[#4ade80] rounded-2xl border border-[#4ade80]/20">
            <Pencil className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Editar Dados do Aluno</h2>
            <p className="text-xs text-[#bccabb]">Altere turma, tag ou informações cadastrais</p>
          </div>
        </div>

        {formError && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-2xl text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#bccabb] mb-1">
              Nome Completo (MAIÚSCULAS SEM ACENTOS)
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={handleNameChange}
              className="w-full bg-[#131b2e] border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#4ade80] uppercase tracking-wide font-medium"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#bccabb] mb-1">Turma (ex: 301, 1001)</label>
              <input
                type="text"
                required
                value={turma}
                onChange={(e) => setTurma(e.target.value)}
                placeholder="Ex: 301, 302, 1001"
                className="w-full bg-[#131b2e] border border-white/10 rounded-2xl px-4 py-3 text-xs text-white focus:outline-none focus:border-[#4ade80]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#bccabb] mb-1">Matrícula</label>
              <input
                type="text"
                required
                value={matricula}
                onChange={(e) => setMatricula(e.target.value)}
                className="w-full bg-[#131b2e] border border-white/10 rounded-2xl px-4 py-3 text-xs text-white focus:outline-none focus:border-[#4ade80]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#bccabb] mb-1">Tag Especial</label>
            <select
              value={tag}
              onChange={(e) => setTag(e.target.value as any)}
              className="w-full bg-[#131b2e] border border-white/10 rounded-2xl px-4 py-3 text-xs text-white focus:outline-none focus:border-[#4ade80]"
            >
              <option value="REGULAR" className="bg-[#0b1326]">REGULAR</option>
              <option value="PNE" className="bg-[#0b1326]">PNE (Necessidades Especiais)</option>
              <option value="RAD" className="bg-[#0b1326]">RAD (Rendimento em Acompanhamento)</option>
            </select>
          </div>

          <button
            type="submit"
            className="w-full py-3.5 bg-[#4ade80] hover:bg-[#6bfb9a] text-[#003919] font-bold rounded-full transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#4ade80]/20 cursor-pointer mt-4 text-sm"
          >
            <Save className="w-5 h-5" />
            <span>Salvar Alterações</span>
          </button>
        </form>
      </div>
    </div>
  );
};
