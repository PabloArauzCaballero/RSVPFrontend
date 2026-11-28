import { TOKENS } from './tokens.mjs';
import { DRAWING_CSS } from './drawings.mjs';

const vars = (t) => Object.entries(t).map(([k, v]) => `--${k}:${v}`).join(';') + `;--fill:${t.accentFill};--ink:${t.text};--knock:${t.canvas}${t.disc ? '' : `;--disc:${t.stone}`}`;
export const themeCss = (key) => { const T = TOKENS[key]; return `:root{color-scheme:light dark;${vars(T.light)}}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){${vars(T.dark)}}}
:root[data-theme="light"]{color-scheme:light;${vars(T.light)}}
:root[data-theme="dark"]{color-scheme:dark;${vars(T.dark)}}`; };

export const fontLink = (fam) => `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?${fam}&display=swap">`;

// Iconos: un solo set de trazo uniforme
export const ico = {
  gift: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 11h16v9H4zM3 7.5h18V11H3zM12 7.5V20M12 7.5C12 5 10.5 3.5 8.7 3.8 7 4.1 7 6.6 9 7.2M12 7.5c0-2.5 1.5-4 3.3-3.7 1.7.3 1.7 2.8-.3 3.4"/></svg>',
  check: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  route: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 19c0-4 3-4 5-4s4 0 4-4-3-4-5-4M16.5 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM5 19.5h.01"/></svg>',
  arrow: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  plus: '<svg class="ic pm" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M12 5v14"/></svg>',
  info: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.6h.01"/></svg>',
  imageoff: '<svg class="ic big" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v14H4zM4 16l5-5 4 4 2-2 5 5M8.5 8.5h.01M3 3l18 18"/></svg>',
  mail: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16v12H4zM4 7l8 6 8-6"/></svg>'
};


// Botones con estado (P22): el de regalos NUNCA se oculta; el de confirmar cambia de etiqueta según el enlace personal y el plazo.
export const giftBtn = (slug, cls = 'btn-alt') => `<a class="btn ${cls}" href="/c/${slug}/regalos">${ico.gift}<span class="vg-open">Ver regalos</span><span class="vg-empty">Lista de regalos (pronto)</span></a>`;
export const rsvpBtn = (slug, { bar = false, cls = 'btn-main' } = {}) => `<a class="btn ${cls} rs" href="${bar ? '#confirmar' : `/c/${slug}/rsvp`}"${bar ? ' data-bar' : ''}>${ico.check}<span class="lr-ok">Confirmar asistencia</span><span class="lr-nolink">Busca tu enlace personal</span><span class="lr-past">Ver mi respuesta</span></a>`;
export const rsvpCopy = ({ ok, past }) => `<p class="lead t-ok rv">${ok}</p><p class="lead t-nolink rv">Para confirmar necesitas tu enlace personal. Búscalo con el nombre con el que te invitaron.</p><p class="note t-past" role="status">${ico.info}<span>${past}</span></p>`;
export const giftCopy = ({ lead }) => `<p class="lead g-open-t rv">${lead}</p><p class="lead g-empty-t rv">Todavía no hay regalos en la lista. Vuelve pronto: el botón seguirá aquí.</p><p class="note g-closed-t" role="status">${ico.info}<span>La lista de regalos está cerrada: puedes verla, pero ya no se pueden reservar regalos.</span></p>`;
export const barHtml = (slug) => `<div class="bar" role="region" aria-label="Acciones principales">${giftBtn(slug)}${rsvpBtn(slug, { bar: true })}</div>`;
export const ctaHtml = (slug) => `<div class="cta">${giftBtn(slug)}${rsvpBtn(slug, { bar: true })}</div>`;
// error de carga de la foto (el prototipo lo muestra con ?photoerr=1)
export const photoErr = (cls = '') => `<div class="ph-err ${cls}" role="group" aria-label="La foto no se pudo cargar">${ico.imageoff}<p>No pudimos cargar la foto</p><button type="button" class="retry" data-retry>Reintentar</button></div>`;

