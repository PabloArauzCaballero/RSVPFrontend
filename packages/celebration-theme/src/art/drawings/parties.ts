import { band, bowtie, capsule, circle, ellipse, leaf, mirrorX, n, quadAt, rect, rotate, rpoly, rrect, shape, trace, type Cmd } from "../geometry.js";
import { acc, accLine, cut, drawing, ink, inkLine, sec } from "../kit.js";

/** Parties: quinceaños, cumpleaños adulto, fiesta temática y fin de año, fiesta patronal y reencuentro. */

const record = (cx: number, cy: number, r: number): string => circle(cx, cy, r);
const grape = (x: number, y: number): string => circle(x, y, 10);
const banner = (t: number, hang: number, width: number): string => {
  const [x, y] = quadAt([14, 28], [60, 62], [106, 28], t);
  return rpoly([[x - width / 2, y + 1.5], [x + width / 2, y + 1.5], [x, y + hang]], 2);
};
/** A curved horn rising from the left side of the morenada mask; the right one is its mirror. A silhouette only: no eyes, no mouth. */
const HORN: readonly Cmd[] = [["M", 36, 56], ["C", 22, 54, 16, 40, 24, 28], ["C", 28, 40, 36, 44, 46, 48], ["Z"]];
/** The greca of the morenada mask: eight square steps of 5.55 across the forehead, 44.4 wide (x 37.8 to 82.2): the egg is 42.3 to 48.5 wide between y 49 and 54 (45.7 at the middle of the band), so the band runs from edge to edge. */
const GRECA = "M37.8 54V49H43.35V54H48.9V49H54.45V54H60.0V49H65.55V54H71.1V49H76.65V54H82.2V49";
const BANNERS = [0.08, 0.22, 0.36, 0.5, 0.64, 0.78, 0.92];

