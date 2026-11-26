import { arcTrace, band, circle, circleAt, ellipse, rect, rotate, rpoly, rrect, shape } from "../geometry.js";
import { acc, cut, drawing, ink, inkLine, sec } from "../kit.js";

/** Work and milestones: corporativo, graduación, inauguración y despedidas y reuniones. */

const KEY = rotate(60, 58, 32);

export const WORK = [
  // ---- Corporativo -------------------------------------------------------------------------------------------------
  drawing("microfono", "Micrófono con su soporte", "Microphone on its stand", ["corporativo"], [
    ink(rrect(46, 14, 28, 44, 14)),
    cut("M50 26H70M50 34H70M50 42H70", 2.5),
    acc(rrect(46, 48, 28, 8, 3)),
    inkLine(4, "M36 48C36 78 84 78 84 48"),
    inkLine(4, "M60 72V90"),
    ink(rrect(42, 90, 36, 8, 4))
  ], 34),
  drawing("credencial", "Credencial con su cordón", "Event badge on a lanyard", ["corporativo"], [
    sec(rpoly([[38, 6], [49, 6], [63, 42], [55, 42]], 1.5) + rpoly([[82, 6], [71, 6], [57, 42], [65, 42]], 1.5)),
    ink(rrect(32, 38, 56, 60, 8)),
    cut(rrect(52, 44, 16, 5, 2.5)),
    cut("M42 62H78M42 71H70", 2.6),
    acc(rrect(42, 80, 20, 9, 3))
  ], 32),
  drawing("laptop", "Computador portátil con un gráfico", "Laptop showing a chart", ["corporativo"], [
    ink(rrect(28, 28, 64, 46, 5)),
    cut(rrect(33, 33, 54, 36, 2)),
    acc(rpoly([[40, 64], [40, 56], [52, 56], [52, 48], [64, 48], [64, 40], [76, 40], [76, 64]], 1)),
    ink(rpoly([[18, 78], [102, 78], [96, 90], [24, 90]], 3)),
    cut("M52 82H68", 2.5)
  ], 42),
  drawing("libreta", "Libreta con un elástico", "Notebook with an elastic band", ["corporativo"], [
    ink(rrect(30, 20, 60, 78, 5)),
    cut(circle(37, 34, 2.6) + circle(37, 46, 2.6) + circle(37, 58, 2.6) + circle(37, 70, 2.6) + circle(37, 82, 2.6)),
    cut("M48 36H76M48 46H70M48 56H76", 2.5),
    acc(rrect(75, 20, 8, 78, 1))
  ], 34),
  // ---- Graduación ----------------------------------------------------------------------------------------------------
  drawing("birrete", "Birrete con su borla", "Graduation cap with its tassel", ["graduacion"], [
    ink(shape([["M", 36, 56], ["L", 36, 74], ["C", 36, 86, 84, 86, 84, 74], ["L", 84, 56], ["L", 60, 66], ["Z"]])),
    ink(rpoly([[60, 24], [104, 44], [60, 64], [16, 44]], 4)),
    cut("M26 47L60 61L94 47", 2.5),
    acc(rpoly([[94, 46], [97, 46], [97, 74], [102, 74], [102, 88], [91, 88], [91, 74], [94, 74]], 1)),
    ink(circle(60, 44, 4))
  ], 36),
  drawing("diploma", "Diploma enrollado con un listón", "Rolled diploma with a ribbon", ["graduacion"], [
    ink(rrect(22, 30, 12, 56, 6) + rrect(86, 30, 12, 56, 6)),
    ink(rect(30, 34, 60, 48, 3)),
    cut("M42 48H78M42 58H72", 2.6),
    acc(rpoly([[54, 30], [66, 30], [66, 88], [68, 100], [60, 95], [52, 100], [54, 88]], 1.5))
  ], 40),
  drawing("toga", "Toga con una estola", "Graduation gown with a stole", ["graduacion"], [
    ink(rpoly([[42, 34], [52, 28], [60, 36], [68, 28], [78, 34], [100, 86], [86, 92], [78, 70], [78, 98], [42, 98], [42, 70], [34, 92], [20, 86]], 4)),
    acc(rpoly([[52, 28], [60, 36], [68, 28], [74, 98], [64, 98], [60, 52], [56, 98], [46, 98]], 2)),
    cut("M44 52L38 76M76 52L82 76", 2.5)
  ], 34),
  drawing("libros", "Pila de libros", "Stack of books", ["graduacion"], [
    ink(rrect(22, 70, 76, 22, 4)),
    sec(rrect(28, 50, 64, 20, 4)),
    acc(rrect(24, 30, 68, 20, 4)),
    cut("M32 81H88", 2.5),
    cut("M36 60H80", 2.5),
    cut("M32 40H84", 2.5)
  ], 40),
  // ---- Inauguración --------------------------------------------------------------------------------------------------
  drawing("tijera-cinta", "Tijera cortando una cinta", "Scissors cutting a ribbon", ["inauguracion"], [
    acc(rpoly([[14, 26], [106, 26], [106, 40], [14, 40]], 2)),
    ink(band([[51, 12], [64, 62]], 7) + band([[69, 12], [56, 62]], 7)),
    ink(band([[64, 62], [76, 78]], 6) + band([[56, 62], [44, 78]], 6)),
    ink(band(arcTrace(78, 86, 11, 11, 0, 360), 6, true) + band(arcTrace(42, 86, 11, 11, 0, 360), 6, true)),
    cut(circle(60, 52, 3.4)),
    cut(rpoly([[53, 24], [67, 24], [67, 42], [53, 42]], 1))
  ], 40),
  drawing("cartel", "Cartel «Abierto» colgado", "Hanging «Open» sign", ["inauguracion"], [
    inkLine(3, "M44 46L60 22L76 46"),
    ink(circle(60, 22, 4)),
    ink(rrect(24, 44, 72, 42, 8)),
    cut(rrect(31, 51, 58, 28, 4)),
    acc(rrect(37, 58, 46, 14, 4)),
    cut("M44 65H76", 2.5)
  ], 38),
  drawing("llave", "Llave nueva con una piedra en el aro", "New key with a stone in its bow", ["inauguracion"], [
    ink(circleAt([60, 30], 17, KEY) + rrect(56.5, 44, 7, 50, 2, KEY) + rrect(63.5, 72, 13, 6, 1.5, KEY) + rrect(63.5, 84, 9, 6, 1.5, KEY)),
    cut(circleAt([60, 30], 10, KEY)),
    acc(circleAt([60, 30], 6, KEY))
  ], 28),
  drawing("puerta", "Puerta abierta", "Open door", ["inauguracion"], [
    ink(shape([["M", 34, 98], ["L", 34, 36], ["C", 34, 20, 86, 20, 86, 36], ["L", 86, 98], ["Z"]])),
    cut(shape([["M", 42, 98], ["L", 42, 38], ["C", 42, 28, 78, 28, 78, 38], ["L", 78, 98], ["Z"]])),
    acc(rpoly([[42, 38], [64, 34], [64, 92], [42, 98]], 2)),
    ink(circle(58, 66, 2.8))
  ], 38),
  drawing("cohete", "Cohete de lanzamiento", "Launch rocket", ["inauguracion"], [
    sec(rpoly([[48, 62], [30, 84], [48, 80]], 2) + rpoly([[72, 62], [90, 84], [72, 80]], 2)),
    ink(shape([["M", 60, 12], ["C", 76, 26, 78, 54, 72, 82], ["L", 48, 82], ["C", 42, 54, 44, 26, 60, 12], ["Z"]])),
    cut(circle(60, 44, 8)),
    acc(shape([["M", 52, 86], ["L", 68, 86], ["C", 68, 94, 63, 98, 60, 102], ["C", 57, 98, 52, 94, 52, 86], ["Z"]]))
  ], 30),
  // ---- Despedidas y reuniones ----------------------------------------------------------------------------------------
  drawing("maleta", "Maleta con una etiqueta", "Suitcase with a tag", ["despedida-reunion"], [
    inkLine(5, "M46 44V34Q46 30 50 30H70Q74 30 74 34V44"),
    ink(rrect(24, 44, 72, 50, 8) + rect(34, 93, 9, 5, 2) + rect(77, 93, 9, 5, 2)),
    cut("M42 44V94M78 44V94", 2.8),
    acc(rrect(84, 56, 14, 24, 3.5)),
    cut(circle(91, 62, 2.2))
  ], 38),
  drawing("postal", "Postal con un sello", "Postcard with a stamp", ["despedida-reunion"], [
    sec(rrect(28, 30, 70, 50, 5, rotate(60, 56, 8))),
    ink(rrect(20, 38, 76, 52, 6)),
    cut("M58 48V80", 2.5),
    cut("M66 56H86M66 66H86M66 76H80", 2.5),
    acc(rrect(28, 48, 22, 28, 3)),
    cut(circle(39, 62, 4))
  ], 38),
  drawing("mesa-larga", "Mesa larga con dos sillas y flores", "Long table with two chairs and flowers", ["despedida-reunion"], [
    sec(rrect(20, 38, 12, 30, 4) + rrect(88, 38, 12, 30, 4)),
    ink(rrect(14, 62, 92, 9, 4.5) + rect(24, 70, 7, 28, 2) + rect(89, 70, 7, 28, 2)),
    inkLine(3, "M60 62V50"),
    acc(circle(60, 40, 10)),
    cut(circle(60, 40, 3.2)),
    cut(ellipse(38, 62, 9, 1.8) + ellipse(82, 62, 9, 1.8))
  ], 42),
  drawing("brujula", "Brújula", "Compass", ["despedida-reunion"], [
    ink(rrect(53, 16, 14, 8, 2)),
    ink(circle(60, 60, 36)),
    cut(circle(60, 60, 29)),
    inkLine(3, "M60 36V41M60 79V84M36 60H41M79 60H84"),
    acc(rpoly([[60, 36], [67, 60], [53, 60]], 2, rotate(60, 60, 38))),
    ink(rpoly([[67, 60], [60, 84], [53, 60]], 2, rotate(60, 60, 38))),
    cut(circle(60, 60, 3))
  ], 34)
];
