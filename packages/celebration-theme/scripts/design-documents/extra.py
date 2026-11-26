#!/usr/bin/env python3
"""Decisión 6 de Pablo (2026-11-25) · genera los seis documentos de diseño v2 de las plantillas extra: dos más para Otros (OTHER), dos para
Despedida (BACHELOR_PARTY) y dos para Pedida (ENGAGEMENT), y los comprueba antes de escribirlos. Reutiliza el constructor y las comprobaciones de
`bodas.py` (mismo directorio); este archivo solo trae las seis especificaciones.

Uso: python3 extra.py <carpeta de salida>. Los mismos bytes van al FE (`packages/celebration-theme/src/design/documents/`) y al BE
(`seeds/templates/design-v2/`). Las fichas están en `docs/design/plantillas-extra/FICHAS-EXTRA.md`.

Cada una tiene su propia personalidad (tipografía del catálogo, ritmo de espacio, ornamento, dibujos DOne/Cuotea con UNA pieza de color en el
acento, nunca amarillo, sin rostros) y su propio modo oscuro compuesto, no el claro invertido."""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from bodas import RULE_BOX, anim, art, box, build, drawing_head, el, ornament_head, pal  # noqa: E402

# ---- Otros · 1 · Rumbo · la bitácora ------------------------------------------------------------------------------------------
LOG = dict(background=dict(kind="colour", role="surface"), border=RULE_BOX)
rumbo = dict(
    key="otros-rumbo", name="Otros eventos · Rumbo", variant="minimal", style="bands", ratio=1.25, gap=56, width=1000, ornament="rule",
    radii=dict(sm=2, md=6, lg=12), heading=dict(family="fraunces", weights=[600, 700]), body=dict(family="jost", weights=[400, 500, 600]),
    palettes=dict(light=pal("#EDF4F6", "#FFFFFF", "#0E2128", "#44606A", "#0B5F7A", "#0B5F7A", "#FFFFFF", "#6F8F9A"),
                  dark=pal("#08141A", "#0F1F26", "#E1EFF3", "#A2BCC5", "#6CC3DC", "#4FB1CD", "#042029", "#587985")),
    description="La bitácora: una brújula grande abre la portada, el recorrido va primero y un azul petróleo marca un solo punto del mapa.",
    tags=["other"], sections=["schedule", "venues", "story", "gallery", "gifts", "faq", "recommendations", "rsvp"], schedule="list",
    cover_blocks=[art("art-brujula", "brujula"), art("art-pin", "mapa-pin"), art("art-regla", "filete", True)],
    cover_mobile=[el("el-brujula", "art-brujula", 0, 0, 3, 8, rotation=-8, animation=anim("scale", 200, 900), padding=box(0, 56)),
                  el("el-pin", "art-pin", 3, 0, 1, 8, animation=anim("fade", 1200, 600)),
                  el("el-cover", "cover", 0, 8, 4, 18, animation=anim("rise", 700, 800), typography=dict(align="start", role="heading", size=48, lineHeight=1.06), **LOG, padding=box(16)),
                  el("el-regla", "art-regla", 0, 26, 4, 2, animation=anim("draw", 1400, 1000))],
    cover_desktop=[el("el-cover", "cover", 0, 0, 7, 18, animation=anim("rise", 700, 800), typography=dict(align="start", role="heading", size=72, lineHeight=1.04), padding=box(40), **LOG),
                   el("el-brujula", "art-brujula", 7, 0, 4, 18, rotation=-8, animation=anim("scale", 200, 900)),
                   el("el-pin", "art-pin", 11, 0, 1, 8, animation=anim("fade", 1200, 600)),
                   el("el-regla", "art-regla", 0, 18, 12, 2, animation=anim("draw", 1400, 1000))],
    header=lambda s: drawing_head(s, 0, 1, 5) if s in ("schedule", "venues", "rsvp") else None)

