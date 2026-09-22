#!/usr/bin/env python3
"""
Agente autónomo de balance logístico y resolución matricial
para TechChip Systems S.A.

Resuelve el sistema AX = B de asignación de recursos (n líneas de módulos
frente a n recursos críticos, 2 ≤ n ≤ 12; el modelo de la guía es 6×6)
mediante tres métodos algebraicos implementados de forma explícita:

    1. Eliminación de Gauss (triangularización + sustitución hacia atrás)
    2. Eliminación de Gauss-Jordan (reducción a [I | X])
    3. Matriz inversa ( [A | I] -> [I | A^{-1}],  X = A^{-1} B )

NumPy se emplea exclusivamente para el prediagnóstico de resolubilidad
(determinante y rango). La aritmética de resolución no usa np.linalg.solve
ni np.linalg.inv.

Uso:
    python techchip_agent.py
    python techchip_agent.py --json data/modelo_base.json
    python techchip_agent.py --interactive
    python techchip_agent.py --stress
    python techchip_agent.py --audit
    python techchip_agent.py --method gauss
"""

from __future__ import annotations

import argparse
import copy
import json
import math
import sys
from typing import Any, Dict, List, Optional, Sequence, Tuple

import numpy as np

# ---------------------------------------------------------------------------
# Constantes numéricas e identidad del modelo industrial
# ---------------------------------------------------------------------------

EPSILON_PIVOTE = 1e-12
EPSILON_DET = 1e-10  # solo informativo; la singularidad se decide por el rango
EPSILON_RESIDUO = 1e-6
EPSILON_REL_RESIDUO = 1e-8
EPSILON_CONSISTENCIA = 1e-8
DECIMALES_TRAZA = 4

# NUEVO: textos exigidos por la rúbrica. La singularidad sigue decidiéndose
# por rank(A) < n; estos strings son lo que se entrega al usuario.
MENSAJE_SINGULAR = "det(A) = 0: infinitas o cero soluciones"
MENSAJE_ESCASEZ = "Plan de producción inalcanzable por restricción de materias primas"

# Vector exacto exigido por la Prueba Base de la guía del parcial.
X_ESTRELLA = [15.0, 20.0, 25.0, 10.0, 15.0, 20.0]

# Consumos unitarios (filas = recursos, columnas = módulos x1..x6).
# Recurso 1: Litografía EUV
# Recurso 2: Pruebas ATE
# Recurso 3: Resina de encapsulado
# Recurso 4: Sustrato de silicio
# Recurso 5: Energía eléctrica (cortado láser)
# Recurso 6: Inspección óptica
A_BASE = [
    [2.0, 1.0, 3.0, 1.0, 2.0, 1.0],
    [1.0, 3.0, 2.0, 1.0, 1.0, 2.0],
    [3.0, 2.0, 4.0, 1.0, 3.0, 2.0],
    [1.0, 1.0, 1.0, 4.0, 2.0, 1.0],
    [2.0, 1.0, 2.0, 1.0, 5.0, 3.0],
    [1.0, 2.0, 1.0, 2.0, 1.0, 4.0],
]

# B = A · X*  (capacidades consistentes con el vector de operaciones exacto).
# El B impreso en la guía no satisface A X* = B; se documenta en el JSON.
B_BASE = [185.0, 190.0, 280.0, 150.0, 245.0, 195.0]

VARIABLES_BASE = [
    "AI-Edge 1",
    "AI-Server Pro",
    "AI-Autonomous Car",
    "AI-IoT LowPower",
    "AI-Robotics Heavy",
    "AI-Medical Vision",
]

RECURSOS_BASE = [
    "Litografía EUV (h-máquina)",
    "Pruebas ATE (h-máquina)",
    "Resina de Encapsulado Avanzado (kg)",
    "Sustrato de Silicio Grado IA (m²)",
    "Energía Eléctrica para Cortado Láser (MWh)",
    "Inspección Óptica de Calidad (h-hombre)",
]

N_MIN = 2
N_MAX = 12

# Planta extendida 8×8 (las 6 primeras líneas coinciden con la guía).
X_ESTRELLA_8 = [15.0, 20.0, 25.0, 10.0, 15.0, 20.0, 12.0, 8.0]
A_8 = [
    [2.0, 1.0, 3.0, 1.0, 2.0, 1.0, 2.0, 1.0],
    [1.0, 3.0, 2.0, 1.0, 1.0, 2.0, 1.0, 2.0],
    [3.0, 2.0, 4.0, 1.0, 3.0, 2.0, 2.0, 1.0],
    [1.0, 1.0, 1.0, 4.0, 2.0, 1.0, 1.0, 3.0],
    [2.0, 1.0, 2.0, 1.0, 5.0, 3.0, 2.0, 2.0],
    [1.0, 2.0, 1.0, 2.0, 1.0, 4.0, 1.0, 1.0],
    [1.0, 2.0, 2.0, 1.0, 3.0, 2.0, 4.0, 2.0],
    [0.0, 1.0, 1.0, 0.0, 1.0, 0.0, 3.0, 5.0],
]
B_8 = [217.0, 218.0, 312.0, 186.0, 285.0, 215.0, 264.0, 136.0]
VARIABLES_8 = VARIABLES_BASE + ["AI-Drone Swarm", "AI-Satellite Link"]
RECURSOS_8 = RECURSOS_BASE + ["Cuarto limpio ISO 5 (h)", "Nitruro de galio (kg)"]


def _es_cero(valor: float, eps: float = EPSILON_PIVOTE) -> bool:
    """Predicado de anulación numérica (pivotes / factores despreciables)."""
    return abs(valor) < eps


def _producto_matriz_vector(matriz: List[List[float]], vector: Sequence[float]) -> List[float]:
    """Producto A·x implementado a mano (sin np.dot) para el cierre algebraico."""
    n = len(matriz)
    m = len(vector)
    return [sum(matriz[i][j] * vector[j] for j in range(m)) for i in range(n)]


def _norma_euclidea(vector: Sequence[float]) -> float:
    return math.sqrt(sum(v * v for v in vector))


def _formato_numero(valor: float, decimales: int = DECIMALES_TRAZA) -> str:
    return f"{valor:.{decimales}f}"


def alinear_etiquetas(
    nombres: Optional[Sequence[str]], n: int, plantilla: str
) -> List[str]:
    """Recorta o completa nombres hasta longitud n (x_i / Recurso i)."""
    base = [str(nombre).strip() for nombre in (nombres or [])]
    alineados: List[str] = []
    for i in range(n):
        if i < len(base) and base[i]:
            alineados.append(base[i])
        else:
            alineados.append(plantilla.format(i=i + 1))
    return alineados


def validar_orden(n: int) -> None:
    if n < N_MIN or n > N_MAX:
        raise ValueError(
            f"A debe ser n×n con n entre {N_MIN} y {N_MAX} (recibido n = {n})."
        )


