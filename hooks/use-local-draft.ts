// hooks/use-local-draft.ts
'use client';

import { useState, useEffect, useRef } from 'react';

interface UseLocalDraftOptions<T> {
  key: string;
  initialValue: T;
  debounceMs?: number;
}

/**
 * Hook para persistência preventiva de rascunhos no navegador (localStorage).
 * Garante que nenhuma anotação ou correção do professor se perca por queda de rede ou recarregamento.
 */
export function useLocalDraft<T>({
  key,
  initialValue,
  debounceMs = 500,
}: UseLocalDraftOptions<T>) {
  const [data, setData] = useState<T>(initialValue);
  const [hasDraft, setHasDraft] = useState<boolean>(false);
  const isHydrated = useRef(false);

  // 1. Recupera o rascunho na montagem do componente
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`draft_${key}`);
      if (saved) {
        setData(JSON.parse(saved));
        setHasDraft(true);
      }
    } catch (e) {
      console.warn('[useLocalDraft] Falha ao recuperar rascunho local:', e);
    } finally {
      isHydrated.current = true;
    }
  }, [key]);

  // 2. Salva alterações automaticamente com debounce
  useEffect(() => {
    if (!isHydrated.current) return;

    const handler = setTimeout(() => {
      try {
        if (data !== undefined && data !== null) {
          localStorage.setItem(`draft_${key}`, JSON.stringify(data));
          setHasDraft(true);
        }
      } catch (e) {
        console.warn('[useLocalDraft] Falha ao persistir rascunho local:', e);
      }
    }, debounceMs);

    return () => clearTimeout(handler);
  }, [key, data, debounceMs]);

  // 3. Limpa o rascunho manualmente (ex: após envio bem-sucedido)
  const clearDraft = () => {
    try {
      localStorage.removeItem(`draft_${key}`);
      setData(initialValue);
      setHasDraft(false);
    } catch (e) {
      console.warn('[useLocalDraft] Erro ao limpar rascunho:', e);
    }
  };

  return {
    draft: data,
    setDraft: setData,
    hasDraft,
    clearDraft,
  };
}
