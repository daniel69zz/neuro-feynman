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

/** Devuelve el texto final de cada frase dictada vía `alFinal`, y la frase en curso como `parcial`. */
export function useDictado(alFinal: (texto: string) => void) {
  const disponible = constructor() !== null;
  const [escuchando, setEscuchando] = useState(false);
  const [parcial, setParcial] = useState("");
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<Reconocedor | null>(null);
  const alFinalRef = useRef(alFinal);
  alFinalRef.current = alFinal;

  useEffect(() => () => ref.current?.stop(), []);

  function iniciar() {
    const C = constructor();
    if (!C) return;
    const r = new C();
    r.lang = navigator.language?.startsWith("es") ? navigator.language : "es-ES";
    r.continuous = true;
    r.interimResults = true;
    r.onresult = (e) => {
      let enCurso = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) alFinalRef.current(res[0].transcript.trim());
        else enCurso += res[0].transcript;
      }
      setParcial(enCurso);
    };
    r.onerror = (e) => {
      setError(
        e.error === "not-allowed"
          ? "El navegador no tiene permiso para usar el micrófono."
          : e.error === "no-speech"
            ? null
            : `El dictado se detuvo (${e.error}).`,
      );
    };
    r.onend = () => {
      setEscuchando(false);
      setParcial("");
    };
    ref.current = r;
    setError(null);
    r.start();
    setEscuchando(true);
  }

  function detener() {
    ref.current?.stop();
  }

  return { disponible, escuchando, parcial, error, iniciar, detener };
}
