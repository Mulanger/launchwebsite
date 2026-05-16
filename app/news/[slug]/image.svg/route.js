import { getAutonewsBase } from '../../../../src/lib/news-pages.js';

export const revalidate = 300;
const maxSvgBytes = 512 * 1024;

export async function GET(_request, { params }) {
  const { slug } = await params;
  const base = getAutonewsBase();

  if (base && slug) {
    const response = await fetch(`${base}/v1/news/${encodeURIComponent(slug)}/image.svg`, {
      headers: { Accept: 'image/svg+xml' },
      next: { revalidate },
    });

    if (response.ok) {
      const svg = await readTextWithLimit(response, maxSvgBytes);
      if (svg) {
        return new Response(svg, {
          headers: imageHeaders(),
        });
      }
    }
  }

  return new Response(fallbackSvg(slug), {
    headers: imageHeaders(),
  });
}

function imageHeaders() {
  return {
    'Content-Type': 'image/svg+xml; charset=utf-8',
    'Cache-Control': 'public, max-age=300, s-maxage=1800',
    'Content-Security-Policy': "sandbox; default-src 'none'; img-src data: https:; style-src 'unsafe-inline'",
    'X-Content-Type-Options': 'nosniff',
  };
}

async function readTextWithLimit(response, maxBytes) {
  const contentLength = Number(response.headers.get('content-length') || 0);
  if (Number.isFinite(contentLength) && contentLength > maxBytes) return '';
  if (!response.body) return response.text();

  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) return '';
    chunks.push(value);
  }

  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(body);
}

function fallbackSvg(slug) {
  const label = escapeXml(String(slug || 'polywhale-news').replace(/-/g, ' '));
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675" role="img" aria-label="Polywhale news image">
  <rect width="1200" height="675" fill="#07100d"/>
  <circle cx="940" cy="92" r="320" fill="#5ee7ad" opacity=".12"/>
  <text x="76" y="112" fill="#5ee7ad" font-family="Inter, Arial, sans-serif" font-size="26" font-weight="900" letter-spacing="4">POLYWHALE NEWS</text>
  <text x="76" y="260" fill="#eef8f4" font-family="Inter, Arial, sans-serif" font-size="76" font-weight="900">Polymarket whale news</text>
  <text x="80" y="330" fill="rgba(238,248,244,.68)" font-family="Inter, Arial, sans-serif" font-size="30" font-weight="760">${label}</text>
</svg>`;
}

function escapeXml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
