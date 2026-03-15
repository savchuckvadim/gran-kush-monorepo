import js from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
import onlyWarn from "eslint-plugin-only-warn";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import turboPlugin from "eslint-plugin-turbo";
import tseslint from "typescript-eslint";

/**
 * A shared ESLint configuration for the repository.
 *
 * @type {import("eslint").Linter.Config}
 * */
export const config = [
    js.configs.recommended,
    eslintConfigPrettier,
    ...tseslint.configs.recommended,
    {
        plugins: {
            turbo: turboPlugin,
        },
        rules: {
            "turbo/no-undeclared-env-vars": "warn",
        },
    },
    {
        plugins: {
            "simple-import-sort": simpleImportSort,
            onlyWarn,
        },
        rules: {
            "simple-import-sort/imports": [
                "warn",
                {
                    groups: [
                        // React & Next.js
                        ["^react$", "^react-dom", "^next"],
                        // External packages
                        ["^@?\\w"],
                        // Workspace packages
                        ["^@workspace/"],
                        // Internal aliases (@/, @common/, @modules/, etc.)
                        ["^@/", "^@common", "^@modules"],
                        // Parent imports (../)
                        ["^\\.\\."],
                        // Sibling imports (./)
                        ["^\\."],
                        // Style imports
                        ["^.+\\.css$"],
                    ],
                },
            ],
            "simple-import-sort/exports": "warn",
        },
    },
    {
        ignores: ["dist/**"],
    },
];