def _coercer_escalar(valor: Any) -> float:
    """Convierte un coeficiente a float finito; aplana columnas [c]."""
    if isinstance(valor, bool) or valor is None:
        raise ValueError(f"Coeficiente no numérico: {valor!r}.")
    if isinstance(valor, (list, tuple)):
        if len(valor) != 1:
            raise ValueError(
                f"Se esperaba un escalar (o una columna de un elemento), recibido {valor!r}."
            )
        return _coercer_escalar(valor[0])
    try:
        numero = float(valor)
    except (TypeError, ValueError) as error:
        raise ValueError(f"No se pudo interpretar {valor!r} como número.") from error
    if not math.isfinite(numero):
        raise ValueError("A y B no pueden contener NaN ni infinitos.")
    return numero


def extraer_ab(modelo: Dict[str, Any]) -> Tuple[Any, Any]:
    matriz_a = modelo.get("A", modelo.get("a"))
    vector_b = modelo.get("B", modelo.get("b"))
    if matriz_a is None or vector_b is None:
        raise ValueError(
            "El modelo debe contener las claves 'A' y 'B' (también se aceptan 'a' y 'b')."
        )
    return matriz_a, vector_b


def normalizar_modelo(modelo: Dict[str, Any]) -> Dict[str, Any]:
    """Valida A cuadrada 2..12, B de longitud n, y alinea etiquetas."""
    crudo_a, crudo_b = extraer_ab(modelo)
    if not crudo_a:
        raise ValueError("La matriz A está vacía.")
    matriz_a = [[_coercer_escalar(c) for c in fila] for fila in crudo_a]
    vector_b = [_coercer_escalar(c) for c in crudo_b]
    n = len(matriz_a)
    validar_orden(n)
    for i, fila in enumerate(matriz_a):
        if len(fila) != n:
            raise ValueError(
                f"A debe ser cuadrada n×n. La fila {i + 1} tiene {len(fila)} "
                f"columnas; se esperaban {n}."
            )
    if len(vector_b) != n:
        raise ValueError(
            f"B debe tener {n} entradas porque A es {n}×{n} (recibido {len(vector_b)})."
        )
    return {
        **modelo,
        "A": matriz_a,
        "B": vector_b,
        "variables": alinear_etiquetas(modelo.get("variables"), n, "x{i}"),
        "recursos": alinear_etiquetas(modelo.get("recursos"), n, "Recurso {i}"),
        "planta": str(modelo.get("planta", "TechChip Systems S.A.")),
    }


class SingularSystemError(Exception):
    """El sistema no admite solución única (det(A) = 0 o pivote nulo)."""

    def __init__(self, mensaje: str, diagnostico: Optional[Dict[str, Any]] = None) -> None:
        super().__init__(mensaje)
        self.diagnostico = diagnostico or {}


# ===========================================================================
# Capa de entrada / salida
# ===========================================================================


class MatrixIO:
    """
    Carga dinámica de (A, B) desde JSON o consola.

    Contrato JSON mínimo:
        {
          "A" o "a": [[...], ...],   # n x n
          "B" o "b": [...],          # n (también se acepta columna [[c], ...])
          "variables": ["..."],      # opcional, n nombres
          "recursos": ["..."]        # opcional, n nombres
        }
    """

    @staticmethod
    def modelo_embebido() -> Dict[str, Any]:
        """Modelo 6x6 de planta calibrado para X* = (15, 20, 25, 10, 15, 20)."""
        return {
            "planta": "TechChip Systems S.A.",
            "variables": list(VARIABLES_BASE),
            "recursos": list(RECURSOS_BASE),
            "A": copy.deepcopy(A_BASE),
            "B": list(B_BASE),
        }

    @staticmethod
    def modelo_8x8() -> Dict[str, Any]:
        """Planta extendida 8×8 calibrada para X* = (15, 20, 25, 10, 15, 20, 12, 8)."""
        return {
            "planta": "TechChip Systems S.A. — planta extendida",
            "variables": list(VARIABLES_8),
            "recursos": list(RECURSOS_8),
            "A": copy.deepcopy(A_8),
            "B": list(B_8),
        }

    @staticmethod
    def cargar_json(ruta: str) -> Dict[str, Any]:
        with open(ruta, "r", encoding="utf-8") as archivo:
            datos = json.load(archivo)
        if not isinstance(datos, dict):
            raise ValueError("El JSON debe ser un objeto con claves A y B.")
        return datos

    @staticmethod
    def cargar_consola() -> Dict[str, Any]:
        """Entrada interactiva: orden n, n filas de A y el vector B."""
        print("=== Entrada dinámica del sistema AX = B ===")
        n = int(input("Orden n de la matriz A (n x n): ").strip())
        validar_orden(n)

        print(f"Ingrese las {n} filas de A ({n} coeficientes separados por espacio):")
        matriz_a: List[List[float]] = []
        for i in range(n):
            coeficientes = input(f"  Fila {i + 1}: ").split()
            if len(coeficientes) != n:
                raise ValueError(f"La fila {i + 1} debe tener exactamente {n} entradas.")
            matriz_a.append([float(c) for c in coeficientes])

        print(f"Ingrese el vector B ({n} disponibilidades separadas por espacio):")
        vector_b = [float(c) for c in input("  B: ").split()]
        if len(vector_b) != n:
            raise ValueError(f"B debe tener exactamente {n} entradas.")

        variables = [f"x{i + 1}" for i in range(n)]
        recursos = [f"Recurso {i + 1}" for i in range(n)]
        return {
            "planta": "entrada-consola",
            "variables": variables,
            "recursos": recursos,
            "A": matriz_a,
            "B": vector_b,
        }


# ===========================================================================
# Prediagnóstico de resolubilidad (único punto de uso de NumPy)
# ===========================================================================


