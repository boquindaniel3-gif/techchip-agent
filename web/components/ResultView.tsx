"use client";

import type { ResolverResult } from "@/lib/types";

export function ResultView({ resultado }: { resultado: ResolverResult }) {
  const diag = resultado.diagnostico ?? {};
  const semantica = resultado.semantica;
  const alerta = resultado.abortado || semantica?.factible === false;

  return (
    <section className="space-y-4">
      <div className="rounded-xl border border-line bg-card p-4">
        <h2 className="text-sm font-semibold tracking-wide text-accent">Diagnóstico</h2>
        <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted">det(A)</dt>
            <dd className="font-mono">{diag.determinante?.toPrecision(8) ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-muted">Clasificación</dt>
            <dd>{diag.clasificacion ?? (resultado.abortado ? "singular" : "—")}</dd>
          </div>
          <div>
            <dt className="text-muted">rank(A)</dt>
            <dd className="font-mono">{diag.rango_A ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-muted">rank([A|B])</dt>
            <dd className="font-mono">{diag.rango_aumentada ?? "—"}</dd>
          </div>
        </dl>
        <p className={`mt-3 text-sm ${alerta ? "text-danger" : "text-muted"}`}>
          {semantica?.mensaje ?? diag.mensaje}
        </p>
      </div>

      {resultado.x ? (
        <div className="rounded-xl border border-line bg-card p-4">
          <h2 className="text-sm font-semibold tracking-wide text-accent">Vector X</h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {resultado.x.map((xi, i) => (
              <div key={i} className="rounded-lg border border-line px-3 py-2">
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

      {semantica?.lineas_plan?.length ? (
        <div className="rounded-xl border border-line bg-card p-4">
          <h2 className="text-sm font-semibold tracking-wide text-accent">
            Interpretación operativa
          </h2>
          <pre className="mt-3 overflow-x-auto whitespace-pre-wrap font-mono text-xs text-muted">
            {semantica.lineas_plan.join("\n")}
          </pre>
        </div>
      ) : null}

      {resultado.traza?.length ? (
        <div className="rounded-xl border border-line bg-card p-4">
          <h2 className="text-sm font-semibold tracking-wide text-accent">
            Traza analítica de filas
          </h2>
          <pre className="mt-3 max-h-[28rem] overflow-auto whitespace-pre-wrap font-mono text-[11px] leading-5 text-muted">
            {resultado.traza.join("\n")}
          </pre>
        </div>
      ) : null}
    </section>
  );
}
