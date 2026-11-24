import { after, circle, heart, move, rect, rotate, rpoly, rrect, scaleAt, shape, type Cmd, type Transform } from "../geometry.js";
import { acc, cut, drawing, ink, inkLine, sec } from "../kit.js";

/** Drawings every invitation can use: the envelope, the time, the place, the toast, the gift, the photo, the dress, the question, the way and the stay. */

/** One champagne flute (bowl, stem and foot) and the drink in it, written once so the toast can tilt two of them. */
const flute = (t: Transform): { readonly glass: string; readonly drink: string } => ({
  glass: shape([["M", 47, 18], ["L", 73, 18], ["C", 74, 40, 70, 54, 60, 58], ["C", 50, 54, 46, 40, 47, 18], ["Z"]], t)
    + shape([["M", 57, 56], ["L", 63, 56], ["L", 62.4, 84], ["L", 57.6, 84], ["Z"]], t) + shape([["M", 46, 90], ["C", 46, 84, 74, 84, 74, 90], ["Q", 74, 92, 70, 92], ["L", 50, 92], ["Q", 46, 92, 46, 90], ["Z"]], t),
  drink: shape([["M", 49.6, 32], ["L", 70.4, 32], ["C", 70.6, 44, 67, 51, 60, 54.4], ["C", 53, 51, 49.4, 44, 49.6, 32], ["Z"]], t)
});

const bowCmds = (t: Transform): string => shape([["M", 60, 40], ["C", 54, 22, 32, 22, 36, 35], ["C", 40, 45, 53, 44, 60, 40], ["Z"]], t) + shape([["M", 60, 40], ["C", 66, 22, 88, 22, 84, 35], ["C", 80, 45, 67, 44, 60, 40], ["Z"]], t);
const leftFlute = flute(after(move(-24, 0), rotate(36, 92, 14)));
const rightFlute = flute(after(move(24, 0), rotate(84, 92, -14)));
const pinCmds: readonly Cmd[] = [["M", 60, 80], ["C", 47, 66, 41, 58, 41, 47], ["C", 41, 36, 49, 29, 60, 29], ["C", 71, 29, 79, 36, 79, 47], ["C", 79, 58, 73, 66, 60, 80], ["Z"]];

export const COMMON = [
  drawing("sobre", "Sobre de invitación", "Invitation envelope", ["common"], [
    sec(rrect(33, 22, 54, 42, 5, rotate(60, 60, -6))),
    ink(rrect(22, 40, 76, 54, 8)),
    cut("M27 47L60 72L93 47", 3.5),
    cut(circle(60, 71, 12)),
    acc(heart(60, 65, 18))
  ]),
  drawing("reloj", "Reloj despertador", "Alarm clock", ["common"], [
    sec(circle(40, 27, 9) + circle(80, 27, 9)),
    ink(circle(60, 56, 31)),
    inkLine(5, "M42 84L35 94M78 84L85 94"),
    cut(circle(60, 56, 23)),
    ink(circle(60, 56, 3.2)),
    { d: "M60 56V41M60 56L70 62", role: "ink", stroke: 3.6 },
    acc(circle(60, 36, 3.1) + circle(60, 76, 3.1) + circle(40, 56, 3.1) + circle(80, 56, 3.1))
  ], 30),
  drawing("mapa-pin", "Mapa con un punto marcado", "Map with a pin", ["common"], [
    ink(rpoly([[22, 54], [42, 48], [78, 58], [98, 50], [98, 92], [78, 100], [42, 90], [22, 96]], 4)),
    cut("M42 48V90M78 58V100", 2.6),
    cut(shape(pinCmds, scaleAt(60, 56, 1.3))),
    acc(shape(pinCmds)),
    cut(circle(60, 47, 6.5))
  ]),
  drawing("copas", "Dos copas brindando", "Two glasses toasting", ["common"], [
    ink(leftFlute.glass),
    sec(leftFlute.drink),
    ink(rightFlute.glass),
    acc(rightFlute.drink)
  ], 34),
  drawing("regalo", "Regalo con moño", "Gift with a bow", ["common"], [
    ink(rect(30, 54, 60, 44, 8)),
    ink(rect(24, 42, 72, 16, 6)),
    cut("M30 60H90", 2.5),
    acc(rect(54, 42, 12, 56, 2)),
    ink(bowCmds(move(0, 0))),
    cut("M58 38C52 30 44 28 42 33M62 38C68 30 76 28 78 33", 2.2),
    ink(circle(60, 40, 6.5))
  ]),
  drawing("camara", "Cámara de fotos", "Camera", ["common"], [
    ink(rrect(40, 28, 26, 16, 4)),
    ink(rrect(20, 38, 80, 54, 11)),
    sec(rrect(76, 30, 14, 7, 3)),
    cut(circle(60, 66, 21)),
    ink(circle(60, 66, 16)),
    acc(circle(60, 66, 8)),
    cut(circle(56, 62, 2.6)),
    cut(circle(86, 52, 3.2)),
    cut("M20 50H100", 2.4)
  ]),
  drawing("percha", "Percha con una prenda", "Hanger with a garment", ["common"], [
    { d: "M60 40C60 34 68 33 68 27C68 21 59 20 57 25", role: "ink", stroke: 4 },
    { d: "M60 40L22 60Q18 62 22 64H98Q102 62 98 60Z", role: "ink", stroke: 4 },
    acc(rpoly([[44, 56], [54, 52], [60, 59], [66, 52], [76, 56], [90, 70], [80, 78], [76, 72], [76, 98], [44, 98], [44, 72], [40, 78], [30, 70]], 5)),
    cut("M54 52C56 64 64 64 66 52", 3)
  ], 28),
  drawing("pregunta", "Tarjeta con una pregunta", "Question card", ["common"], [
    sec(rrect(34, 20, 56, 72, 9, rotate(62, 56, 9))),
    ink(rrect(28, 24, 58, 74, 10)),
    cut("M46 47C46 33 72 33 72 46C72 56 57 56 57 67", 6.2),
    acc(circle(57, 80, 5.2))
  ], 30),
  drawing("auto", "Auto de lado", "Car, side view", ["common"], [
    ink(rpoly([[16, 82], [16, 66], [28, 62], [40, 44], [74, 44], [90, 62], [104, 66], [104, 82]], 7)),
    acc(rpoly([[43, 50], [57, 50], [57, 62], [34, 62]], 3) + rpoly([[62, 50], [72, 50], [84, 62], [62, 62]], 3)),
    cut("M59.5 49V63", 3.2),
    cut(circle(37, 83, 15) + circle(84, 83, 15)),
    ink(circle(37, 83, 11) + circle(84, 83, 11)),
    cut(circle(37, 83, 4.5) + circle(84, 83, 4.5))
  ], 40),
  drawing("cama", "Cama con almohada", "Bed with a pillow", ["common"], [
    ink(rrect(18, 36, 11, 62, 4)),
    ink(rrect(18, 70, 84, 14, 4)),
    ink(rect(94, 56, 8, 42, 3)),
    sec(rrect(32, 52, 26, 15, 7)),
    acc(rrect(52, 58, 42, 17, 6)),
    cut("M62 66H86", 2.4)
  ], 38)
];
