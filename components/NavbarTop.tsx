'use client';

import React from 'react';
import { BookOpen, Menu } from 'lucide-react';
import { UserRole, TeacherUser, StudentUser } from '@/lib/types';
import { formatAvatarUrl } from '@/lib/utils';

interface NavbarTopProps {
  role: UserRole;
  user: TeacherUser | StudentUser | null;
  onOpenSettings?: () => void;
  globalSearch?: string;
  setGlobalSearch?: (q: string) => void;
  onToggleMobileMenu?: () => void;
  onlineStudentsCount?: number;
}

export const NavbarTop: React.FC<NavbarTopProps> = ({
  role,
  user,
  onToggleMobileMenu,
  onlineStudentsCount = 0,
}) => {
  return (
    <header className="w-full bg-background/90 backdrop-blur-md border-b border-border px-4 sm:px-6 py-3 flex items-center justify-between sticky top-0 z-30 min-h-[56px]">
      {/* Left Title / Branding + Mobile Menu Trigger */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {onToggleMobileMenu && (
          <button
            onClick={onToggleMobileMenu}
            className="p-2 text-muted hover:text-foreground hover:bg-[#171f33] rounded-xl transition-colors md:hidden cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0 active:scale-95"
            title="Menu de Navegação"
            aria-label="Abrir Menu"
          >
            <Menu className="w-6 h-6 text-primary" />
          </button>
        )}

        <div className="p-2 rounded-xl bg-[#171f33] border border-border text-primary shrink-0 hidden sm:flex">
          <BookOpen className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <h1 className="text-sm sm:text-base font-bold text-primary tracking-tight truncate">
            KronoMestre
          </h1>
          <p className="text-xs text-muted hidden sm:block truncate">Ensino Médio e Plataforma Pedagógica</p>
        </div>
      </div>

      {/* Right Controls: Online Students Counter + User Profile (Zero chamadas ao servidor, sem pesquisa, sem sino) */}
      <div className="flex items-center gap-2.5 sm:gap-4 shrink-0">
        {/* Contador de Alunos Online em Tempo Real (Cálculo em memória, zero chamadas ao servidor) */}
        {onlineStudentsCount > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="hidden sm:inline">
              <strong className="font-bold text-emerald-300">{onlineStudentsCount}</strong> alunos online
            </span>
            <span className="sm:hidden">
              <strong className="font-bold text-emerald-300">{onlineStudentsCount}</strong> online
            </span>
          </div>
        )}

        {user && (
          <div className="flex items-center gap-2 pl-2 border-l border-border">
            <img
              src={formatAvatarUrl('avatarUrl' in user ? user.avatarUrl : '')}
              alt={'name' in user ? user.name : user.fullName}
              className="w-8 h-8 rounded-full object-cover border border-primary/30 shrink-0"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=150';
              }}
            />
            <div className="hidden sm:block text-left max-w-[120px] md:max-w-[180px]">
              <p className="text-xs font-bold text-foreground leading-tight truncate">
                {'name' in user ? user.name : user.fullName}
              </p>
              <p className="text-[10px] text-muted truncate">
                {role === 'teacher' ? 'Professor' : role === 'second_teacher' ? '2º Professor' : ('turma' in user ? user.turma : 'Aluno')}
              </p>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default NavbarTop;
