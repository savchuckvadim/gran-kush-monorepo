import type { ArticleContent } from "../../types";

export const aiAgentInYourCrm: ArticleContent = {
    title: "An AI agent in your CRM: what it really does and what you should not expect",
    description:
        "Which tasks of a sales team an AI agent can take on today, how what it produces is controlled, and why the first case should be boring.",
    date: "2026-10-05",
    readingMinutes: 6,
    intro: "Every week someone asks us whether they can «put AI in the CRM». The answer is yes, and the right question is a different one: for which specific task, with what data and who reviews the result. This article collects what we have learned building agents that work inside Bitrix24 and custom systems.",
    sections: [
        {
            heading: "What an agent is, without the marketing",
            paragraphs: [
                "An agent is a program that receives a context, a call recording, a client card, the week's emails, decides what to do following instructions and produces a result in a system: a summary in the card, a task, a draft reply, a row in a report. The language model is one piece; the rest is integration, permissions and control.",
                "The difference from a chat is that the agent does not wait for someone to ask. It runs when something happens, a call ends, an email arrives, a stage changes, and leaves the result where the team already looks.",
            ],
        },
        {
            heading: "The tasks that work today",
            paragraphs: [
                "There is a group of tasks where a well-integrated agent saves time from the first week. They all share three traits: a clear input, a way to check whether the result is good, and a person who can correct it in seconds.",
            ],
            bullets: [
                "Summarise a recorded call and fill in the card report so the rep only confirms.",
                "Classify incoming emails and requests, assign them and propose the first reply.",
                "Prepare management's weekly report from CRM data, with the figures and what changed.",
                "Answer internal questions about price lists, procedures and documents, citing the source.",
                "Spot incomplete or duplicate cards and propose the fix.",
            ],
        },
        {
            heading: "What you should not expect",
            paragraphs: [
                "An agent will not sell for you or replace the rep who knows the client. It will not always get it right either: it will fail on the rare cases and you have to design for that. And it will not fix a CRM with bad data; if the cards are empty, the agent will summarise emptiness.",
                "That is why the first case should be boring. A call summary someone confirms before it is saved. A classification that proposes and does not decide. Once quality has been measured for a few weeks, the safe cases are automated and review is kept for the doubtful ones.",
            ],
        },
        {
            heading: "Data, costs and control",
            paragraphs: [
                "Three questions before starting. What data the agent sees and where it goes: we use the providers' business APIs, which do not train on your data, or models hosted in Europe when needed. What each run costs: a call summary is worth cents, and we measure it from the prototype. And how it is reviewed: every action is logged and can be undone.",
                "With those three answers written down, an agent is built in weeks, not months, and extended case by case with numbers in front of you.",
            ],
        },
    ],
    outro: "If you have a repetitive task with data in the CRM, it is probably a good first case. Describe it in a few lines and we will tell you whether it deserves a two-week prototype.",
    relatedService: "ai",
};
