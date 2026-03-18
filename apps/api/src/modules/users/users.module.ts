import { Module } from "@nestjs/common";

import { UsersService } from "@users/application/services/users.service";
import { UserRepository } from "@users/domain/repositories/user-repository.interface";
import { UserPrismaRepository } from "@users/infrastructure/repositories/user-prisma.repository";

import { PrismaModule } from "@common/prisma/prisma.module";

@Module({
    imports: [PrismaModule],
    // controllers: [UsersController],
    providers: [
        UsersService,
        {
            provide: UserRepository,
            useClass: UserPrismaRepository,
        },
    ],
    exports: [UsersService, UserRepository],
})
export class UsersModule {}
