import type { LegalContent } from "../types";

export const es: LegalContent = {
    ui: {
        eyebrow: "Legal",
        updated: "Última actualización",
        otherDocs: "Documentos legales",
        smoke: "Efecto de humo",
        download: "Descargar",
        pending: {
            nif: "[NIF pendiente]",
            address: "[domicilio pendiente]",
            email: "[email pendiente]",
        },
    },
    docs: {
        "aviso-legal": {
            title: "Aviso legal",
            description: "Datos del titular de paf-paf.app y condiciones de uso del sitio.",
            sections: [
                {
                    heading: "Titular del sitio",
                    blocks: [
                        "En cumplimiento del artículo 10 de la Ley 34/2002, de servicios de la sociedad de la información y de comercio electrónico (LSSI-CE), se informa de los datos del titular de este sitio web:",
                        {
                            list: [
                                "Titular: {name}, profesional autónomo.",
                                "NIF: {nif}.",
                                "Domicilio: {address}.",
                                "Correo electrónico: {email}.",
                                "Sitio web: paf-paf.app. Aplicación: crm.paf-paf.app.",
                            ],
                        },
                        "El titular no está inscrito en el Registro Mercantil ni en ningún otro registro público por razón de su actividad.",
                    ],
                },
                {
                    heading: "Objeto",
                    blocks: [
                        "Este sitio presenta PafPaf, un software de gestión (CRM) en la nube que se contrata por suscripción, y da acceso a su registro e inicio de sesión. La contratación del servicio se rige por los [Términos y condiciones](doc:terminos).",
                    ],
                },
                {
                    heading: "Condiciones de uso",
                    blocks: [
                        "El acceso al sitio es gratuito y no requiere registro. Quien lo utiliza se compromete a hacerlo conforme a la ley y a estas condiciones, y a no dañar el sitio, sus sistemas ni los datos de terceros.",
                    ],
                },
                {
                    heading: "Propiedad intelectual e industrial",
                    blocks: [
                        "El software PafPaf, los textos, el diseño, los logotipos y el resto de contenidos del sitio pertenecen al titular o se usan con licencia. No se permite su reproducción, distribución o transformación sin autorización, salvo el uso privado y las excepciones que prevea la ley.",
                    ],
                },
                {
                    heading: "Responsabilidad",
                    blocks: [
                        "El titular procura que la información del sitio sea exacta y esté actualizada, pero no garantiza la ausencia de errores ni la disponibilidad ininterrumpida del sitio. Los enlaces a sitios de terceros se ofrecen solo como referencia; el titular no responde de su contenido.",
                    ],
                },
                {
                    heading: "Punto de contacto",
                    blocks: [
                        "Para cualquier consulta, para comunicar contenidos ilícitos y para las comunicaciones de autoridades y usuarios a las que se refieren los artículos 11 y 12 del Reglamento (UE) 2022/2065 de servicios digitales, el punto de contacto es {email}. Atendemos en español, inglés y ruso.",
                    ],
                },
                {
                    heading: "Legislación y jurisdicción",
                    blocks: [
                        "Este aviso se rige por la legislación española. Las controversias se someten a los juzgados y tribunales del domicilio del titular, salvo que la ley atribuya la competencia a otro fuero, como el del domicilio del consumidor.",
                    ],
                },
            ],
        },

        privacidad: {
            title: "Política de privacidad",
            description:
                "Qué datos personales trata PafPaf como responsable, para qué, durante cuánto tiempo y cómo ejercer tus derechos.",
            sections: [
                {
                    heading: "Responsable del tratamiento",
                    blocks: [
                        "{name}, profesional autónomo, NIF {nif}, con domicilio en {address}. Contacto para protección de datos: {email}.",
                    ],
                },
                {
                    heading: "A quién se aplica esta política",
                    blocks: [
                        "Se aplica a los visitantes de paf-paf.app y a los clientes de PafPaf: los clubes, asociaciones, estudios y profesionales que contratan el servicio, y las personas que acceden a la aplicación en su nombre (titulares y empleados).",
                        "Los datos de los socios, clientes y empleados que cada cliente registra en su espacio de PafPaf los trata ese cliente como responsable; PafPaf actúa solo como encargado del tratamiento, según el [Contrato de encargo](doc:encargo). Para ejercer tus derechos sobre esos datos, dirígete a la entidad con la que te relacionas.",
                    ],
                },
                {
                    heading: "Qué datos tratamos y para qué",
                    blocks: [
                        {
                            table: {
                                head: ["Datos", "Finalidad", "Base jurídica"],
                                rows: [
                                    [
                                        "Datos técnicos de la visita: dirección IP, navegador, páginas solicitadas",
                                        "Servir el sitio, protegerlo frente a abusos y diagnosticar errores",
                                        "Interés legítimo en la seguridad del servicio (art. 6.1.f RGPD)",
                                    ],
                                    [
                                        "Cuenta: nombre, email, teléfono, rol, contraseña cifrada, registros de acceso",
                                        "Dar de alta el espacio, permitir el acceso y prestar el servicio contratado",
                                        "Ejecución del contrato (art. 6.1.b RGPD)",
                                    ],
                                    [
                                        "Facturación: denominación, NIF, dirección, plan, pagos",
                                        "Cobrar la suscripción, emitir facturas y cumplir obligaciones fiscales y contables",
                                        "Ejecución del contrato y obligación legal (art. 6.1.b y 6.1.c RGPD)",
                                    ],
                                    [
                                        "Email y contenido de tus mensajes",
                                        "Responder consultas y prestar soporte",
                                        "Ejecución del contrato o, si aún no eres cliente, tu solicitud",
                                    ],
                                    [
                                        "Email de clientes",
                                        "Informar de novedades de PafPaf parecidas a lo contratado; puedes darte de baja en cada envío",
                                        "Art. 21.2 LSSI-CE e interés legítimo; para el resto de comunicaciones comerciales, tu consentimiento",
                                    ],
                                ],
                            },
                        },
                        "No usamos herramientas de analítica ni publicidad, no elaboramos perfiles y no tomamos decisiones automatizadas con efectos jurídicos sobre ti.",
                        "Los pagos los procesa Stripe. PafPaf no recibe ni almacena los datos completos de tu tarjeta.",
                    ],
                },
                {
                    heading: "Durante cuánto tiempo",
                    blocks: [
                        {
                            list: [
                                "Datos de la cuenta: mientras dure el contrato y, tras su fin, el plazo necesario para la exportación de datos previsto en los Términos (30 días). Después se suprimen.",
                                "Facturas y datos contables: seis años (art. 30 del Código de Comercio) y, en todo caso, mientras puedan exigirse responsabilidades fiscales.",
                                "Registros técnicos: el tiempo imprescindible para la seguridad del servicio, como máximo 90 días.",
                                "Consultas sin contrato: hasta resolverlas y, después, durante el plazo de posibles reclamaciones.",
                            ],
                        },
                    ],
                },
                {
                    heading: "Destinatarios",
                    blocks: [
                        "No cedemos tus datos a terceros salvo obligación legal. Los proveedores que nos prestan servicios acceden a ellos solo para ello y con contrato de encargo: alojamiento, almacenamiento de archivos, red de entrega, correo electrónico y pagos. La lista completa, con su ubicación, está en [Subencargados](doc:subencargados).",
                        "Algunos de esos proveedores pertenecen a grupos con sede en Estados Unidos. En esos casos la transferencia se ampara en el Marco de Privacidad de Datos UE-EE. UU. y, como garantía adicional, en las cláusulas contractuales tipo de la Comisión Europea.",
                    ],
                },
                {
                    heading: "Tus derechos",
                    blocks: [
                        "Puedes solicitar el acceso, la rectificación o la supresión de tus datos, la limitación del tratamiento, la portabilidad y oponerte al tratamiento, así como retirar el consentimiento cuando sea la base del tratamiento. Escríbenos a {email} indicando el derecho que ejerces; podremos pedirte que acredites tu identidad. Respondemos en el plazo de un mes.",
                        "Si consideras que no hemos atendido bien tu solicitud, puedes reclamar ante la Agencia Española de Protección de Datos ([www.aepd.es](https://www.aepd.es)).",
                    ],
                },
                {
                    heading: "Seguridad",
                    blocks: [
                        "Las conexiones van cifradas, las contraseñas se guardan cifradas con un algoritmo de un solo sentido y los datos de cada cliente están separados de los del resto. El acceso a los sistemas está limitado a quien lo necesita.",
                    ],
                },
                {
                    heading: "Menores",
                    blocks: [
                        "PafPaf es un servicio para entidades y profesionales y no está dirigido a menores de 18 años.",
                    ],
                },
                {
                    heading: "Cambios",
                    blocks: [
                        "Si cambiamos esta política, publicaremos la nueva versión en esta página con su fecha y, si el cambio es relevante, avisaremos a los clientes por email.",
                    ],
                },
            ],
        },

        cookies: {
            title: "Política de cookies",
            description:
                "Qué cookies y almacenamiento local usan paf-paf.app y la aplicación PafPaf.",
            sections: [
                {
                    heading: "Qué son",
                    blocks: [
                        "Las cookies son pequeños archivos que el sitio guarda en tu navegador. Esta política también cubre tecnologías parecidas, como el almacenamiento local del navegador (localStorage).",
                    ],
                },
                {
                    heading: "Qué usamos",
                    blocks: [
                        "Solo usamos cookies y almacenamiento técnicos o de preferencias que tú mismo eliges. Están exentos de consentimiento según el artículo 22.2 de la LSSI-CE, por eso no mostramos un banner de cookies.",
                        {
                            table: {
                                head: ["Nombre", "Dónde", "Para qué", "Duración"],
                                rows: [
                                    [
                                        "NEXT_LOCALE",
                                        "paf-paf.app",
                                        "Recordar el idioma elegido cuando difiere del de tu navegador",
                                        "Sesión",
                                    ],
                                    [
                                        "pafpaf.mode (localStorage)",
                                        "paf-paf.app",
                                        "Recordar el modo claro u oscuro",
                                        "Hasta que lo borres",
                                    ],
                                    [
                                        "crm_access_token",
                                        "crm.paf-paf.app",
                                        "Mantener la sesión iniciada",
                                        "15 minutos",
                                    ],
                                    [
                                        "crm_refresh_token",
                                        "crm.paf-paf.app",
                                        "Renovar la sesión sin volver a introducir la contraseña",
                                        "7 días",
                                    ],
                                    [
                                        "crm.skin, crm.eco, theme (localStorage)",
                                        "crm.paf-paf.app",
                                        "Recordar el tema visual, el ahorro de energía y el modo claro u oscuro",
                                        "Hasta que lo borres",
                                    ],
                                    [
                                        "payload-token",
                                        "paf-paf.app/admin",
                                        "Sesión de los editores del sitio",
                                        "Sesión de trabajo",
                                    ],
                                    [
                                        "__cf_bm y similares",
                                        "Todos los dominios",
                                        "Seguridad: Cloudflare puede usarlas para distinguir personas de bots",
                                        "Hasta 30 minutos",
                                    ],
                                ],
                            },
                        },
                        "No usamos cookies de analítica, publicidad ni redes sociales. Si algún día las incorporamos, te pediremos el consentimiento antes y podrás rechazarlas con la misma facilidad.",
                    ],
                },
                {
                    heading: "Cómo eliminarlas",
                    blocks: [
                        "Puedes borrar o bloquear las cookies y el almacenamiento local desde la configuración de tu navegador. Si bloqueas las de sesión de crm.paf-paf.app no podrás iniciar sesión en la aplicación.",
                    ],
                },
            ],
        },

        terminos: {
            title: "Términos y condiciones de contratación",
            description:
                "Condiciones de la suscripción a PafPaf: alta, prueba, precios, pago, cancelación, datos y responsabilidad.",
            sections: [
                {
                    heading: "Partes y objeto",
                    blocks: [
                        "Estas condiciones regulan la suscripción al servicio PafPaf, un software de gestión (CRM) en la nube, entre {name}, profesional autónomo con NIF {nif} («PafPaf»), y la entidad o profesional que crea un espacio de trabajo en el servicio («el Cliente»). Al registrarse, el Cliente las acepta junto con el [Contrato de encargo](doc:encargo), que forma parte del contrato.",
                        "El contrato se celebra en línea, en español; las versiones en inglés y ruso son traducciones. El Cliente puede descargar o imprimir estas condiciones en cualquier momento desde esta página y recibe la confirmación del alta por email.",
                    ],
                },
                {
                    heading: "Servicio para profesionales",
                    blocks: [
                        "PafPaf se ofrece a clubes, asociaciones, estudios, empresas y profesionales para su actividad. Al registrarse, el Cliente declara actuar en ese ámbito y facilita su NIF o CIF.",
                        "Si, pese a ello, el Cliente tuviera la condición de consumidor según la normativa aplicable, conservará los derechos que esta le reconoce y que no pueden excluirse, entre ellos el desistimiento en 14 días naturales desde la contratación. Si pide que el servicio empiece antes de ese plazo, abonará la parte proporcional del periodo ya prestado.",
                    ],
                },
                {
                    heading: "Alta y cuentas",
                    blocks: [
                        "El Cliente se compromete a facilitar datos veraces y a mantenerlos actualizados, y es responsable de las cuentas de sus empleados, de custodiar sus credenciales y de lo que se haga con ellas. Debe avisar a PafPaf en cuanto sospeche de un acceso no autorizado.",
                    ],
                },
                {
                    heading: "Periodo de prueba",
                    blocks: [
                        "El alta puede incluir un periodo de prueba gratuito, cuya duración se indica al registrarse. Al terminar, el Cliente elige un plan y lo paga para seguir usando el servicio. Mientras no lo haga, el acceso queda limitado a la sección de suscripción y los datos se conservan al menos 30 días para que pueda contratar o solicitar su exportación.",
                    ],
                },
                {
                    heading: "Planes, precios e impuestos",
                    blocks: [
                        "Los planes y precios vigentes se publican en [paf-paf.app/es/precios](https://paf-paf.app/es/precios). Los precios se expresan en euros y no incluyen el IVA. A los clientes en España se les añade el IVA del 21 %; a los clientes de otros Estados de la UE con número de IVA válido se les factura sin IVA por inversión del sujeto pasivo.",
                        "PafPaf puede cambiar los precios avisando con al menos 30 días de antelación. El nuevo precio se aplica desde el siguiente periodo de facturación, y el Cliente puede cancelar antes si no está de acuerdo.",
                    ],
                },
                {
                    heading: "Pago, renovación y facturas",
                    blocks: [
                        "La suscripción se paga por adelantado, mensual o anualmente, a través de Stripe. Se renueva automáticamente al final de cada periodo hasta que el Cliente la cancele. Por acuerdo con PafPaf, los planes anuales pueden pagarse por transferencia bancaria.",
                        "PafPaf emite factura de cada pago y la envía por email o la pone a disposición en la aplicación. El Cliente acepta recibir las facturas en formato electrónico.",
                    ],
                },
                {
                    heading: "Impago",
                    blocks: [
                        "Si un cobro no se completa, el Cliente dispone de 7 días para regularizarlo. Pasado ese plazo, el acceso queda limitado a la sección de suscripción hasta el pago. Los datos no se borran por el impago y se rigen por el apartado de fin del contrato.",
                    ],
                },
                {
                    heading: "Cancelación y fin del contrato",
                    blocks: [
                        "El Cliente puede cancelar en cualquier momento desde la aplicación, en Configuración → Suscripción, o escribiendo a {email}. La cancelación surte efecto al final del periodo ya pagado; no se reembolsan los periodos parciales, salvo que la ley lo exija.",
                        "PafPaf puede resolver el contrato con un aviso de 30 días, o de inmediato si el Cliente incumple gravemente estas condiciones, en especial el uso aceptable.",
                    ],
                },
                {
                    heading: "Datos del Cliente, exportación y cambio de proveedor",
                    blocks: [
                        "Los datos que el Cliente introduce en PafPaf son suyos. PafPaf los trata como encargado, según el [Contrato de encargo](doc:encargo).",
                        "A solicitud del Cliente, PafPaf entrega una exportación completa de sus datos en un formato estructurado y de uso común (JSON o CSV, y los archivos adjuntos) en un plazo máximo de 30 días. La exportación y el cambio a otro proveedor de servicios de tratamiento de datos son gratuitos.",
                        "Para cambiar de proveedor, el Cliente puede avisar con un preaviso de hasta dos meses. Tras el fin del contrato, sus datos siguen disponibles para exportación durante 30 días y después se suprimen, salvo que la ley obligue a conservarlos.",
                    ],
                },
                {
                    heading: "Licencia de uso",
                    blocks: [
                        "Durante la suscripción, PafPaf concede al Cliente y a sus usuarios un derecho de uso del software no exclusivo e intransferible, limitado a su propia actividad. El software y sus mejoras siguen siendo de PafPaf. No se permite copiarlo, revenderlo, descompilarlo ni usarlo para crear un servicio competidor, salvo lo que la ley permita.",
                    ],
                },
                {
                    heading: "Uso aceptable",
                    blocks: [
                        "El Cliente usará PafPaf conforme a la ley. Es responsable de los datos que introduce y de tener una base jurídica para tratarlos; no subirá más datos de los necesarios, en particular copias de documentos de identidad o datos de categorías especiales sin justificación legal.",
                        "Cualquiera puede comunicar a {email} contenidos presuntamente ilícitos alojados en PafPaf, indicando dónde están y por qué lo son. PafPaf los revisará con diligencia, podrá suspender el acceso al contenido o a la cuenta si lo confirma y explicará los motivos de su decisión a los afectados.",
                    ],
                },
                {
                    heading: "Disponibilidad y soporte",
                    blocks: [
                        "PafPaf pone medios razonables para que el servicio esté disponible y realiza copias de seguridad periódicas, pero no garantiza un servicio sin interrupciones. Las tareas de mantenimiento previstas se avisan con antelación cuando afecten al uso. El soporte se presta por email en español, inglés y ruso.",
                    ],
                },
                {
                    heading: "Responsabilidad",
                    blocks: [
                        "La responsabilidad total de PafPaf derivada del contrato se limita a las cantidades pagadas por el Cliente en los 12 meses anteriores al hecho que la origine. PafPaf no responde del lucro cesante ni de daños indirectos. Estos límites no se aplican al dolo ni a la culpa grave, ni cuando la ley no los permita.",
                    ],
                },
                {
                    heading: "Cambios en las condiciones",
                    blocks: [
                        "PafPaf puede modificar estas condiciones avisando por email con al menos 30 días de antelación. Si el Cliente no está de acuerdo, puede cancelar antes de que entren en vigor.",
                    ],
                },
                {
                    heading: "Ley aplicable y jurisdicción",
                    blocks: [
                        "El contrato se rige por la ley española. Las controversias se someten a los juzgados y tribunales del domicilio de PafPaf, salvo que el Cliente sea consumidor, en cuyo caso será competente el de su domicilio.",
                    ],
                },
            ],
        },

        encargo: {
            title: "Contrato de encargo del tratamiento",
            description:
                "Condiciones en las que PafPaf trata, por cuenta de cada cliente, los datos personales que este gestiona en la aplicación (art. 28 RGPD).",
            sections: [
                {
                    heading: "Partes y objeto",
                    blocks: [
                        "Este contrato forma parte de los [Términos y condiciones](doc:terminos) y lo acepta el Cliente al registrarse. El Cliente es el responsable del tratamiento y {name}, NIF {nif} («PafPaf»), el encargado. Su objeto es el tratamiento de datos personales necesario para prestar el servicio PafPaf.",
                    ],
                },
                {
                    heading: "Duración",
                    blocks: [
                        "Dura lo que el contrato de servicio y, después, el tiempo necesario para devolver y suprimir los datos según el apartado de fin del encargo.",
                    ],
                },
                {
                    heading: "Naturaleza y finalidad",
                    blocks: [
                        "Alojamiento, almacenamiento, organización, consulta, modificación, exportación y supresión de datos para la gestión de socios, clientes, asistencia, pedidos, productos y empleados del Cliente, y para enviar en su nombre los emails transaccionales del servicio (confirmación de email, acceso, invitaciones).",
                    ],
                },
                {
                    heading: "Datos y personas afectadas",
                    blocks: [
                        {
                            list: [
                                "Personas: socios, clientes y empleados del Cliente, y personas de contacto.",
                                "Datos: identificativos y de contacto (nombre, email, teléfono), número de socio o cliente, estado y fechas de alta, registros de asistencia, pedidos, firma, y copias de documentos de identidad si el Cliente decide guardarlas, además de los campos adicionales que el propio Cliente configure.",
                                "El Cliente decide qué datos introduce. Si trata datos de categorías especiales (por ejemplo, de salud), debe contar con una base jurídica válida y haber evaluado el riesgo; PafPaf aplicará las medidas de este contrato.",
                            ],
                        },
                    ],
                },
                {
                    heading: "Obligaciones de PafPaf",
                    blocks: [
                        {
                            list: [
                                "Tratar los datos solo según las instrucciones documentadas del Cliente, que son este contrato y el uso que hace de la aplicación, también en cuanto a transferencias internacionales. Si una instrucción le parece contraria a la normativa, lo avisará de inmediato.",
                                "Garantizar que las personas autorizadas a tratar los datos se han comprometido a la confidencialidad.",
                                "Aplicar las medidas de seguridad del artículo 32 RGPD: cifrado de las conexiones, contraseñas cifradas con un algoritmo de un solo sentido, separación de los datos de cada cliente, control de accesos con el mínimo privilegio, copias de seguridad y registro de la actividad técnica.",
                                "Ayudar al Cliente a atender las solicitudes de ejercicio de derechos y a cumplir los artículos 32 a 36 RGPD (seguridad, notificación de brechas, evaluaciones de impacto y consultas previas), teniendo en cuenta la información de que dispone.",
                                "Notificar al Cliente las violaciones de seguridad que afecten a sus datos sin dilación indebida y, en todo caso, en un plazo máximo de 48 horas desde que tenga conocimiento, con la información disponible para que el Cliente pueda notificarla a la autoridad en 72 horas.",
                                "Poner a disposición del Cliente la información necesaria para demostrar el cumplimiento y permitir auditorías, con un preaviso razonable y sin acceso a los datos de otros clientes.",
                                "Llevar el registro de actividades de tratamiento que realiza como encargado.",
                            ],
                        },
                    ],
                },
                {
                    heading: "Subencargados",
                    blocks: [
                        "El Cliente autoriza de forma general a PafPaf a recurrir a los subencargados que figuran en [Subencargados](doc:subencargados). PafPaf avisará con al menos 30 días de antelación de cualquier cambio en la lista; el Cliente puede oponerse por motivos razonables y, si no se llega a un acuerdo, cancelar sin penalización.",
                        "PafPaf impone a cada subencargado por contrato las mismas obligaciones de protección de datos y responde ante el Cliente de su cumplimiento.",
                    ],
                },
                {
                    heading: "Transferencias internacionales",
                    blocks: [
                        "Los datos se alojan en servidores de la Unión Europea. Cuando un subencargado pertenezca a un grupo con sede fuera del Espacio Económico Europeo, la transferencia se ampara en una decisión de adecuación, como el Marco de Privacidad de Datos UE-EE. UU., o en las cláusulas contractuales tipo de la Comisión Europea.",
                    ],
                },
                {
                    heading: "Solicitudes de autoridades",
                    blocks: [
                        "Si una autoridad solicita acceso a los datos del Cliente, PafPaf comprobará que la solicitud tiene base legal y, en su caso, orden judicial, entregará solo lo estrictamente requerido y avisará al Cliente, salvo que la ley se lo prohíba.",
                    ],
                },
                {
                    heading: "Obligaciones del Cliente",
                    blocks: [
                        "Tener una base jurídica para cada tratamiento, informar a las personas afectadas, introducir solo los datos necesarios, configurar los accesos de sus empleados y realizar la evaluación de impacto cuando sea obligatoria.",
                    ],
                },
                {
                    heading: "Fin del encargo",
                    blocks: [
                        "Al terminar el servicio, PafPaf pondrá los datos a disposición del Cliente para su exportación durante 30 días y después los suprimirá, incluidas las copias, salvo que la ley obligue a conservarlos. Las copias de seguridad se eliminan al agotarse su ciclo de rotación.",
                    ],
                },
            ],
        },

        subencargados: {
            title: "Subencargados del tratamiento",
            description:
                "Proveedores que tratan datos personales por cuenta de PafPaf y de sus clientes, con su ubicación.",
            sections: [
                {
                    heading: "Lista vigente",
                    blocks: [
                        {
                            table: {
                                head: [
                                    "Proveedor",
                                    "Servicio",
                                    "Ubicación de los datos",
                                    "Garantía",
                                ],
                                rows: [
                                    [
                                        "Hetzner Online GmbH",
                                        "Servidores y base de datos",
                                        "Alemania",
                                        "Dentro de la UE",
                                    ],
                                    [
                                        "Amazon Web Services EMEA SARL",
                                        "Almacenamiento de archivos (documentos y firmas)",
                                        "Suecia (región eu-north-1)",
                                        "Datos en la UE; grupo con sede en EE. UU.: DPF y cláusulas tipo",
                                    ],
                                    [
                                        "Cloudflare, Inc.",
                                        "Red de entrega, cifrado y protección frente a ataques",
                                        "Red global",
                                        "DPF y cláusulas tipo",
                                    ],
                                    [
                                        "Proveedor de correo electrónico (en selección)",
                                        "Envío de emails transaccionales",
                                        "Unión Europea",
                                        "Dentro de la UE",
                                    ],
                                    [
                                        "Stripe Payments Europe, Ltd.",
                                        "Cobro de la suscripción (solo datos de facturación del Cliente)",
                                        "Irlanda; grupo con sede en EE. UU.",
                                        "DPF y cláusulas tipo",
                                    ],
                                ],
                            },
                        },
                    ],
                },
                {
                    heading: "Cambios",
                    blocks: [
                        "Avisamos a los clientes por email con al menos 30 días de antelación antes de añadir o sustituir un subencargado, según el [Contrato de encargo](doc:encargo).",
                    ],
                },
            ],
        },
    },
};
