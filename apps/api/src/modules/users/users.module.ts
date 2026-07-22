import { Module } from "@nestjs/common";

import { AccountProvisioningService } from "@users/application/services/account-provisioning.service";
import { UsersService } from "@users/application/services/users.service";
import { UserRepository } from "@users/domain/repositories/user-repository.interface";
import { UserPrismaRepository } from "@users/infrastructure/repositories/user-prisma.repository";

import { PrismaModule } from "@common/prisma/prisma.module";

@Module({
    imports: [PrismaModule],
    // controllers: [UsersController],
    providers: [
        UsersService,
        AccountProvisioningService,
        {
            provide: UserRepository,
            useClass: UserPrismaRepository,
        },
    ],
    exports: [UsersService, AccountProvisioningService, UserRepository],
})
export class UsersModule {}
