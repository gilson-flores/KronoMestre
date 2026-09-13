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
import { DEFAULT_TURMAS, getTurmaLabel, canStudentAccessActivity, isStudentPNE } from '@/lib/studentUtils';
import { TurmaMultiSelect } from '@/components/TurmaMultiSelect';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

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
  const [selectedTurmas, setSelectedTurmas] = useState<string[]>(['101']);
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
      : ['101'];
    setSelectedTurmas(parsedTurmas.length > 0 ? parsedTurmas : ['101']);
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

      if (isSupabaseConfigured && supabase && emailToValidate) {
        const { error: authErr } = await supabase.auth.signInWithPassword({
          email: emailToValidate.trim().toLowerCase(),
          password: userPassword,
        });
        if (authErr) {
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

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-2.5 sm:p-4 md:p-6 overflow-y-auto">
      <div className="bg-background border border-border w-full max-w-3xl rounded-2xl sm:rounded-3xl p-3.5 sm:p-6 md:p-8 space-y-4 sm:space-y-5 my-auto max-h-[94vh] sm:max-h-[90vh] overflow-y-auto custom-scrollbar text-foreground shadow-2xl relative animate-fadeIn">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-border gap-3">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-primary/20 border border-primary/30 text-primary flex items-center justify-center shrink-0">
              <Pencil className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-xl font-bold text-foreground leading-tight truncate">Editar Atividade</h2>
              <p className="text-[11px] sm:text-xs text-muted truncate">Altere as configurações, enunciados e prazos da atividade.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 text-muted hover:text-foreground hover:bg-surface-hover rounded-full transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
          {/* Title & Subject */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-muted mb-1">
                Título da Atividade *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Simulado de Sociologia - Modos de Produção"
                className="w-full bg-surface border border-border rounded-xl sm:rounded-2xl px-3.5 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm text-foreground focus:outline-none focus:border-primary"
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
                className="w-full bg-surface border border-border rounded-xl sm:rounded-2xl px-3.5 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm text-foreground focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          {/* Type, Turma, Status, Max Grade */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div>
              <label className="block text-xs font-semibold text-muted mb-1">Tipo</label>
              <select
                value={type}
                onChange={(e) => {
                  const selectedType = e.target.value as ActivityType;
                  setType(selectedType);
                  if (selectedType === 'Trabalho em grupo') {
                    setAllowGroupWork(true);
                  } else if (selectedType === 'Recuperação Paralela') {
                    setAllowGroupWork(false);
                    if (!recoveryFromId && availableParentActivities.length > 0) {
                      setRecoveryFromId(availableParentActivities[0].id);
                    }
                  }
                }}
                className="w-full bg-surface border border-border rounded-xl sm:rounded-2xl px-3 py-2.5 sm:py-3 text-xs text-foreground focus:outline-none focus:border-primary"
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

            <div>
              <label className="block text-xs font-semibold text-muted mb-1">Turmas *</label>
              <TurmaMultiSelect
                selectedTurmas={selectedTurmas}
                onChange={setSelectedTurmas}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full bg-surface border border-border rounded-xl sm:rounded-2xl px-3 py-2.5 sm:py-3 text-xs text-foreground focus:outline-none focus:border-primary"
              >
                <option value="Ativo" className="bg-background">Ativo</option>
                <option value="Prazo Encerrado" className="bg-background">Prazo Encerrado</option>
                <option value="Inativo" className="bg-background">Inativo</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted mb-1">Nota Máxima</label>
              <input
                type="number"
                step="0.5"
                min="1"
                max="100"
                value={maxGrade}
                onChange={(e) => setMaxGrade(parseFloat(e.target.value) || 10)}
                className="w-full bg-surface border border-border rounded-xl sm:rounded-2xl px-3 py-2.5 sm:py-3 text-xs text-foreground focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          {/* Subordinação à Avaliação Base (quando Tipo = Recuperação Paralela) */}
          {type === 'Recuperação Paralela' && (
            <div className="bg-surface border border-indigo-200 rounded-xl sm:rounded-2xl p-3.5 sm:p-4 space-y-3 shadow-lg animate-fadeIn">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl border border-indigo-500/30 shrink-0">
                  <RotateCcw className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-indigo-600">
                    Avaliação à qual esta Recuperação é subordinada
                  </h4>
                  <p className="text-[11px] text-muted">
                    Não conta como entrega esperada para quem já entregou a 1ª atividade original.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <select
                  value={recoveryFromId}
                  onChange={(e) => setRecoveryFromId(e.target.value)}
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
                    <span>Subordinação vinculada: Integrada à atividade original digital.</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-[11px] text-amber-600 bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>Modo Exceção: Ao salvar sem vincular, um popup solicitará o nome da atividade em papel e sua senha.</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Deadline */}
          <div>
            <label className="block text-xs font-semibold text-muted mb-1">Prazo de Entrega (Texto Exibido)</label>
            <input
              type="text"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              placeholder="Ex: 15/08/2026 às 23:59"
              className="w-full bg-surface border border-border rounded-xl sm:rounded-2xl px-3.5 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm text-foreground focus:outline-none focus:border-primary"
            />
          </div>

          {/* Janela / Lista Suspensa com Caixas de Seleção para Alunos PNE com Proficiência */}
          {pneStudentsInSelectedTurmas.length > 0 && (
            <div className="bg-surface border border-amber-500/30 rounded-xl sm:rounded-2xl p-3 sm:p-4 space-y-3 shadow-inner">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-amber-600 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                      Alunos PNE com Proficiência (Atividade Normal)
                    </span>
                    <span className="text-[10px] font-bold bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full border border-amber-500/30">
                      {pneStudentsInSelectedTurmas.length} PNE na(s) turma(s)
                    </span>
                  </div>
                  <p className="text-[11px] text-muted mt-0.5 leading-relaxed">
                    Selecione os alunos PNE que já atingiram proficiência para realizarem a <strong>atividade normal</strong> (evita retrocesso por desmotivação).
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsPneDropdownOpen((prev) => !prev)}
                  className="w-full sm:w-auto flex items-center justify-between sm:justify-center gap-2 px-3.5 py-2 bg-[#1a243c] hover:bg-[#223050] text-xs font-semibold text-foreground rounded-xl border border-border transition-colors cursor-pointer shrink-0"
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
                <div className="pt-3 border-t border-border space-y-3 animate-fadeIn">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
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
                          className={`flex flex-col sm:flex-row sm:items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer gap-2 ${
                            isSelected
                              ? 'bg-amber-500/10 border-amber-200 text-foreground'
                              : 'bg-surface border-border text-muted hover:border-white/15'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
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
                              className="w-4 h-4 rounded border-border text-amber-500 focus:ring-amber-400 focus:ring-offset-0 bg-surface cursor-pointer shrink-0"
                            />
                            <div className="truncate min-w-0">
                              <span className="text-xs font-semibold text-foreground block truncate">
                                {st.fullName}
                              </span>
                              <span className="text-[10px] text-[#869486] block truncate">
                                Turma: <strong className="text-muted">{st.turma}</strong> • {conditionText}
                              </span>
                            </div>
                          </div>

                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0 self-start sm:self-center ${
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

          {/* Group Work Option */}
          <div className="bg-surface/60 p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-border">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={allowGroupWork}
                onChange={(e) => setAllowGroupWork(e.target.checked)}
                className="w-5 h-5 rounded border-border bg-surface text-primary focus:ring-[#4ade80] focus:ring-offset-0 cursor-pointer shrink-0"
              />
              <div>
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-primary" />
                  Permitir Atividade em Grupo?
                </span>
                <p className="text-[10px] text-muted leading-relaxed">
                  Quando ativo, os alunos podem escolher os membros da equipe no envio.
                </p>
              </div>
            </label>
          </div>

          {/* Travas de Segurança Anti-Cola */}
          <div className="bg-surface p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-amber-500/30 space-y-3">
            <h4 className="text-xs font-bold text-amber-600 uppercase tracking-wider flex items-center gap-2">
              <span>🛡️ Travas de Segurança Anti-Cola</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 pt-1">
              <label className="flex items-start gap-2.5 cursor-pointer bg-background p-3 rounded-xl border border-border hover:border-amber-200 transition-colors">
                <input
                  type="checkbox"
                  checked={securityFocusLock}
                  onChange={(e) => setSecurityFocusLock(e.target.checked)}
                  className="w-4 h-4 rounded border-border bg-surface text-primary focus:ring-[#4ade80] mt-0.5 shrink-0 cursor-pointer"
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
                  className="w-4 h-4 rounded border-border bg-surface text-primary focus:ring-[#4ade80] mt-0.5 shrink-0 cursor-pointer"
                />
                <div>
                  <span className="text-xs font-bold text-foreground block">Bloquear Cópia</span>
                  <span className="text-[10px] text-muted block leading-tight mt-0.5">
                    Impede copiar enunciados com Ctrl+C e botão direito.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-2.5 cursor-pointer bg-background p-3 rounded-xl border border-border hover:border-amber-200 transition-colors">
                <input
                  type="checkbox"
                  checked={securityBlockPasteEssay}
                  onChange={(e) => setSecurityBlockPasteEssay(e.target.checked)}
                  className="w-4 h-4 rounded border-border bg-surface text-primary focus:ring-[#4ade80] mt-0.5 shrink-0 cursor-pointer"
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

          {/* Material de Apoio / Texto Base & Links */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-muted mb-1">
              Material de Apoio / Texto Base
            </label>
            <textarea
              rows={3}
              value={supportMaterial}
              onChange={(e) => setSupportMaterial(e.target.value)}
              placeholder="Insira aqui o texto base para leitura, citações, referências bibliográficas..."
              className="w-full bg-surface border border-border rounded-xl sm:rounded-2xl p-3 sm:p-3.5 text-xs text-foreground focus:outline-none focus:border-primary resize-y leading-relaxed"
            />

            {/* Injetor / Adicionador de Links */}
            <div className="bg-background p-3 sm:p-3.5 rounded-xl sm:rounded-2xl border border-border space-y-2">
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
                  className="flex-1 min-w-0 bg-surface border border-border rounded-xl px-3 py-2 text-xs text-foreground placeholder-[#869486] focus:outline-none focus:border-sky-400 font-mono"
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
                  className="w-full sm:w-auto px-3.5 py-2 bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 font-bold rounded-xl text-xs border border-sky-400/40 transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0 active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Adicionar Link</span>
                </button>
              </div>
            </div>
          </div>

          {/* Questions Section */}
          <div className="space-y-4 pt-2 border-t border-border">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <h3 className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-primary shrink-0" />
                <span>Questões da Atividade ({questions.length})</span>
              </h3>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleAddMultipleChoice}
                  className="flex-1 sm:flex-initial px-3 py-1.5 bg-[#171f33] hover:bg-surface-hover text-primary rounded-xl text-xs font-bold border border-primary/30 flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Múltipla Escolha</span>
                </button>
                <button
                  type="button"
                  onClick={handleAddEssay}
                  className="flex-1 sm:flex-initial px-3 py-1.5 bg-[#171f33] hover:bg-surface-hover text-indigo-600 rounded-xl text-xs font-bold border border-indigo-500/30 flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Dissertativa</span>
                </button>
              </div>
            </div>

            {questions.map((q, qIndex) => (
              <div key={q.id} className="bg-surface border border-border p-3 sm:p-4 rounded-xl sm:rounded-2xl space-y-3 relative">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-primary truncate">
                    Questão {qIndex + 1} ({q.type === 'multiple_choice' ? 'Múltipla Escolha' : 'Dissertativa/Redação'})
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveQuestion(q.id)}
                    className="text-rose-400 hover:text-rose-600 p-1.5 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer shrink-0"
                    title="Remover Questão"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {q.type === 'multiple_choice' ? (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-muted mb-1">
                        Enunciado da Questão
                      </label>
                      <textarea
                        rows={3}
                        value={q.statement}
                        onChange={(e) => handleUpdateMCQuestion(q.id, 'statement', e.target.value)}
                        placeholder="Digite o enunciado completo da questão..."
                        className="w-full bg-background border border-border rounded-xl p-3 text-xs text-foreground focus:outline-none focus:border-primary resize-y leading-relaxed"
                      />
                    </div>

                    <div className="space-y-2 pt-1">
                      <label className="block text-[11px] font-semibold text-muted">
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
                                  ? 'bg-primary/10 border-primary/40 text-foreground'
                                  : 'bg-background border-border text-muted'
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
                                  <span className={`text-[10px] font-bold ${isCorrect ? 'text-primary' : 'text-[#869486]'}`}>
                                    Opção {letter} {isCorrect && '• (Correta)'}
                                  </span>
                                </div>
                                <textarea
                                  rows={2}
                                  value={opt}
                                  onChange={(e) => handleUpdateMCOption(q.id, optIdx, e.target.value)}
                                  placeholder={`Texto da opção ${letter}...`}
                                  className="w-full bg-surface border border-border rounded-lg p-2 sm:p-2.5 text-xs text-foreground focus:outline-none focus:border-primary resize-y leading-relaxed"
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
                      <label className="block text-[11px] font-semibold text-muted mb-1">
                        Enunciado ou Proposta de Redação
                      </label>
                      <textarea
                        rows={3}
                        value={q.statement}
                        onChange={(e) => handleUpdateEssayQuestion(q.id, 'statement', e.target.value)}
                        placeholder="Enunciado ou tema da proposta de redação..."
                        className="w-full bg-background border border-border rounded-xl p-3 text-xs text-foreground focus:outline-none focus:border-primary resize-y leading-relaxed"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-muted mb-1">
                        Palavras-chave de Atenção
                      </label>
                      <textarea
                        rows={2}
                        value={q.keywords || ''}
                        onChange={(e) => handleUpdateEssayQuestion(q.id, 'keywords', e.target.value)}
                        placeholder="Palavras-chave de atenção (separadas por vírgula)..."
                        className="w-full bg-background border border-border rounded-xl p-3 text-xs text-foreground focus:outline-none focus:border-primary resize-y leading-relaxed"
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Submit Actions */}
          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2.5 sm:gap-3 pt-4 border-t border-border sticky bottom-0 bg-background sm:bg-background/95 backdrop-blur-md py-3 -mx-3.5 px-3.5 sm:-mx-6 sm:px-6 md:-mx-8 md:px-8 z-20">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-5 py-2.5 rounded-full text-xs font-bold text-muted hover:text-foreground hover:bg-surface-hover transition-colors cursor-pointer text-center"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="w-full sm:w-auto px-6 py-2.5 bg-primary hover:bg-primary-hover text-white font-bold rounded-full text-xs transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer active:scale-95"
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
