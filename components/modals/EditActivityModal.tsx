'use client';

import React, { useState } from 'react';
import { X, Save, Pencil, Plus, Trash2, HelpCircle, FileText, Users, CheckCircle2 } from 'lucide-react';
import { Activity, ActivityQuestion } from '@/lib/types';
import { DEFAULT_TURMAS, getTurmaLabel } from '@/lib/studentUtils';

interface EditActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  activity: Activity | null;
  onSaveActivity: (updatedActivity: Activity) => void;
}

export const EditActivityModal: React.FC<EditActivityModalProps> = ({
  isOpen,
  onClose,
  activity,
  onSaveActivity,
}) => {
  const [prevActivityId, setPrevActivityId] = useState<string | null>(activity?.id || null);
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('Sociologia');
  const [description, setDescription] = useState('');
  const [supportMaterial, setSupportMaterial] = useState('');
  const [turma, setTurma] = useState('301');
  const [type, setType] = useState<'Simulado' | 'Redação' | 'Dinâmica' | 'Avaliação'>('Avaliação');
  const [status, setStatus] = useState<'Ativo' | 'Prazo Encerrado' | 'Inativo'>('Ativo');
  const [deadline, setDeadline] = useState('');
  const [maxGrade, setMaxGrade] = useState<number>(10);
  const [allowGroupWork, setAllowGroupWork] = useState<boolean>(false);
  const [questions, setQuestions] = useState<ActivityQuestion[]>([]);

  if (activity && activity.id !== prevActivityId) {
    setPrevActivityId(activity.id);
    setTitle(activity.title || '');
    setSubject(activity.subject || 'Sociologia');
    setDescription(activity.description || '');
    setSupportMaterial(activity.supportMaterial || '');
    setTurma(activity.turma || '301');
    setType(activity.type || 'Avaliação');
    setStatus(activity.status || 'Ativo');
    setDeadline(activity.deadline || '');
    setMaxGrade(activity.maxGrade ?? 10);
    setAllowGroupWork(!!activity.allowGroupWork);
    setQuestions(activity.questions ? JSON.parse(JSON.stringify(activity.questions)) : []);
  }

  if (!isOpen || !activity) return null;

  const handleAddMultipleChoice = () => {
    const newQuestion: ActivityQuestion = {
      type: 'multiple_choice',
      id: `q-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      statement: '',
      options: ['', '', '', ''],
      correctOptionIndex: 0,
    };
    setQuestions((prev) => [...prev, newQuestion]);
  };

  const handleAddEssay = () => {
    const newQuestion: ActivityQuestion = {
      type: 'essay',
      id: `q-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      statement: '',
      minCharacters: 300,
    };
    setQuestions((prev) => [...prev, newQuestion]);
  };

  const handleRemoveQuestion = (id: string) => {
    setQuestions((prev) => prev.filter((q) => q.id !== id));
  };

  const handleUpdateMCQuestion = (id: string, field: 'statement' | 'correctOptionIndex', value: any) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id === id && q.type === 'multiple_choice') {
          return { ...q, [field]: value };
        }
        return q;
      })
    );
  };

  const handleUpdateMCOption = (questionId: string, optionIndex: number, text: string) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id === questionId && q.type === 'multiple_choice') {
          const newOpts = [...q.options] as [string, string, string, string];
          newOpts[optionIndex] = text;
          return { ...q, options: newOpts };
        }
        return q;
      })
    );
  };

  const handleUpdateEssayQuestion = (id: string, field: 'statement' | 'minCharacters' | 'keywords', value: any) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id === id && q.type === 'essay') {
          return { ...q, [field]: value };
        }
        return q;
      })
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const updatedActivity: Activity = {
      ...activity,
      title: title.trim(),
      subject: subject.trim(),
      description: description.trim(),
      supportMaterial: supportMaterial.trim(),
      turma: turma.trim(),
      type,
      status,
      deadline: deadline.trim() || 'Amanhã, 23:59',
      maxGrade,
      allowGroupWork,
      questions,
    };

    onSaveActivity(updatedActivity);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#0b1326] border border-white/10 w-full max-w-3xl rounded-3xl p-6 md:p-8 space-y-6 my-8 text-[#dae2fd] shadow-2xl relative">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#4ade80]/20 border border-[#4ade80]/30 text-[#4ade80] flex items-center justify-center">
              <Pencil className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Editar Atividade</h2>
              <p className="text-xs text-[#bccabb]">Altere as configurações, enunciados e prazos da atividade.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-[#bccabb] hover:text-white hover:bg-white/5 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Title & Subject */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-[#bccabb] mb-1">
                Título da Atividade *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Simulado de Sociologia - Modos de Produção"
                className="w-full bg-[#131b2e] border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#4ade80]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#bccabb] mb-1">
                Disciplina
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Ex: Sociologia"
                className="w-full bg-[#131b2e] border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#4ade80]"
              />
            </div>
          </div>

          {/* Type, Turma, Status, Max Grade */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#bccabb] mb-1">Tipo</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                className="w-full bg-[#131b2e] border border-white/10 rounded-2xl px-3 py-3 text-xs text-white focus:outline-none focus:border-[#4ade80]"
              >
                <option value="Avaliação" className="bg-[#0b1326]">Avaliação</option>
                <option value="Simulado" className="bg-[#0b1326]">Simulado</option>
                <option value="Redação" className="bg-[#0b1326]">Redação</option>
                <option value="Dinâmica" className="bg-[#0b1326]">Dinâmica</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#bccabb] mb-1">Turma</label>
              <input
                type="text"
                value={turma}
                onChange={(e) => setTurma(e.target.value)}
                placeholder="Ex: 301 ou 3ºs Anos"
                className="w-full bg-[#131b2e] border border-white/10 rounded-2xl px-3 py-3 text-xs text-white focus:outline-none focus:border-[#4ade80]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#bccabb] mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full bg-[#131b2e] border border-white/10 rounded-2xl px-3 py-3 text-xs text-white focus:outline-none focus:border-[#4ade80]"
              >
                <option value="Ativo" className="bg-[#0b1326]">Ativo</option>
                <option value="Prazo Encerrado" className="bg-[#0b1326]">Prazo Encerrado</option>
                <option value="Inativo" className="bg-[#0b1326]">Inativo</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#bccabb] mb-1">Nota Máxima</label>
              <input
                type="number"
                step="0.5"
                min="1"
                max="100"
                value={maxGrade}
                onChange={(e) => setMaxGrade(parseFloat(e.target.value) || 10)}
                className="w-full bg-[#131b2e] border border-white/10 rounded-2xl px-3 py-3 text-xs text-white focus:outline-none focus:border-[#4ade80]"
              />
            </div>
          </div>

          {/* Deadline */}
          <div>
            <label className="block text-xs font-semibold text-[#bccabb] mb-1">Prazo de Entrega (Texto Exibido)</label>
            <input
              type="text"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              placeholder="Ex: 15/08/2026 às 23:59"
              className="w-full bg-[#131b2e] border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#4ade80]"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-[#bccabb] mb-1">Instruções / Orientação</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva as orientações para os alunos..."
              className="w-full bg-[#131b2e] border border-white/10 rounded-2xl p-4 text-xs text-white focus:outline-none focus:border-[#4ade80] resize-none"
            />
          </div>

          {/* Questions Section */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-[#4ade80]" />
                <span>Questões da Atividade ({questions.length})</span>
              </h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAddMultipleChoice}
                  className="px-3 py-1.5 bg-[#171f33] hover:bg-[#222a3d] text-[#4ade80] rounded-xl text-xs font-bold border border-[#4ade80]/30 flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Múltipla Escolha</span>
                </button>
                <button
                  type="button"
                  onClick={handleAddEssay}
                  className="px-3 py-1.5 bg-[#171f33] hover:bg-[#222a3d] text-indigo-300 rounded-xl text-xs font-bold border border-indigo-500/30 flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Dissertativa</span>
                </button>
              </div>
            </div>

            {questions.map((q, qIndex) => (
              <div key={q.id} className="bg-[#131b2e] border border-white/10 p-4 rounded-2xl space-y-3 relative">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#4ade80]">
                    Questão {qIndex + 1} ({q.type === 'multiple_choice' ? 'Múltipla Escolha' : 'Dissertativa/Redação'})
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveQuestion(q.id)}
                    className="text-rose-400 hover:text-rose-300 p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {q.type === 'multiple_choice' ? (
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={q.statement}
                      onChange={(e) => handleUpdateMCQuestion(q.id, 'statement', e.target.value)}
                      placeholder="Enunciado da questão..."
                      className="w-full bg-[#0b1326] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#4ade80]"
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {q.options.map((opt, optIdx) => (
                        <div key={optIdx} className="flex items-center gap-2">
                          <input
                            type="radio"
                            name={`correct-${q.id}`}
                            checked={q.correctOptionIndex === optIdx}
                            onChange={() => handleUpdateMCQuestion(q.id, 'correctOptionIndex', optIdx)}
                            className="accent-[#4ade80]"
                          />
                          <input
                            type="text"
                            value={opt}
                            onChange={(e) => handleUpdateMCOption(q.id, optIdx, e.target.value)}
                            placeholder={`Opção ${String.fromCharCode(65 + optIdx)}`}
                            className="w-full bg-[#0b1326] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#4ade80]"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <textarea
                      rows={2}
                      value={q.statement}
                      onChange={(e) => handleUpdateEssayQuestion(q.id, 'statement', e.target.value)}
                      placeholder="Enunciado ou tema da proposta de redação..."
                      className="w-full bg-[#0b1326] border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-[#4ade80] resize-none"
                    />
                    <input
                      type="text"
                      value={q.keywords || ''}
                      onChange={(e) => handleUpdateEssayQuestion(q.id, 'keywords', e.target.value)}
                      placeholder="Palavras-chave de atenção (separadas por vírgula)..."
                      className="w-full bg-[#0b1326] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#4ade80]"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Submit Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-full text-xs font-bold text-[#bccabb] hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-[#4ade80] hover:bg-[#6bfb9a] text-[#003919] font-bold rounded-full text-xs transition-all shadow-lg flex items-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Salvar Alterações</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
