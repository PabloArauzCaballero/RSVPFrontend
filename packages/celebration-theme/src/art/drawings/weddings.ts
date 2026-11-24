import { after, arcPoints, circle, circleAt, ellipse, heart, leaf, move, rect, rotate, rpoly, rrect, shape, type Transform } from "../geometry.js";
import { acc, cut, drawing, ink, inkLine, sec, secLine } from "../kit.js";

/** Weddings and what follows them: boda, aniversario, bodas de oro y plata, pedida y despedida de soltero/a. */

const ring = (cx: number, cy: number, r = 15.5): string => circle(cx, cy, r);
const arc = (cx: number, cy: number, r: number, from: number, to: number): string => {
  const [a, b] = [arcPoints(cx, cy, r, r, from, from, 1)[0]!, arcPoints(cx, cy, r, r, to, to, 1)[0]!];
  return `M${a[0].toFixed(2)} ${a[1].toFixed(2)}A${r} ${r} 0 0 1 ${b[0].toFixed(2)} ${b[1].toFixed(2)}`;
};
/** A bell hanging from its top centre, written once and swung either way. */
const bell = (t: Transform): { readonly body: string; readonly clapper: string } => ({
  body: shape([["M", 0, 0], ["C", -9, 0, -13, 9, -13, 21], ["C", -13, 31, -18, 35, -22, 40], ["L", 22, 40], ["C", 18, 35, 13, 31, 13, 21], ["C", 13, 9, 9, 0, 0, 0], ["Z"]], t),
  clapper: circleAt([0, 45], 4.6, t)
});
const swing = (x: number, deg: number): Transform => after(rotate(0, 0, deg), move(x, 28));
const cup = (cx: number, mirror: number): { readonly body: string; readonly handle: string; readonly saucer: string } => ({
  body: shape([["M", cx - 19, 50], ["L", cx + 19, 50], ["L", cx + 19, 64], ["C", cx + 19, 86, cx - 19, 86, cx - 19, 64], ["Z"]]),
  handle: `M${cx + 19 * mirror} 56H${cx + 24 * mirror}Q${cx + 31 * mirror} 56 ${cx + 31 * mirror} 64Q${cx + 31 * mirror} 72 ${cx + 21 * mirror} 74`,
  saucer: ellipse(cx, 91, 22, 4.5)
});
const leftCup = cup(38, -1);
const rightCup = cup(82, 1);
/** A blossom: a round heart and five petals. */
const blossom = (cx: number, cy: number, size: number): string =>
  circle(cx, cy, size * 0.5) + Array.from({ length: 5 }, (_, index) => { const a = ((index * 72 - 90) * Math.PI) / 180; return circle(cx + size * 0.55 * Math.cos(a), cy + size * 0.55 * Math.sin(a), size * 0.36); }).join("");
const candle = (x: number, y: number, h: number): string => rrect(x, y, 12, h, 3);
const tier = (x: number, y: number, w: number, h: number): string => rrect(x, y, w, h, 5);

