// @see https://docs.expo.dev/guides/customizing-metro
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
const config = getDefaultConfig(projectRoot);

// npm hoists expo-constants to node_modules/expo-constants, but Metro can still
// look under node_modules/expo/node_modules/expo-constants (missing) — force the real path.
const resolveHoisted = (name) => path.resolve(projectRoot, 'node_modules', name);
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  'expo-constants': resolveHoisted('expo-constants'),
};

module.exports = config;
