import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { toApiError } from "@rsvp/api-client";
import { describeFailure } from "../src/auth/failure";
import { useAuthSubmit, type AuthSubmit } from "../src/auth/use-auth-submit";
import { ConfirmDialog, ChoiceGroup, ToggleChip } from "../src/host/ui";
import { fakeClient, renderApp } from "./support";

vi.mock("expo-router", () => ({ useRouter: () => ({ replace: vi.fn(), push: vi.fn() }), usePathname: () => "/", useGlobalSearchParams: () => ({}), useLocalSearchParams: () => ({}), Redirect: () => null, Stack: () => null }));

const failure = (status: number, retryAfterSeconds?: number) => { const error = toApiError(status, "t", { title: "x", status }); if (retryAfterSeconds !== undefined) error.retryAfterSeconds = retryAfterSeconds; return error; };

describe("describeFailure · what a person is told when Identity says no", () => {
  it("maps 429 with Retry-After to a bounded cooldown and 429 without it to no cooldown", () => {
    expect(describeFailure(failure(429, 3))).toEqual({ kind: "rateLimited", retryAfterSeconds: 3 });
    expect(describeFailure(failure(429, 3.2))).toEqual({ kind: "rateLimited", retryAfterSeconds: 4 });
    expect(describeFailure(failure(429, 86400))).toEqual({ kind: "rateLimited", retryAfterSeconds: 120 });
    expect(describeFailure(failure(429))).toEqual({ kind: "rateLimited", retryAfterSeconds: null });
  });
  it("keeps the shared classification for 401, 403, 409, 422, 5xx and a dead network", () => {
    expect(describeFailure(failure(401))).toEqual({ kind: "invalidCredentials" });
    expect(describeFailure(failure(403))).toEqual({ kind: "forbidden" });
    expect(describeFailure(failure(409))).toEqual({ kind: "emailTaken" });
    expect(describeFailure(failure(422))).toEqual({ kind: "validation" });
    expect(describeFailure(failure(503))).toEqual({ kind: "unavailable" });
    expect(describeFailure(new TypeError("Failed to fetch"))).toEqual({ kind: "offline" });
  });
});

let hook: AuthSubmit;
function Probe(): null { hook = useAuthSubmit(); return null; }

describe("useAuthSubmit", () => {
  beforeEach(() => { vi.useFakeTimers(); render(<Probe />); });
  afterEach(() => { vi.useRealTimers(); });

  it("lets only one request through while one is in flight (two calls in the same frame)", async () => {
    let release: () => void = () => undefined;
    const action = vi.fn(() => new Promise<void>((resolve) => { release = resolve; }));
    let first: Promise<void> = Promise.resolve(); let second: Promise<void> = Promise.resolve();
    act(() => { first = hook.run(action); second = hook.run(action); });
    expect(action).toHaveBeenCalledTimes(1);
    await act(async () => { release(); await first; await second; });
    expect(hook.status.kind).toBe("idle");
  });

  it("a 429 blocks resubmitting for Retry-After seconds, counts down, then unblocks by itself", async () => {
    const action = vi.fn(async () => { throw failure(429, 2); });
    await act(async () => { await hook.run(action); });
    expect(hook.status.kind).toBe("failed");
    expect(hook.waitSeconds).toBe(2);
    await act(async () => { await hook.run(action); });
    expect(action).toHaveBeenCalledTimes(1);
    await act(async () => { vi.advanceTimersByTime(1000); });
    expect(hook.waitSeconds).toBe(1);
    await act(async () => { vi.advanceTimersByTime(1500); });
    expect(hook.status.kind).toBe("idle");
    await act(async () => { await hook.run(async () => ({ kind: "sent" })); });
    expect(hook.status.kind).toBe("sent");
  });

  it("any other failure is retryable immediately", async () => {
    await act(async () => { await hook.run(async () => { throw failure(401); }); });
    expect(hook.status).toMatchObject({ kind: "failed", blockedUntil: null });
    const retry = vi.fn(async () => undefined);
    await act(async () => { await hook.run(retry); });
    expect(retry).toHaveBeenCalledTimes(1);
  });
});

