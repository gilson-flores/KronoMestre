'use client';

import React, { useEffect } from 'react';
import {
  LayoutDashboard,
  Users,
  FolderOpen,
  Settings,
  LogOut,
  FileCheck,
  FileCheck2,
  X,
  BookOpen,
  MessageSquare,
  HeartHandshake,
  FileSpreadsheet,
  Database
} from 'lucide-react';
import { TeacherUser } from '@/lib/types';
import { formatAvatarUrl } from '@/lib/utils';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  teacher: TeacherUser;
  onOpenNewContentModal?: () => void;
  onLogout?: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
  unreadMessagesCount?: number;
  pendingCorrectionsCount?: number;
  hiddenNavItems?: string[];
  role?: 'teacher' | 'second_teacher';
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  setCurrentTab,
  teacher,
  onLogout,
  isMobileOpen = false,
  onCloseMobile,
  unreadMessagesCount = 0,
  pendingCorrectionsCount = 0,
  hiddenNavItems = [],
  role = 'teacher',
}) => {
  // Travar o scroll do body quando o menu lateral mobile estiver aberto
  useEffect(() => {
    if (isMobileOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isMobileOpen]);

  // Fechar o menu com a tecla Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMobileOpen && onCloseMobile) {
        onCloseMobile();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileOpen, onCloseMobile]);

  const baseNavItems = role === 'second_teacher'
    ? [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'alunos', label: 'Alunos', icon: Users },
        { id: 'atestados_rad', label: 'Atestados e RAD', icon: BookOpen },
        { id: 'arquivos', label: 'Biblioteca de Arquivos', icon: FolderOpen },
      ]
    : [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'atividades', label: 'Atividades', icon: FileCheck },
        { id: 'correcoes', label: 'Correções', icon: FileCheck2, badge: pendingCorrectionsCount },
        { id: 'postagem_rco', label: 'Postagem RCO', icon: FileSpreadsheet },
        { id: 'mensagens', label: 'Mensagens', icon: MessageSquare, badge: unreadMessagesCount },
        { id: 'alunos', label: 'Alunos', icon: Users },
        { id: 'atestados_rad', label: 'Atestados e RAD', icon: BookOpen },
        { id: 'arquivos', label: 'Arquivos', icon: FolderOpen },
        { id: '2_professor', label: '2º Professor', icon: HeartHandshake },
        { id: 'backup_recuperacao', label: 'Backup e Recuperação', icon: Database },
      ];

  const navItems = baseNavItems;

  const handleTabClick = (tabId: string) => {
    setCurrentTab(tabId);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  const sidebarContent = (
    <div className="flex flex-col justify-between min-h-full space-y-6 pb-6">
      <div className="space-y-6">
        {/* Mobile Header Close Button */}
        <div className="flex md:hidden items-center justify-between pb-2 border-b border-border">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            <span className="font-bold text-foreground text-sm">Menu do Professor</span>
          </div>
          {onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className="p-2 text-muted hover:text-foreground rounded-xl hover:bg-surface-hover transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center active:scale-95"
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
              className="w-18 h-18 sm:w-20 sm:h-20 rounded-full object-cover border-2 border-primary/40 shadow-lg"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=250';
              }}
            />
            <span className="absolute bottom-0 right-1 w-3.5 h-3.5 sm:w-4 sm:h-4 bg-primary border-2 border-surface rounded-full"></span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground break-words max-w-full">{teacher.name}</h2>
          <p className="text-xs text-muted font-medium mt-0.5 mb-2.5 break-words">{teacher.subject}</p>

          {/* Configurações & Sair buttons below teacher name */}
          <div className="flex flex-col items-center gap-2 w-full">
            <button
              onClick={() => handleTabClick('configuracoes')}
              className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer w-full max-w-[220px] min-h-[44px] active:scale-95 ${
                currentTab === 'configuracoes'
                  ? 'bg-primary text-white shadow-md'
                  : 'bg-[#171f33] text-muted hover:text-foreground hover:bg-surface-hover border border-border'
              }`}
            >
              <Settings className="w-4 h-4 shrink-0" />
              <span>Configurações</span>
            </button>

            {onLogout && (
              <button
                onClick={() => {
                  if (onCloseMobile) onCloseMobile();
                  onLogout();
                }}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full text-xs font-semibold text-rose-400 hover:text-rose-600 hover:bg-rose-500/10 border border-rose-500/20 transition-all duration-200 cursor-pointer w-full max-w-[220px] min-h-[44px] active:scale-95"
              >
                <LogOut className="w-4 h-4 shrink-0" />
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
                onClick={() => handleTabClick(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer min-h-[44px] active:scale-[0.98] ${
                  isActive
                    ? 'bg-primary text-white shadow-md'
                    : 'text-foreground hover:bg-[#171f33] hover:text-foreground'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-white' : 'text-muted'}`} />
                  <span className="truncate">{item.label}</span>
                </div>
                {item.badge && item.badge > 0 ? (
                  <span className={`px-2 py-0.5 text-[10px] font-extrabold rounded-full shrink-0 ml-2 ${
                    isActive ? 'bg-[#003919] text-primary' : 'bg-primary text-white'
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
      <aside className="hidden md:flex w-64 bg-background border-r border-border flex-col justify-between p-5 min-h-screen text-foreground shrink-0 sticky top-0 h-screen overflow-y-auto">
        {sidebarContent}
      </aside>

      {/* Mobile Slide-over Drawer Backdrop & Drawer */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity animate-fadeIn"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Menu de Navegação do Professor"
            className="relative w-4/5 max-w-xs bg-background border-r border-border p-4 sm:p-5 text-foreground h-full overflow-y-auto overscroll-contain z-10 shadow-2xl flex flex-col justify-between animate-in slide-in-from-left duration-250 ease-out"
          >
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
};

export default Sidebar;
