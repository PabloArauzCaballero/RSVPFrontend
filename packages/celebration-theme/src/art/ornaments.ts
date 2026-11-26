import { circle, leaf, n, quadAt, rect, rpoly } from "./geometry.js";
import { acc, accLine, inkLine } from "./kit.js";
import type { ArtPath, OrnamentSet } from "./types.js";

/**
 * Ornament sets (PL-M7): six families of separators and corners that replace the single shared flourish. All of them are one
 * stroke family: a 1.8-unit line with round ends and joins in the page ink (never an outline around a figure) plus ONE accent
 * piece in the template accent (P4). A separator lives on a 240 × 28 grid and a corner (the frame repeats it four times) on a 56 × 56 grid.
 */
export const ORNAMENT_STROKE = 1.8;
const line = (d: string): ArtPath => inkLine(ORNAMENT_STROKE, d);
const SEP = { width: 240, height: 28 } as const;
const COR = { width: 56, height: 56 } as const;
const MID = 120;
const Y = 14;
const hair = (from: number, to: number, y = Y): string => `M${from} ${y}H${to}`;
/** A leaf drawn as a closed outline (never filled): a lens of `len` × `w` pointing at `degrees` (0 = right). */
const sprig = (x: number, y: number, len: number, w: number, degrees: number): ArtPath => line(leaf(x, y, len, w, degrees));
/** A small pennant hanging from (x, y). */
const flag = (x: number, y: number, size: number): readonly [readonly [number, number], readonly [number, number], readonly [number, number]] => [[x - size, y + 1], [x + size, y + 1], [x, y + size * 1.9]];
const flagPath = (points: ReturnType<typeof flag>): string => `M${points.map(([x, y]) => `${n(x)} ${n(y)}`).join("L")}Z`;

const laurel: OrnamentSet = {
  id: "laurel",
  label: { "es-BO": "Laurel", "en-US": "Laurel" },
  separator: {
    ...SEP,
    paths: [
      line(hair(8, 78) + hair(162, 232)),
      ...[0, 1, 2].flatMap((index) => [
        sprig(108 - index * 10, Y, 14, 3.8, 180 + 32), sprig(108 - index * 10, Y, 14, 3.8, 180 - 32),
        sprig(132 + index * 10, Y, 14, 3.8, -32), sprig(132 + index * 10, Y, 14, 3.8, 32)
      ]),
      acc(circle(MID, Y, 3.6))
    ]
  },
  corner: {
    ...COR,
    paths: [line("M2 54V16Q2 2 16 2H54"), sprig(11, 11, 18, 4.6, 45), sprig(11, 11, 15, 4.2, 12), sprig(11, 11, 15, 4.2, 78), acc(circle(7, 7, 2.6))], rails: [2]
  }
};

const deco: OrnamentSet = {
  id: "deco",
  label: { "es-BO": "Art déco", "en-US": "Art deco" },
  separator: {
    ...SEP,
    paths: [
      line(hair(8, 94) + hair(146, 232) + hair(24, 78, 8) + hair(162, 216, 8) + hair(24, 78, 20) + hair(162, 216, 20)),
      line("M98 14L109 3L120 14L131 3L142 14M98 14L109 25L120 14L131 25L142 14"),
      acc(rpoly([[MID, 8], [MID + 6, Y], [MID, 20], [MID - 6, Y]], 1))
    ]
  },
  corner: { ...COR, paths: [line("M2 54V18H18V2H54"), line("M10 54V26H26V10H54"), line("M18 54V34H34V18H54"), acc(rect(2, 2, 7, 7, 1.2))], rails: [2, 10, 18] }
};

const filete: OrnamentSet = {
  id: "filete",
  label: { "es-BO": "Filete", "en-US": "Rule" },
  separator: {
    ...SEP,
    paths: [line(hair(8, 104, Y - 3) + hair(136, 232, Y - 3) + hair(40, 104, Y + 3) + hair(136, 200, Y + 3)), acc(rect(MID - 5, Y - 5, 10, 10, 1.5))]
  },
  corner: { ...COR, paths: [line("M2 54V2H54"), line("M9 54V9H54"), acc(circle(2, 2, 3.4))], rails: [2, 9] }
};

