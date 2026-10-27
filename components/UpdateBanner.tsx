'use client';

import React from 'react';

export function UpdateBanner({ visible }: { visible: boolean }) {
  if (!visible) return null;

  const handleUpdate = () => {
    try {
      Object.keys(sessionStorage)
        .filter((k) => k.startsWith('library_cache_'))
        .forEach((k) => sessionStorage.removeItem(k));
    } catch {}
    window.location.reload();
  };

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999] w-[calc(100%-2rem)] max-w-md">
      <div className="flex items-center justify-between gap-3 rounded-2xl bg-amber-500 text-black px-4 py-3 shadow-2xl text-sm font-bold">
        <span>Há uma nova versão do KronoMestre. Atualize para não usar dados antigos.</span>
        <button
          type="button"
          onClick={handleUpdate}
          className="shrink-0 rounded-xl bg-black text-white px-3 py-2 text-xs font-extrabold cursor-pointer min-h-[36px]"
        >
          Atualizar agora
        </button>
      </div>
    </div>
  );
}
