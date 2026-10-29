'use client';

import React, { useState } from 'react';
import { KeyRound, Eye, EyeOff, CheckCircle2, AlertCircle, Lock, X } from 'lucide-react';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onChanged?: () => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ isOpen, onClose, onChanged }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [done, setDone] = useState(false);

  if (!isOpen) return null;

  const isLengthValid = newPassword.trim().length >= 4;
  const isMatchValid = newPassword.length > 0 && newPassword === confirmPassword;
  const isDifferent = newPassword.length === 0 || newPassword.trim() !== currentPassword.trim();
  const canSubmit = !isLoading && currentPassword.length > 0 && isLengthValid && isMatchValid && isDifferent;

  const reset = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowPasswords(false);
    setErrorMsg('');
    setDone(false);
    setIsLoading(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setErrorMsg('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newPassword: newPassword.trim(),
          confirmPassword: confirmPassword.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        setErrorMsg(data.error || 'Não foi possível alterar a senha. Tente novamente.');
        setIsLoading(false);
        return;
      }

      setDone(true);
      setIsLoading(false);
      onChanged?.();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Erro de conexão. Verifique a internet e tente de novo.');
      setIsLoading(false);
    }
  };

  const inputClass =
    'w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/70 border border-slate-300 dark:border-slate-700 rounded-2xl text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition';

  return (
    <div className="fixed inset-0 z-[9990] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-5 relative">
        <button
          type="button"
          onClick={handleClose}
          aria-label="Fechar"
          className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="text-center space-y-2">
          <div className="inline-flex p-3 bg-primary/10 text-primary rounded-2xl border border-primary/20">
            <KeyRound className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Alterar minha senha</h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Por segurança, confirme sua senha atual antes de criar a nova.
          </p>
        </div>

        {done ? (
          <div className="space-y-4">
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl flex items-start gap-2.5 text-sm text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
              <span className="font-medium">Senha alterada com sucesso! Use a nova senha no próximo acesso.</span>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="w-full py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm rounded-2xl cursor-pointer min-h-[44px]"
            >
              Fechar
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMsg && (
              <div className="p-3.5 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/60 rounded-2xl flex items-start gap-2.5 text-xs text-rose-700 dark:text-rose-300">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
                <span className="font-medium leading-relaxed">{errorMsg}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Senha atual</label>
              <input
                type={showPasswords ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
                autoFocus
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Nova senha</label>
              <input
                type={showPasswords ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Confirmar nova senha</label>
              <input
                type={showPasswords ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                className={inputClass}
              />
            </div>

            <button
              type="button"
              onClick={() => setShowPasswords((v) => !v)}
              className="flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
            >
              {showPasswords ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {showPasswords ? 'Ocultar senhas' : 'Mostrar senhas'}
            </button>

            <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-2xl border border-slate-200 dark:border-slate-800/80 space-y-1.5 text-xs">
              <div className={`flex items-center gap-2 ${isLengthValid ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'}`}>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Mínimo de 4 caracteres</span>
              </div>
              <div className={`flex items-center gap-2 ${isMatchValid ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'}`}>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>As duas senhas novas são idênticas</span>
              </div>
              <div className={`flex items-center gap-2 ${isDifferent ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Diferente da senha atual</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={!canSubmit}
              className="w-full py-3.5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm rounded-2xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer min-h-[44px]"
            >
              <Lock className="w-4 h-4" />
              <span>{isLoading ? 'Salvando...' : 'Salvar nova senha'}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
