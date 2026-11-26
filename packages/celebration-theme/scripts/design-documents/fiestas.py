#!/usr/bin/env python3
"""F4 c2 · genera los siete documentos de diseño v2 del grupo de fiestas (Festivo, Fiesta lila, Cumpleaños adulto, Fiesta temática,
Fin de año, Despedida y Reencuentro) y los comprueba antes de escribirlos. Reutiliza las piezas y el verificador de contraste de c1.

Uso: python3 fiestas.py <carpeta de salida>. Los mismos bytes van al FE (`packages/celebration-theme/src/design/documents/`) y al BE
(`seeds/templates/design-v2/`). La ficha de cada plantilla está en `docs/design/plantillas-f4c2/FICHAS-FIESTAS.md`."""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from bodas import anim, art, box, build, drawing_head, el, ornament_head, pal, ratio, RULE_BOX  # noqa: E402

SHORT = ["story", "schedule", "venues", "gallery", "dressCode", "gifts", "faq", "rsvp"]
HAIR = dict(border=dict(width=1, style="solid", colour="line"))

# ---- 1 · Festivo · El vals ---------------------------------------------------------------------------------------------
festivo = dict(
    key="festivo", name="Festivo", variant="classic", style="cards", ratio=1.25, gap=56, width=1040, ornament="flourish",
    radii=dict(sm=2, md=8, lg=16), heading=dict(family="lora", weights=[500, 600]), body=dict(family="nunito", weights=[400, 600]),
    palettes=dict(light=pal("#FFF5FA", "#FFFFFF", "#2A1520", "#6A4A58", "#B3134F", "#B3134F", "#FFFFFF", "#9A8590"),
                  dark=pal("#1D0E16", "#2A1620", "#FAE8F0", "#D1B2C0", "#F59BBB", "#E57A9F", "#2B0A17", "#8A6877")),
    description="El vals de los quince: la tiara con su piedra en frambuesa sobre papel rosado, el nombre en serif y el vestido y el zapato como firma pequeña.",
    tags=["baptism", "birthday", "quinceanera"], sections=SHORT,
    cover_blocks=[art("art-tiara", "tiara", True), art("art-vestido", "vestido"), art("art-zapatilla", "zapatilla")],
    cover_mobile=[el("el-tiara", "art-tiara", 1, 0, 2, 12, animation=anim("draw", 100, 1200), padding=box(0, 40)),
                  el("el-cover", "cover", 0, 12, 4, 22, animation=anim("rise", 700, 800), typography=dict(align="center", role="heading", size=48, lineHeight=1.05), padding=box(0, 16)),
                  el("el-vestido", "art-vestido", 0, 34, 1, 8, rotation=-6, animation=anim("fade", 1500, 600)),
                  el("el-zapatilla", "art-zapatilla", 3, 34, 1, 8, rotation=6, animation=anim("fade", 1700, 600))],
    cover_desktop=[el("el-cover", "cover", 0, 0, 7, 8, animation=anim("rise", 700, 800), typography=dict(align="start", role="heading", size=88, lineHeight=1.02), padding=box(0, 16)),
                   el("el-tiara", "art-tiara", 8, 0, 3, 8, animation=anim("draw", 100, 1200)),
                   el("el-vestido", "art-vestido", 8, 1, 1, 8, rotation=-6, animation=anim("fade", 1500, 600)),
                   el("el-zapatilla", "art-zapatilla", 10, 1, 1, 8, rotation=6, animation=anim("fade", 1700, 600))],
    header=lambda s: drawing_head(s, 1, 2, 8))

