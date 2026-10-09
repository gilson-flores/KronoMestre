'use client';

import React, { useState, useEffect } from 'react';
import { X, Save, Pencil, AlertTriangle, HeartHandshake, RefreshCw } from 'lucide-react';
import { StudentUser, TeacherUser } from '@/lib/types';
import { PneConditionsSelect } from '@/components/PneConditionsSelect';
import { supabase } from '@/lib/supabase';
import {
  normalizeStudentName,
  validateStudentName,
  isValidTurmaCode,
} from '@/lib/studentUtils';
import { getScopedLocalStorageItem, setScopedLocalStorageItem } from '@/lib/cacheUtils';
import { KRONO_AVATARS } from '@/lib/avatarRegistry';
import { KronoIcon } from '@/components/ui/KronoIcon';

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
  const [avatarUrl, setAvatarUrl] = useState(student?.avatarUrl || '');
  const [isAvatarPickerOpen, setIsAvatarPickerOpen] = useState(false);
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
    setAvatarUrl(student.avatarUrl || '');
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

  const handleRandomizeAvatar = () => {
    const random = KRONO_AVATARS[Math.floor(Math.random() * KRONO_AVATARS.length)];
    if (random) {
      setAvatarUrl(random.url);
    }
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
      avatarUrl: avatarUrl || student.avatarUrl,
      pneConditions: tag === 'PNE' && pneConditions.length > 0 ? pneConditions : (student.pneConditions || undefined),
      secondTeacherId: secondTeacherId ? secondTeacherId : undefined,
      secondTeacherName: matchedTeacher ? matchedTeacher.name : (secondTeacherId ? student.secondTeacherName : undefined),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-lg glass-panel rounded-2xl sm:rounded-3xl border border-border p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-6 shadow-2xl relative my-auto max-h-[90vh] overflow-y-auto custom-scrollbar animate-fadeIn">
        <button
          onClick={onClose}
          className="absolute top-3 sm:top-5 right-3 sm:right-5 p-2 text-muted hover:text-foreground rounded-full hover:bg-surface-hover transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
          aria-label="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 pr-10">
          <KronoIcon icon={Pencil} variant="viking" size="md" />
          <div className="min-w-0">
            <h2 className="text-base sm:text-xl font-bold text-foreground truncate">Editar Dados do Aluno</h2>
            <p className="text-xs text-muted truncate">Altere turma, avatar, tag ou informações cadastrais</p>
          </div>
        </div>

        {formError && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-600 rounded-2xl text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
            <span className="break-words">{formError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Seletor do Avatar Criativo do Aluno */}
          <div className="p-3.5 bg-surface border border-border rounded-2xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <img
                src={avatarUrl || student.avatarUrl}
                alt="Avatar do Aluno"
                className="w-12 h-12 rounded-full object-cover border-2 border-primary/50 shrink-0 bg-slate-900"
              />
              <div className="min-w-0">
                <span className="text-[10px] uppercase font-bold text-primary block">Personagem Krono</span>
                <p className="text-xs font-semibold text-foreground truncate">Avatar Exclusivo (52 Opções)</p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleRandomizeAvatar}
                className="p-2 bg-[#171f33] hover:bg-surface-hover text-muted hover:text-foreground rounded-xl border border-border transition-all cursor-pointer"
                title="Sortear outro avatar"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsAvatarPickerOpen(!isAvatarPickerOpen)}
                className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl text-xs font-bold border border-primary/30 transition-all cursor-pointer"
              >
                {isAvatarPickerOpen ? 'Fechar' : 'Trocar'}
              </button>
            </div>
          </div>

          {/* Galeria Expansível de Avatares */}
          {isAvatarPickerOpen && (
            <div className="p-3 bg-[#171f33] border border-border rounded-2xl space-y-2 animate-fadeIn max-h-56 overflow-y-auto custom-scrollbar">
              <span className="text-[11px] font-bold text-muted block">Escolha entre RPG, Vikings, Feras e Cômicos:</span>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                {KRONO_AVATARS.map((av) => (
                  <button
                    key={av.id}
                    type="button"
                    onClick={() => {
                      setAvatarUrl(av.url);
                      setIsAvatarPickerOpen(false);
                    }}
                    className={`p-1.5 rounded-xl border transition-all cursor-pointer flex flex-col items-center gap-1 ${
                      avatarUrl === av.url
                        ? 'border-primary bg-primary/20 ring-2 ring-primary/40'
                        : 'border-border/60 bg-surface/80 hover:bg-surface-hover hover:border-primary/50'
                    }`}
                    title={av.name}
                  >
                    <img src={av.url} alt={av.name} className="w-10 h-10 object-contain rounded-full" />
                    <span className="text-[9px] font-medium text-foreground truncate w-full text-center">
                      {av.name.split(' ')[0]}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
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
