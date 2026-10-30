# Neuro-Feynman

> Neuro-Feynman no te pregunta cuánto estudiaste. Te demuestra cuánto de lo que estudiaste realmente puedes explicar, recordar y aplicar.

Detector de ilusión de competencia y entrenador de recuperación activa asistido por **Gemma 4**. Hacktoberfest Hack Day La Paz × NeuroTech UMSA 2026 · track *Best Use of Gemma 4*.

## Recorrido

1. **Apunte**: subes una foto (cuaderno, pizarra o diapositiva). Antes de enviarla a Gemma pasa por una revisión, donde también puedes tomarla con la cámara. El navegador revisa la luz, los reflejos, el contraste tinta–papel, la nitidez (varianza del laplaciano) y el ruido (estimador de Immerkær), y avisa si la foto puede ser ilegible. Así no se gasta una llamada en una mala foto. Después, Gemma 4 extrae los conceptos con la evidencia del material.

   **Tu entorno**: mientras Gemma lee el apunte, la cámara frontal y el micrófono miden durante 5 s la luz, el contraluz y el ruido ambiente. Se calcula todo en el navegador y al backend solo llegan números: ni la foto ni el audio. Si el resultado sale bajo y el entorno era desfavorable, el resultado lo señala como *posible* influencia, con sugerencias. Las voces de fondo interfieren con la memoria de trabajo verbal y la poca luz aumenta la fatiga visual. Nunca se afirma que haya sido la causa.
2. **Revisión**: corriges lo que se leyó mal. El apunte corregido es la fuente de verdad.
3. **Confianza**: declaras de 0 a 100 % qué tan preparado te sientes, antes de ver nada.
4. **Explicación sin mirar**: por texto o dictado. El dictado usa la Web Speech API del navegador y no gasta tokens.
5. **Mapa de Brechas Metacognitivas**: cada concepto queda en *demostrado*, *por verificar* o *sin evidencia/incorrecto*, con la cita de tu explicación, la del apunte y una pregunta correctiva.
6. **Pregunta de aplicación**: una situación nueva de opción múltiple (4 opciones). Tras responder ves por qué tu opción es correcta o en qué falla, y tienes un reintento.
7. **Resultado**: «Lo que crees saber» frente a «Lo que demostraste», la brecha de calibración y qué practicar primero. Incluye la opción de repetir la prueba al día siguiente.

## Gemma 4 en la app

| | |
|---|---|
| Modelo | `gemma-4-26b-a4b-it` |
| Acceso | Gemini API con una key de Google AI Studio, siempre desde el backend; la key nunca llega al navegador |
| Llamada 1 (imagen → JSON) | Extrae tema, calidad de la fuente (`ok` / `needs_review`) y conceptos con evidencia |
| Llamada 2 (texto → JSON) | Clasifica cada concepto con una cita literal del estudiante y genera la pregunta de aplicación: 4 opciones, una correcta y la explicación de cada una |

Ajustes:
- `thinking_level=MINIMAL` reduce la latencia sin cambiar la respuesta.
- Temperatura 0.2.

### Cómo se verifican y comunican los errores de la IA

- **Salida validada:** toda salida de Gemma se valida con Pydantic. Si el formato es inválido, se reintenta una vez recordando el esquema.
- **Errores de red:** los 5xx, 429 y timeouts (45 s) se reintentan.
- **Sin respuestas inventadas:** si Gemma falla, se muestra el error con un botón para reintentar. Nunca se inventa una respuesta.
- **Citas verificadas:** cada cita del estudiante se busca literalmente en su texto (sin distinguir mayúsculas, tildes ni puntuación).
  - Si un concepto marcado como *demostrado* no tiene una cita verificable, baja a *por verificar*.
  - Lo mismo pasa si la cita solo nombra el término (menos de 5 palabras).
- **Puntuaciones en código:** las puntuaciones, la brecha y los umbrales se calculan en el backend (`backend/app/scoring.py`), nunca los decide el modelo.
- **Respuesta oculta:** cuál es la opción correcta y las explicaciones se quedan en el servidor hasta que respondes. Las opciones se barajan en el backend, y la corrección se hace en código, sin otra llamada al modelo. Se exige exactamente una opción correcta; si no, se reintenta.
- **Fuente ilegible:** una imagen ilegible devuelve `needs_review` y se pide corregir; no se inventan conceptos.
- **Modo demo:** `GEMMA_MODE=demo` usa respuestas simuladas, siempre rotuladas como «SIMULADO · no es Gemma».

### Rúbrica (experimental, visible en la interfaz)

| Dimensión | Peso |
|---|---:|
| Conceptos recuperados (demostrado = 1, por verificar = 0,5; los esenciales cuentan doble) | 40 % |
| Relaciones y causas explicadas con cita verificada | 30 % |
| Pregunta de aplicación (100 % al primer intento, 50 % al segundo) | 30 % |

- Hasta responder la aplicación, el resultado es **provisional**: se reescala con 40/30.
- **Brecha** = confianza − desempeño. Con ±20 puntos se muestra «posible sobreestimación» o «posible subestimación»; ese umbral es una regla de producto preliminar, no un corte validado.

## Ejecutar

Requisitos: Python 3.12 o superior y Node 20 o superior.

```bash
npm run setup:backend                         # crea backend/.venv e instala dependencias
cp backend/.env.example backend/.env           # y pon tu GEMINI_API_KEY
npm install
npm run dev                                    # API en :8000 y web en http://localhost:5174
```

Sin API key: `GEMMA_MODE=demo` en `backend/.env` (respuestas simuladas, rotuladas).

El ejemplo `backend/ejemplos/nat-pat.png` es un apunte **sintético**, generado con `backend/scripts/generar_ejemplo.py`. Para la demo conviene reemplazarlo por una foto real con el mismo nombre.

## Arquitectura

```text
frontend/  React 19 + Vite + Tailwind v4 (consulta periódica del estado)
  src/pantallas/   Inicio, Fuente, Confianza, Explicacion, Brechas, Transferencia, Resultado,
                   Camara (cámara y revisión de la foto) y Entorno (medición de luz y ruido)
  src/calidad.ts   control de calidad de la foto en el navegador
  src/dictado.ts   dictado con la Web Speech API
backend/   FastAPI
  app/schemas.py   contratos JSON (IA y públicos)
  app/gemma.py     cliente Gemini API: reintentos, JSON tolerante y validación
  app/prompts.py   las dos llamadas a Gemma
  app/sessions.py  sesiones en memoria (2 h), tareas en segundo plano, verificación de citas
  app/scoring.py   rúbrica determinista y calibración
  app/entorno.py   reglas deterministas de luz y ruido y su posible influencia
  app/images.py    normalización de la imagen (orientación EXIF, 1280 px, sin metadatos)
  app/simulado.py  respuestas del modo demo, siempre rotuladas
```

No usa fine-tuning, RAG ni agentes: es una cadena de dos llamadas más reglas en código, auditable.

## Aviso

Evaluación educativa exploratoria. No es un diagnóstico clínico ni neurológico y no mide sinapsis, hipocampo ni actividad cerebral.
