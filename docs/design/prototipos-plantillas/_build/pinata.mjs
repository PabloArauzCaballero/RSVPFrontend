import { page, ico, ctaHtml, barHtml, rsvpBtn, giftBtn, giftCopy, rsvpCopy, photoErr } from './shared.mjs';
import { drawing } from './drawings.mjs';
import { photoPinata, phTag, galleryTiles } from './photos.mjs';

const SLUG = 'sofi-cumple-6';
let sid = 0;
// Ornamento (construcción Cuotea): figuras rellenas, sin contornos. Festón = franja de semicírculos; banderines = triángulos de tinta sobre un cordel.
const scallop = () => { const id = `sc${++sid}`; return `<svg class="orn fest" width="100%" height="14" role="presentation" aria-hidden="true"><defs><pattern id="${id}" patternUnits="userSpaceOnUse" width="20" height="14"><path d="M0 0H20V2Q15 14 10 14T0 2Z"/></pattern></defs><rect width="100%" height="14" style="fill:url(#${id})"/></svg>`; };
const pennants = (() => { const n = 11; let s = ''; for (let i = 0; i < n; i++) { const x = 20 + i * (360 / (n - 1)); const t = (x - 200) / 180; const y = 14 + 30 * (1 - t * t); const acc = i % 3 === 1; s += `<path class="pen${acc ? ' acc' : ''}" style="--i:${i}" d="M${(x - 11).toFixed(1)} ${(y - 2).toFixed(1)}L${(x + 11).toFixed(1)} ${(y - 2).toFixed(1)}L${x.toFixed(1)} ${(y + 26).toFixed(1)}Z"/>`; } return `<svg class="orn bunt" viewBox="0 0 400 64" preserveAspectRatio="none" role="presentation" aria-hidden="true"><path class="cord" d="M-4 12Q200 74 404 12"/>${s}</svg>`; })();

