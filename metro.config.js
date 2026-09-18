const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);
const defaultResolveRequest =
  config.resolver.resolveRequest ||
  ((context, moduleName, platform) =>
    context.resolveRequest(context, moduleName, platform));

// SVG → string w bundlu JS (metro.svg-transformer). Nie wolno trzymać ich
// jako assetów: w APK Android pakuje je do android_res, którego File/fetch
// nie odczyta — intro i logo znikają tylko w buildzie, nie w Expo Go.
config.transformer.babelTransformerPath = require.resolve('./metro.svg-transformer.js');
config.resolver.assetExts = config.resolver.assetExts.filter((ext) => ext !== 'svg');
if (!config.resolver.sourceExts.includes('svg')) {
  config.resolver.sourceExts.push('svg');
}

// Wymusza użycie skompilowanej wersji (lib) zamiast src dla react-native-gesture-handler,
// co rozwiązuje błąd "Unable to resolve ./components/gestureHandlerRootHOC"
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'react-native-gesture-handler') {
    return {
      type: 'sourceFile',
      filePath: path.resolve(
        __dirname,
        'node_modules/react-native-gesture-handler/lib/commonjs/index.js'
      ),
    };
  }
  return defaultResolveRequest(context, moduleName, platform);
};

module.exports = config;
