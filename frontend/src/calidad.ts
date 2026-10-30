// Control de calidad de la foto en el navegador, antes de gastar una llamada a Gemma.
// Heurísticas clásicas sobre la imagen en grises reducida a ~480 px de ancho.
// Los umbrales son reglas preliminares de producto: avisan, no bloquean (Gemma sigue marcando needs_review).

export interface Metricas {
  brillo: number; // media 0–255
  contraste: number; // tinta vs. papel: mediana − percentil 2 (0–255)
  nitidez: number; // varianza del laplaciano
  ruido: number; // sigma estimada (Immerkær)
  reflejos: number; // % de píxeles casi blancos
  sombras: number; // % de píxeles casi negros
}

export interface Problema {
  id: "oscura" | "clara" | "reflejos" | "contraste" | "borrosa" | "ruido";
  titulo: string;
  consejo: string;
  grave: boolean;
}

export interface Informe {
  metricas: Metricas;
  problemas: Problema[];
  apta: boolean;
}

// calibrados con el apunte de ejemplo y versiones degradadas (oscura, quemada, borrosa, con ruido)
export const UMBRALES = {
  brilloMin: 95,
  brilloGrave: 65,
  reflejosMax: 25,
  reflejosGrave: 45,
  contrasteMin: 70,
  contrasteGrave: 40,
  nitidezMin: 150,
  nitidezGrave: 50,
  ruidoMax: 7,
  ruidoGrave: 12,
} as const;

const ANCHO_ANALISIS = 480;

/** Dibuja la fuente reducida en un canvas y devuelve la luminancia (Rec. 601). */
function grises(fuente: CanvasImageSource, ancho: number, alto: number): { g: Float32Array; w: number; h: number } {
  const escala = Math.min(1, ANCHO_ANALISIS / ancho);
  const w = Math.max(1, Math.round(ancho * escala));
  const h = Math.max(1, Math.round(alto * escala));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(fuente, 0, 0, w, h);
  const { data } = ctx.getImageData(0, 0, w, h);
  const g = new Float32Array(w * h);
  for (let i = 0, j = 0; i < data.length; i += 4, j++) {
    g[j] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }
  return { g, w, h };
}

export function medir(fuente: CanvasImageSource, ancho: number, alto: number): Metricas {
  const { g, w, h } = grises(fuente, ancho, alto);
  const n = g.length;

  let suma = 0;
  let altos = 0;
  let bajos = 0;
  for (let i = 0; i < n; i++) {
    suma += g[i];
    if (g[i] >= 250) altos++;
    if (g[i] <= 15) bajos++;
  }
  const media = suma / n;
  // en un apunte casi todo es papel: el contraste útil es papel (mediana) frente a tinta (percentil 2)
  const histograma = new Uint32Array(256);
  for (let i = 0; i < n; i++) histograma[Math.min(255, Math.round(g[i]))]++;
  const percentil = (q: number) => {
    let acumulado = 0;
    for (let v = 0; v < 256; v++) {
      acumulado += histograma[v];
      if (acumulado >= q * n) return v;
    }
    return 255;
  };

  // laplaciano 4-vecinos (nitidez) y máscara de Immerkær (ruido) en el mismo recorrido
  let lapSuma = 0;
  let lapSuma2 = 0;
  let ruidoSuma = 0;
  let cuenta = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const c = g[i];
      const n4 = g[i - w] + g[i + w] + g[i - 1] + g[i + 1];
      const d4 = g[i - w - 1] + g[i - w + 1] + g[i + w - 1] + g[i + w + 1];
      const lap = n4 - 4 * c;
      lapSuma += lap;
      lapSuma2 += lap * lap;
      // núcleo [[1,-2,1],[-2,4,-2],[1,-2,1]]
      ruidoSuma += Math.abs(d4 - 2 * n4 + 4 * c);
      cuenta++;
    }
  }
  const lapMedia = lapSuma / Math.max(cuenta, 1);

  return {
    brillo: media,
    contraste: percentil(0.5) - percentil(0.02),
    nitidez: lapSuma2 / Math.max(cuenta, 1) - lapMedia ** 2,
    ruido: (Math.sqrt(Math.PI / 2) * ruidoSuma) / (6 * Math.max(cuenta, 1)),
    reflejos: (altos / n) * 100,
    sombras: (bajos / n) * 100,
  };
}

export function evaluar(m: Metricas): Informe {
  const p: Problema[] = [];
  const u = UMBRALES;
  // un papel blanco bien iluminado es claro: solo se avisa si hay saturación real o si además no hay contraste
  const quemada = m.reflejos > u.reflejosGrave || (m.brillo > 235 && m.contraste < u.contrasteGrave);
  if (m.brillo < u.brilloMin)
    p.push({ id: "oscura", titulo: "Poca luz", consejo: "Acércate a una ventana o enciende una luz encima del cuaderno.", grave: m.brillo < u.brilloGrave });
  if (quemada)
    p.push({ id: "clara", titulo: "Imagen quemada", consejo: "Hay demasiada luz directa: aleja la lámpara o cambia el ángulo.", grave: true });
  else if (m.reflejos > u.reflejosMax)
    p.push({ id: "reflejos", titulo: "Reflejos", consejo: "Inclina un poco la hoja o la cámara para quitar el brillo directo.", grave: false });
  if (m.contraste < u.contrasteMin && !quemada)
    p.push({ id: "contraste", titulo: "Poco contraste", consejo: "La letra se confunde con el papel: mejora la luz o usa un apunte más marcado.", grave: m.contraste < u.contrasteGrave });
  if (m.nitidez < u.nitidezMin)
    p.push({ id: "borrosa", titulo: "Borrosa", consejo: "Mantén el teléfono quieto, apoya los codos y toca la pantalla para enfocar.", grave: m.nitidez < u.nitidezGrave });
  if (m.ruido > u.ruidoMax)
    p.push({ id: "ruido", titulo: "Mucho ruido (grano)", consejo: "Suele deberse a poca luz: ilumina más en vez de acercarte.", grave: m.ruido > u.ruidoGrave });
  return { metricas: m, problemas: p, apta: !p.some((x) => x.grave) };
}

export async function analizarArchivo(archivo: File): Promise<Informe> {
  const bitmap = await createImageBitmap(archivo, { imageOrientation: "from-image" });
  try {
    return evaluar(medir(bitmap, bitmap.width, bitmap.height));
  } finally {
    bitmap.close();
  }
}
