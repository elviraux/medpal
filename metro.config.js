const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Disable minification for web builds
config.transformer = {
  ...config.transformer,
  minifierConfig: {
    compress: false,
    mangle: false,
  },
};

// Treat @fastshot/ai as source (ships raw .ts, no compiled dist)
config.watchFolders = [
  ...(config.watchFolders || []),
  path.resolve(__dirname, 'node_modules/@fastshot/ai'),
];

const fs = require('fs');

// Add support for resolving modules
config.resolver = {
  ...config.resolver,
  nodeModulesPaths: [
    path.resolve(__dirname, 'node_modules'),
    path.resolve(__dirname),
  ],
  // Fix for react-native-svg module resolution
  sourceExts: [...(config.resolver.sourceExts || []), 'svg'],
  resolverMainFields: ['react-native', 'browser', 'main'],
  // Fix .ts resolution inside @fastshot/ai (ships raw TypeScript, no dist)
  resolveRequest: (context, moduleName, platform) => {
    // Only intercept relative imports originating from @fastshot/ai
    if (
      moduleName.startsWith('.') &&
      context.originModulePath.includes(
        path.join('@fastshot', 'ai', 'src')
      )
    ) {
      const dir = path.dirname(context.originModulePath);
      const exts = ['.ts', '.tsx', '.js', '.jsx'];
      for (const ext of exts) {
        const candidate = path.resolve(dir, moduleName + ext);
        if (fs.existsSync(candidate)) {
          return { filePath: candidate, type: 'sourceFile' };
        }
      }
      // Also try index files for directory imports
      for (const ext of exts) {
        const candidate = path.resolve(dir, moduleName, 'index' + ext);
        if (fs.existsSync(candidate)) {
          return { filePath: candidate, type: 'sourceFile' };
        }
      }
    }
    // Fall back to the default resolver for everything else
    return context.resolveRequest(context, moduleName, platform);
  },
};

// Configure Metro for proxy deployment
config.server = {
  ...config.server,
  enhanceMiddleware: (middleware) => {
    return (req, res, next) => {
      // Check if we're being accessed through the proxy
      const proxyPath = req.headers['x-forwarded-prefix'];
      if (proxyPath) {
        // Inject base path into the HTML
        const originalSend = res.send;
        res.send = function(data) {
          if (typeof data === 'string' && data.includes('<head>')) {
            // Add base tag to make all relative URLs work
            data = data.replace(
              '<head>',
              `<head><base href="${proxyPath}/">`
            );
          }
          originalSend.call(this, data);
        };
      }
      return middleware(req, res, next);
    };
  },
};

// FASTSHOT_WEB_POLYFILLS_HOOK
module.exports = (() => {
  const helperPath = process.env.FASTSHOT_METRO_POLYFILL_HELPER;
  if (!helperPath) {
    return config;
  }

  try {
    const { withFastshotWebPolyfills } = require(helperPath);
    return withFastshotWebPolyfills(config, {
      polyfillsDir: process.env.FASTSHOT_WEB_POLYFILLS_DIR,
    });
  } catch (error) {
    console.warn('[Fastshot] Failed to apply web polyfills helper:', error);
    return config;
  }
})();
