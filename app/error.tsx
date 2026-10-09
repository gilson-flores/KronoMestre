'use client';

import React, { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Unhandled runtime error in KronoMestre:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#0b0f19] text-[#f8fafc] flex flex-col items-center justify-center p-4 selection:bg-blue-600">
      <div className="w-full max-w-md bg-[#111827] border border-[#1e293b] rounded-3xl p-6 sm:p-8 text-center shadow-2xl">
        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 text-2xl font-bold">
          ⚠️
        </div>
        <h2 className="text-xl font-bold text-[#f8fafc] mb-2 tracking-tight">
          Ops! Algo inesperado aconteceu
        </h2>
        <p className="text-sm text-[#94a3b8] mb-6 leading-relaxed">
          Ocorreu uma instabilidade momentânea no carregamento da aplicação.
        </p>

        {error?.message && (
          <div className="mb-6 p-3 bg-rose-950/30 border border-rose-800/40 rounded-xl text-xs text-rose-300 font-mono break-words text-left overflow-x-auto max-h-32">
            {error.message}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => reset()}
            className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold transition cursor-pointer shadow-lg shadow-blue-500/20"
          >
            Tentar novamente
          </button>
          <button
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.location.reload();
              }
            }}
            className="w-full sm:w-auto px-5 py-2.5 bg-[#1f293d] hover:bg-[#28354f] text-[#cbd5e1] rounded-xl text-sm font-medium transition cursor-pointer border border-[#334155]"
          >
            Recarregar página
          </button>
        </div>
      </div>
    </div>
  );
}
