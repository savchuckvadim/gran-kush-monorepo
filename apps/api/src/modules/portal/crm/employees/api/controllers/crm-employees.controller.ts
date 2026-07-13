import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    Patch,
    Query,
    UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from "@nestjs/swagger";

import { ApiErrorResponse } from "@common/decorators/response/api-error-response.decorator";
import { ApiPaginatedResponse } from "@common/decorators/response/api-paginated-response.decorator";
import { ApiSuccessResponse } from "@common/decorators/response/api-success-response.decorator";
import { PortalId } from "@common/decorators/auth/portal-id.decorator";
import { PaginationDto } from "@common/paginate/dto/pagination.dto";
import { PaginatedResult } from "@common/paginate/interfaces/paginated-result.interface";
import { PaginationUtil } from "@common/paginate/utils/pagination.util";
import { RequireEmployeeJwt } from "@modules/portal/auth/employees";
import { CurrentEmployee } from "@modules/portal/auth/employees/api/decorators/current-employee.decorator";
import { AdminGuard } from "@modules/portal/auth/employees/infrastructure/guards/admin.guard";
import { UpdateEmployeeDto } from "@modules/portal/crm/employees/api/dto/update-employee.dto";
import { EmployeesService } from "@modules/portal/crm/employees/application/services/employees.service";
import { Employee } from "@modules/portal/crm/employees/domain/entity/employee.entity";
import { EmployeeListItemDto } from "@modules/portal/crm/employees/api/dto/employee-list.dto";

function mapToListDto(e: Employee): EmployeeListItemDto {
    return {
        id: e.id,
        userId: e.userId,
        email: e.email,
        name: e.name,
        surname: e.surname,
        phone: e.phone,
        role: e.role,
        position: e.position,
        department: e.department,
        isActive: e.isActive,
        lastLoginAt: e.lastLoginAt,
        createdAt: e.createdAt,
        updatedAt: e.updatedAt,
    };
}

@ApiTags("CRM Employees")
@Controller("crm/employees")
@RequireEmployeeJwt()
@ApiBearerAuth()
export class CrmEmployeesController {
    constructor(private readonly employeesService: EmployeesService) {}

    @Get()
    @ApiOperation({ summary: "Список сотрудников портала (с пагинацией и фильтрами)" })
    @ApiPaginatedResponse(EmployeeListItemDto, { description: "Paginated list of employees" })
    @ApiErrorResponse([401, 403])
    @ApiQuery({ name: "role", required: false })
    @ApiQuery({ name: "isActive", required: false, type: Boolean })
    async listEmployees(
        @Query() pagination: PaginationDto,
        @Query("role") role: string | undefined,
        @Query("isActive") isActiveRaw: string | undefined,
        @PortalId() portalId: string
    ): Promise<PaginatedResult<EmployeeListItemDto>> {
        const page = pagination.page ?? 1;
        const limit = pagination.limit ?? 20;
        const skip = PaginationUtil.getSkip(page, limit);

        const isActive =
            isActiveRaw === "true" ? true : isActiveRaw === "false" ? false : undefined;

        const filters = { role, isActive };

        const [employees, total] = await Promise.all([
            this.employeesService.findAllByPortal(portalId, filters, limit, skip),
            this.employeesService.countByPortal(portalId, filters),
        ]);

        const items = employees.map(mapToListDto);
        return PaginationUtil.createPaginatedResult(items, total, page, limit);
    }

    @Get(":id")
    @ApiOperation({ summary: "Детали сотрудника" })
    @ApiSuccessResponse(EmployeeListItemDto)
    @ApiErrorResponse([401, 403, 404])
    async getEmployee(
        @Param("id") id: string,
        @PortalId() portalId: string
    ): Promise<EmployeeListItemDto> {
        const employee = await this.employeesService.findByIdInPortal(id, portalId);
        return mapToListDto(employee);
    }

    @Patch(":id")
    @UseGuards(AdminGuard)
    @ApiOperation({ summary: "Обновить роль / позицию / отдел / статус сотрудника (admin)" })
    @ApiSuccessResponse(EmployeeListItemDto)
    @ApiErrorResponse([400, 401, 403, 404])
    async updateEmployee(
        @Param("id") id: string,
        @Body() dto: UpdateEmployeeDto,
        @PortalId() portalId: string,
        @CurrentEmployee() actor: Employee
    ): Promise<EmployeeListItemDto> {
        const employee = await this.employeesService.updateEmployee(id, portalId, actor.id, dto);
        return mapToListDto(employee);
    }

    @Delete(":id")
    @UseGuards(AdminGuard)
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: "Деактивировать сотрудника (admin)" })
    @ApiSuccessResponse(EmployeeListItemDto)
    @ApiErrorResponse([400, 401, 403, 404])
    async deactivateEmployee(
        @Param("id") id: string,
        @PortalId() portalId: string,
        @CurrentEmployee() actor: Employee
    ): Promise<EmployeeListItemDto> {
        const employee = await this.employeesService.deactivateEmployee(id, portalId, actor.id);
        return mapToListDto(employee);
    }
}
