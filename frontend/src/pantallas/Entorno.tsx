// Medición del entorno del estudiante al enviar el apunte: luz (cámara frontal) y ruido (micrófono).
// Todo se calcula en el navegador; al backend solo llegan números. No se guarda foto ni audio.
import { useEffect, useRef, useState } from "react";
import type { EntornoMedido } from "../api";
import { grises, medir } from "../calidad";
import { Boton } from "../ui";
import { Modal } from "./Camara";

const DURACION_S = 5;

function mediana(xs: number[]): number | null {
  if (!xs.length) return null;
  const o = [...xs].sort((a, b) => a - b);
  return o[Math.floor(o.length / 2)];
}

function percentil(xs: number[], q: number): number | null {
  if (!xs.length) return null;
  const o = [...xs].sort((a, b) => a - b);
  return o[Math.min(o.length - 1, Math.floor(q * o.length))];
}

/** Fondo más iluminado que el centro (donde suele estar la cara) → contraluz. */
function contraluz(v: HTMLVideoElement): number {
  const { g, w, h } = grises(v, v.videoWidth, v.videoHeight);
  let centro = 0, nc = 0, borde = 0, nb = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const enCentro = x > w * 0.3 && x < w * 0.7 && y > h * 0.25 && y < h * 0.8;
      const enBorde = x < w * 0.15 || x > w * 0.85 || y < h * 0.15;
      if (enCentro) { centro += g[y * w + x]; nc++; }
      else if (enBorde) { borde += g[y * w + x]; nb++; }
    }
  }
  return borde / Math.max(nb, 1) - centro / Math.max(nc, 1);
}

