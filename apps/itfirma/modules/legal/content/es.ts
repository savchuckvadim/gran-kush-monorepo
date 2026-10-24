import type { LegalContent } from "../types";

export const es: LegalContent = {
    "aviso-legal": {
        title: "Aviso legal",
        sections: [
            {
                heading: "Titular del sitio",
                paragraphs: [
                    "En cumplimiento de la Ley 34/2002, de Servicios de la Sociedad de la Información y de Comercio Electrónico (LSSI-CE), se informa de que el titular de {domain} es {name}, profesional autónomo, NIF {nif}, con domicilio en {address}. Correo de contacto: {email}.",
                    "IT-firma es el nombre comercial con el que {name} ejerce dos actividades: el desarrollo de software a medida para terceros (aplicaciones web y móviles, sitios web, integraciones y consultoría tecnológica) y el desarrollo y la comercialización de software propio en la nube (SaaS) mediante suscripción.",
                ],
            },
            {
                heading: "Objeto",
                paragraphs: [
                    "Este sitio presenta los servicios del estudio y permite enviar una solicitud de presupuesto. La información publicada tiene carácter orientativo y no constituye una oferta vinculante; las condiciones de cada proyecto se acuerdan por escrito.",
                ],
            },
            {
                heading: "Propiedad intelectual",
                paragraphs: [
                    "Los textos, el diseño y el código de este sitio son propiedad de {name}, salvo las marcas y los nombres de terceros, que pertenecen a sus titulares. No se permite su reproducción con fines comerciales sin autorización.",
                ],
            },
            {
                heading: "Responsabilidad",
                paragraphs: [
                    "{name} no responde de los daños derivados del uso de la información del sitio ni del contenido de los sitios externos enlazados. Se procura mantener el sitio disponible y actualizado, sin garantizar la ausencia de interrupciones.",
                ],
            },
            {
                heading: "Legislación aplicable",
                paragraphs: [
                    "La relación entre el usuario y el titular se rige por la legislación española. Para cualquier controversia serán competentes los juzgados y tribunales que correspondan conforme a la ley.",
                ],
            },
        ],
    },
    privacidad: {
        title: "Política de privacidad",
        sections: [
            {
                heading: "Responsable del tratamiento",
                paragraphs: [
                    "{name}, profesional autónomo, NIF {nif}, con domicilio en {address}. Contacto para protección de datos: {email}.",
                ],
            },
            {
                heading: "Qué datos se tratan y para qué",
                paragraphs: [
                    "El formulario de contacto recoge nombre, correo electrónico, teléfono o usuario de Telegram (opcional), el tipo de servicio, el presupuesto estimado y el texto de la solicitud. Se tratan únicamente para responder a la solicitud, preparar una propuesta y, en su caso, formalizar la relación contractual.",
                    "La base jurídica es el consentimiento que se otorga al enviar el formulario (art. 6.1.a RGPD) y, cuando se llega a un acuerdo, la ejecución del contrato (art. 6.1.b RGPD). El sitio no realiza decisiones automatizadas ni elaboración de perfiles.",
                ],
            },
            {
                heading: "Conservación",
                paragraphs: [
                    "Las solicitudes que no dan lugar a un contrato se conservan como máximo doce meses desde la última comunicación. Los datos de clientes se conservan durante la relación y los plazos que exige la legislación fiscal y mercantil.",
                ],
            },
            {
                heading: "Destinatarios",
                paragraphs: [
                    "La solicitud se entrega al titular por correo electrónico y por Telegram. Los proveedores de correo, de mensajería y de alojamiento actúan como encargados del tratamiento. No se ceden datos a terceros con fines comerciales. Si un proveedor está fuera del Espacio Económico Europeo, la transferencia se ampara en las cláusulas contractuales tipo de la Comisión Europea.",
                ],
            },
            {
                heading: "Derechos",
                paragraphs: [
                    "Puede ejercer los derechos de acceso, rectificación, supresión, oposición, limitación y portabilidad escribiendo a {email}. Si considera que el tratamiento no se ajusta a la normativa, puede reclamar ante la Agencia Española de Protección de Datos (aepd.es).",
                ],
            },
        ],
    },
    cookies: {
        title: "Política de cookies",
        sections: [
            {
                heading: "Qué utiliza este sitio",
                paragraphs: [
                    "Este sitio no utiliza cookies de seguimiento, de análisis ni publicitarias. No se carga ningún servicio de terceros que identifique al visitante.",
                    "El único dato que se guarda en el navegador es la apariencia elegida (tema y modo claro u oscuro), mediante el almacenamiento local del propio navegador. Es una preferencia técnica, no identifica a la persona y puede borrarse en cualquier momento desde la configuración del navegador.",
                ],
            },
            {
                heading: "Fuentes tipográficas",
                paragraphs: [
                    "Las fuentes se sirven desde el propio dominio {domain}; no se realizan peticiones a servidores de fuentes de terceros al cargar la página.",
                ],
            },
        ],
    },
};
