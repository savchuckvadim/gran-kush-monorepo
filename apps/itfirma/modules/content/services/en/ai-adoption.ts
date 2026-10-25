import type { ServicePageContent } from "../../types";

export const aiAdoption: ServicePageContent = {
    key: "aiAdoption",
    metaTitle: "AI adoption in your company's processes",
    metaDescription:
        "Process audit, selection of cases where AI really saves time, rollout with your tools and team training. No hype, with measurement.",
    title: "AI in your processes",
    lead: "We find where AI saves your team hours, connect it to the tools you already use and teach people to work with it.",
    intro: [
        "Almost every company already uses AI somehow: someone drafts emails with a chat, another summarises documents, a third generates images. What is missing is method: which tasks are worth it, with which tool, with what data you may work and how to measure whether it really saves time.",
        "We start with a short audit of the processes: where the same thing is written many times, where data is copied between systems, where one person reads a hundred pages to find one. Out of that comes a list ranked by saving and risk, and the two or three cases to start with.",
        "Then we roll out: sometimes it is configuring an existing tool and writing the instructions; sometimes an agent integrated into the CRM; sometimes a policy on what data may and may not leave the company. And always training, because a tool nobody knows how to use saves nothing.",
    ],
    forWhom: [
        "Management that wants to adopt AI with judgement, not out of fashion.",
        "Administrative and sales teams with a lot of repetitive text.",
        "Companies with sensitive data that need clear rules before using external tools.",
        "Businesses that already tried a chat and want to move to measurable results.",
    ],
    deliverables: [
        {
            title: "Process audit",
            text: "Interviews and observation of real tasks. A list of cases with estimated hours saved, risk and effort.",
        },
        {
            title: "Roadmap",
            text: "The first cases, the tool for each, what to integrate and what to measure. A plan for one quarter, not three years.",
        },
        {
            title: "Data usage policy",
            text: "Which information may go to which tool, which providers comply with GDPR and how the processing is documented.",
        },
        {
            title: "Rollout",
            text: "Tool configuration, instructions and templates, or development of integrated agents when the case calls for it.",
        },
        {
            title: "Hands-on training",
            text: "Sessions per team with their own tasks and documents, not generic examples. Reference material afterwards.",
        },
        {
            title: "Measurement",
            text: "Before and after each case: time, quality and cost. What does not improve is retired without drama.",
        },
    ],
    steps: [
        {
            title: "Audit",
            text: "One or two weeks of interviews and observation. We leave with the ranked list of cases.",
        },
        {
            title: "Pilots",
            text: "Two or three cases with a small group for a month, measured from day one.",
        },
        {
            title: "Rollout",
            text: "What works is extended to the rest of the team with training and documentation; what does not is dropped.",
        },
        {
            title: "Follow-up",
            text: "Monthly review of results, new cases and policy updates when the tools change.",
        },
    ],
    stack: [
        "Claude",
        "ChatGPT",
        "Custom agents",
        "Document automation",
        "Transcription and summarising",
        "Bitrix24 and integrations",
    ],
    faq: [
        {
            question: "Do we need to buy expensive licences?",
            answer: "Usually not at first. Many cases are covered by team plans of the general tools; licences are scaled when the measurement justifies it.",
        },
        {
            question: "How do we protect client data?",
            answer: "With a written policy on what may leave and where to, providers with data processing agreements and, for the most sensitive, models hosted in Europe or on your own infrastructure.",
        },
        {
            question: "How much of the team's time does it take?",
            answer: "The audit takes an hour per person interviewed. The pilots fit into normal work. Training is two-hour sessions per team.",
        },
        {
            question: "What if AI turns out not to work for our case?",
            answer: "We will know after the audit or, at the latest, after the pilot, with numbers. We prefer to say so early rather than sell a long project that improves nothing.",
        },
    ],
};
