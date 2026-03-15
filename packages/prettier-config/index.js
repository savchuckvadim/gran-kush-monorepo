/**
 * Shared Prettier configuration for the monorepo
 * Includes import sorting with @trivago/prettier-plugin-sort-imports
 */

module.exports = {
    // Basic formatting
    semi: true,
    singleQuote: false,
    tabWidth: 4,
    useTabs: false,
    trailingComma: "es5",
    printWidth: 100,
    arrowParens: "always",
    endOfLine: "lf",

    // Use babel-ts parser for better decorator support in NestJS
    // This parser uses Babel which can be configured for decorators
    parser: "babel-ts",

    // Import sorting plugin
    plugins: ["@trivago/prettier-plugin-sort-imports", "prettier-plugin-prisma"],

    // Override parser for specific file types
    overrides: [
        {
            files: "*.ts",
            options: {
                parser: "babel-ts",
            },
        },
        {
            files: "*.tsx",
            options: {
                parser: "babel-ts",
            },
        },
        {
            files: "*.css",
            options: {
                parser: "css",
            },
        },
        {
            files: "*.json",
            options: {
                parser: "json",
            },
        },
        {
            files: "*.md",
            options: {
                parser: "markdown",
            },
        },
        {
            files: "*.prisma",
            options: {
                parser: "prisma",
            },
        },
    ],

    // Import sorting configuration
    importOrder: [
        // React and Next.js imports first
        "^react$",
        "^next",
        "^react-dom",
        "<THIRD_PARTY_MODULES>",
        // Workspace packages
        "^@workspace",
        // Internal modules (absolute imports with @/)
        "^@/",
        // Relative imports
        "^[./]",
    ],
    importOrderSeparation: true,
    importOrderSortSpecifiers: true,
    importOrderGroupNamespaceSpecifiers: true,
    importOrderCaseInsensitive: true,
};
