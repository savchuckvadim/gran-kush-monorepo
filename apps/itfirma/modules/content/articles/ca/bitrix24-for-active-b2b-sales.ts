import type { ArticleContent } from "../../types";

export const bitrix24ForActiveB2bSales: ArticleContent = {
    title: "Bitrix24 per a vendes actives B2B: un informe per trucada en lloc de deu camps",
    description:
        "Per què els comercials no omplen el CRM, què pot veure la direcció sense demanar res i com configurar Bitrix24 perquè el sistema treballi després de cada trucada.",
    date: "2026-10-20",
    readingMinutes: 7,
    intro: "A les vendes actives el comercial truca ell, no espera que el truquin. Truca en fred, aconsegueix una presentació, la fa a distància, envia una proposta i torna a trucar durant setmanes o mesos. Un CRM pensat per a comandes que entren per la web no serveix per a aquesta feina, i per això tants portals de Bitrix24 acaben com una agenda cara que ningú actualitza.",
    sections: [
        {
            heading: "El conflicte que cap camp obligatori arregla",
            paragraphs: [
                "El comercial vol passar el dia parlant amb clients i guardar-se els contactes prometedors per a ell. La direcció vol saber quantes trucades es van fer, quantes presentacions es van tancar i quins clients porten mesos sense moviment. Tots dos tenen raó i tots dos són al mateix vaixell.",
                "La resposta habitual és afegir camps obligatoris. El resultat és conegut: camps omplerts amb qualsevol cosa per poder tancar la finestra, i un informe que la direcció no es creu. El problema no és la disciplina de l'equip, és que se li demana que faci la feina del sistema.",
            ],
        },
        {
            heading: "Un formulari, una pantalla, després de cada trucada",
            paragraphs: [
                "El que funciona és invertir la càrrega. En acabar una trucada, el comercial respon a una sola pantalla: amb qui va parlar, què va passar, quan és el següent pas. Res més. El sistema fa la resta: mou el tracte d'etapa, crea la tasca del següent contacte, actualitza la fitxa de l'empresa i registra l'activitat per a l'informe.",
                "Aquest formulari canvia segons el tipus de trucada. Una trucada en fred pregunta si es va aconseguir presentació o quan tornar a intentar-ho. Una presentació pregunta per les necessitats detectades, les objeccions i la decisió. Una trucada de seguiment pregunta si hi ha proposta enviada i què falta per tancar.",
            ],
            bullets: [
                "El comercial omple una pantalla, no deu camps repartits per la fitxa.",
                "Les etapes i les tasques es mouen soles a partir del que va respondre.",
                "L'informe es construeix amb aquestes dades, no amb el que algú va recordar al final del dia.",
            ],
        },
        {
            heading: "El que la direcció veu sense preguntar",
            paragraphs: [
                "Amb un informe per trucada, el panell de la direcció deixa de ser una enquesta. Mostra trucades i presentacions per comercial, conversió entre etapes, motius de rebuig més freqüents i la llista de clients adormits: els que porten més d'un termini acordat sense contacte.",
                "Aquesta última llista resol el conflicte del principi. Si un comercial té massa clients aturats, el sistema ho mostra i les regles acordades permeten redistribuir-los. Ningú perd el client per caprici; el perd per una regla que tothom coneixia.",
            ],
        },
        {
            heading: "Què cal al portal",
            paragraphs: [
                "Tècnicament, això és una aplicació pròpia sobre la REST API de Bitrix24 més una configuració disciplinada del portal: embuts que reflecteixen el cicle real, pocs camps però ben definits, robots que creen tasques a partir de l'informe i un panell de KPI que llegeix les mateixes dades. La mateixa aplicació pot funcionar en diversos portals, cosa que importa quan una xarxa d'oficines vol el mateix procés a totes.",
                "El que no cal és canviar de CRM. Bitrix24 té el necessari; el que falta gairebé sempre és que algú s'assegui amb l'equip, entengui com venen de debò i traslladi això al portal.",
            ],
        },
    ],
    outro: "Si el teu equip truca, presenta i fa seguiment durant mesos, explica'ns com ho feu avui. En una conversa de mitja hora sabrem si un informe per trucada arreglaria el vostre portal o si el problema és en un altre lloc.",
    relatedService: "bitrix",
};
