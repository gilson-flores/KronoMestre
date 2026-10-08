'use client';

import React, { useState } from 'react';
import { Search, Plus, UserPlus, Pencil, Trash2, Eye, ShieldCheck, Upload, Heart, AlertCircle, HeartHandshake, KeyRound } from 'lucide-react';
import { StudentUser } from '@/lib/types';
import { ImportCsvModal } from '@/components/modals/ImportCsvModal';
import { ResetPasswordByTeacherModal } from '@/components/modals/ResetPasswordByTeacherModal';
import { getTurmaLabel } from '@/lib/studentUtils';
import { formatAvatarUrl } from '@/lib/utils';

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
  const [selectedTurmaFilter, setSelectedTurmaFilter] = useState('all');
  const [selectedTagFilter, setSelectedTagFilter] = useState<'all' | 'PNE' | 'RAD' | 'REGULAR'>('all');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<StudentUser | null>(null);
  const [studentToResetPassword, setStudentToResetPassword] = useState<StudentUser | null>(null);
  const [resetSuccessMsg, setResetSuccessMsg] = useState('');

  // Only include turmas from registered students (no unlinked deduced classes)
  const turmasSet = new Set(students.map((s) => s.turma).filter(Boolean));
  const turmasList = Array.from(turmasSet).sort((a, b) => a.localeCompare(b));

  const filteredStudents = students.filter((s) => {
    const matchesName =
      s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.matricula.includes(searchTerm);
    const matchesTurma = selectedTurmaFilter === 'all' || s.turma === selectedTurmaFilter;
    const matchesTag =
      selectedTagFilter === 'all' ||
      (s.tag && s.tag.toUpperCase() === selectedTagFilter);
    return matchesName && matchesTurma && matchesTag;
  });

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

        {!isReadOnly && (
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="flex-1 sm:flex-none py-2.5 sm:py-3 px-4 sm:px-5 bg-[#171f33] hover:bg-surface-hover text-primary font-bold rounded-full transition-all duration-200 flex items-center justify-center gap-2 border border-primary/30 shadow-md cursor-pointer text-xs sm:text-sm min-h-[44px]"
            >
              <Upload className="w-4 h-4 shrink-0" />
              <span>Importar CSV</span>
            </button>

            <button
              onClick={onOpenNewStudentModal}
              className="flex-1 sm:flex-none py-2.5 sm:py-3 px-5 sm:px-6 bg-primary hover:bg-primary-hover text-white font-bold rounded-full transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-primary/20 cursor-pointer text-xs sm:text-sm min-h-[44px]"
            >
              <UserPlus className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5] shrink-0" />
              <span>Cadastrar Aluno</span>
            </button>
          </div>
        )}
      </div>

      {/* Filter and Search Container */}
      <div className="glass-panel p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border border-border space-y-3.5 sm:space-y-4">
        {/* Category Pills (Todos, PNE, RAD, Regular) */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <span className="text-xs font-bold text-muted w-full sm:w-auto mb-1 sm:mb-0 mr-1">Categoria / Atendimento:</span>

          <button
            onClick={() => setSelectedTagFilter('all')}
            className={`py-2 px-3.5 sm:px-4 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer min-h-[38px] flex items-center justify-center gap-1.5 border active:scale-95 ${
              selectedTagFilter === 'all'
                ? 'bg-primary text-white border-primary shadow-sm'
                : 'bg-surface text-muted hover:text-foreground border-border hover:bg-surface-hover'
            }`}
          >
            Todos ({students.length})
          </button>

          <button
            onClick={() => setSelectedTagFilter('PNE')}
            className={`py-2 px-3.5 sm:px-4 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer min-h-[38px] flex items-center justify-center gap-1.5 border active:scale-95 ${
              selectedTagFilter === 'PNE'
                ? 'bg-primary text-white border-primary shadow-sm'
                : 'bg-surface text-muted hover:text-foreground border-border hover:bg-surface-hover'
            }`}
          >
            <Heart className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            <span>PNE ({students.filter((s) => s.tag?.toUpperCase() === 'PNE').length})</span>
          </button>

          <button
            onClick={() => setSelectedTagFilter('RAD')}
            className={`py-2 px-3.5 sm:px-4 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer min-h-[38px] flex items-center justify-center gap-1.5 border active:scale-95 ${
              selectedTagFilter === 'RAD'
                ? 'bg-primary text-white border-primary shadow-sm'
                : 'bg-surface text-muted hover:text-foreground border-border hover:bg-surface-hover'
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>RAD ({students.filter((s) => s.tag?.toUpperCase() === 'RAD').length})</span>
          </button>

          <button
            onClick={() => setSelectedTagFilter('REGULAR')}
            className={`py-2 px-3.5 sm:px-4 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer min-h-[38px] flex items-center justify-center gap-1.5 border active:scale-95 ${
              selectedTagFilter === 'REGULAR'
                ? 'bg-primary text-white border-primary shadow-sm'
                : 'bg-surface text-muted hover:text-foreground border-border hover:bg-surface-hover'
            }`}
          >
            Regular ({students.filter((s) => !s.tag || s.tag.toUpperCase() === 'REGULAR').length})
          </button>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 pt-2 border-t border-border">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-[#869486] pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nome ou matrícula..."
              className="w-full bg-surface border border-border rounded-full pl-11 pr-4 py-2.5 sm:py-3 text-sm text-foreground placeholder-[#869486] focus:outline-none focus:border-primary min-h-[44px]"
            />
          </div>

          <select
            value={selectedTurmaFilter}
            onChange={(e) => setSelectedTurmaFilter(e.target.value)}
            className="w-full sm:w-64 bg-surface border border-border rounded-full px-4 sm:px-5 py-2.5 sm:py-3 text-sm text-foreground focus:outline-none focus:border-primary min-h-[44px] cursor-pointer"
          >
            <option value="all">Todas as Turmas</option>
            {turmasList.map((t) => (
              <option key={t} value={t} className="bg-background text-foreground">
                {getTurmaLabel(t)}
              </option>
            ))}
          </select>
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
                    <Eye className="w-3.5 h-3.5 shrink-0" />
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
                      className="p-2.5 bg-[#171f33] hover:bg-amber-500/20 text-amber-400 hover:text-amber-300 rounded-full border border-amber-500/30 transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
                      title="Redefinir Senha do Aluno"
                      aria-label="Redefinir Senha do Aluno"
                    >
                      <KeyRound className="w-4 h-4 shrink-0" />
                    </button>

                    <button
                      onClick={() => onEditStudent(student)}
                      className="p-2.5 bg-[#171f33] hover:bg-surface-hover text-foreground hover:text-foreground rounded-full border border-border transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
                      title="Editar Aluno"
                      aria-label="Editar Aluno"
                    >
                      <Pencil className="w-4 h-4 shrink-0" />
                    </button>

                    <button
                      onClick={() => setStudentToDelete(student)}
                      className="p-2.5 bg-[#171f33] hover:bg-rose-100 text-foreground hover:text-rose-600 rounded-full border border-border transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
                      title="Excluir Aluno"
                      aria-label="Excluir Aluno"
                    >
                      <Trash2 className="w-4 h-4 shrink-0" />
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
    </div>
  );
};

export default StudentsView;
