// Pantalla 3: recuperación activa. Escribir o dictar sin mirar el apunte.
import { useEffect, useRef, useState } from "react";
import type { Sesion } from "../api";
import { useDictado } from "../dictado";
import { Boton, Eyebrow, Titulo } from "../ui";

const SEGUNDOS_ORIENTATIVOS = 120;
const MIN_CARACTERES = 20;

export function Explicacion({ sesion, sugerida, ocupado, onEnviar }: {
  sesion: Sesion;
  sugerida?: string;
  ocupado: boolean;
  onEnviar: (texto: string, segundos: number) => void;
}) {
  const [texto, setTexto] = useState("");
  const [segundos, setSegundos] = useState(0);
  const area = useRef<HTMLTextAreaElement>(null);
  const dictado = useDictado((frase) => setTexto((t) => (t.trim() ? `${t.trimEnd()} ${frase}` : frase)));

  useEffect(() => {
    area.current?.focus();
    const t = setInterval(() => setSegundos((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const restante = SEGUNDOS_ORIENTATIVOS - segundos;
  const reloj = `${Math.floor(Math.abs(restante) / 60)}:${String(Math.abs(restante) % 60).padStart(2, "0")}`;
  const enviable = texto.trim().length >= MIN_CARACTERES && !ocupado;

  return (
    <div className="entrar mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Eyebrow>Paso 3 · Recuperación activa</Eyebrow>
        <Titulo>Explícale {sesion.topic} a un compañero, sin ver el apunte.</Titulo>
        <p className="text-suave">
          Con tus palabras: qué es, cómo funciona y por qué. Un ejemplo vale más que una definición de memoria.
        </p>
      </div>

      <div className="overflow-hidden rounded-[24px] bg-papel ring-1 ring-borde focus-within:ring-2 focus-within:ring-terracota/60">
        <textarea
          ref={area}
          value={dictado.parcial ? `${texto} ${dictado.parcial}`.trim() : texto}
          onChange={(e) => setTexto(e.target.value)}
          readOnly={dictado.escuchando}
          maxLength={6000}
          rows={9}
          placeholder="Empieza por lo que recuerdes…"
          aria-label="Tu explicación"
          className="renglones block w-full resize-y bg-transparent px-6 pt-1 text-lg outline-none placeholder:text-tenue/70"
        />
        <div className="flex flex-wrap items-center gap-3 border-t border-borde px-4 py-3 text-sm">
          {dictado.disponible && (
            <button
              onClick={dictado.escuchando ? dictado.detener : dictado.iniciar}
              aria-pressed={dictado.escuchando}
              className={`presionable inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 font-bold ring-1 ${
                dictado.escuchando ? "bg-rojo text-white ring-rojo" : "bg-fondo text-suave ring-borde hover:ring-ocre"
              }`}
            >
              <span className={`size-2 rounded-full ${dictado.escuchando ? "latido bg-white" : "bg-rojo"}`} />
              {dictado.escuchando ? "Detener dictado" : "Dictar"}
            </button>
          )}
          <span className="text-tenue tabular-nums" title="Tiempo orientativo, no es un límite">
            {restante >= 0 ? `⏱ ${reloj} orientativos` : `⏱ +${reloj}: tómate tu tiempo`}
          </span>
          <span className="ml-auto text-tenue tabular-nums">
            {texto.trim().length < MIN_CARACTERES ? `mín. ${MIN_CARACTERES} caracteres` : `${texto.trim().split(/\s+/).length} palabras`}
          </span>
        </div>
      </div>
      {dictado.error && <p className="text-sm text-rojo">{dictado.error}</p>}
      {!dictado.disponible && (
        <p className="text-xs text-tenue">Este navegador no tiene dictado por voz (Firefox no lo soporta). Usa Chrome, Edge o Safari, o escribe.</p>
      )}
      {dictado.escuchando && (
        <p className="text-xs text-tenue">El dictado lo transcribe tu navegador; Gemma solo recibe el texto final, que puedes corregir.</p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        {sugerida && !texto ? (
          <Boton variante="fantasma" onClick={() => setTexto(sugerida)}>
            Usar la explicación del ejemplo
          </Boton>
        ) : (
          <span />
        )}
        <Boton
          disabled={!enviable}
          onClick={() => {
            dictado.detener();
            onEnviar(texto.trim(), segundos);
          }}
        >
          Comparar con mi apunte
        </Boton>
      </div>
    </div>
  );
}
