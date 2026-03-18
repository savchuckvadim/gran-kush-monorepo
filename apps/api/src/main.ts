import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";

import { setCorsConfig } from "@common/config/cors/cors.config";

import { AppModule } from "./app.module";
import { getSwaggerConfig } from "./common/config/swagger/swagger.config";

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    // Глобальная валидация и трансформация типов
    app.useGlobalPipes(
        new ValidationPipe({
            transform: true, // Автоматически преобразует типы (строки в числа и т.д.)
            whitelist: true, // Удаляет свойства, которых нет в DTO
            forbidNonWhitelisted: false, // Не выбрасывает ошибку при лишних свойствах
        })
    );
    const configService = app.get(ConfigService);
    // Настройка CORS
    setCorsConfig(configService, app);

    // Настройка Swagger
    getSwaggerConfig(app);

    const port = process.env.PORT ?? 3000;
    await app.listen(port);
    console.log(`🚀 Application is running on: http://localhost:${port}`);
    console.log(`📚 Swagger documentation: http://localhost:${port}/docs`);
    console.log(`📋 OpenAPI JSON: http://localhost:${port}/docs-json`);
}

void bootstrap().catch((error: unknown) => {
    console.error("Failed to bootstrap application", error);
    process.exit(1);
});
