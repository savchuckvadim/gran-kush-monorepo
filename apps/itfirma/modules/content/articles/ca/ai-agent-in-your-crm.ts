import type { ArticleContent } from "../../types";

export const aiAgentInYourCrm: ArticleContent = {
    title: "Un agent d'IA al teu CRM: el que fa de debò i el que no hauries d'esperar",
    description:
        "Quines tasques d'un equip comercial pot assumir avui un agent d'IA, com es controla el que produeix i per què el primer cas ha de ser avorrit.",
    date: "2026-10-05",
    readingMinutes: 6,
    intro: "Cada setmana algú ens pregunta si pot «posar IA al CRM». La resposta és sí, i la pregunta correcta és una altra: per a quina tasca concreta, amb quines dades i qui revisa el resultat. Aquest article recull el que hem après construint agents que treballen dins de Bitrix24 i de sistemes a mida.",
    sections: [
        {
            heading: "Què és un agent, sense màrqueting",
            paragraphs: [
                "Un agent és un programa que rep un context, l'enregistrament d'una trucada, una fitxa de client, els correus de la setmana, decideix què fer seguint instruccions i produeix un resultat en un sistema: un resum a la fitxa, una tasca, un esborrany de resposta, una fila en un informe. El model de llenguatge és una peça; la resta és integració, permisos i control.",
                "La diferència amb un xat és que l'agent no espera que algú li pregunti. S'executa quan passa alguna cosa, acaba una trucada, arriba un correu, canvia una etapa, i deixa el resultat on l'equip ja mira.",
            ],
        },
        {
            heading: "Les tasques que funcionen avui",
            paragraphs: [
                "Hi ha un grup de tasques en què un agent ben integrat estalvia temps des de la primera setmana. Totes comparteixen tres trets: tenen entrada clara, es pot comprovar si el resultat és bo i una persona pot corregir-lo en segons.",
            ],
            bullets: [
                "Resumir una trucada enregistrada i omplir l'informe de la fitxa perquè el comercial només confirmi.",
                "Classificar correus i sol·licituds entrants, assignar-los i proposar la primera resposta.",
                "Preparar l'informe setmanal de la direcció a partir de les dades del CRM, amb les xifres i el que va canviar.",
                "Respondre preguntes internes sobre tarifes, procediments i documents, citant la font.",
                "Detectar fitxes incompletes o duplicades i proposar la correcció.",
            ],
        },
        {
            heading: "El que no hauries d'esperar",
            paragraphs: [
                "Un agent no vendrà per tu ni substituirà el comercial que coneix el client. Tampoc encertarà sempre: s'equivocarà en els casos rars i cal dissenyar per a això. I no arreglarà un CRM amb dades dolentes; si les fitxes són buides, l'agent resumirà buit.",
                "Per això el primer cas ha de ser avorrit. Un resum de trucada que algú confirma abans de desar-se. Una classificació que proposa i no decideix. Quan la qualitat està mesurada durant unes setmanes, s'automatitzen els casos segurs i es deixa la revisió per als dubtosos.",
            ],
        },
        {
            heading: "Dades, costos i control",
            paragraphs: [
                "Tres preguntes abans de començar. Quines dades veu l'agent i per on passen: fem servir les API empresarials dels proveïdors, que no entrenen amb les teves dades, o models allotjats a Europa quan cal. Quant costa cada execució: un resum de trucada val cèntims, i el mesurem des del prototip. I com es revisa: cada acció queda registrada i es pot desfer.",
                "Amb aquestes tres respostes escrites, un agent es construeix en setmanes, no en mesos, i s'amplia cas a cas amb números al davant.",
            ],
        },
    ],
    outro: "Si tens una tasca repetitiva amb dades al CRM, és probable que sigui un bon primer cas. Descriu-la en unes línies i et direm si mereix un prototip de dues setmanes.",
    relatedService: "ai",
};
