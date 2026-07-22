import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

import { EmployeeRole } from "@prisma/client";
import { IsEnum, IsObject, IsOptional } from "class-validator";

import { IsEmailWithLowerCase } from "@common/decorators/dto/is-email-with-lower-case.decorator";

/**
 * Создание сотрудника admin'ом. Пароль не задаётся: если аккаунта нет,
 * он создаётся в статусе pending_claim и клеймится пользователем позже.
 */
export class RegisterEmployeeDto {
    @ApiProperty({ example: "employee@example.com", type: String })
    @IsEmailWithLowerCase()
    email: string;

    @ApiProperty({ enum: EmployeeRole, example: EmployeeRole.employee })
    @IsEnum(EmployeeRole)
    role: EmployeeRole;

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

export class RegisterEmployeeResponseDto {
    @ApiProperty({ type: String })
    userId: string;

    @ApiProperty({ type: String })
    employeeId: string;

    @ApiProperty({ type: Boolean, description: "true если аккаунт создан сейчас и ждёт клейма" })
    isNewUser: boolean;
}
