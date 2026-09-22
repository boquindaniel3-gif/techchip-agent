"use client";

import type { ResolverResult } from "@/lib/types";

function partirTraza(traza: string[]): { intro: string[]; abajo: string[]; arriba: string[] } {
  const intro: string[] = [];
  const abajo: string[] = [];
  const arriba: string[] = [];
  let fase: "intro" | "abajo" | "arriba" = "intro";
  for (const linea of traza) {
    if (/Hacia abajo/i.test(linea)) fase = "abajo";
    else if (/Hacia arriba/i.test(linea)) fase = "arriba";
    if (fase === "abajo") abajo.push(linea);
    else if (fase === "arriba") arriba.push(linea);
    else intro.push(linea);
  }
  return { intro, abajo, arriba };
}

export function ResultView({ resultado }: { resultado: ResolverResult }) {
  const diag = resultado.diagnostico ?? {};
  const semantica = resultado.semantica;
  const familia = diag.familia;
  const clasificacion = diag.clasificacion ?? (resultado.abortado ? "singular" : undefined);
  const incompatible = clasificacion === "incompatible";
  const indeterminado = clasificacion === "indeterminado";
  const alerta =
    resultado.abortado ||
    semantica?.factible === false ||
    diag.numericamente_inestable === true ||
    incompatible;
  const escasez = semantica?.factible === false && (semantica?.negativos?.length ?? 0) > 0;
  const balance = escasez ? [] : (semantica?.balance_recursos ?? []);
  const cuellos = semantica?.cuellos_botella ?? [];
  const lineasFamilia = familia?.lineas?.length ? familia.lineas : semantica?.lineas_plan ?? [];

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-line bg-card p-4">
        <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
          Diagnóstico
        </h2>
        <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted">n</dt>
            <dd className="font-mono">{diag.n ?? resultado.A?.length ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-muted">det(A)</dt>
            <dd className="font-mono">{diag.determinante?.toPrecision(8) ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-muted">Clasificación</dt>
            <dd>
              {incompatible
                ? "incompatible (no es posible)"
                : indeterminado
                  ? "indeterminado (varias combinaciones)"
                  : (clasificacion ?? "—")}
            </dd>
          </div>
          <div>
            <dt className="text-muted">rank(A) / rank([A|B])</dt>
            <dd className="font-mono">
              {diag.rango_A ?? "—"} / {diag.rango_aumentada ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="text-muted">Método elegido</dt>
            <dd className="font-mono">
              {diag.metodo_elegido ?? resultado.metodo_elegido ?? resultado.metodo}
            </dd>
          </div>
          <div>
            <dt className="text-muted">Residual relativo</dt>
            <dd className="font-mono">
              {diag.residual_relativo != null ? diag.residual_relativo.toExponential(3) : "—"}
            </dd>
          </div>
        </dl>
        <p className={`mt-3 text-sm ${alerta ? "text-danger" : "text-muted"}`}>
          {semantica?.mensaje ?? diag.mensaje ?? "Sin diagnóstico."}
        </p>
      </div>

      {incompatible ? (
        <div className="rounded-2xl border border-danger/40 bg-card p-4">
          <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-danger">
            No es posible
          </h2>
          <p className="mt-2 text-sm text-muted">
            rank(A) &lt; rank([A|B]): las ecuaciones se contradicen. No hay ningún vector X que
            cumpla AX = B.
          </p>
          {familia?.contradicciones?.length ? (
            <ul className="mt-3 space-y-1 font-mono text-xs text-muted">
              {familia.contradicciones.map((fila) => (
                <li key={fila.fila_rref}>
                  RREF fila {fila.fila_rref}: residuo {fila.residuo.toExponential(3)}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {indeterminado ? (
        <div className="rounded-2xl border border-line bg-card p-4">
          <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
            Varias combinaciones posibles
          </h2>
          <p className="mt-2 text-sm text-muted">
            {familia?.grados_libertad ?? "—"} grado(s) de libertad
            {familia?.libres_nombres?.length
              ? ` · variables libres: ${familia.libres_nombres.join(", ")}`
              : ""}
            {familia?.parametros?.length ? ` (${familia.parametros.join(", ")} ∈ ℝ)` : ""}.
          </p>
          {lineasFamilia.length ? (
            <pre className="mt-3 overflow-x-auto whitespace-pre-wrap font-mono text-xs text-muted">
              {lineasFamilia.join("\n")}
            </pre>
          ) : null}
          {familia?.x_particular ? (
            <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {familia.x_particular.map((xi, i) => (
                <div key={`xp-${i}`} className="rounded-xl border border-line px-3 py-2">
                  <div className="text-xs text-muted">
                    x{i + 1} {resultado.variables?.[i] ?? ""} (particular, libres = 0)
                  </div>
                  <div className="font-mono text-lg">{xi.toFixed(6)}</div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {resultado.x && !escasez ? (
        <div className="rounded-2xl border border-line bg-card p-4">
          <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
            Vector X
          </h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {resultado.x.map((xi, i) => (
              <div key={i} className="rounded-xl border border-line px-3 py-2">
                <div className="text-xs text-muted">
                  x{i + 1} {resultado.variables?.[i] ?? ""}
                </div>
                <div className="font-mono text-lg">{xi.toFixed(6)}</div>
              </div>
            ))}
          </div>
          <div className="mt-3 space-y-1 text-xs text-muted">
            {Object.entries(resultado.residuos ?? {}).map(([metodo, r]) => (
              <p key={metodo}>
                {metodo}: ||AX − B||₂ = {r.norma_euclidea.toExponential(3)}
              </p>
            ))}
          </div>
        </div>
      ) : null}

      {balance.length ? (
        <div className="rounded-2xl border border-line bg-card p-4">
          <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
            Consumo vs capacidad
          </h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-muted">
                <tr>
                  <th className="py-1 font-medium">Recurso</th>
                  <th className="py-1 font-medium">Consumo AX</th>
                  <th className="py-1 font-medium">B</th>
                  <th className="py-1 font-medium">Holgura</th>
                </tr>
              </thead>
              <tbody>
                {balance.map((fila) => (
                  <tr key={fila.indice} className="border-t border-line">
                    <td className="py-1.5 pr-2">{fila.nombre}</td>
                    <td className="py-1.5 font-mono">{fila.consumo.toFixed(4)}</td>
                    <td className="py-1.5 font-mono">{fila.capacidad.toFixed(4)}</td>
                    <td className="py-1.5 font-mono">{fila.holgura.toExponential(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {cuellos[0] ? (
            <p className="mt-3 text-sm text-muted">
              Cuello de botella: {cuellos[0].nombre} (peso {cuellos[0].peso.toFixed(2)}).
            </p>
          ) : null}
        </div>
      ) : null}

      {semantica?.lineas_plan?.length && !indeterminado && !incompatible && !escasez ? (
        <div className="rounded-2xl border border-line bg-card p-4">
          <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
            Interpretación operativa
          </h2>
          <pre className="mt-3 overflow-x-auto whitespace-pre-wrap font-mono text-xs text-muted">
            {semantica.lineas_plan.join("\n")}
          </pre>
        </div>
      ) : null}

      {resultado.traza?.length ? <TrazaDirigida traza={resultado.traza} /> : null}
    </section>
  );
}

function BloqueTraza({ titulo, lineas }: { titulo: string; lineas: string[] }) {
  if (!lineas.length) return null;
  return (
    <div>
      <h3 className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted">{titulo}</h3>
      <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap font-mono text-[11px] leading-5 text-muted">
        {lineas.join("\n")}
      </pre>
    </div>
  );
}

function TrazaDirigida({ traza }: { traza: string[] }) {
  const partes = partirTraza(traza);
  const partida = partes.abajo.length > 0 || partes.arriba.length > 0;
  return (
    <div className="rounded-2xl border border-line bg-card p-4">
      <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
        Traza analítica de filas
      </h2>
      {partida ? (
        <div className="mt-3 space-y-4">
          <BloqueTraza titulo="Inicio" lineas={partes.intro} />
          <BloqueTraza titulo="Hacia abajo" lineas={partes.abajo} />
          <BloqueTraza titulo="Hacia arriba" lineas={partes.arriba} />
        </div>
      ) : (
        <pre className="mt-3 max-h-[28rem] overflow-auto whitespace-pre-wrap font-mono text-[11px] leading-5 text-muted">
          {traza.join("\n")}
        </pre>
      )}
    </div>
  );
}
