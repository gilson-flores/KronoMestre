'use client';

import React, { useState } from 'react';
import { X, Save, Pencil, Plus, Trash2, HelpCircle, FileText, Users, CheckCircle2, Link2, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { Activity, ActivityQuestion, StudentUser } from '@/lib/types';
import { DEFAULT_TURMAS, getTurmaLabel, canStudentAccessActivity, isStudentPNE } from '@/lib/studentUtils';
import { TurmaMultiSelect } from '@/components/TurmaMultiSelect';

interface EditActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  activity: Activity | null;
  onSaveActivity: (updatedActivity: Activity) => void;
  students?: StudentUser[];
}

export const EditActivityModal: React.FC<EditActivityModalProps> = ({
  isOpen,
  onClose,
  activity,
  onSaveActivity,
  students = [],
}) => {
  const [prevActivityId, setPrevActivityId] = useState<string | null>(activity?.id || null);
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('Sociologia');
  const [description, setDescription] = useState('');
  const [supportMaterial, setSupportMaterial] = useState('');
  const [supportLinkInput, setSupportLinkInput] = useState('');
  const [selectedTurmas, setSelectedTurmas] = useState<string[]>(['101']);
  const [type, setType] = useState<'Simulado' | 'Redação' | 'Dinâmica' | 'Avaliação' | 'Trabalho em grupo' | 'Projeto de pesquisa'>('Avaliação');
  const [status, setStatus] = useState<'Ativo' | 'Prazo Encerrado' | 'Inativo'>('Ativo');
  const [deadline, setDeadline] = useState('');
  const [maxGrade, setMaxGrade] = useState<number>(10);
  const [allowGroupWork, setAllowGroupWork] = useState<boolean>(false);
  const [securityFocusLock, setSecurityFocusLock] = useState<boolean>(false);
  const [securityBlockCopyStatement, setSecurityBlockCopyStatement] = useState<boolean>(false);
  const [securityBlockPasteEssay, setSecurityBlockPasteEssay] = useState<boolean>(false);
  const [includedPneStudentIds, setIncludedPneStudentIds] = useState<string[]>([]);
  const [isPneDropdownOpen, setIsPneDropdownOpen] = useState<boolean>(true);
  const [questions, setQuestions] = useState<ActivityQuestion[]>([]);

  if (activity && activity.id !== prevActivityId) {
    setPrevActivityId(activity.id);
    setTitle(activity.title || '');
    setSubject(activity.subject || 'Sociologia');
    setDescription(activity.description || '');
    setSupportMaterial(activity.supportMaterial || '');
    const parsedTurmas = activity.turma
      ? activity.turma.split(/[,;]+/).map((t) => t.trim()).filter(Boolean)
      : ['101'];
    setSelectedTurmas(parsedTurmas.length > 0 ? parsedTurmas : ['101']);
    setType(activity.type || 'Avaliação');
    setStatus(activity.status || 'Ativo');
    setDeadline(activity.deadline || '');
    setMaxGrade(activity.maxGrade ?? 10);
    setAllowGroupWork(!!activity.allowGroupWork);
    setSecurityFocusLock(!!activity.securityFocusLock);
    setSecurityBlockCopyStatement(!!activity.securityBlockCopyStatement);
    setSecurityBlockPasteEssay(!!activity.securityBlockPasteEssay);
    setIncludedPneStudentIds(activity.includedPneStudentIds || []);
    setQuestions(activity.questions ? JSON.parse(JSON.stringify(activity.questions)) : []);
  }

  // Filter PNE students enrolled in the currently selected turmas
  const pneStudentsInSelectedTurmas = React.useMemo(() => {
    if (!students || students.length === 0 || selectedTurmas.length === 0) return [];
    return students.filter((st) => {
      if (!isStudentPNE(st)) return false;
      return selectedTurmas.some((t) => canStudentAccessActivity(t, st.turma));
    });
  }, [students, selectedTurmas]);

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

    let finalSupport = supportMaterial.trim();
    if (supportLinkInput.trim()) {
      let url = supportLinkInput.trim();
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = `https://${url}`;
      }
      const linkString = `🔗 Link de Apoio: ${url}`;
      finalSupport = finalSupport ? `${finalSupport}\n\n${linkString}` : linkString;
    }

    // Auto update status if deadline is set/changed
    let finalStatus = status;
    const dateStr = deadline.trim();
    if (dateStr) {
      let isoDate: string | null = null;
      const isoMatch = dateStr.match(/\b(20\d\d)-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])\b/);
      if (isoMatch) isoDate = isoMatch[0];
      const brMatch = dateStr.match(/\b(0[1-9]|[12]\d|3[01])\/(0[1-9]|1[0-2])\/(20\d\d)\b/);
      if (brMatch) {
        const [, day, month, year] = brMatch;
        isoDate = `${year}-${month}-${day}`;
      }
      const brShortMatch = dateStr.match(/\b(0[1-9]|[12]\d|3[01])\/(0[1-9]|1[0-2])\b/);
      if (brShortMatch) {
        const [, day, month] = brShortMatch;
        isoDate = `2026-${month}-${day}`;
      }

      if (isoDate) {
        const todayISO = new Date().toISOString().split('T')[0];
        if (isoDate >= todayISO) {
          finalStatus = 'Ativo';
        } else {
          finalStatus = 'Prazo Encerrado';
        }
      }
    }

    const updatedActivity: Activity = {
      ...activity,
      title: title.trim(),
      subject: subject.trim(),
      description: description.trim(),
      supportMaterial: finalSupport,
      turma: selectedTurmas.length > 0 ? selectedTurmas.join(', ') : '101',
      type,
      status: finalStatus,
      deadline: deadline.trim() || 'Amanhã, 23:59',
      maxGrade,
      allowGroupWork,
      securityFocusLock,
      securityBlockCopyStatement,
      securityBlockPasteEssay,
      includedPneStudentIds,
      questions,
    };

    onSaveActivity(updatedActivity);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto">
      <div className="bg-[#0b1326] border border-white/10 w-full max-w-3xl rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 space-y-5 my-2 sm:my-8 text-[#dae2fd] shadow-2xl relative max-h-[96vh] overflow-y-auto custom-scrollbar">
        {/* Header */}
        <div className="flex items-start sm:items-center justify-between pb-4 border-b border-white/10 gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#4ade80]/20 border border-[#4ade80]/30 text-[#4ade80] flex items-center justify-center shrink-0">
              <Pencil className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white leading-tight">Editar Atividade</h2>
              <p className="text-xs text-[#bccabb]">Altere as configurações, enunciados e prazos da atividade.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-[#bccabb] hover:text-white hover:bg-white/5 rounded-full transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Title & Subject */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#bccabb] mb-1">Tipo</label>
              <select
                value={type}
                onChange={(e) => {
                  const selectedType = e.target.value as any;
                  setType(selectedType);
                  if (selectedType === 'Trabalho em grupo') {
                    setAllowGroupWork(true);
                  }
                }}
                className="w-full bg-[#131b2e] border border-white/10 rounded-2xl px-3 py-3 text-xs text-white focus:outline-none focus:border-[#4ade80]"
              >
                <option value="Avaliação" className="bg-[#0b1326]">Avaliação</option>
                <option value="Simulado" className="bg-[#0b1326]">Simulado</option>
                <option value="Redação" className="bg-[#0b1326]">Redação</option>
                <option value="Dinâmica" className="bg-[#0b1326]">Dinâmica</option>
                <option value="Trabalho em grupo" className="bg-[#0b1326]">Trabalho em grupo</option>
                <option value="Projeto de pesquisa" className="bg-[#0b1326]">Projeto de pesquisa</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#bccabb] mb-1">Turmas *</label>
              <TurmaMultiSelect
                selectedTurmas={selectedTurmas}
                onChange={setSelectedTurmas}
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

          {/* Janela / Lista Suspensa com Caixas de Seleção para Alunos PNE com Proficiência */}
          {pneStudentsInSelectedTurmas.length > 0 && (
            <div className="bg-[#131b2e] border border-amber-500/30 rounded-2xl p-3 sm:p-4 space-y-3 shadow-inner">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                      Alunos PNE com Proficiência (Atividade Normal)
                    </span>
                    <span className="text-[10px] font-bold bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30">
                      {pneStudentsInSelectedTurmas.length} PNE na(s) turma(s)
                    </span>
                  </div>
                  <p className="text-[11px] text-[#bccabb] mt-0.5 leading-relaxed">
                    Selecione os alunos PNE que já atingiram proficiência para realizarem a <strong>atividade normal</strong> (evita retrocesso por desmotivação).
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsPneDropdownOpen((prev) => !prev)}
                  className="flex items-center justify-between sm:justify-center gap-2 px-3.5 py-2 bg-[#1a243c] hover:bg-[#223050] text-xs font-semibold text-white rounded-xl border border-white/10 transition-colors cursor-pointer shrink-0"
                >
                  <span className="truncate">
                    {includedPneStudentIds.length === 0
                      ? 'Nenhum incluído na normal'
                      : `${includedPneStudentIds.length} selecionado(s) para normal`}
                  </span>
                  {isPneDropdownOpen ? (
                    <ChevronUp className="w-4 h-4 text-amber-400 shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-amber-400 shrink-0" />
                  )}
                </button>
              </div>

              {isPneDropdownOpen && (
                <div className="pt-3 border-t border-white/10 space-y-3 animate-fadeIn">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="text-[#bccabb] text-[11px]">
                      Marque para liberar a atividade normal:
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIncludedPneStudentIds(pneStudentsInSelectedTurmas.map((s) => s.id))}
                        className="text-[11px] text-[#4ade80] hover:underline cursor-pointer font-medium"
                      >
                        Marcar todos
                      </button>
                      <span className="text-white/20">•</span>
                      <button
                        type="button"
                        onClick={() => setIncludedPneStudentIds([])}
                        className="text-[11px] text-rose-400 hover:underline cursor-pointer font-medium"
                      >
                        Desmarcar todos
                      </button>
                    </div>
                  </div>

                  <div className="max-h-48 overflow-y-auto custom-scrollbar space-y-1.5 pr-1">
                    {pneStudentsInSelectedTurmas.map((st) => {
                      const isSelected = includedPneStudentIds.includes(st.id);
                      const conditionText =
                        st.pneConditions && st.pneConditions.length > 0
                          ? st.pneConditions.join(', ')
                          : 'PNE';

                      return (
                        <label
                          key={st.id}
                          className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-amber-500/10 border-amber-500/40 text-white'
                              : 'bg-[#0e172a] border-white/5 text-[#bccabb] hover:border-white/15'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setIncludedPneStudentIds((prev) => [...prev, st.id]);
                                } else {
                                  setIncludedPneStudentIds((prev) => prev.filter((id) => id !== st.id));
                                }
                              }}
                              className="w-4 h-4 rounded border-white/20 text-amber-500 focus:ring-amber-400 focus:ring-offset-0 bg-[#131b2e] cursor-pointer shrink-0"
                            />
                            <div className="truncate min-w-0">
                              <span className="text-xs font-semibold text-white block truncate">
                                {st.fullName}
                              </span>
                              <span className="text-[10px] text-[#869486] block truncate">
                                Turma: <strong className="text-[#bccabb]">{st.turma}</strong> • {conditionText}
                              </span>
                            </div>
                          </div>

                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0 ml-2 ${
                              isSelected
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'bg-white/5 text-[#869486]'
                            }`}
                          >
                            {isSelected ? 'Atividade Normal' : 'Ativ. Adaptada'}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Group Work Option */}
          <div className="bg-[#131b2e]/60 p-3.5 sm:p-4 rounded-2xl border border-white/5">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={allowGroupWork}
                onChange={(e) => setAllowGroupWork(e.target.checked)}
                className="w-5 h-5 rounded border-white/20 bg-[#131b2e] text-[#4ade80] focus:ring-[#4ade80] focus:ring-offset-0 cursor-pointer shrink-0"
              />
              <div>
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-[#4ade80]" />
                  Permitir Atividade em Grupo?
                </span>
                <p className="text-[10px] text-[#bccabb] leading-relaxed">
                  Quando ativo, os alunos podem escolher os membros da equipe no envio.
                </p>
              </div>
            </label>
          </div>

          {/* Travas de Segurança Anti-Cola */}
          <div className="bg-[#131b2e] p-3.5 sm:p-4 rounded-2xl border border-amber-500/30 space-y-3">
            <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-2">
              <span>🛡️ Travas de Segurança Anti-Cola</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 pt-1">
              <label className="flex items-start gap-2.5 cursor-pointer bg-[#0b1326] p-3 rounded-xl border border-white/10 hover:border-amber-500/40 transition-colors">
                <input
                  type="checkbox"
                  checked={securityFocusLock}
                  onChange={(e) => setSecurityFocusLock(e.target.checked)}
                  className="w-4 h-4 rounded border-white/20 bg-[#131b2e] text-[#4ade80] focus:ring-[#4ade80] mt-0.5 shrink-0 cursor-pointer"
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
                  className="w-4 h-4 rounded border-white/20 bg-[#131b2e] text-[#4ade80] focus:ring-[#4ade80] mt-0.5 shrink-0 cursor-pointer"
                />
                <div>
                  <span className="text-xs font-bold text-white block">Bloquear Cópia</span>
                  <span className="text-[10px] text-[#bccabb] block leading-tight mt-0.5">
                    Impede copiar enunciados com Ctrl+C e botão direito.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-2.5 cursor-pointer bg-[#0b1326] p-3 rounded-xl border border-white/10 hover:border-amber-500/40 transition-colors">
                <input
                  type="checkbox"
                  checked={securityBlockPasteEssay}
                  onChange={(e) => setSecurityBlockPasteEssay(e.target.checked)}
                  className="w-4 h-4 rounded border-white/20 bg-[#131b2e] text-[#4ade80] focus:ring-[#4ade80] mt-0.5 shrink-0 cursor-pointer"
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

          {/* Material de Apoio / Texto Base & Links */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-[#bccabb] mb-1">
              Material de Apoio / Texto Base
            </label>
            <textarea
              rows={3}
              value={supportMaterial}
              onChange={(e) => setSupportMaterial(e.target.value)}
              placeholder="Insira aqui o texto base para leitura, citações, referências bibliográficas..."
              className="w-full bg-[#131b2e] border border-white/10 rounded-2xl p-3.5 text-xs text-white focus:outline-none focus:border-[#4ade80] resize-y leading-relaxed"
            />

            {/* Injetor / Adicionador de Links */}
            <div className="bg-[#0b1326] p-3 rounded-2xl border border-white/10 space-y-2">
              <label className="block text-[11px] font-bold text-sky-300 flex items-center gap-1.5">
                <Link2 className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <span>Adicionar Link ao Material de Apoio (Google Drive, YouTube, Artigo, PDF)</span>
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="url"
                  value={supportLinkInput}
                  onChange={(e) => setSupportLinkInput(e.target.value)}
                  placeholder="https://drive.google.com/file/... ou https://youtube.com/..."
                  className="flex-1 bg-[#131b2e] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-[#869486] focus:outline-none focus:border-sky-400 font-mono"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!supportLinkInput.trim()) return;
                    let url = supportLinkInput.trim();
                    if (!url.startsWith('http://') && !url.startsWith('https://')) {
                      url = `https://${url}`;
                    }
                    const linkString = `🔗 Link de Apoio: ${url}`;
                    setSupportMaterial((prev) => (prev ? `${prev}\n\n${linkString}` : linkString));
                    setSupportLinkInput('');
                  }}
                  className="px-3.5 py-2 bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 font-bold rounded-xl text-xs border border-sky-400/40 transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0 active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Adicionar Link</span>
                </button>
              </div>
            </div>
          </div>

          {/* Questions Section */}
          <div className="space-y-4 pt-2 border-t border-white/10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-[#4ade80] shrink-0" />
                <span>Questões da Atividade ({questions.length})</span>
              </h3>
              <div className="flex flex-wrap items-center gap-2">
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
              <div key={q.id} className="bg-[#131b2e] border border-white/10 p-3.5 sm:p-4 rounded-2xl space-y-3 relative">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-[#4ade80]">
                    Questão {qIndex + 1} ({q.type === 'multiple_choice' ? 'Múltipla Escolha' : 'Dissertativa/Redação'})
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveQuestion(q.id)}
                    className="text-rose-400 hover:text-rose-300 p-1.5 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                    title="Remover Questão"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {q.type === 'multiple_choice' ? (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-[#bccabb] mb-1">
                        Enunciado da Questão
                      </label>
                      <textarea
                        rows={3}
                        value={q.statement}
                        onChange={(e) => handleUpdateMCQuestion(q.id, 'statement', e.target.value)}
                        placeholder="Digite o enunciado completo da questão..."
                        className="w-full bg-[#0b1326] border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-[#4ade80] resize-y leading-relaxed"
                      />
                    </div>

                    <div className="space-y-2 pt-1">
                      <label className="block text-[11px] font-semibold text-[#bccabb]">
                        Alternativas (Selecione a alternativa correta):
                      </label>
                      <div className="grid grid-cols-1 gap-2.5">
                        {q.options.map((opt, optIdx) => {
                          const isCorrect = q.correctOptionIndex === optIdx;
                          const letter = String.fromCharCode(65 + optIdx);
                          return (
                            <div
                              key={optIdx}
                              className={`flex items-start gap-2.5 p-2.5 sm:p-3 rounded-xl border transition-all ${
                                isCorrect
                                  ? 'bg-[#4ade80]/10 border-[#4ade80]/40 text-white'
                                  : 'bg-[#0b1326] border-white/10 text-[#bccabb]'
                              }`}
                            >
                              <div className="pt-2 shrink-0">
                                <input
                                  type="radio"
                                  name={`correct-${q.id}`}
                                  checked={isCorrect}
                                  onChange={() => handleUpdateMCQuestion(q.id, 'correctOptionIndex', optIdx)}
                                  className="accent-[#4ade80] w-4 h-4 cursor-pointer"
                                  title={`Marcar opção ${letter} como correta`}
                                />
                              </div>
                              <div className="flex-1 min-w-0 space-y-1">
                                <div className="flex items-center justify-between">
                                  <span className={`text-[10px] font-bold ${isCorrect ? 'text-[#4ade80]' : 'text-[#869486]'}`}>
                                    Opção {letter} {isCorrect && '• (Correta)'}
                                  </span>
                                </div>
                                <textarea
                                  rows={2}
                                  value={opt}
                                  onChange={(e) => handleUpdateMCOption(q.id, optIdx, e.target.value)}
                                  placeholder={`Texto da opção ${letter}...`}
                                  className="w-full bg-[#131b2e] border border-white/10 rounded-lg p-2 sm:p-2.5 text-xs text-white focus:outline-none focus:border-[#4ade80] resize-y leading-relaxed"
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-[#bccabb] mb-1">
                        Enunciado ou Proposta de Redação
                      </label>
                      <textarea
                        rows={3}
                        value={q.statement}
                        onChange={(e) => handleUpdateEssayQuestion(q.id, 'statement', e.target.value)}
                        placeholder="Enunciado ou tema da proposta de redação..."
                        className="w-full bg-[#0b1326] border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-[#4ade80] resize-y leading-relaxed"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#bccabb] mb-1">
                        Palavras-chave de Atenção
                      </label>
                      <textarea
                        rows={2}
                        value={q.keywords || ''}
                        onChange={(e) => handleUpdateEssayQuestion(q.id, 'keywords', e.target.value)}
                        placeholder="Palavras-chave de atenção (separadas por vírgula)..."
                        className="w-full bg-[#0b1326] border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-[#4ade80] resize-y leading-relaxed"
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Submit Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10 sticky bottom-0 bg-[#0b1326]/95 py-2 -mx-4 px-4 sm:-mx-6 sm:px-6 md:-mx-8 md:px-8">
            <button
              type="button"
              onClick={onClose}
              className="px-4 sm:px-5 py-2.5 rounded-full text-xs font-bold text-[#bccabb] hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 sm:px-6 py-2.5 bg-[#4ade80] hover:bg-[#6bfb9a] text-[#003919] font-bold rounded-full text-xs transition-all shadow-lg flex items-center gap-2 cursor-pointer active:scale-95"
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

export default EditActivityModal;
