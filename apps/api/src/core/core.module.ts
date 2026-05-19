import { Module } from "@nestjs/common";

/**
 * Платформенное ядро (entity-first). Prisma подключается глобально в AppModule.
 * Сюда переносятся общие доменные сервисы по мере рефакторинга.
 */
@Module({})
export class CoreModule {}
