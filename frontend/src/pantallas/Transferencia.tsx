// Pantalla 5: pregunta de aplicación, corrección argumentada y una oportunidad de reintento
import { useState } from "react";
import type { EstadoPunto, IntentoTransferencia, Sesion } from "../api";
import { Boton, EsperandoGemma, Eyebrow, FirmaGemma, MensajeError, Superficie, pct } from "../ui";

const PUNTO: Record<EstadoPunto, { icono: string; clase: string; etiqueta: string }> = {
  cumplido: { icono: "✓", clase: "bg-verde text-white", etiqueta: "Cumplido" },
  parcial: { icono: "~", clase: "bg-ocre text-white", etiqueta: "Parcial" },
  no: { icono: "✕", clase: "bg-rojo-fondo text-rojo", etiqueta: "No aparece" },
};

function Correccion({ intento, numero, verRespuesta }: { intento: IntentoTransferencia; numero: number; verRespuesta: boolean }) {
  return (
    <Superficie className="entrar flex flex-col gap-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-black">Corrección del intento {numero}</h2>
        <span className="text-2xl font-black tabular-nums">{pct(intento.transfer_pct)}</span>
      </div>
      <ul className="flex flex-col gap-2.5">
        {intento.points.map((p) => (
          <li key={p.id} className="flex gap-3 text-sm">
            <span
              className={`grid size-6 shrink-0 place-items-center rounded-full text-xs font-black ${PUNTO[p.status].clase}`}
              aria-label={PUNTO[p.status].etiqueta}
            >
              {PUNTO[p.status].icono}
            </span>
            <span>
              {p.text}
              {p.student_evidence && (
                <span className="mt-0.5 block text-tenue">
                  Tú: <q className="font-mano text-base font-bold text-tinta">{p.student_evidence}</q>
                </span>
              )}
            </span>
          </li>
        ))}
      </ul>
      <p className="border-t border-borde pt-4">{intento.feedback}</p>
      {verRespuesta && (
        <div className="entrar rounded-2xl bg-verde-fondo p-4 text-sm">
          <p className="mb-1 text-xs font-bold text-verde">Respuesta modelo (basada en tu apunte)</p>
          {intento.model_answer}
        </div>
      )}
    </Superficie>
  );
}

export function Transferencia({ sesion, ocupado, onEnviar, onReintentar, onResultado }: {
  sesion: Sesion;
  ocupado: boolean;
  onEnviar: (respuesta: string) => void;
  onReintentar: () => void;
  onResultado: () => void;
}) {
  const t = sesion.transfer!;
  const tarea = sesion.tasks.transferencia;
  const [respuesta, setRespuesta] = useState("");
  const [reintentando, setReintentando] = useState(false);
  const [verRespuesta, setVerRespuesta] = useState(false);

  const ultimo = t.attempts.at(-1);
  const quedanIntentos = t.attempts.length < t.max_attempts;
  const pendiente = tarea.estado === "pending";
  // se escribe si no hay intento aún, o si el estudiante eligió reintentar antes de ver la respuesta modelo
  const escribiendo = !pendiente && (!ultimo || reintentando);
  const objetivos = sesion.concepts.filter((c) => t.target_concept_ids.includes(c.id));

  return (
    <div className="entrar mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Eyebrow>Paso 5 · Aplicación</Eyebrow>
        <FirmaGemma tarea={sesion.tasks.analisis} />
      </div>

      <Superficie className="flex flex-col gap-3 !bg-tinta !p-8 text-papel ring-0">
        <p className="text-xs font-bold tracking-[0.18em] text-ocre uppercase">Situación nueva</p>
        <p className="text-xl leading-snug font-bold text-pretty sm:text-2xl">{t.question}</p>
        {objetivos.length > 0 && (
          <p className="text-sm text-papel/60">Pone a prueba: {objetivos.map((c) => c.title).join(" · ")}</p>
        )}
      </Superficie>

      {escribiendo && (
        <>
          <textarea
            autoFocus
            value={respuesta}
            onChange={(e) => setRespuesta(e.target.value)}
            maxLength={3000}
            rows={6}
            placeholder="Explica tu razonamiento, no solo la respuesta…"
            aria-label="Tu respuesta"
            className="renglones rounded-[24px] bg-papel px-6 pt-1 text-lg ring-1 ring-borde outline-none focus:ring-2 focus:ring-terracota/60"
          />
          <div className="flex justify-end">
            <Boton
              disabled={respuesta.trim().length < 5 || ocupado}
              onClick={() => {
                onEnviar(respuesta.trim());
                setReintentando(false);
              }}
            >
              {ultimo ? "Enviar segundo intento" : "Enviar respuesta"}
            </Boton>
          </div>
        </>
      )}

      {pendiente && <EsperandoGemma texto="Gemma 4 está corrigiendo tu razonamiento…" detalle="revisa cada punto contra tu apunte" />}
      {tarea.estado === "error" && (
        <MensajeError texto={`Gemma no pudo corregir la respuesta: ${tarea.error}`} onReintentar={onReintentar} />
      )}

      {ultimo && !reintentando && !pendiente && (
        <>
          <Correccion intento={ultimo} numero={t.attempts.length} verRespuesta={verRespuesta} />
          <div className="flex flex-wrap items-center justify-end gap-3">
            {!verRespuesta && quedanIntentos && (
              <Boton
                variante="secundario"
                onClick={() => {
                  setRespuesta(ultimo.answer);
                  setReintentando(true);
                }}
              >
                Intentar de nuevo
              </Boton>
            )}
            {!verRespuesta && (
              <Boton variante="fantasma" onClick={() => setVerRespuesta(true)}>
                {quedanIntentos ? "Ver respuesta modelo (sin reintento)" : "Ver respuesta modelo"}
              </Boton>
            )}
            <Boton onClick={onResultado}>Ver mi resultado →</Boton>
          </div>
        </>
      )}
    </div>
  );
}
