"""Validación del JWT de Supabase (HS256 legado o JWKS ES256/RS256)."""

from __future__ import annotations

from functools import lru_cache
from typing import Any, Dict, Optional

import jwt
from fastapi import Depends, Header, HTTPException
from jwt import PyJWKClient, InvalidTokenError

from api.settings import Settings, get_settings


class AuthError(HTTPException):
    def __init__(self, detail: str = "No autorizado") -> None:
        super().__init__(status_code=401, detail=detail)


def _bearer(authorization: Optional[str]) -> str:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise AuthError("Falta el encabezado Authorization: Bearer <token>.")
    token = authorization.split(" ", 1)[1].strip()
    if not token:
        raise AuthError("Token vacío.")
    return token


@lru_cache
def _jwks_client(url: str) -> PyJWKClient:
    return PyJWKClient(url)


def verificar_token(token: str, settings: Settings) -> Dict[str, Any]:
    opciones = {"verify_aud": True}
    if settings.supabase_jwt_secret:
        try:
            return jwt.decode(
                token,
                settings.supabase_jwt_secret,
                algorithms=["HS256"],
                audience="authenticated",
                options=opciones,
            )
        except InvalidTokenError as error:
            raise AuthError(f"JWT inválido: {error}") from error

    if not settings.supabase_url:
        raise AuthError("SUPABASE_URL no está configurada en la API.")

    jwks_url = settings.supabase_url.rstrip("/") + "/auth/v1/.well-known/jwks.json"
    try:
        clave = _jwks_client(jwks_url).get_signing_key_from_jwt(token).key
        return jwt.decode(
            token,
            clave,
            algorithms=["ES256", "RS256"],
            audience="authenticated",
            options=opciones,
        )
    except InvalidTokenError as error:
        raise AuthError(f"JWT inválido: {error}") from error


def _anonimo() -> Dict[str, Any]:
    return {"sub": "00000000-0000-0000-0000-000000000001", "email": "dev@localhost"}


def usuario_actual(
    authorization: Optional[str] = Header(default=None),
    settings: Settings = Depends(get_settings),
) -> Dict[str, Any]:
    if (
        settings.auth_disabled
        or not authorization
        or not authorization.lower().startswith("bearer ")
    ):
        return _anonimo()
    token = _bearer(authorization)
    payload = verificar_token(token, settings)
    if not payload.get("sub"):
        raise AuthError("El token no contiene sub (user id).")
    payload["_raw"] = token
    return payload
