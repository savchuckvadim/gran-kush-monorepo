import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { DockerEngineHttp } from "../infrastructure/docker-engine.http";

interface Seen {
    method: string;
    path: string;
    query: URLSearchParams;
}

type Reply = { status: number; body: unknown };

let counter = 0;
const socketPathFor = (): string => {
    counter += 1;
    const name = `janitor-test-${process.pid}-${counter}`;
    return process.platform === "win32" ? `\\\\.\\pipe\\${name}` : join(tmpdir(), `${name}.sock`);
};

/** A fake Docker daemon on a unix socket (a named pipe on Windows). */
const fakeDaemon = async (reply: (seen: Seen) => Reply) => {
    const seen: Seen[] = [];
    const server: Server = createServer((req: IncomingMessage, res: ServerResponse) => {
        const url = new URL(req.url ?? "/", "http://docker");
        const request = { method: req.method ?? "", path: url.pathname, query: url.searchParams };
        seen.push(request);
        const { status, body } = reply(request);
        res.writeHead(status, { "Content-Type": "application/json" });
        res.end(typeof body === "string" ? body : JSON.stringify(body));
    });
    const socketPath = socketPathFor();
    await new Promise<void>((resolve) => server.listen(socketPath, resolve));
    const close = () => new Promise<void>((resolve) => server.close(() => resolve()));
    return { engine: new DockerEngineHttp(socketPath), seen, close };
};

describe("DockerEngineHttp", () => {
    it("pings the daemon", async () => {
        const daemon = await fakeDaemon(() => ({ status: 200, body: "OK" }));
        try {
            await daemon.engine.ping();
            expect(daemon.seen).toEqual([
                expect.objectContaining({ method: "GET", path: "/_ping" }),
            ]);
        } finally {
            await daemon.close();
        }
    });

    it("prunes only dangling images and counts deleted images, not removed tags", async () => {
        const daemon = await fakeDaemon(() => ({
            status: 200,
            body: {
                ImagesDeleted: [
                    { Untagged: "ghcr.io/x/api@sha256:aa" },
                    { Deleted: "sha256:aa" },
                    { Deleted: "sha256:bb" },
                ],
                SpaceReclaimed: 4096,
            },
        }));
        try {
            const result = await daemon.engine.pruneDanglingImages();

            expect(result).toEqual({ removed: 2, reclaimedBytes: 4096 });
            const [request] = daemon.seen;
            expect(request?.method).toBe("POST");
            expect(request?.path).toBe("/images/prune");
            expect(JSON.parse(request?.query.get("filters") ?? "{}")).toEqual({
                dangling: ["true"],
            });
        } finally {
            await daemon.close();
        }
    });

    it("narrows the image prune to a label and survives a null list", async () => {
        const daemon = await fakeDaemon(() => ({
            status: 200,
            body: { ImagesDeleted: null, SpaceReclaimed: 0 },
        }));
        try {
            const result = await daemon.engine.pruneDanglingImages({ label: "pafpaf.test=1" });

            expect(result).toEqual({ removed: 0, reclaimedBytes: 0 });
            expect(JSON.parse(daemon.seen[0]?.query.get("filters") ?? "{}")).toEqual({
                dangling: ["true"],
                label: ["pafpaf.test=1"],
            });
        } finally {
            await daemon.close();
        }
    });

    it("prunes every kind of build cache, keeping recent records when asked", async () => {
        const daemon = await fakeDaemon(() => ({
            status: 200,
            body: { CachesDeleted: ["a", "b", "c"], SpaceReclaimed: 1024 },
        }));
        try {
            await expect(daemon.engine.pruneBuildCache(24)).resolves.toEqual({
                removed: 3,
                reclaimedBytes: 1024,
            });
            await daemon.engine.pruneBuildCache(null);

            const [keep, everything] = daemon.seen;
            expect(keep?.path).toBe("/build/prune");
            expect(keep?.query.get("all")).toBe("true");
            expect(JSON.parse(keep?.query.get("filters") ?? "{}")).toEqual({ until: ["24h"] });
            expect(everything?.query.get("all")).toBe("true");
            expect(everything?.query.has("filters")).toBe(false);
        } finally {
            await daemon.close();
        }
    });

    it("turns a Docker error into a readable message", async () => {
        const daemon = await fakeDaemon(() => ({
            status: 409,
            body: { message: "a prune operation is already running" },
        }));
        try {
            await expect(daemon.engine.pruneDanglingImages()).rejects.toThrow(
                "Docker POST /images/prune: 409 a prune operation is already running"
            );
        } finally {
            await daemon.close();
        }
    });

    it("fails when nothing listens on the socket", async () => {
        const engine = new DockerEngineHttp(socketPathFor());
        await expect(engine.ping()).rejects.toThrow();
    });
});
