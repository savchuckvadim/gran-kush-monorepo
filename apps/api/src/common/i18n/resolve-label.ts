import { ContentLocale } from "./content-locale";

/** Всё, из чего складывается подпись поля или статуса. `labelI18n` — сырой JSON из БД. */
export interface LabelSource {
    label: string | null;
    labelI18n?: unknown;
    labelOverride?: string | null;
}

const nonEmpty = (value: unknown): value is string =>
    typeof value === "string" && value.trim().length > 0;

const translationFor = (labelI18n: unknown, locale: ContentLocale): string | null => {
    if (labelI18n === null || typeof labelI18n !== "object" || Array.isArray(labelI18n)) {
        return null;
    }
    const value = (labelI18n as Record<string, unknown>)[locale];
    return nonEmpty(value) ? value : null;
};

/**
 * Подпись для показа: переименование клубом → перевод системного шаблона → базовая подпись.
 * Переименование клуба выигрывает всегда: клуб пишет на своём языке и ждёт увидеть своё.
 */
export function resolveLabel(
    source: LabelSource & { label: string },
    locale: ContentLocale
): string;
export function resolveLabel(source: LabelSource, locale: ContentLocale): string | null;
export function resolveLabel(source: LabelSource, locale: ContentLocale): string | null {
    if (nonEmpty(source.labelOverride)) {
        return source.labelOverride;
    }
    return translationFor(source.labelI18n, locale) ?? source.label;
}