export function MedirEntorno({ onListo, onOmitir }: { onListo: (m: EntornoMedido) => void; onOmitir: () => void }) {
  const [fase, setFase] = useState<"intro" | "midiendo">("intro");
  const [restante, setRestante] = useState(DURACION_S);
  const [nivel, setNivel] = useState<number | null>(null);
  const [avisos, setAvisos] = useState<string[]>([]);
  const video = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (fase !== "midiendo") return;
    const flujos: MediaStream[] = [];
    const temporizadores: number[] = [];
    let audio: AudioContext | null = null;
    let terminado = false;
    const brillos: number[] = [], granos: number[] = [], contraluces: number[] = [], sonidos: number[] = [];

    async function iniciar() {
      // cámara y micrófono por separado: si se niega uno, el otro se mide igual
      const [cam, mic] = await Promise.allSettled([
        navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 640 } }, audio: false }),
        // sin cancelación de ruido ni ganancia automática: se quiere el nivel real del ambiente
        navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }, video: false }),
      ]);
      if (terminado) {
        [cam, mic].forEach((r) => r.status === "fulfilled" && r.value.getTracks().forEach((t) => t.stop()));
        return;
      }
      const faltan: string[] = [];

      if (cam.status === "fulfilled") {
        flujos.push(cam.value);
        const v = video.current!;
        v.srcObject = cam.value;
        await v.play().catch(() => undefined);
        temporizadores.push(
          window.setInterval(() => {
            if (v.readyState < 2 || !v.videoWidth) return;
            const m = medir(v, v.videoWidth, v.videoHeight);
            brillos.push(m.brillo);
            granos.push(m.ruido);
            contraluces.push(contraluz(v));
          }, 300),
        );
      } else faltan.push("cámara");

      if (mic.status === "fulfilled") {
        flujos.push(mic.value);
        audio = new AudioContext();
        // algunos navegadores lo crean suspendido si ya pasó el gesto del usuario
        await audio.resume().catch(() => undefined);
        const analizador = audio.createAnalyser();
        analizador.fftSize = 2048;
        audio.createMediaStreamSource(mic.value).connect(analizador);
        const muestra = new Float32Array(analizador.fftSize);
        temporizadores.push(
          window.setInterval(() => {
            analizador.getFloatTimeDomainData(muestra);
            let suma = 0;
            for (const x of muestra) suma += x * x;
            const dbfs = Math.max(-120, 20 * Math.log10(Math.sqrt(suma / muestra.length) || 1e-6));
            sonidos.push(dbfs);
            setNivel(dbfs);
          }, 100),
        );
      } else faltan.push("micrófono");
      setAvisos(faltan);

      let s = DURACION_S;
      temporizadores.push(
        window.setInterval(() => {
          s -= 1;
          setRestante(s);
          if (s <= 0) {
            terminado = true;
            // un micrófono que solo entrega ceros no está midiendo: no se informa como "silencio"
            const conSenal = sonidos.filter((x) => x > -100);
            onListo({
              brillo: mediana(brillos),
              grano: mediana(granos),
              contraluz: mediana(contraluces),
              sonido_dbfs: conSenal.length ? mediana(conSenal) : null,
              sonido_pico_dbfs: conSenal.length ? percentil(conSenal, 0.95) : null,
            });
          }
        }, 1000),
      );
    }
    iniciar();
    return () => {
      terminado = true;
      temporizadores.forEach(clearInterval);
      flujos.forEach((f) => f.getTracks().forEach((t) => t.stop()));
      audio?.close();
    };
  }, [fase]); // eslint-disable-line react-hooks/exhaustive-deps

  // -60 dBFS → barra vacía, -20 dBFS → llena
  const llenado = nivel === null ? 0 : Math.min(1, Math.max(0, (nivel + 60) / 40));

  return (
    <Modal onCerrar={onOmitir} etiqueta="Medir tu entorno">
      <div className="grid gap-0 md:grid-cols-[1fr_1.1fr]">
        <div className="relative grid min-h-56 place-items-center bg-tinta">
          <video ref={video} playsInline muted className={`h-full w-full -scale-x-100 object-cover ${fase === "midiendo" ? "" : "hidden"}`} />
          {fase === "intro" && (
            <svg viewBox="0 0 24 24" className="size-16 text-papel/40" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" strokeLinecap="round" />
            </svg>
          )}
          {fase === "midiendo" && (
            <span className="absolute top-3 right-3 rounded-full bg-black/50 px-3 py-1 text-sm font-bold text-white tabular-nums backdrop-blur">
              {restante} s
            </span>
          )}
        </div>
        <div className="flex flex-col gap-4 p-6">
          <div>
            <p className="text-xs font-bold tracking-[0.18em] text-tenue uppercase">Mientras Gemma lee tu apunte</p>
            <h2 className="mt-1 text-2xl font-black">Mide tu entorno de estudio</h2>
          </div>
          <p className="text-sm text-suave">
            La luz y el ruido influyen en la atención y en la memoria de trabajo. Si después te va peor de lo esperado, el
            resultado te dirá si tu entorno pudo influir y cómo mejorarlo.
          </p>

          {fase === "midiendo" && (
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-bold text-tenue">Ruido ambiente</span>
              <div className="h-2.5 overflow-hidden rounded-full bg-borde">
                {/* nivel en vivo: se actualiza 10 veces por segundo, por eso sin transición */}
                <div
                  className={`h-full origin-left rounded-full ${llenado > 0.55 ? "bg-rojo" : llenado > 0.25 ? "bg-ocre" : "bg-verde"}`}
                  style={{ transform: `scaleX(${Math.max(llenado, 0.02)})` }}
                />
              </div>
              {avisos.length > 0 && <p className="text-xs text-ambar">Sin permiso de {avisos.join(" ni ")}: se mide solo lo demás.</p>}
            </div>
          )}

          <p className="text-xs text-tenue">
            Cámara frontal y micrófono durante {DURACION_S} s. La imagen y el audio no se guardan ni se envían: solo se calculan
            niveles de luz y ruido en tu navegador.
          </p>
          <div className="mt-auto flex flex-col gap-2">
            {fase === "intro" ? (
              <>
                <Boton onClick={() => setFase("midiendo")} className="w-full">
                  Medir mi entorno ({DURACION_S} s)
                </Boton>
                <Boton variante="fantasma" onClick={onOmitir}>
                  Omitir
                </Boton>
              </>
            ) : (
              <Boton variante="fantasma" onClick={onOmitir}>
                Cancelar
              </Boton>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
