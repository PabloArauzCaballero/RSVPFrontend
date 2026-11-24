import { page, ico } from './shared.mjs';
import { drawing } from './drawings.mjs';
import { photoGala } from './photos.mjs';

const SLUG = 'altiplano-25';
let n = 0;
// Ornamento: trazo de 1 px, uniones en ángulo y chaflán a 45°. Separador deco: doble línea y rombo.
const sep = () => { const id = `gs${++n}`; return `<svg class="orn sep" viewBox="0 0 320 28" role="presentation" aria-hidden="true"><defs><mask id="${id}" maskUnits="userSpaceOnUse" x="0" y="-2" width="320" height="32"><rect class="wipe" x="0" y="-2" width="320" height="32"/></mask></defs><g mask="url(#${id})"><path d="M0 11H128L138 14L128 17H0M320 11H192L182 14L192 17H320"/><path class="acc" d="M160 1L173 14L160 27L147 14Z"/><path class="acc" d="M160 8L167 14L160 20L153 14Z"/></g></svg>`; };
const corner = (c) => `<svg class="corner ${c} orn" viewBox="0 0 48 48" role="presentation" aria-hidden="true"><path d="M1 46V14L14 1H46"/><path d="M9 46V18L18 9H46"/></svg>`;
const fan = (side) => { const cx = side === 'l' ? 100 : 0; let d = ''; for (let a = 0; a <= 90; a += 7.5) { const r = a * Math.PI / 180; const x = side === 'l' ? cx - 200 * Math.sin(r) : cx + 200 * Math.sin(r); const y = 200 - 200 * Math.cos(r); d += `M${cx} 200L${x.toFixed(1)} ${y.toFixed(1)}`; } let arcs = ''; for (const r of [40, 80, 120, 160]) arcs += side === 'l' ? `M${100 - r} 200A${r} ${r} 0 0 1 100 ${200 - r}` : `M${r} 200A${r} ${r} 0 0 0 0 ${200 - r}`; return `<svg viewBox="0 0 100 200" preserveAspectRatio="xMidYMax slice" aria-hidden="true"><g fill="none" stroke="var(--line)" stroke-width="1" vector-effect="non-scaling-stroke"><path d="${d}"/><path d="${arcs}"/></g></svg>`; };
const chev = '<svg class="ic pm" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" stroke-linejoin="miter" stroke-linecap="butt"/></svg>';

