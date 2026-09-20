"use client";

type Props = {
  A: number[][];
  B: number[];
  variables: string[];
  recursos: string[];
  onChangeA: (A: number[][]) => void;
  onChangeB: (B: number[]) => void;
  onChangeVariables: (variables: string[]) => void;
  onChangeRecursos: (recursos: string[]) => void;
};

export function MatrixEditor({
  A,
  B,
  variables,
  recursos,
  onChangeA,
  onChangeB,
  onChangeVariables,
  onChangeRecursos,
}: Props) {
  function setCelda(i: number, j: number, valor: string) {
    const siguiente = A.map((fila) => fila.slice());
    siguiente[i][j] = Number(valor);
    onChangeA(siguiente);
  }

  function setB(i: number, valor: string) {
    const siguiente = B.slice();
    siguiente[i] = Number(valor);
    onChangeB(siguiente);
  }

  function setVariable(j: number, valor: string) {
    const siguiente = variables.slice();
    siguiente[j] = valor;
    onChangeVariables(siguiente);
  }

  function setRecurso(i: number, valor: string) {
    const siguiente = recursos.slice();
    siguiente[i] = valor;
    onChangeRecursos(siguiente);
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-card p-4">
      <p className="mb-3 text-sm text-muted">
        Matriz de consumos A ({A.length}×{A.length}: filas = recursos, columnas = módulos) y vector B.
        Los nombres de módulo y recurso son libres: pon lo que el sistema represente.
      </p>
      <table className="w-full border-collapse text-center text-xs">
        <thead>
          <tr>
            <th className="p-1 text-left text-muted">Recurso \ xᵢ</th>
            {A[0]?.map((_, j) => (
              <th key={`col-${j}`} className="p-1 font-medium">
                <div className="text-[10px] text-muted">x{j + 1}</div>
                <input
                  type="text"
                  value={variables[j] ?? `x${j + 1}`}
                  onChange={(e) => setVariable(j, e.target.value)}
                  aria-label={`Nombre del módulo x${j + 1}`}
                  className="mt-0.5 w-28 rounded-lg border border-line bg-background px-1 py-1 text-center font-normal"
                />
              </th>
            ))}
            <th className="p-1">B</th>
          </tr>
        </thead>
        <tbody>
          {A.map((fila, i) => (
            <tr key={`row-${i}`}>
              <td className="p-1 text-left">
                <input
                  type="text"
                  value={recursos[i] ?? `Recurso ${i + 1}`}
                  onChange={(e) => setRecurso(i, e.target.value)}
                  aria-label={`Nombre del recurso ${i + 1}`}
                  className="w-40 max-w-[12rem] rounded-lg border border-line bg-background px-1 py-1 text-left text-muted"
                />
              </td>
              {fila.map((valor, j) => (
                <td key={`${i}-${j}`} className="p-1">
                  <input
                    type="number"
                    step="any"
                    value={Number.isNaN(valor) ? "" : valor}
                    onChange={(e) => setCelda(i, j, e.target.value)}
                    className="w-16 rounded-lg border border-line bg-background px-1 py-1 text-center"
                  />
                </td>
              ))}
              <td className="p-1">
                <input
                  type="number"
                  step="any"
                  value={Number.isNaN(B[i]) ? "" : B[i]}
                  onChange={(e) => setB(i, e.target.value)}
                  className="w-20 rounded-lg border border-line bg-background px-1 py-1 text-center font-medium"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
