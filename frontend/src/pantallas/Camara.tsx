// Captura con cámara y control de calidad (iluminación, reflejos, contraste, nitidez y ruido) antes de enviar a Gemma
import { useEffect, useRef, useState, type ReactNode } from "react";
import { evaluar, medir, UMBRALES, type Informe, type Metricas } from "../calidad";
import { Boton } from "../ui";

export interface FotoRevisada {
  archivo: File;
  url: string;
  informe: Informe;
}

/** Contenedor modal: entra con escala 0.97 + opacidad, centrado (los modales no tienen disparador de origen). */
export function Modal({ children, onCerrar, etiqueta }: { children: ReactNode; onCerrar: () => void; etiqueta: string }) {
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && onCerrar();
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [onCerrar]);
  return (
    <div className="modal-fondo fixed inset-0 z-50 grid place-items-center bg-tinta/55 p-3 sm:p-6" onClick={onCerrar}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={etiqueta}
        onClick={(e) => e.stopPropagation()}
        className="modal flex max-h-full w-full max-w-4xl flex-col overflow-hidden rounded-[28px] bg-papel shadow-2xl"
      >
        {children}
      </div>
    </div>
  );
}

type Nivel = "ok" | "aviso" | "mal";

function indicadores(m: Metricas, inf: Informe): { id: string; nombre: string; valor: string; nivel: Nivel }[] {
  const nivel = (ids: string[]): Nivel => {
    const p = inf.problemas.filter((x) => ids.includes(x.id));
    return p.some((x) => x.grave) ? "mal" : p.length ? "aviso" : "ok";
  };
  return [
    { id: "luz", nombre: "Luz", valor: `${Math.round((m.brillo / 255) * 100)} %`, nivel: nivel(["oscura", "clara"]) },
    { id: "reflejos", nombre: "Reflejos", valor: `${m.reflejos.toFixed(1)} %`, nivel: nivel(["reflejos"]) },
    { id: "contraste", nombre: "Contraste", valor: `${Math.round(m.contraste)}`, nivel: nivel(["contraste"]) },
    { id: "nitidez", nombre: "Nitidez", valor: `${Math.round(m.nitidez)}`, nivel: nivel(["borrosa"]) },
    { id: "ruido", nombre: "Ruido", valor: m.ruido.toFixed(1), nivel: nivel(["ruido"]) },
  ];
}

const COLOR: Record<Nivel, string> = { ok: "bg-verde", aviso: "bg-ocre", mal: "bg-rojo" };

