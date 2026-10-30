"""Prompts de las tres etapas. Van en el mensaje de usuario (Gemma no respeta bien system instructions).

Las etapas están separadas a propósito: la respuesta esperada de la pregunta de transferencia
se genera en la etapa 2, se guarda solo en el servidor y nunca se envía al frontend antes del intento.
"""

import json

BASE = """Eres el evaluador educativo de Neuro-Feynman.
Evalúas SOLO el conocimiento demostrado durante esta sesión, usando el material proporcionado como referencia principal.
Reglas:
- No inventes conceptos que no estén en el material.
- Una omisión no prueba desconocimiento; exprésala como falta de evidencia en esta respuesta.
- No infieras conexiones neuronales, sinapsis, actividad hipocampal ni diagnósticos.
- No asumas que usar las mismas palabras del apunte implica falta de comprensión.
- Si la información es ilegible, contradictoria o insuficiente, dilo.
- Escribe en español, en frases cortas y claras para un estudiante.
- Devuelve únicamente JSON conforme al esquema indicado, sin texto adicional."""


def extraccion() -> str:
    return f"""{BASE}

TAREA: lee la imagen (apunte, pizarra o diapositiva) y extrae los conceptos que el material enseña.

- Extrae entre 3 y 8 conceptos, solo los que aparecen en la imagen.
- source_evidence: copia o resume fielmente el fragmento del material que respalda el concepto (máx. 2 frases).
- kind: "definicion", "relacion" (causa, mecanismo, comparación), "procedimiento", "formula" o "ejemplo".
- essential: true si el concepto es central para el tema; false si es un detalle secundario.
- id: identificador corto en minúsculas con guiones (ej. "nat-basico").
- Si la imagen es ilegible, está cortada o no contiene material de estudio, usa source_quality "needs_review",
  explica el problema en quality_note y devuelve solo los conceptos que puedas leer con seguridad (puede ser ninguno).

Esquema:
{{
  "topic": "tema general en pocas palabras",
  "source_quality": "ok" | "needs_review",
  "quality_note": "observación breve sobre la legibilidad (vacío si todo está bien)",
  "concepts": [
    {{"id": "...", "title": "...", "kind": "definicion", "source_evidence": "...", "essential": true}}
  ]
}}"""


def analisis(topic: str, conceptos: list[dict], explicacion: str) -> str:
    material = json.dumps(
        [{k: c[k] for k in ("id", "title", "kind", "source_evidence", "essential")} for c in conceptos],
        ensure_ascii=False,
        indent=1,
    )
    return f"""{BASE}

TAREA: compara la explicación del estudiante (escrita SIN mirar sus apuntes) con los conceptos del material revisado por él.

TEMA: {topic}

CONCEPTOS DEL MATERIAL (fuente de verdad):
{material}

EXPLICACIÓN DEL ESTUDIANTE:
<<<
{explicacion}
>>>

Para CADA concepto devuelve:
- status:
  - "demostrado": lo explicó correctamente con sus palabras o con un ejemplo que muestra comprensión.
  - "por_verificar": lo mencionó pero de forma ambigua, incompleta o como repetición de términos sin explicar el mecanismo.
  - "omitido": no hay evidencia de ese concepto en la explicación.
  - "incorrecto": lo explicó de forma incompatible con el material.
- student_evidence: cita LITERAL y exacta (copiada carácter por carácter) del fragmento de la explicación que respalda tu juicio; null si es "omitido".
- shows_relation: true solo si la explicación muestra una relación, causa o mecanismo de ese concepto (no solo nombrarlo).
- feedback: justificación corta (1-2 frases) citando qué falta o qué está bien.
- corrective_question: si NO es "demostrado", una pregunta breve que lo ayude a recuperar ese concepto sin darle la respuesta; null si es "demostrado".

Además genera UNA pregunta de transferencia:
- transfer_question: situación NUEVA y concreta que obligue a aplicar un mecanismo o relación del material
  (no a repetir una definición). Prioriza los conceptos no demostrados. No incluyas pistas de la respuesta.
- target_concept_ids: ids de los conceptos que pone a prueba.
- expected_points: 2 a 4 puntos que una buena respuesta debe contener (esto NO se mostrará al estudiante antes de responder).
- uncertainty: si no puedes evaluar algo con confianza (explicación muy breve, material ambiguo), dilo; si no, "".

Esquema:
{{
  "concepts": [
    {{"id": "...", "status": "demostrado", "student_evidence": "..." , "shows_relation": false, "feedback": "...", "corrective_question": null}}
  ],
  "transfer_question": "...",
  "target_concept_ids": ["..."],
  "expected_points": [{{"id": "p1", "text": "..."}}],
  "uncertainty": ""
}}"""


def transferencia(topic: str, conceptos: list[dict], pregunta: str, puntos: list[dict], respuesta: str) -> str:
    material = json.dumps(
        [{k: c[k] for k in ("id", "title", "source_evidence")} for c in conceptos], ensure_ascii=False, indent=1
    )
    esperados = json.dumps(puntos, ensure_ascii=False, indent=1)
    return f"""{BASE}

TAREA: evalúa la respuesta del estudiante a una pregunta de transferencia, punto por punto.

TEMA: {topic}

MATERIAL DE REFERENCIA:
{material}

PREGUNTA: {pregunta}

PUNTOS ESPERADOS:
{esperados}

RESPUESTA DEL ESTUDIANTE:
<<<
{respuesta}
>>>

Para CADA punto esperado:
- status: "cumplido" (lo razona correctamente), "parcial" (idea correcta pero incompleta o imprecisa) o "no".
- student_evidence: cita LITERAL y exacta de la respuesta que lo respalda; null si es "no".
Acepta formulaciones distintas a las del material si el razonamiento es correcto.

Luego:
- feedback: corrección argumentada (2-4 frases): qué razonó bien, qué faltó y por qué importa, citando el material.
- model_answer: una respuesta modelo breve (2-3 frases) basada en el material.

Esquema:
{{
  "points": [{{"id": "p1", "status": "cumplido", "student_evidence": "..."}}],
  "feedback": "...",
  "model_answer": "..."
}}"""
