'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useLocalDraft } from '@/hooks/use-local-draft';
import { CheckCircle2, RotateCcw } from 'lucide-react';

interface CorrectionsViewProps {
  submissions: any[];
  activities: any[];
  students: any[];
  onSaveCorrection: (submissionId: string, grade: number, feedback: string) => Promise<void>;
}

export default function CorrectionsView({
  submissions = [],
  activities = [],
  students = [],
  onSaveCorrection,
}: CorrectionsViewProps) {
  
  // 1. Unifica os dados cruzando Entregas + Alunos + Atividades para evitar crash
  const enrichedSubmissions = useMemo(() => {
    return submissions.map(sub => {
      const student = students.find(s => s.id === sub.student_id) || {};
      const activity = activities.find(a => a.id === sub.activity_id) || {};
      
      return {
        ...sub,
        student_name: student.name || 'Aluno Desconhecido',
        turma: student.turma || 'Sem Turma',
        is_pne: student.is_pne || false,
        activity_title: activity.title || 'Atividade Excluída',
        activity_type: activity.type || 'Atividade Regular',
      };
    });
  }, [submissions, students, activities]);

  const [selectedId, setSelectedId] = useState<string | null>(
    enrichedSubmissions.length > 0 ? enrichedSubmissions[0].id : null
  );

  const [filterTurma, setFilterTurma] = useState<string>('todas');
  const [filterStatus, setFilterStatus] = useState<string>('pending');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [gradeInput, setGradeInput] = useState<string>('');

  // 2. Localiza a submissão ativa com segurança
  const activeSubmission = useMemo(() => {
    return enrichedSubmissions.find((s) => s.id === selectedId) || null;
  }, [enrichedSubmissions, selectedId]);

  // 3. Hook de Autosave Local (Anti-perda de dados)
  const draftKey = activeSubmission ? `draft_feedback_${activeSubmission.id}` : 'temp_draft';
  const {
    draft: feedbackText,
    setDraft: setFeedbackText,
    hasDraft,
    clearDraft,
  } = useLocalDraft<string>({
    key: draftKey,
    initialValue: activeSubmission?.feedback || '',
    debounceMs: 400,
  });

  // Atualiza os inputs quando o professor clica em outro aluno
  useEffect(() => {
    if (activeSubmission) {
      setGradeInput(activeSubmission.grade !== null && activeSubmission.grade !== undefined ? String(activeSubmission.grade) : '');
      setFeedbackText(activeSubmission.feedback || '');
    }
  }, [activeSubmission?.id]);

  const turmasDisponiveis = useMemo(() => {
    const list = Array.from(new Set(enrichedSubmissions.map((s) => s.turma).filter(Boolean)));
    return list.sort();
  }, [enrichedSubmissions]);

  const filteredSubmissions = useMemo(() => {
    return enrichedSubmissions.filter((s) => {
      const matchTurma = filterTurma === 'todas' || s.turma === filterTurma;
      const matchStatus =
        filterStatus === 'todos' ||
        (filterStatus === 'pending' && s.status === 'pending') ||
        (filterStatus === 'graded' && s.status === 'graded');
      return matchTurma && matchStatus;
    });
  }, [enrichedSubmissions, filterTurma, filterStatus]);

  const handleSelectSubmission = (sub: any) => {
    setSelectedId(sub.id);
  };

  const handleConfirmCorrection = async () => {
    if (!activeSubmission) return;

    const parsedGrade = parseFloat(gradeInput.replace(',', '.'));
    if (isNaN(parsedGrade) || parsedGrade < 0 || parsedGrade > 10) {
      alert('Por favor, insira uma nota válida entre 0,0 e 10,0.');
      return;
    }

    try {
      setIsSubmitting(true);
      if (onSaveCorrection) {
        await onSaveCorrection(activeSubmission.id, parsedGrade, feedbackText);
      }
      clearDraft(); 
      alert('Avaliação consolidada com sucesso no sistema.');
    } catch (err: any) {
      console.error('Falha ao registrar correção:', err);
      alert('Não foi possível gravar no servidor. Seu texto continua salvo no aparelho.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-6 text-slate-100 min-h-[calc(100vh-80px)] flex flex-col gap-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Mesa de Correções</h1>
          <p className="text-sm text-slate-400 mt-1">
            Fila ativa de produções, tarefas adaptadas e recuperações.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={filterTurma}
            onChange={(e) => setFilterTurma(e.target.value)}
            className="h-11 px-3.5 bg-slate-900 border border-slate-750 rounded-xl text-sm font-medium text-slate-200 focus:ring-2 focus:ring-amber-500 focus:outline-none"
          >
            <option value="todas">Todas as Turmas</option>
            {turmasDisponiveis.map((t) => (
              <option key={t as string} value={t as string}>Turma {t as string}</option>
            ))}
          </select>

          <div className="flex bg-slate-900 p-1 border border-slate-800 rounded-xl h-11">
            <button
              onClick={() => setFilterStatus('pending')}
              className={`px-3.5 h-full rounded-lg text-xs font-semibold transition-all ${
                filterStatus === 'pending'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Pendentes
            </button>
            <button
              onClick={() => setFilterStatus('graded')}
              className={`px-3.5 h-full rounded-lg text-xs font-semibold transition-all ${
                filterStatus === 'graded'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Corrigidas
            </button>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 items-start">
        <aside className="lg:col-span-4 bg-slate-900/90 border border-slate-800 rounded-2xl p-3 flex flex-col gap-2 max-h-[780px] overflow-y-auto">
          <div className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Alunos aguardando avaliação ({filteredSubmissions.length})
          </div>

          {filteredSubmissions.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-sm">
              Nenhuma entrega encontrada para o filtro selecionado.
            </div>
          ) : (
            filteredSubmissions.map((sub) => {
              const isSelected = sub.id === selectedId;
              return (
                <button
                  key={sub.id}
                  onClick={() => handleSelectSubmission(sub)}
                  className={`w-full text-left p-3.5 rounded-xl border transition-all min-h-[64px] flex flex-col justify-between ${
                    isSelected
                      ? 'bg-slate-800 border-amber-500/80 shadow-lg shadow-black/40 ring-1 ring-amber-500/50'
                      : 'bg-slate-950/40 border-slate-850 hover:bg-slate-850/60 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-sm text-slate-100 truncate">
                      {sub.student_name}
                    </span>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      {sub.turma}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 mt-2 text-xs">
                    <span className="text-slate-400 truncate max-w-[180px]">
                      {sub.activity_title}
                    </span>
                    {sub.grade !== null && sub.grade !== undefined && (
                      <span className="text-xs font-mono font-bold text-emerald-400">
                        {Number(sub.grade).toFixed(1)}
                      </span>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </aside>

        <main className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col gap-6 shadow-xl">
          {activeSubmission ? (
            <>
              <div className="flex flex-col border-b border-slate-800/80 pb-4">
                <span className="text-xs font-mono uppercase tracking-widest text-amber-400">
                  Turma {activeSubmission.turma} • {activeSubmission.activity_type}
                </span>
                <h2 className="text-xl font-bold text-white mt-1">
                  {activeSubmission.student_name}
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Atividade: {activeSubmission.activity_title} • Enviado em:{' '}
                  {activeSubmission.submitted_at ? new Date(activeSubmission.submitted_at).toLocaleDateString('pt-BR') : 'Data não registrada'}
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Produção Textual do Estudante
                </span>
                <div className="bg-slate-950 p-5 rounded-xl border border-slate-800/90 text-slate-200 font-serif text-base leading-relaxed whitespace-pre-wrap max-h-[380px] overflow-y-auto">
                  {activeSubmission.content || (
                    <span className="text-slate-600 italic">O aluno enviou a tarefa em branco.</span>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-3 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                    Devolutiva Pedagógica & Parecer
                  </span>
                  {hasDraft && (
                    <div className="flex items-center gap-2 text-xs text-amber-300/90 bg-amber-500/10 px-2.5 py-1 rounded-md border border-amber-500/20">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Rascunho salvo no aparelho</span>
                      <button
                        type="button"
                        onClick={clearDraft}
                        className="underline text-slate-400 hover:text-slate-200 ml-1"
                      >
                        <RotateCcw className="w-3 h-3 inline mr-1" />
                        Descartar
                      </button>
                    </div>
                  )}
                </div>

                <textarea
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="Escreva aqui apontamentos formativos, pontos fortes e recomendações ao aluno..."
                  rows={4}
                  className="w-full p-4 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500/70 resize-none"
                />

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mt-2 bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                  <div className="flex items-center gap-3">
                    <label className="text-xs font-semibold text-slate-300">
                      Nota Final (0 a 10):
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={gradeInput}
                      onChange={(e) => setGradeInput(e.target.value)}
                      placeholder="Ex: 8.5"
                      className="w-24 h-12 px-3 bg-slate-900 border border-slate-700 rounded-lg text-center font-mono text-base font-bold text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={handleConfirmCorrection}
                    className="h-12 px-6 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold text-sm rounded-xl transition-all shadow-md shadow-amber-500/10 disabled:opacity-50 flex items-center justify-center"
                  >
                    {isSubmitting ? 'Gravando no Sistema...' : 'Salvar e Lançar Nota'}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="py-24 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
              <span className="text-base font-medium text-slate-400">Nenhuma redação selecionada</span>
              <span className="text-xs">Selecione um aluno na lista ao lado para iniciar a conferência.</span>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
