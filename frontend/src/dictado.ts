// Dictado con la Web Speech API del navegador: transcribe sin gastar tokens de Gemma.
// Chrome/Edge usan el servicio de voz de Google; Safari transcribe en el dispositivo. Firefox no lo soporta.
import { useEffect, useRef, useState } from "react";

interface ResultadoVoz {
  isFinal: boolean;
  0: { transcript: string };
}
interface EventoVoz {
  resultIndex: number;
  results: ArrayLike<ResultadoVoz>;
}
interface Reconocedor {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: EventoVoz) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}

function constructor(): (new () => Reconocedor) | null {
  const w = window as unknown as Record<string, unknown>;
  return (w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null) as (new () => Reconocedor) | null;
}

/** Chrome rechaza "es" sin región; se usa la región del navegador si la hay. */
function idioma(): string {
  const l = navigator.language ?? "";
  return /^es-[A-Za-z0-9]+$/.test(l) ? l : "es-ES";
}

// errores tras los que no tiene sentido reintentar solo
const FATALES: Record<string, string> = {
  "not-allowed": "El navegador no tiene permiso para usar el micrófono. Actívalo en el candado de la barra de direcciones.",
  "service-not-allowed": "Este navegador no permite el servicio de dictado. Prueba en Chrome, Edge o Safari.",
  network: "El dictado necesita internet y el servicio de voz del navegador (Brave y algunos Chromium no lo traen). Prueba en Chrome o Safari.",
  "audio-capture": "No se encontró un micrófono. Revisa que esté conectado y elegido en el sistema.",
  "language-not-supported": "Tu navegador no admite dictado en español.",
};

/** Devuelve el texto final de cada frase dictada vía `alFinal`, y la frase en curso como `parcial`. */
export function useDictado(alFinal: (texto: string) => void) {
  const disponible = constructor() !== null;
  const [escuchando, setEscuchando] = useState(false);
  const [parcial, setParcial] = useState("");
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<Reconocedor | null>(null);
  // true mientras el estudiante no pulse "Detener": Chrome corta solo tras un silencio y hay que reanudar
  const quiere = useRef(false);
  const alFinalRef = useRef(alFinal);
  alFinalRef.current = alFinal;

  useEffect(
    () => () => {
      quiere.current = false;
      ref.current?.stop();
    },
    [],
  );

  function arrancar() {
    const C = constructor();
    if (!C) return;
    const r = new C();
    r.lang = idioma();
    r.continuous = true;
    r.interimResults = true;
    r.onresult = (e) => {
      let enCurso = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) {
          const t = res[0].transcript.trim();
          if (t) alFinalRef.current(t);
        } else enCurso += res[0].transcript;
      }
      setParcial(enCurso);
    };
    r.onerror = (e) => {
      // "no-speech" y "aborted" son normales: el silencio se maneja reanudando en onend
      if (e.error === "no-speech" || e.error === "aborted") return;
      quiere.current = false;
      setError(FATALES[e.error] ?? `El dictado se detuvo (${e.error}).`);
    };
    r.onend = () => {
      setParcial("");
      if (quiere.current && ref.current === r) {
        try {
          arrancar();
          return;
        } catch {
          quiere.current = false;
        }
      }
      setEscuchando(false);
    };
    ref.current = r;
    r.start();
  }

  function iniciar() {
    setError(null);
    quiere.current = true;
    try {
      arrancar();
      setEscuchando(true);
    } catch (e) {
      quiere.current = false;
      setError(`No se pudo iniciar el dictado: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  function detener() {
    quiere.current = false;
    ref.current?.stop();
  }

  return { disponible, escuchando, parcial, error, iniciar, detener };
}
