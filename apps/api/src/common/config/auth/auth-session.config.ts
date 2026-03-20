import type { INestApplication } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import cookieParser from "cookie-parser";
import session from "express-session";

export const setAuthSessionConfig = (configService: ConfigService, app: INestApplication) => {
    const expressApp = app.getHttpAdapter().getInstance();
    expressApp.set("trust proxy", 1);

    app.use(cookieParser(configService.get<string>("COOKIE_SECRET") || undefined));

    app.use(
        session({
            name: configService.get<string>("NEST_SESSION_COOKIE_NAME") || "nest.sid",
            secret: configService.get<string>("NEST_SESSION_SECRET") || "dev-session-secret",
            resave: false,
            saveUninitialized: false,
            cookie: {
                httpOnly: true,
                secure: configService.get<string>("NODE_ENV") === "production",
                sameSite: "lax",
                maxAge: 1000 * 60 * 60 * 24 * 7,
            },
        })
    );
};

