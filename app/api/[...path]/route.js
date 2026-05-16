const defaultApiBase = 'https://whaleserver-production.up.railway.app';
const maxProxyBodyBytes = Number(process.env.API_PROXY_MAX_BODY_BYTES || 1024 * 1024);
const hopByHopHeaders = new Set([
  'connection',
  'content-encoding',
  'content-length',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
]);

class ProxyBodyTooLargeError extends Error {
  constructor() {
    super('Request body too large');
    this.name = 'ProxyBodyTooLargeError';
  }
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

function apiBaseUrl() {
  return (process.env.API_BASE_URL || defaultApiBase).replace(/\/$/, '');
}

function upstreamUrl(request, pathSegments = []) {
  const path = pathSegments.map((segment) => encodeURIComponent(segment)).join('/');
  return `${apiBaseUrl()}/${path}${new URL(request.url).search}`;
}

function requestHeaders(request) {
  const headers = new Headers(request.headers);
  headers.set('host', new URL(apiBaseUrl()).host);
  headers.delete('connection');
  headers.delete('content-length');
  return headers;
}

function responseHeaders(upstreamHeaders) {
  const headers = new Headers();

  upstreamHeaders.forEach((value, key) => {
    const normalizedKey = key.toLowerCase();
    if (!hopByHopHeaders.has(normalizedKey) && !normalizedKey.startsWith('access-control-')) {
      headers.set(key, value);
    }
  });

  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('X-Robots-Tag', 'noindex, nofollow');
  headers.set('Cache-Control', 'no-store');

  return headers;
}

async function readRequestBody(request) {
  const contentLength = Number(request.headers.get('content-length') || 0);
  if (Number.isFinite(contentLength) && contentLength > maxProxyBodyBytes) {
    throw new ProxyBodyTooLargeError();
  }
  if (!request.body) return undefined;

  const reader = request.body.getReader();
  const chunks = [];
  let total = 0;

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxProxyBodyBytes) {
      throw new ProxyBodyTooLargeError();
    }
    chunks.push(value);
  }

  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body.buffer;
}

function proxyErrorResponse(error) {
  const tooLarge = error instanceof ProxyBodyTooLargeError;
  return Response.json(
    { error: tooLarge ? 'request_body_too_large' : 'api_proxy_failed' },
    {
      status: tooLarge ? 413 : 502,
      headers: {
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
        'X-Robots-Tag': 'noindex, nofollow',
      },
    },
  );
}

async function proxyRequest(request, context) {
  const { path = [] } = await context.params;
  const method = request.method.toUpperCase();
  const hasBody = method !== 'GET' && method !== 'HEAD';

  try {
    const body = hasBody ? await readRequestBody(request) : undefined;
    const upstreamResponse = await fetch(upstreamUrl(request, path), {
      method,
      headers: requestHeaders(request),
      body,
      cache: 'no-store',
      redirect: 'manual',
    });

    return new Response(method === 'HEAD' ? null : upstreamResponse.body, {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers: responseHeaders(upstreamResponse.headers),
    });
  } catch (error) {
    return proxyErrorResponse(error);
  }
}

export const GET = proxyRequest;
export const HEAD = proxyRequest;
export const POST = proxyRequest;
export const PUT = proxyRequest;
export const PATCH = proxyRequest;
export const DELETE = proxyRequest;
