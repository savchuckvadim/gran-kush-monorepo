import {
    ArgumentsHost,
    BadRequestException,
    Catch,
    ExceptionFilter,
    HttpException,
    HttpStatus,
    Logger,
} from "@nestjs/common";

import { Request, Response } from "express";
import * as path from "path";

export interface ApiResponse {
    message: string;
    errors?: string[];
}
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger(GlobalExceptionFilter.name);

    constructor() {}

    catch(exception: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const request = ctx.getRequest<Request>();
        const response = ctx.getResponse<Response>();

        const status =
            exception instanceof HttpException
                ? exception.getStatus()
                : HttpStatus.INTERNAL_SERVER_ERROR;

        const error = exception instanceof Error ? exception : new Error(JSON.stringify(exception));

        // Обработка валидационных ошибок
        if (
            exception instanceof BadRequestException &&
            typeof exception.getResponse === "function"
        ) {
            return this.handleValidationException(exception, request, response);
        }

        // Разбор stack trace
        let file = "";
        let line = "";
        let func = "";
        let code = "";
        try {
            const stackLines = error.stack?.split("\n") || [];
            const target = stackLines.find((l) => l.includes("/src/") || l.includes("src\\"));
            if (target) {
                const match = target.match(/\((.*):(\d+):(\d+)\)/);
                if (match) {
                    const [, filepath, lineno] = match;
                    file = path.relative(process.cwd(), filepath);
                    line = lineno;
                }
            }

            func = stackLines[1]?.trim().split(" ")[1] || "unknown";
            code = stackLines[1] || "";
        } catch (e) {
            console.warn("Stack trace parse failed", e);
        }

        const ip =
            (request.headers["x-forwarded-for"] as string | undefined) ||
            request.socket.remoteAddress ||
            "unknown";
        const userAgent = request.headers["user-agent"] || "unknown";
        const referer = request.headers["referer"] || "n/a";

        const message = `⚠️ Ошибка: ${error.name}\n\n📄 Файл: ${file}\n🔢 Строка: ${String(line)}\n🔧 Функция: ${func}\n\n💥 Код: ${code}\n\n📬 Сообщение: ${error.message}\n\n📍 URL: ${request.method} ${request.url}\n🧭 User-Agent: ${userAgent}\n🌍 IP: ${String(ip)}\n🔗 Referer: ${referer}
        `;
        console.log(message);
        const responseBody: ApiResponse = {
            message: error.message,
            errors: [],
        };
        response.status(status).json(responseBody);
    }

    private handleValidationException(
        exception: BadRequestException,
        request: Request,
        response: Response
    ) {
        const res = exception.getResponse();

        const messageArray =
            typeof res === "object" && res !== null && "message" in res
                ? (res as { message: string | string[] }).message
                : [];

        const validationMessages = Array.isArray(messageArray)
            ? messageArray.join("\n- ")
            : String(messageArray);

        const fullMessage = `❌ Validation error:\n- ${validationMessages}\n\n📍 URL: ${request.method} ${request.url} `;
        this.logger.warn(fullMessage);

        return response.status(400).json({
            // result: null,
            message: "Validation failed",
            errors: messageArray,
        });
    }
}
