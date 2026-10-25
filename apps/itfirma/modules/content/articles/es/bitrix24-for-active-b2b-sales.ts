import type { ArticleContent } from "../../types";

export const bitrix24ForActiveB2bSales: ArticleContent = {
    title: "Bitrix24 para ventas activas B2B: un informe por llamada en lugar de diez campos",
    description:
        "Por qué los comerciales no rellenan el CRM, qué puede ver la dirección sin pedir nada y cómo configurar Bitrix24 para que el sistema trabaje después de cada llamada.",
    date: "2026-10-20",
    readingMinutes: 7,
    intro: "En las ventas activas el comercial llama él, no espera a que le llamen. Llama en frío, consigue una presentación, la hace a distancia, envía una propuesta y vuelve a llamar durante semanas o meses. Un CRM pensado para pedidos que entran por la web no sirve para ese trabajo, y por eso tantos portales de Bitrix24 acaban como una agenda cara que nadie actualiza.",
    sections: [
        {
            heading: "El conflicto que ningún campo obligatorio arregla",
            paragraphs: [
                "El comercial quiere pasar el día hablando con clientes y guardarse los contactos prometedores para sí. La dirección quiere saber cuántas llamadas se hicieron, cuántas presentaciones se cerraron y qué clientes llevan meses sin movimiento. Los dos tienen razón y los dos están en el mismo barco.",
                "La respuesta habitual es añadir campos obligatorios. El resultado es conocido: campos rellenados con cualquier cosa para poder cerrar la ventana, y un informe que la dirección no se cree. El problema no es la disciplina del equipo, es que se le pide que haga el trabajo del sistema.",
            ],
        },
        {
            heading: "Un formulario, una pantalla, después de cada llamada",
            paragraphs: [
                "Lo que funciona es invertir la carga. Al terminar una llamada, el comercial responde a una sola pantalla: con quién habló, qué pasó, cuándo es el siguiente paso. Nada más. El sistema hace el resto: mueve el trato de etapa, crea la tarea del siguiente contacto, actualiza la ficha de la empresa y registra la actividad para el informe.",
                "Ese formulario cambia según el tipo de llamada. Una llamada en frío pregunta si se consiguió presentación o cuándo volver a intentarlo. Una presentación pregunta por las necesidades detectadas, las objeciones y la decisión. Una llamada de seguimiento pregunta si hay propuesta enviada y qué falta para cerrar.",
            ],
            bullets: [
                "El comercial rellena una pantalla, no diez campos repartidos por la ficha.",
                "Las etapas y las tareas se mueven solas a partir de lo que respondió.",
                "El informe se construye con esos datos, no con lo que alguien recordó al final del día.",
            ],
        },
        {
            heading: "Lo que la dirección ve sin preguntar",
            paragraphs: [
                "Con un informe por llamada, el panel de la dirección deja de ser una encuesta. Muestra llamadas y presentaciones por comercial, conversión entre etapas, motivos de rechazo más frecuentes y la lista de clientes dormidos: los que llevan más de un plazo acordado sin contacto.",
                "Esa última lista resuelve el conflicto del principio. Si un comercial tiene demasiados clientes parados, el sistema lo muestra y las reglas acordadas permiten redistribuirlos. Nadie pierde el cliente por capricho; lo pierde por una regla que todos conocían.",
            ],
        },
        {
            heading: "Qué hace falta en el portal",
            paragraphs: [
                "Técnicamente, esto es una aplicación propia sobre la REST API de Bitrix24 más una configuración disciplinada del portal: embudos que reflejan el ciclo real, pocos campos pero bien definidos, robots que crean tareas a partir del informe y un panel de KPI que lee los mismos datos. La misma aplicación puede funcionar en varios portales, lo que importa cuando una red de oficinas quiere el mismo proceso en todas.",
                "Lo que no hace falta es cambiar de CRM. Bitrix24 tiene lo necesario; lo que falta casi siempre es que alguien se siente con el equipo, entienda cómo venden de verdad y traslade eso al portal.",
            ],
        },
    ],
    outro: "Si tu equipo llama, presenta y hace seguimiento durante meses, cuéntanos cómo lo hacéis hoy. En una conversación de media hora sabremos si un informe por llamada arreglaría vuestro portal o si el problema está en otro sitio.",
    relatedService: "bitrix",
};
