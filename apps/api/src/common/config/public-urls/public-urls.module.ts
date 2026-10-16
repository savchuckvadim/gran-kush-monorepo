import { Global, Module } from "@nestjs/common";

import { PublicUrlsService } from "./public-urls.service";

/** Global: links in emails, OAuth redirects and billing return pages all need the same addresses. */
@Global()
@Module({
    providers: [PublicUrlsService],
    exports: [PublicUrlsService],
})
export class PublicUrlsModule {}
