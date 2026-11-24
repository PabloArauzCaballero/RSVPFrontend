// Dibujos de invitación: construcción DOne/Cuotea (ver packages/ui/src/illustrations.ts).
// Disco de piedra, sombra de contacto plana, figura rellena de tinta con detalles calados en el color del fondo
// y UNA sola pieza de color (la del acento de la plantilla). Sin contornos, degradados, desenfoque ni caras.
const n = (v) => String(Math.round(v * 100) / 100);
export const circle = (cx, cy, r) => `M${n(cx - r)} ${n(cy)}a${n(r)} ${n(r)} 0 1 0 ${n(2 * r)} 0a${n(r)} ${n(r)} 0 1 0 ${n(-2 * r)} 0Z`;
export const ellipse = (cx, cy, rx, ry) => `M${n(cx - rx)} ${n(cy)}a${n(rx)} ${n(ry)} 0 1 0 ${n(2 * rx)} 0a${n(rx)} ${n(ry)} 0 1 0 ${n(-2 * rx)} 0Z`;
export const rect = (x, y, w, h, r) => `M${n(x + r)} ${n(y)}H${n(x + w - r)}a${n(r)} ${n(r)} 0 0 1 ${n(r)} ${n(r)}V${n(y + h - r)}a${n(r)} ${n(r)} 0 0 1 ${n(-r)} ${n(r)}H${n(x + r)}a${n(r)} ${n(r)} 0 0 1 ${n(-r)} ${n(-r)}V${n(y + r)}a${n(r)} ${n(r)} 0 0 1 ${n(r)} ${n(-r)}Z`;
const poly = (pts, close = false) => `M${pts.map(([x, y]) => `${n(x)} ${n(y)}`).join('L')}${close ? 'Z' : ''}`;
const check = (cx, cy, k) => poly([[cx - 7 * k, cy], [cx - 2 * k, cy + 5 * k], [cx + 7 * k, cy - 6 * k]]);
const stage = (rx = 32, y = 99) => [{ l: 'ground', d: circle(60, 56, 46) }, { l: 'shadow', d: ellipse(60, y, rx, 5) }];
const star = (cx, cy, ro, ri, k) => poly(Array.from({ length: k * 2 }, (_, i) => { const a = -Math.PI / 2 + (i * Math.PI) / k; const r = i % 2 ? ri : ro; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; }), true);
const annulus = (cx, cy, R, r) => circle(cx, cy, R) + circle(cx, cy, r);
const bow = (dx) => { const x = (v) => n(v + dx); return `M${x(60)} 44C${x(52)} 26 ${x(36)} 30 ${x(42)} 40C${x(45)} 44 ${x(52)} 44 ${x(60)} 44ZM${x(60)} 44C${x(68)} 26 ${x(84)} 30 ${x(78)} 40C${x(75)} 44 ${x(68)} 44 ${x(60)} 44Z`; };

