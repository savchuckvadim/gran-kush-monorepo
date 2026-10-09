import {
    ArgumentsHost,
    BadRequestException,
    ForbiddenException,
    Logger,
    ServiceUnavailableException,
} from "@nestjs/common";

import { GlobalExceptionFilter } from "../global-exception.filter";

const run = (exception: unknown, headersSent = false) => {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const end = jest.fn();
    const response = { status, end, headersSent };
    const request = { method: "POST", originalUrl: "/crm/orders" };
    const host = {
        switchToHttp: () => ({ getRequest: () => request, getResponse: () => response }),
    } as unknown as ArgumentsHost;

    new GlobalExceptionFilter().catch(exception, host);

    return {
        status: status.mock.calls[0]?.[0] as number | undefined,
        body: json.mock.calls[0]?.[0] as Record<string, unknown> | undefined,
        end,
    };
};

describe("GlobalExceptionFilter", () => {
    beforeAll(() => Logger.overrideLogger(false));

    it("массив нарушений ValidationPipe → Validation failed + errors", () => {
        const { status, body } = run(
            new BadRequestException(["email must be an email", "password too short"])
        );
        expect(status).toBe(400);
        expect(body).toEqual({
            message: "Validation failed",
            errors: ["email must be an email", "password too short"],
        });
    });

    it("BadRequestException со строкой — это не валидация: message как есть", () => {
        const { status, body } = run(new BadRequestException("File type not supported"));
        expect(status).toBe(400);
        expect(body).toEqual({ message: "File type not supported", errors: [] });
    });

    it("исключение без аргументов отдаёт штатный текст, без statusCode/error", () => {
        const { status, body } = run(new ForbiddenException());
        expect(status).toBe(403);
        expect(body).toEqual({ message: "Forbidden", errors: [] });
    });

    it("дополнительные поля объектного ответа сохраняются (readiness checks)", () => {
        const { status, body } = run(
            new ServiceUnavailableException({
                message: "Service not ready",
                checks: { database: "down", redis: "up" },
            })
        );
        expect(status).toBe(503);
        expect(body).toEqual({
            message: "Service not ready",
            errors: [],
            checks: { database: "down", redis: "up" },
        });
    });

    it("ошибка body-parser (http-errors) → её статус и текст", () => {
        const tooLarge = Object.assign(new Error("request entity too large"), {
            status: 413,
            statusCode: 413,
            expose: true,
            type: "entity.too.large",
        });
        const { status, body } = run(tooLarge);
        expect(status).toBe(413);
        expect(body).toEqual({ message: "request entity too large", errors: [] });
    });

    it("неизвестная ошибка → 500 без утечки текста исключения", () => {
        const { status, body } = run(new Error("connect ECONNREFUSED 10.0.0.5:5432"));
        expect(status).toBe(500);
        expect(body).toEqual({ message: "Internal server error", errors: [] });
    });

    it("если заголовки уже ушли — только закрывает ответ", () => {
        const { status, end } = run(new Error("stream broke"), true);
        expect(status).toBeUndefined();
        expect(end).toHaveBeenCalledTimes(1);
    });
});
