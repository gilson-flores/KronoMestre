'use client';

import React, { useState } from 'react';
import { Search, Plus, UserPlus, Pencil, Trash2, Eye, ShieldCheck, Upload, Heart, AlertCircle, HeartHandshake } from 'lucide-react';
import { StudentUser } from '@/lib/types';
import { ImportCsvModal } from '@/components/modals/ImportCsvModal';
import { getTurmaLabel } from '@/lib/studentUtils';

interface StudentsViewProps {
  students: StudentUser[];
  onOpenNewStudentModal: () => void;
  onEditStudent: (student: StudentUser) => void;
  onDeleteStudent: (studentId: string) => void;
  onSuperviseStudent: (student: StudentUser) => void;
  onImportStudents: (newStudents: StudentUser[]) => void;
}

export const StudentsView: React.FC<StudentsViewProps> = ({
  students,
  onOpenNewStudentModal,
  onEditStudent,
  onDeleteStudent,
  onSuperviseStudent,
  onImportStudents,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTurmaFilter, setSelectedTurmaFilter] = useState('all');
  const [selectedTagFilter, setSelectedTagFilter] = useState<'all' | 'PNE' | 'RAD' | 'REGULAR'>('all');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

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
        <div>
          <span className="text-xs font-bold text-[#4ade80] tracking-widest uppercase">
            — Ensino Médio & Técnico
          </span>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight mt-1">
            Gestão de Alunos
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="py-3 px-5 bg-[#171f33] hover:bg-[#222a3d] text-[#4ade80] font-bold rounded-full transition-all duration-200 flex items-center gap-2 border border-[#4ade80]/30 shadow-md cursor-pointer text-sm"
          >
            <Upload className="w-4 h-4" />
            <span>Importar CSV</span>
          </button>

          <button
            onClick={onOpenNewStudentModal}
            className="py-3 px-6 bg-[#4ade80] hover:bg-[#6bfb9a] text-[#003919] font-bold rounded-full transition-all duration-200 flex items-center gap-2 shadow-lg shadow-[#4ade80]/20 cursor-pointer text-sm"
          >
            <UserPlus className="w-5 h-5 stroke-[2.5]" />
            <span>Cadastrar Aluno</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Container */}
      <div className="glass-panel p-4 sm:p-5 rounded-3xl border border-white/10 space-y-4">
        {/* Category Pills (Todos, PNE, RAD, Regular) */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-[#bccabb] mr-1">Categoria / Atendimento:</span>

          <button
            onClick={() => setSelectedTagFilter('all')}
            className={`py-2 px-4 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer ${
              selectedTagFilter === 'all'
                ? 'bg-[#4ade80] text-[#003919] shadow-md'
                : 'bg-[#131b2e] text-[#bccabb] hover:text-white border border-white/10'
            }`}
          >
            Todos ({students.length})
          </button>

          <button
            onClick={() => setSelectedTagFilter('PNE')}
            className={`py-2 px-4 rounded-full text-xs font-bold transition-all duration-200 flex items-center gap-1.5 cursor-pointer ${
              selectedTagFilter === 'PNE'
                ? 'bg-[#4ade80] text-[#003919] shadow-md'
                : 'bg-[#131b2e] text-[#bccabb] hover:text-white border border-white/10'
            }`}
          >
            <Heart className="w-3.5 h-3.5 text-rose-400" />
            <span>PNE ({students.filter((s) => s.tag?.toUpperCase() === 'PNE').length})</span>
          </button>

          <button
            onClick={() => setSelectedTagFilter('RAD')}
            className={`py-2 px-4 rounded-full text-xs font-bold transition-all duration-200 flex items-center gap-1.5 cursor-pointer ${
              selectedTagFilter === 'RAD'
                ? 'bg-[#4ade80] text-[#003919] shadow-md'
                : 'bg-[#131b2e] text-[#bccabb] hover:text-white border border-white/10'
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
            <span>RAD ({students.filter((s) => s.tag?.toUpperCase() === 'RAD').length})</span>
          </button>

          <button
            onClick={() => setSelectedTagFilter('REGULAR')}
            className={`py-2 px-4 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer ${
              selectedTagFilter === 'REGULAR'
                ? 'bg-[#4ade80] text-[#003919] shadow-md'
                : 'bg-[#131b2e] text-[#bccabb] hover:text-white border border-white/10'
            }`}
          >
            Regular ({students.filter((s) => !s.tag || s.tag.toUpperCase() === 'REGULAR').length})
          </button>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4 pt-2 border-t border-white/5">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-[#869486]" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nome ou matrícula..."
              className="w-full bg-[#131b2e] border border-white/10 rounded-full pl-11 pr-4 py-3 text-sm text-white placeholder-[#869486] focus:outline-none focus:border-[#4ade80]"
            />
          </div>

          <select
            value={selectedTurmaFilter}
            onChange={(e) => setSelectedTurmaFilter(e.target.value)}
            className="w-full sm:w-64 bg-[#131b2e] border border-white/10 rounded-full px-5 py-3 text-sm text-white focus:outline-none focus:border-[#4ade80]"
          >
            <option value="all">Todas as Turmas</option>
            {turmasList.map((t) => (
              <option key={t} value={t} className="bg-[#0b1326] text-white">
                {getTurmaLabel(t)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Students List */}
      <div className="space-y-3">
        {filteredStudents.length === 0 ? (
          <div className="glass-panel p-12 text-center rounded-3xl border border-white/10 text-[#bccabb]">
            Nenhum aluno encontrado para os filtros selecionados.
          </div>
        ) : (
          filteredStudents.map((student) => (
            <div
              key={student.id}
              className="glass-panel p-5 rounded-3xl border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4 glass-panel-hover"
            >
              {/* Left Info */}
              <div className="flex items-center gap-4">
                <img
                  src={student.avatarUrl}
                  alt={student.fullName}
                  className="w-12 h-12 rounded-full object-cover border-2 border-white/10 shrink-0"
                />
                <div>
                  <h3 className="text-base font-bold text-white">{student.fullName}</h3>
                  <p className="text-xs text-[#bccabb]">Matrícula: {student.matricula}</p>
                </div>
              </div>

              {/* Middle Info */}
              <div className="flex flex-wrap items-center gap-4 md:gap-6">
                <span className="text-sm font-semibold text-[#dae2fd]">{student.turma}</span>
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-bold text-[#4ade80] tracking-wider uppercase">
                    {student.tag || 'REGULAR'}
                  </span>
                  {student.tag === 'PNE' && (
                    <div className="flex flex-col gap-0.5">
                      {student.pneConditions && student.pneConditions.length > 0 && (
                        <span className="text-[10px] text-amber-300 font-semibold bg-amber-500/15 px-2 py-0.5 rounded-full border border-amber-500/30 max-w-[200px] truncate" title={`Condição: ${student.pneConditions.join(', ')}`}>
                          {student.pneConditions.join(', ')}
                        </span>
                      )}
                      <span className="text-[10px] text-amber-400 font-medium flex items-center gap-1 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 max-w-[180px] truncate" title={student.secondTeacherName ? `2º Prof: ${student.secondTeacherName}` : '2º Professor não vinculado'}>
                        <HeartHandshake className="w-3 h-3 shrink-0" />
                        <span className="truncate">{student.secondTeacherName ? `2º Prof: ${student.secondTeacherName}` : 'Sem 2º Prof.'}</span>
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Action buttons */}
              <div className="flex flex-wrap items-center gap-2.5 pt-3 md:pt-0 border-t md:border-t-0 border-white/5 w-full md:w-auto">
                <button
                  onClick={() => onSuperviseStudent(student)}
                  className="flex-1 md:flex-none py-2.5 px-5 bg-[#4ade80] hover:bg-[#6bfb9a] text-[#003919] font-bold rounded-full text-xs transition-all shadow-md cursor-pointer uppercase tracking-wider min-h-[44px] flex items-center justify-center"
                >
                  Supervisionar
                </button>

                <button
                  onClick={() => onEditStudent(student)}
                  className="p-2.5 bg-[#171f33] hover:bg-[#222a3d] text-[#dae2fd] hover:text-white rounded-full border border-white/10 transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
                  title="Editar Aluno"
                  aria-label="Editar Aluno"
                >
                  <Pencil className="w-4 h-4" />
                </button>

                <button
                  onClick={() => onDeleteStudent(student.id)}
                  className="p-2.5 bg-[#171f33] hover:bg-rose-500/20 text-[#dae2fd] hover:text-rose-300 rounded-full border border-white/10 transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
                  title="Excluir Aluno"
                  aria-label="Excluir Aluno"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Load More Button */}
      <div className="text-center pt-4">
        <button className="px-8 py-3 bg-[#131b2e] hover:bg-[#171f33] text-[#bccabb] hover:text-white text-xs font-bold tracking-widest uppercase rounded-full border border-white/10 transition-colors cursor-pointer">
          Carregar Mais Alunos
        </button>
      </div>
      {/* Import CSV Modal */}
      <ImportCsvModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportStudents={onImportStudents}
      />
    </div>
  );
};

export default StudentsView;
