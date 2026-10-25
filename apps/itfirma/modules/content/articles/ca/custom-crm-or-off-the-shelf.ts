import type { ArticleContent } from "../../types";

export const customCrmOrOffTheShelf: ArticleContent = {
    title: "CRM a mida o de catàleg? Com decidir-ho en una conversa",
    description:
        "Quatre preguntes que separen les empreses que han de configurar una eina existent de les que necessiten construir la seva. Amb els costos ocults de cada camí.",
    date: "2026-10-12",
    readingMinutes: 6,
    intro: "Ens arriben les dues peticions amb la mateixa freqüència: «volem el nostre propi CRM» i «volem que ens configureu Bitrix24». I amb la mateixa freqüència recomanem el contrari del que demanaven. La decisió depèn de quatre preguntes, i es pot respondre en mitja hora.",
    sections: [
        {
            heading: "El procés és teu o és el del sector?",
            paragraphs: [
                "Si vens com ven tothom al teu sector, amb contacte, proposta, negociació i tancament, qualsevol CRM seriós ho cobreix i la diferència és a la configuració. Si el teu avantatge és en com treballes, un càlcul de preus propi, un flux d'aprovació particular, dades que cap eina modela, aleshores l'eina de catàleg t'obligarà a renunciar a aquest avantatge o a viure amb pedaços.",
                "La prova ràpida: escriu en una pàgina com entra un client i què passa fins que paga. Si el text cap en els conceptes estàndard d'un CRM, configura. Si cada segon paràgraf comença per «en el nostre cas», construeix.",
            ],
        },
        {
            heading: "Quantes persones el faran servir i quant costa el seu temps?",
            paragraphs: [
                "Una eina de catàleg cobra per usuari i per mes, per sempre. Una eina pròpia costa construir-la i després mantenir-la. Amb cinc usuaris, la subscripció guanya gairebé sempre. Amb cinquanta, i més si cada clic de més els costa minuts al dia, l'aritmètica canvia al cap de dos o tres anys.",
                "Hi ha un segon cost que ningú posa al full: el de les tasques que l'eina no fa i algú acaba fent a mà. Aquest cost sol ser el que decideix.",
            ],
        },
        {
            heading: "Amb què ha de parlar?",
            paragraphs: [
                "Un CRM aïllat és rar. Ha de rebre comandes de la web, enviar factures a comptabilitat, avisar per missatgeria, llegir la centraleta. Les eines de catàleg tenen integracions per als sistemes populars; per a la resta, cal construir-les igualment.",
                "Si la major part del valor és en aquestes connexions, de vegades la millor resposta és una tercera: un CRM de catàleg al centre i una capa pròpia al voltant, amb integracions i petites aplicacions. És el que fem sovint amb Bitrix24.",
            ],
        },
        {
            heading: "Vendràs l'eina?",
            paragraphs: [
                "Si el pla és que altres negocis paguin per fer-la servir, la pregunta ja no és si construir, sinó com: multiempresa des del primer dia, facturació per subscripció, panell d'administració i una arquitectura que aguanti clients que no coneixes. Això és un producte, i es planifica com a tal.",
            ],
            bullets: [
                "Procés estàndard i pocs usuaris: configura una eina existent.",
                "Procés propi i equip gran: construeix, per etapes.",
                "Valor a les connexions: catàleg al centre, capa pròpia al voltant.",
                "El vendràs: producte SaaS des del disseny.",
            ],
        },
    ],
    outro: "Si dubtes entre els dos camins, explica'ns el teu procés en unes línies. Et direm amb franquesa quin recomanem, encara que sigui el que no ens dona feina.",
    relatedService: "apps",
};
