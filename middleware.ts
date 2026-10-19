import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Banco em memória rápido para rastrear IPs e requisições
const rateLimitMap = new Map<string, number[]>();

export function middleware(request: NextRequest) {
  // O escudo protege apenas as rotas do backend (API)
  if (request.nextUrl.pathname.startsWith('/api/')) {
    // Usando headers padrão em vez de request.ip para evitar erros de TypeScript
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1';
    const now = Date.now();
    const windowMs = 60 * 1000; // Janela de 1 minuto
    const maxRequests = 40; // Limite de 40 requisições por minuto por IP

    const requestTimestamps = rateLimitMap.get(ip) || [];
    
    // Filtra apenas as requisições que ocorreram no último minuto
    const recentRequests = requestTimestamps.filter(timestamp => now - timestamp < windowMs);

    if (recentRequests.length >= maxRequests) {
      console.warn(`[Escudo Anti-Spam] Bloqueando IP: ${ip} - Muitas requisições.`);
      return NextResponse.json(
        { error: 'Calma lá! O sistema anti-spam detectou chamadas excessivas. Seu acesso foi bloqueado temporariamente. Tente novamente em 1 minuto.' },
        { status: 429 } // HTTP 429: Too Many Requests
      );
    }

    // Registra a nova requisição
    recentRequests.push(now);
    rateLimitMap.set(ip, recentRequests);
  }

  return NextResponse.next();
}

// Configuração para interceptar TODAS as chamadas de API
export const config = {
  matcher: '/api/:path*',
};