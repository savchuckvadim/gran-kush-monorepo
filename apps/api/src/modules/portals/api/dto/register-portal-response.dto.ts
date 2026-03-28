import { ApiProperty } from "@nestjs/swagger";

import { EmployeeInfoDto } from "@auth/employees/api/dto/employee-auth-response.dto";

class PortalInfoDto {
    @ApiProperty({ example: "f5f0c2f1-c877-4f13-8b6a-5b5b7c8f9c1f", type: String })
    id: string;

    @ApiProperty({ example: "green-club", type: String })
    name: string;

    @ApiProperty({ example: "Green Club", type: String })
    displayName: string;

    @ApiProperty({ example: "active", type: String })
    status: string;
}

export class RegisterPortalResponseDto {
    @ApiProperty({ type: () => PortalInfoDto })
    portal: PortalInfoDto;

    @ApiProperty({ type: () => EmployeeInfoDto })
    owner: EmployeeInfoDto;

    @ApiProperty({
        example: "550e8400-e29b-41d4-a716-446655440000",
        description: "Передавайте в X-Device-Id; токены выставлены в HttpOnly cookies",
    })
    deviceId: string;
}
