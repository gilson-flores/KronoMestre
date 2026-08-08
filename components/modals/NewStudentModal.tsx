'use client';

import React, { useState } from 'react';
import { X, UserPlus, CheckCircle2 } from 'lucide-react';
import { StudentUser } from '@/lib/types';

interface NewStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateStudent: (newStudent: StudentUser) => void;
}

export const NewStudentModal: React.FC<NewStudentModalProps> = ({
  isOpen,
  onClose,
  onCreateStudent,
}) => {
  const [fullName, setFullName] = useState('');
  const [turma, setTurma] = useState('3º Ano B');
  const [matricula, setMatricula] = useState(`2023${Math.floor(100 + Math.random() * 900)}`);
  const [tag, setTag] = useState<'REGULAR' | 'PNE' | 'RAD'>('REGULAR');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) return;

    const newStudent: StudentUser = {
      id: `s-${Date.now()}`,
      fullName: fullName.trim(),
      turma,
      matricula,
      tag,
      passwordHash: '1234', // default password rule
      avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200',
    };

    onCreateStudent(newStudent);
    setFullName('');
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
            <UserPlus className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Cadastrar Novo Aluno</h2>
            <p className="text-xs text-[#bccabb]">O aluno acessará com Nome Completo, Turma e a senha 1234</p>
          </div>
        </div>

        {/* Note Box */}
        <div className="flex items-center gap-2 text-xs text-[#4ade80] bg-[#4ade80]/10 p-3 rounded-2xl border border-[#4ade80]/20">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>A senha padrão gerada para todos os cadastrados é <strong>1234</strong>.</span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#bccabb] mb-1">
              Nome Completo do Aluno
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Ex: Carlos Eduardo Silveira"
              className="w-full bg-[#131b2e] border border-white/10 rounded-2xl px-4 py-3 text-sm text-white placeholder-[#869486] focus:outline-none focus:border-[#4ade80]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#bccabb] mb-1">Turma</label>
              <select
                value={turma}
                onChange={(e) => setTurma(e.target.value)}
                className="w-full bg-[#131b2e] border border-white/10 rounded-2xl px-4 py-3 text-xs text-white focus:outline-none focus:border-[#4ade80]"
              >
                <option value="3º Ano B" className="bg-[#0b1326]">3º Ano B</option>
                <option value="Turma 302" className="bg-[#0b1326]">Turma 302</option>
                <option value="2º Ano A" className="bg-[#0b1326]">2º Ano A</option>
                <option value="1º Ano C" className="bg-[#0b1326]">1º Ano C</option>
              </select>
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
            <label className="block text-xs font-semibold text-[#bccabb] mb-1">Categoria / Tag</label>
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
            <UserPlus className="w-5 h-5" />
            <span>Cadastrar Aluno</span>
          </button>
        </form>
      </div>
    </div>
  );
};
