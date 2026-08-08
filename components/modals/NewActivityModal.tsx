'use client';

import React, { useState } from 'react';
import { X, Plus, BookOpen } from 'lucide-react';
import { Activity } from '@/lib/types';

interface NewActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateActivity: (newAct: Activity) => void;
}

export const NewActivityModal: React.FC<NewActivityModalProps> = ({
  isOpen,
  onClose,
  onCreateActivity,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [turma, setTurma] = useState('3º Ano B');
  const [type, setType] = useState<'Simulado' | 'Redação' | 'Dinâmica' | 'Avaliação'>('Simulado');
  const [deadline, setDeadline] = useState('Amanhã, 23:59');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const newActivity: Activity = {
      id: `act-${Date.now()}`,
      title,
      description,
      turma,
      type,
      status: 'Ativo',
      deadline,
      totalSubmissions: 0,
      totalStudents: 35,
      pendingCorrection: 0,
      submissions: [],
    };

    onCreateActivity(newActivity);
    setTitle('');
    setDescription('');
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
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Criar Nova Atividade</h2>
            <p className="text-xs text-[#bccabb]">Cadastre avaliações ou trabalhos para as turmas</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#bccabb] mb-1">
              Título da Atividade
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Simulado: Max Weber e a Ação Social"
              className="w-full bg-[#131b2e] border border-white/10 rounded-2xl px-4 py-3 text-sm text-white placeholder-[#869486] focus:outline-none focus:border-[#4ade80]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#bccabb] mb-1">Descrição</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Instruções e temas abordados na atividade..."
              className="w-full bg-[#131b2e] border border-white/10 rounded-2xl p-4 text-xs text-white placeholder-[#869486] focus:outline-none focus:border-[#4ade80] resize-none"
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
              <label className="block text-xs font-semibold text-[#bccabb] mb-1">Tipo</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                className="w-full bg-[#131b2e] border border-white/10 rounded-2xl px-4 py-3 text-xs text-white focus:outline-none focus:border-[#4ade80]"
              >
                <option value="Simulado" className="bg-[#0b1326]">Simulado</option>
                <option value="Redação" className="bg-[#0b1326]">Redação</option>
                <option value="Dinâmica" className="bg-[#0b1326]">Dinâmica</option>
                <option value="Avaliação" className="bg-[#0b1326]">Avaliação</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#bccabb] mb-1">Prazo de Entrega</label>
            <input
              type="text"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              placeholder="Ex: Hoje, 23:59 ou 10/08 às 18:00"
              className="w-full bg-[#131b2e] border border-white/10 rounded-2xl px-4 py-3 text-xs text-white placeholder-[#869486] focus:outline-none focus:border-[#4ade80]"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3.5 bg-[#4ade80] hover:bg-[#6bfb9a] text-[#003919] font-bold rounded-full transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#4ade80]/20 cursor-pointer mt-4 text-sm"
          >
            <Plus className="w-5 h-5 stroke-[2.5]" />
            <span>Publicar Atividade</span>
          </button>
        </form>
      </div>
    </div>
  );
};
