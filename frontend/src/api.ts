// Cliente de la API y tipos espejo de backend/app/schemas.py

export type EstadoConcepto = "demostrado" | "por_verificar" | "omitido" | "incorrecto";
export type TipoConcepto = "definicion" | "relacion" | "procedimiento" | "formula" | "ejemplo";
export type EstadoTarea = "idle" | "pending" | "ready" | "error";
export type EstadoPunto = "cumplido" | "parcial" | "no";
export type NombreTarea = "extraccion" | "analisis" | "transferencia";

export interface Concepto {
  id: string;
  title: string;
  kind: TipoConcepto;
  essential: boolean;
  source_evidence: string;
  status: EstadoConcepto | null;
  student_evidence: string | null;
  evidence_verified: boolean | null;
  downgraded: boolean;
  shows_relation: boolean | null;
  feedback: string | null;
  corrective_question: string | null;
}

export interface InfoTarea {
  estado: EstadoTarea;
  error: string | null;
  modelo: string | null;
  latencia_ms: number | null;
  intentos: number | null;
  simulado: boolean;
  raw: string | null;
}

export interface PuntoTransferencia {
  id: string;
  text: string;
  status: EstadoPunto;
  student_evidence: string | null;
  evidence_verified: boolean | null;
}

export interface IntentoTransferencia {
  answer: string;
  points: PuntoTransferencia[];
  feedback: string;
  model_answer: string;
  transfer_pct: number;
}

export interface Scores {
  concept_recall_pct: number | null;
  causal_explanation_pct: number | null;
  transfer_pct: number | null;
  provisional_performance_pct: number | null;
  performance_pct: number | null;
  calibration_gap_points: number | null;
  status: "pendiente" | "provisional" | "final";
  weights: Record<"concept_recall" | "causal_explanation" | "transfer", number>;
}

export interface Calibracion {
  gap_points: number;
  label: "posible_sobreestimacion" | "alineado" | "posible_subestimacion";
  title: string;
  explanation: string;
  recommendation: string;
  threshold_points: number;
  provisional: boolean;
}

export interface EntornoMedido {
  brillo: number | null;
  grano: number | null;
  contraluz: number | null;
  sonido_dbfs: number | null;
  sonido_pico_dbfs: number | null;
}

export interface FactorEntorno {
  id: "luz" | "contraluz" | "ruido";
  nivel: "ok" | "aviso" | "alto";
  titulo: string;
  detalle: string;
  sugerencia: string | null;
}

export interface Sesion {
  session_id: string;
  phase: "fuente" | "confianza" | "explicacion" | "brechas" | "transferencia" | "resultado";
  ejemplo: string | null;
  topic: string | null;
  source_quality: "ok" | "needs_review" | null;
  quality_note: string | null;
  concepts: Concepto[];
  confidence_pct: number | null;
  explanation: string | null;
  explanation_seconds: number | null;
  analysis_uncertainty: string | null;
  transfer: {
    question: string;
    target_concept_ids: string[];
    attempts: IntentoTransferencia[];
    max_attempts: number;
  } | null;
  scores: Scores;
  calibration: Calibracion | null;
  entorno: { medido: EntornoMedido; factores: FactorEntorno[]; posible_influencia: boolean; nota: string } | null;
  tasks: Record<NombreTarea, InfoTarea>;
  gemma: { modelo: string; modo: "live" | "demo"; acceso: string };
  disclaimer: string;
}

export interface Ejemplo {
  id: string;
  archivo: string;
  titulo: string;
  descripcion: string;
  sintetico: boolean;
  explicacion_sugerida?: string;
  confianza_sugerida?: number;
}

export interface Salud {
  ok: boolean;
  modelo: string;
  modo: "live" | "demo";
  api_key_configurada: boolean;
  ejemplos: Ejemplo[];
}

export interface ConceptoEditable {
  id: string | null;
  title: string;
  kind: TipoConcepto;
  source_evidence: string;
  essential: boolean;
}

async function pedir<T>(ruta: string, init?: RequestInit): Promise<T> {
  let r: Response;
  try {
    r = await fetch(ruta, init);
  } catch {
    throw new Error("No se puede conectar con el backend. ¿Está corriendo `npm run dev` desde la raíz del proyecto?");
  }
  if (!r.ok) {
    const cuerpo = await r.json().catch(() => null);
    const detalle = cuerpo?.detail;
    throw new Error(
      typeof detalle === "string"
        ? detalle
        : Array.isArray(detalle)
          ? "Revisa los datos: " + detalle.map((d: { msg: string }) => d.msg).join("; ")
          : `Error ${r.status}`,
    );
  }
  return r.json() as Promise<T>;
}

const json = (metodo: string, cuerpo: unknown): RequestInit => ({
  method: metodo,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(cuerpo),
});

export const api = {
  salud: () => pedir<Salud>("/api/salud"),
  crearConImagen: (archivo: File) => {
    const f = new FormData();
    f.append("imagen", archivo);
    return pedir<Sesion>("/api/sesiones", { method: "POST", body: f });
  },
  crearConEjemplo: (id: string) => {
    const f = new FormData();
    f.append("ejemplo", id);
    return pedir<Sesion>("/api/sesiones", { method: "POST", body: f });
  },
  crearRepaso: (topic: string, concepts: ConceptoEditable[]) =>
    pedir<Sesion>("/api/sesiones/repaso", json("POST", { topic, concepts })),
  ver: (id: string) => pedir<Sesion>(`/api/sesiones/${id}`),
  revisarConceptos: (id: string, topic: string, concepts: ConceptoEditable[]) =>
    pedir<Sesion>(`/api/sesiones/${id}/conceptos`, json("PUT", { topic, concepts })),
  confianza: (id: string, valor: number) =>
    pedir<Sesion>(`/api/sesiones/${id}/confianza`, json("POST", { confidence_pct: valor })),
  explicacion: (id: string, texto: string, segundos: number) =>
    pedir<Sesion>(`/api/sesiones/${id}/explicacion`, json("POST", { texto, segundos })),
  transferencia: (id: string, respuesta: string) =>
    pedir<Sesion>(`/api/sesiones/${id}/transferencia`, json("POST", { respuesta })),
  entorno: (id: string, medido: EntornoMedido) => pedir<Sesion>(`/api/sesiones/${id}/entorno`, json("POST", medido)),
  reintentar: (id: string, tarea: NombreTarea) =>
    pedir<Sesion>(`/api/sesiones/${id}/reintentar/${tarea}`, { method: "POST" }),
  urlImagen: (id: string) => `/api/sesiones/${id}/imagen`,
  urlEjemplo: (id: string) => `/api/ejemplos/${id}/imagen`,
};

// "Volver a evaluarme mañana": se guarda solo en este navegador
export interface RepasoPendiente {
  topic: string;
  concepts: ConceptoEditable[];
  programado_para: string;
  confianza_previa: number;
  desempeno_previo: number;
}

const CLAVE_REPASO = "neuro-feynman:repaso";

export const repaso = {
  leer(): RepasoPendiente | null {
    try {
      const v = localStorage.getItem(CLAVE_REPASO);
      return v ? (JSON.parse(v) as RepasoPendiente) : null;
    } catch {
      return null;
    }
  },
  guardar(r: RepasoPendiente) {
    try {
      localStorage.setItem(CLAVE_REPASO, JSON.stringify(r));
    } catch {
      /* sin almacenamiento: la opción simplemente no persiste */
    }
  },
  borrar() {
    try {
      localStorage.removeItem(CLAVE_REPASO);
    } catch {
      /* nada que borrar */
    }
  },
};
