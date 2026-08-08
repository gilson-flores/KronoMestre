'use client';

import React from 'react';
import { Bell, Settings, Search, BookOpen } from 'lucide-react';
import { UserRole, TeacherUser, StudentUser } from '@/lib/types';

interface NavbarTopProps {
  role: UserRole;
  user: TeacherUser | StudentUser | null;
  onOpenSettings: () => void;
  globalSearch: string;
  setGlobalSearch: (q: string) => void;
}

export const NavbarTop: React.FC<NavbarTopProps> = ({
  role,
  user,
  onOpenSettings,
  globalSearch,
  setGlobalSearch,
}) => {
  return (
    <header className="w-full bg-[#0b1326]/80 backdrop-blur-md border-b border-white/10 px-6 py-3.5 flex items-center justify-between sticky top-0 z-30">
      {/* Left Title / Branding */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-[#171f33] border border-white/10 text-[#4ade80]">
          <BookOpen className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-base font-bold text-[#4ade80] tracking-tight">Sociologia On-line</h1>
          <p className="text-xs text-[#bccabb] hidden sm:block">Ensino Médio e Plataforma Pedagógica</p>
        </div>
      </div>

      {/* Middle Search */}
      <div className="flex-1 max-w-md mx-4 hidden md:block">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#869486]" />
          <input
            type="text"
            value={globalSearch}
            onChange={(e) => setGlobalSearch(e.target.value)}
            placeholder="Buscar alunos, turmas ou atividades..."
            className="w-full bg-[#131b2e] border border-white/10 rounded-full pl-10 pr-4 py-2 text-sm text-[#dae2fd] placeholder-[#869486] focus:outline-none focus:border-[#4ade80]/50 transition-all"
          />
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        <button
          className="p-2 text-[#bccabb] hover:text-white hover:bg-[#171f33] rounded-full transition-colors relative cursor-pointer"
          title="Notificações"
        >
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#4ade80] rounded-full"></span>
        </button>

        <button
          onClick={onOpenSettings}
          className="p-2 text-[#bccabb] hover:text-white hover:bg-[#171f33] rounded-full transition-colors cursor-pointer"
          title="Configurações"
        >
          <Settings className="w-5 h-5" />
        </button>

        {user && (
          <div className="flex items-center gap-2 pl-2 border-l border-white/10">
            <img
              src={'avatarUrl' in user ? user.avatarUrl : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150'}
              alt={'name' in user ? user.name : user.fullName}
              className="w-8 h-8 rounded-full object-cover border border-[#4ade80]/30"
            />
            <div className="hidden lg:block text-left">
              <p className="text-xs font-bold text-white leading-tight">
                {'name' in user ? user.name : user.fullName}
              </p>
              <p className="text-[10px] text-[#bccabb]">
                {role === 'teacher' ? 'Professor' : ('turma' in user ? user.turma : 'Aluno')}
              </p>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