export const baseCss = `
*,*::before,*::after{box-sizing:border-box}
html{-webkit-text-size-adjust:100%;scroll-behavior:smooth;scroll-padding-top:84px}
body{margin:0;background:var(--canvas);color:var(--text);-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}
img,svg{max-width:100%}
p{margin:0}
a{color:var(--accent)}
.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.skip{position:absolute;left:12px;top:-60px;background:var(--fill);color:var(--onAccent);padding:12px 16px;z-index:100;border-radius:6px}
.skip:focus{top:8px}
:focus-visible{outline:3px solid var(--accent);outline-offset:3px}
.ic{width:20px;height:20px;flex:none;fill:none;stroke:currentColor;stroke-width:1.75;stroke-linecap:round;stroke-linejoin:round}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:10px;min-height:48px;padding:0 20px;font:inherit;font-weight:600;font-size:15px;line-height:1;text-decoration:none;cursor:pointer;border:1.5px solid var(--fill);transition:transform .16s cubic-bezier(.16,1,.3,1),background-color .2s,color .2s}
.btn:active{transform:scale(.98)}
.btn-main{background:var(--fill);color:var(--onAccent)}
.btn-alt{background:transparent;color:var(--accent);border-color:var(--accent)}
@media (hover:hover){.btn-main:hover{filter:brightness(1.08)}.btn-alt:hover{background:var(--stone)}}
/* controles del prototipo (no forman parte de la invitación) */
.proto{background:var(--surface);border-bottom:1px solid var(--line);font:500 13px/1.2 system-ui,sans-serif;color:var(--muted)}
html[data-bare] .proto{display:none}
.proto>summary{display:flex;align-items:center;min-height:44px;padding:0 12px;cursor:pointer;list-style:none}
.proto>summary::-webkit-details-marker{display:none}
.proto>summary b{font-weight:600;color:var(--text);margin-right:8px}
.proto .ctl{display:flex;flex-wrap:wrap;align-items:center;gap:4px 14px;padding:4px 12px 10px}
.proto .grp{display:flex;flex-wrap:wrap;align-items:center;gap:4px 6px}
.proto .grp>span{color:var(--muted)}
.proto button,.proto select{min-height:44px;min-width:44px;padding:0 10px;font:500 13px system-ui,sans-serif;color:var(--text);background:transparent;border:1px solid transparent;border-radius:6px;cursor:pointer}
.proto select{border-color:var(--line);background:var(--canvas)}
.proto button[aria-pressed="true"]{border-color:var(--line);background:var(--canvas);font-weight:600}
/* con / sin foto */
.has-photo{display:none!important}
html[data-photo="1"] .has-photo{display:block!important}
html[data-photo="1"] .no-photo{display:none!important}
.ph{display:block;width:100%;height:100%}
.ph-tag{position:absolute;left:10px;bottom:10px;z-index:2;background:var(--surface);color:var(--muted);font:500 13px/1 system-ui,sans-serif;padding:6px 8px;border-radius:4px}
/* error de carga de la foto */
.ph-err{display:none;position:absolute;inset:0;z-index:3;place-content:center;justify-items:center;gap:6px;padding:14px;text-align:center;background:var(--surface);color:var(--text)}
html[data-photoerr] .ph-err{display:grid}
html[data-photoerr] .ph-wrap,html[data-photoerr] .ph-tag{display:none!important}
.ph-err p{font:500 14px/1.3 system-ui,sans-serif;max-width:20ch;color:var(--muted)}
.ph-err .ic.big{width:30px;height:30px;color:var(--muted)}
.ph-err .retry{min-height:44px;min-width:44px;padding:0 16px;font:600 14px system-ui,sans-serif;color:var(--accent);background:transparent;border:1.5px solid var(--accent);border-radius:var(--r,0);cursor:pointer}
.ph-err .retry:hover{background:var(--stone)}
/* galería de ejemplo */
.gal{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin:0;padding:0;list-style:none}
.gal li{position:relative;aspect-ratio:1;overflow:hidden;background:var(--stone2);border-radius:var(--r,0)}
.gal li:nth-child(1),.gal li:nth-child(6){grid-column:span 2;aspect-ratio:16/9}
.gal .ph-err{padding:8px;gap:4px}
.gal .ph-err p{font-size:13px}
.gal li:not(.err-tile) .ph-err{display:none!important}
.gal-cap{font-size:13px;color:var(--muted);margin-top:10px}
/* 6 fotos: 2+1 / 1+1+1 / 3. La última ocupa la fila entera para que ninguna fila quede con un hueco (PL-117-M1). */
@media (min-width:720px){.gal{grid-template-columns:repeat(3,minmax(0,1fr))}.gal li:nth-child(1){grid-column:span 2;aspect-ratio:2/1}.gal li:nth-child(6){grid-column:1/-1;aspect-ratio:3/1}}
/* avisos (solo texto + icono, sin cromo de alerta) */
.note{display:flex;gap:12px;align-items:flex-start;padding:14px 16px;background:var(--surface);border:1px solid var(--line);border-radius:var(--r,0);font-size:15px;line-height:1.5;color:var(--text);max-width:52ch}
.note .ic{color:var(--accent);margin-top:2px}
/* estados de la invitación (se eligen en la franja del prototipo o con ?gifts=empty|closed&link=none&deadline=past&photoerr=1) */
.vg-empty,.lr-nolink,.lr-past,.t-nolink,.t-past,.g-empty-t,.g-closed-t{display:none}
html[data-gifts="empty"] .vg-open{display:none}
html[data-gifts="empty"] .vg-empty{display:inline}
html[data-gifts="empty"] .g-open-t{display:none}
html[data-gifts="empty"] .g-empty-t{display:block}
html[data-gifts="closed"] .g-closed-t{display:flex}
html[data-deadline="past"] .lr-ok{display:none}
html[data-deadline="past"] .lr-past{display:inline}
html[data-link="none"] .lr-ok,html[data-link="none"] .lr-past{display:none}
html[data-link="none"] .lr-nolink{display:inline}
html[data-link="none"] .t-ok{display:none}
html[data-link="none"] .t-nolink{display:block}
html[data-deadline="past"] .t-ok,html[data-deadline="past"] .t-nolink{display:none}
html[data-deadline="past"] .t-past{display:flex}
/* dibujos */
${DRAWING_CSS}
/* ornamentos: trazo de una sola familia por plantilla */
.orn{display:block;overflow:visible}
.orn *{fill:none;stroke:var(--line);vector-effect:non-scaling-stroke}
.orn .acc{stroke:var(--accent)}
.orn .wipe{fill:#fff;stroke:none;transform-box:fill-box;transform-origin:50% 50%}
/* barra fija: regalos y confirmar siempre a mano (P22). Los botones encogen y parten la etiqueta: nada se sale a 320 px. */
.bar{position:sticky;bottom:0;z-index:30;display:grid;grid-template-columns:minmax(0,5fr) minmax(0,6fr);gap:8px;padding:10px 12px calc(10px + env(safe-area-inset-bottom));background:var(--canvas);border-top:1px solid var(--line)}
.bar .btn{width:100%;min-width:0;min-height:48px;padding:6px 8px;gap:6px;font-size:14.5px;line-height:1.15;text-align:center;white-space:normal}
.bar .btn .ic{display:none}
@media (min-width:400px){.bar{padding-inline:14px;gap:10px}.bar .btn{font-size:15px;padding:6px 12px}.bar .btn .ic{display:inline-block}}
@media (min-width:600px){.bar{grid-template-columns:repeat(2,minmax(0,260px));justify-content:center}}
@media (min-width:900px){.bar{display:none}}
.top .cta{display:none}
@media (min-width:900px){.top .cta{display:flex;gap:10px}.top .cta .btn{white-space:nowrap}}
/* revelado: el estado final es el de partida; solo se oculta si JS y el movimiento están permitidos */
@media (prefers-reduced-motion:no-preference){
 html.anim .rv{opacity:0;transform:translateY(14px)}
 html.anim .rv.in{opacity:1;transform:none;transition:opacity .6s cubic-bezier(.16,1,.3,1) var(--d,0ms),transform .6s cubic-bezier(.16,1,.3,1) var(--d,0ms)}
 html.anim .dr .wipe{transform:translateY(130px)}
 html.anim .dr.in .wipe{transform:none;transition:transform 1.1s cubic-bezier(.2,.7,.2,1) var(--d,0ms)}
 html.anim .orn .wipe{transform:scaleX(0)}
 html.anim .orn.in .wipe{transform:none;transition:transform 1.2s cubic-bezier(.2,.7,.2,1) var(--d,0ms)}
}
@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important;scroll-behavior:auto!important}}
`;

