import { CallHandler, ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";

import { firstValueFrom, of, throwError } from "rxjs";

import { IDEMPOTENCY_SCOPE_METADATA, IdempotencyScope } from "../idempotency.constants";
import { IdempotencyInterceptor } from "../idempotency.interceptor";
import { IdempotencyOutcome, IdempotencyService } from "../idempotency.service";

interface RequestOverrides {
    method?: string;
    headers?: Record<string, string>;
    body?: unknown;
    principal?: {
        portalId: string;
        principalType: string;
        membershipId: string;
    } | null;
}

const buildRequest = (over: RequestOverrides = {}) => {
    const headers = over.headers ?? { "idempotency-key": "key-1" };
    return {
        method: over.method ?? "POST",
        body: over.body ?? { productId: "p-1" },
        principal:
            over.principal === null
                ? undefined
                : (over.principal ?? {
                      portalId: "portal-a",
                      principalType: "member",
                      membershipId: "m-1",
                  }),
        header: (name: string) => headers[name.toLowerCase()],
    };
};

const buildContext = (request: ReturnType<typeof buildRequest>) =>
    ({
        getHandler: () => function handler() {},
        getClass: () => class Controller {},
        switchToHttp: () => ({
            getRequest: () => request,
            getResponse: () => ({}),
        }),
    }) as unknown as ExecutionContext;

/** `null` означает маршрут без `@Idempotent` — явный undefined подставил бы значение по умолчанию. */
const build = (
    outcome: IdempotencyOutcome = { kind: "acquired" },
    scope: string | null = IdempotencyScope.LK_ORDER_CREATE
) => {
    const service = {
        hashRequest: jest.fn().mockReturnValue("hash-1"),
        acquire: jest.fn().mockResolvedValue(outcome),
        complete: jest.fn().mockResolvedValue(undefined),
        release: jest.fn().mockResolvedValue(undefined),
    };
    const reflector = {
        getAllAndOverride: jest.fn((key: string) =>
            key === IDEMPOTENCY_SCOPE_METADATA ? (scope ?? undefined) : undefined
        ),
        get: jest.fn().mockReturnValue(undefined),
    };
    return {
        service,
        reflector,
        interceptor: new IdempotencyInterceptor(
            reflector as unknown as Reflector,
            service as unknown as IdempotencyService
        ),
    };
};

const handlerReturning = (value: unknown): CallHandler => ({ handle: () => of(value) });
const handlerFailing = (error: unknown): CallHandler => ({
    handle: () => throwError(() => error),
});

describe("IdempotencyInterceptor — когда защита не применяется", () => {
    it("маршрут без @Idempotent проходит мимо ключа", async () => {
        const { service, interceptor } = build({ kind: "acquired" }, null);

        const result = await firstValueFrom(
            await interceptor.intercept(
                buildContext(buildRequest()),
                handlerReturning({ id: "order-1" })
            )
        );

        expect(result).toEqual({ id: "order-1" });
        expect(service.acquire).not.toHaveBeenCalled();
    });

    it("запрос без заголовка выполняется как раньше — заголовок опционален", async () => {
        const { service, interceptor } = build();

        const result = await firstValueFrom(
            await interceptor.intercept(
                buildContext(buildRequest({ headers: {} })),
                handlerReturning({ id: "order-1" })
            )
        );

        expect(result).toEqual({ id: "order-1" });
        expect(service.acquire).not.toHaveBeenCalled();
    });

    it("пустой заголовок считается отсутствующим", async () => {
        const { service, interceptor } = build();

        await firstValueFrom(
            await interceptor.intercept(
                buildContext(buildRequest({ headers: { "idempotency-key": "   " } })),
                handlerReturning({ id: "order-1" })
            )
        );

        expect(service.acquire).not.toHaveBeenCalled();
    });

    it("слишком длинный ключ отвергается на входе, а не обрезается в БД", async () => {
        const { interceptor } = build();

        await expect(
            interceptor.intercept(
                buildContext(buildRequest({ headers: { "idempotency-key": "x".repeat(256) } })),
                handlerReturning({})
            )
        ).rejects.toMatchObject({ status: 400 });
    });
});

describe("IdempotencyInterceptor — владелец ключа", () => {
    it("ключ адресуется порталом и принципалом: одинаковый ключ у двух клубов не пересечётся", async () => {
        const { service, interceptor } = build();

        await firstValueFrom(
            await interceptor.intercept(
                buildContext(buildRequest()),
                handlerReturning({ id: "order-1" })
            )
        );

        expect(service.acquire).toHaveBeenCalledWith(
            {
                scope: IdempotencyScope.LK_ORDER_CREATE,
                ownerKey: "portal-a:member:m-1",
                key: "key-1",
            },
            "hash-1"
        );
    });

    it("маршрут без принципала отвергается fail-closed, а не обслуживается общим владельцем", async () => {
        const { service, interceptor } = build();

        await expect(
            interceptor.intercept(
                buildContext(buildRequest({ principal: null })),
                handlerReturning({})
            )
        ).rejects.toMatchObject({ status: 500 });
        expect(service.acquire).not.toHaveBeenCalled();
    });
});

describe("IdempotencyInterceptor — исходы acquire", () => {
    it("повтор отдаёт сохранённый ответ и не вызывает обработчик", async () => {
        const { interceptor } = build({
            kind: "replay",
            statusCode: 201,
            response: { id: "order-1" },
        });
        const handle = jest.fn(() => of({ id: "order-2" }));

        const result = await firstValueFrom(
            await interceptor.intercept(buildContext(buildRequest()), { handle })
        );

        expect(result).toEqual({ id: "order-1" });
        expect(handle).not.toHaveBeenCalled();
    });

    it("тот же ключ с другим телом — 422", async () => {
        const { interceptor } = build({ kind: "mismatch" });

        await expect(
            interceptor.intercept(buildContext(buildRequest()), handlerReturning({}))
        ).rejects.toMatchObject({ status: 422 });
    });

    it("ключ ещё в работе — 409, чтобы клиент перечитал результат, а не создал второй заказ", async () => {
        const { interceptor } = build({ kind: "in_progress" });

        await expect(
            interceptor.intercept(buildContext(buildRequest()), handlerReturning({}))
        ).rejects.toMatchObject({ status: 409 });
    });
});

describe("IdempotencyInterceptor — сохранение результата", () => {
    it("успешный ответ сохраняется под ключом со статусом 201 для POST", async () => {
        const { service, interceptor } = build();

        await firstValueFrom(
            await interceptor.intercept(
                buildContext(buildRequest()),
                handlerReturning({ id: "order-1" })
            )
        );

        expect(service.complete).toHaveBeenCalledWith(expect.anything(), 201, { id: "order-1" });
    });

    it("@HttpCode на маршруте важнее умолчания метода", async () => {
        const { service, reflector, interceptor } = build();
        reflector.get.mockReturnValue(200);

        await firstValueFrom(
            await interceptor.intercept(
                buildContext(buildRequest()),
                handlerReturning({ id: "order-1" })
            )
        );

        expect(service.complete).toHaveBeenCalledWith(expect.anything(), 200, { id: "order-1" });
    });

    it("ошибка обработчика снимает ключ и пробрасывается наружу", async () => {
        const { service, interceptor } = build();
        const failure = new Error("stock depleted");

        const stream = await interceptor.intercept(
            buildContext(buildRequest()),
            handlerFailing(failure)
        );

        await expect(firstValueFrom(stream)).rejects.toBe(failure);
        expect(service.release).toHaveBeenCalled();
        expect(service.complete).not.toHaveBeenCalled();
    });

    it("сбой снятия ключа не маскирует исходную ошибку запроса", async () => {
        const { service, interceptor } = build();
        const failure = new Error("stock depleted");
        service.release.mockRejectedValue(new Error("db is down"));

        const stream = await interceptor.intercept(
            buildContext(buildRequest()),
            handlerFailing(failure)
        );

        await expect(firstValueFrom(stream)).rejects.toBe(failure);
    });
});
