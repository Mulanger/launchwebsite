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
const canonicalHost = 'www.polywhaletrades.com';
const apexHost = 'polywhaletrades.com';

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

function resolveAsset(urlPath) {
  const decoded = decodeURIComponent(urlPath.split('?')[0] || '/');
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
      const responseHeaders = {
        ...upstreamRes.headers,
        'X-Content-Type-Options': 'nosniff',
      };
      res.writeHead(upstreamRes.statusCode || 502, responseHeaders);
      upstreamRes.pipe(res);
    }
  );

  upstreamReq.on('error', () => {
    if (!res.headersSent) {
      res.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
    }
    res.end(JSON.stringify({ error: 'api_proxy_failed' }));
  });

  req.pipe(upstreamReq);
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
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  });
  createReadStream(filePath).pipe(res);
}).listen(port, () => {
  console.log(`Polywatch website listening on port ${port}`);
});
