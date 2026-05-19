import { ApiProperty } from "@nestjs/swagger";

import { IsObject, IsString, Matches, MinLength } from "class-validator";

import { IsEmailWithLowerCase } from "@common/decorators/dto/is-email-with-lower-case.decorator";

/** Регистрация / создание member: учётные данные + динамические поля по схеме портала. */
export class DynamicMemberCredentialsDto {
    @ApiProperty({ example: "user@example.com", type: String })
    @IsEmailWithLowerCase()
    email: string;

    @ApiProperty({
        example: "Password123",
        description: "Password must contain uppercase, lowercase and number",
        type: String,
    })
    @IsString()
    @MinLength(8)
    @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
        message: "Password must contain uppercase, lowercase and number",
    })
    password: string;
}

export class DynamicMemberRegistrationDto extends DynamicMemberCredentialsDto {
    @ApiProperty({
        description: "Field values keyed by fieldKey (see registration-schema)",
        type: "object",
        additionalProperties: true,
        example: { first_name: "John", last_name: "Doe" },
    })
    @IsObject()
    fields: Record<string, unknown>;
}

/** CRM: создание member тем же контрактом; пароль задаёт сотрудник. */
export class CrmCreateMemberDto extends DynamicMemberCredentialsDto {
    @ApiProperty({
        description: "Field values keyed by fieldKey",
        type: "object",
        additionalProperties: true,
    })
    @IsObject()
    fields: Record<string, unknown>;
}
