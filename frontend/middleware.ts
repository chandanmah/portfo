import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  // Only protect admin routes
  if (request.nextUrl.pathname.startsWith('/admin_CM')) {
    const isAuthenticated = request.cookies.get('admin-auth')?.value === 'true';
    
    if (!isAuthenticated) {
      // Redirect to login page
      return NextResponse.redirect(new URL('/admin-login', request.url));
    }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: '/admin_CM/:path*'
};