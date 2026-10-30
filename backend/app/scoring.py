"""Rúbrica determinista: las puntuaciones y la brecha se calculan aquí, nunca las pide el modelo.

Pesos de la especificación (experimentales, visibles en la interfaz):
  conceptos recuperados 40 % · relaciones/causas 30 % · transferencia 30 %.
"""

import unicodedata

PESOS = {"concept_recall": 40, "causal_explanation": 30, "transfer": 30}
# regla de producto preliminar, no un corte validado
UMBRAL_BRECHA = 20

VALOR_ESTADO = {"demostrado": 1.0, "por_verificar": 0.5, "omitido": 0.0, "incorrecto": 0.0}
VALOR_PUNTO = {"cumplido": 1.0, "parcial": 0.5, "no": 0.0}
PESO_ESENCIAL = 2.0


def normalizar(texto: str) -> str:
    sin_tildes = unicodedata.normalize("NFD", texto.lower())
    sin_tildes = "".join(c for c in sin_tildes if unicodedata.category(c) != "Mn")
    solo = "".join(c if c.isalnum() else " " for c in sin_tildes)
    return " ".join(solo.split())


def cita_verificada(cita: str | None, texto: str) -> bool:
    """La cita debe aparecer en el texto del estudiante (ignorando mayúsculas, tildes y puntuación)."""
    if not cita:
        return False
    c = normalizar(cita)
    return len(c) >= 3 and c in normalizar(texto)


def _redondear(x: float) -> float:
    return round(x * 100, 1)


def recuperacion(conceptos: list[dict]) -> float | None:
    evaluados = [c for c in conceptos if c.get("status")]
    if not evaluados:
        return None
    pesos = [PESO_ESENCIAL if c["essential"] else 1.0 for c in evaluados]
    total = sum(VALOR_ESTADO[c["status"]] * p for c, p in zip(evaluados, pesos))
    return _redondear(total / sum(pesos))


def causal(conceptos: list[dict]) -> float | None:
    """Fracción de conceptos esenciales con una relación o mecanismo explicado y respaldado por cita verificada."""
    evaluados = [c for c in conceptos if c.get("status")]
    if not evaluados:
        return None
    base = [c for c in evaluados if c["essential"]] or evaluados
    con_relacion = [
        c
        for c in base
        if c.get("shows_relation") and c.get("evidence_verified") and c["status"] in ("demostrado", "por_verificar")
    ]
    return _redondear(len(con_relacion) / len(base))


def transferencia(puntos: list[dict]) -> float:
    if not puntos:
        return 0.0
    return _redondear(sum(VALOR_PUNTO[p["status"]] for p in puntos) / len(puntos))


def calcular(conceptos: list[dict], transfer_pct: float | None, confianza: int | None) -> dict:
    r = recuperacion(conceptos)
    c = causal(conceptos)
    scores = {
        "concept_recall_pct": r,
        "causal_explanation_pct": c,
        "transfer_pct": transfer_pct,
        "provisional_performance_pct": None,
        "performance_pct": None,
        "calibration_gap_points": None,
        "status": "pendiente",
        "weights": PESOS,
    }
    if r is None or c is None:
        return scores

    w_r, w_c, w_t = PESOS["concept_recall"], PESOS["causal_explanation"], PESOS["transfer"]
    # provisional: se reescala con las dos dimensiones disponibles (sin transferencia)
    provisional = round((w_r * r + w_c * c) / (w_r + w_c), 1)
    scores["provisional_performance_pct"] = provisional
    scores["status"] = "provisional"
    desempeno = provisional

    if transfer_pct is not None:
        desempeno = round((w_r * r + w_c * c + w_t * transfer_pct) / 100, 1)
        scores["performance_pct"] = desempeno
        scores["status"] = "final"

    if confianza is not None:
        scores["calibration_gap_points"] = round(confianza - desempeno, 1)
    return scores


def calibracion(scores: dict, conceptos: list[dict], confianza: int | None) -> dict | None:
    brecha = scores.get("calibration_gap_points")
    if brecha is None or confianza is None:
        return None
    provisional = scores["status"] != "final"
    # prioridad: incorrectos, luego esenciales no demostrados, luego el resto
    prioridad = {"incorrecto": 0, "omitido": 1, "por_verificar": 2}
    no_demostrados = sorted(
        (c for c in conceptos if c.get("status") in prioridad),
        key=lambda c: (prioridad[c["status"]] > 0, not c["essential"], prioridad[c["status"]]),
    )
    a_practicar = [c["title"] for c in no_demostrados][:2]
    foco = " y ".join(a_practicar) if a_practicar else None

    if brecha >= UMBRAL_BRECHA:
        label = "posible_sobreestimacion"
        titulo = "Posible sobreestimación"
        explicacion = (
            f"Tu confianza ({confianza} %) superó en {brecha:g} puntos lo que demostraste en esta sesión. "
            "Reconocer un tema en tus apuntes no es lo mismo que poder explicarlo y aplicarlo sin mirarlos."
        )
    elif brecha <= -UMBRAL_BRECHA:
        label = "posible_subestimacion"
        titulo = "Posible subestimación"
        explicacion = (
            f"Demostraste {abs(brecha):g} puntos más de lo que esperabas. "
            "Puede que sepas más de lo que crees: confía un poco más en tu recuperación."
        )
    else:
        label = "alineado"
        titulo = "Confianza y desempeño alineados"
        explicacion = (
            f"La diferencia es de {brecha:+g} puntos: tu percepción coincide razonablemente con lo que demostraste."
        )

    if foco:
        recomendacion = (
            f"Practica primero: {foco}. Intenta explicarlo en voz alta sin apuntes y "
            "comprueba después con el material; repite la prueba mañana sin repasar antes."
        )
    else:
        recomendacion = (
            "Cubriste los conceptos del material. Para consolidarlo, vuelve a evaluarte mañana sin repasar antes "
            "y prueba con una pregunta de aplicación distinta."
        )

    return {
        "gap_points": brecha,
        "label": label,
        "title": titulo,
        "explanation": explicacion,
        "recommendation": recomendacion,
        "threshold_points": UMBRAL_BRECHA,
        "provisional": provisional,
    }
