import type { ArticleContent } from "../../types";

export const bitrix24ForActiveB2bSales: ArticleContent = {
    title: "Bitrix24 for active B2B sales: one report per call instead of ten fields",
    description:
        "Why reps do not fill in the CRM, what management can see without asking, and how to configure Bitrix24 so the system does the work after every call.",
    date: "2026-10-20",
    readingMinutes: 7,
    intro: "In active sales the rep makes the call, not waits for it. They cold-call, win a presentation, give it remotely, send a proposal and call again for weeks or months. A CRM designed for orders arriving through a website does not fit that job, which is why so many Bitrix24 portals end up as an expensive diary nobody updates.",
    sections: [
        {
            heading: "The conflict no mandatory field fixes",
            paragraphs: [
                "The rep wants to spend the day talking to clients and keep the promising contacts to themselves. Management wants to know how many calls were made, how many presentations were closed and which clients have gone months without movement. Both are right and both are in the same boat.",
                "The usual answer is to add mandatory fields. The result is well known: fields filled with anything to close the window, and a report management does not believe. The problem is not the team's discipline; it is that they are being asked to do the system's work.",
            ],
        },
        {
            heading: "One form, one screen, after every call",
            paragraphs: [
                "What works is to flip the burden. When a call ends, the rep answers a single screen: who they spoke to, what happened, when the next step is. Nothing more. The system does the rest: moves the deal to the next stage, creates the next contact task, updates the company card and logs the activity for the report.",
                "That form changes with the type of call. A cold call asks whether a presentation was won or when to try again. A presentation asks about the needs found, the objections and the decision. A follow-up call asks whether a proposal was sent and what is missing to close.",
            ],
            bullets: [
                "The rep fills in one screen, not ten fields scattered around the card.",
                "Stages and tasks move on their own from what was answered.",
                "The report is built from that data, not from what someone remembered at the end of the day.",
            ],
        },
        {
            heading: "What management sees without asking",
            paragraphs: [
                "With one report per call, the management dashboard stops being a survey. It shows calls and presentations per rep, conversion between stages, the most frequent reasons for rejection and the list of dormant clients: those past an agreed period without contact.",
                "That last list resolves the conflict from the beginning. If a rep has too many stalled clients, the system shows it and the agreed rules allow redistribution. Nobody loses a client on a whim; they lose it by a rule everyone knew.",
            ],
        },
        {
            heading: "What the portal needs",
            paragraphs: [
                "Technically this is a custom app on the Bitrix24 REST API plus a disciplined portal configuration: pipelines that mirror the real cycle, few but well-defined fields, robots that create tasks from the report and a KPI dashboard reading the same data. The same app can run on several portals, which matters when a network of offices wants the same process everywhere.",
                "What is not needed is a change of CRM. Bitrix24 has what it takes; what is almost always missing is someone sitting down with the team, understanding how they really sell and carrying that into the portal.",
            ],
        },
    ],
    outro: "If your team calls, presents and follows up for months, tell us how you do it today. In a half-hour conversation we will know whether one report per call would fix your portal or whether the problem lies elsewhere.",
    relatedService: "bitrix",
};
