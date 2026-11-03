import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { cache } from 'react';

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

export const createClient = cache(async () => {
  const cookieStore = await cookies();

  const client = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing user sessions.
          }
        },
      },
    }
  );

  // Memoize getUser per-request so layout and page don't trigger duplicate HTTP calls
  const originalGetUser = client.auth.getUser.bind(client.auth);
  let userPromise = null;
  client.auth.getUser = (jwt) => {
    if (jwt) return originalGetUser(jwt);
    if (!userPromise) {
      userPromise = originalGetUser();
    }
    return userPromise;
  };

  return client;
});
