import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { DEFAULT_JANITOR_POLICY, type JanitorPolicy } from "../domain/janitor-policy";

export const DEFAULT_DOCKER_SOCKET = "/var/run/docker.sock";

const logger = new Logger("JanitorConfig");

export const dockerSocketFrom = (config: ConfigService): string =>
    config.get<string>("JANITOR_DOCKER_SOCKET") || DEFAULT_DOCKER_SOCKET;

export const diskPathFrom = (config: ConfigService): string =>
    config.get<string>("JANITOR_DISK_PATH") || "/";

/** Only the threshold is configurable; the rest of the policy is code, on purpose. */
export const janitorPolicyFrom = (config: ConfigService): JanitorPolicy => {
    const raw = config.get<string>("JANITOR_DISK_ALERT_PERCENT");
    if (!raw) return DEFAULT_JANITOR_POLICY;

    const percent = Number(raw);
    if (!Number.isInteger(percent) || percent < 50 || percent > 99) {
        logger.warn(
            `JANITOR_DISK_ALERT_PERCENT=${raw} is not a whole number between 50 and 99, ` +
                `using ${DEFAULT_JANITOR_POLICY.alertPercent}`
        );
        return DEFAULT_JANITOR_POLICY;
    }
    return { ...DEFAULT_JANITOR_POLICY, alertPercent: percent };
};
