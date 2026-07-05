const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);
const defaultResolveRequest =
  config.resolver.resolveRequest ||
  ((context, moduleName, platform) =>
    context.resolveRequest(context, moduleName, platform));

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
