#!/usr/bin/env python3
"""F4 c4 · genera los siete documentos de diseño v2 del grupo sobrio (Minimalista, Arena y terracota, Corporativo, Corporativo grafito,
Inauguración, Fiesta patronal y Otros eventos) y los comprueba antes de escribirlos. Reutiliza el constructor y las comprobaciones de
`bodas.py` (mismo directorio); este archivo solo trae las siete especificaciones.

Uso: python3 sobrio.py <carpeta de salida>. Los mismos bytes van al FE (`packages/celebration-theme/src/design/documents/`) y al BE
(`seeds/templates/design-v2/`). Las fichas están en `docs/design/plantillas-f4c4/FICHAS-SOBRIO.md`."""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from bodas import RULE_BOX, anim, art, box, build, drawing_head, el, ornament_head, pal  # noqa: E402

FULL = ["story", "schedule", "venues", "gallery", "dressCode", "gifts", "faq", "recommendations", "rsvp"]

# ---- 1 · Minimalista · Solo tipografía y una línea ------------------------------------------------------------------------
minimalista = dict(
    key="minimalista", name="Minimalista", variant="minimal", style="plain", ratio=1.25, gap=72, width=880, ornament="none",
    radii=dict(sm=0, md=2, lg=4), heading=dict(family="spectral", weights=[400, 500]), body=dict(family="geist", weights=[400, 500, 600]),
    palettes=dict(light=pal("#FBFAF7", "#FFFFFF", "#161616", "#5A5A56", "#2F5D50", "#2F5D50", "#FFFFFF", "#898989"),
                  dark=pal("#121413", "#1A1D1B", "#EDEDE8", "#A9ABA5", "#8FC4B0", "#7DB7A2", "#0C1511", "#6B716D")),
    description="Solo tipografía y una línea: papel, tinta y mucho aire; la portada tiene un único objeto, un filete, y el acento vive en un cuadrado pequeño.",
    tags=["anniversary", "baptism", "birthday", "quinceanera", "wedding"], sections=["schedule", "venues", "story", "gallery", "faq", "gifts", "rsvp"],
    cover_blocks=[art("art-linea", "filete", True)],
    cover_mobile=[el("el-cover", "cover", 0, 0, 4, 8, animation=anim("fade", 200, 800), typography=dict(align="start", role="heading", size=56, lineHeight=1.04, weight=400)),
                  el("el-linea", "art-linea", 0, 1, 3, 2, animation=anim("draw", 700, 1200))],
    cover_desktop=[el("el-cover", "cover", 0, 0, 9, 8, animation=anim("fade", 200, 800), typography=dict(align="start", role="heading", size=104, lineHeight=1.0, weight=400)),
                   el("el-linea", "art-linea", 0, 1, 4, 2, animation=anim("draw", 700, 1200))],
    header=lambda s: None)

# ---- 2 · Arena y terracota · Cerámica ----------------------------------------------------------------------------------
BOWL = dict(background=dict(kind="colour", role="surface"), border=RULE_BOX, radius=24)
arena = dict(
    key="arena-terracota", name="Arena y terracota", variant="classic", style="plain", ratio=1.25, gap=56, width=1040, ornament="onda",
    radii=dict(sm=4, md=12, lg=24), heading=dict(family="jost", weights=[400, 500]), body=dict(family="dm-sans", weights=[400, 500, 600]),
    palettes=dict(light=pal("#F6EEE3", "#FFFBF5", "#2A211B", "#66564A", "#A2431F", "#A2431F", "#FFFFFF", "#957F6D"),
                  dark=pal("#1C1511", "#261D17", "#F3E8DC", "#C7B4A3", "#E8996F", "#D98558", "#230E04", "#8A7461")),
    description="Cerámica: una taza sobre su plato, ondas de esmalte y una sans geométrica; el terracota apagado solo marca una pieza pequeña.",
    tags=["anniversary", "baptism", "birthday", "wedding"], sections=FULL,
    cover_blocks=[art("art-onda", "onda", True), art("art-tazas", "tazas")],
    cover_mobile=[el("el-onda", "art-onda", 0, 0, 4, 2, animation=anim("draw", 0, 1200)),
                  el("el-tazas", "art-tazas", 1, 2, 2, 11, animation=anim("scale", 500, 800)),
                  el("el-cover", "cover", 0, 13, 4, 20, animation=anim("rise", 900, 800), typography=dict(align="center", role="heading", weight=400), padding=box(24, 16), **BOWL)],
    cover_desktop=[el("el-tazas", "art-tazas", 0, 0, 4, 20, animation=anim("scale", 500, 800)),
                   el("el-cover", "cover", 4, 0, 8, 20, animation=anim("rise", 900, 800), typography=dict(align="start", role="heading", weight=400), padding=box(40), **BOWL),
                   el("el-onda", "art-onda", 4, 20, 8, 2, animation=anim("draw", 0, 1200))],
    header=ornament_head("onda", 0, 4, 2))

