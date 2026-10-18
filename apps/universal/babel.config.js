module.exports = function (api) {
  api.cache(true);
  // nativewind/babel is a preset, not a plugin (NativeWind v4).
  return {
    presets: [['babel-preset-expo', { jsxImportSource: 'nativewind' }], 'nativewind/babel'],
  };
};
