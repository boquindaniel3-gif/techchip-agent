"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClientOrNull } from "@/lib/supabase/client";
import { apiFetch } from "@/lib/api";
import { interpretarMensaje, TEXTO_AYUDA } from "@/lib/intents";
import {
  alinearNombres,
  modelo8x8,
  modeloBase,
  parsearModeloJson,
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
  text: TEXTO_AYUDA,
};

function previewB(B: number[]): string {
  const muestra = B.slice(0, 4).map((v) => v.toFixed(2)).join(", ");
  return `B=[${muestra}${B.length > 4 ? ", …" : ""}]`;
}

function redactarRespuesta(data: ResolverResult, metodo: Metodo, n: number, B?: number[]): string {
  const sistema = B ? ` Sistema enviado: n=${n}, ${previewB(B)}.` : "";
  const clasificacion = data.diagnostico?.clasificacion;
  const escasez =
    data.semantica?.factible === false && (data.semantica.negativos?.length ?? 0) > 0;
  if (clasificacion === "incompatible" || clasificacion === "indeterminado") {
    return data.diagnostico?.mensaje ?? data.semantica?.mensaje ?? "det(A) = 0: infinitas o cero soluciones";
  }
  if (escasez || !data.x) {
    return (
      data.semantica?.mensaje ??
      data.diagnostico?.mensaje ??
      "Sistema singular o abortado."
    );
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
    `Listo (${elegido ?? metodo}, n=${n}). ` +
    `X = [${data.x.map((v) => v.toFixed(6)).join(", ")}]` +
    residuoTxt +
    relTxt +
    aviso +
    sistema
  );
}

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
  const [seleccionId, setSeleccionId] = useState<string | null>(null);
  const [estres, setEstres] = useState<EstresResult | null>(null);
  const [mensajes, setMensajes] = useState<ChatMessage[]>([SALUDO]);

  const n = A.length;

  const cargarMatrices = useCallback(
    (modelo: { A: number[][]; B: number[]; variables: string[]; recursos: string[] }) => {
      setA(modelo.A);
      setB(modelo.B);
      setVariables(modelo.variables);
      setRecursos(modelo.recursos);
      setError(null);
    },
    []
  );

  const aplicarModelo = useCallback(
    (modelo: { A: number[][]; B: number[]; variables: string[]; recursos: string[] }) => {
      cargarMatrices(modelo);
      setResultado(null);
    },
    [cargarMatrices]
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
        if (data.id) setSeleccionId(data.id);
        return redactarRespuesta(data, metodo, matrizA.length, vectorB);
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

  const resolverJson = useCallback(
    async (texto: string, etiqueta = "Resolver JSON") => {
      setMensajes((prev) => [...prev, { id: nuevoId(), role: "user", text: etiqueta }]);
      try {
        const cerca = texto.trim();
        const fenced = cerca.match(/```(?:json)?\s*([\s\S]*?)```/i);
        const cuerpo = (fenced ? fenced[1] : cerca).trim();
        const inicio = cuerpo.indexOf("{");
        const fin = cuerpo.lastIndexOf("}");
        const json =
          inicio >= 0 && fin > inicio ? cuerpo.slice(inicio, fin + 1) : cuerpo;
        const modelo = parsearModeloJson(JSON.parse(json));
        cargarMatrices(modelo);
        const respuesta = await resolver(
          "all",
          modelo.A,
          modelo.B,
          modelo.variables,
          modelo.recursos
        );
        setMensajes((prev) => [...prev, { id: nuevoId(), role: "assistant", text: respuesta }]);
      } catch (err) {
        const mensaje = err instanceof Error ? err.message : "JSON inválido.";
        setMensajes((prev) => [...prev, { id: nuevoId(), role: "assistant", text: mensaje }]);
      }
    },
    [cargarMatrices, resolver]
  );

  const resolverMatriz = useCallback(
    async (etiqueta = "Resolver matriz") => {
      setMensajes((prev) => [...prev, { id: nuevoId(), role: "user", text: etiqueta }]);
      try {
        const respuesta = await resolver("all", A, B, variables, recursos);
        setMensajes((prev) => [...prev, { id: nuevoId(), role: "assistant", text: respuesta }]);
      } catch (err) {
        const mensaje = err instanceof Error ? err.message : "No se pudo resolver la matriz.";
        setMensajes((prev) => [...prev, { id: nuevoId(), role: "assistant", text: mensaje }]);
      }
    },
    [A, B, variables, recursos, resolver]
  );

  const seleccionar = useCallback((fila: ResolucionRow) => {
    setSeleccionId(fila.id);
    setResultado({
      id: fila.id,
      diagnostico: fila.diagnostico ?? {},
      abortado: fila.abortado,
      x: fila.x,
      A: fila.a ?? undefined,
      B: fila.b ?? undefined,
      soluciones: fila.soluciones ?? {},
      residuos: fila.residuos ?? {},
      semantica: fila.semantica ?? undefined,
      traza: fila.traza ?? [],
      metodo: fila.metodo,
    });
    if (fila.a && fila.b) {
      const orden = fila.a.length;
      setA(fila.a);
      setB(fila.b);
      setVariables(alinearNombres(undefined, orden, "x{i}"));
      setRecursos(alinearNombres(undefined, orden, "Recurso {i}"));
    }
    setError(null);
  }, []);

  const nuevaConversacion = useCallback(() => {
    setMensajes([SALUDO]);
    setResultado(null);
    setSeleccionId(null);
    setError(null);
  }, []);

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
      return `Orden n = ${siguiente}. Completé o recorté la matriz. Resuélvela desde la pestaña Matriz.`;
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
            cargarMatrices({
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
            respuesta =
              "Elige la pestaña JSON o Matriz y pulsa resolver. «Resuelve» usa solo la pestaña abierta, no la otra entrada.";
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
            respuesta = "Historial recargado a la izquierda.";
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
      cargarMatrices,
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
    seleccionId,
    estres,
    mensajes,
    setA,
    setB,
    setVariables,
    setRecursos,
    setMethod,
    aplicarModelo,
    cambiarOrden,
    resolver,
    resolverJson,
    resolverMatriz,
    seleccionar,
    nuevaConversacion,
    ejecutarEstres,
    enviarChat,
  };
}