# ---- 3 · Corporativo · Credencial de evento --------------------------------------------------------------------------------
corporativo = dict(
    key="corporativo", name="Corporativo", variant="corporate", style="plain", ratio=1.2, gap=48, width=1120, ornament="rule",
    radii=dict(sm=0, md=4, lg=8), heading=dict(family="work-sans", weights=[500, 600]), body=dict(family="work-sans", weights=[400, 500, 600]),
    palettes=dict(light=pal("#F5F7FA", "#FFFFFF", "#14202E", "#4B5A6B", "#1F5FAD", "#1F5FAD", "#FFFFFF", "#7D8B9B"),
                  dark=pal("#0C1219", "#141C26", "#E6ECF3", "#A5B3C3", "#7FB2EE", "#6AA3E6", "#07111D", "#617386")),
    description="Credencial de evento: una grilla clara con los datos al frente, la credencial con su cordón y una sola línea de acento azul.",
    tags=["corporate"], sections=["story", "schedule", "venues", "dressCode", "gifts", "faq", "recommendations", "rsvp"],
    cover_blocks=[art("art-credencial", "credencial"), art("art-linea", "filete", True)],
    cover_mobile=[el("el-credencial", "art-credencial", 0, 0, 2, 12, animation=anim("rise", 200, 800)),
                  el("el-cover", "cover", 0, 12, 4, 18, animation=anim("fade", 700, 800), typography=dict(align="start", role="heading", size=44, lineHeight=1.1), padding=box(24, 16), border=RULE_BOX),
                  el("el-linea", "art-linea", 0, 30, 4, 2, animation=anim("draw", 1200, 900))],
    cover_desktop=[el("el-cover", "cover", 0, 0, 8, 18, animation=anim("fade", 700, 800), typography=dict(align="start", role="heading", size=72, lineHeight=1.05), padding=box(40), border=RULE_BOX),
                   el("el-credencial", "art-credencial", 9, 0, 3, 18, animation=anim("rise", 200, 800)),
                   el("el-linea", "art-linea", 0, 18, 8, 2, animation=anim("draw", 1200, 900))],
    header=lambda s: drawing_head(s, 0, 1, 8) if s in ("schedule", "venues", "rsvp", "gifts") else None)

