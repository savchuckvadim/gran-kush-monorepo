import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

import { IsObject, IsOptional } from "class-validator";

import { IsEmailWithLowerCase } from "@common/decorators/dto/is-email-with-lower-case.decorator";
import { IsRoleKey } from "@modules/portal/crm/access/api/dto/role-key.decorator";

/**
 * Создание сотрудника по email. Если аккаунта нет — создаётся pending_claim,
 * пользователь клеймит его при регистрации.
 */
export class CreateEmployeeDto {
    @ApiProperty({ type: String, example: "employee@example.com" })
    @IsEmailWithLowerCase()
    email: string;

    @ApiProperty({ type: String, example: "employee", description: "Ключ роли клуба" })
    @IsRoleKey()
    role: string;

    @ApiPropertyOptional({
        type: "object",
        additionalProperties: true,
        description: "Динамические поля профиля (fieldKey → value)",
        example: { first_name: "John", last_name: "Doe" },
    })
    @IsOptional()
    @IsObject()
    fields?: Record<string, unknown>;
}

export class CreateEmployeeResponseDto {
    @ApiProperty({ type: String })
    employeeId: string;

    @ApiProperty({ type: String })
    userId: string;

    @ApiProperty({ type: Boolean, description: "true если аккаунт создан сейчас и ждёт клейма" })
    isNewUser: boolean;
}
