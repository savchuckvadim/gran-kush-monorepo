import type { ServicePageContent } from "../../types";

export const mobile: ServicePageContent = {
    key: "mobile",
    metaTitle: "Mobile app development for iOS and Android",
    metaDescription:
        "Mobile apps with a single codebase for iOS and Android: sign-in, payments, notifications, offline mode and publishing on the App Store and Google Play.",
    title: "Mobile apps",
    lead: "One codebase, two stores: apps for clients and for field teams, with their own backend and store publishing included.",
    intro: [
        "Most business apps do not need two native teams. With React Native and Expo we write one application that is published on the App Store and Google Play, shares logic with your website and updates without waiting for store review when the change is interface only.",
        "What separates a useful app from a forgotten icon is the backend and the details: frictionless sign-in, notifications that arrive when they matter, work without coverage that syncs later, payments that do not fail. We design those pieces before the screens.",
        "If you already have a web application or a CRM, the mobile app connects to the same API: the client sees their appointments or orders, the employee checks in or scans a code, and everything stays in a single system.",
    ],
    forWhom: [
        "Businesses with returning clients who book, order or check things from their phone.",
        "Field teams that need to log work, signatures or photos without coverage.",
        "SaaS products adding an app to their existing web application.",
        "Companies with an old app that no longer passes store review.",
    ],
    deliverables: [
        {
            title: "App for iOS and Android",
            text: "One codebase in React Native with Expo, native interface on each platform and over-the-air updates for interface changes.",
        },
        {
            title: "Backend and API",
            text: "A server of its own or a connection to your current system, with authentication, permissions and data synchronisation.",
        },
        {
            title: "Sign-in and notifications",
            text: "Sign-in by email, phone, Google or Apple; targeted push notifications and deep links.",
        },
        {
            title: "Payments and subscriptions",
            text: "Card payments, store subscriptions where they apply and invoicing connected to your accounting.",
        },
        {
            title: "Store publishing",
            text: "Developer accounts, listings, screenshots, privacy policies and answers to review until approval.",
        },
        {
            title: "Analytics and support",
            text: "Error logging, usage metrics and a channel to ship fixes in hours, not weeks.",
        },
    ],
    steps: [
        {
            title: "Scope and prototype",
            text: "We define the essential screens and test them in a clickable prototype before programming.",
        },
        {
            title: "Backend first",
            text: "API, data and notifications ready and tested; the app is built on something that already works.",
        },
        {
            title: "Development and testing",
            text: "Test builds on your phone every one or two weeks through TestFlight and Google Play internal testing.",
        },
        {
            title: "Publishing and follow-up",
            text: "Submission to the stores, answers to review and the first weeks of adjustments with real users.",
        },
    ],
    stack: [
        "React Native",
        "Expo",
        "TypeScript",
        "NestJS",
        "PostgreSQL",
        "Push (APNs, FCM)",
        "Stripe",
    ],
    faq: [
        {
            question: "Native or cross-platform?",
            answer: "For business apps, cross-platform with React Native: one team, one codebase, two stores. We recommend native only when the app depends on hardware or extreme graphics performance, and then we say so.",
        },
        {
            question: "How much does it cost to maintain an app?",
            answer: "Stores change their requirements every year and operating systems every autumn. We set aside a small monthly support for updates, certificates and fixes; the rest depends on how much the product evolves.",
        },
        {
            question: "Do you publish with our developer account?",
            answer: "Yes, always with yours. That way the app, the reviews and the revenue are yours from day one.",
        },
        {
            question: "What if the store rejects the app?",
            answer: "We prepare the listing and the policies with review in mind, and answer objections until approval. It is included in the project.",
        },
    ],
};
