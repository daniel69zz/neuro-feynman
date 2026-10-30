// Pantalla 1: fuente de verdad. Gemma extrae los conceptos y el estudiante corrige lo que se leyó mal.
import { useEffect, useState } from "react";
import { api, type ConceptoEditable, type Sesion, type TipoConcepto } from "../api";
import { Aviso, Boton, EsperandoGemma, Eyebrow, FirmaGemma, MensajeError, Titulo } from "../ui";

const TIPOS: Record<TipoConcepto, string> = {
  definicion: "Definición",
  relacion: "Relación / causa",
  procedimiento: "Procedimiento",
  formula: "Fórmula",
  ejemplo: "Ejemplo",
};

interface Props {
  sesion: Sesion;
  ocupado: boolean;
  onReintentar: () => void;
  onConfirmar: (topic: string, conceptos: ConceptoEditable[]) => void;
}

export function Fuente({ sesion, ocupado, onReintentar, onConfirmar }: Props) {
  const tarea = sesion.tasks.extraccion;
  const [topic, setTopic] = useState("");
  const [conceptos, setConceptos] = useState<ConceptoEditable[]>([]);

  // al terminar la extracción se copia a un borrador editable (solo cuando cambia el estado,
  // para que un refresco de la sesión no borre lo que el estudiante ya corrigió)
  useEffect(() => {
    if (tarea.estado !== "pending") {
      setTopic(sesion.topic ?? "");
      setConceptos(
        sesion.concepts.map((c) => ({
          id: c.id,
          title: c.title,
          kind: c.kind,
          source_evidence: c.source_evidence,
          essential: c.essential,
        })),
      );
    }
  }, [tarea.estado]); // eslint-disable-line react-hooks/exhaustive-deps

  const cambiar = (i: number, parche: Partial<ConceptoEditable>) =>
    setConceptos((cs) => cs.map((c, j) => (j === i ? { ...c, ...parche } : c)));

  const validos = conceptos.filter((c) => c.title.trim());
  const listo = topic.trim() && validos.length > 0;

  return (
    <div className="entrar grid gap-8 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
      <figure className="lg:sticky lg:top-6 lg:self-start">
        {sesion.ejemplo !== "repaso" && (
          <img
            src={api.urlImagen(sesion.session_id)}
            alt="Tu apunte"
            className="w-full rounded-[24px] bg-papel shadow-[0_12px_40px_-12px_rgb(46_27_12/0.25)] ring-1 ring-borde"
          />
        )}
        <figcaption className="mt-3 text-xs text-tenue">
          La imagen se guarda solo en memoria durante esta sesión (2 h) y sin metadatos.
        </figcaption>
      </figure>

      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <Eyebrow>Paso 1 · Fuente de verdad</Eyebrow>
          <Titulo>¿Esto es lo que dice tu apunte?</Titulo>
          <p className="text-suave">
            Gemma 4 leyó la foto. Corrige solo lo que haya leído mal: después tendrás que explicarlo{" "}
            <strong className="text-tinta">sin mirar</strong>, así que no hace falta estudiarlo ahora.
          </p>
        </div>

        {tarea.estado === "pending" && (
          <EsperandoGemma texto="Gemma 4 está leyendo tu apunte…" />
        )}

        {tarea.estado === "error" && (
          <>
            <MensajeError texto={`Gemma no pudo leer el apunte: ${tarea.error}`} onReintentar={onReintentar} />
            <p className="text-sm text-suave">También puedes escribir los conceptos a mano abajo.</p>
          </>
        )}

        {tarea.estado !== "pending" && (
          <>
            {sesion.source_quality === "needs_review" && (
              <Aviso>
                <strong>Revisa la fuente:</strong> {sesion.quality_note ?? "Gemma no pudo leer bien la imagen."} No se inventó
                contenido: completa o corrige los conceptos antes de seguir.
              </Aviso>
            )}

            <div className="flex items-center justify-between gap-3">
              <label className="flex flex-1 flex-col gap-1">
                <span className="text-xs font-bold text-tenue">Tema</span>
                <input
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  maxLength={120}
                  placeholder="Ej. NAT y PAT"
                  className="rounded-xl bg-papel px-3 py-2 text-lg font-bold ring-1 ring-borde outline-none focus:ring-2 focus:ring-terracota"
                />
              </label>
              <FirmaGemma tarea={tarea} />
            </div>

            <ul className="flex flex-col gap-3">
              {conceptos.map((c, i) => (
                <li key={c.id ?? `nuevo-${i}`} className="rounded-2xl bg-papel p-4 ring-1 ring-borde focus-within:ring-2 focus-within:ring-terracota/60">
                  <div className="flex items-start gap-2">
                    <input
                      value={c.title}
                      onChange={(e) => cambiar(i, { title: e.target.value })}
                      maxLength={120}
                      aria-label="Nombre del concepto"
                      placeholder="Nombre del concepto"
                      className="flex-1 bg-transparent font-bold outline-none"
                    />
                    <button
                      onClick={() => setConceptos((cs) => cs.filter((_, j) => j !== i))}
                      aria-label={`Quitar ${c.title}`}
                      className="presionable -mt-1 -mr-1 rounded-full px-2 py-1 text-tenue hover:bg-rojo-fondo hover:text-rojo"
                    >
                      ✕
                    </button>
                  </div>
                  <textarea
                    value={c.source_evidence}
                    onChange={(e) => cambiar(i, { source_evidence: e.target.value })}
                    maxLength={400}
                    rows={2}
                    aria-label="Lo que dice el apunte"
                    placeholder="Lo que dice el apunte sobre este concepto"
                    className="mt-1 w-full resize-none bg-transparent text-sm text-suave outline-none"
                  />
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                    <select
                      value={c.kind}
                      onChange={(e) => cambiar(i, { kind: e.target.value as TipoConcepto })}
                      aria-label="Tipo de concepto"
                      className="rounded-full bg-fondo px-2.5 py-1 font-semibold text-suave ring-1 ring-borde"
                    >
                      {Object.entries(TIPOS).map(([v, t]) => (
                        <option key={v} value={v}>
                          {t}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => cambiar(i, { essential: !c.essential })}
                      aria-pressed={c.essential}
                      className={`presionable rounded-full px-2.5 py-1 font-bold ring-1 ${
                        c.essential ? "bg-tinta text-papel ring-tinta" : "bg-fondo text-tenue ring-borde"
                      }`}
                    >
                      {c.essential ? "★ Esencial (cuenta doble)" : "Secundario"}
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <Boton
                variante="fantasma"
                disabled={conceptos.length >= 10}
                onClick={() =>
                  setConceptos((cs) => [...cs, { id: null, title: "", kind: "definicion", source_evidence: "", essential: true }])
                }
              >
                + Añadir concepto
              </Boton>
              <Boton disabled={!listo || ocupado} onClick={() => onConfirmar(topic.trim(), validos)}>
                Confirmar {validos.length} conceptos
              </Boton>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
