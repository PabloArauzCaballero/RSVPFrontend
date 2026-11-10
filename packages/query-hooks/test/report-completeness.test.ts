import { expect, it, vi } from "vitest";
import {
  buildRsvpReportCsv,
  buildCateringCsv,
  type GuestListItem,
} from "../src/index.js";
const guest = (id: string): GuestListItem => ({
  guestId: id,
  celebrationId: "c",
  name: "Ana Pérez",
  email: null,
  phone: null,
  locale: null,
  groupId: null,
  status: "CONFIRMED",
  allowedCompanions: 1,
  requestedCompanions: 1,
  approvedCompanions: 1,
});

it("REQ-F17-05: refuses a report that stops before the advertised total", async () => {
  const api = {
    list: vi.fn(async (_id: string, query: { offset: number }) => ({
      items: query.offset === 0 ? [guest("a")] : [],
      total: 2,
    })),
    rsvps: vi.fn(async () => ({ items: [] })),
  };
  await expect(buildRsvpReportCsv(api, "c", ["Nombre"])).rejects.toThrow();
  expect(api.rsvps).not.toHaveBeenCalled();
});
it("REQ-F17-05: refuses a report still incomplete at the page limit", async () => {
  const api = {
    list: vi.fn(async (_id: string, query: { offset: number }) => ({
      items: [guest(String(query.offset))],
      total: 201,
    })),
    rsvps: vi.fn(async () => ({ items: [] })),
  };
  await expect(buildRsvpReportCsv(api, "c", ["Nombre"])).rejects.toThrow();
  expect(api.list).toHaveBeenCalledTimes(200);
});
it("REQ-F17-05: refuses a catering cursor cycle instead of exporting duplicates", async () => {
  const catering = vi.fn(async () => ({
    items: [],
    limit: 500,
    nextCursor: "same",
  }));
  await expect(
    buildCateringCsv({ catering }, "c", ["k", "g", "s", "p", "d", "m"], {
      withNotesOnly: false,
      includeMessage: false,
    }),
  ).rejects.toThrow();
  expect(catering).toHaveBeenCalledTimes(2);
});
it("REQ-F17-05: refuses a catering export unfinished at the page limit", async () => {
  let calls = 0;
  const catering = vi.fn(async () => ({
    items: [],
    limit: 500,
    nextCursor: String(++calls),
  }));
  await expect(
    buildCateringCsv({ catering }, "c", ["k", "g", "s", "p", "d", "m"], {
      withNotesOnly: false,
      includeMessage: false,
    }),
  ).rejects.toThrow();
  expect(catering).toHaveBeenCalledTimes(200);
});
it("REQ-F17-05: accepts a complete short-page report and preserves accents", async () => {
  const list = vi.fn(async (_id: string, query: { offset: number }) => ({
    items: [guest(query.offset ? "b" : "a")],
    total: 2,
  }));
  const csv = await buildRsvpReportCsv(
    { list, rsvps: async () => ({ items: [] }) },
    "c",
    ["Nombre"],
  );
  expect(csv.match(/Ana Pérez/g)).toHaveLength(2);
  expect(list.mock.calls.map((call) => call[1].offset)).toEqual([0, 1]);
});
