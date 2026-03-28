import { Body, Controller, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

import { CurrentEmployee } from "@auth/employees/api/decorators/current-employee.decorator";
import { RequireEmployeeAdmin } from "@auth/employees/api/decorators/require-employee-jwt.decorator";
import { EmployeeAuthResponseDto } from "@auth/employees/api/dto/employee-auth-response.dto";
import { RegisterEmployeeDto } from "@auth/employees/api/dto/register-employee.dto";
import { Employee } from "@employees/domain/entity/employee.entity";

import { Admin } from "@common/decorators/auth/admin.decorator";
import { ApiErrorResponse } from "@common/decorators/response/api-error-response.decorator";
import { ApiSuccessResponse } from "@common/decorators/response/api-success-response.decorator";
import { requireEmployeePortalId } from "@common/portal";

import { EmployeeRegistrationUseCase } from "../../application/use-cases/employee-registration.use-case";

@ApiTags("Employee Registration (CRM - Admin Only)")
@Controller("crm/auth/employee")
@RequireEmployeeAdmin()
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
    async register(
        @Body() dto: RegisterEmployeeDto,
        @CurrentEmployee() actor: Employee
    ): Promise<EmployeeAuthResponseDto> {
        const portalId = requireEmployeePortalId(actor);
        return this.employeeRegistrationUseCase.execute(dto, portalId);
    }
}
