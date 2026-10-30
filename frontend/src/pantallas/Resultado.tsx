// Pantalla 6: calibración (confianza vs. desempeño), conceptos a repasar y repaso espaciado
import { useEffect, useState } from "react";
import type { RepasoPendiente, Sesion } from "../api";
import { Boton, ChipEstado, Eyebrow, FirmaGemma, Superficie, Titulo, pct } from "../ui";

function Barra({ etiqueta, valor, color, visible }: { etiqueta: string; valor: number; color: string; visible: boolean }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <span className="font-bold">{etiqueta}</span>
        <span className="text-3xl font-black tabular-nums">{Math.round(valor)} %</span>
      </div>
      <div className="h-5 overflow-hidden rounded-full bg-borde/70">
        <div
          className={`barra h-full rounded-full ${color}`}
          style={{ transform: `scaleX(${visible ? Math.max(valor, 1) / 100 : 0.01})` }}
        />
      </div>
    </div>
  );
}

const NIVEL_ENTORNO = {
  ok: { punto: "bg-verde", etiqueta: "Bien" },
  aviso: { punto: "bg-ocre", etiqueta: "Mejorable" },
  alto: { punto: "bg-rojo", etiqueta: "Desfavorable" },
} as const;

/** Condiciones de luz y ruido al enviar el apunte y si pudieron influir en un mal resultado. */
function Entorno({ sesion }: { sesion: Sesion }) {
  const e = sesion.entorno;
  if (!e) {
    return (
      <p className="text-sm text-tenue">
        No mediste tu entorno en esta sesión. La próxima vez, al enviar el apunte, mide luz y ruido para saber si influyeron.
      </p>
    );
  }
  return (
    <Superficie className={e.posible_influencia ? "!bg-ambar-fondo ring-ambar/25" : ""}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className={`font-black ${e.posible_influencia ? "text-ambar" : ""}`}>
          {e.posible_influencia ? "Tu entorno pudo haber influido" : "Tu entorno al estudiar"}
        </h2>
        <span className="text-xs text-tenue">medido al enviar el apunte · orientativo</span>
      </div>
      <p className="mt-2 text-suave">{e.nota}</p>
      {e.factores.length > 0 && (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {e.factores.map((f) => (
            <li key={f.id} className="flex gap-3 rounded-2xl bg-papel/70 p-3.5 text-sm ring-1 ring-borde">
              <span className={`mt-1.5 size-2.5 shrink-0 rounded-full ${NIVEL_ENTORNO[f.nivel].punto}`} aria-label={NIVEL_ENTORNO[f.nivel].etiqueta} />
              <span>
                <strong className="block">{f.titulo}</strong>
                <span className="text-tenue">{f.detalle}</span>
                {f.sugerencia && <span className="mt-1 block">{f.sugerencia}</span>}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Superficie>
  );
}

export function Resultado({ sesion, previo, repasoGuardado, onRepasoManana, onNueva }: {
  sesion: Sesion;
  previo: RepasoPendiente | null;
  repasoGuardado: boolean;
  onRepasoManana: () => void;
  onNueva: () => void;
}) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    // un frame después del montaje, para que las barras crezcan desde la izquierda
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const s = sesion.scores;
  const cal = sesion.calibration;
  const confianza = sesion.confidence_pct ?? 0;
  const desempeno = s.performance_pct ?? s.provisional_performance_pct ?? 0;
  const brecha = s.calibration_gap_points ?? 0;
  const fuertes = sesion.concepts.filter((c) => c.status === "demostrado");
  const repasar = sesion.concepts.filter((c) => c.status !== "demostrado");
  const colorBrecha =
    cal?.label === "posible_sobreestimacion" ? "text-rojo" : cal?.label === "posible_subestimacion" ? "text-gemma" : "text-verde";

  return (
    <div className="entrar flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <Eyebrow>Paso 6 · Resultado {s.status === "final" ? "final" : "provisional"}</Eyebrow>
        <Titulo>{sesion.topic}</Titulo>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Superficie className="flex flex-col gap-6 !p-8">
          <Barra etiqueta="Lo que crees saber" valor={confianza} color="bg-tenue/70" visible={visible} />
          <Barra etiqueta="Lo que demostraste" valor={desempeno} color="bg-terracota" visible={visible} />
          {previo && (
            <p className="text-sm text-tenue">
              Intento anterior: confianza {previo.confianza_previa} % · demostrado {Math.round(previo.desempeno_previo)} %
              {" → "}
              <strong className="text-tinta">
                {desempeno >= previo.desempeno_previo ? "+" : ""}
                {Math.round(desempeno - previo.desempeno_previo)} puntos
              </strong>
            </p>
          )}
        </Superficie>

        <Superficie className="flex flex-col justify-center gap-2 !p-8">
          <span className="text-sm font-bold text-suave">Brecha de calibración</span>
          <span className={`text-6xl leading-none font-black tracking-tight tabular-nums ${colorBrecha}`}>
            {brecha > 0 ? "+" : ""}
            {Math.round(brecha)}
            <span className="ml-1 text-2xl">pts</span>
          </span>
          {cal && <span className="text-xl font-black">{cal.title}</span>}
          <span className="text-xs text-tenue">
            confianza − desempeño · umbral visual ±{cal?.threshold_points ?? 20} pts (regla preliminar, no clínica)
          </span>
        </Superficie>
      </div>

      {cal && (
        <div className="grid gap-4 md:grid-cols-2">
          <Superficie>
            <h2 className="mb-2 font-black">Qué significa</h2>
            <p className="text-suave">{cal.explanation}</p>
          </Superficie>
          <Superficie className="!bg-verde-fondo ring-verde/20">
            <h2 className="mb-2 font-black text-verde">Qué practicar primero</h2>
            <p>{cal.recommendation}</p>
          </Superficie>
        </div>
      )}

      <Entorno sesion={sesion} />

      <div className="grid gap-4 md:grid-cols-2">
        <Superficie>
          <h2 className="mb-3 font-black">Conceptos fuertes · {fuertes.length}</h2>
          <ul className="flex flex-col gap-2">
            {fuertes.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-2 text-sm">
                {c.title} <ChipEstado estado="demostrado" />
              </li>
            ))}
            {!fuertes.length && <li className="text-sm text-tenue">Ninguno demostrado todavía en esta sesión.</li>}
          </ul>
        </Superficie>
        <Superficie>
          <h2 className="mb-3 font-black">Para repasar · {repasar.length}</h2>
          <ul className="flex flex-col gap-2">
            {repasar.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-2 text-sm">
                <span>
                  {c.title}
                  {c.essential && <span className="ml-1 text-tenue">★</span>}
                </span>
                {c.status && <ChipEstado estado={c.status} />}
              </li>
            ))}
          </ul>
        </Superficie>
      </div>

      <details className="group rounded-[22px] bg-papel px-6 py-4 ring-1 ring-borde">
        <summary className="cursor-pointer font-bold text-suave">Cómo se calculó (rúbrica auditable)</summary>
        <table className="mt-4 w-full text-sm">
          <tbody className="[&_td]:py-1.5">
            <tr>
              <td className="text-suave">Conceptos recuperados (esenciales cuentan doble)</td>
              <td className="text-right tabular-nums">{s.weights.concept_recall} %</td>
              <td className="w-20 text-right font-bold tabular-nums">{pct(s.concept_recall_pct)}</td>
            </tr>
            <tr>
              <td className="text-suave">Relaciones y causas con cita verificada</td>
              <td className="text-right tabular-nums">{s.weights.causal_explanation} %</td>
              <td className="text-right font-bold tabular-nums">{pct(s.causal_explanation_pct)}</td>
            </tr>
            <tr>
              <td className="text-suave">Pregunta de aplicación (100 % al primer intento, 50 % al segundo)</td>
              <td className="text-right tabular-nums">{s.weights.transfer} %</td>
              <td className="text-right font-bold tabular-nums">{pct(s.transfer_pct)}</td>
            </tr>
            <tr className="border-t border-borde font-black">
              <td>Desempeño {s.status}</td>
              <td />
              <td className="text-right tabular-nums">{pct(desempeno)}</td>
            </tr>
          </tbody>
        </table>
        <p className="mt-3 text-xs text-tenue">
          Gemma clasifica cada concepto y cita tu texto; las puntuaciones y la brecha se calculan en el backend con pesos
          fijos. Una cita que no aparece en tu explicación baja el concepto a «por verificar».
        </p>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
          {(["extraccion", "analisis"] as const).map((n) => (
            <FirmaGemma key={n} tarea={sesion.tasks[n]} />
          ))}
        </div>
      </details>

      <p className="text-xs text-tenue">{sesion.disclaimer}</p>

      <div className="flex flex-wrap justify-end gap-3">
        <Boton variante="secundario" onClick={onNueva}>
          Nuevo apunte
        </Boton>
        <Boton onClick={onRepasoManana} disabled={repasoGuardado}>
          {repasoGuardado ? "✓ Te esperamos mañana" : "Volver a evaluarme mañana"}
        </Boton>
      </div>
    </div>
  );
}
