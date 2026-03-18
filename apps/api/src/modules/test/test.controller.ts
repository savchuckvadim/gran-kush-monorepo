import { Controller, Get, Query } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

import { EmployeeListItemDto } from "@employees/api/dto/employee-list.dto";
import { EmployeesService } from "@employees/application/services/employees.service";
import { CrmMemberDto } from "@members/api/dto/crm-member.dto";
import { MembersService } from "@members/application/services/members.service";

import { Public } from "@common/decorators/auth/public.decorator";
import { ApiErrorResponse } from "@common/decorators/response/api-error-response.decorator";
import { ApiPaginatedResponse } from "@common/decorators/response/api-paginated-response.decorator";
import { PaginationDto } from "@common/paginate/dto/pagination.dto";
import { PaginatedResult } from "@common/paginate/interfaces/paginated-result.interface";
import { PaginationUtil } from "@common/paginate/utils/pagination.util";

@ApiTags("Test (Public - No Authentication Required)")
@Controller("test")
@Public()
export class TestController {
    constructor(
        private readonly employeesService: EmployeesService,
        private readonly membersService: MembersService
    ) {}

    @Get("employees")
    @ApiOperation({ summary: "Get paginated list of employees (public, no auth required)" })
    @ApiPaginatedResponse(EmployeeListItemDto, {
        description: "Paginated list of employees",
    })
    @ApiErrorResponse([400])
    async getEmployees(
        @Query() query: PaginationDto
    ): Promise<PaginatedResult<EmployeeListItemDto>> {
        const page = query.page ?? 1;
        const limit = query.limit ?? 10;
        const skip = PaginationUtil.getSkip(page, limit);

        const [employees, total] = await Promise.all([
            this.employeesService.findAll(limit, skip),
            this.employeesService.count(),
        ]);

        const items = employees.map((employee) => ({
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

        return PaginationUtil.createPaginatedResult(items, total, page, limit);
    }

    @Get("members")
    @ApiOperation({ summary: "Get paginated list of members (public, no auth required)" })
    @ApiPaginatedResponse(CrmMemberDto, {
        description: "Paginated list of members",
    })
    @ApiErrorResponse([400])
    async getMembers(@Query() query: PaginationDto): Promise<PaginatedResult<CrmMemberDto>> {
        const page = query.page ?? 1;
        const limit = query.limit ?? 10;
        const skip = PaginationUtil.getSkip(page, limit);

        const [members, total] = await Promise.all([
            this.membersService.findAll(limit, skip),
            this.membersService.count(),
        ]);

        const items = members.map((member) => ({
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

        return PaginationUtil.createPaginatedResult(items, total, page, limit);
    }
}
