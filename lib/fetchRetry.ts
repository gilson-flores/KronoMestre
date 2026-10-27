export async function fetchWithRetry(
  url: string,
  init?: RequestInit,
  opts: { tries?: number; maxWaitMs?: number } = {}
): Promise<Response | null> {
  const tries = opts.tries ?? 4;
  const maxWait = opts.maxWaitMs ?? 8000;

  for (let attempt = 0; attempt < tries; attempt++) {
    const isLast = attempt === tries - 1;
    try {
      const res = await fetch(url, init);
      if (res.status !== 429 && res.status < 500) return res;
      if (isLast) return res;

      const retryAfter = Number(res.headers.get('Retry-After'));
      const base = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 700 * 2 ** attempt;
      await sleep(Math.min(maxWait, base) + Math.random() * 400);
    } catch {
      if (isLast) return null;
      await sleep(Math.min(maxWait, 700 * 2 ** attempt) + Math.random() * 400);
    }
  }
  return null;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
