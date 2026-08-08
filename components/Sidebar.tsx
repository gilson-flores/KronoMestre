'use client';

import React from 'react';
import {
  LayoutDashboard,
  Users,
  FolderOpen,
  Settings,
  LogOut,
  FileCheck
} from 'lucide-react';
import { TeacherUser } from '@/lib/types';
import { formatAvatarUrl } from '@/lib/utils';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  teacher: TeacherUser;
  onOpenNewContentModal: () => void;
  onLogout?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  setCurrentTab,
  teacher,
  onLogout,
}) => {
  const navItems = [
    { id: 'painel', label: 'Studio', icon: LayoutDashboard },
    { id: 'atividades', label: 'Correções', icon: FileCheck },
    { id: 'alunos', label: 'Alunos', icon: Users },
    { id: 'arquivos', label: 'Arquivos', icon: FolderOpen },
  ];

  return (
    <aside className="w-64 bg-[#0b1326] border-r border-white/10 flex flex-col justify-between p-5 min-h-screen text-[#dae2fd] shrink-0">
      <div className="space-y-6">
        {/* Brand / Profile section */}
        <div className="flex flex-col items-center pt-2 text-center">
          <div className="relative mb-3">
            <img
              src={formatAvatarUrl(teacher.avatarUrl)}
              alt={teacher.name || 'Professor'}
              className="w-20 h-20 rounded-full object-cover border-2 border-[#4ade80]/40 shadow-lg"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250';
              }}
            />
            <span className="absolute bottom-0 right-1 w-4 h-4 bg-[#4ade80] border-2 border-[#0b1326] rounded-full"></span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white">{teacher.name}</h2>
          <p className="text-xs text-[#bccabb] font-medium mt-0.5 mb-2.5">{teacher.subject}</p>

          {/* Configurações & Sair buttons below teacher name */}
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={() => setCurrentTab('configuracoes')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer ${
                currentTab === 'configuracoes'
                  ? 'bg-[#4ade80] text-[#003919] shadow-md'
                  : 'bg-[#171f33] text-[#bccabb] hover:text-white hover:bg-[#222a3d] border border-white/10'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Configurações</span>
            </button>

            {onLogout && (
              <button
                onClick={onLogout}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border border-rose-500/20 transition-all duration-200 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sair</span>
              </button>
            )}
          </div>
        </div>

        {/* Nav links */}
        <nav className="space-y-1.5 pt-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-full text-sm font-semibold transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-[#4ade80] text-[#003919] shadow-md'
                    : 'text-[#dae2fd] hover:bg-[#171f33] hover:text-white'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-[#003919]' : 'text-[#bccabb]'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </aside>
  );
};
