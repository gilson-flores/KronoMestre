'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Search,
  Plus,
  UserPlus,
  Pencil,
  Trash2,
  Eye,
  ShieldCheck,
  Upload,
  Heart,
  AlertCircle,
  HeartHandshake,
  KeyRound,
  SlidersHorizontal,
  ChevronDown,
  Check,
  Filter,
  Users
} from 'lucide-react';
import { StudentUser } from '@/lib/types';
import { ImportCsvModal } from '@/components/modals/ImportCsvModal';
import { ResetPasswordByTeacherModal } from '@/components/modals/ResetPasswordByTeacherModal';
import { StudentFilterModal } from '@/components/modals/StudentFilterModal';
import { getTurmaLabel } from '@/lib/studentUtils';
import { formatAvatarUrl } from '@/lib/utils';
import { KronoIcon } from '@/components/ui/KronoIcon';

interface StudentsViewProps {
  students: StudentUser[];
  onOpenNewStudentModal: () => void;
  onEditStudent: (student: StudentUser) => void;
  onDeleteStudent: (studentId: string) => void;
  onSuperviseStudent: (student: StudentUser) => void;
  onImportStudents: (newStudents: StudentUser[]) => void;
  isReadOnly?: boolean;
  isAdmin?: boolean;
  onSimulateStudent?: (student: StudentUser) => void;
}

