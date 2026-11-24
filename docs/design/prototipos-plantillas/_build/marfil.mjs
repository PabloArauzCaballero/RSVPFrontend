import { page, ico, ctaHtml, barHtml, rsvpBtn, giftBtn, giftCopy, rsvpCopy, photoErr } from './shared.mjs';
import { drawing } from './drawings.mjs';
import { photoMarfil, phTag, galleryTiles } from './photos.mjs';

const SLUG = 'ana-y-mateo';
// Ornamento: trazo fino de 1,25 px, extremos redondos. Separador (línea · dos anillos · línea).
const sep = (cls = '') => `<svg class="orn sep ${cls}" viewBox="0 0 320 24" role="presentation" aria-hidden="true"><defs><mask id="ms${Math.random().toString(36).slice(2, 7)}"></mask></defs><g><path d="M0 12H128"/><path d="M192 12H320"/><circle class="acc" cx="150" cy="12" r="7"/><circle cx="170" cy="12" r="7"/></g></svg>`;
const sepMasked = (() => { let n = 0; return () => { const id = `sm${++n}`; return `<svg class="orn sep" viewBox="0 0 320 24" role="presentation" aria-hidden="true"><defs><mask id="${id}" maskUnits="userSpaceOnUse" x="0" y="-4" width="320" height="32"><rect class="wipe" x="0" y="-4" width="320" height="32"/></mask></defs><g mask="url(#${id})"><path d="M0 12H128"/><path d="M192 12H320"/><circle class="acc" cx="150" cy="12" r="7"/><circle cx="170" cy="12" r="7"/></g></svg>`; }; })();
const frame = `<svg class="arch-frame orn" viewBox="0 0 100 133" preserveAspectRatio="none" role="presentation" aria-hidden="true"><defs><mask id="mf" maskUnits="userSpaceOnUse" x="-5" y="-5" width="110" height="143"><rect class="wipe up" x="-5" y="-5" width="110" height="143"/></mask></defs><g mask="url(#mf)"><path d="M1 132V50A49 49 0 0 1 99 50V132Z"/><path class="inner" d="M5 132V50A45 45 0 0 1 95 50V132Z"/></g></svg>`;

