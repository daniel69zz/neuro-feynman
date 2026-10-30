// Pantalla 0: subir una foto del apunte o usar el ejemplo NAT/PAT
import { useRef, useState } from "react";
import { api, type RepasoPendiente, type Salud } from "../api";
import { Aviso, Boton, Eyebrow, Superficie } from "../ui";

interface Props {
  salud: Salud | null;
  repasoPendiente: RepasoPendiente | null;
  ocupado: boolean;
  onArchivo: (f: File) => void;
  onEjemplo: (id: string) => void;
  onRepaso: () => void;
}

export function Inicio({ salud, repasoPendiente, ocupado, onArchivo, onEjemplo, onRepaso }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [arrastrando, setArrastrando] = useState(false);
  const ejemplo = salud?.ejemplos[0];
  const repasoListo = repasoPendiente && new Date(repasoPendiente.programado_para) <= new Date();

  return (
    <div className="entrar grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:items-center">
      <div className="flex flex-col gap-6">
        <Eyebrow>Detector de ilusión de competencia</Eyebrow>
        <h1 className="text-4xl leading-[1.05] font-black tracking-tight text-balance sm:text-6xl">
          ¿Lo sabes, o solo lo <span className="font-mano font-bold text-terracota">reconoces</span>?
        </h1>
        <p className="max-w-xl text-lg text-pretty text-suave">
          Neuro-Feynman no te pregunta cuánto estudiaste. Te muestra cuánto de lo que estudiaste puedes{" "}
          <strong className="text-tinta">explicar, recordar y aplicar</strong> sin mirar tus apuntes.
        </p>
        <ol className="grid gap-3 text-sm text-suave sm:grid-cols-3">
          {[
            ["1", "Sube tu apunte", "Gemma 4 lee la foto y extrae los conceptos."],
            ["2", "Explica sin mirar", "Declara tu confianza y explícalo con tus palabras."],
            ["3", "Mira tu brecha", "Lo que creías saber frente a lo que demostraste."],
          ].map(([n, t, d]) => (
            <li key={n} className="flex gap-3 sm:flex-col sm:gap-1.5">
              <span className="font-mano text-2xl leading-none font-bold text-terracota">{n}</span>
              <span>
                <strong className="block text-tinta">{t}</strong>
                {d}
              </span>
            </li>
          ))}
        </ol>
      </div>

      <div className="flex flex-col gap-4">
        {repasoPendiente && (
          <Superficie className="flex flex-wrap items-center gap-4 !p-5 ring-verde/40">
            <div className="flex-1">
              <p className="font-bold">Repaso espaciado: {repasoPendiente.topic}</p>
              <p className="text-sm text-suave">
                {repasoListo
                  ? "Ya pasó un día. Explícalo otra vez sin repasar antes."
                  : `Programado para ${new Date(repasoPendiente.programado_para).toLocaleDateString("es", { weekday: "long", day: "numeric" })}. Puedes hacerlo ya, pero mide mejor si esperas.`}
              </p>
            </div>
            <Boton variante={repasoListo ? "primario" : "secundario"} onClick={onRepaso} disabled={ocupado}>
              Empezar repaso
            </Boton>
          </Superficie>
        )}

        <button
          onClick={() => input.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setArrastrando(true);
          }}
          onDragLeave={() => setArrastrando(false)}
          onDrop={(e) => {
            e.preventDefault();
            setArrastrando(false);
            const f = e.dataTransfer.files[0];
            if (f) onArchivo(f);
          }}
          disabled={ocupado}
          className={`presionable group flex flex-col items-center gap-3 rounded-[28px] border-2 border-dashed px-6 py-12 text-center focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-verde disabled:opacity-50 ${
            arrastrando ? "border-terracota bg-terracota/5" : "border-borde bg-papel hover:border-ocre"
          }`}
        >
          <svg viewBox="0 0 24 24" className="size-10 text-terracota" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
            <path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1.8l1.4-2h4.6l1.4 2h1.8A2.5 2.5 0 0 1 20 8.5v9a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17.5z" strokeLinejoin="round" />
            <circle cx="12" cy="13" r="3.5" />
          </svg>
          <span className="text-lg font-bold">Sube una foto de tu apunte</span>
          <span className="text-sm text-tenue">Cuaderno, pizarra o diapositiva · un solo tema · JPG, PNG o WEBP</span>
        </button>
        <input
          ref={input}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onArchivo(f);
            e.target.value = "";
          }}
        />

        {ejemplo && (
          <button
            onClick={() => onEjemplo(ejemplo.id)}
            disabled={ocupado}
            className="presionable flex items-center gap-4 rounded-[22px] bg-papel p-3 pr-5 text-left ring-1 ring-borde hover:ring-ocre focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-verde disabled:opacity-50"
          >
            <img src={api.urlEjemplo(ejemplo.id)} alt="" className="h-20 w-16 rounded-xl object-cover object-top ring-1 ring-borde" />
            <span className="flex-1">
              <span className="block font-bold">Probar con el ejemplo: {ejemplo.titulo}</span>
              <span className="block text-sm text-tenue">{ejemplo.descripcion}</span>
            </span>
            <span aria-hidden className="text-xl text-terracota">→</span>
          </button>
        )}

        {salud && !salud.api_key_configurada && salud.modo === "live" && (
          <Aviso>Falta GEMINI_API_KEY en backend/.env: Gemma no podrá responder.</Aviso>
        )}
      </div>
    </div>
  );
}
