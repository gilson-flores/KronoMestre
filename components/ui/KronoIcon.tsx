'use client';

import React from 'react';
import {
  LucideIcon,
  LayoutDashboard,
  FileCheck,
  FileCheck2,
  Sparkles,
  FileSpreadsheet,
  MessageSquare,
  Users,
  BookOpen,
  FolderOpen,
  HeartHandshake,
  Database,
  Settings,
  LogOut,
  SlidersHorizontal,
  Search,
  Plus,
  Trophy,
  Gamepad2,
  Clock,
  Heart,
  AlertTriangle,
  Check,
  CheckCircle2,
  Trash2,
  Pencil,
  Eye,
  ShieldCheck,
  Lock,
  Unlock,
  Upload,
  UserPlus,
  RefreshCw,
  FolderDown,
  BarChart3,
  Award,
  Download,
  Menu,
  X,
  KeyRound,
  Send,
  Copy,
  BookMarked
} from 'lucide-react';

export type KronoIconVariant = 
  | 'default'
  | 'rpg'        // Borda dourada/âmbar de fantasia e RPG, gema mística
  | 'viking'     // Borda rúnica azul-gelo, aspecto nórdico e aço
  | 'mystic'     // Fúcsia/roxo arcano com glow cósmico
  | 'emerald'    // Verde esmeralda de vitalidade e sucesso
  | 'comic'      // Laranja/amarelo vibrante e descontraído
  | 'glow'       // Brilho difuso de alta fidelidade (neon ciano/azul)
  | 'badge'      // Moldura com profundidade e chanfro escuro
  | 'danger'     // Rubi/carmesim para alertas ou ações críticas
  | 'amber'      // Âmbar dourado de alerta e cronômetro
  | 'ghost'      // Minimalista translúcido
  | 'active';    // Destaque luminoso para item selecionado

export type KronoIconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface KronoIconProps extends React.HTMLAttributes<HTMLSpanElement> {
  icon: LucideIcon;
  variant?: KronoIconVariant;
  size?: KronoIconSize;
  badgeContent?: React.ReactNode;
  isActive?: boolean;
  withGlow?: boolean;
  className?: string;
  iconClassName?: string;
}

const sizeConfig: Record<KronoIconSize, { container: string; iconSize: string }> = {
  xs: { container: 'w-6 h-6 p-1 rounded-lg', iconSize: 'w-3.5 h-3.5' },
  sm: { container: 'w-8 h-8 p-1.5 rounded-xl', iconSize: 'w-4 h-4' },
  md: { container: 'w-10 h-10 p-2 rounded-2xl', iconSize: 'w-5 h-5' },
  lg: { container: 'w-12 h-12 p-2.5 rounded-2xl', iconSize: 'w-6 h-6' },
  xl: { container: 'w-14 h-14 p-3 rounded-3xl', iconSize: 'w-7 h-7' },
};

const variantClasses: Record<KronoIconVariant, string> = {
  default: 'bg-surface text-foreground border border-border shadow-sm',
  rpg: 'bg-gradient-to-br from-amber-500/25 via-amber-600/15 to-orange-950/50 text-amber-300 border border-amber-500/50 shadow-md shadow-amber-500/15 ring-1 ring-amber-400/30',
  viking: 'bg-gradient-to-br from-sky-500/25 via-cyan-600/15 to-slate-900/70 text-cyan-300 border border-cyan-400/50 shadow-md shadow-cyan-500/15 ring-1 ring-cyan-300/30',
  mystic: 'bg-gradient-to-br from-purple-500/25 via-fuchsia-600/15 to-indigo-950/50 text-fuchsia-300 border border-fuchsia-500/50 shadow-md shadow-fuchsia-500/15 ring-1 ring-fuchsia-400/30',
  emerald: 'bg-gradient-to-br from-emerald-500/25 via-teal-600/15 to-slate-900/60 text-emerald-300 border border-emerald-500/50 shadow-md shadow-emerald-500/15 ring-1 ring-emerald-400/30',
  comic: 'bg-gradient-to-br from-yellow-500/25 via-orange-500/20 to-rose-950/40 text-yellow-300 border border-yellow-400/50 shadow-md shadow-yellow-500/15 ring-1 ring-yellow-400/30',
  glow: 'bg-primary/25 text-primary border border-primary/50 shadow-lg shadow-primary/25 backdrop-blur-sm ring-1 ring-primary/30',
  badge: 'bg-[#171f33] text-foreground border border-border/90 shadow-inner',
  danger: 'bg-gradient-to-br from-rose-500/25 via-rose-600/15 to-red-950/50 text-rose-300 border border-rose-500/50 shadow-md shadow-rose-500/15 ring-1 ring-rose-400/30',
  amber: 'bg-gradient-to-br from-amber-500/25 via-yellow-600/15 to-stone-900/60 text-amber-300 border border-amber-400/50 shadow-md shadow-amber-500/15 ring-1 ring-amber-400/30',
  ghost: 'bg-transparent text-muted hover:text-foreground border border-transparent hover:border-border',
  active: 'bg-gradient-to-br from-emerald-500/35 via-emerald-600/25 to-slate-900 text-emerald-200 border border-emerald-400/70 shadow-lg shadow-emerald-500/25 ring-2 ring-emerald-400/40 font-bold',
};

