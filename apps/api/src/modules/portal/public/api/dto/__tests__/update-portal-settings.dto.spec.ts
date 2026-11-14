import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";

import { PUBLIC_PORTAL_LIMITS } from "@modules/portal/public/public-portal.limits";

import { UpdatePortalSettingsDto } from "../public-portals.dto";

const failedFields = async (body: Record<string, unknown>): Promise<string[]> => {
    const errors = await validate(plainToInstance(UpdatePortalSettingsDto, body));
    return errors.map((error) => error.property);
};

describe("UpdatePortalSettingsDto: публичный профиль клуба (TASK-670)", () => {
    it("описание длиннее потолка отклоняется", async () => {
        const publicDescription = "a".repeat(PUBLIC_PORTAL_LIMITS.publicDescriptionLength + 1);
        expect(await failedFields({ publicDescription })).toContain("publicDescription");
    });

    it.each(["javascript:alert(1)", "data:image/png;base64,AAAA", "not a url", "ftp://x.es/a.png"])(
        "обложка %s отклоняется",
        async (coverImageUrl) => {
            expect(await failedFields({ coverImageUrl })).toContain("coverImageUrl");
        }
    );

    it("https-обложка и пустые значения проходят", async () => {
        expect(await failedFields({ coverImageUrl: "https://cdn.club.es/cover.jpg" })).toEqual([]);
        expect(await failedFields({ coverImageUrl: null, publicDescription: null })).toEqual([]);
    });
});
