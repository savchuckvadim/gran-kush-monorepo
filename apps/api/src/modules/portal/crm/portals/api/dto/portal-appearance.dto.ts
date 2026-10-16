import { ApiProperty } from "@nestjs/swagger";

import { Matches, ValidateIf } from "class-validator";

/** id темы CRM: строчные латинские буквы, цифры и дефис (`skins.ts`). */
const SKIN_ID = /^[a-z0-9-]{1,40}$/;

export class PortalAppearanceDto {
    @ApiProperty({
        type: String,
        nullable: true,
        example: "coqueta",
        description: "Тема клуба по умолчанию; null — тема PafPaf",
    })
    defaultSkin: string | null;
}

export class UpdatePortalAppearanceDto {
    @ApiProperty({
        type: String,
        nullable: true,
        example: "coqueta",
        description: "id темы CRM; null — тема PafPaf. Неизвестный id клиент покажет темой PafPaf",
    })
    @ValidateIf((_dto, value) => value !== null)
    @Matches(SKIN_ID)
    defaultSkin: string | null;
}
