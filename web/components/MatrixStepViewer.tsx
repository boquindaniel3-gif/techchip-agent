"use client";

export type MatrixStepProps = {
  matrix: number[][];
  augmentedVector?: number[];
  operationText: string;
  highlightRowIndex?: number;
};

export type PasoTraza =
  | { tipo: "separador"; texto: string }
  | {
      tipo: "paso";
      operationText: string;
      matrix?: number[][];
      augmentedVector?: number[];
      highlightRowIndex?: number;
    };

function formatear(valor: number): string {
  return valor.toFixed(4);
}

export function MatrixStepViewer({
  matrix,
  augmentedVector,
  operationText,
  highlightRowIndex,
}: MatrixStepProps) {
  const columnas = matrix[0]?.length ?? 0;
  const total = columnas + (augmentedVector ? 1 : 0);

  return (
    <article className="overflow-hidden rounded-2xl bg-[#1d1d1f] text-[#f5f5f7]">
      <p className="border-b border-white/10 px-3 py-2 font-mono text-[11px] leading-5 text-white/80">
        {operationText}
      </p>
      {matrix.length ? (
        <div className="overflow-x-auto px-2 py-2">
          <div
            className="grid w-max min-w-full gap-y-0.5"
            style={{ gridTemplateColumns: `repeat(${Math.max(total, 1)}, minmax(4.5rem, 1fr))` }}
          >
            {matrix.map((fila, i) => {
              const activa = highlightRowIndex === i;
              const celdas = augmentedVector ? [...fila, augmentedVector[i] ?? Number.NaN] : fila;
              return celdas.map((valor, j) => {
                const barra = Boolean(augmentedVector) && j === fila.length;
                return (
                  <span
                    key={`${i}-${j}`}
                    className={`px-2 py-1 text-right font-mono text-[11px] tabular-nums ${
                      activa ? "bg-white/15" : ""
                    } ${barra ? "border-l border-white/25" : ""}`}
                  >
                    {Number.isFinite(valor) ? formatear(valor) : "—"}
                  </span>
                );
              });
            })}
          </div>
        </div>
      ) : null}
    </article>
  );
}

const FILA_MATRIZ = /^\[\s*(.*?)\s*\|\s*(.*?)\s*\]$/;

function numeros(fragmento: string): number[] {
  const partes = fragmento.trim().split(/\s+/).filter(Boolean);
  return partes.map((parte) => Number(parte));
}

function indiceFila(operacion: string): number | undefined {
  const coincidencia = operacion.match(/F_(\d+)/);
  if (!coincidencia) return undefined;
  const indice = Number(coincidencia[1]) - 1;
  return indice >= 0 ? indice : undefined;
}

function esSeparador(linea: string): boolean {
  return /^=+$/.test(linea) || /MÉTODO|METODO/.test(linea);
}

export function parsearTraza(traza: string[]): PasoTraza[] {
  const lineas = traza.flatMap((bloque) => bloque.split("\n")).map((linea) => linea.trim());
  const pasos: PasoTraza[] = [];
  let caption: string[] = [];

  function volcarTexto() {
    const texto = caption.join(" ").trim();
    caption = [];
    if (texto) pasos.push({ tipo: "paso", operationText: texto });
  }

  for (let i = 0; i < lineas.length; i += 1) {
    const linea = lineas[i];
    if (!linea) continue;
    if (esSeparador(linea)) {
      volcarTexto();
      if (!/^=+$/.test(linea)) pasos.push({ tipo: "separador", texto: linea });
      continue;
    }
    if (!FILA_MATRIZ.test(linea)) {
      caption.push(linea);
      continue;
    }

    const izquierdas: number[][] = [];
    const derechas: number[][] = [];
    while (i < lineas.length && FILA_MATRIZ.test(lineas[i])) {
      const coincidencia = lineas[i].match(FILA_MATRIZ);
      izquierdas.push(numeros(coincidencia?.[1] ?? ""));
      derechas.push(numeros(coincidencia?.[2] ?? ""));
      i += 1;
    }
    i -= 1;

    const operationText = caption.join(" ").trim() || "Matriz";
    caption = [];
    const anchoDerecha = derechas[0]?.length ?? 0;
    const columna =
      anchoDerecha === 1 && derechas.every((fila) => fila.length === 1)
        ? derechas.map((fila) => fila[0])
        : undefined;
    const matrix = columna ? izquierdas : izquierdas.map((fila, k) => [...fila, ...derechas[k]]);
    pasos.push({
      tipo: "paso",
      operationText,
      matrix,
      augmentedVector: columna,
      highlightRowIndex: indiceFila(operationText),
    });
  }

  volcarTexto();
  return pasos;
}
