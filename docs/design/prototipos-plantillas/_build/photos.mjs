// Fotos de ejemplo (marcadores de posición ilustrados): no son fotos reales ni parte del diseño.
// Planas, sin degradados y sin matices amarillos; solo colores derivados de la paleta de cada plantilla (acento, tinta y neutros).
export const phTag = '<span class="ph-tag has-photo">Foto de ejemplo</span>';
const svg = (vb, label, inner) => `<svg class="ph" viewBox="${vb}" preserveAspectRatio="xMidYMid slice" role="img" aria-label="${label}">${inner}</svg>`;

export const photoMarfil = () => svg('0 0 300 400', 'Foto de ejemplo: montañas al atardecer', '<rect width="300" height="400" fill="#E2D6C2"/><circle cx="212" cy="196" r="34" fill="#FBF7F0"/><path d="M-10 300L84 150L128 206L172 120L230 220L262 190L330 300Z" fill="#8C7F6E"/><path d="M172 120L150 160L166 152L174 168L190 150Z" fill="#FBF7F0"/><path d="M84 150L66 182L80 176L90 190L102 172Z" fill="#FBF7F0"/><path d="M-10 318C60 280 120 300 180 292C230 285 280 300 330 280V410H-10Z" fill="#C9966A"/><path d="M-10 350C70 326 140 346 210 336C260 330 300 340 330 332V410H-10Z" fill="#7A5230"/><rect x="132" y="296" width="14" height="46" rx="6" fill="#2B2622"/><circle cx="139" cy="290" r="8" fill="#2B2622"/><path d="M158 342L164 300Q172 292 180 300L186 342Z" fill="#FBF7F0"/><circle cx="172" cy="292" r="8" fill="#2B2622"/>');
export const photoPinata = () => svg('0 0 300 300', 'Foto de ejemplo: globos en un patio', '<rect width="300" height="300" fill="#E8D8C0"/><path d="M-10 214C60 190 130 206 190 196C240 188 280 198 310 190V310H-10Z" fill="#8A7660"/><path d="M-10 250C80 232 150 250 230 240C270 236 292 240 310 238V310H-10Z" fill="#6B5640"/><g stroke="#2E2012" stroke-width="1.2" fill="none"><path d="M96 120L130 236M150 96L150 236M204 126L170 236"/></g><ellipse cx="96" cy="100" rx="24" ry="30" fill="#C2330F"/><ellipse cx="150" cy="76" rx="24" ry="30" fill="#FFFFFF"/><ellipse cx="204" cy="106" rx="24" ry="30" fill="#2E2012"/><ellipse cx="124" cy="64" rx="20" ry="26" fill="#FFB5A0"/><ellipse cx="176" cy="130" rx="18" ry="24" fill="#C2330F"/>');
export const photoGala = () => {
  const w = [];
  for (let x = 18; x < 300; x += 34) {
    const h = 90 + ((x * 37) % 120);
    w.push(`<rect x="${x}" y="${330 - h}" width="26" height="${h + 80}" fill="#0E1311"/>`);
    for (let y = 340 - h; y < 400; y += 16) if (((x + y) * 7) % 5 < 2) w.push(`<rect x="${x + 5}" y="${y}" width="5" height="7" fill="#ECE9E4" opacity=".8"/><rect x="${x + 15}" y="${y}" width="5" height="7" fill="#ECE9E4" opacity=".55"/>`);
  }
  return svg('0 0 300 400', 'Foto de ejemplo: horizonte de la ciudad al anochecer', `<rect width="300" height="400" fill="#26322D"/><circle cx="224" cy="96" r="34" fill="#7B2A3C"/>${w.join('')}<rect x="0" y="372" width="300" height="40" fill="#0E1311"/>`);
};

// Galería de ejemplo (6 teselas planas). Cada plantilla usa su paleta.
const PAL = {
  marfil: ['#E2D6C2', '#F1E9DB', '#8C7F6E', '#7A5230', '#FBF7F0', '#2B2622'],
  pinata: ['#F6EBDA', '#E8D8C0', '#C2330F', '#FFB5A0', '#6B5640', '#2E2012'],
  gala: ['#26322D', '#0E1311', '#ECE9E4', '#7B2A3C', '#6F7769', '#0E1311']
};
const scenes = [
  (c) => `<rect width="300" height="170" fill="${c[0]}"/><circle cx="210" cy="70" r="28" fill="${c[4]}"/><path d="M-10 170L70 70L120 120L180 50L260 140L310 110V180H-10Z" fill="${c[2]}"/><path d="M-10 150C80 130 160 150 310 128V180H-10Z" fill="${c[3]}"/>`,
  (c) => `<rect width="300" height="300" fill="${c[1]}"/><path d="M90 300V140A60 60 0 0 1 210 140V300Z" fill="${c[0]}"/><circle cx="150" cy="160" r="26" fill="${c[2]}"/>`,
  (c) => `<rect width="300" height="300" fill="${c[0]}"/><circle cx="120" cy="150" r="52" fill="${c[2]}"/><circle cx="180" cy="150" r="52" fill="${c[3]}" opacity=".9"/>`,
  (c) => `<rect width="300" height="300" fill="${c[4]}"/><path d="M0 220C60 180 120 240 180 200C230 170 270 200 300 180V300H0Z" fill="${c[2]}"/><rect x="120" y="90" width="60" height="110" rx="6" fill="${c[3]}"/>`,
  (c) => `<rect width="300" height="300" fill="${c[3]}"/><circle cx="150" cy="130" r="64" fill="${c[1]}"/><rect x="60" y="230" width="180" height="30" rx="6" fill="${c[4]}"/>`,
  (c) => `<rect width="300" height="170" fill="${c[1]}"/><path d="M0 120L50 70L100 120L150 60L200 120L250 80L300 120V170H0Z" fill="${c[2]}"/><rect y="140" width="300" height="30" fill="${c[5]}"/>`
];
export const galleryTiles = (key, errIndex = 3, errHtml = '') => scenes.map((sc, i) => `<li class="rv${i === errIndex ? ' err-tile' : ''}" style="--d:${i * 40}ms">${svg(i === 0 || i === 5 ? '0 0 300 170' : '0 0 300 300', `Foto de ejemplo ${i + 1} de ${scenes.length}`, sc(PAL[key]))}${i === errIndex ? errHtml : ''}</li>`).join('');
