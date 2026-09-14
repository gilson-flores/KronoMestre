import React, { useState, useMemo } from 'react';
import { X, Search, CheckSquare, Square, Users, CheckCircle2 } from 'lucide-react';
import { TeacherUser, StudentUser } from '@/lib/types';

interface ManageTutelageModalProps {
  isOpen: boolean;
  onClose: () => void;
  secondTeacher: TeacherUser;
  allStudents: StudentUser[];
  onSaveTutelage: (updates: { student: StudentUser; isAssigned: boolean }[]) => Promise<void>;
}

export const ManageTutelageModal: React.FC<ManageTutelageModalProps> = ({
  isOpen,
  onClose,
  secondTeacher,
  allStudents,
  onSaveTutelage,
}) => {
  const [search, setSearch] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  // Initialize state with students currently assigned to THIS teacher
  const [assignedStudentIds, setAssignedStudentIds] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    allStudents.forEach(s => {
      if (
        (s.secondTeacherId && s.secondTeacherId === secondTeacher.id) ||
        (s.secondTeacherName && s.secondTeacherName.toLowerCase() === secondTeacher.name?.toLowerCase())
      ) {
        initial.add(s.id);
      }
    });
    return initial;
  });

  const filteredStudents = useMemo(() => {
    let sorted = [...allStudents].sort((a, b) => a.fullName.localeCompare(b.fullName));
    if (!search.trim()) return sorted;
    const q = search.toLowerCase().trim();
    return sorted.filter(s => 
      s.fullName.toLowerCase().includes(q) || 
      s.turma.toLowerCase().includes(q) ||
      (s.matricula && s.matricula.toLowerCase().includes(q))
    );
  }, [allStudents, search]);

  const toggleStudent = (studentId: string) => {
    setAssignedStudentIds(prev => {
      const next = new Set(prev);
      if (next.has(studentId)) next.delete(studentId);
      else next.add(studentId);
      return next;
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updates: { student: StudentUser; isAssigned: boolean }[] = [];
      
      allStudents.forEach(s => {
        const wasAssigned = (s.secondTeacherId === secondTeacher.id) || (s.secondTeacherName?.toLowerCase() === secondTeacher.name?.toLowerCase());
        const isAssignedNow = assignedStudentIds.has(s.id);
        
        if (wasAssigned !== isAssignedNow) {
          updates.push({ student: s, isAssigned: isAssignedNow });
        }
      });
      
      if (updates.length > 0) {
        await onSaveTutelage(updates);
      }
      onClose();
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar tutela.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="glass-panel w-full max-w-2xl rounded-3xl border border-border p-5 sm:p-6 flex flex-col max-h-[85vh] bg-surface shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-muted hover:text-foreground p-2 rounded-full hover:bg-surface-hover transition-all cursor-pointer z-10"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4 shrink-0">
          <div className="w-10 h-10 rounded-2xl bg-amber-100 border border-amber-200 text-amber-400 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground leading-tight">Gerenciar Tutela</h2>
            <p className="text-[11px] text-muted">
              Selecione os alunos para o professor(a) <strong>{secondTeacher.name}</strong>
            </p>
          </div>
        </div>

        <div className="relative mb-4 shrink-0">
          <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar aluno por nome ou turma..."
            className="w-full bg-background border border-border rounded-xl pl-9 pr-3 py-2 text-xs text-foreground placeholder:text-muted/50 focus:outline-none focus:border-amber-400"
          />
        </div>

        <div className="flex-1 overflow-y-auto space-y-1.5 min-h-0 pr-1">
          {filteredStudents.length === 0 ? (
            <div className="text-center py-6 text-xs text-muted italic">Nenhum aluno encontrado.</div>
          ) : (
            filteredStudents.map(s => {
              const isAssigned = assignedStudentIds.has(s.id);
              const assignedToOther = !isAssigned && s.secondTeacherName && s.secondTeacherName.toLowerCase() !== secondTeacher.name?.toLowerCase();
              
              return (
                <div 
                  key={s.id}
                  onClick={() => toggleStudent(s.id)}
                  className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all cursor-pointer ${
                    isAssigned 
                      ? 'bg-amber-400/10 border-amber-400/40' 
                      : 'bg-background border-border hover:bg-surface-hover'
                  }`}
                >
                  <div className={`w-5 h-5 rounded flex items-center justify-center border shrink-0 ${
                    isAssigned ? 'bg-amber-400 border-amber-400 text-black' : 'border-muted/40 text-transparent'
                  }`}>
                    {isAssigned && <CheckSquare className="w-3.5 h-3.5" />}
                  </div>
                  
                  <img src={s.avatarUrl} alt={s.fullName} loading="lazy" className="w-8 h-8 rounded-full object-cover shrink-0 border border-border" />
                  
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-foreground truncate">{s.fullName}</p>
                    <div className="flex items-center gap-2 text-[10px] mt-0.5">
                      <span className="text-muted font-semibold border border-border bg-surface px-1.5 rounded">Turma {s.turma}</span>
                      {assignedToOther && (
                        <span className="text-rose-400 font-semibold truncate">Já atribuído a: {s.secondTeacherName}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="pt-4 mt-2 border-t border-border flex justify-end gap-3 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-surface-hover text-xs font-bold text-muted hover:text-foreground transition-all cursor-pointer"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-bold text-xs transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isSaving ? (
              <span>Salvando...</span>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Salvar Atribuições ({assignedStudentIds.size})</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
