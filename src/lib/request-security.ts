import type { NextRequest } from 'next/server';

// ----------------------------------------------------------------------

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const EXTERNAL_MUTATION_PREFIXES = ['/api/internal/', '/api/line/webhook/'];

export function isCrossSiteMutation(request: NextRequest): boolean {
  if (SAFE_METHODS.has(request.method.toUpperCase())) return false;
  if (!request.nextUrl.pathname.startsWith('/api/')) return false;
  if (EXTERNAL_MUTATION_PREFIXES.some((prefix) => request.nextUrl.pathname.startsWith(prefix))) {
    return false;
  }

  const fetchSite = request.headers.get('sec-fetch-site');
  if (fetchSite === 'cross-site') return true;

  const origin = request.headers.get('origin');
  if (!origin) return false;

  try {
    return new URL(origin).origin !== request.nextUrl.origin;
  } catch {
    return true;
  }
}
