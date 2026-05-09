export function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function dateOnly(value) {
  const date = value instanceof Date ? value : new Date(value || Date.now());
  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }
  return date.toISOString().slice(0, 10);
}

function priorityValue(value) {
  const number = Number(value);
  return Number.isFinite(number) ? String(number) : '';
}

export function buildUrlSet(entries) {
  const urls = entries
    .filter((entry) => entry?.url || entry?.loc)
    .map((entry) => {
      const lastmod = entry.lastmod || entry.lastModified;
      const changefreq = entry.changefreq || entry.changeFrequency;
      const priority = entry.priority == null ? '' : priorityValue(entry.priority);
      const lines = [`    <loc>${escapeXml(entry.url || entry.loc)}</loc>`];

      if (lastmod) lines.push(`    <lastmod>${dateOnly(lastmod)}</lastmod>`);
      if (changefreq) lines.push(`    <changefreq>${escapeXml(changefreq)}</changefreq>`);
      if (priority) lines.push(`    <priority>${priority}</priority>`);

      return `  <url>\n${lines.join('\n')}\n  </url>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}
