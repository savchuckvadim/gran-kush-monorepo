import {
    BadRequestException,
    ConflictException,
    Injectable,
    NotFoundException,
} from "@nestjs/common";

import { FormPurpose } from "@prisma/client";
import { StorageType } from "@storage/domain/enums/storage-type.enum";
import { MulterFile } from "@storage/domain/interfaces/storage-file.interface";
import { UserRepository } from "@users/domain/repositories/user-repository.interface";
import { hash } from "bcrypt";

import { PrismaService } from "@common/prisma/prisma.service";
import { ensureMjStatusDefaults } from "@common/reference-data/mj-status.seed";
import { DynamicPayloadValidatorService } from "@modules/portal/crm/entity-fields/application/services/dynamic-payload-validator.service";
import { FieldValuesService } from "@modules/portal/crm/entity-fields/application/services/field-values.service";
import { ENTITY_DEFINITION_CODES } from "@modules/portal/crm/entity-fields/constants/entity-definition-codes";
import { MEMBER_FIELD_KEYS } from "@modules/portal/crm/entity-fields/constants/member-field-keys";
import {
    buildMemberFieldMap,
    fieldValueToOptionalDateString,
    getMemberDisplayNameParts,
    jsonValueToScalar,
} from "@modules/portal/crm/entity-fields/lib/member-field-values";
import {
    CrmMemberDocumentDto,
    CrmMemberDto,
    CrmMemberDynamicFieldDto,
    CrmMemberFullDto,
    CrmMemberIdentityDocumentDto,
    CrmMemberMjStatusDto,
    CrmMemberSignatureDto,
    CrmMemberStatusDto,
} from "@modules/portal/crm/members/api/dto/crm-member.dto";
import { CrmMemberFilesRequestDto } from "@modules/portal/crm/members/api/dto/crm-member-documents.dto";
import { DynamicMemberCredentialsDto } from "@modules/portal/crm/members/api/dto/dynamic-member.dto";
import { MemberWithRelations } from "@modules/portal/crm/members/domain/entity/member.entity";
import { DocumentRepository } from "@modules/portal/crm/members/domain/repositories/document-repository.interface";
import { IdentityDocumentRepository } from "@modules/portal/crm/members/domain/repositories/identity-document-repository.interface";
import { MemberDocumentRepository } from "@modules/portal/crm/members/domain/repositories/member-document-repository.interface";
import { MemberMjStatusRepository } from "@modules/portal/crm/members/domain/repositories/member-mj-status-repository.interface";
import {
    MemberListFilters,
    MemberRepository,
} from "@modules/portal/crm/members/domain/repositories/member-repository.interface";
import { MjStatusRepository } from "@modules/portal/crm/members/domain/repositories/mj-status-repository.interface";
import { SignatureRepository } from "@modules/portal/crm/members/domain/repositories/signature-repository.interface";
import { StorageService } from "@modules/storage";

@Injectable()
export class MembersService {
    constructor(
        private readonly memberRepository: MemberRepository,
        private readonly userRepository: UserRepository,
        private readonly mjStatusRepository: MjStatusRepository,
        private readonly memberMjStatusRepository: MemberMjStatusRepository,
        private readonly documentRepository: DocumentRepository,
        private readonly memberDocumentRepository: MemberDocumentRepository,
        private readonly identityDocumentRepository: IdentityDocumentRepository,
        private readonly signatureRepository: SignatureRepository,
        private readonly storageService: StorageService,
        private readonly prisma: PrismaService,
        private readonly dynamicValidator: DynamicPayloadValidatorService,
        private readonly fieldValues: FieldValuesService
    ) {}

