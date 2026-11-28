const { chromium } = require('playwright-core');
(async()=>{
 const base='file://' + require('path').resolve(__dirname, '../../../design/prototipos-plantillas') + '/';
 const b=await chromium.launch({executablePath:'/usr/bin/google-chrome'}); const out=[];
 for (const t of ['marfil','pinata','gala']) for (const w of [360,768,1280]) {
  const p=await b.newPage({viewport:{width:w,height:900}}); await p.goto(base+t+'.html'); await p.waitForTimeout(300);
  const r=await p.evaluate(()=>{
   const g=document.querySelector('.gal'); let gap=null;
   if(g){const gr=g.getBoundingClientRect(); const rows={}; [...g.children].forEach(l=>{const r=l.getBoundingClientRect(); const k=Math.round(r.top); (rows[k]=rows[k]||[]).push(r)}); gap=Object.values(rows).map(rs=>{const l=Math.min(...rs.map(r=>r.left)),rt=Math.max(...rs.map(r=>r.right)); return Math.round(gr.width-(rt-l))});}
   const top=document.querySelector('.top'); const bg=top?getComputedStyle(top).backgroundColor:null;
   const f=document.querySelector('.faq2'); const cg=f?getComputedStyle(f).columnGap:null;
   return {gap,bg,cg,over:document.documentElement.scrollWidth-innerWidth};});
  out.push([t,w,JSON.stringify(r)].join(' ')); await p.close();}
 console.log(out.join('\n')); await b.close();})();