# ---- Otros · 2 · Mesa larga · el banquete ----------------------------------------------------------------------------------------
CLOTH = dict(background=dict(kind="colour", role="surface"), border=RULE_BOX, radius=12)
mesa = dict(
    key="otros-mesa", name="Otros eventos · Mesa larga", variant="classic", style="cards", ratio=1.333, gap=64, width=1080, ornament="flourish",
    radii=dict(sm=4, md=12, lg=24), heading=dict(family="libre-baskerville", weights=[400, 700]), body=dict(family="dm-sans", weights=[400, 500, 600]),
    palettes=dict(light=pal("#F8F4EA", "#FFFEFA", "#22201A", "#5B5648", "#1F6B4A", "#1F6B4A", "#FFFFFF", "#808C80"),
                  dark=pal("#121510", "#1B2018", "#EFEFE4", "#B7BCA9", "#7FCBA2", "#63B88B", "#06180F", "#6D7864")),
    description="La mesa larga: el mantel de papel con los nombres, una mesa servida para todos y un verde botella solo en un detalle.",
    tags=["other"], sections=["story", "venues", "schedule", "dressCode", "gifts", "gallery", "faq", "rsvp"],
    cover_blocks=[art("art-mesa", "mesa-larga"), art("art-copas", "copas"), art("art-flor", "ramo")],
    cover_mobile=[el("el-cover", "cover", 0, 0, 4, 20, animation=anim("fade", 200, 800), typography=dict(align="center", role="heading", size=44, lineHeight=1.1), padding=box(24, 16), **CLOTH),
                  el("el-mesa", "art-mesa", 0, 20, 4, 12, animation=anim("rise", 700, 900), padding=box(0, 24)),
                  el("el-copas", "art-copas", 1, 32, 2, 8, animation=anim("scale", 1400, 600), padding=box(0, 24))],
    cover_desktop=[el("el-cover", "cover", 2, 0, 8, 18, animation=anim("fade", 200, 800), typography=dict(align="center", role="heading", size=72, lineHeight=1.08), padding=box(40), **CLOTH),
                   el("el-copas", "art-copas", 10, 0, 2, 8, animation=anim("scale", 1400, 600)),
                   el("el-mesa", "art-mesa", 0, 18, 12, 12, animation=anim("rise", 700, 900), padding=box(0, 160))],
    header=lambda s: drawing_head(s, 3, 2, 5) if s in ("venues", "dressCode", "rsvp") else None, sec_el=dict(typography=dict(align="center")))

# ---- Despedida · 1 · Disco · la pista --------------------------------------------------------------------------------------------
STAGE = dict(background=dict(kind="colour", role="surface"), border=dict(width=2, style="solid", colour="accent"), radius=16)
disco = dict(
    key="despedida-disco", name="Despedida · Disco", variant="festive", style="bands", ratio=1.333, gap=48, width=1120, ornament="none",
    radii=dict(sm=6, md=14, lg=28), heading=dict(family="figtree", weights=[600, 700]), body=dict(family="mulish", weights=[400, 600]),
    palettes=dict(light=pal("#FBF3FC", "#FFFFFF", "#25132A", "#5E4663", "#8E1F8F", "#8E1F8F", "#FFFFFF", "#8F7894"),
                  dark=pal("#150A1B", "#21122A", "#F6E8F8", "#C9AECF", "#E39AE5", "#CE7FD0", "#2A0B2C", "#7D6285")),
    description="La pista: una bola de espejos y un vinilo giran sobre la portada, el titular es grueso y de tamaño grande y el violeta eléctrico solo toca una pieza.",
    tags=["bachelor-party"], sections=["schedule", "venues", "dressCode", "gallery", "gifts", "faq", "rsvp"],
    cover_blocks=[art("art-bola", "bola-disco"), art("art-vinilo", "vinilo"), art("art-popper", "popper")],
    cover_mobile=[el("el-bola", "art-bola", 0, 0, 2, 8, animation=anim("fade", 200, 800), padding=box(0, 16)),
                  el("el-vinilo", "art-vinilo", 2, 0, 2, 8, rotation=10, animation=anim("scale", 500, 800), padding=box(0, 16)),
                  el("el-cover", "cover", 0, 8, 4, 22, animation=anim("rise", 900, 800), typography=dict(align="start", role="heading", size=48, lineHeight=1.04, weight=700), padding=box(16), **STAGE),
                  el("el-popper", "art-popper", 2, 30, 2, 8, animation=anim("fade", 1500, 600))],
    cover_desktop=[el("el-bola", "art-bola", 0, 0, 3, 22, animation=anim("fade", 200, 800)),
                   el("el-cover", "cover", 3, 0, 6, 22, animation=anim("rise", 900, 800), typography=dict(align="center", role="heading", size=80, lineHeight=1.0, weight=700), padding=box(32), **STAGE),
                   el("el-vinilo", "art-vinilo", 9, 0, 3, 12, rotation=10, animation=anim("scale", 500, 800)),
                   el("el-popper", "art-popper", 9, 12, 3, 10, animation=anim("fade", 1500, 600))],
    header=lambda s: drawing_head(s, 0, 1, 5) if s in ("schedule", "dressCode", "gifts", "rsvp") else None)

