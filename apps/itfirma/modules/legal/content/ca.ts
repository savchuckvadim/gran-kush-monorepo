import type { LegalContent } from "../types";

export const ca: LegalContent = {
    "aviso-legal": {
        title: "Avís legal",
        sections: [
            {
                heading: "Titular del lloc",
                paragraphs: [
                    "En compliment de la Llei 34/2002, de serveis de la societat de la informació i de comerç electrònic (LSSI-CE), s'informa que el titular de {domain} és {name}, professional autònom, NIF {nif}, amb domicili a {address}. Correu de contacte: {email}.",
                    "IT-firma és el nom comercial amb què {name} exerceix dues activitats: el desenvolupament de programari a mida per a tercers (aplicacions web i mòbils, llocs web, integracions i consultoria tecnològica) i el desenvolupament i la comercialització de programari propi al núvol (SaaS) mitjançant subscripció.",
                ],
            },
            {
                heading: "Objecte",
                paragraphs: [
                    "Aquest lloc presenta els serveis de l'estudi i permet enviar una sol·licitud de pressupost. La informació publicada té caràcter orientatiu i no constitueix una oferta vinculant; les condicions de cada projecte s'acorden per escrit.",
                ],
            },
            {
                heading: "Propietat intel·lectual",
                paragraphs: [
                    "Els textos, el disseny i el codi d'aquest lloc són propietat de {name}, llevat de les marques i els noms de tercers, que pertanyen als seus titulars. No se'n permet la reproducció amb finalitats comercials sense autorització.",
                ],
            },
            {
                heading: "Responsabilitat",
                paragraphs: [
                    "{name} no respon dels danys derivats de l'ús de la informació del lloc ni del contingut dels llocs externs enllaçats. Es procura mantenir el lloc disponible i actualitzat, sense garantir l'absència d'interrupcions.",
                ],
            },
            {
                heading: "Legislació aplicable",
                paragraphs: [
                    "La relació entre l'usuari i el titular es regeix per la legislació espanyola. Per a qualsevol controvèrsia seran competents els jutjats i tribunals que corresponguin d'acord amb la llei.",
                ],
            },
        ],
    },
    privacidad: {
        title: "Política de privacitat",
        sections: [
            {
                heading: "Responsable del tractament",
                paragraphs: [
                    "{name}, professional autònom, NIF {nif}, amb domicili a {address}. Contacte per a protecció de dades: {email}.",
                ],
            },
            {
                heading: "Quines dades es tracten i per a què",
                paragraphs: [
                    "El formulari de contacte recull nom, correu electrònic, telèfon o usuari de Telegram (opcional), el tipus de servei, el pressupost estimat i el text de la sol·licitud. Es tracten únicament per respondre la sol·licitud, preparar una proposta i, si escau, formalitzar la relació contractual.",
                    "La base jurídica és el consentiment que s'atorga en enviar el formulari (art. 6.1.a RGPD) i, quan s'arriba a un acord, l'execució del contracte (art. 6.1.b RGPD). El lloc no pren decisions automatitzades ni elabora perfils.",
                ],
            },
            {
                heading: "Conservació",
                paragraphs: [
                    "Les sol·licituds que no donen lloc a un contracte es conserven com a màxim dotze mesos des de l'última comunicació. Les dades de clients es conserven durant la relació i els terminis que exigeix la legislació fiscal i mercantil.",
                ],
            },
            {
                heading: "Destinataris",
                paragraphs: [
                    "La sol·licitud es lliura al titular per correu electrònic i per Telegram. Els proveïdors de correu, de missatgeria i d'allotjament actuen com a encarregats del tractament. No se cedeixen dades a tercers amb finalitats comercials. Si un proveïdor és fora de l'Espai Econòmic Europeu, la transferència s'empara en les clàusules contractuals tipus de la Comissió Europea.",
                ],
            },
            {
                heading: "Drets",
                paragraphs: [
                    "Podeu exercir els drets d'accés, rectificació, supressió, oposició, limitació i portabilitat escrivint a {email}. Si considereu que el tractament no s'ajusta a la normativa, podeu reclamar davant l'Agència Espanyola de Protecció de Dades (aepd.es).",
                ],
            },
        ],
    },
    cookies: {
        title: "Política de galetes",
        sections: [
            {
                heading: "Què utilitza aquest lloc",
                paragraphs: [
                    "Aquest lloc no utilitza galetes de seguiment, d'anàlisi ni publicitàries. No es carrega cap servei de tercers que identifiqui el visitant.",
                    "L'única dada que es desa al navegador és l'aparença escollida (tema i mode clar o fosc), mitjançant l'emmagatzematge local del mateix navegador. És una preferència tècnica, no identifica la persona i es pot esborrar en qualsevol moment des de la configuració del navegador.",
                ],
            },
            {
                heading: "Tipografies",
                paragraphs: [
                    "Les tipografies se serveixen des del mateix domini {domain}; no es fan peticions a servidors de tipografies de tercers en carregar la pàgina.",
                ],
            },
        ],
    },
};