class SystemValidator:
    """
    Verifica consistencia dimensional y clasifica el sistema lineal.

    NumPy se restringe a det(A) y rank(A) / rank([A|B]) como filtro previo
    a los algoritmos de eliminación implementados a mano.
    """

    def __init__(self, matriz_a: List[List[float]], vector_b: Sequence[float]) -> None:
        self.A = matriz_a
        self.B = list(vector_b)

    def validar_dimensiones(self) -> int:
        if not self.A:
            raise ValueError("La matriz A está vacía.")
        n = len(self.A)
        for i, fila in enumerate(self.A):
            if len(fila) != n:
                raise ValueError(
                    f"Inconsistencia dimensional: A debe ser n x n. "
                    f"La fila {i + 1} tiene {len(fila)} columnas (n = {n})."
                )
        if len(self.B) != n:
            raise ValueError(
                f"Inconsistencia dimensional: B tiene {len(self.B)} entradas y A es {n} x {n}."
            )
        return n

    def prediagnostico(self) -> Dict[str, Any]:
        """
        Calcula det(A), rank(A) y rank([A|B]).

        La unisolvencia se decide por el rango (tolerancia relativa de NumPy),
        no por un umbral absoluto de |det(A)|:
            rank(A) = n                 -> determinado (solución única)
            rank(A) < rank([A|B])       -> incompatible (cero soluciones)
            rank(A) = rank([A|B]) < n   -> compatible indeterminado (infinitas)
        """
        n = self.validar_dimensiones()
        a_np = np.array(self.A, dtype=float)
        b_np = np.array(self.B, dtype=float).reshape(n, 1)
        aumentada = np.hstack((a_np, b_np))

        determinante = float(np.linalg.det(a_np))
        rango_a = int(np.linalg.matrix_rank(a_np))
        rango_aumentada = int(np.linalg.matrix_rank(aumentada))
        singular = rango_a < n

        if not singular:
            clasificacion = "determinado"
            mensaje = (
                f"Sistema determinado: rank(A) = {rango_a} = n = {n}. Existe solución única. "
                f"det(A) = {determinante:.6e}."
            )
            if abs(determinante) < EPSILON_DET:
                mensaje += (
                    " Nota: |det(A)| es pequeño; conviene revisar el residual ||AX−B||."
                )
        elif rango_a < rango_aumentada:
            clasificacion = "incompatible"
            mensaje = (
                "Alerta de Singularidad: rank(A) < n. "
                "Diagnóstico: Sistema Incompatible. Cero soluciones posibles "
                f"(rank(A) = {rango_a} < rank([A|B]) = {rango_aumentada}, n = {n})."
            )
        else:
            clasificacion = "indeterminado"
            mensaje = (
                "Alerta de Singularidad: rank(A) < n. "
                "Diagnóstico: Sistema compatible indeterminado. Infinitas soluciones "
                f"(rank(A) = rank([A|B]) = {rango_a} < n = {n})."
            )

        return {
            "n": n,
            "determinante": determinante,
            "rango_A": rango_a,
            "rango_aumentada": rango_aumentada,
            "singular": singular,
            "clasificacion": clasificacion,
            "mensaje": mensaje,
        }


def _rref_aumentada(
    matriz_a: List[List[float]], vector_b: Sequence[float]
) -> Tuple[List[List[float]], List[int]]:
    """
    Reduce [A | B] a forma escalonada reducida por filas, a mano.

    Si una columna no tiene pivote, se deja libre (no aborta).
    Las k-ésima columna pivote queda en la fila k.
    """
    n = len(matriz_a)
    aumentada = [matriz_a[i][:] + [float(vector_b[i])] for i in range(n)]
    columnas_pivote: List[int] = []
    fila = 0
    for col in range(n):
        if fila >= n:
            break

        def puntuacion(i: int, columna: int = col) -> float:
            escala = max((abs(aumentada[i][j]) for j in range(columna, n)), default=0.0)
            if escala == 0.0:
                return 0.0
            return abs(aumentada[i][columna]) / escala

        mejor = max(range(fila, n), key=puntuacion)
        if _es_cero(aumentada[mejor][col]):
            continue
        if mejor != fila:
            aumentada[fila], aumentada[mejor] = aumentada[mejor], aumentada[fila]
        inverso = 1.0 / aumentada[fila][col]
        for j in range(n + 1):
            aumentada[fila][j] *= inverso
        for i in range(n):
            if i == fila or _es_cero(aumentada[i][col]):
                continue
            multiplicador = aumentada[i][col]
            for j in range(n + 1):
                aumentada[i][j] -= multiplicador * aumentada[fila][j]
        for i in range(n):
            for j in range(n + 1):
                if _es_cero(aumentada[i][j]):
                    aumentada[i][j] = 0.0
        columnas_pivote.append(col)
        fila += 1
    return aumentada, columnas_pivote


def analizar_familia(
    matriz_a: List[List[float]],
    vector_b: Sequence[float],
    variables: Optional[Sequence[str]] = None,
) -> Dict[str, Any]:
    """
    Familia de soluciones de AX = B cuando A es singular.

    incompatible  -> x_particular = None, contradicciones en la RREF
    indeterminado -> X = X_p + Σ t_k v_k  (núcleo a mano)
    """
    n = len(matriz_a)
    nombres = alinear_etiquetas(variables, n, "x{i}")
    aumentada, columnas_pivote = _rref_aumentada(matriz_a, vector_b)
    set_pivotes = set(columnas_pivote)
    libres = [j for j in range(n) if j not in set_pivotes]
    libres_nombres = [nombres[j] for j in libres]

    contradicciones: List[Dict[str, Any]] = []
    for i in range(n):
        fila_nula = all(_es_cero(aumentada[i][j]) for j in range(n))
        if fila_nula and not _es_cero(aumentada[i][n]):
            contradicciones.append(
                {"fila_rref": i + 1, "residuo": float(aumentada[i][n])}
            )

    if contradicciones:
        return {
            "compatible": False,
            "grados_libertad": 0,
            "pivotes": [c + 1 for c in columnas_pivote],
            "libres": [c + 1 for c in libres],
            "libres_nombres": libres_nombres,
            "x_particular": None,
            "base_nula": [],
            "contradicciones": contradicciones,
            "parametros": [],
            "lineas": [],
            "expresion": (
                "No hay combinaciones posibles: el sistema es incompatible "
                f"({len(contradicciones)} fila(s) contradictoria(s) en la RREF)."
            ),
        }

    x_particular = [0.0] * n
    for k, col in enumerate(columnas_pivote):
        x_particular[col] = float(aumentada[k][n])

    base_nula: List[List[float]] = []
    for libre in libres:
        vector = [0.0] * n
        vector[libre] = 1.0
        for k, col in enumerate(columnas_pivote):
            vector[col] = -float(aumentada[k][libre])
        base_nula.append(vector)

    parametros = [f"t{k + 1}" for k in range(len(libres))]
    lineas: List[str] = []
    for i in range(n):
        partes = [_formato_numero(x_particular[i], 6)]
        for k, vector in enumerate(base_nula):
            coef = vector[i]
            if _es_cero(coef):
                continue
            signo = "+" if coef > 0 else "-"
            partes.append(f"{signo} {_formato_numero(abs(coef), 6)} {parametros[k]}")
        lineas.append(f"x_{i + 1} ({nombres[i]}) = {' '.join(partes)}")

    if not libres:
        expresion = "Solución única (no hay variables libres)."
    else:
        pares = ", ".join(
            f"{parametros[k]} ↔ {libres_nombres[k]}" for k in range(len(libres))
        )
        expresion = (
            f"Infinitas combinaciones: {len(libres)} grado(s) de libertad ({pares}). "
            + " | ".join(lineas)
        )

    return {
        "compatible": True,
        "grados_libertad": len(libres),
        "pivotes": [c + 1 for c in columnas_pivote],
        "libres": [c + 1 for c in libres],
        "libres_nombres": libres_nombres,
        "x_particular": x_particular,
        "base_nula": base_nula,
        "contradicciones": [],
        "parametros": parametros,
        "lineas": lineas,
        "expresion": expresion,
    }


