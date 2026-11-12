import { NewActivityModalBody } from "@/components/parts/NewActivityModalBody";
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
import { Activity, ActivityQuestion, ActivityType, StudentUser, GameMode, GameExecutionContext, GameData } from '@/lib/types';
import { doesTurmaHavePNEStudent, canStudentAccessActivity, isStudentPNE, getOriginalTurmas } from '@/lib/studentUtils';
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
  
  // KronoGames & Standalone Adaptation States
  const [isStandaloneAdaptation, setIsStandaloneAdaptation] = useState(false);
  const [gameExecutionContext, setGameExecutionContext] = useState<GameExecutionContext>('classroom_group');
  const [gameMode, setGameMode] = useState<GameMode>('millionaire');
  const [isGeneratingGame, setIsGeneratingGame] = useState(false);
  const [gameData, setGameData] = useState<GameData | null>(null);
  const [gameGenError, setGameGenError] = useState<string | null>(null);

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

  const handleGenerateGameWithGemini = async () => {
    if (!title.trim()) {
      alert('Por favor, informe o Título da atividade antes de gerar o KronoGame.');
      return;
    }
    setIsGeneratingGame(true);
    setGameGenError(null);
    try {
      const res = await fetch('/api/gemini/generate-game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          subject,
          topic: title,
          supportMaterial: supportMaterial || '',
          gameMode,
          isAdaptedOnly: isStandaloneAdaptation,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao gerar jogo.');
      setGameData(data.gameData);
    } catch (err: any) {
      console.error('Erro ao gerar KronoGame:', err);
      setGameGenError(err?.message || 'Falha ao gerar o KronoGame com IA. Tente novamente.');
    } finally {
      setIsGeneratingGame(false);
    }
  };

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
    const isGame = type === 'Jogo Avaliativo';

    if (isGame && !gameData) {
      alert('Por favor, clique no botão "Gerar Roteiro do Jogo com IA (Gemini)" antes de salvar a atividade.');
      return;
    }

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
      allowGroupWork: isParallelRecovery ? false : (isGame ? gameExecutionContext === 'classroom_group' : allowGroupWork),
      securityFocusLock: isGame ? false : securityFocusLock,
      securityBlockCopyStatement: isGame ? false : securityBlockCopyStatement,
      securityBlockPasteEssay: isGame ? false : securityBlockPasteEssay,
      isRecovery: isParallelRecovery || Boolean(recoveryFromId),
      recoveryFromId: isParallelRecovery && recoveryFromId ? recoveryFromId : undefined,
      recoveryApproach: isParallelRecovery ? 'Estudos de caso e aplicações práticas do cotidiano' : undefined,
      includedPneStudentIds,
      questions,
      isGameActivity: isGame,
      gameMode: isGame ? gameMode : undefined,
      executionContext: isGame ? gameExecutionContext : undefined,
      gameData: isGame && gameData ? gameData : undefined,
      isAdapted: isStandaloneAdaptation ? true : undefined,
      isStandaloneAdaptation: isStandaloneAdaptation ? true : undefined,
      totalSubmissions: 0,
      totalStudents: resolvedTurma ? 35 : 120,
      pendingCorrection: 0,
      submissions: [],
    };

    if (isGame || isStandaloneAdaptation) {
      onCreateActivity(newActivity);
      resetFormAndClose();
      return;
    }

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
    const hasPneStudents = false;
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
      {
        const verifyRes = await fetch('/api/auth/verify-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: userPassword }),
        }).catch(() => null);
        if (!verifyRes) {
          throw new Error('Não foi possível validar a senha agora. Verifique a conexão e tente novamente.');
        }
        if (!verifyRes.ok) {
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
        <div className="w-full max-w-2xl bg-surface rounded-3xl border border-white/15 p-6 sm:p-8 space-y-6 shadow-2xl relative my-auto max-h-[92vh] overflow-y-auto custom-scrollbar">
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

  return <NewActivityModalBody {...{ onClose, availableTurmas, selectedTurmas, setSelectedTurmas, availableParentActivities, pneStudentsInSelectedTurmas, handleGenerateGameWithGemini, handleAddMultipleChoice, handleAddEssay, handleRemoveQuestion, handleUpdateMCQuestion, handleUpdateMCOption, handleUpdateEssayQuestion, handleSubmit, title, setTitle, subject, setSubject, description, setDescription, supportMaterial, setSupportMaterial, supportLinkInput, setSupportLinkInput, type, setType, recoveryFromId, setRecoveryFromId, deadlineDateTime, setDeadlineDateTime, maxGrade, setMaxGrade, allowGroupWork, setAllowGroupWork, isStandaloneAdaptation, setIsStandaloneAdaptation, gameExecutionContext, setGameExecutionContext, gameMode, setGameMode, isGeneratingGame, gameData, gameGenError, includedPneStudentIds, setIncludedPneStudentIds, isPneDropdownOpen, setIsPneDropdownOpen, securityFocusLock, setSecurityFocusLock, securityBlockCopyStatement, setSecurityBlockCopyStatement, securityBlockPasteEssay, setSecurityBlockPasteEssay, questions }} />;
};

export default NewActivityModal;
