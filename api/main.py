"""API FastAPI: envuelve TechChipAgent y valida JWT de Supabase."""

from __future__ import annotations

import json
import math
import re
import sys
from pathlib import Path
from typing import Any, Dict, List, Literal, Optional

import httpx
from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from techchip_agent import (  # noqa: E402
    MatrixIO,
    SingularSystemError,
    StressSuite,
    TechChipAgent,
    analizar_familia,
    normalizar_modelo,
)

from api.auth import usuario_actual
from api.settings import Settings, get_settings
from api.storage import insertar_resolucion, listar_resoluciones

Metodo = Literal["all", "gauss", "gauss-jordan", "inversa"]


class ResolverBody(BaseModel):
    A: List[List[float]]
    B: List[float]
    method: Metodo = "all"
    variables: Optional[List[str]] = None
    recursos: Optional[List[str]] = None
    persistir: bool = True


class EstresBody(BaseModel):
    persistir: bool = True


N_EXTRACCION = 6

PROMPT_EXTRACCION = (
    "Eres un asistente de llenado para un balance AX=B de 6 recursos por 6 módulos. "
    "No resuelvas el sistema. No calcules X, el determinante ni el rango. "
    "Devuelve únicamente un objeto JSON, sin markdown ni texto alrededor, con esta forma: "
    '{"matriz_A": [[seis números], ... seis filas], "vector_B": [seis números]}. '
    "matriz_A[i][j] es el consumo del recurso i+1 en el módulo j+1. "
    "vector_B[i] es la disponibilidad del recurso i+1. "
    "Usa solo cifras del enunciado. Si falta un coeficiente, escribe 0.0. "
    "No inventes un plan de producción."
)


class ParseTextBody(BaseModel):
    texto: str = Field(min_length=1, max_length=12000)

    @field_validator("texto")
    @classmethod
    def _recortar(cls, valor: str) -> str:
        limpio = valor.strip()
        if not limpio:
            raise ValueError("El enunciado está vacío.")
        return limpio


class MatrixExtractionResponse(BaseModel):
    """Coeficientes extraídos. Siempre 6×6 y B de longitud 6. No incluye X."""

    matriz_A: List[List[float]]
    vector_B: List[float]

    @field_validator("matriz_A")
    @classmethod
    def _matriz_6x6(cls, valor: List[List[float]]) -> List[List[float]]:
        if len(valor) != N_EXTRACCION or any(len(fila) != N_EXTRACCION for fila in valor):
            raise ValueError("matriz_A debe ser 6×6.")
        for fila in valor:
            for celda in fila:
                if not math.isfinite(celda):
                    raise ValueError("matriz_A contiene un número no finito.")
        return valor

    @field_validator("vector_B")
    @classmethod
    def _vector_6(cls, valor: List[float]) -> List[float]:
        if len(valor) != N_EXTRACCION:
            raise ValueError("vector_B debe tener 6 entradas.")
        if any(not math.isfinite(celda) for celda in valor):
            raise ValueError("vector_B contiene un número no finito.")
        return valor


def _objeto_json(texto: str) -> Dict[str, Any]:
    cerca = texto.strip()
    fenced = re.search(r"```(?:json)?\s*([\s\S]*?)```", cerca, re.IGNORECASE)
    cuerpo = fenced.group(1).strip() if fenced else cerca
    inicio = cuerpo.find("{")
    fin = cuerpo.rfind("}")
    if inicio < 0 or fin <= inicio:
        raise ValueError("El modelo no devolvió un objeto JSON.")
    datos = json.loads(cuerpo[inicio : fin + 1])
    if not isinstance(datos, dict):
        raise ValueError("El modelo no devolvió un objeto JSON.")
    return datos


