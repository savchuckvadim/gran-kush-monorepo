import { NestFactory } from "@nestjs/core";

import { JanitorAppModule } from "@modules/disk-janitor/janitor-app.module";

/**
 * Disk janitor: nightly Docker cleanup and disk alerts for the server, see infra/dokploy/README.md.
 * Its own container from the API image (`node dist/janitor.main`), never inside the API.
 */
const bootstrap = async (): Promise<void> => {
    const app = await NestFactory.createApplicationContext(JanitorAppModule);
    app.enableShutdownHooks();
};

void bootstrap().catch((error: unknown) => {
    console.error("Failed to start the disk janitor", error);
    process.exit(1);
});
