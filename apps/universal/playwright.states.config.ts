import { statesConfig } from "./playwright.states.shared";

// P10 and F7 · state evidence with a HOST session: the host preview, and the administrator's reports screen refusing a host.
//   STATES_PORT=4xxxx MOCK_PORT=4yyyy SITE_PORT=4zzzz CHROMIUM_PATH=/usr/bin/google-chrome \
//   STATES_EVIDENCE_DIR=../../docs/progress/evidence/plantillas-f6b npx playwright test -c playwright.states.config.ts
export default statesConfig(/(preview-states|admin-reports-denied)\.spec\.ts/, { sub: "u-host", roles: ["HOST"] });
