import type { LegalContent } from "../types";

export const en: LegalContent = {
    "aviso-legal": {
        title: "Legal notice",
        sections: [
            {
                heading: "Site owner",
                paragraphs: [
                    "In compliance with Spanish Law 34/2002 on Information Society Services and Electronic Commerce (LSSI-CE), the owner of {domain} is {name}, self-employed professional (autónomo), tax ID {nif}, with address at {address}. Contact e-mail: {email}.",
                    "IT-firma is the trade name under which {name} provides software development, systems integration and technology consulting services.",
                ],
            },
            {
                heading: "Purpose",
                paragraphs: [
                    "This site presents the studio's services and lets you send a request for a quote. The published information is indicative and not a binding offer; the terms of each project are agreed in writing.",
                ],
            },
            {
                heading: "Intellectual property",
                paragraphs: [
                    "The texts, design and code of this site belong to {name}, except third-party brands and names, which belong to their owners. Reproduction for commercial purposes without permission is not allowed.",
                ],
            },
            {
                heading: "Liability",
                paragraphs: [
                    "{name} is not liable for damage arising from the use of the information on this site or from the content of linked external sites. The site is kept available and up to date as far as possible, without guaranteeing uninterrupted service.",
                ],
            },
            {
                heading: "Governing law",
                paragraphs: [
                    "The relationship between the user and the owner is governed by Spanish law. Any dispute is subject to the courts competent under that law.",
                ],
            },
        ],
    },
    privacidad: {
        title: "Privacy policy",
        sections: [
            {
                heading: "Data controller",
                paragraphs: [
                    "{name}, self-employed professional, tax ID {nif}, with address at {address}. Data protection contact: {email}.",
                ],
            },
            {
                heading: "What data is processed and why",
                paragraphs: [
                    "The contact form collects a name, an e-mail address, a phone number or Telegram handle (optional), the kind of service, the estimated budget and the text of the request. The data is used only to answer the request, prepare a proposal and, where applicable, enter into a contract.",
                    "The legal basis is the consent given when sending the form (art. 6.1.a GDPR) and, once an agreement is reached, the performance of the contract (art. 6.1.b GDPR). The site makes no automated decisions and builds no profiles.",
                ],
            },
            {
                heading: "Retention",
                paragraphs: [
                    "Requests that do not lead to a contract are kept for at most twelve months after the last communication. Client data is kept for the duration of the relationship and the periods required by tax and commercial law.",
                ],
            },
            {
                heading: "Recipients",
                paragraphs: [
                    "The request is delivered to the owner by e-mail and Telegram. The e-mail, messaging and hosting providers act as data processors. No data is shared with third parties for commercial purposes. Where a provider is outside the European Economic Area, the transfer relies on the European Commission's standard contractual clauses.",
                ],
            },
            {
                heading: "Your rights",
                paragraphs: [
                    "You may exercise your rights of access, rectification, erasure, objection, restriction and portability by writing to {email}. If you believe the processing breaches the law, you may lodge a complaint with the Spanish Data Protection Agency (aepd.es).",
                ],
            },
        ],
    },
    cookies: {
        title: "Cookie policy",
        sections: [
            {
                heading: "What this site uses",
                paragraphs: [
                    "This site uses no tracking, analytics or advertising cookies. No third-party service that identifies the visitor is loaded.",
                    "The only thing stored in the browser is the chosen look (theme and light or dark mode), in the browser's own local storage. It is a technical preference, does not identify a person and can be cleared at any time from the browser settings.",
                ],
            },
            {
                heading: "Fonts",
                paragraphs: [
                    "Fonts are served from {domain} itself; no requests are made to third-party font servers when the page loads.",
                ],
            },
        ],
    },
};
