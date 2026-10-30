// Pantalla 4: Mapa de Brechas Metacognitivas con evidencia por concepto y puntaje provisional
import type { Concepto, EstadoConcepto, Sesion } from "../api";
import { Aviso, Boton, ChipEstado, ESTADOS, EsperandoGemma, Eyebrow, FirmaGemma, MensajeError, Superficie, Titulo, pct } from "../ui";

const GRUPOS: { titulo: string; estados: EstadoConcepto[]; nota: string }[] = [
  { titulo: "Demostrado", estados: ["demostrado"], nota: "Lo explicaste con evidencia en tu respuesta." },
  { titulo: "Por verificar", estados: ["por_verificar"], nota: "Lo nombraste, pero falta comprobar que lo entiendes." },
  {
    titulo: "Sin evidencia o incorrecto",
    estados: ["omitido", "incorrecto"],
    nota: "No apareció en esta respuesta (no significa que no lo sepas) o no coincide con el apunte.",
  },
];

function Tarjeta({ c }: { c: Concepto }) {
  const e = ESTADOS[c.status ?? "omitido"];
  return (
    <li className={`flex flex-col gap-3 rounded-2xl border-l-4 bg-papel p-5 ring-1 ring-borde ${e.borde}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="font-bold">
          {c.title}
          {c.essential && <span className="ml-1.5 text-xs text-tenue" title="Concepto esencial: cuenta doble">★</span>}
        </h3>
        {c.status && <ChipEstado estado={c.status} />}
      </div>

      <dl className="grid gap-2 text-sm">
        <div>
          <dt className="text-xs font-bold text-tenue">Tu apunte dice</dt>
          <dd className="text-suave">{c.source_evidence}</dd>
        </div>
        <div>
          <dt className="text-xs font-bold text-tenue">Tú dijiste</dt>
          <dd>
            {c.student_evidence ? (
              <>
                <q className="font-mano text-base font-bold">{c.student_evidence}</q>
                {c.evidence_verified ? (
                  <span className="ml-2 text-xs font-semibold text-verde" title="La cita aparece literalmente en tu explicación">
                    ✓ cita verificada
                  </span>
                ) : (
                  <span className="ml-2 text-xs font-semibold text-ambar">cita no encontrada en tu texto</span>
                )}
              </>
            ) : (
              <span className="text-tenue italic">No hay un fragmento de tu explicación sobre esto.</span>
            )}
          </dd>
        </div>
      </dl>

      {c.feedback && <p className="text-sm">{c.feedback}</p>}

      {c.corrective_question && (
        <p className="rounded-xl bg-fondo px-3.5 py-2.5 text-sm">
          <span className="font-bold text-terracota">Pregúntate: </span>
          {c.corrective_question}
        </p>
      )}
    </li>
  );
}

export function Brechas({ sesion, onReintentar, onContinuar }: {
  sesion: Sesion;
  onReintentar: () => void;
  onContinuar: () => void;
}) {
  const tarea = sesion.tasks.analisis;

  if (tarea.estado === "pending" || tarea.estado === "idle") {
    return (
      <div className="mx-auto max-w-3xl">
        <EsperandoGemma
          texto={`Gemma 4 compara tu explicación con ${sesion.concepts.length} conceptos de tu apunte…`}
          detalle="busca evidencia de cada concepto y prepara una pregunta de aplicación"
        />
      </div>
    );
  }
  if (tarea.estado === "error") {
    return (
      <div className="mx-auto max-w-3xl">
        <MensajeError texto={`Gemma no pudo analizar tu explicación: ${tarea.error}`} onReintentar={onReintentar} />
      </div>
    );
  }

  const s = sesion.scores;
  const total = sesion.concepts.length;
  const cuenta = (est: EstadoConcepto[]) => sesion.concepts.filter((c) => c.status && est.includes(c.status)).length;

  return (
    <div className="entrar flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Eyebrow>Paso 4 · Mapa de Brechas Metacognitivas</Eyebrow>
          <FirmaGemma tarea={tarea} />
        </div>
        <Titulo>Esto es lo que demostraste sin mirar.</Titulo>
      </div>

      <div className="grid gap-4 md:grid-cols-[1.3fr_1fr]">
        <Superficie className="flex flex-col gap-4">
          {/* barra segmentada: proporción de conceptos en cada estado */}
          <div className="flex h-3 overflow-hidden rounded-full bg-borde" aria-hidden>
            {GRUPOS.map((g, i) => (
              <div
                key={g.titulo}
                className={["bg-verde", "bg-ocre", "bg-rojo"][i]}
                style={{ width: `${(cuenta(g.estados) / total) * 100}%` }}
              />
            ))}
          </div>
          <ul className="grid grid-cols-3 gap-2 text-sm">
            {GRUPOS.map((g, i) => (
              <li key={g.titulo}>
                <span className={`block text-3xl font-black tabular-nums ${["text-verde", "text-ambar", "text-rojo"][i]}`}>
                  {cuenta(g.estados)}
                </span>
                <span className="text-suave">{g.titulo}</span>
              </li>
            ))}
          </ul>
        </Superficie>

        <Superficie className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-bold text-suave">Desempeño provisional</span>
            <span className="text-4xl font-black tabular-nums">{pct(s.provisional_performance_pct)}</span>
          </div>
          <dl className="grid gap-1 text-sm">
            <div className="flex justify-between">
              <dt className="text-suave">Conceptos recuperados ({s.weights.concept_recall} %)</dt>
              <dd className="font-bold tabular-nums">{pct(s.concept_recall_pct)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-suave">Relaciones y causas ({s.weights.causal_explanation} %)</dt>
              <dd className="font-bold tabular-nums">{pct(s.causal_explanation_pct)}</dd>
            </div>
            <div className="flex justify-between text-tenue">
              <dt>Aplicación ({s.weights.transfer} %)</dt>
              <dd className="font-bold">pendiente</dd>
            </div>
          </dl>
          <p className="text-xs text-tenue">Provisional: falta la pregunta de aplicación para el resultado final.</p>
        </Superficie>
      </div>

      {sesion.analysis_uncertainty && (
        <Aviso tono="gemma">
          <strong>Gemma advierte:</strong> {sesion.analysis_uncertainty}
        </Aviso>
      )}

      {GRUPOS.map((g) => {
        const lista = sesion.concepts.filter((c) => c.status && g.estados.includes(c.status));
        if (!lista.length) return null;
        return (
          <section key={g.titulo} className="flex flex-col gap-3">
            <div>
              <h2 className="text-lg font-black">
                {g.titulo} <span className="text-tenue tabular-nums">· {lista.length}</span>
              </h2>
              <p className="text-sm text-tenue">{g.nota}</p>
            </div>
            <ul className="cascada grid gap-3 md:grid-cols-2">
              {lista.map((c) => (
                <Tarjeta key={c.id} c={c} />
              ))}
            </ul>
          </section>
        );
      })}

      <div className="sticky bottom-4 flex justify-end">
        <Boton onClick={onContinuar} className="shadow-[0_10px_30px_-8px_rgb(168_67_46/0.55)]">
          Responder la pregunta de aplicación →
        </Boton>
      </div>
    </div>
  );
}
