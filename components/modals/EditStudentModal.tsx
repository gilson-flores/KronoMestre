'use client';

import React, { useState, useEffect } from 'react';
import { X, Save, Pencil, AlertTriangle, HeartHandshake } from 'lucide-react';
import { StudentUser, TeacherUser } from '@/lib/types';
import { PneConditionsSelect } from '@/components/PneConditionsSelect';
import { supabase } from '@/lib/supabase';
import {
  normalizeStudentName,
  validateStudentName,
  isValidTurmaCode,
} from '@/lib/studentUtils';
import { getScopedLocalStorageItem, setScopedLocalStorageItem } from '@/lib/cacheUtils';

interface EditStudentModalProps {
  isOpen: boolean;
  student: StudentUser | null;
  onClose: () => void;
  onSaveStudent: (updatedStudent: StudentUser) => void;
}

export const EditStudentModal: React.FC<EditStudentModalProps> = ({
  isOpen,
  student,
  onClose,
  onSaveStudent,
}) => {
  const [prevStudentId, setPrevStudentId] = useState(student?.id);
  const [fullName, setFullName] = useState(student?.fullName || '');
  const [turma, setTurma] = useState(student?.turma || '301');
  const [matricula, setMatricula] = useState(student?.matricula || '');
  const [tag, setTag] = useState<'REGULAR' | 'PNE' | 'RAD'>(student?.tag || 'REGULAR');
  const [pneConditions, setPneConditions] = useState<string[]>(student?.pneConditions || []);
  const [secondTeacherId, setSecondTeacherId] = useState(student?.secondTeacherId || '');
  const [availableSecondTeachers, setAvailableSecondTeachers] = useState<TeacherUser[]>([]);
  const [formError, setFormError] = useState('');

  // Carregar lista de 2º professores
  useEffect(() => {
    if (!isOpen) return;
    const fetchSecondTeachers = async () => {
      // 1. Carregar cache local seguro de 2º professores
      if (typeof window !== 'undefined') {
        try {
          const cached = getScopedLocalStorageItem('local_second_teachers_data');
          if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setAvailableSecondTeachers(parsed);
            }
          }
        } catch (e) {
          console.warn('Erro ao ler cache de 2º professores:', e);
        }
      }

      try {
        const res = await fetch('/api/second-teachers');
        if (res.ok) {
          const resData = await res.json();
          const list = resData.secondTeachers || resData.data || [];
          if (Array.isArray(list) && list.length > 0) {
            const mapped: TeacherUser[] = list.map((d: any) => ({
              id: d.id,
              name: d.name,
              subject: d.subject || 'AEE / Inclusão Escolar',
              email: d.email,
              avatarUrl: d.avatarUrl || d.avatar_url || '',
              phone: d.phone,
              school: d.school,
            }));
            setAvailableSecondTeachers(mapped);
            if (typeof window !== 'undefined') {
              try {
                setScopedLocalStorageItem('local_second_teachers_data', JSON.stringify(mapped));
              } catch (e) {
                console.warn('Erro ao salvar cache de 2º professores:', e);
              }
            }
          }
        }
      } catch (err) {
        console.warn('Erro ao carregar lista de 2º professores:', err);
      }
    };
    fetchSecondTeachers();
  }, [isOpen]);

  if (student && student.id !== prevStudentId) {
    setPrevStudentId(student.id);
    setFullName(student.fullName);
    setTurma(student.turma);
    setMatricula(student.matricula);
    setTag(student.tag || 'REGULAR');
    setPneConditions(student.pneConditions || []);
    setSecondTeacherId(student.secondTeacherId || '');
    setFormError('');
  }

  if (!isOpen || !student) return null;

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const normalized = normalizeStudentName(raw);
    setFullName(normalized);
    if (formError) setFormError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const nameVal = validateStudentName(fullName);
    if (!nameVal.isValid) {
      setFormError(nameVal.errorMessage || 'Nome do aluno inválido.');
      return;
    }

    if (!turma.trim() || !isValidTurmaCode(turma.trim())) {
      setFormError('Código de turma inválido. Deve ter 3 dígitos (ex: 301) ou 4 dígitos (ex: 3001).');
      return;
    }

    const matchedTeacher = availableSecondTeachers.find((st) => st.id === secondTeacherId);

    onSaveStudent({
      ...student,
      fullName: nameVal.normalized, // GUARANTEED UPPERCASE AND NO SPECIAL CHARACTERS
      turma: turma.trim(),
      matricula,
      tag,
      pneConditions: tag === 'PNE' && pneConditions.length > 0 ? pneConditions : (student.pneConditions || undefined),
      secondTeacherId: secondTeacherId ? secondTeacherId : undefined,
      secondTeacherName: matchedTeacher ? matchedTeacher.name : (secondTeacherId ? student.secondTeacherName : undefined),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg glass-panel rounded-3xl border border-border p-6 sm:p-8 space-y-6 shadow-2xl relative animate-fadeIn">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-muted hover:text-foreground rounded-full hover:bg-surface-hover transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/10 text-primary rounded-2xl border border-primary/20">
            <Pencil className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Editar Dados do Aluno</h2>
            <p className="text-xs text-muted">Altere turma, tag ou informações cadastrais</p>
          </div>
        </div>

        {formError && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-600 rounded-2xl text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-muted mb-1">
              Nome Completo (MAIÚSCULAS SEM ACENTOS)
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={handleNameChange}
              className="w-full bg-surface border border-border rounded-2xl px-4 py-3 text-sm text-foreground focus:outline-none focus:border-primary uppercase tracking-wide font-medium"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-muted mb-1">Turma (ex: 301, 1001)</label>
              <input
                type="text"
                required
                value={turma}
                onChange={(e) => setTurma(e.target.value)}
                placeholder="Ex: 301, 302, 1001"
                className="w-full bg-surface border border-border rounded-2xl px-4 py-3 text-xs text-foreground focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted mb-1">Matrícula</label>
              <input
                type="text"
                required
                value={matricula}
                onChange={(e) => setMatricula(e.target.value)}
                className="w-full bg-surface border border-border rounded-2xl px-4 py-3 text-xs text-foreground focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted mb-1">Tag Especial</label>
            <select
              value={tag}
              onChange={(e) => setTag(e.target.value as any)}
              className="w-full bg-surface border border-border rounded-2xl px-4 py-3 text-xs text-foreground focus:outline-none focus:border-primary"
            >
              <option value="REGULAR" className="bg-background">REGULAR</option>
              <option value="PNE" className="bg-background">PNE (Necessidades Especiais)</option>
              <option value="RAD" className="bg-background">RAD (Rendimento em Acompanhamento)</option>
            </select>
          </div>

          {/* Configurações Especiais quando o Aluno for PNE */}
          {tag === 'PNE' && (
            <div className="space-y-4 animate-fadeIn">
              {/* Lista suspensa com caixa de seleção de Doenças e Deficiências */}
              <div className="p-4 bg-surface border border-amber-500/30 rounded-2xl space-y-3">
                <PneConditionsSelect
                  selectedConditions={pneConditions}
                  onChange={setPneConditions}
                  label="Doenças ou Deficiências (PNE)"
                  placeholder="Selecione na lista suspensa as condições..."
                />
              </div>

              {/* Vínculo de 2º Professor */}
              <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl space-y-2">
                <label className="flex items-center gap-1.5 text-xs font-bold text-amber-600">
                  <HeartHandshake className="w-4 h-4 text-amber-400" />
                  <span>Vincular 2º Professor (AEE / Inclusão)</span>
                </label>
                <p className="text-[11px] text-muted">
                  Selecione o profissional de inclusão responsável pelo acompanhamento deste aluno.
                </p>
                <select
                  value={secondTeacherId}
                  onChange={(e) => setSecondTeacherId(e.target.value)}
                  className="w-full bg-background border border-amber-500/30 rounded-xl px-4 py-2.5 text-xs text-foreground focus:outline-none focus:border-amber-400 font-medium"
                >
                  <option value="">-- Não vinculado --</option>
                  {availableSecondTeachers.map((st) => (
                    <option key={st.id} value={st.id} className="bg-background text-foreground">
                      {st.name} {st.subject ? `(${st.subject})` : '(AEE)'}
                    </option>
                  ))}
                </select>
                {availableSecondTeachers.length === 0 && (
                  <p className="text-[10px] text-amber-600/80">
                    Nenhum 2º Professor cadastrado ainda. Cadastre profissionais na aba &quot;2º Professor&quot;.
                  </p>
                )}
              </div>
            </div>
          )}

          <button
            type="submit"
            className="w-full py-3.5 bg-primary hover:bg-primary-hover text-white font-bold rounded-full transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20 cursor-pointer mt-4 text-sm"
          >
            <Save className="w-5 h-5" />
            <span>Salvar Alterações</span>
          </button>
        </form>
      </div>
    </div>
  );
};

export default EditStudentModal;
