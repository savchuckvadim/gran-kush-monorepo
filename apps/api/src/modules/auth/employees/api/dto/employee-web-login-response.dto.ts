import { ApiProperty } from "@nestjs/swagger";

import { EmployeeInfoDto } from "@auth/employees/api/dto/employee-auth-response.dto";

/** Веб CRM: токены только в HttpOnly cookies; в теле — профиль и device id для клиента. */
export class EmployeeWebLoginResponseDto {
    @ApiProperty({ type: () => EmployeeInfoDto })
    employee: EmployeeInfoDto;

    @ApiProperty({
        example: "550e8400-e29b-41d4-a716-446655440000",
        description: "Сохраните и передавайте в заголовке X-Device-Id при следующих запросах",
    })
    deviceId: string;
}
