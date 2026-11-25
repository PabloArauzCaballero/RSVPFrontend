#!/usr/bin/env python3
"""F4 c3 · genera los cinco documentos de diseño v2 del grupo infantil y de ritos (Cielo de bautizo, Menta infantil, Baby shower,
Primera comunión y Graduación) y los comprueba antes de escribirlos. Reutiliza las piezas y el verificador de contraste de c1.

Uso: python3 infantil-ritos.py <carpeta de salida>. Los mismos bytes van al FE (`packages/celebration-theme/src/design/documents/`) y al BE
(`seeds/templates/design-v2/`). La ficha de cada plantilla está en `docs/design/plantillas-f4c3/FICHAS-INFANTIL-RITOS.md`."""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from bodas import anim, art, box, build, drawing_head, el, ornament_head, pal, ratio  # noqa: E402

HAIR = dict(border=dict(width=1, style="solid", colour="line"))
CARD = dict(background=dict(kind="colour", role="surface"), border=dict(width=1, style="solid", colour="line"))

# ---- 1 · Cielo de bautizo · Nubes de papel y paloma ------------------------------------------------------------------
cielo = dict(
    key="cielo-bautizo", name="Cielo de bautizo", variant="classic", style="bands", ratio=1.25, gap=56, width=1040, ornament="flourish",
    radii=dict(sm=4, md=12, lg=24), heading=dict(family="nunito", weights=[600, 700]), body=dict(family="nunito-sans", weights=[400, 600]),
    palettes=dict(light=pal("#F2F7FC", "#FFFFFF", "#1B2733", "#4F6072", "#2A6496", "#2A6496", "#FFFFFF", "#7790A8"),
                  dark=pal("#0B1520", "#132130", "#E6EEF7", "#A9BACB", "#9CC6EF", "#86B5E4", "#0A1626", "#5F7790")),
    description="Nubes de papel y paloma: dos nubes en filete ondulado, la paloma en el acento y un título redondeado y sereno sobre un cielo muy claro.",
    tags=["baptism"], sections=["story", "schedule", "venues", "gallery", "gifts", "dressCode", "faq", "recommendations", "rsvp"],
    cover_blocks=[art("art-nube-alta", "onda", True), art("art-nube-baja", "onda", True), art("art-paloma", "paloma", True), art("art-nube-base", "onda")],
    cover_mobile=[el("el-nube-alta", "art-nube-alta", 0, 0, 3, 8, animation=anim("draw", 0, 1200)),
                  el("el-paloma", "art-paloma", 3, 0, 1, 8, animation=anim("draw", 600, 1400)),
                  el("el-cover", "cover", 0, 1, 4, 8, animation=anim("rise", 1100, 800), typography=dict(align="center", role="heading", size=44, lineHeight=1.08), padding=box(8, 16, 8), **HAIR),
                  el("el-nube-baja", "art-nube-baja", 1, 2, 3, 8, animation=anim("draw", 1300, 1200)),
                  el("el-nube-base", "art-nube-base", 0, 3, 4, 8, animation=anim("fade", 1600, 600))],
    cover_desktop=[el("el-nube-alta", "art-nube-alta", 0, 0, 4, 8, animation=anim("draw", 0, 1200)),
                   el("el-nube-baja", "art-nube-baja", 8, 0, 4, 8, animation=anim("draw", 300, 1200)),
                   el("el-cover", "cover", 0, 1, 7, 8, animation=anim("rise", 1100, 800), typography=dict(align="start", role="heading", size=80, lineHeight=1.05), padding=box(32), **HAIR),
                   el("el-paloma", "art-paloma", 8, 1, 3, 8, rotation=-6, animation=anim("draw", 600, 1400)),
                   el("el-nube-base", "art-nube-base", 3, 2, 5, 8, animation=anim("fade", 1600, 600))],
    header=lambda s: ornament_head("onda", 1, 2, 2)(s) if s != "story" else dict(block=art("art-nube-sec", "onda"), x=0, w=4, h=2))

