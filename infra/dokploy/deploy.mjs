#!/usr/bin/env node
// Deploys the installations one by one after CI pushed the images (.github/workflows/deploy.yml):
// in `deployOrder` (studios first, clubs last), each one only once the previous answers on
// https://api.<domain>/health with its own brand and this commit. A red one stops the rest.
//
//   node infra/dokploy/deploy.mjs <commit sha>
//
// Env: DOKPLOY_URL, DOKPLOY_API_KEY and DOKPLOY_COMPOSE_ID_<BRAND> (e.g. ..._INKSPACE); an
// installation without its compose id is skipped. PafPaf also takes the old DOKPLOY_COMPOSE_ID.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const installations = JSON.parse(
    readFileSync(join(root, "packages/brand/src/installations.json"), "utf8")
);

/** Long enough for a pull of four images, migrations and the API's start period. */
const HEALTH_TIMEOUT_MS = 10 * 60 * 1000;
const HEALTH_POLL_MS = 15 * 1000;
/** The compose id PafPaf had before there were several installations. */
const LEGACY_COMPOSE_ID = { pafpaf: "DOKPLOY_COMPOSE_ID" };

const [sha] = process.argv.slice(2);
const { DOKPLOY_URL, DOKPLOY_API_KEY } = process.env;
if (!sha || !DOKPLOY_URL || !DOKPLOY_API_KEY) {
    console.error("usage: DOKPLOY_URL=… DOKPLOY_API_KEY=… node infra/dokploy/deploy.mjs <sha>");
    process.exit(2);
}

const composeIdOf = (brand) =>
    process.env[`DOKPLOY_COMPOSE_ID_${brand.toUpperCase()}`] ||
    (LEGACY_COMPOSE_ID[brand] ? process.env[LEGACY_COMPOSE_ID[brand]] : undefined);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const triggerDeploy = async (composeId) => {
    const res = await fetch(`${DOKPLOY_URL.replace(/\/+$/, "")}/api/compose.deploy`, {
        method: "POST",
        headers: { "x-api-key": DOKPLOY_API_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ composeId }),
    });
    if (!res.ok) throw new Error(`Dokploy answered ${res.status}: ${await res.text()}`);
};

/** The API of this installation runs this commit: the new containers are up. */
const waitForHealth = async (brand, domain) => {
    const url = `https://api.${domain}/health`;
    const deadline = Date.now() + HEALTH_TIMEOUT_MS;
    let last = "no answer yet";
    while (Date.now() < deadline) {
        try {
            const res = await fetch(url);
            const body = res.ok ? await res.json() : null;
            if (body?.brand === brand && body?.version === sha) return;
            last = res.ok ? `brand ${body?.brand}, version ${body?.version}` : `HTTP ${res.status}`;
        } catch (error) {
            last = error instanceof Error ? error.message : String(error);
        }
        await sleep(HEALTH_POLL_MS);
    }
    throw new Error(`${url} did not report ${brand} @ ${sha} in time (last: ${last})`);
};

const queue = Object.entries(installations)
    .filter(([, installation]) => installation.released)
    .sort(([, a], [, b]) => a.deployOrder - b.deployOrder);

for (const [brand, { domain }] of queue) {
    const composeId = composeIdOf(brand);
    if (!composeId) {
        console.log(`${brand}: no DOKPLOY_COMPOSE_ID_${brand.toUpperCase()}, skipped`);
        continue;
    }
    console.log(`${brand}: deploy queued, waiting for https://api.${domain}/health`);
    await triggerDeploy(composeId);
    await waitForHealth(brand, domain);
    console.log(`${brand}: healthy on ${sha}`);
}
