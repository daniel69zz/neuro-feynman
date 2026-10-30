# Neuro-Feynman — ¿Lo sabes o solo lo reconoces?

> **Documento de idea, funcionamiento y especificación de MVP.**
> **Evento:** Hacktoberfest Hack Day La Paz × NeuroTech UMSA 2026 · **Track:** Best Use of Gemma 4.
> **Modelo:** Gemma 4 `gemma-4-26b-a4b-it` vía Gemini API (Google AI Studio), con `thinkingLevel: MINIMAL`.
> **Alcance:** MVP demostrable en ~4 horas reutilizando el stack ya probado (React + Vite + Tailwind / Express + TypeScript / `@google/genai`).

---

## 1. La idea en una frase

El estudiante sube una foto de su apunte y dice qué partes cree dominar. Luego explica el tema **sin mirar**, como si se lo contara a un compañero. Gemma 4 compara la explicación con el apunte, y Neuro-Feynman le muestra **dónde su confianza no coincidía con lo que realmente pudo recordar**: su ilusión de competencia, hecha visible sobre su propio cuaderno.

**Pitch:** «Estudiaste toda la noche, lo subrayaste tres veces y sentías que lo sabías. Llegaste al examen y te quedaste en blanco. Neuro-Feynman te muestra, en dos minutos y sobre tu propio apunte, qué sabes de verdad y qué solo reconoces.»

---

## 2. El problema, con base científica (y bien dicho)

- **Ilusión de competencia.** Releer y subrayar hacen que el texto resulte familiar. Esa fluidez se confunde con dominio, y los estudiantes sobreestiman cuánto podrán recordar. *Koriat y Bjork (2005); Bjork, Dunlosky y Kornell (2013).*
- **Reconocer no es recordar.** Identificar algo que tienes delante es más fácil que recuperarlo sin ayuda, y en un examen se necesita lo segundo.
- **Práctica de recuperación (*testing effect*).** Intentar recordar de forma activa mejora la retención a largo plazo más que releer. *Roediger y Karpicke (2006).*
- **Técnica Feynman.** Explicar con tus propias palabras, como a un compañero, deja ver lo que no entiendes.
- **Juicios de aprendizaje y calibración.** La diferencia entre lo que crees que sabes y lo que demuestras es medible. Se llama **calibración metacognitiva** y es la métrica central de Neuro-Feynman. *Dunlosky y Metcalfe (2009), Metacognition.*

### Cómo hablar de esto (y cómo no)

| ❌ No decir | ✅ Decir |
|---|---|
| «Diagnóstico sináptico», «red sináptica consolidada» | «Lo que pudiste recuperar sin mirar» |
| «Sesgo del córtex prefrontal», «el hipocampo sella el recuerdo» | «Sesgo metacognitivo: confundir familiaridad con dominio» |
| «Conexión neuronal fuerte» | «Lo explicaste con tus palabras» |
| «Detecta lo que tu cerebro no consolidó» | «Compara tu confianza con tu recuerdo en este momento» |

Neuro-Feynman **no** mide actividad cerebral, **no** pone notas, **no** diagnostica problemas de aprendizaje y **no** reemplaza a un docente. Es una herramienta de estudio basada en la práctica de recuperación.

---

## 3. Flujo del estudiante (≈ 2–3 minutos)

```
1. APUNTE      2. ¿QUÉ CREES     3. EXPLÍCALO       4. ¿LEYÓ BIEN     5. TU MAPA         6. ANCLAS
   Foto del       SABER?            SIN MIRAR          GEMMA?            DE BRECHAS         Preguntas
   cuaderno /     Marca zonas +     (la foto se        Revisa los        Verde/ámbar/rojo   para lo que
   pizarra        confianza 0–100   oculta)            conceptos         + tu confianza     faltó
                                    ┄┄ en paralelo: Gemma extrae los conceptos del apunte ┄┄
```

