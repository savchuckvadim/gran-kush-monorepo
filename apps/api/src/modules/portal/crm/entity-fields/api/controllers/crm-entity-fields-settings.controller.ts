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
import { ENTITY_DEFINITION_CODES } from "@modules/portal/crm/entity-fields/constants/entity-definition-codes";

@ApiTags("CRM Entity fields (settings)")
@Controller("crm/settings/entities")
@RequireEmployeeJwt()
export class CrmEntityFieldsSettingsController {
    constructor(
        private readonly formSchema: FormSchemaService,
        private readonly portalFields: PortalFieldSettingsService,
        private readonly formLayout: FormLayoutSettingsService,
        private readonly orderStages: OrderStagesService
    ) {}

    @Get("member/form-schema/:purpose")
    @ApiOperation({ summary: "Member form schema for a purpose (CRM settings / builder)" })
    @ApiSuccessResponse(MemberFormSchemaResponseDto)
    @ApiErrorResponse([401, 403, 404])
    async memberFormSchema(
        @PortalId() portalId: string,
        @Param("purpose") purposeParam: string
    ): Promise<MemberFormSchemaResponseDto> {
        if (!Object.values(FormPurpose).includes(purposeParam as FormPurpose)) {
            throw new BadRequestException(`Invalid form purpose: ${purposeParam}`);
        }
        const purpose = purposeParam as FormPurpose;
        return this.formSchema.getFormSchema(portalId, ENTITY_DEFINITION_CODES.MEMBER, purpose);
    }

    @Get("member/filter-fields")
    @ApiOperation({ summary: "Member fields available for list filters" })
    @ApiSuccessResponse(MemberFormFieldSchemaItemDto, { isArray: true })
    @ApiErrorResponse([401, 403])
    async memberFilterFields(
        @PortalId() portalId: string
    ): Promise<MemberFormFieldSchemaItemDto[]> {
        return this.formSchema.getFilterableMemberFields(portalId);
    }

    @Get("member/status-items")
    @ApiOperation({ summary: "Member lifecycle status items (for filters and selects)" })
    @ApiSuccessResponse(MemberLifecycleStatusItemDto, { isArray: true })
    @ApiErrorResponse([401, 403])
    async memberStatusItems(@PortalId() portalId: string): Promise<MemberLifecycleStatusItemDto[]> {
        return await this.formSchema.getMemberLifecycleStatusItems(portalId);
    }

    @Get("member/fields")
    @ApiOperation({ summary: "All member field definitions for this portal" })
    @ApiSuccessResponse(MemberFieldDefinitionResponseDto, { isArray: true })
    @ApiErrorResponse([401, 403])
    async listMemberFields(
        @PortalId() portalId: string
    ): Promise<MemberFieldDefinitionResponseDto[]> {
        return this.portalFields.listMemberDefinitions(portalId);
    }

    @Post("member/fields")
    @UseGuards(AdminGuard)
    @Admin()
    @ApiOperation({ summary: "Create a custom member field (portal admin)" })
    @ApiSuccessResponse(MemberFieldDefinitionResponseDto)
    @ApiErrorResponse([401, 403, 400, 409])
    async createMemberField(
        @PortalId() portalId: string,
        @Body() dto: CreatePortalMemberFieldDto
    ): Promise<MemberFieldDefinitionResponseDto> {
        return this.portalFields.createMemberDefinition(portalId, dto);
    }

    @Patch("member/fields/:fieldKey")
    @UseGuards(AdminGuard)
    @Admin()
    @ApiOperation({ summary: "Update a non-immutable member field" })
    @ApiSuccessResponse(MemberFieldDefinitionResponseDto)
    @ApiErrorResponse([401, 403, 404, 400])
    async updateMemberField(
        @PortalId() portalId: string,
        @Param("fieldKey") fieldKey: string,
        @Body() dto: UpdatePortalMemberFieldDto
    ): Promise<MemberFieldDefinitionResponseDto> {
        return this.portalFields.updateMemberDefinition(portalId, fieldKey, dto);
    }

    @Delete("member/fields/:fieldKey")
    @UseGuards(AdminGuard)
    @Admin()
    @ApiOperation({ summary: "Delete a custom member field (no system/immutable)" })
    @ApiSuccessResponse(DeleteMemberFieldResponseDto)
    @ApiErrorResponse([401, 403, 404, 400])
    async deleteMemberField(
        @PortalId() portalId: string,
        @Param("fieldKey") fieldKey: string
    ): Promise<DeleteMemberFieldResponseDto> {
        await this.portalFields.deleteMemberDefinition(portalId, fieldKey);
        return { ok: true };
    }

    @Post("member/fields/:fieldKey/options")
    @UseGuards(AdminGuard)
    @Admin()
    @ApiOperation({ summary: "Add enum/select option to a member field" })
    @ApiSuccessResponse(MemberFieldOptionResponseDto)
    @ApiErrorResponse([401, 403, 404, 409])
    async addMemberFieldOption(
        @PortalId() portalId: string,
        @Param("fieldKey") fieldKey: string,
        @Body() dto: PortalFieldOptionInputDto
    ): Promise<MemberFieldOptionResponseDto> {
        return this.portalFields.addMemberFieldOption(portalId, fieldKey, dto);
    }

    @Patch("member/forms/:purpose")
    @UseGuards(AdminGuard)
    @Admin()
    @ApiOperation({ summary: "Replace member form layout items for a purpose" })
    @ApiSuccessResponse(MemberFormLayoutReplaceResponseDto)
    @ApiErrorResponse([401, 403, 404, 400])
    async updateMemberForm(
        @PortalId() portalId: string,
        @Param("purpose") purposeParam: string,
        @Body() dto: UpdateMemberFormLayoutDto
    ): Promise<MemberFormLayoutReplaceResponseDto> {
        if (!Object.values(FormPurpose).includes(purposeParam as FormPurpose)) {
            throw new BadRequestException(`Invalid form purpose: ${purposeParam}`);
        }
        return this.formLayout.replaceMemberFormLayout(
            portalId,
            purposeParam as FormPurpose,
            dto.items
        );
    }

    @Get("order/stage-categories")
    @ApiOperation({ summary: "Order funnel categories and stages" })
    @ApiSuccessResponse(OrderStageCategoryResponseDto, { isArray: true })
    @ApiErrorResponse([401, 403])
    async orderStageCategories(
        @PortalId() portalId: string
    ): Promise<OrderStageCategoryResponseDto[]> {
        return this.orderStages.listOrderStageCategories(portalId);
    }
}
