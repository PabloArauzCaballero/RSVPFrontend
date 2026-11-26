// @vitest-environment node
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);

type Resolution = { type: "sourceFile"; filePath: string };
type Context = { originModulePath: string; resolveRequest: (context: Context, moduleName: string, platform: string | null) => Resolution };
type MetroConfig = { resolver: { resolveRequest: (context: Context, moduleName: string, platform: string | null) => Resolution } };

const config = require("../metro.config.js") as MetroConfig;

/** Stands in for Metro's default resolution: it knows which module names exist and where they land. */
const contextFor = (originModulePath: string, files: Record<string, string>): Context => ({
  originModulePath,
  resolveRequest: (_context, moduleName) => {
    const filePath = files[moduleName];
    if (filePath === undefined) throw new Error(`unable to resolve ${moduleName}`);
    return { type: "sourceFile", filePath };
  }
});

describe("metro resolver: NodeNext '.js' imports", () => {
  it("maps a relative '.js' import written in a workspace source to its TypeScript file", () => {
    const context = contextFor("/repo/packages/design-editor/src/custom/css.ts", { "./html": "/repo/packages/design-editor/src/custom/html.ts" });
    expect(config.resolver.resolveRequest(context, "./html.js", "web").filePath).toBe("/repo/packages/design-editor/src/custom/html.ts");
  });

  it("does not rewrite a '.js' import inside node_modules: postcss.mjs imports './postcss.js', never itself", () => {
    const origin = "/repo/node_modules/postcss/lib/postcss.mjs";
    const context = contextFor(origin, { "./postcss": origin, "./postcss.js": "/repo/node_modules/postcss/lib/postcss.js" });
    expect(config.resolver.resolveRequest(context, "./postcss.js", "web").filePath).toBe("/repo/node_modules/postcss/lib/postcss.js");
  });

  it("keeps the real '.js' file when the workspace import has no TypeScript twin", () => {
    const context = contextFor("/repo/packages/x/src/a.ts", { "./b": "/repo/packages/x/src/b.mjs", "./b.js": "/repo/packages/x/src/b.js" });
    expect(config.resolver.resolveRequest(context, "./b.js", "web").filePath).toBe("/repo/packages/x/src/b.js");
  });
});
