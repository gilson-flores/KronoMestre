'use client';

import React, { useState } from 'react';
import { X, Pencil, CheckCircle2, AlertTriangle, Save, KeyRound } from 'lucide-react';
import { TeacherUser } from '@/lib/types';
import { getScopedLocalStorageItem, setScopedLocalStorageItem } from '@/lib/cacheUtils';

interface EditSecondTeacherModalProps {
  isOpen: boolean;
  onClose: () => void;
  teacherToEdit: TeacherUser | null;
  onSaveTeacher: (updatedTeacher: TeacherUser) => void;
}

export const EditSecondTeacherModal: React.FC<EditSecondTeacherModalProps> = ({
  isOpen,
  onClose,
  teacherToEdit,
  onSaveTeacher,
}) => {
  const [prevTeacherId, setPrevTeacherId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [subject, setSubject] = useState('AEE / Inclusão Escolar');
  const [phone, setPhone] = useState('');
  const [school, setSchool] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  if (teacherToEdit && teacherToEdit.id !== prevTeacherId) {
    setPrevTeacherId(teacherToEdit.id);
    setName(teacherToEdit.name || '');
    setEmail(teacherToEdit.email || '');
    setPassword('');
    setSubject(teacherToEdit.subject || 'AEE / Inclusão Escolar');
    setPhone(teacherToEdit.phone || '');
    setSchool(teacherToEdit.school || '');
    setFormError('');
    setFormSuccess('');
  }

  if (!isOpen || !teacherToEdit) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!name.trim()) {
      setFormError('Por favor, informe o nome do 2º Professor.');
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setFormError('Por favor, informe um e-mail de acesso válido.');
      return;
    }

    if (password.trim() && password.trim().length < 4) {
      setFormError('Se desejar alterar a senha, informe pelo menos 4 caracteres.');
      return;
    }

    setIsSubmitting(true);

    const updatedTeacher: TeacherUser = {
      ...teacherToEdit,
      name: name.trim(),
      email: cleanEmail,
      subject: subject.trim() || 'AEE / Inclusão Escolar',
      phone: phone.trim(),
      school: school.trim(),
    };

    try {
      // 1. Chamar API interna enviando tanto o e-mail antigo (para localização) quanto o newEmail e eventual senha
      const res = await fetch('/api/second-teachers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: teacherToEdit.id,
          email: teacherToEdit.email,
          newEmail: cleanEmail,
          password: password.trim() || undefined,
          name: updatedTeacher.name,
          subject: updatedTeacher.subject,
          phone: updatedTeacher.phone,
          school: updatedTeacher.school,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Erro ao atualizar dados do professor');
      }

      // 2. Atualizar cache local
      if (typeof window !== 'undefined') {
        try {
          const cached = getScopedLocalStorageItem('local_second_teachers_data');
          if (cached) {
            const list: TeacherUser[] = JSON.parse(cached);
            const updatedList = list.map((t) =>
              t.id === teacherToEdit.id || t.email?.toLowerCase() === teacherToEdit.email?.toLowerCase()
                ? updatedTeacher
                : t
            );
            setScopedLocalStorageItem('local_second_teachers_data', JSON.stringify(updatedList));
          }
        } catch (e) {
          console.warn('Erro ao atualizar cache local:', e);
        }
      }

      setFormSuccess('Dados e credenciais do 2º Professor atualizados com sucesso!');
      onSaveTeacher(updatedTeacher);

      setTimeout(() => {
        setIsSubmitting(false);
        setFormSuccess('');
        setPassword('');
        onClose();
      }, 1000);
    } catch (err: any) {
      console.error('Erro ao atualizar 2º Professor:', err);
      setFormError('Erro ao atualizar: ' + (err?.message || 'Tente novamente'));
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-fadeIn overflow-y-auto">
      <div className="glass-panel w-full max-w-lg rounded-3xl border border-border p-6 sm:p-8 space-y-6 relative bg-surface shadow-2xl max-h-[92vh] overflow-y-auto custom-scrollbar my-auto">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-muted hover:text-foreground p-2 rounded-full hover:bg-surface-hover transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
          aria-label="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 border-b border-border pb-4">
          <div className="p-3 bg-amber-500/10 text-amber-400 rounded-2xl border border-amber-500/20">
            <Pencil className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Editar 2º Professor</h2>
            <p className="text-xs text-muted">
              Atualize nome, e-mail de login, senha e vínculo do profissional de apoio
            </p>
          </div>
        </div>

        {formError && (
          <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-2.5 text-xs text-rose-400 font-semibold">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        {formSuccess && (
          <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-2.5 text-xs text-emerald-400 font-semibold">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{formSuccess}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-muted font-bold mb-1.5">Nome Completo *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Profa. Maria Silva"
              className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-amber-400 text-sm transition-all"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-muted font-bold mb-1.5">E-mail de Acesso (Login) *</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="professor2@sed.sc.gov.br"
                className="w-full bg-surface border border-border rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:border-amber-400 text-xs transition-all"
              />
            </div>

            <div>
              <label className="block text-muted font-bold mb-1.5">Telefone / WhatsApp</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(00) 00000-0000"
                className="w-full bg-surface border border-border rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:border-amber-400 text-xs transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-muted font-bold mb-1.5">Função / Especialidade</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Ex: AEE / Inclusão Escolar"
                className="w-full bg-surface border border-border rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:border-amber-400 text-xs transition-all"
              />
            </div>

            <div>
              <label className="block text-muted font-bold mb-1.5">Escola / Unidade</label>
              <input
                type="text"
                value={school}
                onChange={(e) => setSchool(e.target.value)}
                placeholder="Ex: E.E. Prof. Fulano"
                className="w-full bg-surface border border-border rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:border-amber-400 text-xs transition-all"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-border">
            <label className="block text-amber-400 font-bold mb-1.5 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5" />
              <span>Redefinir Senha de Acesso (Opcional)</span>
            </label>
            <input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Deixe em branco para manter a senha atual ou digite uma nova..."
              className="w-full bg-surface border border-border rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:border-amber-400 text-xs transition-all"
            />
          </div>

          <div className="flex gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-surface hover:bg-surface-hover text-foreground font-bold rounded-xl border border-border transition-colors cursor-pointer min-h-[44px]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-3 bg-amber-400 hover:bg-amber-300 text-black font-bold rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center gap-2 min-h-[44px]"
            >
              <Save className="w-4 h-4" />
              <span>{isSubmitting ? 'Salvando...' : 'Salvar Alterações'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
