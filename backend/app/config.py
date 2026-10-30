"""Configuración leída de backend/.env (la API key nunca sale del backend)."""

import os
from pathlib import Path

from dotenv import load_dotenv

BACKEND_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BACKEND_DIR / ".env")

API_KEY = os.getenv("GEMINI_API_KEY", "")
MODELO = os.getenv("GEMMA_MODEL", "gemma-4-26b-a4b-it")
# live = Gemma real · demo = respuestas SIMULADAS (solo para probar la interfaz, siempre rotuladas)
MODO = "demo" if os.getenv("GEMMA_MODE") == "demo" else "live"
# minimal = sin razonamiento interno previo: medido ~580 tokens menos por consulta, misma respuesta
PENSAMIENTO_MINIMO = os.getenv("GEMMA_THINKING", "minimal") != "default"

EJEMPLOS_DIR = BACKEND_DIR / "ejemplos"
MAX_IMAGEN_BYTES = 10 * 1024 * 1024
DURACION_SESION_S = 2 * 60 * 60

DISCLAIMER = (
    "Evaluación educativa exploratoria de esta sesión. No es un diagnóstico clínico ni neurológico "
    "y no mide sinapsis, hipocampo ni actividad cerebral."
)