// l: ground | shadow | stone (piezas secundarias) | solid (tinta) | eo (tinta, agujero) | line (trazo de tinta) | knock (trazo calado)
//    knockFill (relleno calado) | soft (la ÚNICA pieza de color) | softEo (pieza de color con agujero)
const D = {
  // — comunes (misma geometría en las tres plantillas; solo cambia el acento) —
  gift: [...stage(),
    { l: 'solid', d: rect(30, 56, 60, 42, 8) }, { l: 'solid', d: rect(26, 44, 68, 14, 6) }, { l: 'knock', w: 2.5, d: 'M30 58H90' },
    { l: 'soft', d: rect(55, 44, 10, 54, 2) + bow(0) }, { l: 'line', w: 2.5, d: bow(0) }],
  envelope: [...stage(),
    { l: 'stone', d: rect(34, 24, 52, 40, 6) }, { l: 'line', w: 3, d: 'M44 36H76M44 46H66' },
    { l: 'solid', d: rect(24, 50, 72, 48, 8) }, { l: 'knock', w: 3, d: 'M28 56L60 78L92 56' },
    { l: 'knockFill', d: circle(60, 78, 12) }, { l: 'soft', d: circle(60, 78, 9) }, { l: 'line', w: 2.5, d: check(60, 78, 0.65) }],
  pin: [...stage(36),
    { l: 'stone', d: poly([[20, 56], [44, 48], [76, 58], [100, 50], [100, 90], [76, 98], [44, 88], [20, 96]], true) },
    { l: 'line', w: 2.5, d: 'M44 48V88M76 58V98' },
    { l: 'solid', d: 'M60 20C75 20 84 31 84 44C84 59 68 68 60 84C52 68 36 59 36 44C36 31 45 20 60 20Z' },
    { l: 'knockFill', d: circle(60, 44, 12) }, { l: 'soft', d: circle(60, 44, 8.5) }],
  hanger: [...stage(30),
    { l: 'line', w: 4, d: 'M60 36V30a6 6 0 1 0-6-6' },
    { l: 'solid', d: 'M60 36L98 60Q104 66 96 66H24Q16 66 22 60Z' },
    { l: 'solid', d: 'M36 66L30 98H90L84 66Z' },
    { l: 'knock', w: 3, d: poly([[50, 66], [60, 80], [70, 66]]) },
    { l: 'soft', d: rect(70, 80, 11, 9, 2.5) }],
  clock: [...stage(28),
    { l: 'solid', d: circle(60, 56, 32) },
    { l: 'knock', w: 4, d: 'M60 56V36M60 56L74 64' }, { l: 'knock', w: 3, d: 'M60 28V31M60 81V84M32 56H35M85 56H88' },
    { l: 'knockFill', d: circle(60, 56, 8.5) }, { l: 'soft', d: circle(60, 56, 5.5) }],
  question: [...stage(),
    { l: 'solid', d: rect(30, 26, 60, 66, 10) },
    { l: 'knock', w: 5, d: 'M49 52a11 11 0 1 1 15 10c-3 2-4 4-4 8' }, { l: 'knockFill', d: circle(60, 80, 3.6) },
    { l: 'soft', d: 'M72 20h14v26l-7-5.5-7 5.5Z' }],
  // — Clásico marfil —
  rings: [...stage(30),
    { l: 'eo', d: annulus(46, 66, 22, 14) },
    { l: 'softEo', d: annulus(74, 66, 22, 14) },
    { l: 'eoClip', d: annulus(46, 66, 22, 14) },
    { l: 'knockFill', d: circle(46, 40, 0.1) }],
  // — Piñata —
  pinata: [...stage(26),
    { l: 'line', w: 3, d: 'M60 4V14' },
    { l: 'solid', d: star(60, 56, 40, 25, 7) }, { l: 'solid', stroke: 7, d: star(60, 56, 38, 25, 7) },
    ...Array.from({ length: 7 }, (_, i) => { const a = -Math.PI / 2 + (i * 2 * Math.PI) / 7; return { l: 'knock', w: 3.2, d: `M${n(60 + 20 * Math.cos(a))} ${n(56 + 20 * Math.sin(a))}L${n(60 + 31 * Math.cos(a))} ${n(56 + 31 * Math.sin(a))}` }; }),
    { l: 'knockFill', d: circle(60, 56, 16) }, { l: 'soft', d: circle(60, 56, 11.5) }],
  cake: [...stage(34),
    { l: 'solid', d: rect(26, 66, 68, 32, 8) }, { l: 'solid', d: rect(38, 46, 44, 24, 7) },
    { l: 'knock', w: 3, d: 'M26 79q8.5 7 17 0t17 0 17 0 17 0' },
    { l: 'line', w: 3.5, d: 'M46 46V34M60 46V30M74 46V34' },
    { l: 'soft', d: 'M60 18C65 24 66 28 60 30C54 28 55 24 60 18Z' }],
  hat: [...stage(30),
    { l: 'solid', d: 'M60 22L90 90H30Z' }, { l: 'solid', d: ellipse(60, 91, 31, 6.5) },
    { l: 'knock', w: 3.2, d: 'M48 62L78 74M43 76L83 90' },
    { l: 'soft', d: circle(60, 20, 9) }],
  balloons: [...stage(26),
    { l: 'solid', d: ellipse(45, 46, 20, 25) }, { l: 'solid', d: poly([[41, 71], [49, 71], [45, 77]], true) },
    { l: 'soft', d: ellipse(76, 54, 18, 23) }, { l: 'soft', d: poly([[72.5, 76], [79.5, 76], [76, 81]], true) },
    { l: 'knock', w: 3, d: 'M36 36C38 31 42 29 46 29' },
    { l: 'line', w: 2.5, d: 'M45 77C47 86 55 90 60 96M76 81C74 88 66 91 60 96' }],
  // — Gala dorada —
  coupe: [...stage(26),
    { l: 'solid', d: 'M28 34H92C92 54 78 66 60 66C42 66 28 54 28 34Z' }, { l: 'solid', d: rect(56.5, 64, 7, 26, 2) }, { l: 'solid', d: ellipse(60, 92, 20, 4.5) },
    { l: 'soft', d: 'M33 42H87C84 54 74 60 60 60C46 60 36 54 33 42Z' },
  ],
  medal: [...stage(26),
    { l: 'soft', d: 'M44 62L38 98L52 90L60 100L60 62Z' + 'M76 62L82 98L68 90L60 100L60 62Z' },
    { l: 'knockFill', d: circle(60, 46, 29) }, { l: 'solid', d: circle(60, 46, 25) },
    { l: 'knockFill', d: star(60, 46, 15, 6.5, 5) }],
  badge: [...stage(30),
    { l: 'soft', d: 'M50 30L56 10H64L70 30Z' },
    { l: 'solid', d: rect(32, 30, 56, 68, 9) }, { l: 'knock', w: 3.5, d: 'M54 38H66' },
    { l: 'knockFill', d: rect(42, 50, 22, 22, 3) + rect(68, 50, 10, 10, 2) + rect(68, 64, 10, 8, 2) },
    { l: 'knock', w: 3, d: 'M42 82H78M42 90H66' }]
};
D.rings = [...stage(30),
  { l: 'eo', d: annulus(46, 64, 22, 14) },
  { l: 'softEo', d: annulus(74, 64, 22, 14) },
  { l: 'eoClip', d: annulus(46, 64, 22, 14) }];

