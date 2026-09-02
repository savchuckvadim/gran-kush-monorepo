import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";

import { MemberJoinSource, UserDocument, UserSignature } from "@prisma/client";
import { UserDocumentSide } from "@prisma/client";
import { MulterFile } from "@storage/domain/interfaces/storage-file.interface";
import { AccountProvisioningService } from "@users/application/services/account-provisioning.service";
import { UserRepository } from "@users/domain/repositories/user-repository.interface";

import { PrismaService } from "@common/prisma/prisma.service";
import { AccountFilesService } from "@modules/account/application/services/account-files.service";
import { UserDocumentRepository } from "@modules/account/domain/repositories/user-document-repository.interface";
import { UserSignatureRepository } from "@modules/account/domain/repositories/user-signature-repository.interface";
import { DynamicPayloadValidatorService } from "@modules/portal/crm/entity-fields/application/services/dynamic-payload-validator.service";
import { FieldValuesService } from "@modules/portal/crm/entity-fields/application/services/field-values.service";
import { MEMBER_FIELD_KEYS } from "@modules/portal/crm/entity-fields/constants/member-field-keys";
import {
    buildMemberFieldMap,
    fieldValueToOptionalDateString,
    getMemberDisplayNameParts,
    jsonValueToScalar,
} from "@modules/portal/crm/entity-fields/lib/member-field-values";
import {
    CrmMemberAccountDocumentDto,
    CrmMemberDto,
    CrmMemberDynamicFieldDto,
    CrmMemberFieldsPatchDto,
    CrmMemberFullDto,
    CrmMemberStatusDto,
} from "@modules/portal/crm/members/api/dto/crm-member.dto";
import { CrmMemberFilesRequestDto } from "@modules/portal/crm/members/api/dto/crm-member-documents.dto";
import { JoinPortalService } from "@modules/portal/crm/members/application/services/join-portal.service";
import { MemberWithRelations } from "@modules/portal/crm/members/domain/entity/member.entity";
import {
    MemberListFilters,
    MemberRepository,
} from "@modules/portal/crm/members/domain/repositories/member-repository.interface";

@Injectable()
export class MembersService {
    constructor(
        private readonly memberRepository: MemberRepository,
        private readonly userRepository: UserRepository,
        private readonly accountProvisioning: AccountProvisioningService,
        private readonly userDocumentRepository: UserDocumentRepository,
        private readonly userSignatureRepository: UserSignatureRepository,
        private readonly accountFiles: AccountFilesService,
        private readonly joinPortalService: JoinPortalService,
        private readonly prisma: PrismaService,
        private readonly dynamicValidator: DynamicPayloadValidatorService,
        private readonly fieldValues: FieldValuesService
    ) {}

    private fieldRows(member: MemberWithRelations) {
        return member.profile.fieldValues.map((fv) => ({
            valueJson: fv.valueJson,
            fieldDefinition: { fieldKey: fv.fieldDefinition.fieldKey },
        }));
    }

    mapStatus(
        si: NonNullable<MemberWithRelations["profile"]>["statusItem"] | null
    ): CrmMemberStatusDto | null {
        if (!si) return null;
        return {
            id: si.id,
            key: si.key,
            label: si.label,
            color: si.color,
        };
    }

    toCrmMemberListDto(member: MemberWithRelations): CrmMemberDto {
        const fieldMap = buildMemberFieldMap(this.fieldRows(member));
        const { firstName, lastName } = getMemberDisplayNameParts(fieldMap);
        const phone = fieldMap[MEMBER_FIELD_KEYS.PHONE];
        return {
            id: member.id,
            userId: member.userId,
            email: member.user.email,
            name: firstName,
            surname: lastName,
            phone: typeof phone === "string" ? phone : null,
            status: member.profile.statusItem?.key ?? "",
            statusItem: this.mapStatus(member.profile.statusItem),
            isActive: member.isActive,
            emailConfirmed: member.user.emailConfirmed,
            createdAt: member.createdAt.toISOString(),
        };
    }

