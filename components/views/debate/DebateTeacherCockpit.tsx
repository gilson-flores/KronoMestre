'use client';
import React from 'react';
import { Clock, BookOpen, CheckSquare, Play, Pause, RotateCcw, Sparkles, Save, Trash2, CheckCircle2 } from 'lucide-react';
import { GroupRole, DEFAULT_TEACHER_CRITERIA, DEBATE_TIMER_PRESETS } from './debateUtils';
export const DebateTeacherCockpit: React.FC<any> = (props) => {
  const { currentTurmaScope, safeActivity, setSelectedTeacherTurma, availableTurmas, onClose, setTeacherTab, teacherTab, turmaParticipants, statusBanner, setStatusBanner, timerSecondsLeft, formatTimerMMSS, setIsTimerRunning, isTimerRunning, activeTimerPresetId, setTimerSecondsLeft, setActiveTimerPresetId, proMembers, contraMembers, jurorMembers, localConfig, handleAddStudentToGroup, unassignedClassmates, handleMoveStudentGroup, handleRemoveStudentFromGroup, handleGenerateGroupSynthesis, isGeneratingAI, persistDebateConfig, setLocalConfig, getScopedAnswer, handleChangeScopedAnswer, getGroupChecklistState, handleToggleTeacherCriterion, handleChangeTeacherGroupScore, handleChangeTeacherGroupNotes, handleApplyGroupChecklistToCorrections } = props;
  return (
        <div className="space-y-6">
          <div className="p-5 rounded-3xl bg-surface border border-cyan-500/30 shadow-2xl space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-[10px] font-black uppercase tracking-wider">
                    Cockpit do Professor • Controle de Sala & Avaliação
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-800/60 text-emerald-300/90 text-[10px] font-black uppercase">
                    Turma Ativa: {currentTurmaScope}
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-white mt-1">
                  {safeActivity.title}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Controle o Timer Oficial, gerencie e remaneje alunos entre os 3 grupos, veja as 6 perguntas com espaço de resposta + 3 Resumos Elaborados e aplique o Checklist de Notas.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 bg-surface border border-slate-800 p-2 rounded-2xl">
                <span className="text-xs font-bold text-slate-400 px-2">Sala em Aula:</span>
                <select
                  value={currentTurmaScope}
                  onChange={(e) => setSelectedTeacherTurma(e.target.value)}
                  className="bg-slate-950 border border-cyan-500/40 rounded-xl px-3 py-2 text-xs font-black text-cyan-300 focus:outline-none"
                >
                  {availableTurmas.map((t: string) => (
                    <option key={t} value={t}>
                      Turma {t}
                    </option>
                  ))}
                </select>
                {onClose && (
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 cursor-pointer"
                  >
                    Fechar
                  </button>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setTeacherTab('grupos_timer')}
                className={`px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer ${
                  teacherTab === 'grupos_timer'
                    ? 'bg-emerald-700 text-white shadow-lg'
                    : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
                }`}
              >
                <Clock className="w-4 h-4" />
                <span>1. Timer Ao Vivo & Gestão dos 3 Grupos ({turmaParticipants.length} alunos)</span>
              </button>

              <button
                type="button"
                onClick={() => setTeacherTab('perguntas_resumos')}
                className={`px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer ${
                  teacherTab === 'perguntas_resumos'
                    ? 'bg-amber-500 text-slate-950 shadow-lg'
                    : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                <span>2. As 6 Perguntas por Time (com Respostas) & 3 Resumos Elaborados</span>
              </button>

              <button
                type="button"
                onClick={() => setTeacherTab('checklist_notas')}
                className={`px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer ${
                  teacherTab === 'checklist_notas'
                    ? 'bg-emerald-700 text-white shadow-lg'
                    : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
                }`}
              >
                <CheckSquare className="w-4 h-4" />
                <span>3. Checklist de Avaliação do Professor (Ligado a Correções)</span>
              </button>
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

          {/* ABA 1 DO PROFESSOR: TIMER + GESTÃO E REMANEJAMENTO DE GRUPOS */}
          {teacherTab === 'grupos_timer' && (
            <div className="space-y-6">
              <div className="p-6 rounded-3xl bg-surface border border-slate-800 shadow-xl space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400 block">
                      CRONÔMETRO OFICIAL DE SALA • O GRANDE DEBATE
                    </span>
                    <h3 className="text-base font-black text-white">
                      Controle de Tempo por Rodada (Exposição, Réplica, Tréplica e Júri)
                    </h3>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <div
                      className={`px-6 py-3 rounded-2xl font-mono text-3xl font-black tracking-widest border ${
                        timerSecondsLeft <= 15
                          ? 'bg-rose-500/20 border-rose-500 text-rose-300 animate-pulse'
                          : timerSecondsLeft <= 60
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                          : 'bg-slate-950 border-cyan-500/40 text-cyan-300'
                      }`}
                    >
                      {formatTimerMMSS(timerSecondsLeft)}
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsTimerRunning((prev: boolean) => !prev)}
                      className={`px-4 py-3 rounded-2xl text-xs font-black flex items-center gap-1.5 cursor-pointer ${
                        isTimerRunning
                          ? 'bg-amber-500 text-slate-950'
                          : 'bg-emerald-700 hover:bg-emerald-600 text-white'
                      }`}
                    >
                      {isTimerRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      <span>{isTimerRunning ? 'Pausar' : 'Iniciar'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsTimerRunning(false);
                        const preset = DEBATE_TIMER_PRESETS.find(
                          (p) => p.id === activeTimerPresetId
                        );
                        setTimerSecondsLeft(preset ? preset.seconds : 180);
                      }}
                      className="p-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
                      title="Reiniciar tempo da rodada"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setTimerSecondsLeft((prev: number) => Math.max(0, prev - 30))}
                      className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 cursor-pointer"
                    >
                      -30s
                    </button>
                    <button
                      type="button"
                      onClick={() => setTimerSecondsLeft((prev: number) => prev + 30)}
                      className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 cursor-pointer"
                    >
                      +30s
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-2">
                  {DEBATE_TIMER_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => {
                        setIsTimerRunning(false);
                        setActiveTimerPresetId(preset.id);
                        setTimerSecondsLeft(preset.seconds);
                      }}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        activeTimerPresetId === preset.id
                          ? 'bg-cyan-500/20 border-cyan-400 text-white'
                          : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <span className="text-[11px] font-black block leading-tight">
                        {preset.label}
                      </span>
                      <span className="text-[10px] font-mono text-cyan-400 mt-1 block">
                        {formatTimerMMSS(preset.seconds)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* GESTÃO DOS 3 GRUPOS: ESCOLHER 1º ALUNO, MOVER ENTRE GRUPOS E EXCLUIR */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {(
                  [
                    {
                      roleKey: 'pro' as GroupRole,
                      title: '🟢 Bancada Favorável (PRÓ)',
                      subtitle: '6 Questões + Resumo Elaborado Pró',
                      members: proMembers,
                      borderClass: 'border-emerald-500/40',
                      badgeClass: 'bg-emerald-500/20 text-emerald-300',
                    },
                    {
                      roleKey: 'contra' as GroupRole,
                      title: '🔴 Bancada Opositora (CONTRA)',
                      subtitle: '6 Questões + Resumo Elaborado Contra',
                      members: contraMembers,
                      borderClass: 'border-rose-500/40',
                      badgeClass: 'bg-rose-500/20 text-rose-300',
                    },
                    {
                      roleKey: 'juror' as GroupRole,
                      title: '⚖️ Corpo de Jurados (Análise)',
                      subtitle: `Até ${localConfig.maxJurors || 3} jurados • 6 Questões + Dossiê`,
                      members: jurorMembers,
                      borderClass: 'border-amber-500/40',
                      badgeClass: 'bg-amber-500/20 text-amber-300',
                    },
                  ] as const
                ).map((grp) => (
                  <div
                    key={grp.roleKey}
                    className={`p-5 rounded-3xl bg-surface border ${grp.borderClass} flex flex-col justify-between space-y-4`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-black text-white">{grp.title}</h4>
                          <p className="text-[11px] text-slate-400">{grp.subtitle}</p>
                        </div>
                        <span className={`px-2.5 py-1 rounded-xl text-xs font-black ${grp.badgeClass}`}>
                          {grp.members.length} integrante(s)
                        </span>
                      </div>

                      <div className="p-3 rounded-2xl bg-background border border-slate-800 space-y-2">
                        <label className="text-[10px] font-black uppercase text-slate-400 block">
                          {grp.members.length === 0
                            ? '⭐ Escolher 1º Aluno (Líder do Grupo):'
                            : '+ Adicionar Aluno da Turma ao Grupo:'}
                        </label>
                        <select
                          value=""
                          onChange={(e) => {
                            const stId = e.target.value;
                            if (!stId) return;
                            const stObj = unassignedClassmates.find((s: any) => s.id === stId);
                            if (stObj) {
                              handleAddStudentToGroup(
                                { id: stObj.id, fullName: stObj.fullName, turma: stObj.turma },
                                grp.roleKey
                              );
                            }
                          }}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                        >
                          <option value="">
                            Selecionar aluno da Turma {currentTurmaScope} ({unassignedClassmates.length} disponíveis)...
                          </option>
                          {unassignedClassmates.map((st: any) => (
                            <option key={st.id} value={st.id}>
                              {st.fullName}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                        {grp.members.length === 0 ? (
                          <p className="text-xs text-slate-500 italic py-4 text-center">
                            Nenhum aluno alocado neste grupo na Turma {currentTurmaScope}.
                          </p>
                        ) : (
                          grp.members.map((member: any, mIdx: number) => (
                            <div
                              key={member.studentId}
                              className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-2"
                            >
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  {mIdx === 0 && (
                                    <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 text-[9px] font-black uppercase">
                                      Líder
                                    </span>
                                  )}
                                  <span className="text-xs font-bold text-slate-100 truncate block">
                                    {member.studentName}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                <select
                                  value={member.role}
                                  onChange={(e) =>
                                    handleMoveStudentGroup(member, e.target.value as GroupRole)
                                  }
                                  className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-[10px] font-bold text-slate-200 focus:outline-none"
                                  title="Mover aluno para outro grupo"
                                >
                                  <option value="pro">🟢 Pró</option>
                                  <option value="contra">🔴 Contra</option>
                                  <option value="juror">⚖️ Jurado</option>
                                </select>

                                <button
                                  type="button"
                                  onClick={() =>
                                    handleRemoveStudentFromGroup(
                                      member.studentId,
                                      member.studentName
                                    )
                                  }
                                  className="p-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/30 border border-rose-500/30 text-rose-300 cursor-pointer"
                                  title="Excluir aluno do grupo"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ABA 2 DO PROFESSOR: OS 3 RESUMOS ELABORADOS + 6 PERGUNTAS COM ESPAÇO DE RESPOSTA POR TIME */}
          {teacherTab === 'perguntas_resumos' && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3 bg-surface p-4 rounded-2xl border border-slate-800">
                <div>
                  <h3 className="text-sm font-black text-white">
                    3 Resumos Elaborados de Respostas + 6 Perguntas com Espaço de Resposta para Cada Time
                  </h3>
                  <p className="text-xs text-slate-400">
                    Você pode editar qualquer resumo elaborado, enunciado ou resposta dos grupos abaixo e salvar em tempo real.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isGeneratingAI}
                    onClick={handleGenerateGroupSynthesis}
                    className="px-4 py-2.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-200 text-xs font-black flex items-center gap-1.5 cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>{isGeneratingAI ? 'Gerando com IA...' : 'Regenerar 3 Resumos com IA'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      persistDebateConfig(
                        localConfig,
                        undefined,
                        'Resumos elaborados, perguntas e respostas salvos com sucesso!'
                      )
                    }
                    className="px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>Salvar Tudo</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {(
                  [
                    {
                      roleKey: 'pro' as GroupRole,
                      title: '🟢 BANCADA PRÓ (6 Perguntas + Resumo Elaborado)',
                      summaryField: 'proSummaryAI' as const,
                      questions: localConfig.proQuestions,
                      borderClass: 'border-emerald-500/40',
                    },
                    {
                      roleKey: 'contra' as GroupRole,
                      title: '🔴 BANCADA CONTRA (6 Perguntas + Resumo Elaborado)',
                      summaryField: 'contraSummaryAI' as const,
                      questions: localConfig.contraQuestions,
                      borderClass: 'border-rose-500/40',
                    },
                    {
                      roleKey: 'juror' as GroupRole,
                      title: '⚖️ CORPO DE JURADOS (6 Perguntas + Dossiê Elaborado)',
                      summaryField: 'jurorGuideAI' as const,
                      questions: localConfig.jurorQuestions,
                      borderClass: 'border-amber-500/40',
                    },
                  ] as const
                ).map((col) => (
                  <div
                    key={col.roleKey}
                    className={`p-5 rounded-3xl bg-surface border ${col.borderClass} space-y-4`}
                  >
                    <h4 className="text-sm font-black text-white border-b border-slate-800 pb-2">
                      {col.title}
                    </h4>

                    {/* Resumo Elaborado da Equipe */}
                    <div className="p-3.5 rounded-2xl bg-slate-950 border border-cyan-500/30 space-y-1.5">
                      <label className="text-[10px] font-black uppercase text-cyan-400 block">
                        📘 Resumo Elaborado de Respostas ({col.roleKey.toUpperCase()}):
                      </label>
                      <textarea
                        rows={6}
                        value={localConfig[col.summaryField] || ''}
                        onChange={(e) =>
                          setLocalConfig((prev: any) => ({
                            ...prev,
                            [col.summaryField]: e.target.value,
                          }))
                        }
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 leading-relaxed focus:outline-none focus:border-cyan-400"
                      />
                    </div>

                    {/* As 6 Perguntas com Espaço de Resposta */}
                    <div className="space-y-3">
                      {col.questions.map((q: any, idx: number) => (
                        <div
                          key={q.id}
                          className="p-3.5 rounded-2xl bg-background border border-slate-800 space-y-2"
                        >
                          <span className="text-[10px] font-black uppercase text-emerald-400 block">
                            Pergunta {idx + 1} de 6 • {q.sociologicalConcept}
                          </span>
                          <p className="text-xs font-bold text-white leading-relaxed">{q.prompt}</p>
                          <textarea
                            rows={3}
                            value={getScopedAnswer(col.roleKey, q.id)}
                            onChange={(e) =>
                              handleChangeScopedAnswer(col.roleKey, q.id, e.target.value)
                            }
                            placeholder={`Espaço de resposta da Pergunta ${idx + 1} (Turma ${currentTurmaScope})...`}
                            className="w-full bg-slate-900 border border-slate-800 focus:border-emerald-400 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ABA 3 DO PROFESSOR: CHECKLIST DE AVALIAÇÃO POR GRUPO -> CORREÇÕES */}
          {teacherTab === 'checklist_notas' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {(
                [
                  {
                    roleKey: 'pro' as GroupRole,
                    title: '🟢 Checklist • Bancada PRÓ',
                    members: proMembers,
                  },
                  {
                    roleKey: 'contra' as GroupRole,
                    title: '🔴 Checklist • Bancada CONTRA',
                    members: contraMembers,
                  },
                  {
                    roleKey: 'juror' as GroupRole,
                    title: '⚖️ Checklist • Corpo de JURADOS',
                    members: jurorMembers,
                  },
                ] as const
              ).map((grp) => {
                const chkState = getGroupChecklistState(grp.roleKey);
                return (
                  <div
                    key={grp.roleKey}
                    className="p-5 rounded-3xl bg-surface border border-slate-800 flex flex-col justify-between space-y-4 shadow-xl"
                  >
                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                        <div>
                          <h4 className="text-sm font-black text-white">{grp.title}</h4>
                          <p className="text-[11px] text-slate-400">
                            {grp.members.length} integrante(s) na Turma {currentTurmaScope}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] font-bold text-slate-400 block">
                            Nota Sugerida
                          </span>
                          <span className="text-xl font-black text-emerald-400">
                            {chkState.customScore.toFixed(1)}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        {DEFAULT_TEACHER_CRITERIA.map((crit) => {
                          const checked = Boolean(chkState.criteriaChecked[crit.id]);
                          return (
                            <label
                              key={crit.id}
                              onClick={() => handleToggleTeacherCriterion(grp.roleKey, crit.id)}
                              className={`p-3 rounded-2xl border flex items-center justify-between gap-2 cursor-pointer transition-all ${
                                checked
                                  ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-100'
                                  : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:border-slate-700'
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => {}}
                                  className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                                />
                                <span className="text-xs font-bold leading-snug">{crit.label}</span>
                              </div>
                              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-900 text-cyan-300 shrink-0">
                                +{crit.weight.toFixed(1)}
                              </span>
                            </label>
                          );
                        })}
                      </div>

                      <div className="grid grid-cols-1 gap-3 pt-2">
                        <div className="flex items-center justify-between bg-slate-950 border border-slate-800 rounded-2xl px-3.5 py-2.5">
                          <label className="text-xs font-bold text-slate-300">
                            Nota Final do Grupo (0 a 10):
                          </label>
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="10"
                            value={chkState.customScore}
                            onChange={(e) =>
                              handleChangeTeacherGroupScore(grp.roleKey, Number(e.target.value))
                            }
                            className="w-20 bg-slate-900 border border-emerald-500/40 rounded-xl px-2.5 py-1 text-right text-sm font-black text-emerald-300 focus:outline-none"
                          />
                        </div>

                        <textarea
                          rows={2}
                          value={chkState.teacherNotes}
                          onChange={(e) =>
                            handleChangeTeacherGroupNotes(grp.roleKey, e.target.value)
                          }
                          placeholder="Parecer complementar do professor para este grupo (vai para a Aba Correções)..."
                          className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-400"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleApplyGroupChecklistToCorrections(grp.roleKey)}
                      className="w-full py-3 px-4 rounded-2xl bg-emerald-700 hover:bg-emerald-600 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg cursor-pointer transition-all"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Aplicar Nota ao Grupo & Enviar para Correções</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
  );
};
