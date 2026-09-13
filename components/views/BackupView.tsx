'use client';

import React, { useState, useMemo } from 'react';
import {
  Database,
  Download,
  AlertTriangle,
  ShieldCheck,
  Archive,
  CheckCircle2,
  X,
  Layers,
  Search,
  Calendar,
  Eye,
  FileText,
  User,
  RotateCcw,
  BookOpen,
  Clock,
  Award,
} from 'lucide-react';
import { Activity, StudentUser } from '@/lib/types';

interface BackupViewProps {
  students?: StudentUser[];
  activities?: Activity[];
  onArchiveVinculo?: (
    reason: string
  ) => Promise<{ success: boolean; studentsCount: number; activitiesCount: number; error?: string }>;
  onNavigateToDashboard?: () => void;
}

export const BackupView: React.FC<BackupViewProps> = ({
  students = [],
  activities = [],
  onArchiveVinculo,
  onNavigateToDashboard,
}) => {
  const [isDownloading, setIsDownloading] = useState(false);

  // Estados do Modal de Arquivamento
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [archiveReason, setArchiveReason] = useState('Troca de vínculo');
  const [confirmWord, setConfirmWord] = useState('');
  const [isSubmittingArchive, setIsSubmittingArchive] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Estados da Área de Consulta e Auditoria
  const [auditTab, setAuditTab] = useState<'students' | 'activities'>('students');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  // Estados dos Modais de Consulta (Somente Leitura)
  const [viewingArchivedStudent, setViewingArchivedStudent] = useState<StudentUser | null>(null);
  const [viewingArchivedActivity, setViewingArchivedActivity] = useState<Activity | null>(null);

  // Contagem estrita de registros ativos do vínculo atual
  const activeStudents = useMemo(() => students.filter((s) => !s.isArchived), [students]);
  const activeActivities = useMemo(() => activities.filter((a) => !a.isArchived), [activities]);
  const activeStudentsCount = activeStudents.length;
  const activeActivitiesCount = activeActivities.length;

  // Registros Arquivados
  const archivedStudents = useMemo(() => students.filter((s) => Boolean(s.isArchived)), [students]);
  const archivedActivities = useMemo(() => activities.filter((a) => Boolean(a.isArchived)), [activities]);
  const totalArchivedCount = archivedStudents.length + archivedActivities.length;

  // Formatação de data amigável e segura
  const formatDateTime = (isoDate?: string) => {
    if (!isoDate) return 'Data não registrada';
    try {
      const d = new Date(isoDate);
      if (isNaN(d.getTime())) return isoDate;
      return d.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoDate;
    }
  };

  const formatDateOnly = (isoDate?: string) => {
    if (!isoDate) return '-';
    try {
      const d = new Date(isoDate);
      if (isNaN(d.getTime())) return isoDate;
      return d.toLocaleDateString('pt-BR');
    } catch {
      return isoDate;
    }
  };

  // Filtragem de Alunos Arquivados
  const filteredArchivedStudents = useMemo(() => {
    return archivedStudents.filter((student) => {
      // Filtro de Texto (Nome, Matrícula, Turma ou Motivo)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = student.fullName?.toLowerCase().includes(q);
        const matchMatricula = student.matricula?.toLowerCase().includes(q);
        const matchTurma = student.turma?.toLowerCase().includes(q);
        const matchReason = student.archivedReason?.toLowerCase().includes(q);
        if (!matchName && !matchMatricula && !matchTurma && !matchReason) {
          return false;
        }
      }

      // Filtro de Data Inicial
      if (filterStartDate && student.archivedAt) {
        const itemDate = new Date(student.archivedAt);
        const start = new Date(filterStartDate + 'T00:00:00');
        if (itemDate < start) return false;
      }

      // Filtro de Data Final
      if (filterEndDate && student.archivedAt) {
        const itemDate = new Date(student.archivedAt);
        const end = new Date(filterEndDate + 'T23:59:59');
        if (itemDate > end) return false;
      }

      return true;
    });
  }, [archivedStudents, searchQuery, filterStartDate, filterEndDate]);

  // Filtragem de Atividades Arquivadas
  const filteredArchivedActivities = useMemo(() => {
    return archivedActivities.filter((act) => {
      // Filtro de Texto (Título, Disciplina, Turma ou Motivo)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = act.title?.toLowerCase().includes(q);
        const matchSubject = act.subject?.toLowerCase().includes(q);
        const matchTurma = act.turma?.toLowerCase().includes(q);
        const matchReason = act.archivedReason?.toLowerCase().includes(q);
        if (!matchTitle && !matchSubject && !matchTurma && !matchReason) {
          return false;
        }
      }

      // Filtro de Data Inicial
      if (filterStartDate && act.archivedAt) {
        const itemDate = new Date(act.archivedAt);
        const start = new Date(filterStartDate + 'T00:00:00');
        if (itemDate < start) return false;
      }

      // Filtro de Data Final
      if (filterEndDate && act.archivedAt) {
        const itemDate = new Date(act.archivedAt);
        const end = new Date(filterEndDate + 'T23:59:59');
        if (itemDate > end) return false;
      }

      return true;
    });
  }, [archivedActivities, searchQuery, filterStartDate, filterEndDate]);

  // Submissões do aluno atualmente em consulta
  const studentArchivedSubmissions = useMemo(() => {
    if (!viewingArchivedStudent) return [];
    const stId = viewingArchivedStudent.id;
    const stMat = viewingArchivedStudent.matricula;

    const list: { activity: Activity; submission: any }[] = [];
    activities.forEach((act) => {
      const sub = act.submissions?.find(
        (s) => (s.studentId && s.studentId === stId) || (s.matricula && s.matricula === stMat)
      );
      if (sub) {
        list.push({ activity: act, submission: sub });
      }
    });
    return list;
  }, [viewingArchivedStudent, activities]);

  const hasActiveFilters = Boolean(searchQuery.trim() || filterStartDate || filterEndDate);

  const handleResetFilters = () => {
    setSearchQuery('');
    setFilterStartDate('');
    setFilterEndDate('');
  };

  const handleDownload = () => {
    setIsDownloading(true);
    // Dispara o download nativamente chamando a rota de exportação
    window.location.href = '/api/export-backup?token=BACKUP_SEGURO_2026';

    // Feedback rápido para reabilitar o botão
    setTimeout(() => {
      setIsDownloading(false);
    }, 3000);
  };

  const handleOpenArchiveModal = () => {
    setArchiveReason('Troca de vínculo');
    setConfirmWord('');
    setFeedbackMessage(null);
    setIsArchiveModalOpen(true);
  };

  const handleCloseArchiveModal = () => {
    if (isSubmittingArchive) return;
    setIsArchiveModalOpen(false);
    setConfirmWord('');
  };

  const handleConfirmArchive = async () => {
    if (confirmWord.trim().toUpperCase() !== 'ARQUIVAR' || isSubmittingArchive) {
      return;
    }

    if (!onArchiveVinculo) {
      setFeedbackMessage({
        type: 'error',
        text: 'Ação de arquivamento indisponível.',
      });
      return;
    }

    setIsSubmittingArchive(true);
    setFeedbackMessage(null);

    try {
      const result = await onArchiveVinculo(archiveReason);

      if (result.success) {
        setIsArchiveModalOpen(false);
        setFeedbackMessage({
          type: 'success',
          text: `${result.studentsCount} alunos e ${result.activitiesCount} atividades arquivados com sucesso.`,
        });

        // Redireciona para o dashboard após breve intervalo de feedback
        if (onNavigateToDashboard) {
          setTimeout(() => {
            onNavigateToDashboard();
          }, 1200);
        }
      } else {
        setFeedbackMessage({
          type: 'error',
          text: result.error || 'Não foi possível concluir o arquivamento.',
        });
      }
    } catch (err: any) {
      setFeedbackMessage({
        type: 'error',
        text: err?.message || 'Ocorreu um erro ao processar o arquivamento.',
      });
    } finally {
      setIsSubmittingArchive(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 animate-fadeIn text-foreground">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* CABEÇALHO */}
        <header className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 text-primary rounded-2xl border border-primary/20">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                Backup e Recuperação
              </h1>
              <p className="text-sm text-text-muted mt-1">
                Gere cópias de segurança (snapshots) de todos os dados do sistema e gerencie o ciclo dos seus vínculos docentes.
              </p>
            </div>
          </div>
        </header>

        {/* FEEDBACK GLOBAL DE SUCESSO / ERRO */}
        {feedbackMessage && (
          <div
            id="backup-feedback-banner"
            className={`p-4 rounded-2xl border flex items-center gap-3 ${
              feedbackMessage.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
            }`}
          >
            {feedbackMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-5 h-5 shrink-0 text-rose-400" />
            )}
            <span className="text-sm font-semibold">{feedbackMessage.text}</span>
          </div>
        )}

        {/* SEÇÃO 1: EXPORTAR BACKUP */}
        <section
          id="section-backup-export"
          className="bg-surface border border-border rounded-3xl p-6 sm:p-8 shadow-sm space-y-6"
        >
          <div className="flex items-start gap-4">
            <div className="p-3 bg-primary/10 text-primary rounded-2xl shrink-0">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Backup em Tempo Real</h2>
              <p className="text-sm text-text-muted mt-2 leading-relaxed">
                Ao clicar em &quot;Exportar Banco de Dados&quot;, o sistema irá varrer todas as tabelas e compilar um arquivo{' '}
                <strong className="text-foreground">JSON unificado</strong> contendo a base de dados exata deste milissegundo.
                O arquivo inclui alunos matriculados, configurações de professores de apoio, laudos, histórico do fórum/chat e
                todas as atividades ou recuperações cadastradas.
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-border flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-primary">
              <ShieldCheck className="w-4 h-4" />
              Conexão Segura e Criptografada
            </div>

            <button
              id="btn-exportar-backup"
              onClick={handleDownload}
              disabled={isDownloading}
              className="w-full sm:w-auto px-6 py-3 bg-primary hover:bg-[#00e664] text-white font-bold rounded-2xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
            >
              {isDownloading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Download className="w-5 h-5" />
              )}
              {isDownloading ? 'Gerando Arquivo...' : 'Exportar Banco de Dados'}
            </button>
          </div>
        </section>

        {/* SEÇÃO 2: ARQUIVAR VÍNCULO ATUAL */}
        <section
          id="section-archive-vinculo"
          className="bg-surface border border-border rounded-3xl p-6 sm:p-8 shadow-sm space-y-6"
        >
          <div className="flex items-start gap-4">
            <div className="p-3 bg-amber-500/10 text-amber-500 rounded-2xl shrink-0">
              <Archive className="w-5 h-5" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-lg font-bold text-foreground">Ciclo de Vínculo Docente</h2>
                <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  Troca de Contrato / Fim de Ano
                </span>
              </div>
              <p className="text-sm text-text-muted leading-relaxed">
                Finalizou seu contrato ACT ou encerrou o período letivo desta escola? Ao arquivar o vínculo, os{' '}
                <strong className="text-foreground">alunos e atividades atuais</strong> deixam de poluir o seu dia a dia,
                mas continuam integralmente seguros no banco para futuras consultas e auditorias escolares.
              </p>
            </div>
          </div>

          {/* INDICADORES DO VÍNCULO ATIVO */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="p-4 rounded-2xl bg-background/60 border border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs text-text-muted font-medium">Alunos Ativos</div>
                  <div className="text-lg font-black text-foreground">{activeStudentsCount} alunos</div>
                </div>
              </div>
              <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                No vínculo
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-background/60 border border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold">
                  <Archive className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs text-text-muted font-medium">Atividades Ativas</div>
                  <div className="text-lg font-black text-foreground">{activeActivitiesCount} atividades</div>
                </div>
              </div>
              <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
                No vínculo
              </span>
            </div>
          </div>

          {/* BOTÃO DISPARADOR DE ARQUIVAMENTO */}
          <div className="pt-4 border-t border-border flex flex-col sm:flex-row gap-4 items-center justify-between">
            <p className="text-xs text-text-muted leading-relaxed">
              * Ação segura: exige confirmação por palavra-chave e não apaga histórico de notas ou mensagens.
            </p>

            <button
              id="btn-open-archive-modal"
              onClick={handleOpenArchiveModal}
              disabled={activeStudentsCount === 0 && activeActivitiesCount === 0}
              className="w-full sm:w-auto px-6 py-3 bg-amber-600/90 hover:bg-amber-600 text-white font-bold rounded-2xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed min-h-[44px]"
            >
              <Archive className="w-5 h-5" />
              <span>Arquivar vínculo atual</span>
            </button>
          </div>
        </section>

        {/* SEÇÃO 3: CONSULTA E AUDITORIA DE REGISTROS ARQUIVADOS (PASSO ARQUIVO 4) */}
        <section
          id="section-archive-audit"
          className="bg-surface border border-border rounded-3xl p-6 sm:p-8 shadow-sm space-y-6"
        >
          {/* CABEÇALHO DA SEÇÃO */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-500/10 text-blue-400 rounded-2xl shrink-0">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 className="text-lg font-bold text-foreground">
                    Consulta e Auditoria de Registros Arquivados
                  </h2>
                  <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 uppercase tracking-wider">
                    Somente Leitura
                  </span>
                </div>
                <p className="text-sm text-text-muted mt-1 leading-relaxed">
                  Consulte dossiês, notas e entregas de vínculos anteriores com total fidelidade histórica.
                </p>
              </div>
            </div>

            {/* SELETOR DE SUB-ABAS */}
            <div className="flex items-center gap-1.5 p-1 bg-background border border-border rounded-2xl shrink-0">
              <button
                id="tab-btn-archived-students"
                type="button"
                onClick={() => setAuditTab('students')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer min-h-[36px] ${
                  auditTab === 'students'
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-text-muted hover:text-foreground'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>Alunos Arquivados ({archivedStudents.length})</span>
              </button>

              <button
                id="tab-btn-archived-activities"
                type="button"
                onClick={() => setAuditTab('activities')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer min-h-[36px] ${
                  auditTab === 'activities'
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-text-muted hover:text-foreground'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Atividades Arquivadas ({archivedActivities.length})</span>
              </button>
            </div>
          </div>

          {/* SE NÃO HOUVER NADA ARQUIVADO NO BANCO INTEIRO -> ESTADO VAZIO LIMPO E CLARO */}
          {totalArchivedCount === 0 ? (
            <div
              id="empty-state-no-archives"
              className="py-12 px-6 rounded-2xl border border-dashed border-border bg-background/40 flex flex-col items-center justify-center text-center space-y-3"
            >
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                <Archive className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-foreground">Nenhum registro arquivado ainda</h3>
              <p className="text-xs text-text-muted max-w-md leading-relaxed">
                Todos os seus {activeStudentsCount} alunos e {activeActivitiesCount} atividades pertencem ao vínculo ativo atual.
                Quando você realizar um arquivamento ao término de um contrato ou ano letivo, o histórico completo
                ficará disponível nesta área para consultas pedagógicas e auditorias escolares permanentes.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* BARRA DE FILTROS: BUSCA POR TEXTO/MOTIVO E INTERVALO DE DATAS */}
              <div className="p-4 rounded-2xl bg-background/80 border border-border grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                {/* CAMPO DE BUSCA TEXTUAL */}
                <div className="md:col-span-6 relative">
                  <Search className="w-4 h-4 text-text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="input-search-archived"
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={
                      auditTab === 'students'
                        ? 'Buscar por nome, matrícula, turma ou motivo (ex.: ACT 2026)...'
                        : 'Buscar por título, turma, disciplina ou motivo (ex.: ACT 2026)...'
                    }
                    className="w-full pl-9 pr-3 py-2.5 bg-surface border border-border rounded-xl text-xs text-foreground placeholder:text-text-muted focus:outline-none focus:border-primary transition-colors"
                  />
                </div>

                {/* FILTRO DE DATA INICIAL */}
                <div className="md:col-span-3 flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-text-muted shrink-0 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" /> De:
                  </span>
                  <input
                    id="input-date-start"
                    type="date"
                    value={filterStartDate}
                    onChange={(e) => setFilterStartDate(e.target.value)}
                    className="w-full px-2.5 py-2 bg-surface border border-border rounded-xl text-xs text-foreground focus:outline-none focus:border-primary transition-colors"
                  />
                </div>

                {/* FILTRO DE DATA FINAL */}
                <div className="md:col-span-3 flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-text-muted shrink-0 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" /> Até:
                  </span>
                  <input
                    id="input-date-end"
                    type="date"
                    value={filterEndDate}
                    onChange={(e) => setFilterEndDate(e.target.value)}
                    className="w-full px-2.5 py-2 bg-surface border border-border rounded-xl text-xs text-foreground focus:outline-none focus:border-primary transition-colors"
                  />
                  {hasActiveFilters && (
                    <button
                      id="btn-reset-filters"
                      type="button"
                      onClick={handleResetFilters}
                      title="Limpar filtros"
                      className="p-2 text-text-muted hover:text-foreground rounded-xl hover:bg-surface border border-border transition-colors shrink-0 cursor-pointer"
                      aria-label="Limpar filtros"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* LISTAGEM: ABA DE ALUNOS ARQUIVADOS */}
              {auditTab === 'students' && (
                <div className="space-y-3">
                  {filteredArchivedStudents.length === 0 ? (
                    <div className="p-8 text-center rounded-2xl border border-dashed border-border text-text-muted text-xs">
                      {hasActiveFilters
                        ? 'Nenhum aluno arquivado encontrado com os filtros selecionados.'
                        : 'Nenhum aluno arquivado no momento.'}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {filteredArchivedStudents.map((student) => (
                        <div
                          key={student.id}
                          className="p-4 rounded-2xl bg-background/60 border border-border hover:border-amber-500/40 transition-all flex flex-col justify-between gap-3 group"
                        >
                          <div className="space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 font-bold flex items-center justify-center shrink-0 text-sm">
                                  {student.fullName?.charAt(0) || 'A'}
                                </div>
                                <div>
                                  <h4 className="text-sm font-bold text-foreground leading-snug">
                                    {student.fullName}
                                  </h4>
                                  <div className="flex items-center gap-2 text-xs text-text-muted mt-0.5">
                                    <span>Turma {student.turma}</span>
                                    <span>•</span>
                                    <span>Matrícula {student.matricula}</span>
                                  </div>
                                </div>
                              </div>

                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/30 shrink-0">
                                Arquivado
                              </span>
                            </div>

                            {/* DADOS DO ARQUIVAMENTO */}
                            <div className="p-2.5 rounded-xl bg-surface border border-border text-xs space-y-1">
                              <div className="flex items-center justify-between text-text-muted text-[11px]">
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-amber-400" /> Arquivado em:
                                </span>
                                <span className="font-semibold text-foreground">
                                  {formatDateTime(student.archivedAt)}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-text-muted text-[11px]">
                                <span>Motivo:</span>
                                <span className="font-semibold text-foreground truncate max-w-[200px]" title={student.archivedReason}>
                                  {student.archivedReason || 'Troca de vínculo'}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* BOTÃO DE CONSULTA */}
                          <div className="pt-2 border-t border-border flex items-center justify-between">
                            <span className="text-[11px] text-text-muted">Dossiê e Notas</span>
                            <button
                              type="button"
                              onClick={() => setViewingArchivedStudent(student)}
                              className="px-3 py-1.5 rounded-xl bg-surface hover:bg-surface-hover text-foreground border border-border text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5 text-primary" />
                              <span>Consultar Aluno</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* LISTAGEM: ABA DE ATIVIDADES ARQUIVADAS */}
              {auditTab === 'activities' && (
                <div className="space-y-3">
                  {filteredArchivedActivities.length === 0 ? (
                    <div className="p-8 text-center rounded-2xl border border-dashed border-border text-text-muted text-xs">
                      {hasActiveFilters
                        ? 'Nenhuma atividade arquivada encontrada com os filtros selecionados.'
                        : 'Nenhuma atividade arquivada no momento.'}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {filteredArchivedActivities.map((act) => (
                        <div
                          key={act.id}
                          className="p-4 rounded-2xl bg-background/60 border border-border hover:border-amber-500/40 transition-all flex flex-col justify-between gap-3 group"
                        >
                          <div className="space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 font-bold flex items-center justify-center shrink-0">
                                  <FileText className="w-4 h-4" />
                                </div>
                                <div>
                                  <h4 className="text-sm font-bold text-foreground leading-snug line-clamp-1">
                                    {act.title}
                                  </h4>
                                  <div className="flex items-center gap-2 text-xs text-text-muted mt-0.5">
                                    <span>Turma {act.turma}</span>
                                    <span>•</span>
                                    <span>{act.type}</span>
                                  </div>
                                </div>
                              </div>

                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/30 shrink-0">
                                Arquivado
                              </span>
                            </div>

                            {/* DADOS DO ARQUIVAMENTO */}
                            <div className="p-2.5 rounded-xl bg-surface border border-border text-xs space-y-1">
                              <div className="flex items-center justify-between text-text-muted text-[11px]">
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-amber-400" /> Arquivado em:
                                </span>
                                <span className="font-semibold text-foreground">
                                  {formatDateTime(act.archivedAt)}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-text-muted text-[11px]">
                                <span>Motivo:</span>
                                <span className="font-semibold text-foreground truncate max-w-[200px]" title={act.archivedReason}>
                                  {act.archivedReason || 'Troca de vínculo'}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-text-muted text-[11px] pt-0.5">
                                <span>Total de Entregas:</span>
                                <span className="font-semibold text-foreground">
                                  {act.submissions?.length || 0} submissões
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* BOTÃO DE CONSULTA */}
                          <div className="pt-2 border-t border-border flex items-center justify-between">
                            <span className="text-[11px] text-text-muted">Enunciados e Notas</span>
                            <button
                              type="button"
                              onClick={() => setViewingArchivedActivity(act)}
                              className="px-3 py-1.5 rounded-xl bg-surface hover:bg-surface-hover text-foreground border border-border text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5 text-primary" />
                              <span>Consultar Atividade</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </section>
      </div>

      {/* MODAL 1: CONSULTA DE ALUNO ARQUIVADO (MODO SOMENTE LEITURA E AUDITORIA) */}
      {viewingArchivedStudent && (
        <div
          id="modal-view-archived-student-overlay"
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fadeIn"
        >
          <div
            id="modal-view-archived-student-content"
            className="bg-surface border border-border rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-6 shadow-2xl relative my-8"
          >
            {/* CABEÇALHO */}
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                    <Archive className="w-3 h-3" /> Arquivado (Somente Leitura)
                  </span>
                  <span className="text-xs text-text-muted">
                    Arquivado em: {formatDateTime(viewingArchivedStudent.archivedAt)}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-foreground mt-1">
                  {viewingArchivedStudent.fullName}
                </h3>
                <div className="flex items-center gap-3 text-xs text-text-muted">
                  <span>Turma: <strong>{viewingArchivedStudent.turma}</strong></span>
                  <span>•</span>
                  <span>Matrícula: <strong>{viewingArchivedStudent.matricula}</strong></span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setViewingArchivedStudent(null)}
                className="p-2 text-text-muted hover:text-foreground rounded-xl hover:bg-surface-hover transition-colors cursor-pointer"
                aria-label="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* DADOS DE CONTEXTO DO ARQUIVAMENTO */}
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-foreground space-y-1.5">
              <div className="font-semibold text-amber-400 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" /> Registro Histórico Preservado
              </div>
              <p className="text-text-muted">
                Motivo registrado: <strong className="text-foreground">{viewingArchivedStudent.archivedReason || 'Troca de vínculo'}</strong>
              </p>
              {viewingArchivedStudent.secondTeacherName && (
                <p className="text-text-muted">
                  2º Professor vinculado no período: <strong className="text-foreground">{viewingArchivedStudent.secondTeacherName}</strong>
                </p>
              )}
            </div>

            {/* NOTAS PEDAGÓGICAS (SE HOUVER) */}
            {viewingArchivedStudent.pedagogicalNotes && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted">
                  Anotações Pedagógicas Registradas:
                </h4>
                <div className="p-4 rounded-2xl bg-background border border-border text-xs text-foreground whitespace-pre-wrap leading-relaxed">
                  {viewingArchivedStudent.pedagogicalNotes}
                </div>
              </div>
            )}

            {/* HISTÓRICO DE SUBMISSÕES E NOTAS */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted">
                  Histórico de Atividades e Avaliações:
                </h4>
                <span className="text-xs text-text-muted font-medium">
                  {studentArchivedSubmissions.length} registro(s)
                </span>
              </div>

              {studentArchivedSubmissions.length === 0 ? (
                <div className="p-6 text-center rounded-2xl bg-background border border-border text-xs text-text-muted">
                  Nenhuma entrega ou nota registrada para este aluno nas atividades disponíveis.
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {studentArchivedSubmissions.map(({ activity, submission }, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl bg-background border border-border flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-0.5">
                        <div className="font-semibold text-foreground">{activity.title}</div>
                        <div className="text-[11px] text-text-muted">
                          Prazo: {formatDateOnly(activity.dueDate || activity.deadline)} • Tipo: {activity.type}
                        </div>
                        {submission.teacherFeedback && (
                          <div className="text-[11px] text-primary mt-1 italic">
                            &quot;{submission.teacherFeedback}&quot;
                          </div>
                        )}
                      </div>

                      <div className="text-right shrink-0 space-y-1">
                        <div className="font-bold text-foreground text-sm flex items-center gap-1 justify-end">
                          <Award className="w-3.5 h-3.5 text-amber-400" />
                          <span>
                            {typeof submission.essayScore === 'number'
                              ? (submission.objectiveScore || 0) + submission.essayScore
                              : submission.objectiveScore ?? '-'}
                            {' / '}
                            {(activity.maxGrade || 10).toFixed(1)}
                          </span>
                        </div>
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            submission.status === 'graded'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}
                        >
                          {submission.status === 'graded' ? 'Nota Atribuída' : 'Submetido'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* BOTÃO DE FECHAR (SEM BOTÃO DE EDITAR/EXCLUIR) */}
            <div className="pt-3 border-t border-border flex justify-end">
              <button
                type="button"
                onClick={() => setViewingArchivedStudent(null)}
                className="px-6 py-2.5 rounded-xl bg-surface hover:bg-surface-hover text-foreground font-semibold text-xs border border-border transition-colors cursor-pointer min-h-[40px]"
              >
                Fechar Consulta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: CONSULTA DE ATIVIDADE ARQUIVADA (MODO SOMENTE LEITURA E AUDITORIA) */}
      {viewingArchivedActivity && (
        <div
          id="modal-view-archived-activity-overlay"
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fadeIn"
        >
          <div
            id="modal-view-archived-activity-content"
            className="bg-surface border border-border rounded-3xl max-w-3xl w-full p-6 sm:p-8 space-y-6 shadow-2xl relative my-8"
          >
            {/* CABEÇALHO */}
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                    <Archive className="w-3 h-3" /> Arquivado (Somente Leitura)
                  </span>
                  <span className="text-xs text-text-muted">
                    Arquivado em: {formatDateTime(viewingArchivedActivity.archivedAt)}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-foreground mt-1">
                  {viewingArchivedActivity.title}
                </h3>
                <div className="flex items-center gap-3 text-xs text-text-muted">
                  <span>Turma: <strong>{viewingArchivedActivity.turma}</strong></span>
                  <span>•</span>
                  <span>Tipo: <strong>{viewingArchivedActivity.type}</strong></span>
                  <span>•</span>
                  <span>Disciplina: <strong>{viewingArchivedActivity.subject || 'Geral'}</strong></span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setViewingArchivedActivity(null)}
                className="p-2 text-text-muted hover:text-foreground rounded-xl hover:bg-surface-hover transition-colors cursor-pointer"
                aria-label="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* DADOS DE CONTEXTO */}
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-foreground space-y-1.5">
              <div className="font-semibold text-amber-400 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" /> Atividade Histórica Preservada
              </div>
              <p className="text-text-muted">
                Motivo do arquivamento: <strong className="text-foreground">{viewingArchivedActivity.archivedReason || 'Troca de vínculo'}</strong>
              </p>
              <p className="text-text-muted">
                Nota Máxima: <strong className="text-foreground">{(viewingArchivedActivity.maxGrade || 10).toFixed(1)}</strong>
              </p>
            </div>

            {/* DESCRIÇÃO DA ATIVIDADE */}
            {viewingArchivedActivity.description && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted">
                  Descrição e Instruções:
                </h4>
                <div className="p-4 rounded-2xl bg-background border border-border text-xs text-foreground leading-relaxed">
                  {viewingArchivedActivity.description}
                </div>
              </div>
            )}

            {/* QUESTÕES REGISTRADAS (SE HOUVER) */}
            {viewingArchivedActivity.questions && viewingArchivedActivity.questions.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted">
                  Enunciados das Questões ({viewingArchivedActivity.questions.length}):
                </h4>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {viewingArchivedActivity.questions.map((q, qIndex) => (
                    <div key={q.id || qIndex} className="p-3.5 rounded-xl bg-background border border-border text-xs space-y-1.5">
                      <div className="font-bold text-foreground">
                        Questão {qIndex + 1} ({q.type === 'multiple_choice' ? 'Múltipla Escolha' : 'Dissertativa'}):
                      </div>
                      <p className="text-text-muted">{q.statement}</p>
                      {q.type === 'multiple_choice' && (
                        <div className="pl-2 space-y-0.5 text-[11px] text-text-muted">
                          {q.options.map((opt, optIdx) => (
                            <div key={optIdx} className={optIdx === q.correctOptionIndex ? 'font-bold text-emerald-400' : ''}>
                              {String.fromCharCode(65 + optIdx)}) {opt} {optIdx === q.correctOptionIndex && '✓'}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ENTREGAS / SUBMISSÕES */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted">
                  Submissões e Avaliações de Alunos ({viewingArchivedActivity.submissions?.length || 0}):
                </h4>
              </div>

              {!viewingArchivedActivity.submissions || viewingArchivedActivity.submissions.length === 0 ? (
                <div className="p-6 text-center rounded-2xl bg-background border border-border text-xs text-text-muted">
                  Nenhuma submissão registrada para esta atividade.
                </div>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {viewingArchivedActivity.submissions.map((sub, sIdx) => (
                    <div
                      key={sIdx}
                      className="p-3 rounded-xl bg-background border border-border flex items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="font-semibold text-foreground">{sub.studentName}</div>
                        <div className="text-[11px] text-text-muted">Matrícula: {sub.matricula}</div>
                        {sub.teacherFeedback && (
                          <div className="text-[11px] text-primary mt-0.5 italic">
                            &quot;{sub.teacherFeedback}&quot;
                          </div>
                        )}
                      </div>

                      <div className="text-right shrink-0">
                        <div className="font-bold text-foreground">
                          Nota:{' '}
                          {typeof sub.essayScore === 'number'
                            ? (sub.objectiveScore || 0) + sub.essayScore
                            : sub.objectiveScore ?? '-'}
                        </div>
                        <span className="text-[10px] text-text-muted uppercase font-bold">
                          {sub.status === 'graded' ? 'Concluída' : sub.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* BOTÃO DE FECHAR (SEM BOTÃO DE EDITAR/EXCLUIR) */}
            <div className="pt-3 border-t border-border flex justify-end">
              <button
                type="button"
                onClick={() => setViewingArchivedActivity(null)}
                className="px-6 py-2.5 rounded-xl bg-surface hover:bg-surface-hover text-foreground font-semibold text-xs border border-border transition-colors cursor-pointer min-h-[40px]"
              >
                Fechar Consulta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO EM DUAS ETAPAS COM PALAVRA-CHAVE */}
      {isArchiveModalOpen && (
        <div
          id="modal-archive-vinculo-overlay"
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fadeIn"
        >
          <div
            id="modal-archive-vinculo-content"
            className="bg-surface border border-border rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl relative"
          >
            {/* CABEÇALHO DO MODAL */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-amber-500/10 text-amber-500 rounded-2xl border border-amber-500/20">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground">Arquivar Vínculo Atual</h3>
                  <p className="text-xs text-text-muted mt-0.5">Confirmação de segurança obrigatória</p>
                </div>
              </div>

              <button
                id="btn-close-archive-modal"
                onClick={handleCloseArchiveModal}
                disabled={isSubmittingArchive}
                className="p-2 text-text-muted hover:text-foreground rounded-xl hover:bg-surface-hover transition-colors cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center"
                aria-label="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* AVISO EM LINGUAGEM SIMPLES E CLARA */}
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-foreground space-y-2 text-sm leading-relaxed">
              <p className="font-semibold text-amber-400">
                Isso vai arquivar {activeStudentsCount} alunos e {activeActivitiesCount} atividades do vínculo atual. Eles deixarão de aparecer nas suas listas ativas, mas continuam salvos e podem ser consultados na área de Backup e Recuperação para auditoria.
              </p>
              <p className="text-xs text-text-muted">
                Nenhum dado é apagado do banco de dados. O sistema apenas marca os registros deste vínculo como arquivados para liberar suas turmas para o próximo contrato ou ano letivo.
              </p>
            </div>

            {/* FORMULÁRIO DE ARQUIVAMENTO */}
            <div className="space-y-4">
              {/* CAMPO 1: MOTIVO DO ARQUIVAMENTO */}
              <div>
                <label
                  htmlFor="archive-reason-input"
                  className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-2"
                >
                  Motivo do arquivamento:
                </label>
                <input
                  id="archive-reason-input"
                  type="text"
                  value={archiveReason}
                  onChange={(e) => setArchiveReason(e.target.value)}
                  disabled={isSubmittingArchive}
                  placeholder="Ex.: Troca de vínculo ACT, Fim de Contrato..."
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>

              {/* CAMPO 2: PALAVRA DE CONFIRMAÇÃO */}
              <div>
                <label
                  htmlFor="archive-confirm-word-input"
                  className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-2"
                >
                  Digite <span className="text-amber-400 font-black underline">ARQUIVAR</span> para liberar a confirmação:
                </label>
                <input
                  id="archive-confirm-word-input"
                  type="text"
                  value={confirmWord}
                  onChange={(e) => setConfirmWord(e.target.value)}
                  disabled={isSubmittingArchive}
                  placeholder="Digite ARQUIVAR"
                  autoComplete="off"
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm font-mono tracking-wider text-foreground uppercase placeholder:normal-case placeholder:font-sans focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>
            </div>

            {/* BOTÕES DE AÇÃO */}
            <div className="pt-2 flex flex-col sm:flex-row gap-3 items-center justify-end">
              <button
                id="btn-cancel-archive"
                type="button"
                onClick={handleCloseArchiveModal}
                disabled={isSubmittingArchive}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-border hover:bg-surface-hover text-foreground font-semibold text-sm transition-colors cursor-pointer min-h-[44px]"
              >
                Cancelar
              </button>

              <button
                id="btn-confirm-archive-action"
                type="button"
                onClick={handleConfirmArchive}
                disabled={confirmWord.trim().toUpperCase() !== 'ARQUIVAR' || isSubmittingArchive}
                className="w-full sm:w-auto px-6 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer min-h-[44px]"
              >
                {isSubmittingArchive ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Arquivando vínculo...</span>
                  </>
                ) : (
                  <>
                    <Archive className="w-4 h-4" />
                    <span>Confirmar Arquivamento</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BackupView;

