import type { ServicePageContent } from "../../types";

export const web: ServicePageContent = {
    key: "web",
    metaTitle: "Website and landing page development",
    metaDescription:
        "Fast, multilingual, SEO-ready corporate websites and landing pages, with a content panel and forms connected to your CRM.",
    title: "Websites and landing pages",
    lead: "A site that loads fast, gets found on Google and turns visits into requests that land straight in your CRM.",
    intro: [
        "A corporate website has one job: the right person understands in ten seconds what you do and writes to you. Everything else, the animation, the content manager, the languages, serves that. So we start with the text and the structure, and only then with the design.",
        "We build with Next.js: pages generated ahead of time, optimised images and high Core Web Vitals scores without tricks. Content is edited from a simple panel or, for small sites, directly in files we version with you. Every language has its URL, its metadata and its sitemap.",
        "Forms do not die in a mailbox: they enter your CRM or Bitrix24 with source, language and page, and notify by Telegram or email. If you sell services, the website is the first piece of the funnel, and we connect it as such.",
    ],
    forWhom: [
        "Service companies that need a serious website in several languages.",
        "Businesses with a specific campaign that deserves its own measurable landing page.",
        "Brands with a slow or uneditable website who want to rebuild it without losing rankings.",
        "Digital products that need a marketing site separate from the application.",
    ],
    deliverables: [
        {
            title: "Structure and copy",
            text: "Page map, messages per section and calls to action. We write or edit the text with you before laying out anything.",
        },
        {
            title: "Design and layout",
            text: "Original design, mobile-ready, with just enough effects for the brand to show without slowing the load.",
        },
        {
            title: "Content manager",
            text: "A panel to edit pages, articles and translations without touching code. With preview and per-person permissions.",
        },
        {
            title: "Technical SEO",
            text: "Metadata per language, structured data, sitemap, redirects from the old site and measurement without tracking cookies.",
        },
        {
            title: "Connected forms",
            text: "Requests that enter the CRM with their source and alert the owner instantly. Spam protection without annoying captchas.",
        },
        {
            title: "Hosting and maintenance",
            text: "Deployment on your own hosting or ours, certificates, backups and security updates.",
        },
    ],
    steps: [
        {
            title: "Brief and structure",
            text: "One session to understand who you are talking to and what they should do after reading. We leave with the site map and the key messages.",
        },
        {
            title: "Design",
            text: "First the home page on desktop and mobile; once approved, the rest follows the same system.",
        },
        {
            title: "Development and content",
            text: "Layout, content panel, translations and integrations. You see the site at a staging address throughout.",
        },
        {
            title: "Launch",
            text: "Redirects, domain, certificates, Search Console and a performance review. Then minor changes included for the first month.",
        },
    ],
    stack: ["Next.js", "React", "Tailwind CSS", "Payload CMS", "next-intl", "Vercel", "Docker"],
    faq: [
        {
            question: "Do you build WordPress sites?",
            answer: "We do not build on WordPress. If your current site is there, we migrate it keeping URLs and rankings; if you only need a small, cheap site, we say so and point you to someone who makes them.",
        },
        {
            question: "How long does a corporate website take?",
            answer: "A landing page, two to four weeks. A corporate site with a content manager and three languages, four to eight. What varies most is the time for copy and approvals.",
        },
        {
            question: "Will we be able to edit the content ourselves?",
            answer: "Yes. The panel is made for people who do not code: pages, articles, images and translations. We leave a short video and a manual.",
        },
        {
            question: "Does it include Google ranking?",
            answer: "It includes the technical part: speed, structure, metadata, structured data and indexing. Content and link strategy is contracted separately or done with your marketing team.",
        },
    ],
};
