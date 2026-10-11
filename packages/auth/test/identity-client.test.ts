import { describe, expect, it, vi } from "vitest";
import { IdentityClient } from "../src/identity/client.js";

describe("IdentityClient", () => {
  it("uses the frozen identity endpoints for recovery and remote logout", async () => {
    const request = vi.fn().mockResolvedValue(undefined);
    const client = new IdentityClient({ request });
    await client.requestPasswordRecovery({ email: "persona@example.com" });
    await client.logout("refresh-token");
    expect(request).toHaveBeenNthCalledWith(1, "/identity/auth/password-recovery", { method: "POST", body: { email: "persona@example.com" }, auth: false });
    expect(request).toHaveBeenNthCalledWith(2, "/identity/auth/logout", { method: "POST", body: { refreshToken: "refresh-token" }, auth: false });
  });
});
