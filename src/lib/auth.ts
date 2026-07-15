import { cookies } from 'next/headers';

/* ============================================================================
   Admin session helpers.

   The session token was previously hardcoded ('ajmera_admin_authenticated_session')
   in ~8 files. It now lives in one place and is sourced from the environment
   (ADMIN_SESSION_TOKEN) so it can be rotated without a code change. The literal
   default is kept only as a dev fallback so existing sessions keep working.
   ========================================================================= */

export const ADMIN_SESSION_COOKIE = 'admin_session';

export const ADMIN_SESSION_TOKEN =
  process.env.ADMIN_SESSION_TOKEN || 'ajmera_admin_authenticated_session';

/** True when the current request carries a valid admin session cookie. */
export async function isAdminAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const session = cookieStore.get(ADMIN_SESSION_COOKIE);
  return Boolean(session && session.value === ADMIN_SESSION_TOKEN);
}
