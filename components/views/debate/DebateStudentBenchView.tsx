'use client';
import React from 'react';
import { Lock, Sparkles, Save, ArrowRight, CheckCircle2, Users, RefreshCw, ShieldCheck } from 'lucide-react';
import { GroupRole, LocalDebateQuestion } from './debateUtils';

export const DebateStudentBenchView: React.FC<any> = (props) => {
  const {
    myRole,
    proMembers,
    contraMembers,
    jurorMembers,
    localConfig,
    currentTurmaScope,
    safeActivity,
    isAuthenticatedTeacher,
    simulatedStudentRole,
    setSimulatedStudentRole,
    statusBanner,
    setStatusBanner,
    activeStudent,
    studentStep,
    setStudentStep,
    getScopedAnswer,
    handleChangeScopedAnswer,
    getScopedSummary,
    handleStudentSaveStep1Answers,
    isSavingAnswers,
    handleRefreshFromServer,
    isRefreshingBench,
    handleGenerateGroupSynthesis,
    isGeneratingAI,
    jurorChecklistPro,
    setJurorChecklistPro,
    jurorChecklistContra,
    setJurorChecklistContra,
    jurorVerdictComment,
    setJurorVerdictComment,
    groupFinalArgument,
    setGroupFinalArgument,
    handleStudentFinishDebateStep3,
  } = props;

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
      ? '🏛️ Bancada dos Girondinos'
      : myRole === 'contra'
      ? '🔥 Bancada dos Jacobinos'
      : '⚖️ Júri de Analistas';

  const myRoleColor =
    myRole === 'pro'
      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
      : myRole === 'contra'
      ? 'border-rose-500/40 bg-rose-500/10 text-rose-300'
      : 'border-amber-500/40 bg-amber-500/10 text-amber-300';

  const currentSummaryText = getScopedSummary
    ? getScopedSummary(myRole || 'pro')
    : myRole === 'pro'
    ? localConfig.proSummaryAI
    : myRole === 'contra'
    ? localConfig.contraSummaryAI
    : localConfig.jurorGuideAI;

  return (
    <div className="space-y-6">
      {/* CABEÇALHO DO ALUNO ESTRITAMENTE ISOLADO NA SUA TURMA */}
      <div className="p-5 rounded-3xl bg-surface border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-800/60 text-emerald-300/90 text-[10px] font-black uppercase flex items-center gap-1">
                <Lock className="w-3 h-3" /> Ambiente Exclusivo • Turma {currentTurmaScope}
              </span>
              {myRole && (
                <span className={`px-2.5 py-0.5 rounded-full border text-[10px] font-black uppercase ${myRoleColor}`}>
                  {myRoleTitle}
                </span>
              )}
            </div>
            <h2 className="text-xl font-black text-white mt-1">{safeActivity.title}</h2>
            <p className="text-xs text-slate-400">
              Atividade restrita aos estudantes da Turma {currentTurmaScope}.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {handleRefreshFromServer && (
              <button
                type="button"
                disabled={isRefreshingBench}
                onClick={handleRefreshFromServer}
                className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-cyan-500/40 text-cyan-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                title="Sincronizar bancadas e respostas salvas"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingBench ? 'animate-spin' : ''}`} />
                <span>{isRefreshingBench ? 'Sincronizando...' : 'Atualizar Bancada'}</span>
              </button>
            )}

            {isAuthenticatedTeacher && (
              <div className="flex items-center gap-2 bg-surface p-2 rounded-xl border border-slate-800">
                <span className="text-[11px] font-bold text-slate-400">Simulando Bancada:</span>
                <select
                  value={simulatedStudentRole}
                  onChange={(e) => setSimulatedStudentRole(e.target.value as GroupRole)}
                  className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs font-bold text-cyan-300"
                >
                  <option value="pro">🏛️ Girondinos</option>
                  <option value="contra">🔥 Jacobinos</option>
                  <option value="juror">⚖️ Júri de Analistas</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {/* BARRA DOS 3 PASSOS DA TRAJETÓRIA DO GRUPO */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {[
            {
              step: 1 as const,
              title: 'Aula 1 (Parte A): Bancada & Pesquisa',
              desc: 'Colegas do grupo e 6 perguntas com espaço de resposta',
            },
            {
              step: 2 as const,
              title:
                myRole === 'juror'
                  ? 'Aula 1 (Parte B): Perguntas da IA ao Júri'
                  : 'Aula 1 (Parte B): Síntese Oficial',
              desc:
                myRole === 'juror'
                  ? 'Perguntas formuladas pela IA sobre os 2 grupos'
                  : 'Resumo elaborado a partir das respostas do seu grupo',
            },
            {
              step: 3 as const,
              title: 'Aula 2: Grande Debate & Júri',
              desc: 'Arena ao vivo, checklists e envio final da equipe',
            },
          ].map((s) => (
            <button
              key={s.step}
              type="button"
              disabled={!myRole}
              onClick={() => myRole && setStudentStep(s.step)}
              className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer disabled:opacity-50 ${
                studentStep === s.step
                  ? 'bg-emerald-950/50 border-emerald-500 text-white shadow-lg'
                  : 'bg-background border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className="text-[10px] font-mono uppercase text-emerald-400 block">
                Trajetória Exclusiva • {myRole ? myRoleTitle : 'Aguardando Alocação'}
              </span>
              <span className="text-xs font-black block mt-0.5">{s.title}</span>
              <span className="text-[11px] text-slate-400 block mt-0.5">{s.desc}</span>
            </button>
          ))}
        </div>
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

      {/* SE O ALUNO AINDA NÃO FOI ALOCADO PELO PROFESSOR: EXIBE AS 3 BANCADAS EM MODO LEITURA */}
      {!myRole ? (
        <div className="p-6 rounded-3xl bg-surface border border-cyan-500/30 space-y-5 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div className="space-y-1">
              <span className="px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-300 text-[11px] font-black uppercase inline-flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" /> Alocação Oficial pelo Professor • Turma {currentTurmaScope}
              </span>
              <h3 className="text-lg font-black text-white pt-1">
                Confira as Bancadas Alocadas pelo Professor
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
                No Debate Sem Papel, a distribuição dos estudantes entre <strong>Girondinos</strong>, <strong>Jacobinos</strong> e <strong>Júri de Analistas</strong> é realizada exclusivamente pelo Prof. Gilson. Assim que ele alocar seu nome, toque em <strong>Atualizar Bancada</strong> para liberar suas 6 questões!
              </p>
            </div>

            {handleRefreshFromServer && (
              <button
                type="button"
                disabled={isRefreshingBench}
                onClick={handleRefreshFromServer}
                className="px-5 py-3 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg cursor-pointer shrink-0"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshingBench ? 'animate-spin' : ''}`} />
                <span>{isRefreshingBench ? 'Verificando...' : '🔄 Atualizar Minha Bancada'}</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                title: '🏛️ Bancada dos Girondinos',
                members: proMembers,
                border: 'border-emerald-500/40 bg-emerald-950/15',
                badge: 'bg-emerald-500/20 text-emerald-300',
              },
              {
                title: '🔥 Bancada dos Jacobinos',
                members: contraMembers,
                border: 'border-rose-500/40 bg-rose-950/15',
                badge: 'bg-rose-500/20 text-rose-300',
              },
              {
                title: '⚖️ Júri de Analistas',
                members: jurorMembers,
                border: 'border-amber-500/40 bg-amber-950/15',
                badge: 'bg-amber-500/20 text-amber-300',
              },
            ].map((b, i) => (
              <div key={i} className={`p-4 rounded-2xl border ${b.border} space-y-3`}>
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-black text-white">{b.title}</h4>
                  <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black ${b.badge}`}>
                    {b.members.length} aluno(s)
                  </span>
                </div>
                {b.members.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-2">
                    Aguardando alocação pelo professor...
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {b.members.map((m: any, idx: number) => (
                      <div
                        key={m.studentId || idx}
                        className="px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-xs font-bold text-slate-200 flex items-center justify-between gap-2"
                      >
                        <span className="break-words">{m.studentName}</span>
                        {idx === 0 && (
                          <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 text-[9px] font-black uppercase shrink-0">
                            Líder
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {studentStep === 1 && (
            <div className="space-y-5">
              {/* PAINEL DE INTEGRANTES ALOCADOS PELO PROFESSOR (SOMENTE LEITURA PARA O ALUNO) */}
              <div className="p-5 rounded-3xl bg-surface border border-slate-800 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <div>
                    <span className="text-[10px] font-mono uppercase text-cyan-400 block">
                      INTEGRANTES OFICIAIS DA SUA BANCADA • TURMA {currentTurmaScope}
                    </span>
                    <h3 className="text-sm font-black text-white flex items-center gap-2 mt-0.5">
                      <Users className="w-4 h-4 text-emerald-400" />
                      <span>
                        Colegas Alocados pelo Professor em {myRoleTitle} ({myGroupMembers.length} integrante(s))
                      </span>
                    </h3>
                  </div>
                  <span className="px-3 py-1 rounded-xl bg-slate-900 border border-slate-700 text-[11px] font-bold text-slate-300">
                    🔒 Para alterar bancada, solicite ao Professor
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {myGroupMembers.map((m: any, idx: number) => {
                    const isMe = activeStudent && m.studentId === activeStudent.id;
                    return (
                      <span
                        key={m.studentId || idx}
                        className={`px-3.5 py-2 rounded-xl border text-xs font-bold flex items-center gap-2 ${
                          isMe
                            ? 'bg-emerald-950/70 border-emerald-500/60 text-emerald-200'
                            : 'bg-slate-950 border-slate-800 text-slate-200'
                        }`}
                      >
                        {idx === 0 && (
                          <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 text-[9px] font-black uppercase">
                            Líder
                          </span>
                        )}
                        <span>{m.studentName}</span>
                        {isMe && (
                          <span className="text-[10px] font-mono text-emerald-400">(Você)</span>
                        )}
                      </span>
                    );
                  })}
                </div>

                {/* Visão rápida das demais bancadas da turma */}
                <details className="pt-2 border-t border-slate-800/80 text-xs text-slate-400">
                  <summary className="cursor-pointer font-bold text-cyan-300 hover:text-cyan-200 select-none">
                    👀 Ver todos os colegas alocados nas 3 bancadas da Turma {currentTurmaScope} (Girondinos: {proMembers.length} • Jacobinos: {contraMembers.length} • Júri: {jurorMembers.length})
                  </summary>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                    <div className="p-3 rounded-xl bg-slate-950 border border-emerald-500/30">
                      <strong className="text-emerald-300 block mb-1">🏛️ Girondinos ({proMembers.length}):</strong>
                      <p className="text-[11px] text-slate-300">
                        {proMembers.map((m: any) => m.studentName).join(', ') || 'Nenhum aluno alocado.'}
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950 border border-rose-500/30">
                      <strong className="text-rose-300 block mb-1">🔥 Jacobinos ({contraMembers.length}):</strong>
                      <p className="text-[11px] text-slate-300">
                        {contraMembers.map((m: any) => m.studentName).join(', ') || 'Nenhum aluno alocado.'}
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950 border border-amber-500/30">
                      <strong className="text-amber-300 block mb-1">⚖️ Júri ({jurorMembers.length}):</strong>
                      <p className="text-[11px] text-slate-300">
                        {jurorMembers.map((m: any) => m.studentName).join(', ') || 'Nenhum aluno alocado.'}
                      </p>
                    </div>
                  </div>
                </details>
              </div>

              {/* AS 6 PERGUNTAS NORTEADORAS COM SALVAMENTO AUTOMÁTICO E NO SERVIDOR */}
              <div className="p-5 rounded-3xl bg-surface border border-slate-800 space-y-4">
                <div className="border-b border-slate-800 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 block">
                      PASSO 1 • 6 QUESTÕES EXCLUSIVAS COM ESPAÇO DE RESPOSTA ({myRoleTitle.toUpperCase()})
                    </span>
                    <h3 className="text-base font-black text-white">
                      Responda às 6 Perguntas Norteadoras da Sua Equipe
                    </h3>
                  </div>
                  <span className="text-[11px] font-semibold text-emerald-300/90 bg-emerald-950/50 border border-emerald-800/50 px-3 py-1 rounded-xl">
                    ✓ Rascunho salvo automaticamente no aparelho
                  </span>
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
                        placeholder={`Digite aqui a resposta elaborada pela sua bancada para a Pergunta ${idx + 1}...`}
                        className="w-full bg-slate-900 border border-slate-800 focus:border-cyan-400 rounded-xl p-3 text-xs sm:text-sm text-white focus:outline-none"
                      />
                    </div>
                  ))}
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                  <button
                    type="button"
                    disabled={isSavingAnswers}
                    onClick={() => handleStudentSaveStep1Answers(false)}
                    className="px-5 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Save className="w-4 h-4 text-cyan-400" />
                    <span>
                      {isSavingAnswers
                        ? 'Salvando no Servidor...'
                        : '💾 Salvar Respostas das 6 Questões'}
                    </span>
                  </button>

                  <button
                    type="button"
                    disabled={isSavingAnswers}
                    onClick={() => handleStudentSaveStep1Answers(true)}
                    className="px-6 py-3 rounded-2xl bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white font-black text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg"
                  >
                    <span>
                      {myRole === 'juror'
                        ? 'Salvar e Ver Perguntas da IA para o Júri (Passo 2)'
                        : 'Salvar e Ver Resumo Elaborado (Passo 2)'}
                    </span>
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
                    {myRole === 'juror'
                      ? `PASSO 2 • PERGUNTAS DE SABATINA FORMULADAS PELA IA (TURMA ${currentTurmaScope})`
                      : `PASSO 2 • SÍNTESE ELABORADA DAS RESPOSTAS DA SUA BANCADA (${myRoleTitle.toUpperCase()})`}
                  </span>
                  <h3 className="text-lg font-black text-white">
                    {myRole === 'juror'
                      ? '⚖️ Perguntas da IA para o Júri Questionar Girondinos e Jacobinos'
                      : '📘 Resumo Elaborado a partir das Respostas do Seu Grupo'}
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
                      ? 'Analisando Respostas com IA...'
                      : myRole === 'juror'
                      ? 'Gerar Perguntas da IA com Base nos 2 Grupos'
                      : 'Sintetizar Nossas Respostas com IA'}
                  </span>
                </button>
              </div>

              <div className="p-5 rounded-2xl bg-slate-950 border border-cyan-500/30 space-y-2">
                <span className="text-[10px] font-black uppercase text-emerald-400 block">
                  {myRole === 'juror'
                    ? 'Perguntas Formuladas pela IA com Base nos Resumos dos Dois Grupos:'
                    : `Síntese Exclusiva das Respostas (${myRoleTitle}):`}
                </span>
                <p className="text-xs sm:text-sm text-slate-100 whitespace-pre-wrap leading-relaxed">
                  {currentSummaryText}
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
                  <span>
                    {myRole === 'juror'
                      ? 'Ir para a Aula 2: Checklists de Julgamento'
                      : 'Ir para a Aula 2: O Grande Debate (Exposição, Réplica e Tréplica)'}
                  </span>
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
                        Checklist 1 • Avaliar Girondinos (Exposição, Réplica e Tréplica)
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
                        Checklist 2 • Avaliar Jacobinos (Exposição, Réplica e Tréplica)
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
                      Placar do Checklist: Girondinos ({Object.values(jurorChecklistPro || {}).filter(Boolean).length} pts) vs. Jacobinos ({Object.values(jurorChecklistContra || {}).filter(Boolean).length} pts) — {Object.values(jurorChecklistPro || {}).filter(Boolean).length > Object.values(jurorChecklistContra || {}).filter(Boolean).length ? '🏆 Vitória dos Girondinos' : Object.values(jurorChecklistContra || {}).filter(Boolean).length > Object.values(jurorChecklistPro || {}).filter(Boolean).length ? '🏆 Vitória dos Jacobinos' : '⚖️ Empate Técnico'} • Justificativa dos Analistas:
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
};
