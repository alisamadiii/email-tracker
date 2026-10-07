import { isIP } from 'node:net';

// Outbound webhook URLs are user-supplied; block anything that could reach
// the container's own network (SSRF). Checked on save and again on send.
export function assertSafeOutboundUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error('Invalid URL');
  }

  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error('Only http(s) URLs are allowed');
  }

  const host = url.hostname.toLowerCase();

  if (
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host.endsWith('.internal')
  ) {
    throw new Error('URL points to a local host');
  }

  const version = isIP(host.replace(/^\[|\]$/g, ''));
  if (version === 4 && isPrivateIPv4(host)) {
    throw new Error('URL points to a private network');
  }
  if (version === 6) {
    const h = host.replace(/^\[|\]$/g, '');
    if (h === '::1' || h.startsWith('fc') || h.startsWith('fd') || h.startsWith('fe80')) {
      throw new Error('URL points to a private network');
    }
  }

  return url;
}

function isPrivateIPv4(host: string): boolean {
  const parts = host.split('.').map(Number);
  const [a, b] = parts;
  return (
    a === 10 ||
    a === 127 ||
    a === 0 ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 169 && b === 254)
  );
}
