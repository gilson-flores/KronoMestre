import { NextRequest } from 'next/server';
import { serverCache } from '@/lib/server-cache';

export const dynamic = 'force-dynamic';

/**
 * Endpoint de streaming SSE (Server-Sent Events) orientado a eventos em memória.
 * Utiliza o gerenciador de presença em memória (ServerCache) para despachar sessões
 * ativas genuínas em tempo real sem executar nenhuma leitura (0 reads) no Firestore,
 * eliminando totalmente o esgotamento da cota diária do Firebase.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const teacherId = searchParams.get('teacherId') || '5IdpwffjnhewdZ5dONRB9QoIRBZ2';

  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | null = null;
  let keepAliveTimer: NodeJS.Timeout | null = null;
  let presenceCheckTimer: NodeJS.Timeout | null = null;

  const stream = new ReadableStream({
    start(controller) {
      try {
        // Envia payload inicial imediatamente a partir da memória do servidor
        const sendPayload = (data: { onlineCount: number; onlineStudentIds: string[] }) => {
          try {
            const payload = JSON.stringify({
              onlineCount: data.onlineCount,
              onlineStudentIds: data.onlineStudentIds,
              timestamp: new Date().toISOString(),
            });
            controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
          } catch {}
        };

        // Escuta mutações de presença em tempo real (registradas via heartbeat / login)
        unsubscribe = serverCache.subscribePresence(teacherId, (data) => {
          sendPayload(data);
        });

        // Verificação periódica a cada 30s para atualizar expirações de inatividade (> 5 min)
        presenceCheckTimer = setInterval(() => {
          try {
            const data = serverCache.getOnlinePresence(teacherId);
            sendPayload(data);
          } catch {
            if (presenceCheckTimer) clearInterval(presenceCheckTimer);
          }
        }, 30000);

        // Keep-alive leve (comentário SSE) para evitar timeouts de proxies reversos
        keepAliveTimer = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(': keepalive\n\n'));
          } catch {
            if (keepAliveTimer) clearInterval(keepAliveTimer);
          }
        }, 25000);
      } catch (err: any) {
        console.warn('[Presence Stream] Falha ao iniciar stream em memória:', err?.message);
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
      if (presenceCheckTimer) {
        clearInterval(presenceCheckTimer);
        presenceCheckTimer = null;
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

