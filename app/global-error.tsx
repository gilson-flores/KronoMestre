'use client';

import React from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="pt-BR">
      <body className="bg-[#0b1326] text-white flex flex-col items-center justify-center min-h-screen p-6 text-center">
        <h2 className="text-xl font-bold text-rose-400 mb-2">Erro Global do Sistema</h2>
        <p className="text-xs text-[#bccabb] mb-4 max-w-md">
          Ocorreu uma falha crítica na inicialização.
        </p>
        <button
          onClick={() => reset()}
          className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-black text-xs font-bold rounded-xl transition-all"
        >
          Recarregar Aplicação
        </button>
      </body>
    </html>
  );
}
