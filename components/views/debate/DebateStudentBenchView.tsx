'use client';
import React from 'react';
import { Lock, UserPlus, Sparkles, Save, ArrowRight, CheckCircle2 } from 'lucide-react';
import { GroupRole, LocalDebateQuestion } from './debateUtils';
export const DebateStudentBenchView: React.FC<any> = (props) => {
  const { myRole, proMembers, contraMembers, jurorMembers, localConfig, currentTurmaScope, safeActivity, isAuthenticatedTeacher, simulatedStudentRole, setSimulatedStudentRole, statusBanner, setStatusBanner, handleAddStudentToGroup, activeStudent, studentStep, setStudentStep, selectedClassmateIdToAdd, setSelectedClassmateIdToAdd, unassignedClassmates, getScopedAnswer, handleChangeScopedAnswer, handleGenerateGroupSynthesis, isGeneratingAI, persistDebateConfig, jurorChecklistPro, setJurorChecklistPro, jurorChecklistContra, setJurorChecklistContra, jurorVerdictComment, setJurorVerdictComment, groupFinalArgument, setGroupFinalArgument, handleStudentFinishDebateStep3 } = props;
  return (
        /* ===================================================================
           2. VISÃO DO ALUNO (ISOLADA POR TURMA + 6 PERGUNTAS + 3 PASSOS)
           =================================================================== */
        (() => {
          const myGroupMembers =
            myRole === 'pro' ? proMembers : myRole === 'contra' ? contraMembers : jurorMembers;

          const myQuestions: LocalDebateQuestion[] =
            myRole === 'pro'
              ? localConfig.proQuestions
              : myRole === 'contra'
              ? localConfig.contraQuestions
              : localConfig.jurorQuestions;

          const myRoleTitle =
            myRole === 'pro'
              ? '🟢 Bancada Favorável (PRÓ)'
              : myRole === 'contra'
              ? '🔴 Bancada Opositora (CONTRA)'
              : '⚖️ Corpo de Jurados (Análise Imparcial)';

          return (
            <div className="space-y-6">
              <div className="p-5 rounded-3xl bg-surface border border-slate-800 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-800/60 text-emerald-300/90 text-xs font-black flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5" />
                      <span>Ambiente Exclusivo • Turma {currentTurmaScope}</span>
                    </span>
                    {myRole && (
                      <span className="px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-xs font-black">
                        {myRoleTitle}
                      </span>
                    )}
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-white mt-2">
                    {safeActivity.title}
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Atividade restrita aos estudantes da Turma <strong>{currentTurmaScope}</strong>.
                  </p>
                </div>

                {isAuthenticatedTeacher && (
                  <div className="flex items-center gap-2 bg-slate-900 p-2 rounded-xl border border-slate-800">
                    <span className="text-[11px] font-bold text-slate-400">Simulando Bancada:</span>
                    <select
                      value={simulatedStudentRole}
                      onChange={(e) => setSimulatedStudentRole(e.target.value as GroupRole)}
                      className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs font-bold text-cyan-300"
                    >
                      <option value="pro">🟢 Bancada PRÓ</option>
                      <option value="contra">🔴 Bancada CONTRA</option>
                      <option value="juror">⚖️ Corpo de JURADOS</option>
                    </select>
                  </div>
                )}
              </div>

              {statusBanner && (
                <div
                  className={`p-4 rounded-2xl border text-xs font-bold flex items-center justify-between ${
                    statusBanner.type === 'error'
                      ? 'bg-rose-500/15 border-rose-500/40 text-rose-200'
                      : 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200'
                  }`}
                >
                  <span>{statusBanner.text}</span>
                  <button
                    type="button"
                    onClick={() => setStatusBanner(null)}
                    className="text-slate-300 hover:text-white ml-3"
                  >
                    ✕
                  </button>
                </div>
              )}

              {!myRole && activeStudent && (
                <div className="p-6 rounded-3xl bg-surface border border-slate-800 space-y-5">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400 block">
                      ETAPA DE CREDENCIAMENTO • TURMA {currentTurmaScope}
                    </span>
                    <h3 className="text-lg font-black text-white mt-1">
                      Escolha sua Bancada para Iniciar a Trajetória do seu Grupo
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-5 rounded-3xl bg-emerald-950/25 border border-emerald-500/40 flex flex-col justify-between space-y-4">
                      <div>
                        <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 text-xs font-black">
                          {proMembers.length} integrante(s) na Turma {currentTurmaScope}
                        </span>
                        <h4 className="text-base font-black text-white mt-3">🟢 Bancada PRÓ</h4>
                        <p className="text-xs text-slate-300 mt-1">
                          Responde às 6 perguntas favoráveis e defende a tese no Grande Debate.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          handleAddStudentToGroup(
                            {
                              id: activeStudent.id,
                              fullName: activeStudent.fullName,
                              turma: currentTurmaScope,
                            },
                            'pro'
                          )
                        }
                        className="w-full py-3 rounded-2xl bg-emerald-700 hover:bg-emerald-600 text-white font-black text-xs cursor-pointer"
                      >
                        Ingressar na Bancada PRÓ
                      </button>
                    </div>

                    <div className="p-5 rounded-3xl bg-rose-950/25 border border-rose-500/40 flex flex-col justify-between space-y-4">
                      <div>
                        <span className="px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-300 text-xs font-black">
                          {contraMembers.length} integrante(s) na Turma {currentTurmaScope}
                        </span>
                        <h4 className="text-base font-black text-white mt-3">🔴 Bancada CONTRA</h4>
                        <p className="text-xs text-slate-300 mt-1">
                          Responde às 6 perguntas críticas e sustenta o contraponto no Grande Debate.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          handleAddStudentToGroup(
                            {
                              id: activeStudent.id,
                              fullName: activeStudent.fullName,
                              turma: currentTurmaScope,
                            },
                            'contra'
                          )
                        }
                        className="w-full py-3 rounded-2xl bg-rose-500 hover:bg-rose-400 text-white font-black text-xs cursor-pointer"
                      >
                        Ingressar na Bancada CONTRA
                      </button>
                    </div>

                    <div className="p-5 rounded-3xl bg-amber-950/25 border border-amber-500/40 flex flex-col justify-between space-y-4">
                      <div>
                        <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 text-xs font-black">
                          {jurorMembers.length}/{localConfig.maxJurors || 3} Jurados na Turma {currentTurmaScope}
                        </span>
                        <h4 className="text-base font-black text-white mt-3">⚖️ Corpo de Jurados</h4>
                        <p className="text-xs text-slate-300 mt-1">
                          Responde às 6 questões de análise e julga o Grande Debate com 2 Checklists.
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={jurorMembers.length >= (localConfig.maxJurors || 3)}
                        onClick={() =>
                          handleAddStudentToGroup(
                            {
                              id: activeStudent.id,
                              fullName: activeStudent.fullName,
                              turma: currentTurmaScope,
                            },
                            'juror'
                          )
                        }
                        className="w-full py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-black text-xs cursor-pointer"
                      >
                        {jurorMembers.length >= (localConfig.maxJurors || 3)
                          ? 'Vagas de Jurados Preenchidas'
                          : 'Ingressar nos Jurados'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {myRole && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      {
                        step: 1 as const,
                        title: 'Passo 1: Equipe & 6 Questões',
                        desc: 'Seleção do grupo e 6 perguntas com espaço de resposta',
                      },
                      {
                        step: 2 as const,
                        title: 'Passo 2: Resumo Elaborado',
                        desc: 'Resumo elaborado de respostas e dossiê da sua bancada',
                      },
                      {
                        step: 3 as const,
                        title: 'Passo 3: O Grande Debate',
                        desc:
                          myRole === 'juror'
                            ? 'Checklists oficiais de julgamento e veredito'
                            : 'Arena ao vivo, cronômetro e envio final da equipe',
                      },
                    ].map((s) => (
                      <button
                        key={s.step}
                        type="button"
                        onClick={() => setStudentStep(s.step)}
                        className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                          studentStep === s.step
                            ? 'bg-cyan-500/20 border-cyan-400 text-white shadow-lg'
                            : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 block">
                          Trajetória Exclusiva • {myRoleTitle}
                        </span>
                        <span className="text-sm font-black block mt-0.5">{s.title}</span>
                        <span className="text-[11px] text-slate-400 block mt-0.5">{s.desc}</span>
                      </button>
                    ))}
                  </div>

                  {studentStep === 1 && (
                    <div className="space-y-6">
                      <div className="p-5 rounded-3xl bg-surface border border-cyan-500/30 space-y-4">
                        <div>
                          <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400 block">
                            FORMAÇÃO DA SUA EQUIPE • TURMA {currentTurmaScope}
                          </span>
                          <h3 className="text-base font-black text-white">
                            Integrantes de {myRoleTitle} ({myGroupMembers.length})
                          </h3>
                          <p className="text-xs text-slate-400">
                            Selecione seus colegas de grupo na lista suspensa abaixo (apenas colegas da Turma {currentTurmaScope}).
                          </p>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-2.5">
                          <select
                            value={selectedClassmateIdToAdd}
                            onChange={(e) => setSelectedClassmateIdToAdd(e.target.value)}
                            className="flex-1 bg-slate-950 border border-slate-700 focus:border-cyan-400 rounded-2xl px-4 py-3 text-xs sm:text-sm font-bold text-white focus:outline-none"
                          >
                            <option value="">
                              📋 Clique para escolher um colega da Turma {currentTurmaScope} ({unassignedClassmates.length} disponíveis)...
                            </option>
                            {unassignedClassmates.map((colleague: any) => (
                              <option key={colleague.id} value={colleague.id}>
                                {colleague.fullName}
                              </option>
                            ))}
                          </select>

                          <button
                            type="button"
                            disabled={!selectedClassmateIdToAdd}
                            onClick={() => {
                              const stObj = unassignedClassmates.find(
                                (s: any) => s.id === selectedClassmateIdToAdd
                              );
                              if (stObj) {
                                handleAddStudentToGroup(
                                  { id: stObj.id, fullName: stObj.fullName, turma: stObj.turma },
                                  myRole
                                );
                              }
                            }}
                            className="px-5 py-3 rounded-2xl bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 text-white font-black text-xs flex items-center justify-center gap-2 cursor-pointer shrink-0"
                          >
                            <UserPlus className="w-4 h-4" />
                            <span>+ Incluir Colega no Grupo</span>
                          </button>
                        </div>

                        <div className="flex flex-wrap gap-2 pt-1">
                          {myGroupMembers.map((m: any, idx: number) => (
                            <span
                              key={m.studentId}
                              className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold text-slate-200 flex items-center gap-2"
                            >
                              {idx === 0 && (
                                <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 text-[9px] font-black uppercase">
                                  1º Escolhido / Líder
                                </span>
                              )}
                              <span>{m.studentName}</span>
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="p-5 rounded-3xl bg-surface border border-slate-800 space-y-4">
                        <div className="border-b border-slate-800 pb-3">
                          <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 block">
                            PASSO 1 • 6 QUESTÕES EXCLUSIVAS COM ESPAÇO DE RESPOSTA ({myRoleTitle.toUpperCase()})
                          </span>
                          <h3 className="text-base font-black text-white">
                            Responda às 6 Perguntas Norteadoras da Sua Equipe
                          </h3>
                        </div>

                        <div className="space-y-4">
                          {myQuestions.map((q: any, idx: number) => (
                            <div
                              key={q.id}
                              className="p-4 rounded-2xl bg-background border border-slate-800 space-y-2.5"
                            >
                              <span className="px-2.5 py-0.5 rounded-lg bg-cyan-500/15 text-cyan-300 text-[10px] font-black uppercase inline-block">
                                Pergunta {idx + 1} de 6 • {q.sociologicalConcept}
                              </span>
                              <p className="text-xs sm:text-sm font-bold text-white leading-relaxed">
                                {q.prompt}
                              </p>
                              <textarea
                                rows={3}
                                value={getScopedAnswer(myRole, q.id)}
                                onChange={(e) =>
                                  handleChangeScopedAnswer(myRole, q.id, e.target.value)
                                }
                                placeholder={`Digite aqui a resposta elaborada pelo seu grupo para a Pergunta ${idx + 1}...`}
                                className="w-full bg-slate-900 border border-slate-800 focus:border-cyan-400 rounded-xl p-3 text-xs sm:text-sm text-white focus:outline-none"
                              />
                            </div>
                          ))}
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                          <button
                            type="button"
                            onClick={() =>
                              persistDebateConfig(
                                localConfig,
                                undefined,
                                'As 6 respostas do seu grupo foram salvas!'
                              )
                            }
                            className="px-5 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold cursor-pointer"
                          >
                            💾 Salvar Respostas das 6 Questões
                          </button>

                          <button
                            type="button"
                            onClick={async () => {
                              await persistDebateConfig(localConfig);
                              setStudentStep(2);
                            }}
                            className="px-6 py-3 rounded-2xl bg-emerald-700 hover:bg-emerald-600 text-white font-black text-xs flex items-center justify-center gap-2 cursor-pointer"
                          >
                            <span>Salvar e Ver Resumo Elaborado (Passo 2)</span>
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {studentStep === 2 && (
                    <div className="p-6 rounded-3xl bg-surface border border-slate-800 space-y-5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                        <div>
                          <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400 block">
                            PASSO 2 • RESUMO ELABORADO DE RESPOSTAS ({myRoleTitle.toUpperCase()})
                          </span>
                          <h3 className="text-lg font-black text-white">
                            Resumo Elaborado & Dossiê da Sua Bancada
                          </h3>
                        </div>

                        <button
                          type="button"
                          disabled={isGeneratingAI}
                          onClick={handleGenerateGroupSynthesis}
                          className="px-4 py-2.5 rounded-2xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-200 text-xs font-black flex items-center gap-2 cursor-pointer"
                        >
                          <Sparkles className="w-4 h-4" />
                          <span>
                            {isGeneratingAI
                              ? 'Consolidando com IA...'
                              : 'Atualizar Resumo Elaborado com IA'}
                          </span>
                        </button>
                      </div>

                      <div className="p-5 rounded-2xl bg-slate-950 border border-cyan-500/30 space-y-2">
                        <span className="text-[10px] font-black uppercase text-emerald-400 block">
                          Resumo Elaborado Exclusivo ({myRoleTitle}):
                        </span>
                        <p className="text-xs sm:text-sm text-slate-100 whitespace-pre-wrap leading-relaxed">
                          {myRole === 'pro'
                            ? localConfig.proSummaryAI
                            : myRole === 'contra'
                            ? localConfig.contraSummaryAI
                            : localConfig.jurorGuideAI}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        <button
                          type="button"
                          onClick={() => setStudentStep(1)}
                          className="px-4 py-2.5 rounded-xl bg-slate-800 text-xs font-bold text-slate-300 cursor-pointer"
                        >
                          ← Voltar às 6 Perguntas (Passo 1)
                        </button>
                        <button
                          type="button"
                          onClick={() => setStudentStep(3)}
                          className="px-6 py-3 rounded-2xl bg-emerald-700 hover:bg-emerald-600 text-white font-black text-xs flex items-center gap-2 cursor-pointer"
                        >
                          <span>Ir para o Passo 3: O Grande Debate</span>
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  {studentStep === 3 && (
                    <div className="p-6 rounded-3xl bg-surface border border-emerald-500/40 space-y-5 shadow-2xl">
                      <div className="border-b border-slate-800 pb-4">
                        <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 block">
                          PASSO 3 • ARENA AO VIVO • TURMA {currentTurmaScope}
                        </span>
                        <h3 className="text-xl font-black text-white">
                          🎙️ O Grande Debate — {myRoleTitle}
                        </h3>
                      </div>

                      {myRole === 'juror' ? (
                        <div className="space-y-5">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-4 rounded-2xl bg-slate-950 border border-emerald-500/30 space-y-3">
                              <h4 className="text-xs font-black uppercase text-emerald-400">
                                Checklist 1 • Avaliar Bancada PRÓ
                              </h4>
                              {localConfig.checklistCriteria.map((c: any) => (
                                <label
                                  key={`pro_${c.id}`}
                                  className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 cursor-pointer"
                                >
                                  <input
                                    type="checkbox"
                                    checked={Boolean(jurorChecklistPro[c.id])}
                                    onChange={() =>
                                      setJurorChecklistPro((prev: any) => ({
                                        ...prev,
                                        [c.id]: !prev[c.id],
                                      }))
                                    }
                                    className="mt-0.5 accent-emerald-500"
                                  />
                                  <div>
                                    <span className="text-xs font-bold text-white block">
                                      {c.title || c.criterion}
                                    </span>
                                    <span className="text-[11px] text-slate-400 block">
                                      {c.description}
                                    </span>
                                  </div>
                                </label>
                              ))}
                            </div>

                            <div className="p-4 rounded-2xl bg-slate-950 border border-rose-500/30 space-y-3">
                              <h4 className="text-xs font-black uppercase text-rose-400">
                                Checklist 2 • Avaliar Bancada CONTRA
                              </h4>
                              {localConfig.checklistCriteria.map((c: any) => (
                                <label
                                  key={`contra_${c.id}`}
                                  className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 cursor-pointer"
                                >
                                  <input
                                    type="checkbox"
                                    checked={Boolean(jurorChecklistContra[c.id])}
                                    onChange={() =>
                                      setJurorChecklistContra((prev: any) => ({
                                        ...prev,
                                        [c.id]: !prev[c.id],
                                      }))
                                    }
                                    className="mt-0.5 accent-rose-500"
                                  />
                                  <div>
                                    <span className="text-xs font-bold text-white block">
                                      {c.title || c.criterion}
                                    </span>
                                    <span className="text-[11px] text-slate-400 block">
                                      {c.description}
                                    </span>
                                  </div>
                                </label>
                              ))}
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-300 block">
                              Veredito Fundamentado do Corpo de Jurados:
                            </label>
                            <textarea
                              rows={3}
                              value={jurorVerdictComment}
                              onChange={(e) => setJurorVerdictComment(e.target.value)}
                              placeholder="Justifiquem qual bancada apresentou maior rigor conceitual e consistência sociológica no Grande Debate..."
                              className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3.5 text-xs sm:text-sm text-white focus:outline-none focus:border-amber-400"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                            {[
                              '1. Exposição Inicial (3 min)',
                              '2. Réplica Direta (2 min)',
                              '3. Sabatina do Júri (2 min)',
                              '4. Considerações Finais (1m30s)',
                            ].map((etapa, i) => (
                              <div
                                key={i}
                                className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-center"
                              >
                                <span className="text-xs font-bold text-cyan-300 block">{etapa}</span>
                              </div>
                            ))}
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-300 block">
                              Argumento Final / Réplica Central Apresentada pela Sua Bancada no Debate:
                            </label>
                            <textarea
                              rows={3}
                              value={groupFinalArgument}
                              onChange={(e) => setGroupFinalArgument(e.target.value)}
                              placeholder="Registrem a conclusão final defendida pelo grupo durante o Grande Debate..."
                              className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3.5 text-xs sm:text-sm text-white focus:outline-none focus:border-emerald-400"
                            />
                          </div>
                        </div>
                      )}

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => setStudentStep(2)}
                          className="px-4 py-2.5 rounded-xl bg-slate-800 text-xs font-bold text-slate-300 cursor-pointer"
                        >
                          ← Voltar ao Passo 2
                        </button>

                        <button
                          type="button"
                          onClick={handleStudentFinishDebateStep3}
                          className="px-6 py-3.5 rounded-2xl bg-emerald-700 hover:bg-emerald-600 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xl cursor-pointer"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>
                            Concluir e Enviar as 6 Respostas de Todo o Grupo ({myGroupMembers.length} integrantes)
                          </span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })()
  );
};
