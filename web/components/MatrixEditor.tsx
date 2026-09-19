"use client";

import { RECURSOS, VARIABLES } from "@/lib/types";

type Props = {
  A: number[][];
  B: number[];
  onChangeA: (A: number[][]) => void;
  onChangeB: (B: number[]) => void;
};

export function MatrixEditor({ A, B, onChangeA, onChangeB }: Props) {
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
    <div className="overflow-x-auto rounded-xl border border-line bg-card p-4">
      <p className="mb-3 text-sm text-muted">
        Matriz de consumos A (filas = recursos, columnas = módulos) y vector B.
      </p>
      <table className="w-full border-collapse text-center text-xs">
        <thead>
          <tr>
            <th className="p-1 text-left text-muted">Recurso \ xᵢ</th>
            {VARIABLES.map((nombre, j) => (
              <th key={nombre} className="p-1 font-medium text-accent">
                x{j + 1}
                <div className="font-normal text-[10px] text-muted">{nombre}</div>
              </th>
            ))}
            <th className="p-1 text-warn">B</th>
          </tr>
        </thead>
        <tbody>
          {A.map((fila, i) => (
            <tr key={RECURSOS[i]}>
              <td className="p-1 text-left text-muted">{RECURSOS[i]}</td>
              {fila.map((valor, j) => (
                <td key={`${i}-${j}`} className="p-1">
                  <input
                    type="number"
                    step="any"
                    value={Number.isNaN(valor) ? "" : valor}
                    onChange={(e) => setCelda(i, j, e.target.value)}
                    className="w-16 rounded-md border border-line bg-background px-1 py-1 text-center"
                  />
                </td>
              ))}
              <td className="p-1">
                <input
                  type="number"
                  step="any"
                  value={Number.isNaN(B[i]) ? "" : B[i]}
                  onChange={(e) => setB(i, e.target.value)}
                  className="w-20 rounded-md border border-warn/40 bg-background px-1 py-1 text-center text-warn"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
