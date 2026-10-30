import { TurmaFilterDropdown, extractAllTurmasFromData, isTurmaMatchedByFilter } from '@/components/TurmaFilterDropdown';
'use client';

import React, { useState, useMemo } from 'react';
import {
  FileText,
  Plus,
  Search,
  Filter,
  Users,
  Settings,
  Edit,
  Trash2,
  FileDown,
  CopyPlus,
  HeartHandshake,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  Gamepad2
} from 'lucide-react';
import { Activity, StudentUser } from '@/lib/types';
import { getActivityGradeDistribution, getOriginalTurmas, getTurmaLabel , getActivityStudentAndSubmissionCounts } from "@/lib/studentUtils";

interface DashboardViewProps {
  activities: Activity[];
  students: StudentUser[];
  title: string;
  subtitle: string;
  isCorrecoesTab?: boolean;
  onOpenNewActivityModal: () => void;
  onSelectActivityForGrading: (activity: Activity) => void;
  onEditActivity: (activity: Activity) => void;
  onViewActivity: (activity: Activity) => void;
  onGenerateDossier: (activity: Activity) => void;
  onDeleteActivity: (activity: Activity) => void;
  onSaveActivity: (activity: Activity) => void;
  onCreateAdaptedActivity?: (activity: Activity) => void;
  onOpenParallelRecoveryModal?: (activity: Activity) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  activities,
  students,
  title,
  subtitle,
  isCorrecoesTab = false,
  onOpenNewActivityModal,
  onSelectActivityForGrading,
  onEditActivity,
  onViewActivity,
  onGenerateDossier,
  onDeleteActivity,
  onSaveActivity,
  onCreateAdaptedActivity,
  onOpenParallelRecoveryModal,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'Ativo' | 'Inativo' | 'Todos'>('Ativo');
  const [selectedTurmas, setSelectedTurmas] = useState<string[]>(['all']);
  
  const [expandedActId, setExpandedActId] = useState<string | null>(null);

  const turmasDisponiveis = useMemo(() => extractAllTurmasFromData(students, activities.map(a => a.turma)), [students, activities]);

  // Formatação padronizada: (Modo) AV1 ou RP1
  const getShortActivityTitle = (act: Activity) => {
    const isRec = Boolean(act.isRecovery || act.type === 'Recuperação Paralela' || act.recoveryFromId);
    if (isRec) {
      const recList = activities.filter(
        (a) => a.isRecovery || a.type === 'Recuperação Paralela' || Boolean(a.recoveryFromId)
      );
      const idx = recList.findIndex((a) => a.id === act.id);
      return `RP${idx >= 0 ? idx + 1 : 1}`;
    }
    const regList = activities.filter(
      (a) => !a.isRecovery && a.type !== 'Recuperação Paralela' && !a.recoveryFromId
    );
    const idx = regList.findIndex((a) => a.id === act.id);
    const num = idx >= 0 ? idx + 1 : 1;
    const mode =
      act.isGameActivity || act.gameData || act.type === 'Jogo Avaliativo'
        ? 'KronoGame'
        : act.type || 'Avaliação';
    return `(${mode}) AV${num}`;
  };

  const filteredActivities = useMemo(() => {
      return activities.filter((act) => {
        if (statusFilter !== 'Todos' && act.status !== statusFilter) {
          if (!(statusFilter === 'Inativo' && (act.status === 'Prazo Encerrado' || act.status === 'Inativo'))) {
            return false;
          }
        }
        if (!isTurmaMatchedByFilter(act.turma, selectedTurmas, turmasDisponiveis, 'activity')) {
          return false;
        }
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          return (
            (act.title && act.title.toLowerCase().includes(query)) ||
            (act.type && act.type.toLowerCase().includes(query)) ||
            (act.turma && act.turma.toLowerCase().includes(query))
          );
        }
        return true;
      });
    }, [activities, statusFilter, selectedTurmas, turmasDisponiveis, searchQuery]);

  const toggleExpand = (id: string) => {
    setExpandedActId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-fadeIn pb-12">
      {/* Cabeçalho da View */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-border">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-xl bg-primary/10 border border-primary/30 text-primary">
              <FileText className="w-5 h-5" />
            </span>
            <span className="text-xs font-black uppercase tracking-wider text-primary">
              Avaliações & Métricas
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-foreground tracking-tight">
            {title}
          </h1>
          <p className="text-xs sm:text-sm text-muted mt-1 max-w-2xl leading-relaxed">
            {subtitle}
          </p>
        </div>
        {!isCorrecoesTab && (
          <button
            onClick={onOpenNewActivityModal}
            className="w-full md:w-auto py-3 px-6 bg-primary hover:bg-primary-hover text-white font-black text-xs sm:text-sm rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20 cursor-pointer active:scale-95"
          >
            <Plus className="w-5 h-5 stroke-[2.5]" />
            Nova Atividade
          </button>
        )}
      </div>

      {/* Barra de Filtros Inteligente */}
      <div className="glass-panel p-4 sm:p-5 rounded-3xl border border-border bg-surface shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Busca e Botão de Expansão de Turmas */}
          <div className="flex flex-1 items-center gap-3">
            <div className="flex-1 max-w-sm">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar missão..."
                className="w-full bg-background border border-border rounded-2xl px-4 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary transition-all"
              />
            </div>
            <div className="w-64">
              <TurmaFilterDropdown
                turmasList={turmasDisponiveis}
                selectedTurmas={selectedTurmas}
                onChange={setSelectedTurmas}
                students={students}
                totalCountLabel="alunos"
              />
            </div>
          </div>

          {/* Filtro de Status (Pílulas) */}
          <div className="flex items-center gap-1.5 p-1 bg-background rounded-2xl border border-border">
            {['Ativo', 'Inativo', 'Todos'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status as any)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === status
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-muted hover:text-foreground hover:bg-surface-hover'
                }`}
              >
                {status === 'Inativo' ? 'Encerradas' : status === 'Ativo' ? 'Ativas' : 'Todas'}
              </button>
            ))}
          </div>
        </div>

        {/* Expansão do Filtro de Turmas (Painel Limpo) */}
         className={`px-3 py-2 border rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${act.isRcoPosted ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/30" : "bg-surface hover:bg-surface-hover text-foreground border-border"}`}>
      <FileText className="w-3.5 h-3.5" /> {act.isRcoPosted ? "Desmarcar RCO" : "Marcar Lançado (RCO)"}
    </button>

                      {onOpenParallelRecoveryModal && !isRec && (
                        <button onClick={() => onOpenParallelRecoveryModal(act)} className="px-3 py-2 bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer">
                          <CopyPlus className="w-3.5 h-3.5" /> Gerar Recuperação
                        </button>
                      )}

                      {onCreateAdaptedActivity && !act.isAdapted && !isRec && (
                        <button onClick={() => onCreateAdaptedActivity(act)} className="px-3 py-2 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer">
                          <HeartHandshake className="w-3.5 h-3.5" /> Adaptar PNE
                        </button>
                      )}

                      <button onClick={() => onGenerateDossier(act)} className="px-3 py-2 bg-surface hover:bg-surface-hover text-foreground border border-border rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer">
                        <FileDown className="w-3.5 h-3.5" /> Dossiê
                      </button>

                      <button onClick={() => { if(confirm(`Deseja excluir "${act.title}"?`)) onDeleteActivity(act); }} className="px-3 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ml-auto sm:ml-0">
                        <Trash2 className="w-3.5 h-3.5" /> Excluir
                      </button>
                    </div>

                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};