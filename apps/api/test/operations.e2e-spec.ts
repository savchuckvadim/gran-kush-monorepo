import {
    BadRequestException,
    Body,
    Controller,
    INestApplication,
    Injectable,
    Post,
} from "@nestjs/common";
import { Test } from "@nestjs/testing";

import { IsIn, IsString, MaxLength } from "class-validator";
import cookieParser from "cookie-parser";
import request from "supertest";

import { AppModule } from "../src/app.module";
import { RequirePermission } from "../src/common/decorators/auth/require-permission.decorator";
import { PrismaService } from "../src/common/prisma/prisma.service";
import {
    BackgroundOperation,
    defineOperation,
    type OperationContext,
    type OperationRunner,
    RunsOperation,
} from "../src/modules/operations";
import { CrmAuth } from "../src/modules/portal/auth/sessions/api/session-auth.decorators";
import { PERMISSIONS } from "../src/modules/portal/crm/access/domain/permissions";

import { type Club, financeFixtures } from "./support/finance-club";

jest.setTimeout(120_000);

const suffix = Date.now().toString(36);
const PROBE_OUTCOMES = ["ok", "domain_error", "crash"] as const;
type ProbeOutcome = (typeof PROBE_OUTCOMES)[number];
type ProbeInput = { value: string; outcome: ProbeOutcome };
type ProbeResult = { echoed: string; portalId: string };

/** Операция только для теста: исполнитель повторяет вход, отказывает или падает по команде. */
const PROBE_OPERATION = defineOperation<ProbeInput, ProbeResult>({
    kind: "test.probe",
    description: "echo for the e2e",
});

const PROBE_REFUSED = "probe_refused";
const SECRET = "secret internals";

class ProbeDto {
    @IsString()
    @MaxLength(40)
    value!: string;

    @IsIn(PROBE_OUTCOMES)
    outcome!: ProbeOutcome;
}

@Injectable()
@RunsOperation(PROBE_OPERATION)
class ProbeRunner implements OperationRunner<typeof PROBE_OPERATION> {
    async run(input: ProbeInput, context: OperationContext): Promise<ProbeResult> {
        if (input.outcome === "domain_error") {
            throw new BadRequestException({ message: "Probe refused", code: PROBE_REFUSED });
        }
        if (input.outcome === "crash") {
            throw new Error(`${SECRET}: connection string`);
        }
        return { echoed: input.value, portalId: context.portalId };
    }
}

/** Маршрут только для теста: права и DTO проверяются в запросе, работа уходит в очередь. */
@Controller("crm/operations-probe")
@CrmAuth({ subscription: false })
class ProbeController {
    @Post()
    @RequirePermission(PERMISSIONS.FinanceAdmin)
    @BackgroundOperation(PROBE_OPERATION)
    start(@Body() dto: ProbeDto): ProbeInput {
        return { value: dto.value, outcome: dto.outcome };
    }
}

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));
const SETTLE_POLLS = 100;
const SETTLE_STEP_MS = 100;

/**
 * Фоновые операции (TASK-809) на настоящих БД и Redis: 202 и id, результат и событие автору,
 * идемпотентность по ключу, чужой клуб и коллега операцию не видят, сбой исполнителя — `failed`
 * с машинной причиной без внутренностей.
 */
