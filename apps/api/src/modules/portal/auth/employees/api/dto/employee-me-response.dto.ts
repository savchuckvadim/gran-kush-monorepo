import { ApiProperty } from "@nestjs/swagger";

import { EmployeeRole } from "@prisma/client";

export class EmployeeEmploymentDto {
    @ApiProperty({ example: "f5f0c2f1-c877-4f13-8b6a-5b5b7c8f9c1f", type: String })
    portalId: string;

    @ApiProperty({ example: "123e4567-e89b-12d3-a456-426614174999", type: String })
    employeeId: string;

    @ApiProperty({ enum: EmployeeRole, example: EmployeeRole.manager })
    role: EmployeeRole;

    @ApiProperty({ example: true, type: Boolean })
    isActive: boolean;
}

/** Глобальный аккаунт CRM: user + его employment-мосты по порталам. */
export class EmployeeMeResponseDto {
    @ApiProperty({ example: "123e4567-e89b-12d3-a456-426614174000", type: String })
    id: string;

    @ApiProperty({ example: "employee@example.com", type: String })
    email: string;

    @ApiProperty({ type: () => [EmployeeEmploymentDto] })
    employments: EmployeeEmploymentDto[];
}
