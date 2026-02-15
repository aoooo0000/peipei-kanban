const LOCAL_BASE = "https://wuyirudemac-mini.tail97b933.ts.net:3457";

let useLocal: boolean | null = null;

async function checkLocalAvailable(): Promise<boolean> {
  try {
    const res = await fetch(`${LOCAL_BASE}/api/health`, {
      signal: AbortSignal.timeout(2000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchApi(path: string, fallbackFn: () => Promise<Response>): Promise<{ response: Response; source: "local" | "fallback" }> {
  if (useLocal === null) {
    useLocal = await checkLocalAvailable();
  }

  if (useLocal) {
    try {
      const res = await fetch(`${LOCAL_BASE}${path}`, {
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) return { response: res, source: "local" };
    } catch {
      // fallback
    }
  }

  const response = await fallbackFn();
  return { response, source: "fallback" };
}

export async function fetchApiJSON<T>(path: string, fallbackPath: string): Promise<{ data: T; source: "local" | "fallback" }> {
  const { response, source } = await fetchApi(path, () => fetch(fallbackPath));
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  const data = (await response.json()) as T;
  return { data, source };
}