    private async hashPassword(password: string): Promise<string> {
        const hashFn = hash as unknown as (value: string, rounds: number) => Promise<string>;
        return hashFn(password, 10);
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
            identityDocuments: member.profile.identityDocuments.map(
                (doc): CrmMemberIdentityDocumentDto => ({
                    id: doc.id,
                    type: doc.type,
                    side: doc.side,
                    storagePath: doc.storagePath,
                    createdAt: doc.createdAt.toISOString(),
                })
            ),
            signature: member.profile.signature
                ? ({
                      id: member.profile.signature.id,
                      storagePath: member.profile.signature.storagePath,
                      createdAt: member.profile.signature.createdAt.toISOString(),
                  } satisfies CrmMemberSignatureDto)
                : null,
            mjStatuses: member.profile.memberMjStatuses.map(
                (item): CrmMemberMjStatusDto => ({
                    id: item.mjStatus.id,
                    code: item.mjStatus.code,
                    name: item.mjStatus.name,
                })
            ),
            documents: member.profile.memberDocuments.map(
                (item): CrmMemberDocumentDto => ({
                    id: item.document.id,
                    type: item.document.type,
                    name: item.document.name,
                    number: item.number,
                    createdAt: item.createdAt.toISOString(),
                })
            ),
            birthday,
            address: typeof address === "string" ? address : null,
            membershipNumber: member.membershipNumber ?? null,
            notes: typeof notes === "string" ? notes : null,
        };
    }

    async checkUserExists(email: string): Promise<{
        exists: boolean;
        hasEmployee: boolean;
        hasMember: boolean;
        message?: string;
    }> {
        const user = await this.userRepository.findByEmailWithRelations(email);

        if (!user) {
            return {
                exists: false,
                hasEmployee: false,
                hasMember: false,
            };
        }

        const hasEmployee = !!user.employee;
        const hasMember = !!user.member;

        let message: string | undefined;
        if (hasEmployee && !hasMember) {
            message =
                "You are already registered as an Employee. Do you want to register as a Member?";
        } else if (hasMember) {
            message = "You are already registered as a Member.";
        }

        return {
            exists: true,
            hasEmployee,
            hasMember,
            message,
        };
    }

    /**
     * Создание Member + User; поля валидируются по схеме портала (purpose).
     */
    async createMemberWithDynamicFields(
        dto: DynamicMemberCredentialsDto & { fields: Record<string, unknown> },
        force: boolean,
        portalId: string,
        purpose: FormPurpose
    ): Promise<{
        userId: string;
        memberId: string;
    }> {
        const validatedFields = await this.dynamicValidator.validateMemberPayload(
            portalId,
            purpose,
            dto.fields
        );

        const statusItemId = await this.resolveDefaultMemberStatusItemId(portalId);

        const existingUser = await this.userRepository.findByEmailWithRelations(dto.email);

        if (existingUser) {
            if (existingUser.member) {
                throw new ConflictException("User is already registered as Member");
            }

            if (existingUser.portalId && existingUser.portalId !== portalId) {
                throw new ConflictException("User already belongs to another portal");
            }

            if (existingUser.employee && !force) {
                throw new ConflictException(
                    "User already exists as Employee. Please confirm registration as Member."
                );
            }

            const passwordHash = await this.hashPassword(dto.password);
            await this.userRepository.update(existingUser.id, { passwordHash, portalId });

            const member = await this.memberRepository.create({
                userId: existingUser.id,
                portalId,
                statusItemId,
            });

            await this.fieldValues.upsertMemberFieldValues(portalId, member.id, validatedFields);
            await this.applyPostFieldSideEffects(member.id, validatedFields);

            return {
                userId: existingUser.id,
                memberId: member.id,
            };
        }

        const passwordHash = await this.hashPassword(dto.password);
        const user = await this.userRepository.create({
            email: dto.email,
            passwordHash,
            portalId,
        });

        const member = await this.memberRepository.create({
            userId: user.id,
            portalId,
            statusItemId,
        });

        await this.fieldValues.upsertMemberFieldValues(portalId, member.id, validatedFields);
        await this.applyPostFieldSideEffects(member.id, validatedFields);

        return {
            userId: user.id,
            memberId: member.id,
        };
    }

    private async applyPostFieldSideEffects(
        memberId: string,
        fields: Record<string, unknown>
    ): Promise<void> {
        const medical = fields[MEMBER_FIELD_KEYS.IS_MEDICAL];
        const mj = fields[MEMBER_FIELD_KEYS.IS_MJ];
        const rec = fields[MEMBER_FIELD_KEYS.IS_RECREATION];

        if (medical !== undefined || mj !== undefined || rec !== undefined) {
            await this.memberMjStatusRepository.deleteByMemberId(memberId);
            const flags = {
                isMedical: medical === true,
                isMj: mj === true,
                isRecreation: rec === true,
            };
            await this.syncMjStatuses(memberId, flags);
        }

        const docType = fields[MEMBER_FIELD_KEYS.DOCUMENT_TYPE];
        const docNum = fields[MEMBER_FIELD_KEYS.DOCUMENT_NUMBER];
        if (typeof docType === "string" && typeof docNum === "string" && docType && docNum) {
            await this.memberDocumentRepository.deleteByMemberId(memberId);
            await this.createDocument(memberId, docType, docNum);
        }
    }

    private async syncMjStatuses(
        memberId: string,
        flags: { isMedical: boolean; isMj: boolean; isRecreation: boolean }
    ) {
        await ensureMjStatusDefaults(this.prisma);

        const codes: string[] = [];
        if (flags.isMedical) codes.push("medical");
        if (flags.isMj) codes.push("mj");
        if (flags.isRecreation) codes.push("recreation");

        for (const code of codes) {
            const mjStatus = await this.mjStatusRepository.findByCode(code);
            if (!mjStatus) {
                throw new BadRequestException(
                    `MJ status "${code}" отсутствует в справочнике. Выполните POST /platform/system/reference-data (платформа) или prisma:seed:admin.`
                );
            }
            await this.memberMjStatusRepository.create({
                memberId,
                mjStatusId: mjStatus.id,
            });
        }
    }

    private async createDocument(memberId: string, documentType: string, documentNumber: string) {
        let document = await this.documentRepository.findByType(documentType);
        if (!document) {
            document = await this.documentRepository.create({
                type: documentType,
                name: documentType,
            });
        }
        await this.memberDocumentRepository.create({
            memberId,
            documentId: document.id,
            number: documentNumber,
        });
    }

    async findByUserId(userId: string) {
        return this.memberRepository.findByUserId(userId);
    }

    async findById(id: string) {
        return this.memberRepository.findById(id);
    }

    async findAll(limit?: number, skip?: number, filters?: MemberListFilters) {
        return this.memberRepository.findAll(limit, skip, filters);
    }

    async count(): Promise<number> {
        return this.memberRepository.count();
    }

    async updateCrmMember(
        memberId: string,
        dto: import("@modules/portal/crm/members/api/dto/crm-member.dto").CrmMemberFieldsPatchDto
    ) {
        const member = await this.memberRepository.findById(memberId);
        if (!member) {
            throw new NotFoundException("Member not found");
        }
        const portalId = member.portalId;
        if (!portalId) {
            throw new BadRequestException("Member has no portal");
        }

        if (dto.fields && Object.keys(dto.fields).length > 0) {
            const validated = await this.dynamicValidator.validateMemberPartialUpdate(
                portalId,
                dto.fields
            );
            await this.fieldValues.upsertMemberFieldValues(portalId, memberId, validated);
            await this.applyPostFieldSideEffects(memberId, validated);
        }

        if (dto.statusItemId !== undefined) {
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

        return this.memberRepository.findById(memberId);
    }

    async updateCrmMemberFiles(
        memberId: string,
        dto: CrmMemberFilesRequestDto,
        files: {
            documentFirst?: MulterFile[];
            documentSecond?: MulterFile[];
            signature?: MulterFile[];
        }
    ): Promise<CrmMemberFullDto> {
        const member = await this.memberRepository.findById(memberId);
        if (!member) {
            throw new NotFoundException("Member not found");
        }

        const documentType =
            dto.documentType ?? member.profile.memberDocuments[0]?.document.type ?? "passport";

        const documentFirst = files.documentFirst?.[0];
        const documentSecond = files.documentSecond?.[0];
        const signature = files.signature?.[0];

        if (!documentFirst && !documentSecond && !signature) {
            throw new BadRequestException(
                "At least one file (document or signature) must be provided."
            );
        }

        if (documentFirst) {
            const firstPath = await this.savePrivateUploadedFile(
                documentFirst,
                `identity-first-${documentType}`,
                memberId
            );
            await this.identityDocumentRepository.upsertByMemberTypeAndSide({
                memberId,
                type: documentType,
                side: "first",
                storagePath: firstPath,
            });
        }

        if (documentSecond) {
            const secondPath = await this.savePrivateUploadedFile(
                documentSecond,
                `identity-second-${documentType}`,
                memberId
            );
            await this.identityDocumentRepository.upsertByMemberTypeAndSide({
                memberId,
                type: documentType,
                side: "second",
                storagePath: secondPath,
            });
        }

        if (signature) {
            const signaturePath = await this.savePrivateUploadedFile(
                signature,
                "signature",
                memberId
            );
            await this.signatureRepository.upsertByMemberId(memberId, {
                storagePath: signaturePath,
            });
        }

        const result = await this.memberRepository.findById(memberId);
        if (!result) {
            throw new NotFoundException("Member not found");
        }
        return this.toCrmMemberFullDto(result);
    }

    private getExtensionFromMime(mimeType: string): string {
        const mimeToExtension: Record<string, string> = {
            "image/jpeg": "jpg",
            "image/jpg": "jpg",
            "image/png": "png",
            "image/webp": "webp",
            "application/pdf": "pdf",
        };

        return mimeToExtension[mimeType] ?? "bin";
    }

    private async savePrivateUploadedFile(
        file: MulterFile,
        filePrefix: string,
        memberId: string
    ): Promise<string> {
        const extension = this.getExtensionFromMime(file.mimetype);

        const uploaded = await this.storageService.uploadFile(
            {
                buffer: file.buffer,
                originalname: `${filePrefix}.${extension}`,
                mimetype: file.mimetype,
            },
            `members/${memberId}`,
            StorageType.PRIVATE
        );

        return uploaded.relativePath;
    }
}
