import { ApiProperty } from "@nestjs/swagger";

import { EmployeeRoleDto } from "@modules/portal/crm/access/api/dto/portal-role.dto";
import { ALL_PERMISSIONS, Permission } from "@modules/portal/crm/access/domain/permissions";

export class EmployeeEmploymentDto {
    @ApiProperty({ example: "f5f0c2f1-c877-4f13-8b6a-5b5b7c8f9c1f", type: String })
    portalId: string;

    @ApiProperty({ example: "123e4567-e89b-12d3-a456-426614174999", type: String })
    employeeId: string;

    @ApiProperty({ type: () => EmployeeRoleDto })
    role: EmployeeRoleDto;

    @ApiProperty({
        enum: ALL_PERMISSIONS,
        enumName: "Permission",
        isArray: true,
        description: "Права роли в этом клубе — по ним CRM прячет разделы и кнопки",
    })
    permissions: Permission[];

    @ApiProperty({ example: true, type: Boolean })
    isActive: boolean;
}

/** Глобальный аккаунт CRM: user + его employment-мосты по порталам. */
export class EmployeeMeResponseDto {
    @ApiProperty({ example: "123e4567-e89b-12d3-a456-426614174000", type: String })
    id: string;

    @ApiProperty({ example: "employee@example.com", type: String })
    email: string;

    @ApiProperty({ example: false, type: Boolean })
    emailConfirmed: boolean;

    @ApiProperty({ type: () => [EmployeeEmploymentDto] })
    employments: EmployeeEmploymentDto[];

    @ApiProperty({
        type: Boolean,
        description:
            "Аккаунт ещё и участник клуба (подтверждённое членство): CRM показывает «Мой кабинет»",
    })
    hasMemberships: boolean;
}
