import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { StorageService } from "@storage/application/services/storage.service";

import { S3Module } from "@common/s3";

@Module({
    imports: [ConfigModule, S3Module],
    providers: [StorageService],
    exports: [StorageService],
})
export class StorageModule {}
