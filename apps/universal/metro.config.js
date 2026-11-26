const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const config = getDefaultConfig(__dirname);

// Workspace packages are TypeScript written with NodeNext-style imports ("./x.js" → x.ts).
// Metro does not map the extension, so retry a relative ".js" import without it, but only for imports written in
// workspace sources and only when the retry lands on a TypeScript file. Third-party packages (node_modules) keep
// their own resolution: postcss/lib/postcss.mjs imports "./postcss.js", and stripping the extension resolved it to
// postcss.mjs itself (a self-import: its default export was undefined and the screen crashed on load).
const JS_EXTENSION = '.js';
const TYPESCRIPT_SOURCE = /\.tsx?$/;
const NODE_MODULES = /[\\/]node_modules[\\/]/;
const resolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const resolve = resolveRequest ?? context.resolveRequest;
  if (moduleName.startsWith('.') && moduleName.endsWith(JS_EXTENSION) && !NODE_MODULES.test(context.originModulePath)) {
    try {
      const resolution = resolve(context, moduleName.slice(0, -JS_EXTENSION.length), platform);
      if (resolution.type === 'sourceFile' && TYPESCRIPT_SOURCE.test(resolution.filePath)) return resolution;
    } catch {
      // Not a TypeScript source: fall through to the regular resolution of the .js file.
    }
  }
  return resolve(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: './global.css' });
