import type { MigrateUpArgs } from "@payloadcms/db-postgres";

const LEGAL_NOTE = {
    es: "PafPaf: CRM por suscripción para clubes sociales, asociaciones y salones.",
    ru: "PafPaf — CRM по подписке для социальных клубов, ассоциаций и салонов.",
    en: "PafPaf: a subscription CRM for social clubs, associations and salons.",
} as const;

/*
 * The footer note was written for a single club ("a non-profit, it sells nothing"). Production
 * content was seeded once, so the seed change alone never reaches it: the new wording is set here.
 */
export async function up({ payload, req }: MigrateUpArgs): Promise<void> {
    for (const locale of Object.keys(LEGAL_NOTE) as (keyof typeof LEGAL_NOTE)[]) {
        await payload.update({
            collection: "sites",
            where: { code: { equals: "pafpaf" } },
            data: { legalNote: LEGAL_NOTE[locale] },
            locale,
            req,
        });
    }
}

// The old wording is not brought back.
export async function down(): Promise<void> {}
