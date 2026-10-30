// Pantalla 5: pregunta de aplicación de opción múltiple, con explicación de cada respuesta y un reintento
import { useState } from "react";
import type { Sesion } from "../api";
import { Boton, Eyebrow, FirmaGemma, Superficie } from "../ui";

const LETRA = (i: number) => String.fromCharCode(65 + i);

export function Transferencia({ sesion, ocupado, onElegir, onResultado }: {
  sesion: Sesion;
  ocupado: boolean;
  onElegir: (opcion: string | null) => void;
  onResultado: () => void;
}) {
  const t = sesion.transfer!;
  const [elegida, setElegida] = useState<string | null>(null);
  const [reintentando, setReintentando] = useState(false);

  const ultimo = t.attempts.at(-1);
  const usadas = new Set(t.attempts.map((a) => a.option_id));
  // se elige si no hay intento aún, o si el estudiante pidió reintentar
  const eligiendo = !t.finished && (!ultimo || reintentando);
  const objetivos = sesion.concepts.filter((c) => t.target_concept_ids.includes(c.id));

  function estiloOpcion(id: string) {
    if (t.finished && id === t.correct_option_id) return "bg-verde-fondo ring-2 ring-verde";
    if (usadas.has(id)) return "bg-rojo-fondo/70 ring-1 ring-rojo/30 opacity-80";
    if (eligiendo && elegida === id) return "bg-papel ring-2 ring-terracota";
    return "bg-papel ring-1 ring-borde";
  }

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

      <ul className="cascada flex flex-col gap-3" role="radiogroup" aria-label="Opciones">
        {t.options.map((o, i) => {
          const bloqueada = !eligiendo || usadas.has(o.id);
          return (
            <li key={o.id}>
              <button
                type="button"
                role="radio"
                aria-checked={elegida === o.id}
                disabled={bloqueada || ocupado}
                onClick={() => setElegida(o.id)}
                className={`presionable flex w-full items-start gap-4 rounded-[20px] p-4 text-left transition-[box-shadow,background-color] duration-150 disabled:cursor-default ${estiloOpcion(o.id)}`}
              >
                <span
                  className={`grid size-8 shrink-0 place-items-center rounded-full text-sm font-black ${
                    t.finished && o.id === t.correct_option_id
                      ? "bg-verde text-white"
                      : usadas.has(o.id)
                        ? "bg-rojo text-white"
                        : eligiendo && elegida === o.id
                          ? "bg-terracota text-white"
                          : "bg-borde/70 text-suave"
                  }`}
                >
                  {t.finished && o.id === t.correct_option_id ? "✓" : usadas.has(o.id) ? "✕" : LETRA(i)}
                </span>
                <span className="pt-1 text-pretty">{o.text}</span>
              </button>
            </li>
          );
        })}
      </ul>

      {eligiendo && (
        <div className="flex justify-end">
          <Boton
            disabled={!elegida || usadas.has(elegida) || ocupado}
            onClick={() => {
              onElegir(elegida);
              setReintentando(false);
            }}
          >
            {ultimo ? "Responder de nuevo" : "Responder"}
          </Boton>
        </div>
      )}

      {ultimo && !eligiendo && (
        <Superficie className={`entrar flex flex-col gap-3 ${ultimo.correct ? "!bg-verde-fondo ring-verde/20" : ""}`}>
          <h2 className={`font-black ${ultimo.correct ? "text-verde" : "text-rojo"}`}>
            {ultimo.correct
              ? t.attempts.length === 1
                ? "¡Correcto al primer intento!"
                : "Correcto en el segundo intento"
              : "No es la respuesta correcta"}
          </h2>
          <p>{ultimo.explanation}</p>
          {t.finished && !ultimo.correct && t.correct_explanation && (
            <div className="rounded-2xl bg-verde-fondo p-4 text-sm">
              <p className="mb-1 text-xs font-bold text-verde">La correcta y por qué</p>
              {t.correct_explanation}
            </div>
          )}
        </Superficie>
      )}

      {ultimo && !eligiendo && (
        <div className="flex flex-wrap items-center justify-end gap-3">
          {!t.finished && (
            <>
              <Boton
                variante="secundario"
                onClick={() => {
                  setElegida(null);
                  setReintentando(true);
                }}
              >
                Intentar de nuevo
              </Boton>
              <Boton variante="fantasma" disabled={ocupado} onClick={() => onElegir(null)}>
                Ver la respuesta correcta
              </Boton>
            </>
          )}
          <Boton onClick={onResultado}>Ver mi resultado →</Boton>
        </div>
      )}
    </div>
  );
}
