import { type MigrateDownArgs, type MigrateUpArgs, sql } from "@payloadcms/db-postgres";

// The default locale first, as in the seed.
const LOCALES = ["es", "ru", "en"] as const;

const OLD_NAME = "Calada";
const NEW_NAME = "Barrio";

const rename = (text: string | null | undefined) => text?.replaceAll(OLD_NAME, NEW_NAME) ?? text;

/*
 * The entry plan was called Calada (Spanish for a puff of smoke); now it is Barrio, its billing codes
 * barrio-month / barrio-year (the API renames its plans in the same release).
 *
 * The enum value is renamed in place: recreating the type, as the generated migration did, cannot
 * cast the existing 'calada' row. The content changes only where the old name is written — the plan's
 * name and billing codes, "Everything in Calada" in the Club plan, the pricing page description — in
 * every locale; everything else is written back as read, so edits made in the Payload admin survive.
 */
export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
    await db.execute(sql`ALTER TYPE "public"."enum_plans_code" RENAME VALUE 'calada' TO 'barrio';`);

    for (const locale of LOCALES) {
        const plans = await payload.find({
            collection: "plans",
            limit: 10,
            depth: 0,
            locale,
            fallbackLocale: false,
            req,
        });
        for (const plan of plans.docs) {
            const isEntry = plan.code === "barrio";
            await payload.update({
                collection: "plans",
                id: plan.id,
                locale,
                data: {
                    name: isEntry ? NEW_NAME : plan.name,
                    features: (plan.features ?? []).map((feature) => ({
                        ...feature,
                        text: rename(feature.text) ?? feature.text,
                    })),
                    billing: isEntry
                        ? { ...plan.billing, monthlyCode: "barrio-month", yearlyCode: "barrio-year" }
                        : plan.billing,
                },
                req,
            });
        }

        const pricing = await payload.find({
            collection: "pages",
            where: { and: [{ site: { equals: "pafpaf" } }, { slug: { equals: "precios" } }] },
            limit: 1,
            depth: 0,
            locale,
            fallbackLocale: false,
            req,
        });
        const page = pricing.docs[0];
        if (page?.seo?.description?.includes(OLD_NAME)) {
            await payload.update({
                collection: "pages",
                id: page.id,
                locale,
                data: { seo: { ...page.seo, description: rename(page.seo.description) } },
                req,
            });
        }
    }
}

// Only the enum goes back; the content keeps the new name.
export async function down({ db }: MigrateDownArgs): Promise<void> {
    await db.execute(sql`ALTER TYPE "public"."enum_plans_code" RENAME VALUE 'barrio' TO 'calada';`);
}
