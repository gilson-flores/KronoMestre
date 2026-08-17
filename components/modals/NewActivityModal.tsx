'use client';

import React, { useState } from 'react';
import {
  X,
  Plus,
  BookOpen,
  Trash2,
  HelpCircle,
  FileText,
  Users,
  CheckCircle2,
  Link2,
  Sparkles,
  Gamepad2,
  Cpu,
  Loader2,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { Activity, ActivityQuestion, StudentUser } from '@/lib/types';
import { DEFAULT_TURMAS, doesTurmaHavePNEStudent } from '@/lib/studentUtils';
import { TurmaMultiSelect } from '@/components/TurmaMultiSelect';
import {
  createAdaptedMildModerateActivity,
  createAdaptedSeverePlayfulActivity,
} from '@/lib/adaptationUtils';

interface NewActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateActivity: (newAct: Activity) => void;
  students?: StudentUser[];
}

const getTomorrowString = () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(23, 59, 0, 0);
  return tomorrow.toISOString().slice(0, 16);
};

const generateActivityId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `act-${crypto.randomUUID()}`;
  }
  return `act-${new Date().getTime()}`;
};

export const NewActivityModal: React.FC<NewActivityModalProps> = ({
  isOpen,
  onClose,
  onCreateActivity,
  students = [],
}) => {
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('Sociologia');
  const [description, setDescription] = useState('');
  const [supportMaterial, setSupportMaterial] = useState('');
  const [supportLinkInput, setSupportLinkInput] = useState('');
  const [selectedTurmas, setSelectedTurmas] = useState<string[]>([DEFAULT_TURMAS[0] || '101']);
  const [type, setType] = useState<'Simulado' | 'Redação' | 'Dinâmica' | 'Avaliação' | 'Trabalho em grupo' | 'Projeto de pesquisa'>('Avaliação');
  
  const [deadlineDateTime, setDeadlineDateTime] = useState(() => getTomorrowString());
  const [maxGrade, setMaxGrade] = useState<number>(10);
  const [allowGroupWork, setAllowGroupWork] = useState<boolean>(false);
  
  // Anti-Cheat Security Locks
  const [securityFocusLock, setSecurityFocusLock] = useState<boolean>(true);
  const [securityBlockCopyStatement, setSecurityBlockCopyStatement] = useState<boolean>(true);
  const [securityBlockPasteEssay, setSecurityBlockPasteEssay] = useState<boolean>(true);
  
  // Array of questions added to the activity
  const [questions, setQuestions] = useState<ActivityQuestion[]>([]);

  // State for Decision Step upon Saving
  const [pendingActivityForDecision, setPendingActivityForDecision] = useState<Activity | null>(null);
  const [isGeneratingPlayful, setIsGeneratingPlayful] = useState(false);

  // Add a 4-option multiple choice question
  const handleAddMultipleChoice = () => {
    const newQuestion: ActivityQuestion = {
      type: 'multiple_choice',
      id: `q-mc-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
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
      id: `q-es-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
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

    let finalSupport = supportMaterial.trim();
    if (supportLinkInput.trim()) {
      let url = supportLinkInput.trim();
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = `https://${url}`;
      }
      const linkString = `🔗 Link de Apoio: ${url}`;
      finalSupport = finalSupport ? `${finalSupport}\n\n${linkString}` : linkString;
    }

    const resolvedTurma = selectedTurmas.length > 0 ? selectedTurmas.join(', ') : '101';
    const formattedDeadline = formatDeadlineDisplay(deadlineDateTime);

    const activityId = generateActivityId();

    const newActivity: Activity = {
      id: activityId,
      title: title.trim(),
      subject: subject.trim() || 'Sociologia',
      description: description.trim(),
      supportMaterial: finalSupport,
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

    // Only open adaptation decision if selected turma has at least one PNE student
    const hasPneStudents = doesTurmaHavePNEStudent(resolvedTurma, students);
    if (hasPneStudents) {
      setPendingActivityForDecision(newActivity);
    } else {
      onCreateActivity(newActivity);
      resetFormAndClose();
    }
  };

  const resetFormAndClose = () => {
    setTitle('');
    setDescription('');
    setSupportMaterial('');
    setQuestions([]);
    setPendingActivityForDecision(null);
    onClose();
  };

  const handleConfirmOnlyStandard = () => {
    if (!pendingActivityForDecision) return;
    onCreateActivity(pendingActivityForDecision);
    resetFormAndClose();
  };

  const handleConfirmMildModerate = async () => {
    if (!pendingActivityForDecision) return;
    setIsGeneratingPlayful(true);
    try {
      onCreateActivity(pendingActivityForDecision);

      const response = await fetch('/api/gemini/adapt-mild-moderate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: pendingActivityForDecision.title,
          subject: pendingActivityForDecision.subject,
          description: pendingActivityForDecision.description,
          turma: pendingActivityForDecision.turma,
          questions: pendingActivityForDecision.questions || [],
          maxGrade: pendingActivityForDecision.maxGrade || 10,
        }),
      });

      const data = await response.json();
      if (response.ok && data.questions) {
        const adapted = createAdaptedMildModerateActivity(pendingActivityForDecision, {
          adaptedTitle: data.adaptedTitle,
          adaptedDescription: data.adaptedDescription,
          questions: data.questions,
        });
        onCreateActivity(adapted);
      }
      resetFormAndClose();
    } catch (err: any) {
      alert(`Aviso: A atividade padrão foi salva. Você pode gerar a adaptação a qualquer momento clicando em "Adaptar (PNE)".`);
      resetFormAndClose();
    } finally {
      setIsGeneratingPlayful(false);
    }
  };

  const handleConfirmSeverePlayful = async () => {
    if (!pendingActivityForDecision) return;
    setIsGeneratingPlayful(true);
    try {
      onCreateActivity(pendingActivityForDecision);

      const response = await fetch('/api/gemini/adapt-playful', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: pendingActivityForDecision.title,
          subject: pendingActivityForDecision.subject,
          description: pendingActivityForDecision.description,
          turma: pendingActivityForDecision.turma,
          questions: pendingActivityForDecision.questions || [],
          maxGrade: pendingActivityForDecision.maxGrade || 10,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.html) {
        throw new Error(data.error || 'Erro ao gerar o jogo lúdico');
      }

      const playfulAct = createAdaptedSeverePlayfulActivity(pendingActivityForDecision, data.html);
      onCreateActivity(playfulAct);
      resetFormAndClose();
    } catch (err: any) {
      alert(`Aviso: A atividade padrão foi salva. Houve uma falha ao gerar o jogo lúdico (${err.message}). Você pode gerá-lo a qualquer momento clicando em "Adaptar (PNE)" no card.`);
      resetFormAndClose();
    } finally {
      setIsGeneratingPlayful(false);
    }
  };

  const handleConfirmAllAdaptations = async () => {
    if (!pendingActivityForDecision) return;
    setIsGeneratingPlayful(true);
    try {
      // 1. Standard
      onCreateActivity(pendingActivityForDecision);

      // 2. Mild / Moderate via Gemini
      try {
        const mildRes = await fetch('/api/gemini/adapt-mild-moderate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: pendingActivityForDecision.title,
            subject: pendingActivityForDecision.subject,
            description: pendingActivityForDecision.description,
            turma: pendingActivityForDecision.turma,
            questions: pendingActivityForDecision.questions || [],
            maxGrade: pendingActivityForDecision.maxGrade || 10,
          }),
        });
        const mildData = await mildRes.json();
        if (mildRes.ok && mildData.questions) {
          const mildAct = createAdaptedMildModerateActivity(pendingActivityForDecision, {
            adaptedTitle: mildData.adaptedTitle,
            adaptedDescription: mildData.adaptedDescription,
            questions: mildData.questions,
          });
          onCreateActivity(mildAct);
        }
      } catch (e) {
        console.warn('Erro ao gerar adaptação leve:', e);
      }

      // 3. Playful Game via Gemini
      const response = await fetch('/api/gemini/adapt-playful', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: pendingActivityForDecision.title,
          subject: pendingActivityForDecision.subject,
          description: pendingActivityForDecision.description,
          turma: pendingActivityForDecision.turma,
          questions: pendingActivityForDecision.questions || [],
          maxGrade: pendingActivityForDecision.maxGrade || 10,
        }),
      });

      const data = await response.json();
      if (response.ok && data.html) {
        const playfulAct = createAdaptedSeverePlayfulActivity(pendingActivityForDecision, data.html);
        onCreateActivity(playfulAct);
      }
      resetFormAndClose();
    } catch (err: any) {
      resetFormAndClose();
    } finally {
      setIsGeneratingPlayful(false);
    }
  };

  if (!isOpen) return null;

  if (pendingActivityForDecision) {
    return (
      <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-fadeIn">
        <div className="w-full max-w-2xl bg-[#0e172a] rounded-3xl border border-white/15 p-6 sm:p-8 space-y-6 shadow-2xl relative my-auto">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-500/20 text-amber-400 rounded-2xl border border-amber-500/30">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Atividade Pronta! Deseja Adaptar para PNE?</h3>
                <p className="text-xs text-[#bccabb]">
                  Escolha as modalidades inclusivas para gerar automaticamente junto com a atividade padrão.
                </p>
              </div>
            </div>
            <button
              onClick={() => setPendingActivityForDecision(null)}
              className="p-2 text-[#bccabb] hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-4 bg-[#131b2e] rounded-2xl border border-white/10 space-y-1">
            <span className="text-[10px] font-bold text-[#869486] uppercase tracking-wider block">
              Atividade Criada
            </span>
            <h4 className="text-sm font-bold text-white">{pendingActivityForDecision.title}</h4>
            <p className="text-xs text-[#bccabb]">
              Turma: <strong className="text-white">{pendingActivityForDecision.turma}</strong> • {questions.length} Questões cadastradas
            </p>
          </div>

          <div className="space-y-3">
            {/* Option 1: Standard Only */}
            <button
              type="button"
              onClick={handleConfirmOnlyStandard}
              disabled={isGeneratingPlayful}
              className="w-full p-4 rounded-2xl bg-[#131b2e] hover:bg-[#1a243c] border border-white/10 hover:border-white/20 text-left transition-all flex items-center justify-between group cursor-pointer"
            >
              <div>
                <span className="text-xs font-bold text-white block group-hover:text-[#4ade80] transition-colors">
                  1. Publicar Somente a Versão Padrão
                </span>
                <span className="text-[11px] text-[#bccabb]">
                  Salva apenas a atividade regular para toda a turma.
                </span>
              </div>
              <ArrowRight className="w-4 h-4 text-[#869486] group-hover:text-white group-hover:translate-x-1 transition-all" />
            </button>

            {/* Option 2: Standard + Mild/Moderate */}
            <button
              type="button"
              onClick={handleConfirmMildModerate}
              disabled={isGeneratingPlayful}
              className="w-full p-4 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-500/30 hover:border-emerald-500/50 text-left transition-all flex items-center justify-between group cursor-pointer"
            >
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                  <Cpu className="w-4 h-4 text-emerald-400" />
                  2. Publicar Padrão + Versão PNE Leve/Moderada (Função no Código)
                </span>
                <span className="text-[11px] text-[#bccabb] block">
                  Reduz 50% das questões, 2 alternativas por objetiva, dissertativas simplificadas e sem caracteres mínimos.
                </span>
              </div>
              <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 text-[10px] font-bold rounded-lg border border-emerald-500/30 shrink-0">
                Instantâneo
              </span>
            </button>

            {/* Option 3: Standard + Severe Playful Game */}
            <button
              type="button"
              onClick={handleConfirmSeverePlayful}
              disabled={isGeneratingPlayful}
              className="w-full p-4 rounded-2xl bg-amber-500/10 hover:bg-amber-500/15 border border-amber-500/30 hover:border-amber-500/50 text-left transition-all flex items-center justify-between group cursor-pointer"
            >
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                  <Gamepad2 className="w-4 h-4 text-amber-400" />
                  3. Publicar Padrão + Jogo Lúdico para Síndromes Severas (IA Gemini)
                </span>
                <span className="text-[11px] text-[#bccabb] block">
                  Gera um jogo interativo gamificado em HTML com perguntas ilustradas, sons e contagem de estrelas/pontuação.
                </span>
              </div>
              {isGeneratingPlayful ? (
                <Loader2 className="w-5 h-5 text-amber-400 animate-spin shrink-0" />
              ) : (
                <span className="px-2.5 py-1 bg-amber-500/20 text-amber-300 text-[10px] font-bold rounded-lg border border-amber-500/30 shrink-0">
                  Gemini IA
                </span>
              )}
            </button>

            {/* Option 4: All 3 */}
            <button
              type="button"
              onClick={handleConfirmAllAdaptations}
              disabled={isGeneratingPlayful}
              className="w-full p-4 rounded-2xl bg-[#4ade80]/10 hover:bg-[#4ade80]/15 border border-[#4ade80]/30 hover:border-[#4ade80]/50 text-left transition-all flex items-center justify-between group cursor-pointer"
            >
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-[#4ade80] flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-[#4ade80]" />
                  4. Publicar Todas (Padrão + Leve/Mod + Jogo Lúdico Severo)
                </span>
                <span className="text-[11px] text-[#bccabb] block">
                  Gera o pacote inclusivo completo para atender a todos os níveis de alunos da turma.
                </span>
              </div>
              <span className="px-3 py-1 bg-[#4ade80]/20 text-[#4ade80] text-[10px] font-bold rounded-lg border border-[#4ade80]/40 shrink-0">
                Pacote Completo
              </span>
            </button>
          </div>

          {isGeneratingPlayful && (
            <div className="p-4 bg-[#131b2e] rounded-2xl border border-amber-500/30 flex items-center gap-3 text-xs text-amber-300">
              <Loader2 className="w-5 h-5 animate-spin text-amber-400 shrink-0" />
              <span>O Gemini está gerando o jogo lúdico interativo em HTML... Por favor, aguarde alguns segundos.</span>
            </div>
          )}
        </div>
      </div>
    );
  }

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
                Turmas *
              </label>
              <TurmaMultiSelect
                selectedTurmas={selectedTurmas}
                onChange={setSelectedTurmas}
              />
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
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-[#bccabb] mb-1">
              Material de Apoio / Texto Base
            </label>
            <textarea
              rows={3}
              value={supportMaterial}
              onChange={(e) => setSupportMaterial(e.target.value)}
              placeholder="Insira aqui o texto base para leitura, citações, referências bibliográficas..."
              className="w-full bg-[#131b2e] border border-white/10 rounded-2xl p-3.5 text-xs text-white placeholder-[#869486] focus:outline-none focus:border-[#4ade80] resize-y"
            />

            {/* Injetor / Adicionador de Links */}
            <div className="bg-[#0b1326] p-3 rounded-2xl border border-white/10 space-y-2">
              <label className="block text-[11px] font-bold text-sky-300 flex items-center gap-1.5">
                <Link2 className="w-3.5 h-3.5 text-sky-400" />
                <span>Adicionar Link ao Material de Apoio (Google Drive, YouTube, Artigo, PDF)</span>
              </label>
              <div className="flex gap-2">
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
                  className="px-3.5 py-2 bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 font-bold rounded-xl text-xs border border-sky-400/40 transition-all flex items-center gap-1.5 cursor-pointer shrink-0 active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Adicionar Link</span>
                </button>
              </div>
            </div>
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

export default NewActivityModal;
