import type { ArticleSlug } from "@/modules/shared/config/articles";
import type { Locale } from "@/modules/shared/config/locales";

import type { ArticleContent } from "../types";

import { CA_ARTICLES } from "./ca";
import { EN_ARTICLES } from "./en";
import { ES_ARTICLES } from "./es";
import { RU_ARTICLES } from "./ru";
import { UK_ARTICLES } from "./uk";

const BY_LOCALE: Record<Locale, Record<ArticleSlug, ArticleContent>> = {
    es: ES_ARTICLES,
    en: EN_ARTICLES,
    ru: RU_ARTICLES,
    uk: UK_ARTICLES,
    ca: CA_ARTICLES,
};

export const getArticles = (locale: Locale): Record<ArticleSlug, ArticleContent> =>
    BY_LOCALE[locale];

export const getArticle = (locale: Locale, slug: ArticleSlug): ArticleContent =>
    BY_LOCALE[locale][slug];
