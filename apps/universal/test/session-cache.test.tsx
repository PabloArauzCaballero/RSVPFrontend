import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { IdentityClient, SessionManager, createMemorySessionStore } from "@rsvp/auth";
import { queryKeys } from "@rsvp/query-hooks";
import { AppProviders, type AppRuntime } from "../src/platform/providers";
import { useAuth } from "../src/auth/auth-context";
import { resetSecureStore } from "./stubs/expo-secure-store";
import { fakeClient } from "./support";

/**
 * B12 / FRONTEND-COMPARTIDO-PII-001: on a shared device, the next account must never see the previous account's cached data.
 * Synthetic data only. The second account's request never answers, so anything it sees can only come from the cache.
 */
const b64 = (value: unknown): string => Buffer.from(JSON.stringify(value)).toString("base64url");
const jwt = (sub: string): string => `${b64({ alg: "RS256" })}.${b64({ sub, roles: ["HOST"], organizationIds: [], exp: Math.floor(Date.now() / 1000) + 900 })}.sig`;
const tokens = (sub: string) => ({ accessToken: jwt(sub), refreshToken: `${sub}-`.padEnd(40, "r"), tokenType: "Bearer", expiresIn: 900 });

const PRIVATE: Record<string, string> = { "user-ana": "Boda de Ana y Luis: 120 invitados, 3 celíacos" };
let cacheProbe: ReturnType<typeof useQueryClient> | null = null;

function Celebrations(): React.ReactNode {
  const auth = useAuth();
  cacheProbe = useQueryClient();
  const userId = auth.claims.userId;
  const query = useQuery({
    queryKey: queryKeys.celebration.all,
    enabled: Boolean(userId),
    staleTime: 5 * 60_000,
    // The second account's answer never arrives: what it sees must come from the cache.
    queryFn: () => (userId && PRIVATE[userId] ? Promise.resolve(PRIVATE[userId]) : new Promise<string>(() => undefined))
  });
  return <p>{userId ? `${userId}: ${query.data ?? "cargando"}` : "sin sesión"}</p>;
}

function setup(): SessionManager {
  let next = "user-ana";
  const { client } = fakeClient({ "POST /identity/auth/login": () => tokens(next), "POST /identity/auth/logout": () => undefined });
  const manager = new SessionManager(createMemorySessionStore(), new IdentityClient(client));
  const runtime: AppRuntime = { manager, client, identityClient: client };
  render(<AppProviders runtime={runtime} locale="es-BO"><Celebrations /></AppProviders>);
  (manager as SessionManager & { nextUser: (id: string) => void }).nextUser = (id: string) => { next = id; };
  return manager;
}
const signIn = async (manager: SessionManager, user: string): Promise<void> => {
  (manager as SessionManager & { nextUser: (id: string) => void }).nextUser(user);
  await act(async () => { await manager.signIn({ email: `${user}@example.invalid`, password: "correct-horse-battery" }); });
};

beforeEach(() => { resetSecureStore(); localStorage.clear(); cacheProbe = null; });
afterEach(cleanup);

describe("B12 · the query cache belongs to one person", () => {
  it("after sign-out, the next account on the same device does not see the previous account's celebrations", async () => {
    const manager = setup();
    await signIn(manager, "user-ana");
    expect(await screen.findByText(`user-ana: ${PRIVATE["user-ana"]}`)).toBeTruthy();
    await act(async () => { await manager.logout(); });
    expect(await screen.findByText("sin sesión")).toBeTruthy();
    await signIn(manager, "user-beto");
    await waitFor(() => expect(screen.getByText(/^user-beto:/)).toBeTruthy());
    expect(screen.getByText("user-beto: cargando")).toBeTruthy();
    expect(screen.queryByText(/Boda de Ana/)).toBeNull();
    expect(cacheProbe?.getQueryCache().getAll().some((query) => JSON.stringify(query.state.data ?? "").includes("Boda de Ana"))).toBe(false);
  });

  it("an account switch without an explicit sign-out (session replaced) also starts from an empty cache", async () => {
    const manager = setup();
    await signIn(manager, "user-ana");
    expect(await screen.findByText(`user-ana: ${PRIVATE["user-ana"]}`)).toBeTruthy();
    await signIn(manager, "user-beto");
    expect(await screen.findByText("user-beto: cargando")).toBeTruthy();
    expect(screen.queryByText(/Boda de Ana/)).toBeNull();
  });

  it("cache entries are keyed under the signed-in user's id", async () => {
    const manager = setup();
    await signIn(manager, "user-ana");
    await screen.findByText(`user-ana: ${PRIVATE["user-ana"]}`);
    const hashes = cacheProbe?.getQueryCache().getAll().map((query) => query.queryHash) ?? [];
    expect(hashes.length).toBeGreaterThan(0);
    for (const hash of hashes) expect(hash).toContain('"user":"user-ana"');
  });
});