const css = `
:root{--serif:'Cormorant Garamond',Georgia,'Times New Roman',serif;--sans:'Source Sans 3',system-ui,sans-serif;--r:2px}
body{font:400 16px/1.6 var(--sans)}
@media (min-width:900px){body{font-size:17px}}
h1,h2,h3{font-family:var(--serif);font-weight:500;letter-spacing:-.01em;margin:0;text-wrap:balance}
p{max-width:54ch;text-wrap:pretty}
.muted{color:var(--muted)}
.btn{border-radius:2px;font-family:var(--sans);letter-spacing:.01em}
/* encabezado */
.top{position:sticky;top:0;z-index:40;display:flex;align-items:center;justify-content:space-between;gap:16px;padding:10px 22px;min-height:64px;background:color-mix(in srgb,var(--canvas) 94%,transparent);border-bottom:1px solid var(--line)}
.mark{font:italic 500 26px/1 var(--serif);text-decoration:none;color:var(--text);display:flex;align-items:center;min-height:44px}
.mark i{color:var(--accent);padding:0 .12em;font-size:.82em}
.top .date{font-size:13px;color:var(--muted);font-variant-numeric:tabular-nums}
.idx{display:none}
/* portada */
.cover{display:grid;justify-items:center;gap:44px;padding:34px 20px 64px;overflow:hidden}
.arch{position:relative;width:min(70vw,290px);aspect-ratio:3/4;margin:16px 0 0}
.arch-frame{max-width:none;position:absolute;left:-12px;top:-12px;width:calc(100% + 24px);height:calc(100% + 24px);z-index:1}
.arch-in{position:absolute;inset:0;overflow:hidden;border-radius:999px 999px 4px 4px;background:var(--surface);display:grid;place-items:center}
.arch-in .ph-wrap{position:absolute;inset:-8% 0;will-change:transform}
.arch-in .ph-wrap .ph{height:100%}
.arch-in .dr{width:88%;margin-top:-6%}
.seal span{white-space:nowrap}.seal i{font-size:.72em;padding:0 .08em}
.seal{position:absolute;left:50%;bottom:-30px;translate:-50% 0;z-index:3;width:60px;height:60px;border-radius:50%;background:var(--fill);color:var(--onAccent);display:none;place-items:center;font:italic 500 22px/1 var(--serif);white-space:nowrap;box-shadow:0 0 0 5px var(--canvas)}
html[data-photo="1"] .seal{display:grid}
html[data-photoerr] .seal{display:none}
.cover-text{display:grid;gap:14px;justify-items:center;text-align:center}
.cover h1{font-size:clamp(50px,14.4vw,60px);line-height:.98}
.cover h1 span{display:block}
.amp{font-style:italic;color:var(--accent);font-weight:500}
.when{font:italic 500 23px/1.25 var(--serif);color:var(--text)}
.where{color:var(--muted);font-size:15px}
.count{font-size:14px;color:var(--muted);margin-top:4px;font-variant-numeric:tabular-nums}
/* secciones */
.sec{padding:20px 20px 64px;max-width:760px;margin:0 auto}
.sec>h2{font-size:42px;line-height:1.02;margin:6px 0 24px}
.sep{width:min(320px,80%);height:24px;margin:0 auto 36px}
.lead{font-size:16.5px;line-height:1.6}
.sec p+p{margin-top:16px}
/* itinerario */
.tl{list-style:none;margin:8px 0 0;padding:0 0 0 30px;position:relative}
.tl::before{content:"";position:absolute;left:5px;top:12px;bottom:12px;width:1px;background:var(--line)}
.tl li{position:relative;padding:0 0 28px 0;display:grid;gap:2px}
.tl li::before{content:"";position:absolute;left:-30px;top:9px;width:11px;height:11px;border-radius:50%;background:var(--canvas);border:1.25px solid var(--line)}
.tl li.hi::before{border-color:var(--accent);background:var(--accent)}
.tl time{font:italic 500 28px/1.1 var(--serif);color:var(--accent);font-variant-numeric:lining-nums}
.tl strong{font-weight:600;font-size:16px}
.tl span{color:var(--muted);font-size:15px;max-width:48ch}
/* lugares */
.venue{display:grid;gap:10px;padding:26px 0;border-top:1px solid var(--line)}
.venue:last-child{border-bottom:1px solid var(--line)}
.venue h3{font-size:32px;line-height:1.05}
.venue address{font-style:normal;color:var(--muted);font-size:15px}
.venue .tip{font-size:15px;max-width:52ch}
.venue .btn{justify-self:start;margin-top:8px}
.venue .vd{width:76px;margin-bottom:4px}
/* vestimenta */
.sw{list-style:none;padding:0;margin:22px 0 0;display:flex;flex-wrap:wrap;gap:12px 14px}
.sw li{display:grid;justify-items:center;gap:8px;width:64px;text-align:center;font-size:13px;line-height:1.25;color:var(--muted)}
.sw i{width:44px;height:44px;border-radius:50%;background:var(--c);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--text) 22%,transparent)}
/* preguntas */
details{border-top:1px solid var(--line)}
details:last-of-type{border-bottom:1px solid var(--line)}
summary{list-style:none;display:flex;align-items:center;justify-content:space-between;gap:16px;min-height:60px;padding:12px 0;cursor:pointer;font:500 22px/1.2 var(--serif)}
summary::-webkit-details-marker{display:none}
summary .pm{transition:transform .3s cubic-bezier(.16,1,.3,1);color:var(--accent)}
details[open] summary .pm{transform:rotate(45deg)}
details p{padding:0 0 20px;color:var(--muted);font-size:15px;max-width:54ch}
/* recomendaciones */
.rec{list-style:none;margin:0;padding:0}
.rec li{display:grid;gap:4px;padding:22px 0;border-top:1px solid var(--line)}
.rec li:last-child{border-bottom:1px solid var(--line)}
.rec h3{font-size:27px}
.rec .meta{color:var(--muted);font-size:15px}
.rec a{display:inline-flex;align-items:center;gap:8px;min-height:44px;font-weight:600;font-size:15px;color:var(--accent);text-underline-offset:4px;margin-top:2px}
.rec small{color:var(--muted);font-size:13px}
/* regalos */
.gifts{display:grid;gap:22px;justify-items:start}
.gifts .dr{width:132px}
.gifts .btn{min-height:52px;padding:0 26px;font-size:16px}
.etq{display:grid;gap:14px;justify-items:start}
.etq .dr{width:104px}
.etq .sw{margin-top:8px}
/* confirmar */
.rsvp{display:grid;gap:18px;justify-items:start}
.rsvp .btn{min-height:52px;padding:0 26px;font-size:16px}
.rsvp .dr{width:104px}
footer{padding:44px 22px 40px;border-top:1px solid var(--line);display:grid;gap:18px;justify-items:center;text-align:center}
footer .mark{font-size:30px}
footer ul{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;justify-content:center;gap:0 6px}
footer li a{display:inline-flex;align-items:center;min-height:44px;padding:0 8px;color:var(--text);font-size:14.5px}
footer small{font-size:13px;color:var(--muted);max-width:44ch}
footer small a{color:var(--muted);display:inline-flex;align-items:center;min-height:44px;padding:0 4px}

/* animaciones de entrada propias */
@media (prefers-reduced-motion:no-preference){
 html.anim .cover .arch-in{animation:rise 1.1s cubic-bezier(.16,1,.3,1) .35s both}
 html.anim .cover .seal{animation:press .7s cubic-bezier(.16,1,.3,1) 1.3s both}
 html.anim .cover .arch-frame .wipe{animation:traceUp 1.6s cubic-bezier(.2,.7,.2,1) .1s both}
 html.anim .cover-text>*{animation:fadeUp .8s cubic-bezier(.16,1,.3,1) both}
 html.anim .cover-text>*:nth-child(1){animation-delay:.7s}html.anim .cover-text>*:nth-child(2){animation-delay:.78s}html.anim .cover-text>*:nth-child(3){animation-delay:.86s}html.anim .cover-text>*:nth-child(4){animation-delay:.94s}
 .tl li::before{transition:transform .5s cubic-bezier(.16,1,.3,1)}
 html.anim .tl li.rv:not(.in)::before{transform:scale(0)}
}
@keyframes rise{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:none}}
@keyframes press{from{opacity:0;transform:scale(1.35)}to{opacity:1;transform:none}}
@keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
@keyframes traceUp{from{transform:translateY(145px)}to{transform:none}}
@media (min-width:1200px){.idx{display:flex;gap:2px;margin:0 auto}.idx a{display:inline-flex;align-items:center;min-height:44px;padding:0 10px;color:var(--text);text-decoration:none;font-size:15px}.idx a:hover{color:var(--accent)}}
/* escritorio: composición propia, no el móvil escalado (P9) */
@media (min-width:900px){
 .top{padding:0 48px;min-height:72px}
 .top .date{display:none}
 .cover{grid-template-columns:5fr 6fr;align-items:center;justify-items:start;gap:104px;max-width:1180px;margin:0 auto;padding:72px 48px 112px;min-height:calc(100svh - 72px)}
 .arch{width:min(100%,430px);margin:20px 0 0 24px}
 .seal{width:76px;height:76px;font-size:30px;bottom:-38px}
 .cover-text{justify-items:start;text-align:left;gap:20px;border-left:1px solid var(--line);padding:8px 0 8px 64px;position:relative}
 .cover-text::before{content:"";position:absolute;left:-7px;top:-4px;width:13px;height:13px;border-radius:50%;background:var(--canvas);border:1.25px solid var(--accent)}
 .cover h1{font-size:clamp(92px,8.6vw,118px);line-height:.92}
 .when{font-size:30px}
 .where{font-size:17px}
 .sec{max-width:1120px;padding:36px 48px 112px;display:grid;grid-template-columns:4fr 7fr;column-gap:72px;align-items:start}
 .sec>.sep{grid-column:1/-1;margin:0 auto 64px;width:360px}
 .sec>h2{grid-column:1;position:sticky;top:104px;font-size:52px;margin:0}
 .sec>.body{grid-column:2}
 .lead{font-size:20px}
 .tl{padding-left:44px}.tl::before{left:6px}.tl li::before{left:-44px}
 .tl li{grid-template-columns:150px 1fr;column-gap:12px;align-items:baseline;padding-bottom:34px}
 .tl li time{grid-row:1/3;font-size:34px}
 .venue{grid-template-columns:96px 1fr;column-gap:32px;align-items:start;padding:36px 0}
 .venue .vd{grid-row:1/5;margin:0;width:96px}
 .venue:nth-of-type(even){padding-left:56px}
 .sw li{width:80px}.sw i{width:52px;height:52px}
 .gifts{grid-template-columns:150px 1fr;align-items:center;column-gap:36px}
 .gifts .dr{width:150px;grid-row:1/span 4}
 .rsvp{grid-template-columns:120px 1fr;column-gap:36px;align-items:center}
 .rsvp .dr{grid-row:1/span 4;width:120px}
 .etq{grid-template-columns:120px 1fr;column-gap:32px;align-items:start}
 .etq .dr{grid-row:1/span 3;width:120px}
 .etq .sw{grid-column:2}
 summary{font-size:25px}
 footer{padding:64px 48px 56px}
}
`;

