#!/usr/bin/env node
// The image matrix of .github/workflows/deploy.yml, as JSON for `fromJSON`: one API image for all
// installations and crm / admin / site per released installation, with the addresses each Next
// build bakes in. Reads packages/brand/src/installations.json directly: no install needed.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const installations = JSON.parse(
    readFileSync(join(root, "packages/brand/src/installations.json"), "utf8")
);

const NEXT_APPS = ["crm", "admin", "site"];
const NEXT_DOCKERFILE = "infra/docker/next.Dockerfile";

const include = [{ app: "api", brand: "", dockerfile: "infra/docker/api.Dockerfile" }];

for (const [brand, { domain, cabinetSubdomain, released }] of Object.entries(installations)) {
    if (!released) continue;
    for (const app of NEXT_APPS) {
        include.push({
            app,
            brand,
            dockerfile: NEXT_DOCKERFILE,
            site_url: `https://${domain}`,
            api_url: `https://api.${domain}`,
            crm_url: `https://crm.${domain}`,
            member_url: `https://${cabinetSubdomain}.${domain}`,
        });
    }
}

// The studio site (apps/itfirma) is no installation: one build, untagged by brand, its address
// from its own installation.json. Dokploy deploys it by hand (infra/dokploy/itfirma).
const studio = JSON.parse(readFileSync(join(root, "apps/itfirma/installation.json"), "utf8"));
include.push({
    app: "itfirma",
    brand: "",
    dockerfile: NEXT_DOCKERFILE,
    site_url: `https://${studio.domain}`,
});

process.stdout.write(JSON.stringify({ include }));