# ===========================================================================
# Trazabilidad analítica de operaciones elementales de fila
# ===========================================================================


class RowOperationTracer:
    """
    Bitácora de operaciones F_i <- F_i - m * F_k (indexación 1-basada),
    conforme al formato exigido por la guía del parcial.
    """

    def __init__(self, activo: bool = True, resumido: bool = False) -> None:
        self.activo = activo
        self.resumido = resumido
        self.historial: List[str] = []

    def _emitir(self, texto: str) -> None:
        self.historial.append(texto)
        if self.activo:
            print(texto)

    def encabezado(self, titulo: str) -> None:
        linea = "=" * 72
        self._emitir(f"\n{linea}\n{titulo}\n{linea}")

    def _lineas_matriz(self, matriz: List[List[float]], columnas_izquierdas: int) -> List[str]:
        lineas: List[str] = []
        for fila in matriz:
            izquierda = " ".join(f"{v:10.{DECIMALES_TRAZA}f}" for v in fila[:columnas_izquierdas])
            derecha = " ".join(f"{v:10.{DECIMALES_TRAZA}f}" for v in fila[columnas_izquierdas:])
            lineas.append(f"[ {izquierda} | {derecha} ]")
        return lineas

    def imprimir_matriz(
        self, matriz: List[List[float]], columnas_izquierdas: int, forzar: bool = False
    ) -> None:
        if self.resumido and not forzar:
            return
        for linea in self._lineas_matriz(matriz, columnas_izquierdas):
            self._emitir(linea)

    def intercambio(self, i: int, j: int, matriz: List[List[float]], n_izq: int) -> None:
        self._emitir(f"Operación analítica: F_{i + 1} <-> F_{j + 1}  (pivoteo parcial)")
        self.imprimir_matriz(matriz, n_izq)

    def escalado(self, i: int, factor: float, matriz: List[List[float]], n_izq: int) -> None:
        self._emitir(
            f"Operación analítica: F_{i + 1} <- ({_formato_numero(factor)}) * F_{i + 1}"
        )
        self.imprimir_matriz(matriz, n_izq)

    def eliminacion(
        self, i: int, k: int, multiplicador: float, matriz: List[List[float]], n_izq: int
    ) -> None:
        self._emitir(
            f"Operación analítica: F_{i + 1} <- F_{i + 1} - ({_formato_numero(multiplicador)}) * F_{k + 1}"
        )
        self.imprimir_matriz(matriz, n_izq)

    def comentario(self, texto: str) -> None:
        self._emitir(texto)


# ===========================================================================
# Núcleo algebraico (sin librerías black-box de resolución)
# ===========================================================================


class LinearSolvers:
    """
    Tres realizaciones equivalentes de la solución de AX = B.

    Invariante de implementación:
        - copias profundas (el modelo original no se muta)
        - pivoteo parcial escalado por columna
        - aritmética sobre List[List[float]]
        - aborto si el pivote cae bajo EPSILON_PIVOTE
    """

    def __init__(self, tracer: Optional[RowOperationTracer] = None) -> None:
        self.tracer = tracer or RowOperationTracer(activo=True)

    def _pivote_parcial(
        self, matriz: List[List[float]], k: int, n: int, columnas_izq: int
    ) -> None:
        """Pivoteo parcial escalado: max |a_ik| / max_{j>=k}|a_ij| para i >= k."""

        def puntuacion(i: int) -> float:
            escala = max((abs(matriz[i][j]) for j in range(k, n)), default=0.0)
            if escala == 0.0:
                return 0.0
            return abs(matriz[i][k]) / escala

        indice_pivote = max(range(k, n), key=puntuacion)
        if _es_cero(matriz[indice_pivote][k]):
            raise SingularSystemError(
                f"Pivote nulo en la columna {k + 1}. El sistema es singular a precisión de máquina."
            )
        if indice_pivote != k:
            matriz[k], matriz[indice_pivote] = matriz[indice_pivote], matriz[k]
            self.tracer.intercambio(k, indice_pivote, matriz, columnas_izq)

    def gauss(self, matriz_a: List[List[float]], vector_b: Sequence[float]) -> List[float]:
        """
        Eliminación de Gauss: [A | B] -> [U | c] (triangular superior)
        y resolución por sustitución hacia atrás.
        """
        n = len(matriz_a)
        self.tracer.resumido = n >= 8
        aumentada = [matriz_a[i][:] + [float(vector_b[i])] for i in range(n)]
        self.tracer.encabezado("MÉTODO 1 — Eliminación de Gauss")
        self.tracer.comentario("Matriz aumentada inicial [A | B]:")
        self.tracer.imprimir_matriz(aumentada, n, forzar=True)

        for k in range(n):
            self._pivote_parcial(aumentada, k, n, n)
            pivote = aumentada[k][k]
            for i in range(k + 1, n):
                if _es_cero(aumentada[i][k]):
                    continue
                multiplicador = aumentada[i][k] / pivote
                for j in range(k, n + 1):
                    aumentada[i][j] -= multiplicador * aumentada[k][j]
                self.tracer.eliminacion(i, k, multiplicador, aumentada, n)

        self.tracer.comentario("\nMatriz triangular superior [U | c]. Sustitución hacia atrás:")
        self.tracer.imprimir_matriz(aumentada, n, forzar=True)
        solucion = [0.0] * n
        for i in range(n - 1, -1, -1):
            acumulado = aumentada[i][n] - sum(
                aumentada[i][j] * solucion[j] for j in range(i + 1, n)
            )
            if _es_cero(aumentada[i][i]):
                raise SingularSystemError("División por pivote nulo en la sustitución hacia atrás.")
            solucion[i] = acumulado / aumentada[i][i]
            self.tracer.comentario(
                f"  x_{i + 1} = { _formato_numero(solucion[i], 6) }"
            )
        return solucion

    def gauss_jordan(self, matriz_a: List[List[float]], vector_b: Sequence[float]) -> List[float]:
        """
        Gauss-Jordan con pivoteo: reduce [A | B] a [I | X]
        mediante eliminación superior e inferior y normalización del pivote.
        """
        n = len(matriz_a)
        self.tracer.resumido = n >= 8
        aumentada = [matriz_a[i][:] + [float(vector_b[i])] for i in range(n)]
        self.tracer.encabezado("MÉTODO 2 — Eliminación de Gauss-Jordan")
        self.tracer.comentario("Matriz aumentada inicial [A | B]:")
        self.tracer.imprimir_matriz(aumentada, n, forzar=True)

        for k in range(n):
            self._pivote_parcial(aumentada, k, n, n)
            pivote = aumentada[k][k]
            inverso = 1.0 / pivote
            for j in range(n + 1):
                aumentada[k][j] *= inverso
            self.tracer.escalado(k, inverso, aumentada, n)

            for i in range(n):
                if i == k or _es_cero(aumentada[i][k]):
                    continue
                multiplicador = aumentada[i][k]
                for j in range(n + 1):
                    aumentada[i][j] -= multiplicador * aumentada[k][j]
                self.tracer.eliminacion(i, k, multiplicador, aumentada, n)

        self.tracer.comentario("\nForma reducida [I | X]:")
        self.tracer.imprimir_matriz(aumentada, n, forzar=True)
        return [aumentada[i][n] for i in range(n)]

    def inversa(
        self, matriz_a: List[List[float]], vector_b: Sequence[float]
    ) -> Tuple[List[float], List[List[float]]]:
        """
        Cálculo de A^{-1} por Gauss-Jordan sobre [A | I] y evaluación
        X = A^{-1} B con producto matriz-vector manual.
        """
        n = len(matriz_a)
        self.tracer.resumido = n >= 8
        aumentada = [
            matriz_a[i][:] + [1.0 if i == j else 0.0 for j in range(n)] for i in range(n)
        ]
        self.tracer.encabezado("MÉTODO 3 — Matriz inversa  (X = A^{-1} B)")
        self.tracer.comentario("Matriz aumentada inicial [A | I]:")
        self.tracer.imprimir_matriz(aumentada, n, forzar=True)

        for k in range(n):
            self._pivote_parcial(aumentada, k, n, n)
            pivote = aumentada[k][k]
            inverso = 1.0 / pivote
            for j in range(2 * n):
                aumentada[k][j] *= inverso
            self.tracer.escalado(k, inverso, aumentada, n)

            for i in range(n):
                if i == k or _es_cero(aumentada[i][k]):
                    continue
                multiplicador = aumentada[i][k]
                for j in range(2 * n):
                    aumentada[i][j] -= multiplicador * aumentada[k][j]
                self.tracer.eliminacion(i, k, multiplicador, aumentada, n)

        inversa_a = [aumentada[i][n:] for i in range(n)]
        self.tracer.comentario("\nMatriz inversa A^{-1}:")
        for fila in inversa_a:
            self.tracer.comentario(
                "  [" + " ".join(f"{v:10.{DECIMALES_TRAZA}f}" for v in fila) + " ]"
            )

        solucion = _producto_matriz_vector(inversa_a, vector_b)
        self.tracer.comentario("Evaluación X = A^{-1} B:")
        for i, xi in enumerate(solucion):
            self.tracer.comentario(f"  x_{i + 1} = {_formato_numero(xi, 6)}")
        return solucion, inversa_a


