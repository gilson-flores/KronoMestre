'use client';

import React, { useState, useCallback } from 'react';
import { StudentUser } from '@/lib/types';
import { setScopedLocalStorageItem, setTenantSessionItem } from '@/lib/cacheUtils';
import { hashPasswordBcrypt } from '@/lib/crypto';

interface UseStudentsManagerParams {
  initialStudents: StudentUser[];
  teacherId: string;
  currentStudent: StudentUser | null;
  setCurrentStudent: React.Dispatch<React.SetStateAction<StudentUser | null>>;
  setIsDataLoading: React.Dispatch<React.SetStateAction<boolean>>;
  showGlobalStatus: (type: 'success' | 'error' | 'info', msg: string) => void;
}

export function useStudentsManager({
  initialStudents,
  teacherId,
  currentStudent,
  setCurrentStudent,
  setIsDataLoading,
  showGlobalStatus,
}: UseStudentsManagerParams) {
  const [students, setStudents] = useState<StudentUser[]>(initialStudents);
  const [isNewStudentModalOpen, setIsNewStudentModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<StudentUser | null>(null);
  const [supervisingStudent, setSupervisingStudent] = useState<StudentUser | null>(null);

  const handleUpdateStudentAvatar = useCallback(
    async (studentId: string, newAvatarUrl: string) => {
      let matchedStudentObj: StudentUser | undefined;
      setStudents((prev) => {
        matchedStudentObj = prev.find((s) => s.id === studentId || s.matricula === studentId);
        const next = prev.map((s) =>
          s.id === studentId || s.matricula === studentId ? { ...s, avatarUrl: newAvatarUrl } : s
        );
        if (typeof window !== 'undefined') {
          try {
            setScopedLocalStorageItem('local_students_data', JSON.stringify(next), teacherId);
          } catch (e) {}
        }
        return next;
      });

      if (
        currentStudent &&
        (currentStudent.id === studentId || currentStudent.matricula === studentId)
      ) {
        const updatedCurr = { ...currentStudent, avatarUrl: newAvatarUrl };
        setCurrentStudent(updatedCurr);
        if (typeof window !== 'undefined') {
          try {
            setTenantSessionItem(
              'active_session',
              JSON.stringify({
                role: 'student',
                studentId: updatedCurr.id,
                studentData: updatedCurr,
              }),
              updatedCurr.id
            );
          } catch (e) {}
        }
      }

      if (
        supervisingStudent &&
        (supervisingStudent.id === studentId || supervisingStudent.matricula === studentId)
      ) {
        setSupervisingStudent((prev) => (prev ? { ...prev, avatarUrl: newAvatarUrl } : prev));
      }

      try {
        const targetId = matchedStudentObj?.id || studentId;
        const res = await fetch('/api/students', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: targetId,
            avatarUrl: newAvatarUrl,
          }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          console.warn('Aviso ao persistir avatar no Firestore:', data.error);
        }

        showGlobalStatus('success', 'Avatar atualizado com sucesso!');
      } catch (err: any) {
        console.warn('Aviso ao persistir avatar no Firestore:', err);
        showGlobalStatus('success', 'Avatar atualizado com sucesso!');
      }
    },
    [teacherId, currentStudent, setCurrentStudent, supervisingStudent, showGlobalStatus]
  );

  const handleImportStudents = useCallback(
    async (newStudents: StudentUser[]) => {
      const processedStudents = await Promise.all(
        newStudents.map(async (s) => {
          let hashed = s.passwordHash;
          if (!hashed || (!hashed.startsWith('$2a$') && !hashed.startsWith('$2b$'))) {
            hashed = await hashPasswordBcrypt(hashed || '123456');
          }
          return { ...s, passwordHash: hashed, mustChangePassword: true };
        })
      );

      setStudents((prev) => {
        const next = [...prev, ...processedStudents];
        if (typeof window !== 'undefined')
          setScopedLocalStorageItem('local_students_data', JSON.stringify(next), teacherId);
        return next;
      });

      try {
        const res = await fetch('/api/students', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(processedStudents),
        });
        if (!res.ok) throw new Error('Falha ao gravar lote de alunos no Firestore.');
        showGlobalStatus(
          'success',
          `${processedStudents.length} aluno(s) importado(s) e confirmados no Banco!`
        );
      } catch (err) {
        console.warn('Erro ao conectar na importação de alunos:', err);
        showGlobalStatus('error', 'A importação ocorreu na tela, mas houve falha ao salvar na nuvem.');
      }
    },
    [teacherId, showGlobalStatus]
  );

  const handleCreateStudent = useCallback(
    async (newStudent: StudentUser) => {
      let hashedPass = newStudent.passwordHash;
      if (!hashedPass || (!hashedPass.startsWith('$2a$') && !hashedPass.startsWith('$2b$'))) {
        hashedPass = await hashPasswordBcrypt(hashedPass || newStudent.matricula || '123456');
      }

      const studentToSave: StudentUser = {
        ...newStudent,
        passwordHash: hashedPass,
        mustChangePassword: true,
      };

      setStudents((prev) => {
        if (prev.some((s) => s.id === studentToSave.id || s.matricula === studentToSave.matricula))
          return prev;

        const next = [...prev, studentToSave];
        if (typeof window !== 'undefined')
          setScopedLocalStorageItem('local_students_data', JSON.stringify(next), teacherId);
        return next;
      });

      try {
        const res = await fetch('/api/students', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(studentToSave),
        });
        if (!res.ok) throw new Error('Falha ao salvar no banco.');
        showGlobalStatus('success', `Aluno "${studentToSave.fullName}" cadastrado com sucesso!`);
      } catch (err) {
        console.warn('Erro ao cadastrar aluno:', err);
        showGlobalStatus('error', 'O aluno aparece na tela, mas falhou ao salvar na nuvem.');
      }
    },
    [teacherId, showGlobalStatus]
  );

  const handleSaveStudent = useCallback(
    async (updatedStudent: StudentUser) => {
      setStudents((prev) => {
        const next = prev.map((s) =>
          s.id === updatedStudent.id || s.matricula === updatedStudent.matricula ? updatedStudent : s
        );
        if (typeof window !== 'undefined')
          setScopedLocalStorageItem('local_students_data', JSON.stringify(next), teacherId);
        return next;
      });

      if (
        supervisingStudent &&
        (supervisingStudent.id === updatedStudent.id ||
          supervisingStudent.matricula === updatedStudent.matricula)
      ) {
        setSupervisingStudent(updatedStudent);
      }

      try {
        const res = await fetch('/api/students', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedStudent),
        });
        if (!res.ok) throw new Error('Falha na atualização.');
        showGlobalStatus(
          'success',
          `Vínculo do aluno "${updatedStudent.fullName}" salvo e gravado com sucesso!`
        );
      } catch (err) {
        console.warn('Erro ao atualizar aluno:', err);
        showGlobalStatus('error', 'Dados alterados na tela, mas não salvos na nuvem.');
      }
    },
    [teacherId, supervisingStudent, showGlobalStatus]
  );

  const handleSavePedagogicalNotes = useCallback(
    async (studentId: string, notes: string) => {
      const targetStudent = students.find((s) => s.id === studentId);
      if (!targetStudent) return;
      const updatedStudent = { ...targetStudent, pedagogicalNotes: notes };

      setStudents((prev) => {
        const next = prev.map((s) => (s.id === studentId ? updatedStudent : s));
        if (typeof window !== 'undefined')
          setScopedLocalStorageItem('local_students_data', JSON.stringify(next), teacherId);
        return next;
      });

      if (supervisingStudent && supervisingStudent.id === studentId) {
        setSupervisingStudent(updatedStudent);
      }

      try {
        await fetch('/api/students', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedStudent),
        });
      } catch (err) {
        console.error('Erro ao salvar anotações pedagógicas:', err);
      }
    },
    [students, teacherId, supervisingStudent]
  );

  const handleDeleteStudent = useCallback(
    async (studentId: string) => {
      setStudents((prev) => {
        const next = prev.filter((s) => s.id !== studentId);
        if (typeof window !== 'undefined')
          setScopedLocalStorageItem('local_students_data', JSON.stringify(next), teacherId);
        return next;
      });

      try {
        const res = await fetch(`/api/students?id=${studentId}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Falha ao excluir na nuvem.');
        showGlobalStatus('success', 'Aluno removido com sucesso!');
      } catch (err) {
        console.warn('Erro ao deletar aluno:', err);
        showGlobalStatus('error', 'Aluno oculto da tela, mas exclusão na nuvem falhou.');
      }
    },
    [teacherId, showGlobalStatus]
  );

  const handleDeleteAllStudents = useCallback(async () => {
    if (
      !window.confirm(
        '⚠️ ATENÇÃO EXTREMA: Tem certeza que deseja EXCLUIR TODOS OS ALUNOS da base ativa?'
      )
    )
      return;

    const confirmText = window.prompt('Para confirmar, digite EXCLUIR TODOS:');
    if (confirmText !== 'EXCLUIR TODOS') {
      showGlobalStatus('error', 'Exclusão cancelada. O texto de confirmação não confere.');
      return;
    }

    setIsDataLoading(true);
    try {
      const res = await fetch('/api/students?id=all', { method: 'DELETE' });
      if (!res.ok) throw new Error('Falha ao excluir na nuvem.');

      setStudents([]);
      if (typeof window !== 'undefined') {
        setScopedLocalStorageItem('local_students_data', '[]', teacherId);
      }
      showGlobalStatus('success', 'Todos os alunos foram excluídos com sucesso da base de dados!');
    } catch (err) {
      console.warn('Erro ao deletar todos os alunos:', err);
      showGlobalStatus('error', 'Erro ao processar exclusão em massa no servidor.');
    } finally {
      setIsDataLoading(false);
    }
  }, [teacherId, setIsDataLoading, showGlobalStatus]);

  const handleSuperviseStudent = useCallback((student: StudentUser) => {
    setSupervisingStudent(student);
  }, []);

  return {
    students,
    setStudents,
    isNewStudentModalOpen,
    setIsNewStudentModalOpen,
    editingStudent,
    setEditingStudent,
    supervisingStudent,
    setSupervisingStudent,
    handleUpdateStudentAvatar,
    handleImportStudents,
    handleCreateStudent,
    handleSaveStudent,
    handleSavePedagogicalNotes,
    handleDeleteStudent,
    handleDeleteAllStudents,
    handleSuperviseStudent,
  };
}
