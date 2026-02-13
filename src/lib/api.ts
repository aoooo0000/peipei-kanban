export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit = {}, timeoutMs = 10000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(input, { ...init, signal: controller.signal });
    return response;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("請求逾時，請稍後重試");
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function fetchJSON<T>(url: string, timeoutMs = 10000): Promise<T> {
  const res = await fetchWithTimeout(url, {}, timeoutMs);
  if (!res.ok) {
    throw new ApiError(`API 錯誤 (${res.status})`, res.status);
  }
  return res.json() as Promise<T>;
}

export async function mutationRequest(url: string, init: RequestInit, timeoutMs = 10000) {
  const res = await fetchWithTimeout(url, init, timeoutMs);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new ApiError(text || `操作失敗 (${res.status})`, res.status);
  }
  return res;
}
