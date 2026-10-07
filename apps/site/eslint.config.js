import { nextJsConfig } from "@workspace/eslint-config/next-js";

/** @type {import("eslint").Linter.Config} */
export default [
    ...nextJsConfig,
    {
        ignores: [
            ".next/**",
            "out/**",
            "payload-types.ts",
            "app/(payload)/**",
            "modules/shared/vendor/**",
            "scripts/**",
        ],
    },
];
