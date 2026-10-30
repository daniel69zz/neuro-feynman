# Neuro-Feynman

> Neuro-Feynman no te pregunta cuánto estudiaste. Te demuestra cuánto de lo que estudiaste realmente puedes explicar, recordar y aplicar.

Detector de ilusión de competencia y entrenador de recuperación activa asistido por **Gemma 4**. Hacktoberfest Hack Day La Paz × NeuroTech UMSA 2026 · track *Best Use of Gemma 4*.

## Recorrido

1. **Apunte**: subes una foto (cuaderno, pizarra o diapositiva) o la tomas con la cámara. Antes de enviarla a Gemma, el navegador revisa la luz, los reflejos, el contraste tinta–papel, la nitidez (varianza del laplaciano) y el ruido (estimador de Immerkær), y avisa si la foto puede ser ilegible. Así no se gasta una llamada en una mala foto. Después, Gemma 4 extrae los conceptos con la evidencia del material.
2. **Revisión**: corriges lo que se leyó mal. El apunte corregido es la fuente de verdad.
3. **Confianza**: declaras de 0 a 100 % qué tan preparado te sientes, antes de ver nada.
4. **Explicación sin mirar**: por texto o dictado. El dictado usa la Web Speech API del navegador y no gasta tokens.
5. **Mapa de Brechas Metacognitivas**: cada concepto queda en *demostrado*, *por verificar* o *sin evidencia/incorrecto*, con la cita de tu explicación, la del apunte y una pregunta correctiva.
6. **Pregunta de aplicación**: una situación nueva, con corrección argumentada punto por punto y un reintento.
7. **Resultado**: «Lo que crees saber» frente a «Lo que demostraste», la brecha de calibración y qué practicar primero. Incluye la opción de repetir la prueba al día siguiente.

## Gemma 4 en la app

| | |
|---|---|
| Modelo | `gemma-4-26b-a4b-it` |
| Acceso | Gemini API con una key de Google AI Studio, siempre desde el backend; la key nunca llega al navegador |
| Llamada 1 (imagen → JSON) | Extrae tema, calidad de la fuente (`ok` / `needs_review`) y conceptos con evidencia |
| Llamada 2 (texto → JSON) | Clasifica cada concepto con una cita literal del estudiante y genera la pregunta de aplicación y sus puntos esperados |
| Llamada 3 (texto → JSON) | Evalúa la respuesta de aplicación punto por punto, da la corrección y una respuesta modelo |

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
- **Respuesta oculta:** los puntos esperados de la pregunta de aplicación se quedan en el servidor y no se envían antes del intento.
- **Fuente ilegible:** una imagen ilegible devuelve `needs_review` y se pide corregir; no se inventan conceptos.
- **Modo demo:** `GEMMA_MODE=demo` usa respuestas simuladas, siempre rotuladas como «SIMULADO · no es Gemma».

### Rúbrica (experimental, visible en la interfaz)

| Dimensión | Peso |
|---|---:|
| Conceptos recuperados (demostrado = 1, por verificar = 0,5; los esenciales cuentan doble) | 40 % |
| Relaciones y causas explicadas con cita verificada | 30 % |
| Pregunta de aplicación (mejor intento) | 30 % |

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
frontend/  React 19 + Vite + Tailwind v4 (6 pantallas, consulta periódica del estado)
backend/   FastAPI
  app/schemas.py   contratos JSON (IA y públicos)
  app/gemma.py     cliente Gemini API: reintentos, JSON tolerante y validación
  app/prompts.py   las tres etapas
  app/sessions.py  sesiones en memoria (2 h), tareas en segundo plano, verificación de citas
  app/scoring.py   rúbrica determinista y calibración
```

No usa fine-tuning, RAG ni agentes: es una cadena de tres pasos, auditable.

## Aviso

Evaluación educativa exploratoria. No es un diagnóstico clínico ni neurológico y no mide sinapsis, hipocampo ni actividad cerebral.
