import type { ServicePageContent } from "../../types";

export const ai: ServicePageContent = {
    key: "ai",
    metaTitle: "Desenvolupament d'agents d'IA integrats al teu CRM",
    metaDescription:
        "Assistents d'IA que treballen dins dels teus sistemes: resumeixen trucades, omplen el CRM, responen clients i preparen informes, amb control humà i dades sota el RGPD.",
    title: "Agents d'IA",
    lead: "Assistents que llegeixen les teves dades, fan la feina repetitiva i deixen la decisió a les persones. Dins del teu CRM, no en una pestanya a part.",
    intro: [
        "Un agent d'IA útil no és un xat genèric. És un programa que rep un context concret, l'enregistrament d'una trucada, la fitxa d'un client, els correus de la setmana, i produeix un resultat concret: un resum a la fitxa, una tasca per al comercial, un esborrany de resposta, un informe per a la direcció. El construïm al voltant d'un cas d'ús, no al voltant d'una tecnologia.",
        "La part difícil no és el model, sinó tot el que l'envolta: quines dades pot veure, com es connecta al CRM, què fa quan no està segur, com es revisa el que produeix i quant costa cada execució. Aquesta és la part que construïm amb cura, amb registre de cada acció i un humà al circuit on la decisió importa.",
        "Treballem amb Claude i OpenAI a través de les seves API europees o amb models allotjats per tu quan les dades no poden sortir. Perquè l'agent respongui sobre els teus documents fem servir cerca sobre la teva pròpia base de coneixement, sense entrenar res amb dades de clients.",
    ],
    forWhom: [
        "Equips de venda que volen resums i tasques automàtiques després de cada trucada.",
        "Atenció al client amb moltes preguntes repetides i un historial que ningú consulta.",
        "Direcció que necessita informes setmanals a partir de dades disperses.",
        "Empreses que ja fan servir Bitrix24 o un altre CRM i volen la IA dins de la fitxa.",
    ],
    deliverables: [
        {
            title: "Cas d'ús definit",
            text: "Entrada, sortida, criteri de qualitat i què passa quan l'agent no està segur. Un document d'una pàgina que acota el projecte.",
        },
        {
            title: "Agent integrat",
            text: "Connectat al teu CRM, telefonia o correu: llegeix el context, actua i escriu el resultat on l'equip ja treballa.",
        },
        {
            title: "Base de coneixement",
            text: "Els teus documents, tarifes i procediments indexats perquè l'agent respongui amb la teva informació i citi d'on la treu.",
        },
        {
            title: "Control humà",
            text: "Esborranys que algú aprova, accions que es registren i un botó per corregir l'agent quan s'equivoca.",
        },
        {
            title: "Avaluació i costos",
            text: "Conjunt de casos de prova, mesura de qualitat abans de cada canvi i panell amb el cost per execució.",
        },
        {
            title: "Privacitat",
            text: "Dades mínimes necessàries, proveïdors amb seu a la UE o models propis, i el registre de tractament que demana el RGPD.",
        },
    ],
    steps: [
        {
            title: "Selecció del cas",
            text: "Triem una tasca repetitiva, mesurable i amb dades disponibles. Si no n'hi ha cap així, ho diem i no venem fum.",
        },
        {
            title: "Prototip amb dades reals",
            text: "En una o dues setmanes l'agent processa casos històrics i comparem la seva sortida amb la de les persones.",
        },
        {
            title: "Integració",
            text: "Connexió al CRM o al canal, permisos, registre d'accions i el circuit de revisió humana.",
        },
        {
            title: "Posada en marxa i millora",
            text: "Arrencada amb un grup petit, mesura setmanal de qualitat i cost, ampliació a la resta de l'equip.",
        },
    ],
    stack: [
        "Claude API",
        "OpenAI API",
        "RAG i cerca vectorial",
        "Transcripció d'àudio",
        "Bitrix24 API",
        "NestJS",
        "PostgreSQL",
    ],
    faq: [
        {
            question: "Les nostres dades es fan servir per entrenar models?",
            answer: "No. Fem servir les API empresarials dels proveïdors, que no entrenen amb les dades enviades, o models allotjats per tu. El que l'agent aprèn dels teus documents viu a la teva base de coneixement, no al model.",
        },
        {
            question: "Quant costa cada execució?",
            answer: "Depèn del model i de la mida del context. Un resum de trucada sol costar cèntims. Mesurem el cost des del prototip i el mostrem en un panell perquè no hi hagi sorpreses.",
        },
        {
            question: "I si l'agent s'equivoca?",
            answer: "S'equivocarà de vegades, per això dissenyem el circuit de revisió: esborranys que s'aproven, accions reversibles i registre de tot. Amb el temps, els casos corregits entren a les proves i la qualitat puja.",
        },
        {
            question: "Pot l'agent trucar o escriure a clients pel seu compte?",
            answer: "Pot, però rarament ho recomanem al principi. Comencem amb agents que preparen i una persona que envia; quan la qualitat està mesurada, s'automatitzen els casos segurs.",
        },
    ],
};
