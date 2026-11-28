const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
const { withNativeWind } = require('nativewind/metro');
const { createResolveRequest } = require('./metro-resolver');
const config = getDefaultConfig(__dirname);

// NodeNext ".js" → ".ts" shortcut for workspace sources; see metro-resolver.js (it leaves node_modules alone).
config.resolver.resolveRequest = createResolveRequest(path.resolve(__dirname, '../..'), config.resolver.resolveRequest);

module.exports = withNativeWind(config, { input: './global.css' });
