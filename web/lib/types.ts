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

export type Metodo = "all" | "gauss" | "gauss-jordan" | "inversa";

export type Semantica = {
  factible: boolean;
  mensaje: string;
  lineas_plan: string[];
  negativos: { indice: number; valor: number; nombre: string }[];
};

export type Diagnostico = {
  n?: number;
  determinante?: number;
  rango_A?: number;
  rango_aumentada?: number;
  singular?: boolean;
  clasificacion?: string;
  mensaje?: string;
  exitoso?: boolean;
  aprobadas?: number;
};

export type ResolverResult = {
  id?: string;
  diagnostico: Diagnostico;
  abortado: boolean;
  x: number[] | null;
  A?: number[][];
  B?: number[];
  soluciones: Record<string, number[]>;
  residuos: Record<string, { norma_euclidea: number; norma_inf?: number }>;
  sesgos?: Record<string, number>;
  semantica?: Semantica;
  traza: string[];
  metodo: string;
  variables?: string[];
  recursos?: string[];
};

export type EstresResult = {
  id?: string;
  total: number;
  aprobadas: number;
  exitoso: boolean;
  resultados: { nombre: string; ok: boolean; detalle: string; estado: string }[];
};

export type ResolucionRow = {
  id: string;
  tipo: string;
  metodo: string;
  a: number[][] | null;
  b: number[] | null;
  x: number[] | null;
  diagnostico: Diagnostico | null;
  semantica: Semantica | null;
  abortado: boolean;
  created_at: string;
};
