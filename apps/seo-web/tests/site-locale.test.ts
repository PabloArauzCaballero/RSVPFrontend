import { NextRequest } from "next/server";
import { afterEach, describe, expect, it } from "vitest";
import { middleware } from "../middleware";
import { fromAcceptLanguage } from "../lib/locale-negotiation";
import { siteI18n } from "../lib/site-locale";
import { requestHeaders } from "./setup";

const request = (path: string, init: { acceptLanguage?: string; cookie?: string } = {}) => new NextRequest(`http://localhost:3000${path}`, { headers: { ...(init.acceptLanguage ? { "accept-language": init.acceptLanguage } : {}), ...(init.cookie ? { cookie: init.cookie } : {}) } });
const localeOf = (response: Response) => response.headers.get("x-middleware-request-x-site-locale");

afterEach(() => requestHeaders.delete("x-site-locale"));

describe("site language (middleware + siteI18n)", () => {
  it("negotiates Accept-Language: English and Spanish variants, Spanish by default", () => {
    expect(fromAcceptLanguage("en-GB,en;q=0.9")).toBe("en-US");
    expect(fromAcceptLanguage("es-AR")).toBe("es-BO");
    expect(fromAcceptLanguage("fr-FR,de;q=0.8")).toBe("es-BO");
    expect(fromAcceptLanguage(null)).toBe("es-BO");
  });

  it("?lang wins over the browser and is remembered; an invalid ?lang is ignored", () => {
    const explicit = middleware(request("/proveedores?lang=en-US", { acceptLanguage: "es-BO" }));
    expect(localeOf(explicit)).toBe("en-US");
    expect(explicit.cookies.get("rsvp-lang")?.value).toBe("en-US");
    const invalid = middleware(request("/proveedores?lang=fr-FR", { acceptLanguage: "en-US" }));
    expect(localeOf(invalid)).toBe("en-US");
    expect(invalid.cookies.get("rsvp-lang")).toBeUndefined();
  });

  it("the cookie beats Accept-Language outside celebration and RSVP pages, never inside them", () => {
    expect(localeOf(middleware(request("/proveedores", { acceptLanguage: "es-BO", cookie: "rsvp-lang=en-US" })))).toBe("en-US");
    expect(localeOf(middleware(request("/c/ana-y-luis", { acceptLanguage: "es-BO", cookie: "rsvp-lang=en-US" })))).toBe("es-BO");
    const own = middleware(request("/c/ana-y-luis?lang=en-US"));
    expect(own.cookies.get("rsvp-lang")).toBeUndefined();
  });

  it("answers Vary so caches never mix languages", () => {
    expect(middleware(request("/")).headers.get("vary")).toMatch(/Accept-Language/);
  });

  it("siteI18n translates by the request header and falls back to es-BO", async () => {
    expect((await siteI18n()).locale).toBe("es-BO");
    requestHeaders.set("x-site-locale", "en-US");
    const { locale, t } = await siteI18n();
    expect(locale).toBe("en-US");
    expect(t("landing.notFound.home")).toBe("Go to the home page");
    requestHeaders.set("x-site-locale", "xx");
    expect((await siteI18n()).locale).toBe("es-BO");
  });
});