# ---- 2 · Menta infantil · Juguetes de madera -------------------------------------------------------------------------
menta = dict(
    key="menta-infantil", name="Menta infantil", variant="festive", style="cards", ratio=1.25, gap=48, width=1040, ornament="none",
    radii=dict(sm=8, md=16, lg=28), heading=dict(family="fredoka", weights=[500, 600]), body=dict(family="mulish", weights=[400, 600]),
    palettes=dict(light=pal("#F0FAF6", "#FFFFFF", "#142822", "#4A6158", "#0C7566", "#0C7566", "#FFFFFF", "#6E8F85"),
                  dark=pal("#08161A", "#0F2429", "#E2F3EF", "#A1C1BA", "#7ED3C0", "#66C2AD", "#06201A", "#4F7771")),
    description="Juguetes de madera: el globo y el tren sobre el piso, un verde menta oscuro en la sola pieza de color y una tipografía redonda y gruesa.",
    tags=["baptism", "birthday"], sections=["story", "schedule", "venues", "gallery", "gifts", "faq", "rsvp"],
    cover_blocks=[art("art-globos", "globos", True), art("art-tren", "tren", True)],
    cover_mobile=[el("el-globos", "art-globos", 1, 0, 2, 8, animation=anim("draw", 100, 1200)),
                  el("el-cover", "cover", 0, 1, 4, 8, animation=anim("rise", 800, 800), typography=dict(align="center", role="heading", size=56, lineHeight=1.05), padding=box(24, 16), radius=28, **CARD),
                  el("el-tren", "art-tren", 0, 2, 4, 8, animation=anim("rise", 1400, 800))],
    cover_desktop=[el("el-tren", "art-tren", 0, 0, 5, 8, animation=anim("draw", 100, 1400)),
                   el("el-cover", "cover", 5, 0, 5, 8, animation=anim("rise", 900, 800), typography=dict(align="start", role="heading", size=72, lineHeight=1.05), padding=box(32), radius=28, **CARD),
                   el("el-globos", "art-globos", 10, 0, 2, 8, animation=anim("scale", 1500, 700))],
    header=lambda s: drawing_head(s, 0, 1, 8))

# ---- 3 · Baby shower · Sonajero y cochecito --------------------------------------------------------------------------
baby = dict(
    key="baby-shower", name="Baby shower", variant="minimal", style="cards", ratio=1.25, gap=56, width=1000, ornament="flourish",
    radii=dict(sm=6, md=14, lg=24), heading=dict(family="quicksand", weights=[600, 700]), body=dict(family="nunito", weights=[400, 600]),
    palettes=dict(light=pal("#FBF6F9", "#FFFFFF", "#2A1B25", "#68525E", "#A3406F", "#A3406F", "#FFFFFF", "#9A8190"),
                  dark=pal("#190F16", "#25171F", "#F7E8F0", "#CDB0C0", "#F0A1C3", "#E183AC", "#2C0B1B", "#86667A")),
    description="Sonajero y cochecito: un ciruela claro que no es ni rosa ni azul, formas suaves y el cochecito que entra empujado por el borde de la portada.",
    tags=["baby-shower"], sections=["story", "schedule", "venues", "gallery", "gifts", "faq", "rsvp"],
    cover_blocks=[art("art-sonajero", "sonajero", True), art("art-cochecito", "cochecito", True), art("art-biberon", "biberon")],
    cover_mobile=[el("el-cover", "cover", 0, 0, 4, 8, animation=anim("rise", 200, 800), typography=dict(align="start", role="heading", size=52, lineHeight=1.08), padding=box(0, 16)),
                  el("el-sonajero", "art-sonajero", 0, 1, 1, 8, rotation=-8, animation=anim("draw", 800, 1200)),
                  el("el-cochecito", "art-cochecito", 1, 1, 3, 8, animation=anim("rise", 1100, 900))],
    cover_desktop=[el("el-cover", "cover", 0, 0, 6, 8, animation=anim("rise", 200, 800), typography=dict(align="start", role="heading", size=80, lineHeight=1.05), padding=box(0, 16)),
                   el("el-cochecito", "art-cochecito", 6, 0, 4, 8, animation=anim("rise", 1100, 900)),
                   el("el-sonajero", "art-sonajero", 10, 0, 2, 8, rotation=-8, animation=anim("draw", 800, 1200))],
    header=lambda s: drawing_head(s, 1, 2, 8) if s in ("gifts", "rsvp", "venues", "schedule") else None)

# ---- 4 · Primera comunión · El recordatorio --------------------------------------------------------------------------
comunion = dict(
    key="primera-comunion", name="Primera comunión", variant="editorial", style="plain", ratio=1.25, gap=64, width=1060, ornament="rule",
    radii=dict(sm=0, md=4, lg=8), heading=dict(family="cormorant-garamond", weights=[600, 700]), body=dict(family="nunito-sans", weights=[400, 600]),
    palettes=dict(light=pal("#F6F5FB", "#FFFFFF", "#1E1B2E", "#58546E", "#5E4A9A", "#5E4A9A", "#FFFFFF", "#8D88A6"),
                  dark=pal("#100E1B", "#19162A", "#EDEAF8", "#B7B1CF", "#BFB0F0", "#A998E4", "#150F2E", "#6A6488")),
    description="El recordatorio: la tarjeta que se guarda en el misal, con el cáliz al centro, la vela y la paloma a los lados y un violeta litúrgico sereno.",
    tags=["first-communion"], sections=["story", "schedule", "venues", "gallery", "dressCode", "gifts", "faq", "rsvp"],
    cover_blocks=[art("art-filete", "filete", True), art("art-filete-base", "filete"), art("art-vela", "vela"), art("art-caliz", "caliz", True), art("art-paloma", "paloma")],
    cover_mobile=[el("el-filete", "art-filete", 0, 0, 4, 8, animation=anim("draw", 0, 900)),
                  el("el-cover", "cover", 0, 1, 4, 8, animation=anim("rise", 400, 800), typography=dict(align="start", role="heading", size=60, lineHeight=1.04)),
                  el("el-vela", "art-vela", 0, 2, 1, 8, animation=anim("fade", 1200, 600)),
                  el("el-caliz", "art-caliz", 1, 2, 2, 8, animation=anim("draw", 900, 1300)),
                  el("el-paloma", "art-paloma", 3, 2, 1, 8, animation=anim("fade", 1400, 600)),
                  el("el-filete-base", "art-filete-base", 0, 3, 4, 8, animation=anim("fade", 1700, 600))],
    cover_desktop=[el("el-filete", "art-filete", 0, 0, 5, 8, animation=anim("draw", 0, 900)),
                   el("el-cover", "cover", 0, 1, 7, 8, animation=anim("rise", 400, 800), typography=dict(align="start", role="heading", size=64, lineHeight=1.04)),
                   el("el-vela", "art-vela", 7, 1, 1, 8, animation=anim("fade", 1200, 600)),
                   el("el-caliz", "art-caliz", 8, 1, 2, 8, animation=anim("draw", 900, 1300)),
                   el("el-paloma", "art-paloma", 10, 1, 2, 8, animation=anim("fade", 1400, 600)),
                   el("el-filete-base", "art-filete-base", 0, 2, 5, 8, animation=anim("fade", 1700, 600))],
    header=ornament_head("filete", 0, 2, 2))

