import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { readFileSync } from "fs";
import { resolve } from "path";

import { RegisterPortalDto } from "@modules/portal/crm/portals/api/dto/register-portal.dto";

import { isReservedPortalSlug, RESERVED_PORTAL_SLUGS } from "../reserved-slugs";

const CRM_ROUTES = resolve(__dirname, "../../../../../crm/modules/shared/config/club-routes.ts");

describe("зарезервированные slug клуба", () => {
    it("список API совпадает со списком CRM (его читает proxy кабинета)", () => {
        const source = readFileSync(CRM_ROUTES, "utf8");
        const block = /RESERVED_CLUB_SLUGS = \[([\s\S]*?)\] as const/.exec(source)?.[1] ?? "";
        const crm = [...block.matchAll(/"([^"]+)"/g)].map((match) => match[1]);

        expect(crm.length).toBeGreaterThan(0);
        expect([...RESERVED_PORTAL_SLUGS].sort()).toEqual([...crm].sort());
    });

    it("служебные пути кабинета, языки и поддомены заняты", () => {
        for (const slug of ["auth", "me", "join", "consent", "crm", "club", "es", "ru", "en"]) {
            expect(isReservedPortalSlug(slug)).toBe(true);
        }
        expect(isReservedPortalSlug("AUTH")).toBe(true);
        expect(isReservedPortalSlug("green-club")).toBe(false);
    });

    describe("регистрация клуба", () => {
        const validate$ = async (name: string) =>
            validate(
                plainToInstance(RegisterPortalDto, {
                    name,
                    displayName: "Club",
                    email: "owner@test.local",
                    password: "Password123",
                    ownerName: "Owner",
                    acceptTerms: true,
                })
            );

        it("клуб с зарезервированным адресом отклоняется", async () => {
            const errors = await validate$("auth");
            expect(errors.map((error) => error.property)).toContain("name");
        });

        it("обычный адрес проходит", async () => {
            expect(await validate$("green-club")).toEqual([]);
        });
    });
});
