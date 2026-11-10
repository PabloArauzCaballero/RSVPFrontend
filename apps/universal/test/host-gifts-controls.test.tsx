import { useState } from "react";
import { cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { GiftCategory, GiftChoices, GiftConsent } from "../src/host/gifts/controls.web";
import { GiftPartnerLink } from "../src/host/gifts/partner-link.web";
import { fakeClient, renderApp } from "./support";
import { LISTING_A } from "./fixtures/host-gifts";

afterEach(cleanup);

it("F23 web · category selection, mutually exclusive radios and review have native HTML semantics", () => {
  function Controls() {
    const [value, setValue] = useState("a"), [reviewed, setReviewed] = useState(false);
    const choices = [{ value: "a", label: "A" }, { value: "b", label: "B" }];
    return <><GiftCategory label="Category" value={value} choices={choices} onChange={setValue} /><GiftChoices label="Mode" value={value} choices={choices} onChange={setValue} /><GiftConsent label="Review" value={reviewed} onChange={setReviewed} /></>;
  }
  renderApp(<Controls />, fakeClient({}).client);
  const category = screen.getByRole("combobox", { name: "Category" }) as HTMLSelectElement;
  fireEvent.change(category, { target: { value: "b" } });
  const a = screen.getByRole("radio", { name: "A" }) as HTMLInputElement, b = screen.getByRole("radio", { name: "B" }) as HTMLInputElement;
  expect(a.tagName).toBe("INPUT"); expect(b.checked).toBe(true); expect(a.checked).toBe(false);
  fireEvent.click(a); expect(category.value).toBe("a"); expect(b.checked).toBe(false);
  const consent = screen.getByRole("checkbox", { name: "Review" }) as HTMLInputElement;
  fireEvent.click(consent); expect(consent.checked).toBe(true);
});

it("F23 · scans actual DOM anchors: every partner destination stays inside the redirector", () => {
  const view = renderApp(<><GiftPartnerLink listingId={LISTING_A} destination="PRODUCT_PAGE" celebrationId="c1" label="Shop" /><GiftPartnerLink listingId={LISTING_A} destination="WHATSAPP" celebrationId="c1" label="Contact" /></>, fakeClient({}).client);
  const links = view.container.querySelectorAll<HTMLAnchorElement>("a[href]"); expect(links.length).toBe(2);
  for (const link of links) {
    const url = new URL(link.href);
    expect(url.pathname).toBe(`/r/${LISTING_A}`); expect(url.searchParams.get("surface")).toBe("APP"); expect(url.searchParams.get("celebrationId")).toBe("c1");
    expect(link.rel).toContain("noopener");
  }
});

it("F23 · a partner URL cannot be supplied instead of a listing ID", () => {
  const view = renderApp(<GiftPartnerLink listingId="https://partner.example/bypass" destination="PRODUCT_PAGE" celebrationId="c1" label="Shop" />, fakeClient({}).client);
  expect(view.container.querySelectorAll("a[href]")).toHaveLength(0);
  expect(screen.getByRole("alert")).toBeTruthy();
});
