"""Condiciones del entorno al estudiar (luz y ruido) y cómo pudieron influir en el resultado.

Las mide el navegador al enviar el apunte: cámara frontal (luz, contraluz, grano del sensor) y
micrófono durante unos segundos (nivel de ruido). Aquí solo llegan números; ni la foto ni el audio.
Reglas deterministas y orientativas: con una sola sesión no se puede afirmar causalidad.
"""

from . import schemas

# umbrales preliminares de producto (micrófono y cámara sin calibrar)
LUZ_BAJA = 75
LUZ_MUY_BAJA = 45
GRANO_ALTO = 6.0
CONTRALUZ = 45
SONIDO_MODERADO_DBFS = -50
SONIDO_ALTO_DBFS = -38
# a partir de aquí el resultado se considera "te fue peor de lo esperado"
DESEMPENO_BAJO = 60


def evaluar(e: schemas.EntornoMedido, scores: dict) -> schemas.EntornoPublico:
    factores: list[schemas.FactorEntorno] = []

    if e.brillo is not None:
        if e.brillo < LUZ_MUY_BAJA or (e.brillo < LUZ_BAJA and (e.grano or 0) > GRANO_ALTO):
            factores.append(
                schemas.FactorEntorno(
                    id="luz",
                    nivel="alto",
                    titulo="Iluminación muy baja",
                    detalle=f"Luz medida: {round(e.brillo / 255 * 100)} %"
                    + (f", con grano del sensor ({e.grano:.1f}) típico de poca luz." if (e.grano or 0) > GRANO_ALTO else "."),
                    sugerencia="Estudia con luz cenital o de ventana sobre la mesa; la poca luz aumenta la fatiga visual y baja el estado de alerta.",
                )
            )
        elif e.brillo < LUZ_BAJA:
            factores.append(
                schemas.FactorEntorno(
                    id="luz",
                    nivel="aviso",
                    titulo="Iluminación baja",
                    detalle=f"Luz medida: {round(e.brillo / 255 * 100)} %.",
                    sugerencia="Añade una lámpara de escritorio dirigida al cuaderno, no a la pantalla.",
                )
            )
        else:
            factores.append(
                schemas.FactorEntorno(
                    id="luz", nivel="ok", titulo="Iluminación adecuada",
                    detalle=f"Luz medida: {round(e.brillo / 255 * 100)} %.", sugerencia=None,
                )
            )

    if e.contraluz is not None and e.contraluz > CONTRALUZ:
        factores.append(
            schemas.FactorEntorno(
                id="contraluz",
                nivel="aviso",
                titulo="Contraluz",
                detalle="El fondo está mucho más iluminado que tú (ventana o lámpara detrás).",
                sugerencia="Gira la mesa para que la luz llegue de lado o de frente; el deslumbramiento cansa la vista.",
            )
        )

    if e.sonido_dbfs is not None:
        if e.sonido_dbfs > SONIDO_ALTO_DBFS:
            factores.append(
                schemas.FactorEntorno(
                    id="ruido",
                    nivel="alto",
                    titulo="Ambiente ruidoso",
                    detalle=f"Nivel medio ≈ {e.sonido_dbfs:.0f} dBFS (micrófono sin calibrar).",
                    sugerencia="Busca un lugar silencioso o usa tapones. Las conversaciones de fondo interfieren con la "
                    "memoria de trabajo verbal, la que usas al explicar; la música con letra también.",
                )
            )
        elif e.sonido_dbfs > SONIDO_MODERADO_DBFS:
            factores.append(
                schemas.FactorEntorno(
                    id="ruido",
                    nivel="aviso",
                    titulo="Ruido moderado",
                    detalle=f"Nivel medio ≈ {e.sonido_dbfs:.0f} dBFS (micrófono sin calibrar).",
                    sugerencia="Si hay voces o música con letra, prueba con silencio o ruido constante (ventilador, ruido blanco).",
                )
            )
        else:
            factores.append(
                schemas.FactorEntorno(
                    id="ruido", nivel="ok", titulo="Ambiente tranquilo",
                    detalle=f"Nivel medio ≈ {e.sonido_dbfs:.0f} dBFS.", sugerencia=None,
                )
            )

    desempeno = scores.get("performance_pct") or scores.get("provisional_performance_pct")
    brecha = scores.get("calibration_gap_points")
    bajo = (desempeno is not None and desempeno < DESEMPENO_BAJO) or (brecha is not None and brecha >= 20)
    adversos = [f for f in factores if f.nivel != "ok"]

    if e.brillo is None and e.sonido_dbfs is None:
        nota = "No se pudo medir el entorno (sin permiso de cámara ni de micrófono)."
    elif bajo and adversos:
        nota = (
            "Tu resultado fue más bajo de lo esperado y tu entorno tenía condiciones que suelen dificultar el estudio. "
            "Podrían haber influido, aunque con una sola sesión no se puede confirmar: repite la prueba en mejores "
            "condiciones y compara."
        )
    elif bajo:
        nota = "Tu entorno parecía adecuado, así que la luz y el ruido probablemente no explican la diferencia: céntrate en los conceptos a repasar."
    elif adversos:
        nota = "Te fue bien a pesar de estas condiciones; mejorarlas puede ayudarte en sesiones más largas."
    else:
        nota = "Tu entorno era adecuado para estudiar."

    return schemas.EntornoPublico(medido=e, factores=factores, posible_influencia=bool(bajo and adversos), nota=nota)
