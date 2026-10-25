import type { ServicePageContent } from "../../types";

export const web: ServicePageContent = {
    key: "web",
    metaTitle: "Desenvolupament de webs i landing pages",
    metaDescription:
        "Llocs corporatius i landing pages ràpids, multilingües i preparats per al SEO, amb panell de continguts i formularis connectats al teu CRM.",
    title: "Webs i landing pages",
    lead: "Un lloc que carrega ràpid, es troba a Google i converteix visites en sol·licituds que arriben directament al teu CRM.",
    intro: [
        "Una web corporativa té una feina: que la persona adequada entengui en deu segons què fas i t'escrigui. Tota la resta, l'animació, el gestor de continguts, els idiomes, està al servei d'això. Per això comencem pel text i l'estructura, i només després pel disseny.",
        "Construïm amb Next.js: pàgines generades per endavant, imatges optimitzades i puntuacions altes en Core Web Vitals sense trucs. El contingut s'edita des d'un panell senzill o, per a llocs petits, directament en fitxers que versionem amb tu. Cada idioma té la seva URL, les seves metadades i el seu mapa del lloc.",
        "Els formularis no moren en una bústia: entren al teu CRM o a Bitrix24 amb origen, idioma i pàgina, i avisen per Telegram o correu. Si vens serveis, la web és la primera peça de l'embut, i la connectem com a tal.",
    ],
    forWhom: [
        "Empreses de serveis que necessiten una web seriosa en diversos idiomes.",
        "Negocis amb una campanya concreta que mereix una landing pròpia i mesurable.",
        "Marques que tenen una web lenta o impossible d'editar i volen refer-la sense perdre posicions.",
        "Productes digitals que necessiten un lloc de màrqueting separat de l'aplicació.",
    ],
    deliverables: [
        {
            title: "Estructura i textos",
            text: "Mapa de pàgines, missatges per secció i crides a l'acció. Escrivim o editem el text amb tu abans de maquetar.",
        },
        {
            title: "Disseny i maquetació",
            text: "Disseny propi, adaptat a mòbil, amb els efectes justos perquè la marca es noti sense frenar la càrrega.",
        },
        {
            title: "Gestor de continguts",
            text: "Panell per editar pàgines, articles i traduccions sense tocar codi. Amb vista prèvia i permisos per persona.",
        },
        {
            title: "SEO tècnic",
            text: "Metadades per idioma, dades estructurades, mapa del lloc, redireccions des de la web anterior i mesura sense galetes de seguiment.",
        },
        {
            title: "Formularis connectats",
            text: "Sol·licituds que entren al CRM amb el seu origen i avisen el responsable a l'instant. Protecció contra spam sense captchas molestos.",
        },
        {
            title: "Allotjament i manteniment",
            text: "Desplegament al teu propi allotjament o al nostre, certificats, còpies i actualitzacions de seguretat.",
        },
    ],
    steps: [
        {
            title: "Brief i estructura",
            text: "Una sessió per entendre a qui parles i què ha de fer en acabar de llegir. En sortim amb el mapa del lloc i els missatges clau.",
        },
        {
            title: "Disseny",
            text: "Primer la pàgina principal en escriptori i mòbil; un cop aprovada, la resta segueix el mateix sistema.",
        },
        {
            title: "Desenvolupament i contingut",
            text: "Maquetació, panell de continguts, traduccions i integracions. Veus el lloc en una adreça de proves durant tot el procés.",
        },
        {
            title: "Llançament",
            text: "Redireccions, domini, certificats, Search Console i una revisió de rendiment. Després, canvis menors inclosos el primer mes.",
        },
    ],
    stack: ["Next.js", "React", "Tailwind CSS", "Payload CMS", "next-intl", "Vercel", "Docker"],
    faq: [
        {
            question: "Feu webs en WordPress?",
            answer: "No construïm sobre WordPress. Si el teu lloc actual hi és, el migrem conservant URL i posicions; si només necessites una web petita i barata, t'ho diem i et recomanem qui la faci.",
        },
        {
            question: "Quant triga una web corporativa?",
            answer: "Una landing, de dues a quatre setmanes. Un lloc corporatiu amb gestor de continguts i tres idiomes, de quatre a vuit. El temps que més varia és el dels textos i les aprovacions.",
        },
        {
            question: "Podrem editar el contingut nosaltres?",
            answer: "Sí. El panell està pensat per a qui no programa: pàgines, articles, imatges i traduccions. Deixem un vídeo curt i un manual.",
        },
        {
            question: "Inclou el posicionament a Google?",
            answer: "Inclou la part tècnica: velocitat, estructura, metadades, dades estructurades i indexació. L'estratègia de continguts i enllaços es contracta a part o es fa amb el teu equip de màrqueting.",
        },
    ],
};
