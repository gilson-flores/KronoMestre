'use client';
import React from 'react';
import {
  ChevronLeft,
  CheckCircle2,
  BookOpen,
  Link2,
  ExternalLink,
  UserPlus,
  Video,
  FileText,
  MessageSquare,
  Award,
  RotateCcw,
} from 'lucide-react';
import { isActivityKronoGame } from '@/lib/studentUtils';
import { DebatePaperlessView } from '@/components/views/DebatePaperlessView';
import { KronoGamePlayer } from '@/components/views/KronoGamePlayer';
import {
  extractLinksFromText,
  formatSubmissionAnswerForDisplay,
} from './studentPortalUtils';

const SafeKronoGamePlayer: any = KronoGamePlayer;

export const StudentActivityExecutionView: React.FC<any> = (props) => {
  const {
    executingActivity,
    setExecutingActivity,
    mySubmissionsMap,
    activeStudent,
    rosterStudents,
    onSaveActivity,
    onUpdateActivity,
    onSubmitAnswer,
    showNotice,
    studentTurmaStd,
    classmateDropdownValue,
    setClassmateDropdownValue,
    eligibleClassmates,
    selectedGroupNames,
    setSelectedGroupNames,
    selectedObjective,
    setSelectedObjective,
    essayResponses,
    setEssayResponses,
    generalEssayText,
    setGeneralEssayText,
    isSubmitting,
    handleConfirmSubmitActivity,
  } = props;

  if (!executingActivity) return null;

  const isDebate =
    executingActivity.gameMode === 'debate_paperless' ||
    Boolean(executingActivity.gameData?.debateConfig);
  const isGame = isActivityKronoGame(executingActivity) || Boolean(executingActivity.gameData && Array.isArray(executingActivity.gameData.stages) && executingActivity.gameData.stages.length > 0);
  const myExistingSub = mySubmissionsMap.get(executingActivity.id);

  if (isDebate) {
    return (
      <div className="min-h-screen bg-background text-foreground p-3 sm:p-6">
        <div className="max-w-5xl mx-auto space-y-4">
          <button
            type="button"
            onClick={() => setExecutingActivity(null)}
            className="px-3.5 py-2 rounded-xl bg-surface hover:bg-surface-hover border border-emerald-800/60 text-xs font-semibold text-emerald-300/90 flex items-center gap-1.5 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Voltar para Minhas Atividades</span>
          </button>

          <DebatePaperlessView
            activity={executingActivity}
            debateConfig={executingActivity.gameData?.debateConfig}
            student={activeStudent}
            currentStudent={activeStudent}
            students={rosterStudents}
            allStudents={rosterStudents}
            role="student"
            isTeacher={false}
            onSaveActivity={onSaveActivity}
            onUpdateActivity={onUpdateActivity}
            onSubmitAnswer={onSubmitAnswer}
            onClose={() => setExecutingActivity(null)}
          />
        </div>
      </div>
    );
  }

  if (isGame && executingActivity.gameData) {
    return (
      <div className="min-h-screen bg-background text-foreground p-3 sm:p-6">
        <div className="max-w-4xl mx-auto space-y-4">
          <button
            type="button"
            onClick={() => setExecutingActivity(null)}
            className="px-3.5 py-2 rounded-xl bg-surface hover:bg-surface-hover border border-emerald-800/60 text-xs font-semibold text-emerald-300/90 flex items-center gap-1.5 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Voltar para Minhas Atividades</span>
          </button>

          <SafeKronoGamePlayer
            activity={executingActivity}
            gameData={executingActivity.gameData}
            gameMode={executingActivity.gameMode || 'classic'}
            title={executingActivity.title}
            student={activeStudent}
            currentStudent={activeStudent}
            students={rosterStudents}
            onClose={() => setExecutingActivity(null)}
            onFinishGame={async (score: number, groupCsv?: string) => {
              if (onSubmitAnswer) {
                await onSubmitAnswer(
                  executingActivity.id,
                  activeStudent.id,
                  `[KronoGames • ${executingActivity.title}] Pontuação ${score}.`,
                  score,
                  executingActivity.maxGrade || 10,
                  0,
                  {},
                  groupCsv
                );
              }
              showNotice('Jogo concluído e pontuação registrada!');
              setExecutingActivity(null);
            }}
          />
        </div>
      </div>
    );
  }

  const rawQuestions: any[] = Array.isArray(executingActivity.questions)
    ? executingActivity.questions
    : [];
  const objQuestions: any[] = rawQuestions.filter((q: any) => q.type !== 'essay');
  const essayQuestions: any[] = [
    ...(Array.isArray((executingActivity as any).essayQuestions)
      ? (executingActivity as any).essayQuestions
      : []),
    ...rawQuestions.filter((q: any) => q.type === 'essay'),
  ];
  const embeddedLinks = [
    ...extractLinksFromText(executingActivity.supportMaterial),
    ...extractLinksFromText(executingActivity.description),
  ];

  const maxGradeVal = executingActivity.maxGrade || 10;
  const subTotalGrade = myExistingSub
    ? Math.min(
        maxGradeVal,
        Number(myExistingSub.objectiveScore || 0) +
          Number(myExistingSub.essayScore || 0) +
          Number(myExistingSub.extraPoints || 0)
      )
    : null;

  const isReturnedForRedo = myExistingSub?.status === 'returned';
  const canEditSubmission = !myExistingSub || isReturnedForRedo;
  const teacherFeedbackText = String(
    myExistingSub?.teacherFeedback || (myExistingSub as any)?.feedback || ''
  ).trim();

  return (
    <div className="min-h-screen bg-background text-foreground pb-24">
      <header className="sticky top-0 z-30 h-14 bg-surface/95 backdrop-blur-md border-b border-border px-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setExecutingActivity(null)}
          className="px-3 py-1.5 rounded-lg bg-background border border-border text-xs font-semibold text-foreground flex items-center gap-1.5 cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Voltar</span>
        </button>

        <div className="text-center min-w-0 px-2">
          <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-300/90 block">
            Turma {studentTurmaStd} • {String(executingActivity.type || 'Atividade')}
          </span>
          <h2 className="text-xs sm:text-sm font-bold text-foreground truncate">
            {executingActivity.title}
          </h2>
        </div>

        <span className="px-2.5 py-1 rounded-md bg-emerald-950/60 border border-emerald-800/50 text-emerald-300/90 font-mono text-xs font-bold shrink-0">
          Val: {maxGradeVal} pts
        </span>
      </header>

      <main className="max-w-2xl mx-auto p-4 space-y-5">
        {/* 1. PAINEL DE NOTA, FEEDBACK DO PROFESSOR E RESPOSTA ENTREGUE */}
        {myExistingSub && (
          <section className="p-4 sm:p-5 rounded-2xl bg-emerald-950/35 border border-emerald-800/70 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-emerald-800/40 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-950/80 border border-emerald-700/60 flex items-center justify-center text-emerald-300 shrink-0">
                  {isReturnedForRedo ? (
                    <RotateCcw className="w-5 h-5 text-amber-300" />
                  ) : (
                    <Award className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-200/90 block">
                    {isReturnedForRedo
                      ? 'Atividade Devolvida para Ajustes'
                      : myExistingSub.isPhysicalDelivery
                      ? 'Entrega Física / Analógica Registrada'
                      : 'Resultado & Avaliação do Aluno'}
                  </span>
                  <h3 className="text-sm sm:text-base font-bold text-foreground">
                    {executingActivity.title}
                  </h3>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] font-mono text-emerald-200/90 block">
                  {myExistingSub.submittedAt
                    ? `Entregue em: ${String(myExistingSub.submittedAt)}`
                    : 'Entrega Registrada'}
                </span>
                <span className="px-3.5 py-1.5 rounded-xl bg-emerald-700 text-white font-mono text-xs sm:text-sm font-extrabold inline-block mt-1 shadow-xs">
                  {myExistingSub.status === 'graded' ||
                  (subTotalGrade !== null && subTotalGrade > 0)
                    ? `Sua Nota: ${(subTotalGrade ?? 0).toFixed(1)} / ${maxGradeVal}`
                    : '✓ Entregue (Em Correção)'}
                </span>
              </div>
            </div>

            {(Number(myExistingSub.objectiveScore || 0) > 0 ||
              Number(myExistingSub.essayScore || 0) > 0 ||
              myExistingSub.status === 'graded') && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs font-mono">
                <div className="p-2.5 rounded-xl bg-background/80 border border-border">
                  <span className="text-[10px] text-muted block">Nota Objetivas</span>
                  <strong className="text-emerald-300/90">
                    {Number(myExistingSub.objectiveScore || 0).toFixed(1)} pts
                  </strong>
                </div>
                <div className="p-2.5 rounded-xl bg-background/80 border border-border">
                  <span className="text-[10px] text-muted block">Nota Dissertativa / Redação</span>
                  <strong className="text-emerald-300/90">
                    {Number(myExistingSub.essayScore || 0).toFixed(1)} pts
                  </strong>
                </div>
                {Number(myExistingSub.extraPoints || 0) > 0 && (
                  <div className="p-2.5 rounded-xl bg-background/80 border border-border">
                    <span className="text-[10px] text-muted block">Pontos Extras</span>
                    <strong className="text-emerald-300/80">
                      +{Number(myExistingSub.extraPoints).toFixed(1)} pts
                    </strong>
                  </div>
                )}
              </div>
            )}

            {/* FEEDBACK DO PROFESSOR SEMPRE VISÍVEL COM TÍTULO CLARO */}
            <div className="p-4 rounded-xl bg-background/95 border border-emerald-800/60 space-y-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-300/90 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Parecer / Feedback do Professor:</span>
              </span>
              <p className="text-xs sm:text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                {teacherFeedbackText ||
                  (myExistingSub.status === 'graded'
                    ? 'Atividade avaliada e nota lançada pelo professor.'
                    : 'Sua atividade foi recebida e aguarda o parecer de correção do professor.')}
              </p>
            </div>

            {myExistingSub.essayAnswer && (
              <div className="p-3.5 rounded-xl bg-background/80 border border-border space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted block">
                  Registro da Sua Entrega / Resposta:
                </span>
                <p className="text-xs text-foreground whitespace-pre-wrap leading-relaxed">
                  {formatSubmissionAnswerForDisplay(myExistingSub.essayAnswer)}
                </p>
              </div>
            )}
          </section>
        )}

        {/* 2. ENUNCIADO COMPLETO DA ATIVIDADE (SEMPRE VISÍVEL PARA O ALUNO LER) */}
        <section className="p-4 sm:p-5 rounded-2xl bg-surface border border-border space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-2.5">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-300/90 flex items-center gap-1.5">
              <BookOpen className="w-4 h-4" />
              <span>Enunciado da Atividade & Orientações</span>
            </span>
            <span className="text-[11px] font-mono text-muted">
              {executingActivity.subject || 'Sociologia'}
            </span>
          </div>

          {executingActivity.description ? (
            <div className="space-y-1.5">
              <span className="text-[10px] font-mono uppercase text-muted block">
                Instruções Gerais / Proposta:
              </span>
              <p className="text-xs sm:text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                {executingActivity.description}
              </p>
            </div>
          ) : (
            essayQuestions.length === 0 &&
            objQuestions.length === 0 && (
              <p className="text-xs sm:text-sm text-muted">
                Atividade: <strong className="text-foreground">{executingActivity.title}</strong>
              </p>
            )
          )}

          {essayQuestions.length > 0 && (
            <div className="space-y-3 pt-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-300/90 block">
                Tema / Questões Propostas ({essayQuestions.length}):
              </span>
              {essayQuestions.map((eq: any, eIdx: number) => {
                const statementText = String(
                  eq.statement || eq.text || eq.question || eq.prompt || ''
                ).trim();
                return (
                  <div
                    key={eq.id || eIdx}
                    className="p-3.5 rounded-xl bg-background border border-border space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono font-bold text-emerald-300/90">
                        {String(executingActivity.type || '') === 'Redação'
                          ? `Proposta de Redação ${essayQuestions.length > 1 ? eIdx + 1 : ''}`
                          : `Questão Dissertativa ${eIdx + 1}`}
                      </span>
                      {eq.minCharacters && (
                        <span className="text-[10px] font-mono text-muted">
                          Mín. {eq.minCharacters} caracteres
                        </span>
                      )}
                    </div>
                    <p className="text-xs sm:text-sm font-medium text-foreground whitespace-pre-wrap leading-relaxed">
                      {statementText || executingActivity.title}
                    </p>
                  </div>
                );
              })}
            </div>
          )}

          {executingActivity.supportMaterial && (
            <div className="space-y-1.5 pt-1">
              <span className="text-[10px] font-mono uppercase text-muted block">
                Texto / Material de Apoio:
              </span>
              <div className="p-3.5 rounded-xl bg-background border border-border text-xs sm:text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                {executingActivity.supportMaterial}
              </div>
            </div>
          )}

          {embeddedLinks.length > 0 && (
            <div className="space-y-2 pt-1">
              {embeddedLinks.map((lnk, idx) => (
                <a
                  key={idx}
                  href={lnk}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full p-3 rounded-xl bg-emerald-950/60 hover:bg-emerald-500/25 border border-emerald-800/50 text-emerald-200/90 text-xs font-bold flex items-center justify-between transition-all"
                >
                  <span className="flex items-center gap-2 truncate">
                    <Link2 className="w-4 h-4 shrink-0" />
                    <span className="truncate">Abrir Material / Arquivo no Google Drive</span>
                  </span>
                  <ExternalLink className="w-4 h-4 shrink-0" />
                </a>
              ))}
            </div>
          )}
        </section>

        {/* 3. QUESTÕES OBJETIVAS (COM ENUNCIADO statement CORRETO) */}
        {objQuestions.length > 0 && (
          <section className="space-y-3.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted px-1">
              Questões Objetivas ({objQuestions.length})
            </h3>
            {objQuestions.map((q: any, qIdx: number) => {
              const qStatement = String(
                q.statement || q.text || q.question || q.prompt || ''
              ).trim();
              return (
                <div
                  key={q.id || qIdx}
                  className="p-4 rounded-2xl bg-surface border border-border space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono font-bold text-emerald-300/90">
                      Questão {qIdx + 1}
                    </span>
                    <span className="text-[11px] font-mono text-muted">
                      {q.points || 1} pt(s)
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm font-medium text-foreground whitespace-pre-wrap leading-relaxed">
                    {qStatement}
                  </p>

                  {q.librasVideoUrl && (
                    <a
                      href={q.librasVideoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/50 text-emerald-200/80 text-xs font-semibold"
                    >
                      <Video className="w-3.5 h-3.5" />
                      <span>Assistir Vídeo em Libras</span>
                    </a>
                  )}

                  <div className="space-y-2 pt-1">
                    {(Array.isArray(q.options) ? q.options : []).map(
                      (optText: any, optIdx: number) => {
                        const isSelected = selectedObjective[q.id] === optIdx;
                        const letter = String.fromCharCode(65 + optIdx);
                        return (
                          <button
                            key={optIdx}
                            type="button"
                            disabled={!canEditSubmission}
                            onClick={() =>
                              canEditSubmission &&
                              setSelectedObjective((prev: any) => ({ ...prev, [q.id]: optIdx }))
                            }
                            className={`w-full p-3 rounded-xl border text-left text-xs sm:text-sm transition-all flex items-start gap-3 ${
                              canEditSubmission ? 'cursor-pointer' : 'cursor-default'
                            } ${
                              isSelected
                                ? 'bg-emerald-700/20 border-emerald-700 text-foreground font-semibold'
                                : 'bg-background border-border text-muted'
                            }`}
                          >
                            <span
                              className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-mono font-bold shrink-0 ${
                                isSelected
                                  ? 'bg-emerald-700 text-white'
                                  : 'bg-surface border border-border text-muted'
                              }`}
                            >
                              {letter}
                            </span>
                            <span className="leading-relaxed">{String(optText ?? '')}</span>
                          </button>
                        );
                      }
                    )}
                  </div>
                </div>
              );
            })}
          </section>
        )}

        {/* 4. ÁREA DE RESPOSTA E ENVIO (APENAS SE PENDENTE OU DEVOLVIDA PARA REFAZER) */}
        {canEditSubmission && (
          <>
            {(executingActivity.type === 'Trabalho em grupo' ||
              Boolean((executingActivity as any).isGroupWork)) && (
              <section className="p-4 rounded-2xl bg-surface border border-border space-y-3">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-300/80 block">
                    Atividade em Equipe • Turma {studentTurmaStd}
                  </span>
                  <h3 className="text-sm font-bold text-foreground">
                    Selecione os Integrantes do seu Grupo
                  </h3>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <select
                    value={classmateDropdownValue}
                    onChange={(e) => setClassmateDropdownValue(e.target.value)}
                    className="flex-1 bg-background border border-border rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-foreground focus:outline-none focus:border-emerald-700"
                  >
                    <option value="">
                      Selecionar colega da Turma {studentTurmaStd} ({eligibleClassmates.length} disponíveis)...
                    </option>
                    {eligibleClassmates.map((c: any) => (
                      <option key={c.id} value={c.fullName}>
                        {c.fullName}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={!classmateDropdownValue}
                    onClick={() => {
                      if (
                        classmateDropdownValue &&
                        !selectedGroupNames.includes(classmateDropdownValue)
                      ) {
                        setSelectedGroupNames((prev: any) => [...prev, classmateDropdownValue]);
                        setClassmateDropdownValue('');
                      }
                    }}
                    className="px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>+ Incluir no Grupo</span>
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {selectedGroupNames.map((name: string) => (
                    <span
                      key={name}
                      className="px-3 py-1 rounded-lg bg-background border border-border text-xs font-semibold text-foreground flex items-center gap-2"
                    >
                      <span>{name}</span>
                      {name !== activeStudent.fullName && (
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedGroupNames((prev: any) =>
                              prev.filter((n: string) => n !== name)
                            )
                          }
                          className="text-muted hover:text-rose-400 cursor-pointer"
                        >
                          ✕
                        </button>
                      )}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {essayQuestions.length > 0 ? (
              <section className="space-y-3.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted px-1">
                  Sua Resposta Dissertativa / Redação
                </h3>
                {essayQuestions.map((eq: any, eIdx: number) => {
                  const statementText = String(
                    eq.statement || eq.text || eq.question || eq.prompt || ''
                  ).trim();
                  return (
                    <div
                      key={eq.id || eIdx}
                      className="p-4 rounded-2xl bg-surface border border-border space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-mono font-bold text-emerald-300/90 flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5" />
                          <span>
                            {String(executingActivity.type || '') === 'Redação'
                              ? 'Redigir Texto da Redação'
                              : `Responder Questão ${eIdx + 1}`}
                          </span>
                        </span>
                        <span className="text-[11px] font-mono text-muted">
                          {(essayResponses[eq.id] || '').trim().split(/\s+/).filter(Boolean).length}{' '}
                          palavras
                        </span>
                      </div>
                      {statementText && (
                        <p className="text-xs text-muted whitespace-pre-wrap leading-relaxed">
                          {statementText}
                        </p>
                      )}
                      <textarea
                        rows={7}
                        value={essayResponses[eq.id] || ''}
                        onChange={(e) =>
                          setEssayResponses((prev: any) => ({ ...prev, [eq.id]: e.target.value }))
                        }
                        placeholder="Digite aqui sua resposta com argumentos sociológicos..."
                        className="w-full bg-background border border-border focus:border-emerald-700 rounded-xl p-3.5 text-xs sm:text-sm text-foreground focus:outline-none leading-relaxed"
                      />
                    </div>
                  );
                })}
              </section>
            ) : (
              objQuestions.length === 0 && (
                <section className="p-4 rounded-2xl bg-surface border border-border space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-foreground">
                      {String(executingActivity.type || '') === 'Redação'
                        ? 'Redigir Texto da Redação:'
                        : 'Sua Resposta Dissertativa / Desenvolvimento:'}
                    </label>
                    <span className="text-[11px] font-mono text-muted">
                      {generalEssayText.trim().split(/\s+/).filter(Boolean).length} palavras
                    </span>
                  </div>
                  <textarea
                    rows={8}
                    value={generalEssayText}
                    onChange={(e) => setGeneralEssayText(e.target.value)}
                    placeholder="Desenvolva aqui sua resposta (rascunho salvo automaticamente no aparelho)..."
                    className="w-full bg-background border border-border focus:border-emerald-700 rounded-xl p-3.5 text-xs sm:text-sm text-foreground focus:outline-none leading-relaxed"
                  />
                </section>
              )
            )}

            <div className="pt-2">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleConfirmSubmitActivity}
                className="w-full py-3.5 px-6 rounded-xl bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md cursor-pointer transition-all"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {isSubmitting
                    ? 'Enviando Respostas...'
                    : isReturnedForRedo
                    ? 'Reenviar Atividade Refeita'
                    : 'Finalizar e Enviar Atividade'}
                </span>
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
};