1. **Apunte.** Foto del cuaderno, diapositiva o pizarra, desde el móvil o el escritorio. También hay apuntes de ejemplo para la demo.
2. **Juicio de aprendizaje.** Con la foto a la vista, el estudiante **toca las zonas que cree dominar** (mecánica NeuroLens) e indica su confianza global de 0 a 100 %.
3. **Recuperación activa.** **La foto desaparece.** El estudiante escribe o dicta en 2–3 minutos lo que recuerda, como si se lo explicara a un compañero. Mientras tanto, **Gemma extrae en segundo plano** los conceptos clave del apunte, así que la espera no se nota.
4. **«¿Gemma leyó bien tu apunte?»** Se muestra la lista de conceptos que extrajo Gemma (5–8) y el estudiante puede corregir, borrar o añadir. Este paso va **después** de explicar a propósito: si fuera antes, ver la lista sería una nueva exposición al contenido y contaminaría el intento de recordar.
5. **Mapa de brechas.** Gemma compara la explicación con los conceptos confirmados. Sobre la foto se pintan:
   - 🟢 **Explicado con tus palabras:** el concepto aparece con la relación o el porqué.
   - 🟡 **Mencionado sin explicar:** aparece el término, pero sin causa, condición o relación.
   - 🔴 **Omitido:** está en el apunte y no aparece en la explicación.

   Encima se superponen las zonas que el estudiante dijo dominar. **Las zonas que marcó como dominadas y salieron en rojo son su ilusión de competencia.**
6. **Anclas.** Para cada concepto en rojo o ámbar, **una sola pregunta de recuperación** (o una analogía cotidiana) que obliga a reconstruirlo, sin repetir el texto del cuaderno. Opcionalmente el estudiante responde y Gemma le dice si ahora sí aparece la idea.
7. **Cierre.** Resumen, sugerencia de repasar justo esas preguntas en 1 o 2 días (práctica espaciada) y botón «Intentar de nuevo».

---

## 4. Métricas (todas con fórmula explícita)

Sea *C* el conjunto de conceptos confirmados por el estudiante, cada uno con un peso: 2 para fórmulas, condiciones y causa-efecto; 1 para definiciones y ejemplos.

| Métrica | Fórmula | Qué significa |
|---|---|---|
| **Recuperación** | Σ peso · valor / Σ peso, con 🟢 = 1, 🟡 = 0,5, 🔴 = 0 | Cuánto del apunte pudiste reconstruir sin mirar (0–100 %) |
| **Confianza** | Valor declarado en el paso 2 (0–100 %) | Cuánto creías saber |
| **Brecha de calibración** | Confianza − Recuperación | > +15 puntos: **sobreconfianza** (posible ilusión de competencia) · −15 a +15: bien calibrado · < −15: te subestimaste |
| **Zonas de ilusión** | Conceptos 🔴 ubicados en zonas que marcaste como dominadas | Dónde concretamente creías saber y no recuperaste |
| **Puntos ciegos** | Conceptos 🔴 fuera de tus zonas marcadas | Lo que ni siquiera sentías que sabías |

Todas son **observaciones de una sola sesión**: no son notas, ni un diagnóstico, ni una medida del cerebro.

---

## 5. Papel de Gemma 4 (tres tareas, cada una verificable)

### Tarea A · Extracción multimodal del apunte (en segundo plano durante el paso 3)

**Entrada:** la foto del apunte (JPEG ~1280 px, sin EXIF).

```json
{
  "tema": "Potencial de acción",
  "legible": true,
  "conceptos": [
    {
      "id": "c1",
      "concepto": "Umbral de excitación",
      "tipo": "condicion",
      "texto_apunte": "si llega a -55 mV se dispara",
      "ubicacion": { "ymin": 120, "xmin": 40, "ymax": 260, "xmax": 610 }
    }
  ]
}
```

- `tipo` ∈ `definicion | causa_efecto | formula | condicion | ejemplo`.
- `ubicacion` usa coordenadas de 0 a 1000 sobre la imagen. Si la prueba previa muestra que Gemma no ubica bien en apuntes manuscritos, se usa el **plan B: franjas** (`"franja": 1–6`, de arriba abajo).
- Si `legible` es `false`, se pide otra foto y no se inventan conceptos.

### Tarea B · Evaluación de la explicación (con citas obligatorias)

**Entrada:** solo texto (los conceptos confirmados + la explicación del estudiante); no hace falta reenviar la imagen.

```json
{
  "evaluacion": [
    {
      "id": "c1",
      "estado": "explicado | mencionado | omitido",
      "cita_estudiante": "frase EXACTA del estudiante que lo respalda, o vacío si es omitido",
      "falta": "qué relación o condición no apareció (máx. 15 palabras)"
    }
  ]
}
```

