import { Controller, Get, Query } from "@nestjs/common";
import { ApiOperation, ApiQuery, ApiTags } from "@nestjs/swagger";

import { EmployeesService } from "@employees/application/services/employees.service";
import { EmployeeListItemDto } from "@employees/api/dto/employee-list.dto";
import { MembersService } from "@members/application/services/members.service";
import { CrmMemberDto } from "@members/api/dto/crm-member.dto";

import { Public } from "@common/decorators/auth/public.decorator";
import { ApiErrorResponse } from "@common/decorators/response/api-error-response.decorator";
import { ApiSuccessResponse } from "@common/decorators/response/api-success-response.decorator";

@ApiTags("Test (Public - No Authentication Required)")
@Controller("test")
@Public()
export class TestController {
    constructor(
        private readonly employeesService: EmployeesService,
        private readonly membersService: MembersService
    ) {}

    @Get("employees")
    @ApiOperation({ summary: "Get list of employees (public, no auth required)" })
    @ApiQuery({ name: "limit", required: false, type: Number, example: 100 })
    @ApiSuccessResponse(EmployeeListItemDto, {
        description: "List of employees",
        isArray: true,
    })
    @ApiErrorResponse([400])
    async getEmployees(@Query("limit") limit?: string): Promise<EmployeeListItemDto[]> {
        const parsedLimit = Number.parseInt(limit ?? "", 10);
        const take = Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : 100;
        const employees = await this.employeesService.findAll(take);

        return employees.map((employee) => ({
            id: employee.id,
            userId: employee.userId,
            email: employee.email,
            name: employee.name,
            surname: employee.surname,
            phone: employee.phone,
            role: employee.role,
            position: employee.position,
            department: employee.department,
            isActive: employee.isActive,
            lastLoginAt: employee.lastLoginAt,
            createdAt: employee.createdAt,
            updatedAt: employee.updatedAt,
        }));
    }

    @Get("members")
    @ApiOperation({ summary: "Get list of members (public, no auth required)" })
    @ApiQuery({ name: "limit", required: false, type: Number, example: 100 })
    @ApiSuccessResponse(CrmMemberDto, {
        description: "List of members",
        isArray: true,
    })
    @ApiErrorResponse([400])
    async getMembers(@Query("limit") limit?: string): Promise<CrmMemberDto[]> {
        const parsedLimit = Number.parseInt(limit ?? "", 10);
        const take = Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : 100;
        const members = await this.membersService.findAll(take);

        return members.map((member) => ({
            id: member.id,
            userId: member.userId,
            email: member.user.email,
            name: member.name,
            surname: member.surname ?? null,
            phone: member.phone ?? null,
            status: member.status,
            isActive: member.isActive,
            emailConfirmed: false, // User entity doesn't have emailConfirmed field
            createdAt: member.createdAt.toISOString(),
        }));
    }
}
