'use client';
import React from 'react';
import { CheckCircle2, Gamepad2, FileText, Link2, ExternalLink, Users, Play, ChevronRight, LogOut, Camera, Check, KeyRound, X, Send } from 'lucide-react';
import { isActivityKronoGame } from '@/lib/studentUtils';
import { AVATAR_GALLERY_PRESETS, AVATAR_CATEGORIES, extractLinksFromText } from './studentPortalUtils';

export const StudentMainAndDrawer: React.FC<any> = (props) => {
  const {
    activeNav, pendingActivities, completedActivities, kronoGamesActivities,
    studentTurmaStd, studentActivities, displayedActivities, mySubmissionsMap,
    handleOpenActivity, averageGrade, activeStudent, onLogout,
    handleUploadAvatarFile, selectedAvatarDraft, setSelectedAvatarDraft,
    isSavingAvatar, handleSaveNewAvatar, handlePasswordChange,
    newPassword, setNewPassword, confirmPassword, setConfirmPassword,
    passwordStatus, isChatOpen, setIsChatOpen, teacher, myMessages,
    chatInput, setChatInput, onSendMessage
  } = props;
  const [avatarCat, setAvatarCat] = React.useState<string>('todos');
  const filteredAvatars = React.useMemo(() => avatarCat === 'todos' ? AVATAR_GALLERY_PRESETS : AVATAR_GALLERY_PRESETS.filter((a: any) => a.category === avatarCat), [avatarCat]);
  const selectedAvatarMeta = React.useMemo(() => AVATAR_GALLERY_PRESETS.find((a: any) => a.url === selectedAvatarDraft), [selectedAvatarDraft]);
  return (
    <>
      {/* 3. CONTEÚDO PRINCIPAL */}
      <main className="max-w-2xl mx-auto p-3 sm:p-4 space-y-4">
        {(activeNav === 'feed' ||
          activeNav === 'pending' ||
          activeNav === 'completed' ||
          activeNav === 'games') && (
          <div className="space-y-3">
            <div className="p-3.5 rounded-2xl bg-surface border border-border flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-700" />
                <span className="font-bold text-foreground">
                  {activeNav === 'pending'
                    ? `Atividades Pendentes (${pendingActivities.length})`
                    : activeNav === 'completed'
                    ? `Atividades Feitas (${completedActivities.length})`
                    : activeNav === 'games'
                    ? `Atividades Jogos (${kronoGamesActivities.length})`
                    : `Todas as Atividades • Turma ${studentTurmaStd} (${studentActivities.length})`}
                </span>
              </div>
              <span className="font-mono text-emerald-300/90 font-bold">
                {completedActivities.length} concluída(s)
              </span>
            </div>

            {displayedActivities.length === 0 ? (
              <div className="p-10 rounded-2xl bg-surface border border-border text-center space-y-2">
                <CheckCircle2 className="w-7 h-7 text-emerald-300/90 mx-auto" />
                <p className="text-sm font-bold text-foreground">
                  Nenhuma atividade listada nesta categoria.
                </p>
                <p className="text-xs text-muted">
                  Toque nos botões acima para alternar entre Todas, Pendentes e Feitas.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {displayedActivities.map((act: any) => {
                  const sub = mySubmissionsMap.get(act.id);
                  const isGame = isActivityKronoGame(act);
                  const isDebate =
                    act.gameMode === 'debate_paperless' ||
                    Boolean(act.gameData?.debateConfig);
                  const actLinks = [
                    ...extractLinksFromText(act.supportMaterial),
                    ...extractLinksFromText(act.description),
                  ];
                  const hasGrade =
                    sub &&
                    (sub.status === 'graded' ||
                      Number(sub.objectiveScore || 0) > 0 ||
                      Number(sub.essayScore || 0) > 0);
                  const totalGrade = sub
                    ? Math.min(
                        10,
                        Number(sub.objectiveScore || 0) +
                          Number(sub.essayScore || 0) +
                          Number(sub.extraPoints || 0)
                      )
                    : null;

                  return (
                    <article
                      key={act.id}
                      className={`rounded-2xl bg-surface border transition-all overflow-hidden ${
                        sub ? 'border-emerald-800/70' : 'border-border hover:border-zinc-700'
                      }`}
                    >
                      <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                              sub
                                ? 'bg-emerald-950/60 text-emerald-300/90 border border-emerald-800/50'
                                : isGame
                                ? 'bg-emerald-950/50 text-emerald-300/80 border border-emerald-800/50'
                                : 'bg-zinc-800 text-zinc-300 border border-zinc-700'
                            }`}
                          >
                            {sub ? (
                              <CheckCircle2 className="w-4 h-4" />
                            ) : isGame ? (
                              <Gamepad2 className="w-4 h-4" />
                            ) : (
                              <FileText className="w-4 h-4" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-foreground truncate">
                                {act.subject || 'Sociologia'}
                              </span>
                              <span className="text-muted">•</span>
                              <span className="text-[11px] font-medium text-muted truncate">
                                {isDebate
                                  ? 'Debate Sem Papel'
                                  : isGame
                                  ? 'KronoGames'
                                  : String(act.type || 'Atividade')}
                              </span>
                            </div>
                            <span className="text-[10px] font-mono text-muted block">
                              Turma {studentTurmaStd} •{' '}
                              {sub?.submittedAt
                                ? `Entregue em: ${String(sub.submittedAt)}`
                                : `Prazo: ${act.dueDate || act.deadline || 'Em aberto'}`}
                            </span>
                          </div>
                        </div>

                        {sub ? (
                          <span className="px-2.5 py-1 rounded-md bg-emerald-950/60 border border-emerald-800/60 text-emerald-200/90 font-mono text-[11px] font-bold shrink-0">
                            {hasGrade && totalGrade !== null
                              ? `Nota: ${totalGrade.toFixed(1)}`
                              : '✓ Já Feita'}
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-300 font-mono text-[11px] font-bold shrink-0">
                            Pendente
                          </span>
                        )}
                      </div>

                      <div className="p-4 space-y-3">
                        <h3 className="text-base font-bold text-foreground leading-snug">
                          {act.title}
                        </h3>

                        {act.description && (
                          <p className="text-xs sm:text-sm text-muted line-clamp-3 whitespace-pre-wrap leading-relaxed">
                            {act.description}
                          </p>
                        )}

                        {actLinks.length > 0 && (
                          <div className="space-y-1.5 pt-1">
                            {actLinks.map((lnk, lIdx) => (
                              <a
                                key={lIdx}
                                href={lnk}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2.5 rounded-xl bg-background hover:bg-surface-hover border border-emerald-800/50 flex items-center justify-between gap-2 text-xs font-semibold text-emerald-300/90 transition-colors"
                              >
                                <span className="flex items-center gap-2 truncate">
                                  <Link2 className="w-3.5 h-3.5 shrink-0" />
                                  <span className="truncate">
                                    Abrir Arquivo / Material no Google Drive
                                  </span>
                                </span>
                                <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                              </a>
                            ))}
                          </div>
                        )}

                        {sub?.teacherFeedback && (
                          <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-800/50 text-xs text-emerald-100/90">
                            <strong className="text-emerald-300/90 block mb-0.5">
                              Feedback do Professor:
                            </strong>
                            {String(sub.teacherFeedback)}
                          </div>
                        )}

                        <div className="pt-1">
                          <button
                            type="button"
                            onClick={() => handleOpenActivity(act)}
                            className={`w-full py-3 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 cursor-pointer transition-all ${
                              sub
                                ? 'bg-emerald-950/60 hover:bg-emerald-500/25 border border-emerald-800/60 text-emerald-200/90'
                                : 'bg-emerald-700 hover:bg-emerald-600 text-white shadow-xs'
                            }`}
                          >
                            {sub ? (
                              <>
                                <CheckCircle2 className="w-4 h-4 text-emerald-300/90" />
                                <span>Ver Minha Entrega, Respostas & Correção</span>
                              </>
                            ) : isDebate ? (
                              <>
                                <Users className="w-4 h-4" />
                                <span>Entrar na Bancada • Debate Sem Papel</span>
                              </>
                            ) : isGame ? (
                              <>
                                <Play className="w-4 h-4 fill-current" />
                                <span>Jogar Agora • KronoGames</span>
                              </>
                            ) : (
                              <>
                                <span>Iniciar / Responder Atividade</span>
                                <ChevronRight className="w-4 h-4" />
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ===================================================================
            ABA MEU BOLETIM
           =================================================================== */}
        {activeNav === 'boletim' && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2.5">
              <div className="p-3.5 rounded-2xl bg-surface border border-border text-center">
                <span className="text-[10px] font-mono uppercase text-muted block">Média</span>
                <span className="text-xl font-mono font-bold text-emerald-300/90 mt-0.5 block">
                  {averageGrade || '—'}
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-surface border border-border text-center">
                <span className="text-[10px] font-mono uppercase text-muted block">Feitas</span>
                <span className="text-xl font-mono font-bold text-foreground mt-0.5 block">
                  {completedActivities.length}/{studentActivities.length}
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-surface border border-border text-center">
                <span className="text-[10px] font-mono uppercase text-muted block">Turma</span>
                <span className="text-xl font-mono font-bold text-emerald-300/80 mt-0.5 block">
                  {studentTurmaStd}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              {studentActivities.map((act: any) => {
                const sub = mySubmissionsMap.get(act.id);
                const hasScore =
                  sub &&
                  (sub.status === 'graded' ||
                    Number(sub.objectiveScore || 0) > 0 ||
                    Number(sub.essayScore || 0) > 0);
                const total = sub
                  ? Math.min(
                      10,
                      Number(sub.objectiveScore || 0) +
                        Number(sub.essayScore || 0) +
                        Number(sub.extraPoints || 0)
                    )
                  : null;

                return (
                  <div
                    key={act.id}
                    onClick={() => handleOpenActivity(act)}
                    className="p-4 rounded-2xl bg-surface hover:bg-surface-hover border border-border space-y-2.5 cursor-pointer transition-all"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-mono uppercase text-muted block">
                          {String(act.type || 'Avaliação')} •{' '}
                          {String(sub?.submittedAt || act.dueDate || act.deadline || '')}
                        </span>
                        <h4 className="text-sm font-bold text-foreground">{act.title}</h4>
                      </div>
                      {sub ? (
                        <span className="px-3 py-1 rounded-lg bg-emerald-950/60 border border-emerald-800/60 text-emerald-200/90 font-mono text-xs font-bold">
                          {hasScore && total !== null
                            ? `${total.toFixed(1)} / 10`
                            : '✓ Entregue'}
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-border text-muted font-mono text-xs">
                          Pendente
                        </span>
                      )}
                    </div>

                    {sub?.teacherFeedback && (
                      <div className="p-3 rounded-xl bg-background border border-border text-xs text-foreground whitespace-pre-wrap">
                        <strong className="text-emerald-300/90 block mb-1">
                          Feedback do Professor:
                        </strong>
                        {String(sub.teacherFeedback)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ===================================================================
            ABA MEU PERFIL + TROCA DE AVATAR ATIVADA + TROCA DE SENHA
           =================================================================== */}
        {activeNav === 'perfil' && (
          <div className="space-y-4">
            {/* Card Principal do Aluno */}
            <div className="p-5 rounded-2xl bg-surface border border-border flex items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-16 h-16 rounded-full ring-2 ring-emerald-700 bg-zinc-900 overflow-hidden flex items-center justify-center shrink-0">
                  {activeStudent.avatarUrl ? (
                    <img
                      src={activeStudent.avatarUrl}
                      alt={activeStudent.fullName}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <span className="font-mono font-extrabold text-lg text-emerald-300/90">
                      {(activeStudent.fullName || 'AL')
                        .trim()
                        .split(/\s+/)
                        .slice(0, 2)
                        .map((n: string) => n[0])
                        .join('')
                        .toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="min-w-0 space-y-1">
                  <span className="px-2.5 py-0.5 rounded-md bg-emerald-950/60 text-emerald-300/90 font-mono text-xs font-bold inline-block">
                    Turma {studentTurmaStd}
                  </span>
                  <h2 className="text-base sm:text-lg font-bold text-foreground break-words">
                    {activeStudent.fullName}
                  </h2>
                  <p className="text-xs font-mono text-muted">
                    Matrícula / ID: {activeStudent.matricula || activeStudent.id}
                  </p>
                </div>
              </div>

              {onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  className="px-4 py-2.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sair</span>
                </button>
              )}
            </div>

            {/* SEÇÃO DE TROCA DE AVATAR DENTRO DO PERFIL (52 AVATARES OFICIAIS • SEM UPLOAD) */}
            <section className="p-5 rounded-2xl bg-surface border border-border space-y-4">
              <div className="border-b border-border pb-3">
                <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-300/90 block">
                  Galeria Oficial KronoMestre • 52 Personagens
                </span>
                <h3 className="text-sm font-bold text-foreground mt-0.5">
                  Escolher Meu Avatar no Perfil
                </h3>
                <p className="text-xs text-muted mt-0.5">
                  Selecione uma categoria abaixo, escolha seu personagem e toque em Salvar Novo Avatar.
                </p>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {AVATAR_CATEGORIES.map((cat: any) => {
                  const active = avatarCat === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setAvatarCat(cat.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        active
                          ? 'bg-emerald-950/60 border border-emerald-800/60 text-emerald-300/90'
                          : 'bg-background border border-border text-muted hover:text-foreground'
                      }`}
                    >
                      {cat.emoji} {cat.label}
                    </button>
                  );
                })}
              </div>

              {selectedAvatarMeta && (
                <div className="p-3 rounded-xl bg-emerald-950/35 border border-emerald-800/60 flex items-center gap-3">
                  <img src={selectedAvatarMeta.url} alt={selectedAvatarMeta.label} className="w-11 h-11 rounded-full bg-zinc-900 shrink-0 object-cover ring-2 ring-emerald-700" />
                  <div className="min-w-0">
                    <span className="text-[10px] font-mono uppercase text-emerald-300/90 block">{selectedAvatarMeta.categoryLabel}</span>
                    <h4 className="text-xs sm:text-sm font-bold text-foreground truncate">{selectedAvatarMeta.label}</h4>
                    <p className="text-[11px] text-muted truncate">{selectedAvatarMeta.tagline}</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-4 sm:grid-cols-8 gap-2.5 max-h-72 overflow-y-auto p-1">
                {filteredAvatars.map((preset: any) => {
                  const isSelected = selectedAvatarDraft === preset.url;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setSelectedAvatarDraft(preset.url)}
                      className={`relative p-1.5 rounded-2xl border transition-all flex flex-col items-center gap-1 cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-700/20 border-emerald-700 ring-2 ring-emerald-700/50 scale-105'
                          : 'bg-background border-border hover:border-zinc-700'
                      }`}
                      title={`${preset.label} — ${preset.tagline}`}
                    >
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-zinc-900">
                        <img src={preset.url} alt={preset.label} className="w-full h-full rounded-full object-cover" />
                      </div>
                      <span className="text-[9px] text-muted truncate w-full text-center">{preset.label.split(' ')[0]}</span>
                      {isSelected && (
                        <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-emerald-700 text-white flex items-center justify-center shadow-xs">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                disabled={isSavingAvatar}
                onClick={() => handleSaveNewAvatar()}
                className="w-full py-3 rounded-xl bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 cursor-pointer transition-all shadow-sm"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isSavingAvatar ? 'Salvando no Firestore...' : 'Salvar Novo Avatar'}</span>
              </button>
            </section>

            {/* Alteração de Senha */}
            <form
              onSubmit={handlePasswordChange}
              className="p-5 rounded-2xl bg-surface border border-border space-y-3"
            >
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-emerald-300/90" />
                <h3 className="text-sm font-bold text-foreground">Alterar Minha Senha</h3>
              </div>
              <input
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Nova senha (mín. 4 caracteres)"
                className="w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-foreground"
              />
              <input
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirmar nova senha"
                className="w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-foreground"
              />
              {passwordStatus && (
                <p className="text-xs text-emerald-300/90 font-medium">{passwordStatus}</p>
              )}
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold cursor-pointer"
              >
                Salvar Nova Senha
              </button>
            </form>
          </div>
        )}
      </main>

      {/* 4. GAVETA DE MENSAGENS COM O PROFESSOR */}
      {isChatOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-surface border border-border rounded-t-2xl sm:rounded-2xl w-full max-w-md h-[80vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase text-emerald-300/90 block">
                  Mensagem Direta • Turma {studentTurmaStd}
                </span>
                <h3 className="text-sm font-bold text-foreground">
                  Falar com {teacher?.name || 'Professor Gilson'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsChatOpen(false)}
                className="p-1.5 rounded-lg bg-background text-muted hover:text-foreground cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 p-4 overflow-y-auto space-y-2.5">
              {myMessages.length === 0 ? (
                <p className="text-xs text-muted text-center py-10">
                  Envie sua dúvida diretamente ao professor.
                </p>
              ) : (
                myMessages.map((msg: any, idx: number) => {
                  const isMine =
                    msg.senderId === activeStudent.id || msg.senderRole === 'student';
                  return (
                    <div
                      key={msg.id || idx}
                      className={`max-w-[85%] p-3 rounded-2xl text-xs ${
                        isMine
                          ? 'ml-auto bg-emerald-700 text-white font-medium'
                          : 'mr-auto bg-background border border-border text-foreground'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{String(msg.text || msg.content || '')}</p>
                    </div>
                  );
                })
              )}
            </div>

            <div className="p-3 border-t border-border flex items-center gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && chatInput.trim() && onSendMessage) {
                    onSendMessage(
                      {
                        threadId: activeStudent.id,
                        senderId: activeStudent.id,
                        senderName: activeStudent.fullName,
                        senderRole: 'student',
                        senderAvatar: activeStudent.avatarUrl,
                        recipientId: teacher?.id || 'teacher',
                        recipientName: teacher?.name || 'Professor Gilson',
                        content: chatInput.trim(),
                      },
                      teacher?.id
                    );
                    setChatInput('');
                  }
                }}
                placeholder="Escreva uma mensagem..."
                className="flex-1 bg-background border border-border rounded-xl px-3.5 py-2.5 text-xs text-foreground focus:outline-none focus:border-emerald-700"
              />
              <button
                type="button"
                onClick={() => {
                  if (chatInput.trim() && onSendMessage) {
                    onSendMessage(
                      {
                        threadId: activeStudent.id,
                        senderId: activeStudent.id,
                        senderName: activeStudent.fullName,
                        senderRole: 'student',
                        senderAvatar: activeStudent.avatarUrl,
                        recipientId: teacher?.id || 'teacher',
                        recipientName: teacher?.name || 'Professor Gilson',
                        content: chatInput.trim(),
                      },
                      teacher?.id
                    );
                    setChatInput('');
                  }
                }}
                className="p-2.5 rounded-xl bg-emerald-700 text-white cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