**Verificación en el backend, no en Gemma:**
- Si la `cita_estudiante` de un concepto 🟢 o 🟡 **no aparece** en el texto del estudiante (comparando sin tildes ni mayúsculas, con tolerancia mínima), el concepto se marca como **«no verificado»** y baja un nivel. Así una cita inventada no puede inflar el resultado.
- Las métricas las calcula el backend con las fórmulas de la sección 4. Gemma no da puntajes.

### Tarea C · Anclas de recuperación

```json
{ "anclas": [ { "id": "c3", "pregunta": "¿Qué pasaría si...?", "tipo": "pregunta | analogia" } ] }
```

Reglas del prompt: una sola pregunta por concepto, que **no contenga la respuesta** ni copie el texto del apunte, y que obligue a reconstruir la relación o condición que faltó.

**Opcional:** el estudiante responde un ancla y Gemma verifica si ahora aparece la idea, con el mismo formato de cita de la Tarea B.

### Configuración común

- `temperature: 0.2`, `thinkingLevel: MINIMAL`. Si el modelo no lo admite, se desactiva automáticamente.
- Validación con zod, un reintento si el formato es inválido, reintentos automáticos ante 5xx y 429, y 45 s de tiempo límite por llamada.
- **Nunca** se rellena una respuesta de Gemma que falló: la interfaz muestra el error y ofrece reintentar.

---

## 6. NeuroLens integrado

La mecánica de NeuroLens que construimos para Predictia se reutiliza casi sin cambios:

| Pieza de NeuroLens | Uso en Neuro-Feynman |
|---|---|
| Marcas manuales con coordenadas normalizadas `[0, 1]` | Paso 2: «Toca las partes del apunte que crees dominar» |
| `MapaCalor` (canvas sobre la imagen) | Capa cian con las zonas marcadas por el estudiante |
| Capa de la IA | Cajas o franjas de los conceptos coloreadas 🟢🟡🔴 |
| Vistas Humano / IA / Comparar / Sin mapa | Igual |
| Lectura descriptiva generada a partir de los datos | «Marcaste 4 zonas como dominadas; en 2 de ellas no recuperaste el concepto (umbral, período refractario)» |

La pregunta experimental cambia: **¿coincide lo que crees saber con lo que puedes recuperar?**

---

## 7. Arquitectura

```
React + Vite + Tailwind (frontend)
  ├── Captura/selección del apunte (cámara del móvil o archivo, o ejemplo precargado)
  ├── MarcadorZonas + MapaCalor (reutilizados de NeuroLens)
  ├── Editor de explicación (texto; dictado opcional con Web Speech API)
  └── Pantallas: Apunte · Confianza · Explica · Revisa · Mapa · Anclas
        │  /api
        ▼
Express + TypeScript (backend)
  ├── Sesiones en memoria (sin base de datos, sin cuentas)
  ├── Preprocesado de imagen con sharp (rotación EXIF, 1280 px, sin metadatos)
  ├── gemma.ts reutilizado: tareas A, B y C con validación zod
  ├── verificador de citas + cálculo de métricas
  └── caché de la extracción de los apuntes de ejemplo (demo fiable)
```

### API mínima

| Método | Ruta | Responsabilidad |
|---|---|---|
| `POST` | `/api/sesion` | Crea la sesión con la foto (multipart) o un apunte de ejemplo; **lanza la Tarea A en segundo plano** |
| `POST` | `/api/sesion/:id/confianza` | Guarda las zonas marcadas y la confianza global |
| `POST` | `/api/sesion/:id/explicacion` | Guarda la explicación y el tiempo usado |
| `GET` | `/api/sesion/:id/conceptos` | Estado de la Tarea A (`pending \| ready \| error`) y conceptos para revisar |
| `POST` | `/api/sesion/:id/conceptos` | Conceptos confirmados o corregidos; lanza la Tarea B |
| `GET` | `/api/sesion/:id/resultado` | Evaluación verificada, métricas y mapa |
| `POST` | `/api/sesion/:id/anclas` | Genera las anclas (Tarea C) |
| `POST` | `/api/sesion/:id/ancla/:cid` | (Opcional) Verifica la respuesta a un ancla |
| `GET` | `/api/sesion/:id/foto` | Devuelve la foto, pero **no** durante el paso 3 |

### Privacidad

- La foto y el texto viven solo en la memoria de la sesión (máximo 2 h) y nunca se escriben en disco. Solo se envían a Gemma.
- No hay cuentas ni almacenamiento persistente. Se avisa antes de subir la foto: «Tu apunte se envía a Gemma para analizarlo y no se guarda».

