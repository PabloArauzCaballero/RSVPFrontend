/**
 * B6 · Textos legales de DOne. BORRADOR pendiente de revisión por un abogado de Bolivia (P6): no se publica como definitivo hasta esa
 * revisión. Los datos entre corchetes los completa el responsable. Los plazos siguen la decisión D-5 y se pueden configurar.
 * Cuerpos: párrafos separados por una línea en blanco; las líneas que empiezan con "- " son elementos de una lista.
 */
export const legalEsBO = {
  version: "2026-11-21-borrador",
  draftBanner: "Borrador pendiente de revisión legal. Este texto todavía no es definitivo y puede cambiar.",
  updated: "Versión {{version}}",
  contents: "En esta página",
  links: { privacy: "Política de privacidad", terms: "Términos de uso" },
  privacy: {
    title: "Política de privacidad",
    description: "Qué datos trata DOne, para qué, durante cuánto tiempo y cómo ejercer tus derechos.",
    lead: "DOne te ayuda a crear invitaciones y a saber quién viene. Para eso trata datos tuyos y de tus invitados. Aquí explicamos cuáles, para qué y qué puedes hacer con ellos.",
    sections: {
      controller: { heading: "Quién es responsable", body: "El responsable del tratamiento es [Razón social del responsable], con domicilio en [Domicilio], Bolivia, que opera DOne.\n\nPara cualquier consulta sobre tus datos escríbenos a [correo de privacidad]." },
      data: { heading: "Qué datos tratamos", body: "De quien crea una cuenta:\n- Nombre, correo, contraseña (guardada solo como huella cifrada) y el rol que eliges.\n- Las celebraciones que creas: fecha, lugar, textos, fotos y ajustes.\n\nDe los invitados, cargados por el anfitrión o por el propio invitado al responder:\n- Nombre y contacto (correo o teléfono).\n- Respuesta de asistencia y número de acompañantes.\n- Notas de alimentación o de salud que el invitado decida escribir, y el mensaje para el anfitrión.\n\nDatos técnicos: dirección IP y registros de seguridad necesarios para proteger el servicio. No vendemos datos ni los usamos para publicidad." },
      purposes: { heading: "Para qué los usamos", body: "- Crear y publicar tu invitación y gestionar tu cuenta.\n- Que tus invitados respondan y que tú veas la lista al día.\n- Enviar los avisos que el servicio necesita (por ejemplo, recuperar tu contraseña o el aviso de una nueva respuesta).\n- Mantener la seguridad, prevenir abusos y cumplir obligaciones legales." },
      basis: { heading: "Con qué base", body: "Tratamos los datos de tu cuenta porque los necesitamos para prestarte el servicio que pides y con tu consentimiento, que das al aceptar estos textos al registrarte.\n\nLos datos de los invitados los trata DOne por encargo del anfitrión: el anfitrión decide a quién invita y es quien debe contar con el permiso de esas personas. Cuando un invitado responde por sí mismo, nos da su consentimiento en el formulario, y registramos de dónde vino ese consentimiento." },
      sharing: { heading: "Con quién los compartimos", body: "- Con el anfitrión de la celebración y con quienes él autorice a gestionarla: ven los invitados y sus respuestas.\n- Con proveedores que nos prestan infraestructura (servidores, correo, almacenamiento), solo para prestar el servicio y bajo confidencialidad.\n- Con autoridades, cuando una norma lo exija.\n\nSi pides una cotización a un proveedor del directorio, le enviamos los datos que tú escribes en esa solicitud." },
      maps: { heading: "Mapas y búsqueda de lugares", body: "Los mapas y la búsqueda de lugares son de OpenStreetMap (© colaboradores de OpenStreetMap, datos con licencia ODbL).\n\n- Al tocar «Ver mapa» tu navegador o tu app se conecta a los servidores de mapas de OpenStreetMap, que reciben tu dirección IP y los datos técnicos de tu visita según su propia política de privacidad. No ocurre al abrir la página, solo cuando pides el mapa.\n- Cuando el anfitrión busca un lugar o una dirección, el texto que escribe pasa por nuestro servidor, que lo envía al buscador Nominatim de OpenStreetMap sin su nombre ni su cuenta. Guardamos la respuesta un tiempo, identificada solo por una huella del texto y nunca por la persona, para no repetir la consulta. No escribas datos personales en esa búsqueda.\n- El punto exacto que marca el anfitrión lo ve quien tenga el enlace de la invitación.\n- «Cómo llegar» abre openstreetmap.org en otra pestaña, con el punto o con la búsqueda de la dirección escrita." },
      retention: { heading: "Cuánto tiempo los guardamos", body: "- Tu cuenta y tus celebraciones, mientras la cuenta exista. Si la borras, borramos en cascada tus celebraciones, sus invitados, fotos e historial en todos nuestros servicios.\n- Las celebraciones terminadas se borran 12 meses después de la fecha del evento.\n- Las copias de seguridad se conservan como máximo 90 días; después se eliminan.\n- Los registros de seguridad se guardan el tiempo mínimo necesario.\n\nEstos plazos son los que aplicamos hoy; pueden ajustarse tras la revisión legal, y lo indicaremos aquí." },
      rights: { heading: "Tus derechos", body: "Puedes pedir acceder a tus datos, corregirlos, borrarlos o retirar tu consentimiento. Desde tu cuenta puedes borrarla por completo. Un invitado puede pedir el borrado de su respuesta desde su enlace personal o escribiéndonos.\n\nPara ejercer cualquier derecho escribe a [correo de privacidad]. Te responderemos en un plazo razonable." },
      security: { heading: "Cómo los protegemos", body: "Ciframos las conexiones y, en reposo, los contactos, nombres y notas de los invitados. El acceso está limitado a quien lo necesita y no registramos datos personales en los registros técnicos." },
      changes: { heading: "Cambios", body: "Si cambiamos esta política publicaremos la nueva versión aquí con su fecha y, si el cambio es importante, te avisaremos antes de que se aplique." }
    }
  },
  terms: {
    title: "Términos de uso",
    description: "Las reglas para usar DOne: tu cuenta, tus celebraciones y los datos de tus invitados.",
    lead: "Al crear una cuenta aceptas estos términos. Léelos con calma: son cortos.",
    sections: {
      service: { heading: "El servicio", body: "DOne permite crear invitaciones en línea, recibir confirmaciones de asistencia, compartir una lista de regalos y contactar proveedores. El servicio lo presta [Razón social del responsable]." },
      account: { heading: "Tu cuenta", body: "- Usa datos reales y una contraseña que solo tú conozcas.\n- Eres responsable de lo que se haga con tu cuenta.\n- Puedes borrarla cuando quieras desde la aplicación." },
      guests: { heading: "Los datos de tus invitados", body: "Cuando cargas invitados, eres tú quien decide a quién invitas. Te comprometes a contar con el permiso de esas personas para usar su nombre y su contacto, y a usar sus respuestas solo para organizar tu celebración." },
      content: { heading: "Tu contenido", body: "Lo que publicas (textos, fotos) sigue siendo tuyo. Nos das permiso para mostrarlo a quienes tú invitas y para guardarlo mientras dure tu cuenta. No publiques contenido de terceros sin permiso ni contenido ilegal u ofensivo." },
      acceptableUse: { heading: "Uso aceptable", body: "No uses DOne para enviar mensajes no solicitados, suplantar a otras personas, intentar acceder a cuentas ajenas ni afectar el funcionamiento del servicio. Podemos suspender una cuenta que lo haga." },
      providers: { heading: "Proveedores", body: "Los proveedores del directorio son independientes. DOne facilita el contacto, pero el acuerdo, el pago y el servicio son entre tú y el proveedor." },
      liability: { heading: "Responsabilidad", body: "Trabajamos para que DOne funcione siempre, pero puede haber interrupciones. Respondemos según la ley aplicable; no respondemos por acuerdos entre anfitriones, invitados y proveedores." },
      termination: { heading: "Fin del servicio", body: "Puedes dejar de usar DOne y borrar tu cuenta en cualquier momento. Si dejamos de prestar el servicio, te avisaremos con anticipación para que descargues lo que necesites." },
      changes: { heading: "Cambios y contacto", body: "Si cambiamos estos términos publicaremos la nueva versión con su fecha y te pediremos aceptarla otra vez cuando el cambio te afecte. Para cualquier consulta escribe a [correo de contacto]. Estos términos se rigen por la ley de Bolivia." }
    }
  },
  consent: {
    accept: "Acepto los Términos de uso y la Política de privacidad.",
    required: "Para crear tu cuenta necesitas aceptar los términos y la política de privacidad.",
    read: "Leer los términos y la política"
  }
} as const;
