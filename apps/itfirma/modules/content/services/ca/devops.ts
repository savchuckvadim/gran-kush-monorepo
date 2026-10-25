import type { ServicePageContent } from "../../types";

export const devops: ServicePageContent = {
    key: "devops",
    metaTitle: "Infraestructura, desplegament i suport tècnic",
    metaDescription:
        "Servidors, contenidors, desplegament automàtic, còpies de seguretat, monitoratge i suport mensual per a aplicacions web. Infraestructura senzilla que un equip petit pot operar.",
    title: "Infraestructura i suport",
    lead: "Servidors que no sorprenen, desplegaments en un clic i algú que respon quan alguna cosa falla. Sense un departament de DevOps.",
    intro: [
        "Una aplicació en producció necessita més que codi: on corre, com s'actualitza sense talls, què passa quan s'omple el disc, qui s'assabenta que alguna cosa va malament i com es recupera una base de dades un dilluns a les nou. Per a una empresa petita, aquesta part sol ser la que ningú vol tenir.",
        "Muntem infraestructura deliberadament senzilla: un o dos servidors a la UE, contenidors, un panell de desplegament, còpies de seguretat provades i monitoratge que avisa per Telegram. No és Kubernetes; és el que podem operar nosaltres i lliurar documentat a qualsevol altre equip.",
        "El suport mensual cobreix el que una aplicació viva necessita: actualitzacions de seguretat, petites millores, revisió de registres i una resposta acordada quan alguna cosa falla. Per a projectes que no hem construït nosaltres, comencem per una auditoria i una llista de riscos.",
    ],
    forWhom: [
        "Empreses amb una aplicació pròpia i sense equip tècnic per operar-la.",
        "Productes que han crescut en un allotjament compartit i comencen a caure.",
        "Equips que despleguen a mà i tenen por de cada actualització.",
        "Negocis que necessiten allotjament a la UE amb còpies i compliment documentat.",
    ],
    deliverables: [
        {
            title: "Auditoria d'infraestructura",
            text: "Què hi ha, què falla, quins riscos existeixen i què costa corregir-los. Prioritzat i en llenguatge de negoci.",
        },
        {
            title: "Servidors i contenidors",
            text: "Servidors a la UE, aplicacions en contenidors, xarxa, certificats i accés amb claus. Tot descrit en codi.",
        },
        {
            title: "Desplegament automàtic",
            text: "Cada canvi es prova i es publica sol, amb possibilitat de tornar enrere en minuts si alguna cosa no quadra.",
        },
        {
            title: "Còpies i recuperació",
            text: "Còpies diàries de bases de dades i fitxers, xifrades i fora del servidor, amb proves de restauració periòdiques.",
        },
        {
            title: "Monitoratge i alertes",
            text: "Disponibilitat, errors, disc i memòria vigilats; avisos per Telegram o correu abans que ho noti un client.",
        },
        {
            title: "Suport mensual",
            text: "Hores acordades per a actualitzacions, millores i consultes, amb temps de resposta definit i un informe mensual.",
        },
    ],
    steps: [
        {
            title: "Auditoria",
            text: "Revisem servidors, desplegaments, còpies i accessos. Lliurem una llista de riscos amb prioritats.",
        },
        {
            title: "Pla i pressupost",
            text: "Què canviem primer, què costa i quins servidors calen. Sense sobredimensionar.",
        },
        {
            title: "Migració",
            text: "Nova infraestructura en paral·lel, proves amb dades reals i canvi en una finestra acordada, amb marxa enrere preparada.",
        },
        {
            title: "Operació",
            text: "Monitoratge, còpies i actualitzacions en marxa; suport mensual amb revisió de registres i millores.",
        },
    ],
    stack: [
        "Docker",
        "Linux",
        "GitHub Actions",
        "Dokploy i Traefik",
        "PostgreSQL",
        "Redis",
        "Cloudflare",
        "Hetzner i AWS (UE)",
    ],
    faq: [
        {
            question: "Podeu mantenir una aplicació que no heu construït vosaltres?",
            answer: "Sí, després d'una auditoria. Si el codi és raonable i hi ha documentació, assumim el suport; si no, proposem primer les correccions mínimes perquè sigui operable.",
        },
        {
            question: "Quin temps de resposta oferiu?",
            answer: "Depèn del pla: des de resposta el següent dia laborable fins a atenció en poques hores per a incidències crítiques. S'acorda per escrit i s'informa cada mes.",
        },
        {
            question: "On són els servidors?",
            answer: "A la Unió Europea, normalment a Alemanya o Finlàndia, amb còpies en una altra regió europea. Si el teu sector exigeix un altre proveïdor, ens adaptem.",
        },
        {
            question: "Quant costa la infraestructura al mes?",
            answer: "Una aplicació de negoci típica corre en servidors que costen entre 30 i 150 € al mes. El suport mensual es pressuposta per hores acordades, a part.",
        },
    ],
};
