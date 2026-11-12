'use client';
import React from 'react';
import { Home, Clock, CheckCheck, Gamepad2, BarChart3, User, Moon, Sun, MessageSquare, LogOut, Sparkles, RefreshCw } from 'lucide-react';

export const StudentHeaderNav: React.FC<any> = (props) => {
  const {
    showVersionUpdateBanner, handleDismissOrApplyVersionUpdate, activeStudent,
    studentTurmaStd, setActiveNav, activeNav, onToggleTheme, themeMode,
    handleOpenChat, unreadMessagesCount, onLogout, studentActivities,
    pendingActivities, completedActivities, kronoGamesActivities
  } = props;
  return (
    <>
      {/* AVISO DE ATUALIZAÇÃO DE VERSÃO PARA O ALUNO */}
      {showVersionUpdateBanner && (
        <div className="bg-emerald-700 text-white px-4 py-2.5 shadow-md">
          <div className="max-w-2xl mx-auto flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 font-semibold">
              <Sparkles className="w-4 h-4 shrink-0" />
              <span>
                Nova atualização disponível no seu portal! Toque em atualizar para sincronizar.
              </span>
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={() => handleDismissOrApplyVersionUpdate(true)}
                className="px-3 py-1 rounded-lg bg-white text-emerald-900 font-bold flex items-center gap-1 cursor-pointer hover:bg-emerald-50"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Atualizar Agora</span>
              </button>
              <button
                type="button"
                onClick={() => handleDismissOrApplyVersionUpdate(false)}
                className="px-2 py-1 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white/90 cursor-pointer"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 1. CABEÇALHO DO ALUNO + BARRA DE BOTÕES EM DUAS LINHAS SEM CORTAR NOMES */}
      <header className="sticky top-0 z-30 bg-surface/95 backdrop-blur-md border-b border-border px-3 sm:px-4 py-3">
        <div className="max-w-2xl mx-auto space-y-3">
          <div className="flex items-start gap-3.5">
            {/* Avatar em Círculo Perfeito do Mesmo Tamanho (w-14 h-14 rounded-full) */}
            <button
              type="button"
              onClick={() => setActiveNav('perfil')}
              className="relative w-14 h-14 rounded-full ring-2 ring-emerald-700/80 bg-zinc-900 flex items-center justify-center overflow-hidden shrink-0 cursor-pointer shadow-md group"
              title="Trocar Meu Avatar / Perfil"
            >
              {activeStudent.avatarUrl ? (
                <img
                  src={activeStudent.avatarUrl}
                  alt={activeStudent.fullName}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <span className="font-mono font-extrabold text-base text-emerald-300/90">
                  {(activeStudent.fullName || 'AL')
                    .trim()
                    .split(/\s+/)
                    .slice(0, 2)
                    .map((n: string) => n[0])
                    .join('')
                    .toUpperCase()}
                </span>
              )}
            </button>

            {/* Turma em cima + Nome do Aluno por baixo estendendo até o final */}
            <div className="flex-1 min-w-0 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="px-2.5 py-0.5 rounded-lg bg-emerald-950/60 border border-emerald-800/60 text-emerald-300/90 font-mono text-xs font-extrabold">
                  Turma {studentTurmaStd}
                </span>

                <div className="flex items-center gap-1.5 shrink-0">
                  {onToggleTheme && (
                    <button
                      type="button"
                      onClick={onToggleTheme}
                      className="p-2 rounded-xl bg-background hover:bg-surface-hover border border-border text-muted hover:text-foreground cursor-pointer"
                      title="Alternar tema Claro / Escuro"
                    >
                      {themeMode === 'light' ? (
                        <Moon className="w-4 h-4" />
                      ) : (
                        <Sun className="w-4 h-4" />
                      )}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleOpenChat}
                    className="relative p-2 rounded-xl bg-background hover:bg-surface-hover border border-border text-muted hover:text-foreground cursor-pointer"
                    title="Mensagens do Professor"
                  >
                    <MessageSquare className="w-4 h-4" />
                    {unreadMessagesCount > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-emerald-700 text-white font-mono text-[10px] font-bold flex items-center justify-center shadow-xs">
                        {unreadMessagesCount}
                      </span>
                    )}
                  </button>

                  {onLogout && (
                    <button
                      type="button"
                      onClick={onLogout}
                      className="p-2 rounded-xl bg-background hover:bg-rose-500/15 border border-border text-muted hover:text-rose-400 cursor-pointer"
                      title="Sair da conta"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              <h1 className="text-sm sm:text-base font-extrabold tracking-tight text-foreground leading-snug break-words">
                {activeStudent.fullName}
              </h1>
            </div>
          </div>

          {/* 2. BARRA DE BOTÕES ESTILO APP DE SMARTPHONE (2 LINHAS INTEIRAS SEM CORTAR PALAVRAS) */}
          <div className="pt-1.5 border-t border-border/70 grid grid-cols-6 gap-1">
            {[
              {
                id: 'feed' as const,
                line1: 'Todas',
                line2: 'Atividades',
                icon: Home,
                count: studentActivities.length,
              },
              {
                id: 'pending' as const,
                line1: 'Atividades',
                line2: 'Pendentes',
                icon: Clock,
                count: pendingActivities.length,
              },
              {
                id: 'completed' as const,
                line1: 'Atividades',
                line2: 'Feitas',
                icon: CheckCheck,
                count: completedActivities.length,
              },
              {
                id: 'games' as const,
                line1: 'Atividades',
                line2: 'Jogos',
                icon: Gamepad2,
                count: kronoGamesActivities.length,
              },
              {
                id: 'boletim' as const,
                line1: 'Meu',
                line2: 'Boletim',
                icon: BarChart3,
                count: 0,
              },
              {
                id: 'perfil' as const,
                line1: 'Meu',
                line2: 'Perfil',
                icon: User,
                count: 0,
              },
            ].map((btn) => {
              const IconComp = btn.icon;
              const isSelected = activeNav === btn.id;
              return (
                <button
                  key={btn.id}
                  type="button"
                  onClick={() => setActiveNav(btn.id)}
                  className={`py-2 px-0.5 rounded-xl flex flex-col items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-950/60 text-emerald-300/90 font-bold'
                      : 'text-muted hover:text-foreground hover:bg-background/60'
                  }`}
                >
                  <div className="relative flex items-center justify-center">
                    <IconComp
                      className={`w-4 h-4 sm:w-5 sm:h-5 ${isSelected ? 'text-emerald-300/90' : ''}`}
                    />
                    {btn.count > 0 && (
                      <span
                        className={`ml-0.5 text-[10px] font-mono font-bold ${
                          isSelected ? 'text-emerald-200/90' : 'text-muted'
                        }`}
                      >
                        {btn.count}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col items-center leading-[1.15] text-center">
                    <span className="text-[9px] sm:text-[10px] tracking-tight whitespace-nowrap">
                      {btn.line1}
                    </span>
                    <span className="text-[9px] sm:text-[10px] tracking-tight whitespace-nowrap">
                      {btn.line2}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </header>

    </>
  );
};
