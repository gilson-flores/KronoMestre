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
    console.error('App Error:', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#0b1326] text-white p-6 text-center">
      <h2 className="text-xl font-bold text-rose-400 mb-2">Algo deu errado</h2>
      <p className="text-xs text-[#bccabb] mb-4 max-w-md">
        Ocorreu um erro inesperado ao carregar a página.
      </p>
      <button
        onClick={() => reset()}
        className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-black text-xs font-bold rounded-xl transition-all"
      >
        Tentar novamente
      </button>
    </div>
  );
}
