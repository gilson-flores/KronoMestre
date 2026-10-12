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

/**
 * Obtém o ID único do usuário ou tenant atual (ex: teacher.id, student.id, ou ownerTeacherId)
 */
export function getCurrentUserId(): string {
  if (typeof window !== 'undefined') {
    try {
      const activeId = sessionStorage.getItem('current_active_user_id');
      if (activeId && activeId.trim()) return activeId.trim();

      const sessionStr = sessionStorage.getItem('active_session');
      if (sessionStr) {
        const session = JSON.parse(sessionStr);
        if (session.studentId) return session.studentId;
        if (session.studentData?.id) return session.studentData.id;
        if (session.teacherData?.id) return session.teacherData.id;
        if (session.ownerTeacherId) return session.ownerTeacherId;
      }
    } catch (e) {}
  }
  return '';
}

/**
 * Retorna a chave com prefixo único por tenant/usuário para isolamento no sessionStorage.
 */
export function getTenantSessionKey(key: string, tenantOrUserId?: string | null): string {
  const scope = (tenantOrUserId && tenantOrUserId.trim()) || getCurrentUserId() || getCurrentOwnerTeacherId();
  return scope ? `tenant_${scope}_${key}` : `tenant_shared_${key}`;
}

/**
 * Lê item isolado por Tenant/User do sessionStorage.
 * Previne rigorosamente que sessões de pai/professor vazem para o filho/aluno na mesma máquina ou navegador.
 */
export function getTenantSessionItem(key: string, tenantOrUserId?: string | null): string | null {
  if (typeof window === 'undefined') return null;
  const scope = (tenantOrUserId && tenantOrUserId.trim()) || getCurrentUserId() || getCurrentOwnerTeacherId();
  if (scope) {
    const scopedVal = sessionStorage.getItem(`tenant_${scope}_${key}`);
    if (scopedVal !== null) return scopedVal;
  }
  // Se não foi fornecido escopo explícito, lê chave legada como fallback
  if (!tenantOrUserId) {
    return sessionStorage.getItem(key);
  }
  return null;
}

/**
 * Grava item isolado por Tenant/User no sessionStorage com chave prefixada e ponteiro do usuário ativo.
 */
export function setTenantSessionItem(key: string, value: string, tenantOrUserId?: string | null): void {
  if (typeof window === 'undefined') return;
  const scope = (tenantOrUserId && tenantOrUserId.trim()) || getCurrentUserId() || getCurrentOwnerTeacherId();
  if (scope) {
    sessionStorage.setItem(`tenant_${scope}_${key}`, value);
    sessionStorage.setItem('current_active_user_id', scope);
  }
  // Mantém chave base sincronizada na aba ativa
  sessionStorage.setItem(key, value);
}

/**
 * Remove item isolado do sessionStorage em todas as variações prefixadas e legadas.
 */
export function removeTenantSessionItem(key: string, tenantOrUserId?: string | null): void {
  if (typeof window === 'undefined') return;
  const scope = (tenantOrUserId && tenantOrUserId.trim()) || getCurrentUserId() || getCurrentOwnerTeacherId();
  if (scope) {
    sessionStorage.removeItem(`tenant_${scope}_${key}`);
  }
  sessionStorage.removeItem(key);
}

/**
 * Limpa completamente todo o cache e resquícios de autenticação global e local
 * em cada novo login ou troca de usuário para isolamento absoluto (Tenant Isolation).
 */
export function purgeAllAuthAndTenantCaches(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.clear();
    // Limpar chaves legadas e todos os caches globais do localStorage
    LEGACY_CACHE_KEYS.forEach((k) => {
      try {
        localStorage.removeItem(k);
      } catch {}
    });
    localStorage.removeItem('local_messages_data');
    localStorage.removeItem('teacher_drive_folder_url');
    localStorage.removeItem('explicit_logout');

    // Remove chaves de auth do Firebase e Supabase
    cleanLegacyCacheKeys();
  } catch (e) {
    console.warn('Aviso ao purgar caches de autenticação:', e);
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
