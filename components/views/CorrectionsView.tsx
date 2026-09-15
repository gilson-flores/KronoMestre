'use client';

import React, { useState, useMemo } from 'react';
import { useLocalDraft } from '@/hooks/use-local-draft';

interface Submission {
  id: string;
  student_id: string;
  student_name: string;
  turma: string;
  activity_id: string;
  activity_title: string;
  activity_type: string;
  submitted_at: string;
  content: string;
  grade?: number | null;
  feedback?: string | null;
  status: 'pending' | 'graded' | 'returned';
  is_pne?: boolean;
  recovery_grade?: number | null;
}

interface CorrectionsViewProps {
  submissions?: Submission[];
  onSaveGrade?: (submissionId: string, grade: number, feedback: string) => Promise<void>;
}

export default function CorrectionsView({
  submissions = [],
  onSaveGrade,
}: CorrectionsViewProps) {
  // Estado da submissão atualmente ativa na tela de correção
  const [selectedId, setSelectedId] = useState<string | null>(
    submissions.length > 0 ? submissions[0].id : null
  );

  const [filterTurma, setFilterTurma] = useState<string>('todas');
  const [filterStatus, setFilterStatus] = useState<string>('pending');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [gradeInput, setGradeInput] = useState<string>('');

  // Localiza a submissão em foco
  const activeSubmission = useMemo(() => {
    return submissions.find((s) => s.id === selectedId) || null;
  }, [submissions, selectedId]);

  // Hook de autosave local (anti-perda de dados) indexado por ID da submissão
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

  // Lista de turmas distintas para filtro rápido
  const turmasDisponiveis = useMemo(() => {
    const list = Array.from(new Set(submissions.map((s) => s.turma).filter(Boolean)));
    return list.sort();
  }, [submissions]);

  // Filtragem de fila de trabalho
  const filteredSubmissions = useMemo(() => {
    return submissions.filter((s) => {
      const matchTurma = filterTurma === 'todas' || s.turma === filterTurma;
      const matchStatus =
        filterStatus === 'todos' ||
        (filterStatus === 'pending' && s.status === 'pending') ||
        (filterStatus === 'graded' && s.status === 'graded');
      return matchTurma && matchStatus;
    });
  }, [submissions, filterTurma, filterStatus]);

  // Sincroniza nota ao alternar de submissão
  const handleSelectSubmission = (sub: Submission) => {
    setSelectedId(sub.id);
    setGradeInput(sub.grade !== null && sub.grade !== undefined ? String(sub.grade) : '');
  };

  // Envio seguro da nota e parecer
  const handleConfirmCorrection = async () => {
    if (!activeSubmission) return;

    const parsedGrade = parseFloat(gradeInput.replace(',', '.'));
    if (isNaN(parsedGrade) || parsedGrade < 0 || parsedGrade > 10) {
      alert('Por favor, insira uma nota válida entre 0,0 e 10,0.');
      return;
    }

    try {
      setIsSubmitting(true);
      if (onSaveGrade) {
        await onSaveGrade(activeSubmission.id, parsedGrade, feedbackText);
      }
      clearDraft(); // Limpa rascunho apenas após confirmação do servidor
      alert('Avaliação consolidada com sucesso no sistema.');
    } catch (err: any) {
      console.error('Falha ao registrar correção:', err);
      alert('Não foi possível gravar no servidor. O rascunho continua seguro no aparelho.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-6 text-slate-100 min-h-[calc(100vh-80px)] flex flex-col gap-6">
      {/* Cabeçalho de Controle de Fluxo */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Mesa de Correções Pedagógicas
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Fila ativa de produções dissertativas, tarefas adaptadas e recuperações paralelas.
          </p>
        </div>

        {/* Filtros em Pílula (Touch-friendly 44px+) */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={filterTurma}
            onChange={(e) => setFilterTurma(e.target.value)}
            className="h-11 px-3.5 bg-slate-900 border border-slate-750 rounded-xl text-sm font-medium text-slate-200 focus:ring-2 focus:ring-amber-500 focus:outline-none"
          >
            <option value="todas">Todas as Turmas</option>
            {turmasDisponiveis.map((t) => (
              <option key={t} value={t}>
                Turma {t}
              </option>
            ))}
          </select>

          <div className="flex bg-slate-900 p-1 border border-slate-800 rounded-xl h-11">
            <button
              type="button"
              onClick={() => setFilterStatus('pending')}
              className={`px-3.5 h-full rounded-lg text-xs font-semibold transition-all ${
                filterStatus === 'pending'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Pendentes ({submissions.filter((s) => s.status === 'pending').length})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('graded')}
              className={`px-3.5 h-full rounded-lg text-xs font-semibold transition-all ${
                filterStatus === 'graded'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Corrigidas
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('todos')}
              className={`px-3.5 h-full rounded-lg text-xs font-semibold transition-all ${
                filterStatus === 'todos'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Todas
            </button>
          </div>
        </div>
      </header>

      {/* Grade Principal: Lista de Chamada à Esquerda + Prancheta de Leitura à Direita */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 items-start">
        {/* Painel Esquerdo: Fila de Entregas (4 colunas) */}
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
                    {sub.is_pne && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-950/60 text-purple-300 border border-purple-800/60">
                        PNE
                      </span>
                    )}
                    {sub.grade !== null && sub.grade !== undefined && (
                      <span className="text-xs font-mono font-bold text-emerald-400">
                        {sub.grade.toFixed(1)}
                      </span>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </aside>

        {/* Painel Direito: Prancheta de Leitura e Atribuição de Nota (8 colunas) */}
        <main className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col gap-6 shadow-xl">
          {activeSubmission ? (
            <>
              {/* Cabeçalho da Atividade Selecionada */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
                <div>
                  <span className="text-xs font-mono uppercase tracking-widest text-amber-400">
                    {activeSubmission.turma} • {activeSubmission.activity_type}
                  </span>
                  <h2 className="text-xl font-bold text-white mt-0.5">
                    {activeSubmission.student_name}
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Atividade: {activeSubmission.activity_title} • Enviado em:{' '}
                    {new Date(activeSubmission.submitted_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>

                {/* Bloco de Comparação de Notas para Fechamento de RCO */}
                {activeSubmission.recovery_grade !== null &&
                  activeSubmission.recovery_grade !== undefined && (
                    <div className="bg-slate-950 px-3.5 py-2 rounded-xl border border-slate-800 flex items-center gap-4 text-xs">
                      <div>
                        <div className="text-slate-500">Regular</div>
                        <div className="font-mono font-bold text-slate-300">
                          {activeSubmission.grade?.toFixed(1) || '—'}
                        </div>
                      </div>
                      <div className="h-6 w-px bg-slate-800" />
                      <div>
                        <div className="text-amber-500">Recuperação</div>
                        <div className="font-mono font-bold text-amber-300">
                          {activeSubmission.recovery_grade.toFixed(1)}
                        </div>
                      </div>
                      <div className="h-6 w-px bg-slate-800" />
                      <div>
                        <div className="text-emerald-500 font-semibold">Válida (RCO)</div>
                        <div className="font-mono font-bold text-emerald-400">
                          {Math.max(
                            activeSubmission.grade || 0,
                            activeSubmission.recovery_grade || 0
                          ).toFixed(1)}
                        </div>
                      </div>
                    </div>
                  )}
              </div>

              {/* Texto da Produção Textual do Aluno */}
              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Produção Textual do Estudante
                </span>
                <div className="bg-slate-950 p-5 rounded-xl border border-slate-800/90 text-slate-200 font-serif text-base leading-relaxed whitespace-pre-wrap max-h-[380px] overflow-y-auto selection:bg-amber-500/30">
                  {activeSubmission.content || (
                    <span className="text-slate-600 italic">
                      Nenhum texto submetido nesta entrega.
                    </span>
                  )}
                </div>
              </div>

              {/* Área de Avaliação do Professor com Autosave */}
              <div className="flex flex-col gap-3 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                    Devolutiva Pedagógica & Parecer ao Aluno
                  </span>
                  {hasDraft && (
                    <div className="flex items-center gap-2 text-xs text-amber-300/90 bg-amber-500/10 px-2.5 py-1 rounded-md border border-amber-500/20">
                      <span>● Rascunho salvo no aparelho</span>
                      <button
                        type="button"
                        onClick={clearDraft}
                        className="underline text-slate-400 hover:text-slate-200"
                      >
                        Descartar
                      </button>
                    </div>
                  )}
                </div>

                <textarea
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="Escreva aqui apontamentos formativos, pontos fortes e recomendações conceituais de Sociologia..."
                  rows={4}
                  className="w-full p-4 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500/70 leading-relaxed resize-none"
                />

                {/* Barra de Ação Inferior: Atribuição de Nota e Gravação */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mt-2 bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                  <div className="flex items-center gap-3">
                    <label
                      htmlFor="notaFinalInput"
                      className="text-xs font-semibold text-slate-300 whitespace-nowrap"
                    >
                      Nota Final (0 a 10):
                    </label>
                    <input
                      id="notaFinalInput"
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
                    className="h-12 px-6 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold text-sm rounded-xl transition-all shadow-md shadow-amber-500/10 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? 'Gravando no Sistema...' : 'Salvar e Lançar Nota'}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="py-24 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
              <span className="text-base font-medium text-slate-400">
                Nenhuma redação selecionada
              </span>
              <span className="text-xs">
                Selecione um aluno na lista ao lado para iniciar a conferência.
              </span>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
