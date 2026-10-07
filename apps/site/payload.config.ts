import { postgresAdapter } from "@payloadcms/db-postgres";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import path from "path";
import { buildConfig } from "payload";
import sharp from "sharp";
import { fileURLToPath } from "url";

import { Media, Pages, Plans, Sites, Users } from "./payload/collections";
import { localization } from "./payload/localization";

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default buildConfig({
    admin: {
        user: Users.slug,
        importMap: { baseDir: path.resolve(dirname) },
    },
    localization,
    editor: lexicalEditor(),
    // Its own database next to the API's one: Prisma never touches it and backups stay separate.
    db: postgresAdapter({
        pool: { connectionString: process.env.DATABASE_URL || "" },
        push: process.env.PAYLOAD_DB_PUSH ? process.env.PAYLOAD_DB_PUSH === "true" : undefined,
    }),
    collections: [Pages, Plans, Sites, Media, Users],
    secret: process.env.PAYLOAD_SECRET || "",
    sharp,
    typescript: { outputFile: path.resolve(dirname, "payload-types.ts") },
});
