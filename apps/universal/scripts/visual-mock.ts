import { createContractMock, seedDemo } from "@rsvp/testing/contract-mock";
import { serveContractMock } from "@rsvp/testing/contract-server";
import { withVisualFixtures } from "./visual-fixtures";

/** Contract-shaped API with the demo celebration, for the visual gate (`e2e/screens.visual.spec.ts`). Never the real backend. */
const mock = withVisualFixtures(createContractMock());
seedDemo(mock);
await serveContractMock(mock, Number(process.env["MOCK_PORT"] ?? 28300));
