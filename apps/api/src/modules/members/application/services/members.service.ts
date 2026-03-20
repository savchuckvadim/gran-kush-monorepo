import {
    BadRequestException,
    ConflictException,
    Injectable,
    NotFoundException,
} from "@nestjs/common";

import { RegisterMemberDto } from "@members/api/dto/register-member.dto";
import { DocumentRepository } from "@members/domain/repositories/document-repository.interface";
import { IdentityDocumentRepository } from "@members/domain/repositories/identity-document-repository.interface";
import { MemberDocumentRepository } from "@members/domain/repositories/member-document-repository.interface";
import { MemberMjStatusRepository } from "@members/domain/repositories/member-mj-status-repository.interface";
import { MemberRepository } from "@members/domain/repositories/member-repository.interface";
import { MjStatusRepository } from "@members/domain/repositories/mj-status-repository.interface";
import { SignatureRepository } from "@members/domain/repositories/signature-repository.interface";
import { StorageType } from "@storage/domain/enums/storage-type.enum";
import { MulterFile } from "@storage/domain/interfaces/storage-file.interface";
import { UserRepository } from "@users/domain/repositories/user-repository.interface";
import { hash } from "bcrypt";

import { CrmMemberFullDto, CrmMemberUpdateDto } from "@modules/members/api/dto/crm-member.dto";
import { CrmMemberFilesRequestDto } from "@modules/members/api/dto/crm-member-documents.dto";
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
        private readonly storageService: StorageService
    ) {}

    private async hashPassword(password: string): Promise<string> {
        const hashFn = hash as unknown as (value: string, rounds: number) => Promise<string>;
        return hashFn(password, 10);
    }

    /**
     * Проверка существования пользователя и его ролей
     */
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
     * Создание Member с User
     */
    async createMember(
        dto: RegisterMemberDto,
        force: boolean = false
    ): Promise<{
        userId: string;
        memberId: string;
    }> {
        // Проверяем существование пользователя через репозиторий
        const existingUser = await this.userRepository.findByEmailWithRelations(dto.email);

        if (existingUser) {
            // Если уже есть Member - ошибка
            if (existingUser.member) {
                throw new ConflictException("User is already registered as Member");
            }

            // Если есть Employee, но не force - нужно подтверждение
            if (existingUser.employee && !force) {
                throw new ConflictException(
                    "User already exists as Employee. Please confirm registration as Member."
                );
            }

            // Используем существующего User
            const passwordHash = await this.hashPassword(dto.password);
            await this.userRepository.update(existingUser.id, { passwordHash });

            // Создаем Member через репозиторий
            const member = await this.memberRepository.create({
                userId: existingUser.id,
                name: dto.name,
                surname: dto.surname,
                phone: dto.phone,
                birthday: dto.birthday ? new Date(dto.birthday) : undefined,
                membershipNumber: undefined,
                address: dto.address,
                status: "inProgress",
            });

            // Создаем MjStatus связи
            await this.createMjStatuses(member.id, dto);

            // Создаем Document связи
            if (dto.documentType && dto.documentNumber) {
                await this.createDocument(member.id, dto.documentType, dto.documentNumber);
            }

            return {
                userId: existingUser.id,
                memberId: member.id,
            };
        }

        // Создаем нового User и Member
        const passwordHash = await this.hashPassword(dto.password);
        const user = await this.userRepository.create({
            email: dto.email,
            passwordHash,
        });

        // Создаем Member через репозиторий
        const member = await this.memberRepository.create({
            userId: user.id,
            name: dto.name,
            surname: dto.surname,
            phone: dto.phone,
            birthday: dto.birthday ? new Date(dto.birthday) : undefined,
            membershipNumber: undefined,
            address: dto.address,
            status: "inProgress",
        });

        // Создаем MjStatus связи
        await this.createMjStatuses(member.id, dto);

        // Создаем Document связи
        if (dto.documentType && dto.documentNumber) {
            await this.createDocument(member.id, dto.documentType, dto.documentNumber);
        }

        return {
            userId: user.id,
            memberId: member.id,
        };
    }

    /**
     * Создание связей MjStatus
     */
    private async createMjStatuses(memberId: string, dto: RegisterMemberDto) {
        const statuses: string[] = [];
        if (dto.isMedical) statuses.push("medical");
        if (dto.isMj) statuses.push("mj");
        if (dto.isRecreation) statuses.push("recreation");

        for (const code of statuses) {
            let mjStatus = await this.mjStatusRepository.findByCode(code);
            if (!mjStatus) {
                // Создаем статус если не существует
                mjStatus = await this.mjStatusRepository.create({
                    code,
                    name: code.charAt(0).toUpperCase() + code.slice(1),
                });
            }
            await this.memberMjStatusRepository.create({
                memberId,
                mjStatusId: mjStatus.id,
            });
        }
    }

    /**
     * Создание связи Document
     */
    private async createDocument(memberId: string, documentType: string, documentNumber: string) {
        let document = await this.documentRepository.findByType(documentType);
        if (!document) {
            // Создаем документ если не существует
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

    /**
     * Получить Member по userId
     */
    async findByUserId(userId: string) {
        return this.memberRepository.findByUserId(userId);
    }

    async findById(id: string) {
        return this.memberRepository.findById(id);
    }

    async findAll(limit?: number, skip?: number) {
        return this.memberRepository.findAll(limit, skip);
    }

    async count(): Promise<number> {
        return this.memberRepository.count();
    }

    async updateCrmMember(memberId: string, dto: CrmMemberUpdateDto) {
        const member = await this.memberRepository.findById(memberId);
        if (!member) {
            throw new NotFoundException("Member not found");
        }

        const updatePayload: Partial<{
            name: string;
            surname: string;
            phone: string;
            birthday: Date;
            membershipNumber: string;
            address: string;
            status: string;
            notes: string;
            isActive: boolean;
        }> = {};

        if (dto.name !== undefined) updatePayload.name = dto.name;
        if (dto.surname !== undefined && dto.surname !== null) updatePayload.surname = dto.surname;
        if (dto.phone !== undefined && dto.phone !== null) updatePayload.phone = dto.phone;
        if (dto.birthday !== undefined && dto.birthday)
            updatePayload.birthday = new Date(dto.birthday);
        if (dto.membershipNumber !== undefined && dto.membershipNumber !== null)
            updatePayload.membershipNumber = dto.membershipNumber;
        if (dto.address !== undefined && dto.address !== null) updatePayload.address = dto.address;
        if (dto.status !== undefined && dto.status !== null) updatePayload.status = dto.status;
        if (dto.notes !== undefined && dto.notes !== null) updatePayload.notes = dto.notes;

        if (Object.keys(updatePayload).length > 0) {
            await this.memberRepository.update(memberId, updatePayload);
        }

        const hasMjUpdate =
            dto.isMedical !== undefined || dto.isMj !== undefined || dto.isRecreation !== undefined;

        if (hasMjUpdate) {
            await this.memberMjStatusRepository.deleteByMemberId(memberId);
            await this.createMjStatuses(memberId, {
                isMedical: dto.isMedical ?? false,
                isMj: dto.isMj ?? false,
                isRecreation: dto.isRecreation ?? false,
            } as RegisterMemberDto);
        }

        if (dto.documentType && dto.documentNumber) {
            await this.memberDocumentRepository.deleteByMemberId(memberId);
            await this.createDocument(memberId, dto.documentType, dto.documentNumber);
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
            dto.documentType ?? member.memberDocuments[0]?.document.type ?? "passport";

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
        return {
            ...result,
            identityDocuments:
                result?.identityDocuments.map((item) => ({
                    id: item.id,
                    type: item.type,
                    side: item.side,
                    storagePath: item.storagePath,
                    createdAt: item.createdAt.toISOString(),
                })) ?? [],
            signature: result?.signature
                ? {
                      id: result.signature.id,
                      storagePath: result.signature.storagePath,
                      createdAt: result.signature.createdAt.toISOString(),
                  }
                : null,
            mjStatuses:
                result?.memberMjStatuses.map((item) => ({
                    id: item.mjStatus.id,
                    code: item.mjStatus.code,
                    name: item.mjStatus.name,
                })) ?? [],
            documents:
                result?.memberDocuments.map((item) => ({
                    id: item.id,
                    type: item.document.type,
                    name: item.document.name,
                    number: item.number,
                    createdAt: item.createdAt.toISOString(),
                })) ?? [],
            email: result?.user.email ?? "",
            emailConfirmed: false,
            updatedAt: result?.updatedAt?.toISOString() ?? "",
            createdAt: result?.createdAt?.toISOString() ?? "",
        } as CrmMemberFullDto;
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
