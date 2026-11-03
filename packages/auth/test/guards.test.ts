import { describe, expect, it } from "vitest";
import { ROUTE_GROUPS, ROLES, canAccessRoute, decideRoute, homeGroupFor, safeReturnTo, type Role, type RouteGroup } from "../src/index.js";

/** REQ-F05-03: every role against every route group. */
const expected: Record<Role, Record<RouteGroup, boolean>> = {
  HOST: { auth: true, host: true, provider: false, admin: false, guest: true },
  PLANNER: { auth: true, host: true, provider: false, admin: false, guest: true },
  PROVIDER: { auth: true, host: false, provider: true, admin: false, guest: true },
  ADMIN: { auth: true, host: true, provider: false, admin: true, guest: true },
  GUEST: { auth: true, host: false, provider: false, admin: false, guest: true }
};

describe("route guards", () => {
  for (const role of ROLES) for (const group of ROUTE_GROUPS) {
    it(`${role} ${expected[role][group] ? "enters" : "is kept out of"} (${group})`, () => {
      expect(canAccessRoute([role], group)).toBe(expected[role][group]);
      expect(decideRoute([role], group).type).toBe(expected[role][group] ? "allow" : "forbidden");
    });
  }
  it("a PROVIDER cannot open (admin) and is sent to its own home", () => {
    expect(decideRoute(["PROVIDER"], "admin")).toEqual({ type: "forbidden", home: "provider" });
  });
  it("anonymous visitors are sent to login for private groups and pass through public ones", () => {
    expect(decideRoute(null, "host")).toEqual({ type: "login" });
    expect(decideRoute(null, "admin")).toEqual({ type: "login" });
    expect(decideRoute(null, "provider")).toEqual({ type: "login" });
    expect(decideRoute(null, "auth")).toEqual({ type: "allow" });
    expect(decideRoute(null, "guest")).toEqual({ type: "allow" });
  });
  it("a signed-in account without roles is forbidden everywhere private, with no home", () => {
    expect(decideRoute([], "host")).toEqual({ type: "forbidden", home: null });
  });
  it("picks the home group by priority", () => {
    expect(homeGroupFor(["HOST", "ADMIN"])).toBe("admin");
    expect(homeGroupFor(["PLANNER"])).toBe("host");
    expect(homeGroupFor(["PROVIDER"])).toBe("provider");
    expect(homeGroupFor(["GUEST"])).toBeNull();
  });
});

describe("safeReturnTo", () => {
  it("keeps app-relative paths", () => { expect(safeReturnTo("/celebraciones?c=abc")).toBe("/celebraciones?c=abc"); });
  it("rejects anything that could leave the app", () => {
    for (const value of ["https://evil.example", "//evil.example", "/\\evil.example", "javascript:alert(1)", "", null, undefined, "relative"]) expect(safeReturnTo(value)).toBeNull();
  });
});
