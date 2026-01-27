const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "https://skizagroundsuite.com/API";

export async function postJson<T>(path: string, body: unknown, token?: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=UTF-8",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) {
    const message = data?.message || `${res.status} ${res.statusText}`;
    const err = new Error(message) as Error & { code?: number };
    err.code = res.status;
    throw err;
  }
  return data as T;
}
