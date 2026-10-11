import type { LegalContent } from "../types";

export const en: LegalContent = {
    ui: {
        eyebrow: "Legal",
        updated: "Last updated",
        translationNote:
            "This is a translation for convenience. In case of any discrepancy, the Spanish version prevails.",
        otherDocs: "Legal documents",
        pending: {
            nif: "[tax ID pending]",
            address: "[address pending]",
            email: "[email pending]",
        },
    },
    docs: {
        "aviso-legal": {
            title: "Legal notice",
            description: "Who runs paf-paf.app and the terms of use of the website.",
            sections: [
                {
                    heading: "Website owner",
                    blocks: [
                        "As required by Article 10 of Spanish Law 34/2002 on information society services and e-commerce (LSSI-CE), these are the details of the owner of this website:",
                        {
                            list: [
                                "Owner: {name}, self-employed professional (autónomo).",
                                "Tax ID (NIF): {nif}.",
                                "Address: {address}.",
                                "Email: {email}.",
                                "Website: paf-paf.app. Application: crm.paf-paf.app.",
                            ],
                        },
                        "The owner is not registered in the Commercial Registry or any other public registry because of this activity.",
                    ],
                },
                {
                    heading: "Purpose",
                    blocks: [
                        "This website presents PafPaf, a cloud management software (CRM) sold by subscription, and gives access to sign-up and log-in. Subscribing to the service is governed by the [Terms and conditions](doc:terminos).",
                    ],
                },
                {
                    heading: "Terms of use",
                    blocks: [
                        "Access to the website is free and needs no registration. Users agree to use it lawfully and in line with these terms, and not to harm the website, its systems or other people's data.",
                    ],
                },
                {
                    heading: "Intellectual and industrial property",
                    blocks: [
                        "The PafPaf software, texts, design, logos and other content of the website belong to the owner or are used under licence. They may not be reproduced, distributed or modified without permission, except for private use and the exceptions provided by law.",
                    ],
                },
                {
                    heading: "Liability",
                    blocks: [
                        "The owner tries to keep the information on the website accurate and up to date, but does not guarantee that it is error-free or that the website is always available. Links to third-party websites are provided for reference only; the owner is not responsible for their content.",
                    ],
                },
                {
                    heading: "Point of contact",
                    blocks: [
                        "For any question, to report illegal content, and for communications from authorities and users under Articles 11 and 12 of Regulation (EU) 2022/2065 (Digital Services Act), the point of contact is {email}. We reply in Spanish, English and Russian.",
                    ],
                },
                {
                    heading: "Governing law and jurisdiction",
                    blocks: [
                        "This notice is governed by Spanish law. Disputes are submitted to the courts of the owner's domicile, unless the law assigns them to another court, such as that of the consumer's domicile.",
                    ],
                },
            ],
        },

        privacidad: {
            title: "Privacy policy",
            description:
                "Which personal data PafPaf processes as controller, why, for how long, and how to exercise your rights.",
            sections: [
                {
                    heading: "Controller",
                    blocks: [
                        "{name}, self-employed professional, tax ID {nif}, address {address}. Data protection contact: {email}.",
                    ],
                },
                {
                    heading: "Who this policy covers",
                    blocks: [
                        "It covers visitors to paf-paf.app and PafPaf customers: the clubs, associations, studios and professionals that subscribe to the service, and the people who use the application on their behalf (owners and employees).",
                        "The data of members, clients and employees that each customer records in its PafPaf workspace is processed by that customer as controller; PafPaf acts only as a processor under the [Data processing agreement](doc:encargo). To exercise your rights over that data, contact the organisation you deal with.",
                    ],
                },
                {
                    heading: "What data we process and why",
                    blocks: [
                        {
                            table: {
                                head: ["Data", "Purpose", "Legal basis"],
                                rows: [
                                    [
                                        "Technical visit data: IP address, browser, requested pages",
                                        "Serve the website, protect it against abuse and diagnose errors",
                                        "Legitimate interest in the security of the service (Art. 6(1)(f) GDPR)",
                                    ],
                                    [
                                        "Account: name, email, phone, role, hashed password, access logs",
                                        "Create the workspace, provide access and deliver the subscribed service",
                                        "Performance of the contract (Art. 6(1)(b) GDPR)",
                                    ],
                                    [
                                        "Billing: company name, tax ID, address, plan, payments",
                                        "Collect the subscription, issue invoices and meet tax and accounting obligations",
                                        "Performance of the contract and legal obligation (Art. 6(1)(b) and (c) GDPR)",
                                    ],
                                    [
                                        "Email and the content of your messages",
                                        "Answer questions and provide support",
                                        "Performance of the contract or, if you are not yet a customer, your request",
                                    ],
                                    [
                                        "Customer email",
                                        "Tell you about PafPaf news similar to what you subscribed to; you can unsubscribe in every message",
                                        "Art. 21(2) LSSI-CE and legitimate interest; for other marketing, your consent",
                                    ],
                                ],
                            },
                        },
                        "We use no analytics or advertising tools, do no profiling and make no automated decisions with legal effects on you.",
                        "Payments are processed by Stripe. PafPaf neither receives nor stores your full card details.",
                    ],
                },
                {
                    heading: "How long we keep it",
                    blocks: [
                        {
                            list: [
                                "Account data: for the duration of the contract and, after it ends, the data export period set in the Terms (30 days). It is then deleted.",
                                "Invoices and accounting data: six years (Article 30 of the Spanish Commercial Code) and, in any case, while tax liabilities may arise.",
                                "Technical logs: only as long as needed for the security of the service, at most 90 days.",
                                "Enquiries without a contract: until resolved and then for the period of possible claims.",
                            ],
                        },
                    ],
                },
                {
                    heading: "Recipients",
                    blocks: [
                        "We do not disclose your data to third parties unless required by law. The providers that serve us access it only for that purpose and under a processing agreement: hosting, file storage, content delivery, email and payments. The full list with locations is in [Sub-processors](doc:subencargados).",
                        "Some of these providers belong to groups based in the United States. In those cases the transfer relies on the EU-US Data Privacy Framework and, as an additional safeguard, the European Commission's standard contractual clauses.",
                    ],
                },
                {
                    heading: "Your rights",
                    blocks: [
                        "You may request access to, rectification or erasure of your data, restriction of processing and data portability, object to processing, and withdraw consent where it is the legal basis. Write to {email} stating the right you exercise; we may ask you to prove your identity. We reply within one month.",
                        "If you believe we have not handled your request properly, you can complain to the Spanish Data Protection Agency ([www.aepd.es](https://www.aepd.es)).",
                    ],
                },
                {
                    heading: "Security",
                    blocks: [
                        "Connections are encrypted, passwords are stored with a one-way hash and each customer's data is kept separate from everyone else's. Access to the systems is limited to those who need it.",
                    ],
                },
                {
                    heading: "Minors",
                    blocks: [
                        "PafPaf is a service for organisations and professionals and is not intended for anyone under 18.",
                    ],
                },
                {
                    heading: "Changes",
                    blocks: [
                        "If we change this policy, we will publish the new version on this page with its date and, if the change is significant, notify customers by email.",
                    ],
                },
            ],
        },

        cookies: {
            title: "Cookie policy",
            description:
                "Which cookies and local storage paf-paf.app and the PafPaf application use.",
            sections: [
                {
                    heading: "What they are",
                    blocks: [
                        "Cookies are small files the website stores in your browser. This policy also covers similar technologies, such as the browser's local storage (localStorage).",
                    ],
                },
                {
                    heading: "What we use",
                    blocks: [
                        "We only use technical cookies and storage, or preferences you choose yourself. They are exempt from consent under Article 22(2) LSSI-CE, so we show no cookie banner.",
                        {
                            table: {
                                head: ["Name", "Where", "Purpose", "Duration"],
                                rows: [
                                    [
                                        "NEXT_LOCALE",
                                        "paf-paf.app",
                                        "Remember the chosen language when it differs from your browser's",
                                        "Session",
                                    ],
                                    [
                                        "pafpaf.mode (localStorage)",
                                        "paf-paf.app",
                                        "Remember light or dark mode",
                                        "Until you delete it",
                                    ],
                                    [
                                        "crm_access_token",
                                        "crm.paf-paf.app",
                                        "Keep you logged in",
                                        "15 minutes",
                                    ],
                                    [
                                        "crm_refresh_token",
                                        "crm.paf-paf.app",
                                        "Renew the session without entering the password again",
                                        "7 days",
                                    ],
                                    [
                                        "crm.skin, crm.eco, theme (localStorage)",
                                        "crm.paf-paf.app",
                                        "Remember the visual theme, energy saving and light or dark mode",
                                        "Until you delete it",
                                    ],
                                    [
                                        "payload-token",
                                        "paf-paf.app/admin",
                                        "Session of the website editors",
                                        "Working session",
                                    ],
                                    [
                                        "__cf_bm and similar",
                                        "All domains",
                                        "Security: Cloudflare may use them to tell people from bots",
                                        "Up to 30 minutes",
                                    ],
                                ],
                            },
                        },
                        "We use no analytics, advertising or social media cookies. If we ever add them, we will ask for your consent first and you will be able to refuse them just as easily.",
                    ],
                },
                {
                    heading: "How to remove them",
                    blocks: [
                        "You can delete or block cookies and local storage in your browser settings. If you block the session cookies of crm.paf-paf.app, you will not be able to log in to the application.",
                    ],
                },
            ],
        },

        terminos: {
            title: "Terms and conditions",
            description:
                "Terms of the PafPaf subscription: sign-up, trial, prices, payment, cancellation, data and liability.",
            sections: [
                {
                    heading: "Parties and purpose",
                    blocks: [
                        "These terms govern the subscription to PafPaf, a cloud management software (CRM), between {name}, self-employed professional with tax ID {nif} (“PafPaf”), and the organisation or professional that creates a workspace in the service (“the Customer”). By signing up, the Customer accepts them together with the [Data processing agreement](doc:encargo), which is part of the contract.",
                        "The contract is concluded online, in Spanish; the English and Russian versions are translations. The Customer can download or print these terms from this page at any time and receives a sign-up confirmation by email.",
                    ],
                },
                {
                    heading: "A service for professionals",
                    blocks: [
                        "PafPaf is offered to clubs, associations, studios, companies and professionals for their activity. By signing up, the Customer declares that it acts in that capacity and provides its tax ID.",
                        "If the Customer nevertheless qualifies as a consumer under applicable law, it keeps the rights that law grants and that cannot be excluded, including withdrawal within 14 calendar days of subscribing. If it asks for the service to start before that period ends, it pays for the part of the period already provided.",
                    ],
                },
                {
                    heading: "Sign-up and accounts",
                    blocks: [
                        "The Customer undertakes to provide true data and keep it up to date, and is responsible for its employees' accounts, for keeping credentials safe and for anything done with them. It must notify PafPaf as soon as it suspects unauthorised access.",
                    ],
                },
                {
                    heading: "Trial period",
                    blocks: [
                        "Sign-up may include a free trial whose length is shown at sign-up. When it ends, the Customer chooses a plan and pays for it to keep using the service. Until then, access is limited to the subscription section, and the data is kept for at least 30 days so the Customer can subscribe or request an export.",
                    ],
                },
                {
                    heading: "Plans, prices and taxes",
                    blocks: [
                        "Current plans and prices are published at [paf-paf.app/en/precios](https://paf-paf.app/en/precios). Prices are in euros and exclude VAT. Customers in Spain are charged 21% VAT; customers in other EU Member States with a valid VAT number are invoiced without VAT under the reverse charge mechanism.",
                        "PafPaf may change prices with at least 30 days' notice. The new price applies from the next billing period, and the Customer may cancel before that if it disagrees.",
                    ],
                },
                {
                    heading: "Payment, renewal and invoices",
                    blocks: [
                        "The subscription is paid in advance, monthly or yearly, through Stripe. It renews automatically at the end of each period until the Customer cancels. By agreement with PafPaf, yearly plans may be paid by bank transfer.",
                        "PafPaf issues an invoice for every payment and sends it by email or makes it available in the application. The Customer agrees to receive invoices electronically.",
                    ],
                },
                {
                    heading: "Non-payment",
                    blocks: [
                        "If a charge fails, the Customer has 7 days to settle it. After that, access is limited to the subscription section until payment. Data is not deleted because of non-payment and is governed by the section on termination.",
                    ],
                },
                {
                    heading: "Cancellation and termination",
                    blocks: [
                        "The Customer may cancel at any time in the application, under Settings → Subscription, or by writing to {email}. Cancellation takes effect at the end of the period already paid; partial periods are not refunded unless required by law.",
                        "PafPaf may terminate the contract with 30 days' notice, or immediately if the Customer seriously breaches these terms, in particular the acceptable use rules.",
                    ],
                },
                {
                    heading: "Customer data, export and switching provider",
                    blocks: [
                        "The data the Customer enters in PafPaf belongs to the Customer. PafPaf processes it as a processor under the [Data processing agreement](doc:encargo).",
                        "At the Customer's request, PafPaf delivers a full export of its data in a structured, commonly used format (JSON or CSV, plus attached files) within 30 days at most. Exporting and switching to another data processing service provider are free of charge.",
                        "To switch provider, the Customer may give notice of up to two months. After the contract ends, its data remains available for export for 30 days and is then deleted, unless the law requires it to be kept.",
                    ],
                },
                {
                    heading: "Licence to use",
                    blocks: [
                        "During the subscription, PafPaf grants the Customer and its users a non-exclusive, non-transferable right to use the software for their own activity. The software and its improvements remain PafPaf's. It may not be copied, resold, decompiled or used to build a competing service, except as permitted by law.",
                    ],
                },
                {
                    heading: "Acceptable use",
                    blocks: [
                        "The Customer will use PafPaf lawfully. It is responsible for the data it enters and for having a legal basis to process it; it will not upload more data than necessary, in particular copies of identity documents or special categories of data without legal justification.",
                        "Anyone can report allegedly illegal content hosted on PafPaf to {email}, stating where it is and why it is illegal. PafPaf will review it diligently, may suspend access to the content or the account if confirmed, and will explain the reasons for its decision to those affected.",
                    ],
                },
                {
                    heading: "Availability and support",
                    blocks: [
                        "PafPaf takes reasonable measures to keep the service available and makes regular backups, but does not guarantee uninterrupted service. Planned maintenance is announced in advance when it affects use. Support is provided by email in Spanish, English and Russian.",
                    ],
                },
                {
                    heading: "Liability",
                    blocks: [
                        "PafPaf's total liability under the contract is limited to the amounts the Customer paid in the 12 months before the event giving rise to it. PafPaf is not liable for loss of profit or indirect damage. These limits do not apply to wilful misconduct or gross negligence, or where the law does not allow them.",
                    ],
                },
                {
                    heading: "Changes to these terms",
                    blocks: [
                        "PafPaf may amend these terms by notifying the Customer by email at least 30 days in advance. If the Customer disagrees, it may cancel before they take effect.",
                    ],
                },
                {
                    heading: "Governing law and jurisdiction",
                    blocks: [
                        "The contract is governed by Spanish law. Disputes are submitted to the courts of PafPaf's domicile, unless the Customer is a consumer, in which case the courts of its domicile have jurisdiction.",
                    ],
                },
            ],
        },

        encargo: {
            title: "Data processing agreement",
            description:
                "How PafPaf processes, on behalf of each customer, the personal data the customer manages in the application (Art. 28 GDPR).",
            sections: [
                {
                    heading: "Parties and purpose",
                    blocks: [
                        "This agreement is part of the [Terms and conditions](doc:terminos) and is accepted by the Customer at sign-up. The Customer is the controller and {name}, tax ID {nif} (“PafPaf”), the processor. Its purpose is the processing of personal data needed to provide the PafPaf service.",
                    ],
                },
                {
                    heading: "Duration",
                    blocks: [
                        "It lasts as long as the service contract and then for the time needed to return and delete the data as set out under end of processing.",
                    ],
                },
                {
                    heading: "Nature and purpose of processing",
                    blocks: [
                        "Hosting, storage, organisation, consultation, modification, export and deletion of data to manage the Customer's members, clients, attendance, orders, products and employees, and sending on its behalf the service's transactional emails (email confirmation, access, invitations).",
                    ],
                },
                {
                    heading: "Data and data subjects",
                    blocks: [
                        {
                            list: [
                                "Data subjects: the Customer's members, clients and employees, and contact persons.",
                                "Data: identification and contact data (name, email, phone), member or client number, status and joining dates, attendance records, orders, signature, and copies of identity documents if the Customer chooses to keep them, plus any extra fields the Customer configures.",
                                "The Customer decides which data it enters. If it processes special categories of data (for example health data), it must have a valid legal basis and have assessed the risk; PafPaf will apply the measures of this agreement.",
                            ],
                        },
                    ],
                },
                {
                    heading: "PafPaf's obligations",
                    blocks: [
                        {
                            list: [
                                "Process the data only on the Customer's documented instructions, which are this agreement and its use of the application, including as regards international transfers. If an instruction appears to infringe the law, PafPaf will inform the Customer immediately.",
                                "Ensure that persons authorised to process the data have committed to confidentiality.",
                                "Apply the security measures of Article 32 GDPR: encrypted connections, passwords stored with a one-way hash, separation of each customer's data, least-privilege access control, backups and logging of technical activity.",
                                "Help the Customer respond to data subject requests and comply with Articles 32 to 36 GDPR (security, breach notification, impact assessments and prior consultation), taking into account the information available to PafPaf.",
                                "Notify the Customer of any personal data breach affecting its data without undue delay and in any case within 48 hours of becoming aware of it, with the information available so that the Customer can notify the authority within 72 hours.",
                                "Make available the information needed to demonstrate compliance and allow audits, with reasonable notice and without access to other customers' data.",
                                "Keep a record of the processing activities it carries out as processor.",
                            ],
                        },
                    ],
                },
                {
                    heading: "Sub-processors",
                    blocks: [
                        "The Customer gives PafPaf general authorisation to use the sub-processors listed under [Sub-processors](doc:subencargados). PafPaf will give at least 30 days' notice of any change to the list; the Customer may object on reasonable grounds and, if no agreement is reached, cancel without penalty.",
                        "PafPaf binds each sub-processor by contract to the same data protection obligations and remains liable to the Customer for their performance.",
                    ],
                },
                {
                    heading: "International transfers",
                    blocks: [
                        "Data is hosted on servers in the European Union. Where a sub-processor belongs to a group based outside the European Economic Area, the transfer relies on an adequacy decision, such as the EU-US Data Privacy Framework, or on the European Commission's standard contractual clauses.",
                    ],
                },
                {
                    heading: "Requests from authorities",
                    blocks: [
                        "If an authority requests access to the Customer's data, PafPaf will check that the request has a legal basis and, where applicable, a court order, disclose only what is strictly required and inform the Customer, unless the law prohibits it.",
                    ],
                },
                {
                    heading: "Customer's obligations",
                    blocks: [
                        "Have a legal basis for each processing operation, inform data subjects, enter only the data needed, configure its employees' access and carry out an impact assessment where required.",
                    ],
                },
                {
                    heading: "End of processing",
                    blocks: [
                        "When the service ends, PafPaf will make the data available to the Customer for export for 30 days and then delete it, including copies, unless the law requires it to be kept. Backups are erased when their rotation cycle expires.",
                    ],
                },
            ],
        },

        subencargados: {
            title: "Sub-processors",
            description:
                "Providers that process personal data on behalf of PafPaf and its customers, with their locations.",
            sections: [
                {
                    heading: "Current list",
                    blocks: [
                        {
                            table: {
                                head: ["Provider", "Service", "Data location", "Safeguard"],
                                rows: [
                                    [
                                        "Hetzner Online GmbH",
                                        "Servers and database",
                                        "Germany",
                                        "Within the EU",
                                    ],
                                    [
                                        "Amazon Web Services EMEA SARL",
                                        "File storage (documents and signatures)",
                                        "Sweden (eu-north-1 region)",
                                        "Data in the EU; US-based group: DPF and standard clauses",
                                    ],
                                    [
                                        "Cloudflare, Inc.",
                                        "Content delivery, encryption and attack protection",
                                        "Global network",
                                        "DPF and standard clauses",
                                    ],
                                    [
                                        "Email provider (being selected)",
                                        "Sending transactional emails",
                                        "European Union",
                                        "Within the EU",
                                    ],
                                    [
                                        "Stripe Payments Europe, Ltd.",
                                        "Subscription payments (Customer billing data only)",
                                        "Ireland; US-based group",
                                        "DPF and standard clauses",
                                    ],
                                ],
                            },
                        },
                    ],
                },
                {
                    heading: "Changes",
                    blocks: [
                        "We notify customers by email at least 30 days before adding or replacing a sub-processor, as set out in the [Data processing agreement](doc:encargo).",
                    ],
                },
            ],
        },
    },
};
