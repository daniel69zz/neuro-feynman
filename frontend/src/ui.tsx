// Componentes visuales compartidos entre pantallas
import { useEffect, useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import type { EstadoConcepto, InfoTarea, Salud } from "./api";

export function Boton({
  variante = "primario",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variante?: "primario" | "secundario" | "fantasma" }) {
  const estilos = {
    primario: "bg-terracota text-white shadow-[0_1px_0_rgb(0_0_0/0.12)] hover:bg-terracota-oscuro",
    secundario: "bg-papel text-tinta ring-1 ring-borde hover:ring-ocre",
    fantasma: "text-suave hover:bg-borde/50",
  }[variante];
  return (
    <button
      className={`presionable inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 font-bold focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-verde disabled:cursor-not-allowed disabled:opacity-45 ${estilos} ${className}`}
      {...props}
    />
  );
}

export function Superficie({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-[28px] bg-papel p-6 ring-1 ring-borde ${className}`}>{children}</section>;
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="text-xs font-bold tracking-[0.18em] text-tenue uppercase">{children}</p>;
}

export function Titulo({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <h1 className={`text-3xl font-black tracking-tight text-balance sm:text-4xl ${className}`}>{children}</h1>;
}

/** Espera de Gemma con segundos transcurridos: la latencia real (10–40 s) se hace visible y predecible. */
export function EsperandoGemma({ texto, detalle }: { texto: string; detalle?: string }) {
  const [segundos, setSegundos] = useState(0);
  useEffect(() => {
    const inicio = Date.now();
    const t = setInterval(() => setSegundos(Math.floor((Date.now() - inicio) / 1000)), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <div role="status" className="entrar flex flex-col gap-4 py-10">
      <div className="flex items-center gap-3 text-lg font-bold">
        <span className="latido size-3 rounded-full bg-gemma" />
        {texto}
      </div>
      <div className="relative h-1.5 w-full max-w-md overflow-hidden rounded-full bg-gemma/10">
        <div className="progreso-indeterminado absolute inset-y-0 w-2/5 rounded-full bg-gemma/60" />
      </div>
      <p className="text-sm text-tenue tabular-nums">
        {segundos} s · {detalle ?? "suele tardar entre 10 y 40 s en la capa gratuita"}
      </p>
    </div>
  );
}

export function MensajeError({ texto, onReintentar }: { texto: string; onReintentar?: () => void }) {
  return (
    <div role="alert" className="entrar flex flex-wrap items-center gap-3 rounded-2xl bg-rojo-fondo p-4 text-rojo ring-1 ring-rojo/20">
      <p className="flex-1 font-medium">{texto}</p>
      {onReintentar && (
        <Boton variante="secundario" className="px-4 py-2 text-sm" onClick={onReintentar}>
          Reintentar
        </Boton>
      )}
    </div>
  );
}

export function Aviso({ children, tono = "ambar" }: { children: ReactNode; tono?: "ambar" | "gemma" }) {
  const c = tono === "ambar" ? "bg-ambar-fondo text-ambar ring-ambar/20" : "bg-gemma/6 text-gemma ring-gemma/15";
  return <div className={`rounded-2xl p-4 text-sm font-medium ring-1 ${c}`}>{children}</div>;
}

export const ESTADOS: Record<EstadoConcepto, { etiqueta: string; texto: string; fondo: string; punto: string; borde: string }> = {
  demostrado: { etiqueta: "Demostrado", texto: "text-verde", fondo: "bg-verde-fondo", punto: "bg-verde", borde: "border-verde" },
  por_verificar: { etiqueta: "Por verificar", texto: "text-ambar", fondo: "bg-ambar-fondo", punto: "bg-ocre", borde: "border-ocre" },
  omitido: { etiqueta: "Sin evidencia", texto: "text-rojo", fondo: "bg-rojo-fondo", punto: "bg-rojo", borde: "border-rojo" },
  incorrecto: { etiqueta: "Incorrecto", texto: "text-rojo", fondo: "bg-rojo-fondo", punto: "bg-rojo", borde: "border-rojo" },
};

export function ChipEstado({ estado }: { estado: EstadoConcepto }) {
  const e = ESTADOS[estado];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${e.fondo} ${e.texto}`}>
      <span className={`size-1.5 rounded-full ${e.punto}`} />
      {e.etiqueta}
    </span>
  );
}

/** Transparencia para el jurado: qué modelo respondió y cuánto tardó. */
export function FirmaGemma({ tarea }: { tarea: InfoTarea }) {
  if (tarea.estado !== "ready") return null;
  return tarea.simulado ? (
    <span className="rounded-full bg-rojo px-2.5 py-1 text-xs font-bold text-white">SIMULADO · no es Gemma</span>
  ) : (
    <span className="text-xs font-semibold text-tenue tabular-nums">
      <span className="text-gemma">Gemma 4</span> · {tarea.modelo} · {((tarea.latencia_ms ?? 0) / 1000).toFixed(1)} s
    </span>
  );
}

const PASOS = ["Apunte", "Confianza", "Explicación", "Brechas", "Aplicación", "Resultado"];

export function Pasos({ actual }: { actual: number }) {
  return (
    <ol className="flex items-center gap-1.5" aria-label={`Paso ${actual + 1} de ${PASOS.length}: ${PASOS[actual]}`}>
      {PASOS.map((p, i) => (
        <li key={p} className="flex items-center gap-1.5">
          <span
            title={p}
            className={`h-1.5 rounded-full transition-colors duration-200 ${
              i < actual ? "w-4 bg-verde" : i === actual ? "w-8 bg-terracota" : "w-4 bg-borde"
            }`}
          />
        </li>
      ))}
      <span className="ml-2 hidden text-xs font-bold text-tenue sm:inline">{PASOS[actual]}</span>
    </ol>
  );
}

export function Encabezado({ salud, paso, onInicio }: { salud: Salud | null; paso: number | null; onInicio?: () => void }) {
  return (
    <header className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-5 sm:px-6">
      <button
        onClick={onInicio}
        disabled={!onInicio}
        className="presionable flex items-center gap-2.5 rounded-full pr-2 text-lg font-black tracking-tight disabled:cursor-default"
        aria-label="Neuro-Feynman, volver al inicio"
      >
        <img src="/icono.svg" alt="" className="size-8" />
        <span>
          Neuro<span className="text-terracota">-</span>Feynman
        </span>
      </button>
      {paso !== null ? (
        <Pasos actual={paso} />
      ) : salud?.modo === "demo" ? (
        <span className="rounded-full bg-rojo px-3 py-1 text-xs font-bold tracking-wide text-white">MODO DEMO · RESPUESTAS SIMULADAS</span>
      ) : salud ? (
        <span className="hidden text-xs font-semibold text-tenue sm:inline">
          con <span className="text-gemma">Gemma 4</span> · {salud.modelo}
        </span>
      ) : null}
    </header>
  );
}

export function Pie({ salud }: { salud: Salud | null }) {
  return (
    <footer className="mx-auto mt-16 w-full max-w-5xl px-4 py-6 text-xs leading-relaxed text-tenue sm:px-6">
      Hacktoberfest Hack Day La Paz × NeuroTech UMSA 2026 · Evaluación educativa exploratoria: no es un diagnóstico
      clínico ni neurológico y no mide actividad cerebral.
      {salud && salud.modo === "live" && <> · Modelo: {salud.modelo} vía Gemini API (Google AI Studio).</>}
    </footer>
  );
}

export function pct(v: number | null | undefined): string {
  return v === null || v === undefined ? "—" : `${Math.round(v)} %`;
}