def _pedir_extraccion(settings: Settings, texto: str) -> str:
    if not settings.llm_api_key:
        raise HTTPException(status_code=503, detail="Falta LLM_API_KEY en el servidor.")
    url = settings.llm_base_url.rstrip("/") + "/chat/completions"
    try:
        with httpx.Client(timeout=40.0) as cliente:
            respuesta = cliente.post(
                url,
                headers={"Authorization": f"Bearer {settings.llm_api_key}"},
                json={
                    "model": settings.llm_model,
                    "temperature": 0,
                    "messages": [
                        {"role": "system", "content": PROMPT_EXTRACCION},
                        {"role": "user", "content": texto},
                    ],
                },
            )
    except httpx.HTTPError as error:
        raise HTTPException(
            status_code=502, detail="El proveedor de lenguaje no respondió."
        ) from error
    if respuesta.status_code >= 400:
        raise HTTPException(
            status_code=502, detail="El proveedor de lenguaje rechazó la solicitud."
        )
    try:
        contenido = respuesta.json()["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError, ValueError) as error:
        raise HTTPException(status_code=502, detail="Respuesta del proveedor sin texto.") from error
    if not isinstance(contenido, str) or not contenido.strip():
        raise HTTPException(status_code=502, detail="Respuesta del proveedor sin texto.")
    return contenido


def _json_safe(valor: Any) -> Any:
    if isinstance(valor, float):
        return float(valor)
    if isinstance(valor, dict):
        return {k: _json_safe(v) for k, v in valor.items()}
    if isinstance(valor, (list, tuple)):
        return [_json_safe(v) for v in valor]
    return valor


def _payload_resolucion(resultado: Dict[str, Any], user_id: str, tipo: str) -> Dict[str, Any]:
    semantica = resultado.get("semantica") or {}
    return {
        "user_id": user_id,
        "tipo": tipo,
        "metodo": resultado.get("metodo", "all"),
        "a": resultado.get("A"),
        "b": resultado.get("B"),
        "x": resultado.get("x"),
        "diagnostico": resultado.get("diagnostico"),
        "semantica": semantica,
        "traza": resultado.get("traza") or [],
        "soluciones": resultado.get("soluciones") or {},
        "residuos": resultado.get("residuos") or {},
        "abortado": bool(resultado.get("abortado")),
    }


app = FastAPI(
    title="TechChip Agent API",
    description="Resolución AX=B con Gauss, Gauss-Jordan e inversa para TechChip Systems S.A.",
    version="1.0.0",
)

_settings_boot = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=_settings_boot.origins or ["http://localhost:3000"],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> Dict[str, str]:
    return {"status": "ok", "servicio": "techchip-agent"}


@app.get("/api/modelo-base")
def modelo_base(_usuario: Dict[str, Any] = Depends(usuario_actual)) -> Dict[str, Any]:
    return MatrixIO.modelo_embebido()


@app.get("/api/modelo-8x8")
def modelo_8x8(_usuario: Dict[str, Any] = Depends(usuario_actual)) -> Dict[str, Any]:
    return MatrixIO.modelo_8x8()


@app.post("/api/resolver")
def resolver(
    body: ResolverBody,
    usuario: Dict[str, Any] = Depends(usuario_actual),
    settings: Settings = Depends(get_settings),
) -> Dict[str, Any]:
    try:
        modelo = normalizar_modelo(
            {
                "planta": "TechChip Systems S.A.",
                "A": body.A,
                "B": body.B,
                "variables": body.variables,
                "recursos": body.recursos,
            }
        )
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    agente = TechChipAgent(modelo=modelo)
    try:
        resultado = agente.resolver(method=body.method, verbose=False, trazar=False)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    except SingularSystemError as error:
        diagnostico = dict(error.diagnostico or {})
        if "familia" not in diagnostico:
            diagnostico["familia"] = analizar_familia(
                modelo["A"], modelo["B"], modelo.get("variables")
            )
        resultado = {
            "diagnostico": diagnostico,
            "abortado": True,
            "soluciones": {},
            "traza": [],
            "metodo": body.method,
            "A": modelo["A"],
            "B": modelo["B"],
            "variables": modelo["variables"],
            "recursos": modelo["recursos"],
            "x": None,
            "semantica": {
                "factible": False,
                "negativos": [],
                "lineas_plan": list((diagnostico.get("familia") or {}).get("lineas") or []),
                "mensaje": str(error),
                "balance_recursos": [],
                "cuellos_botella": [],
            },
        }

    respuesta = _json_safe(resultado)
    if body.persistir and not settings.auth_disabled and settings.supabase_url:
        fila = insertar_resolucion(
            settings,
            usuario.get("_raw"),
            _payload_resolucion(respuesta, usuario["sub"], "resolver"),
        )
        respuesta["id"] = fila.get("id")
    return respuesta


@app.post("/api/estres")
def estres(
    body: EstresBody,
    usuario: Dict[str, Any] = Depends(usuario_actual),
    settings: Settings = Depends(get_settings),
) -> Dict[str, Any]:
    suite = StressSuite(imprimir=False)
    resumen = _json_safe(suite.ejecutar_detalle())
    if body.persistir and not settings.auth_disabled and settings.supabase_url:
        modelo = MatrixIO.modelo_embebido()
        fila = insertar_resolucion(
            settings,
            usuario.get("_raw"),
            {
                "user_id": usuario["sub"],
                "tipo": "estres",
                "metodo": "all",
                "a": modelo["A"],
                "b": modelo["B"],
                "x": None,
                "diagnostico": {"exitoso": resumen["exitoso"], "aprobadas": resumen["aprobadas"]},
                "semantica": {
                    "factible": resumen["exitoso"],
                    "mensaje": f"{resumen['aprobadas']}/{resumen['total']} pruebas satisfactorias.",
                    "lineas_plan": [],
                    "negativos": [],
                },
                "traza": [],
                "soluciones": {},
                "residuos": {},
                "abortado": not resumen["exitoso"],
            },
        )
        resumen["id"] = fila.get("id")
    return resumen


@app.get("/api/historial")
def historial(
    usuario: Dict[str, Any] = Depends(usuario_actual),
    settings: Settings = Depends(get_settings),
) -> List[Dict[str, Any]]:
    if settings.auth_disabled or not settings.supabase_url:
        return []
    return listar_resoluciones(settings, usuario.get("_raw"), usuario["sub"])


@app.post("/api/v1/parse-text", response_model=MatrixExtractionResponse)
def parse_text(
    body: ParseTextBody,
    _usuario: Dict[str, Any] = Depends(usuario_actual),
    settings: Settings = Depends(get_settings),
) -> MatrixExtractionResponse:
    crudo = _pedir_extraccion(settings, body.texto)
    try:
        datos = _objeto_json(crudo)
        return MatrixExtractionResponse.model_validate(datos)
    except (ValueError, json.JSONDecodeError) as error:
        raise HTTPException(
            status_code=422,
            detail=f"El enunciado no produjo una matriz 6×6 válida. {error}",
        ) from error
