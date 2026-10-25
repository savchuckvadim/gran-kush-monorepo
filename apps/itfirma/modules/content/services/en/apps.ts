import type { ServicePageContent } from "../../types";

export const apps: ServicePageContent = {
    key: "apps",
    metaTitle: "Custom web application and SaaS development",
    metaDescription:
        "Internal dashboards, client areas, custom CRMs and multi-tenant SaaS products. From architecture to deployment, with the code in your name.",
    title: "Custom web apps and SaaS",
    lead: "Internal tools, client areas and subscription products that survive years of change without turning into a swamp.",
    intro: [
        "A custom application makes sense when the process is yours and no off-the-shelf tool follows it: a particular approval flow, a way of calculating prices, data living in three places at once. What you are after is not software for its own sake, but that part of the business no longer depending on spreadsheets and memory.",
        "We build web applications on the same technical base we run our own SaaS products on: TypeScript end to end, a documented API, a relational database, queues for background work and automated deployment. It is not the architecture of the month; it is the one we can maintain and another team can inherit.",
        "If the plan is to sell the tool to others, we design it multi-tenant from day one: isolated workspaces per client, roles, subscription billing and an admin panel. It is what we do with our own products, and it is cheaper to think about at the start than to rewrite later.",
    ],
    forWhom: [
        "Companies whose key process lives in spreadsheets, chats and one person's memory.",
        "Businesses that want an area where the client checks, signs and pays on their own.",
        "Founders launching a SaaS product who need the first version in production.",
        "Teams with a legacy tool nobody dares to touch.",
    ],
    deliverables: [
        {
            title: "Architecture and data model",
            text: "A short document with entities, roles, integrations and technical decisions. You review it before the first line of code.",
        },
        {
            title: "Backend and API",
            text: "NestJS and PostgreSQL with an OpenAPI-documented API, session authentication, role permissions and queues for heavy tasks.",
        },
        {
            title: "Interface",
            text: "Next.js and React: fast, accessible, in the languages you need, with reusable components and loading and error states thought through.",
        },
        {
            title: "Multi-tenancy and billing",
            text: "Isolated workspaces per client, plans, trial periods and subscription charging when the product is sold to third parties.",
        },
        {
            title: "Tests and CI",
            text: "Automated tests of the critical logic and checks on every change, so an improvement does not break what already works.",
        },
        {
            title: "Deployment and handover",
            text: "Containers, staging and production environments, backups and monitoring. Repository and accounts in your name.",
        },
    ],
    steps: [
        {
            title: "Discovery",
            text: "Interviews with the people who will use the tool, a review of what exists and a staged scope with the first usable version up front.",
        },
        {
            title: "Solution design",
            text: "Data model, key screens and architecture. We decide together what goes into the first stage and what waits.",
        },
        {
            title: "Development in stages",
            text: "Deliveries every one or two weeks on a staging environment. Each stage is used for real before the next one starts.",
        },
        {
            title: "Production and evolution",
            text: "Launch, training and an improvement plan. Afterwards, monthly support or hourly development, depending on the product's pace.",
        },
    ],
    stack: [
        "TypeScript",
        "Next.js",
        "React",
        "NestJS",
        "PostgreSQL",
        "Prisma",
        "Redis",
        "Docker",
        "Stripe",
    ],
    faq: [
        {
            question: "Why not use a no-code tool?",
            answer: "To test an idea, do. When the process gets complex, the data grows or several systems must be integrated, the cost of fighting the tool exceeds the cost of building your own. We tell you frankly in the first conversation if your case is not there yet.",
        },
        {
            question: "Can we start small?",
            answer: "It is the only way we recommend. The first stage solves the most expensive problem with the minimum of screens; the rest is added when real use asks for it.",
        },
        {
            question: "What if we want to switch providers later?",
            answer: "You take everything: repository, documentation, infrastructure and database. We use common technologies precisely so any TypeScript team can carry on.",
        },
        {
            question: "Do you do the design too?",
            answer: "Yes. For work interfaces we design directly in code on a component system; for products with a strong brand we bring a trusted designer onto the project.",
        },
    ],
};
