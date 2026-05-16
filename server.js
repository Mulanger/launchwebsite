import { createReadStream, existsSync, statSync } from 'node:fs';
import http from 'node:http';
import { createServer } from 'node:http';
import https from 'node:https';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const distDir = resolve(__dirname, 'dist');
const port = Number(process.env.PORT || 4173);
const apiTarget = (process.env.API_BASE_URL || 'https://whaleserver-production.up.railway.app').replace(/\/$/, '');
const maxProxyBodyBytes = Number(process.env.API_PROXY_MAX_BODY_BYTES || 1024 * 1024);
const canonicalHost = 'www.polywhaletrades.com';
const apexHost = 'polywhaletrades.com';
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

const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
};

const securityHeaders = {
  'Content-Security-Policy': "base-uri 'self'; object-src 'none'; frame-ancestors 'none'; upgrade-insecure-requests",
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
};

function copySafeResponseHeaders(source, extras = {}) {
  const headers = { ...extras };
  for (const [key, value] of Object.entries(source || {})) {
    const normalizedKey = key.toLowerCase();
    if (!hopByHopHeaders.has(normalizedKey) && !normalizedKey.startsWith('access-control-')) {
      headers[key] = value;
    }
  }
  return headers;
}

function resolveAsset(urlPath) {
  let decoded = '/';
  try {
    decoded = decodeURIComponent(urlPath.split('?')[0] || '/');
  } catch {
    return null;
  }
  const safePath = normalize(decoded).replace(/^(\.\.[/\\])+/, '');
  const candidate = resolve(join(distDir, safePath));

  if (!candidate.startsWith(distDir)) {
    return null;
  }

  if (existsSync(candidate) && statSync(candidate).isFile()) {
    return candidate;
  }

  return resolve(join(distDir, 'index.html'));
}

function proxyApiRequest(req, res) {
  const contentLength = Number(req.headers['content-length'] || 0);
  if (Number.isFinite(contentLength) && contentLength > maxProxyBodyBytes) {
    res.writeHead(413, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'X-Robots-Tag': 'noindex, nofollow',
    });
    res.end(JSON.stringify({ error: 'request_body_too_large' }));
    return;
  }

  const upstreamUrl = new URL((req.url || '/').replace(/^\/api/, '') || '/', apiTarget);
  const transport = upstreamUrl.protocol === 'https:' ? https : http;
  const headers = { ...req.headers, host: upstreamUrl.host };
  delete headers.connection;

  const upstreamReq = transport.request(
    upstreamUrl,
    {
      method: req.method,
      headers,
    },
    (upstreamRes) => {
      const responseHeaders = copySafeResponseHeaders(upstreamRes.headers, {
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
        'X-Robots-Tag': 'noindex, nofollow',
      });
      res.writeHead(upstreamRes.statusCode || 502, responseHeaders);
      upstreamRes.pipe(res);
    }
  );

  let received = 0;
  let rejected = false;

  upstreamReq.on('error', () => {
    if (rejected) return;
    if (!res.headersSent) {
      res.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
    }
    res.end(JSON.stringify({ error: 'api_proxy_failed' }));
  });

  req.on('data', (chunk) => {
    if (rejected) return;
    received += chunk.length;
    if (received > maxProxyBodyBytes) {
      rejected = true;
      upstreamReq.destroy();
      if (!res.headersSent) {
        res.writeHead(413, {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'no-store',
          'X-Content-Type-Options': 'nosniff',
          'X-Robots-Tag': 'noindex, nofollow',
        });
      }
      res.end(JSON.stringify({ error: 'request_body_too_large' }));
      req.destroy();
      return;
    }
    upstreamReq.write(chunk);
  });

  req.on('end', () => {
    if (!rejected) upstreamReq.end();
  });

  req.on('error', () => {
    upstreamReq.destroy();
  });
}

createServer((req, res) => {
  const host = String(req.headers.host || '').split(':')[0].toLowerCase();
  if (host === apexHost) {
    res.writeHead(301, {
      Location: `https://${canonicalHost}${req.url || '/'}`,
      'Cache-Control': 'public, max-age=3600',
    });
    res.end();
    return;
  }

  if ((req.url || '').startsWith('/api/')) {
    proxyApiRequest(req, res);
    return;
  }

  const filePath = resolveAsset(req.url || '/');
  if (!filePath || !existsSync(filePath)) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }

  const ext = extname(filePath);
  res.writeHead(200, {
    'Content-Type': contentTypes[ext] || 'application/octet-stream',
    ...securityHeaders,
  });
  createReadStream(filePath).pipe(res);
}).listen(port, () => {
  console.log(`Polywatch website listening on port ${port}`);
});
