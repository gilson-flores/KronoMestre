'use client';

import React from 'react';
import {
  LayoutDashboard,
  Users,
  FolderOpen,
  Settings,
  LogOut,
  FileCheck,
  X,
  BookOpen,
  MessageSquare,
  HeartHandshake
} from 'lucide-react';
import { TeacherUser } from '@/lib/types';
import { formatAvatarUrl } from '@/lib/utils';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  teacher: TeacherUser;
  onOpenNewContentModal: () => void;
  onLogout?: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
  unreadMessagesCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  setCurrentTab,
  teacher,
  onLogout,
  isMobileOpen = false,
  onCloseMobile,
  unreadMessagesCount = 0,
}) => {
  const navItems = [
    { id: 'painel', label: 'Studio', icon: LayoutDashboard },
    { id: 'atividades', label: 'Correções', icon: FileCheck },
    { id: 'mensagens', label: 'Mensagens', icon: MessageSquare, badge: unreadMessagesCount },
    { id: 'alunos', label: 'Alunos', icon: Users },
    { id: 'arquivos', label: 'Arquivos', icon: FolderOpen },
  ];


  const handleTabClick = (tabId: string) => {
    setCurrentTab(tabId);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  const sidebarContent = (
    <div className="flex flex-col justify-between h-full space-y-6">
      <div className="space-y-6">
        {/* Mobile Header Close Button */}
        <div className="flex md:hidden items-center justify-between pb-2 border-b border-white/10">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-[#4ade80]" />
            <span className="font-bold text-white text-sm">Navegação</span>
          </div>
          {onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className="p-2 text-[#bccabb] hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Fechar Menu"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Brand / Profile section */}
        <div className="flex flex-col items-center pt-2 text-center">
          <div className="relative mb-3">
            <img
              src={formatAvatarUrl(teacher.avatarUrl)}
              alt={teacher.name || 'Professor'}
              className="w-20 h-20 rounded-full object-cover border-2 border-[#4ade80]/40 shadow-lg"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=250';
              }}
            />
            <span className="absolute bottom-0 right-1 w-4 h-4 bg-[#4ade80] border-2 border-[#0b1326] rounded-full"></span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white">{teacher.name}</h2>
          <p className="text-xs text-[#bccabb] font-medium mt-0.5 mb-2.5">{teacher.subject}</p>

          {/* Configurações & Sair buttons below teacher name */}
          <div className="flex flex-col items-center gap-2 w-full">
            <button
              onClick={() => handleTabClick('configuracoes')}
              className={`inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer w-full max-w-[200px] min-h-[40px] ${
                currentTab === 'configuracoes'
                  ? 'bg-[#4ade80] text-[#003919] shadow-md'
                  : 'bg-[#171f33] text-[#bccabb] hover:text-white hover:bg-[#222a3d] border border-white/10'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>Configurações</span>
            </button>

            {onLogout && (
              <button
                onClick={() => {
                  if (onCloseMobile) onCloseMobile();
                  onLogout();
                }}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border border-rose-500/20 transition-all duration-200 cursor-pointer w-full max-w-[200px] min-h-[40px]"
              >
                <LogOut className="w-4 h-4" />
                <span>Sair</span>
              </button>
            )}
          </div>
        </div>

        {/* Nav links */}
        <nav className="space-y-2 pt-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleTabClick(item.id)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-sm font-semibold transition-all duration-200 cursor-pointer min-h-[44px] ${
                  isActive
                    ? 'bg-[#4ade80] text-[#003919] shadow-md'
                    : 'text-[#dae2fd] hover:bg-[#171f33] hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-[#003919]' : 'text-[#bccabb]'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && item.badge > 0 ? (
                  <span className={`px-2 py-0.5 text-[10px] font-extrabold rounded-full ${
                    isActive ? 'bg-[#003919] text-[#4ade80]' : 'bg-[#4ade80] text-[#003919]'
                  }`}>
                    {item.badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>

      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 bg-[#0b1326] border-r border-white/10 flex-col justify-between p-5 min-h-screen text-[#dae2fd] shrink-0 sticky top-0 h-screen overflow-y-auto">
        {sidebarContent}
      </aside>

      {/* Mobile Slide-over Drawer Backdrop */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex animate-fadeIn">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
            onClick={onCloseMobile}
          />
          <aside className="relative w-4/5 max-w-xs bg-[#0b1326] border-r border-white/10 p-5 text-[#dae2fd] h-full overflow-y-auto z-10 shadow-2xl flex flex-col justify-between">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
};
