import { Module } from "@nestjs/common";

import { UsersModule } from "@users/users.module";

import { PrismaModule } from "@common/prisma/prisma.module";

/**
 * AuthModule - базовый модуль для общих сервисов аутентификации
 * Конкретные контроллеры находятся в MembersModule и EmployeesModule
 */
@Module({
    imports: [UsersModule, PrismaModule],
})
export class AuthModule {}