---

## 8. Pantallas

1. **Inicio:**
   - Titular: «¿Lo sabes o solo lo reconoces?»
   - Una línea sobre la ilusión de competencia.
   - Botones «Subir mi apunte» y «Probar con un ejemplo».
2. **Confianza:**
   - Foto grande, con la instrucción «Toca lo que crees dominar».
   - Contador de marcas, deshacer y un slider de confianza con palabras («Lo repasé por encima / Creo que lo sé / Lo domino»).
3. **Explica sin mirar:**
   - La foto queda oculta, con un placeholder «Tu apunte está guardado».
   - Área de texto grande con un temporizador de 2–3 minutos que se puede extender.
   - Botón de dictado y una pista: «Explícalo como a un compañero que faltó a clase».
   - Pastilla discreta: «Gemma está leyendo tu apunte».
4. **Revisa:**
   - Lista de conceptos con su tipo, editable.
   - «¿Gemma leyó bien tu apunte?» con el botón «Sí, evaluar».
5. **Tu mapa:**
   - Foto con cajas o franjas 🟢🟡🔴 y tus zonas en cian, con las vistas de NeuroLens.
   - Tarjeta de calibración: «Confianza 85 % · Recuperación 48 % · **Sobreconfianza +37**».
   - Lista de conceptos con la cita del estudiante y lo que faltó.
6. **Anclas:**
   - Una tarjeta por concepto rojo o ámbar con su pregunta.
   - Campo opcional para responder.
   - Sugerencia: «Vuelve a responder estas preguntas mañana».

**Estética:** cálida y de cuaderno (papel crema, tinta café, marcatextos verde, ámbar y rojo). Debe funcionar bien en el **móvil**, porque ahí se toma la foto.

---

## 9. Verificación y comunicación de errores de la IA

| Riesgo | Cómo se detecta | Cómo se comunica o corrige |
|---|---|---|
| Gemma lee mal la letra o una fórmula | El estudiante revisa los conceptos (paso 4) | Puede editar, borrar o añadir antes de evaluar |
| Foto ilegible | `legible: false` o menos de 2 conceptos | Pide otra foto; no evalúa |
| Cita inventada para inflar un 🟢 | Comparación de la cita con el texto real, en el backend | Se marca «no verificado» y baja de nivel |
| Clasificación discutible (🟢 vs 🟡) | Se muestran la cita y «lo que faltó» | Botón «No estoy de acuerdo», que se registra; no es una nota |
| Ubicación imprecisa en la foto | Validación previa | Plan B: franjas en lugar de cajas |
| Ancla que regala la respuesta | Se revisa si la pregunta contiene `texto_apunte` | Se regenera una vez; si vuelve a pasar, se descarta |
| Fallo de API o latencia | Tiempo límite, reintentos y estados en la interfaz | Error visible y reintento; nunca se rellena |

---

## 10. Validación previa (antes de construir: ~45 min)

Gemma 4 ya funciona con imágenes; lo que falta saber es si sirve con **apuntes manuscritos**.

1. Preparar **3 apuntes de prueba** con fotos reales del equipo, idealmente de temas de neurociencia para que encajen con el evento (potencial de acción, sinapsis química, tipos de memoria).
   - Uno manuscrito limpio, uno manuscrito desordenado y una diapositiva impresa.
2. Para cada uno, escribir a mano la **lista de referencia** de 5–8 conceptos.
3. Script `check:extraccion`: corre la Tarea A sobre los 3 y compara con la referencia.
4. **Criterios para seguir adelante:**

| Prueba | Mínimo aceptable | Si no se cumple |
|---|---|---|
| Conceptos de la referencia encontrados | ≥ 70 % | Usar solo diapositivas e impresos en la demo |
| Ubicación (caja que cae sobre el concepto) | ≥ 60 % | Plan B: franjas |
| Latencia de la Tarea A | ≤ 20 s | Precalcular la extracción de los apuntes de ejemplo |
| Tarea B: clasificación coherente en 3 explicaciones de prueba (buena, a medias, mala) | Ordena bien las 3 | Ajustar el prompt y las definiciones de cada estado |

Estos números sirven también **para el pitch**: «En nuestras pruebas Gemma encontró X de Y conceptos clave en apuntes manuscritos».

---

## 11. Rúbrica (100 pts)

