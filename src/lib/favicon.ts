const MAX_ICON_BYTES = 200_000;

/**
 * Fetches a site's favicon once and returns it as a base64 data URL,
 * so it can be cached in the database instead of re-fetched on every render.
 */
export async function fetchFavicon(url: string | null): Promise<string | null> {
  if (!url) return null;

  let hostname: string;
  try {
    hostname = new URL(url.includes('://') ? url : `https://${url}`).hostname;
  } catch {
    return null;
  }

  const sources = [
    `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`,
    `https://${hostname}/favicon.ico`,
  ];

  for (const source of sources) {
    try {
      const res = await fetch(source, {
        signal: AbortSignal.timeout(5000),
        cache: 'no-store',
      });
      if (!res.ok) continue;

      const contentType = res.headers.get('content-type') ?? 'image/png';
      if (!contentType.startsWith('image/')) continue;

      const buffer = Buffer.from(await res.arrayBuffer());
      if (buffer.length === 0 || buffer.length > MAX_ICON_BYTES) continue;

      return `data:${contentType.split(';')[0]};base64,${buffer.toString('base64')}`;
    } catch {
      // try the next source
    }
  }

  return null;
}