export const WEDDINGS = [
  // ---- Boda ----------------------------------------------------------------------------------------------------
  drawing("anillos", "Dos anillos entrelazados con una piedra", "Two interlocked rings with a gem", ["boda"], [
    { d: ring(46, 68), role: "ink", stroke: 7 },
    { d: ring(74, 68), role: "secondary", stroke: 7 },
    { d: arc(46, 68, 15.5, -52, 52), role: "ink", stroke: 7 },
    cut(rpoly([[74, 28], [90, 43], [74, 60], [58, 43]], 3)),
    acc(rpoly([[74, 32], [86, 43], [74, 56], [62, 43]], 2.5)),
    cut("M62 43H86M74 32L69 43L74 56L79 43L74 32", 1.4)
  ], 34),
  drawing("ramo", "Ramo de flores atado con un lazo", "Bouquet tied with a ribbon", ["boda"], [
    inkLine(4, "M60 98L40 54M60 98L80 54M60 98V42"),
    sec(leaf(58, 88, 30, 7, -158) + leaf(62, 88, 30, 7, -22) + leaf(60, 76, 22, 6, -125) + leaf(60, 76, 22, 6, -55)),
    ink(blossom(38, 48, 15) + blossom(82, 48, 15) + blossom(60, 34, 15)),
    cut(circle(38, 48, 3.6) + circle(82, 48, 3.6) + circle(60, 34, 3.6)),
    acc(rrect(49, 72, 22, 9, 4) + rpoly([[56, 80], [47, 96], [55, 92]], 1.5) + rpoly([[64, 80], [73, 96], [65, 92]], 1.5))
  ], 26),
  drawing("pastel-bodas", "Pastel de bodas de tres pisos", "Three-tier wedding cake", ["boda"], [
    sec(rrect(16, 92, 88, 7, 3.5)),
    ink(tier(24, 70, 72, 24)),
    acc(tier(33, 49, 54, 22)),
    ink(tier(42, 30, 36, 20)),
    cut("M30 80H90", 2.4),
    cut(circle(42, 60, 2.2) + circle(60, 60, 2.2) + circle(78, 60, 2.2) + circle(52, 40, 2) + circle(68, 40, 2)),
    ink(heart(60, 16, 15))
  ], 42),
  drawing("campanas", "Dos campanas de boda", "Two wedding bells", ["boda"], [
    secLine(3.5, "M44 25Q60 8 76 25"),
    ink(bell(swing(46, 14)).body),
    ink(bell(swing(46, 14)).clapper),
    acc(bell(swing(74, -14)).body),
    ink(bell(swing(74, -14)).clapper)
  ], 36),
  drawing("velas", "Candelabro con tres velas", "Candelabra with three candles", ["boda"], [
    ink(candle(54, 46, 46)),
    ink(candle(30, 62, 32) + candle(78, 62, 32)),
    inkLine(3, "M60 46V40M36 62V56M84 62V56"),
    sec(shape([["M", 36, 54], ["C", 39, 48, 41, 46, 36, 40], ["C", 31, 46, 33, 48, 36, 54], ["Z"]]) + shape([["M", 84, 54], ["C", 87, 48, 89, 46, 84, 40], ["C", 79, 46, 81, 48, 84, 54], ["Z"]])),
    acc(shape([["M", 60, 38], ["C", 65, 30, 67, 26, 60, 16], ["C", 53, 26, 55, 30, 60, 38], ["Z"]])),
    ink(rrect(22, 90, 76, 8, 4)),
    cut("M40 70C40 76 43 78 43 82", 2.2)
  ], 40),
  // ---- Aniversario -----------------------------------------------------------------------------------------------
  drawing("tazas", "Dos tazas con su plato", "Two cups on saucers", ["aniversario"], [
    secLine(3, "M36 40C32 34 40 32 36 26M44 40C40 34 48 32 44 26M76 40C72 34 80 32 76 26M84 40C80 34 88 32 84 26"),
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
    cut("M46 80H84M46 87H72", 2.4),
    acc(rpoly([[68, 80], [80, 80], [80, 104], [74, 98], [68, 104]], 1.5))
  ], 38),
  drawing("cifra-diez", "El número 10, de diez años juntos", "The number 10, for ten years together", ["aniversario"], [
    inkLine(10, "M32 44L45 34V86"),
    { d: ellipse(80, 60, 16, 26), role: "accent", stroke: 10 },
    sec(rrect(26, 94, 68, 5, 2.5))
  ], 38),
  drawing("reloj-arena", "Reloj de arena", "Hourglass", ["aniversario"], [
    inkLine(5, "M40 30V90M80 30V90"),
    ink(rrect(28, 20, 64, 9, 4) + rrect(28, 91, 64, 9, 4)),
    sec(shape([["M", 44, 29], ["L", 76, 29], ["C", 76, 44, 64, 52, 64, 60], ["C", 64, 68, 76, 76, 76, 91], ["L", 44, 91], ["C", 44, 76, 56, 68, 56, 60], ["C", 56, 52, 44, 44, 44, 29], ["Z"]])),
    ink(shape([["M", 49, 29], ["L", 71, 29], ["C", 70, 38, 65, 43, 60, 47], ["C", 55, 43, 50, 38, 49, 29], ["Z"]])),
    acc(shape([["M", 47, 91], ["C", 51, 82, 56, 78, 60, 78], ["C", 64, 78, 69, 82, 73, 91], ["Z"]])),
    cut("M60 49V78", 2)
  ], 36),
  // ---- Bodas de oro y plata --------------------------------------------------------------------------------------
  drawing("cifra-25", "El número 25, bodas de plata", "The number 25, silver wedding", ["bodas-oro-plata"], [
    inkLine(9, "M28 42C28 28 54 28 54 42C54 56 32 68 28 86H56"),
    { d: "M96 32H74L72 56C78 49 94 51 94 68C94 86 74 90 68 80", role: "accent", stroke: 9 },
    sec(rrect(26, 94, 68, 5, 2.5))
  ], 40),
  drawing("cifra-50", "El número 50, bodas de oro", "The number 50, golden wedding", ["bodas-oro-plata"], [
    inkLine(9, "M52 32H30L28 56C34 49 50 51 50 68C50 86 30 90 24 80"),
    { d: ellipse(80, 60, 15, 26), role: "accent", stroke: 9.5 },
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
    ink(arcPoints(60, 56, 30, 30, 110, 250, 7).map(([x, y], index) => leaf(x, y, 17, 5.2, 200 + index * 10 - 90)).join("")),
    ink(arcPoints(60, 56, 30, 30, 70, -70, 7).map(([x, y], index) => leaf(x, y, 17, 5.2, -20 - index * 10 + 90 - 0)).join("")),
    acc(rpoly([[60, 92], [46, 84], [46, 100]], 2) + rpoly([[60, 92], [74, 84], [74, 100]], 2) + circle(60, 92, 4.5))
  ], 28),
  // ---- Pedida y compromiso ---------------------------------------------------------------------------------------
  drawing("caja-anillo", "Caja abierta con un anillo", "Open box with a ring", ["pedida"], [
    ink(rrect(32, 24, 56, 38, 8)),
    cut(rrect(38, 30, 44, 26, 5)),
    ink(rrect(28, 62, 64, 32, 8)),
    cut(rrect(36, 66, 48, 8, 4)),
    { d: circle(60, 52, 12), role: "accent", stroke: 5.5 },
    cut(rpoly([[60, 36], [65, 41], [60, 46], [55, 41]], 1.2))
  ], 36),
  drawing("solitario", "Anillo con una piedra grande", "Ring with a large stone", ["pedida"], [
    { d: circle(60, 72, 22), role: "ink", stroke: 8 },
    ink(rrect(50, 46, 20, 8, 3)),
    cut(rpoly([[60, 22], [74, 34], [60, 52], [46, 34]], 3)),
    acc(rpoly([[60, 25], [71, 35], [60, 49], [49, 35]], 2.5)),
    cut("M49 35H71M60 25L56 35L60 49L64 35L60 25", 1.4)
  ], 30),
  drawing("rosa", "Una rosa con tallo y hojas", "A single rose with stem and leaves", ["pedida"], [
    inkLine(4.5, "M60 54V98"),
    ink(leaf(60, 84, 24, 7, -148) + leaf(60, 72, 22, 6, -32)),
    acc(circle(60, 38, 22)),
    cut("M60 38m-4 0a4 4 0 1 1 6 3M50 30C54 24 68 24 70 34M48 42C50 52 66 54 72 44", 2.6)
  ], 26),
  // ---- Despedida de soltero/a ------------------------------------------------------------------------------------
  drawing("antifaz", "Antifaz de fiesta", "Party eye mask", ["despedida-soltero"], [
    secLine(4, "M18 56C12 56 10 60 8 64M102 56C108 56 110 60 112 64"),
    ink(shape([["M", 18, 54], ["C", 30, 40, 48, 48, 60, 52], ["C", 72, 48, 90, 40, 102, 54], ["C", 102, 72, 88, 78, 74, 68], ["C", 68, 64, 64, 62, 60, 62], ["C", 56, 62, 52, 64, 46, 68], ["C", 32, 78, 18, 72, 18, 54], ["Z"]])),
    cut(ellipse(40, 60, 11, 6.5) + ellipse(80, 60, 11, 6.5)),
    acc(rpoly([[60, 42], [66, 50], [60, 58], [54, 50]], 2))
  ], 34),
  drawing("coctel", "Copa de coctel con una aceituna", "Cocktail glass with an olive", ["despedida-soltero"], [
    ink(rpoly([[22, 28], [98, 28], [60, 66]], 4)),
    ink(rect(57, 64, 6, 28, 2) + rrect(40, 90, 40, 7, 3.5)),
    cut("M30 38H90", 2.4),
    inkLine(3, "M52 20L78 52"),
    acc(circle(70, 42, 7.5)),
    cut(circle(70, 42, 2.4))
  ], 32),
  drawing("pajarita", "Pajarita", "Bow tie", ["despedida-soltero"], [
    ink(rpoly([[60, 58], [22, 38], [22, 78]], 4) + rpoly([[60, 58], [98, 38], [98, 78]], 4)),
    cut("M34 52V64M44 52V64M76 52V64M86 52V64", 2.4),
    acc(rrect(50, 44, 20, 28, 6))
  ], 34),
  drawing("sombrero-copa", "Sombrero de copa con una cinta", "Top hat with a band", ["despedida-soltero"], [
    ink(rrect(18, 76, 84, 13, 6.5)),
    ink(rrect(34, 24, 52, 58, 6)),
    acc(rect(34, 62, 52, 14, 0)),
    cut("M44 34V54", 3)
  ], 38)
];