let uid = 0;
/** `size` en px (CSS), `trace` activa el trazado (máscara que se desplaza con transform, nunca stroke-dashoffset). */
export function drawing(name, { cls = '' } = {}) {
  const id = `d${++uid}`;
  const shapes = D[name];
  if (!shapes) throw new Error('dibujo desconocido ' + name);
  const base = shapes.filter((s) => s.l === 'ground' || s.l === 'shadow');
  const fig = shapes.filter((s) => !(s.l === 'ground' || s.l === 'shadow'));
  const el = (s) => {
    if (s.l === 'eoClip') return `<path class="g-eo" clip-path="url(#${id}c)" d="${s.d}"/>`;
    const extra = (s.w ? ` stroke-width="${s.w}"` : '') + (s.stroke ? ` stroke-width="${s.stroke}"` : '');
    const stroke = s.stroke ? ' stroke-linejoin="round" style="stroke:var(--ink)"' : '';
    return `<path class="g-${s.l}"${extra}${stroke} d="${s.d}"/>`;
  };
  const clip = name === 'rings' ? `<clipPath id="${id}c"><rect x="50" y="76" width="22" height="20"/></clipPath>` : '';
  return `<svg class="dr ${cls}" viewBox="0 0 120 112" role="presentation" aria-hidden="true" focusable="false"><defs><mask id="${id}m" maskUnits="userSpaceOnUse" x="-10" y="-10" width="140" height="132"><rect class="wipe" x="-10" y="-10" width="140" height="132" fill="#fff"/></mask>${clip}</defs>${base.map(el).join('')}<g mask="url(#${id}m)">${fig.map(el).join('')}</g></svg>`;
}
export const DRAWINGS = Object.keys(D);
export const DRAWING_CSS = `
.dr{display:block;width:100%;height:auto;overflow:visible}
.dr .g-ground{fill:var(--stone)}.dr .g-shadow{fill:var(--shadow)}.dr .g-stone{fill:var(--stone2)}
.dr .g-solid{fill:var(--ink)}.dr .g-eo{fill:var(--ink);fill-rule:evenodd}
.dr .g-soft{fill:var(--fill)}.dr .g-softEo{fill:var(--fill);fill-rule:evenodd}
.dr .g-knockFill{fill:var(--knock)}
.dr .g-line,.dr .g-knock{fill:none;stroke-linecap:round;stroke-linejoin:round;stroke-width:3.5}
.dr .g-line{stroke:var(--ink)}.dr .g-knock{stroke:var(--knock)}
.dr .wipe{transform-box:fill-box;transform-origin:50% 100%}
`;
