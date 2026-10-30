# Background operations

**Implemented** (TASK-809, 2026-10-30). Plan: [tasks/events-realtime](../tasks/events-realtime.md).

A heavy request (a yearly export, a ZIP of attachments, a filing, a mailing) must not hold an HTTP
connection. The route answers at once with `202 { operationId }`, the work runs in the BullMQ queue
`operations`, and the author learns the outcome over the socket (`operation.finished` /
`operation.failed`) or by polling `GET /crm/operations/:id`.

Orders and ordinary forms stay synchronous: the client needs the answer right away (stock, limits,
rights), and repeats are covered by `Idempotency-Key`. Only routes marked `@BackgroundOperation`
go through the queue.

## Shape

```
POST /crm/…  ──guards, pipes──► handler returns the input ──BackgroundOperationInterceptor──► 202 { operationId }
                                                                     │ row `operations` (queued) + job `run`
                                                      OperationsProcessor ──► OperationsService.execute
                                                                     │ queued → running (compare-and-set)
                                                      @RunsOperation(definition) class ──► run(input, context)
                                                                     │ done + result  | failed + error code
                                                      event operation.finished / operation.failed → author's room
```

Module: `apps/api/src/modules/operations` (global, like the event bus).

| Piece                                | Role                                                                                          |
| ------------------------------------ | --------------------------------------------------------------------------------------------- |
| `defineOperation<I, R>({ kind, … })` | One definition links the route and the runner: `kind` is `<module>.<verb>`                    |
| `@BackgroundOperation(definition)`   | On the route handler: the handler returns the input, the interceptor enqueues and answers 202 |
| `@RunsOperation(definition)`         | On a provider class implementing `OperationRunner<typeof definition>`; one kind — one class   |
| `OperationsService`                  | `enqueue`, `getForRequester`, `execute` (the worker body)                                     |
| `operations` table                   | `kind`, `status`, `input`, `result`, `error`, `requested_by_employee_id`, `idempotency_key`   |
| `GET /crm/operations/:id`            | The author reads the state; another club or a coworker gets 404                               |

## Rules

- **Checks stay in the request.** `@BackgroundOperation` sits under `@CrmAuth` and
  `@RequirePermission`; the DTO goes through the global `ValidationPipe`. 401, 403 and 400 come back
  at once, and no row is written.
- **The input is a JSON object** without files or personal data: ids, periods, options. The handler
  returns it; the interceptor serializes it as JSON (dates become strings, `undefined` disappears).
- **Idempotency.** A repeat with the same `Idempotency-Key` and the same input returns the same
  `operationId` (unique index on portal × employee × kind × key); the same key with another input
  is 422. Without the header every request is a new operation.
- **Queue failure is visible.** If BullMQ does not take the job, the row becomes `failed`
  (`operation_queue_unavailable`) and the client gets 503 to retry later. A row never stays
  `queued` without a job.
- **One attempt.** A runner is not required to be idempotent, so a crash is recorded, not retried.
  A domain error (`HttpException` below 500 with a `code`) becomes `error = code`; anything else is
  `operation_failed`, and the details go to the log only — the row and the event never carry
  internals. A process killed mid-run leaves the row `running`; that is visible and honest.
- **Results are small.** A file is stored by the runner (storage module) and the result holds a
  download link with an expiry, never the body.
- **Events carry ids only**: `{ operationId, kind, employeeId }` (+ `errorCode`), audience — the
  author (`employee` room). Rights are checked again when the CRM reads the row.

## Adding an operation

```ts
// <module>/application/operations/export-books.operation.ts
export const EXPORT_BOOKS = defineOperation<ExportBooksInput, ExportBooksResult>({
    kind: "finance.export_books",
    description: "Yearly books as a ZIP with a download link",
});

@Injectable()
@RunsOperation(EXPORT_BOOKS)
export class ExportBooksOperation implements OperationRunner<typeof EXPORT_BOOKS> {
    constructor(private readonly exportLedger: ExportLedgerUseCase) {}
    run(input: ExportBooksInput, context: OperationContext): Promise<ExportBooksResult> {
        return this.exportLedger.executeForYear(context.portalId, context.employeeId, input.year);
    }
}

// the controller
@Post("export/books")
@RequirePermission(PERMISSIONS.FinanceAdmin)
@BackgroundOperation(EXPORT_BOOKS)
exportBooks(@Query() query: ExportBooksQueryDto): ExportBooksInput {
    return { year: query.year };
}
```

1. Register the runner class as a provider of its module; the registry finds it at start.
2. Regenerate `@workspace/api-client`; the route returns `OperationAcceptedDto`.
3. CRM: `useOperation(id)` (`entities/operation`) polls while the operation runs and is
   refreshed by the realtime rule; `<OperationStatus operationId renderResult />`
   (`widgets/operations`) shows the state under the button; `OperationToasts` in the CRM layout
   shows "done" / "failed" for every operation of the employee. Add the kind to
   `common.operations.kinds` in the three message files.
4. E2E: `test/operations.e2e-spec.ts` covers the mechanism with a probe route; a new operation
   needs its own test for the runner.

## Not covered yet

A janitor for old rows (`finished_at` older than a month), progress reporting inside a run, and
recovery of rows left `running` by a crashed process (a stalled-job check) — add them with the
first heavy export (TASK-799).
