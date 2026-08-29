import { Body, Controller, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";

import { SIGNUP_THROTTLE } from "@common/config/throttler/throttler.config";
import { Admin } from "@common/decorators/auth/admin.decorator";
import { PortalId } from "@common/decorators/auth/portal-id.decorator";
import { ApiErrorResponse } from "@common/decorators/response/api-error-response.decorator";
import { ApiSuccessResponse } from "@common/decorators/response/api-success-response.decorator";
import { RequireEmployeeAdmin } from "@modules/portal/auth/employees/api/decorators/require-employee-jwt.decorator";
import {
    RegisterEmployeeDto,
    RegisterEmployeeResponseDto,
} from "@modules/portal/auth/employees/api/dto/register-employee.dto";

import { EmployeeRegistrationUseCase } from "../../application/use-cases/employee-registration.use-case";

@ApiTags("Employee Registration (CRM - Admin Only)")
@Controller("crm/auth/employee")
@RequireEmployeeAdmin()
export class EmployeeRegistrationController {
    constructor(private readonly employeeRegistrationUseCase: EmployeeRegistrationUseCase) {}

    @Post("register")
    @Throttle(SIGNUP_THROTTLE)
    @Admin()
    @ApiOperation({ summary: "Register new Employee (Admin only, account claimed later)" })
    @ApiSuccessResponse(RegisterEmployeeResponseDto, {
        status: 201,
        description: "Employee registered successfully",
    })
    @ApiErrorResponse([400, 401, 403, 409])
    async register(
        @Body() dto: RegisterEmployeeDto,
        @PortalId() portalId: string
    ): Promise<RegisterEmployeeResponseDto> {
        return this.employeeRegistrationUseCase.execute(dto, portalId);
    }
}
