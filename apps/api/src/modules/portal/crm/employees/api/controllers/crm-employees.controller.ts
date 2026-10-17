import {
    BadRequestException,
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    Patch,
    Post,
    Query,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from "@nestjs/swagger";

import { FormPurpose } from "@prisma/client";

import { CurrentPrincipal } from "@common/decorators/auth/current-principal.decorator";
import { PortalId } from "@common/decorators/auth/portal-id.decorator";
import { RequirePermission } from "@common/decorators/auth/require-permission.decorator";
import { ApiErrorResponse } from "@common/decorators/response/api-error-response.decorator";
import { ApiPaginatedResponse } from "@common/decorators/response/api-paginated-response.decorator";
import { ApiSuccessResponse } from "@common/decorators/response/api-success-response.decorator";
import { type ContentLocale, RequestLocale } from "@common/i18n";
import { PaginatedResult } from "@common/paginate/interfaces/paginated-result.interface";
import { PaginationUtil } from "@common/paginate/utils/pagination.util";
import type { PortalPrincipal } from "@common/portal";
import { RequireEmployeeJwt } from "@modules/portal/auth/employees";
import { PERMISSIONS } from "@modules/portal/crm/access/domain/permissions";
import {
    CreateEmployeeDto,
    CreateEmployeeResponseDto,
} from "@modules/portal/crm/employees/api/dto/create-employee.dto";
import { EmployeeListItemDto } from "@modules/portal/crm/employees/api/dto/employee-list.dto";
import { EmployeeListQueryDto } from "@modules/portal/crm/employees/api/dto/employee-list-query.dto";
import { UpdateEmployeeDto } from "@modules/portal/crm/employees/api/dto/update-employee.dto";
import { mapEmployeeToListDto } from "@modules/portal/crm/employees/api/mappers";
import {
    EmployeesService,
    toEmployeeActor,
} from "@modules/portal/crm/employees/application/services/employees.service";
import { FormSchemaService } from "@modules/portal/crm/entity-fields/application/services/form-schema.service";
import { ENTITY_DEFINITION_CODES } from "@modules/portal/crm/entity-fields/constants/entity-definition-codes";

@ApiTags("CRM Employees")
@Controller("crm/employees")
@RequireEmployeeJwt()
@RequirePermission(PERMISSIONS.EmployeesRead)
@ApiBearerAuth()
export class CrmEmployeesController {
    constructor(
        private readonly employeesService: EmployeesService,
        private readonly formSchema: FormSchemaService
    ) {}

    @Get()
    @ApiOperation({ summary: "Список сотрудников портала (с пагинацией и фильтрами)" })
    @ApiPaginatedResponse(EmployeeListItemDto, { description: "Paginated list of employees" })
    @ApiErrorResponse([401, 403])
    async listEmployees(
        @Query() query: EmployeeListQueryDto,
        @PortalId() portalId: string,
        @RequestLocale() locale: ContentLocale
    ): Promise<PaginatedResult<EmployeeListItemDto>> {
        const { page = 1, limit = 20, role, isActive } = query;
        const skip = PaginationUtil.getSkip(page, limit);

        const filters = { roleKey: role, isActive };

        const [employees, total] = await Promise.all([
            this.employeesService.findAllByPortal(portalId, filters, limit, skip),
            this.employeesService.countByPortal(portalId, filters),
        ]);

        const items = employees.map((employee) => mapEmployeeToListDto(employee, locale));
        return PaginationUtil.createPaginatedResult(items, total, page, limit);
    }

    @Get("form-schema")
    @ApiOperation({ summary: "Employee form schema by purpose (for CRM dynamic forms)" })
    @ApiQuery({ name: "purpose", required: true, enum: FormPurpose })
    @ApiSuccessResponse(Object)
    @ApiErrorResponse([401, 403, 404])
    async employeeFormSchema(
        @PortalId() portalId: string,
        @Query("purpose") purposeParam: string,
        @RequestLocale() locale: ContentLocale
    ): Promise<unknown> {
        if (!Object.values(FormPurpose).includes(purposeParam as FormPurpose)) {
            throw new BadRequestException(`Invalid form purpose: ${purposeParam}`);
        }
        return this.formSchema.getFormSchema(
            portalId,
            ENTITY_DEFINITION_CODES.EMPLOYEE,
            purposeParam as FormPurpose,
            locale
        );
    }

    @Post()
    @RequirePermission(PERMISSIONS.EmployeesManage)
    @ApiOperation({
        summary: "Создать сотрудника (employees.manage): email + роль + динамические поля",
    })
    @ApiSuccessResponse(CreateEmployeeResponseDto)
    @ApiErrorResponse([400, 401, 403, 409])
    async createEmployee(
        @Body() dto: CreateEmployeeDto,
        @PortalId() portalId: string,
        @CurrentPrincipal() principal: PortalPrincipal
    ): Promise<CreateEmployeeResponseDto> {
        const { employee, isNewUser } = await this.employeesService.create(
            {
                email: dto.email,
                role: dto.role,
                fields: dto.fields ?? {},
            },
            portalId,
            toEmployeeActor(principal)
        );
        return {
            employeeId: employee.employee.id,
            userId: employee.employee.userId,
            isNewUser,
        };
    }

    @Get(":id")
    @ApiOperation({ summary: "Детали сотрудника" })
    @ApiSuccessResponse(EmployeeListItemDto)
    @ApiErrorResponse([401, 403, 404])
    async getEmployee(
        @Param("id") id: string,
        @PortalId() portalId: string,
        @RequestLocale() locale: ContentLocale
    ): Promise<EmployeeListItemDto> {
        const employee = await this.employeesService.findByIdInPortal(id, portalId);
        return mapEmployeeToListDto(employee, locale);
    }

    @Patch(":id")
    @RequirePermission(PERMISSIONS.EmployeesManage)
    @ApiOperation({
        summary: "Обновить роль / статус / поля профиля сотрудника (employees.manage)",
    })
    @ApiSuccessResponse(EmployeeListItemDto)
    @ApiErrorResponse([400, 401, 403, 404])
    async updateEmployee(
        @Param("id") id: string,
        @Body() dto: UpdateEmployeeDto,
        @PortalId() portalId: string,
        @CurrentPrincipal() principal: PortalPrincipal,
        @RequestLocale() locale: ContentLocale
    ): Promise<EmployeeListItemDto> {
        const employee = await this.employeesService.updateEmployee(
            id,
            portalId,
            toEmployeeActor(principal),
            dto
        );
        return mapEmployeeToListDto(employee, locale);
    }

    @Delete(":id")
    @RequirePermission(PERMISSIONS.EmployeesManage)
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: "Деактивировать сотрудника (employees.manage)" })
    @ApiSuccessResponse(EmployeeListItemDto)
    @ApiErrorResponse([400, 401, 403, 404])
    async deactivateEmployee(
        @Param("id") id: string,
        @PortalId() portalId: string,
        @CurrentPrincipal() principal: PortalPrincipal,
        @RequestLocale() locale: ContentLocale
    ): Promise<EmployeeListItemDto> {
        const employee = await this.employeesService.deactivateEmployee(
            id,
            portalId,
            toEmployeeActor(principal)
        );
        return mapEmployeeToListDto(employee, locale);
    }
}
