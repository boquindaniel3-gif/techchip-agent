const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export async function apiFetch<T>(
  path: string,
  token: string | undefined,
  init: RequestInit = {}
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  const respuesta = await fetch(`${API_URL}${path}`, { ...init, headers });
  const texto = await respuesta.text();
  let cuerpo: unknown = null;
  try {
    cuerpo = texto ? JSON.parse(texto) : null;
  } catch {
    cuerpo = { detail: texto };
  }
  if (!respuesta.ok) {
    const detail =
      typeof cuerpo === "object" && cuerpo && "detail" in cuerpo
        ? String((cuerpo as { detail: unknown }).detail)
        : texto || `Error HTTP ${respuesta.status}`;
    throw new Error(detail);
  }
  return cuerpo as T;
}
