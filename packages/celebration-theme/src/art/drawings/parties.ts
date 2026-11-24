import { circle, ellipse, leaf, quadAt, rect, rotate, rpoly, rrect, shape } from "../geometry.js";
import { acc, cut, drawing, ink, inkLine, sec } from "../kit.js";

/** Parties: quinceaños, cumpleaños adulto, fiesta temática y fin de año, fiesta patronal y reencuentro. */

const record = (cx: number, cy: number, r: number): string => circle(cx, cy, r);
const grape = (x: number, y: number): string => circle(x, y, 7.4);
const banner = (t: number, hang: number, width: number): string => {
  const [x, y] = quadAt([14, 28], [60, 62], [106, 28], t);
  return rpoly([[x - width / 2, y + 1.5], [x + width / 2, y + 1.5], [x, y + hang]], 2);
};
const BANNERS = [0.08, 0.22, 0.36, 0.5, 0.64, 0.78, 0.92];

export const PARTIES = [
  // ---- Quinceaños --------------------------------------------------------------------------------------------------
  drawing("tiara", "Tiara con una piedra al centro", "Tiara with a stone at the centre", ["quinceanos"], [
    ink(rpoly([[18, 82], [24, 46], [40, 64], [50, 34], [60, 60], [70, 34], [80, 64], [96, 46], [102, 82]], 3.5)),
    ink(rrect(16, 78, 88, 13, 6)),
    cut("M28 84.5H92", 2.2),
    cut(circle(60, 70, 10)),
    acc(circle(60, 70, 7)),
    sec(circle(24, 42, 4.5) + circle(50, 30, 4.5) + circle(70, 30, 4.5) + circle(96, 42, 4.5))
  ], 40),
  drawing("zapatilla", "Zapato de tacón con un lazo", "High-heeled shoe with a bow", ["quinceanos"], [
    ink(shape([["M", 22, 32], ["C", 38, 34, 46, 48, 62, 52], ["C", 78, 56, 88, 60, 98, 70], ["C", 104, 76, 100, 84, 92, 84], ["C", 80, 84, 66, 78, 56, 76], ["C", 50, 76, 46, 74, 42, 70], ["L", 30, 98], ["L", 22, 98], ["L", 26, 62], ["C", 22, 52, 22, 42, 22, 32], ["Z"]])),
    cut("M34 38C44 42 50 54 62 56C72 58 80 60 90 68", 2.4),
    acc(rpoly([[72, 56], [86, 46], [88, 62]], 2.5) + rpoly([[72, 56], [60, 46], [58, 62]], 2.5) + circle(72, 56, 4.5))
  ], 40),
  drawing("vestido", "Vestido en su percha", "Dress on a hanger", ["quinceanos"], [
    { d: "M60 26C60 20 68 19 68 13C68 8 60 8 58 12", role: "ink", stroke: 3.6 },
    { d: "M60 26L38 40M60 26L82 40", role: "ink", stroke: 3.6 },
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
    cut("M47 28C46 36 48 42 52 46", 2.2)
  ], 32),
  drawing("pastel-porcion", "Porción de pastel con una cereza", "Slice of cake with a cherry", ["cumpleanos-adulto"], [
    sec(rrect(14, 90, 92, 7, 3.5)),
    ink(rpoly([[24, 90], [24, 50], [98, 50], [98, 90]], 5)),
    acc(rpoly([[22, 46], [100, 46], [100, 58], [22, 58]], 5)),
    cut("M24 70H98M24 80H98", 2.4),
    ink(circle(60, 36, 9)),
    inkLine(2.4, "M60 28C62 20 68 16 74 14")
  ], 42),
  drawing("botella", "Botella de espumante", "Sparkling wine bottle", ["cumpleanos-adulto", "pedida", "tematica"], [
    sec(rrect(53, 14, 14, 10, 3)),
    ink(rect(54, 22, 12, 24, 2)),
    ink(shape([["M", 54, 44], ["C", 46, 50, 44, 56, 44, 64], ["L", 44, 92], ["Q", 44, 98, 50, 98], ["L", 70, 98], ["Q", 76, 98, 76, 92], ["L", 76, 64], ["C", 76, 56, 74, 50, 66, 44], ["Z"]])),
    cut("M54 32H66", 2.2),
    acc(rrect(47, 66, 26, 22, 3)),
    cut("M52 74H68M52 80H64", 2)
  ], 28),
  // ---- Fiesta temática y fin de año --------------------------------------------------------------------------------
  drawing("bola-disco", "Bola de espejos colgada", "Hanging mirror ball", ["tematica"], [
    inkLine(3, "M60 6V30"),
    acc(rrect(53, 26, 14, 8, 3)),
    ink(circle(60, 62, 29)),
    cut("M33 52H87M32 66H88M38 79H82M60 33C48 44 48 80 60 91M60 33C72 44 72 80 60 91M46 36C38 52 38 72 46 88M74 36C82 52 82 72 74 88", 1.8),
    sec(rrect(44, 44, 7, 7, 1.5) + rrect(66, 58, 7, 7, 1.5) + rrect(52, 72, 7, 7, 1.5))
  ], 32),
  drawing("uvas", "Doce uvas para el brindis de medianoche", "Twelve grapes for the midnight toast", ["tematica"], [
    inkLine(3, "M60 28V20"),
    ink([30, 45, 60, 75, 90].map((x) => grape(x, 38)).join("") + [37.5, 52.5, 67.5, 82.5].map((x) => grape(x, 53)).join("") + [52.5, 67.5].map((x) => grape(x, 68)).join("") + grape(60, 83)),
    cut("M30 34C31 31 33 30 35 30M60 34C61 31 63 30 65 30M52.5 49C53.5 46 55.5 45 57.5 45M60 79C61 76 63 75 65 75", 1.8),
    acc(leaf(60, 24, 30, 8, -30) + leaf(60, 24, 24, 6, 205))
  ], 28),
  drawing("popper", "Cañón de confeti", "Confetti popper", ["tematica"], [
    ink(rpoly([[22, 100], [40, 54], [68, 82]], 4)),
    cut("M30 82L50 78M36 68L54 66", 2.4),
    sec(circle(80, 34, 4) + circle(96, 52, 4) + circle(70, 20, 4) + rect(88, 28, 8, 8, 2)),
    { d: "M52 54C58 38 70 44 76 30", role: "accent", stroke: 4.5 }
  ], 36),
  drawing("reloj-medianoche", "Reloj marcando la medianoche", "Clock striking midnight", ["tematica"], [
    ink(circle(60, 58, 36)),
    cut(circle(60, 58, 30)),
    inkLine(3.4, "M60 34V38M60 78V82M36 58H40M80 58H84M43 41L46 44M77 41L74 44M43 75L46 72M77 75L74 72"),
    { d: "M60 58V36", role: "ink", stroke: 4 },
    { d: "M60 58L56 42", role: "accent", stroke: 4.6 },
    ink(circle(60, 58, 4)),
    ink(rrect(54, 18, 12, 6, 2))
  ], 34),
  // ---- Fiesta patronal ---------------------------------------------------------------------------------------------
  drawing("mascara-morenada", "Máscara de morenada con su corona", "Morenada mask with its crown", ["patronal"], [
    acc(rpoly([[28, 52], [30, 24], [44, 38], [50, 14], [60, 34], [70, 14], [76, 38], [90, 24], [92, 52]], 3)),
    sec(circle(26, 64, 7) + circle(94, 64, 7)),
    ink(ellipse(60, 68, 28, 32)),
    cut(circle(48, 62, 9) + circle(72, 62, 9)),
    ink(circle(48, 62, 4) + circle(72, 62, 4)),
    cut("M60 62L54 78H66Z"),
    cut(rrect(44, 86, 32, 9, 3)),
    ink(rect(52, 86, 2.4, 9, 0) + rect(60, 86, 2.4, 9, 0) + rect(68, 86, 2.4, 9, 0))
  ], 34),
  drawing("matraca", "Matraca de madera con su lengüeta", "Wooden ratchet with its tongue", ["patronal"], [
    ink(rrect(12, 62, 40, 13, 6.5)),
    ink(rrect(44, 34, 56, 52, 5)),
    cut(rrect(51, 41, 42, 38, 2)),
    ink(rpoly(Array.from({ length: 16 }, (_, index) => { const a = (index * 22.5 * Math.PI) / 180; const r = index % 2 ? 11 : 15; return [72 + r * Math.cos(a), 60 + r * Math.sin(a)] as const; }), 1.5)),
    cut(circle(72, 60, 4)),
    acc(rrect(66, 14, 10, 40, 3))
  ], 40),
  drawing("banderines", "Guirnalda de banderines", "Bunting garland", ["patronal"], [
    inkLine(3, "M14 28Q60 62 106 28"),
    ...BANNERS.map((t, index) => (index === 3 ? acc(banner(t, 32, 20)) : index % 2 ? sec(banner(t, 30, 19)) : ink(banner(t, 30, 19))))
  ], 40),
  drawing("bombo", "Bombo con dos baquetas", "Bass drum with two drumsticks", ["patronal"], [
    ink(rect(24, 50, 72, 40, 6)),
    ink(ellipse(60, 90, 36, 8)),
    ink(ellipse(60, 50, 36, 10)),
    cut(ellipse(60, 50, 30, 7)),
    cut("M32 56L42 88M42 56L52 88M52 56L62 88M62 56L72 88M72 56L82 88M82 56L90 84", 2.2),
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
    cut("M50 91H80", 2)
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
    cut("M36 52H84", 2.4),
    acc(rrect(41, 62, 38, 26, 8)),
    sec(rrect(84, 66, 10, 22, 4) + rrect(26, 66, 10, 22, 4))
  ], 32)
];
