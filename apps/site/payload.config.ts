import { postgresAdapter } from "@payloadcms/db-postgres";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import path from "path";
import { buildConfig } from "payload";
import sharp from "sharp";
import { fileURLToPath } from "url";

import { migrations } from "./migrations";
import { Media, Pages, Plans, Sites, Users } from "./payload/collections";
import { localization } from "./payload/localization";
import { bootstrap } from "./payload/seed/bootstrap";

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default buildConfig({
    admin: {
        user: Users.slug,
        importMap: { baseDir: path.resolve(dirname) },
    },
    localization,
    editor: lexicalEditor(),
    // Its own database next to the API's one: Prisma never touches it and backups stay separate.
    // Dev syncs the schema by push; production (NODE_ENV=production) applies `migrations` on start.
    // The database itself is created on first connect if it does not exist.
    db: postgresAdapter({
        pool: { connectionString: process.env.DATABASE_URL || "" },
        push: process.env.PAYLOAD_DB_PUSH ? process.env.PAYLOAD_DB_PUSH === "true" : undefined,
        migrationDir: path.resolve(dirname, "migrations"),
        prodMigrations: migrations,
    }),
    collections: [Pages, Plans, Sites, Media, Users],
    onInit: bootstrap,
    secret: process.env.PAYLOAD_SECRET || "",
    sharp,
    typescript: { outputFile: path.resolve(dirname, "payload-types.ts") },
});
