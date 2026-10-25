import type { ServicePageContent } from "../../types";

export const devops: ServicePageContent = {
    key: "devops",
    metaTitle: "Infrastructure, deployment and technical support",
    metaDescription:
        "Servers, containers, automatic deployment, backups, monitoring and monthly support for web applications. Simple infrastructure a small team can operate.",
    title: "Infrastructure and support",
    lead: "Servers that hold no surprises, one-click deployments and someone who answers when something breaks. Without a DevOps department.",
    intro: [
        "An application in production needs more than code: where it runs, how it is updated without downtime, what happens when the disk fills up, who finds out something is wrong and how a database is recovered on a Monday at nine. For a small company, that is usually the part nobody wants to own.",
        "We set up deliberately simple infrastructure: one or two servers in the EU, containers, a deployment panel, tested backups and monitoring that alerts by Telegram. It is not Kubernetes; it is what we can operate ourselves and hand over documented to any other team.",
        "Monthly support covers what a living application needs: security updates, small improvements, log review and an agreed response when something fails. For projects we did not build, we start with an audit and a list of risks.",
    ],
    forWhom: [
        "Companies with their own application and no technical team to operate it.",
        "Products that have grown on shared hosting and are starting to fall over.",
        "Teams that deploy by hand and dread every update.",
        "Businesses that need EU hosting with backups and documented compliance.",
    ],
    deliverables: [
        {
            title: "Infrastructure audit",
            text: "What exists, what fails, what risks there are and what it costs to fix them. Ranked and in business language.",
        },
        {
            title: "Servers and containers",
            text: "EU servers, applications in containers, network, certificates and key-based access. All described in code.",
        },
        {
            title: "Automatic deployment",
            text: "Every change is tested and published on its own, with the option to roll back in minutes if something does not add up.",
        },
        {
            title: "Backups and recovery",
            text: "Daily backups of databases and files, encrypted and off the server, with periodic restore tests.",
        },
        {
            title: "Monitoring and alerts",
            text: "Availability, errors, disk and memory watched; alerts by Telegram or email before a client notices.",
        },
        {
            title: "Monthly support",
            text: "Agreed hours for updates, improvements and questions, with a defined response time and a monthly report.",
        },
    ],
    steps: [
        {
            title: "Audit",
            text: "We review servers, deployments, backups and accesses. We deliver a list of risks with priorities.",
        },
        {
            title: "Plan and budget",
            text: "What we change first, what it costs and which servers are needed. Without over-provisioning.",
        },
        {
            title: "Migration",
            text: "New infrastructure in parallel, tests with real data and the switch in an agreed window, with rollback prepared.",
        },
        {
            title: "Operation",
            text: "Monitoring, backups and updates running; monthly support with log review and improvements.",
        },
    ],
    stack: [
        "Docker",
        "Linux",
        "GitHub Actions",
        "Dokploy and Traefik",
        "PostgreSQL",
        "Redis",
        "Cloudflare",
        "Hetzner and AWS (EU)",
    ],
    faq: [
        {
            question: "Can you maintain an application you did not build?",
            answer: "Yes, after an audit. If the code is reasonable and there is documentation, we take on the support; if not, we first propose the minimum fixes to make it operable.",
        },
        {
            question: "What response time do you offer?",
            answer: "It depends on the plan: from a reply on the next working day to attention within a few hours for critical incidents. It is agreed in writing and reported every month.",
        },
        {
            question: "Where are the servers?",
            answer: "In the European Union, usually in Germany or Finland, with backups in another European region. If your sector requires another provider, we adapt.",
        },
        {
            question: "How much does infrastructure cost per month?",
            answer: "A typical business application runs on servers costing between €30 and €150 a month. Monthly support is quoted by agreed hours, separately.",
        },
    ],
};