# ---- 2 · Fiesta lila · La pista de baile ------------------------------------------------------------------------------
lila = dict(
    key="fiesta-lila", name="Fiesta lila", variant="festive", style="bands", ratio=1.333, gap=48, width=1120, ornament="none",
    radii=dict(sm=4, md=12, lg=24), heading=dict(family="josefin-sans", weights=[600, 700]), body=dict(family="nunito", weights=[400, 600]),
    palettes=dict(light=pal("#F8F4FF", "#FFFFFF", "#22152F", "#5E5070", "#6A3BBF", "#6A3BBF", "#FFFFFF", "#8C7FA3"),
                  dark=pal("#150F20", "#1F1730", "#EEE8FA", "#BDB2D2", "#C4A7F5", "#B08CEE", "#170B2A", "#70628D")),
    description="La pista de baile: un vinilo grande en lila profundo sobre papel claro, el titular en geometría ligera y la foto recortada como un disco.",
    tags=["birthday", "quinceanera"], sections=["story", "schedule", "venues", "gallery", "gifts", "dressCode", "faq", "rsvp"],
    cover_blocks=[art("art-vinilo", "vinilo"), art("art-popper", "popper"), art("art-bola", "bola-disco")],
    cover_mobile=[el("el-bola", "art-bola", 3, 0, 1, 8, animation=anim("fade", 1200, 600)),
                  el("el-vinilo", "art-vinilo", 0, 0, 3, 14, animation=anim("scale", 100, 900), padding=box(0, 80, 0, 0)),
                  el("el-cover", "cover", 0, 14, 4, 22, animation=anim("rise", 700, 800), typography=dict(align="start", role="heading", size=48, lineHeight=1.0)),
                  el("el-popper", "art-popper", 2, 36, 1, 8, rotation=12, animation=anim("fade", 1500, 600))],
    cover_desktop=[el("el-vinilo", "art-vinilo", 0, 0, 5, 8, animation=anim("scale", 100, 900)),
                   el("el-cover", "cover", 5, 0, 6, 8, animation=anim("rise", 700, 800), typography=dict(align="start", role="heading", size=96, lineHeight=1.0)),
                   el("el-bola", "art-bola", 11, 0, 1, 8, animation=anim("fade", 1200, 600)),
                   el("el-popper", "art-popper", 11, 1, 1, 8, rotation=12, animation=anim("fade", 1500, 600))],
    header=lambda s: drawing_head(s, 0, 1, 8))

# ---- 3 · Cumpleaños adulto · La cena larga ----------------------------------------------------------------------------
adulto = dict(
    key="cumpleanos-adulto", name="Cumpleaños adulto", variant="minimal", style="plain", ratio=1.2, gap=64, width=1080, ornament="rule",
    radii=dict(sm=0, md=2, lg=4), heading=dict(family="spectral", weights=[400, 500]), body=dict(family="karla", weights=[400, 500, 600]),
    palettes=dict(light=pal("#F7F5F0", "#FFFFFF", "#1C1B19", "#55534D", "#1D5C73", "#1D5C73", "#FFFFFF", "#868A8A"),
                  dark=pal("#0F1517", "#172023", "#E8EEEE", "#AEBBBD", "#7CC3DB", "#5FB0CC", "#08171D", "#65767A")),
    description="La cena larga: papel liso, un titular ligero y una sola copa en azul petróleo; casi nada más, para una mesa de adultos.",
    tags=["adult-birthday", "birthday"], sections=SHORT,
    cover_blocks=[art("art-copa", "copa-vino"), art("art-pastel", "pastel-porcion"), art("art-filete", "filete")],
    cover_mobile=[el("el-copa", "art-copa", 3, 0, 1, 8, animation=anim("fade", 900, 700)),
                  el("el-cover", "cover", 0, 1, 4, 24, animation=anim("fade", 300, 900), typography=dict(align="start", role="heading", size=56, lineHeight=1.05), padding=box(8, 0)),
                  el("el-filete", "art-filete", 0, 25, 4, 2, animation=anim("fade", 1000, 600))],
    cover_desktop=[el("el-cover", "cover", 1, 0, 7, 8, animation=anim("fade", 300, 900), typography=dict(align="start", role="heading", size=88, lineHeight=1.02), padding=box(0, 0, 0, 0)),
                   el("el-copa", "art-copa", 9, 0, 2, 16, animation=anim("fade", 900, 700)),
                   el("el-pastel", "art-pastel", 9, 2, 1, 8, animation=anim("fade", 1300, 600))],
    header=lambda s: drawing_head(s, 0, 1, 8) if s in ("gifts", "rsvp", "venues") else None)