# ---- 4 · Corporativo grafito · Informe anual -------------------------------------------------------------------------------
grafito = dict(
    key="corporativo-grafito", name="Corporativo grafito", variant="corporate", style="bands", ratio=1.25, gap=56, width=1160, ornament="rule", schedule="list",
    radii=dict(sm=0, md=0, lg=2), heading=dict(family="manrope", weights=[600, 700]), body=dict(family="karla", weights=[400, 500, 600]),
    palettes=dict(light=pal("#F4F5F6", "#FFFFFF", "#17191C", "#52585E", "#0B6E6A", "#0B6E6A", "#FFFFFF", "#80878D"),
                  dark=pal("#0F1113", "#181B1E", "#E8EAEC", "#A8AEB4", "#5FC4BE", "#4DB5AE", "#05191A", "#687077")),
    description="Informe anual: el titular ocupa el ancho completo, la agenda numerada va primero y un verde azulado marca solo una pieza pequeña sobre grafito.",
    tags=["corporate"], sections=["schedule", "story", "venues", "dressCode", "gifts", "faq", "recommendations", "rsvp"],
    cover_blocks=[art("art-libreta", "libreta"), art("art-regla", "filete", True)],
    cover_mobile=[el("el-regla", "art-regla", 0, 0, 4, 2, animation=anim("draw", 0, 1000)),
                  el("el-cover", "cover", 0, 2, 4, 20, animation=anim("rise", 400, 800), typography=dict(align="start", role="heading", size=52, lineHeight=1.04, weight=700)),
                  el("el-libreta", "art-libreta", 2, 22, 2, 9, animation=anim("fade", 1100, 600))],
    cover_desktop=[el("el-regla", "art-regla", 0, 0, 12, 2, animation=anim("draw", 0, 1000)),
                   el("el-cover", "cover", 0, 2, 12, 12, animation=anim("rise", 400, 800), typography=dict(align="start", role="heading", size=112, lineHeight=1.0, weight=700)),
                   el("el-libreta", "art-libreta", 10, 14, 2, 9, animation=anim("fade", 1100, 600))],
    header=lambda s: None)

# ---- 5 · Inauguración · Tijera y cinta -----------------------------------------------------------------------------------------
inauguracion = dict(
    key="inauguracion", name="Inauguración", variant="classic", style="plain", ratio=1.25, gap=48, width=1080, ornament="filete",
    radii=dict(sm=2, md=6, lg=12), heading=dict(family="manrope", weights=[600, 700]), body=dict(family="source-sans-3", weights=[400, 500, 600]),
    palettes=dict(light=pal("#F8F6F3", "#FFFFFF", "#1E1A17", "#5C5249", "#B03F00", "#B03F00", "#FFFFFF", "#8E8378"),
                  dark=pal("#17120F", "#211A15", "#F3EBE4", "#C4B6A9", "#F0A07A", "#E88A5C", "#230D03", "#887A6E")),
    description="Tijera y cinta: la cinta cruza la portada y la tijera la corta al entrar; un naranja quemado marca la apertura en una sola pieza.",
    tags=["opening"], sections=["story", "schedule", "venues", "gifts", "gallery", "faq", "recommendations", "rsvp"],
    cover_blocks=[art("art-tijera", "tijera-cinta"), art("art-cinta", "filete", True), art("art-llave", "llave")],
    cover_mobile=[el("el-tijera", "art-tijera", 0, 0, 4, 20, animation=anim("scale", 300, 900)),
                  el("el-cinta", "art-cinta", 0, 20, 4, 2, animation=anim("draw", 1000, 1000)),
                  el("el-cover", "cover", 0, 22, 4, 20, animation=anim("rise", 1200, 800), typography=dict(align="center", role="heading", size=48, lineHeight=1.08))],
    cover_desktop=[el("el-cinta", "art-cinta", 0, 0, 12, 2, animation=anim("draw", 1000, 1000)),
                   el("el-cover", "cover", 0, 2, 7, 20, animation=anim("rise", 1200, 800), typography=dict(align="start", role="heading", size=80, lineHeight=1.04)),
                   el("el-tijera", "art-tijera", 8, 2, 4, 20, animation=anim("scale", 300, 900)),
                   el("el-llave", "art-llave", 7, 12, 1, 8, animation=anim("fade", 1500, 600))],
    header=lambda s: drawing_head(s, 0, 1, 8) if s in ("venues", "gifts", "rsvp") else None)

