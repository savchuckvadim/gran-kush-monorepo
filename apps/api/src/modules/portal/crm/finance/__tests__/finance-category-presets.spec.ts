import { PortalTypeEnum } from "@prisma/client";
import { readFileSync } from "fs";
import { join } from "path";

import { categoryCodeFrom, categoryPresetsFor } from "../domain/ledger/finance-category";

const MIGRATION = join(
    __dirname,
    "../../../../../../prisma/migrations/20261021000100_finance_category_presets/migration.sql"
);

/** Строки VALUES миграции: (scope, code, direction, pgc, treatment, sort). */
const migrationRows = () =>
    [
        ...readFileSync(MIGRATION, "utf8").matchAll(
            /\('(club|studio|any)', '([a-z_]+)', '(income|expense)', '([0-9]+)', (NULL|'[a-z_]+'), ([0-9]+)\)/g
        ),
    ].map(([, scope, code, direction, pgc, treatment, sort]) => ({
        scope,
        code,
        direction,
        pgcAccount: pgc,
        taxTreatment: treatment === "NULL" ? null : treatment.replace(/'/g, ""),
        sort: Number(sort),
    }));

/** Пресет так, как его вставит миграция клубу или студии. */
const fromMigration = (type: "club" | "studio") => {
    const offset = type === "club" ? 40 : 30;
    return migrationRows()
        .filter((row) => row.scope === type || row.scope === "any")
        .map(({ scope, sort, ...row }) => ({
            ...row,
            sortOrder: scope === "any" ? sort + offset : sort,
        }));
};

describe("пресет статей", () => {
    it("миграция данных вставляет тот же пресет, что и включение модуля", () => {
        const strip = (type: PortalTypeEnum) =>
            categoryPresetsFor(type).map(({ label: _label, ...preset }) => preset);
        expect(fromMigration("club")).toEqual(strip(PortalTypeEnum.CLUB));
        expect(fromMigration("studio")).toEqual(strip(PortalTypeEnum.TATTOO_STUDIO));
    });

    it("у клуба взносы вне IVA и статья заказов; у студии — услуги", () => {
        const club = categoryPresetsFor(PortalTypeEnum.CLUB);
        expect(club.find((c) => c.code === "membership_fees")?.taxTreatment).toBe("not_subject");
        expect(club.filter((c) => c.code === "sales")).toHaveLength(1);
        expect(categoryPresetsFor(PortalTypeEnum.BEAUTY_STUDIO).map((c) => c.code)).toContain(
            "services"
        );
    });

    it("код своей статьи — латиница из названия", () => {
        expect(categoryCodeFrom("Seguridad privada")).toBe("seguridad_privada");
        expect(categoryCodeFrom("Электричество")).toBe("category");
        expect(categoryCodeFrom("Café & Té")).toBe("cafe_te");
    });
});