const nav = [['historia', 'Historia'], ['programa', 'Programa'], ['lugares', 'Lugares'], ['galeria', 'Galería'], ['vestimenta', 'Vestimenta'], ['preguntas', 'Preguntas'], ['regalos', 'Regalos']];
const swatches = [['#7A5230', 'Chocolate'], ['#C9966A', 'Caramelo'], ['#E2D6C2', 'Arena'], ['#8C7F6E', 'Gris cálido'], ['#2B2622', 'Tinta']];
const faq = [
  ['¿Puedo ir con acompañante?', 'Tu invitación indica cuántos lugares tienes reservados. Si necesitas cambiar algo, escríbenos antes del 20 de febrero.'],
  ['¿Hay menú vegetariano?', 'Sí. Cuéntanos al confirmar tu asistencia y lo avisamos al equipo de la hacienda.'],
  ['¿Dónde dejo el auto?', 'La hacienda tiene estacionamiento para 80 autos, con vigilancia. En la parroquia, la calle 21 admite autos hasta las 17:00.'],
  ['¿Puedo llevar niños?', 'La noche es para adultos, salvo sobrinos y ahijados. Si tienes dudas, dínoslo y lo resolvemos.']
];
const body = `
<a class="skip" href="#main">Saltar al contenido</a>
<header class="top"><a class="mark" href="#inicio" aria-label="Ana Lucía y Mateo, inicio">A<i>&amp;</i>M</a>
 <span class="date">20 · 03 · 2027</span>
 <nav class="idx" aria-label="Secciones">${nav.map(([h, t]) => `<a href="#${h}">${t}</a>`).join('')}</nav>
 ${ctaHtml(SLUG)}
</header>
<main id="main">
<section class="cover" id="inicio" aria-labelledby="t">
 <figure class="arch" style="margin-inline:0">
  ${frame}
  <div class="arch-in" data-reveal>
   <div class="ph-wrap has-photo" data-par="-0.05">${photoMarfil()}</div>${phTag}${photoErr()}
   <div class="no-photo" style="width:100%">${drawing('rings')}</div>
  </div>
  <span class="seal" aria-hidden="true"><span>A<i>&amp;</i>M</span></span>
 </figure>
 <div class="cover-text">
  <h1 id="t"><span>Ana Lucía</span><span><i class="amp">&amp;</i> Mateo</span></h1>
  <p class="when">Sábado 20 de marzo de 2027, 17:00</p>
  <p class="where">Parroquia San Miguel, Calacoto · La Paz</p>
  <p class="count" data-count="2027-03-20T17:00:00-04:00">Faltan 116 días</p>
 </div>
</section>

<section class="sec" id="historia" aria-labelledby="h-historia">${sepMasked()}
 <h2 id="h-historia">Nuestra historia</h2>
 <div class="body"><p class="lead rv">Nos conocimos en 2016, en un mirador de Sopocachi, esperando que el Illimani saliera entre las nubes. Esperamos juntos desde entonces.</p>
 <p class="rv" style="--d:80ms">El 20 de marzo queremos esperar con ustedes la tarde más linda del año: la de la ceremonia, la cena y el baile. Esta invitación es personal; tu lugar está reservado con tu nombre.</p></div>
</section>

<section class="sec" id="programa" aria-labelledby="h-programa">${sepMasked()}
 <h2 id="h-programa">Programa</h2>
 <div class="body"><ol class="tl">
  <li class="rv"><time datetime="16:30">16:30</time><strong>Recepción en el atrio</strong><span>Agua y mate de coca para el frío.</span></li>
  <li class="rv hi" style="--d:60ms"><time datetime="17:00">17:00</time><strong>Ceremonia religiosa</strong><span>Dura unos 45 minutos. Empieza en punto.</span></li>
  <li class="rv" style="--d:120ms"><time datetime="18:30">18:30</time><strong>Traslado en buses</strong><span>Salen de la calle 21; ida y vuelta incluidos.</span></li>
  <li class="rv" style="--d:180ms"><time datetime="19:30">19:30</time><strong>Cóctel de singani y fotos</strong><span>En el jardín de la hacienda.</span></li>
  <li class="rv" style="--d:240ms"><time datetime="21:00">21:00</time><strong>Cena y brindis</strong><span>Menú de tres tiempos.</span></li>
  <li class="rv" style="--d:300ms"><time datetime="22:30">22:30</time><strong>Vals y baile</strong><span>El api con pastel llega a medianoche.</span></li>
 </ol></div>
</section>

<section class="sec" id="lugares" aria-labelledby="h-lugares">${sepMasked()}
 <h2 id="h-lugares">Lugares</h2>
 <div class="body">
  <article class="venue rv">${drawing('pin', { cls: 'vd' })}<h3>Parroquia San Miguel</h3><address>Calle 21 de Calacoto, Zona Sur · La Paz</address><p class="tip">Llega 20 minutos antes. Hay estacionamiento en la calle 21 hasta las 17:00.</p><a class="btn btn-alt" href="https://www.google.com/maps/search/?api=1&amp;query=Parroquia+San+Miguel+Calacoto+La+Paz" rel="noopener">${ico.route}Cómo llegar</a></article>
  <article class="venue rv" style="--d:80ms">${drawing('pin', { cls: 'vd' })}<h3>Hacienda Los Cipreses</h3><address>Valle de Palca · a 40 minutos de Calacoto</address><p class="tip">Los buses salen de la parroquia. Si vas en auto, la carretera es asfaltada hasta la puerta.</p><a class="btn btn-alt" href="https://www.google.com/maps/search/?api=1&amp;query=Valle+de+Palca+La+Paz" rel="noopener">${ico.route}Cómo llegar</a></article>
 </div>
</section>

<section class="sec" id="galeria" aria-labelledby="h-galeria">${sepMasked()}
 <h2 id="h-galeria">Galería</h2>
 <div class="body"><ul class="gal">${galleryTiles('marfil', 3, photoErr())}</ul><p class="gal-cap">Fotos de ejemplo. Aquí van las fotos que suban los anfitriones.</p></div>
</section>

<section class="sec" id="vestimenta" aria-labelledby="h-vestimenta">${sepMasked()}
 <h2 id="h-vestimenta">Vestimenta</h2>
 <div class="body"><div class="etq">${drawing('hanger')}<p class="lead rv">Formal, de tarde a noche. En La Paz anochece fresco —cerca de 7 °C—, así que trae un chal o un saco.</p>
 <p class="rv" style="--d:60ms">Te sugerimos estos tonos. Evita el marfil y el blanco: son de la novia.</p>
 <ul class="sw rv" style="--d:100ms">${swatches.map(([c, n]) => `<li><i style="--c:${c}"></i>${n}</li>`).join('')}</ul></div></div>
</section>

<section class="sec" id="preguntas" aria-labelledby="h-preguntas">${sepMasked()}
 <h2 id="h-preguntas">Preguntas</h2>
 <div class="body">${faq.map(([q, a], i) => `<details class="rv"${i === 0 ? ' open' : ''} style="--d:${i * 50}ms"><summary>${q}${ico.plus}</summary><p>${a}</p></details>`).join('')}</div>
</section>

<section class="sec" id="recomendaciones" aria-labelledby="h-rec">${sepMasked()}
 <h2 id="h-rec">Recomendados</h2>
 <div class="body"><p class="rv" style="margin-bottom:18px">Si vienes de otra ciudad, estos proveedores verificados en DOne nos ayudaron a organizar el viaje.</p>
 <ul class="rec">
  <li class="rv"><h3>Hotel Sopocachi Boutique</h3><span class="meta">Hospedaje · tarifa para invitados desde Bs 420 por noche</span><a href="/r/lst_7d2c91" rel="sponsored noopener">Ver hospedaje${ico.arrow}</a></li>
  <li class="rv" style="--d:70ms"><h3>Radio Taxi Calacoto</h3><span class="meta">Transporte · servicio seguro, con factura</span><a href="/r/lst_41be08" rel="sponsored noopener">Ver transporte${ico.arrow}</a></li>
 </ul><small class="muted" style="display:block;margin-top:12px;font-size:13px">Los enlaces pasan por DOne, que puede recibir una comisión del proveedor.</small></div>
</section>

<section class="sec" id="regalos" aria-labelledby="h-regalos">${sepMasked()}
 <h2 id="h-regalos">Regalos</h2>
 <div class="body gifts">${drawing('gift')}${giftCopy({ lead: 'Preparamos una lista con cosas para la casa y para la luna de miel. Reserva la tuya y así evitamos que se repita.' })}${giftBtn(SLUG, 'btn-main')}</div>
</section>

<section class="sec" id="confirmar" aria-labelledby="h-conf">${sepMasked()}
 <h2 id="h-conf">Confirma tu asistencia</h2>
 <div class="body rsvp">${drawing('envelope')}${rsvpCopy({ ok: 'Responde antes del 20 de febrero. Toma un minuto.', past: 'El plazo para confirmar terminó el 20 de febrero. Si necesitas cambiar tu respuesta, escríbeles a los novios.' })}${rsvpBtn(SLUG)}</div>
</section>
</main>
<footer><a class="mark" href="#inicio" aria-label="Volver al inicio">A<i>&amp;</i>M</a>
 <ul aria-label="Índice">${nav.map(([h, t]) => `<li><a href="#${h}">${t}</a></li>`).join('')}</ul>
 <small>Hecho con DOne. <a href="/c/${SLUG}/denunciar">Denunciar esta página</a></small></footer>
${barHtml(SLUG)}
`;

export default page({
  name: 'marfil', title: 'Prototipo · Clásico marfil · DOne',
  fonts: 'family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500&family=Source+Sans+3:wght@400;500;600',
  css, body, slug: SLUG
});
