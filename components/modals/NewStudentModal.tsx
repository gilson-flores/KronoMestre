'use client';

import React, { useState, useEffect } from 'react';
import { X, UserPlus, CheckCircle2, AlertTriangle, HeartHandshake } from 'lucide-react';
import { StudentUser, TeacherUser } from '@/lib/types';
import { PneConditionsSelect } from '@/components/PneConditionsSelect';
import { supabase } from '@/lib/supabase';
import {
  normalizeStudentName,
  validateStudentName,
  isValidTurmaCode,
} from '@/lib/studentUtils';

interface NewStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateStudent: (newStudent: StudentUser) => void;
}

export const NewStudentModal: React.FC<NewStudentModalProps> = ({
  isOpen,
  onClose,
  onCreateStudent,
}) => {
  const [fullName, setFullName] = useState('');
  const [turma, setTurma] = useState('301');
  const [customTurma, setCustomTurma] = useState('');
  const [isCustomTurma, setIsCustomTurma] = useState(false);
  const [matricula, setMatricula] = useState('2023854');
  const [password, setPassword] = useState('');
  const [tag, setTag] = useState<'REGULAR' | 'PNE' | 'RAD'>('REGULAR');
  const [pneConditions, setPneConditions] = useState<string[]>([]);
  const [secondTeacherId, setSecondTeacherId] = useState('');
  const [availableSecondTeachers, setAvailableSecondTeachers] = useState<TeacherUser[]>([]);
  const [formError, setFormError] = useState('');

  // Carregar lista de 2º professores disponíveis
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

  if (!isOpen) return null;

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    // Auto normalize to uppercase without special characters
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

    const selectedTurmaCode = turma.trim();
    if (!selectedTurmaCode || !isValidTurmaCode(selectedTurmaCode)) {
      setFormError('Código de turma inválido. Digite um código válido (ex: 301, 1001).');
      return;
    }

    const matchedTeacher = availableSecondTeachers.find((st) => st.id === secondTeacherId);

    const initialPassword = password.trim() || matricula.trim();
    const newStudent: StudentUser = {
      id: `s-${Date.now()}`,
      fullName: nameVal.normalized, // GUARANTEED UPPERCASE AND NO SPECIAL CHARACTERS
      turma: selectedTurmaCode,
      matricula,
      tag,
      pneConditions: tag === 'PNE' && pneConditions.length > 0 ? pneConditions : undefined,
      secondTeacherId: secondTeacherId ? secondTeacherId : undefined,
      secondTeacherName: matchedTeacher ? matchedTeacher.name : undefined,
      passwordHash: initialPassword, // SEGURANÇA: NUNCA reintroduzir senha padrão fixa aqui
      avatarUrl:
        'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200',
    };
    onCreateStudent(newStudent);
    setFullName('');
    setPassword('');
    setPneConditions([]);
    setSecondTeacherId('');
    setFormError('');
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
            <UserPlus className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Cadastrar Novo Aluno</h2>
            <p className="text-xs text-muted">O aluno acessará com Nome Completo (MAIÚSCULAS), Turma e senha cadastrada</p>
          </div>
        </div>

        {/* Note Box */}
        <div className="flex items-center gap-2 text-xs text-primary bg-primary/10 p-3 rounded-2xl border border-primary/20">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>Nome formatado automaticamente em MAIÚSCULAS e sem acentos.</span>
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
              Nome Completo do Aluno (MAIÚSCULAS SEM ACENTOS)
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={handleNameChange}
              placeholder="Ex: CARLOS EDUARDO SILVEIRA"
              className="w-full bg-surface border border-border rounded-2xl px-4 py-3 text-sm text-foreground placeholder-[#869486] focus:outline-none focus:border-primary uppercase tracking-wide font-medium"
            />
            <p className="text-[11px] text-[#869486] mt-1">Acentos e caracteres especiais são removidos automaticamente.</p>
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
            <label className="block text-xs font-semibold text-muted mb-1">Senha de Acesso do Aluno (Opcional - padrão: Matrícula)</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Deixe em branco para usar a Matrícula como senha"
              className="w-full bg-surface border border-border rounded-2xl px-4 py-3 text-xs text-foreground focus:outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted mb-1">Categoria / Tag</label>
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
                  <option value="">-- Não vincular agora (ou selecionar depois) --</option>
                  {availableSecondTeachers.map((st) => (
                    <option key={st.id} value={st.id} className="bg-background text-foreground">
                      {st.name} {st.subject ? `(${st.subject})` : '(AEE)'}
                    </option>
                  ))}
                </select>
                {availableSecondTeachers.length === 0 && (
                  <p className="text-[10px] text-amber-600/80">
                    Nenhum 2º Professor cadastrado ainda. Você pode cadastrá-los na aba &quot;2º Professor&quot;.
                  </p>
                )}
              </div>
            </div>
          )}

          <button
            type="submit"
            className="w-full py-3.5 bg-primary hover:bg-primary-hover text-white font-bold rounded-full transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20 cursor-pointer mt-4 text-sm"
          >
            <UserPlus className="w-5 h-5" />
            <span>Cadastrar Aluno</span>
          </button>
        </form>
      </div>
    </div>
  );
};

export default NewStudentModal;
