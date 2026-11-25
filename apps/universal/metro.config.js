const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const config = getDefaultConfig(__dirname);

// Workspace packages are TypeScript written with NodeNext-style imports ("./x.js" → x.ts).
// Metro does not map the extension, so retry a relative ".js" import without it.
const JS_EXTENSION = '.js';
const resolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const resolve = resolveRequest ?? context.resolveRequest;
  // The invitation renderer (design/render -> custom/css) parses advanced CSS with postcss. Metro takes postcss's ESM wrapper
  // (postcss.mjs), which re-enters its own CJS entry and evaluates with `default` undefined: the web bundle then throws
  // «Cannot read properties of undefined (reading 'stringify')» when it loads. The CJS entry is the same code without the wrapper.
  if (moduleName === 'postcss') return { type: 'sourceFile', filePath: require('node:path').join(require('node:path').dirname(require.resolve('postcss/package.json')), 'lib', 'postcss.js') };
  if (moduleName.startsWith('.') && moduleName.endsWith(JS_EXTENSION)) {
    try {
      return resolve(context, moduleName.slice(0, -JS_EXTENSION.length), platform);
    } catch {
      // Not a TypeScript source: fall through to the regular resolution of the .js file.
    }
  }
  return resolve(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: './global.css' });
