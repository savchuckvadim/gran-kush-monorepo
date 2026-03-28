import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { AuthCookieService } from "./services/auth-cookie.service";
import { ConfigCookieService } from "./services/config-cookie.service";

@Module({
    imports: [ConfigModule],
    providers: [ConfigCookieService, AuthCookieService],
    exports: [ConfigCookieService, AuthCookieService],
})
export class CookieModule {}
