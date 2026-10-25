import type { ServicePageContent } from "../../types";

export const integrations: ServicePageContent = {
    key: "integrations",
    metaTitle: "Integracions entre CRM, web, telefonia i comptabilitat",
    metaDescription:
        "Connectem els sistemes que ja fas servir: CRM, web, telefonia, pagaments, comptabilitat i missatgeria. Dades que flueixen soles, sense copiar a mà ni perdre comandes.",
    title: "Integracions",
    lead: "Que la comanda de la web aparegui al CRM, la factura a comptabilitat i l'avís al mòbil del responsable, sense que ningú copiï res.",
    intro: [
        "La majoria de les empreses no tenen un problema de manca de programari, sinó de programari que no es parla. La comanda entra per la web, algú la copia al CRM, un altre la passa a comptabilitat i un tercer avisa per WhatsApp. Cada pas a mà és un retard i un error esperant a passar.",
        "Una integració ben feta és avorrida: un esdeveniment en un sistema produeix un canvi en un altre, amb reintents si alguna cosa falla, un registre del que ha passat i una alerta si alguna cosa no quadra. Les construïm sobre les API oficials de cada eina i sobre cues, perquè una caiguda d'una part no perdi dades de l'altra.",
        "Treballem sovint amb Bitrix24 com a centre, però connectem qualsevol sistema amb API: botigues en línia, passarel·les de pagament, centraletes, programes de facturació, WhatsApp i Telegram, fulls de càlcul que de moment ningú vol abandonar.",
    ],
    forWhom: [
        "Empreses amb diversos sistemes i una persona que els sincronitza a mà.",
        "Botigues i serveis en línia les comandes dels quals han d'arribar al CRM i a la comptabilitat.",
        "Equips de venda que volen trucades, missatges i formularis dins de la fitxa del client.",
        "Negocis que volen avisos automàtics a Telegram o WhatsApp sense un bot més per mantenir.",
    ],
    deliverables: [
        {
            title: "Mapa de fluxos de dades",
            text: "Quin sistema és amo de cada dada, quin esdeveniment dispara quin canvi i què passa si alguna cosa falla. Una pàgina que tothom entén.",
        },
        {
            title: "Connectors sobre API oficials",
            text: "Integracions amb l'API de cada eina, amb autenticació segura, límits respectats i versions controlades.",
        },
        {
            title: "Cues i reintents",
            text: "Els esdeveniments s'encuen i es reintenten; si un sistema està caigut, la dada espera en lloc de perdre's.",
        },
        {
            title: "Registre i alertes",
            text: "Cada sincronització deixa rastre. Si alguna cosa no quadra, el responsable rep un avís amb l'enllaç al registre.",
        },
        {
            title: "Bots de missatgeria",
            text: "Avisos i respostes per Telegram i WhatsApp connectats al CRM: noves comandes, recordatoris de cita, confirmacions.",
        },
        {
            title: "Documentació i traspàs",
            text: "Diagrames, variables d'entorn i un manual d'operació perquè el teu equip o qualsevol proveïdor pugui mantenir-ho.",
        },
    ],
    steps: [
        {
            title: "Inventari",
            text: "Llistem sistemes, accessos i quina dada viu on. Detectem duplicats i amos poc clars abans de connectar res.",
        },
        {
            title: "Disseny del flux",
            text: "Decidim quin sistema mana en cada dada i quins esdeveniments es propaguen. Ho validem amb tu amb exemples reals.",
        },
        {
            title: "Construcció i proves",
            text: "Connectors amb dades de prova, simulació de fallades i comprovació de volums reals abans de tocar producció.",
        },
        {
            title: "Posada en marxa",
            text: "Activació per parts, seguiment dels registres les primeres setmanes i ajust de regles amb l'equip.",
        },
    ],
    stack: [
        "REST i webhooks",
        "Bitrix24 API",
        "Stripe",
        "Telegram Bot API",
        "WhatsApp Cloud API",
        "BullMQ i Redis",
        "NestJS",
        "PostgreSQL",
    ],
    faq: [
        {
            question: "Feu servir Zapier o Make?",
            answer: "Per a un flux senzill i poc volum poden servir, i t'ho direm. Quan hi ha lògica de negoci, volum o dades personals, construïm la integració en codi: és més barata de mantenir al cap d'un any i no depèn de la tarifa d'un tercer.",
        },
        {
            question: "El nostre sistema no té API. Es pot integrar?",
            answer: "Sovint sí: exportacions programades, bases de dades accessibles o fitxers intercanviats per carpeta. Ho estudiem a l'inventari i et diem què és viable i què no val la pena.",
        },
        {
            question: "Què passa si una de les eines canvia la seva API?",
            answer: "Els connectors estan aïllats i versionats; un canvi en una eina es corregeix en un lloc. Amb suport mensual, aquestes actualitzacions estan cobertes.",
        },
        {
            question: "Quant costa una integració?",
            answer: "Una connexió concreta entre dos sistemes sol quedar per sota de 3.000 €. Un mapa complet amb diversos sistemes, cues i missatgeria es pressuposta per etapes després de l'inventari.",
        },
    ],
};
