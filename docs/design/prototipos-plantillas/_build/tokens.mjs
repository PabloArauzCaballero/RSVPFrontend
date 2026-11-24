// Tokens de las tres plantillas rediseñadas (claro y oscuro compuestos, no invertidos).
// Roles: canvas, surface, text, muted, accent, accentFill, onAccent, line  (+ derivados del dibujo: stone, stone2, shadow).
export const lum = (hex) => {
  const c = hex.replace('#', '').match(/../g).map((h) => parseInt(h, 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
export const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

export const TOKENS = {
  marfil: {
    name: 'Clásico marfil',
    light: { canvas: '#FBF7F0', surface: '#FFFEFA', text: '#2B2622', muted: '#665C52', accent: '#7A5230', accentFill: '#7A5230', onAccent: '#FFFDF8', line: '#8C7F6E', stone: '#F1E9DB', stone2: '#E2D6C2', shadow: '#E6DCCB' },
    dark: { canvas: '#16110D', surface: '#201912', text: '#EFE5D6', muted: '#B3A592', accent: '#DDAE7E', accentFill: '#C9966A', onAccent: '#1A120B', line: '#85755F', stone: '#241C15', stone2: '#3A2E22', shadow: '#2E241B' }
  },
  pinata: {
    name: 'Piñata',
    light: { canvas: '#FFF9EF', surface: '#FFFFFF', text: '#2E2012', muted: '#6B5640', accent: '#C2330F', accentFill: '#C2330F', onAccent: '#FFFFFF', line: '#8A7660', stone: '#F6EBDA', stone2: '#E8D8C0', shadow: '#EBDDC6' },
    dark: { canvas: '#1B1210', surface: '#271B18', text: '#F6E9DD', muted: '#C2AD9C', accent: '#FF9276', accentFill: '#FF7A59', onAccent: '#2B0F08', line: '#8C6F60', stone: '#2A1D19', stone2: '#43302A', shadow: '#33241F' }
  },
  gala: {
    name: 'Gala dorada',
    light: { canvas: '#F5F3EE', surface: '#FFFFFF', text: '#14130F', muted: '#55503F', accent: '#6E5200', accentFill: '#6E5200', onAccent: '#FFFFFF', line: '#8A8470', stone: '#E9E6DD', stone2: '#D6D1C3', shadow: '#DDD9CE' },
    dark: { canvas: '#0E1311', surface: '#161D1A', text: '#EDE8DB', muted: '#AEB3A5', accent: '#D8BA7C', accentFill: '#CDAE6C', onAccent: '#14110A', line: '#6F7769', stone: '#17201C', stone2: '#26322D', shadow: '#1E2824' }
  }
};

export function pairs(t) {
  return [
    ['Texto sobre canvas', t.text, t.canvas, 4.5], ['Texto sobre surface', t.text, t.surface, 4.5],
    ['Muted sobre canvas', t.muted, t.canvas, 4.5], ['Muted sobre surface', t.muted, t.surface, 4.5],
    ['Acento (texto, enlaces) sobre canvas', t.accent, t.canvas, 4.5], ['Acento sobre surface', t.accent, t.surface, 4.5],
    ['onAccent sobre accentFill (botón)', t.onAccent, t.accentFill, 4.5],
    ['accentFill sobre canvas (UI, foco)', t.accentFill, t.canvas, 3], ['accentFill sobre disco (pieza de color del dibujo)', t.accentFill, t.stone, 3],
    ['line sobre canvas (UI)', t.line, t.canvas, 3], ['line sobre surface (UI)', t.line, t.surface, 3],
    ['Tinta del dibujo (text) sobre disco', t.text, t.stone, 4.5]
  ].map(([n, fg, bg, min]) => ({ n, fg, bg, min, r: ratio(fg, bg) }));
}
if (process.argv[1] && process.argv[1].endsWith('tokens.mjs')) {
  for (const [k, v] of Object.entries(TOKENS)) for (const m of ['light', 'dark']) {
    console.log(`\n${k} ${m}`);
    for (const p of pairs(v[m])) console.log(`${p.r >= p.min ? 'OK ' : 'FAIL'} ${p.r.toFixed(2).padStart(5)} (>=${p.min}) ${p.n}`);
  }
}
