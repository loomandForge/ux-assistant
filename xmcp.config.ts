import { type XmcpConfig } from "xmcp";

const config: XmcpConfig = {
  http: true,
  paths: {
    tools: "./src/tools",
    prompts: "./src/prompts",
    resources: "./src/resources",
  },
  bundler: (bundlerConfig) => ({
    ...bundlerConfig,
    externals: [
      ...(Array.isArray(bundlerConfig.externals) ? bundlerConfig.externals : []),
      {
        "better-sqlite3": "commonjs better-sqlite3",
        "playwright-core": "commonjs playwright-core"
      }
    ],
    resolve: {
      ...bundlerConfig.resolve,
      extensions: [".ts", ".tsx", ".js", ".jsx", ".json"],
      extensionAlias: {
        ...bundlerConfig.resolve?.extensionAlias,
        ".js": [".ts", ".tsx", ".js"],
        ".mjs": [".mts", ".mjs"]
      }
    }
  })
};

export default config;
