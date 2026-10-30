// Orquesta el recorrido: apunte → confianza → explicación → brechas → aplicación → resultado
import { useEffect, useState } from "react";
import { api, repaso, type ConceptoEditable, type NombreTarea, type RepasoPendiente, type Salud, type Sesion } from "./api";
import { analizarArchivo } from "./calidad";
import { Brechas } from "./pantallas/Brechas";
import { Camara, RevisionFoto, type FotoRevisada } from "./pantallas/Camara";
import { Confianza } from "./pantallas/Confianza";
import { Explicacion } from "./pantallas/Explicacion";
import { Fuente } from "./pantallas/Fuente";
import { Inicio } from "./pantallas/Inicio";
import { Resultado } from "./pantallas/Resultado";
import { Transferencia } from "./pantallas/Transferencia";
import { Encabezado, MensajeError, Pie } from "./ui";

type Pantalla = "inicio" | "fuente" | "confianza" | "explicacion" | "brechas" | "transferencia" | "resultado";
const PASO: Record<Pantalla, number | null> = {
  inicio: null,
  fuente: 0,
  confianza: 1,
  explicacion: 2,
  brechas: 3,
  transferencia: 4,
  resultado: 5,
};

export default function App() {
  const [salud, setSalud] = useState<Salud | null>(null);
  const [sesion, setSesion] = useState<Sesion | null>(null);
  const [pantalla, setPantalla] = useState<Pantalla>("inicio");
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendiente, setPendiente] = useState<RepasoPendiente | null>(() => repaso.leer());
  const [previo, setPrevio] = useState<RepasoPendiente | null>(null);
  const [repasoGuardado, setRepasoGuardado] = useState(false);
  const [camara, setCamara] = useState(false);
  const [revision, setRevision] = useState<(FotoRevisada & { origen: "camara" | "archivo" }) | null>(null);

  useEffect(() => {
    api.salud().then(setSalud).catch((e: Error) => setError(e.message));
  }, []);

  // cada pantalla empieza arriba (sin desplazamiento animado: es un cambio de contexto, no una navegación interna)
  useEffect(() => {
    // con llaves: en Chrome reciente scrollTo devuelve una Promise y React la tomaría como limpieza
    window.scrollTo({ top: 0 });
  }, [pantalla]);

  // mientras Gemma trabaja, se consulta el estado de la sesión
  const hayPendiente = sesion ? Object.values(sesion.tasks).some((t) => t.estado === "pending") : false;
  useEffect(() => {
    if (!sesion || !hayPendiente) return;
    const id = setInterval(() => {
      api.ver(sesion.session_id).then(setSesion).catch((e: Error) => setError(e.message));
    }, 1500);
    return () => clearInterval(id);
  }, [sesion?.session_id, hayPendiente]); // eslint-disable-line react-hooks/exhaustive-deps

  async function ejecutar(accion: () => Promise<Sesion>, siguiente?: Pantalla) {
    setOcupado(true);
    setError(null);
    try {
      setSesion(await accion());
      if (siguiente) setPantalla(siguiente);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setOcupado(false);
    }
  }

  // toda foto pasa por la revisión (con control de calidad local) antes de gastar una llamada a Gemma
  async function revisarArchivo(archivo: File) {
    try {
      const informe = await analizarArchivo(archivo);
      setRevision({ archivo, url: URL.createObjectURL(archivo), informe, origen: "archivo" });
    } catch {
      // formato que el navegador no decodifica (p. ej. HEIC): lo valida el backend
      enviarFoto(archivo);
    }
  }

  function cerrarRevision() {
    if (revision) URL.revokeObjectURL(revision.url);
    setRevision(null);
  }

  function enviarFoto(archivo: File) {
    cerrarRevision();
    setCamara(false);
    ejecutar(() => api.crearConImagen(archivo), "fuente");
  }

  function reiniciar() {
    setSesion(null);
    setPrevio(null);
    setRepasoGuardado(false);
    setError(null);
    setPantalla("inicio");
  }

  const id = sesion?.session_id ?? "";
  const ejemplo = salud?.ejemplos.find((e) => e.id === sesion?.ejemplo);
  const reintentar = (t: NombreTarea) => ejecutar(() => api.reintentar(id, t));

  function programarRepaso() {
    if (!sesion) return;
    const manana = new Date();
    manana.setDate(manana.getDate() + 1);
    manana.setHours(6, 0, 0, 0);
    const r: RepasoPendiente = {
      topic: sesion.topic ?? "",
      concepts: sesion.concepts.map(
        (c): ConceptoEditable => ({ id: c.id, title: c.title, kind: c.kind, source_evidence: c.source_evidence, essential: c.essential }),
      ),
      programado_para: manana.toISOString(),
      confianza_previa: sesion.confidence_pct ?? 0,
      desempeno_previo: sesion.scores.performance_pct ?? sesion.scores.provisional_performance_pct ?? 0,
    };
    repaso.guardar(r);
    setPendiente(r);
    setRepasoGuardado(true);
  }

  function empezarRepaso() {
    if (!pendiente) return;
    const r = pendiente;
    ejecutar(async () => {
      const s = await api.crearRepaso(r.topic, r.concepts);
      setPrevio(r);
      repaso.borrar();
      setPendiente(null);
      return s;
    }, "confianza");
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Encabezado salud={salud} paso={PASO[pantalla]} onInicio={pantalla === "inicio" ? undefined : reiniciar} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-4 sm:px-6 sm:pt-8">
        {error && (
          <div className="mb-6">
            <MensajeError texto={error} />
          </div>
        )}

        {pantalla === "inicio" && (
          <Inicio
            salud={salud}
            repasoPendiente={pendiente}
            ocupado={ocupado}
            onArchivo={revisarArchivo}
            onEjemplo={(e) => ejecutar(() => api.crearConEjemplo(e), "fuente")}
            onRepaso={empezarRepaso}
          />
        )}

        {sesion && pantalla === "fuente" && (
          <Fuente
            sesion={sesion}
            ocupado={ocupado}
            onReintentar={() => reintentar("extraccion")}
            onConfirmar={(topic, cs) => ejecutar(() => api.revisarConceptos(id, topic, cs), "confianza")}
          />
        )}

        {sesion && pantalla === "confianza" && (
          <Confianza
            sesion={sesion}
            sugerida={ejemplo?.confianza_sugerida}
            ocupado={ocupado}
            onConfirmar={(v) => ejecutar(() => api.confianza(id, v), "explicacion")}
          />
        )}

        {sesion && pantalla === "explicacion" && (
          <Explicacion
            sesion={sesion}
            sugerida={ejemplo?.explicacion_sugerida}
            ocupado={ocupado}
            onEnviar={(texto, seg) => ejecutar(() => api.explicacion(id, texto, seg), "brechas")}
          />
        )}

        {sesion && pantalla === "brechas" && (
          <Brechas sesion={sesion} onReintentar={() => reintentar("analisis")} onContinuar={() => setPantalla("transferencia")} />
        )}

        {sesion && pantalla === "transferencia" && sesion.transfer && (
          <Transferencia
            sesion={sesion}
            ocupado={ocupado}
            onEnviar={(r) => ejecutar(() => api.transferencia(id, r))}
            onReintentar={() => reintentar("transferencia")}
            onResultado={() => setPantalla("resultado")}
          />
        )}

        {sesion && pantalla === "resultado" && (
          <Resultado
            sesion={sesion}
            previo={previo}
            repasoGuardado={repasoGuardado}
            onRepasoManana={programarRepaso}
            onNueva={reiniciar}
          />
        )}
      </main>
      <Pie salud={salud} />

      {camara && !revision && (
        <Camara onCerrar={() => setCamara(false)} onFoto={(f) => setRevision({ ...f, origen: "camara" })} />
      )}
      {revision && (
        <RevisionFoto
          foto={revision}
          textoOtra={revision.origen === "camara" ? "Repetir foto" : "Elegir otra"}
          onUsar={() => enviarFoto(revision.archivo)}
          onOtra={cerrarRevision}
          onCamara={
            revision.origen === "archivo"
              ? () => {
                  cerrarRevision();
                  setCamara(true);
                }
              : undefined
          }
          onCerrar={() => {
            cerrarRevision();
            setCamara(false);
          }}
        />
      )}
    </div>
  );
}