# ===========================================================================
# Interpretación semántica (lenguaje de operaciones de planta)
# ===========================================================================


class OperationsInterpreter:
    """Traduce el vector X a un plan de producción y detecta escasez."""

    def __init__(
        self,
        variables: Sequence[str],
        recursos: Sequence[str],
        planta: str = "TechChip Systems S.A.",
    ) -> None:
        self.variables = list(variables)
        self.recursos = list(recursos)
        self.planta = planta

    def interpretar(
        self,
        vector_x: Sequence[float],
        matriz_a: Optional[List[List[float]]] = None,
        vector_b: Optional[Sequence[float]] = None,
        numericamente_inestable: bool = False,
        residual_relativo: float = 0.0,
    ) -> Dict[str, Any]:
        n = len(vector_x)
        negativos = [
            (i, float(vector_x[i]), self.variables[i] if i < len(self.variables) else f"x{i + 1}")
            for i in range(n)
            if vector_x[i] < -EPSILON_CONSISTENCIA
        ]
        lineas_plan = []
        for i, xi in enumerate(vector_x):
            nombre = self.variables[i] if i < len(self.variables) else f"x{i + 1}"
            lineas_plan.append(f"  x_{i + 1}  {nombre}: {xi:.6f}")

        consumo = (
            _producto_matriz_vector(matriz_a, vector_x)
            if matriz_a is not None
            else [0.0] * n
        )
        balance: List[Dict[str, Any]] = []
        n_rec = n
        if matriz_a is not None:
            n_rec = len(matriz_a)
        for i in range(n_rec):
            nombre = self.recursos[i] if i < len(self.recursos) else f"Recurso {i + 1}"
            demanda = float(consumo[i]) if i < len(consumo) else 0.0
            capacidad = float(vector_b[i]) if vector_b is not None and i < len(vector_b) else demanda
            peso = 0.0
            if matriz_a is not None and i < len(matriz_a):
                fila = matriz_a[i]
                peso = sum(
                    abs(fila[j] * vector_x[j]) for j in range(min(len(fila), n))
                )
            balance.append(
                {
                    "indice": i,
                    "nombre": nombre,
                    "consumo": demanda,
                    "capacidad": capacidad,
                    "holgura": capacidad - demanda,
                    "peso": peso,
                }
            )
            lineas_plan.append(
                f"  Recurso {i + 1}  {nombre}: consumo {demanda:.4f} / B={capacidad:.4f} "
                f"(holgura {capacidad - demanda:.3e})"
            )

        cuellos = sorted(balance, key=lambda fila: float(fila["peso"]), reverse=True)
        negativos_json = [
            {"indice": i, "valor": valor, "nombre": nombre} for i, valor, nombre in negativos
        ]
        cuello_txt = cuellos[0]["nombre"] if cuellos else "—"
        if negativos:
            # NUEVO: hay alguna x_i < 0. No se entrega el plan; el texto es el de la rúbrica.
            mensaje = MENSAJE_ESCASEZ
            factible = False
        else:
            mensaje = (
                f"Plan factible para {self.planta}: las {n} líneas operan con cuotas "
                "no negativas y el mix consume la capacidad modelada en B "
                f"(sistema AX = B de orden {n}, holguras numéricas ~0). "
                f"Cuello de botella (mayor peso en el mix): {cuello_txt}."
            )
            factible = True

        if numericamente_inestable and not negativos:
            aviso = (
                f"Advertencia numérica: ||AX−B|| / max(||B||,1) = {residual_relativo:.3e}. "
                "La solución puede ser inestable (matriz mal condicionada); "
                "no se garantiza un plan operativo al 100%."
            )
            mensaje = aviso + "\n" + mensaje
            factible = False

        return {
            "factible": factible,
            "negativos": negativos_json,
            "lineas_plan": lineas_plan,
            "mensaje": mensaje,
            "balance_recursos": balance,
            "cuellos_botella": cuellos,
            "numericamente_inestable": numericamente_inestable,
            "residual_relativo": residual_relativo,
        }

    def imprimir(self, resultado: Dict[str, Any]) -> None:
        print("\n" + "-" * 72)
        print("INTERPRETACIÓN OPERATIVA — TechChip Systems S.A.")
        print("-" * 72)
        print("Valores de x_i:")
        for linea in resultado["lineas_plan"]:
            print(linea)
        print()
        print(resultado["mensaje"])