    async toCrmMemberFullDto(member: MemberWithRelations): Promise<CrmMemberFullDto> {
        const fieldMap = buildMemberFieldMap(this.fieldRows(member));
        const { firstName, lastName } = getMemberDisplayNameParts(fieldMap);
        const phone = fieldMap[MEMBER_FIELD_KEYS.PHONE];
        const birthdayRaw = fieldMap[MEMBER_FIELD_KEYS.BIRTHDAY];
        const address = fieldMap[MEMBER_FIELD_KEYS.ADDRESS];
        const notes = fieldMap[MEMBER_FIELD_KEYS.NOTES];

        const fieldsPayload = await this.fieldValues.getMemberFieldsPayload(member.id);
        const fields: CrmMemberDynamicFieldDto[] = fieldsPayload.map((f) => ({
            fieldKey: f.fieldKey,
            type: f.type,
            label: f.label,
            value: jsonValueToScalar(f.value as never),
        }));

        const [accountDocuments, signature] = await Promise.all([
            this.userDocumentRepository.findAllByUser(member.userId),
            this.userSignatureRepository.findByUser(member.userId),
        ]);

        const birthday = fieldValueToOptionalDateString(birthdayRaw);
        const st = this.mapStatus(member.profile.statusItem);

        return {
            id: member.id,
            userId: member.userId,
            email: member.user.email,
            name: firstName,
            surname: lastName,
            phone: typeof phone === "string" ? phone : null,
            status: member.profile.statusItem?.key ?? "",
            statusItem: st,
            isActive: member.isActive,
            emailConfirmed: member.user.emailConfirmed,
            createdAt: member.createdAt.toISOString(),
            updatedAt: member.updatedAt.toISOString(),
            fields,
            documents: accountDocuments.map((doc) => this.toAccountDocumentDto(doc)),
            hasSignature: signature !== null,
            birthday,
            address: typeof address === "string" ? address : null,
            membershipNumber: member.membershipNumber ?? null,
            notes: typeof notes === "string" ? notes : null,
        };
    }

    private toAccountDocumentDto(doc: UserDocument): CrmMemberAccountDocumentDto {
        return {
            id: doc.id,
            type: doc.type,
            side: doc.side,
            number: doc.number,
            createdAt: doc.createdAt.toISOString(),
        };
    }

    async checkUserExists(email: string): Promise<{
        exists: boolean;
        hasPassword: boolean;
        memberships: number;
        employments: number;
        message?: string;
    }> {
        const counts = await this.userRepository.findMembershipCountsByEmail(email);

        if (!counts) {
            return {
                exists: false,
                hasPassword: false,
                memberships: 0,
                employments: 0,
            };
        }

        return {
            exists: true,
            ...counts,
            message: counts.hasPassword
                ? undefined
                : "Account was created by a club and awaits claiming",
        };
    }

    /**
     * CRM: сотрудник добавляет member по email.
     * Если User с таким email нет — создаётся аккаунт со статусом pending_claim
     * (пользователь позже клеймит его, установив пароль при регистрации).
     */
    async createFromCrm(
        dto: { email: string; fields: Record<string, unknown> },
        portalId: string,
        createdByEmployeeId?: string
    ): Promise<{ userId: string; memberId: string; isNewUser: boolean }> {
        const { user, isNewUser } = await this.accountProvisioning.ensurePendingClaimUser(
            dto.email
        );

        const member = await this.joinPortalService.joinPortal({
            userId: user.id,
            portalId,
            fields: dto.fields,
            joinSource: MemberJoinSource.crm,
            createdByEmployeeId,
        });

        return { userId: user.id, memberId: member.id, isNewUser };
    }

    async findByUserAndPortal(userId: string, portalId: string) {
        return this.memberRepository.findByUserAndPortal(userId, portalId);
    }

    async findByIdForPortal(id: string, portalId: string) {
        return this.memberRepository.findByIdForPortal(id, portalId);
    }

    /** Без tenant-скоупа — только для внутренних сервисов (QR и т.п.) */
    async findAllByPortal(
        portalId: string,
        limit?: number,
        skip?: number,
        filters?: MemberListFilters
    ) {
        return this.memberRepository.findAllByPortal(portalId, limit, skip, filters);
    }

    async countByPortal(portalId: string): Promise<number> {
        return this.memberRepository.countByPortal(portalId);
    }

