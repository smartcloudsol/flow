const defaultConfig = require("@wordpress/scripts/config/webpack.config");
const path = require("path");

module.exports = function () {
    const config = {
        ...defaultConfig,
        externals: {
            ...defaultConfig.externals,
            "@mantine/core": "WpSuiteMantine",
            "@mantine/hooks": "WpSuiteMantine",
            "crypto": "WpSuiteCrypto",
            "jose": "WpSuiteJose",
        },
        optimization: {
            ...defaultConfig.optimization,
            splitChunks: {
                name: (module, chunks, cacheGroupKey) => {
                    const allChunksNames = chunks.map((chunk) => chunk.name).join('-');
                    return allChunksNames;
                },
            },
        },
        plugins: [
            ...(defaultConfig.plugins
                ? defaultConfig.plugins.filter(
                    (plugin) => plugin?.constructor.name !== "RtlCssPlugin"
                )
                : []),
        ],
    };

    return config;
}
