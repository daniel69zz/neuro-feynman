"""Genera ejemplos/nat-pat.png: un apunte sintético de NAT/PAT con letra manuscrita.

Es un ejemplo de demostración (no una foto real). Para la presentación conviene reemplazarlo
por una foto real de un apunte propio con el mismo nombre de archivo.

Uso: .venv/bin/python scripts/generar_ejemplo.py
"""

import json
import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

DESTINO = Path(__file__).resolve().parent.parent / "ejemplos"
FUENTES = Path("/System/Library/Fonts/Supplemental")

ANCHO, ALTO = 1200, 1380
RENGLON = 54
MARGEN_IZQ = 130

TINTA = (28, 45, 110)
TINTA_ROJA = (170, 40, 40)

# (texto, sangría, color, tamaño) — None deja un renglón vacío
LINEAS = [
    ("Redes II — NAT y PAT", 0, TINTA_ROJA, 50),
    None,
    ("NAT = Network Address Translation", 0, TINTA, 40),
    ("• El router traduce IP privadas -> 1 IP pública", 20, TINTA, 36),
    ("  para que los equipos de la LAN salgan a Internet.", 20, TINTA, 36),
    ("• IP privadas (no se enrutan en Internet):", 20, TINTA, 36),
    ("  10.0.0.0/8 · 172.16.0.0/12 · 192.168.0.0/16", 20, TINTA, 36),
    ("• Motivo: hay pocas IPv4 públicas -> NAT las ahorra", 20, TINTA, 36),
    None,
    ("Tabla NAT", 0, TINTA_ROJA, 40),
    ("• El router guarda cada traducción en la tabla NAT", 20, TINTA, 36),
    ("  -> así sabe a quién devolver cada respuesta.", 20, TINTA, 36),
    None,
    ("PAT (NAT overload)", 0, TINTA_ROJA, 40),
    ("• Muchas IP privadas comparten 1 sola IP pública", 20, TINTA, 36),
    ("• Se distinguen por el PUERTO:", 20, TINTA, 36),
    ("  192.168.1.10:5000 -> 200.87.1.5:40001", 40, TINTA, 34),
    ("  192.168.1.11:5000 -> 200.87.1.5:40002", 40, TINTA, 34),
    ("• Respuesta a :40002 -> busca en la tabla -> .11", 20, TINTA, 36),
    None,
    ("Ojo: NAT estático = 1 privada <-> 1 pública (servidores)", 0, TINTA, 34),
]


def fuente(tamano: int) -> ImageFont.FreeTypeFont:
    for nombre in ("Bradley Hand Bold.ttf", "Chalkboard.ttc", "ChalkboardSE.ttc"):
        ruta = FUENTES / nombre
        if ruta.exists():
            return ImageFont.truetype(str(ruta), tamano)
    return ImageFont.load_default(tamano)


def main() -> None:
    rnd = random.Random(7)
    img = Image.new("RGB", (ANCHO, ALTO), (250, 247, 236))
    d = ImageDraw.Draw(img)

    # renglones y margen de cuaderno
    for y in range(170, ALTO, RENGLON):
        d.line([(0, y), (ANCHO, y)], fill=(178, 204, 228), width=2)
    d.line([(MARGEN_IZQ - 25, 0), (MARGEN_IZQ - 25, ALTO)], fill=(226, 140, 140), width=3)

    y = 170 - 8
    for linea in LINEAS:
        if linea is not None:
            texto, sangria, color, tamano = linea
            x = MARGEN_IZQ + sangria + rnd.randint(-4, 4)
            d.text((x, y + rnd.randint(-3, 2)), texto, font=fuente(tamano), fill=color, anchor="ls")
        y += RENGLON

    # leve inclinación y desenfoque para que parezca una foto
    img = img.rotate(-1.2, resample=Image.BICUBIC, expand=False, fillcolor=(236, 230, 214))
    img = img.filter(ImageFilter.GaussianBlur(0.6))

    DESTINO.mkdir(exist_ok=True)
    img.save(DESTINO / "nat-pat.png", optimize=True)
    (DESTINO / "nat-pat.json").write_text(
        json.dumps(
            {
                "archivo": "nat-pat.png",
                "titulo": "Redes II — NAT y PAT",
                "descripcion": "Apunte sintético de ejemplo (letra manuscrita generada). Reemplázalo por una foto real.",
                "sintetico": True,
                "explicacion_sugerida": "NAT permite cambiar direcciones IP privadas por públicas para acceder a Internet.",
                "confianza_sugerida": 90,
            },
            ensure_ascii=False,
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    print("ok →", DESTINO / "nat-pat.png")


if __name__ == "__main__":
    main()
