export {
  A_BASE,
  B_BASE,
  RECURSOS,
  VARIABLES,
  A_8,
  B_8,
  N_MAX,
  N_MIN,
} from "@/lib/modelos";

export type Metodo = "all" | "gauss" | "gauss-jordan" | "inversa";

export type RecursoBalance = {
  indice: number;
  nombre: string;
  consumo: number;
  capacidad: number;
  holgura: number;
  peso: number;
};

export type Semantica = {
  factible: boolean;
  mensaje: string;
  lineas_plan: string[];
  negativos: { indice: number; valor: number; nombre: string }[];
  balance_recursos?: RecursoBalance[];
  cuellos_botella?: RecursoBalance[];
  numericamente_inestable?: boolean;
  residual_relativo?: number;
};

export type FamiliaSolucion = {
  compatible?: boolean;
  grados_libertad?: number;
  pivotes?: number[];
  libres?: number[];
  libres_nombres?: string[];
  x_particular?: number[] | null;
  base_nula?: number[][];
  contradicciones?: { fila_rref: number; residuo: number }[];
  expresion?: string;
  lineas?: string[];
  parametros?: string[];
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
  metodo_elegido?: string;
  residual_relativo?: number;
  numericamente_inestable?: boolean;
  familia?: FamiliaSolucion;
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
  metodo_elegido?: string;
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
  traza?: string[];
  soluciones?: Record<string, number[]>;
  residuos?: Record<string, { norma_euclidea: number; norma_inf?: number }>;
  abortado: boolean;
  created_at: string;
};

export type ChatVariant = "success" | "error" | "system" | "user";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  variant: ChatVariant;
};