# ===========================================================================
# Fachada del agente
# ===========================================================================


class TechChipAgent:
    """
    Agente autónomo para el balance logístico y procesamiento matricial
    de TechChip Systems S.A.

    Orquesta: carga -> validación dimensional/espectral -> resolución
    multimétodo -> verificación AX - B -> semántica de planta.
    """

    def __init__(self, json_path: Optional[str] = None, modelo: Optional[Dict[str, Any]] = None) -> None:
        if modelo is not None:
            self.modelo = normalizar_modelo(modelo)
        elif json_path:
            self.modelo = normalizar_modelo(MatrixIO.cargar_json(json_path))
        else:
            self.modelo = normalizar_modelo(MatrixIO.modelo_embebido())

        self.A: List[List[float]] = copy.deepcopy(self.modelo["A"])
        self.B: List[float] = list(self.modelo["B"])
        self.variables: List[str] = list(self.modelo["variables"])
        self.recursos: List[str] = list(self.modelo["recursos"])
        self.planta: str = str(self.modelo.get("planta", "TechChip Systems S.A."))

    def validar(self) -> Dict[str, Any]:
        return SystemValidator(self.A, self.B).prediagnostico()

    def residual(self, vector_x: Sequence[float]) -> Dict[str, float]:
        ax = _producto_matriz_vector(self.A, vector_x)
        error = [ax[i] - self.B[i] for i in range(len(self.B))]
        return {
            "norma_euclidea": _norma_euclidea(error),
            "norma_inf": max(abs(e) for e in error) if error else 0.0,
        }

    def resolver(
        self,
        method: str = "all",
        verbose: bool = True,
        trazar: Optional[bool] = None,
        abortar_si_singular: bool = True,
    ) -> Dict[str, Any]:
        """
        Ejecuta el pipeline completo.

        method: 'all' | 'gauss' | 'gauss-jordan' | 'inversa'
        verbose: imprime diagnóstico, residuos e interpretación.
        trazar: imprime cada operación de fila; por defecto sigue a verbose.
        """
        emitir_traza = verbose if trazar is None else trazar
        diagnostico = self.validar()
        if diagnostico["singular"]:
            familia = analizar_familia(self.A, self.B, self.variables)
            diagnostico["familia"] = familia
            # NUEVO: rank(A) < n. No se ejecutan Gauss / Gauss-Jordan / inversa.
            # La familia paramétrica queda en diagnostico["familia"].
            diagnostico["mensaje"] = MENSAJE_SINGULAR
        if verbose:
            print("\n" + "#" * 72)
            print(f"AGENTE TECHCHIP  |  {self.planta}")
            print("#" * 72)
            print(f"det(A)            = {diagnostico['determinante']:.10f}")
            print(f"rank(A)           = {diagnostico['rango_A']}")
            print(f"rank([A|B])       = {diagnostico['rango_aumentada']}")
            print(f"Clasificación     = {diagnostico['clasificacion']}")
            print(diagnostico["mensaje"])

        if diagnostico["singular"]:
            if verbose:
                print("\nProceso detenido: no se ejecutan Gauss / Gauss-Jordan / inversa.")
                for linea in (diagnostico.get("familia") or {}).get("lineas") or []:
                    print(f"  {linea}")
            if abortar_si_singular:
                raise SingularSystemError(diagnostico["mensaje"], diagnostico)
            return {
                "diagnostico": diagnostico,
                "abortado": True,
                "soluciones": {},
                "traza": [],
                "metodo": method.lower(),
                "A": copy.deepcopy(self.A),
                "B": list(self.B),
                "variables": list(self.variables),
                "recursos": list(self.recursos),
            }

        tracer = RowOperationTracer(activo=emitir_traza)
        solvers = LinearSolvers(tracer)
        metodo = method.lower()
        soluciones: Dict[str, List[float]] = {}

        if metodo in ("all", "gauss"):
            soluciones["gauss"] = solvers.gauss(self.A, self.B)
        if metodo in ("all", "gauss-jordan"):
            soluciones["gauss-jordan"] = solvers.gauss_jordan(self.A, self.B)
        if metodo in ("all", "inversa"):
            x_inv, _inversa_a = solvers.inversa(self.A, self.B)
            soluciones["inversa"] = x_inv

        residuos = {nombre: self.residual(x) for nombre, x in soluciones.items()}
        metodo_elegido = min(residuos, key=lambda nombre: residuos[nombre]["norma_euclidea"])
        referencia = soluciones[metodo_elegido]
        sesgos = {
            nombre: max(abs(soluciones[nombre][i] - referencia[i]) for i in range(len(referencia)))
            for nombre in soluciones
        }
        residual_abs = residuos[metodo_elegido]["norma_euclidea"]
        residual_relativo = residual_abs / max(_norma_euclidea(self.B), 1.0)
        inestable = residual_relativo > EPSILON_REL_RESIDUO
        diagnostico["metodo_elegido"] = metodo_elegido
        diagnostico["residual_relativo"] = residual_relativo
        diagnostico["numericamente_inestable"] = inestable

        interprete = OperationsInterpreter(self.variables, self.recursos, self.planta)
        semantica = interprete.interpretar(
            referencia,
            self.A,
            self.B,
            numericamente_inestable=inestable,
            residual_relativo=residual_relativo,
        )
        if verbose:
            print("\n" + "=" * 72)
            print("VERIFICACIÓN INTER-MÉTODO Y RESIDUO")
            print("=" * 72)
            for nombre, x in soluciones.items():
                r = residuos[nombre]
                marca = " ← elegido" if nombre == metodo_elegido else ""
                print(
                    f"  {nombre:14s}  X = {[round(v, 6) for v in x]}  "
                    f"||AX-B||_2 = {r['norma_euclidea']:.3e}{marca}"
                )
            print(f"  Desviación máxima entre métodos: {max(sesgos.values()):.3e}")
            print(f"  Residual relativo: {residual_relativo:.3e}")
            interprete.imprimir(semantica)

        # NUEVO: el X calculado queda en soluciones; no se entrega como plan.
        plan_rechazado = bool(semantica.get("negativos"))
        return {
            "diagnostico": diagnostico,
            "abortado": False,
            "soluciones": soluciones,
            "residuos": residuos,
            "sesgos": sesgos,
            "semantica": semantica,
            "x": None if plan_rechazado else referencia,
            "traza": list(tracer.historial),
            "metodo": metodo,
            "metodo_elegido": metodo_elegido,
            "A": copy.deepcopy(self.A),
            "B": list(self.B),
            "variables": list(self.variables),
            "recursos": list(self.recursos),
        }


