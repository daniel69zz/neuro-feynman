"""Motor de sesiones en memoria (TTL 2 h). Cada llamada a Gemma corre en segundo plano y el frontend
consulta el estado (`pending | ready | error`). Nada de lo que devuelve Gemma se usa sin validar y
verificar sus citas contra el texto real del estudiante.
"""

import asyncio
import re
import time
import uuid
from dataclasses import dataclass, field

from . import config, gemma, prompts, schemas, scoring, simulado

MAX_INTENTOS_TRANSFERENCIA = 2
PALABRAS_MIN_DEMOSTRADO = 5


class ErrorSesion(Exception):
    def __init__(self, mensaje: str, codigo: int = 409):
        super().__init__(mensaje)
        self.codigo = codigo


@dataclass
class Tarea:
    estado: str = "idle"
    error: str | None = None
    latencia_ms: int | None = None
    intentos: int | None = None
    simulado: bool = False
    raw: str | None = None


@dataclass
class Sesion:
    id: str
    creada: float
    ejemplo: str | None = None
    imagen: bytes | None = None
    topic: str | None = None
    source_quality: str | None = None
    quality_note: str | None = None
    # conceptos tal como los extrajo Gemma (para mostrar) y luego los revisados por el estudiante
    conceptos: list[dict] = field(default_factory=list)
    conceptos_confirmados: bool = False
    confianza: int | None = None
    explicacion: str | None = None
    segundos: int | None = None
    incertidumbre: str | None = None
    pregunta: str | None = None
    conceptos_objetivo: list[str] = field(default_factory=list)
    # solo servidor: nunca se envía antes del intento del estudiante
    puntos_esperados: list[dict] = field(default_factory=list)
    intentos_transferencia: list[dict] = field(default_factory=list)
    respuesta_pendiente: str | None = None
    tareas: dict[str, Tarea] = field(
        default_factory=lambda: {"extraccion": Tarea(), "analisis": Tarea(), "transferencia": Tarea()}
    )


_sesiones: dict[str, Sesion] = {}
_en_curso: set[asyncio.Task] = set()


def _limpiar() -> None:
    ahora = time.time()
    for sid in [s.id for s in _sesiones.values() if ahora - s.creada > config.DURACION_SESION_S]:
        del _sesiones[sid]


def obtener(sid: str) -> Sesion:
    _limpiar()
    s = _sesiones.get(sid)
    if s is None:
        raise ErrorSesion("La sesión no existe o expiró (duran 2 horas).", 404)
    return s


def _lanzar(s: Sesion, nombre: str, llamada_real, llamada_simulada, aplicar) -> None:
    # se marca "pending" antes de responder, para que el frontend empiece a consultar el estado
    s.tareas[nombre] = Tarea(estado="pending", simulado=config.MODO == "demo")
    t = asyncio.create_task(_ejecutar(s, nombre, llamada_real, llamada_simulada, aplicar))
    _en_curso.add(t)
    t.add_done_callback(_en_curso.discard)


async def _ejecutar(s: Sesion, nombre: str, llamada_real, llamada_simulada, aplicar) -> None:
    tarea = s.tareas[nombre]
    try:
        if config.MODO == "demo":
            inicio = time.monotonic()
            datos = await llamada_simulada()
            tarea.latencia_ms, tarea.intentos = int((time.monotonic() - inicio) * 1000), 1
        else:
            r = await llamada_real()
            datos, tarea.latencia_ms, tarea.intentos, tarea.raw = r.datos, r.latencia_ms, r.intentos, r.raw
        aplicar(datos)
        tarea.estado = "ready"
    except gemma.ErrorGemma as e:
        tarea.estado, tarea.error, tarea.raw = "error", str(e), e.raw
    except Exception as e:  # noqa: BLE001
        tarea.estado, tarea.error = "error", f"Error interno: {type(e).__name__}: {e}"


# ---------- Etapa 1: extracción desde la imagen ----------


