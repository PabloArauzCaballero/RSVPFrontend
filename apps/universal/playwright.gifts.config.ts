import { statesConfig } from "./playwright.states.shared";

// Regalos del anfitrión · cerrar/reabrir la lista (gift-list 1.13.0) y producto agotado con reserva (1.21.0), en Chromium a 360 y 1280 px.
// El gateway de regalos se simula dentro del spec con page.route (estado en memoria); el resto va al mock de contratos de la app.
//   STATES_PORT=4xxxx MOCK_PORT=4yyyy SITE_PORT=4zzzz CHROMIUM_PATH=/usr/bin/google-chrome \
//   STATES_EVIDENCE_DIR=../../docs/progress/evidence/regalos-ronda3 npx playwright test -c playwright.gifts.config.ts
export default statesConfig(/regalos-cerrar-agotado\.spec\.ts/, { sub: "u-host", roles: ["HOST"] });
