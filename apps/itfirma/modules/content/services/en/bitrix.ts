import type { ServicePageContent } from "../../types";

export const bitrix: ServicePageContent = {
    key: "bitrix",
    metaTitle: "Turnkey Bitrix24 implementation",
    metaDescription:
        "We configure Bitrix24 around your sales process: pipelines, automations, telephony, reports, data migration, training and custom apps where configuration stops.",
    title: "Turnkey Bitrix24",
    lead: "A CRM configured around how your team sells, with automations that save clicks and data the manager sees without asking.",
    intro: [
        "Bitrix24 bundles CRM, tasks, telephony, chats and automations in one subscription. That is its strength and its trap: a fresh portal has hundreds of options and none of them reflects your business. The usual outcome is a CRM that reps fill in grudgingly and management does not trust.",
        "We start from the process, not the screens. Together we describe how a client comes in, what happens on each call, who decides and when a sale is lost. Then we translate that process into the portal: pipelines, fields, automations, roles and the reports people actually look at.",
        "Where standard configuration stops, we build apps for your portal on the REST API: one-screen forms in the card, custom robots, KPI dashboards and synchronisation with other systems. The same apps run on several portals at once, so a network of offices or franchises is administered from one place.",
    ],
    forWhom: [
        "Active sales teams that call, present and follow up for months.",
        "Companies that already have Bitrix24 and do not use it, or use it as an expensive notebook.",
        "Networks of offices or distributors that need the same process on several portals.",
        "Businesses migrating from spreadsheets or another CRM without losing their history.",
    ],
    deliverables: [
        {
            title: "Sales process map",
            text: "Stages, owners, drop-off points and what data is captured at each step. The document everything else is configured from.",
        },
        {
            title: "Configured portal",
            text: "Pipelines, fields, client cards, roles and permissions, email and document templates. No fields nobody fills in.",
        },
        {
            title: "Automations and robots",
            text: "Automatic tasks and reminders, stage changes on events, alerts to the manager when a client goes cold.",
        },
        {
            title: "Telephony and messaging",
            text: "Calls from the card with recording, a report form after the call, WhatsApp and Telegram in the same CRM chat.",
        },
        {
            title: "Reports for management",
            text: "Conversion by stage and by rep, daily activity, reasons for loss. Inside Bitrix24 or on a separate dashboard.",
        },
        {
            title: "Training and manual",
            text: "Sessions with the team on their own portal, a short manual with screenshots and the first weeks of adjustments included.",
        },
    ],
    steps: [
        {
            title: "Process audit",
            text: "Two or three sessions with management and with reps. We leave with the process map and the list of what gets automated.",
        },
        {
            title: "Configuration",
            text: "We build the portal on a staging environment with anonymised real data. You review every pipeline before the team sees it.",
        },
        {
            title: "Migration and launch",
            text: "We import clients and deals, connect telephony and the website, train the team and go live on a Monday with live support.",
        },
        {
            title: "Adjustment",
            text: "During the first weeks we fix what practice changes: a spare field, an annoying robot, a missing report.",
        },
    ],
    stack: [
        "Bitrix24 REST API",
        "Marketplace apps",
        "Robots and business processes",
        "SIP and VoIP telephony",
        "WhatsApp and Telegram",
        "NestJS",
        "PostgreSQL",
    ],
    faq: [
        {
            question: "Do you work with cloud portals and on-premise installations?",
            answer: "Yes. Most clients use the Bitrix24 cloud; for on-premise installations we apply the same apps and automations, deployed on your server.",
        },
        {
            question: "Do we have to buy the licence through you?",
            answer: "No. You contract the licence directly with Bitrix24 or whoever you prefer; we charge for the implementation work, not the subscription.",
        },
        {
            question:
                "We already have Bitrix24 configured and it does not work. Can it be fixed without starting over?",
            answer: "Almost always. We audit the portal, keep what works, remove dead fields and robots and retrain the team. Starting over only if the history is worth nothing.",
        },
        {
            question: "How long does an implementation take?",
            answer: "Three to eight weeks. A small team with a clear pipeline goes live in three; a network with telephony, several portals and custom apps gets closer to two months.",
        },
    ],
};
