/** Normalize once before a path is used in any redirect. No caller-controlled origin. */
export function safeInternalPath(value: unknown, allowSsoContinue = false): string | null {
  if (
    typeof value !== 'string' ||
    value.length > 1024 ||
    !value.startsWith('/') ||
    value.startsWith('//') ||
    value.includes('\\') ||
    [...value].some((char) => char.charCodeAt(0) <= 32 || char.charCodeAt(0) === 127)
  )
    return null;
  try {
    const base = 'https://e-kru.com';
    const url = new URL(value, base);
    let decoded = url.pathname;
    for (let i = 0; i < 4; i += 1) {
      const next = decodeURIComponent(decoded);
      if (next === decoded) break;
      decoded = next;
    }
    if (
      url.origin !== base ||
      decoded.startsWith('//') ||
      decoded.includes('\\') ||
      [...decoded].some((char) => char.charCodeAt(0) <= 32 || char.charCodeAt(0) === 127) ||
      decoded.includes('%')
    )
      return null;
    if (/^\/api(?:\/|$)/.test(decoded) || /^\/auth(?:\/|$)/.test(decoded)) {
      if (!allowSsoContinue || decoded.replace(/\/$/, '') !== '/auth/marketplace/continue')
        return null;
    }
    const result = `${url.pathname}${url.search}${url.hash}`;
    return new URL(result, base).origin === base ? result : null;
  } catch {
    return null;
  }
}
