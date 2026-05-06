function readViteEnv() {
  try {
    return import.meta.env || {};
  } catch {
    return {};
  }
}

function readNodeEnv() {
  if (typeof process === 'undefined') return {};
  return process.env || {};
}

export function readPublicEnv(key, fallback = '') {
  const viteEnv = readViteEnv();
  if (viteEnv[key] !== undefined) return viteEnv[key];

  const nodeEnv = readNodeEnv();
  const nextKey = key.startsWith('VITE_') ? `NEXT_PUBLIC_${key.slice(5)}` : key;
  if (nodeEnv[nextKey] !== undefined) return nodeEnv[nextKey];
  if (nodeEnv[key] !== undefined) return nodeEnv[key];
  return fallback;
}
