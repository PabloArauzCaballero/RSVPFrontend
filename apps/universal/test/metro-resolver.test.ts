// @vitest-environment node
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);

type Resolution = { type: "sourceFile"; filePath: string };
type Context = { originModulePath: string; resolveRequest: (context: Context, moduleName: string, platform: string | null) => Resolution };
type CreateResolveRequest = (root: string, base?: Context["resolveRequest"]) => Context["resolveRequest"];

const { createResolveRequest } = require("../metro-resolver.js") as { createResolveRequest: CreateResolveRequest };

/** Stands in for Metro's default resolution: it knows which module names exist and where they land. */
const contextFor = (originModulePath: string, files: Record<string, string>): Context => ({
  originModulePath,
  resolveRequest: (_context, moduleName) => {
    const filePath = files[moduleName];
    if (filePath === undefined) throw new Error(`unable to resolve ${moduleName}`);
    return { type: "sourceFile", filePath };
  }
});
const resolveFrom = (root: string, origin: string, files: Record<string, string>, request: string): string =>
  createResolveRequest(root)(contextFor(origin, files), request, "web").filePath;

describe("metro resolver: NodeNext '.js' imports", () => {
  it("maps a relative '.js' import written in a workspace source to its TypeScript file", () => {
    expect(resolveFrom("/repo", "/repo/packages/design-editor/src/custom/css.ts", { "./html": "/repo/packages/design-editor/src/custom/html.ts" }, "./html.js"))
      .toBe("/repo/packages/design-editor/src/custom/html.ts");
  });

  it("does not rewrite a '.js' import inside node_modules: postcss.mjs imports './postcss.js', never itself", () => {
    const origin = "/repo/node_modules/postcss/lib/postcss.mjs";
    expect(resolveFrom("/repo", origin, { "./postcss": origin, "./postcss.js": "/repo/node_modules/postcss/lib/postcss.js" }, "./postcss.js"))
      .toBe("/repo/node_modules/postcss/lib/postcss.js");
  });

  it("node_modules guard: a dependency with a TypeScript twin keeps its '.js' file", () => {
    expect(resolveFrom("/repo", "/repo/node_modules/pkg/lib/a.js", { "./b": "/repo/node_modules/pkg/lib/b.ts", "./b.js": "/repo/node_modules/pkg/lib/b.js" }, "./b.js"))
      .toBe("/repo/node_modules/pkg/lib/b.js");
  });

  it("keeps the real '.js' file when the workspace import has no TypeScript twin", () => {
    expect(resolveFrom("/repo", "/repo/packages/x/src/a.ts", { "./b": "/repo/packages/x/src/b.mjs", "./b.js": "/repo/packages/x/src/b.js" }, "./b.js"))
      .toBe("/repo/packages/x/src/b.js");
  });

  it("a checkout that lives under a node_modules directory still maps its own sources, and still skips its dependencies", () => {
    const root = "/srv/node_modules/checkout";
    expect(resolveFrom(root, `${root}/packages/x/src/a.ts`, { "./b": `${root}/packages/x/src/b.ts` }, "./b.js")).toBe(`${root}/packages/x/src/b.ts`);
    const files = { "./b": `${root}/node_modules/pkg/b.ts`, "./b.js": `${root}/node_modules/pkg/b.js` };
    expect(resolveFrom(root, `${root}/node_modules/pkg/a.js`, files, "./b.js")).toBe(`${root}/node_modules/pkg/b.js`);
  });
});
