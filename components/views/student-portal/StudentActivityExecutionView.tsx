'use client';
import React from 'react';
import { ChevronLeft, CheckCircle2, BookOpen, Link2, ExternalLink, UserPlus, Video } from 'lucide-react';
import { isActivityKronoGame } from '@/lib/studentUtils';
import { DebatePaperlessView } from '@/components/views/DebatePaperlessView';
import { KronoGamePlayer } from '@/components/views/KronoGamePlayer';
import { extractLinksFromText, formatSubmissionAnswerForDisplay } from './studentPortalUtils';

const SafeKronoGamePlayer: any = KronoGamePlayer;

export const StudentActivityExecutionView: React.FC<any> = (props) => {
  const {
    executingActivity, setExecutingActivity, mySubmissionsMap, activeStudent,
    rosterStudents, onSaveActivity, onUpdateActivity, onSubmitAnswer,
    showNotice, studentTurmaStd, classmateDropdownValue, setClassmateDropdownValue,
    eligibleClassmates, selectedGroupNames, setSelectedGroupNames,
    selectedObjective, setSelectedObjective, essayResponses, setEssayResponses,
    generalEssayText, setGeneralEssayText, isSubmitting, handleConfirmSubmitActivity
  } = props;
  if (executingActivity) {
    const isDebate =
      executingActivity.gameMode === 'debate_paperless' ||
      Boolean(executingActivity.gameData?.debateConfig);
    const isGame = isActivityKronoGame(executingActivity);
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
                    `[KronoGames • ${executingActivity.title}] Missão concluída com pontuação ${score}.`,
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

    const subTotalGrade = myExistingSub
      ? Math.min(
          10,
          Number(myExistingSub.objectiveScore || 0) +
            Number(myExistingSub.essayScore || 0) +
            Number(myExistingSub.extraPoints || 0)
        )
      : null;

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

          <span className="px-2.5 py-1 rounded-md bg-emerald-950/60 border border-emerald-800/50 text-emerald-300/90 font-mono text-xs font-bold">
            Val: {executingActivity.maxGrade || 10} pts
          </span>
        </header>

        <main className="max-w-2xl mx-auto p-4 space-y-5">
          {/* ESPELHO DA ENTREGA & CORREÇÃO DO PROFESSOR */}
          {myExistingSub && (
            <section className="p-4 rounded-2xl bg-emerald-950/35 border border-emerald-800/70 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-800/40 pb-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-300/90 shrink-0" />
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-200/90 block">
                      Atividade Concluída pelo Aluno
                    </span>
                    <h3 className="text-sm font-bold text-foreground">
                      Comprovante de Entrega & Correção
                    </h3>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-mono text-emerald-200/90 block">
                    {String(myExistingSub.submittedAt || 'Registrada')}
                  </span>
                  <span className="px-3 py-1 rounded-lg bg-emerald-700 text-white font-mono text-xs font-extrabold inline-block mt-0.5">
                    {myExistingSub.status === 'graded' ||
                    (subTotalGrade !== null && subTotalGrade > 0)
                      ? `Nota Final: ${(subTotalGrade ?? 0).toFixed(1)} / ${
                          executingActivity.maxGrade || 10
                        }`
                      : '✓ Entregue (Aguardando Correção)'}
                  </span>
                </div>
              </div>

              {(Number(myExistingSub.objectiveScore || 0) > 0 ||
                Number(myExistingSub.essayScore || 0) > 0) && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs font-mono">
                  <div className="p-2.5 rounded-xl bg-background/80 border border-border">
                    <span className="text-[10px] text-muted block">Nota Objetivas</span>
                    <strong className="text-emerald-300/90">
                      {Number(myExistingSub.objectiveScore || 0).toFixed(2)} pts
                    </strong>
                  </div>
                  <div className="p-2.5 rounded-xl bg-background/80 border border-border">
                    <span className="text-[10px] text-muted block">Nota Dissertativas</span>
                    <strong className="text-emerald-300/90">
                      {Number(myExistingSub.essayScore || 0).toFixed(2)} pts
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

              {myExistingSub.groupMembers && (
                <div className="text-xs text-emerald-200/80">
                  <strong>Equipe / Grupo:</strong>{' '}
                  {Array.isArray(myExistingSub.groupMembers)
                    ? myExistingSub.groupMembers.join(', ')
                    : String(myExistingSub.groupMembers)}
                </div>
              )}

              {myExistingSub.teacherFeedback && (
                <div className="p-3.5 rounded-xl bg-background/90 border border-emerald-800/50 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300/90 block">
                    Parecer / Feedback do Professor:
                  </span>
                  <p className="text-xs sm:text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                    {String(myExistingSub.teacherFeedback)}
                  </p>
                </div>
              )}

              {myExistingSub.essayAnswer && (
                <div className="p-3.5 rounded-xl bg-background/80 border border-border space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted block">
                    Suas Respostas Registradas:
                  </span>
                  <p className="text-xs text-foreground whitespace-pre-wrap leading-relaxed font-mono">
                    {formatSubmissionAnswerForDisplay(myExistingSub.essayAnswer)}
                  </p>
                </div>
              )}
            </section>
          )}

          {(executingActivity.description || executingActivity.supportMaterial) && (
            <section className="p-4 rounded-2xl bg-surface border border-border space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-emerald-300/90" />
                  <span>Orientações & Materiais da Aula</span>
                </span>
              </div>

              {executingActivity.description && (
                <p className="text-xs sm:text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                  {executingActivity.description}
                </p>
              )}

              {executingActivity.supportMaterial && (
                <div className="p-3.5 rounded-xl bg-background border border-border text-xs sm:text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                  {executingActivity.supportMaterial}
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
          )}

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
                <p className="text-xs text-muted">
                  Escolha seus colegas na lista suspensa abaixo para que todos recebam a entrega e a nota.
                </p>
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
                          setSelectedGroupNames((prev: any) => prev.filter((n: string) => n !== name))
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

          {objQuestions.length > 0 && (
            <section className="space-y-3.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted px-1">
                Questões Objetivas ({objQuestions.length})
              </h3>
              {objQuestions.map((q: any, qIdx: number) => (
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
                    {String(q.text || q.question || q.prompt || '')}
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
                            onClick={() =>
                              setSelectedObjective((prev: any) => ({ ...prev, [q.id]: optIdx }))
                            }
                            className={`w-full p-3 rounded-xl border text-left text-xs sm:text-sm transition-all flex items-start gap-3 cursor-pointer ${
                              isSelected
                                ? 'bg-emerald-700/20 border-emerald-700 text-foreground font-semibold'
                                : 'bg-background border-border text-muted hover:text-foreground'
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
              ))}
            </section>
          )}

          {essayQuestions.length > 0 && (
            <section className="space-y-3.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted px-1">
                Questões Dissertativas ({essayQuestions.length})
              </h3>
              {essayQuestions.map((eq: any, eIdx: number) => (
                <div
                  key={eq.id || eIdx}
                  className="p-4 rounded-2xl bg-surface border border-border space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono font-bold text-emerald-300/80">
                      Dissertativa {eIdx + 1}
                    </span>
                    <span className="text-[11px] font-mono text-muted">
                      {eq.points || 2} pt(s)
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm font-medium text-foreground whitespace-pre-wrap leading-relaxed">
                    {String(eq.text || eq.question || eq.prompt || '')}
                  </p>
                  <textarea
                    rows={5}
                    value={essayResponses[eq.id] || ''}
                    onChange={(e) =>
                      setEssayResponses((prev: any) => ({ ...prev, [eq.id]: e.target.value }))
                    }
                    placeholder="Digite sua resposta dissertativa com argumentos sociológicos..."
                    className="w-full bg-background border border-border focus:border-emerald-700 rounded-xl p-3 text-xs sm:text-sm text-foreground focus:outline-none leading-relaxed"
                  />
                </div>
              ))}
            </section>
          )}

          {(essayQuestions.length === 0 ||
            [
              'Redação',
              'Trabalho',
              'Trabalho em grupo',
              'Projeto de pesquisa',
              'Dinâmica',
              'Recuperação Paralela',
            ].includes(String(executingActivity.type || '')) ||
            objQuestions.length === 0) && (
            <section className="p-4 rounded-2xl bg-surface border border-border space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-foreground">
                  {String(executingActivity.type || '') === 'Redação'
                    ? 'Texto da Redação:'
                    : 'Resposta Dissertativa / Desenvolvimento da Pesquisa:'}
                </label>
                <span className="text-[11px] font-mono text-muted">
                  {generalEssayText.trim().split(/\s+/).filter(Boolean).length} palavras
                </span>
              </div>
              <textarea
                rows={8}
                value={generalEssayText}
                onChange={(e) => setGeneralEssayText(e.target.value)}
                placeholder="Desenvolva aqui sua resposta ou síntese da pesquisa (rascunho salvo automaticamente no aparelho)..."
                className="w-full bg-background border border-border focus:border-emerald-700 rounded-xl p-3.5 text-xs sm:text-sm text-foreground focus:outline-none leading-relaxed"
              />
            </section>
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
                  : myExistingSub
                  ? 'Atualizar Minha Entrega'
                  : 'Finalizar e Enviar Atividade'}
              </span>
            </button>
          </div>
        </main>
      </div>
    );
  }


  return null;
};
