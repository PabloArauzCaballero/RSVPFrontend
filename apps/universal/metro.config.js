const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const config = getDefaultConfig(__dirname);

// Workspace packages are TypeScript written with NodeNext-style imports ("./x.js" → x.ts).
// Metro does not map the extension, so retry a relative ".js" import without it.
const JS_EXTENSION = '.js';
const resolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const resolve = resolveRequest ?? context.resolveRequest;
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