export const StudentsView: React.FC<StudentsViewProps> = ({
  students,
  onOpenNewStudentModal,
  onEditStudent,
  onDeleteStudent,
  onSuperviseStudent,
  onImportStudents,
  isReadOnly = false,
  isAdmin = false,
  onSimulateStudent,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  // Lista suspensa com suporte a escolher uma, várias ou todas as turmas
  const [selectedTurmas, setSelectedTurmas] = useState<string[]>(['all']);
  const [isTurmaDropdownOpen, setIsTurmaDropdownOpen] = useState(false);
  const turmaDropdownRef = useRef<HTMLDivElement>(null);

  const [selectedTagFilter, setSelectedTagFilter] = useState<'all' | 'PNE' | 'RAD' | 'REGULAR'>('all');
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<StudentUser | null>(null);
  const [studentToResetPassword, setStudentToResetPassword] = useState<StudentUser | null>(null);
  const [resetSuccessMsg, setResetSuccessMsg] = useState('');

  // Turmas únicas cadastradas entre os alunos
  const turmasSet = new Set(students.map((s) => s.turma).filter(Boolean));
  const turmasList = Array.from(turmasSet).sort((a, b) => a.localeCompare(b));

  // Fecha o menu da lista suspensa ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (turmaDropdownRef.current && !turmaDropdownRef.current.contains(event.target as Node)) {
        setIsTurmaDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isAllTurmasSelected = useMemo(() => {
    return (
      selectedTurmas.length === 0 ||
      selectedTurmas.includes('all') ||
      (turmasList.length > 0 && selectedTurmas.length === turmasList.length)
    );
  }, [selectedTurmas, turmasList]);

  const isTurmaChecked = (t: string) => {
    if (isAllTurmasSelected) return true;
    return selectedTurmas.includes(t);
  };

  const toggleTurma = (t: string) => {
    if (isAllTurmasSelected) {
      // Se estava tudo marcado e o usuário clica em uma turma específica, isola as outras
      const remaining = turmasList.filter((item) => item !== t);
      setSelectedTurmas(remaining.length === 0 ? ['all'] : remaining);
      return;
    }

    if (selectedTurmas.includes(t)) {
      const next = selectedTurmas.filter((item) => item !== t);
      setSelectedTurmas(next.length === 0 ? ['all'] : next);
    } else {
      const next = [...selectedTurmas, t];
      if (next.length === turmasList.length) {
        setSelectedTurmas(['all']);
      } else {
        setSelectedTurmas(next);
      }
    }
  };

  const handleSelectAllTurmas = () => {
    setSelectedTurmas(['all']);
  };

  const handleClearTurmas = () => {
    setSelectedTurmas(['all']);
  };

  const handleSelectOnlyTurma = (t: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedTurmas([t]);
    setIsTurmaDropdownOpen(false);
  };

  const turmaDropdownLabel = useMemo(() => {
    if (isAllTurmasSelected) {
      return `Todas as Turmas (${turmasList.length})`;
    }
    if (selectedTurmas.length === 1) {
      return `Turma ${getTurmaLabel(selectedTurmas[0])}`;
    }
    return `${selectedTurmas.length} turmas selecionadas`;
  }, [isAllTurmasSelected, selectedTurmas, turmasList]);

  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const matchesName =
        s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.matricula.includes(searchTerm);
      const matchesTurma =
        isAllTurmasSelected || selectedTurmas.includes(s.turma);
      const matchesTag =
        selectedTagFilter === 'all' ||
        (s.tag && s.tag.toUpperCase() === selectedTagFilter);
      return matchesName && matchesTurma && matchesTag;
    });
  }, [students, searchTerm, isAllTurmasSelected, selectedTurmas, selectedTagFilter]);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0">
          <span className="text-xs font-bold text-primary tracking-widest uppercase block">
            {isReadOnly ? '— Apoio Pedagógico • Somente Leitura' : '— Ensino Médio & Técnico'}
          </span>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-foreground tracking-tight mt-1 truncate">
            {isReadOnly ? 'Meus Alunos (Tutelados)' : 'Gestão de Alunos'}
          </h1>
          {isReadOnly && (
            <p className="text-xs sm:text-sm text-muted mt-1 leading-relaxed">
              Visualização exclusiva e somente leitura dos estudantes sob sua tutoria direta.
            </p>
          )}
        </div>

        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
          {!isReadOnly && (
            <>
              <button
                onClick={() => setIsImportModalOpen(true)}
                className="flex-1 sm:flex-none py-2.5 sm:py-3 px-4 sm:px-5 bg-[#171f33] hover:bg-surface-hover text-primary font-bold rounded-full transition-all duration-200 flex items-center justify-center gap-2 border border-primary/30 shadow-md cursor-pointer text-xs sm:text-sm min-h-[44px]"
              >
                <KronoIcon icon={Upload} variant="viking" size="xs" />
                <span>Importar CSV</span>
              </button>

              <button
                onClick={onOpenNewStudentModal}
                className="flex-1 sm:flex-none py-2.5 sm:py-3 px-5 sm:px-6 bg-primary hover:bg-primary-hover text-white font-bold rounded-full transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-primary/20 cursor-pointer text-xs sm:text-sm min-h-[44px]"
              >
                <KronoIcon icon={UserPlus} variant="emerald" size="xs" />
                <span>Cadastrar Aluno</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Container de Filtros com Lista Suspensa Multi-turma (Substitui botões de filtro por lista suspensa) */}
      <div className="glass-panel p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border border-border space-y-3.5 sm:space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-4 items-center">
          {/* Busca por Nome ou Matrícula */}
          <div className="md:col-span-5 relative w-full">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-[#869486] pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nome ou matrícula..."
              className="w-full bg-surface border border-border rounded-full pl-11 pr-4 py-2.5 sm:py-3 text-sm text-foreground placeholder-[#869486] focus:outline-none focus:border-primary min-h-[44px]"
            />
          </div>

          {/* Lista Suspensa de Turmas (Opção de Escolher Uma, Várias ou Todas as Turmas) */}
          <div className="md:col-span-4 relative" ref={turmaDropdownRef}>
            <button
              type="button"
              onClick={() => setIsTurmaDropdownOpen(!isTurmaDropdownOpen)}
              className="w-full bg-surface hover:bg-surface-hover border border-border focus:border-primary rounded-full px-4 sm:px-5 py-2.5 sm:py-3 text-xs sm:text-sm text-foreground flex items-center justify-between gap-2 transition-all cursor-pointer min-h-[44px] shadow-sm select-none"
              aria-haspopup="listbox"
              aria-expanded={isTurmaDropdownOpen}
            >
              <div className="flex items-center gap-2 min-w-0">
                <KronoIcon icon={Filter} variant="viking" size="xs" />
                <span className="font-bold truncate text-foreground">
                  {turmaDropdownLabel}
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {!isAllTurmasSelected && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-primary/20 text-primary border border-primary/30">
                    {selectedTurmas.length}
                  </span>
                )}
                <ChevronDown
                  className={`w-4 h-4 text-muted transition-transform duration-200 ${
                    isTurmaDropdownOpen ? 'rotate-180 text-primary' : ''
                  }`}
                />
              </div>
            </button>

            {/* Menu Suspenso de Seleção de Turmas */}
            {isTurmaDropdownOpen && (
              <div
                className="absolute left-0 right-0 top-full mt-2 bg-surface/95 backdrop-blur-xl border border-border/80 rounded-2xl shadow-2xl z-50 p-3 space-y-2.5 animate-fadeIn max-h-[380px] overflow-y-auto custom-scrollbar"
                role="listbox"
              >
                {/* Cabeçalho do Dropdown com Ações Rápidas */}
                <div className="flex items-center justify-between pb-2 border-b border-border/80 text-xs">
                  <span className="font-bold text-foreground flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-primary" />
                    <span>Turmas do Professor</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSelectAllTurmas}
                      className="text-[11px] font-bold text-primary hover:underline cursor-pointer"
                    >
                      Todas
                    </button>
                    <span className="text-muted">•</span>
                    <button
                      type="button"
                      onClick={handleClearTurmas}
                      className="text-[11px] font-bold text-muted hover:text-foreground cursor-pointer"
                    >
                      Redefinir
                    </button>
                  </div>
                </div>

                {/* Opção Todas as Turmas */}
                <div
                  onClick={handleSelectAllTurmas}
                  className={`flex items-center justify-between p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                    isAllTurmasSelected
                      ? 'bg-primary/15 border-primary text-foreground font-bold shadow-sm'
                      : 'bg-surface hover:bg-surface-hover border-transparent text-muted'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <input
                      type="checkbox"
                      checked={isAllTurmasSelected}
                      onChange={handleSelectAllTurmas}
                      className="rounded accent-primary w-4 h-4 pointer-events-none"
                    />
                    <span className="truncate">Todas as Turmas (Todas as classes)</span>
                  </div>
                  <span className="text-[11px] text-muted shrink-0 font-medium ml-2">
                    {students.length} alunos
                  </span>
                </div>

                {/* Lista de Turmas Individuais com Seleção Múltipla */}
                <div className="space-y-1.5 pt-1">
                  {turmasList.length === 0 ? (
                    <div className="p-3 text-center text-xs text-muted">
                      Nenhuma turma encontrada nos cadastros.
                    </div>
                  ) : (
                    turmasList.map((t) => {
                      const isChecked = isTurmaChecked(t);
                      const countInTurma = students.filter((s) => s.turma === t).length;
                      const pneInTurma = students.filter((s) => s.turma === t && s.tag?.toUpperCase() === 'PNE').length;

                      return (
                        <div
                          key={t}
                          onClick={() => toggleTurma(t)}
                          className={`flex items-center justify-between p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                            isChecked
                              ? 'bg-surface-hover border-border text-foreground font-semibold'
                              : 'hover:bg-surface-hover/70 border-transparent text-muted opacity-75 hover:opacity-100'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleTurma(t)}
                              className="rounded accent-primary w-4 h-4 pointer-events-none shrink-0"
                            />
                            <span className="truncate">{getTurmaLabel(t)}</span>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 ml-2">
                            {pneInTurma > 0 && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 font-bold border border-amber-500/30">
                                {pneInTurma} PNE
                              </span>
                            )}
                            <span className="text-[11px] text-muted">
                              {countInTurma}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => handleSelectOnlyTurma(t, e)}
                              className="text-[10px] text-primary/80 hover:text-primary font-bold hover:underline px-1 py-0.5"
                              title="Selecionar apenas esta turma"
                            >
                              Apenas
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Filtro por Categoria / Atendimento via Lista Suspensa */}
          <div className="md:col-span-3">
            <select
              value={selectedTagFilter}
              onChange={(e) => setSelectedTagFilter(e.target.value as any)}
              className="w-full bg-surface border border-border hover:border-primary/50 rounded-full px-4 sm:px-5 py-2.5 sm:py-3 text-xs sm:text-sm text-foreground focus:outline-none focus:border-primary min-h-[44px] cursor-pointer shadow-sm font-medium"
            >
              <option value="all" className="bg-background text-foreground">
                Todos os Alunos ({students.length})
              </option>
              <option value="PNE" className="bg-background text-foreground">
                Somente PNE ({students.filter((s) => s.tag?.toUpperCase() === 'PNE').length})
              </option>
              <option value="RAD" className="bg-background text-foreground">
                Somente RAD ({students.filter((s) => s.tag?.toUpperCase() === 'RAD').length})
              </option>
              <option value="REGULAR" className="bg-background text-foreground">
                Somente Regular ({students.filter((s) => !s.tag || s.tag.toUpperCase() === 'REGULAR').length})
              </option>
            </select>
          </div>
        </div>

        {/* Resumo Dinâmico do Filtro Aplicado */}
        <div className="flex items-center justify-between text-xs text-muted pt-2 border-t border-border px-1">
          <span>
            Exibindo <strong>{filteredStudents.length}</strong> de <strong>{students.length}</strong> alunos
          </span>
          {(!isAllTurmasSelected || selectedTagFilter !== 'all' || searchTerm) && (
            <button
              type="button"
              onClick={() => {
                setSelectedTurmas(['all']);
                setSelectedTagFilter('all');
                setSearchTerm('');
              }}
              className="text-xs text-primary hover:underline font-bold cursor-pointer"
            >
              Limpar Todos os Filtros
            </button>
          )}
        </div>
      </div>

      {/* Students List */}
      <div className="space-y-3">
        {filteredStudents.length === 0 ? (
          <div className="glass-panel p-8 sm:p-12 text-center rounded-2xl sm:rounded-3xl border border-border text-muted">
            Nenhum aluno encontrado para os filtros selecionados.
          </div>
        ) : (
          filteredStudents.map((student) => (
            <div
              key={student.id}
              className="glass-panel p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border border-border flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 glass-panel-hover"
            >
              {/* Left Info: Avatar, Nome e Matrícula com quebra de linha protegida */}
              <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                <img
                  src={formatAvatarUrl(student.avatarUrl)}
                  alt={student.fullName}
                  loading="lazy"
                  decoding="async"
                  className="w-11 h-11 sm:w-12 sm:h-12 rounded-full object-cover border-2 border-border shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm sm:text-base font-bold text-foreground truncate break-words leading-snug">
                    {student.fullName}
                  </h3>
                  <p className="text-xs text-muted truncate">Matrícula: {student.matricula}</p>
                </div>
              </div>

              {/* Middle Info: Turma, Tag e Condições PNE */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-4 md:gap-6 min-w-0">
                <span className="text-xs sm:text-sm font-semibold text-foreground bg-[#171f33] px-2.5 py-1 rounded-lg border border-border shrink-0">
                  {student.turma}
                </span>
                <div className="flex flex-col gap-1 min-w-0">
                  <span className="text-[11px] sm:text-xs font-bold text-primary tracking-wider uppercase">
                    {student.tag || 'REGULAR'}
                  </span>
                  {student.tag === 'PNE' && (
                    <div className="flex flex-col gap-0.5 min-w-0">
                      {student.pneConditions && student.pneConditions.length > 0 && (
                        <span className="text-[10px] text-amber-600 font-semibold bg-amber-500/15 px-2 py-0.5 rounded-full border border-amber-500/30 max-w-full sm:max-w-[200px] truncate" title={`Condição: ${student.pneConditions.join(', ')}`}>
                          {student.pneConditions.join(', ')}
                        </span>
                      )}
                      <span className="text-[10px] text-amber-400 font-medium flex items-center gap-1 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 max-w-full sm:max-w-[180px] truncate" title={student.secondTeacherName ? `2º Prof: ${student.secondTeacherName}` : '2º Professor não vinculado'}>
                        <HeartHandshake className="w-3 h-3 shrink-0" />
                        <span className="truncate">{student.secondTeacherName ? `2º Prof: ${student.secondTeacherName}` : 'Sem 2º Prof.'}</span>
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Action buttons */}
              <div className="flex flex-wrap items-center gap-2 pt-3 md:pt-0 border-t md:border-t-0 border-border w-full md:w-auto">
                {isAdmin && onSimulateStudent && (
                  <button
                    onClick={() => onSimulateStudent(student)}
                    className="flex-1 sm:flex-none py-2 px-3 sm:px-4 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 font-bold rounded-full text-xs transition-all border border-emerald-500/30 shadow-md cursor-pointer flex items-center justify-center gap-1.5 min-h-[44px]"
                    title="Simular ambiente deste aluno (Admin Supremo)"
                  >
                    <KronoIcon icon={Eye} variant="emerald" size="xs" />
                    <span>Simular Aluno</span>
                  </button>
                )}

                <button
                  onClick={() => onSuperviseStudent(student)}
                  className="flex-1 sm:flex-none py-2 px-4 sm:px-5 bg-primary hover:bg-primary-hover text-white font-bold rounded-full text-xs transition-all shadow-md cursor-pointer uppercase tracking-wider min-h-[44px] flex items-center justify-center"
                >
                  {isReadOnly ? 'Ver Ficha' : 'Supervisionar'}
                </button>

                {!isReadOnly && (
                  <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 ml-auto sm:ml-0">
                    <button
                      onClick={() => setStudentToResetPassword(student)}
                      className="p-1 rounded-full transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
                      title="Redefinir Senha do Aluno"
                      aria-label="Redefinir Senha do Aluno"
                    >
                      <KronoIcon icon={KeyRound} variant="amber" size="sm" />
                    </button>

                    <button
                      onClick={() => onEditStudent(student)}
                      className="p-1 rounded-full transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
                      title="Editar Aluno"
                      aria-label="Editar Aluno"
                    >
                      <KronoIcon icon={Pencil} variant="viking" size="sm" />
                    </button>

                    <button
                      onClick={() => setStudentToDelete(student)}
                      className="p-1 rounded-full transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
                      title="Excluir Aluno"
                      aria-label="Excluir Aluno"
                    >
                      <KronoIcon icon={Trash2} variant="danger" size="sm" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Load More Button */}
      <div className="text-center pt-2 sm:pt-4">
        <button className="w-full sm:w-auto px-6 sm:px-8 py-3 bg-surface hover:bg-[#171f33] text-muted hover:text-foreground text-xs font-bold tracking-widest uppercase rounded-full border border-border transition-colors cursor-pointer min-h-[44px]">
          Carregar Mais Alunos
        </button>
      </div>
      {/* Import CSV Modal */}
      <ImportCsvModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportStudents={onImportStudents}
      />

      {/* Delete Confirmation Modal */}
      {studentToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn overflow-y-auto">
          <div className="bg-surface border border-border rounded-2xl sm:rounded-3xl p-5 sm:p-6 max-w-sm w-full shadow-2xl space-y-5 my-auto max-h-[90vh] overflow-y-auto">
            <div className="flex flex-col items-center text-center space-y-3.5">
              <div className="p-3.5 bg-rose-500/10 rounded-2xl border border-rose-500/20 text-rose-500">
                <Trash2 className="w-7 h-7 sm:w-8 sm:h-8" />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-foreground">Excluir Aluno</h3>
                <p className="text-xs sm:text-sm text-text-muted mt-2 leading-relaxed">
                  Deseja realmente excluir o aluno(a) <strong className="text-foreground">{studentToDelete.fullName}</strong>?
                  Isso irá remover permanentemente o aluno desta turma.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2.5 pt-1">
              <button
                onClick={() => {
                  onDeleteStudent(studentToDelete.id);
                  setStudentToDelete(null);
                }}
                className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl transition-colors cursor-pointer min-h-[44px] text-sm"
              >
                Sim, Excluir Aluno
              </button>
              <button
                onClick={() => setStudentToDelete(null)}
                className="w-full py-3 bg-transparent border border-border hover:bg-surface-hover text-foreground font-bold rounded-xl transition-colors cursor-pointer min-h-[44px] text-sm"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Reset Password Modal */}
      {studentToResetPassword && (
        <ResetPasswordByTeacherModal
          isOpen={Boolean(studentToResetPassword)}
          onClose={() => setStudentToResetPassword(null)}
          targetType="student"
          targetId={studentToResetPassword.id}
          targetName={studentToResetPassword.fullName}
          targetDetail={`Turma ${studentToResetPassword.turma}`}
          onSuccess={(msg) => {
            setResetSuccessMsg(msg);
            setTimeout(() => setResetSuccessMsg(''), 4000);
          }}
        />
      )}

      {/* Student Filter Modal */}
      <StudentFilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        selectedTurmaFilter={selectedTurmaFilter}
        onSelectTurmaFilter={setSelectedTurmaFilter}
        turmasList={turmasList}
        filterMode={filterMode}
        onFilterModeChange={handleFilterModeChange}
        totalStudentsInActiveTurma={totalStudentsInActiveTurma}
        pneStudentsInActiveTurma={pneStudentsInActiveTurma}
      />
    </div>
  );
};

export default StudentsView;
