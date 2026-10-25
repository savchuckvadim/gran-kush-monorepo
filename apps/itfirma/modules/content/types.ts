import type { ServiceKey } from "@/modules/shared/config/services";

export interface TitledText {
    title: string;
    text: string;
}

export interface FaqItem {
    question: string;
    answer: string;
}

/** One service page. Texts are written per language in `services/<locale>/<key>.ts`. */
export interface ServicePageContent {
    key: ServiceKey;
    /** Browser tab and search snippet. */
    metaTitle: string;
    metaDescription: string;
    title: string;
    /** One sentence under the title, at most twenty words. */
    lead: string;
    /** Two or three paragraphs: the problem, how the studio approaches it, what the client gets. */
    intro: readonly string[];
    /** Who the service is for: three or four short lines. */
    forWhom: readonly string[];
    /** What is delivered, as a grid of titled items (four to six). */
    deliverables: readonly TitledText[];
    /** How the work goes for this service, three or four steps. */
    steps: readonly TitledText[];
    stack: readonly string[];
    faq: readonly FaqItem[];
}

export interface ArticleSection {
    heading: string;
    paragraphs: readonly string[];
    /** Optional short list after the paragraphs. */
    bullets?: readonly string[];
}

/** One article under /insights, written per language in `articles/<locale>/<slug>.ts`. */
export interface ArticleContent {
    title: string;
    /** Search snippet and the teaser on the list; at most two sentences. */
    description: string;
    /** ISO date of publication. */
    date: string;
    readingMinutes: number;
    intro: string;
    sections: readonly ArticleSection[];
    /** Closing paragraph before the request button. */
    outro: string;
    /** Service the article sells; the page links to it. */
    relatedService: ServiceKey;
}