export const headScript = `<script>(function(){var d=document.documentElement,q=new URLSearchParams(location.search),s=function(k){try{return localStorage.getItem(k)}catch(e){return null}};
var t=q.get('theme')||s('rsvp-proto-theme');if(t==='light'||t==='dark')d.setAttribute('data-theme',t);
var p=q.get('photo');if(p===null)p=s('rsvp-proto-photo');if(p==='1')d.setAttribute('data-photo','1');
if(q.get('photoerr')==='1'){d.setAttribute('data-photo','1');d.setAttribute('data-photoerr','')}
var g=q.get('gifts');if(g==='empty'||g==='closed')d.setAttribute('data-gifts',g);
if(q.get('link')==='none')d.setAttribute('data-link','none');
if(q.get('deadline')==='past')d.setAttribute('data-deadline','past');
if(q.get('bare')==='1')d.setAttribute('data-bare','');
if(!matchMedia('(prefers-reduced-motion: reduce)').matches&&q.get('still')!=='1')d.classList.add('anim');})();</script>`;

export const toolbar = (name) => `<details class="proto" aria-label="Controles del prototipo"><summary><b>Prototipo · ${name}</b><span>estados y tema (tocar)</span></summary><div class="ctl">
<div class="grp" role="group" aria-label="Tema"><span>Tema</span><button type="button" data-theme-set="light">Claro</button><button type="button" data-theme-set="dark">Oscuro</button><button type="button" data-theme-set="">Sistema</button></div>
<label class="grp"><span>Foto</span><select data-st="photo"><option value="0">Sin foto</option><option value="1">Con foto</option><option value="err">Error de carga</option></select></label>
<label class="grp"><span>Regalos</span><select data-st="gifts"><option value="open">Abierto</option><option value="empty">Vacío</option><option value="closed">Cerrado</option></select></label>
<label class="grp"><span>Enlace personal</span><select data-st="link"><option value="yes">Con enlace</option><option value="none">Sin enlace</option></select></label>
<label class="grp"><span>Plazo</span><select data-st="deadline"><option value="open">Vigente</option><option value="past">Vencido</option></select></label></div></details>`;

