export interface SupabaseSession {
  url: string;
  anonKey: string;
  accessToken: string;
}

export async function getSupabaseSession(): Promise<SupabaseSession | null> {
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
    });

    if (!authRes.ok) return null;

    const { access_token } = await authRes.json();
    if (!access_token) return null;

    return { url, anonKey, accessToken: access_token as string };
  } catch {
    return null;
  }
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

  if (!res.ok) return [];
  const rows = await res.json();
  return rows.map((row: { data: T }) => row.data);
}

export async function supabaseInsertUserData(dataType: string, data: unknown): Promise<boolean> {
  const session = await getSupabaseSession();
  if (!session) return false;

  const res = await fetch(`${session.url}/rest/v1/user_data`, {
    method: "POST",
    headers: {
      apikey: session.anonKey,
      Authorization: `Bearer ${session.accessToken}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({ data_type: dataType, data }),
  });

  return res.ok;
}
