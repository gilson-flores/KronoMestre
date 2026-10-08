'use client';

import React, { useState } from 'react';
import { KeyRound, X, Check, Copy, AlertTriangle, ShieldCheck, RefreshCw, Sparkles } from 'lucide-react';

interface ResetPasswordByTeacherModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetType: 'student' | 'second_teacher';
  targetId: string;
  targetName: string;
  targetDetail?: string; // ex: Turma 3001 ou email
  onSuccess?: (msg: string) => void;
}

export const ResetPasswordByTeacherModal: React.FC<ResetPasswordByTeacherModalProps> = ({
  isOpen,
  onClose,
  targetType,
  targetId,
  targetName,
  targetDetail,
  onSuccess,
}) => {
  const [customPassword, setCustomPassword] = useState('123456');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [copied, setCopied] = useState(false);
  const [completedPassword, setCompletedPassword] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGenerateRandom = () => {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCustomPassword(result);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!customPassword.trim() || customPassword.trim().length < 4) {
      setErrorMsg('A senha temporária deve conter no mínimo 4 caracteres.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/reset-user-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetType,
          targetId,
          tempPassword: customPassword.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMsg(data.error || 'Falha ao redefinir a senha.');
        setIsLoading(false);
        return;
      }

      setCompletedPassword(data.tempPassword || customPassword.trim());
      setIsLoading(false);
      if (onSuccess) {
        onSuccess(`Senha de ${targetName} redefinida com sucesso!`);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Erro de conexão ao redefinir senha.');
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (completedPassword) {
      navigator.clipboard.writeText(completedPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleClose = () => {
    setCompletedPassword(null);
    setCustomPassword('123456');
    setErrorMsg('');
    onClose();
  };

  return (
    <div
      id="reset-password-teacher-modal-overlay"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150"
    >
      <div
        id="reset-password-teacher-modal-card"
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-6 relative my-auto max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-150"
      >
        <button
          onClick={handleClose}
          className="absolute top-3 sm:top-5 right-3 sm:right-5 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
          aria-label="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 pr-8">
          <div className="p-2.5 sm:p-3 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-2xl border border-amber-500/20 shrink-0">
            <KeyRound className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0">
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 truncate">
              Redefinir Senha de Acesso
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
              {targetType === 'student' ? 'Aluno' : '2º Professor'}: <strong className="text-slate-800 dark:text-slate-200">{targetName}</strong> {targetDetail && `(${targetDetail})`}
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3.5 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-2xl flex items-center gap-2 text-xs text-rose-700 dark:text-rose-300">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{errorMsg}</span>
          </div>
        )}

        {completedPassword ? (
          <div className="space-y-4 py-2">
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl space-y-3">
              <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 text-xs font-bold uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>Senha Redefinida com Sucesso!</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Passe a senha temporária abaixo para o usuário. Assim que ele fizer o login, o sistema exigirá a troca imediata por uma nova senha pessoal.
              </p>
              <div className="flex items-center justify-between p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-emerald-300 dark:border-emerald-700/60 font-mono text-base font-black text-slate-900 dark:text-slate-100 shadow-inner">
                <span>{completedPassword}</span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-sans font-semibold transition cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copiado!' : 'Copiar'}</span>
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={handleClose}
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 font-bold text-sm rounded-2xl transition cursor-pointer"
            >
              Concluir e Fechar
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Senha Temporária de Primeiro Acesso
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  value={customPassword}
                  onChange={(e) => setCustomPassword(e.target.value)}
                  placeholder="Ex: 123456"
                  className="flex-1 px-4 py-2.5 bg-slate-50 dark:bg-slate-800/70 border border-slate-300 dark:border-slate-700 rounded-2xl text-sm font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
                />
                <button
                  type="button"
                  onClick={handleGenerateRandom}
                  title="Gerar código aleatório"
                  className="px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-2xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer border border-slate-200 dark:border-slate-700"
                >
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>Gerar</span>
                </button>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200">
                <ShieldCheck className="w-4 h-4 text-primary" />
                <span>Troca de Senha Obrigatória</span>
              </div>
              <p>
                Ao redefinir, a senha é criptografada em Bcrypt e o sistema trava o avanço até que o usuário cadastre sua própria senha no primeiro login.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 py-3 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs rounded-2xl transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 py-3 px-4 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs rounded-2xl shadow-lg shadow-primary/20 transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    <span>Confirmar Redefinição</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
