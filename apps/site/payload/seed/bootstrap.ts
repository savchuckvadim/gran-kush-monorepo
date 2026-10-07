import type { Payload } from "payload";

import { seedContent } from "./seed";

// First start of an empty production database (infra/dokploy). The admin comes from env so that
// /admin never shows Payload's open "create first user" form on a public domain.
// A failure here is logged, not thrown: onInit errors would fail every request of the site.
export async function bootstrap(payload: Payload): Promise<void> {
    try {
        const email = process.env.PAYLOAD_ADMIN_EMAIL;
        const password = process.env.PAYLOAD_ADMIN_PASSWORD;
        if (email && password) {
            const { totalDocs } = await payload.count({ collection: "users" });
            if (totalDocs === 0) {
                await payload.create({ collection: "users", data: { email, password } });
                payload.logger.info(`Bootstrap: created the CMS admin ${email}`);
            }
        }

        if (process.env.PAYLOAD_SEED_IF_EMPTY === "true") {
            const { totalDocs } = await payload.count({ collection: "pages" });
            if (totalDocs === 0) await seedContent(payload);
        }
    } catch (error) {
        payload.logger.error({ err: error }, "Bootstrap failed");
    }
}
