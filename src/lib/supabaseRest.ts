export interface SupabaseSession {
  url: string;
  anonKey: string;
  accessToken: string;
}

// Cache the Supabase session to avoid re-authenticating on every API poll.
// Supabase JWT tokens are valid for 1 hour; we cache for 50 minutes.
let cachedSession: SupabaseSession | null = null;
let cachedAt = 0;
const CACHE_TTL_MS = 50 * 60 * 1000; // 50 minutes

export async function getSupabaseSession(): Promise<SupabaseSession | null> {
  if (cachedSession && Date.now() - cachedAt < CACHE_TTL_MS) {
    return cachedSession;
  }

  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  const email = process.env.SUPABASE_EMAIL;
  const password = process.env.SUPABASE_PASSWORD;

  if (!url || !anonKey || !email || !password) return null;

  try {
    const authRes = await fetch(`${url}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { apikey: anonKey, "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      cache: "no-store",
    });

    if (!authRes.ok) return null;

    const { access_token } = await authRes.json();
    if (!access_token) return null;

    cachedSession = { url, anonKey, accessToken: access_token as string };
    cachedAt = Date.now();
    return cachedSession;
  } catch {
    return null;
  }
}

export function clearSupabaseSessionCache() {
  cachedSession = null;
  cachedAt = 0;
}

export async function supabaseGetUserDataByType<T>(dataType: string): Promise<T[]> {
  const session = await getSupabaseSession();
  if (!session) return [];

  const res = await fetch(`${session.url}/rest/v1/user_data?data_type=eq.${encodeURIComponent(dataType)}&select=data`, {
    headers: {
      apikey: session.anonKey,
      Authorization: `Bearer ${session.accessToken}`,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    // Token may have expired; clear cache and retry once
    if (res.status === 401) {
      clearSupabaseSessionCache();
      const retrySession = await getSupabaseSession();
      if (!retrySession) return [];
      const retryRes = await fetch(`${retrySession.url}/rest/v1/user_data?data_type=eq.${encodeURIComponent(dataType)}&select=data`, {
        headers: {
          apikey: retrySession.anonKey,
          Authorization: `Bearer ${retrySession.accessToken}`,
        },
        cache: "no-store",
      });
      if (!retryRes.ok) return [];
      const rows = await retryRes.json();
      return rows.map((row: { data: T }) => row.data);
    }
    return [];
  }
  const rows = await res.json();
  return rows.map((row: { data: T }) => row.data);
}

export async function supabaseGetFirstData<T>(dataType: string): Promise<T | null> {
  const results = await supabaseGetUserDataByType<T>(dataType);
  return results.length > 0 ? results[0] : null;
}

export async function supabaseInsertUserData(dataType: string, data: unknown): Promise<boolean> {
  const session = await getSupabaseSession();
  if (!session) return false;

  // Get user_id from auth
  const userRes = await fetch(`${session.url}/auth/v1/user`, {
    headers: { apikey: session.anonKey, Authorization: `Bearer ${session.accessToken}` },
    cache: "no-store",
  });
  const user = userRes.ok ? await userRes.json() : null;
  const userId = user?.id;

  // Upsert: try patch first, insert if no row exists
  const patchRes = await fetch(`${session.url}/rest/v1/user_data?data_type=eq.${encodeURIComponent(dataType)}`, {
    method: "PATCH",
    headers: {
      apikey: session.anonKey,
      Authorization: `Bearer ${session.accessToken}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({ data }),
    cache: "no-store",
  });

  // Check if patch hit any rows
  const checkRes = await fetch(`${session.url}/rest/v1/user_data?data_type=eq.${encodeURIComponent(dataType)}&select=id`, {
    headers: { apikey: session.anonKey, Authorization: `Bearer ${session.accessToken}` },
    cache: "no-store",
  });
  const existing = checkRes.ok ? await checkRes.json() : [];

  if (existing.length > 0) return patchRes.ok;

  // Insert with user_id
  const insertRes = await fetch(`${session.url}/rest/v1/user_data`, {
    method: "POST",
    headers: {
      apikey: session.anonKey,
      Authorization: `Bearer ${session.accessToken}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({ data_type: dataType, data, user_id: userId }),
    cache: "no-store",
  });

  return insertRes.ok || insertRes.status === 201;
}