def crear(imagen: bytes, ejemplo: str | None = None) -> Sesion:
    _limpiar()
    s = Sesion(id=uuid.uuid4().hex[:12], creada=time.time(), ejemplo=ejemplo, imagen=imagen)
    _sesiones[s.id] = s
    lanzar_extraccion(s)
    return s


def crear_repaso(revisados: schemas.ConceptosRevisados) -> Sesion:
    """Prueba espaciada: reutiliza los conceptos de un intento anterior, sin imagen ni nueva extracción."""
    _limpiar()
    s = Sesion(id=uuid.uuid4().hex[:12], creada=time.time(), ejemplo="repaso", source_quality="ok")
    s.tareas["extraccion"] = Tarea(estado="ready")
    _sesiones[s.id] = s
    revisar_conceptos(s, revisados)
    return s


def lanzar_extraccion(s: Sesion) -> None:
    if s.imagen is None:
        raise ErrorSesion("Esta sesión no tiene imagen.")
    if s.tareas["extraccion"].estado == "pending":
        return

    def aplicar(d: schemas.ExtraccionIA) -> None:
        s.topic = d.topic or None
        s.source_quality = d.source_quality
        s.quality_note = d.quality_note or None
        s.conceptos = _ids_unicos([c.model_dump() for c in d.concepts])
        if not s.conceptos and s.source_quality == "ok":
            s.source_quality = "needs_review"
            s.quality_note = "No se detectaron conceptos en la imagen."

    _lanzar(
        s,
        "extraccion",
        lambda: gemma.consultar(prompts.extraccion(), schemas.ExtraccionIA, s.imagen),
        simulado.extraccion,
        aplicar,
    )


