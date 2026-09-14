import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatAvatarUrl(url: string | undefined | null): string {
  if (!url || !url.trim()) {
    return 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=250';
  }
  const trimmed = url.trim();
  if (trimmed.includes('drive.google.com/file/d/')) {
    const match = trimmed.match(/\/file\/d\/([^\/]+)/);
    if (match && match[1]) {
      return `https://lh3.googleusercontent.com/d/${match[1]}`;
    }
  }
  return trimmed;
}

/**
 * Rola suavemente a página e os containers de conteúdo para o topo
 * ao salvar ou executar ações chave nos ambientes do Aluno, Professor e 2º Professor.
 */
export function scrollToTop() {
  if (typeof window !== 'undefined') {
    try {
      window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
      document.documentElement?.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
      document.body?.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
      const scrollableElements = document.querySelectorAll('main, .overflow-y-auto, [data-scroll-container]');
      scrollableElements.forEach((el) => {
        try {
          el.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
        } catch (_) {}
      });
    } catch (_) {}
  }
}

