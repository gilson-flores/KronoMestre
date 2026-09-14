'use client';

import React, { useState, useEffect } from 'react';
import { X, Pencil, HeartHandshake, CheckCircle2, AlertTriangle, Save } from 'lucide-react';
import { TeacherUser } from '@/lib/types';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

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
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('AEE / Inclusão Escolar');
  const [phone, setPhone] = useState('');
  const [school, setSchool] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  useEffect(() => {
    if (teacherToEdit) {
      setName(teacherToEdit.name || '');
      setEmail(teacherToEdit.email || '');
      setSubject(teacherToEdit.subject || 'AEE / Inclusão Escolar');
      setPhone(teacherToEdit.phone || '');
      setSchool(teacherToEdit.school || '');
      setFormError('');
      setFormSuccess('');
    }
  }, [teacherToEdit]);

  if (!isOpen || !teacherToEdit) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!name.trim()) {
      setFormError('Por favor, informe o nome do 2º Professor.');
      return;
    }

    setIsSubmitting(true);

    const updatedTeacher: TeacherUser = {
      ...teacherToEdit,
      name: name.trim(),
      subject: subject.trim() || 'AEE / Inclusão Escolar',
      phone: phone.trim(),
      school: school.trim(),
    };

    try {
      // 1. Chamar API interna
      const res = await fetch('/api/second-teachers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: teacherToEdit.id,
          email: teacherToEdit.email,
          name: updatedTeacher.name,
          subject: updatedTeacher.subject,
          phone: updatedTeacher.phone,
          school: updatedTeacher.school,
        }),
      });

      if (!res.ok) {
        // Fallback direto via Supabase client se API falhar
        if (isSupabaseConfigured && supabase) {
          const { error: sbErr } = await supabase
            .from('second_teachers')
            .update({
              name: updatedTeacher.name,
              subject: updatedTeacher.subject,
              phone: updatedTeacher.phone,
              school: updatedTeacher.school,
            })
            .eq('id', teacherToEdit.id);
          if (sbErr) console.warn('Supabase fallback warning:', sbErr);
        }
      }

      // 2. Atualizar cache local
      if (typeof window !== 'undefined') {
        try {
          const cached = localStorage.getItem('local_second_teachers_data');
          if (cached) {
            const list: TeacherUser[] = JSON.parse(cached);
            const updatedList = list.map((t) =>
              t.id === teacherToEdit.id || t.email?.toLowerCase() === teacherToEdit.email?.toLowerCase()
                ? updatedTeacher
                : t
            );
            localStorage.setItem('local_second_teachers_data', JSON.stringify(updatedList));
          }
        } catch (e) {
          console.warn('Erro ao atualizar cache local:', e);
        }
      }

      setFormSuccess('Dados do 2º Professor atualizados com sucesso!');
      onSaveTeacher(updatedTeacher);

      setTimeout(() => {
        setIsSubmitting(false);
        setFormSuccess('');
        onClose();
      }, 1200);
    } catch (err: any) {
      console.error('Erro ao atualizar 2º Professor:', err);
      setFormError('Erro ao atualizar: ' + (err?.message || 'Tente novamente'));
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="glass-panel w-full max-w-lg rounded-3xl border border-border p-6 sm:p-8 space-y-6 relative bg-surface shadow-2xl">
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
              Atualize as informações de contato e vínculo do profissional de apoio
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
              <label className="block text-muted font-bold mb-1.5">E-mail de Acesso (Não alterável)</label>
              <input
                type="email"
                disabled
                value={email}
                className="w-full bg-surface/50 border border-border rounded-xl px-4 py-2.5 text-muted cursor-not-allowed text-xs"
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
