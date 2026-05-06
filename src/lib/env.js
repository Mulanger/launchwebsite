function readViteEnv() {
  try {
    return import.meta.env || {};
  } catch {
    return {};
  }
}

function readInjectedEnv() {
  if (typeof window === 'undefined') return {};
  return window.__POLYWHALE_PUBLIC_ENV__ || {};
}

function readNodeEnv() {
  if (typeof process === 'undefined') return {};
  return process.env || {};
}

function hasEnvValue(value) {
  return value !== undefined && value !== null && value !== '';
}

export function readPublicEnv(key, fallback = '') {
  const injectedEnv = readInjectedEnv();
  if (hasEnvValue(injectedEnv[key])) return injectedEnv[key];

  const viteEnv = readViteEnv();
  if (hasEnvValue(viteEnv[key])) return viteEnv[key];

  const nodeEnv = readNodeEnv();
  const nextKey = key.startsWith('VITE_') ? `NEXT_PUBLIC_${key.slice(5)}` : key;
  if (hasEnvValue(injectedEnv[nextKey])) return injectedEnv[nextKey];
  if (hasEnvValue(viteEnv[nextKey])) return viteEnv[nextKey];
  if (hasEnvValue(nodeEnv[nextKey])) return nodeEnv[nextKey];
  if (hasEnvValue(nodeEnv[key])) return nodeEnv[key];
  return fallback;
}
