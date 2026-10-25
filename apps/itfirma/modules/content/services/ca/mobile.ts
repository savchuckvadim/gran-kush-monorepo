import type { ServicePageContent } from "../../types";

export const mobile: ServicePageContent = {
    key: "mobile",
    metaTitle: "Desenvolupament d'apps mòbils per a iOS i Android",
    metaDescription:
        "Aplicacions mòbils amb una sola base de codi per a iOS i Android: accés, pagaments, notificacions, mode sense connexió i publicació a l'App Store i Google Play.",
    title: "Apps mòbils",
    lead: "Una base de codi, dues botigues: apps per a clients i per a equips de camp, amb backend propi i publicació inclosa.",
    intro: [
        "La majoria de les apps de negoci no necessiten dos equips natius. Amb React Native i Expo escrivim una sola aplicació que es publica a l'App Store i Google Play, comparteix lògica amb la teva web i s'actualitza sense esperar la revisió de les botigues quan el canvi és només d'interfície.",
        "El que distingeix una app útil d'una icona oblidada és el backend i els detalls: inici de sessió sense fricció, notificacions que arriben quan importen, feina sense cobertura que se sincronitza després, pagaments que no fallen. Dissenyem aquestes peces abans que les pantalles.",
        "Si ja tens una aplicació web o un CRM, l'app mòbil es connecta a la mateixa API: el client veu les seves cites o comandes, l'empleat marca presència o escaneja un codi, i tot queda en un únic sistema.",
    ],
    forWhom: [
        "Negocis amb clients recurrents que reserven, demanen o consulten des del mòbil.",
        "Equips de camp que necessiten registrar feina, signatures o fotos sense cobertura.",
        "Productes SaaS que afegeixen una app a la seva aplicació web existent.",
        "Empreses amb una app antiga que ja no passa les revisions de les botigues.",
    ],
    deliverables: [
        {
            title: "App per a iOS i Android",
            text: "Una base de codi en React Native amb Expo, interfície nativa a cada plataforma i actualitzacions per aire per a canvis d'interfície.",
        },
        {
            title: "Backend i API",
            text: "Servidor propi o connexió al teu sistema actual, amb autenticació, permisos i sincronització de dades.",
        },
        {
            title: "Accés i notificacions",
            text: "Inici de sessió per correu, telèfon, Google o Apple; notificacions push segmentades i enllaços profunds.",
        },
        {
            title: "Pagaments i subscripcions",
            text: "Cobraments amb targeta, subscripcions de botiga quan escau i facturació connectada a la teva comptabilitat.",
        },
        {
            title: "Publicació a les botigues",
            text: "Comptes de desenvolupador, fitxes, captures, polítiques de privacitat i respostes a la revisió fins a l'aprovació.",
        },
        {
            title: "Analítica i suport",
            text: "Registre d'errors, mètriques d'ús i un canal per publicar correccions en hores, no setmanes.",
        },
    ],
    steps: [
        {
            title: "Abast i prototip",
            text: "Definim les pantalles imprescindibles i les provem en un prototip navegable abans de programar.",
        },
        {
            title: "Backend primer",
            text: "API, dades i notificacions a punt i provades; l'app es construeix sobre una cosa que ja funciona.",
        },
        {
            title: "Desenvolupament i proves",
            text: "Versions de prova al teu telèfon cada una o dues setmanes a través de TestFlight i Google Play intern.",
        },
        {
            title: "Publicació i seguiment",
            text: "Enviament a les botigues, resposta a la revisió i les primeres setmanes d'ajustos amb els usuaris reals.",
        },
    ],
    stack: [
        "React Native",
        "Expo",
        "TypeScript",
        "NestJS",
        "PostgreSQL",
        "Push (APNs, FCM)",
        "Stripe",
    ],
    faq: [
        {
            question: "Natiu o multiplataforma?",
            answer: "Per a apps de negoci, multiplataforma amb React Native: un equip, un codi, dues botigues. Recomanem natiu només quan l'app depèn de maquinari o rendiment gràfic extrem, i en aquest cas t'ho diem.",
        },
        {
            question: "Quant costa mantenir una app?",
            answer: "Les botigues canvien els seus requisits cada any i els sistemes operatius cada tardor. Reservem un suport mensual petit per a actualitzacions, certificats i correccions; la resta depèn de quant evolucioni el producte.",
        },
        {
            question: "Publiqueu amb el nostre compte de desenvolupador?",
            answer: "Sí, sempre amb el vostre. Així l'app, les ressenyes i els ingressos són vostres des del primer dia.",
        },
        {
            question: "I si la botiga rebutja l'app?",
            answer: "Preparem la fitxa i les polítiques pensant en la revisió, i responem a les objeccions fins a l'aprovació. Està inclòs al projecte.",
        },
    ],
};
