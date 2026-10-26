'use client';

import React from 'react';
import { BookOpen, Menu } from 'lucide-react';
import { UserRole, TeacherUser, StudentUser } from '@/lib/types';
import { formatAvatarUrl } from '@/lib/utils';
import { KronoIcon } from '@/components/ui/KronoIcon';

interface NavbarTopProps {
  role: UserRole;
  user: TeacherUser | StudentUser | null;
  onOpenSettings?: () => void;
  globalSearch?: string;
  setGlobalSearch?: (q: string) => void;
  onToggleMobileMenu?: () => void;
}

export const NavbarTop: React.FC<NavbarTopProps> = ({
  role,
  user,
  onToggleMobileMenu,
}) => {
  return (
    <header className="w-full bg-background/90 backdrop-blur-md border-b border-border px-4 sm:px-6 py-3 flex items-center justify-between sticky top-0 z-30 min-h-[56px]">
      {/* Left Title / Branding + Mobile Menu Trigger */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {onToggleMobileMenu && (
          <button
            onClick={onToggleMobileMenu}
            className="p-1 rounded-xl transition-colors md:hidden cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0 active:scale-95"
            title="Menu de Navegação"
            aria-label="Abrir Menu"
          >
            <KronoIcon icon={Menu} variant="viking" size="sm" />
          </button>
        )}

        <KronoIcon icon={BookOpen} variant="rpg" size="sm" withGlow className="hidden sm:inline-flex" />
        <div className="min-w-0">
          <h1 className="text-sm sm:text-base font-bold text-primary tracking-tight truncate">
            KronoMestre
          </h1>
          <p className="text-xs text-muted hidden sm:block truncate">Ensino Médio e Plataforma Pedagógica</p>
        </div>
      </div>

      {/* Right Controls: Online Students Counter + User Profile (Presença Real sem dados fantasmas) */}
      <div className="flex items-center gap-2.5 sm:gap-4 shrink-0">
      </div>
    </header>
  );
};

export default NavbarTop;
