import { Body, Controller, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

import { EmployeeAuthResponseDto } from "@employees/api/dto/employee-auth-response.dto";
import { RegisterEmployeeDto } from "@employees/api/dto/register-employee.dto";
import { EmployeeAuthService } from "@employees/application/services/employee-auth.service";
import { EmployeeRegistrationService } from "@employees/application/services/employee-registration.service";
import { EmployeesService } from "@employees/application/services/employees.service";

import { Public } from "@common/decorators/auth/public.decorator";
import { ApiErrorResponse } from "@common/decorators/response/api-error-response.decorator";
import { ApiSuccessResponse } from "@common/decorators/response/api-success-response.decorator";

@ApiTags("Employee Registration (CRM)")
@Controller("crm/auth/employee")
export class EmployeeRegistrationController {
    constructor(
        private readonly employeeRegistrationService: EmployeeRegistrationService,
        private readonly employeeAuthService: EmployeeAuthService,
        private readonly employeesService: EmployeesService
    ) {}

    @Post("register")
    @Public()
    @ApiOperation({ summary: "Register new Employee (CRM)" })
    @ApiSuccessResponse(EmployeeAuthResponseDto, {
        status: 201,
        description: "Employee registered successfully",
    })
    @ApiErrorResponse([400, 409])
    async register(@Body() dto: RegisterEmployeeDto): Promise<EmployeeAuthResponseDto> {
        // Создаем Employee
        const { userId, employeeId } = await this.employeeRegistrationService.createEmployee(dto);

        // Получаем Employee для генерации токенов
        const employee = await this.employeesService.findById(employeeId);

        if (!employee) {
            throw new Error("Failed to create employee");
        }

        // Генерируем токены
        const tokens = await this.employeeAuthService.generateTokens(employee);

        return {
            ...tokens,
            employee: {
                id: employee.id,
                email: employee.email,
                name: employee.name,
                role: employee.role,
            },
        };
    }
}