describe("Background operations (e2e)", () => {
    let app: INestApplication;
    let prisma: PrismaService;
    let fx: ReturnType<typeof financeFixtures>;
    let clubA: Club;
    let clubB: Club;
    let ownerEmployeeId: string;
    let employeeCookies: string;

    const start = (club: Club, body: unknown, cookies?: string) =>
        fx.crm(club, "post", "/crm/operations-probe", cookies).send(body);

    const read = (club: Club, id: string, cookies?: string) =>
        fx.crm(club, "get", `/crm/operations/${id}`, cookies);

    const settled = async (club: Club, id: string): Promise<Record<string, unknown>> => {
        for (let i = 0; i < SETTLE_POLLS; i += 1) {
            const res = await read(club, id);
            expect(res.status).toBe(200);
            const body = res.body as Record<string, unknown>;
            if (body.status === "done" || body.status === "failed") return body;
            await sleep(SETTLE_STEP_MS);
        }
        throw new Error(`Operation ${id} did not settle`);
    };

    const operationsOf = (club: Club) =>
        prisma.operation.count({ where: { portalId: club.portalId } });

    beforeAll(async () => {
        const moduleFixture = await Test.createTestingModule({
            imports: [AppModule],
            controllers: [ProbeController],
            providers: [ProbeRunner],
        }).compile();
        app = moduleFixture.createNestApplication();
        app.use(cookieParser());
        await app.init();
        prisma = app.get(PrismaService);
        fx = financeFixtures(app, "op", suffix);

        clubA = await fx.register("a");
        clubB = await fx.register("b");
        ownerEmployeeId = (
            await prisma.employee.findFirstOrThrow({
                where: { portalId: clubA.portalId, role: { key: "owner" } },
                select: { id: true },
            })
        ).id;
        employeeCookies = await fx.seedEmployee(clubA, "employee");
    });

    afterAll(async () => {
        await fx.cleanup([clubA, clubB]);
        await app.close();
    });

    it("отвечает 202 с id, выполняет операцию и пишет результат с событием автору", async () => {
        const res = await start(clubA, { value: "hello", outcome: "ok" });
        expect(res.status).toBe(202);
        const id = res.body.operationId as string;
        expect(id).toMatch(/^[0-9a-f-]{36}$/);

        const body = await settled(clubA, id);
        expect(body.status).toBe("done");
        expect(body.kind).toBe(PROBE_OPERATION.kind);
        expect(body.error).toBeNull();
        expect(body.result).toEqual({ echoed: "hello", portalId: clubA.portalId });
        expect(body.startedAt).toBeTruthy();
        expect(body.finishedAt).toBeTruthy();

        const event = await prisma.domainEvent.findFirstOrThrow({
            where: { name: "operation.finished", aggregateId: id },
        });
        expect(event.portalId).toBe(clubA.portalId);
        expect(event.actorKind).toBe("employee");
        expect(event.actorId).toBe(ownerEmployeeId);
        expect(event.payload).toEqual({
            operationId: id,
            kind: PROBE_OPERATION.kind,
            employeeId: ownerEmployeeId,
        });
    });

    it("повтор с тем же Idempotency-Key — та же операция, тот же ключ с другим входом — 422", async () => {
        const key = `probe-${suffix}`;
        const before = await operationsOf(clubA);
        const first = await start(clubA, { value: "once", outcome: "ok" })
            .set("Idempotency-Key", key)
            .then((res) => res);
        expect(first.status).toBe(202);

        const again = await fx
            .crm(clubA, "post", "/crm/operations-probe")
            .set("Idempotency-Key", key)
            .send({ value: "once", outcome: "ok" });
        expect(again.status).toBe(202);
        expect(again.body.operationId).toBe(first.body.operationId);

        const changed = await fx
            .crm(clubA, "post", "/crm/operations-probe")
            .set("Idempotency-Key", key)
            .send({ value: "twice", outcome: "ok" });
        expect(changed.status).toBe(422);

        expect(await operationsOf(clubA)).toBe(before + 1);
        await settled(clubA, first.body.operationId as string);
    });

    it("невалидное тело — 400 сразу, сотрудник без права — 403; операция не заводится", async () => {
        const before = await operationsOf(clubA);

        const invalid = await start(clubA, { value: "x", outcome: "ok", extra: 1 });
        expect(invalid.status).toBe(400);

        const forbidden = await start(clubA, { value: "x", outcome: "ok" }, employeeCookies);
        expect(forbidden.status).toBe(403);

        expect(await operationsOf(clubA)).toBe(before);
    });

    it("чужой клуб и коллега автора операцию не видят — 404", async () => {
        const res = await start(clubA, { value: "mine", outcome: "ok" });
        expect(res.status).toBe(202);
        const id = res.body.operationId as string;

        const other = await request(app.getHttpServer())
            .get(`/crm/operations/${id}`)
            .set("Cookie", clubB.cookies)
            .set("X-Portal-Slug", clubB.slug);
        expect(other.status).toBe(404);

        const coworker = await read(clubA, id, employeeCookies);
        expect(coworker.status).toBe(404);

        const unknown = await read(clubA, "00000000-0000-4000-8000-000000000000");
        expect(unknown.status).toBe(404);

        const malformed = await read(clubA, "not-a-uuid");
        expect(malformed.status).toBe(400);

        await settled(clubA, id);
    });

    it("доменная ошибка исполнителя — failed с её кодом и событие operation.failed", async () => {
        const res = await start(clubA, { value: "no", outcome: "domain_error" });
        expect(res.status).toBe(202);
        const id = res.body.operationId as string;

        const body = await settled(clubA, id);
        expect(body.status).toBe("failed");
        expect(body.error).toBe(PROBE_REFUSED);
        expect(body.result).toBeNull();

        const event = await prisma.domainEvent.findFirstOrThrow({
            where: { name: "operation.failed", aggregateId: id },
        });
        expect((event.payload as { errorCode: string }).errorCode).toBe(PROBE_REFUSED);
    });

    it("падение исполнителя — failed с operation_failed, внутренности не раскрываются", async () => {
        const res = await start(clubA, { value: "boom", outcome: "crash" });
        expect(res.status).toBe(202);
        const id = res.body.operationId as string;

        const body = await settled(clubA, id);
        expect(body.status).toBe("failed");
        expect(body.error).toBe("operation_failed");
        expect(JSON.stringify(body)).not.toContain(SECRET);

        const event = await prisma.domainEvent.findFirstOrThrow({
            where: { name: "operation.failed", aggregateId: id },
        });
        expect(JSON.stringify(event.payload)).not.toContain(SECRET);
    });
});
