import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";

import { MEMBERSHIP_NUMBER_MAX_LENGTH } from "@modules/portal/crm/members/domain/member.limits";

import { CrmMemberFieldsPatchDto } from "../crm-member.dto";

const failedFields = async (body: Record<string, unknown>): Promise<string[]> => {
    const errors = await validate(plainToInstance(CrmMemberFieldsPatchDto, body));
    return errors.map((error) => error.property);
};

describe("CrmMemberFieldsPatchDto: номер членства (TASK-670)", () => {
    it("номер длиннее колонки отклоняется до базы", async () => {
        const membershipNumber = "1".repeat(MEMBERSHIP_NUMBER_MAX_LENGTH + 1);
        expect(await failedFields({ membershipNumber })).toContain("membershipNumber");
    });

    it("номер в пределах колонки проходит", async () => {
        const membershipNumber = "1".repeat(MEMBERSHIP_NUMBER_MAX_LENGTH);
        expect(await failedFields({ membershipNumber })).toEqual([]);
    });
});
