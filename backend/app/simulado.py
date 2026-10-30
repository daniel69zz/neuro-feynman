"""Modo demo (GEMMA_MODE=demo): respuestas SIMULADAS para probar la interfaz sin API key.

Siempre se marcan como simuladas en la interfaz. Usan reglas por palabras clave sobre el ejemplo NAT/PAT,
no son una evaluación real y no deben usarse en la presentación como si fueran de Gemma.
"""

import asyncio

from . import schemas
from .scoring import normalizar

CONCEPTOS_NAT_PAT = [
    {
        "id": "nat-basico",
        "title": "Traducción de direcciones (NAT)",
        "kind": "definicion",
        "source_evidence": "NAT traduce IP privadas a una IP pública en el router.",
        "essential": True,
    },
    {
        "id": "ip-privadas",
        "title": "Rangos de IP privadas",
        "kind": "definicion",
        "source_evidence": "Privadas: 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16 (no se enrutan en Internet).",
        "essential": False,
    },
    {
        "id": "tabla-nat",
        "title": "Tabla de traducciones del router",
        "kind": "procedimiento",
        "source_evidence": "El router guarda cada traducción en la tabla NAT para devolver las respuestas.",
        "essential": True,
    },
    {
        "id": "pat-puertos",
        "title": "PAT: distinguir conexiones por puertos",
        "kind": "relacion",
        "source_evidence": "PAT (NAT overload): muchas IP privadas comparten 1 IP pública; se distinguen por el puerto.",
        "essential": True,
    },
    {
        "id": "ahorro-ipv4",
        "title": "Ahorro de direcciones IPv4",
        "kind": "relacion",
        "source_evidence": "Motivo: hay pocas IPv4 públicas → NAT/PAT permite ahorrarlas.",
        "essential": False,
    },
]

CLAVES = {
    "nat-basico": ["traduc", "cambia", "privad"],
    "ip-privadas": ["192 168", "10 0 0", "172 16"],
    "tabla-nat": ["tabla"],
    "pat-puertos": ["puerto"],
    "ahorro-ipv4": ["ahorr", "escas", "pocas"],
}


def _primera_frase_con(texto: str, claves: list[str]) -> str | None:
    for frase in texto.replace("\n", ". ").split("."):
        if any(k in normalizar(frase) for k in claves):
            return frase.strip() or None
    return None


async def extraccion() -> schemas.ExtraccionIA:
    await asyncio.sleep(1.2)
    return schemas.ExtraccionIA(
        topic="NAT y PAT",
        source_quality="ok",
        quality_note="",
        concepts=[schemas.ConceptoExtraidoIA(**c) for c in CONCEPTOS_NAT_PAT],
    )


async def analisis(conceptos: list[dict], explicacion: str) -> schemas.AnalisisIA:
    await asyncio.sleep(1.5)
    evaluados = []
    for c in conceptos:
        cita = _primera_frase_con(explicacion, CLAVES.get(c["id"], [normalizar(c["title"])[:8]]))
        if cita is None:
            evaluados.append(
                schemas.EvaluacionConceptoIA(
                    id=c["id"],
                    status="omitido",
                    feedback="[Simulado] No hay evidencia de este concepto en la explicación.",
                    corrective_question=f"¿Qué papel cumple «{c['title']}» en el tema?",
                )
            )
            continue
        relacion = any(k in normalizar(cita) for k in ("porque", "para", "asi", "entonces"))
        evaluados.append(
            schemas.EvaluacionConceptoIA(
                id=c["id"],
                status="demostrado" if relacion else "por_verificar",
                student_evidence=cita,
                shows_relation=relacion,
                feedback="[Simulado] Se encontró una mención relacionada en la explicación.",
                corrective_question=None if relacion else "¿Puedes explicar el mecanismo con un ejemplo?",
            )
        )
    return schemas.AnalisisIA(
        concepts=evaluados,
        transfer_question=(
            "Tienes 30 computadoras y una sola dirección IP pública. ¿Cómo hace el router para distinguir "
            "a qué computadora corresponde cada respuesta que llega desde Internet?"
        ),
        target_concept_ids=["pat-puertos", "tabla-nat"],
        expected_points=[
            schemas.PuntoEsperadoIA(id="p1", text="Usa puertos distintos de la IP pública para cada conexión (PAT)."),
            schemas.PuntoEsperadoIA(id="p2", text="Guarda la correspondencia IP privada:puerto ↔ puerto público en una tabla."),
            schemas.PuntoEsperadoIA(id="p3", text="Con esa tabla reenvía cada respuesta al equipo correcto."),
        ],
        uncertainty="[Simulado] Evaluación por palabras clave, no por Gemma.",
    )


async def transferencia(respuesta: str) -> schemas.TransferenciaIA:
    await asyncio.sleep(1.2)
    reglas = {"p1": ["puerto"], "p2": ["tabla", "traduc", "guarda", "registr"], "p3": ["reenv", "devuel", "correspond"]}
    puntos = []
    for pid, claves in reglas.items():
        cita = _primera_frase_con(respuesta, claves)
        puntos.append(schemas.PuntoEvaluadoIA(id=pid, status="cumplido" if cita else "no", student_evidence=cita))
    return schemas.TransferenciaIA(
        points=puntos,
        feedback="[Simulado] Corrección por palabras clave para probar la interfaz.",
        model_answer=(
            "El router usa PAT: asigna a cada conexión un puerto distinto de su IP pública y guarda en la tabla NAT "
            "la correspondencia con la IP y el puerto privados. Cuando llega una respuesta, busca el puerto en la "
            "tabla y la reenvía al equipo correcto."
        ),
    )
