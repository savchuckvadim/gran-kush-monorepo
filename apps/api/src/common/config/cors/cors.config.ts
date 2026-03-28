import { INestApplication } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

const getCorsConfig = (configService: ConfigService) => {
    const originConfig = configService.get<string>("CORS_ORIGIN");
    const origins = originConfig
        ?.split(",")
        ?.map((origin) => origin.trim())
        ?.filter((origin) => origin.length > 0);
    const methods = ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"];
    return {
        origin: origins,
        methods: methods,
        credentials: true,
        allowedHeaders: [
            "Content-Type",
            "Authorization",
            "X-Portal-Id",
            "X-Portal-Slug",
            "X-Device-Id",
        ],
    };
};

export const setCorsConfig = (configService: ConfigService, app: INestApplication) => {
    const corsConfig = getCorsConfig(configService);
    app.enableCors(corsConfig);
};
