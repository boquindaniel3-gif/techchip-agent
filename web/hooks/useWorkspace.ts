"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClientOrNull } from "@/lib/supabase/client";
import { apiFetch } from "@/lib/api";
import { interpretarMensaje, TEXTO_AYUDA } from "@/lib/intents";
import {
  alinearNombres,
  modelo8x8,
  modeloBase,
  redimensionarSistema,
} from "@/lib/modelos";
import type {
  ChatMessage,
  EstresResult,
  Metodo,
  ResolucionRow,
  ResolverResult,
} from "@/lib/types";

function nuevoId(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function tokenSesion(): Promise<string | undefined> {
  const supabase = createClientOrNull();
  if (!supabase) return undefined;
  return (await supabase.auth.getSession()).data.session?.access_token;
}

const SALUDO: ChatMessage = {
  id: "saludo",
  role: "assistant",
  text: `Soy el agente de balance de planta. ${TEXTO_AYUDA}`,
};

export function useWorkspace() {
  const inicial = useMemo(() => modeloBase(), []);
  const [A, setA] = useState(inicial.A);
  const [B, setB] = useState(inicial.B);
  const [variables, setVariables] = useState(inicial.variables);
  const [recursos, setRecursos] = useState(inicial.recursos);
  const [method, setMethod] = useState<Metodo>("all");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<ResolverResult | null>(null);
  const [historial, setHistorial] = useState<ResolucionRow[]>([]);
  const [estres, setEstres] = useState<EstresResult | null>(null);
  const [mensajes, setMensajes] = useState<ChatMessage[]>([SALUDO]);

  const n = A.length;

  const aplicarModelo = useCallback(
    (modelo: { A: number[][]; B: number[]; variables: string[]; recursos: string[] }) => {
      setA(modelo.A);
      setB(modelo.B);
      setVariables(modelo.variables);
      setRecursos(modelo.recursos);
      setResultado(null);
      setError(null);
    },
    []
  );

  const cargarHistorial = useCallback(async () => {
    try {
      const data = await apiFetch<ResolucionRow[]>("/api/historial", await tokenSesion());
      setHistorial(data);
    } catch {
      /* el panel de historial queda vacío si la API no responde */
    }
  }, []);

  useEffect(() => {
    void cargarHistorial();
  }, [cargarHistorial]);

  const resolver = useCallback(
    async (
      metodo: Metodo = method,
      matrizA = A,
      vectorB = B,
      vars = variables,
      recs = recursos
    ) => {
      setPending(true);
      setError(null);
      try {
        const data = await apiFetch<ResolverResult>("/api/resolver", await tokenSesion(), {
          method: "POST",
          body: JSON.stringify({
            A: matrizA,
            B: vectorB,
            method: metodo,
            variables: vars,
            recursos: recs,
            persistir: true,
          }),
        });
        setResultado(data);
        setMethod(metodo);
        await cargarHistorial();
        if (!data.x) {
          return data.semantica?.mensaje ?? "Sistema singular o abortado.";
        }
        const elegido = data.diagnostico?.metodo_elegido;
        const residuoElegido = elegido ? data.residuos?.[elegido]?.norma_euclidea : undefined;
        const residuo =
          typeof residuoElegido === "number"
            ? residuoElegido
            : Object.values(data.residuos ?? {})[0]?.norma_euclidea;
        const rel = data.diagnostico?.residual_relativo;
        const aviso = data.diagnostico?.numericamente_inestable
          ? " Advertencia: residual relativo alto."
          : "";
        const residuoTxt =
          typeof residuo === "number" ? `  ||AX−B||₂ = ${residuo.toExponential(3)}` : "";
        const relTxt = typeof rel === "number" ? `  rel = ${rel.toExponential(3)}` : "";
        return (
          `Listo (${elegido ?? metodo}, n=${matrizA.length}). ` +
          `X = [${data.x.map((v) => v.toFixed(6)).join(", ")}]` +
          residuoTxt +
          relTxt +
          aviso
        );
      } catch (err) {
        const mensaje = err instanceof Error ? err.message : "No se pudo resolver.";
        setError(mensaje);
        throw err;
      } finally {
        setPending(false);
      }
    },
    [A, B, method, variables, recursos, cargarHistorial]
  );

  const ejecutarEstres = useCallback(async () => {
    setPending(true);
    setError(null);
    try {
      const data = await apiFetch<EstresResult>("/api/estres", await tokenSesion(), {
        method: "POST",
        body: JSON.stringify({ persistir: true }),
      });
      setEstres(data);
      await cargarHistorial();
      return `Suite de estrés: ${data.aprobadas}/${data.total} pruebas satisfactorias.`;
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : "No se pudo ejecutar la suite.";
      setError(mensaje);
      throw err;
    } finally {
      setPending(false);
    }
  }, [cargarHistorial]);

  const cambiarOrden = useCallback(
    (siguiente: number) => {
      const modelo = redimensionarSistema(A, B, variables, recursos, siguiente);
      aplicarModelo(modelo);
      return `Orden n = ${siguiente}. Completé o recorté A y B. Revisa el dashboard y resuelve.`;
    },
    [A, B, variables, recursos, aplicarModelo]
  );

  const enviarChat = useCallback(
    async (texto: string) => {
      const limpio = texto.trim();
      if (!limpio) return;
      setMensajes((prev) => [...prev, { id: nuevoId(), role: "user", text: limpio }]);
      const intent = interpretarMensaje(limpio);
      let respuesta: string;
      try {
        switch (intent.type) {
          case "ayuda":
            respuesta = TEXTO_AYUDA;
            break;
          case "desconocido":
            respuesta = `No reconocí esa orden. ${TEXTO_AYUDA}`;
            break;
          case "modelo-base": {
            const m = modeloBase();
            aplicarModelo(m);
            respuesta = await resolver("all", m.A, m.B, m.variables, m.recursos);
            break;
          }
          case "modelo-8x8": {
            const m = modelo8x8();
            aplicarModelo(m);
            respuesta = await resolver("all", m.A, m.B, m.variables, m.recursos);
            break;
          }
          case "json": {
            aplicarModelo({
              A: intent.A,
              B: intent.B,
              variables: intent.variables ?? alinearNombres(undefined, intent.A.length, "x{i}"),
              recursos: intent.recursos ?? alinearNombres(undefined, intent.A.length, "Recurso {i}"),
            });
            respuesta = await resolver(
              "all",
              intent.A,
              intent.B,
              intent.variables,
              intent.recursos
            );
            break;
          }
          case "resolver":
            respuesta = await resolver(intent.method);
            break;
          case "escasez": {
            if (B.length < 3) throw new Error("Hace falta n ≥ 3 para el escenario de escasez (B₃).");
            const siguiente = B.slice();
            siguiente[2] = 100;
            setB(siguiente);
            respuesta = await resolver(method, A, siguiente, variables, recursos);
            break;
          }
          case "degenerado": {
            const siguiente = A.map((fila) => fila.slice());
            const fila = A.length >= 6 ? 5 : A.length - 1;
            siguiente[fila] = A[0].map((c) => 2 * c);
            setA(siguiente);
            respuesta = await resolver(method, siguiente, B, variables, recursos);
            break;
          }
          case "estres":
            respuesta = await ejecutarEstres();
            break;
          case "historial":
            await cargarHistorial();
            respuesta = "Historial recargado en el dashboard.";
            break;
          case "redimensionar":
            respuesta = cambiarOrden(intent.n);
            break;
          default:
            respuesta = TEXTO_AYUDA;
        }
      } catch (err) {
        respuesta = err instanceof Error ? err.message : "No pude completar esa orden.";
      }
      setMensajes((prev) => [...prev, { id: nuevoId(), role: "assistant", text: respuesta }]);
    },
    [
      A,
      B,
      method,
      variables,
      recursos,
      aplicarModelo,
      resolver,
      ejecutarEstres,
      cargarHistorial,
      cambiarOrden,
    ]
  );

  return {
    n,
    A,
    B,
    variables,
    recursos,
    method,
    pending,
    error,
    resultado,
    historial,
    estres,
    mensajes,
    setA,
    setB,
    setMethod,
    aplicarModelo,
    cambiarOrden,
    resolver,
    ejecutarEstres,
    enviarChat,
  };
}
