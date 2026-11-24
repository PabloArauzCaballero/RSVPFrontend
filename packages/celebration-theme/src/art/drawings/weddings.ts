import { after, arcTrace, band, bowtie, circle, circleAt, ellipse, flower, heart, leaf, move, rect, rotate, rpoly, rrect, scaleAt, shape, trace, type Transform } from "../geometry.js";
import { acc, cut, drawing, ink, inkLine, sec, secLine } from "../kit.js";

/** Weddings and what follows them: boda, aniversario, bodas de oro y plata, pedida y despedida de soltero/a. */

/** A bell hanging from its top centre, written once and swung either way. */
const bell = (t: Transform): { readonly body: string; readonly clapper: string; readonly shine: string } => ({
  body: shape([["M", 0, 0], ["C", -9, 0, -13, 9, -13, 21], ["C", -13, 31, -18, 35, -22, 40], ["L", 22, 40], ["C", 18, 35, 13, 31, 13, 21], ["C", 13, 9, 9, 0, 0, 0], ["Z"]], t),
  clapper: circleAt([0, 45], 4.6, t),
  shine: shape([["M", -6.5, 9], ["L", -7.5, 24]], t)
});
const swing = (x: number, deg: number): Transform => after(rotate(0, 0, deg), move(x, 28));
const cup = (cx: number, mirror: number): { readonly body: string; readonly handle: string; readonly saucer: string } => ({
  body: shape([["M", cx - 15, 52], ["L", cx + 15, 52], ["L", cx + 15, 64], ["C", cx + 15, 84, cx - 15, 84, cx - 15, 64], ["Z"]]),
  handle: `M${cx + 15 * mirror} 57H${cx + 19 * mirror}Q${cx + 25 * mirror} 57 ${cx + 25 * mirror} 64Q${cx + 25 * mirror} 71 ${cx + 17 * mirror} 73`,
  saucer: ellipse(cx, 91, 19, 4.5)
});
const leftCup = cup(40, -1);
const rightCup = cup(80, 1);
const candle = (x: number, y: number, h: number): string => rrect(x, y, 12, h, 3);
const tier = (x: number, y: number, w: number, h: number): string => rrect(x, y, w, h, 5);

