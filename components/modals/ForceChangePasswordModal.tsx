'use client';

import React, { useState } from 'react';
import { ShieldAlert, KeyRound, Eye, EyeOff, CheckCircle2, AlertCircle, ArrowRight, Lock } from 'lucide-react';

interface ForceChangePasswordModalProps {
  isOpen: boolean;
  userName: string;
  userRole: 'student' | 'second_teacher';
  onPasswordChanged: () => void;
}

export const ForceChangePasswordModal: React.FC<ForceChangePasswordModalProps> = ({
  isOpen,
  userName,
  userRole,
  onPasswordChanged,
}) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (newPassword.trim().length < 4) {
      setErrorMsg('A nova senha deve ter no mínimo 4 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('A confirmação de senha não coincide com a nova senha digitada.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newPassword: newPassword.trim(),
          confirmPassword: confirmPassword.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMsg(data.error || 'Falha ao registrar nova senha.');
        setIsLoading(false);
        return;
      }

      onPasswordChanged();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Erro de conexão ao salvar nova senha.');
      setIsLoading(false);
    }
  };

  const isLengthValid = newPassword.trim().length >= 4;
  const isMatchValid = newPassword.length > 0 && newPassword === confirmPassword;

  return (
    <div
      id="force-change-password-overlay"
      className="fixed inset-0 z-[9999] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 select-none"
    >
      <div
        id="force-change-password-card"
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-6 animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header com ícone de segurança */}
        <div className="text-center space-y-3">
          <div className="inline-flex p-3.5 bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-2xl border border-amber-500/20 shadow-inner">
            <KeyRound className="w-8 h-8 animate-pulse" />
          </div>
          <div>
            <span className="inline-block px-3 py-1 bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs font-semibold rounded-full uppercase tracking-wider mb-2 border border-amber-500/20">
              Primeiro Acesso Obrigatório
            </span>
            <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
              Defina sua Nova Senha
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
              Olá, <strong className="text-slate-900 dark:text-slate-200">{userName}</strong>. Por motivos de segurança, você precisa cadastrar sua senha pessoal exclusiva para desbloquear seu acesso à plataforma.
            </p>
          </div>
        </div>

        {/* Alerta de erro */}
        {errorMsg && (
          <div className="p-3.5 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/60 rounded-2xl flex items-start gap-2.5 text-xs text-rose-700 dark:text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
            <span className="font-medium leading-relaxed">{errorMsg}</span>
          </div>
        )}

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Nova Senha Pessoal
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Digite sua nova senha secreta"
                className="w-full px-4 py-3 pr-11 bg-slate-50 dark:bg-slate-800/70 border border-slate-300 dark:border-slate-700 rounded-2xl text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Confirmar Nova Senha
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repita a nova senha"
                className="w-full px-4 py-3 pr-11 bg-slate-50 dark:bg-slate-800/70 border border-slate-300 dark:border-slate-700 rounded-2xl text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Checklist de requisitos de segurança */}
          <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-2xl border border-slate-200 dark:border-slate-800/80 space-y-1.5 text-xs">
            <div className={`flex items-center gap-2 ${isLengthValid ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'}`}>
              <CheckCircle2 className={`w-3.5 h-3.5 ${isLengthValid ? 'text-emerald-500' : 'text-slate-300 dark:text-slate-600'}`} />
              <span>Mínimo de 4 caracteres</span>
            </div>
            <div className={`flex items-center gap-2 ${isMatchValid ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'}`}>
              <CheckCircle2 className={`w-3.5 h-3.5 ${isMatchValid ? 'text-emerald-500' : 'text-slate-300 dark:text-slate-600'}`} />
              <span>As senhas digitadas são idênticas</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || !isLengthValid || !isMatchValid}
            className="w-full py-3.5 px-6 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm rounded-2xl shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isLoading ? (
              <span>Salvando e criptografando...</span>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                <span>Salvar Nova Senha e Entrar</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
