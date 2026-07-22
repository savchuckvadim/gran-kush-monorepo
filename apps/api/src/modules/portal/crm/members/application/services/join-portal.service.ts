import { BadRequestException, ConflictException, Injectable } from "@nestjs/common";

import { FormPurpose, MemberJoinSource } from "@prisma/client";

import { PrismaService } from "@common/prisma/prisma.service";
import { DynamicPayloadValidatorService } from "@modules/portal/crm/entity-fields/application/services/dynamic-payload-validator.service";
import { FieldValuesService } from "@modules/portal/crm/entity-fields/application/services/field-values.service";
import { ENTITY_DEFINITION_CODES } from "@modules/portal/crm/entity-fields/constants/entity-definition-codes";
import { MemberWithRelations } from "@modules/portal/crm/members/domain/entity/member.entity";
import { MemberRepository } from "@modules/portal/crm/members/domain/repositories/member-repository.interface";

export interface JoinPortalInput {
    userId: string;
    portalId: string;
    fields: Record<string, unknown>;
    joinSource: MemberJoinSource;
    purpose?: FormPurpose;
    createdByEmployeeId?: string;
    registrationLinkId?: string;
}

/**
 * Вступление глобального user в клуб (портал): создаёт мост Member +
 * профильную EntityRecord + FieldValues по форме портала.
 * Используется: самостоятельным join из ЛК, регистрацией по ссылке-форме,
 * созданием member из CRM.
 */
@Injectable()
export class JoinPortalService {
    constructor(
        private readonly memberRepository: MemberRepository,
        private readonly prisma: PrismaService,
        private readonly dynamicValidator: DynamicPayloadValidatorService,
        private readonly fieldValues: FieldValuesService
    ) {}

    async joinPortal(input: JoinPortalInput): Promise<MemberWithRelations> {
        const existing = await this.memberRepository.findByUserAndPortal(
            input.userId,
            input.portalId
        );
        if (existing) {
            throw new ConflictException("User is already a member of this portal");
        }

        const purpose =
            input.purpose ??
            (input.joinSource === MemberJoinSource.crm
                ? FormPurpose.crm_create
                : FormPurpose.public_registration);

        const validatedFields = await this.dynamicValidator.validateMemberPayload(
            input.portalId,
            purpose,
            input.fields
        );

        const statusItemId = await this.resolveDefaultMemberStatusItemId(input.portalId);

        const member = await this.memberRepository.create({
            userId: input.userId,
            portalId: input.portalId,
            statusItemId,
            joinSource: input.joinSource,
            createdByEmployeeId: input.createdByEmployeeId,
            registrationLinkId: input.registrationLinkId,
        });

        await this.fieldValues.upsertMemberFieldValues(input.portalId, member.id, validatedFields);

        const result = await this.memberRepository.findByIdForPortal(member.id, input.portalId);
        return result ?? member;
    }

    private async resolveDefaultMemberStatusItemId(portalId: string): Promise<string> {
        const memberDef = await this.prisma.entityDefinition.findUnique({
            where: {
                portalId_code: { portalId, code: ENTITY_DEFINITION_CODES.MEMBER },
            },
            select: { id: true },
        });
        if (!memberDef) {
            throw new BadRequestException("Portal member entity is not configured");
        }
        const item = await this.prisma.statusItem.findFirst({
            where: {
                key: "inProgress",
                statusSet: {
                    portalId,
                    code: "member_lifecycle",
                    entityDefinitionId: memberDef.id,
                },
            },
            select: { id: true },
        });
        if (!item) {
            throw new BadRequestException("Portal member statuses are not configured");
        }
        return item.id;
    }
}
