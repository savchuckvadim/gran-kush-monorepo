import type { ConfigService } from "@nestjs/config";

import { DEFAULT_JANITOR_POLICY } from "../domain/janitor-policy";
import {
    DEFAULT_DOCKER_SOCKET,
    diskPathFrom,
    dockerSocketFrom,
    janitorPolicyFrom,
} from "../infrastructure/janitor-config";

const configWith = (env: Record<string, string>): ConfigService => {
    const config: Pick<ConfigService, "get"> = { get: (key: string) => env[key] };
    // only `get` is used by the readers under test
    return config as ConfigService;
};

describe("janitor config", () => {
    it("uses the default policy and the standard socket when nothing is set", () => {
        const config = configWith({});
        expect(janitorPolicyFrom(config)).toEqual(DEFAULT_JANITOR_POLICY);
        expect(dockerSocketFrom(config)).toBe(DEFAULT_DOCKER_SOCKET);
        expect(diskPathFrom(config)).toBe("/");
    });

    it("takes a valid alert threshold", () => {
        const policy = janitorPolicyFrom(configWith({ JANITOR_DISK_ALERT_PERCENT: "90" }));
        expect(policy).toEqual({ ...DEFAULT_JANITOR_POLICY, alertPercent: 90 });
    });

    it.each(["abc", "85.5", "120", "10"])("ignores the threshold %s", (value) => {
        const policy = janitorPolicyFrom(configWith({ JANITOR_DISK_ALERT_PERCENT: value }));
        expect(policy.alertPercent).toBe(DEFAULT_JANITOR_POLICY.alertPercent);
    });
});