/** The two rings of the wedding band as a separator (the approved Marfil prototype): a line, one ring in ink, one in the accent, a line. */
const anillosDobles: OrnamentSet = {
  id: "anillos-dobles",
  label: { "es-BO": "Dos anillos", "en-US": "Two rings" },
  separator: { ...SEP, paths: [line(hair(8, 100) + hair(140, 232) + circle(110, Y, 7)), accLine(ORNAMENT_STROKE, circle(130, Y, 7))] },
  corner: { ...COR, paths: [line("M2 54V2H54"), line("M9 54V9H54"), acc(circle(2, 2, 3.4))], rails: [2, 9] }
};

const onda: OrnamentSet = {
  id: "onda",
  label: { "es-BO": "Onda", "en-US": "Wave" },
  separator: {
    ...SEP,
    paths: [line("M8 14q8-9 16 0t16 0t16 0t16 0t16 0M168 14q8-9 16 0t16 0t16 0t16 0"), line(`M${MID - 18} ${Y}h8M${MID + 10} ${Y}h8`), acc(circle(MID, Y, 4.2))]
  },
  corner: { ...COR, paths: [line("M2 54V30Q2 2 30 2H54"), line("M12 54V40Q12 12 40 12H54"), acc(circle(27, 27, 4))], rails: [2, 12] }
};

const sagLeft = (t: number): readonly [number, number] => quadAt([6, 5], [60, 24], [116, 5], t);
const sagRight = (t: number): readonly [number, number] => quadAt([124, 5], [180, 24], [234, 5], t);
/** A pennant is a filled figure of ink (the approved prototypes, R3), never an outline. */
const fill = (d: string): ArtPath => ({ d, role: "ink" });
const banderin: OrnamentSet = {
  id: "banderin",
  label: { "es-BO": "Banderines", "en-US": "Bunting" },
  separator: {
    ...SEP,
    paths: [
      line("M6 5Q60 24 116 5L124 5Q180 24 234 5"),
      ...[0.12, 0.32, 0.5, 0.68, 0.88].map((t) => fill(flagPath(flag(...sagLeft(t), 6)))),
      acc(`${flagPath(flag(...sagRight(0.5), 6))}`),
      ...[0.12, 0.32, 0.68, 0.88].map((t) => fill(flagPath(flag(...sagRight(t), 6))))
    ]
  },
  corner: {
    ...COR,
    paths: [line("M2 54V2H54"), line("M16 2L24 2L20 10ZM2 16L2 24L10 20ZM32 2L40 2L36 10ZM2 32L2 40L10 36Z"), acc("M8 8L20 8L8 20Z")], rails: [2]
  }
};

const scallop = (from: number, count: number): string => Array.from({ length: count }, (_, index) => `M${from + index * 18} ${Y + 6}a9 9 0 0 1 18 0`).join("");
const arcos: OrnamentSet = {
  id: "arcos",
  label: { "es-BO": "Arcos", "en-US": "Arches" },
  separator: { ...SEP, paths: [line(hair(12, 102, Y + 6) + hair(138, 228, Y + 6) + scallop(12, 5) + scallop(138, 5)), acc(circle(MID, Y + 1, 4.2))] },
  corner: { ...COR, paths: [line("M2 54A52 52 0 0 1 54 2"), line("M2 38A36 36 0 0 1 38 2"), line("M2 22A20 20 0 0 1 22 2"), acc(circle(7, 7, 3.2))], rails: [2] }
};

export const ORNAMENT_SETS: readonly OrnamentSet[] = [laurel, deco, filete, onda, banderin, arcos, anillosDobles];
export const ornamentSetById = (id: string): OrnamentSet | undefined => ORNAMENT_SETS.find((set) => set.id === id);
