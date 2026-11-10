// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { GuestGiftNavigation, guestWebGiftPath } from "../components/guest-app/gift-navigation";

afterEach(cleanup);
it("F21 · gift navigation keeps the credential out of rendered markup and server-bound query parameters", () => {
  const token = "T".repeat(43);
  const { container } = render(<GuestGiftNavigation slug="ana-luis" token={token} label="Lista de regalos" />);
  expect(screen.getByRole("button", { name: "Lista de regalos" })).toBeTruthy();
  expect(container.innerHTML).not.toContain(token);
  const url = new URL(guestWebGiftPath("ana-luis", token), "https://invites.test");
  expect(url.origin).toBe("https://invites.test");
  expect(url.pathname).toBe("/c/ana-luis/regalos");
  expect(url.search).toBe("");
  expect(url.hash).toBe("#t=" + token);
});
