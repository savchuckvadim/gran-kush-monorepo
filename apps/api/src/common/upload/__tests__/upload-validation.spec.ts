import { BadRequestException } from "@nestjs/common";

import { detectUploadMime, mimeForStoragePath, UPLOAD_MIME } from "../file-signature";
import { MiB, UPLOAD_LIMITS } from "../upload.config";
import { decodeDataUrl, validateDataUrl, validateUpload } from "../upload-validation";

const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(64)]);
const PNG = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    Buffer.alloc(64),
]);
const WEBP = Buffer.concat([
    Buffer.from("RIFF"),
    Buffer.alloc(4),
    Buffer.from("WEBP"),
    Buffer.alloc(64),
]);
const PDF = Buffer.from("%PDF-1.7\n%âãÏÓ\n1 0 obj\n");
const HTML = Buffer.from("<html><script>alert(1)</script></html>");

const dataUrl = (mime: string, bytes: Buffer) => `data:${mime};base64,${bytes.toString("base64")}`;

describe("detectUploadMime", () => {
    it.each([
        ["JPEG", JPEG, UPLOAD_MIME.JPEG],
        ["PNG", PNG, UPLOAD_MIME.PNG],
        ["WebP", WEBP, UPLOAD_MIME.WEBP],
        ["PDF", PDF, UPLOAD_MIME.PDF],
    ])("распознаёт %s по сигнатуре", (_, bytes, expected) => {
        expect(detectUploadMime(bytes)).toBe(expected);
    });

    it("не распознаёт HTML и пустой буфер", () => {
        expect(detectUploadMime(HTML)).toBeNull();
        expect(detectUploadMime(Buffer.alloc(0))).toBeNull();
    });

    it("RIFF без WEBP — не изображение (например, WAV)", () => {
        const wav = Buffer.concat([Buffer.from("RIFF"), Buffer.alloc(4), Buffer.from("WAVE")]);
        expect(detectUploadMime(wav)).toBeNull();
    });
});

describe("validateUpload", () => {
    it("документом может быть изображение или PDF, подписью — только изображение", () => {
        expect(validateUpload(PDF, "document").extension).toBe("pdf");
        expect(validateUpload(PNG, "signature").extension).toBe("png");
        expect(() => validateUpload(PDF, "signature")).toThrow(BadRequestException);
    });

    it("HTML не проходит ни под каким видом", () => {
        expect(() => validateUpload(HTML, "document")).toThrow(/not supported/);
    });

    it("пустой файл отклоняется", () => {
        expect(() => validateUpload(Buffer.alloc(0), "document")).toThrow(/empty/);
    });

    it("размер ограничен по виду файла", () => {
        const bigDocument = Buffer.concat([PNG, Buffer.alloc(UPLOAD_LIMITS.documentBytes)]);
        expect(() => validateUpload(bigDocument, "document")).toThrow(/exceeds/);

        const bigSignature = Buffer.concat([PNG, Buffer.alloc(UPLOAD_LIMITS.signatureBytes)]);
        expect(() => validateUpload(bigSignature, "signature")).toThrow(/exceeds/);
        // Тот же буфер как документ проходит: лимит документа шире
        expect(bigSignature.length).toBeLessThan(UPLOAD_LIMITS.documentBytes);
        expect(validateUpload(bigSignature, "document").mime).toBe(UPLOAD_MIME.PNG);
    });

    it("лимит на документ — мегабайты, а не байты", () => {
        expect(UPLOAD_LIMITS.documentBytes).toBeGreaterThanOrEqual(MiB);
    });
});

describe("decodeDataUrl / validateDataUrl", () => {
    it("заявленный MIME не имеет значения: тип берётся из байтов", () => {
        const result = validateDataUrl(dataUrl("image/png", PDF), "document");
        expect(result.mime).toBe(UPLOAD_MIME.PDF);
        expect(result.extension).toBe("pdf");
    });

    it("HTML под видом image/png отклоняется", () => {
        expect(() => validateDataUrl(dataUrl("image/png", HTML), "document")).toThrow(
            /not supported/
        );
    });

    it("принимает параметры data URL перед ;base64", () => {
        const url = `data:image/png;charset=utf-8;base64,${PNG.toString("base64")}`;
        expect(decodeDataUrl(url).equals(PNG)).toBe(true);
    });

    it.each([
        ["без префикса", PNG.toString("base64")],
        ["не base64", "data:image/png;base64,not base64!!"],
        ["без полезной нагрузки", "data:image/png;base64,"],
        ["url-encoded вместо base64", "data:image/png,%89PNG"],
    ])("отклоняет %s", (_, url) => {
        expect(() => decodeDataUrl(url)).toThrow(BadRequestException);
    });
});

describe("mimeForStoragePath", () => {
    it("отдаёт MIME по нашему расширению", () => {
        expect(mimeForStoragePath("private/accounts/u1/abc.jpg")).toBe("image/jpeg");
        expect(mimeForStoragePath("private/accounts/u1/abc.PDF")).toBe("application/pdf");
    });

    it("неизвестное расширение — бинарник", () => {
        expect(mimeForStoragePath("private/accounts/u1/abc.bin")).toBe("application/octet-stream");
        expect(mimeForStoragePath("private/accounts/u1/abc.svg")).toBe("application/octet-stream");
    });
});
