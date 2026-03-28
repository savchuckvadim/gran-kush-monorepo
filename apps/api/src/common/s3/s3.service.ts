/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
import { BadRequestException, Global, Injectable } from "@nestjs/common";

import {
    DeleteObjectCommand,
    GetObjectCommand,
    PutObjectCommand,
    type PutObjectCommandInput,
    S3Client,
} from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";

@Global()
@Injectable()
export class S3Service {
    // Типизация S3Client сейчас может считаться "error type" в eslint/ts-пайплайне,
    // поэтому держим `any`, чтобы не ломать сборку/линтинг.
    private s3: any = null;
    private bucket: string | null = null;
    private region: string | null = null;

    constructor() {
        // Проверяем наличие необходимых переменных окружения
        const region = process.env.AWS_REGION;
        const accessKeyId = process.env.AWS_ACCESS_KEY;
        const secretAccessKey = process.env.AWS_SECRET_KEY;
        const bucket = process.env.AWS_BUCKET_NAME;

        if (!region || !accessKeyId || !secretAccessKey || !bucket) {
            console.warn("⚠️ AWS S3 credentials not configured. File uploads will fail.");
            console.warn(
                "Required environment variables: AWS_REGION, AWS_ACCESS_KEY, AWS_SECRET_KEY, AWS_BUCKET_NAME"
            );
            return;
        }

        this.bucket = bucket;
        this.region = region;

        try {
            this.s3 = new S3Client({
                region: region,
                credentials: {
                    accessKeyId: accessKeyId,
                    secretAccessKey: secretAccessKey,
                },
                followRegionRedirects: true, // Автоматически следовать редиректам регионов
            });
        } catch (error) {
            console.error("❌ Failed to initialize S3 client:", error);
        }
    }

    public isConfigured(): boolean {
        return !!this.s3 && !!this.bucket && !!this.region;
    }

    private validateS3Config(): void {
        if (!this.s3 || !this.bucket || !this.region) {
            throw new BadRequestException(
                "S3 storage is not configured. Please set AWS_REGION, AWS_ACCESS_KEY, AWS_SECRET_KEY, and AWS_BUCKET_NAME environment variables."
            );
        }
    }

    public getPublicUrl(key: string): string {
        // Важно: доступ по этому URL возможен только если объект доступен извне (bucket policy / ACL).
        if (!this.bucket || !this.region) return "";
        return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
    }

    private streamToBuffer(body: unknown): Promise<Buffer> {
        if (!body) return Promise.resolve(Buffer.alloc(0));
        if (Buffer.isBuffer(body)) return Promise.resolve(body);
        if (body instanceof Uint8Array) return Promise.resolve(Buffer.from(body));

        // AWS SDK (Node.js) возвращает Readable stream, который поддерживает async iterator.
        const readable = body as AsyncIterable<Uint8Array>;
        const chunks: Buffer[] = [];
        return (async () => {
            for await (const chunk of readable) {
                chunks.push(Buffer.from(chunk));
            }
            return Buffer.concat(chunks);
        })();
    }

    /**
     * Загружает файл (buffer) по ключу в S3.
     * Для публичного доступа обычно нужно настроить bucket policy или выставить ACL (если разрешено).
     */
    public async uploadBuffer(params: {
        key: string;
        buffer: Buffer;
        contentType: string;
        isPublic?: boolean;
    }): Promise<void> {
        this.validateS3Config();

        const { key, buffer, contentType, isPublic } = params;

        const input: PutObjectCommandInput = {
            Bucket: this.bucket!,
            Key: key,
            Body: buffer,
            ContentType: contentType,
        };

        const wantsPublicRead = isPublic;
        // isPublic &&
        // (process.env.AWS_S3_PUBLIC_READ === "true" ||
        //     process.env.S3_OBJECT_ACL === "public-read" ||
        //     process.env.S3_PUBLIC_READ === "true");

        if (wantsPublicRead) {
            input.ACL = "public-read";
        }

        const command = new PutObjectCommand(input);
        await this.s3!.send(command);
    }

    /**
     * Загружает файл в S3
     * @param file - файл (buffer + имя + mimetype)
     * @param folder - папка для организации файлов (например, 'avatars', 'hero', 'posts')
     * @returns URL загруженного файла
     */
    async uploadFile(
        file: { buffer: Buffer; originalname: string; mimetype: string },
        folder?: string
    ): Promise<{ url: string }> {
        this.validateS3Config();
        // Генерируем уникальное имя файла
        const fileExtension = file.originalname.split(".").pop();
        const fileName = `${randomUUID()}.${fileExtension}`;
        const key = folder ? `${folder}/${fileName}` : fileName;

        await this.uploadBuffer({
            key,
            buffer: file.buffer,
            contentType: file.mimetype,
            isPublic: true,
        });

        return { url: this.getPublicUrl(key) };
    }

    /**
     * Удаляет объект из S3 по ключу.
     */
    public async deleteByKey(key: string): Promise<void> {
        this.validateS3Config();

        const command = new DeleteObjectCommand({
            Bucket: this.bucket!,
            Key: key,
        });

        await this.s3!.send(command);
    }

    /**
     * Загружает файл (key) из S3 в buffer.
     */
    public async getObjectBuffer(key: string): Promise<Buffer> {
        this.validateS3Config();

        const command = new GetObjectCommand({
            Bucket: this.bucket!,
            Key: key,
        });

        const res = await this.s3!.send(command);
        return await this.streamToBuffer(res.Body);
    }
}
