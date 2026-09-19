"""Persistencia de resoluciones en PostgREST (RLS con el JWT del usuario)."""

from __future__ import annotations

from typing import Any, Dict, List, Optional

import httpx
from fastapi import HTTPException

from api.settings import Settings


def _headers(settings: Settings, access_token: Optional[str]) -> Dict[str, str]:
    if not settings.supabase_url or not settings.supabase_anon_key:
        raise HTTPException(
            status_code=503,
            detail="Supabase no está configurado (SUPABASE_URL / SUPABASE_ANON_KEY).",
        )
    token = access_token or settings.supabase_anon_key
    return {
        "apikey": settings.supabase_anon_key,
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }


def insertar_resolucion(
    settings: Settings,
    access_token: Optional[str],
    fila: Dict[str, Any],
) -> Dict[str, Any]:
    url = settings.supabase_url.rstrip("/") + "/rest/v1/resoluciones"
    respuesta = httpx.post(url, headers=_headers(settings, access_token), json=fila, timeout=20.0)
    if respuesta.status_code >= 400:
        raise HTTPException(status_code=respuesta.status_code, detail=respuesta.text)
    datos = respuesta.json()
    return datos[0] if isinstance(datos, list) and datos else datos


def listar_resoluciones(
    settings: Settings,
    access_token: Optional[str],
    user_id: str,
    limite: int = 50,
) -> List[Dict[str, Any]]:
    url = settings.supabase_url.rstrip("/") + "/rest/v1/resoluciones"
    params = {
        "user_id": f"eq.{user_id}",
        "select": "*",
        "order": "created_at.desc",
        "limit": str(limite),
    }
    respuesta = httpx.get(
        url, headers=_headers(settings, access_token), params=params, timeout=20.0
    )
    if respuesta.status_code >= 400:
        raise HTTPException(status_code=respuesta.status_code, detail=respuesta.text)
    return respuesta.json()