# ===========================================================================
# Pruebas de validación y escenarios extremos (guía del parcial)
# ===========================================================================


def test_escasez() -> str:
    """# NUEVO: inyecta B_3 = 100 y exige la alerta de escasez."""
    modelo = MatrixIO.modelo_embebido()
    modelo["B"][2] = 100.0
    resultado = TechChipAgent(modelo=modelo).resolver(method="gauss-jordan", verbose=False)
    mensaje = (resultado.get("semantica") or {}).get("mensaje")
    soluciones = resultado.get("soluciones") or {}
    hay_negativo = any(valor < -EPSILON_CONSISTENCIA for vector in soluciones.values() for valor in vector)
    if mensaje != MENSAJE_ESCASEZ or resultado.get("x") is not None or not hay_negativo:
        raise AssertionError(
            f"Se esperaba {MENSAJE_ESCASEZ!r} sin entregar X; "
            f"mensaje={mensaje!r} x={resultado.get('x')!r} negativo={hay_negativo}."
        )
    return mensaje


def test_degenerado() -> str:
    """# NUEVO: F6 = 2 F1. Debe abortar antes de Gauss con el texto de singularidad."""
    modelo = MatrixIO.modelo_embebido()
    modelo["A"][5] = [2.0 * c for c in modelo["A"][0]]
    try:
        resultado = TechChipAgent(modelo=modelo).resolver(method="all", verbose=False)
    except SingularSystemError as error:
        mensaje = (error.diagnostico or {}).get("mensaje") or str(error)
        if mensaje != MENSAJE_SINGULAR:
            raise AssertionError(f"Se esperaba {MENSAJE_SINGULAR!r}; llegó {mensaje!r}.") from error
        return mensaje
    soluciones = resultado.get("soluciones") or {}
    raise AssertionError(
        "El agente no abortó pese a rank(A) < n. "
        f"soluciones={list(soluciones)}."
    )


class StressSuite:
    """Cuatro escenarios de estrés exigidos por la rúbrica del parcial."""

    X_ESPERADO = list(X_ESTRELLA)

    def __init__(self, imprimir: bool = True) -> None:
        self.resultados: List[Dict[str, Any]] = []
        self.imprimir = imprimir

    def _registrar(self, nombre: str, ok: bool, detalle: str) -> None:
        estado = "PASS" if ok else "FAIL"
        self.resultados.append({"nombre": nombre, "ok": ok, "detalle": detalle, "estado": estado})
        if self.imprimir:
            print(f"[{estado}] {nombre}: {detalle}")

    def prueba_base(self) -> None:
        agente = TechChipAgent()
        resultado = agente.resolver(method="all", verbose=False)
        ok = True
        detalle_partes = []
        for nombre, x in resultado["soluciones"].items():
            desvio = max(abs(x[i] - self.X_ESPERADO[i]) for i in range(6))
            cumple = desvio < EPSILON_RESIDUO
            ok = ok and cumple
            detalle_partes.append(f"{nombre} max|ΔX|={desvio:.3e}")
        self._registrar(
            "1. Prueba Base  X* = (15, 20, 25, 10, 15, 20)",
            ok,
            "; ".join(detalle_partes),
        )

    def prueba_sustitucion(self) -> None:
        agente = TechChipAgent()
        resultado = agente.resolver(method="all", verbose=False)
        normas = {n: r["norma_euclidea"] for n, r in resultado["residuos"].items()}
        ok = all(v < EPSILON_RESIDUO for v in normas.values())
        detalle = ", ".join(f"{n} ||AX-B||={v:.3e}" for n, v in normas.items())
        self._registrar("2. Sustitución directa  ||AX-B|| < 1e-6", ok, detalle)

    def prueba_escasez(self) -> None:
        try:
            mensaje = test_escasez()
            self._registrar("3. Escenario de Escasez  B3 = 100 kg", True, mensaje)
        except AssertionError as error:
            self._registrar("3. Escenario de Escasez  B3 = 100 kg", False, str(error))

    def prueba_degenerado(self) -> None:
        try:
            mensaje = test_degenerado()
            self._registrar("4. Escenario Degenerado  F6 = 2 F1", True, mensaje)
        except AssertionError as error:
            self._registrar("4. Escenario Degenerado  F6 = 2 F1", False, str(error))

    def ejecutar(self) -> int:
        resumen = self.ejecutar_detalle()
        return 0 if resumen["exitoso"] else 1

    def ejecutar_detalle(self) -> Dict[str, Any]:
        if self.imprimir:
            print("\n" + "#" * 72)
            print("SUITE DE PRUEBAS DE ESTRÉS — TechChip Systems S.A.")
            print("#" * 72)
        self.prueba_base()
        self.prueba_sustitucion()
        self.prueba_escasez()
        self.prueba_degenerado()
        total = len(self.resultados)
        aprobadas = sum(1 for r in self.resultados if r["ok"])
        if self.imprimir:
            print("-" * 72)
            print(f"Resultado global: {aprobadas}/{total} pruebas satisfactorias.")
        return {
            "total": total,
            "aprobadas": aprobadas,
            "exitoso": aprobadas == total,
            "resultados": list(self.resultados),
        }


