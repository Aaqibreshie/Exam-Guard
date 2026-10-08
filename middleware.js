import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

export async function middleware(request) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const { pathname } = request.nextUrl;

  // Redirect unauthenticated users away from dashboard
  if (!user && pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Redirect authenticated users away from login page
  if (user && pathname === '/login') {
    const role = user.user_metadata?.role;
    const isInstructor = role === 'teacher' || role === 'admin';
    const target = isInstructor ? '/dashboard/teacher' : '/dashboard/student';
    return NextResponse.redirect(new URL(target, request.url));
  }

  if (user && pathname.startsWith('/dashboard')) {
    const role = user.user_metadata?.role;
    const isInstructor = role === 'teacher' || role === 'admin';

    // Redirect /dashboard to appropriate sub-route
    if (pathname === '/dashboard' || pathname === '/dashboard/') {
      const target = isInstructor ? '/dashboard/teacher' : '/dashboard/student';
      return NextResponse.redirect(new URL(target, request.url));
    }

    // Prevent cross-role access
    if (pathname.startsWith('/dashboard/teacher') && !isInstructor) {
      return NextResponse.redirect(new URL('/dashboard/student', request.url));
    }
    if (pathname.startsWith('/dashboard/student') && isInstructor) {
      return NextResponse.redirect(new URL('/dashboard/teacher', request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