# ---- 6 · Fiesta patronal · Entrada de fraternidad ----------------------------------------------------------------------------
GUILD = dict(background=dict(kind="colour", role="surface"), border=RULE_BOX)
patronal = dict(
    key="fiesta-patronal", name="Fiesta patronal", variant="festive", style="cards", ratio=1.333, gap=56, width=1080, ornament="banderin",
    radii=dict(sm=2, md=8, lg=16), heading=dict(family="playfair-display", weights=[600, 700]), body=dict(family="figtree", weights=[400, 500, 600]),
    palettes=dict(light=pal("#FFF7EC", "#FFFFFF", "#2B1622", "#634854", "#8E2D6B", "#8E2D6B", "#FFFFFF", "#957C8A"),
                  dark=pal("#1B0F17", "#261822", "#F8E9F0", "#CDB1C0", "#E79ACB", "#D681B7", "#2A0A1F", "#917182")),
    description="Entrada de fraternidad: banderines en la cima, la máscara de morenada al centro y un magenta profundo solo en una pieza de cada dibujo.",
    tags=["patronal-feast"], sections=FULL,
    cover_blocks=[art("art-banderin", "banderin", True), art("art-mascara", "mascara-morenada"), art("art-bombo", "bombo")],
    cover_mobile=[el("el-banderin", "art-banderin", 0, 0, 4, 2, animation=anim("draw", 0, 1200)),
                  el("el-mascara", "art-mascara", 1, 2, 2, 13, animation=anim("rise", 400, 900)),
                  el("el-cover", "cover", 0, 15, 4, 20, animation=anim("fade", 900, 800), typography=dict(align="center", role="heading", size=48, lineHeight=1.06), padding=box(24, 16), **GUILD)],
    cover_desktop=[el("el-banderin", "art-banderin", 0, 0, 12, 2, animation=anim("draw", 0, 1200)),
                   el("el-cover", "cover", 0, 2, 7, 22, animation=anim("fade", 900, 800), typography=dict(align="start", role="heading", size=88, lineHeight=1.02), padding=box(40), **GUILD),
                   el("el-mascara", "art-mascara", 7, 2, 3, 22, animation=anim("rise", 400, 900)),
                   el("el-bombo", "art-bombo", 10, 8, 2, 12, animation=anim("fade", 1300, 600))],
    header=ornament_head("banderin", 0, 4, 2))

# ---- 7 · Otros eventos · Postal en blanco -----------------------------------------------------------------------------------
otros = dict(
    key="otros-evento", name="Otros eventos", variant="editorial", style="plain", ratio=1.25, gap=64, width=960, ornament="filete",
    radii=dict(sm=0, md=4, lg=8), heading=dict(family="newsreader", weights=[400, 600]), body=dict(family="figtree", weights=[400, 500, 600]),
    palettes=dict(light=pal("#F9F9F7", "#FFFFFF", "#1B1C1E", "#55575C", "#4F5D95", "#4F5D95", "#FFFFFF", "#8A8C93"),
                  dark=pal("#111216", "#1A1C21", "#E9EAEE", "#AEB1BA", "#A9B5EE", "#97A5E6", "#0C1030", "#6E727C")),
    description="Una postal en blanco para cualquier celebración: el sello y los nombres centrados, una serif de lectura y un índigo apagado.",
    tags=["other"], sections=FULL,
    cover_blocks=[art("art-postal", "postal"), art("art-filete", "filete", True)],
    cover_mobile=[el("el-postal", "art-postal", 1, 0, 2, 11, animation=anim("rise", 200, 800)),
                  el("el-cover", "cover", 0, 11, 4, 18, animation=anim("fade", 800, 800), typography=dict(align="center", role="heading", size=52, lineHeight=1.06, weight=400)),
                  el("el-filete", "art-filete", 0, 29, 4, 2, animation=anim("draw", 1400, 900))],
    cover_desktop=[el("el-filete", "art-filete", 4, 0, 4, 2, animation=anim("draw", 0, 900)),
                   el("el-cover", "cover", 2, 2, 8, 16, animation=anim("fade", 800, 800), typography=dict(align="center", role="heading", size=96, lineHeight=1.02, weight=400)),
                   el("el-postal", "art-postal", 5, 18, 2, 12, animation=anim("rise", 200, 800))],
    header=lambda s: drawing_head(s, 1, 2, 8) if s in ("gifts", "rsvp") else None)

ALL = (minimalista, arena, corporativo, grafito, inauguracion, patronal, otros)

if __name__ == "__main__":
    out = sys.argv[1]
    for spec in ALL:
        with open(f"{out}/{spec['key']}.json", "w", encoding="utf-8") as fh:
            json.dump(build(spec), fh, ensure_ascii=False, indent=2)
            fh.write("\n")
    print("ok", len(ALL))