function Indicadores({ informe, oscuro = false }: { informe: Informe; oscuro?: boolean }) {
  return (
    <ul className="flex flex-wrap gap-1.5" aria-label="Calidad de la imagen">
      {indicadores(informe.metricas, informe).map((x) => (
        <li
          key={x.id}
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold tabular-nums ${
            oscuro ? "bg-black/45 text-white backdrop-blur" : "bg-fondo text-suave ring-1 ring-borde"
          }`}
        >
          {/* solo cambia el color: se actualiza 4 veces por segundo, no debe moverse */}
          <span className={`size-2 rounded-full transition-colors duration-150 ${COLOR[x.nivel]}`} />
          {x.nombre} <span className={oscuro ? "text-white/70" : "text-tenue"}>{x.valor}</span>
        </li>
      ))}
    </ul>
  );
}

/** Informe de una foto ya tomada o elegida: el estudiante decide si la envía a Gemma. */
export function RevisionFoto({ foto, textoOtra, onUsar, onOtra, onCamara, onCerrar }: {
  foto: FotoRevisada;
  textoOtra: string;
  onUsar: () => void;
  onOtra: () => void;
  onCamara?: () => void;
  onCerrar: () => void;
}) {
  const { informe } = foto;
  return (
    <Modal onCerrar={onCerrar} etiqueta="Revisión de la foto">
      <div className="grid min-h-0 gap-0 overflow-y-auto md:grid-cols-[1.2fr_1fr]">
        <div className="bg-tinta/5 p-4">
          <img src={foto.url} alt="Foto del apunte" className="mx-auto max-h-[60vh] rounded-2xl object-contain" />
        </div>
        <div className="flex flex-col gap-4 p-6">
          <div>
            <p className="text-xs font-bold tracking-[0.18em] text-tenue uppercase">Antes de enviar · control de calidad</p>
            <h2 className="mt-1 text-2xl font-black">
              {informe.problemas.length === 0 ? "La foto se ve bien" : informe.apta ? "Se puede leer, con avisos" : "Gemma podría no leerla bien"}
            </h2>
          </div>
          <Indicadores informe={informe} />
          {informe.problemas.length > 0 && (
            <ul className="flex flex-col gap-2.5">
              {informe.problemas.map((p) => (
                <li key={p.id} className="flex gap-2.5 text-sm">
                  <span className={`mt-1.5 size-2 shrink-0 rounded-full ${p.grave ? "bg-rojo" : "bg-ocre"}`} />
                  <span>
                    <strong>{p.titulo}.</strong> {p.consejo}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="text-xs text-tenue">
            Medido en tu navegador, sin enviar nada. Son reglas orientativas: si Gemma no puede leer la foto, igual te lo dirá.
          </p>
          {/* acción principal a todo el ancho; las alternativas, en una fila debajo */}
          <div className="mt-auto flex flex-col gap-2 pt-2">
            <Boton onClick={onUsar} variante={informe.apta ? "primario" : "secundario"} className="w-full">
              {informe.problemas.length === 0 ? "Enviar a Gemma" : "Enviar igualmente"}
            </Boton>
            <div className="grid grid-cols-2 gap-2">
              {onCamara && (
                <Boton variante="secundario" onClick={onCamara} className="px-3">
                  <span className="size-2 rounded-full bg-rojo" aria-hidden />
                  Usar la cámara
                </Boton>
              )}
              <Boton variante="secundario" onClick={onOtra} className={`px-3 ${onCamara ? "" : "col-span-2"}`}>
                {textoOtra}
              </Boton>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

/** Cámara en vivo con indicadores de calidad; al disparar entrega la foto con su informe. */
export function Camara({ onFoto, onCerrar }: { onFoto: (f: FotoRevisada) => void; onCerrar: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [estado, setEstado] = useState<"iniciando" | "activa" | "error">("iniciando");
  const [error, setError] = useState("");
  const [informe, setInforme] = useState<Informe | null>(null);

  useEffect(() => {
    let flujo: MediaStream | null = null;
    let intervalo = 0;
    let cancelado = false;

    async function iniciar() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setEstado("error");
        setError("Este navegador no permite usar la cámara aquí (requiere HTTPS o localhost).");
        return;
      }
      try {
        flujo = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        });
        if (cancelado) return flujo.getTracks().forEach((t) => t.stop());
        const v = video.current!;
        v.srcObject = flujo;
        await v.play();
        setEstado("activa");
        intervalo = window.setInterval(() => {
          if (v.readyState >= 2 && v.videoWidth) setInforme(evaluar(medir(v, v.videoWidth, v.videoHeight)));
        }, 250);
      } catch (e) {
        const nombre = (e as DOMException).name;
        setEstado("error");
        setError(
          nombre === "NotAllowedError"
            ? "No diste permiso para usar la cámara. Actívalo desde el icono de la barra de direcciones y vuelve a intentarlo."
            : nombre === "NotFoundError"
              ? "No se encontró ninguna cámara en este dispositivo."
              : nombre === "NotReadableError"
                ? "La cámara está en uso por otra aplicación."
                : `No se pudo abrir la cámara (${nombre}).`,
        );
      }
    }
    iniciar();
    return () => {
      cancelado = true;
      clearInterval(intervalo);
      flujo?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  function disparar() {
    const v = video.current;
    if (!v || !v.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = v.videoWidth;
    canvas.height = v.videoHeight;
    canvas.getContext("2d")!.drawImage(v, 0, 0);
    const inf = evaluar(medir(canvas, canvas.width, canvas.height));
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const archivo = new File([blob], "apunte-camara.jpg", { type: "image/jpeg" });
        onFoto({ archivo, url: URL.createObjectURL(blob), informe: inf });
      },
      "image/jpeg",
      0.92,
    );
  }

  const consejo = informe?.problemas[0];

  return (
    <Modal onCerrar={onCerrar} etiqueta="Cámara">
      <div className="relative bg-black">
        <video ref={video} playsInline muted className="block max-h-[70vh] w-full object-contain" />
        {estado === "activa" && (
          <>
            {/* marco guía: encuadra una sola página */}
            <div className="pointer-events-none absolute inset-[8%] rounded-2xl border-2 border-dashed border-white/60" />
            <div className="absolute inset-x-0 top-0 flex flex-col gap-2 p-3">
              {informe && <Indicadores informe={informe} oscuro />}
            </div>
            <p className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-4 pt-8 pb-3 text-sm font-semibold text-white">
              {consejo ? `${consejo.titulo}: ${consejo.consejo}` : "Buena imagen. Encuadra una sola página y dispara."}
            </p>
          </>
        )}
        {estado === "iniciando" && <p className="p-16 text-center text-white/80">Pidiendo acceso a la cámara…</p>}
        {estado === "error" && <p className="p-12 text-center font-semibold text-white">{error}</p>}
      </div>
      <div className="flex items-center justify-between gap-3 p-4">
        <Boton variante="fantasma" onClick={onCerrar}>
          Cancelar
        </Boton>
        <Boton onClick={disparar} disabled={estado !== "activa"}>
          Tomar foto
        </Boton>
      </div>
    </Modal>
  );
}
