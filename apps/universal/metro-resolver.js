const path = require('path');

// Workspace packages are TypeScript written with NodeNext-style imports ("./x.js" → x.ts).
// Metro does not map the extension, so retry a relative ".js" import without it, but only for imports written in
// workspace sources and only when the retry lands on a TypeScript file. Third-party packages (node_modules) keep
// their own resolution: postcss/lib/postcss.mjs imports "./postcss.js", and stripping the extension resolved it to
// postcss.mjs itself (a self-import: its default export was undefined and the screen crashed on load).
// Consequence: a third-party dependency that ships TypeScript with NodeNext imports is no longer resolved by this
// shortcut. The guard compares the path relative to the monorepo root, so a checkout that lives under a directory
// named node_modules still maps its own sources.
const JS_EXTENSION = '.js';
const TYPESCRIPT_SOURCE = /\.tsx?$/;
const NODE_MODULES = /(^|[\\/])node_modules([\\/])/;

/** Wraps Metro's resolveRequest. `monorepoRoot` is the checkout root; `baseResolveRequest` may be undefined. */
function createResolveRequest(monorepoRoot, baseResolveRequest) {
  return (context, moduleName, platform) => {
    const resolve = baseResolveRequest ?? context.resolveRequest;
    const origin = path.relative(monorepoRoot, context.originModulePath);
    if (moduleName.startsWith('.') && moduleName.endsWith(JS_EXTENSION) && !NODE_MODULES.test(origin)) {
      try {
        const resolution = resolve(context, moduleName.slice(0, -JS_EXTENSION.length), platform);
        if (resolution.type === 'sourceFile' && TYPESCRIPT_SOURCE.test(resolution.filePath)) return resolution;
      } catch {
        // Not a TypeScript source: fall through to the regular resolution of the .js file.
      }
    }
    return resolve(context, moduleName, platform);
  };
}

module.exports = { createResolveRequest };
