import type { ServicePageContent } from "../../types";

export const aiAdoption: ServicePageContent = {
    key: "aiAdoption",
    metaTitle: "Implantació d'IA als processos de la teva empresa",
    metaDescription:
        "Auditoria de processos, selecció de casos on la IA estalvia temps de debò, implantació amb les teves eines i formació de l'equip. Sense fum i amb mesura.",
    title: "IA als teus processos",
    lead: "Trobem on la IA estalvia hores al teu equip, la connectem a les eines que ja feu servir i ensenyem les persones a treballar-hi.",
    intro: [
        "Gairebé totes les empreses ja fan servir IA d'alguna manera: algú redacta correus amb un xat, un altre resumeix documents, un tercer genera imatges. El que falta és mètode: quines tasques valen la pena, amb quina eina, amb quines dades es pot treballar i com mesurar si de debò estalvia temps.",
        "Comencem amb una auditoria curta dels processos: on s'escriu el mateix moltes vegades, on es copien dades entre sistemes, on una persona llegeix cent pàgines per trobar-ne una. D'aquí surt una llista prioritzada per estalvi i risc, i els dos o tres casos amb què començar.",
        "Després implantem: de vegades és configurar una eina existent i escriure les instruccions; de vegades, un agent integrat al CRM; de vegades, una política de quines dades poden i no poden sortir de l'empresa. I sempre formació, perquè l'eina que ningú sap fer servir no estalvia res.",
    ],
    forWhom: [
        "Direccions que volen adoptar IA amb criteri, no per moda.",
        "Equips administratius i comercials amb molt text repetitiu.",
        "Empreses amb dades sensibles que necessiten regles clares abans de fer servir eines externes.",
        "Negocis que ja van provar un xat i volen passar a resultats mesurables.",
    ],
    deliverables: [
        {
            title: "Auditoria de processos",
            text: "Entrevistes i observació de tasques reals. Llista de casos amb hores estalviades estimades, risc i esforç.",
        },
        {
            title: "Full de ruta",
            text: "Els primers casos, l'eina per a cadascun, què integrar i què mesurar. Un pla d'un trimestre, no de tres anys.",
        },
        {
            title: "Política d'ús de dades",
            text: "Quina informació pot anar a quina eina, quins proveïdors compleixen el RGPD i com es documenta el tractament.",
        },
        {
            title: "Implantació",
            text: "Configuració d'eines, instruccions i plantilles, o desenvolupament d'agents integrats quan el cas ho demana.",
        },
        {
            title: "Formació pràctica",
            text: "Sessions per equip amb les seves pròpies tasques i documents, no amb exemples genèrics. Material de consulta després.",
        },
        {
            title: "Mesura",
            text: "Abans i després de cada cas: temps, qualitat i cost. El que no millora, es retira sense drama.",
        },
    ],
    steps: [
        {
            title: "Auditoria",
            text: "Una o dues setmanes d'entrevistes i observació. En sortim amb la llista prioritzada de casos.",
        },
        {
            title: "Pilots",
            text: "Dos o tres casos amb un grup petit durant un mes, mesurats des del primer dia.",
        },
        {
            title: "Desplegament",
            text: "El que funciona s'estén a la resta de l'equip amb formació i documentació; el que no, es descarta.",
        },
        {
            title: "Acompanyament",
            text: "Revisió mensual de resultats, nous casos i actualització de la política quan canvien les eines.",
        },
    ],
    stack: [
        "Claude",
        "ChatGPT",
        "Agents a mida",
        "Automatització de documents",
        "Transcripció i resum",
        "Bitrix24 i integracions",
    ],
    faq: [
        {
            question: "Necessitem comprar llicències cares?",
            answer: "Normalment no al principi. Molts casos es cobreixen amb plans d'equip de les eines generals; les llicències s'escalen quan la mesura ho justifica.",
        },
        {
            question: "Com protegim les dades de clients?",
            answer: "Amb una política escrita de què pot sortir i cap a on, proveïdors amb acords de tractament de dades i, per al més sensible, models allotjats a Europa o a la vostra pròpia infraestructura.",
        },
        {
            question: "Quant temps de l'equip exigeix?",
            answer: "L'auditoria ocupa una hora per persona entrevistada. Els pilots s'integren a la feina normal. La formació són sessions de dues hores per equip.",
        },
        {
            question: "I si al final la IA no serveix per al nostre cas?",
            answer: "Ho sabrem després de l'auditoria o, com a molt tard, després del pilot, amb números. Preferim dir-ho aviat que vendre un projecte llarg que no millora res.",
        },
    ],
};
