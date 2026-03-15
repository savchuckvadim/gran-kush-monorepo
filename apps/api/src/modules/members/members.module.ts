import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule, JwtModuleOptions } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";

import { JWT_DEFAULTS, JWT_ENV_KEYS } from "@auth/domain/constants/jwt.constants";
import { MemberAuthController } from "@members/api/controllers/member-auth.controller";
import { CrmMembersController } from "@members/api/controllers/crm-members.controller";
import { MembersAuthController } from "@members/api/controllers/members-auth.controller";
import { MemberAuthService } from "@members/application/services/member-auth.service";
import { MemberFilesService } from "@members/application/services/member-files.service";
import { MembersService } from "@members/application/services/members.service";
import { DocumentRepository } from "@members/domain/repositories/document-repository.interface";
import { IdentityDocumentRepository } from "@members/domain/repositories/identity-document-repository.interface";
import { MemberDocumentRepository } from "@members/domain/repositories/member-document-repository.interface";
import { MemberMjStatusRepository } from "@members/domain/repositories/member-mj-status-repository.interface";
import { MemberRepository } from "@members/domain/repositories/member-repository.interface";
import { MjStatusRepository } from "@members/domain/repositories/mj-status-repository.interface";
import { SignatureRepository } from "@members/domain/repositories/signature-repository.interface";
import { TokenRepository } from "@members/domain/repositories/token-repository.interface";
import { MEMBER_FILES_QUEUE_NAME } from "@members/events/member-files-events.constants";
import { MemberFilesProcessor } from "@members/infrastructure/processors/member-files.processor";
import { MemberJwtAuthGuard } from "@members/infrastructure/guards/member-jwt-auth.guard";
import { MemberLocalAuthGuard } from "@members/infrastructure/guards/member-local-auth.guard";
import { DocumentPrismaRepository } from "@members/infrastructure/repositories/document.repository";
import { IdentityDocumentPrismaRepository } from "@members/infrastructure/repositories/identity-document.repository";
import { MemberPrismaRepository } from "@members/infrastructure/repositories/member.repository";
import { MemberDocumentPrismaRepository } from "@members/infrastructure/repositories/member-document.repository";
import { MemberMjStatusPrismaRepository } from "@members/infrastructure/repositories/member-mj-status.repository";
import { MjStatusPrismaRepository } from "@members/infrastructure/repositories/mj-status.repository";
import { SignaturePrismaRepository } from "@members/infrastructure/repositories/signature.repository";
import { TokenPrismaRepository } from "@members/infrastructure/repositories/token.repository";
import { MemberJwtStrategy } from "@members/infrastructure/strategies/member-jwt.strategy";
import { MemberLocalStrategy } from "@members/infrastructure/strategies/member-local.strategy";
import { UserRepository } from "@users/domain/repositories/user-repository.interface";
import { UserPrismaRepository } from "@users/infrastructure/repositories/user-prisma.repository";

import { PrismaModule } from "@common/prisma/prisma.module";
import { StorageModule } from "@modules/storage";

@Module({
    imports: [
        PrismaModule,
        PassportModule,
        StorageModule,
        BullModule.registerQueue({
            name: MEMBER_FILES_QUEUE_NAME,
        }),
        JwtModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (configService: ConfigService): JwtModuleOptions => {
                const expiresIn =
                    configService.get<string>(JWT_ENV_KEYS.ACCESS_TOKEN_EXPIRES_IN) ||
                    JWT_DEFAULTS.ACCESS_TOKEN_EXPIRES_IN;
                return {
                    secret: configService.get<string>(JWT_ENV_KEYS.SECRET) || JWT_DEFAULTS.SECRET,
                    signOptions: {
                        expiresIn: expiresIn as unknown as number | undefined,
                    },
                };
            },
        }),
    ],
    providers: [
        MembersService,
        MemberAuthService,
        MemberFilesService,
        MemberFilesProcessor,
        MemberLocalStrategy,
        MemberJwtStrategy,
        MemberJwtAuthGuard,
        MemberLocalAuthGuard,
        {
            provide: MemberRepository,
            useClass: MemberPrismaRepository,
        },
        {
            provide: MjStatusRepository,
            useClass: MjStatusPrismaRepository,
        },
        {
            provide: MemberMjStatusRepository,
            useClass: MemberMjStatusPrismaRepository,
        },
        {
            provide: DocumentRepository,
            useClass: DocumentPrismaRepository,
        },
        {
            provide: MemberDocumentRepository,
            useClass: MemberDocumentPrismaRepository,
        },
        {
            provide: IdentityDocumentRepository,
            useClass: IdentityDocumentPrismaRepository,
        },
        {
            provide: SignatureRepository,
            useClass: SignaturePrismaRepository,
        },
        {
            provide: TokenRepository,
            useClass: TokenPrismaRepository,
        },
        {
            provide: UserRepository,
            useClass: UserPrismaRepository,
        },
    ],
    controllers: [MembersAuthController, MemberAuthController, CrmMembersController],
    exports: [MembersService, MemberAuthService, MemberJwtAuthGuard, MemberLocalAuthGuard],
})
export class MembersModule {}
