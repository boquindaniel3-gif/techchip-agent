export const N_MIN = 2;
export const N_MAX = 12;

export const VARIABLES = [
  "AI-Edge 1",
  "AI-Server Pro",
  "AI-Autonomous Car",
  "AI-IoT LowPower",
  "AI-Robotics Heavy",
  "AI-Medical Vision",
];

export const RECURSOS = [
  "Litografía EUV (h-máquina)",
  "Pruebas ATE (h-máquina)",
  "Resina de Encapsulado Avanzado (kg)",
  "Sustrato de Silicio Grado IA (m²)",
  "Energía Eléctrica para Cortado Láser (MWh)",
  "Inspección Óptica de Calidad (h-hombre)",
];

export const A_BASE: number[][] = [
  [2, 1, 3, 1, 2, 1],
  [1, 3, 2, 1, 1, 2],
  [3, 2, 4, 1, 3, 2],
  [1, 1, 1, 4, 2, 1],
  [2, 1, 2, 1, 5, 3],
  [1, 2, 1, 2, 1, 4],
];

export const B_BASE: number[] = [185, 190, 280, 150, 245, 195];

export const VARIABLES_8 = [...VARIABLES, "AI-Drone Swarm", "AI-Satellite Link"];

export const RECURSOS_8 = [...RECURSOS, "Cuarto limpio ISO 5 (h)", "Nitruro de galio (kg)"];

export const A_8: number[][] = [
  [2, 1, 3, 1, 2, 1, 2, 1],
  [1, 3, 2, 1, 1, 2, 1, 2],
  [3, 2, 4, 1, 3, 2, 2, 1],
  [1, 1, 1, 4, 2, 1, 1, 3],
  [2, 1, 2, 1, 5, 3, 2, 2],
  [1, 2, 1, 2, 1, 4, 1, 1],
  [1, 2, 2, 1, 3, 2, 4, 2],
  [0, 1, 1, 0, 1, 0, 3, 5],
];

export const B_8: number[] = [217, 218, 312, 186, 285, 215, 264, 136];

export type ModeloPlanta = {
  A: number[][];
  B: number[];
  variables: string[];
  recursos: string[];
};

export function clonarMatriz(A: number[][]): number[][] {
  return A.map((fila) => fila.slice());
}

export function modeloBase(): ModeloPlanta {
  return {
    A: clonarMatriz(A_BASE),
    B: B_BASE.slice(),
    variables: VARIABLES.slice(),
    recursos: RECURSOS.slice(),
  };
}

export function modelo8x8(): ModeloPlanta {
  return {
    A: clonarMatriz(A_8),
    B: B_8.slice(),
    variables: VARIABLES_8.slice(),
    recursos: RECURSOS_8.slice(),
  };
}

export function alinearNombres(nombres: string[] | undefined, n: number, plantilla: string): string[] {
  const base = nombres ?? [];
  return Array.from({ length: n }, (_, i) => {
    const actual = base[i]?.trim();
    return actual ? actual : plantilla.replace("{i}", String(i + 1));
  });
}

export function redimensionarSistema(
  A: number[][],
  B: number[],
  variables: string[],
  recursos: string[],
  n: number
): ModeloPlanta {
  if (n < N_MIN || n > N_MAX) {
    throw new Error(`El orden n debe estar entre ${N_MIN} y ${N_MAX}.`);
  }
  const siguienteA: number[][] = [];
  for (let i = 0; i < n; i += 1) {
    const fila: number[] = [];
    for (let j = 0; j < n; j += 1) {
      fila.push(A[i]?.[j] ?? 0);
    }
    siguienteA.push(fila);
  }
  const siguienteB = Array.from({ length: n }, (_, i) => B[i] ?? 0);
  return {
    A: siguienteA,
    B: siguienteB,
    variables: alinearNombres(variables, n, "x{i}"),
    recursos: alinearNombres(recursos, n, "Recurso {i}"),
  };
}
