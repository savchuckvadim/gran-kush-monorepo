import { nextJsConfig } from "@workspace/eslint-config/next-js";

/**
 * Код кабинета участника (дерево `app/[locale]/m`, его страницы, сущности и оболочка) ходит в API
 * только через `$cabinetApi`: у CRM-клиента `$api` другие куки и другой принципал.
 */
const CABINET_CODE = [
    "app/\\[locale\\]/m/**",
    "modules/pages/cabinet*/**",
    "modules/entities/cabinet-*/**",
    "modules/entities/membership/**",
    "modules/features/cabinet-*/**",
    "modules/features/member-auth/**",
    "modules/processes/member-auth/**",
    "modules/widgets/cabinet-*/**",
    "modules/widgets/member-shell/**",
];

const CRM_CLIENT_MESSAGE =
    "В коде кабинета участника — только $cabinetApi: $api — клиент сотрудника CRM.";

/** @type {import("eslint").Linter.Config} */
export default [
    ...nextJsConfig,
    {
        ignores: [".next/**", "out/**", ".prettierrc.cjs"],
    },
    {
        files: CABINET_CODE,
        rules: {
            "no-restricted-imports": [
                "error",
                {
                    paths: [
                        {
                            name: "@/modules/shared",
                            importNames: ["$api"],
                            message: CRM_CLIENT_MESSAGE,
                        },
                        {
                            name: "@/modules/shared/api",
                            importNames: ["$api"],
                            message: CRM_CLIENT_MESSAGE,
                        },
                    ],
                },
            ],
        },
    },
];
