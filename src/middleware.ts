import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    const role = token?.role;
    const roleHome = role === 'ADMIN' ? '/admin/venues' : role === 'ORGANISER' ? '/organiser/events' : '/history';

    // Admin routes
    if (path.startsWith('/admin')) {
      if (role !== 'ADMIN') {
        return NextResponse.redirect(new URL('/events?error=unauthorized_admin', req.url));
      }
    }

    // Organiser routes
    if (path.startsWith('/organiser') || path.startsWith('/api/organiser')) {
      if (role !== 'ORGANISER' && role !== 'ADMIN') {
        return NextResponse.redirect(new URL('/events?error=unauthorized_organiser', req.url));
      }
    }

    // Customer routes (seat booking flows, history, waitlist, offers)
    const isCustomerRoute = 
      path.startsWith('/history') || 
      path.startsWith('/checkout') || 
      path.startsWith('/offers') || 
      path.startsWith('/waitlist') ||
      (path.startsWith('/shows/') && path.includes('/seatmap'));

    if (isCustomerRoute) {
      if (role !== 'CUSTOMER') {
        return NextResponse.redirect(new URL(roleHome, req.url));
      }
    }

    // NextAuth will automatically handle redirects for protected routes
    // and append the correct ?callbackUrl= so the user is returned to the page after login.

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const path = req.nextUrl.pathname;

        // Public routes - no auth required
        if (
          path === '/' ||
          path.startsWith('/auth') ||
          path.startsWith('/events') ||
          path.startsWith('/api/events') ||
          path.startsWith('/api/shows') ||
          path === '/unauthorized'
        ) {
          return true;
        }

        // Protected routes - require authentication
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    '/admin/:path*',
    '/organiser/:path*',
    '/booking/:path*',
    '/history/:path*',
    '/waitlist/:path*',
    '/shows/:path*',
    '/api/bookings/:path*',
    '/api/waitlist/:path*',
    '/api/holds/:path*',
  ],
};