def _slug(texto: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", scoring.normalizar(texto)).strip("-")[:40] or "concepto"


def _ids_unicos(conceptos: list[dict]) -> list[dict]:
    vistos: set[str] = set()
    for c in conceptos:
        base = _slug(c.get("id") or c["title"])
        cid, n = base, 2
        while cid in vistos:
            cid, n = f"{base}-{n}", n + 1
        c["id"] = cid
        vistos.add(cid)
    return conceptos


# ---------- Revisión, confianza y explicación ----------


def revisar_conceptos(s: Sesion, r: schemas.ConceptosRevisados) -> None:
    if s.tareas["extraccion"].estado == "pending":
        raise ErrorSesion("Espera a que termine la extracción.")
    if s.explicacion is not None:
        raise ErrorSesion("Los conceptos ya no se pueden cambiar: la explicación fue enviada.")
    s.topic = r.topic.strip()
    s.conceptos = _ids_unicos(
        [
            {
                "id": c.id,
                "title": c.title.strip(),
                "kind": c.kind,
                "source_evidence": c.source_evidence.strip() or "Añadido por el estudiante",
                "essential": c.essential,
            }
            for c in r.concepts
        ]
    )
    s.conceptos_confirmados = True


def fijar_confianza(s: Sesion, valor: int) -> None:
    if not s.conceptos_confirmados:
        raise ErrorSesion("Primero confirma los conceptos del material.")
    if s.explicacion is not None:
        raise ErrorSesion("La confianza se declara antes de explicar y ya no se puede cambiar.")
    s.confianza = valor


def enviar_explicacion(s: Sesion, e: schemas.Explicacion) -> None:
    if s.confianza is None:
        raise ErrorSesion("Primero declara tu confianza.")
    if s.explicacion is not None:
        raise ErrorSesion("La explicación ya fue enviada.")
    s.explicacion = e.texto.strip()
    s.segundos = e.segundos
    lanzar_analisis(s)


# ---------- Etapa 2: análisis de brechas + pregunta de transferencia ----------


def lanzar_analisis(s: Sesion) -> None:
    if s.explicacion is None:
        raise ErrorSesion("Falta la explicación.")
    if s.tareas["analisis"].estado == "pending":
        return
    if s.intentos_transferencia:
        raise ErrorSesion("El análisis ya se usó para la transferencia.")

    def aplicar(d: schemas.AnalisisIA) -> None:
        por_id = {ev.id: ev for ev in d.concepts}
        for c in s.conceptos:
            ev = por_id.get(c["id"])
            if ev is None:
                # Gemma no evaluó este concepto: no se inventa un estado favorable
                c.update(
                    status="por_verificar",
                    student_evidence=None,
                    evidence_verified=None,
                    shows_relation=False,
                    downgraded=True,
                    feedback="El modelo no devolvió una evaluación para este concepto; revísalo manualmente.",
                    corrective_question=f"¿Qué sabes de «{c['title']}»?",
                )
                continue
            _aplicar_evaluacion(c, ev, s.explicacion or "")
        validos = {c["id"] for c in s.conceptos}
        s.pregunta = d.transfer_question.strip()
        s.conceptos_objetivo = [i for i in d.target_concept_ids if i in validos]
        s.puntos_esperados = [p.model_dump() for p in d.expected_points]
        s.incertidumbre = d.uncertainty or None

    _lanzar(
        s,
        "analisis",
        lambda: gemma.consultar(
            prompts.analisis(s.topic or "", s.conceptos, s.explicacion or ""), schemas.AnalisisIA
        ),
        lambda: simulado.analisis(s.conceptos, s.explicacion or ""),
        aplicar,
    )


def _aplicar_evaluacion(c: dict, ev: schemas.EvaluacionConceptoIA, texto: str) -> None:
    estado = ev.status
    cita = ev.student_evidence.strip() if ev.student_evidence else None
    verificada = scoring.cita_verificada(cita, texto) if cita else None
    bajado = False
    feedback = ev.feedback
    pregunta = ev.corrective_question

    # "demostrado" exige una cita que exista de verdad en la explicación
    if estado == "demostrado" and not verificada:
        estado, bajado = "por_verificar", True
        feedback += " (Se marcó por verificar: la cita del modelo no aparece literalmente en tu explicación.)"
        pregunta = pregunta or f"¿Puedes explicar «{c['title']}» con tus palabras y un ejemplo?"
    # nombrar un término no demuestra comprensión: una cita de pocas palabras queda por verificar
    elif estado == "demostrado" and len(scoring.normalizar(cita or "").split()) < PALABRAS_MIN_DEMOSTRADO:
        estado, bajado = "por_verificar", True
        feedback += " (Se marcó por verificar: solo aparece el término, falta explicar qué hace o por qué.)"
        pregunta = pregunta or f"¿Puedes explicar «{c['title']}» con tus palabras y un ejemplo?"
    if estado == "omitido":
        cita, verificada = None, None
    if estado != "demostrado" and not pregunta:
        pregunta = f"¿Qué papel cumple «{c['title']}» en este tema?"

    c.update(
        status=estado,
        student_evidence=cita,
        evidence_verified=verificada,
        shows_relation=bool(ev.shows_relation and verificada),
        downgraded=bajado,
        feedback=feedback,
        corrective_question=pregunta if estado != "demostrado" else None,
    )


# ---------- Etapa 3: evaluación de la transferencia ----------


def enviar_transferencia(s: Sesion, respuesta: str) -> None:
    if s.pregunta is None or s.tareas["analisis"].estado != "ready":
        raise ErrorSesion("La pregunta de transferencia todavía no está lista.")
    if s.tareas["transferencia"].estado == "pending":
        raise ErrorSesion("Ya se está evaluando una respuesta.")
    if len(s.intentos_transferencia) >= MAX_INTENTOS_TRANSFERENCIA:
        raise ErrorSesion("Ya usaste todos los intentos de esta pregunta.")
    s.respuesta_pendiente = respuesta.strip()
    lanzar_transferencia(s)


def lanzar_transferencia(s: Sesion) -> None:
    respuesta = s.respuesta_pendiente
    if not respuesta:
        raise ErrorSesion("No hay respuesta pendiente de evaluar.")
    if s.tareas["transferencia"].estado == "pending":
        return

    def aplicar(d: schemas.TransferenciaIA) -> None:
        por_id = {p.id: p for p in d.points}
        puntos = []
        for esperado in s.puntos_esperados:
            p = por_id.get(esperado["id"])
            estado = p.status if p else "no"
            cita = p.student_evidence.strip() if p and p.student_evidence else None
            verificada = scoring.cita_verificada(cita, respuesta) if cita else None
            # un punto "cumplido" sin cita verificable cuenta como parcial
            if estado == "cumplido" and not verificada:
                estado = "parcial"
            if estado == "no":
                cita, verificada = None, None
            puntos.append(
                {
                    "id": esperado["id"],
                    "text": esperado["text"],
                    "status": estado,
                    "student_evidence": cita,
                    "evidence_verified": verificada,
                }
            )
        s.intentos_transferencia.append(
            {
                "answer": respuesta,
                "points": puntos,
                "feedback": d.feedback,
                "model_answer": d.model_answer,
                "transfer_pct": scoring.transferencia(puntos),
            }
        )
        s.respuesta_pendiente = None

    _lanzar(
        s,
        "transferencia",
        lambda: gemma.consultar(
            prompts.transferencia(s.topic or "", s.conceptos, s.pregunta or "", s.puntos_esperados, respuesta),
            schemas.TransferenciaIA,
        ),
        lambda: simulado.transferencia(respuesta),
        aplicar,
    )


def reintentar(s: Sesion, tarea: str) -> None:
    if tarea == "extraccion":
        lanzar_extraccion(s)
    elif tarea == "analisis":
        lanzar_analisis(s)
    elif tarea == "transferencia":
        lanzar_transferencia(s)
    else:
        raise ErrorSesion("Tarea desconocida.", 404)


# ---------- Vista pública ----------


def _fase(s: Sesion) -> str:
    if not s.conceptos_confirmados:
        return "fuente"
    if s.confianza is None:
        return "confianza"
    if s.explicacion is None:
        return "explicacion"
    if not s.intentos_transferencia:
        return "brechas"
    return "resultado"


def publica(s: Sesion) -> schemas.SesionPublica:
    # mejor intento de transferencia (la oportunidad de reintento no castiga el primer error)
    transfer_pct = max((i["transfer_pct"] for i in s.intentos_transferencia), default=None)
    analizado = s.tareas["analisis"].estado == "ready"
    conceptos_eval = s.conceptos if analizado else [{k: v for k, v in c.items() if k != "status"} for c in s.conceptos]
    scores = scoring.calcular(conceptos_eval, transfer_pct, s.confianza)
    calib = scoring.calibracion(scores, s.conceptos, s.confianza) if analizado else None

    transfer = None
    if s.pregunta and analizado:
        transfer = schemas.Transferencia(
            question=s.pregunta,
            target_concept_ids=s.conceptos_objetivo,
            attempts=[schemas.IntentoTransferencia(**i) for i in s.intentos_transferencia],
            max_attempts=MAX_INTENTOS_TRANSFERENCIA,
        )

    return schemas.SesionPublica(
        session_id=s.id,
        phase=_fase(s),
        ejemplo=s.ejemplo,
        topic=s.topic,
        source_quality=s.source_quality,
        quality_note=s.quality_note,
        concepts=[schemas.Concepto(**c) for c in s.conceptos],
        confidence_pct=s.confianza,
        explanation=s.explicacion,
        explanation_seconds=s.segundos,
        analysis_uncertainty=s.incertidumbre if analizado else None,
        transfer=transfer,
        scores=schemas.Scores(**scores),
        calibration=schemas.Calibracion(**calib) if calib else None,
        tasks={
            n: schemas.InfoTarea(
                estado=t.estado,
                error=t.error,
                modelo=None if t.simulado or t.estado == "idle" else config.MODELO,
                latencia_ms=t.latencia_ms,
                intentos=t.intentos,
                simulado=t.simulado,
                # solo la extracción expone su salida cruda: las otras podrían filtrar la respuesta esperada
                raw=t.raw if t.estado == "error" and n == "extraccion" else None,
            )
            for n, t in s.tareas.items()
        },
        gemma={"modelo": config.MODELO, "modo": config.MODO, "acceso": "Gemini API (Google AI Studio)"},
        disclaimer=config.DISCLAIMER,
    )
