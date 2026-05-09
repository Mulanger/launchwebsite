const defaultApiBase = 'https://whaleserver-production.up.railway.app';
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
    if (!hopByHopHeaders.has(key.toLowerCase())) {
      headers.set(key, value);
    }
  });

  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('X-Robots-Tag', 'noindex, nofollow');

  return headers;
}

async function proxyRequest(request, context) {
  const { path = [] } = await context.params;
  const method = request.method.toUpperCase();
  const hasBody = method !== 'GET' && method !== 'HEAD';

  try {
    const upstreamResponse = await fetch(upstreamUrl(request, path), {
      method,
      headers: requestHeaders(request),
      body: hasBody ? await request.arrayBuffer() : undefined,
      cache: 'no-store',
      redirect: 'manual',
    });

    return new Response(method === 'HEAD' ? null : upstreamResponse.body, {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers: responseHeaders(upstreamResponse.headers),
    });
  } catch {
    return Response.json(
      { error: 'api_proxy_failed' },
      {
        status: 502,
        headers: {
          'X-Content-Type-Options': 'nosniff',
          'X-Robots-Tag': 'noindex, nofollow',
        },
      },
    );
  }
}

export const GET = proxyRequest;
export const HEAD = proxyRequest;
export const POST = proxyRequest;
export const PUT = proxyRequest;
export const PATCH = proxyRequest;
export const DELETE = proxyRequest;
