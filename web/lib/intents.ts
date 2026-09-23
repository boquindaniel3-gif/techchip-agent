import { N_MAX, N_MIN, parsearModeloJson } from "@/lib/modelos";
import type { Metodo } from "@/lib/types";

export type Intent =
  | { type: "json"; A: number[][]; B: number[]; variables?: string[]; recursos?: string[] }
  | { type: "resolver"; method: Metodo }
  | { type: "modelo-base" }
  | { type: "modelo-8x8" }
  | { type: "escasez" }
  | { type: "degenerado" }
  | { type: "estres" }
  | { type: "historial" }
  | { type: "redimensionar"; n: number }
  | { type: "ayuda" }
  | { type: "desconocido" };

function normalizar(texto: string): string {
  return texto
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function extraerJson(texto: string): string | null {
  const cerca = texto.trim();
  const cercaFenced = cerca.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidato = cercaFenced ? cercaFenced[1].trim() : cerca;
  if (candidato.startsWith("{") && candidato.endsWith("}")) return candidato;
  const inicio = candidato.indexOf("{");
  const fin = candidato.lastIndexOf("}");
  if (inicio >= 0 && fin > inicio) return candidato.slice(inicio, fin + 1);
  return null;
}

export function interpretarMensaje(texto: string): Intent {
  const jsonCrudo = extraerJson(texto);
  if (jsonCrudo) {
    let datos: unknown = null;
    try {
      datos = JSON.parse(jsonCrudo);
    } catch {
      datos = null;
    }
    if (datos && typeof datos === "object") {
      const obj = datos as Record<string, unknown>;
      if ((obj.A ?? obj.a) != null && (obj.B ?? obj.b) != null) {
        const modelo = parsearModeloJson(datos);
        return {
          type: "json",
          A: modelo.A,
          B: modelo.B,
          variables: modelo.variables,
          recursos: modelo.recursos,
        };
      }
    }
  }

  const t = normalizar(texto);
  if (!t) return { type: "desconocido" };

  if (/(ayuda|help|\?)/.test(t) && t.length < 24) return { type: "ayuda" };
  if (/(modelo base|prueba base|6\s*[x×]\s*6|restaurar)/.test(t)) return { type: "modelo-base" };
  if (
    /(planta 8|8\s*[x×]\s*8|8\s*por\s*8|ocho por ocho|extendid|drone|satelit)/.test(t)
  ) {
    return { type: "modelo-8x8" };
  }
  if (/(escasez|resina|b3|b_3)/.test(t)) return { type: "escasez" };
  if (/(degenerad|singular|fila 6)/.test(t)) return { type: "degenerado" };
  if (/(estres|estrés|stress|suite)/.test(t)) return { type: "estres" };
  if (/historial/.test(t)) return { type: "historial" };

  const orden = t.match(/(?:orden|sistema|n\s*=?)\s*(\d{1,2})/);
  if (orden) {
    const n = Number(orden[1]);
    if (n >= N_MIN && n <= N_MAX) return { type: "redimensionar", n };
  }

  if (/gauss[\s-]*jordan|jordan/.test(t)) return { type: "resolver", method: "gauss-jordan" };
  if (/inversa/.test(t)) return { type: "resolver", method: "inversa" };
  if (/\bgauss\b/.test(t)) return { type: "resolver", method: "gauss" };
  if (/(resuelve|resolver|calcula|calcular|todos)/.test(t)) {
    return { type: "resolver", method: "all" };
  }

  return { type: "desconocido" };
}

export const TEXTO_AYUDA =
  "Soy Resolx Agent. Pega un JSON {\"A\":[[...]],\"B\":[...],\"variables\":[...]} (n×n, 2–12; los nombres de módulo son libres), o escribe: modelo base, planta 8×8, resuelve, gauss / gauss-jordan / inversa, escasez, degenerado, estrés, historial, orden 8. Detecto si el sistema es imposible, tiene solución única o admite varias combinaciones.";