class AuditSuite(StressSuite):
    """Casos extra de ingest JSON y escalado; no sustituye la guía del parcial."""

    def prueba_escala_pequena(self) -> None:
        escala = 1e-6
        modelo = {
            "A": [[2.0 * escala, 1.0 * escala], [1.0 * escala, 3.0 * escala]],
            "B": [8.0 * escala, 13.0 * escala],
        }
        try:
            resultado = TechChipAgent(modelo=modelo).resolver(method="all", verbose=False)
        except SingularSystemError as error:
            self._registrar("A. 2×2 a escala 1e-6", False, f"Abortó: {error}")
            return
        esperado = [2.2, 3.6]
        desvio = max(abs(resultado["x"][i] - esperado[i]) for i in range(2))
        residuo = resultado["residuos"][resultado["metodo_elegido"]]["norma_euclidea"]
        ok = desvio < 1e-9 and residuo < 1e-15 and not resultado["abortado"]
        self._registrar(
            "A. 2×2 a escala 1e-6",
            ok,
            f"X={[round(v, 6) for v in resultado['x']]}  ||AX-B||={residuo:.3e}",
        )

    def prueba_planta_8x8(self) -> None:
        resultado = TechChipAgent(modelo=MatrixIO.modelo_8x8()).resolver(
            method="all", verbose=False
        )
        desvio = max(abs(resultado["x"][i] - X_ESTRELLA_8[i]) for i in range(8))
        ok = desvio < EPSILON_RESIDUO and not resultado["abortado"]
        self._registrar(
            "B. Planta 8×8  X* extendido",
            ok,
            f"max|ΔX|={desvio:.3e}  n={resultado['diagnostico']['n']}",
        )

    def prueba_json_minusculas(self) -> None:
        modelo = normalizar_modelo({"a": [[1, 0], [0, 1]], "b": [3, 4]})
        resultado = TechChipAgent(modelo=modelo).resolver(method="gauss", verbose=False)
        ok = abs(resultado["x"][0] - 3) < 1e-12 and abs(resultado["x"][1] - 4) < 1e-12
        self._registrar(
            "C. JSON claves a/b",
            ok,
            f"X={[round(v, 6) for v in resultado['x']]}",
        )

    def prueba_b_columna(self) -> None:
        modelo = normalizar_modelo({"A": [[1, 0], [0, 1]], "B": [[5], [7]]})
        resultado = TechChipAgent(modelo=modelo).resolver(method="gauss-jordan", verbose=False)
        ok = abs(resultado["x"][0] - 5) < 1e-12 and abs(resultado["x"][1] - 7) < 1e-12
        self._registrar(
            "D. B como columna",
            ok,
            f"X={[round(v, 6) for v in resultado['x']]}",
        )

    def prueba_indeterminado(self) -> None:
        modelo = MatrixIO.modelo_embebido()
        modelo["A"][5] = [2.0 * c for c in modelo["A"][0]]
        modelo["B"][5] = 2.0 * modelo["B"][0]
        try:
            TechChipAgent(modelo=modelo).resolver(method="all", verbose=False)
            self._registrar(
                "E. Compatible indeterminado  F6=2F1 y B6=2B1",
                False,
                "El agente no abortó pese a rank(A) < n.",
            )
        except SingularSystemError as error:
            diag = error.diagnostico
            familia = diag.get("familia") or {}
            x_p = familia.get("x_particular") or []
            base = familia.get("base_nula") or []
            residual_p = 0.0
            nucleos_ok = True
            if x_p:
                ax = _producto_matriz_vector(modelo["A"], x_p)
                residual_p = _norma_euclidea([ax[i] - modelo["B"][i] for i in range(len(ax))])
            for vector in base:
                av = _producto_matriz_vector(modelo["A"], vector)
                if _norma_euclidea(av) > EPSILON_RESIDUO:
                    nucleos_ok = False
            ok = (
                diag.get("clasificacion") == "indeterminado"
                and int(familia.get("grados_libertad") or 0) >= 1
                and bool(x_p)
                and bool(base)
                and residual_p < EPSILON_RESIDUO
                and nucleos_ok
            )
            self._registrar(
                "E. Compatible indeterminado  F6=2F1 y B6=2B1",
                ok,
                f"libres={familia.get('libres')}  ||AXp-B||={residual_p:.3e}  {familia.get('expresion', '')[:80]}",
            )

    def prueba_nombres_arbitrarios(self) -> None:
        modelo = normalizar_modelo(
            {
                "A": [[1.0, 0.0], [0.0, 1.0]],
                "B": [3.0, 4.0],
                "variables": ["alpha", "beta"],
                "recursos": ["foo", "bar"],
            }
        )
        resultado = TechChipAgent(modelo=modelo).resolver(method="all", verbose=False)
        ok = (
            abs(resultado["x"][0] - 3.0) < 1e-12
            and abs(resultado["x"][1] - 4.0) < 1e-12
            and resultado["variables"] == ["alpha", "beta"]
            and resultado["recursos"] == ["foo", "bar"]
        )
        self._registrar(
            "F. Nombres arbitrarios alpha/beta",
            ok,
            f"variables={resultado['variables']}  X={[round(v, 6) for v in resultado['x']]}",
        )

    def ejecutar_detalle(self) -> Dict[str, Any]:
        if self.imprimir:
            print("\n" + "#" * 72)
            print("AUDITORÍA NUMÉRICA E INGEST JSON — TechChip Agent")
            print("#" * 72)
        self.prueba_base()
        self.prueba_sustitucion()
        self.prueba_escasez()
        self.prueba_degenerado()
        self.prueba_escala_pequena()
        self.prueba_planta_8x8()
        self.prueba_json_minusculas()
        self.prueba_b_columna()
        self.prueba_indeterminado()
        self.prueba_nombres_arbitrarios()
        total = len(self.resultados)
        aprobadas = sum(1 for r in self.resultados if r["ok"])
        if self.imprimir:
            print("-" * 72)
            print(f"Resultado auditoría: {aprobadas}/{total} pruebas satisfactorias.")
        return {
            "total": total,
            "aprobadas": aprobadas,
            "exitoso": aprobadas == total,
            "resultados": list(self.resultados),
        }


# ===========================================================================
# Interfaz de línea de comandos
# ===========================================================================


def _construir_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description=(
            "Agente autónomo TechChip Systems S.A. — resolución paso a paso "
            "de AX = B (Gauss, Gauss-Jordan, inversa)."
        )
    )
    parser.add_argument(
        "--stress",
        action="store_true",
        help="Ejecutar las cuatro pruebas de estrés de la guía del parcial.",
    )
    parser.add_argument(
        "--audit",
        action="store_true",
        help="Ejecutar la guía más casos de JSON (a/b, B columna) y 2×2 a escala 1e-6.",
    )
    parser.add_argument(
        "--json",
        dest="json_path",
        default=None,
        help="Ruta a un JSON con A/B (también a/b; B puede ir como columna).",
    )
    parser.add_argument(
        "--interactive",
        action="store_true",
        help="Capturar A y B desde la consola.",
    )
    parser.add_argument(
        "--method",
        choices=["all", "gauss", "gauss-jordan", "inversa"],
        default="all",
        help="Algoritmo de resolución (por defecto: all).",
    )
    parser.add_argument(
        "--quiet",
        action="store_true",
        help="Suprime la traza analítica de filas (solo resumen).",
    )
    return parser


def main(argv: Optional[Sequence[str]] = None) -> int:
    args = _construir_parser().parse_args(argv)

    if args.stress:
        return StressSuite().ejecutar()
    if args.audit:
        return AuditSuite().ejecutar()

    try:
        if args.interactive:
            modelo = MatrixIO.cargar_consola()
            agente = TechChipAgent(modelo=modelo)
        else:
            agente = TechChipAgent(json_path=args.json_path)
        agente.resolver(method=args.method, verbose=True, trazar=not args.quiet)
        return 0
    except SingularSystemError as error:
        print("\nProceso abortado por singularidad.")
        print(str(error))
        return 2
    except (OSError, ValueError, json.JSONDecodeError) as error:
        print(f"Error de entrada: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