export const bodyScript = `<script>(function(){var d=document.documentElement;
function st(k,v){try{v===null?localStorage.removeItem(k):localStorage.setItem(k,v)}catch(e){}}
function url(k,v){try{var u=new URL(location.href);v===null?u.searchParams.delete(k):u.searchParams.set(k,v);history.replaceState(null,'',u)}catch(e){}}
var SLUG=(document.querySelector('[data-slug]')||{getAttribute:function(){return ''}}).getAttribute('data-slug');
function hrefs(){document.querySelectorAll('.rs[data-bar]').forEach(function(a){a.setAttribute('href',d.getAttribute('data-link')==='none'?'/c/'+SLUG+'/rsvp':'#confirmar')})}
function val(k){if(k==='photo')return d.hasAttribute('data-photoerr')?'err':d.getAttribute('data-photo')==='1'?'1':'0';
 if(k==='gifts')return d.getAttribute('data-gifts')||'open';if(k==='link')return d.getAttribute('data-link')==='none'?'none':'yes';return d.getAttribute('data-deadline')==='past'?'past':'open'}
function sync(){var t=d.getAttribute('data-theme')||'';document.querySelectorAll('[data-theme-set]').forEach(function(b){b.setAttribute('aria-pressed',String(b.getAttribute('data-theme-set')===t))});
 document.querySelectorAll('[data-st]').forEach(function(sel){sel.value=val(sel.getAttribute('data-st'))});hrefs()}
function setSt(k,v){
 if(k==='photo'){d.removeAttribute('data-photoerr');v==='0'?d.removeAttribute('data-photo'):d.setAttribute('data-photo','1');if(v==='err')d.setAttribute('data-photoerr','');
  st('rsvp-proto-photo',v==='0'?'0':'1');url('photo',v==='0'?null:'1');url('photoerr',v==='err'?'1':null)}
 else if(k==='gifts'){v==='open'?d.removeAttribute('data-gifts'):d.setAttribute('data-gifts',v);url('gifts',v==='open'?null:v)}
 else if(k==='link'){v==='none'?d.setAttribute('data-link','none'):d.removeAttribute('data-link');url('link',v==='none'?'none':null)}
 else{v==='past'?d.setAttribute('data-deadline','past'):d.removeAttribute('data-deadline');url('deadline',v==='past'?'past':null)}
 document.querySelectorAll('.rv').forEach(function(e){e.classList.add('in')});sync()}
document.addEventListener('click',function(e){var b=e.target.closest('[data-theme-set]');if(b){var v=b.getAttribute('data-theme-set');v?d.setAttribute('data-theme',v):d.removeAttribute('data-theme');st('rsvp-proto-theme',v||null);sync();return}
 b=e.target.closest('[data-retry]');if(b){setSt('photo','1')}});
document.addEventListener('change',function(e){var sel=e.target.closest('[data-st]');if(sel)setSt(sel.getAttribute('data-st'),sel.value)});
var pr=document.querySelector('.proto');if(pr&&innerWidth>=900)pr.setAttribute('open','');sync();
// cuenta atrás en texto (sin cromo de píldora)
document.querySelectorAll('[data-count]').forEach(function(el){var t=new Date(el.getAttribute('data-count')).getTime(),n=Math.ceil((t-Date.now())/864e5);if(n>1)el.textContent='Faltan '+n+' días';else if(n===1)el.textContent='Es mañana';else if(n===0)el.textContent='Es hoy';});
// revelado al entrar
var els=[].slice.call(document.querySelectorAll('.rv,.dr,.orn'));
if(d.classList.contains('anim')&&'IntersectionObserver' in window){var io=new IntersectionObserver(function(es){es.forEach(function(x){if(x.isIntersecting){x.target.classList.add('in');io.unobserve(x.target)}})},{threshold:.12,rootMargin:'0px 0px -6% 0px'});els.forEach(function(el){io.observe(el)});}
else els.forEach(function(el){el.classList.add('in')});
// paralaje suave: solo transform
var pars=[].slice.call(document.querySelectorAll('[data-par]'));
if(pars.length&&d.classList.contains('anim')){var tick=false;function run(){tick=false;var y=Math.min(window.scrollY,900);pars.forEach(function(el){el.style.transform='translate3d(0,'+(y*parseFloat(el.getAttribute('data-par'))).toFixed(1)+'px,0)'})}
addEventListener('scroll',function(){if(!tick){tick=true;requestAnimationFrame(run)}},{passive:true});run();}
})();</script>`;

export const page = ({ title, lang = 'es-BO', fonts, css, body, name, slug }) => `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${title}</title>
<meta name="color-scheme" content="light dark">
<meta name="robots" content="noindex">
<meta name="description" content="Prototipo de plantilla de invitación DOne (F4). Contenido de ejemplo; no es una invitación real.">
${fontLink(fonts)}
<style>${themeCss(name)}${baseCss}${css}</style>
${headScript}
</head>
<body data-slug="${slug}">
${toolbar(TOKENS[name].name)}
${body}
${bodyScript}
</body>
</html>`;
