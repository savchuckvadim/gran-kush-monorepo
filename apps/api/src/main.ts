import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";

import cookieParser from "cookie-parser";

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

    app.use(cookieParser(configService.get<string>("COOKIE_SECRET") || undefined));
    // Настройка CORS
    setCorsConfig(configService, app);

    // Swagger закрыт в проде; SWAGGER_ENABLED=true — явное включение (например, на staging)
    const swaggerEnabled =
        configService.get<string>("SWAGGER_ENABLED") === "true" ||
        configService.get<string>("NODE_ENV") !== "production";
    if (swaggerEnabled) {
        getSwaggerConfig(app);
    }

    const port = process.env.PORT ?? 3000;
    await app.listen(port);
    console.log(`🚀 Application is running on: http://localhost:${port}`);
    if (swaggerEnabled) {
        console.log(`📚 Swagger documentation: http://localhost:${port}/docs`);
        console.log(`📋 OpenAPI JSON: http://localhost:${port}/docs-json`);
    }
}

void bootstrap().catch((error: unknown) => {
    console.error("Failed to bootstrap application", error);
    process.exit(1);
});
