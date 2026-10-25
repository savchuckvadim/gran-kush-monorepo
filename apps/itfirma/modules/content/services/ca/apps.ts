import type { ServicePageContent } from "../../types";

export const apps: ServicePageContent = {
    key: "apps",
    metaTitle: "Desenvolupament d'aplicacions web i SaaS a mida",
    metaDescription:
        "Panells interns, àrees de client, CRM a mida i productes SaaS multiempresa. De l'arquitectura al desplegament, amb el codi a nom teu.",
    title: "Aplicacions web i SaaS a mida",
    lead: "Eines internes, àrees de client i productes per subscripció que aguanten anys de canvis sense tornar-se un pantà.",
    intro: [
        "Una aplicació a mida té sentit quan el procés és teu i cap eina de catàleg el segueix: un flux d'aprovació particular, una manera de calcular preus, dades que viuen en tres llocs alhora. El que demanes no és programari pel programari, sinó que aquella part del negoci deixi de dependre de fulls de càlcul i memòria.",
        "Construïm aplicacions web amb la mateixa base tècnica amb què operem els nostres productes SaaS: TypeScript de punta a punta, API documentada, base de dades relacional, cues per a la feina en segon pla i desplegament automatitzat. No és l'arquitectura de moda; és la que podem mantenir nosaltres i pot heretar un altre equip.",
        "Si el pla és vendre l'eina a altres, la dissenyem multiempresa des del primer dia: espais aïllats per client, rols, facturació per subscripció i un panell d'administració. És el que fem amb els nostres propis productes, i és més barat pensar-ho al principi que reescriure-ho després.",
    ],
    forWhom: [
        "Empreses el procés clau de les quals viu en fulls de càlcul, xats i memòria d'una persona.",
        "Negocis que volen una àrea on el client consulti, signi i pagui pel seu compte.",
        "Fundadors que llancen un producte SaaS i necessiten la primera versió en producció.",
        "Equips amb una eina heretada que ningú s'atreveix a tocar.",
    ],
    deliverables: [
        {
            title: "Arquitectura i model de dades",
            text: "Un document curt amb entitats, rols, integracions i decisions tècniques. El revises abans de la primera línia de codi.",
        },
        {
            title: "Backend i API",
            text: "NestJS i PostgreSQL amb API documentada en OpenAPI, autenticació per sessions, permisos per rol i cues per a tasques pesades.",
        },
        {
            title: "Interfície",
            text: "Next.js i React: ràpida, accessible, en els idiomes que necessitis, amb components reutilitzables i estats de càrrega i error pensats.",
        },
        {
            title: "Multiempresa i facturació",
            text: "Espais aïllats per client, plans, períodes de prova i cobrament per subscripció quan el producte es ven a tercers.",
        },
        {
            title: "Proves i CI",
            text: "Proves automàtiques de la lògica crítica i comprovacions a cada canvi, perquè una millora no trenqui el que ja funciona.",
        },
        {
            title: "Desplegament i lliurament",
            text: "Contenidors, entorn de proves i producció, còpies de seguretat i monitoratge. Repositori i comptes a nom teu.",
        },
    ],
    steps: [
        {
            title: "Descobriment",
            text: "Entrevistes amb qui farà servir l'eina, revisió del que existeix i un abast per etapes amb la primera versió usable al davant.",
        },
        {
            title: "Disseny de la solució",
            text: "Model de dades, pantalles clau i arquitectura. Decidim junts què entra a la primera etapa i què espera.",
        },
        {
            title: "Desenvolupament per etapes",
            text: "Lliuraments cada una o dues setmanes en un entorn de proves. Cada etapa es fa servir de debò abans de començar la següent.",
        },
        {
            title: "Producció i evolució",
            text: "Llançament, formació i un pla de millores. Després, suport mensual o desenvolupament per hores, segons el ritme del producte.",
        },
    ],
    stack: [
        "TypeScript",
        "Next.js",
        "React",
        "NestJS",
        "PostgreSQL",
        "Prisma",
        "Redis",
        "Docker",
        "Stripe",
    ],
    faq: [
        {
            question: "Per què no fer servir una eina sense codi?",
            answer: "Per provar una idea, fes-la servir. Quan el procés es complica, les dades creixen o cal integrar diversos sistemes, el cost de barallar-se amb l'eina supera el de construir la teva. T'ho diem amb franquesa a la primera conversa si el teu cas encara no hi arriba.",
        },
        {
            question: "Podem començar petit?",
            answer: "És l'única manera que recomanem. La primera etapa resol el problema més car amb el mínim de pantalles; la resta s'afegeix quan l'ús real ho demana.",
        },
        {
            question: "Què passa si volem canviar de proveïdor després?",
            answer: "T'ho endús tot: repositori, documentació, infraestructura i base de dades. Fem servir tecnologies comunes precisament perquè qualsevol equip de TypeScript pugui continuar.",
        },
        {
            question: "Feu també el disseny?",
            answer: "Sí. Per a interfícies de treball dissenyem directament en codi sobre un sistema de components; per a productes amb marca forta sumem un dissenyador de confiança al projecte.",
        },
    ],
};
