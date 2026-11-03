import type { TokenPair } from "@rsvp/api-client";

const b64 = (value: unknown): string => Buffer.from(JSON.stringify(value)).toString("base64url");

/** A structurally real JWT (unsigned): the app only reads claims, the API verifies signatures. */
export function fakeJwt(claims: { sub?: string; roles?: string[]; organizationIds?: string[]; exp?: number }): string {
  return `${b64({ alg: "RS256" })}.${b64({ sub: "user-1", roles: ["HOST"], organizationIds: [], exp: Math.floor(Date.now() / 1000) + 900, ...claims })}.sig`;
}
export const tokens = (claims: Parameters<typeof fakeJwt>[0] = {}, refreshToken = "r".repeat(40)): TokenPair => ({ accessToken: fakeJwt(claims), refreshToken, expiresIn: 900 });
