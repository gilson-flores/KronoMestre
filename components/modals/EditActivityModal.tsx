import { EditActivityModalBody } from "@/components/parts/EditActivityModalBody";
'use client';

import React, { useState } from 'react';
import {
  X,
  Save,
  Pencil,
  Plus,
  Trash2,
  HelpCircle,
  FileText,
  Users,
  CheckCircle2,
  Link2,
  Sparkles,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  KeyRound,
  Lock,
  AlertTriangle,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { Activity, ActivityQuestion, ActivityType, StudentUser } from '@/lib/types';
import { getTurmaLabel, canStudentAccessActivity, isStudentPNE, getOriginalTurmas } from '@/lib/studentUtils';
import { TurmaMultiSelect } from '@/components/TurmaMultiSelect';

interface EditActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  activity: Activity | null;
  onSaveActivity: (updatedActivity: Activity) => void;
  students?: StudentUser[];
  activities?: Activity[];
  userEmail?: string;
}

export const EditActivityModal: React.FC<EditActivityModalProps> = ({
  isOpen,
  onClose,
  activity,
  onSaveActivity,
  students = [],
  activities = [],
  userEmail,
}) => {
  const [prevActivityId, setPrevActivityId] = useState<string | null>(activity?.id || null);
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('Sociologia');
  const [description, setDescription] = useState('');
  const [supportMaterial, setSupportMaterial] = useState('');
  const [supportLinkInput, setSupportLinkInput] = useState('');
  
  // Available turmas strictly from active students
  const availableTurmas = React.useMemo(() => {
    return getOriginalTurmas(students);
  }, [students]);

  const [selectedTurmas, setSelectedTurmas] = useState<string[]>(() => {
    const list = getOriginalTurmas(students);
    return list.length > 0 ? [list[0]] : [];
  });
  const [type, setType] = useState<ActivityType>('Avaliação');
  const [recoveryFromId, setRecoveryFromId] = useState<string>('');
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

  // Unlinked Parallel Recovery Exception State
  const [isUnlinkedRecoveryPopupOpen, setIsUnlinkedRecoveryPopupOpen] = useState(false);
  const [manualParentName, setManualParentName] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [pendingUpdatedActivity, setPendingUpdatedActivity] = useState<Activity | null>(null);

  if (activity && activity.id !== prevActivityId) {
    setPrevActivityId(activity.id);
    setTitle(activity.title || '');
    setSubject(activity.subject || 'Sociologia');
    setDescription(activity.description || '');
    setSupportMaterial(activity.supportMaterial || '');
    const parsedTurmas = activity.turma
      ? activity.turma.split(/[,;]+/).map((t) => t.trim()).filter(Boolean)
      : [];
    setSelectedTurmas(
      parsedTurmas.length > 0
        ? parsedTurmas
        : availableTurmas.length > 0
        ? [availableTurmas[0]]
        : []
    );
    setType(activity.type || 'Avaliação');
    setRecoveryFromId(activity.recoveryFromId || '');
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

  // Filter available parent activities for subordination
  const availableParentActivities = React.useMemo(() => {
    return (activities || []).filter(
      (a) => a.id !== activity?.id && !a.isRecovery && !a.recoveryFromId && a.type !== 'Recuperação Paralela' && !a.isAdapted
    );
  }, [activities, activity?.id]);

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
      const brShortMatch = !brMatch ? dateStr.match(/\b(0[1-9]|[12]\d|3[01])\/(0[1-9]|1[0-2])\b/) : null;
      if (brShortMatch) {
        const [, day, month] = brShortMatch;
        isoDate = `2026-${month}-${day}`;
      }

      // Preserva a escolha manual de status (Ativo / Inativo) do professor
    }

    const isParallelRecovery = type === 'Recuperação Paralela';

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
      allowGroupWork: isParallelRecovery ? false : allowGroupWork,
      securityFocusLock,
      securityBlockCopyStatement,
      securityBlockPasteEssay,
      isRecovery: isParallelRecovery || Boolean(recoveryFromId) || Boolean(activity.isRecovery),
      recoveryFromId: isParallelRecovery && recoveryFromId ? recoveryFromId : undefined,
      recoveryApproach: isParallelRecovery ? (activity.recoveryApproach || 'Estudos de caso e aplicações práticas do cotidiano') : activity.recoveryApproach,
      recoveryManualParentName: isParallelRecovery && !recoveryFromId ? (activity.recoveryManualParentName || undefined) : undefined,
      includedPneStudentIds,
      questions,
    };

    if (isParallelRecovery && !recoveryFromId) {
      setPendingUpdatedActivity(updatedActivity);
      setManualParentName(activity.recoveryManualParentName || '');
      setUserPassword('');
      setAuthError(null);
      setIsUnlinkedRecoveryPopupOpen(true);
      return;
    }

    onSaveActivity(updatedActivity);
    onClose();
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

      if (!pendingUpdatedActivity) return;

      const cleanManualName = manualParentName.trim();
      const finalActivity: Activity = {
        ...pendingUpdatedActivity,
        isRecovery: true,
        recoveryFromId: undefined,
        recoveryManualParentName: cleanManualName,
      };

      onSaveActivity(finalActivity);
      setIsUnlinkedRecoveryPopupOpen(false);
      setPendingUpdatedActivity(null);
      onClose();
    } catch (err: any) {
      setAuthError(err?.message || 'Erro ao validar credenciais. Tente novamente.');
    } finally {
      setIsAuthorizing(false);
    }
  };

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
                setPendingUpdatedActivity(null);
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
              Esta recuperação paralela não possui uma atividade mãe cadastrada no portal (exceção para avaliações geradas em papel ou turmas assumidas). Digite o nome da atividade manualmente e sua senha para autorizar a gravação.
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
                  setPendingUpdatedActivity(null);
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
                    <span>Autorizar e Salvar</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return <EditActivityModalBody {...{ onClose, availableTurmas, availableParentActivities, pneStudentsInSelectedTurmas, handleAddMultipleChoice, handleAddEssay, handleRemoveQuestion, handleUpdateMCQuestion, handleUpdateMCOption, handleUpdateEssayQuestion, handleSubmit, title, setTitle, subject, setSubject, supportMaterial, setSupportMaterial, supportLinkInput, setSupportLinkInput, selectedTurmas, setSelectedTurmas, type, setType, recoveryFromId, setRecoveryFromId, status, setStatus, deadline, setDeadline, maxGrade, setMaxGrade, allowGroupWork, setAllowGroupWork, securityFocusLock, setSecurityFocusLock, securityBlockCopyStatement, setSecurityBlockCopyStatement, securityBlockPasteEssay, setSecurityBlockPasteEssay, includedPneStudentIds, setIncludedPneStudentIds, isPneDropdownOpen, setIsPneDropdownOpen, questions }} />;
};

export default EditActivityModal;