const css = `
:root{--disp:'Fredoka',system-ui,sans-serif;--sans:'Figtree',system-ui,sans-serif;--r:14px}
body{font:400 15.5px/1.6 var(--sans)}
@media (min-width:900px){body{font-size:16px}}
h1,h2,h3{font-family:var(--disp);font-weight:600;letter-spacing:-.025em;margin:0;text-wrap:balance}
p{max-width:50ch;text-wrap:pretty}
.muted{color:var(--muted)}
.btn{border-radius:14px;font-family:var(--sans)}
.orn *{stroke-linecap:round;stroke-linejoin:round}
.fest path,.fest rect{stroke:none}
.top{position:sticky;top:0;z-index:40;display:flex;align-items:center;justify-content:space-between;gap:16px;padding:8px 20px;min-height:60px;background:var(--canvas)}
.mark{font:700 22px/1 var(--disp);letter-spacing:-.03em;text-decoration:none;color:var(--text);display:flex;align-items:center;min-height:44px}
.mark b{color:var(--accent);font-weight:700}
.top .date{font-size:13.5px;color:var(--muted);font-weight:500}
.idx{display:none}
.bunt-wrap{overflow:hidden}
.bunt{display:block;width:100%;height:44px;overflow:visible}
.bunt .cord{fill:none;stroke:var(--line);stroke-width:2.25;vector-effect:non-scaling-stroke}
.bunt .pen{fill:var(--ink);stroke:none;transform-box:fill-box;transform-origin:50% 0}
.bunt .pen.acc{fill:var(--fill)}
.fest path{fill:var(--stone2)}
.cover{position:relative;display:grid;gap:22px;padding:0 20px 56px;overflow:hidden}
.hang{display:grid;justify-items:center;margin-top:-4px;transform-origin:50% 0;--pw:168px}
html[data-photo="1"] .hang{--pw:112px}
.hang::before{content:"";width:2.25px;height:52px;background:var(--line);border-radius:2px}
.hang .dr{width:var(--pw)}
.cover h1{font-size:clamp(46px,18vw,82px);line-height:.92;letter-spacing:-.03em;margin-top:6px;overflow-wrap:anywhere;hyphens:auto;min-width:0}
.cover h1 span{display:block}
.cover h1 em{font-style:normal;color:var(--accent)}
.facts{display:grid;gap:4px;margin-top:6px}
.when{font:600 22px/1.25 var(--disp);letter-spacing:-.015em}
.where{color:var(--muted);font-size:16px}
.count{font-size:14.5px;color:var(--muted);margin-top:8px}
.disc{position:relative;width:min(74vw,270px);aspect-ratio:1;margin:14px auto 24px;display:none}
html[data-photo="1"] .disc{display:block}
.disc .in{position:absolute;inset:0;border-radius:50%;overflow:hidden;background:var(--disc)}
.disc .in .ph-wrap{position:absolute;inset:-6% 0;will-change:transform}
.disc::after{content:"";position:absolute;left:12%;right:12%;bottom:-20px;height:12px;border-radius:50%;background:var(--shadow);z-index:-1}
.disc .ph-tag{z-index:3;left:50%;bottom:20%;translate:-50% 0}
/* secciones */
.sec{padding:28px 20px 56px;max-width:720px;margin:0 auto}
.fest{display:block;width:100%;height:14px;margin:0 0 26px;overflow:hidden}
.sec>h2{font-size:40px;line-height:1;margin:0 0 20px}
.lead{font-size:16px;line-height:1.55}
.sec p+p{margin-top:14px}
/* itinerario: filas con línea de puntos, no tarjetas */
.stops{list-style:none;margin:6px 0 0;padding:0}
.stops li{display:grid;grid-template-columns:86px 1fr 60px;column-gap:14px;align-items:center;padding:16px 0;border-top:2.25px dotted var(--line);min-height:76px}
.stops li:last-child{border-bottom:2.25px dotted var(--line)}
.stops time{font:700 27px/1 var(--disp);letter-spacing:-.03em;color:var(--accent);font-variant-numeric:tabular-nums}
.stops strong{display:block;font-weight:600;font-size:17px;line-height:1.25}
.stops span{display:block;color:var(--muted);font-size:15px;line-height:1.4;margin-top:2px}
.stops .dr{width:60px}
.venue{display:grid;gap:4px;justify-items:start}
.venue .dr{width:92px;margin-bottom:6px}
.venue h3{font-size:29px;line-height:1.05;margin-bottom:4px}
.venue address{font-style:normal;color:var(--muted);font-size:15.5px}
.venue .tip{margin-top:10px;font-size:15.5px}
.venue .btn{margin-top:14px;justify-self:start}
.sw{list-style:none;padding:0;margin:20px 0 0;display:flex;flex-wrap:wrap;gap:12px 14px}
.sw li{display:grid;justify-items:center;gap:7px;width:68px;text-align:center;font-size:13px;line-height:1.25;color:var(--muted)}
.sw i{width:44px;height:44px;border-radius:50%;background:var(--c);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--text) 22%,transparent)}
details{border-top:2.25px dotted var(--line)}
details:last-of-type{border-bottom:2.25px dotted var(--line)}
summary{list-style:none;display:flex;align-items:center;justify-content:space-between;gap:14px;min-height:62px;padding:10px 0;cursor:pointer;font:600 19px/1.25 var(--disp);letter-spacing:-.015em}
summary::-webkit-details-marker{display:none}
summary .pm{transition:transform .3s cubic-bezier(.16,1,.3,1);color:var(--accent);width:26px;height:26px;stroke-width:2.25}
details[open] summary .pm{transform:rotate(45deg)}
details p{padding:0 0 18px;color:var(--muted);font-size:15px;max-width:54ch}
.rec{list-style:none;margin:0;padding:0}
.rec li{display:grid;gap:3px;padding:18px 0;border-top:2.25px dotted var(--line)}
.rec li:last-child{border-bottom:2.25px dotted var(--line)}
.rec h3{font-size:23px}
.rec .meta{color:var(--muted);font-size:15px}
.rec a{display:inline-flex;align-items:center;gap:8px;min-height:44px;font-weight:600;color:var(--accent);text-underline-offset:4px}
.gifts{display:grid;row-gap:16px;justify-items:start}
.gifts .dr{width:112px}
.gal li{border-radius:14px}
.gifts .btn{min-height:54px;padding:0 26px;font-size:16.5px}
.rsvp{display:grid;row-gap:14px;justify-items:start}
.rsvp .dr{width:104px}
.rsvp .btn{min-height:54px;padding:0 26px;font-size:16.5px}
footer{padding:40px 20px;display:grid;gap:14px;border-top:2.25px dotted var(--line)}
footer ul{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:0 4px}
footer li a{display:inline-flex;align-items:center;min-height:44px;padding:0 8px 0 0;color:var(--text);font-size:15px}
footer small{font-size:13px;color:var(--muted)}
footer small a{color:var(--muted);display:inline-flex;align-items:center;min-height:44px;padding:0 4px}
/* firma: la piñata se mece UNA vez; los banderines se despliegan en cascada */
@media (prefers-reduced-motion:no-preference){
 html.anim .hang{animation:swing 3.2s cubic-bezier(.3,.1,.3,1) .2s both}
 html.anim .bunt .pen{animation:unfurl .55s cubic-bezier(.34,1.4,.5,1) calc(var(--i) * 70ms + 100ms) both}
 html.anim .cover h1 span,html.anim .facts>*{animation:fadeUp .8s cubic-bezier(.16,1,.3,1) both}
 html.anim .cover h1 span:nth-child(1){animation-delay:.5s}html.anim .cover h1 span:nth-child(2){animation-delay:.6s}
 html.anim .facts>*:nth-child(1){animation-delay:.75s}html.anim .facts>*:nth-child(2){animation-delay:.82s}html.anim .facts>*:nth-child(3){animation-delay:.9s}
 html.anim .disc{animation:fadeUp .9s cubic-bezier(.16,1,.3,1) .85s both}
}
@keyframes swing{0%{transform:translateY(-70px) rotate(0)}22%{transform:translateY(0) rotate(15deg)}44%{transform:rotate(-10deg)}62%{transform:rotate(6deg)}80%{transform:rotate(-3deg)}100%{transform:rotate(0)}}
@keyframes unfurl{from{opacity:0;transform:scaleY(.1) rotate(-12deg)}to{opacity:1;transform:none}}
@keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
@media (min-width:1200px){.idx{display:flex;gap:2px;margin-left:auto}.idx a{display:inline-flex;align-items:center;min-height:44px;padding:0 10px;color:var(--text);text-decoration:none;font-size:15px;font-weight:500}.idx a:hover{color:var(--accent)}}
@media (prefers-reduced-motion:no-preference){html.anim .fest{opacity:0;transform:scaleX(.6);transform-origin:0 50%}html.anim .fest.in{opacity:1;transform:none;transition:opacity .6s cubic-bezier(.16,1,.3,1),transform .8s cubic-bezier(.16,1,.3,1)}}
@media (min-width:720px){
 .bunt{height:74px}
 .cover{grid-template-columns:7fr 5fr;column-gap:40px;align-items:start;max-width:1240px;margin:0 auto;padding:0 40px 80px;min-height:calc(100svh - 150px)}
 .cover>.bunt-wrap{grid-column:1/-1;grid-row:1}
 .copy{grid-column:1;grid-row:2;align-self:center;padding-top:40px}
 .stage{grid-column:2;grid-row:2}
 .cover h1{font-size:clamp(84px,10.6vw,148px);line-height:.86;margin:0}
 .facts{margin-top:36px;gap:6px}
 .when{font-size:clamp(24px,2.6vw,32px)}.where{font-size:17px}
 .stage{position:relative;min-height:560px;display:grid;justify-items:center;align-content:start}
 .hang{--pw:280px;margin-top:-6px;position:relative;z-index:2}
 html[data-photo="1"] .hang{--pw:176px;position:absolute;top:-8px;right:4%;justify-items:center}
 .hang::before{height:84px}
 .disc{width:min(100%,430px);margin:120px 0 0;display:none}
 html[data-photo="1"] .disc{display:block}
}
@media (min-width:900px){
 .cover{padding:0 56px 104px}
 .when{font-size:32px}.where{font-size:19px}
}
/* escritorio: dos columnas, el disco con la piñata colgando a la derecha (P9) */
@media (min-width:900px){
 .top{padding:0 56px;min-height:72px;gap:28px}
 .top .date{display:none}
 .sec{max-width:1120px;padding:48px 56px 96px;display:grid;grid-template-columns:4fr 7fr;column-gap:72px;align-items:start}
 .sec>.fest{grid-column:1/-1;margin-bottom:44px}
 .sec>h2{grid-column:1;font-size:60px;position:sticky;top:104px;margin:0}
 .sec>.body{grid-column:2}
 .lead{font-size:21px}
 .stops li{grid-template-columns:130px 1fr 76px;padding:20px 0;min-height:96px}.stops time{font-size:38px}.stops strong{font-size:19px}.stops .dr{width:76px}
 .venue{grid-template-columns:120px 1fr;column-gap:32px;justify-items:stretch}.venue .dr{width:120px;grid-row:1/5;margin:0}.venue .btn{justify-self:start}.venue h3{font-size:38px}
 .sw li{width:84px}.sw i{width:54px;height:54px}
 .gifts{grid-template-columns:170px 1fr;column-gap:36px;align-items:center}.gifts .dr{width:170px;grid-row:1/span 4}.gifts .btn{grid-column:2;justify-self:start}
 .rsvp{grid-template-columns:140px 1fr;column-gap:36px;align-items:center}.rsvp .dr{width:140px;grid-row:1/span 4}.rsvp .btn{grid-column:2;justify-self:start}
 summary{font-size:22px}
 footer{padding:56px;grid-template-columns:1fr auto;align-items:center}
}
`;
const nav = [['historia', 'Historia'], ['programa', 'Programa'], ['lugar', 'Lugar'], ['galeria', 'Galería'], ['vestimenta', 'Qué ponerse'], ['preguntas', 'Preguntas'], ['regalos', 'Regalos']];
const swatches = [['#C2330F', 'Tomate'], ['#FFB5A0', 'Salmón'], ['#F6EBDA', 'Crema'], ['#2E2012', 'Chocolate']];
const faq = [
  ['¿Puedo dejar a mi hijo o hija?', 'Desde los 4 años puede quedarse con una ficha de contacto del adulto. Los más pequeños se quedan con un adulto.'],
  ['¿Hay alergias o dietas especiales?', 'Cuéntanos al confirmar. La torta tendrá una opción sin lactosa y los snacks no llevan maní.'],
  ['¿Dónde dejo el auto?', 'En la calle frente a la quinta y en el lote vecino, con cuidacoches.'],
  ['¿Qué le llevo de regalo?', 'A Sofi le encantan los libros y los juegos de mesa. La lista está en «Ver regalos»; así no se repite nada.']
];
const body = `
<a class="skip" href="#main">Saltar al contenido</a>
<header class="top"><a class="mark" href="#inicio" aria-label="Sofi cumple 6, inicio">Sofi<b>·6</b></a><span class="date">19 · 12 · 2026</span>
 <nav class="idx" aria-label="Secciones">${nav.map(([h, t]) => `<a href="#${h}">${t}</a>`).join('')}</nav>
 ${ctaHtml(SLUG)}
</header>
<main id="main">
<section class="cover" id="inicio" aria-labelledby="t">
 <div class="bunt-wrap">${pennants}</div>
 <div class="stage"><div class="hang">${drawing('pinata')}</div>
  <div class="disc"><div class="in"><div class="ph-wrap has-photo" data-par="-0.05">${photoPinata()}</div>${phTag}${photoErr()}</div></div></div>
 <div class="copy">
  <h1 id="t"><span>Sofi</span><span>cumple <em>6</em></span></h1>
  <div class="facts"><p class="when">Sábado 19 de diciembre, 15:00</p><p class="where">Quinta Los Tajibos, Equipetrol Norte · Santa Cruz</p><p class="count" data-count="2026-12-19T15:00:00-04:00">Faltan 25 días</p></div>
 </div>
</section>

<section class="sec" id="historia" aria-labelledby="h-historia">${scallop()}
 <h2 id="h-historia">La fiesta</h2>
 <div class="body"><p class="lead rv">Sofi cumple seis y quiere compartir su día con los que más quiere: primos, vecinos y el equipo de fútbol de la cuadra.</p>
 <p class="rv" style="--d:70ms">Habrá juegos, torta y una piñata que no se va a salvar. Si tienes menos de diez años, trae zapatillas; si tienes más, trae paciencia.</p></div>
</section>

<section class="sec" id="programa" aria-labelledby="h-programa">${scallop()}
 <h2 id="h-programa">Programa</h2>
 <div class="body"><ol class="stops">
  <li class="rv"><time datetime="15:00">15:00</time><div><strong>Llegada y bienvenida</strong><span>Jugo helado para todos.</span></div><span></span></li>
  <li class="rv" style="--d:50ms"><time datetime="15:30">15:30</time><div><strong>Juegos de agua y circuito</strong><span>Trae traje de baño y toalla.</span></div><span></span></li>
  <li class="rv" style="--d:100ms"><time datetime="16:30">16:30</time><div><strong>Canción y torta</strong><span>Con velitas y deseo.</span></div>${drawing('cake')}</li>
  <li class="rv" style="--d:150ms"><time datetime="17:00">17:00</time><div><strong>La piñata</strong><span>Por turnos y de menor a mayor.</span></div>${drawing('pinata')}</li>
  <li class="rv" style="--d:200ms"><time datetime="17:30">17:30</time><div><strong>Bolsitas y despedida</strong><span>Cada quien se lleva su sorpresa.</span></div><span></span></li>
 </ol></div>
</section>

<section class="sec" id="lugar" aria-labelledby="h-lugar">${scallop()}
 <h2 id="h-lugar">Dónde</h2>
 <div class="body"><article class="venue rv">${drawing('pin')}<h3>Quinta Los Tajibos</h3><address>Av. Beni, 4.º anillo · Equipetrol Norte, Santa Cruz de la Sierra</address><p class="tip">Hay sombra, ventiladores y baños para niños. Entra por el portón verde.</p><a class="btn btn-alt" href="https://www.google.com/maps/search/?api=1&amp;query=Equipetrol+Norte+Santa+Cruz+de+la+Sierra" rel="noopener">${ico.route}Cómo llegar</a></article></div>
</section>

<section class="sec" id="galeria" aria-labelledby="h-galeria">${scallop()}
 <h2 id="h-galeria">Fotos</h2>
 <div class="body"><ul class="gal">${galleryTiles('pinata', 3, photoErr())}</ul><p class="gal-cap">Fotos de ejemplo. Aquí van las fotos que suban los anfitriones.</p></div>
</section>

<section class="sec" id="vestimenta" aria-labelledby="h-vestimenta">${scallop()}
 <h2 id="h-vestimenta">Qué ponerse</h2>
 <div class="body"><p class="lead rv">Ropa fresca y zapatillas para correr. En Santa Cruz el sol pega fuerte: gorra y bloqueador.</p>
 <p class="rv" style="--d:60ms">Los colores de la fiesta son estos. Si te sumas a uno, Sofi lo notará.</p>
 <ul class="sw rv" style="--d:100ms">${swatches.map(([c, n]) => `<li><i style="--c:${c}"></i>${n}</li>`).join('')}</ul></div>
</section>

<section class="sec" id="preguntas" aria-labelledby="h-preguntas">${scallop()}
 <h2 id="h-preguntas">Preguntas</h2>
 <div class="body">${faq.map(([q, a], i) => `<details class="rv"${i === 0 ? ' open' : ''} style="--d:${i * 50}ms"><summary>${q}${ico.plus}</summary><p>${a}</p></details>`).join('')}</div>
</section>

<section class="sec" id="recomendaciones" aria-labelledby="h-rec">${scallop()}
 <h2 id="h-rec">Si vienes de lejos</h2>
 <div class="body"><ul class="rec">
  <li class="rv"><h3>Hotel Equipetrol Suites</h3><span class="meta">Hospedaje · desde Bs 350 por noche, desayuno incluido</span><a href="/r/lst_c0a5f3" rel="sponsored noopener">Ver hospedaje${ico.arrow}</a></li>
  <li class="rv" style="--d:70ms"><h3>Taxi Seguro Cruceño</h3><span class="meta">Transporte · con asiento para niños</span><a href="/r/lst_a91d27" rel="sponsored noopener">Ver transporte${ico.arrow}</a></li>
 </ul><small class="muted" style="display:block;margin-top:12px;font-size:13px">Los enlaces pasan por DOne, que puede recibir una comisión del proveedor.</small></div>
</section>

<section class="sec" id="regalos" aria-labelledby="h-regalos">${scallop()}
 <h2 id="h-regalos">Regalos</h2>
 <div class="body gifts">${drawing('gift')}${giftCopy({ lead: 'A Sofi le encantan los libros, los juegos de mesa y los rompecabezas. Elige uno de la lista y te lo anotamos para que no se repita.' })}${giftBtn(SLUG, 'btn-main')}</div>
</section>

<section class="sec" id="confirmar" aria-labelledby="h-conf">${scallop()}
 <h2 id="h-conf">¿Vienes?</h2>
 <div class="body rsvp">${drawing('hat')}${rsvpCopy({ ok: 'Confirma hasta el 10 de diciembre para que alcance la torta.', past: 'El plazo para confirmar terminó el 10 de diciembre. Si necesitas cambiar tu respuesta, escríbele a la familia de Sofi.' })}${rsvpBtn(SLUG)}</div>
</section>
</main>
<footer><ul aria-label="Índice">${nav.map(([h, t]) => `<li><a href="#${h}">${t}</a></li>`).join('')}</ul><small>Hecho con DOne. <a href="/c/${SLUG}/denunciar">Denunciar esta página</a></small></footer>
${barHtml(SLUG)}
`;
export default page({
  name: 'pinata', title: 'Prototipo · Piñata · DOne',
  fonts: 'family=Fredoka:wght@500;600;700&family=Figtree:wght@400;500;600',
  css, body, slug: SLUG
});
