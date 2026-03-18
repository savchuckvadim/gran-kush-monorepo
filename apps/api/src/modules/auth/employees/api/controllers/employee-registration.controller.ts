import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

import { EmployeeAuthResponseDto } from "@auth/employees/api/dto/employee-auth-response.dto";
import { RegisterEmployeeDto } from "@auth/employees/api/dto/register-employee.dto";
import { AdminGuard } from "@auth/employees/infrastructure/guards/admin.guard";
import { EmployeeJwtAuthGuard } from "@auth/employees/infrastructure/guards/employee-jwt-auth.guard";

import { Admin } from "@common/decorators/auth/admin.decorator";
import { ApiErrorResponse } from "@common/decorators/response/api-error-response.decorator";
import { ApiSuccessResponse } from "@common/decorators/response/api-success-response.decorator";

import { EmployeeRegistrationUseCase } from "../../application/use-cases/employee-registration.use-case";

@ApiTags("Employee Registration (CRM - Admin Only)")
@Controller("crm/auth/employee")
@UseGuards(EmployeeJwtAuthGuard, AdminGuard)
export class EmployeeRegistrationController {
    constructor(private readonly employeeRegistrationUseCase: EmployeeRegistrationUseCase) {}

    @Post("register")
    @Admin()
    @ApiOperation({ summary: "Register new Employee (Admin only)" })
    @ApiSuccessResponse(EmployeeAuthResponseDto, {
        status: 201,
        description: "Employee registered successfully",
    })
    @ApiErrorResponse([400, 401, 403, 409])
    async register(@Body() dto: RegisterEmployeeDto): Promise<EmployeeAuthResponseDto> {
        return this.employeeRegistrationUseCase.execute(dto);
    }
}
