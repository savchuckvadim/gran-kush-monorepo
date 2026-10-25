import type { ServicePageContent } from "../../types";

export const bitrix: ServicePageContent = {
    key: "bitrix",
    metaTitle: "Implantació de Bitrix24 clau en mà",
    metaDescription:
        "Configurem Bitrix24 al voltant del teu procés de venda: embuts, automatitzacions, telefonia, informes, migració de dades, formació i aplicacions pròpies quan la configuració no arriba.",
    title: "Bitrix24 clau en mà",
    lead: "Un CRM configurat al voltant de com ven el teu equip, amb automatitzacions que estalvien clics i dades que el responsable veu sense preguntar.",
    intro: [
        "Bitrix24 porta CRM, tasques, telefonia, xats i automatitzacions en una sola subscripció. Aquesta és la seva força i la seva trampa: un portal acabat de crear té centenars d'opcions i cap reflecteix el teu negoci. El resultat habitual és un CRM que els comercials omplen a contracor i del qual la direcció no es refia.",
        "Nosaltres comencem pel procés, no per les pantalles. Descrivim amb tu com entra un client, què passa a cada trucada, qui decideix i quan es perd una venda. Després traslladem aquest procés al portal: embuts, camps, automatitzacions, rols i els informes que de debò es miren.",
        "On la configuració estàndard no arriba, desenvolupem aplicacions per al teu portal sobre la REST API: formularis d'una pantalla a la fitxa, robots a mida, panells de KPI i sincronització amb altres sistemes. Les mateixes aplicacions funcionen en diversos portals alhora, així que una xarxa d'oficines o franquícies s'administra des d'un lloc.",
    ],
    forWhom: [
        "Equips de venda activa que truquen, presenten i fan seguiment durant mesos.",
        "Empreses que ja tenen Bitrix24 i no el fan servir, o el fan servir com una llibreta cara.",
        "Xarxes d'oficines o distribuïdors que necessiten el mateix procés en diversos portals.",
        "Negocis que migren des de fulls de càlcul o d'un altre CRM sense perdre l'historial.",
    ],
    deliverables: [
        {
            title: "Mapa del procés de venda",
            text: "Etapes, responsables, punts de pèrdua i quina dada es recull a cada pas. És el document sobre el qual es configura tota la resta.",
        },
        {
            title: "Portal configurat",
            text: "Embuts, camps, fitxes de client, rols i permisos, plantilles de correu i documents. Sense camps que ningú omple.",
        },
        {
            title: "Automatitzacions i robots",
            text: "Tasques i recordatoris automàtics, canvis d'etapa per esdeveniments, avisos al responsable quan un client es refreda.",
        },
        {
            title: "Telefonia i missatgeria",
            text: "Trucades des de la fitxa amb enregistrament, formulari d'informe després de la trucada, WhatsApp i Telegram al mateix xat del CRM.",
        },
        {
            title: "Informes per a la direcció",
            text: "Conversió per etapa i per comercial, activitat diària, motius de pèrdua. Al mateix Bitrix24 o en un panell a part.",
        },
        {
            title: "Formació i manual",
            text: "Sessions amb l'equip al seu portal, un manual curt amb captures i les primeres setmanes d'ajustos incloses.",
        },
    ],
    steps: [
        {
            title: "Auditoria del procés",
            text: "Dues o tres sessions amb la direcció i amb comercials. En sortim amb el mapa del procés i la llista del que s'automatitza.",
        },
        {
            title: "Configuració",
            text: "Muntem el portal en un entorn de proves amb dades reals anonimitzades. Revises cada embut abans que el vegi l'equip.",
        },
        {
            title: "Migració i llançament",
            text: "Importem clients i tractes, connectem telefonia i web, formem l'equip i arrenquem un dilluns amb suport en directe.",
        },
        {
            title: "Ajust",
            text: "Durant les primeres setmanes corregim el que la pràctica canvia: un camp sobrer, un robot que molesta, un informe que falta.",
        },
    ],
    stack: [
        "Bitrix24 REST API",
        "Aplicacions de marketplace",
        "Robots i processos de negoci",
        "Telefonia SIP i VoIP",
        "WhatsApp i Telegram",
        "NestJS",
        "PostgreSQL",
    ],
    faq: [
        {
            question: "Treballeu amb portals al núvol i amb instal·lacions pròpies?",
            answer: "Sí. La majoria de clients fan servir el núvol de Bitrix24; per a instal·lacions on-premise apliquem les mateixes aplicacions i automatitzacions, amb el desplegament al vostre servidor.",
        },
        {
            question: "Hem de comprar la llicència a través vostre?",
            answer: "No. La llicència la contractes directament amb Bitrix24 o amb qui prefereixis; nosaltres cobrem per la feina d'implantació, no per la subscripció.",
        },
        {
            question:
                "Ja tenim Bitrix24 configurat i no funciona. Es pot arreglar sense començar de zero?",
            answer: "Gairebé sempre. Auditem el portal, mantenim el que serveix, traiem camps i robots morts i tornem a formar l'equip. Començar de zero només si l'historial no val res.",
        },
        {
            question: "Quant triga una implantació?",
            answer: "De tres a vuit setmanes. Un equip petit amb un embut clar arrenca en tres; una xarxa amb telefonia, diversos portals i aplicacions pròpies s'acosta a dos mesos.",
        },
    ],
};
