"""Normalización de imágenes: orientación EXIF, máximo 1280 px, JPEG sin metadatos."""

import io

from PIL import Image, ImageOps, UnidentifiedImageError

LADO_MAX = 1280


class ImagenInvalida(Exception):
    pass


def preparar(datos: bytes) -> bytes:
    try:
        img = Image.open(io.BytesIO(datos))
        img = ImageOps.exif_transpose(img)
    except (UnidentifiedImageError, OSError) as e:
        raise ImagenInvalida("El archivo no es una imagen válida (usa JPG, PNG o WEBP).") from e
    if img.mode != "RGB":
        fondo = Image.new("RGB", img.size, "white")
        fondo.paste(img.convert("RGBA"), mask=img.convert("RGBA").getchannel("A"))
        img = fondo
    img.thumbnail((LADO_MAX, LADO_MAX))
    salida = io.BytesIO()
    # al reescribir el JPEG se descartan EXIF y GPS del original
    img.save(salida, "JPEG", quality=85, optimize=True)
    return salida.getvalue()
