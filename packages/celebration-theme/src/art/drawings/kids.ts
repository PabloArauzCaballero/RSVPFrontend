import { balloonKnot, bowtie, circle, crossShape, ellipse, leaf, rect, rpoly, rrect, shape } from "../geometry.js";
import { acc, cut, drawing, ink, inkLine, sec, secLine } from "../kit.js";

/** Children and family rites: cumpleaños infantil, bautizo, baby shower y revelación, comunión y confirmación. */

const flame = (x: number, y: number, size: number): string => shape([["M", x, y - size * 2.2], ["C", x + size * 1.1, y - size * 1.1, x + size * 1.1, y - size * 0.1, x, y], ["C", x - size * 1.1, y - size * 0.1, x - size * 1.1, y - size * 1.1, x, y - size * 2.2], ["Z"]]);
const star = (cx: number, cy: number, outer: number, inner: number, turn: number): string =>
  rpoly(Array.from({ length: 10 }, (_, index) => { const r = index % 2 ? inner : outer; const a = ((turn + index * 36) * Math.PI) / 180; return [cx + r * Math.cos(a), cy + r * Math.sin(a)] as const; }), 3);

export const KIDS = [
  // ---- Cumpleaños infantil ---------------------------------------------------------------------------------------
  drawing("globos", "Tres globos atados", "Three tied balloons", ["cumpleanos-infantil"], [
    inkLine(2.5, "M42 66C46 80 56 86 60 96M78 66C74 80 64 86 60 96M60 58C60 78 60 88 60 96"),
    ink(balloonKnot(42, 44, 15, 19)),
    sec(balloonKnot(78, 44, 15, 19)),
    acc(balloonKnot(60, 34, 16, 20)),
    cut("M51 28C53 22 58 20 62 21", 2.5),
    cut("M33 38C34 34 37 32 40 32", 2.5)
  ], 26),
  drawing("pinata", "Piñata de estrella colgada", "Hanging star piñata", ["cumpleanos-infantil"], [
    inkLine(3, "M60 6V26"),
    ink(star(60, 58, 38, 19, -90)),
    cut("M44 46L52 52M76 46L68 52M38 66L48 62M82 66L72 62M50 80L55 72M70 80L65 72M60 24V34", 2.5),
    acc(circle(60, 58, 10)),
    cut(circle(60, 58, 4.2))
  ], 34),
  drawing("gorrito", "Gorrito de fiesta con pompón", "Party hat with a pompom", ["cumpleanos-infantil"], [
    ink(rpoly([[60, 22], [86, 92], [34, 92]], 5)),
    cut("M48 68L72 56M42 84L78 66M54 52L66 46", 2.6),
    sec(rrect(30, 88, 60, 9, 4.5)),
    acc(circle(60, 20, 9))
  ], 36),
  drawing("pastel-velas", "Pastel con tres velas", "Cake with three candles", ["cumpleanos-infantil"], [
    sec(rrect(16, 92, 88, 7, 3.5)),
    ink(rrect(26, 62, 68, 32, 6)),
    acc(rrect(22, 48, 76, 20, 9)),
    cut("M30 80H90", 2.5),
    ink(rrect(41, 30, 6, 20, 1.5) + rrect(57, 30, 6, 20, 1.5) + rrect(73, 30, 6, 20, 1.5)),
    sec(flame(44, 26, 3.6) + flame(60, 26, 3.6) + flame(76, 26, 3.6))
  ], 42),
  drawing("tren", "Tren de juguete", "Toy train", ["cumpleanos-infantil"], [
    sec(rrect(74, 60, 26, 26, 4)),
    inkLine(3.5, "M70 74H76"),
    ink(rrect(24, 38, 24, 26, 3) + rrect(54, 38, 10, 20, 2)),
    acc(rrect(20, 52, 54, 32, 5)),
    cut(rrect(28, 44, 16, 12, 2)),
    ink(circle(36, 88, 10) + circle(62, 88, 10) + circle(88, 88, 8)),
    cut(circle(36, 88, 4) + circle(62, 88, 4) + circle(88, 88, 3)),
    inkLine(3, "M56 38Q62 30 70 32")
  ], 40),
  // ---- Bautizo -----------------------------------------------------------------------------------------------------
  drawing("concha", "Concha con una gota de agua", "Shell with a drop of water", ["bautizo"], [
    ink(shape([["M", 60, 96], ["L", 30, 66], ["C", 20, 52, 28, 38, 42, 36], ["C", 48, 30, 72, 30, 78, 36], ["C", 92, 38, 100, 52, 90, 66], ["Z"]])),
    ink(rrect(50, 92, 20, 8, 3)),
    cut("M60 94L36 54M60 94L46 44M60 94L60 40M60 94L74 44M60 94L84 54", 2.8),
    acc(shape([["M", 60, 12], ["C", 66, 20, 69, 24, 69, 28], ["C", 69, 33, 65, 36, 60, 36], ["C", 55, 36, 51, 33, 51, 28], ["C", 51, 24, 54, 20, 60, 12], ["Z"]]))
  ], 30),
  drawing("vela", "Vela encendida con una cinta", "Lit candle with a ribbon", ["bautizo", "comunion"], [
    ink(rrect(47, 42, 26, 54, 5)),
    sec(rect(47, 66, 26, 12, 0)),
    cut("M53 50C53 58 56 60 56 64M65 48C65 54 66 56 66 60", 2.5),
    inkLine(3, "M60 42V36"),
    acc(shape([["M", 60, 33], ["C", 67, 24, 69, 18, 60, 6], ["C", 51, 18, 53, 24, 60, 33], ["Z"]])),
    ink(rrect(34, 92, 52, 8, 4))
  ], 36),
  drawing("paloma", "Paloma con una ramita de olivo", "Dove with an olive twig", ["bautizo", "comunion"], [
    ink(shape([["M", 18, 76], ["C", 30, 72, 40, 64, 52, 60], ["C", 62, 57, 68, 52, 70, 44], ["C", 71, 35, 80, 31, 86, 37], ["C", 90, 41, 88, 47, 84, 50], ["C", 84, 62, 76, 73, 60, 77], ["C", 46, 80, 32, 80, 18, 76], ["Z"]])),
    sec(shape([["M", 64, 62], ["C", 50, 64, 38, 54, 28, 38], ["C", 46, 36, 62, 42, 72, 54], ["C", 72, 60, 68, 62, 64, 62], ["Z"]])),
    cut("M58 58C50 54 44 48 38 42", 2.5),
    inkLine(3, "M88 38L95 41"),
    cut(circle(82, 38, 2)),
    acc(leaf(95, 42, 10, 3.6, 40))
  ], 32),
  drawing("zapatito", "Zapatito de bebé con un lazo", "Baby bootie with a bow", ["bautizo"], [
    sec(rrect(32, 92, 68, 6, 3)),
    ink(shape([["M", 40, 34], ["L", 66, 34], ["L", 66, 60], ["C", 66, 66, 74, 64, 84, 68], ["C", 98, 74, 100, 92, 90, 92], ["L", 40, 92], ["Q", 36, 92, 36, 88], ["L", 36, 38], ["Q", 36, 34, 40, 34], ["Z"]])),
    acc(rrect(34, 26, 34, 12, 4)),
    cut("M48 52H58M48 62H58M48 72H58", 2.5)
  ], 38),
  // ---- Baby shower y revelación ----------------------------------------------------------------------------------
  drawing("biberon", "Biberón con medidas", "Baby bottle with measures", ["baby-shower"], [
    ink(shape([["M", 50, 46], ["C", 50, 30, 53, 22, 60, 22], ["C", 67, 22, 70, 30, 70, 46], ["Z"]])),
    acc(rrect(40, 42, 40, 11, 4)),
    ink(rrect(42, 52, 36, 44, 8)),
    cut("M50 66H60M50 76H64M50 86H60", 2.5),
    cut("M71 62V86", 2.5)
  ], 28),
  drawing("sonajero", "Sonajero", "Baby rattle", ["baby-shower"], [
    ink(rrect(56, 58, 8, 30, 3)),
    { d: circle(60, 92, 8), role: "secondary", stroke: 4.5 },
    ink(circle(60, 38, 26)),
    cut("M42 28C52 38 68 38 78 28M38 44C50 54 70 54 82 44", 2.5),
    acc(rrect(46, 58, 28, 9, 4.5))
  ], 24),
  drawing("globo-pregunta", "Globo con un signo de pregunta", "Balloon with a question mark", ["baby-shower"], [
    inkLine(2.5, "M60 86C54 92 66 96 60 100"),
    ink(balloonKnot(60, 42, 27, 31)),
    cut("M49 36C49 22 71 22 71 36C71 44 60 44 60 54", 5.2),
    cut(circle(60, 62, 3.6)),
    acc(bowtie(60, 82, 10, 6))
  ], 26),
  drawing("chupete", "Chupete", "Pacifier", ["baby-shower"], [
    { d: circle(60, 34, 14), role: "ink", stroke: 6 },
    ink(rrect(34, 48, 52, 24, 12)),
    cut(rrect(52, 56, 16, 8, 4)),
    acc(shape([["M", 50, 72], ["C", 48, 98, 72, 98, 70, 72], ["Z"]]))
  ], 28),
  drawing("cochecito", "Cochecito de bebé", "Baby pram", ["baby-shower"], [
    inkLine(5, "M88 58L98 34H106"),
    acc(shape([["M", 26, 62], ["C", 26, 40, 40, 30, 58, 30], ["L", 58, 62], ["Z"]])),
    ink(rpoly([[22, 62], [98, 62], [90, 84], [34, 84]], 6)),
    ink(circle(40, 90, 9) + circle(82, 90, 9)),
    cut(circle(40, 90, 3.6) + circle(82, 90, 3.6) + circle(60, 62, 0.1))
  ], 40),
  // ---- Comunión y confirmación -----------------------------------------------------------------------------------
  drawing("caliz", "Cáliz con una hostia", "Chalice with a host", ["comunion"], [
    ink(shape([["M", 36, 36], ["L", 84, 36], ["C", 84, 56, 74, 66, 60, 68], ["C", 46, 66, 36, 56, 36, 36], ["Z"]])),
    ink(rect(56, 66, 8, 12, 2) + circle(60, 78, 8)),
    ink(shape([["M", 38, 96], ["C", 38, 86, 48, 84, 60, 84], ["C", 72, 84, 82, 86, 82, 96], ["Z"]])),
    cut("M40 46H80", 2.5),
    acc(circle(60, 20, 11)),
    cut("M60 14V26M54 19H66", 2.5)
  ], 32),
  drawing("rosario", "Rosario con su cruz", "Rosary with its cross", ["comunion"], [
    secLine(2.5, ellipse(60, 44, 25, 27)),
    ink(beads()),
    inkLine(3, "M60 71V82"),
    acc(crossShape(60, 80, 22, 22, 7, 6)),
    cut(circle(60, 17, 3))
  ], 26),
  drawing("biblia", "Libro sagrado con una cruz", "Holy book with a cross", ["comunion"], [
    ink(rrect(28, 22, 64, 74, 6)),
    sec(rrect(36, 90, 54, 8, 2)),
    cut("M36 22V90", 2.6),
    acc(crossShape(62, 34, 36, 28, 9, 12)),
    cut("M44 80H82", 2.5)
  ], 36)
];

/** Eight beads around the loop of the rosary, the one on top larger (the Our Father). */
function beads(): string {
  return Array.from({ length: 8 }, (_, index) => {
    const angle = ((118 + (304 * index) / 7) * Math.PI) / 180;
    return circle(60 + 25 * Math.cos(angle), 44 + 27 * Math.sin(angle), 5.2);
  }).join("") + circle(60, 17, 7.2);
}
