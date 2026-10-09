import { NextRequest } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

/**
 * Endpoint de streaming SSE (Server-Sent Events) orientado a eventos do Firestore.
 * Conecta-se diretamente ao Firestore via Admin SDK e escuta mutações em tempo real
 * (onSnapshot), despachando a contagem de sessões ativas genuínas sem que o cliente
 * precise disparar polls repetidos no servidor.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const teacherId = searchParams.get('teacherId') || '5IdpwffjnhewdZ5dONRB9QoIRBZ2';

  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | null = null;
  let keepAliveTimer: NodeJS.Timeout | null = null;

  const stream = new ReadableStream({
    start(controller) {
      try {
        const db = getAdminDb();
        const studentsRef = db
          .collection('tenants')
          .doc(teacherId)
          .collection('students');

        // Escuta orientada a eventos no Firestore
        unsubscribe = studentsRef.onSnapshot(
          (snapshot) => {
            const now = Date.now();
            const fiveMinutesMs = 5 * 60 * 1000;
            const activeIds: string[] = [];

            snapshot.docs.forEach((doc) => {
              const data = doc.data();
              // Regra de Ouro: SOMENTE alunos com isOnline === true E lastActiveAt recente são contabilizados
              // Elimina totalmente números estáticos ou fantasmas (como o antigo 37)
              if (data.isOnline === true && data.lastActiveAt) {
                const diff = now - new Date(data.lastActiveAt).getTime();
                if (diff <= fiveMinutesMs) {
                  activeIds.push(doc.id);
                }
              }
            });

            const payload = JSON.stringify({
              onlineCount: activeIds.length,
              onlineStudentIds: activeIds,
              timestamp: new Date().toISOString(),
            });

            controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
          },
          (error) => {
            console.warn('[Presence Stream] Aviso no listener Firestore:', error?.message);
            // Em caso de indisponibilidade ou regras, transmite 0 seguro
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ onlineCount: 0, onlineStudentIds: [], warning: error?.message })}\n\n`
              )
            );
          }
        );

        // Keep-alive leve (comentário SSE) para evitar timeouts de proxies reversos
        keepAliveTimer = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(': keepalive\n\n'));
          } catch {
            if (keepAliveTimer) clearInterval(keepAliveTimer);
          }
        }, 25000);
      } catch (err: any) {
        console.warn('[Presence Stream] Falha ao iniciar stream:', err?.message);
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ onlineCount: 0, onlineStudentIds: [] })}\n\n`)
        );
      }
    },
    cancel() {
      if (unsubscribe) {
        try {
          unsubscribe();
        } catch {}
        unsubscribe = null;
      }
      if (keepAliveTimer) {
        clearInterval(keepAliveTimer);
        keepAliveTimer = null;
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
