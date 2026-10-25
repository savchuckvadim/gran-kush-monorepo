import type { ServicePageContent } from "../../types";

export const ai: ServicePageContent = {
    key: "ai",
    metaTitle: "AI agent development integrated with your CRM",
    metaDescription:
        "AI assistants that work inside your systems: summarise calls, fill in the CRM, answer clients and prepare reports, with human control and data under GDPR.",
    title: "AI agents",
    lead: "Assistants that read your data, do the repetitive work and leave the decision to people. Inside your CRM, not in a separate tab.",
    intro: [
        "A useful AI agent is not a generic chat. It is a program that receives a specific context, a call recording, a client card, the week's emails, and produces a specific result: a summary in the card, a task for the rep, a draft reply, a report for management. We build it around a use case, not around a technology.",
        "The hard part is not the model but everything around it: what data it may see, how it connects to the CRM, what it does when unsure, how its output is reviewed and what each run costs. That is the part we build carefully, with a log of every action and a human in the loop where the decision matters.",
        "We work with Claude and OpenAI through their European APIs, or with models hosted by you when data cannot leave. For the agent to answer about your documents we use search over your own knowledge base, without training anything on client data.",
    ],
    forWhom: [
        "Sales teams that want summaries and automatic tasks after every call.",
        "Customer support with many repeated questions and a history nobody consults.",
        "Management that needs weekly reports from scattered data.",
        "Companies already using Bitrix24 or another CRM that want AI inside the card.",
    ],
    deliverables: [
        {
            title: "Defined use case",
            text: "Input, output, quality criterion and what happens when the agent is unsure. A one-page document that bounds the project.",
        },
        {
            title: "Integrated agent",
            text: "Connected to your CRM, telephony or email: it reads the context, acts and writes the result where the team already works.",
        },
        {
            title: "Knowledge base",
            text: "Your documents, price lists and procedures indexed so the agent answers with your information and cites where it comes from.",
        },
        {
            title: "Human control",
            text: "Drafts someone approves, actions that are logged and a button to correct the agent when it gets it wrong.",
        },
        {
            title: "Evaluation and costs",
            text: "A set of test cases, quality measurement before every change and a dashboard with the cost per run.",
        },
        {
            title: "Privacy",
            text: "Minimum necessary data, EU-based providers or your own models, and the processing record GDPR asks for.",
        },
    ],
    steps: [
        {
            title: "Case selection",
            text: "We pick a repetitive, measurable task with available data. If there is none, we say so and sell no smoke.",
        },
        {
            title: "Prototype on real data",
            text: "Within one or two weeks the agent processes historical cases and we compare its output with people's.",
        },
        {
            title: "Integration",
            text: "Connection to the CRM or the channel, permissions, action logging and the human review loop.",
        },
        {
            title: "Rollout and improvement",
            text: "Start with a small group, weekly measurement of quality and cost, extension to the rest of the team.",
        },
    ],
    stack: [
        "Claude API",
        "OpenAI API",
        "RAG and vector search",
        "Audio transcription",
        "Bitrix24 API",
        "NestJS",
        "PostgreSQL",
    ],
    faq: [
        {
            question: "Is our data used to train models?",
            answer: "No. We use the providers' business APIs, which do not train on submitted data, or models hosted by you. What the agent learns from your documents lives in your knowledge base, not in the model.",
        },
        {
            question: "How much does each run cost?",
            answer: "It depends on the model and the size of the context. A call summary usually costs cents. We measure the cost from the prototype and show it on a dashboard so there are no surprises.",
        },
        {
            question: "What if the agent gets it wrong?",
            answer: "It will sometimes, which is why we design the review loop: drafts that get approved, reversible actions and a log of everything. Over time, corrected cases go into the tests and quality rises.",
        },
        {
            question: "Can the agent call or write to clients on its own?",
            answer: "It can, but we rarely recommend it at the start. We begin with agents that prepare and a person who sends; once quality is measured, the safe cases are automated.",
        },
    ],
};
