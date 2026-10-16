import { Module } from "@nestjs/common";

import { AccountOwnershipService } from "@users/application/services/account-ownership.service";
import { AccountProvisioningService } from "@users/application/services/account-provisioning.service";
import { UsersService } from "@users/application/services/users.service";
import { UserRepository } from "@users/domain/repositories/user-repository.interface";
import { UserPrismaRepository } from "@users/infrastructure/repositories/user-prisma.repository";

import { PrismaModule } from "@common/prisma/prisma.module";

@Module({
    imports: [PrismaModule],
    providers: [
        UsersService,
        AccountProvisioningService,
        AccountOwnershipService,
        {
            provide: UserRepository,
            useClass: UserPrismaRepository,
        },
    ],
    exports: [UsersService, AccountProvisioningService, AccountOwnershipService, UserRepository],
})
export class UsersModule {}