# ---- Despedida · 2 · Black tie · la noche de gala --------------------------------------------------------------------------------
esmoquin = dict(
    key="despedida-esmoquin", name="Despedida · Black tie", variant="corporate", style="plain", ratio=1.25, gap=72, width=960, ornament="rule",
    radii=dict(sm=0, md=2, lg=4), heading=dict(family="dm-serif-display", weights=[400]), body=dict(family="jost", weights=[400, 500, 600]),
    palettes=dict(light=pal("#F5F4F2", "#FFFFFF", "#0F0F11", "#4F4F55", "#B4262A", "#B4262A", "#FFFFFF", "#85858C"),
                  dark=pal("#09090B", "#141417", "#F1F0EE", "#B3B3BA", "#F08A8C", "#E4686B", "#2A0507", "#626268")),
    description="Black tie: blanco y negro a toda tinta, una pajarita y un sombrero de copa en fila y un rojo escarlata en una sola pieza.",
    tags=["bachelor-party"], sections=["story", "dressCode", "schedule", "venues", "gifts", "faq", "rsvp"],
    cover_blocks=[art("art-pajarita", "pajarita"), art("art-sombrero", "sombrero-copa"), art("art-botella", "botella"), art("art-filete", "filete", True)],
    cover_mobile=[el("el-filete", "art-filete", 0, 0, 4, 2, animation=anim("draw", 0, 900)),
                  el("el-cover", "cover", 0, 2, 4, 20, animation=anim("fade", 600, 800), typography=dict(align="center", role="heading", size=56, lineHeight=1.04, weight=400)),
                  el("el-pajarita", "art-pajarita", 0, 22, 2, 8, animation=anim("scale", 1200, 700)),
                  el("el-sombrero", "art-sombrero", 2, 22, 2, 8, animation=anim("rise", 1500, 700))],
    cover_desktop=[el("el-filete", "art-filete", 3, 0, 6, 2, animation=anim("draw", 0, 900)),
                   el("el-cover", "cover", 1, 2, 10, 14, animation=anim("fade", 600, 800), typography=dict(align="center", role="heading", size=104, lineHeight=1.0, weight=400)),
                   el("el-pajarita", "art-pajarita", 3, 16, 2, 8, animation=anim("scale", 1200, 700)),
                   el("el-sombrero", "art-sombrero", 5, 16, 2, 8, animation=anim("rise", 1500, 700)),
                   el("el-botella", "art-botella", 7, 16, 2, 8, animation=anim("fade", 1800, 700))],
    header=lambda s: ornament_head("filete", 4, 4, 2)(s) if s in ("dressCode", "gifts", "rsvp") else None, sec_el=dict(typography=dict(align="center")))

