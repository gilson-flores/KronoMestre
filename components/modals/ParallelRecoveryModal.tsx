'use client';

import React, { useState } from 'react';
import {
  X,
  Sparkles,
  RotateCcw,
  BookOpen,
  HelpCircle,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Layers,
  FileText,
  Lightbulb,
  Users,
  Filter,
  Check,
  ChevronDown,
  ChevronUp,
  Award,
} from 'lucide-react';
import { Activity, ActivityQuestion, StudentUser } from '@/lib/types';
import {
  createParallelRecoveryActivity,
  canStudentAccessActivity,
  getSubmissionTotalGrade,
} from '@/lib/studentUtils';

interface ParallelRecoveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  parentActivity: Activity | null;
  onCreateActivity: (activity: Activity) => void;
  students?: StudentUser[];
  activities?: Activity[];
}

export const ParallelRecoveryModal: React.FC<ParallelRecoveryModalProps> = ({
  isOpen,
  onClose,
  parentActivity,
  onCreateActivity,
  students = [],
  activities = [],
}) => {
  const [prevParentId, setPrevParentId] = useState<string | null>(null);
  const [approachType, setApproachType] = useState<
    'practical_cases' | 'step_by_step_guided' | 'conceptual_reinforcement' | 'custom'
  >('practical_cases');
  const [customApproach, setCustomApproach] = useState('');
  const [deadline, setDeadline] = useState('');
  const [recoveryTitle, setRecoveryTitle] = useState('');
  const [recoveryDescription, setRecoveryDescription] = useState('');
  const [recoveryApproachSummary, setRecoveryApproachSummary] = useState('');
  const [questions, setQuestions] = useState<ActivityQuestion[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filtro de turmas específicas da atividade vinculada
  const parentTurmaRaw = parentActivity?.turma || '';
  const parentTurmasList = parentTurmaRaw
    ? parentTurmaRaw
        .split(/[,;]+/)
        .map((t) => t.trim())
        .filter(Boolean)
    : [];

  const [selectedTurmas, setSelectedTurmas] = useState<string[]>([]);
  const [isEligibleListExpanded, setIsEligibleListExpanded] = useState<boolean>(true);

  // Sync state when parentActivity changes (render phase state adjustment)
  if (parentActivity && parentActivity.id !== prevParentId) {
    setPrevParentId(parentActivity.id);
    const cleanTitle = parentActivity.title.replace(/^\[(PNE.*?|Recuperação.*?)\]\s*/i, '');
    setRecoveryTitle(`[Recuperação Paralela] ${cleanTitle}`);
    setRecoveryDescription(
      `Avaliação de Recuperação Paralela vinculada à atividade "${cleanTitle}". Abordagem pedagógica alternativa para consolidação da aprendizagem e reavaliação de competências.`
    );
    setDeadline(parentActivity.deadline || '');
    setQuestions(parentActivity.questions || []);
    setApproachType('practical_cases');
    setCustomApproach('');
    setRecoveryApproachSummary('Estudos de caso e aplicações práticas do cotidiano');
    setErrorMessage(null);
    setSelectedTurmas(parentTurmasList.length > 0 ? parentTurmasList : [parentActivity.turma || '']);
  }

  // Alunos elegíveis para a Recuperação Paralela (Nota < 6.0 ou Sem Entrega na atividade mãe)
  const activeTurmas = selectedTurmas.length > 0 ? selectedTurmas : parentTurmasList;
  const parentSubmissions = parentActivity?.submissions || [];

  const eligibleStudentsData = React.useMemo(() => {
    if (!parentActivity || !students || students.length === 0) return [];

    // Alunos matriculados nas turmas filtradas
    const enrolledStudents = students.filter((st) =>
      activeTurmas.some((t) => canStudentAccessActivity(t, st.turma))
    );

    const submissionMap = new Map<string, { sub: any; score: number }>();

    parentSubmissions.forEach((sub) => {
      const score = getSubmissionTotalGrade(sub);
      const stKey = sub.studentId || sub.matricula;
      if (stKey) {
        submissionMap.set(stKey, { sub, score });
      }
    });

    return enrolledStudents
      .map((st) => {
        const found = submissionMap.get(st.id) || (st.matricula ? submissionMap.get(st.matricula) : undefined);
        const hasSubmitted = Boolean(found);
        const originalScore = found ? found.score : null;
        const isBelowAverage = hasSubmitted && typeof originalScore === 'number' && originalScore < 6.0;
        const isMissing = !hasSubmitted;

        return {
          student: st,
          hasSubmitted,
          originalScore,
          isBelowAverage,
          isMissing,
          eligible: isBelowAverage || isMissing,
        };
      })
      .filter((item) => item.eligible)
      .sort((a, b) => {
        // Ordena: primeiro os que tiraram nota baixa (menor nota primeiro), depois os sem entrega
        if (a.isBelowAverage && b.isBelowAverage) {
          return (a.originalScore ?? 0) - (b.originalScore ?? 0);
        }
        if (a.isBelowAverage) return -1;
        if (b.isBelowAverage) return 1;
        return a.student.fullName.localeCompare(b.student.fullName);
      });
  }, [parentActivity, students, activeTurmas, parentSubmissions]);

  if (!isOpen || !parentActivity) return null;

  const handleGenerateAiApproach = async () => {
    setIsGenerating(true);
    setErrorMessage(null);

    try {
      const response = await fetch('/api/gemini/create-parallel-recovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: parentActivity.title,
          subject: parentActivity.subject || 'Sociologia',
          description: parentActivity.description || '',
          turma: parentActivity.turma || '',
          questions: parentActivity.questions || [],
          maxGrade: parentActivity.maxGrade || 10,
          approachType,
          customApproach: approachType === 'custom' ? customApproach : undefined,
        }),
      });

      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data.error || 'Erro ao gerar recuperação paralela via IA.');
      }

      if (data.recoveryTitle) setRecoveryTitle(data.recoveryTitle);
      if (data.recoveryDescription) setRecoveryDescription(data.recoveryDescription);
      if (data.recoveryApproach) setRecoveryApproachSummary(data.recoveryApproach);
      if (Array.isArray(data.questions) && data.questions.length > 0) {
        setQuestions(data.questions);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Falha na geração com IA. Você pode editar manualmente abaixo.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveRecovery = () => {
    if (!recoveryTitle.trim()) {
      setErrorMessage('Por favor, informe o título da recuperação paralela.');
      return;
    }

    const chosenTurma = selectedTurmas.length > 0 ? selectedTurmas.join(', ') : parentActivity.turma;

    const newRecoveryAct = createParallelRecoveryActivity(parentActivity, {
      recoveryTitle: recoveryTitle.trim(),
      recoveryDescription: recoveryDescription.trim(),
      recoveryApproach: recoveryApproachSummary || 'Abordagem Pedagógica Diferenciada',
      deadline: deadline || parentActivity.deadline,
      turma: chosenTurma,
      questions,
    });

    onCreateActivity(newRecoveryAct);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-fadeIn">
      <div className="w-full max-w-3xl bg-surface rounded-3xl border border-white/15 p-5 sm:p-7 space-y-6 shadow-2xl relative my-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/15 text-primary rounded-2xl border border-primary/30 shadow-inner">
              <RotateCcw className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-foreground">Criar Recuperação Paralela</h3>
                <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30">
                  Abordagem Diferente
                </span>
              </div>
              <p className="text-xs text-muted">
                Vinculada à avaliação raiz <strong className="text-foreground">&quot;{parentActivity.title}&quot;</strong> (Turma {parentActivity.turma}).
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-muted hover:text-foreground rounded-full hover:bg-surface-hover transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Warning / Pedagogical Rule Banner */}
        <div className="p-3.5 rounded-2xl bg-surface border border-primary/20 flex items-start gap-3">
          <Lightbulb className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div className="text-xs text-muted space-y-1">
            <p className="font-semibold text-foreground">Regra de Ouro do Engajamento da Turma:</p>
            <p>
              A recuperação paralela fica vinculada à atividade raiz. O aluno que não fez a primeira avaliação e entregar a recuperação{' '}
              <strong className="text-primary">terá sua entrega considerada no número geral e na taxa de conclusão da turma</strong>.
            </p>
          </div>
        </div>

        {/* Error message */}
        {errorMessage && (
          <div className="p-3 bg-rose-100 border border-rose-200 rounded-2xl text-xs text-rose-600 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Target Turmas Filter (Filtro para Turmas da Avaliação Vinculada) */}
        {parentTurmasList.length > 1 && (
          <div className="p-3.5 bg-surface rounded-2xl border border-border space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Filter className="w-4 h-4 text-primary" />
                <span>Filtrar Turmas da Recuperação (Origem: {parentActivity.turma}):</span>
              </label>
              <span className="text-[11px] text-muted">
                {selectedTurmas.length} de {parentTurmasList.length} turma(s) selecionada(s)
              </span>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              {parentTurmasList.map((t) => {
                const isSelected = selectedTurmas.includes(t);
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      if (isSelected) {
                        // Don't allow deselecting all
                        if (selectedTurmas.length > 1) {
                          setSelectedTurmas((prev) => prev.filter((item) => item !== t));
                        }
                      } else {
                        setSelectedTurmas((prev) => [...prev, t]);
                      }
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
                      isSelected
                        ? 'bg-primary/20 text-primary border-primary/40 shadow-sm'
                        : 'bg-[#171f33] text-muted border-border hover:text-foreground'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-current opacity-80" />
                    <span>Turma {t}</span>
                    {isSelected && <Check className="w-3.5 h-3.5" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Suggested Eligible Students (< 6.0 ou Sem Entrega) */}
        <div className="rounded-2xl border border-border bg-surface/80 overflow-hidden">
          <div
            onClick={() => setIsEligibleListExpanded(!isEligibleListExpanded)}
            className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-surface-hover/60 transition-colors"
          >
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-amber-500/20 text-amber-600 rounded-lg">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-foreground">
                    Alunos Sugeridos para Recuperação Paralela
                  </h4>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600 border border-amber-500/30">
                    {eligibleStudentsData.length} aluno(s) elegível(is)
                  </span>
                </div>
                <p className="text-[11px] text-muted">
                  Alunos com nota inferior a 6.0 ou que não entregaram a avaliação mãe &quot;{parentActivity.title}&quot;.
                </p>
              </div>
            </div>
            <button
              type="button"
              className="p-1.5 text-muted hover:text-foreground rounded-lg transition-colors"
            >
              {isEligibleListExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>

          {isEligibleListExpanded && (
            <div className="p-3 border-t border-border bg-black/20 space-y-2">
              {eligibleStudentsData.length === 0 ? (
                <div className="text-center py-4 text-xs text-muted">
                  Nenhum aluno com nota abaixo de 6.0 ou pendente de entrega identificado nesta turma.
                </div>
              ) : (
                <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1">
                  {eligibleStudentsData.map(({ student, isBelowAverage, originalScore, isMissing }) => (
                    <div
                      key={student.id}
                      className="p-2 bg-surface rounded-xl border border-border flex items-center justify-between text-xs gap-2"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-[10px] shrink-0">
                          {student.fullName.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground truncate">{student.fullName}</p>
                          <p className="text-[10px] text-muted">
                            Turma {student.turma} • Matrícula {student.matricula || student.id.slice(0, 6)}
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-2">
                        {isBelowAverage ? (
                          <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-600 border border-rose-200 font-extrabold text-[10px] flex items-center gap-1">
                            <Award className="w-3 h-3" />
                            Nota {originalScore?.toFixed(1)} (&lt; 6.0)
                          </span>
                        ) : isMissing ? (
                          <span className="px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-600 border border-amber-500/30 font-semibold text-[10px]">
                            Sem Entrega na Avaliação Mãe
                          </span>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Approach Selection & AI Generation */}
        <div className="space-y-3 bg-surface/60 p-4 rounded-2xl border border-border">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-amber-400" />
              <span>Escolha a Abordagem Pedagógica Diferenciada:</span>
            </label>
            <button
              type="button"
              onClick={handleGenerateAiApproach}
              disabled={isGenerating}
              className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-emerald-500 hover:from-amber-400 hover:to-emerald-400 text-[#09101d] font-extrabold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              <span>{isGenerating ? 'Gerando Abordagem...' : '✨ Gerar Questões via IA'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <button
              type="button"
              onClick={() => setApproachType('practical_cases')}
              className={`p-3 rounded-xl border text-left transition-all ${
                approachType === 'practical_cases'
                  ? 'bg-[#1d273d] border-primary text-foreground shadow-md'
                  : 'bg-[#171f33] border-border text-muted hover:border-border'
              }`}
            >
              <div className="text-xs font-bold text-foreground mb-1">🏢 Estudos de Caso</div>
              <div className="text-[11px] leading-tight">Foco em situações práticas e dilemas do cotidiano.</div>
            </button>

            <button
              type="button"
              onClick={() => setApproachType('step_by_step_guided')}
              className={`p-3 rounded-xl border text-left transition-all ${
                approachType === 'step_by_step_guided'
                  ? 'bg-[#1d273d] border-primary text-foreground shadow-md'
                  : 'bg-[#171f33] border-border text-muted hover:border-border'
              }`}
            >
              <div className="text-xs font-bold text-foreground mb-1">🪜 Raciocínio Guiado</div>
              <div className="text-[11px] leading-tight">Roteiro passo a passo com perguntas reflexivas.</div>
            </button>

            <button
              type="button"
              onClick={() => setApproachType('conceptual_reinforcement')}
              className={`p-3 rounded-xl border text-left transition-all ${
                approachType === 'conceptual_reinforcement'
                  ? 'bg-[#1d273d] border-primary text-foreground shadow-md'
                  : 'bg-[#171f33] border-border text-muted hover:border-border'
              }`}
            >
              <div className="text-xs font-bold text-foreground mb-1">🎯 Reforço Conceitual</div>
              <div className="text-[11px] leading-tight">Foco nas ideias-chave e conceitos essenciais.</div>
            </button>
          </div>

          {approachType === 'custom' && (
            <textarea
              value={customApproach}
              onChange={(e) => setCustomApproach(e.target.value)}
              placeholder="Instruções personalizadas do professor sobre como abordar a recuperação..."
              className="w-full bg-[#0a0f1d] border border-white/15 rounded-xl p-3 text-xs text-foreground placeholder-slate-500 focus:outline-none focus:border-primary"
              rows={2}
            />
          )}
        </div>

        {/* Basic Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-muted block mb-1">Título da Recuperação</label>
            <input
              type="text"
              value={recoveryTitle}
              onChange={(e) => setRecoveryTitle(e.target.value)}
              className="w-full bg-surface border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted block mb-1">Prazo de Entrega</label>
            <input
              type="text"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              placeholder="Ex: Sexta, 23:59"
              className="w-full bg-surface border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary"
            />
          </div>
        </div>

        {/* Questions Preview */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-primary" />
              <span>Questões da Recuperação ({questions.length})</span>
            </h4>
            <span className="text-[11px] text-muted">
              {questions.filter((q) => q.type === 'multiple_choice').length} Objetivas |{' '}
              {questions.filter((q) => q.type === 'essay').length} Dissertativas
            </span>
          </div>

          <div className="max-h-56 overflow-y-auto space-y-2.5 pr-1">
            {questions.map((q, idx) => (
              <div key={q.id || idx} className="p-3 bg-surface rounded-xl border border-border space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-primary">
                    Questão {idx + 1} ({q.type === 'multiple_choice' ? 'Objetiva' : 'Dissertativa'})
                  </span>
                </div>
                <p className="text-xs text-foreground">{q.statement || 'Enunciado da questão'}</p>
                {q.type === 'multiple_choice' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 mt-1 text-[11px] text-muted">
                    {q.options.map((opt, oIdx) => (
                      <div
                        key={oIdx}
                        className={`p-1.5 rounded-lg border ${
                          q.correctOptionIndex === oIdx
                            ? 'bg-primary/15 border-primary/40 text-primary font-bold'
                            : 'bg-black/20 border-border'
                        }`}
                      >
                        {String.fromCharCode(65 + oIdx)}) {opt}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-full text-xs font-bold text-muted hover:text-foreground hover:bg-surface-hover transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSaveRecovery}
            className="px-6 py-2.5 bg-primary hover:bg-primary-hover text-white font-bold rounded-full text-xs flex items-center gap-2 transition-all shadow-lg shadow-primary/20 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Salvar e Vincular Recuperação</span>
          </button>
        </div>
      </div>
    </div>
  );
};