describe("shared controls honour disabled and busy", () => {
  it("ConfirmDialog busy: confirm and cancel refuse presses, so a destructive action cannot be sent twice", () => {
    const onConfirm = vi.fn(); const onCancel = vi.fn();
    renderApp(<ConfirmDialog visible title="Borrar" body="Seguro" confirmLabel="Borrar ya" danger busy onConfirm={onConfirm} onCancel={onCancel} />, fakeClient({}).client);
    fireEvent.click(screen.getByRole("button", { name: "Borrar ya" })); fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(onConfirm).not.toHaveBeenCalled(); expect(onCancel).not.toHaveBeenCalled();
  });
  it("ConfirmDialog idle: confirm fires once per press and cancel works", () => {
    const onConfirm = vi.fn(); const onCancel = vi.fn();
    renderApp(<ConfirmDialog visible title="Borrar" body="Seguro" confirmLabel="Borrar ya" onConfirm={onConfirm} onCancel={onCancel} />, fakeClient({}).client);
    fireEvent.click(screen.getByRole("button", { name: "Borrar ya" })); fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(onConfirm).toHaveBeenCalledTimes(1); expect(onCancel).toHaveBeenCalledTimes(1);
  });
  it("ToggleChip and ChoiceGroup ignore presses when disabled and still work when enabled", () => {
    const toggle = vi.fn(); const pick = vi.fn();
    const choices = [{ value: "a", label: "Opción A" }, { value: "b", label: "Opción B" }];
    const { rerender } = render(<><ToggleChip label="Lunes" on={false} onPress={toggle} disabled /><ChoiceGroup label="Elige" choices={choices} value="a" onChange={pick} disabled /></>);
    fireEvent.click(screen.getByRole("checkbox", { name: "Lunes" })); fireEvent.click(screen.getByRole("radio", { name: "Opción B" }));
    expect(toggle).not.toHaveBeenCalled(); expect(pick).not.toHaveBeenCalled();
    expect(screen.getByRole("checkbox", { name: "Lunes" }).getAttribute("aria-disabled")).toBe("true");
    rerender(<><ToggleChip label="Lunes" on={false} onPress={toggle} /><ChoiceGroup label="Elige" choices={choices} value="a" onChange={pick} /></>);
    fireEvent.click(screen.getByRole("checkbox", { name: "Lunes" })); fireEvent.click(screen.getByRole("radio", { name: "Opción B" }));
    expect(toggle).toHaveBeenCalledTimes(1); expect(pick).toHaveBeenCalledWith("b");
  });
});

import { errorMessage, isConflict } from "../src/host/ui";
import { useT } from "../src/platform/providers";

describe("errorMessage · every failure gets its own next step", () => {
  let translate: ReturnType<typeof useT> = ((key: string) => key) as ReturnType<typeof useT>;
  function Grab(): null { translate = useT(); return null; }
  const problem = (status: number, code?: string) => toApiError(status, "t", { title: "x", status, ...(code ? { code } : {}) });
  it("maps 409 by problem code, 429 with its wait, 5xx and a dead network", () => {
    renderApp(<Grab />, fakeClient({}).client);
    expect(errorMessage(problem(409, "SLUG_TAKEN"), translate)).toMatch(/dirección/);
    expect(errorMessage(problem(409, "CELEBRATION_ARCHIVED"), translate)).toMatch(/archivada/);
    expect(errorMessage(problem(409, "VERSION_CONFLICT"), translate)).toMatch(/Alguien guardó/);
    const limited = problem(429); limited.retryAfterSeconds = 7;
    expect(errorMessage(limited, translate)).toMatch(/7 s/);
    expect(errorMessage(problem(429), translate)).toMatch(/Demasiadas solicitudes/);
    expect(errorMessage(problem(503), translate)).toMatch(/servidor/);
    expect(errorMessage(new TypeError("Failed to fetch"), translate)).toMatch(/No hay conexión/);
  });
  it("offers the reload only for a stale version, not for final 409 answers", () => {
    expect(isConflict(problem(409, "VERSION_CONFLICT"))).toBe(true);
    expect(isConflict(problem(409))).toBe(true);
    expect(isConflict(problem(409, "SLUG_TAKEN"))).toBe(false);
  });
});