# ---- 4 · Fiesta temática · Disfraz y pista ----------------------------------------------------------------------------
temas = dict(
    key="fiesta-tematica", name="Fiesta temática", variant="corporate", style="cards", ratio=1.25, gap=48, width=1040, ornament="flourish",
    radii=dict(sm=8, md=16, lg=24), heading=dict(family="fredoka", weights=[500, 600]), body=dict(family="karla", weights=[400, 600]),
    palettes=dict(light=pal("#F5F7FF", "#FFFFFF", "#161A33", "#505673", "#2F4FBF", "#2F4FBF", "#FFFFFF", "#8087A8"),
                  dark=pal("#0E1124", "#171B33", "#E9ECFA", "#AEB5D6", "#9DB2FF", "#8299F5", "#0A1030", "#5F678F")),
    description="Disfraz y pista: la bola de espejos cuelga sobre un titular redondo en azul real y el cañón de confeti marca la esquina, con la foto como entrada de cine.",
    tags=["themed-party"], sections=["schedule", "venues", "story", "gallery", "dressCode", "gifts", "faq", "rsvp"],
    cover_blocks=[art("art-bola", "bola-disco", True), art("art-popper", "popper"), art("art-antifaz", "antifaz")],
    cover_mobile=[el("el-bola", "art-bola", 1, 0, 2, 14, animation=anim("draw", 100, 1200), padding=box(0, 24)),
                  el("el-cover", "cover", 0, 14, 4, 20, animation=anim("scale", 700, 800), typography=dict(align="center", role="heading", size=48, lineHeight=1.0), padding=box(0, 16)),
                  el("el-antifaz", "art-antifaz", 0, 34, 1, 8, rotation=-10, animation=anim("fade", 1500, 600)),
                  el("el-popper", "art-popper", 3, 34, 1, 8, rotation=10, animation=anim("fade", 1700, 600))],
    cover_desktop=[el("el-popper", "art-popper", 0, 0, 2, 8, rotation=-8, animation=anim("fade", 1500, 600)),
                   el("el-cover", "cover", 2, 0, 8, 8, animation=anim("scale", 700, 800), typography=dict(align="center", role="heading", size=104, lineHeight=1.0)),
                   el("el-bola", "art-bola", 10, 0, 2, 14, animation=anim("draw", 100, 1200)),
                   el("el-antifaz", "art-antifaz", 1, 1, 1, 8, rotation=-10, animation=anim("fade", 1700, 600))],
    header=lambda s: drawing_head(s, 3, 1, 8))

# ---- 5 · Fin de año · Las doce uvas -----------------------------------------------------------------------------------
fin = dict(
    key="fin-de-ano", name="Fin de año", variant="editorial", style="bands", ratio=1.333, gap=56, width=1120, ornament="rule",
    radii=dict(sm=0, md=2, lg=4), heading=dict(family="cinzel", weights=[500, 600]), body=dict(family="jost", weights=[400, 500]),
    palettes=dict(light=pal("#F3F5F9", "#FFFFFF", "#121826", "#4C5568", "#1F3A6B", "#1F3A6B", "#FFFFFF", "#7F8BA3"),
                  dark=pal("#0A0F1D", "#121A2D", "#E8ECF6", "#A9B3C9", "#93B0F0", "#7C9CE6", "#0A1228", "#6370A0")),
    description="Las doce uvas: capitales clásicas sobre un azul noche, las uvas que se trazan antes de la medianoche y dos copas como brindis.",
    tags=["new-year"], sections=["story", "schedule", "venues", "dressCode", "gifts", "gallery", "faq", "rsvp"],
    cover_blocks=[art("art-deco", "deco", True), art("art-uvas", "uvas", True), art("art-copas", "copas"), art("art-deco-base", "deco")],
    cover_mobile=[el("el-deco", "art-deco", 0, 0, 4, 2, animation=anim("draw", 0, 1000)),
                  el("el-cover", "cover", 0, 2, 4, 20, animation=anim("rise", 400, 900), typography=dict(align="center", role="heading", size=56, lineHeight=1.08), padding=box(0, 8)),
                  el("el-uvas", "art-uvas", 0, 22, 2, 10, animation=anim("draw", 900, 1400)),
                  el("el-copas", "art-copas", 2, 22, 2, 10, animation=anim("rise", 1300, 800))],
    cover_desktop=[el("el-uvas", "art-uvas", 0, 0, 2, 12, animation=anim("draw", 900, 1400)),
                   el("el-cover", "cover", 2, 0, 8, 12, animation=anim("rise", 400, 900), typography=dict(align="center", role="heading", size=96, lineHeight=1.05)),
                   el("el-copas", "art-copas", 10, 0, 2, 12, animation=anim("rise", 1300, 800)),
                   el("el-deco-base", "art-deco-base", 4, 1, 4, 2, animation=anim("fade", 1700, 600))],
    header=ornament_head("deco", 0, 4, 2))