/**
 * A26: on the web the session is restored asynchronously, so the visitor turns from anonymous into a person while a public page
 * (guest RSVP, guest gifts) already asked for its data. The screen reads neither the session nor `fetchStatus`, only `isPending`/`data`.
 */
function setupWithoutSession(screenUnderTest: React.ReactNode): SessionManager {
  let next = "user-ana";
  const { client } = fakeClient({ "POST /identity/auth/login": () => tokens(next), "POST /identity/auth/logout": () => undefined });
  const manager = new SessionManager(createMemorySessionStore(), new IdentityClient(client));
  render(<AppProviders runtime={{ manager, client, identityClient: client }} locale="es-BO">{screenUnderTest}</AppProviders>);
  (manager as SessionManager & { nextUser: (id: string) => void }).nextUser = (id: string) => { next = id; };
  return manager;
}

describe("A26 · a public page open while the session arrives is asked again for the new person", () => {
  it("a pending public query that only reads isPending/data is fetched again after the anonymous → person switch", async () => {
    let calls = 0;
    function PublicInvitation(): React.ReactNode {
      cacheProbe = useQueryClient();
      // The first request is still in flight when the session arrives (it never answers on its own); the next one answers.
      const query = useQuery({ queryKey: ["public-invitation", "boda-publica"], queryFn: () => (++calls === 1 ? new Promise<string>(() => undefined) : Promise.resolve("Invitación de la boda")) });
      return <p>{query.isPending ? "Abriendo tu invitación…" : query.data}</p>;
    }
    const manager = setupWithoutSession(<PublicInvitation />);
    expect(await screen.findByText("Abriendo tu invitación…")).toBeTruthy();
    await waitFor(() => expect(calls).toBe(1));
    await signIn(manager, "user-ana");
    expect(await screen.findByText("Invitación de la boda")).toBeTruthy();
    expect(calls).toBe(2);
    const hashes = cacheProbe?.getQueryCache().getAll().map((query) => query.queryHash) ?? [];
    expect(hashes.length).toBeGreaterThan(0);
    for (const hash of hashes) expect(hash).toContain('"user":"user-ana"');
  });

  it("the query asked again after a switch only ever runs with the identity of the person who rendered it", async () => {
    const runs: { readonly rendered: string | null; readonly signedIn: string | null }[] = [];
    let managerRef: SessionManager | null = null;
    function PrivateWithPendingFetch(): React.ReactNode {
      cacheProbe = useQueryClient();
      const rendered = useAuth().claims.userId;
      const query = useQuery({
        queryKey: ["mine"],
        queryFn: () => {
          // Who the closure was rendered for, and who is signed in when it actually runs.
          runs.push({ rendered, signedIn: managerRef?.getState().session?.userId ?? null });
          return rendered && PRIVATE[rendered] ? PRIVATE[rendered] : new Promise<string>(() => undefined);
        }
      });
      return <p>{query.isPending ? "cargando" : query.data}</p>;
    }
    const manager = setupWithoutSession(<PrivateWithPendingFetch />);
    managerRef = manager;
    expect(await screen.findByText("cargando")).toBeTruthy();
    await signIn(manager, "user-ana");
    expect(await screen.findByText(PRIVATE["user-ana"] ?? "")).toBeTruthy();
    await signIn(manager, "user-beto");
    await waitFor(() => expect(runs.some((run) => run.rendered === "user-beto")).toBe(true));
    expect(screen.queryByText(/Boda de Ana/)).toBeNull();
    for (const run of runs) expect(run.rendered).toBe(run.signedIn);
  });
});
