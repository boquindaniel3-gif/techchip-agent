"use client";

type Props = {
  A: number[][];
  B: number[];
  variables: string[];
  recursos: string[];
  onChangeA: (A: number[][]) => void;
  onChangeB: (B: number[]) => void;
};

export function MatrixEditor({ A, B, variables, recursos, onChangeA, onChangeB }: Props) {
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

  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-card p-4">
      <p className="mb-3 text-sm text-muted">
        Matriz de consumos A ({A.length}×{A.length}: filas = recursos, columnas = módulos) y vector B.
      </p>
      <table className="w-full border-collapse text-center text-xs">
        <thead>
          <tr>
            <th className="p-1 text-left text-muted">Recurso \ xᵢ</th>
            {A[0]?.map((_, j) => (
              <th key={`col-${j}`} className="p-1 font-medium">
                x{j + 1}
                <div className="max-w-[7rem] truncate font-normal text-[10px] text-muted">
                  {variables[j] ?? `x${j + 1}`}
                </div>
              </th>
            ))}
            <th className="p-1">B</th>
          </tr>
        </thead>
        <tbody>
          {A.map((fila, i) => (
            <tr key={`row-${i}`}>
              <td className="max-w-[10rem] p-1 text-left text-muted">
                {recursos[i] ?? `Recurso ${i + 1}`}
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
