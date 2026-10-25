import type { ArticleContent } from "../../types";

export const customCrmOrOffTheShelf: ArticleContent = {
    title: "Custom CRM or off the shelf? How to decide in one conversation",
    description:
        "Four questions that separate companies that should configure an existing tool from those that need to build their own. With the hidden costs of each path.",
    date: "2026-10-12",
    readingMinutes: 6,
    intro: "We get both requests equally often: «we want our own CRM» and «we want Bitrix24 configured». And just as often we recommend the opposite of what was asked. The decision hangs on four questions, and it can be answered in half an hour.",
    sections: [
        {
            heading: "Is the process yours or the industry's?",
            paragraphs: [
                "If you sell the way everyone in your industry sells, with contact, proposal, negotiation and close, any serious CRM covers it and the difference lies in configuration. If your edge is in how you work, your own price calculation, a particular approval flow, data no tool models, then the off-the-shelf tool will force you to give up that edge or live with patches.",
                "The quick test: write on one page how a client comes in and what happens until they pay. If the text fits the standard concepts of a CRM, configure. If every second paragraph starts with «in our case», build.",
            ],
        },
        {
            heading: "How many people will use it and what is their time worth?",
            paragraphs: [
                "An off-the-shelf tool charges per user per month, forever. A tool of your own costs to build and then to maintain. With five users, the subscription almost always wins. With fifty, and more so if every extra click costs them minutes a day, the arithmetic changes within two or three years.",
                "There is a second cost nobody puts on the sheet: the tasks the tool does not do and someone ends up doing by hand. That cost is usually the one that decides.",
            ],
        },
        {
            heading: "What does it have to talk to?",
            paragraphs: [
                "An isolated CRM is rare. It has to receive orders from the website, send invoices to accounting, alert by messenger, read the phone system. Off-the-shelf tools have integrations for the popular systems; for the rest, they have to be built anyway.",
                "If most of the value is in those connections, sometimes the best answer is a third one: an off-the-shelf CRM at the centre and a layer of your own around it, with integrations and small apps. That is what we often do with Bitrix24.",
            ],
        },
        {
            heading: "Are you going to sell the tool?",
            paragraphs: [
                "If the plan is for other businesses to pay to use it, the question is no longer whether to build but how: multi-tenant from day one, subscription billing, an admin panel and an architecture that copes with clients you do not know. That is a product, and it is planned as one.",
            ],
            bullets: [
                "Standard process and few users: configure an existing tool.",
                "Your own process and a large team: build, in stages.",
                "Value in the connections: off-the-shelf at the centre, your own layer around it.",
                "You are going to sell it: a SaaS product from the design stage.",
            ],
        },
    ],
    outro: "If you are torn between the two paths, tell us your process in a few lines. We will tell you frankly which we recommend, even if it is the one that gives us no work.",
    relatedService: "apps",
};
