import { createContractMock, seedDemo } from "@rsvp/testing/contract-mock";
import { serveContractMock } from "@rsvp/testing/contract-server";
import { withVisualFixtures } from "./visual-fixtures";

/** Contract-shaped API with the demo celebration, for the visual gate (`e2e/screens.visual.spec.ts`). Never the real backend. */
// The server clock is pinned to the same instant the specs give the browser (e2e/clock.ts): the deadline, the freshness line and the
// countdowns are relative to "now", and a screenshot that moves with the real clock cannot be a baseline.
const mock = withVisualFixtures(createContractMock({ now: () => new Date("2026-11-04T15:00:00.000Z") }));
seedDemo(mock);
await serveContractMock(mock, Number(process.env["MOCK_PORT"] ?? 28300));
