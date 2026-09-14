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
  ChevronDown,
  ChevronUp,
  RotateCcw,
  KeyRound,
  Lock,
  AlertTriangle,
  AlertCircle,
} from 'lucide-react';
import { Activity, ActivityQuestion, ActivityType, StudentUser } from '@/lib/types';
import { doesTurmaHavePNEStudent, canStudentAccessActivity, isStudentPNE, getOriginalTurmas } from '@/lib/studentUtils';
import { TurmaMultiSelect } from '@/components/TurmaMultiSelect';
import {
  createAdaptedMildModerateActivity,
  createAdaptedSeverePlayfulActivity,
} from '@/lib/adaptationUtils';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

interface NewActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateActivity: (newAct: Activity) => void;
  students?: StudentUser[];
  activities?: Activity[];
  userEmail?: string;
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
  activities = [],
  userEmail,
}) => {
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('Sociologia');
  const [description, setDescription] = useState('');
  const [supportMaterial, setSupportMaterial] = useState('');
  const [supportLinkInput, setSupportLinkInput] = useState('');
  
  // Available turmas strictly from active students
  const availableTurmas = React.useMemo(() => {
    return getOriginalTurmas(students);
  }, [students]);

  const [userSelectedTurmas, setUserSelectedTurmas] = useState<string[] | null>(null);

  // Derived selected turmas that adapt to active students
  const selectedTurmas = React.useMemo(() => {
    if (userSelectedTurmas !== null) {
      return userSelectedTurmas;
    }
    return availableTurmas.length > 0 ? [availableTurmas[0]] : [];
  }, [userSelectedTurmas, availableTurmas]);

  const setSelectedTurmas = React.useCallback((turmas: string[]) => {
    setUserSelectedTurmas(turmas);
  }, []);

  const [type, setType] = useState<ActivityType>('Avaliação');
  const [recoveryFromId, setRecoveryFromId] = useState<string>('');
  
  // Unlinked Parallel Recovery Exception State
  const [isUnlinkedRecoveryPopupOpen, setIsUnlinkedRecoveryPopupOpen] = useState(false);
  const [manualParentName, setManualParentName] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [pendingRecoveryActivity, setPendingRecoveryActivity] = useState<Activity | null>(null);

  const [deadlineDateTime, setDeadlineDateTime] = useState(() => getTomorrowString());
  const [maxGrade, setMaxGrade] = useState<number>(10);
  const [allowGroupWork, setAllowGroupWork] = useState<boolean>(false);
  
  // Available non-recovery parent evaluations for subordination
  const availableParentActivities = React.useMemo(() => {
    return (activities || []).filter(
      (a) => !a.isRecovery && !a.recoveryFromId && a.type !== 'Recuperação Paralela' && !a.isAdapted
    );
  }, [activities]);

  // PNE Proficiency Override: Selected PNE students to receive the normal/regular activity
  const [includedPneStudentIds, setIncludedPneStudentIds] = useState<string[]>([]);
  const [isPneDropdownOpen, setIsPneDropdownOpen] = useState<boolean>(true);

  // Filter PNE students enrolled in the currently selected turmas
  const pneStudentsInSelectedTurmas = React.useMemo(() => {
    if (!students || students.length === 0 || selectedTurmas.length === 0) return [];
    return students.filter((st) => {
      if (!isStudentPNE(st)) return false;
      return selectedTurmas.some((t) => canStudentAccessActivity(t, st.turma));
    });
  }, [students, selectedTurmas]);
  
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

    const resolvedTurma = selectedTurmas.length > 0 ? selectedTurmas.join(', ') : 'Geral';
    const formattedDeadline = formatDeadlineDisplay(deadlineDateTime);

    const activityId = generateActivityId();

    const isParallelRecovery = type === 'Recuperação Paralela';

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
      allowGroupWork: isParallelRecovery ? false : allowGroupWork,
      securityFocusLock,
      securityBlockCopyStatement,
      securityBlockPasteEssay,
      isRecovery: isParallelRecovery || Boolean(recoveryFromId),
      recoveryFromId: isParallelRecovery && recoveryFromId ? recoveryFromId : undefined,
      recoveryApproach: isParallelRecovery ? 'Estudos de caso e aplicações práticas do cotidiano' : undefined,
      includedPneStudentIds,
      questions,
      totalSubmissions: 0,
      totalStudents: resolvedTurma ? 35 : 120,
      pendingCorrection: 0,
      submissions: [],
    };

    // Parallel recovery handling
    if (isParallelRecovery) {
      // Se NÃO apontou uma atividade mãe vinculada, abre o popup de exceção (senha + nome manual da atividade)
      if (!recoveryFromId) {
        setPendingRecoveryActivity(newActivity);
        setManualParentName('');
        setUserPassword('');
        setAuthError(null);
        setIsUnlinkedRecoveryPopupOpen(true);
        return;
      }

      // Se apontou uma atividade mãe, grava normalmente
      onCreateActivity(newActivity);
      resetFormAndClose();
      return;
    }

    // Only open adaptation decision if selected turma has at least one PNE student
    const hasPneStudents = doesTurmaHavePNEStudent(resolvedTurma, students);
    if (hasPneStudents) {
      setPendingActivityForDecision(newActivity);
    } else {
      onCreateActivity(newActivity);
      resetFormAndClose();
    }
  };

  const handleConfirmUnlinkedRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualParentName.trim()) {
      setAuthError('Por favor, informe o nome da atividade mãe manualmente.');
      return;
    }
    if (!userPassword) {
      setAuthError('Por favor, digite sua senha de usuário para autorizar a gravação.');
      return;
    }

    setIsAuthorizing(true);
    setAuthError(null);

    try {
      let emailToValidate = userEmail;
      if (!emailToValidate && typeof window !== 'undefined') {
        try {
          const sess = sessionStorage.getItem('active_session');
          if (sess) {
            const parsed = JSON.parse(sess);
            emailToValidate = parsed?.teacherData?.email;
          }
        } catch {}
      }

      // Validar senha contra Supabase Auth se configurado
      if (isSupabaseConfigured && supabase && emailToValidate) {
        const { error: authErr } = await supabase.auth.signInWithPassword({
          email: emailToValidate.trim().toLowerCase(),
          password: userPassword,
        });
        if (authErr) {
          throw new Error('Senha de usuário incorreta. Verifique sua senha e tente novamente.');
        }
      }

      if (!pendingRecoveryActivity) return;

      const cleanManualName = manualParentName.trim();
      const finalActivity: Activity = {
        ...pendingRecoveryActivity,
        isRecovery: true,
        recoveryFromId: undefined,
        recoveryManualParentName: cleanManualName,
        description:
          pendingRecoveryActivity.description ||
          `Recuperação Paralela da avaliação "${cleanManualName}" (Atividade em papel / Externa).`,
      };

      onCreateActivity(finalActivity);
      setIsUnlinkedRecoveryPopupOpen(false);
      setPendingRecoveryActivity(null);
      resetFormAndClose();
    } catch (err: any) {
      setAuthError(err?.message || 'Erro ao validar credenciais. Tente novamente.');
    } finally {
      setIsAuthorizing(false);
    }
  };

  const resetFormAndClose = () => {
    setTitle('');
    setDescription('');
    setSupportMaterial('');
    setType('Avaliação');
    setRecoveryFromId('');
    setQuestions([]);
    setIncludedPneStudentIds([]);
    setIsPneDropdownOpen(false);
    setPendingActivityForDecision(null);
    setIsUnlinkedRecoveryPopupOpen(false);
    setManualParentName('');
    setUserPassword('');
    setAuthError(null);
    setPendingRecoveryActivity(null);
    onClose();
  };

  const handleConfirmOnlyStandard = () => {
    if (!pendingActivityForDecision) return;
    onCreateActivity({
      ...pendingActivityForDecision,
      includedPneStudentIds,
    });
    resetFormAndClose();
  };

  const handleConfirmMildModerate = async () => {
    if (!pendingActivityForDecision) return;
    setIsGeneratingPlayful(true);
    const targetActivity = {
      ...pendingActivityForDecision,
      includedPneStudentIds,
    };
    try {
      onCreateActivity(targetActivity);

      const response = await fetch('/api/gemini/adapt-mild-moderate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: targetActivity.title,
          subject: targetActivity.subject,
          description: targetActivity.description,
          turma: targetActivity.turma,
          questions: targetActivity.questions || [],
          maxGrade: targetActivity.maxGrade || 10,
        }),
      });

      const data = await response.json();
      if (response.ok && data.questions) {
        const adapted = createAdaptedMildModerateActivity(targetActivity, {
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
    const targetActivity = {
      ...pendingActivityForDecision,
      includedPneStudentIds,
    };
    try {
      onCreateActivity(targetActivity);

      const response = await fetch('/api/gemini/adapt-playful', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: targetActivity.title,
          subject: targetActivity.subject,
          description: targetActivity.description,
          turma: targetActivity.turma,
          questions: targetActivity.questions || [],
          maxGrade: targetActivity.maxGrade || 10,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.html) {
        throw new Error(data.error || 'Erro ao gerar o jogo lúdico');
      }

      const playfulAct = createAdaptedSeverePlayfulActivity(targetActivity, data.html);
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
    const targetActivity = {
      ...pendingActivityForDecision,
      includedPneStudentIds,
    };
    try {
      // 1. Standard
      onCreateActivity(targetActivity);

      // 2. Mild / Moderate via Gemini
      try {
        const mildRes = await fetch('/api/gemini/adapt-mild-moderate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: targetActivity.title,
            subject: targetActivity.subject,
            description: targetActivity.description,
            turma: targetActivity.turma,
            questions: targetActivity.questions || [],
            maxGrade: targetActivity.maxGrade || 10,
          }),
        });
        const mildData = await mildRes.json();
        if (mildRes.ok && mildData.questions) {
          const mildAct = createAdaptedMildModerateActivity(targetActivity, {
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
          title: targetActivity.title,
          subject: targetActivity.subject,
          description: targetActivity.description,
          turma: targetActivity.turma,
          questions: targetActivity.questions || [],
          maxGrade: targetActivity.maxGrade || 10,
        }),
      });

      const data = await response.json();
      if (response.ok && data.html) {
        const playfulAct = createAdaptedSeverePlayfulActivity(targetActivity, data.html);
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

  if (isUnlinkedRecoveryPopupOpen) {
    return (
      <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2.5 sm:p-4 md:p-6 overflow-y-auto animate-fadeIn">
        <div className="w-full max-w-xl bg-surface rounded-2xl sm:rounded-3xl border border-indigo-500/30 p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-6 shadow-2xl relative my-auto max-h-[92vh] sm:max-h-[90vh] overflow-y-auto custom-scrollbar text-foreground">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border pb-3 sm:pb-4 gap-2">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <div className="p-2.5 sm:p-3 bg-indigo-100 text-indigo-600 rounded-xl sm:rounded-2xl border border-indigo-500/30 shrink-0">
                <KeyRound className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm sm:text-lg font-bold text-foreground leading-tight truncate">
                  Autorização de Recuperação Paralela
                </h3>
                <p className="text-[11px] sm:text-xs text-muted truncate">
                  Gravação avulsa sem apontar uma atividade mãe digital
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsUnlinkedRecoveryPopupOpen(false);
                setPendingRecoveryActivity(null);
              }}
              className="p-1.5 sm:p-2 text-muted hover:text-foreground hover:bg-surface-hover rounded-full transition-colors cursor-pointer shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Contexto Pedagógico / Exceção */}
          <div className="p-3.5 sm:p-4 bg-surface rounded-xl sm:rounded-2xl border border-indigo-500/20 space-y-1.5 sm:space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-indigo-600">
              <Lock className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>Confirmação de Segurança e Autorização</span>
            </div>
            <p className="text-[11px] sm:text-xs text-muted leading-relaxed">
              Você está gravando uma recuperação paralela sem vinculá-la a uma atividade mãe existente no portal (exceção para avaliações geradas em papel ou turmas assumidas). Digite o nome da atividade manualmente e sua senha para autorizar o cadastro.
            </p>
          </div>

          <form onSubmit={handleConfirmUnlinkedRecovery} className="space-y-3.5 sm:space-y-4">
            {authError && (
              <div className="p-3 sm:p-3.5 bg-rose-500/15 border border-rose-500/30 rounded-xl sm:rounded-2xl text-xs text-rose-600 flex items-start gap-2.5 animate-fadeIn">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{authError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-muted mb-1">
                Nome da Atividade Mãe (Digitado Manualmente) *
              </label>
              <input
                type="text"
                required
                autoFocus
                value={manualParentName}
                onChange={(e) => {
                  setManualParentName(e.target.value);
                  if (authError) setAuthError(null);
                }}
                placeholder="Ex: 1º Simulado Bimestral de Sociologia (Em Papel)"
                className="w-full bg-surface border border-border rounded-xl sm:rounded-2xl px-3.5 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm text-foreground placeholder-[#869486] focus:outline-none focus:border-indigo-400"
              />
              <p className="text-[10px] text-muted mt-1 ml-1">
                Informe o nome da avaliação original em papel ou externa a que esta recuperação se refere.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted mb-1">
                Senha do Usuário *
              </label>
              <input
                type="password"
                required
                value={userPassword}
                onChange={(e) => {
                  setUserPassword(e.target.value);
                  if (authError) setAuthError(null);
                }}
                placeholder="Digite sua senha de acesso"
                className="w-full bg-surface border border-border rounded-xl sm:rounded-2xl px-3.5 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm text-foreground placeholder-[#869486] focus:outline-none focus:border-indigo-400"
              />
              <p className="text-[10px] text-muted mt-1 ml-1">
                Sua senha é exigida para autorizar a gravação de recuperações sem vínculo direto.
              </p>
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2.5 sm:gap-3 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => {
                  setIsUnlinkedRecoveryPopupOpen(false);
                  setPendingRecoveryActivity(null);
                }}
                disabled={isAuthorizing}
                className="w-full sm:w-auto px-5 py-2.5 rounded-full text-xs font-bold text-muted hover:text-foreground hover:bg-surface-hover transition-all cursor-pointer text-center"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isAuthorizing}
                className="w-full sm:w-auto px-6 py-2.5 rounded-full text-xs font-bold bg-primary hover:bg-primary-hover text-white transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-primary/20 disabled:opacity-50"
              >
                {isAuthorizing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Validando Senha...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Autorizar e Gravar</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  if (pendingActivityForDecision) {
    return (
      <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-fadeIn">
        <div className="w-full max-w-2xl bg-surface rounded-3xl border border-white/15 p-6 sm:p-8 space-y-6 shadow-2xl relative my-auto">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-100 text-amber-400 rounded-2xl border border-amber-500/30">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">Atividade Pronta! Deseja Adaptar para PNE?</h3>
                <p className="text-xs text-muted">
                  Escolha as modalidades inclusivas para gerar automaticamente junto com a atividade padrão.
                </p>
              </div>
            </div>
            <button
              onClick={() => setPendingActivityForDecision(null)}
              className="p-2 text-muted hover:text-foreground hover:bg-surface-hover rounded-full transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-4 bg-surface rounded-2xl border border-border space-y-1">
            <span className="text-[10px] font-bold text-[#869486] uppercase tracking-wider block">
              Atividade Criada
            </span>
            <h4 className="text-sm font-bold text-foreground">{pendingActivityForDecision.title}</h4>
            <p className="text-xs text-muted">
              Turma: <strong className="text-foreground">{pendingActivityForDecision.turma}</strong> • {questions.length} Questões cadastradas
            </p>
          </div>

          <div className="space-y-3">
            {/* Option 1: Standard Only */}
            <button
              type="button"
              onClick={handleConfirmOnlyStandard}
              disabled={isGeneratingPlayful}
              className="w-full p-4 rounded-2xl bg-surface hover:bg-[#1a243c] border border-border hover:border-border text-left transition-all flex items-center justify-between group cursor-pointer"
            >
              <div>
                <span className="text-xs font-bold text-foreground block group-hover:text-primary transition-colors">
                  1. Publicar Somente a Versão Padrão
                </span>
                <span className="text-[11px] text-muted">
                  Salva apenas a atividade regular para toda a turma.
                </span>
              </div>
              <ArrowRight className="w-4 h-4 text-[#869486] group-hover:text-foreground group-hover:translate-x-1 transition-all" />
            </button>

            {/* Option 2: Standard + Mild/Moderate */}
            <button
              type="button"
              onClick={handleConfirmMildModerate}
              disabled={isGeneratingPlayful}
              className="w-full p-4 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-500/30 hover:border-emerald-500/50 text-left transition-all flex items-center justify-between group cursor-pointer"
            >
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-emerald-600 flex items-center gap-1.5">
                  <Cpu className="w-4 h-4 text-emerald-400" />
                  2. Publicar Padrão + Versão PNE Leve/Moderada (Função no Código)
                </span>
                <span className="text-[11px] text-muted block">
                  Reduz 50% das questões, 2 alternativas por objetiva, dissertativas simplificadas e sem caracteres mínimos.
                </span>
              </div>
              <span className="px-2.5 py-1 bg-emerald-100 text-emerald-600 text-[10px] font-bold rounded-lg border border-emerald-500/30 shrink-0">
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
                <span className="text-xs font-bold text-amber-600 flex items-center gap-1.5">
                  <Gamepad2 className="w-4 h-4 text-amber-400" />
                  3. Publicar Padrão + Jogo Lúdico para Síndromes Severas (IA Gemini)
                </span>
                <span className="text-[11px] text-muted block">
                  Gera um jogo interativo gamificado em HTML com perguntas ilustradas, sons e contagem de estrelas/pontuação.
                </span>
              </div>
              {isGeneratingPlayful ? (
                <Loader2 className="w-5 h-5 text-amber-400 animate-spin shrink-0" />
              ) : (
                <span className="px-2.5 py-1 bg-amber-100 text-amber-600 text-[10px] font-bold rounded-lg border border-amber-500/30 shrink-0">
                  Gemini IA
                </span>
              )}
            </button>

            {/* Option 4: All 3 */}
            <button
              type="button"
              onClick={handleConfirmAllAdaptations}
              disabled={isGeneratingPlayful}
              className="w-full p-4 rounded-2xl bg-primary/10 hover:bg-primary/15 border border-primary/30 hover:border-primary/50 text-left transition-all flex items-center justify-between group cursor-pointer"
            >
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-primary" />
                  4. Publicar Todas (Padrão + Leve/Mod + Jogo Lúdico Severo)
                </span>
                <span className="text-[11px] text-muted block">
                  Gera o pacote inclusivo completo para atender a todos os níveis de alunos da turma.
                </span>
              </div>
              <span className="px-3 py-1 bg-primary/20 text-primary text-[10px] font-bold rounded-lg border border-primary/40 shrink-0">
                Pacote Completo
              </span>
            </button>
          </div>

          {isGeneratingPlayful && (
            <div className="p-4 bg-surface rounded-2xl border border-amber-500/30 flex items-center gap-3 text-xs text-amber-600">
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
      <div className="w-full max-w-2xl bg-background rounded-3xl border border-border p-5 sm:p-8 space-y-6 shadow-2xl relative my-auto max-h-[90vh] overflow-y-auto custom-scrollbar animate-fadeIn">
        
        {/* Header */}
        <div className="flex items-start justify-between border-b border-border pb-4 pr-10 relative">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 text-primary rounded-2xl border border-primary/20 shrink-0">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-foreground leading-snug">Criar Atividade no Studio</h2>
              <p className="text-xs text-muted">Cadastre avaliações, redações ou exercícios interativos</p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="p-2.5 text-muted hover:text-foreground rounded-full hover:bg-surface-hover transition-colors cursor-pointer absolute top-0 right-0 min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Fechar Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          
          {/* Título e Disciplina */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-muted mb-1">
                Título da Atividade *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Simulado: Ação Social e Instituições"
                className="w-full bg-surface border border-border rounded-2xl px-4 py-3 text-sm text-foreground placeholder-[#869486] focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted mb-1">
                Disciplina
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Ex: Sociologia"
                className="w-full bg-surface border border-border rounded-2xl px-4 py-3 text-xs text-foreground placeholder-[#869486] focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          {/* Turmas, Prazo e Tipo */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-muted mb-1">
                Turmas *
              </label>
              <TurmaMultiSelect
                selectedTurmas={selectedTurmas}
                onChange={setSelectedTurmas}
                options={availableTurmas}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted mb-1">
                Prazo Final (Data e Hora)
              </label>
              <input
                type="datetime-local"
                value={deadlineDateTime}
                onChange={(e) => setDeadlineDateTime(e.target.value)}
                className="w-full bg-surface border border-border rounded-2xl px-3 py-3 text-xs text-foreground focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted mb-1">
                Tipo
              </label>
              <select
                value={type}
                onChange={(e) => {
                  const selectedType = e.target.value as ActivityType;
                  setType(selectedType);
                  if (selectedType === 'Trabalho em grupo') {
                    setAllowGroupWork(true);
                  } else if (selectedType === 'Recuperação Paralela') {
                    setAllowGroupWork(false);
                    // Pre-select first parent activity if available and none selected yet
                    if (!recoveryFromId && availableParentActivities.length > 0) {
                      const firstParent = availableParentActivities[0];
                      setRecoveryFromId(firstParent.id);
                      if (firstParent.turma) {
                        const parsed = firstParent.turma.split(/[,;]+/).map((t) => t.trim()).filter(Boolean);
                        if (parsed.length > 0) setSelectedTurmas(parsed);
                      }
                      if (firstParent.subject) setSubject(firstParent.subject);
                      if (firstParent.maxGrade) setMaxGrade(firstParent.maxGrade);
                      const cleanTitle = firstParent.title.replace(/^\[.*?\]\s*/i, '');
                      setTitle(`[Recuperação Paralela] ${cleanTitle}`);
                      if (!description) {
                        setDescription(`Recuperação Paralela com abordagem diferenciada subordinada à avaliação "${cleanTitle}".`);
                      }
                    }
                  }
                }}
                className="w-full bg-surface border border-border rounded-2xl px-3 py-3 text-xs text-foreground focus:outline-none focus:border-primary"
              >
                <option value="Avaliação" className="bg-background">Avaliação</option>
                <option value="Simulado" className="bg-background">Simulado</option>
                <option value="Redação" className="bg-background">Redação</option>
                <option value="Dinâmica" className="bg-background">Dinâmica</option>
                <option value="Trabalho em grupo" className="bg-background">Trabalho em grupo</option>
                <option value="Projeto de pesquisa" className="bg-background">Projeto de pesquisa</option>
                <option value="Recuperação Paralela" className="bg-background">Recuperação Paralela</option>
              </select>
            </div>
          </div>

          {/* Campo de Subordinação à Avaliação Original (Exibido quando Tipo = Recuperação Paralela) */}
          {type === 'Recuperação Paralela' && (
            <div className="bg-surface border border-indigo-200 rounded-2xl p-4 space-y-3 shadow-lg animate-fadeIn">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl border border-indigo-500/30">
                  <RotateCcw className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-indigo-600">
                    Avaliação à qual esta Recuperação será subordinada
                  </h4>
                  <p className="text-[11px] text-muted">
                    A recuperação paralela é uma segunda chance para quem não aproveitou a 1ª atividade. Não gera pendência nem espera entrega de quem já entregou a original.
                  </p>
                </div>
              </div>

              {availableParentActivities.length === 0 ? (
                <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-xs text-indigo-200 space-y-1">
                  <p className="font-semibold text-foreground">Nenhuma avaliação base digital encontrada no sistema.</p>
                  <p className="text-[11px] text-muted">
                    Você poderá gravar esta recuperação paralela normalmente como exceção (ex: avaliação original feita em papel ou turma assumida). Ao clicar em Publicar/Gravar, um popup solicitará a digitação manual do nome da atividade e sua senha.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <select
                    value={recoveryFromId}
                    onChange={(e) => {
                      const selectedId = e.target.value;
                      setRecoveryFromId(selectedId);
                      if (selectedId) {
                        const parent = availableParentActivities.find((a) => a.id === selectedId);
                        if (parent) {
                          if (parent.turma) {
                            const parsed = parent.turma.split(/[,;]+/).map((t) => t.trim()).filter(Boolean);
                            if (parsed.length > 0) setSelectedTurmas(parsed);
                          }
                          if (parent.subject) setSubject(parent.subject);
                          if (parent.maxGrade) setMaxGrade(parent.maxGrade);
                          const cleanTitle = parent.title.replace(/^\[.*?\]\s*/i, '');
                          setTitle(`[Recuperação Paralela] ${cleanTitle}`);
                          setDescription(`Recuperação Paralela com abordagem diferenciada subordinada à avaliação "${cleanTitle}".`);
                        }
                      } else {
                        if (!title || title.startsWith('[Recuperação Paralela]')) {
                          setTitle('[Recuperação Paralela] ');
                        }
                      }
                    }}
                    className="w-full bg-surface border border-indigo-200 rounded-xl px-3 py-2.5 text-xs text-foreground focus:outline-none focus:border-indigo-400"
                  >
                    <option value="" className="bg-background text-amber-600">
                      -- Sem atividade mãe vinculada (Exceção: Atividade em Papel / Externa) --
                    </option>
                    {availableParentActivities.map((parent) => (
                      <option key={parent.id} value={parent.id} className="bg-background">
                        {parent.title} • Turma: {parent.turma} {parent.subject ? `• ${parent.subject}` : ''}
                      </option>
                    ))}
                  </select>

                  {recoveryFromId ? (
                    <div className="flex items-center gap-2 text-[11px] text-emerald-400 bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span>Subordinação vinculada: As turmas e métricas foram sincronizadas automaticamente com a atividade raiz.</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-[11px] text-amber-600 bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>Modo Exceção: Ao salvar sem vincular, um popup solicitará o nome da atividade em papel e sua senha.</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Janela / Lista Suspensa com Caixas de Seleção para Alunos PNE com Proficiência */}
          {pneStudentsInSelectedTurmas.length > 0 && (
            <div className="bg-surface border border-amber-500/30 rounded-2xl p-4 space-y-3 shadow-inner">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-amber-600 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                      Alunos PNE com Proficiência (Atividade Normal)
                    </span>
                    <span className="text-[10px] font-bold bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full border border-amber-500/30">
                      {pneStudentsInSelectedTurmas.length} PNE na(s) turma(s)
                    </span>
                  </div>
                  <p className="text-[11px] text-muted mt-0.5">
                    Selecione os alunos PNE que já atingiram proficiência para realizarem a <strong>atividade normal</strong> (evita retrocesso por desmotivação).
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsPneDropdownOpen((prev) => !prev)}
                  className="flex items-center justify-between sm:justify-center gap-2 px-3.5 py-2 bg-[#1a243c] hover:bg-[#223050] text-xs font-semibold text-foreground rounded-xl border border-border transition-colors cursor-pointer shrink-0"
                >
                  <span>
                    {includedPneStudentIds.length === 0
                      ? 'Nenhum incluído na normal'
                      : `${includedPneStudentIds.length} selecionado(s) para normal`}
                  </span>
                  {isPneDropdownOpen ? (
                    <ChevronUp className="w-4 h-4 text-amber-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-amber-400" />
                  )}
                </button>
              </div>

              {isPneDropdownOpen && (
                <div className="pt-3 border-t border-border space-y-3 animate-fadeIn">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted text-[11px]">
                      Marque para liberar a atividade normal:
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIncludedPneStudentIds(pneStudentsInSelectedTurmas.map((s) => s.id))}
                        className="text-[11px] text-primary hover:underline cursor-pointer font-medium"
                      >
                        Marcar todos
                      </button>
                      <span className="text-foreground/20">•</span>
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
                              ? 'bg-amber-500/10 border-amber-200 text-foreground'
                              : 'bg-surface border-border text-muted hover:border-white/15'
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
                              className="w-4 h-4 rounded border-border text-amber-500 focus:ring-amber-400 focus:ring-offset-0 bg-surface cursor-pointer"
                            />
                            <div className="truncate">
                              <span className="text-xs font-semibold text-foreground block truncate">
                                {st.fullName}
                              </span>
                              <span className="text-[10px] text-[#869486] block truncate">
                                Turma: <strong className="text-muted">{st.turma}</strong> • {conditionText}
                              </span>
                            </div>
                          </div>

                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0 ml-2 ${
                              isSelected
                                ? 'bg-emerald-100 text-emerald-600 border border-emerald-500/30'
                                : 'bg-surface-hover text-[#869486]'
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

          {/* Nota Máxima e Permitir Trabalho em Grupo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-surface/60 p-4 rounded-2xl border border-border">
            <div>
              <label className="block text-xs font-semibold text-muted mb-1">
                Nota Máxima Oficial (0 a 10)
              </label>
              <input
                type="number"
                min={0}
                max={10}
                step={0.5}
                value={maxGrade}
                onChange={(e) => setMaxGrade(Number(e.target.value))}
                className="w-full bg-surface border border-border rounded-2xl px-4 py-2.5 text-sm font-bold text-primary focus:outline-none focus:border-primary"
              />
            </div>

            <div className="flex flex-col justify-center">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allowGroupWork}
                  onChange={(e) => setAllowGroupWork(e.target.checked)}
                  className="w-5 h-5 rounded border-border bg-surface text-primary focus:ring-[#4ade80] focus:ring-offset-0 cursor-pointer"
                />
                <div>
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-primary" />
                    Permitir Atividade em Grupo?
                  </span>
                  <p className="text-[10px] text-muted">
                    Quando ativo, os alunos podem escolher os membros da equipe no envio.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Travas de Segurança Anti-Cola */}
          <div className="bg-surface p-4 rounded-2xl border border-amber-500/30 space-y-3">
            <h4 className="text-xs font-bold text-amber-600 uppercase tracking-wider flex items-center gap-2">
              <span>🛡️ Travas de Segurança Anti-Cola</span>
            </h4>
            <p className="text-[11px] text-muted">
              Ative os mecanismos de integridade para avaliações e provas:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <label className="flex items-start gap-2.5 cursor-pointer bg-background p-3 rounded-xl border border-border hover:border-amber-200 transition-colors">
                <input
                  type="checkbox"
                  checked={securityFocusLock}
                  onChange={(e) => setSecurityFocusLock(e.target.checked)}
                  className="w-4 h-4 rounded border-border bg-surface text-primary focus:ring-[#4ade80] mt-0.5"
                />
                <div>
                  <span className="text-xs font-bold text-foreground block">Trava de Foco</span>
                  <span className="text-[10px] text-muted block leading-tight mt-0.5">
                    Gera avisos ao sair da tela e auto-entrega no 4º aviso.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-2.5 cursor-pointer bg-background p-3 rounded-xl border border-border hover:border-amber-200 transition-colors">
                <input
                  type="checkbox"
                  checked={securityBlockCopyStatement}
                  onChange={(e) => setSecurityBlockCopyStatement(e.target.checked)}
                  className="w-4 h-4 rounded border-border bg-surface text-primary focus:ring-[#4ade80] mt-0.5"
                />
                <div>
                  <span className="text-xs font-bold text-foreground block">Bloquear Cópia</span>
                  <span className="text-[10px] text-muted block leading-tight mt-0.5">
                    Impede copiar enunciados e textos com Ctrl+C e botão direito.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-2.5 cursor-pointer bg-background p-3 rounded-xl border border-border hover:border-amber-200 transition-colors">
                <input
                  type="checkbox"
                  checked={securityBlockPasteEssay}
                  onChange={(e) => setSecurityBlockPasteEssay(e.target.checked)}
                  className="w-4 h-4 rounded border-border bg-surface text-primary focus:ring-[#4ade80] mt-0.5"
                />
                <div>
                  <span className="text-xs font-bold text-foreground block">Bloquear Cola</span>
                  <span className="text-[10px] text-muted block leading-tight mt-0.5">
                    Bloqueia colar texto (Ctrl+V) na resposta dissertativa.
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* Material de Apoio / Texto Base */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-muted mb-1">
              Material de Apoio / Texto Base
            </label>
            <textarea
              rows={3}
              value={supportMaterial}
              onChange={(e) => setSupportMaterial(e.target.value)}
              placeholder="Insira aqui o texto base para leitura, citações, referências bibliográficas..."
              className="w-full bg-surface border border-border rounded-2xl p-3.5 text-xs text-foreground placeholder-[#869486] focus:outline-none focus:border-primary resize-y"
            />

            {/* Injetor / Adicionador de Links */}
            <div className="bg-background p-3 rounded-2xl border border-border space-y-2">
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
                  className="flex-1 bg-surface border border-border rounded-xl px-3 py-2 text-xs text-foreground placeholder-[#869486] focus:outline-none focus:border-sky-400 font-mono"
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
          <div className="space-y-4 pt-2 border-t border-border">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-primary" />
                  Questões da Atividade ({questions.length})
                </h3>
                <p className="text-[11px] text-muted">Adicione questões objetivas e dissertativas</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAddMultipleChoice}
                  className="px-3 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl text-xs font-bold border border-primary/30 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Add Múltipla Escolha</span>
                </button>

                <button
                  type="button"
                  onClick={handleAddEssay}
                  className="px-3 py-2 bg-primary/10 hover:bg-blue-100 text-primary-hover rounded-xl text-xs font-bold border border-primary/30 transition-all flex items-center gap-1.5 cursor-pointer"
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
                      className="bg-surface border border-border rounded-2xl p-4 space-y-3 relative group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-full border border-primary/20">
                          Questão {qIndex + 1} • Múltipla Escolha (4 Respostas)
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveQuestion(q.id)}
                          className="text-rose-400 hover:text-rose-600 p-1 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                          title="Remover Questão"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div>
                        <label className="block text-[11px] text-muted font-semibold mb-1">
                          Enunciado da Questão
                        </label>
                        <textarea
                          rows={2}
                          value={q.statement}
                          onChange={(e) => handleUpdateMCQuestion(q.id, 'statement', e.target.value)}
                          placeholder="Digite o enunciado da questão..."
                          className="w-full bg-background border border-border rounded-xl p-3 text-xs text-foreground placeholder-[#869486] focus:outline-none focus:border-primary"
                        />
                      </div>

                      <div className="space-y-2 pt-1">
                        <label className="block text-[11px] text-muted font-semibold">
                          Opções de Resposta (Marque a opção correta):
                        </label>
                        {['A', 'B', 'C', 'D'].map((letter, optIdx) => (
                          <div key={optIdx} className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleUpdateMCQuestion(q.id, 'correctOptionIndex', optIdx)}
                              className={`w-7 h-7 rounded-lg font-bold text-xs flex items-center justify-center transition-all cursor-pointer ${
                                q.correctOptionIndex === optIdx
                                  ? 'bg-primary text-white ring-2 ring-[#4ade80]/50'
                                  : 'bg-background text-muted border border-border hover:border-border'
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
                              className="flex-1 bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground placeholder-[#869486] focus:outline-none focus:border-primary"
                            />
                            {q.correctOptionIndex === optIdx && (
                              <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
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
                    className="bg-surface border border-primary/20 rounded-2xl p-4 space-y-3 relative"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-primary-hover bg-primary/10 px-2.5 py-1 rounded-full border border-primary/20">
                        Questão {qIndex + 1} • Redação / Pesquisa Dissertativa
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveQuestion(q.id)}
                        className="text-rose-400 hover:text-rose-600 p-1 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                        title="Remover Questão"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div>
                      <label className="block text-[11px] text-muted font-semibold mb-1">
                        Enunciado ou Tema da Redação/Pesquisa
                      </label>
                      <textarea
                        rows={2}
                        value={q.statement}
                        onChange={(e) => handleUpdateEssayQuestion(q.id, 'statement', e.target.value)}
                        placeholder="Ex: Elabore uma dissertação sobre a Teoria do Fato Social de Émile Durkheim..."
                        className="w-full bg-background border border-border rounded-xl p-3 text-xs text-foreground placeholder-[#869486] focus:outline-none focus:border-blue-400"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] text-muted font-semibold mb-1">
                          Mínimo de Caracteres Exigido
                        </label>
                        <input
                          type="number"
                          min={50}
                          step={50}
                          value={q.minCharacters}
                          onChange={(e) => handleUpdateEssayQuestion(q.id, 'minCharacters', Number(e.target.value))}
                          className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-primary-hover font-bold focus:outline-none focus:border-blue-400"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] text-muted font-semibold mb-1">
                          Palavras-Chave de Atenção (I.A. e Aluno)
                        </label>
                        <input
                          type="text"
                          value={q.keywords || ''}
                          onChange={(e) => handleUpdateEssayQuestion(q.id, 'keywords', e.target.value)}
                          placeholder="Ex: Fato social, Coerção, Durkheim, Anomia"
                          className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground placeholder-[#869486] focus:outline-none focus:border-blue-400"
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
            className="w-full py-3.5 bg-primary hover:bg-primary-hover text-white font-bold rounded-full transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20 cursor-pointer text-sm mt-6"
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