# ---- 6 · Despedida · El antifaz y el brindis --------------------------------------------------------------------------
despedida = dict(
    key="despedida", name="Despedida de soltero/a", variant="festive", style="plain", ratio=1.25, gap=48, width=1080, ornament="none",
    radii=dict(sm=4, md=8, lg=16), heading=dict(family="manrope", weights=[600, 700]), body=dict(family="mulish", weights=[400, 600]),
    palettes=dict(light=pal("#F1FAF8", "#FFFFFF", "#10242A", "#46605F", "#0F766E", "#0F766E", "#FFFFFF", "#6F8E8B"),
                  dark=pal("#0C1716", "#142423", "#E4F2F0", "#A8C2BF", "#6FD0C4", "#4DBBAE", "#06201D", "#557370")),
    description="La noche antes: un antifaz grande y torcido, el brindis en verde esmeralda y un titular de trazo firme que se lee de lejos.",
    tags=["bachelor-party"], sections=["schedule", "venues", "story", "gallery", "dressCode", "gifts", "faq", "rsvp"],
    cover_blocks=[art("art-antifaz", "antifaz"), art("art-coctel", "coctel"), art("art-sombrero", "sombrero-copa")],
    cover_mobile=[el("el-cover", "cover", 0, 0, 3, 22, animation=anim("rise", 300, 800), typography=dict(align="start", role="heading", size=44, lineHeight=1.05)),
                  el("el-sombrero", "art-sombrero", 3, 0, 1, 8, rotation=14, animation=anim("fade", 1300, 600)),
                  el("el-antifaz", "art-antifaz", 0, 22, 3, 12, rotation=-8, animation=anim("scale", 800, 800)),
                  el("el-coctel", "art-coctel", 3, 22, 1, 10, animation=anim("fade", 1500, 600))],
    cover_desktop=[el("el-antifaz", "art-antifaz", 6, 0, 5, 14, rotation=-8, animation=anim("scale", 800, 800)),
                   el("el-cover", "cover", 0, 0, 6, 14, animation=anim("rise", 300, 800), typography=dict(align="start", role="heading", size=88, lineHeight=1.0)),
                   el("el-coctel", "art-coctel", 11, 1, 1, 8, animation=anim("fade", 1500, 600)),
                   el("el-sombrero", "art-sombrero", 11, 2, 1, 8, rotation=14, animation=anim("fade", 1300, 600))],
    header=lambda s: drawing_head(s, 0, 1, 8) if s in ("gifts", "rsvp", "venues", "schedule") else None)

# ---- 7 · Reencuentro · El anuario y el casete -------------------------------------------------------------------------
reencuentro = dict(
    key="reencuentro", name="Reencuentro", variant="corporate", style="cards", ratio=1.25, gap=56, width=1080, ornament="rule",
    radii=dict(sm=0, md=4, lg=8), heading=dict(family="young-serif", weights=[400]), body=dict(family="work-sans", weights=[400, 500, 600]),
    palettes=dict(light=pal("#F6F1EA", "#FFFFFF", "#211A16", "#5F544B", "#9A3412", "#9A3412", "#FFFFFF", "#8F8378"),
                  dark=pal("#17110E", "#231A15", "#F2EAE2", "#BFB2A6", "#F0A583", "#E58A63", "#2A0F05", "#7A6A5D")),
    description="El anuario y el casete: la tapa del libro con el titular en serif grueso, un casete inclinado y el óxido solo en la etiqueta.",
    tags=["reunion"], sections=["story", "gallery", "schedule", "venues", "gifts", "faq", "recommendations", "rsvp"],
    cover_blocks=[art("art-anuario", "anuario"), art("art-casete", "cassette"), art("art-marco", "marco-foto")],
    cover_mobile=[el("el-anuario", "art-anuario", 0, 0, 2, 12, animation=anim("rise", 100, 800), padding=box(0, 24)),
                  el("el-marco", "art-marco", 2, 0, 2, 12, animation=anim("fade", 400, 700), padding=box(0, 24)),
                  el("el-cover", "cover", 0, 12, 4, 22, animation=anim("fade", 800, 800), typography=dict(align="start", role="heading", size=48, lineHeight=1.05), padding=box(24, 16), **HAIR),
                  el("el-casete", "art-casete", 1, 34, 2, 12, rotation=-4, animation=anim("rise", 1400, 800))],
    cover_desktop=[el("el-anuario", "art-anuario", 0, 0, 3, 8, rotation=-3, animation=anim("rise", 100, 800)),
                   el("el-cover", "cover", 3, 0, 6, 8, animation=anim("fade", 800, 800), typography=dict(align="start", role="heading", size=72, lineHeight=1.05), padding=box(40), **HAIR),
                   el("el-casete", "art-casete", 9, 0, 3, 8, rotation=4, animation=anim("rise", 1400, 800))],
    header=lambda s: drawing_head(s, 3, 1, 8))

ALL = (festivo, lila, adulto, temas, fin, despedida, reencuentro)

if __name__ == "__main__":
    out = sys.argv[1]
    for spec in ALL:
        entry = build(spec)
        with open(f"{out}/{spec['key']}.json", "w", encoding="utf-8") as fh:
            json.dump(entry, fh, ensure_ascii=False, indent=2)
            fh.write("\n")
        for scheme in ("light", "dark"):
            p = spec["palettes"][scheme]
            print(spec["key"], scheme, " ".join(f"{a}/{b}={ratio(p[a], p[b]):.2f}" for a, b in (("text", "canvas"), ("muted", "canvas"), ("muted", "surface"), ("accent", "canvas"), ("accent", "surface"), ("onAccent", "accentFill"), ("line", "canvas"), ("accentFill", "canvas"))))
    print("ok", len(ALL))
