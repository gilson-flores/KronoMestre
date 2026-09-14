import bcrypt from 'bcryptjs';

/**
 * Utilitário de segurança e criptografia para senhas
 * Suporta bcrypt (padrão ouro), SHA-256 (compatibilidade) e migração transparente.
 */

export async function hashPasswordBcrypt(plainText: string): Promise<string> {
  if (!plainText) return '';
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plainText, salt);
}

export async function verifyPasswordBcrypt(plainText: string, storedHashOrPlain: string): Promise<boolean> {
  if (!plainText || !storedHashOrPlain) return false;

  // Formato bcrypt ($2a$, $2b$, $2y$)
  if (storedHashOrPlain.startsWith('$2a$') || storedHashOrPlain.startsWith('$2b$') || storedHashOrPlain.startsWith('$2y$')) {
    return bcrypt.compare(plainText, storedHashOrPlain);
  }

  // Formato sha256:...
  if (storedHashOrPlain.startsWith('sha256:')) {
    const computed = await hashPassword(plainText);
    return computed === storedHashOrPlain;
  }

  // Fallback de migração estrita: compara texto puro se ainda não foi migrado
  return plainText === storedHashOrPlain;
}

export async function hashPassword(plainText: string): Promise<string> {
  if (!plainText) return '';
  const encoder = new TextEncoder();
  const data = encoder.encode(plainText);
  const hashBuffer = await globalThis.crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  return `sha256:${hashHex}`;
}

export async function verifyPassword(plainText: string, storedHashOrPlain: string): Promise<boolean> {
  return verifyPasswordBcrypt(plainText, storedHashOrPlain);
}

export function isHashed(stored: string): boolean {
  if (typeof stored !== 'string') return false;
  return stored.startsWith('$2a$') || stored.startsWith('$2b$') || stored.startsWith('$2y$') || stored.startsWith('sha256:');
}

