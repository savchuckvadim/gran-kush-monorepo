import { Injectable } from "@nestjs/common";

import {
    RegisterEmployeeDto,
    RegisterEmployeeResponseDto,
} from "@modules/portal/auth/employees/api/dto/register-employee.dto";
import { EmployeeRegistrationService } from "@modules/portal/auth/employees/application/services/employee-registration.service";

@Injectable()
export class EmployeeRegistrationUseCase {
    constructor(private readonly employeeRegistrationService: EmployeeRegistrationService) {}

    async execute(
        dto: RegisterEmployeeDto,
        portalId: string
    ): Promise<RegisterEmployeeResponseDto> {
        return this.employeeRegistrationService.createEmployee(dto, portalId);
    }
}
