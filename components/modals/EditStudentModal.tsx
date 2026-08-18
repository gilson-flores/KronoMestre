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
      if (!supabase) return;
      try {
        const { data } = await supabase
          .from('second_teachers')
          .select('id, name, email, subject, avatar_url, phone, school')
          .order('name');
        if (data) {
          setAvailableSecondTeachers(
            data.map((d) => ({
              id: d.id,
              name: d.name,
              subject: d.subject || 'AEE / Inclusão Escolar',
              email: d.email,
              avatarUrl: d.avatar_url || '',
              phone: d.phone,
              school: d.school,
            }))
          );
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
      <div className="w-full max-w-lg glass-panel rounded-3xl border border-white/10 p-6 sm:p-8 space-y-6 shadow-2xl relative animate-fadeIn">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-[#bccabb] hover:text-white rounded-full hover:bg-white/5 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="p-3 bg-[#4ade80]/10 text-[#4ade80] rounded-2xl border border-[#4ade80]/20">
            <Pencil className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Editar Dados do Aluno</h2>
            <p className="text-xs text-[#bccabb]">Altere turma, tag ou informações cadastrais</p>
          </div>
        </div>

        {formError && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-2xl text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#bccabb] mb-1">
              Nome Completo (MAIÚSCULAS SEM ACENTOS)
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={handleNameChange}
              className="w-full bg-[#131b2e] border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#4ade80] uppercase tracking-wide font-medium"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#bccabb] mb-1">Turma (ex: 301, 1001)</label>
              <input
                type="text"
                required
                value={turma}
                onChange={(e) => setTurma(e.target.value)}
                placeholder="Ex: 301, 302, 1001"
                className="w-full bg-[#131b2e] border border-white/10 rounded-2xl px-4 py-3 text-xs text-white focus:outline-none focus:border-[#4ade80]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#bccabb] mb-1">Matrícula</label>
              <input
                type="text"
                required
                value={matricula}
                onChange={(e) => setMatricula(e.target.value)}
                className="w-full bg-[#131b2e] border border-white/10 rounded-2xl px-4 py-3 text-xs text-white focus:outline-none focus:border-[#4ade80]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#bccabb] mb-1">Tag Especial</label>
            <select
              value={tag}
              onChange={(e) => setTag(e.target.value as any)}
              className="w-full bg-[#131b2e] border border-white/10 rounded-2xl px-4 py-3 text-xs text-white focus:outline-none focus:border-[#4ade80]"
            >
              <option value="REGULAR" className="bg-[#0b1326]">REGULAR</option>
              <option value="PNE" className="bg-[#0b1326]">PNE (Necessidades Especiais)</option>
              <option value="RAD" className="bg-[#0b1326]">RAD (Rendimento em Acompanhamento)</option>
            </select>
          </div>

          {/* Configurações Especiais quando o Aluno for PNE */}
          {tag === 'PNE' && (
            <div className="space-y-4 animate-fadeIn">
              {/* Lista suspensa com caixa de seleção de Doenças e Deficiências */}
              <div className="p-4 bg-[#131b2e] border border-amber-500/30 rounded-2xl space-y-3">
                <PneConditionsSelect
                  selectedConditions={pneConditions}
                  onChange={setPneConditions}
                  label="Doenças ou Deficiências (PNE)"
                  placeholder="Selecione na lista suspensa as condições..."
                />
              </div>

              {/* Vínculo de 2º Professor */}
              <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl space-y-2">
                <label className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                  <HeartHandshake className="w-4 h-4 text-amber-400" />
                  <span>Vincular 2º Professor (AEE / Inclusão)</span>
                </label>
                <p className="text-[11px] text-[#bccabb]">
                  Selecione o profissional de inclusão responsável pelo acompanhamento deste aluno.
                </p>
                <select
                  value={secondTeacherId}
                  onChange={(e) => setSecondTeacherId(e.target.value)}
                  className="w-full bg-[#0b1326] border border-amber-500/30 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400 font-medium"
                >
                  <option value="">-- Não vinculado --</option>
                  {availableSecondTeachers.map((st) => (
                    <option key={st.id} value={st.id} className="bg-[#0b1326] text-white">
                      {st.name} {st.subject ? `(${st.subject})` : '(AEE)'}
                    </option>
                  ))}
                </select>
                {availableSecondTeachers.length === 0 && (
                  <p className="text-[10px] text-amber-300/80">
                    Nenhum 2º Professor cadastrado ainda. Cadastre profissionais na aba &quot;2º Professor&quot;.
                  </p>
                )}
              </div>
            </div>
          )}

          <button
            type="submit"
            className="w-full py-3.5 bg-[#4ade80] hover:bg-[#6bfb9a] text-[#003919] font-bold rounded-full transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#4ade80]/20 cursor-pointer mt-4 text-sm"
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