| Criterio | Pts | Qué mostramos |
|---|---|---|
| Implementación técnica y uso de IA | 30 | Gemma 4 multimodal en tres tareas (lee el apunte, evalúa con citas, genera anclas); revisión humana; citas verificadas en el backend; validación previa con números |
| Impacto y temática | 25 | Metacognición, práctica de recuperación y bienestar cognitivo del estudiante; problema universal y relatable |
| Funcionalidad y demo | 25 | Flujo completo en 2–3 min con un apunte real; apuntes de ejemplo en caché como respaldo |
| Pitch | 20 | Historia «me quedé en blanco»; el mapa de la ilusión sobre el propio cuaderno; lenguaje científico prudente |

**Requisitos del track:**
1. Modelo y acceso: `gemma-4-26b-a4b-it`, Gemini API.
2. Tarea: las tres tareas A, B y C.
3. Interacción real: demo en vivo.
4. Errores de la IA: sección 9.
5. Credenciales: `.env` fuera del repo.

---

## 12. Plan de construcción

**Se reutiliza de Predictia:** `gemma.ts` (cliente, reintentos, `MINIMAL`, extracción de JSON), el patrón de sesiones en memoria, `MapaCalor` y el marcado de zonas de NeuroLens, el tema visual, `ui.tsx` y `check-gemma`.

| Tiempo | Trabajo |
|---|---|
| 0:00–0:45 | Validación previa (sección 10) con los 3 apuntes. Decidir cajas o franjas |
| 0:45–1:30 | Backend: sesión, subida y preprocesado, Tarea A en segundo plano, Tarea B con verificación de citas y métricas |
| 1:30–2:45 | Frontend: Inicio, Confianza (marcas), Explica sin mirar, Revisa, Mapa |
| 2:45–3:15 | Tarea C (anclas), pantalla de anclas, caché de los ejemplos |
| 3:15–4:00 | Pruebas de punta a punta en móvil, README, ensayo del pitch |

### MVP imprescindible
- [ ] Subir una foto o elegir un ejemplo, y marcar zonas con confianza.
- [ ] Explicar sin ver la foto.
- [ ] Extracción de conceptos con Gemma, revisable por el estudiante.
- [ ] Evaluación 🟢🟡🔴 con citas verificadas.
- [ ] Mapa sobre la foto con zonas del estudiante y métrica de calibración.
- [ ] Anclas para los conceptos rojos y ámbar.
- [ ] Errores visibles, sin respuestas inventadas; README y `.env.example`.

### Si sobra tiempo
- [ ] Dictado por voz (Web Speech API, `es-BO` / `es-419`).
- [ ] Responder anclas y volver a verificar.
- [ ] Historial local (`localStorage`) para comparar la calibración entre sesiones del mismo tema.

---

## 13. Guion de demo (≈ 90 s)

| Tiempo | Acción | Frase |
|---|---|---|
| 0–10 s | Mostrar el apunte de «Potencial de acción» | «Estudié esto anoche. Lo releí tres veces. Siento que lo sé.» |
| 10–25 s | Marcar 4 zonas y confianza 85 % | «Le digo a la app qué creo dominar.» |
| 25–50 s | La foto se oculta y escribo una explicación incompleta | «Ahora, sin mirar, se lo explico a un compañero. Mientras, Gemma 4 lee mi cuaderno.» |
| 50–60 s | Revisar conceptos | «Confirmo que Gemma leyó bien mi letra.» |
| 60–80 s | Mapa: dos zonas «dominadas» en rojo; sobreconfianza +37 | «Aquí está mi ilusión de competencia: creía saber el período refractario y no lo recordé.» |
| 80–90 s | Ancla | «Gemma no me repite el apunte: me pregunta “¿por qué una neurona no puede dispararse dos veces seguidas?”.» |

### Plan B
- Apuntes de ejemplo con la extracción **en caché**, para no depender de la latencia de la API.
- Video grabado de una sesión real, rotulado como grabación.
- Segunda API key del equipo.

---

## 14. Decisiones abiertas

1. **Temas de los apuntes de demo:** se sugieren temas de neurociencia por el evento; el equipo debe aportar las fotos.
2. **Cajas o franjas:** se decide con la validación previa.
3. **Nombre visible:** «Neuro-Feynman» como producto, con el lema «¿Lo sabes o solo lo reconoces?».
4. **Ubicación del código:** carpeta nueva `hacktoberfest/neuro-feynman/`, reutilizando piezas de `predictia/` sin modificar Predictia.
