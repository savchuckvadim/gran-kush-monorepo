import { request } from "node:http";

import { DockerEngine, type PruneResult, type PruneScope } from "../domain/docker-engine";

interface EngineResponse {
    status: number;
    body: string;
}

type JsonObject = Record<string, unknown>;

// a prune on a busy server can take minutes
const REQUEST_TIMEOUT_MS = 10 * 60_000;

const isObject = (value: unknown): value is JsonObject =>
    typeof value === "object" && value !== null && !Array.isArray(value);

const numberOf = (object: JsonObject, key: string): number => {
    const value = object[key];
    return typeof value === "number" && Number.isFinite(value) ? value : 0;
};

const listOf = (object: JsonObject, key: string): unknown[] => {
    const value = object[key];
    return Array.isArray(value) ? value : [];
};

const parseObject = (body: string): JsonObject => {
    const parsed: unknown = body ? JSON.parse(body) : {};
    return isObject(parsed) ? parsed : {};
};

/**
 * Docker Engine API over the daemon's unix socket (a named pipe on Windows), without the docker
 * CLI in the image. Unversioned paths: the daemon answers with its own current API version.
 */
export class DockerEngineHttp extends DockerEngine {
    constructor(private readonly socketPath: string) {
        super();
    }

    async ping(): Promise<void> {
        await this.call("GET", "/_ping");
    }

    async pruneDanglingImages(scope: PruneScope = {}): Promise<PruneResult> {
        const filters: Record<string, string[]> = { dangling: ["true"] };
        if (scope.label) filters.label = [scope.label];
        const body = parseObject(
            await this.call(
                "POST",
                `/images/prune?${new URLSearchParams({ filters: JSON.stringify(filters) })}`
            )
        );
        const deleted = listOf(body, "ImagesDeleted").filter(
            (entry) => isObject(entry) && typeof entry.Deleted === "string"
        );
        return { removed: deleted.length, reclaimedBytes: numberOf(body, "SpaceReclaimed") };
    }

    async pruneBuildCache(keepHours: number | null): Promise<PruneResult> {
        // all=true: every kind of cache, not only the dangling records
        const params = new URLSearchParams({ all: "true" });
        if (keepHours !== null) params.set("filters", JSON.stringify({ until: [`${keepHours}h`] }));
        const body = parseObject(await this.call("POST", `/build/prune?${params}`));
        return {
            removed: listOf(body, "CachesDeleted").length,
            reclaimedBytes: numberOf(body, "SpaceReclaimed"),
        };
    }

    private async call(method: "GET" | "POST", path: string): Promise<string> {
        const response = await this.send(method, path);
        if (response.status >= 200 && response.status < 300) return response.body;

        const message = (() => {
            try {
                const value = parseObject(response.body).message;
                return typeof value === "string" ? value : response.body;
            } catch {
                return response.body;
            }
        })();
        throw new Error(
            `Docker ${method} ${path.split("?")[0]}: ${response.status} ${message}`.trim()
        );
    }

    private send(method: string, path: string): Promise<EngineResponse> {
        return new Promise((resolve, reject) => {
            const req = request(
                { socketPath: this.socketPath, path, method, timeout: REQUEST_TIMEOUT_MS },
                (res) => {
                    const chunks: Buffer[] = [];
                    res.on("data", (chunk: Buffer) => chunks.push(chunk));
                    res.on("end", () =>
                        resolve({
                            status: res.statusCode ?? 0,
                            body: Buffer.concat(chunks).toString("utf8"),
                        })
                    );
                    res.on("error", reject);
                }
            );
            req.on("timeout", () => req.destroy(new Error(`Docker ${method} ${path}: timed out`)));
            req.on("error", reject);
            req.end();
        });
    }
}
