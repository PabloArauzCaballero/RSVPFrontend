#!/usr/bin/env python3
"""F4 c1 · genera los ocho documentos de diseño v2 del grupo de bodas y afines (Jardín botánico, Rosa antiguo, Editorial,
Editorial granate, Editorial oliva, Bodas de oro, Bodas de plata, Pedida de mano) y los comprueba antes de escribirlos.

Uso: python3 gen_bodas.py <carpeta de salida>. Los mismos bytes van al FE (`packages/celebration-theme/src/design/documents/`) y al BE
(`seeds/templates/design-v2/`). La ficha de cada plantilla está en `docs/design/plantillas-f4c1/FICHAS-BODAS.md`."""
import json
import sys

ROW = 8
SEC_COLS = 8  # las secciones usan ocho columnas: el icono de cabecera mide una (unos 40 px) y queda pegado al título
KEBAB = {"dressCode": "dress-code"}
SECTION_ART = {"schedule": "reloj", "venues": "mapa-pin", "gallery": "camara", "dressCode": "percha", "faq": "pregunta", "gifts": "regalo", "rsvp": "sobre", "recommendations": "auto"}
BLOCK_OF = {"story": ("story", "story", {}), "schedule": ("schedule", "schedule", {"display": "timeline"}), "venues": ("venues", "venues", {"display": "cards", "mapOnTap": True}),
            "gallery": ("gallery", "gallery", {"display": "grid"}), "dressCode": ("dress-code", "dressCode", {}), "faq": ("faq", "faq", {}), "recommendations": ("recommendations", "recommendations", {})}


# ---- contraste (el mismo algoritmo WCAG que el validador del BE) ---------------------------------------------------
def lum(hex_):
    v = int(hex_[1:], 16)
    out = []
    for c in ((v >> 16) & 255, (v >> 8) & 255, v & 255):
        c /= 255
        out.append(c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4)
    return 0.2126 * out[0] + 0.7152 * out[1] + 0.0722 * out[2]


def ratio(a, b):
    hi, lo = sorted((lum(a), lum(b)), reverse=True)
    return (hi + 0.05) / (lo + 0.05)