# ---- Pedida · 1 · Solitario · la piedra única ------------------------------------------------------------------------------------
solitario = dict(
    key="pedida-solitario", name="Pedida · Solitario", variant="classic", style="plain", ratio=1.25, gap=80, width=920, ornament="none",
    radii=dict(sm=0, md=2, lg=6), heading=dict(family="marcellus", weights=[400]), body=dict(family="source-sans-3", weights=[400, 500, 600]),
    palettes=dict(light=pal("#F3F5FA", "#FFFFFF", "#141B2E", "#4A5570", "#2A3F8F", "#2A3F8F", "#FFFFFF", "#7C86A3"),
                  dark=pal("#0A0E1B", "#121829", "#E6EAF6", "#A7B1CE", "#9FB0F2", "#8497E6", "#071033", "#64709A")),
    description="Una sola piedra: un solitario grande al centro y mucho aire, la tipografía de inscripción y un azul zafiro que toca una pieza.",
    tags=["engagement"], sections=["story", "schedule", "venues", "gallery", "gifts", "faq", "rsvp"],
    cover_blocks=[art("art-solitario", "solitario"), art("art-botella", "botella")],
    cover_mobile=[el("el-solitario", "art-solitario", 1, 0, 2, 12, animation=anim("scale", 200, 1000), padding=box(0, 32)),
                  el("el-cover", "cover", 0, 12, 4, 18, animation=anim("fade", 900, 900), typography=dict(align="center", role="heading", size=40, lineHeight=1.12, weight=400), padding=box(8, 24))],
    cover_desktop=[el("el-solitario", "art-solitario", 0, 0, 5, 20, animation=anim("scale", 200, 1000)),
                   el("el-cover", "cover", 5, 0, 7, 20, animation=anim("fade", 900, 900), typography=dict(align="start", role="heading", size=72, lineHeight=1.08, weight=400), padding=box(24, 0)),
                   el("el-botella", "art-botella", 11, 20, 1, 8, animation=anim("fade", 1500, 600))],
    header=lambda s: None, sec_el=dict(typography=dict(align="center")))

# ---- Pedida · 2 · Rosa y carta · la pregunta escrita a mano -------------------------------------------------------------------
NOTE = dict(background=dict(kind="colour", role="surface"), border=RULE_BOX, radius=4)
rosa = dict(
    key="pedida-rosa", name="Pedida · Rosa y carta", variant="festive", style="cards", ratio=1.333, gap=56, width=1040, ornament="flourish",
    radii=dict(sm=4, md=10, lg=20), heading=dict(family="allura", weights=[400]), body=dict(family="mulish", weights=[400, 600]),
    palettes=dict(light=pal("#FCF3F5", "#FFFFFF", "#2D1620", "#6A4A56", "#A82E58", "#A82E58", "#FFFFFF", "#9B7F8A"),
                  dark=pal("#190B11", "#27141C", "#F8E6EC", "#CFB1BC", "#F29BB6", "#E07C9C", "#33081A", "#85626F")),
    description="La pregunta, escrita a mano: una carta con una rosa y letra cursiva grande, y un rosa profundo que solo toca los pétalos.",
    tags=["engagement"], sections=["story", "gallery", "schedule", "venues", "dressCode", "gifts", "faq", "rsvp"],
    cover_blocks=[art("art-rosa", "rosa"), art("art-sobre", "sobre"), art("art-filete", "filete", True)],
    cover_mobile=[el("el-rosa", "art-rosa", 0, 0, 2, 8, rotation=-10, animation=anim("rise", 200, 900), padding=box(0, 24)),
                  el("el-sobre", "art-sobre", 2, 0, 2, 8, rotation=6, animation=anim("envelope", 600, 900), padding=box(0, 24)),
                  el("el-cover", "cover", 0, 8, 4, 20, animation=anim("fade", 1000, 800), typography=dict(align="center", role="heading", size=56, lineHeight=1.0, weight=400), padding=box(24, 16), **NOTE),
                  el("el-filete", "art-filete", 1, 28, 2, 2, animation=anim("draw", 1600, 900))],
    cover_desktop=[el("el-cover", "cover", 0, 0, 7, 20, animation=anim("fade", 1000, 800), typography=dict(align="center", role="heading", size=104, lineHeight=1.0, weight=400), padding=box(40), **NOTE),
                   el("el-rosa", "art-rosa", 7, 0, 3, 20, rotation=-8, animation=anim("rise", 200, 900)),
                   el("el-sobre", "art-sobre", 10, 0, 2, 12, rotation=6, animation=anim("envelope", 600, 900)),
                   el("el-filete", "art-filete", 0, 20, 7, 2, animation=anim("draw", 1600, 900))],
    header=lambda s: drawing_head(s, 3, 2, 5) if s in ("gifts", "rsvp", "venues") else None, sec_el=dict(typography=dict(align="center")))

ALL = (rumbo, mesa, disco, esmoquin, solitario, rosa)

if __name__ == "__main__":
    out = sys.argv[1]
    for spec in ALL:
        with open(f"{out}/{spec['key']}.json", "w", encoding="utf-8") as fh:
            json.dump(build(spec), fh, ensure_ascii=False, indent=2)
            fh.write("\n")
    print("ok", len(ALL))
