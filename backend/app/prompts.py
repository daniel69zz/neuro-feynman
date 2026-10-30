"""Prompts de las tres etapas. Van en el mensaje de usuario (Gemma no respeta bien system instructions).

La pregunta de aplicación es de opción múltiple y se genera en la etapa 2: cuál es la correcta y la
explicación de cada opción se guardan solo en el servidor y no se envían antes del intento. La corrección
la hace el backend comparando la opción elegida, sin otra llamada al modelo.
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

Además genera UNA pregunta de aplicación de opción múltiple:
- transfer_question: situación NUEVA y concreta que obligue a aplicar un mecanismo o relación del material
  (no a repetir una definición). Prioriza los conceptos no demostrados. No incluyas pistas de la respuesta.
- target_concept_ids: ids de los conceptos que pone a prueba.
- options: exactamente 4 opciones y UNA sola correcta (correct: true).
  - Las incorrectas deben ser plausibles: errores típicos o confusiones reales entre conceptos del material, no absurdas.
  - Todas con longitud y estilo parecidos, para que la correcta no destaque. Sin "todas las anteriores" ni "ninguna".
  - explanation: 1-2 frases sobre por qué la opción es correcta o en qué falla, apoyadas en el material
    (no se mostrará al estudiante antes de responder).
- uncertainty: si no puedes evaluar algo con confianza (explicación muy breve, material ambiguo), dilo; si no, "".

Esquema:
{{
  "concepts": [
    {{"id": "...", "status": "demostrado", "student_evidence": "..." , "shows_relation": false, "feedback": "...", "corrective_question": null}}
  ],
  "transfer_question": "...",
  "target_concept_ids": ["..."],
  "options": [{{"text": "...", "correct": false, "explanation": "..."}}],
  "uncertainty": ""
}}"""