def hue(hex_):
    import colorsys
    v = int(hex_[1:], 16)
    h, _s, _v = colorsys.rgb_to_hsv(((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255)
    return h * 360


def pal(canvas, surface, text, muted, accent, accentFill, onAccent, line):
    return dict(canvas=canvas, surface=surface, text=text, muted=muted, accent=accent, accentFill=accentFill, onAccent=onAccent, line=line)


def check_palette(name, scheme, p):
    for fg, bg, need in (("text", "canvas", 4.5), ("text", "surface", 4.5), ("muted", "canvas", 4.5), ("muted", "surface", 4.5), ("accent", "canvas", 4.5), ("accent", "surface", 4.5),
                         ("onAccent", "accentFill", 4.5), ("line", "canvas", 3.0), ("line", "surface", 3.0), ("accentFill", "canvas", 3.0)):
        r = ratio(p[fg], p[bg])
        assert r >= need, f"{name} {scheme}: {fg} sobre {bg} = {r:.2f} < {need}"
    for role in ("accent", "accentFill", "line"):
        assert not 40 <= hue(p[role]) <= 70, f"{name} {scheme}: {role} cae en la franja del amarillo ({hue(p[role]):.0f})"


# ---- piezas -----------------------------------------------------------------------------------------------------------
def el(id_, block, x, y, w, h, **extra):
    d = dict(id=id_, block=block, x=x, y=y, w=w, h=h, visible=True)
    d.update(extra)
    return d


def anim(entrance, delay=0, duration=700):
    return dict(entrance=entrance, delayMs=delay, durationMs=duration)


def box(top, right=None, bottom=None, left=None):
    right = top if right is None else right
    bottom = top if bottom is None else bottom
    left = right if left is None else left
    return dict(top=top, right=right, bottom=bottom, left=left)


def canvas(elements, cols=4):
    return dict(mode="flow", columns=cols, rowHeight=ROW, elements=elements)


def stack(elements):
    """Apila los elementos de la portada: los que comparten `y` van en la misma fila (lado a lado) y cada fila empieza donde acaba la
    anterior. Todos miden 8 filas como mínimo (un dibujo héroe pide más con `hero=<filas>`, p. ej. 64: ancla la portada de escritorio): la cuadrícula crece sola con el contenido (una foto, un nombre largo) y no deja huecos."""
    out, cursor, last_y, row_end = [], 0, None, 0
    for item in elements:
        if last_y is None or item["y"] != last_y:
            cursor = row_end
            last_y = item["y"]
        rows = item.pop("hero", 8)
        item = dict(item, y=cursor, h=rows)
        row_end = max(row_end, cursor + rows)
        out.append(item)
    return out


def art(id_, ill, draw=False):
    return dict(id=id_, type="illustration", config=dict(illustrationId=ill, tint="accent", drawOnEnter=draw))


MONO = dict(id="monogram", type="monogram", config={})


def sections_builder(spec):
    """Una página por sección. `header(section)` devuelve (bloque de cabecera, columna, ancho, alto) o None."""
    blocks, pages = [], []

    def add(b):
        if not any(x["id"] == b["id"] for x in blocks):
            blocks.append(b)

    return blocks, pages, add


def build(spec):
    blocks, pages, add = sections_builder(spec)
    add(dict(id="cover", type="cover", config=dict(variant=spec["variant"], envelope=False)))
    for b in spec["cover_blocks"]:
        add(b)
    pages.append(dict(id="page-cover", kind="cover", style=spec.get("cover_style", "plain"), canvases=dict(mobile=canvas(stack(spec["cover_mobile"]), 4), desktop=canvas(stack(spec["cover_desktop"]), 12))))
    for section in spec["sections"]:
        els, y = [], 0
        head = spec["header"](section)
        if head:
            add(head["block"])
            els.append(el("el-" + head["block"]["id"], head["block"]["id"], head.get("x", 0), 0, head["w"], head["h"], animation=anim("fade", 0, 500)))
            y = head["h"]
        if section == "gifts":
            add(dict(id="gifts-cta", type="giftsCta", required=True, config=dict(style="solid")))
            els.append(el("el-gifts-cta", "gifts-cta", 0, y, SEC_COLS, 6))
        elif section == "rsvp":
            add(dict(id="rsvp-cta", type="rsvpCta", config=dict(style="solid")))
            els.append(el("el-rsvp-cta", "rsvp-cta", 0, y, SEC_COLS, 6))
        else:
            bid, btype, cfg = BLOCK_OF[section]
            cfg = dict(cfg)
            if section == "schedule" and spec.get("schedule"):
                cfg["display"] = spec["schedule"]
            add(dict(id=bid, type=btype, config=cfg))
            els.append(el("el-" + bid, bid, 0, y, SEC_COLS, 1, **spec.get("sec_el", {})))
        pages.append(dict(id="page-" + KEBAB.get(section, section), kind="section", section=section, style=spec["style"], canvases=dict(mobile=canvas(els, SEC_COLS))))
    typ = dict(heading=spec["heading"], body=spec["body"], scale=dict(base=16, ratio=spec["ratio"]))
    if "monogram" in spec:
        typ["monogram"] = spec["monogram"]
    for scheme in ("light", "dark"):
        check_palette(spec["key"], scheme, spec["palettes"][scheme])
    doc = dict(schemaVersion=2, tokens=dict(palettes=spec["palettes"], typography=typ, spacing=dict(unit=8, section=spec["gap"], contentMaxWidth=spec["width"]),
                                          radii=spec["radii"], ornament=spec["ornament"], illustrationSet="none"), pages=pages, blocks=blocks, custom=dict(html="", css=""))
    return dict(key=spec["key"], name=spec["name"], description=spec["description"], layout=spec["variant"], eventTypeTags=spec["tags"], sectionOrder=spec["sections"], theme=doc)


def drawing_head(section, x=0, w=1, h=5):
    ill = SECTION_ART.get(section)
    return dict(block=art("art-" + ill, ill), x=x, w=w, h=h) if ill else None


def ornament_head(ornament, x=0, w=SEC_COLS, h=2, draw=False):
    return lambda section: dict(block=art("art-" + ornament + "-sec", ornament, draw), x=x, w=w, h=h)


FULL = ["story", "schedule", "venues", "gallery", "dressCode", "gifts", "faq", "recommendations", "rsvp"]
SHORT = ["story", "schedule", "venues", "gallery", "dressCode", "gifts", "faq", "rsvp"]
RULE_BOX = dict(width=1, style="solid", colour="line")

# ---- 1 · Jardín botánico · Herbario ---------------------------------------------------------------------------------
jardin = dict(
    key="jardin-botanico", name="Jardín botánico", variant="classic", style="bands", ratio=1.25, gap=56, width=1080, ornament="flourish",
    radii=dict(sm=2, md=4, lg=8), heading=dict(family="eb-garamond", weights=[500, 600]), body=dict(family="dm-sans", weights=[400, 500, 600]),
    palettes=dict(light=pal("#F4F7F0", "#FFFFFF", "#1D2A20", "#51604F", "#2E5E3F", "#2E5E3F", "#FFFFFF", "#7F9283"),
                  dark=pal("#0F1712", "#17221A", "#E7EEE5", "#A8B9A6", "#92C79F", "#7DBA8D", "#0D1A11", "#5C7262")),
    description="Herbario: una hoja de papel con la etiqueta del ejemplar, hojas prensadas en las esquinas que se trazan y un ramo; serif de jardín y verde profundo.",
    tags=["anniversary", "baptism", "wedding"], sections=FULL,
    cover_blocks=[art("art-esquina", "laurel-esquina", True), art("art-ramo", "ramo")],
    cover_mobile=[el("el-esquina", "art-esquina", 0, 0, 1, 8, animation=anim("draw", 0, 1200)),
                  el("el-ramo", "art-ramo", 1, 0, 2, 12, animation=anim("scale", 500, 800)),
                  el("el-esquina-d", "art-esquina", 3, 0, 1, 8, rotation=90, animation=anim("draw", 0, 1200)),
                  el("el-cover", "cover", 0, 12, 4, 8, animation=anim("fade", 800, 700), typography=dict(align="center"), border=RULE_BOX, padding=box(24, 16))],
    cover_desktop=[el("el-cover", "cover", 0, 2, 7, 8, animation=anim("fade", 800, 700), typography=dict(align="start"), border=RULE_BOX, padding=box(32)),
                   el("el-esquina", "art-esquina", 7, 0, 1, 8, animation=anim("draw", 0, 1200)),
                   el("el-ramo", "art-ramo", 8, 0, 3, 24, rotation=-4, animation=anim("scale", 500, 800)),
                   el("el-esquina-d", "art-esquina", 11, 0, 1, 8, rotation=90, animation=anim("draw", 0, 1200))],
    header=lambda s: dict(block=art("art-esquina-sec", "laurel-esquina"), x=0, w=1, h=5) if s != "story" else None)

# ---- 2 · Rosa antiguo · Carta lacrada --------------------------------------------------------------------------------
SEAL = dict(typography=dict(role="heading", size=32, align="center", colour="onAccent"), background=dict(kind="colour", role="accentFill"), radius=999, padding=box(8))
LETTER = dict(background=dict(kind="colour", role="surface"), border=RULE_BOX)
rosa = dict(
    key="rosa-antiguo", name="Rosa antiguo", variant="festive", style="cards", ratio=1.25, gap=48, width=1040, ornament="flourish",
    radii=dict(sm=2, md=6, lg=12), heading=dict(family="crimson-pro", weights=[500, 600]), body=dict(family="nunito-sans", weights=[400, 600]),
    palettes=dict(light=pal("#FAF1EE", "#FFFBFA", "#2D1D21", "#6B5257", "#8F3550", "#8F3550", "#FFFFFF", "#978286"),
                  dark=pal("#1A1012", "#26181B", "#F4E6E8", "#C9B0B5", "#EBA3B5", "#D98A9F", "#2A0E16", "#84696F")),
    description="Carta lacrada: el sobre se abre, la carta de papel lleva los nombres y un sello de lacre en el acento cierra la portada.",
    tags=["anniversary", "quinceanera", "wedding"], sections=FULL,
    cover_blocks=[art("art-sobre", "sobre"), art("art-rosa", "rosa"), MONO],
    cover_mobile=[el("el-sobre", "art-sobre", 1, 0, 2, 11, animation=anim("envelope", 100, 900)),
                  el("el-cover", "cover", 0, 11, 4, 20, animation=anim("rise", 700, 800), typography=dict(align="start"), padding=box(24, 16), **LETTER),
                  el("el-monogram", "monogram", 1, 31, 1, 10, animation=anim("scale", 1500, 600), **SEAL)],
    cover_desktop=[el("el-sobre", "art-sobre", 0, 0, 3, 8, rotation=-6, animation=anim("envelope", 100, 900)),
                   el("el-cover", "cover", 3, 0, 7, 8, animation=anim("rise", 700, 800), typography=dict(align="start"), padding=box(40, 40), **LETTER),
                   el("el-rosa", "art-rosa", 10, 0, 2, 8, animation=anim("fade", 1200, 600)),
                   el("el-monogram", "monogram", 9, 1, 1, 10, animation=anim("scale", 1500, 600), **SEAL)],
    header=lambda s: drawing_head(s, 0, 1, 5))

# ---- 3 · Editorial · Revista ------------------------------------------------------------------------------------------
EDIT_TITLE_M = dict(role="heading", size=72, align="start", lineHeight=1.02)
EDIT_TITLE_D = dict(role="heading", size=120, align="start", lineHeight=1.0)
editorial = dict(
    key="editorial", name="Editorial", variant="editorial", style="plain", ratio=1.333, gap=64, width=1200, ornament="rule",
    radii=dict(sm=0, md=0, lg=0), heading=dict(family="playfair-display", weights=[600, 700]), body=dict(family="newsreader", weights=[400, 500, 600]),
    palettes=dict(light=pal("#F3EEE7", "#FFFFFF", "#1C1815", "#5C524A", "#A3301F", "#A3301F", "#FFFFFF", "#8B8076"),
                  dark=pal("#151210", "#201B18", "#F1EBE4", "#B8ABA0", "#F28D78", "#E8745D", "#1F0B07", "#7A6E64")),
    description="Revista: la portada es una doble página con la foto protagonista y los nombres en titular de contraste alto, sin más adorno que un filete.",
    tags=["quinceanera", "wedding"], sections=["story", "gallery", "schedule", "venues", "dressCode", "gifts", "faq", "recommendations", "rsvp"],
    cover_blocks=[art("art-filete", "filete", True), art("art-filete-base", "filete")],
    cover_mobile=[el("el-filete", "art-filete", 0, 0, 4, 2, animation=anim("draw", 0, 900)),
                  el("el-cover", "cover", 0, 2, 4, 4, animation=anim("rise", 300, 800), typography=EDIT_TITLE_M),
                  el("el-filete-base", "art-filete-base", 0, 6, 4, 2, animation=anim("fade", 900, 600))],
    cover_desktop=[el("el-filete", "art-filete", 4, 0, 4, 2, animation=anim("draw", 0, 900)),
                   el("el-cover", "cover", 0, 2, 12, 4, animation=anim("rise", 300, 800), typography=EDIT_TITLE_D),
                   el("el-filete-base", "art-filete-base", 4, 6, 4, 2, animation=anim("fade", 900, 600))],
    header=ornament_head("filete", 0, SEC_COLS, 2))

# ---- 4 · Editorial granate · Programa de teatro -----------------------------------------------------------------------
PROGRAMA = dict(border=dict(width=1, style="solid", colour="accent"))
granate = dict(
    key="editorial-granate", name="Editorial granate", variant="corporate", style="cards", ratio=1.25, gap=56, width=1080, ornament="rule", schedule="list",
    radii=dict(sm=0, md=0, lg=0), heading=dict(family="fraunces", weights=[500, 600]), body=dict(family="newsreader", weights=[400, 500, 600]),
    palettes=dict(light=pal("#F4EFEA", "#FFFDFB", "#211719", "#5D5053", "#8A2638", "#8A2638", "#FFFFFF", "#8E7E81"),
                  dark=pal("#170E10", "#22171A", "#F3E7E9", "#C3AEB2", "#E69AA9", "#D4788A", "#2A0C14", "#836770")),
    description="Programa de teatro: un telón de arcos abre la portada, el programa va en un marco fino y el itinerario se numera por actos.",
    tags=["anniversary", "wedding"], sections=["story", "schedule", "venues", "dressCode", "gallery", "gifts", "faq", "recommendations", "rsvp"],
    cover_blocks=[art("art-arcos", "arcos", True), art("art-arcos-base", "arcos"), art("art-copas", "copas")],
    cover_mobile=[el("el-arcos", "art-arcos", 0, 0, 4, 4, animation=anim("draw", 0, 1400)),
                  el("el-copas", "art-copas", 1, 4, 2, 11, animation=anim("rise", 600, 800)),
                  el("el-cover", "cover", 0, 15, 4, 22, animation=anim("fade", 900, 800), typography=dict(align="center", role="heading", size=56, lineHeight=1.05), padding=box(24, 16), **PROGRAMA),
                  el("el-arcos-base", "art-arcos-base", 0, 37, 4, 4, animation=anim("fade", 1500, 600))],
    cover_desktop=[el("el-arcos", "art-arcos", 4, 0, 4, 4, animation=anim("draw", 0, 1400)),
                   el("el-cover", "cover", 2, 4, 8, 24, animation=anim("fade", 900, 800), typography=dict(align="center", role="heading", size=88, lineHeight=1.05), padding=box(40), **PROGRAMA),
                   el("el-copas", "art-copas", 5, 28, 2, 11, animation=anim("rise", 600, 800)),
                   el("el-arcos-base", "art-arcos-base", 4, 39, 4, 4, animation=anim("fade", 1500, 600))],
    header=ornament_head("arcos", 0, SEC_COLS, 3))

# ---- 5 · Editorial oliva · Mesa de campo ------------------------------------------------------------------------------
MAT = dict(background=dict(kind="colour", role="surface"), border=RULE_BOX)
oliva = dict(
    key="editorial-oliva", name="Editorial oliva", variant="minimal", style="plain", ratio=1.2, gap=64, width=1120, ornament="none",
    radii=dict(sm=0, md=2, lg=4), heading=dict(family="newsreader", weights=[400, 600]), body=dict(family="figtree", weights=[400, 500, 600]),
    palettes=dict(light=pal("#F4F4EA", "#FFFFFF", "#20241A", "#556047", "#4A6A2A", "#4A6A2A", "#FFFFFF", "#7E8A6E"),
                  dark=pal("#12150E", "#1B2015", "#E9EDDF", "#B0B99F", "#A9CC7B", "#9BBF6C", "#10170A", "#6B775A")),
    description="Mesa de campo: una mesa larga dibujada, la foto montada sobre papel con márgenes amplios y un verde oliva frío; serif de lectura y sans amable.",
    tags=["birthday", "quinceanera", "wedding"], sections=["story", "gallery", "venues", "schedule", "dressCode", "gifts", "faq", "recommendations", "rsvp"],
    cover_blocks=[art("art-mesa", "mesa-larga"), art("art-copa", "copa-vino")],
    cover_mobile=[el("el-mesa", "art-mesa", 0, 0, 4, 14, animation=anim("rise", 100, 900)),
                  el("el-cover", "cover", 0, 14, 4, 24, animation=anim("fade", 600, 800), typography=dict(align="start", role="heading", size=40, lineHeight=1.08), padding=box(8, 24, 24), margin=box(0, 16), **MAT),
                  el("el-copa", "art-copa", 3, 3, 1, 8, animation=anim("fade", 1200, 600))],
    cover_desktop=[el("el-mesa", "art-mesa", 0, 0, 7, 8, animation=anim("rise", 100, 900)),
                   el("el-cover", "cover", 7, 0, 5, 8, animation=anim("fade", 600, 800), typography=dict(align="start", role="heading", size=64, lineHeight=1.08), padding=box(32), **MAT),
                   el("el-copa", "art-copa", 11, 1, 1, 8, animation=anim("fade", 1200, 600))],
    header=lambda s: drawing_head(s, 0, 1, 5) if s in ("gifts", "rsvp", "venues") else None)

# ---- 6 · Bodas de oro · Medalla ---------------------------------------------------------------------------------------
oro = dict(
    key="bodas-de-oro", name="Bodas de oro", variant="classic", style="bands", ratio=1.25, gap=56, width=1080, ornament="flourish",
    radii=dict(sm=0, md=2, lg=4), heading=dict(family="cormorant-garamond", weights=[500, 600]), body=dict(family="dm-sans", weights=[400, 500, 600]),
    palettes=dict(light=pal("#FBF5EC", "#FFFEFA", "#2A1F17", "#66584B", "#8A4A1E", "#8A4A1E", "#FFFFFF", "#9B8573"),
                  dark=pal("#1A120C", "#251A12", "#F4E8DB", "#C4B09C", "#E3A87A", "#D08A5A", "#1F0F05", "#7F6753")),
    description="Cincuenta años: la cifra como medalla, centrada y simétrica, en cobre oscuro sobre papel marfil, sin amarillo.",
    tags=["golden-wedding"], sections=SHORT,
    cover_blocks=[art("art-cifra", "cifra-50"), art("art-medalla", "medalla"), art("art-filete", "filete")],
    cover_mobile=[el("el-cifra", "art-cifra", 1, 0, 2, 14, animation=anim("scale", 200, 900)),
                  el("el-cover", "cover", 0, 14, 4, 18, animation=anim("rise", 900, 800), typography=dict(align="center")),
                  el("el-filete", "art-filete", 0, 32, 4, 2, animation=anim("fade", 800, 600)),
                  el("el-medalla", "art-medalla", 1, 34, 2, 9, animation=anim("scale", 1500, 600))],
    cover_desktop=[el("el-cifra", "art-cifra", 5, 0, 2, 14, animation=anim("scale", 200, 900)),
                   el("el-cover", "cover", 2, 14, 8, 20, animation=anim("rise", 900, 800), typography=dict(align="center")),
                   el("el-filete", "art-filete", 3, 34, 6, 2, animation=anim("fade", 800, 600)),
                   el("el-medalla", "art-medalla", 5, 36, 2, 10, animation=anim("scale", 1500, 600))],
    header=lambda s: dict(block=art("art-medalla", "medalla"), x=3, w=2, h=5) if s == "gifts" else drawing_head(s, 3, 2, 5),
    sec_el=dict(typography=dict(align="center")))

# ---- 7 · Bodas de plata · Laurel -------------------------------------------------------------------------------------
BAND = dict(border=dict(width=1, style="solid", colour="line"))
plata = dict(
    key="bodas-de-plata", name="Bodas de plata", variant="editorial", style="plain", ratio=1.2, gap=48, width=1080, ornament="rule",
    radii=dict(sm=0, md=2, lg=4), heading=dict(family="cormorant", weights=[500, 600]), body=dict(family="source-sans-3", weights=[400, 500, 600]),
    palettes=dict(light=pal("#F3F6F9", "#FFFFFF", "#17202A", "#4C5967", "#35567A", "#35567A", "#FFFFFF", "#8190A0"),
                  dark=pal("#0E141B", "#161E27", "#E6ECF2", "#A9B6C4", "#9EC0E6", "#86AEDB", "#0B1520", "#627386")),
    description="Veinticinco años: la cifra y el laurel en un azul acero sobre papel plata, con una composición asimétrica y el texto alineado a la izquierda.",
    tags=["silver-wedding"], sections=SHORT,
    cover_blocks=[art("art-laurel", "laurel", True), art("art-cifra", "cifra-25")],
    cover_mobile=[el("el-cifra", "art-cifra", 0, 0, 2, 12, animation=anim("scale", 200, 900)),
                  el("el-laurel", "art-laurel", 2, 0, 2, 12, animation=anim("draw", 700, 1200)),
                  el("el-cover", "cover", 0, 12, 4, 20, animation=anim("fade", 1000, 800), typography=dict(align="start", role="heading", size=48, lineHeight=1.08))],
    cover_desktop=[el("el-cover", "cover", 0, 0, 7, 8, animation=anim("fade", 1000, 800), typography=dict(align="start", role="heading", size=72, lineHeight=1.05)),
                   el("el-cifra", "art-cifra", 8, 0, 4, 8, animation=anim("scale", 200, 900))],
    header=lambda s: drawing_head(s, 7, 1, 5), sec_el=dict(typography=dict(align="end")))

# ---- 8 · Pedida de mano · La caja que se abre ---------------------------------------------------------------------------
pedida = dict(
    key="pedida-de-mano", name="Pedida de mano", variant="minimal", style="bands", ratio=1.25, gap=56, width=1040, ornament="flourish",
    radii=dict(sm=2, md=8, lg=16), heading=dict(family="gilda-display", weights=[400]), body=dict(family="nunito-sans", weights=[400, 600]),
    palettes=dict(light=pal("#F7F4FA", "#FFFFFF", "#241C2E", "#5E5470", "#5B4B8A", "#5B4B8A", "#FFFFFF", "#8C82A0"),
                  dark=pal("#14111C", "#1E1928", "#EDE8F5", "#B7AECA", "#B9ABE6", "#A394DB", "#130E22", "#71678C")),
    description="Una pregunta con respuesta: la caja del anillo se abre en la portada y una copa pequeña, en el acento violeta, acompaña el texto íntimo.",
    tags=["engagement"], sections=SHORT,
    cover_blocks=[art("art-caja", "caja-anillo"), art("art-copas", "copas")],
    cover_mobile=[el("el-caja", "art-caja", 1, 0, 2, 14, animation=anim("envelope", 200, 1000)),
                  el("el-cover", "cover", 0, 14, 4, 20, animation=anim("rise", 900, 800), typography=dict(align="start", role="heading", size=48, lineHeight=1.1), padding=box(0, 16)),
                  el("el-copas", "art-copas", 3, 3, 1, 8, animation=anim("fade", 1500, 600))],
    cover_desktop=[el("el-caja", "art-caja", 0, 0, 6, 8, animation=anim("envelope", 200, 1000)),
                   el("el-cover", "cover", 7, 0, 4, 8, animation=anim("rise", 900, 800), typography=dict(align="start", role="heading", size=64, lineHeight=1.1)),
                   el("el-copas", "art-copas", 11, 0, 1, 8, animation=anim("fade", 1500, 600))],
    header=lambda s: drawing_head(s, 3, 2, 5) if s in ("gifts", "rsvp") else None, sec_el=dict(typography=dict(align="center")))

ALL = (jardin, rosa, editorial, granate, oliva, oro, plata, pedida)

if __name__ == "__main__":
    out = sys.argv[1]
    for spec in ALL:
        entry = build(spec)
        path = f"{out}/{spec['key']}.json"
        with open(path, "w", encoding="utf-8") as fh:
            json.dump(entry, fh, ensure_ascii=False, indent=2)
            fh.write("\n")
    print("ok", len(ALL))
