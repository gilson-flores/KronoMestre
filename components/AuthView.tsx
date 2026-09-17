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
      } catch (err) {
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

      if (res.ok) {
        const data = await res.json();
        setSession(data.user);
      } else {
        const errData = await res.json();
        setError(errData.error || "Erro ao fazer login");
      }
    } catch (err) {
      setError("Erro de conexão ao tentar fazer login.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
        <span className="ml-3 text-slate-300 font-medium">Autenticando...</span>
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
              <div className="p-4 bg-rose-500/10 border border-rose-500/50 rounded-xl text-sm text-rose-400 font-bold text-center">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-colors shadow-lg shadow-emerald-900/50 disabled:opacity-70"
            >
              {loading ? "Processando..." : "Entrar no Sistema"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export default AuthView;
