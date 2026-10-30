"""API de Neuro-Feynman (FastAPI). El frontend solo habla con estas rutas; la API key no sale de aquí."""

import json

from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import FileResponse, JSONResponse, Response

from . import config, images, schemas, sessions

app = FastAPI(title="Neuro-Feynman API", version="0.1.0")


@app.exception_handler(sessions.ErrorSesion)
async def _error_sesion(_: Request, e: sessions.ErrorSesion) -> JSONResponse:
    return JSONResponse(status_code=e.codigo, content={"detail": str(e)})


def _ejemplos() -> list[dict]:
    salida = []
    for meta in sorted(config.EJEMPLOS_DIR.glob("*.json")):
        datos = json.loads(meta.read_text(encoding="utf-8"))
        if (config.EJEMPLOS_DIR / datos["archivo"]).exists():
            salida.append({"id": meta.stem, **datos})
    return salida


@app.get("/api/salud")
async def salud() -> dict:
    return {
        "ok": True,
        "modelo": config.MODELO,
        "modo": config.MODO,
        "api_key_configurada": bool(config.API_KEY),
        "ejemplos": _ejemplos(),
    }


@app.get("/api/ejemplos/{eid}/imagen")
async def imagen_ejemplo(eid: str):
    meta = next((e for e in _ejemplos() if e["id"] == eid), None)
    if meta is None:
        raise HTTPException(404, "Ejemplo no encontrado.")
    return FileResponse(config.EJEMPLOS_DIR / meta["archivo"], headers={"Cache-Control": "public, max-age=3600"})


@app.post("/api/sesiones", response_model=schemas.SesionPublica)
async def crear_sesion(imagen: UploadFile | None = File(None), ejemplo: str | None = Form(None)):
    if ejemplo:
        meta = next((e for e in _ejemplos() if e["id"] == ejemplo), None)
        if meta is None:
            raise HTTPException(404, "Ejemplo no encontrado.")
        datos = (config.EJEMPLOS_DIR / meta["archivo"]).read_bytes()
    elif imagen is not None:
        datos = await imagen.read(config.MAX_IMAGEN_BYTES + 1)
        if len(datos) > config.MAX_IMAGEN_BYTES:
            raise HTTPException(413, "La imagen supera 10 MB.")
    else:
        raise HTTPException(400, "Sube una imagen o elige un ejemplo.")
    try:
        jpeg = images.preparar(datos)
    except images.ImagenInvalida as e:
        raise HTTPException(400, str(e)) from e
    return sessions.publica(sessions.crear(jpeg, ejemplo))


@app.post("/api/sesiones/repaso", response_model=schemas.SesionPublica)
async def crear_repaso(cuerpo: schemas.ConceptosRevisados):
    return sessions.publica(sessions.crear_repaso(cuerpo))


@app.get("/api/sesiones/{sid}", response_model=schemas.SesionPublica)
async def ver_sesion(sid: str):
    return sessions.publica(sessions.obtener(sid))


@app.get("/api/sesiones/{sid}/imagen")
async def ver_imagen(sid: str):
    s = sessions.obtener(sid)
    if s.imagen is None:
        raise HTTPException(404, "Esta sesión no tiene imagen.")
    return Response(s.imagen, media_type="image/jpeg", headers={"Cache-Control": "private, max-age=7200"})


@app.put("/api/sesiones/{sid}/conceptos", response_model=schemas.SesionPublica)
async def revisar_conceptos(sid: str, cuerpo: schemas.ConceptosRevisados):
    s = sessions.obtener(sid)
    sessions.revisar_conceptos(s, cuerpo)
    return sessions.publica(s)


@app.post("/api/sesiones/{sid}/confianza", response_model=schemas.SesionPublica)
async def fijar_confianza(sid: str, cuerpo: schemas.Confianza):
    s = sessions.obtener(sid)
    sessions.fijar_confianza(s, cuerpo.confidence_pct)
    return sessions.publica(s)


@app.post("/api/sesiones/{sid}/explicacion", response_model=schemas.SesionPublica)
async def enviar_explicacion(sid: str, cuerpo: schemas.Explicacion):
    s = sessions.obtener(sid)
    sessions.enviar_explicacion(s, cuerpo)
    return sessions.publica(s)


@app.post("/api/sesiones/{sid}/transferencia", response_model=schemas.SesionPublica)
async def enviar_transferencia(sid: str, cuerpo: schemas.RespuestaTransferencia):
    s = sessions.obtener(sid)
    sessions.enviar_transferencia(s, cuerpo.respuesta)
    return sessions.publica(s)


@app.post("/api/sesiones/{sid}/entorno", response_model=schemas.SesionPublica)
async def registrar_entorno(sid: str, cuerpo: schemas.EntornoMedido):
    s = sessions.obtener(sid)
    sessions.registrar_entorno(s, cuerpo)
    return sessions.publica(s)


@app.post("/api/sesiones/{sid}/reintentar/{tarea}", response_model=schemas.SesionPublica)
async def reintentar(sid: str, tarea: str):
    s = sessions.obtener(sid)
    sessions.reintentar(s, tarea)
    return sessions.publica(s)