export const WEDDINGS = [
  // ---- Boda ----------------------------------------------------------------------------------------------------
  drawing("anillos", "Dos anillos entrelazados con una piedra", "Two interlocked rings with a gem", ["boda"], [
    ink(band(arcTrace(46, 68, 15.5, 15.5, 0, 360), 7, true)),
    sec(band(arcTrace(74, 68, 15.5, 15.5, 0, 360), 7, true)),
    ink(band(arcTrace(46, 68, 15.5, 15.5, -52, 52, 12), 7)),
    cut(rpoly([[74, 26], [91, 43], [74, 62], [57, 43]], 3)),
    acc(rpoly([[74, 31], [86, 43], [74, 57], [62, 43]], 2.5)),
    cut("M64 43H84", 2.5)
  ], 34),
  drawing("ramo", "Ramo de flores atado con un lazo", "Bouquet tied with a ribbon", ["boda"], [
    inkLine(4, "M60 98L40 54M60 98L80 54M60 98V42"),
    sec(leaf(58, 88, 30, 7, -158) + leaf(62, 88, 30, 7, -22)),
    ink(flower(37, 49, 15, 10, 5, 5) + flower(83, 49, 15, 10, 5, 5) + flower(60, 33, 15, 10, 5, 5)),
    cut(circle(37, 49, 3.6) + circle(83, 49, 3.6) + circle(60, 33, 3.6)),
    acc(bowtie(60, 76, 13, 7))
  ], 26),
  drawing("pastel-bodas", "Pastel de bodas de tres pisos", "Three-tier wedding cake", ["boda"], [
    sec(rrect(16, 92, 88, 7, 3.5)),
    ink(tier(24, 70, 72, 24)),
    acc(tier(33, 49, 54, 22)),
    ink(tier(42, 30, 36, 20)),
    cut("M30 80H90", 2.5),
    cut(circle(42, 60, 2.2) + circle(60, 60, 2.2) + circle(78, 60, 2.2) + circle(52, 40, 2) + circle(68, 40, 2)),
    ink(heart(60, 16, 15))
  ], 42),
  drawing("campanas", "Dos campanas de boda", "Two wedding bells", ["boda"], [
    secLine(3.5, "M44 25Q60 8 76 25"),
    ink(bell(swing(46, 14)).body),
    ink(bell(swing(46, 14)).clapper),
    cut(bell(swing(46, 14)).shine, 2.5),
    acc(bell(swing(74, -14)).body),
    ink(bell(swing(74, -14)).clapper),
    cut(bell(swing(74, -14)).shine, 2.5)
  ], 36),
  drawing("velas", "Candelabro con tres velas", "Candelabra with three candles", ["boda"], [
    ink(candle(54, 46, 46)),
    ink(candle(30, 62, 32) + candle(78, 62, 32)),
    inkLine(3, "M60 46V40M36 62V56M84 62V56"),
    sec(shape([["M", 36, 54], ["C", 39, 48, 41, 46, 36, 40], ["C", 31, 46, 33, 48, 36, 54], ["Z"]]) + shape([["M", 84, 54], ["C", 87, 48, 89, 46, 84, 40], ["C", 79, 46, 81, 48, 84, 54], ["Z"]])),
    acc(shape([["M", 60, 38], ["C", 65, 30, 67, 26, 60, 16], ["C", 53, 26, 55, 30, 60, 38], ["Z"]])),
    ink(rrect(22, 90, 76, 8, 4)),
    cut("M40 70C40 76 43 78 43 82", 2.5)
  ], 40),
  // ---- Aniversario -----------------------------------------------------------------------------------------------
  drawing("tazas", "Dos tazas con su plato", "Two cups on saucers", ["aniversario"], [
    secLine(3, "M36 42C32 36 40 34 36 28M44 42C40 36 48 34 44 28M76 42C72 36 80 34 76 28M84 42C80 36 88 34 84 28"),
    sec(leftCup.saucer + rightCup.saucer),
    inkLine(4.5, leftCup.handle),
    ink(leftCup.body),
    cut(heart(40, 58, 12)),
    inkLine(4.5, rightCup.handle),
    acc(rightCup.body)
  ], 44),
  drawing("album", "Álbum de fotos con un separador", "Photo album with a bookmark", ["aniversario"], [
    ink(rrect(24, 26, 72, 68, 7)),
    cut("M37 26V94", 2.6),
    sec(rrect(46, 38, 40, 32, 3)),
    cut(rpoly([[46, 70], [58, 54], [66, 63], [74, 55], [86, 70]], 1.5)),
    cut("M46 80H84M46 87H72", 2.5),
    acc(rpoly([[68, 80], [80, 80], [80, 104], [74, 98], [68, 104]], 1.5))
  ], 38),
  drawing("cifra-diez", "El número 10, de diez años juntos", "The number 10, for ten years together", ["aniversario"], [
    ink(band([[30, 46], [45, 36], [45, 86]], 11)),
    acc(ellipse(80, 60, 21, 31)),
    cut(ellipse(80, 60, 10.5, 20)),
    sec(rrect(26, 95, 68, 5, 2.5))
  ], 38),
  drawing("reloj-arena", "Reloj de arena", "Hourglass", ["aniversario"], [
    inkLine(5, "M40 30V90M80 30V90"),
    ink(rrect(28, 20, 64, 9, 4) + rrect(28, 91, 64, 9, 4)),
    sec(shape([["M", 44, 29], ["L", 76, 29], ["C", 76, 44, 64, 52, 64, 60], ["C", 64, 68, 76, 76, 76, 91], ["L", 44, 91], ["C", 44, 76, 56, 68, 56, 60], ["C", 56, 52, 44, 44, 44, 29], ["Z"]])),
    ink(shape([["M", 49, 29], ["L", 71, 29], ["C", 70, 38, 65, 43, 60, 47], ["C", 55, 43, 50, 38, 49, 29], ["Z"]])),
    acc(shape([["M", 47, 91], ["C", 51, 82, 56, 78, 60, 78], ["C", 64, 78, 69, 82, 73, 91], ["Z"]])),
    cut("M60 49V78", 2.5)
  ], 36),
  // ---- Bodas de oro y plata --------------------------------------------------------------------------------------
  drawing("cifra-25", "El número 25, bodas de plata", "The number 25, silver wedding", ["bodas-oro-plata"], [
    ink(band([...trace([[[28, 42], [28, 28], [54, 28], [54, 42]], [[54, 42], [54, 56], [32, 68], [28, 86]]]), [56, 86]], 10)),
    acc(band([[96, 32], [74, 32], [72, 56], ...trace([[[72, 56], [78, 49], [94, 51], [94, 68]], [[94, 68], [94, 86], [74, 90], [68, 80]]]).slice(1)], 10)),
    sec(rrect(26, 95, 68, 5, 2.5))
  ], 40),
  drawing("cifra-50", "El número 50, bodas de oro", "The number 50, golden wedding", ["bodas-oro-plata"], [
    ink(band([[52, 32], [30, 32], [28, 56], ...trace([[[28, 56], [34, 49], [50, 51], [50, 68]], [[50, 68], [50, 86], [30, 90], [24, 80]]]).slice(1)], 10)),
    acc(ellipse(80, 60, 20, 31)),
    cut(ellipse(80, 60, 10, 20)),
    sec(rrect(22, 94, 76, 5, 2.5))
  ], 40),
  drawing("medalla", "Medalla con su cinta", "Medal with its ribbon", ["bodas-oro-plata"], [
    sec(rpoly([[38, 14], [54, 14], [66, 52], [50, 52]], 1.5) + rpoly([[82, 14], [66, 14], [54, 52], [70, 52]], 1.5)),
    ink(circle(60, 70, 27)),
    cut(circle(60, 70, 21)),
    acc(circle(60, 70, 15)),
    cut(heart(60, 63, 14))
  ], 28),
  drawing("laurel", "Corona de laurel con un lazo", "Laurel wreath with a bow", ["bodas-oro-plata"], [
    ink(band(arcTrace(60, 56, 30, 30, 112, 248, 12), 4.5)),
    ink(band(arcTrace(60, 56, 30, 30, 68, -68, 12), 4.5)),
    ink([138, 182, 226].map((deg) => { const [x, y] = arcTrace(60, 56, 30, 30, deg, deg, 1)[0]!; return leaf(x, y, 18, 6, deg + 50); }).join("")),
    ink([42, -2, -46].map((deg) => { const [x, y] = arcTrace(60, 56, 30, 30, deg, deg, 1)[0]!; return leaf(x, y, 18, 6, deg - 50); }).join("")),
    acc(bowtie(60, 92, 14, 8)),
    cut(circle(60, 92, 2.6))
  ], 28),
  // ---- Pedida y compromiso ---------------------------------------------------------------------------------------
  drawing("caja-anillo", "Caja abierta con un anillo", "Open box with a ring", ["pedida"], [
    ink(rrect(32, 24, 56, 38, 8)),
    cut(rrect(38, 30, 44, 26, 5)),
    ink(rrect(28, 62, 64, 32, 8)),
    cut(rrect(36, 66, 48, 8, 4)),
    acc(circle(60, 52, 13)),
    cut(circle(60, 52, 7)),
    cut(rpoly([[60, 33], [66, 39], [60, 45], [54, 39]], 1.2))
  ], 36),
  drawing("solitario", "Anillo con una piedra grande", "Ring with a large stone", ["pedida"], [
    ink(band(arcTrace(60, 72, 21, 21, 0, 360), 9, true)),
    ink(rrect(50, 46, 20, 8, 3)),
    cut(rpoly([[60, 20], [75, 34], [60, 53], [45, 34]], 3)),
    acc(rpoly([[60, 25], [71, 35], [60, 49], [49, 35]], 2.5)),
    cut("M50 35H70", 2.5)
  ], 30),
  drawing("rosa", "Una rosa con tallo y hojas", "A single rose with stem and leaves", ["pedida"], [
    inkLine(4.5, "M60 54V98"),
    ink(leaf(60, 84, 24, 7, -148) + leaf(60, 72, 22, 6, -32)),
    acc(circle(60, 38, 22)),
    cut("M60 38m-4 0a4 4 0 1 1 6 3M50 30C54 24 68 24 70 34M48 42C50 52 66 54 72 44", 2.6)
  ], 26),
  // ---- Despedida de soltero/a ------------------------------------------------------------------------------------
  drawing("antifaz", "Antifaz de fiesta", "Party eye mask", ["despedida-soltero"], [
    secLine(4, "M24 57C19 57 17 60 15 64M96 57C101 57 103 60 105 64"),
    ink(shape([["M", 18, 54], ["C", 30, 40, 48, 48, 60, 52], ["C", 72, 48, 90, 40, 102, 54], ["C", 102, 72, 88, 78, 74, 68], ["C", 68, 64, 64, 62, 60, 62], ["C", 56, 62, 52, 64, 46, 68], ["C", 32, 78, 18, 72, 18, 54], ["Z"]], scaleAt(60, 58, 0.9))),
    cut(ellipse(43, 59, 9.5, 6) + ellipse(77, 59, 9.5, 6)),
    acc(rpoly([[60, 42], [66, 50], [60, 58], [54, 50]], 2))
  ], 34),
  drawing("coctel", "Copa de coctel con una aceituna", "Cocktail glass with an olive", ["despedida-soltero"], [
    ink(rpoly([[22, 28], [98, 28], [60, 66]], 4)),
    ink(rect(57, 64, 6, 28, 2) + rrect(40, 90, 40, 7, 3.5)),
    cut("M30 38H90", 2.5),
    inkLine(3, "M52 20L78 52"),
    acc(circle(70, 42, 7.5)),
    cut(circle(70, 42, 2.4))
  ], 32),
  drawing("pajarita", "Pajarita", "Bow tie", ["despedida-soltero"], [
    ink(rpoly([[60, 58], [22, 38], [22, 78]], 4) + rpoly([[60, 58], [98, 38], [98, 78]], 4)),
    cut("M34 52V64M44 52V64M76 52V64M86 52V64", 2.5),
    acc(rrect(50, 44, 20, 28, 6))
  ], 34),
  drawing("sombrero-copa", "Sombrero de copa con una cinta", "Top hat with a band", ["despedida-soltero"], [
    ink(rrect(18, 76, 84, 13, 6.5)),
    ink(rrect(34, 24, 52, 58, 6)),
    acc(rect(34, 62, 52, 14, 0)),
    cut("M44 34V54", 3)
  ], 38)
];
