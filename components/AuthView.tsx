"use client";

import { useState, useEffect } from "react";

export function AuthView({ children }: { children?: React.ReactNode }) {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await fetch("/api/auth/session");
        if (res.ok) {
          const data = await res.json();
          setSession(data.user);
        } else {
          setSession(null);
        }
      } catch {
        setSession(null);
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const rawText = await res.text();
      let data: any = null;

      try {
        data = JSON.parse(rawText);
      } catch {
        // Se a Vercel cuspir HTML de erro 500/504, mostramos o status real sem quebrar
        setError(`Erro ${res.status}: ${rawText.slice(0, 120)}`);
        setLoading(false);
        return;
      }

      if (res.ok) {
        setSession(data.user);
        // Recarrega para que a aplicação principal inicialize com os dados do Firestore
        window.location.reload();
      } else {
        setError(data.error || `Erro ${res.status}: Falha no acesso.`);
      }
    } catch (err: any) {
      setError(`Falha na requisição: ${err.message || "Sem resposta do servidor"}`);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
        <span className="ml-3 text-slate-300 font-medium">Conectando...</span>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950 text-slate-100">
        <div className="w-full max-w-md p-8 bg-slate-900 rounded-2xl shadow-2xl border border-slate-800">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-black text-white tracking-tight">Krono Mestre</h1>
            <p className="text-sm text-emerald-400 mt-2 font-medium">Acesso Restrito</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-slate-300 mb-1">E-mail Institucional</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all outline-none"
                placeholder="professor@escola.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-300 mb-1">Senha de Acesso</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all outline-none"
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <div className="p-4 bg-rose-500/10 border border-rose-500/50 rounded-xl text-xs text-rose-300 font-mono text-center break-words">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-colors shadow-lg shadow-emerald-900/50 disabled:opacity-70 font-sans"
            >
              {loading ? "Entrando..." : "Entrar no Sistema"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export default AuthView;
