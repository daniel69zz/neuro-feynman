"""Contratos de datos de Neuro-Feynman.

Dos grupos:
- *IA: lo que se exige que devuelva Gemma (validación estricta; si no cumple, se reintenta).
- Públicos: lo que la API entrega al frontend. Las puntuaciones las calcula el backend, nunca Gemma.
"""

from typing import Literal

from pydantic import BaseModel, Field, model_validator

EstadoConcepto = Literal["demostrado", "por_verificar", "omitido", "incorrecto"]
TipoConcepto = Literal["definicion", "relacion", "procedimiento", "formula", "ejemplo"]
EstadoTarea = Literal["idle", "pending", "ready", "error"]
# fuente → confianza → explicacion → brechas → transferencia → resultado
Fase = Literal["fuente", "confianza", "explicacion", "brechas", "transferencia", "resultado"]


# ---------- Salidas exigidas a Gemma ----------


class ConceptoExtraidoIA(BaseModel):
    id: str = Field(min_length=1, max_length=60)
    title: str = Field(min_length=1, max_length=120)
    kind: TipoConcepto = "definicion"
    source_evidence: str = Field(min_length=1, max_length=400)
    essential: bool = True


class ExtraccionIA(BaseModel):
    topic: str = Field(max_length=120)
    source_quality: Literal["ok", "needs_review"]
    quality_note: str = ""
    concepts: list[ConceptoExtraidoIA] = Field(default_factory=list, max_length=10)


class EvaluacionConceptoIA(BaseModel):
    id: str
    status: EstadoConcepto
    student_evidence: str | None = None
    shows_relation: bool = False
    feedback: str = Field(max_length=400)
    corrective_question: str | None = Field(default=None, max_length=400)


class OpcionIA(BaseModel):
    text: str = Field(min_length=1, max_length=300)
    correct: bool
    # por qué es correcta o en qué falla; solo se muestra después de responder
    explanation: str = Field(min_length=1, max_length=500)


class AnalisisIA(BaseModel):
    concepts: list[EvaluacionConceptoIA]
    transfer_question: str = Field(min_length=10, max_length=600)
    target_concept_ids: list[str] = Field(default_factory=list)
    options: list[OpcionIA] = Field(min_length=3, max_length=5)
    uncertainty: str = ""

    @model_validator(mode="after")
    def una_correcta(self):
        if sum(o.correct for o in self.options) != 1:
            raise ValueError("La pregunta debe tener exactamente una opción correcta.")
        return self


# ---------- Entradas del frontend ----------


class ConceptoEditado(BaseModel):
    id: str | None = None
    title: str = Field(min_length=1, max_length=120)
    kind: TipoConcepto = "definicion"
    source_evidence: str = Field(default="", max_length=400)
    essential: bool = True


class ConceptosRevisados(BaseModel):
    topic: str = Field(min_length=1, max_length=120)
    concepts: list[ConceptoEditado] = Field(min_length=1, max_length=10)


class Confianza(BaseModel):
    confidence_pct: int = Field(ge=0, le=100)


class Explicacion(BaseModel):
    texto: str = Field(min_length=20, max_length=6000)
    segundos: int | None = Field(default=None, ge=0, le=3600)


class EntornoMedido(BaseModel):
    """Números medidos en el navegador; ni la foto ni el audio salen del dispositivo."""

    brillo: float | None = Field(default=None, ge=0, le=255)
    grano: float | None = Field(default=None, ge=0, le=100)
    contraluz: float | None = Field(default=None, ge=-255, le=255)
    sonido_dbfs: float | None = Field(default=None, ge=-120, le=0)
    sonido_pico_dbfs: float | None = Field(default=None, ge=-120, le=0)


class RespuestaTransferencia(BaseModel):
    # None = ver la respuesta correcta sin usar el reintento
    opcion: str | None = Field(default=None, max_length=4)


# ---------- Contrato público ----------


class Concepto(BaseModel):
    id: str
    title: str
    kind: TipoConcepto
    essential: bool
    source_evidence: str
    status: EstadoConcepto | None = None
    student_evidence: str | None = None
    # la cita del estudiante se comprobó contra su texto real (None = no aplica)
    evidence_verified: bool | None = None
    # el estado se bajó porque Gemma no pudo respaldarlo con una cita verificable
    downgraded: bool = False
    shows_relation: bool | None = None
    feedback: str | None = None
    corrective_question: str | None = None


class InfoTarea(BaseModel):
    estado: EstadoTarea = "idle"
    error: str | None = None
    modelo: str | None = None
    latencia_ms: int | None = None
    intentos: int | None = None
    simulado: bool = False
    raw: str | None = None


class Opcion(BaseModel):
    id: str
    text: str


class IntentoTransferencia(BaseModel):
    option_id: str
    correct: bool
    explanation: str


class Transferencia(BaseModel):
    question: str
    target_concept_ids: list[str]
    options: list[Opcion]
    attempts: list[IntentoTransferencia] = Field(default_factory=list)
    max_attempts: int = 2
    # la respuesta correcta solo se revela al terminar (acierto, intentos agotados o al pedirla)
    finished: bool = False
    correct_option_id: str | None = None
    correct_explanation: str | None = None


class Scores(BaseModel):
    concept_recall_pct: float | None = None
    causal_explanation_pct: float | None = None
    transfer_pct: float | None = None
    provisional_performance_pct: float | None = None
    performance_pct: float | None = None
    calibration_gap_points: float | None = None
    status: Literal["pendiente", "provisional", "final"] = "pendiente"
    weights: dict[str, int]


class Calibracion(BaseModel):
    gap_points: float
    label: Literal["posible_sobreestimacion", "alineado", "posible_subestimacion"]
    title: str
    explanation: str
    recommendation: str
    threshold_points: int
    provisional: bool


class FactorEntorno(BaseModel):
    id: Literal["luz", "contraluz", "ruido"]
    nivel: Literal["ok", "aviso", "alto"]
    titulo: str
    detalle: str
    sugerencia: str | None


class EntornoPublico(BaseModel):
    medido: EntornoMedido
    factores: list[FactorEntorno]
    # True solo si el resultado fue bajo Y había condiciones adversas (posible, no causa)
    posible_influencia: bool
    nota: str


class SesionPublica(BaseModel):
    session_id: str
    phase: Fase
    ejemplo: str | None
    topic: str | None
    source_quality: Literal["ok", "needs_review"] | None
    quality_note: str | None
    concepts: list[Concepto]
    confidence_pct: int | None
    explanation: str | None
    explanation_seconds: int | None
    analysis_uncertainty: str | None
    transfer: Transferencia | None
    scores: Scores
    calibration: Calibracion | None
    entorno: EntornoPublico | None
    tasks: dict[str, InfoTarea]
    gemma: dict[str, str]
    disclaimer: str
