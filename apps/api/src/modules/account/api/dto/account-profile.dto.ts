import { ApiProperty } from "@nestjs/swagger";

import { Transform } from "class-transformer";
import { IsDateString, IsString, MaxLength, ValidateIf } from "class-validator";

/** Пустая строка из формы — то же, что «не указано». */
const emptyToNull = ({ value }: { value: unknown }) =>
    typeof value === "string" && value.trim() === "" ? null : value;

export class AccountProfileDto {
    @ApiProperty({ type: String, nullable: true, example: "Ana" })
    firstName: string | null;

    @ApiProperty({ type: String, nullable: true, example: "García" })
    lastName: string | null;

    @ApiProperty({ type: String, nullable: true, example: "1990-05-10", description: "YYYY-MM-DD" })
    birthday: string | null;

    @ApiProperty({ type: String, nullable: true, example: "+34 600 000 000" })
    phone: string | null;

    @ApiProperty({ type: String, nullable: true, example: "Calle Mayor 1, Madrid" })
    address: string | null;

    @ApiProperty({
        type: Object,
        additionalProperties: { type: "string" },
        description: "Профиль ключами полей анкеты клуба (first_name, …) — для предзаполнения",
    })
    memberFields: Record<string, string>;
}

/** Профиль сохраняется целиком: поле `null` или пустое — «не указано». */
export class SaveAccountProfileDto {
    @ApiProperty({ type: String, nullable: true })
    @Transform(emptyToNull)
    @ValidateIf((_dto, value) => value !== null)
    @IsString()
    @MaxLength(120)
    firstName: string | null;

    @ApiProperty({ type: String, nullable: true })
    @Transform(emptyToNull)
    @ValidateIf((_dto, value) => value !== null)
    @IsString()
    @MaxLength(120)
    lastName: string | null;

    @ApiProperty({ type: String, nullable: true, description: "YYYY-MM-DD" })
    @Transform(emptyToNull)
    @ValidateIf((_dto, value) => value !== null)
    @IsDateString({ strict: true })
    birthday: string | null;

    @ApiProperty({ type: String, nullable: true })
    @Transform(emptyToNull)
    @ValidateIf((_dto, value) => value !== null)
    @IsString()
    @MaxLength(40)
    phone: string | null;

    @ApiProperty({ type: String, nullable: true })
    @Transform(emptyToNull)
    @ValidateIf((_dto, value) => value !== null)
    @IsString()
    @MaxLength(500)
    address: string | null;
}
