"""API FastAPI: envuelve TechChipAgent y valida JWT de Supabase."""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Any, Dict, List, Literal, Optional

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from techchip_agent import (  # noqa: E402
    MatrixIO,
    SingularSystemError,
    StressSuite,
    TechChipAgent,
    VARIABLES_BASE,
    RECURSOS_BASE,
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


@app.post("/api/resolver")
def resolver(
    body: ResolverBody,
    usuario: Dict[str, Any] = Depends(usuario_actual),
    settings: Settings = Depends(get_settings),
) -> Dict[str, Any]:
    modelo = {
        "planta": "TechChip Systems S.A.",
        "A": body.A,
        "B": body.B,
        "variables": body.variables or list(VARIABLES_BASE),
        "recursos": body.recursos or list(RECURSOS_BASE),
    }
    agente = TechChipAgent(modelo=modelo)
    try:
        resultado = agente.resolver(method=body.method, verbose=False, trazar=False)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    except SingularSystemError as error:
        resultado = {
            "diagnostico": error.diagnostico,
            "abortado": True,
            "soluciones": {},
            "traza": [],
            "metodo": body.method,
            "A": body.A,
            "B": body.B,
            "x": None,
            "semantica": {
                "factible": False,
                "negativos": [],
                "lineas_plan": [],
                "mensaje": str(error),
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
