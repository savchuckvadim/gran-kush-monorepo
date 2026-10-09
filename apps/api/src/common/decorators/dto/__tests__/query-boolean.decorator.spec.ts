import { plainToInstance } from "class-transformer";
import { IsOptional, validateSync } from "class-validator";

import { ProductFilterDto } from "@modules/portal/crm/catalog/api/dto/product.dto";

import { IsQueryBoolean } from "../query-boolean.decorator";

class FlagDto {
    @IsOptional()
    @IsQueryBoolean()
    flag?: boolean;
}

describe("IsQueryBoolean", () => {
    it.each([
        ["true", true],
        ["false", false],
        [true, true],
        [false, false],
    ])("%p → %p", (input, expected) => {
        const dto = plainToInstance(FlagDto, { flag: input });
        expect(dto.flag).toBe(expected);
        expect(validateSync(dto)).toHaveLength(0);
    });

    it("мусор не превращается в true, а отклоняется", () => {
        const dto = plainToInstance(FlagDto, { flag: "maybe" });
        expect(validateSync(dto)).toHaveLength(1);
    });

    it("отсутствующее поле проходит", () => {
        expect(validateSync(plainToInstance(FlagDto, {}))).toHaveLength(0);
    });

    it("ProductFilterDto: isActive=false остаётся false", () => {
        const dto = plainToInstance(ProductFilterDto, { isActive: "false", isAvailable: "true" });
        expect(dto.isActive).toBe(false);
        expect(dto.isAvailable).toBe(true);
    });
});
