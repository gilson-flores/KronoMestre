import { TeacherUser, StudentUser } from './types';

/**
 * Lista de chaves legadas de cache local (sem sufixo de identificação do professor proprietário).
 * Devem ser limpas/ignoradas para evitar vazamento de dados em computadores compartilhados.
 */
export const LEGACY_CACHE_KEYS = [
  'local_students_data',
  'local_activities_data',
  'local_atestados_rad_data',
  'atestados_rad_records',
  'local_second_teachers_data',
  'library_files_data',
  'local_rco_emissions_v1',
] as const;

/**
 * Obtém o ownerTeacherId da sessão ativa atual armazenada no sessionStorage ou fallback de objetos em memória.
 */
export function getCurrentOwnerTeacherId(
  fallbackTeacher?: TeacherUser | null,
  fallbackStudent?: StudentUser | null
): string {
  if (typeof window !== 'undefined') {
    try {
      const sessionStr = sessionStorage.getItem('active_session');
      if (sessionStr) {
        const session = JSON.parse(sessionStr);
        if (session.ownerTeacherId && typeof session.ownerTeacherId === 'string' && session.ownerTeacherId.trim()) {
          return session.ownerTeacherId.trim();
        }
        if (session.role === 'teacher' && session.teacherData?.id) {
          return session.teacherData.id.trim();
        }
        if (session.teacherData?.ownerTeacherId) {
          return session.teacherData.ownerTeacherId.trim();
        }
        if (session.teacherData?.owner_teacher_id) {
          return session.teacherData.owner_teacher_id.trim();
        }
        if (session.studentData?.ownerTeacherId) {
          return session.studentData.ownerTeacherId.trim();
        }
        if (session.studentData?.owner_teacher_id) {
          return session.studentData.owner_teacher_id.trim();
        }
        if (session.role === 'second_teacher' && session.teacherData?.id) {
          return session.teacherData.id.trim();
        }
      }
    } catch (e) {
      console.warn('Aviso ao extrair ownerTeacherId da sessão ativa:', e);
    }
  }

  if (fallbackTeacher) {
    if (fallbackTeacher.ownerTeacherId && fallbackTeacher.ownerTeacherId.trim()) {
      return fallbackTeacher.ownerTeacherId.trim();
    }
    const anyTeacher = fallbackTeacher as any;
    if (anyTeacher.owner_teacher_id && typeof anyTeacher.owner_teacher_id === 'string' && anyTeacher.owner_teacher_id.trim()) {
      return anyTeacher.owner_teacher_id.trim();
    }
    if (fallbackTeacher.id && fallbackTeacher.id.trim()) {
      return fallbackTeacher.id.trim();
    }
  }

  if (fallbackStudent) {
    if (fallbackStudent.ownerTeacherId && fallbackStudent.ownerTeacherId.trim()) {
      return fallbackStudent.ownerTeacherId.trim();
    }
    const anyStudent = fallbackStudent as any;
    if (anyStudent.owner_teacher_id && typeof anyStudent.owner_teacher_id === 'string' && anyStudent.owner_teacher_id.trim()) {
      return anyStudent.owner_teacher_id.trim();
    }
  }

  return '';
}

/**
 * Constrói a chave de cache segura vinculada estritamente ao ownerTeacherId da sessão atual.
 * Exemplo: local_students_data_${ownerTeacherId}
 */
export function getScopedCacheKey(baseKey: string, ownerTeacherId?: string | null): string {
  const owner = (ownerTeacherId && ownerTeacherId.trim()) || getCurrentOwnerTeacherId();
  if (owner) {
    return `${baseKey}_${owner}`;
  }
  return baseKey;
}

/** Remove/limpa chaves residuais de autenticação do Firebase do localStorage no arranque */
export function cleanAuthLocalStorage(): void {
  if (typeof window === 'undefined') return;
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('firebase:authUser:') || key.startsWith('firebase:auth:'))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch (e) {
    console.warn('Aviso ao limpar cache de auth do localStorage:', e);
  }
}

/**
 * Lê do localStorage garantindo:
 * 1. Limpeza/rejeição imediata de chaves legadas sem sufixo
 * 2. Leitura exclusiva da chave com sufixo do ownerTeacherId atual
 */
export function getScopedLocalStorageItem(
  baseKey: string,
  ownerTeacherId?: string | null
): string | null {
  if (typeof window === 'undefined') return null;

  // Limpa/ignora chave antiga sem sufixo
  try {
    if (localStorage.getItem(baseKey) !== null) {
      localStorage.removeItem(baseKey);
    }
  } catch (e) {}

  const owner = (ownerTeacherId && ownerTeacherId.trim()) || getCurrentOwnerTeacherId();
  if (!owner) {
    // Sem identificação segura de professor/sessão, ignora cache para impedir vazamento entre usuários
    return null;
  }

  try {
    const scopedKey = `${baseKey}_${owner}`;
    return localStorage.getItem(scopedKey);
  } catch (e) {
    console.warn(`Erro ao ler cache seguro de "${baseKey}":`, e);
    return null;
  }
}

/**
 * Grava no localStorage associando a chave ao ownerTeacherId atual e removendo chaves antigas sem sufixo.
 */
export function setScopedLocalStorageItem(
  baseKey: string,
  value: string,
  ownerTeacherId?: string | null
): void {
  if (typeof window === 'undefined') return;

  // Garante que chave sem sufixo seja removida
  try {
    if (localStorage.getItem(baseKey) !== null) {
      localStorage.removeItem(baseKey);
    }
  } catch (e) {}

  const owner = (ownerTeacherId && ownerTeacherId.trim()) || getCurrentOwnerTeacherId();
  if (!owner) {
    return;
  }

  try {
    const scopedKey = `${baseKey}_${owner}`;
    localStorage.setItem(scopedKey, value);
  } catch (e) {
    console.warn(`Erro ao gravar cache seguro de "${baseKey}":`, e);
  }
}

/**
 * Remove a chave com escopo do ownerTeacherId e também a chave legada.
 */
export function removeScopedLocalStorageItem(
  baseKey: string,
  ownerTeacherId?: string | null
): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(baseKey);
  } catch (e) {}

  const owner = (ownerTeacherId && ownerTeacherId.trim()) || getCurrentOwnerTeacherId();
  if (owner) {
    try {
      localStorage.removeItem(`${baseKey}_${owner}`);
    } catch (e) {}
  }
}

/** Limpa chaves legadas e resquícios de autenticação do localStorage no arranque */
export function cleanLegacyCacheKeys(): void {
  if (typeof window === 'undefined') return;
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (
        key && 
        (key.startsWith('firebase:authUser:') || 
         key.startsWith('firebase:auth:') || 
         key.includes('supabase'))
      ) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch (e) {
    console.warn('Aviso ao limpar cache legado/auth do localStorage:', e);
  }
}
