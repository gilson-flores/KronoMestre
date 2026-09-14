'use client';

import React, { useState } from 'react';
import { X, UserPlus, HeartHandshake, CheckCircle2, AlertTriangle, Lock } from 'lucide-react';
import { TeacherUser } from '@/lib/types';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { hashPasswordBcrypt } from '@/lib/crypto';
import { getScopedLocalStorageItem, setScopedLocalStorageItem } from '@/lib/cacheUtils';

interface NewSecondTeacherModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultSchool?: string;
  onCreateSecondTeacher: (teacherProfile: TeacherUser) => void;
}

export const NewSecondTeacherModal: React.FC<NewSecondTeacherModalProps> = ({
  isOpen,
  onClose,
  defaultSchool = '',
  onCreateSecondTeacher,
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [subject, setSubject] = useState('AEE / Inclusão Escolar');
  const [phone, setPhone] = useState('');
  const [school, setSchool] = useState(defaultSchool);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!name.trim()) {
      setFormError('Por favor, informe o nome completo do 2º Professor.');
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      setFormError('Por favor, informe um e-mail válido para o 2º Professor.');
      return;
    }

    if (!password.trim() || password.length < 4) {
      setFormError('A senha de acesso deve ter pelo menos 4 caracteres.');
      return;
    }

    setIsSubmitting(true);

    try {
      const newTeacher: TeacherUser = {
        id: `teacher-${Date.now()}`,
        name: name.trim(),
        subject: subject.trim() || 'AEE / Inclusão Escolar',
        email: email.trim().toLowerCase(),
        avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=250',
        phone: phone.trim(),
        school: school.trim() || defaultSchool,
      };

      if (isSupabaseConfigured && supabase) {
        // 1. Tentar criar conta no Supabase Auth
        try {
          await supabase.auth.signUp({
            email: newTeacher.email,
            password: password,
            options: {
              data: {
                full_name: newTeacher.name,
                role: 'second_teacher',
              },
            },
          });
        } catch (authErr) {
          console.warn('Supabase Auth signUp opcional:', authErr);
        }

        // 2. Inserir ou atualizar na tabela 'second_teachers' com hash Bcrypt seguro
        const hashedPassword = await hashPasswordBcrypt(password);
        const { data: dbTeacher, error: dbError } = await supabase
          .from('second_teachers')
          .upsert(
            {
              name: newTeacher.name,
              subject: newTeacher.subject,
              email: newTeacher.email,
              password: hashedPassword,
              must_change_password: true, // Força troca no primeiro login
              avatar_url: newTeacher.avatarUrl,
              phone: newTeacher.phone,
              school: newTeacher.school,
            },
            { onConflict: 'email' }
          )
          .select('*')
          .maybeSingle();

        if (dbTeacher?.id) {
          newTeacher.id = dbTeacher.id;
        }

        if (dbError) {
          console.error('Erro ao salvar 2º Professor no Supabase:', dbError);
        }
      }

      if (typeof window !== 'undefined') {
        try {
          const cached = getScopedLocalStorageItem('local_second_teachers_data');
          const list: TeacherUser[] = cached ? JSON.parse(cached) : [];
          const updated = [...list.filter((t) => t.email !== newTeacher.email), newTeacher];
          setScopedLocalStorageItem('local_second_teachers_data', JSON.stringify(updated));
        } catch (e) {
          console.warn('Erro ao salvar 2º professor em cache local:', e);
        }
      }

      setFormSuccess(`2º Professor "${newTeacher.name}" cadastrado com sucesso!`);
      onCreateSecondTeacher(newTeacher);

      setTimeout(() => {
        setIsSubmitting(false);
        setFormSuccess('');
        onClose();
      }, 1500);

    } catch (err: any) {
      console.error('Erro ao cadastrar 2º Professor:', err);
      setFormError('Falha ao cadastrar no Supabase: ' + (err.message || 'Erro de conexão'));
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="glass-panel w-full max-w-lg rounded-3xl border border-border p-6 sm:p-8 space-y-6 relative bg-surface shadow-2xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-muted hover:text-foreground p-2 rounded-full hover:bg-surface-hover transition-all cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 border border-amber-200 text-amber-400 flex items-center justify-center shrink-0">
            <HeartHandshake className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Cadastrar 2º Professor (AEE)</h2>
            <p className="text-xs text-muted mt-0.5">
              Cadastre o Professor de Inclusão para acesso ao diário de acompanhamento e PEI.
            </p>
          </div>
        </div>

        {formError && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-600 rounded-2xl text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        {formSuccess && (
          <div className="p-3 bg-primary/20 border border-primary/40 text-primary rounded-2xl text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{formSuccess}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-muted mb-1.5 ml-1">
              Nome Completo do 2º Professor *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Maria das Dores Fernandes"
              className="w-full bg-background border border-border rounded-2xl px-4 py-3 text-xs text-foreground placeholder-[#869486] focus:outline-none focus:border-primary"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-muted mb-1.5 ml-1">
                E-mail de Acesso *
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="professor2@escola.edu.br"
                className="w-full bg-background border border-border rounded-2xl px-4 py-3 text-xs text-foreground placeholder-[#869486] focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted mb-1.5 ml-1">
                Senha de Acesso *
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Senha para o login"
                  className="w-full bg-background border border-border rounded-2xl px-4 py-3 text-xs text-foreground placeholder-[#869486] focus:outline-none focus:border-primary"
                />
                <Lock className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-[#869486]" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-muted mb-1.5 ml-1">
                Disciplina / Função
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="AEE / Educação Inclusiva"
                className="w-full bg-background border border-border rounded-2xl px-4 py-3 text-xs text-foreground focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted mb-1.5 ml-1">
                Telefone / Celular
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(00) 90000-0000"
                className="w-full bg-background border border-border rounded-2xl px-4 py-3 text-xs text-foreground focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted mb-1.5 ml-1">
              Escola / Instituição
            </label>
            <input
              type="text"
              value={school}
              onChange={(e) => setSchool(e.target.value)}
              placeholder="Nome da Escola"
              className="w-full bg-background border border-border rounded-2xl px-4 py-3 text-xs text-foreground focus:outline-none focus:border-primary"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-2xl bg-surface-hover text-xs font-bold text-muted hover:text-foreground transition-all cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-black font-bold text-xs transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <UserPlus className="w-4 h-4" />
              <span>{isSubmitting ? 'Cadastrando...' : 'Confirmar Cadastro'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewSecondTeacherModal;
