'use client';
import { TurmaFilterDropdown, extractAllTurmasFromData, isTurmaMatchedByFilter } from '@/components/TurmaFilterDropdown';

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
  const [statusFilter, setStatusFilter] = useState<'Ativo' | 'Inativo' | 'Todos'>('Todos');
  const [selectedTurma, setSelectedTurma] = useState<string>('Todas');
  const [selectedTurmas, setSelectedTurmas] = useState<string[]>(['all']);
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  const [expandedActId, setExpandedActId] = useState<string | null>(null);

  const turmasDisponiveis = useMemo(() => extractAllTurmasFromData(students, activities.map((a) => a.turma)), [students, activities]);

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

  const isDeadlineExpired = (deadlineStr?: string): boolean => {
    if (!deadlineStr || typeof deadlineStr !== "string") return false;
    const clean = deadlineStr.trim();
    if (!clean || clean.toLowerCase() === "sem prazo") return false;
    const timeMatch = clean.match(/(\d{1,2}):(\d{2})/);
    const hours = timeMatch ? parseInt(timeMatch[1], 10) : 23;
    const minutes = timeMatch ? parseInt(timeMatch[2], 10) : 59;
    const brMatch = clean.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    if (brMatch) {
      const exp = new Date(parseInt(brMatch[3], 10), parseInt(brMatch[2], 10) - 1, parseInt(brMatch[1], 10), hours, minutes, 59, 999);
      return new Date().getTime() > exp.getTime();
    }
    const isoMatch = clean.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      const exp = new Date(parseInt(isoMatch[1], 10), parseInt(isoMatch[2], 10) - 1, parseInt(isoMatch[3], 10), hours, minutes, 59, 999);
      return new Date().getTime() > exp.getTime();
    }
    return false;
  };

  const filteredActivities = useMemo(() => {
    return activities.filter((act) => {
      const hasPendingSubs = Array.isArray(act.submissions) && act.submissions.some((s) => s.status === "pending");
      const isOperationalForTeacher = !act.isRcoPosted || hasPendingSubs;
      if (statusFilter === "Ativo" && !isOperationalForTeacher) return false;
      if (statusFilter === "Inativo" && isOperationalForTeacher) return false;
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
          <div className="flex flex-1 items-center gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar missão..."
                className="w-full bg-background border border-border rounded-2xl pl-10 pr-4 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary transition-all"
              />
            </div>
            
            <TurmaFilterDropdown
              turmasList={turmasDisponiveis}
              selectedTurmas={selectedTurmas}
              onChange={setSelectedTurmas}
              students={students}
              totalCountLabel="alunos"
            />
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
                {status === 'Inativo' ? 'RCO Lançado' : status === 'Ativo' ? 'Em Andamento' : 'Todas'}
              </button>
            ))}
          </div>
        </div>

        {/* Expansão do Filtro de Turmas (Painel Limpo) */}
        {isFilterExpanded && (
          <div className="pt-3 border-t border-border animate-fadeIn flex flex-wrap gap-2">
            <button
              onClick={() => { setSelectedTurma('Todas'); setIsFilterExpanded(false); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                selectedTurma === 'Todas' ? 'bg-primary text-white border-primary' : 'bg-background text-muted border-border hover:border-primary/50'
              }`}
            >
              Todas as Turmas
            </button>
            {turmasDisponiveis.map((t) => (
              <button
                key={t}
                onClick={() => { setSelectedTurma(t); setIsFilterExpanded(false); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border flex items-center gap-1.5 ${
                  selectedTurma === t ? 'bg-primary text-white border-primary' : 'bg-background text-muted border-border hover:border-primary/50'
                }`}
              >
                <Users className="w-3.5 h-3.5 opacity-70" />
                Turma {getTurmaLabel(t)}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lista de Atividades Minimalista */}
      <div className="space-y-4">
        {filteredActivities.length === 0 ? (
          <div className="p-12 text-center rounded-3xl border border-dashed border-border bg-surface text-muted space-y-3 shadow-sm">
            <FileText className="w-12 h-12 mx-auto opacity-50" />
            <p className="text-base font-bold text-foreground">Nenhuma missão encontrada.</p>
            <p className="text-xs">Ajuste os filtros ou crie uma nova atividade.</p>
          </div>
        ) : (
          filteredActivities.map((act) => {
            const shortName = getShortActivityTitle(act);
            const isExpanded = expandedActId === act.id;
            const targetStudents = students.filter(s => isTurmaMatchedByFilter(s.turma, selectedTurmas, turmasDisponiveis, "student"));
            const metrics = getActivityStudentAndSubmissionCounts(act, activities, targetStudents);
            const subCount = metrics.subCount;
            const pendingCount = metrics.pendingCount;
            const totalCount = metrics.expectedStudentsCount > 0 ? metrics.expectedStudentsCount : 1;
            const progress = totalCount > 0 ? Math.round((subCount / totalCount) * 100) : 0;
            const isRec = Boolean(act.isRecovery || act.type === 'Recuperação Paralela' || act.recoveryFromId);

            return (
              <div key={act.id} className="glass-panel rounded-3xl border border-border bg-surface shadow-md transition-all overflow-hidden">
                {/* Cabeçalho do Card (Visão Minimalista) */}
                <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  
                  <div className="flex items-start gap-4 min-w-0 flex-1">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border shadow-sm ${
                      isRec ? 'bg-amber-500/10 border-amber-500/30 text-amber-500' : 'bg-primary/10 border-primary/30 text-primary'
                    }`}>
                      {isRec ? <AlertCircle className="w-6 h-6" /> : <FileText className="w-6 h-6" />}
                    </div>
                    
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border ${
                          isRec ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-primary/20 text-primary border-primary/40'
                        }`}>
                          {shortName}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-background border border-border text-muted flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {act.deadline || 'Sem Prazo'}
                        </span>
                        {act.status === 'Ativo' && !isDeadlineExpired(act.deadline) ? (
                          <span className="text-[10px] font-bold text-emerald-400">● Ativa p/ Alunos</span>
                        ) : isDeadlineExpired(act.deadline) ? (
                          <span className="text-[10px] font-bold text-amber-400">● Prazo Encerrado</span>
                        ) : (
                          <span className="text-[10px] font-bold text-rose-400">● Desativada</span>
                        )}
{act.isRcoPosted && <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">✅ RCO Lançado</span>}
                      </div>
                      
                      <h3 className="text-base sm:text-lg font-black text-foreground truncate" title={act.title}>
                        {act.title}
                      </h3>
                      
                      {/* Barra de Progresso Rápida */}
                      <div className="flex items-center gap-3 mt-2 max-w-sm">
                        <div className="flex-1 h-1.5 bg-background rounded-full overflow-hidden border border-border">
                          <div className={`h-full rounded-full ${isRec ? 'bg-amber-400' : 'bg-primary'}`} style={{ width: `${progress}%` }} />
                        </div>
                        <span className="text-[10px] font-bold text-muted whitespace-nowrap">
                          {subCount}/{totalCount} entregas
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Ações Primárias (Direita) */}
                  <div className="flex items-center gap-2 shrink-0 border-t md:border-t-0 border-border pt-3 md:pt-0 mt-3 md:mt-0">
                    <button
                      onClick={() => onSaveActivity({ ...act, status: act.status === "Ativo" ? "Inativo" : "Ativo" })}
                      className={`py-2 px-3 font-bold text-xs rounded-xl border transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm ${
                        act.status === "Ativo"
                          ? "bg-emerald-500/10 hover:bg-rose-500/20 text-emerald-400 hover:text-rose-300 border-emerald-500/30 hover:border-rose-500/40"
                          : "bg-rose-500/10 hover:bg-emerald-500/20 text-rose-400 hover:text-emerald-300 border-rose-500/30 hover:border-emerald-500/40"
                      }`}
                      title={act.status === "Ativo" ? "Clique para desativar manualmente para os alunos" : "Clique para ativar manualmente para os alunos"}
                    >
                      <span>{act.status === "Ativo" ? "Desativar" : "Ativar"}</span>
                    </button>

                    <button
                      onClick={() => onSelectActivityForGrading(act)}
                      className="flex-1 md:flex-none py-2 px-4 bg-[#171f33] hover:bg-primary text-white border border-border hover:border-primary font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Correções</span>
                      {pendingCount > 0 && (
                        <span className="bg-rose-500 text-white px-1.5 py-0.5 rounded-md text-[10px] ml-1">{pendingCount}</span>
                      )}
                    </button>
                    
                    <button
                      onClick={() => toggleExpand(act.id)}
                      className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-center ${
                        isExpanded ? 'bg-primary/20 border-primary text-primary' : 'bg-background border-border text-muted hover:text-foreground hover:bg-surface-hover'
                      }`}
                      title="Gestão e Detalhes"
                    >
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <Settings className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Gaveta de Gestão / Detalhes Expansível */}
                {isExpanded && (
                  <div className="p-4 sm:p-5 border-t border-border bg-background/50 animate-fadeIn space-y-5">
                    
                    {/* Metadados e Travas */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div className="space-y-2">
                        <strong className="text-muted block uppercase tracking-wider text-[10px]">Turmas Vinculadas:</strong>
                        <p className="text-foreground bg-surface p-2 rounded-lg border border-border leading-relaxed">
                          {act.turma}
                        </p>
                      </div>
                      
                      <div className="space-y-2">
                        <strong className="text-muted block uppercase tracking-wider text-[10px]">Travas de Segurança:</strong>
                        <div className="flex flex-wrap gap-1.5">
                          {act.securityFocusLock ? <span className="bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2 py-1 rounded-md">🛡️ Trava de Foco</span> : <span className="bg-surface text-muted border border-border px-2 py-1 rounded-md opacity-50">Foco Livre</span>}
                          {act.securityBlockCopyStatement ? <span className="bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2 py-1 rounded-md">🚫 Sem Cópia</span> : <span className="bg-surface text-muted border border-border px-2 py-1 rounded-md opacity-50">Cópia Livre</span>}
                          {act.securityBlockPasteEssay ? <span className="bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-1 rounded-md">🚫 Sem Cola</span> : <span className="bg-surface text-muted border border-border px-2 py-1 rounded-md opacity-50">Cola Livre</span>}
                        </div>
                      </div>
                    </div>

                    {/* Botões de CRUD / Ações Secundárias */}
                    <div className="pt-4 border-t border-border flex flex-wrap items-center justify-end gap-2">
                      <button onClick={() => onViewActivity(act)} className="px-3 py-2 bg-surface hover:bg-surface-hover text-foreground border border-border rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer">
                        <Search className="w-3.5 h-3.5" /> Ver Detalhes
                      </button>

                      <button onClick={() => onEditActivity(act)} className="px-3 py-2 bg-surface hover:bg-surface-hover text-foreground border border-border rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer">
                        <Edit className="w-3.5 h-3.5" /> Editar
                      </button>

    <button onClick={() => onSaveActivity({ ...act, isRcoPosted: !act.isRcoPosted })} className={`px-3 py-2 border rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${act.isRcoPosted ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/30" : "bg-surface hover:bg-surface-hover text-foreground border-border"}`}>
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