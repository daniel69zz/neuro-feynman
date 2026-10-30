// Pantalla 2: predicción metacognitiva, antes de ver cualquier resultado
import { useState, type CSSProperties } from "react";
import type { Sesion } from "../api";
import { Boton, Eyebrow, Superficie, Titulo } from "../ui";

function describir(v: number): string {
  if (v >= 85) return "Podría explicárselo a cualquiera";
  if (v >= 65) return "Lo tengo bastante claro";
  if (v >= 40) return "Más o menos";
  if (v >= 15) return "Tengo dudas";
  return "Casi nada";
}

export function Confianza({ sesion, sugerida, ocupado, onConfirmar }: {
  sesion: Sesion;
  sugerida?: number;
  ocupado: boolean;
  onConfirmar: (v: number) => void;
}) {
  const [valor, setValor] = useState(sugerida ?? 50);
  const [tocado, setTocado] = useState(false);

  return (
    <div className="entrar mx-auto flex max-w-2xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Eyebrow>Paso 2 · Predicción</Eyebrow>
        <Titulo>¿Qué tan preparado te sientes para responder preguntas sobre {sesion.topic}?</Titulo>
        <p className="text-suave">Responde antes de ver tu resultado. Esta cifra no se puede cambiar después.</p>
      </div>

      <Superficie className="flex flex-col gap-6 !p-8">
        <div className="flex items-end justify-between gap-4">
          <output htmlFor="confianza" className="text-7xl leading-none font-black tracking-tight tabular-nums">
            {valor}
            <span className="text-3xl text-tenue"> %</span>
          </output>
          <span className="pb-2 text-right font-mano text-xl font-bold text-terracota">{describir(valor)}</span>
        </div>
        <input
          id="confianza"
          type="range"
          min={0}
          max={100}
          step={5}
          value={valor}
          onChange={(e) => {
            setValor(Number(e.target.value));
            setTocado(true);
          }}
          className="slider w-full"
          style={{ "--valor": `${valor}%` } as CSSProperties}
          aria-valuetext={`${valor} %, ${describir(valor)}`}
        />
        <div className="flex justify-between text-xs font-semibold text-tenue">
          <span>0 · nada</span>
          <span>100 · domino el tema</span>
        </div>
      </Superficie>

      <div className="flex justify-end">
        <Boton disabled={ocupado} onClick={() => onConfirmar(valor)}>
          {tocado || sugerida !== undefined ? `Me siento ${valor} % preparado` : "Confirmar 50 %"}
        </Boton>
      </div>
    </div>
  );
}
