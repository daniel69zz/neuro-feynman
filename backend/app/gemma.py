"""Cliente de Gemma 4 por la Gemini API.

Mismas lecciones que en Predictia:
- thinking_level MINIMAL (si el modelo lo rechaza con 400, se desactiva solo).
- Reintentos ante 5xx / 429 / tiempo agotado; un reintento extra recordando el formato si el JSON no valida.
- Extracción tolerante del JSON (Gemma lo envuelve en ```json) y validación estricta con Pydantic.
- Nunca se inventa una respuesta: si todo falla, se lanza ErrorGemma y la interfaz ofrece reintentar.
"""

import asyncio
import json
import re
import time
from dataclasses import dataclass
from typing import TypeVar

from google import genai
from google.genai import errors, types
from pydantic import BaseModel, ValidationError

from . import config

T = TypeVar("T", bound=BaseModel)

TIEMPO_LIMITE_S = 45
REINTENTOS_RED = 2

_cliente: genai.Client | None = None
_pensamiento_minimo = config.PENSAMIENTO_MINIMO


class ErrorGemma(Exception):
    def __init__(self, mensaje: str, raw: str | None = None):
        super().__init__(mensaje)
        self.raw = raw


@dataclass
class Resultado:
    datos: BaseModel
    latencia_ms: int
    intentos: int
    raw: str


def _obtener_cliente() -> genai.Client:
    global _cliente
    if not config.API_KEY:
        raise ErrorGemma("Falta GEMINI_API_KEY en backend/.env")
    if _cliente is None:
        _cliente = genai.Client(api_key=config.API_KEY)
    return _cliente


def extraer_json(texto: str) -> dict:
    limpio = re.sub(r"```(?:json)?", "", texto).strip()
    inicio, fin = limpio.find("{"), limpio.rfind("}")
    if inicio == -1 or fin <= inicio:
        raise ValueError("La respuesta no contiene un objeto JSON")
    return json.loads(limpio[inicio : fin + 1])


def _es_reintentable(e: Exception) -> bool:
    if isinstance(e, asyncio.TimeoutError):
        return True
    if isinstance(e, errors.APIError):
        return e.code == 429 or (e.code or 0) >= 500
    return False


async def _llamar(partes: list) -> str:
    global _pensamiento_minimo
    cfg = types.GenerateContentConfig(temperature=0.2)
    if _pensamiento_minimo:
        cfg.thinking_config = types.ThinkingConfig(thinking_level=types.ThinkingLevel.MINIMAL)
    try:
        resp = await asyncio.wait_for(
            _obtener_cliente().aio.models.generate_content(model=config.MODELO, contents=partes, config=cfg),
            timeout=TIEMPO_LIMITE_S,
        )
    except errors.APIError as e:
        # algunos modelos no aceptan thinking_level: se apaga y se repite una vez
        if _pensamiento_minimo and e.code == 400 and "thinking" in (e.message or "").lower():
            _pensamiento_minimo = False
            return await _llamar(partes)
        raise
    return resp.text or ""


async def consultar(prompt: str, esquema: type[T], imagen: bytes | None = None) -> Resultado:
    """Envía el prompt (y la imagen opcional) y devuelve la salida validada contra `esquema`."""
    inicio = time.monotonic()
    intentos = 0
    raw = ""
    recordatorio = ""
    ultimo_error = "sin respuesta"

    for intento_formato in range(2):
        partes: list = []
        if imagen is not None:
            partes.append(types.Part.from_bytes(data=imagen, mime_type="image/jpeg"))
        partes.append(prompt + recordatorio)

        for intento_red in range(REINTENTOS_RED + 1):
            intentos += 1
            try:
                raw = await _llamar(partes)
                break
            except Exception as e:  # noqa: BLE001
                ultimo_error = _describir(e)
                if not _es_reintentable(e) or intento_red == REINTENTOS_RED:
                    raise ErrorGemma(ultimo_error) from e
                await asyncio.sleep(1.5 * (intento_red + 1))

        try:
            datos = esquema.model_validate(extraer_json(raw))
            return Resultado(datos, int((time.monotonic() - inicio) * 1000), intentos, raw)
        except (ValueError, ValidationError) as e:
            ultimo_error = f"Gemma devolvió un formato inválido: {str(e)[:300]}"
            recordatorio = (
                "\n\nIMPORTANTE: tu respuesta anterior no cumplía el formato. "
                "Responde SOLO con un objeto JSON válido que siga exactamente el esquema pedido."
            )

    raise ErrorGemma(ultimo_error, raw)


def _describir(e: Exception) -> str:
    if isinstance(e, asyncio.TimeoutError):
        return f"Gemma tardó más de {TIEMPO_LIMITE_S} s en responder"
    if isinstance(e, errors.APIError):
        return f"Gemini API {e.code} {e.status or ''}: {(e.message or '')[:200]}".strip()
    if isinstance(e, ErrorGemma):
        return str(e)
    return f"{type(e).__name__}: {e}"
