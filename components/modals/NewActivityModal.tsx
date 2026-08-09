'use client';

import React, { useState } from 'react';
import { X, Plus, BookOpen, Trash2, HelpCircle, FileText, Users, CheckCircle2 } from 'lucide-react';
import { Activity, ActivityQuestion } from '@/lib/types';

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
  const [subject, setSubject] = useState('Sociologia');
  const [description, setDescription] = useState('');
  const [supportMaterial, setSupportMaterial] = useState('');
  const [turmaOption, setTurmaOption] = useState<'branco' | '1' | '2' | '3' | 'custom'>('custom');
  const [customTurma, setCustomTurma] = useState('301');
  const [type, setType] = useState<'Simulado' | 'Redação' | 'Dinâmica' | 'Avaliação'>('Avaliação');
  
  // Default deadline: tomorrow at 23:59
  const getTomorrowString = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(23, 59, 0, 0);
    return tomorrow.toISOString().slice(0, 16);
  };

  const [deadlineDateTime, setDeadlineDateTime] = useState(getTomorrowString());
  const [maxGrade, setMaxGrade] = useState<number>(10);
  const [allowGroupWork, setAllowGroupWork] = useState<boolean>(false);
  
  // Anti-Cheat Security Locks
  const [securityFocusLock, setSecurityFocusLock] = useState<boolean>(true);
  const [securityBlockCopyStatement, setSecurityBlockCopyStatement] = useState<boolean>(true);
  const [securityBlockPasteEssay, setSecurityBlockPasteEssay] = useState<boolean>(true);
  
  // Array of questions added to the activity
  const [questions, setQuestions] = useState<ActivityQuestion[]>([]);

  if (!isOpen) return null;

  // Add a 4-option multiple choice question
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

  // Add an essay / research question
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

  const getResolvedTurma = (): string => {
    if (turmaOption === 'branco') return '';
    if (turmaOption === '1') return '1';
    if (turmaOption === '2') return '2';
    if (turmaOption === '3') return '3';
    return customTurma.trim();
  };

  const formatDeadlineDisplay = (dateTimeStr: string): string => {
    if (!dateTimeStr) return 'Amanhã, 23:59';
    try {
      const d = new Date(dateTimeStr);
      return `${d.toLocaleDateString('pt-BR')} às ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    } catch {
      return dateTimeStr;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const resolvedTurma = getResolvedTurma();
    const formattedDeadline = formatDeadlineDisplay(deadlineDateTime);

    const newActivity: Activity = {
      id: `act-${Date.now()}`,
      title: title.trim(),
      subject: subject.trim() || 'Sociologia',
      description: description.trim(),
      supportMaterial: supportMaterial.trim(),
      turma: resolvedTurma,
      type,
      status: 'Ativo',
      deadline: formattedDeadline,
      maxGrade,
      allowGroupWork,
      securityFocusLock,
      securityBlockCopyStatement,
      securityBlockPasteEssay,
      questions,
      totalSubmissions: 0,
      totalStudents: resolvedTurma ? 35 : 120,
      pendingCorrection: 0,
      submissions: [],
    };

    onCreateActivity(newActivity);
    
    // Reset state
    setTitle('');
    setDescription('');
    setSupportMaterial('');
    setQuestions([]);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="w-full max-w-2xl bg-[#0b1326] rounded-3xl border border-white/10 p-5 sm:p-8 space-y-6 shadow-2xl relative my-auto max-h-[90vh] overflow-y-auto custom-scrollbar animate-fadeIn">
        
        {/* Header */}
        <div className="flex items-start justify-between border-b border-white/10 pb-4 pr-10 relative">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-[#4ade80]/10 text-[#4ade80] rounded-2xl border border-[#4ade80]/20 shrink-0">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white leading-snug">Criar Atividade no Studio</h2>
              <p className="text-xs text-[#bccabb]">Cadastre avaliações, redações ou exercícios interativos</p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="p-2.5 text-[#bccabb] hover:text-white rounded-full hover:bg-white/5 transition-colors cursor-pointer absolute top-0 right-0 min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Fechar Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          
          {/* Título e Disciplina */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-[#bccabb] mb-1">
                Título da Atividade *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Simulado: Ação Social e Instituições"
                className="w-full bg-[#131b2e] border border-white/10 rounded-2xl px-4 py-3 text-sm text-white placeholder-[#869486] focus:outline-none focus:border-[#4ade80]"
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
                className="w-full bg-[#131b2e] border border-white/10 rounded-2xl px-4 py-3 text-xs text-white placeholder-[#869486] focus:outline-none focus:border-[#4ade80]"
              />
            </div>
          </div>

          {/* Turmas, Prazo e Tipo */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#bccabb] mb-1">
                Turmas
              </label>
              <select
                value={turmaOption}
                onChange={(e) => setTurmaOption(e.target.value as any)}
                className="w-full bg-[#131b2e] border border-white/10 rounded-2xl px-3 py-3 text-xs text-white focus:outline-none focus:border-[#4ade80]"
              >
                <option value="custom" className="bg-[#0b1326]">Turma Específica</option>
                <option value="1" className="bg-[#0b1326]">1</option>
                <option value="2" className="bg-[#0b1326]">2</option>
                <option value="3" className="bg-[#0b1326]">3</option>
                <option value="branco" className="bg-[#0b1326]">Em branco</option>
              </select>
              {turmaOption === 'custom' && (
                <input
                  type="text"
                  value={customTurma}
                  onChange={(e) => setCustomTurma(e.target.value)}
                  placeholder="Digite a turma (ex: 301, 302 ou 3001)"
                  className="w-full bg-[#131b2e] border border-white/10 rounded-xl px-3 py-2 text-xs text-white mt-2 focus:outline-none focus:border-[#4ade80]"
                />
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#bccabb] mb-1">
                Prazo Final (Data e Hora)
              </label>
              <input
                type="datetime-local"
                value={deadlineDateTime}
                onChange={(e) => setDeadlineDateTime(e.target.value)}
                className="w-full bg-[#131b2e] border border-white/10 rounded-2xl px-3 py-3 text-xs text-white focus:outline-none focus:border-[#4ade80]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#bccabb] mb-1">
                Tipo
              </label>
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
          </div>

          {/* Nota Máxima e Permitir Trabalho em Grupo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#131b2e]/60 p-4 rounded-2xl border border-white/5">
            <div>
              <label className="block text-xs font-semibold text-[#bccabb] mb-1">
                Nota Máxima Oficial (0 a 10)
              </label>
              <input
                type="number"
                min={0}
                max={10}
                step={0.5}
                value={maxGrade}
                onChange={(e) => setMaxGrade(Number(e.target.value))}
                className="w-full bg-[#131b2e] border border-white/10 rounded-2xl px-4 py-2.5 text-sm font-bold text-[#4ade80] focus:outline-none focus:border-[#4ade80]"
              />
            </div>

            <div className="flex flex-col justify-center">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allowGroupWork}
                  onChange={(e) => setAllowGroupWork(e.target.checked)}
                  className="w-5 h-5 rounded border-white/20 bg-[#131b2e] text-[#4ade80] focus:ring-[#4ade80] focus:ring-offset-0 cursor-pointer"
                />
                <div>
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-[#4ade80]" />
                    Permitir Atividade em Grupo?
                  </span>
                  <p className="text-[10px] text-[#bccabb]">
                    Quando ativo, os alunos podem escolher os membros da equipe no envio.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Travas de Segurança Anti-Cola */}
          <div className="bg-[#131b2e] p-4 rounded-2xl border border-amber-500/30 space-y-3">
            <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-2">
              <span>🛡️ Travas de Segurança Anti-Cola</span>
            </h4>
            <p className="text-[11px] text-[#bccabb]">
              Ative os mecanismos de integridade para avaliações e provas:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <label className="flex items-start gap-2.5 cursor-pointer bg-[#0b1326] p-3 rounded-xl border border-white/10 hover:border-amber-500/40 transition-colors">
                <input
                  type="checkbox"
                  checked={securityFocusLock}
                  onChange={(e) => setSecurityFocusLock(e.target.checked)}
                  className="w-4 h-4 rounded border-white/20 bg-[#131b2e] text-[#4ade80] focus:ring-[#4ade80] mt-0.5"
                />
                <div>
                  <span className="text-xs font-bold text-white block">Trava de Foco</span>
                  <span className="text-[10px] text-[#bccabb] block leading-tight mt-0.5">
                    Gera avisos ao sair da tela e auto-entrega no 4º aviso.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-2.5 cursor-pointer bg-[#0b1326] p-3 rounded-xl border border-white/10 hover:border-amber-500/40 transition-colors">
                <input
                  type="checkbox"
                  checked={securityBlockCopyStatement}
                  onChange={(e) => setSecurityBlockCopyStatement(e.target.checked)}
                  className="w-4 h-4 rounded border-white/20 bg-[#131b2e] text-[#4ade80] focus:ring-[#4ade80] mt-0.5"
                />
                <div>
                  <span className="text-xs font-bold text-white block">Bloquear Cópia</span>
                  <span className="text-[10px] text-[#bccabb] block leading-tight mt-0.5">
                    Impede copiar enunciados e textos com Ctrl+C e botão direito.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-2.5 cursor-pointer bg-[#0b1326] p-3 rounded-xl border border-white/10 hover:border-amber-500/40 transition-colors">
                <input
                  type="checkbox"
                  checked={securityBlockPasteEssay}
                  onChange={(e) => setSecurityBlockPasteEssay(e.target.checked)}
                  className="w-4 h-4 rounded border-white/20 bg-[#131b2e] text-[#4ade80] focus:ring-[#4ade80] mt-0.5"
                />
                <div>
                  <span className="text-xs font-bold text-white block">Bloquear Cola</span>
                  <span className="text-[10px] text-[#bccabb] block leading-tight mt-0.5">
                    Bloqueia colar texto (Ctrl+V) na resposta dissertativa.
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* Material de Apoio / Texto Base */}
          <div>
            <label className="block text-xs font-semibold text-[#bccabb] mb-1">
              Material de Apoio / Texto Base
            </label>
            <textarea
              rows={3}
              value={supportMaterial}
              onChange={(e) => setSupportMaterial(e.target.value)}
              placeholder="Insira aqui o texto base para leitura, citações, referências bibliográficas ou links de apoio para os alunos..."
              className="w-full bg-[#131b2e] border border-white/10 rounded-2xl p-3.5 text-xs text-white placeholder-[#869486] focus:outline-none focus:border-[#4ade80] resize-y"
            />
          </div>

          {/* Instruções Adicionais da Atividade */}
          <div>
            <label className="block text-xs font-semibold text-[#bccabb] mb-1">
              Instruções Gerais / Descrição
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Diretrizes de entrega, avisos de avaliação ou orientações de estudo..."
              className="w-full bg-[#131b2e] border border-white/10 rounded-2xl p-3 text-xs text-white placeholder-[#869486] focus:outline-none focus:border-[#4ade80] resize-y"
            />
          </div>

          {/* Seção de Questões */}
          <div className="space-y-4 pt-2 border-t border-white/10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-[#4ade80]" />
                  Questões da Atividade ({questions.length})
                </h3>
                <p className="text-[11px] text-[#bccabb]">Adicione questões objetivas e dissertativas</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAddMultipleChoice}
                  className="px-3 py-2 bg-[#4ade80]/10 hover:bg-[#4ade80]/20 text-[#4ade80] rounded-xl text-xs font-bold border border-[#4ade80]/30 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Add Múltipla Escolha</span>
                </button>

                <button
                  type="button"
                  onClick={handleAddEssay}
                  className="px-3 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 rounded-xl text-xs font-bold border border-blue-500/30 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>+ Add Redação / Dissertativa</span>
                </button>
              </div>
            </div>

            {/* Renderizar Lista de Questões */}
            <div className="space-y-4">
              {questions.map((q, qIndex) => {
                if (q.type === 'multiple_choice') {
                  return (
                    <div
                      key={q.id}
                      className="bg-[#131b2e] border border-white/10 rounded-2xl p-4 space-y-3 relative group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#4ade80] bg-[#4ade80]/10 px-2.5 py-1 rounded-full border border-[#4ade80]/20">
                          Questão {qIndex + 1} • Múltipla Escolha (4 Respostas)
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveQuestion(q.id)}
                          className="text-rose-400 hover:text-rose-300 p-1 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                          title="Remover Questão"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div>
                        <label className="block text-[11px] text-[#bccabb] font-semibold mb-1">
                          Enunciado da Questão
                        </label>
                        <textarea
                          rows={2}
                          value={q.statement}
                          onChange={(e) => handleUpdateMCQuestion(q.id, 'statement', e.target.value)}
                          placeholder="Digite o enunciado da questão..."
                          className="w-full bg-[#0b1326] border border-white/10 rounded-xl p-3 text-xs text-white placeholder-[#869486] focus:outline-none focus:border-[#4ade80]"
                        />
                      </div>

                      <div className="space-y-2 pt-1">
                        <label className="block text-[11px] text-[#bccabb] font-semibold">
                          Opções de Resposta (Marque a opção correta):
                        </label>
                        {['A', 'B', 'C', 'D'].map((letter, optIdx) => (
                          <div key={optIdx} className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleUpdateMCQuestion(q.id, 'correctOptionIndex', optIdx)}
                              className={`w-7 h-7 rounded-lg font-bold text-xs flex items-center justify-center transition-all cursor-pointer ${
                                q.correctOptionIndex === optIdx
                                  ? 'bg-[#4ade80] text-[#003919] ring-2 ring-[#4ade80]/50'
                                  : 'bg-[#0b1326] text-[#bccabb] border border-white/10 hover:border-white/30'
                              }`}
                              title={`Marcar opção ${letter} como correta`}
                            >
                              {letter}
                            </button>
                            <input
                              type="text"
                              value={q.options[optIdx] || ''}
                              onChange={(e) => handleUpdateMCOption(q.id, optIdx, e.target.value)}
                              placeholder={`Opção ${letter}...`}
                              className="flex-1 bg-[#0b1326] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-[#869486] focus:outline-none focus:border-[#4ade80]"
                            />
                            {q.correctOptionIndex === optIdx && (
                              <CheckCircle2 className="w-4 h-4 text-[#4ade80] shrink-0" />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }

                // Essay Question
                return (
                  <div
                    key={q.id}
                    className="bg-[#131b2e] border border-blue-500/20 rounded-2xl p-4 space-y-3 relative"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-blue-300 bg-blue-500/10 px-2.5 py-1 rounded-full border border-blue-500/20">
                        Questão {qIndex + 1} • Redação / Pesquisa Dissertativa
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveQuestion(q.id)}
                        className="text-rose-400 hover:text-rose-300 p-1 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                        title="Remover Questão"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div>
                      <label className="block text-[11px] text-[#bccabb] font-semibold mb-1">
                        Enunciado ou Tema da Redação/Pesquisa
                      </label>
                      <textarea
                        rows={2}
                        value={q.statement}
                        onChange={(e) => handleUpdateEssayQuestion(q.id, 'statement', e.target.value)}
                        placeholder="Ex: Elabore uma dissertação sobre a Teoria do Fato Social de Émile Durkheim..."
                        className="w-full bg-[#0b1326] border border-white/10 rounded-xl p-3 text-xs text-white placeholder-[#869486] focus:outline-none focus:border-blue-400"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] text-[#bccabb] font-semibold mb-1">
                          Mínimo de Caracteres Exigido
                        </label>
                        <input
                          type="number"
                          min={50}
                          step={50}
                          value={q.minCharacters}
                          onChange={(e) => handleUpdateEssayQuestion(q.id, 'minCharacters', Number(e.target.value))}
                          className="w-full bg-[#0b1326] border border-white/10 rounded-xl px-3 py-2 text-xs text-blue-300 font-bold focus:outline-none focus:border-blue-400"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] text-[#bccabb] font-semibold mb-1">
                          Palavras-Chave de Atenção (I.A. e Aluno)
                        </label>
                        <input
                          type="text"
                          value={q.keywords || ''}
                          onChange={(e) => handleUpdateEssayQuestion(q.id, 'keywords', e.target.value)}
                          placeholder="Ex: Fato social, Coerção, Durkheim, Anomia"
                          className="w-full bg-[#0b1326] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-[#869486] focus:outline-none focus:border-blue-400"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full py-3.5 bg-[#4ade80] hover:bg-[#6bfb9a] text-[#003919] font-bold rounded-full transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#4ade80]/20 cursor-pointer text-sm mt-6"
          >
            <Plus className="w-5 h-5 stroke-[2.5]" />
            <span>Publicar Atividade no Studio</span>
          </button>
        </form>
      </div>
    </div>
  );
};