export const PARTIES = [
  // ---- Quinceaños --------------------------------------------------------------------------------------------------
  drawing("tiara", "Tiara con una piedra al centro", "Tiara with a stone at the centre", ["quinceanos"], [
    ink(rpoly([[18, 82], [24, 46], [40, 64], [50, 34], [60, 60], [70, 34], [80, 64], [96, 46], [102, 82]], 3.5)),
    ink(rrect(16, 78, 88, 13, 6)),
    cut("M28 84.5H92", 2.5),
    cut(circle(60, 70, 10)),
    acc(circle(60, 70, 7)),
    sec(circle(24, 42, 4.5) + circle(50, 30, 4.5) + circle(70, 30, 4.5) + circle(96, 42, 4.5))
  ], 40),
  drawing("zapatilla", "Zapato de tacón con un lazo", "High-heeled shoe with a bow", ["quinceanos"], [
    ink(shape([["M", 24, 40], ["C", 34, 40, 42, 50, 50, 56], ["C", 62, 64, 72, 62, 82, 68], ["C", 94, 72, 104, 78, 100, 86], ["C", 98, 90, 92, 90, 88, 90], ["L", 62, 88], ["C", 52, 86, 46, 80, 42, 74], ["L", 36, 98], ["L", 28, 98], ["L", 29, 74], ["C", 24, 64, 24, 52, 24, 40], ["Z"]])),
    cut("M32 46C38 50 44 58 54 63", 2.5),
    acc(bowtie(78, 70, 9, 6.5))
  ], 40),
  drawing("vestido", "Vestido en su percha", "Dress on a hanger", ["quinceanos"], [
    ink(band(trace([[[60, 28], [60, 21], [68, 20], [68, 14]], [[68, 14], [68, 8], [59, 7], [57, 12]]]), 3.8)),
    ink(band([[36, 42], [60, 28], [84, 42]], 3.8)),
    acc(shape([["M", 44, 38], ["L", 52, 36], ["C", 54, 44, 66, 44, 68, 36], ["L", 76, 38], ["L", 72, 62], ["C", 82, 74, 92, 88, 100, 98], ["L", 20, 98], ["C", 28, 88, 38, 74, 48, 62], ["Z"]])),
    cut("M47 63C56 68 64 68 73 63", 2.6)
  ], 38),
  drawing("vinilo", "Disco de vinilo con su funda", "Vinyl record with its sleeve", ["quinceanos", "cumpleanos-adulto", "tematica"], [
    sec(rrect(22, 24, 62, 68, 6, rotate(52, 58, -7))),
    ink(record(66, 58, 32)),
    cut(circle(66, 58, 25.5), undefined),
    ink(circle(66, 58, 24)),
    cut(circle(66, 58, 19) , undefined),
    ink(circle(66, 58, 17.4)),
    acc(circle(66, 58, 10)),
    cut(circle(66, 58, 2.4))
  ], 36),
  // ---- Cumpleaños adulto -------------------------------------------------------------------------------------------
  drawing("copa-vino", "Copa de vino", "Wine glass", ["cumpleanos-adulto"], [
    ink(shape([["M", 40, 20], ["L", 80, 20], ["C", 84, 46, 74, 64, 60, 64], ["C", 46, 64, 36, 46, 40, 20], ["Z"]])),
    ink(rect(57, 62, 6, 28, 2) + rrect(42, 90, 36, 7, 3.5)),
    acc(shape([["M", 41.5, 36], ["L", 78.5, 36], ["C", 79, 50, 71, 59, 60, 59], ["C", 49, 59, 41, 50, 41.5, 36], ["Z"]])),
    cut("M47 28C46 36 48 42 52 46", 2.5)
  ], 32),
  drawing("pastel-porcion", "Porción de pastel con una cereza", "Slice of cake with a cherry", ["cumpleanos-adulto"], [
    sec(rrect(14, 90, 92, 7, 3.5)),
    ink(rpoly([[24, 90], [24, 50], [98, 50], [98, 90]], 5)),
    acc(rpoly([[22, 46], [100, 46], [100, 58], [22, 58]], 5)),
    cut("M24 70H98M24 80H98", 2.5),
    ink(circle(60, 36, 9)),
    inkLine(2.5, "M60 28C62 20 68 16 74 14")
  ], 42),
  drawing("botella", "Botella de espumante", "Sparkling wine bottle", ["cumpleanos-adulto", "pedida", "tematica"], [
    sec(rrect(53, 14, 14, 10, 3)),
    ink(rect(54, 22, 12, 24, 2)),
    ink(shape([["M", 54, 44], ["C", 46, 50, 44, 56, 44, 64], ["L", 44, 92], ["Q", 44, 98, 50, 98], ["L", 70, 98], ["Q", 76, 98, 76, 92], ["L", 76, 64], ["C", 76, 56, 74, 50, 66, 44], ["Z"]])),
    cut("M54 32H66", 2.5),
    acc(rrect(47, 66, 26, 22, 3)),
    cut("M52 74H68M52 80H64", 2.5)
  ], 28),
  // ---- Fiesta temática y fin de año --------------------------------------------------------------------------------
  drawing("bola-disco", "Bola de espejos colgada", "Hanging mirror ball", ["tematica"], [
    inkLine(3, "M60 6V30"),
    acc(rrect(53, 26, 14, 8, 3)),
    ink(circle(60, 62, 29)),
    cut("M33 52H87M32 70H88M60 33C48 44 48 80 60 91M60 33C72 44 72 80 60 91", 2.5),
    sec(rrect(40, 40, 8, 8, 1.5) + rrect(66, 56, 8, 8, 1.5) + rrect(48, 76, 8, 8, 1.5))
  ], 32),
  drawing("uvas", "Racimo de uvas para el brindis de medianoche", "Bunch of grapes for the midnight toast", ["tematica"], [
    inkLine(3, "M60 36V20"),
    ink([40, 60, 80].map((x) => grape(x, 42)).join("") + [50, 70].map((x) => grape(x, 60)).join("") + grape(60, 78)),
    cut("M34 38C35 35 37 34 39 34M54 38C55 35 57 34 59 34M74 38C75 35 77 34 79 34", 2.5),
    acc(leaf(60, 26, 30, 8, -30))
  ], 28),
  drawing("popper", "Cañón de confeti", "Confetti popper", ["tematica"], [
    ink(rpoly([[22, 100], [47, 52], [74, 78]], 4)),
    ink(capsule(44, 46, 80, 82, 7)),
    cut(capsule(46, 48, 78, 80, 3.2)),
    cut("M32 84L50 80M38 70L55 68", 2.5),
    sec(circle(86, 34, 5) + circle(98, 54, 4.5) + circle(68, 22, 4.5) + rrect(94, 24, 9, 9, 2)),
    accLine(4.5, "M60 40C62 28 72 32 76 20")
  ], 36),
  // ---- Fiesta patronal ---------------------------------------------------------------------------------------------
  drawing("mascara-morenada", "Máscara de morenada con su corona", "Morenada mask with its crown", ["patronal"], [
    acc(rpoly([[28, 52], [30, 24], [44, 38], [50, 14], [60, 34], [70, 14], [76, 38], [90, 24], [92, 52]], 3)),
    ink(shape(HORN) + shape(HORN, mirrorX(60))),
    ink(ellipse(60, 70, 28, 32)),
    // The ornament is one continuous band of small square teeth (a greca, like a diadem ribbon) that crosses the egg from edge to edge high on
    // the forehead, a cutout with no second colour. Nothing else sits on the egg (plain ink): no ring, dot, pair of openings, brow or mouth.
    cut(GRECA, 2.5)
  ], 34),
  drawing("matraca", "Matraca de madera con su lengüeta", "Wooden ratchet with its tongue", ["patronal"], [
    ink(rrect(53, 64, 14, 36, 6)),
    ink(rrect(18, 20, 84, 50, 7)),
    cut(rrect(26, 28, 68, 34, 3)),
    ink(rpoly(Array.from({ length: 24 }, (_, index) => { const a = ((index * 15) * Math.PI) / 180; const r = index % 2 ? 12 : 17; return [46 + r * Math.cos(a), 45 + r * Math.sin(a)] as const; }), 1)),
    cut(circle(46, 45, 4.5)),
    acc(rrect(56, 38, 36, 8, 4, rotate(56, 42, -8)))
  ], 40),
  drawing("banderines", "Guirnalda de banderines", "Bunting garland", ["patronal"], [
    inkLine(3, "M14 28Q60 62 106 28"),
    ...BANNERS.map((t, index) => (index === 3 ? acc(banner(t, 32, 20)) : index % 2 ? sec(banner(t, 30, 19)) : ink(banner(t, 30, 19)))),
    cut(BANNERS.filter((_, index) => index % 2 === 0 && index !== 3).map((t) => { const [x, y] = quadAt([14, 28], [60, 62], [106, 28], t); return `M${n(x - 4)} ${n(y + 8)}H${n(x + 4)}`; }).join(""), 2.5)
  ], 40),
  drawing("bombo", "Bombo con dos baquetas", "Bass drum with two drumsticks", ["patronal"], [
    ink(rect(24, 50, 72, 40, 6)),
    ink(ellipse(60, 90, 36, 8)),
    ink(ellipse(60, 50, 36, 10)),
    cut(ellipse(60, 50, 30, 7)),
    cut("M31 58L42 88L52 60L62 88L72 60L82 88L90 62", 2.5),
    acc(circle(60, 52, 5.5)),
    inkLine(3, "M30 18L58 48M90 18L62 48"),
    ink(circle(28, 16, 5) + circle(92, 16, 5))
  ], 40),
  // ---- Reencuentro -----------------------------------------------------------------------------------------------
  drawing("cassette", "Casete con su etiqueta", "Cassette tape with its label", ["reencuentro"], [
    ink(rrect(18, 34, 84, 56, 7)),
    cut(rrect(26, 40, 68, 20, 3)),
    acc(rrect(30, 45, 60, 8, 2)),
    cut(rrect(40, 68, 40, 16, 8)),
    ink(circle(52, 76, 5) + circle(68, 76, 5)),
    cut(circle(52, 76, 1.8) + circle(68, 76, 1.8))
  ], 40),
  drawing("anuario", "Anuario escolar", "School yearbook", ["reencuentro"], [
    ink(rrect(28, 20, 64, 78, 6)),
    cut("M38 20V98", 2.6),
    sec(rrect(46, 32, 38, 32, 3)),
    cut(rpoly([[46, 64], [58, 48], [66, 57], [74, 49], [84, 64]], 1.5)),
    acc(rrect(46, 74, 38, 10, 3)),
    cut("M50 91H80", 2.5)
  ], 36),
  drawing("marco-foto", "Marco con un paisaje", "Frame with a landscape", ["reencuentro"], [
    ink(rrect(22, 24, 76, 68, 6)),
    cut(rrect(30, 32, 60, 52, 2)),
    acc(circle(74, 48, 8)),
    sec(rpoly([[30, 84], [30, 72], [46, 58], [60, 74], [70, 66], [90, 80], [90, 84]], 2))
  ], 38),
  drawing("mochila", "Mochila escolar", "School backpack", ["reencuentro"], [
    inkLine(4.5, "M50 34V28Q50 22 60 22Q70 22 70 28V34"),
    ink(rrect(32, 32, 56, 64, 16)),
    cut("M36 52H84", 2.5),
    acc(rrect(41, 62, 38, 26, 8)),
    sec(rrect(84, 66, 10, 22, 4) + rrect(26, 66, 10, 22, 4))
  ], 32)
];