const css = `
:root{--disp:'Bodoni Moda','Didot',Georgia,serif;--sans:'Jost','Futura',system-ui,sans-serif}
body{font:400 15.5px/1.62 var(--sans)}
@media (min-width:900px){body{font-size:16px}}
h1,h2,h3{font-family:var(--disp);font-weight:500;letter-spacing:-.005em;margin:0;text-wrap:balance}
p{max-width:50ch;text-wrap:pretty}
.muted{color:var(--muted)}
.btn{border-radius:0;font-family:var(--sans);font-weight:500;letter-spacing:.01em}
.orn *{stroke-width:1;stroke-linejoin:miter;stroke-linecap:butt}
.top{position:sticky;top:0;z-index:40;display:flex;align-items:center;justify-content:space-between;gap:16px;padding:8px 22px;min-height:62px;background:var(--canvas);border-bottom:1px solid var(--line)}
.mark{font:500 24px/1 var(--disp);text-decoration:none;color:var(--text);display:flex;align-items:baseline;gap:8px;min-height:44px;align-items:center}
.mark b{color:var(--accent);font-weight:500}
.mark small{font:400 14px var(--sans);color:var(--muted)}
.top .date{font-size:13.5px;color:var(--muted);font-variant-numeric:tabular-nums}
.idx{display:none}
/* portada */
.cover{position:relative;display:grid;justify-items:center;gap:26px;padding:46px 30px 64px;overflow:hidden;min-height:calc(100svh - 150px)}
.corner{position:absolute;width:46px;height:46px;z-index:1}
.corner{inset:auto}.c-tl{top:14px;left:14px}.c-tr{top:14px;right:14px;transform:scaleX(-1)}.c-bl{bottom:14px;left:14px;transform:scaleY(-1)}.c-br{bottom:14px;right:14px;transform:scale(-1,-1)}
.facts.l{order:3}.facts.r{order:4}.hero{order:1}.title{order:2}
.hero{display:grid;justify-items:center;gap:18px;width:100%}
.hero .dr{width:150px}
html[data-photo="1"] .hero .dr{display:none}
.photo{position:relative;width:min(72vw,280px);aspect-ratio:4/5;margin:6px 10px 12px 0}
.photo .in{position:absolute;inset:0;overflow:hidden;background:var(--stone2);clip-path:polygon(28px 0,100% 0,100% calc(100% - 28px),calc(100% - 28px) 100%,0 100%,0 28px)}
.photo .in .ph-wrap{position:absolute;inset:-6% 0;will-change:transform}
.photo::before{content:"";position:absolute;inset:0;transform:translate(12px,12px);border:1px solid var(--accent);clip-path:polygon(28px 0,100% 0,100% calc(100% - 28px),calc(100% - 28px) 100%,0 100%,0 28px);z-index:-1}
.title{display:grid;justify-items:center;gap:4px;text-align:center}
.title .n{font:500 clamp(118px,36vw,150px)/.8 var(--disp);letter-spacing:-.04em;color:var(--text);font-variant-numeric:lining-nums}
.title .y{font:500 27px/1.15 var(--disp);color:var(--text)}
.title .g{font:500 17px/1.3 var(--sans);color:var(--accent);margin-top:8px}
.facts{display:grid;gap:3px;justify-items:center;text-align:center}
.when{font:500 21px/1.3 var(--disp)}
.where{color:var(--muted);font-size:15.5px}
.count{font-size:14px;color:var(--muted);margin-top:6px;font-variant-numeric:tabular-nums}
.doors{position:absolute;inset:0;z-index:5;pointer-events:none;display:none}
.door{position:absolute;top:0;bottom:0;width:50.5%;background:var(--surface);overflow:hidden}
.door svg{position:absolute;inset:0;width:100%;height:100%}
.door.l{left:0;border-right:1.5px solid var(--accent);transform:translateX(-102%)}
.door.r{right:0;border-left:1.5px solid var(--accent);transform:translateX(102%)}
/* secciones */
.sec{padding:20px 20px 64px;max-width:720px;margin:0 auto}
.sec>h2{font-size:38px;line-height:1.05;text-align:center;margin:0 0 20px}
.sep{display:block;width:min(300px,80%);height:28px;margin:0 auto 22px}
.sec .body{display:grid;gap:0}
.lead{font-size:16.5px;line-height:1.6}
.sec p+p{margin-top:14px}
.prog{list-style:none;margin:6px 0 0;padding:0}
.prog li{display:grid;grid-template-columns:74px 1fr 56px;column-gap:14px;align-items:center;padding:16px 0;border-top:1px solid var(--line);min-height:74px}
.prog li:last-child{border-bottom:1px solid var(--line)}
.prog time{font:500 30px/1 var(--disp);color:var(--accent);font-variant-numeric:tabular-nums lining-nums}
.prog strong{display:block;font-weight:500;font-size:17px}
.prog span{display:block;color:var(--muted);font-size:15px;line-height:1.4}
.prog .dr{width:56px}
.mile{display:grid;margin:22px 0 0}
.mile div{display:grid;grid-template-columns:74px 1fr;column-gap:14px;padding:12px 0;border-top:1px solid var(--line);align-items:baseline}
.mile div:last-child{border-bottom:1px solid var(--line)}
.mile dt{font:500 24px/1 var(--disp);color:var(--accent);font-variant-numeric:lining-nums}
.mile dd{margin:0;font-size:15.5px}
.venue{display:grid;gap:8px;justify-items:start}
.venue .dr{width:92px}
.venue h3{font-size:31px;line-height:1.1}
.venue address{font-style:normal;color:var(--muted);font-size:15.5px}
.venue .btn{margin-top:10px}
.etq{display:grid;gap:12px;justify-items:start}
.etq .dr{width:96px}
.sw{list-style:none;padding:0;margin:20px 0 0;display:flex;flex-wrap:wrap;gap:12px 14px}
.sw li{display:grid;justify-items:center;gap:7px;width:68px;text-align:center;font-size:13px;line-height:1.25;color:var(--muted)}
.sw i{width:44px;height:44px;background:var(--c);clip-path:polygon(9px 0,100% 0,100% calc(100% - 9px),calc(100% - 9px) 100%,0 100%,0 9px);box-shadow:none;outline:1px solid var(--line);outline-offset:-1px}
details{border-top:1px solid var(--line)}
details:last-of-type{border-bottom:1px solid var(--line)}
summary{list-style:none;display:flex;align-items:center;justify-content:space-between;gap:14px;min-height:62px;padding:10px 0;cursor:pointer;font:500 20px/1.25 var(--disp)}
summary::-webkit-details-marker{display:none}
summary .pm{transition:transform .3s cubic-bezier(.16,1,.3,1);color:var(--accent)}
details[open] summary .pm{transform:rotate(180deg)}
details p{padding:0 0 18px;color:var(--muted);font-size:15px;max-width:50ch}
.rec{list-style:none;margin:0;padding:0}
.rec li{display:grid;gap:3px;padding:20px 0;border-top:1px solid var(--line)}
.rec li:last-child{border-bottom:1px solid var(--line)}
.rec h3{font-size:25px}
.rec .meta{color:var(--muted);font-size:15px}
.rec a{display:inline-flex;align-items:center;gap:8px;min-height:44px;font-weight:500;color:var(--accent);text-underline-offset:4px}
.gifts,.rsvp{display:grid;gap:18px;justify-items:start}
.gifts .dr{width:120px}.rsvp .dr{width:110px}
.gifts .btn,.rsvp .btn{min-height:54px;padding:0 28px;font-size:16.5px}
.rsvp .alt{font-size:15px;color:var(--muted)}
.rsvp .alt a{display:inline-flex;align-items:center;min-height:44px}
footer{padding:44px 22px 40px;border-top:1px solid var(--line);display:grid;gap:14px;justify-items:center;text-align:center}
footer ul{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;justify-content:center}
footer li a{display:inline-flex;align-items:center;min-height:44px;padding:0 10px;color:var(--text);font-size:15px}
footer small{font-size:13px;color:var(--muted)}
footer small a{color:var(--muted);display:inline-flex;align-items:center;min-height:44px;padding:0 4px}
/* firma: las puertas deco se abren y revelan la portada */
@media (prefers-reduced-motion:no-preference){
 html.anim .doors{display:block}
 html.anim .door.l{animation:openL 1.7s cubic-bezier(.77,0,.18,1) .5s both}
 html.anim .door.r{animation:openR 1.7s cubic-bezier(.77,0,.18,1) .5s both}
 html.anim .doors .door{transform:none}
 html.anim .hero,html.anim .title,html.anim .facts{animation:settle 1.2s cubic-bezier(.16,1,.3,1) 1.3s both}
 html.anim .title{animation-delay:1.45s}html.anim .facts{animation-delay:1.6s}
 html.anim .corner{animation:fadeIn .9s ease 1.9s both}
}
@keyframes openL{from{transform:none}to{transform:translateX(-102%)}}
@keyframes openR{from{transform:none}to{transform:translateX(102%)}}
@keyframes settle{from{opacity:0;transform:translateY(10px) scale(.97)}to{opacity:1;transform:none}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
/* escritorio: eje de simetría con tres columnas (P9) */
@media (min-width:900px){
 .top{padding:0 56px;min-height:72px}
 .top .date{display:none}
 .idx{display:flex;gap:2px;margin:0 auto}
 .idx a{display:inline-flex;align-items:center;min-height:44px;padding:0 12px;color:var(--text);text-decoration:none;font-size:15px}
 .idx a:hover{color:var(--accent)}
 .cover{grid-template-columns:1fr minmax(0,440px) 1fr;align-items:center;column-gap:56px;padding:72px 96px 88px;max-width:1280px;margin:0 auto;min-height:calc(100svh - 72px);justify-items:stretch}
 .corner{width:64px;height:64px}.c-tl{top:24px;left:40px}.c-tr{top:24px;right:40px}.c-bl{bottom:24px;left:40px}.c-br{bottom:24px;right:40px}
 .hero{grid-column:2;grid-row:1;gap:24px}
 .cover{grid-template-rows:auto auto}
 .hero .dr{width:190px}
 .photo{width:min(100%,300px);margin:0 12px 12px 0}
 .title{grid-column:2;grid-row:2}
 .title .n{font-size:176px}.title .y{font-size:34px}
 .facts{grid-row:1/3;align-self:center}
 .facts.l{grid-column:1;justify-items:end;text-align:right}
 .facts.r{grid-column:3;justify-items:start;text-align:left}
 .when{font-size:30px}.where{font-size:17px}
 .sec{max-width:980px;padding:40px 48px 104px}
 .sec>h2{font-size:56px;margin-bottom:28px}
 .sep{width:360px;margin-bottom:36px}
 .sec .body{max-width:680px;margin:0 auto}
 .sec .wide{max-width:900px}
 .lead{font-size:20px}
 .prog li{grid-template-columns:130px 1fr 80px;padding:20px 0}.prog time{font-size:38px}.prog strong{font-size:19px}.prog .dr{width:80px}
 .mile div{grid-template-columns:110px 1fr}.mile dt{font-size:32px}
 .venue .dr{width:120px}.venue h3{font-size:40px}
 .etq{grid-template-columns:130px 1fr;column-gap:28px;align-items:start}.etq .dr{width:130px;grid-row:1/4}
 .sw li{width:84px}.sw i{width:56px;height:56px}
 summary{font-size:23px}
 .gifts,.rsvp{grid-template-columns:150px 1fr;column-gap:36px;align-items:center}
 .gifts .dr,.rsvp .dr{grid-row:1/4;width:150px}
 footer{padding:56px}
}
`;
const nav = [['historia', 'Historia'], ['programa', 'Programa'], ['sede', 'Sede'], ['etiqueta', 'Etiqueta'], ['preguntas', 'Preguntas'], ['regalos', 'Regalos']];
const swatches = [['#12161B', 'Negro'], ['#1B2A41', 'Azul noche'], ['#5B1F2B', 'Burdeos'], ['#1F4A3A', 'Verde botella']];
const faq = [
  ['¿Puedo llevar acompañante?', 'Tu invitación incluye un acompañante personal. Indícalo al confirmar para registrar su nombre en la acreditación.'],
  ['¿Cómo ingreso al salón?', 'Con el código QR de tu confirmación. Lo escaneamos en la acreditación, desde las 19:30.'],
  ['¿Hay estacionamiento?', 'Sí, servicio de valet sin costo. El ingreso es por la calle 3, junto al lobby.'],
  ['¿Habrá menú especial?', 'Hay opciones vegetariana y sin gluten. Indícalo al confirmar, a más tardar el 19 de febrero.']
];
const body = `
<a class="skip" href="#main">Saltar al contenido</a>
<header class="top"><a class="mark" href="#inicio" aria-label="Grupo Altiplano, 25 años, inicio"><b>25</b><small>Grupo Altiplano</small></a><span class="date">05 · 03 · 2027</span>
 <nav class="idx" aria-label="Secciones">${nav.map(([h, t]) => `<a href="#${h}">${t}</a>`).join('')}</nav>
 <div class="cta"><a class="btn btn-alt" href="/c/${SLUG}/regalos">${ico.gift}Ver regalos</a><a class="btn btn-main" href="#confirmar">${ico.check}Confirmar asistencia</a></div>
</header>
<main id="main">
<section class="cover" id="inicio" aria-labelledby="t">
 ${corner('c-tl')}${corner('c-tr')}${corner('c-bl')}${corner('c-br')}
 <div class="facts l"><p class="when">Viernes<br>5 de marzo de 2027</p><p class="where">Cena de gala · 20:00</p></div>
 <div class="hero">
  <div class="no-photo">${drawing('coupe')}</div>
  <div class="photo has-photo"><div class="in"><div class="ph-wrap" data-par="-0.05">${photoGala()}</div></div></div>
 </div>
 <h1 class="title" id="t"><span class="n">25</span><span class="y">años de Grupo Altiplano</span><span class="g">Una noche para celebrarlos juntos</span></h1>
 <div class="facts r"><p class="when">Salón Cumbre</p><p class="where">Hotel Cruz del Este · Equipetrol<br>Santa Cruz de la Sierra</p><p class="count" data-count="2027-03-05T20:00:00-04:00">Faltan 101 días</p></div>
 <div class="doors" aria-hidden="true"><div class="door l">${fan('l')}</div><div class="door r">${fan('r')}</div></div>
</section>

<section class="sec" id="historia" aria-labelledby="h-historia">${sep()}
 <h2 id="h-historia">Veinticinco años</h2>
 <div class="body"><p class="lead rv">En 2002 abrimos una oficina de dos escritorios en la calle Sucre, en La Paz. Hoy somos 480 personas en cinco ciudades.</p>
 <p class="rv" style="--d:70ms">Esta noche celebramos a quienes lo hicieron posible: clientes, aliados y el equipo que sostiene cada entrega.</p>
 <dl class="mile rv" style="--d:110ms"><div><dt>2002</dt><dd>Primera oficina en La Paz</dd></div><div><dt>2009</dt><dd>Apertura en Santa Cruz de la Sierra</dd></div><div><dt>2016</dt><dd>Centro logístico en El Alto</dd></div><div><dt>2021</dt><dd>Operación en cinco ciudades</dd></div></dl></div>
</section>

<section class="sec" id="programa" aria-labelledby="h-programa">${sep()}
 <h2 id="h-programa">Programa</h2>
 <div class="body wide"><ol class="prog">
  <li class="rv"><time datetime="19:30">19:30</time><div><strong>Acreditación y cóctel de bienvenida</strong><span>Presenta tu código QR en el lobby.</span></div><span></span></li>
  <li class="rv" style="--d:50ms"><time datetime="20:30">20:30</time><div><strong>Palabras del directorio</strong><span>En el salón principal.</span></div><span></span></li>
  <li class="rv" style="--d:100ms"><time datetime="21:00">21:00</time><div><strong>Cena de tres tiempos</strong><span>Maridaje con vinos de Tarija.</span></div><span></span></li>
  <li class="rv" style="--d:150ms"><time datetime="22:30">22:30</time><div><strong>Reconocimientos a la trayectoria</strong><span>Equipo fundador y aliados históricos.</span></div>${drawing('medal')}</li>
  <li class="rv" style="--d:200ms"><time datetime="23:15">23:15</time><div><strong>Música en vivo y pista</strong><span>Hasta la 1:00.</span></div><span></span></li>
 </ol></div>
</section>

<section class="sec" id="sede" aria-labelledby="h-sede">${sep()}
 <h2 id="h-sede">Sede</h2>
 <div class="body"><article class="venue rv">${drawing('pin')}<h3>Salón Cumbre, Hotel Cruz del Este</h3><address>Av. San Martín, Equipetrol · Santa Cruz de la Sierra</address><p>Valet sin costo, con ingreso por la calle 3. Si vienes en taxi, pide que te deje frente al lobby.</p><a class="btn btn-alt" href="https://www.google.com/maps/search/?api=1&amp;query=Equipetrol+Santa+Cruz+de+la+Sierra" rel="noopener">${ico.route}Cómo llegar</a></article></div>
</section>

<section class="sec" id="etiqueta" aria-labelledby="h-etiqueta">${sep()}
 <h2 id="h-etiqueta">Etiqueta</h2>
 <div class="body"><div class="etq">${drawing('hanger')}<p class="lead rv">Etiqueta rigurosa: traje oscuro y corbata, o vestido largo.</p><p class="rv" style="--d:60ms">Santa Cruz es cálido incluso de noche; elige telas ligeras. Estos tonos lucen bien en el salón.</p><ul class="sw rv" style="--d:100ms;grid-column:1/-1">${swatches.map(([c, nm]) => `<li><i style="--c:${c}"></i>${nm}</li>`).join('')}</ul></div></div>
</section>

<section class="sec" id="preguntas" aria-labelledby="h-preguntas">${sep()}
 <h2 id="h-preguntas">Preguntas</h2>
 <div class="body">${faq.map(([q, a], i) => `<details class="rv"${i === 0 ? ' open' : ''} style="--d:${i * 50}ms"><summary>${q}${chev}</summary><p>${a}</p></details>`).join('')}</div>
</section>

<section class="sec" id="recomendaciones" aria-labelledby="h-rec">${sep()}
 <h2 id="h-rec">Recomendados</h2>
 <div class="body"><ul class="rec">
  <li class="rv"><h3>Hotel Plaza Norte</h3><span class="meta">Hospedaje · tarifa corporativa desde Bs 520 por noche</span><a href="/r/lst_e5b013" rel="sponsored noopener">Ver hospedaje${ico.arrow}</a></li>
  <li class="rv" style="--d:70ms"><h3>Traslados Ejecutivos Viru Viru</h3><span class="meta">Transporte · aeropuerto, hotel y salón, con chofer</span><a href="/r/lst_36f8d4" rel="sponsored noopener">Ver transporte${ico.arrow}</a></li>
 </ul><small class="muted" style="display:block;margin-top:12px;font-size:13px">Los enlaces pasan por DOne, que puede recibir una comisión del proveedor.</small></div>
</section>

<section class="sec" id="regalos" aria-labelledby="h-regalos">${sep()}
 <h2 id="h-regalos">Regalos</h2>
 <div class="body gifts">${drawing('gift')}<p class="lead rv">Si quieres obsequiar algo por los 25 años, dejamos una lista con aportes a la Fundación Altiplano y detalles para el equipo.</p><a class="btn btn-main" href="/c/${SLUG}/regalos">${ico.gift}Ver regalos</a></div>
</section>

<section class="sec" id="confirmar" aria-labelledby="h-conf">${sep()}
 <h2 id="h-conf">Confirma tu asistencia</h2>
 <div class="body rsvp">${drawing('badge')}<p class="lead rv">Los cupos son limitados. Responde antes del 19 de febrero y recibirás tu código de acceso.</p><a class="btn btn-main" href="/c/${SLUG}/rsvp">${ico.check}Confirmar asistencia</a><p class="alt">¿No encuentras tu enlace personal? <a href="/c/${SLUG}/enlace">Recupéralo aquí</a></p></div>
</section>
</main>
<footer><ul aria-label="Índice">${nav.map(([h, t]) => `<li><a href="#${h}">${t}</a></li>`).join('')}</ul><small>Hecho con DOne. <a href="/c/${SLUG}/denunciar">Denunciar esta página</a></small></footer>
<div class="bar" role="region" aria-label="Acciones principales"><a class="btn btn-alt" href="/c/${SLUG}/regalos">${ico.gift}Ver regalos</a><a class="btn btn-main" href="#confirmar">${ico.check}Confirmar asistencia</a></div>
`;
export default page({
  name: 'gala', title: 'Prototipo · Gala dorada · DOne',
  fonts: 'family=Bodoni+Moda:opsz,wght@6..96,500;6..96,600&family=Jost:wght@400;500',
  css, body
});
