const { chromium } = require('playwright');
const S = require('./state.json');
const OUT = process.env.OUT;
(async () => {
  const b = await chromium.launch();
  for (const width of [360, 1280]) {
    const p = await b.newPage({ viewport: { width, height: 900 }, locale: 'es-BO' });
    await fetch(`${S.gateway}/__ctl/soldout`);
    await p.goto(`http://localhost:8310/regalos?c=${S.celebrationId}`, { waitUntil: 'networkidle', timeout: 120000 });
    const row = p.locator(`[data-testid="gift-${S.dorada.id}"]`);
    await row.waitFor();
    await row.scrollIntoViewIfNeeded();
    await row.screenshot({ path: `${OUT}/host-fila-agotado-${width}.png` });
    await fetch(`${S.gateway}/__ctl/restock`);
    await p.reload({ waitUntil: 'networkidle' });
    await p.locator(`[data-testid="gift-${S.dorada.id}"]`).screenshot({ path: `${OUT}/host-fila-normal-${width}.png` });
    await p.close();
  }
  await b.close();
})();
