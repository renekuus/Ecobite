import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// ─── Auth middleware ──────────────────────────────────────────────────────────
//
// Protects all routes except /login and Next.js internals.
// Reads the `eb_at` cookie (non-httpOnly) set by src/lib/auth.ts.
// If absent, redirects to /login preserving the attempted URL as ?next=...

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Pass through Next.js internals, static files, and the login page itself
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname === '/login'
  ) {
    return NextResponse.next();
  }

  const at = request.cookies.get('eb_at')?.value;

  if (!at) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Run on all routes except static assets
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