    async updateCrmMember(memberId: string, portalId: string, dto: CrmMemberFieldsPatchDto) {
        const member = await this.memberRepository.findByIdForPortal(memberId, portalId);
        if (!member) {
            throw new NotFoundException("Member not found");
        }

        if (dto.fields && Object.keys(dto.fields).length > 0) {
            const validated = await this.dynamicValidator.validateMemberPartialUpdate(
                portalId,
                dto.fields
            );
            await this.fieldValues.upsertMemberFieldValues(portalId, memberId, validated);
        }

        if (dto.statusItemId !== undefined) {
            await this.assertMemberStatusItemInPortal(portalId, dto.statusItemId);
            await this.prisma.entityRecord.update({
                where: { id: member.entityRecordId },
                data: { statusItemId: dto.statusItemId },
            });
        }

        const updatePayload: Partial<{
            isActive: boolean;
            membershipNumber: string | null;
        }> = {};

        if (dto.isActive !== undefined) {
            updatePayload.isActive = dto.isActive;
        }
        if (dto.membershipNumber !== undefined) {
            updatePayload.membershipNumber = dto.membershipNumber;
        }

        if (Object.keys(updatePayload).length > 0) {
            await this.memberRepository.update(memberId, updatePayload);
        }

        return this.memberRepository.findByIdForPortal(memberId, portalId);
    }

    /** Статус должен принадлежать набору member_lifecycle этого портала. */
    private async assertMemberStatusItemInPortal(
        portalId: string,
        statusItemId: string
    ): Promise<void> {
        const item = await this.prisma.statusItem.findFirst({
            where: {
                id: statusItemId,
                isActive: true,
                statusSet: { portalId, code: "member_lifecycle" },
            },
            select: { id: true },
        });
        if (!item) {
            throw new BadRequestException("Unknown member status for this portal");
        }
    }

    /** CRM: смена lifecycle-статуса участника. */
    async updateMemberStatus(memberId: string, portalId: string, statusItemId: string) {
        const member = await this.memberRepository.findByIdForPortal(memberId, portalId);
        if (!member) {
            throw new NotFoundException("Member not found");
        }

        await this.assertMemberStatusItemInPortal(portalId, statusItemId);

        await this.prisma.entityRecord.update({
            where: { id: member.entityRecordId },
            data: { statusItemId },
        });

        return this.memberRepository.findByIdForPortal(memberId, portalId);
    }

    /** CRM: загрузка документов/подписи member — файлы сохраняются в его аккаунт (User). */
    async updateCrmMemberFiles(
        memberId: string,
        portalId: string,
        dto: CrmMemberFilesRequestDto,
        files: {
            documentFirst?: MulterFile[];
            documentSecond?: MulterFile[];
            signature?: MulterFile[];
        }
    ): Promise<CrmMemberFullDto> {
        const member = await this.memberRepository.findByIdForPortal(memberId, portalId);
        if (!member) {
            throw new NotFoundException("Member not found");
        }

        const documentType = dto.documentType ?? "passport";

        const documentFirst = files.documentFirst?.[0];
        const documentSecond = files.documentSecond?.[0];
        const signature = files.signature?.[0];

        if (!documentFirst && !documentSecond && !signature) {
            throw new BadRequestException(
                "At least one file (document or signature) must be provided."
            );
        }

        if (documentFirst) {
            await this.accountFiles.replaceDocument({
                userId: member.userId,
                type: documentType,
                side: UserDocumentSide.front,
                file: documentFirst.buffer,
            });
        }

        if (documentSecond) {
            await this.accountFiles.replaceDocument({
                userId: member.userId,
                type: documentType,
                side: UserDocumentSide.back,
                file: documentSecond.buffer,
            });
        }

        if (signature) {
            await this.accountFiles.replaceSignature({
                userId: member.userId,
                file: signature.buffer,
            });
        }

        const result = await this.memberRepository.findByIdForPortal(memberId, portalId);
        if (!result) {
            throw new NotFoundException("Member not found");
        }
        return this.toCrmMemberFullDto(result);
    }

    /** Приватные превью для CRM: документ/подпись читаются из аккаунта member'а */
    async getMemberAccountDocument(
        memberId: string,
        portalId: string,
        documentId: string
    ): Promise<UserDocument> {
        const member = await this.memberRepository.findByIdForPortal(memberId, portalId);
        if (!member) {
            throw new NotFoundException("Member not found");
        }
        const doc = await this.userDocumentRepository.findById(documentId);
        if (!doc || doc.userId !== member.userId) {
            throw new NotFoundException("Document not found");
        }
        return doc;
    }

    async getMemberAccountSignature(memberId: string, portalId: string): Promise<UserSignature> {
        const member = await this.memberRepository.findByIdForPortal(memberId, portalId);
        if (!member) {
            throw new NotFoundException("Member not found");
        }
        const signature = await this.userSignatureRepository.findByUser(member.userId);
        if (!signature) {
            throw new NotFoundException("Signature not found");
        }
        return signature;
    }
}