# ---- 5 · Graduación · El acta ----------------------------------------------------------------------------------------
grado = dict(
    key="graduacion", name="Graduación", variant="corporate", style="plain", ratio=1.25, gap=56, width=1120, ornament="rule", schedule="list",
    radii=dict(sm=0, md=2, lg=4), heading=dict(family="fraunces", weights=[500, 600]), body=dict(family="figtree", weights=[400, 500, 600]),
    palettes=dict(light=pal("#F5F6FA", "#FFFFFF", "#141826", "#4B5169", "#1E3A8A", "#1E3A8A", "#FFFFFF", "#8189A8"),
                  dark=pal("#0B0F1E", "#131A2E", "#E8ECF8", "#AAB3D0", "#9DB4F2", "#869FE8", "#0A1330", "#5B678C")),
    description="El acta de grado: el birrete y el diploma sobre una regla fina, un azul marino de ceremonia en la sola pieza de color y el programa del acto numerado.",
    tags=["graduation"], sections=["story", "schedule", "venues", "gallery", "dressCode", "gifts", "faq", "rsvp"],
    cover_blocks=[art("art-filete", "filete", True), art("art-birrete", "birrete", True), art("art-diploma", "diploma"), art("art-libros", "libros")],
    cover_mobile=[el("el-birrete", "art-birrete", 0, 0, 2, 8, rotation=-6, animation=anim("draw", 300, 1200), padding=box(0, 40)),
                  el("el-diploma", "art-diploma", 2, 0, 2, 8, rotation=4, animation=anim("rise", 900, 800), padding=box(0, 40)),
                  el("el-cover", "cover", 0, 1, 4, 8, animation=anim("rise", 1300, 800), typography=dict(align="start", role="heading", size=56, lineHeight=1.04)),
                  el("el-filete", "art-filete", 0, 2, 4, 8, animation=anim("draw", 1800, 900))],
    cover_desktop=[el("el-filete", "art-filete", 0, 0, 12, 8, animation=anim("draw", 0, 900)),
                   el("el-cover", "cover", 0, 1, 8, 8, animation=anim("rise", 1300, 800), typography=dict(align="start", role="heading", size=96, lineHeight=1.02)),
                   el("el-birrete", "art-birrete", 8, 1, 2, 8, rotation=8, animation=anim("draw", 300, 1200)),
                   el("el-libros", "art-libros", 10, 1, 1, 8, animation=anim("fade", 1500, 600)),
                   el("el-diploma", "art-diploma", 11, 1, 1, 8, rotation=4, animation=anim("rise", 900, 800))],
    header=lambda s: drawing_head(s, 0, 1, 8) if s in ("gifts", "rsvp", "venues") else None)

ALL = (cielo, menta, baby, comunion, grado)

if __name__ == "__main__":
    out = sys.argv[1]
    for spec in ALL:
        entry = build(spec)
        with open(f"{out}/{spec['key']}.json", "w", encoding="utf-8") as fh:
            json.dump(entry, fh, ensure_ascii=False, indent=2)
            fh.write("\n")
        for scheme in ("light", "dark"):
            p = spec["palettes"][scheme]
            print(spec["key"], scheme, " ".join(f"{a}/{b}={ratio(p[a], p[b]):.2f}" for a, b in (("text", "canvas"), ("muted", "canvas"), ("muted", "surface"), ("accent", "canvas"), ("accent", "surface"), ("onAccent", "accentFill"), ("line", "canvas"), ("line", "surface"), ("accentFill", "canvas"))))
    print("ok", len(ALL))
