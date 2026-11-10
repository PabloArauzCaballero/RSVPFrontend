// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createApiClient } from "@rsvp/api-client";
import {
  createContractMock,
  MOCK_VALID_TOKEN,
} from "@rsvp/testing/contract-mock";
vi.mock("next/navigation", () => ({ useParams: () => ({}) }));
import { RsvpExperience } from "../components/rsvp/rsvp-experience";

const NOW = new Date("2026-12-04T12:00:00Z");
const MESSAGE = "Mensaje para los anfitriones (opcional)";
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
  sessionStorage.clear();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function setup(publicRegistration: boolean, failFirst = false) {
  const mock = createContractMock({
    now: () => NOW,
    unregisteredMode: "AUTO_ACCEPT",
  });
  if (!publicRegistration)
    mock.addGuest({ name: "Marta Quispe", token: MOCK_VALID_TOKEN });
  let release!: () => void;
  let writes = 0;
  const gate = new Promise<void>((done) => {
    release = done;
  });
  const client = createApiClient({
    baseUrl: "http://gw.test",
    tokenStore: {
      getAccessToken: async () => null,
      getRefreshToken: async () => null,
      setTokens: async () => undefined,
      clear: async () => undefined,
    },
    refreshSession: {
      refresh: async () => {
        throw new Error("No test session");
      },
    },
    fetchFn: async (input, options) => {
      if (
        options?.method === "POST" &&
        String(input).endsWith(publicRegistration ? "/unregistered" : "/rsvp")
      ) {
        writes += 1;
        if (writes === 1) {
          await gate;
          if (failFirst)
            return new Response("{}", {
              status: 503,
              headers: { "content-type": "application/problem+json" },
            });
        }
      }
      return mock.fetch(input, options);
    },
  });
  render(
    <RsvpExperience
      slug={mock.slug}
      token={publicRegistration ? undefined : MOCK_VALID_TOKEN}
      locale="es-BO"
      siteOrigin="https://fixture.example"
      client={client}
    />,
  );
  return { mock, release, writes: () => writes };
}

async function fill(publicRegistration: boolean) {
  if (publicRegistration) {
    fireEvent.change(await screen.findByLabelText("Tu nombre"), {
      target: { value: "Marta Quispe" },
    });
    fireEvent.change(screen.getByLabelText("Tu correo electrónico"), {
      target: { value: "marta@fixture.example" },
    });
    fireEvent.click(screen.getByLabelText(/Doy mi consentimiento/));
  } else fireEvent.click(await screen.findByLabelText("Sí, asistiré"));
  fireEvent.change(screen.getByLabelText(MESSAGE), {
    target: { value: "Mensaje original" },
  });
  fireEvent.click(
    screen.getByRole("button", {
      name: publicRegistration ? "Confirmar mi asistencia" : "Enviar respuesta",
    }),
  );
}

it.each([false, true])(
  "REQ-F15-01/05/06: a delayed submission locks every field and cannot be submitted twice (public=%s)",
  async (publicRegistration) => {
    const state = setup(publicRegistration);
    await fill(publicRegistration);
    await waitFor(() => expect(state.writes()).toBe(1));
    try {
      const fields = Array.from(
        document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
          "form input, form textarea",
        ),
      );
      expect(fields.length).toBeGreaterThan(0);
      for (const field of fields) expect(field.disabled).toBe(true);
      fireEvent.submit(screen.getByLabelText(MESSAGE).closest("form")!);
    } finally {
      state.release();
    }
    await screen.findByRole("heading", {
      name: publicRegistration
        ? "Listo: confirmamos tu asistencia"
        : "Tu asistencia está confirmada",
    });
    expect(state.writes()).toBe(1);
    expect(state.mock.listGuests()[0]?.message).toBe("Mensaje original");
  },
);

it.each([false, true])(
  "REQ-F15-05/06: failure unlocks the retained draft and allows a successful retry (public=%s)",
  async (publicRegistration) => {
    const state = setup(publicRegistration, true);
    await fill(publicRegistration);
    await waitFor(() => expect(state.writes()).toBe(1));
    state.release();
    const retry = await screen.findByRole("button", { name: "Reintentar" });
    const field = screen.getByLabelText(MESSAGE) as HTMLTextAreaElement;
    expect(field.disabled).toBe(false);
    expect(field.value).toBe("Mensaje original");
    fireEvent.change(field, { target: { value: "Mensaje corregido" } });
    fireEvent.click(retry);
    await screen.findByRole("heading", {
      name: publicRegistration
        ? "Listo: confirmamos tu asistencia"
        : "Tu asistencia está confirmada",
    });
    expect(state.writes()).toBe(2);
    expect(state.mock.listGuests()[0]?.message).toBe("Mensaje corregido");
  },
);
