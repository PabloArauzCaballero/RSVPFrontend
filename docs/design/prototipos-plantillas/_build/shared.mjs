import { TOKENS } from './tokens.mjs';
import { DRAWING_CSS } from './drawings.mjs';

const vars = (t) => Object.entries(t).map(([k, v]) => `--${k}:${v}`).join(';') + `;--fill:${t.accentFill};--ink:${t.text};--knock:${t.canvas}`;
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
  mail: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16v12H4zM4 7l8 6 8-6"/></svg>'
};

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
.proto{display:flex;flex-wrap:wrap;align-items:center;gap:4px 8px;padding:4px 12px;background:var(--surface);border-bottom:1px solid var(--line);font:500 13px/1.2 system-ui,sans-serif;color:var(--muted)}
html[data-bare] .proto{display:none}
.proto b{font-weight:600;color:var(--text);margin-right:4px}
.proto button{min-height:44px;min-width:44px;padding:0 10px;font:500 13px system-ui,sans-serif;color:var(--text);background:transparent;border:1px solid transparent;border-radius:6px;cursor:pointer}
.proto button[aria-pressed="true"]{border-color:var(--line);background:var(--canvas);font-weight:600}
.proto .sp{flex:1}
/* con / sin foto */
.has-photo{display:none!important}
html[data-photo="1"] .has-photo{display:block!important}
html[data-photo="1"] .no-photo{display:none!important}
.ph{display:block;width:100%;height:100%}
.ph-tag{position:absolute;left:10px;bottom:10px;z-index:2;background:var(--surface);color:var(--muted);font:500 13px/1 system-ui,sans-serif;padding:6px 8px;border-radius:4px}
/* dibujos */
${DRAWING_CSS}
/* ornamentos: trazo de una sola familia por plantilla */
.orn{display:block;overflow:visible}
.orn *{fill:none;stroke:var(--line);vector-effect:non-scaling-stroke}
.orn .acc{stroke:var(--accent)}
.orn .wipe{fill:#fff;stroke:none;transform-box:fill-box;transform-origin:50% 50%}
/* barra fija: regalos y confirmar siempre a mano (P22) */
.bar{position:sticky;bottom:0;z-index:30;display:grid;grid-template-columns:auto 1fr;gap:10px;padding:10px 14px calc(10px + env(safe-area-inset-bottom));background:var(--canvas);border-top:1px solid var(--line)}
.bar .btn{width:100%;padding:0 14px;white-space:nowrap}
@media (min-width:900px){.bar{display:none}}
.top .cta{display:none}
@media (min-width:900px){.top .cta{display:flex;gap:10px}}
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
if(q.get('bare')==='1')d.setAttribute('data-bare','');
if(!matchMedia('(prefers-reduced-motion: reduce)').matches&&q.get('still')!=='1')d.classList.add('anim');})();</script>`;

export const toolbar = (name) => `<div class="proto" role="group" aria-label="Controles del prototipo"><b>Prototipo · ${name}</b><span class="sp"></span>
<button type="button" data-theme-set="light">Claro</button><button type="button" data-theme-set="dark">Oscuro</button><button type="button" data-theme-set="">Sistema</button>
<button type="button" data-photo-toggle>Con foto</button></div>`;

export const bodyScript = `<script>(function(){var d=document.documentElement;
function st(k,v){try{v===null?localStorage.removeItem(k):localStorage.setItem(k,v)}catch(e){}}
function sync(){var t=d.getAttribute('data-theme')||'';document.querySelectorAll('[data-theme-set]').forEach(function(b){b.setAttribute('aria-pressed',String(b.getAttribute('data-theme-set')===t))});
var ph=d.getAttribute('data-photo')==='1';document.querySelectorAll('[data-photo-toggle]').forEach(function(b){b.setAttribute('aria-pressed',String(ph));b.textContent=ph?'Con foto':'Sin foto'});}
document.addEventListener('click',function(e){var b=e.target.closest('[data-theme-set]');if(b){var v=b.getAttribute('data-theme-set');v?d.setAttribute('data-theme',v):d.removeAttribute('data-theme');st('rsvp-proto-theme',v||null);sync();return}
b=e.target.closest('[data-photo-toggle]');if(b){var on=d.getAttribute('data-photo')!=='1';on?d.setAttribute('data-photo','1'):d.removeAttribute('data-photo');st('rsvp-proto-photo',on?'1':'0');sync()}});sync();
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

export const page = ({ title, lang = 'es-BO', fonts, css, body, name }) => `<!doctype html>
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
<body>
${toolbar(TOKENS[name].name)}
${body}
${bodyScript}
</body>
</html>`;
