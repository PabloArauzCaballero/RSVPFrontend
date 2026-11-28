import { statesConfig } from "./playwright.states.shared";

// F7 · state evidence of the administrator's «Denuncias» screen, with an ADMIN session of its own.
//   STATES_PORT=4xxxx MOCK_PORT=4yyyy SITE_PORT=4zzzz CHROMIUM_PATH=/usr/bin/google-chrome \
//   STATES_EVIDENCE_DIR=../../docs/progress/evidence/plantillas-f7 npx playwright test -c playwright.admin-states.config.ts
export default statesConfig(/admin-reports-states\.spec\.ts/, { sub: "u-admin", roles: ["ADMIN"] });
