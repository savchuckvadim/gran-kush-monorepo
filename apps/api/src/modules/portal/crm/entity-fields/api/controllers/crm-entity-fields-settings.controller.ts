import {
    BadRequestException,
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    Post,
    UseGuards,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

import { FormPurpose } from "@prisma/client";

import { PortalId } from "@common/decorators/auth/portal-id.decorator";
import { ApiErrorResponse } from "@common/decorators/response/api-error-response.decorator";
import { ApiSuccessResponse } from "@common/decorators/response/api-success-response.decorator";
import { Admin, AdminGuard, RequireEmployeeJwt } from "@modules/portal/auth/employees";
import {
    DeleteMemberFieldResponseDto,
    MemberFieldDefinitionResponseDto,
    MemberFieldOptionResponseDto,
    MemberFormFieldSchemaItemDto,
    MemberFormLayoutReplaceResponseDto,
    MemberFormSchemaResponseDto,
    MemberLifecycleStatusItemDto,
    OrderStageCategoryResponseDto,
} from "@modules/portal/crm/entity-fields/api/dto/entity-fields-settings-response.dto";
import {
    CreatePortalMemberFieldDto,
    PortalFieldOptionInputDto,
    UpdateMemberFormLayoutDto,
    UpdatePortalMemberFieldDto,
} from "@modules/portal/crm/entity-fields/api/dto/portal-field-settings.dto";
import { FormLayoutSettingsService } from "@modules/portal/crm/entity-fields/application/services/form-layout-settings.service";
import { FormSchemaService } from "@modules/portal/crm/entity-fields/application/services/form-schema.service";
import { OrderStagesService } from "@modules/portal/crm/entity-fields/application/services/order-stages.service";
import { PortalFieldSettingsService } from "@modules/portal/crm/entity-fields/application/services/portal-field-settings.service";

/** Конструктор полей/форм/стадий: универсальные маршруты по коду сущности (member/order/product/смарт-процессы). */
@ApiTags("CRM Entity fields (settings)")
@Controller("crm/settings/entities")
@RequireEmployeeJwt()
export class CrmEntityFieldsSettingsController {
    constructor(
        private readonly formSchema: FormSchemaService,
        private readonly portalFields: PortalFieldSettingsService,
        private readonly formLayout: FormLayoutSettingsService,
        private readonly stages: OrderStagesService
    ) {}

    private parsePurpose(purposeParam: string): FormPurpose {
        if (!Object.values(FormPurpose).includes(purposeParam as FormPurpose)) {
            throw new BadRequestException(`Invalid form purpose: ${purposeParam}`);
        }
        return purposeParam as FormPurpose;
    }

    @Get("member/status-items")
    @ApiOperation({ summary: "Member lifecycle status items (for filters and selects)" })
    @ApiSuccessResponse(MemberLifecycleStatusItemDto, { isArray: true })
    @ApiErrorResponse([401, 403])
    async memberStatusItems(@PortalId() portalId: string): Promise<MemberLifecycleStatusItemDto[]> {
        return await this.formSchema.getMemberLifecycleStatusItems(portalId);
    }

    @Get(":code/form-schema/:purpose")
    @ApiOperation({ summary: "Entity form schema for a purpose (CRM settings / builder)" })
    @ApiSuccessResponse(MemberFormSchemaResponseDto)
    @ApiErrorResponse([401, 403, 404])
    async entityFormSchema(
        @PortalId() portalId: string,
        @Param("code") code: string,
        @Param("purpose") purposeParam: string
    ): Promise<MemberFormSchemaResponseDto> {
        return this.formSchema.getFormSchema(portalId, code, this.parsePurpose(purposeParam));
    }

    @Get(":code/filter-fields")
    @ApiOperation({ summary: "Entity fields available for list filters" })
    @ApiSuccessResponse(MemberFormFieldSchemaItemDto, { isArray: true })
    @ApiErrorResponse([401, 403])
    async entityFilterFields(
        @PortalId() portalId: string,
        @Param("code") code: string
    ): Promise<MemberFormFieldSchemaItemDto[]> {
        return this.formSchema.getFilterableFields(portalId, code);
    }

    @Get(":code/fields")
    @ApiOperation({ summary: "All field definitions of the entity for this portal" })
    @ApiSuccessResponse(MemberFieldDefinitionResponseDto, { isArray: true })
    @ApiErrorResponse([401, 403])
    async listFields(
        @PortalId() portalId: string,
        @Param("code") code: string
    ): Promise<MemberFieldDefinitionResponseDto[]> {
        return this.portalFields.listDefinitions(portalId, code);
    }

    @Post(":code/fields")
    @UseGuards(AdminGuard)
    @Admin()
    @ApiOperation({ summary: "Create a custom field (portal admin)" })
    @ApiSuccessResponse(MemberFieldDefinitionResponseDto)
    @ApiErrorResponse([401, 403, 400, 409])
    async createField(
        @PortalId() portalId: string,
        @Param("code") code: string,
        @Body() dto: CreatePortalMemberFieldDto
    ): Promise<MemberFieldDefinitionResponseDto> {
        return this.portalFields.createDefinition(portalId, code, dto);
    }

    @Patch(":code/fields/:fieldKey")
    @UseGuards(AdminGuard)
    @Admin()
    @ApiOperation({ summary: "Update a non-immutable field" })
    @ApiSuccessResponse(MemberFieldDefinitionResponseDto)
    @ApiErrorResponse([401, 403, 404, 400])
    async updateField(
        @PortalId() portalId: string,
        @Param("code") code: string,
        @Param("fieldKey") fieldKey: string,
        @Body() dto: UpdatePortalMemberFieldDto
    ): Promise<MemberFieldDefinitionResponseDto> {
        return this.portalFields.updateDefinition(portalId, code, fieldKey, dto);
    }

    @Delete(":code/fields/:fieldKey")
    @UseGuards(AdminGuard)
    @Admin()
    @ApiOperation({ summary: "Delete a custom field (no system/immutable)" })
    @ApiSuccessResponse(DeleteMemberFieldResponseDto)
    @ApiErrorResponse([401, 403, 404, 400])
    async deleteField(
        @PortalId() portalId: string,
        @Param("code") code: string,
        @Param("fieldKey") fieldKey: string
    ): Promise<DeleteMemberFieldResponseDto> {
        await this.portalFields.deleteDefinition(portalId, code, fieldKey);
        return { ok: true };
    }

    @Post(":code/fields/:fieldKey/options")
    @UseGuards(AdminGuard)
    @Admin()
    @ApiOperation({ summary: "Add enum/select option to a field" })
    @ApiSuccessResponse(MemberFieldOptionResponseDto)
    @ApiErrorResponse([401, 403, 404, 409])
    async addFieldOption(
        @PortalId() portalId: string,
        @Param("code") code: string,
        @Param("fieldKey") fieldKey: string,
        @Body() dto: PortalFieldOptionInputDto
    ): Promise<MemberFieldOptionResponseDto> {
        return this.portalFields.addFieldOption(portalId, code, fieldKey, dto);
    }

    @Patch(":code/forms/:purpose")
    @UseGuards(AdminGuard)
    @Admin()
    @ApiOperation({ summary: "Replace form layout items for a purpose" })
    @ApiSuccessResponse(MemberFormLayoutReplaceResponseDto)
    @ApiErrorResponse([401, 403, 404, 400])
    async updateForm(
        @PortalId() portalId: string,
        @Param("code") code: string,
        @Param("purpose") purposeParam: string,
        @Body() dto: UpdateMemberFormLayoutDto
    ): Promise<MemberFormLayoutReplaceResponseDto> {
        return this.formLayout.replaceFormLayout(
            portalId,
            code,
            this.parsePurpose(purposeParam),
            dto.items
        );
    }

    @Get(":code/stage-categories")
    @ApiOperation({ summary: "Entity funnel categories and stages" })
    @ApiSuccessResponse(OrderStageCategoryResponseDto, { isArray: true })
    @ApiErrorResponse([401, 403])
    async stageCategories(
        @PortalId() portalId: string,
        @Param("code") code: string
    ): Promise<OrderStageCategoryResponseDto[]> {
        return this.stages.listStageCategories(portalId, code);
    }
}