/**
 * KronoIcon: Biblioteca de ícones exclusiva e reconstruída do KronoMestre.
 * Transforma ícones padrão em símbolos estilizados de RPG, fantasia nórdica,
 * magia arcana e tecnologia de ponta com micro-entalhes, gradientes temáticos
 * e profundidade dimensional.
 */
export const KronoIcon: React.FC<KronoIconProps> = ({
  icon: IconComponent,
  variant = 'default',
  size = 'md',
  badgeContent,
  isActive = false,
  withGlow = false,
  className = '',
  iconClassName = '',
  ...props
}) => {
  const { container, iconSize } = sizeConfig[size];
  const effectiveVariant = isActive ? 'active' : variant;
  const variantClass = variantClasses[effectiveVariant];

  return (
    <span
      className={`relative inline-flex items-center justify-center transition-all duration-200 select-none shrink-0 group ${container} ${variantClass} ${
        withGlow ? 'shadow-lg shadow-current/25' : ''
      } ${className}`}
      {...props}
    >
      {/* Detalhe ornamental de canto com micro-gemas para RPG e Viking */}
      {effectiveVariant === 'rpg' && (
        <span className="absolute -top-0.5 -right-0.5 w-1 h-1 rounded-full bg-amber-400/80 shadow-[0_0_3px_#fbbf24]" />
      )}
      {effectiveVariant === 'viking' && (
        <span className="absolute -top-0.5 -left-0.5 w-1 h-1 rounded-full bg-cyan-400/80 shadow-[0_0_3px_#22d3ee]" />
      )}
      {effectiveVariant === 'mystic' && (
        <span className="absolute -bottom-0.5 -right-0.5 w-1 h-1 rounded-full bg-fuchsia-400/80 shadow-[0_0_3px_#e879f9]" />
      )}

      <IconComponent
        className={`${iconSize} shrink-0 stroke-[2.2] transition-transform duration-200 group-hover:scale-110 ${iconClassName}`}
      />
      
      {badgeContent !== undefined && badgeContent !== null && (
        <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 text-[9px] font-extrabold rounded-full bg-amber-500 text-slate-950 shadow-md leading-none animate-pulse">
          {badgeContent}
        </span>
      )}
    </span>
  );
};

// =========================================================================
// ÍCONES SEMÂNTICOS PRÉ-ESTILIZADOS DO KRONOMESTRE
// =========================================================================

export const KronoDashboardIcon: React.FC<Omit<KronoIconProps, 'icon'>> = (props) => (
  <KronoIcon icon={LayoutDashboard} variant="rpg" {...props} />
);

export const KronoActivitiesIcon: React.FC<Omit<KronoIconProps, 'icon'>> = (props) => (
  <KronoIcon icon={FileCheck} variant="viking" {...props} />
);

export const KronoAeeIcon: React.FC<Omit<KronoIconProps, 'icon'>> = (props) => (
  <KronoIcon icon={Sparkles} variant="mystic" {...props} />
);

export const KronoCorrectionsIcon: React.FC<Omit<KronoIconProps, 'icon'>> = (props) => (
  <KronoIcon icon={FileCheck2} variant="emerald" {...props} />
);

export const KronoRcoIcon: React.FC<Omit<KronoIconProps, 'icon'>> = (props) => (
  <KronoIcon icon={FileSpreadsheet} variant="rpg" {...props} />
);

export const KronoMessagesIcon: React.FC<Omit<KronoIconProps, 'icon'>> = (props) => (
  <KronoIcon icon={MessageSquare} variant="glow" {...props} />
);

export const KronoStudentsIcon: React.FC<Omit<KronoIconProps, 'icon'>> = (props) => (
  <KronoIcon icon={Users} variant="viking" {...props} />
);

export const KronoCertificatesIcon: React.FC<Omit<KronoIconProps, 'icon'>> = (props) => (
  <KronoIcon icon={BookOpen} variant="mystic" {...props} />
);

export const KronoFilesIcon: React.FC<Omit<KronoIconProps, 'icon'>> = (props) => (
  <KronoIcon icon={FolderOpen} variant="comic" {...props} />
);

export const KronoSecondTeacherIcon: React.FC<Omit<KronoIconProps, 'icon'>> = (props) => (
  <KronoIcon icon={HeartHandshake} variant="mystic" {...props} />
);

export const KronoBackupIcon: React.FC<Omit<KronoIconProps, 'icon'>> = (props) => (
  <KronoIcon icon={Database} variant="glow" {...props} />
);

export const KronoSettingsIcon: React.FC<Omit<KronoIconProps, 'icon'>> = (props) => (
  <KronoIcon icon={Settings} variant="badge" {...props} />
);

export const KronoLogoutIcon: React.FC<Omit<KronoIconProps, 'icon'>> = (props) => (
  <KronoIcon icon={LogOut} variant="danger" {...props} />
);

