import type { ServicePageContent } from "../../types";

export const integrations: ServicePageContent = {
    key: "integrations",
    metaTitle: "Integrations between CRM, website, telephony and accounting",
    metaDescription:
        "We connect the systems you already use: CRM, website, telephony, payments, accounting and messengers. Data that flows on its own, without copying by hand or losing orders.",
    title: "Integrations",
    lead: "The order from the website shows up in the CRM, the invoice in accounting and the alert on the manager's phone, without anyone copying anything.",
    intro: [
        "Most companies do not have a shortage of software; they have software that does not talk. The order comes in through the website, someone copies it into the CRM, another passes it to accounting and a third sends a WhatsApp. Every manual step is a delay and an error waiting to happen.",
        "A well-made integration is boring: an event in one system produces a change in another, with retries if something fails, a log of what happened and an alert if something does not add up. We build them on each tool's official API and on queues, so that one part going down does not lose the other's data.",
        "We often work with Bitrix24 at the centre, but we connect any system with an API: online shops, payment gateways, phone systems, invoicing software, WhatsApp and Telegram, spreadsheets nobody wants to give up yet.",
    ],
    forWhom: [
        "Companies with several systems and one person syncing them by hand.",
        "Online shops and services whose orders must reach the CRM and accounting.",
        "Sales teams that want calls, messages and forms inside the client card.",
        "Businesses that want automatic alerts in Telegram or WhatsApp without one more bot to maintain.",
    ],
    deliverables: [
        {
            title: "Data flow map",
            text: "Which system owns each piece of data, which event triggers which change and what happens if something fails. One page everyone understands.",
        },
        {
            title: "Connectors on official APIs",
            text: "Integrations with each tool's API, with secure authentication, respected limits and controlled versions.",
        },
        {
            title: "Queues and retries",
            text: "Events are queued and retried; if a system is down, the data waits instead of getting lost.",
        },
        {
            title: "Logging and alerts",
            text: "Every synchronisation leaves a trace. If something does not add up, the owner gets an alert with a link to the log.",
        },
        {
            title: "Messaging bots",
            text: "Alerts and replies via Telegram and WhatsApp connected to the CRM: new orders, appointment reminders, confirmations.",
        },
        {
            title: "Documentation and handover",
            text: "Diagrams, environment variables and an operations manual so your team or any provider can maintain it.",
        },
    ],
    steps: [
        {
            title: "Inventory",
            text: "We list systems, accesses and where each piece of data lives. We spot duplicates and unclear owners before connecting anything.",
        },
        {
            title: "Flow design",
            text: "We decide which system is in charge of each piece of data and which events propagate. We validate it with you on real examples.",
        },
        {
            title: "Build and test",
            text: "Connectors with test data, failure simulation and real-volume checks before touching production.",
        },
        {
            title: "Go-live",
            text: "Activation in parts, log monitoring during the first weeks and rule adjustments with the team.",
        },
    ],
    stack: [
        "REST and webhooks",
        "Bitrix24 API",
        "Stripe",
        "Telegram Bot API",
        "WhatsApp Cloud API",
        "BullMQ and Redis",
        "NestJS",
        "PostgreSQL",
    ],
    faq: [
        {
            question: "Do you use Zapier or Make?",
            answer: "For a simple flow with low volume they can do, and we will tell you. When there is business logic, volume or personal data, we build the integration in code: it is cheaper to maintain after a year and does not depend on a third party's pricing.",
        },
        {
            question: "Our system has no API. Can it be integrated?",
            answer: "Often yes: scheduled exports, accessible databases or files exchanged through a folder. We study it in the inventory and tell you what is feasible and what is not worth it.",
        },
        {
            question: "What if one of the tools changes its API?",
            answer: "Connectors are isolated and versioned; a change in one tool is fixed in one place. With monthly support, those updates are covered.",
        },
        {
            question: "How much does an integration cost?",
            answer: "A specific connection between two systems usually stays under €3,000. A full map with several systems, queues and messaging is quoted in stages after the inventory.",
        },
    ],
};
