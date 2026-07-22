import { ApiProperty } from "@nestjs/swagger";

import { EmployeeRole } from "@prisma/client";

export class EmployeePortalRoleDto {
    @ApiProperty({ example: "f5f0c2f1-c877-4f13-8b6a-5b5b7c8f9c1f", type: String })
    portalId: string;

    @ApiProperty({ enum: EmployeeRole, example: EmployeeRole.manager })
    role: EmployeeRole;
}

export class EmployeeInfoDto {
    @ApiProperty({ example: "123e4567-e89b-12d3-a456-426614174000", type: String })
    id: string;

    @ApiProperty({ example: "employee@example.com", type: String })
    email: string;

    @ApiProperty({ type: () => [EmployeePortalRoleDto] })
    portals: EmployeePortalRoleDto[];
}

export class EmployeeAuthResponseDto {
    @ApiProperty({ example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...", type: String })
    accessToken: string;

    @ApiProperty({ example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...", type: String })
    refreshToken: string;

    @ApiProperty({ type: () => EmployeeInfoDto })
    employee: EmployeeInfoDto;
}