export const KronoFilterIcon: React.FC<Omit<KronoIconProps, 'icon'>> = (props) => (
  <KronoIcon icon={SlidersHorizontal} variant="badge" {...props} />
);

export const KronoSearchIcon: React.FC<Omit<KronoIconProps, 'icon'>> = (props) => (
  <KronoIcon icon={Search} variant="badge" {...props} />
);

export const KronoPlusIcon: React.FC<Omit<KronoIconProps, 'icon'>> = (props) => (
  <KronoIcon icon={Plus} variant="emerald" {...props} />
);

export const KronoTrophyIcon: React.FC<Omit<KronoIconProps, 'icon'>> = (props) => (
  <KronoIcon icon={Trophy} variant="rpg" {...props} />
);

export const KronoGamepadIcon: React.FC<Omit<KronoIconProps, 'icon'>> = (props) => (
  <KronoIcon icon={Gamepad2} variant="comic" {...props} />
);

export const KronoClockIcon: React.FC<Omit<KronoIconProps, 'icon'>> = (props) => (
  <KronoIcon icon={Clock} variant="amber" {...props} />
);

export const KronoHeartIcon: React.FC<Omit<KronoIconProps, 'icon'>> = (props) => (
  <KronoIcon icon={Heart} variant="danger" {...props} />
);

export const KronoAlertIcon: React.FC<Omit<KronoIconProps, 'icon'>> = (props) => (
  <KronoIcon icon={AlertTriangle} variant="amber" {...props} />
);

export const KronoCheckIcon: React.FC<Omit<KronoIconProps, 'icon'>> = (props) => (
  <KronoIcon icon={CheckCircle2} variant="emerald" {...props} />
);

export const KronoTrashIcon: React.FC<Omit<KronoIconProps, 'icon'>> = (props) => (
  <KronoIcon icon={Trash2} variant="danger" {...props} />
);

export const KronoEditIcon: React.FC<Omit<KronoIconProps, 'icon'>> = (props) => (
  <KronoIcon icon={Pencil} variant="viking" {...props} />
);

export const KronoEyeIcon: React.FC<Omit<KronoIconProps, 'icon'>> = (props) => (
  <KronoIcon icon={Eye} variant="badge" {...props} />
);

export const KronoShieldIcon: React.FC<Omit<KronoIconProps, 'icon'>> = (props) => (
  <KronoIcon icon={ShieldCheck} variant="emerald" {...props} />
);

export const KronoUploadIcon: React.FC<Omit<KronoIconProps, 'icon'>> = (props) => (
  <KronoIcon icon={Upload} variant="viking" {...props} />
);

export const KronoUserPlusIcon: React.FC<Omit<KronoIconProps, 'icon'>> = (props) => (
  <KronoIcon icon={UserPlus} variant="emerald" {...props} />
);

export const KronoLockIcon: React.FC<Omit<KronoIconProps, 'icon'>> = (props) => (
  <KronoIcon icon={Lock} variant="badge" {...props} />
);

export const KronoUnlockIcon: React.FC<Omit<KronoIconProps, 'icon'>> = (props) => (
  <KronoIcon icon={Unlock} variant="emerald" {...props} />
);

export const KronoStatsIcon: React.FC<Omit<KronoIconProps, 'icon'>> = (props) => (
  <KronoIcon icon={BarChart3} variant="rpg" {...props} />
);

export const KronoAwardIcon: React.FC<Omit<KronoIconProps, 'icon'>> = (props) => (
  <KronoIcon icon={Award} variant="rpg" {...props} />
);

export const KronoDownloadIcon: React.FC<Omit<KronoIconProps, 'icon'>> = (props) => (
  <KronoIcon icon={Download} variant="viking" {...props} />
);

export const KronoMenuIcon: React.FC<Omit<KronoIconProps, 'icon'>> = (props) => (
  <KronoIcon icon={Menu} variant="viking" {...props} />
);

export const KronoCloseIcon: React.FC<Omit<KronoIconProps, 'icon'>> = (props) => (
  <KronoIcon icon={X} variant="danger" {...props} />
);

export const KronoBookIcon: React.FC<Omit<KronoIconProps, 'icon'>> = (props) => (
  <KronoIcon icon={BookMarked} variant="rpg" {...props} />
);

export const KronoKeyIcon: React.FC<Omit<KronoIconProps, 'icon'>> = (props) => (
  <KronoIcon icon={KeyRound} variant="amber" {...props} />
);

export const KronoSendIcon: React.FC<Omit<KronoIconProps, 'icon'>> = (props) => (
  <KronoIcon icon={Send} variant="glow" {...props} />
);

export const KronoCopyIcon: React.FC<Omit<KronoIconProps, 'icon'>> = (props) => (
  <KronoIcon icon={Copy} variant="badge" {...props} />
);

export const KronoSparklesIcon: React.FC<Omit<KronoIconProps, 'icon'>> = (props) => (
  <KronoIcon icon={Sparkles} variant="mystic" {...props} />
);
