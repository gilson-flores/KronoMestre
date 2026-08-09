'use client';

import React, { useState } from 'react';
import { Bell, Search, BookOpen, Menu, X } from 'lucide-react';
import { UserRole, TeacherUser, StudentUser } from '@/lib/types';
import { formatAvatarUrl } from '@/lib/utils';

interface NavbarTopProps {
  role: UserRole;
  user: TeacherUser | StudentUser | null;
  onOpenSettings?: () => void;
  globalSearch: string;
  setGlobalSearch: (q: string) => void;
  onToggleMobileMenu?: () => void;
}

export const NavbarTop: React.FC<NavbarTopProps> = ({
  role,
  user,
  globalSearch,
  setGlobalSearch,
  onToggleMobileMenu,
}) => {
  const [showMobileSearch, setShowMobileSearch] = useState(false);

  return (
    <header className="w-full bg-[#0b1326]/90 backdrop-blur-md border-b border-white/10 px-4 sm:px-6 py-3 flex items-center justify-between sticky top-0 z-30 min-h-[56px]">
      {/* Left Title / Branding + Mobile Menu Trigger */}
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
        {onToggleMobileMenu && (
          <button
            onClick={onToggleMobileMenu}
            className="p-2 text-[#bccabb] hover:text-white hover:bg-[#171f33] rounded-xl transition-colors md:hidden cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0"
            title="Menu de Navegação"
            aria-label="Abrir Menu"
          >
            <Menu className="w-6 h-6 text-[#4ade80]" />
          </button>
        )}

        <div className="p-2 rounded-xl bg-[#171f33] border border-white/10 text-[#4ade80] shrink-0">
          <BookOpen className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <h1 className="text-sm sm:text-base font-bold text-[#4ade80] tracking-tight truncate">
            Sociologia On-line
          </h1>
          <p className="text-xs text-[#bccabb] hidden sm:block truncate">Ensino Médio e Plataforma Pedagógica</p>
        </div>
      </div>

      {/* Middle Search - Desktop */}
      <div className="flex-1 max-w-md mx-4 hidden md:block">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#869486]" />
          <input
            type="text"
            value={globalSearch}
            onChange={(e) => setGlobalSearch(e.target.value)}
            placeholder="Buscar alunos, turmas ou atividades..."
            className="w-full bg-[#131b2e] border border-white/10 rounded-full pl-10 pr-4 py-2 text-sm text-[#dae2fd] placeholder-[#869486] focus:outline-none focus:border-[#4ade80]/50 transition-all min-h-[40px]"
          />
        </div>
      </div>

      {/* Right Controls: Mobile Search Toggle + Notifications + User Profile */}
      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
        {/* Mobile Search Toggle */}
        <button
          onClick={() => setShowMobileSearch(!showMobileSearch)}
          className="p-2 text-[#bccabb] hover:text-white hover:bg-[#171f33] rounded-full transition-colors md:hidden cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
          title="Buscar"
          aria-label="Buscar"
        >
          {showMobileSearch ? <X className="w-5 h-5" /> : <Search className="w-5 h-5" />}
        </button>

        <button
          className="p-2 text-[#bccabb] hover:text-white hover:bg-[#171f33] rounded-full transition-colors relative cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
          title="Notificações"
          aria-label="Notificações"
        >
          <Bell className="w-5 h-5" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-[#4ade80] rounded-full"></span>
        </button>

        {user && (
          <div className="flex items-center gap-2 pl-2 border-l border-white/10">
            <img
              src={formatAvatarUrl('avatarUrl' in user ? user.avatarUrl : '')}
              alt={'name' in user ? user.name : user.fullName}
              className="w-8 h-8 rounded-full object-cover border border-[#4ade80]/30 shrink-0"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150';
              }}
            />
            <div className="hidden sm:block text-left max-w-[120px] md:max-w-[180px]">
              <p className="text-xs font-bold text-white leading-tight truncate">
                {'name' in user ? user.name : user.fullName}
              </p>
              <p className="text-[10px] text-[#bccabb] truncate">
                {role === 'teacher' ? 'Professor' : ('turma' in user ? user.turma : 'Aluno')}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Search Expandable Bar */}
      {showMobileSearch && (
        <div className="absolute top-full left-0 right-0 bg-[#0b1326] border-b border-white/10 p-3 md:hidden z-40 shadow-xl animate-fadeIn">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#869486]" />
            <input
              type="text"
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              placeholder="Buscar alunos, turmas ou atividades..."
              autoFocus
              className="w-full bg-[#131b2e] border border-white/10 rounded-full pl-10 pr-4 py-2.5 text-sm text-[#dae2fd] placeholder-[#869486] focus:outline-none focus:border-[#4ade80]/50"
            />
          </div>
        </div>
      )}
    </header>
  );
};
