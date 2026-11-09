import type { SiteLocale } from "./locale-negotiation";

/**
 * Legal pages of the public site (privacy policy, terms, support). The structure follows the usual international baseline:
 * GDPR art. 13 (who, what, why and legal basis, recipients, transfers, retention, rights, complaints), CCPA/CPRA notice at collection,
 * COPPA (no children under 13) and Apple App Store guideline 5.1.1 (a reachable policy, data collected, deletion). It is a working text:
 * the owner must have counsel confirm it for the operating entity before public launch.
 */
export type LegalKind = "privacy" | "terms" | "support";

export interface LegalSection {
  readonly id: string;
  readonly title: string;
  readonly paragraphs: readonly string[];
  readonly items?: readonly string[];
}

export interface LegalDoc {
  readonly title: string;
  readonly description: string;
  readonly intro: string;
  readonly sections: readonly LegalSection[];
}

/** Date of the current text; shown spelled out in each language so it never reads as a code. */
const UPDATED = { "es-BO": "9 de noviembre de 2026", "en-US": "November 9, 2026" } as const;
export const LEGAL_PATH: Readonly<Record<LegalKind, string>> = { privacy: "/privacidad", terms: "/terminos", support: "/soporte" };

export interface LegalContext {
  /** Public contact mailbox (env `CONTACT_EMAIL`); null until the owner sets it. */
  readonly email: string | null;
  /** Name of the operating entity (env `LEGAL_ENTITY`). */
  readonly entity: string;
}

/** Reads the operator's details from the environment at request time (never hard-coded in the repo). */
export function legalContext(env: Readonly<Record<string, string | undefined>> = process.env): LegalContext {
  const email = env["CONTACT_EMAIL"]?.trim();
  return { email: email ? email : null, entity: env["LEGAL_ENTITY"]?.trim() || "DOne" };
}

const reach = (locale: SiteLocale, context: LegalContext): string =>
  context.email ? (locale === "es-BO" ? `Escríbenos a ${context.email}.` : `Write to us at ${context.email}.`) : locale === "es-BO" ? "Escríbenos desde la sección de ayuda de la app." : "Write to us from the help section of the app.";

function privacyEs(c: LegalContext): LegalDoc {
  return {
    title: "Política de privacidad",
    description: "Qué datos recoge DOne, para qué los usa, con quién los comparte y cómo ejercer tus derechos.",
    intro: `Esta política explica cómo ${c.entity} («DOne», «nosotros») trata los datos personales cuando usas la app y el sitio de DOne. Última actualización: ${UPDATED["es-BO"]}.`,
    sections: [
      { id: "responsable", title: "1. Quién es el responsable", paragraphs: [`El responsable del tratamiento es ${c.entity}. ${reach("es-BO", c)}`] },
      { id: "datos", title: "2. Qué datos recogemos", paragraphs: ["Recogemos solo lo necesario para organizar una celebración:"], items: [
        "Anfitrión: nombre, correo, teléfono y los datos de acceso a tu cuenta.",
        "Tu celebración: nombre, fecha, lugar, textos, fotos de la galería y la lista de regalos.",
        "Invitados: nombre, correo o teléfono que el anfitrión registra, su respuesta, acompañantes, restricciones de comida y el mensaje que dejen.",
        "Dispositivo: el identificador para enviarte notificaciones push, si las activas.",
        "Técnicos: dirección IP y registros del servidor para seguridad y diagnóstico.",
        "Directorio de proveedores: conteos de vistas y clics de un anuncio, sin identificarte."
      ] },
      { id: "uso", title: "3. Para qué los usamos y con qué base", paragraphs: ["Los usamos para prestar el servicio que pediste (contrato): crear y publicar la invitación, registrar respuestas y regalos, y enviar avisos. Usamos los datos técnicos por interés legítimo en la seguridad del servicio. Las notificaciones push requieren tu consentimiento y puedes retirarlo en los ajustes de tu dispositivo."] },
      { id: "no-venta", title: "4. No vendemos tus datos ni te rastreamos", paragraphs: ["No vendemos ni compartimos datos personales para publicidad. No usamos SDK de publicidad ni de seguimiento entre apps o sitios, por lo que la app no necesita pedir permiso de seguimiento. Solo usamos cookies estrictamente necesarias, como la de sesión."] },
      { id: "destinatarios", title: "5. Con quién los compartimos", paragraphs: ["Solo con proveedores que nos prestan infraestructura (alojamiento y envío de notificaciones) y que tratan los datos por nuestra cuenta, o cuando una ley o autoridad lo exige. Si usas un enlace a un proveedor externo, ese sitio tiene su propia política."] },
      { id: "transferencias", title: "6. Transferencias internacionales", paragraphs: ["Tus datos pueden alojarse en servidores fuera de tu país. En ese caso aplicamos garantías contractuales y medidas de seguridad equivalentes."] },
      { id: "conservacion", title: "7. Cuánto tiempo los conservamos", paragraphs: ["Mientras tu cuenta exista. Si pides eliminarla, borramos o anonimizamos tus datos en un plazo de 30 días, salvo los que debamos guardar por ley."] },
      { id: "derechos", title: "8. Tus derechos", paragraphs: ["Según la ley aplicable (por ejemplo GDPR en la Unión Europea, CCPA/CPRA en California y la protección de la privacidad reconocida en la Constitución de Bolivia) puedes:"], items: [
        "Acceder a tus datos y recibir una copia portable.",
        "Corregirlos o actualizarlos.",
        "Pedir su eliminación.",
        "Oponerte o limitar su tratamiento y retirar tu consentimiento.",
        "Presentar una queja ante la autoridad de protección de datos de tu país."
      ] },
      { id: "eliminar", title: "9. Cómo eliminar tu cuenta", paragraphs: [`Escribe a ${c.email ?? "nuestro correo de contacto"} desde el correo de tu cuenta y pide la eliminación; respondemos en un plazo razonable y como máximo en 30 días. Los invitados pueden pedir lo mismo al anfitrión o a nosotros.`] },
      { id: "seguridad", title: "10. Seguridad", paragraphs: ["Usamos conexiones cifradas (HTTPS), acceso por roles y enlaces personales revocables para los invitados. Ningún sistema es infalible; si ocurre una brecha que te afecte, te lo informaremos como exige la ley."] },
      { id: "menores", title: "11. Menores de edad", paragraphs: ["DOne no está dirigido a menores de 13 años (16 donde la ley lo exija) y no recogemos sus datos a sabiendas. Si crees que lo hicimos, avísanos y los eliminaremos."] },
      { id: "cambios", title: "12. Cambios", paragraphs: ["Si cambiamos esta política publicaremos la nueva versión aquí con su fecha y, si el cambio es importante, te avisaremos."] },
      { id: "contacto", title: "13. Contacto", paragraphs: [reach("es-BO", c)] }
    ]
  };
}

function privacyEn(c: LegalContext): LegalDoc {
  return {
    title: "Privacy policy",
    description: "What data DOne collects, why, who receives it and how to exercise your rights.",
    intro: `This policy explains how ${c.entity} ("DOne", "we") handles personal data when you use the DOne app and website. Last updated: ${UPDATED["en-US"]}.`,
    sections: [
      { id: "controller", title: "1. Who is responsible", paragraphs: [`The data controller is ${c.entity}. ${reach("en-US", c)}`] },
      { id: "data", title: "2. What we collect", paragraphs: ["We collect only what is needed to organise a celebration:"], items: [
        "Host: name, email, phone number and your account sign-in details.",
        "Your celebration: name, date, venue, texts, gallery photos and the gift list.",
        "Guests: the name and email or phone the host enters, their reply, companions, dietary needs and any message they leave.",
        "Device: the identifier used to send push notifications, if you turn them on.",
        "Technical: IP address and server logs for security and diagnostics.",
        "Vendor directory: counts of views and clicks on a listing, without identifying you."
      ] },
      { id: "use", title: "3. Why we use it and on what basis", paragraphs: ["We use it to provide the service you asked for (contract): create and publish the invitation, record replies and gifts, and send notices. We use technical data under our legitimate interest in keeping the service secure. Push notifications need your consent, which you can withdraw in your device settings."] },
      { id: "no-sale", title: "4. We do not sell your data or track you", paragraphs: ["We do not sell or share personal data for advertising. We use no advertising or cross-app and cross-site tracking SDKs, so the app does not need to ask for tracking permission. We only use strictly necessary cookies, such as the session cookie."] },
      { id: "recipients", title: "5. Who receives it", paragraphs: ["Only infrastructure providers (hosting and notification delivery) that process data on our behalf, or where a law or authority requires it. If you follow a link to a third-party vendor, that site has its own policy."] },
      { id: "transfers", title: "6. International transfers", paragraphs: ["Your data may be hosted on servers outside your country. When so, we apply contractual safeguards and equivalent security measures."] },
      { id: "retention", title: "7. How long we keep it", paragraphs: ["For as long as your account exists. If you ask us to delete it, we delete or anonymise your data within 30 days, except what we must keep by law."] },
      { id: "rights", title: "8. Your rights", paragraphs: ["Under the applicable law (for example GDPR in the European Union, CCPA/CPRA in California, and the privacy protection recognised by the Constitution of Bolivia) you may:"], items: [
        "Access your data and receive a portable copy.",
        "Correct or update it.",
        "Ask for it to be deleted.",
        "Object to or restrict its processing and withdraw consent.",
        "Lodge a complaint with the data protection authority in your country."
      ] },
      { id: "delete", title: "9. How to delete your account", paragraphs: [`Write to ${c.email ?? "our contact address"} from your account email and ask for deletion; we reply within a reasonable time and at most within 30 days. Guests can ask the host or us for the same.`] },
      { id: "security", title: "10. Security", paragraphs: ["We use encrypted connections (HTTPS), role-based access and revocable personal links for guests. No system is perfect; if a breach affects you we will tell you as the law requires."] },
      { id: "children", title: "11. Children", paragraphs: ["DOne is not directed to children under 13 (16 where the law requires) and we do not knowingly collect their data. If you think we did, tell us and we will delete it."] },
      { id: "changes", title: "12. Changes", paragraphs: ["If we change this policy we will publish the new version here with its date and, for important changes, let you know."] },
      { id: "contact", title: "13. Contact", paragraphs: [reach("en-US", c)] }
    ]
  };
}

function termsEs(c: LegalContext): LegalDoc {
  return {
    title: "Términos de uso",
    description: "Las reglas para usar DOne: tu cuenta, tu contenido, los invitados y los límites del servicio.",
    intro: `Al usar DOne aceptas estos términos con ${c.entity}. Última actualización: ${UPDATED["es-BO"]}.`,
    sections: [
      { id: "servicio", title: "1. El servicio", paragraphs: ["DOne te permite crear la invitación de una celebración, compartirla, recibir respuestas y gestionar regalos. Podemos mejorar, cambiar o interrumpir funciones; si una interrupción es larga te avisaremos."] },
      { id: "cuenta", title: "2. Tu cuenta", paragraphs: ["Debes dar datos verdaderos, ser mayor de edad en tu país y cuidar tu contraseña. Eres responsable de lo que ocurra con tu cuenta."] },
      { id: "contenido", title: "3. Tu contenido y tus invitados", paragraphs: ["Eres responsable del contenido que publicas y de tener el derecho de usar las fotos y textos. Al registrar a un invitado declaras que puedes compartir sus datos para invitarlo. Nos das el permiso necesario para alojar y mostrar tu contenido solo para prestar el servicio."] },
      { id: "uso", title: "4. Uso permitido", paragraphs: ["No uses DOne para spam, acoso, contenido ilegal o que vulnere derechos de terceros, ni para intentar acceder a datos ajenos o dañar el servicio."] },
      { id: "terceros", title: "5. Proveedores y enlaces", paragraphs: ["El directorio puede enlazar a proveedores independientes. No somos parte de lo que contrates con ellos ni responsables de su servicio."] },
      { id: "garantia", title: "6. Sin garantías absolutas", paragraphs: ["El servicio se ofrece «tal cual». Hacemos lo razonable por mantenerlo disponible y seguro, pero no garantizamos que no tenga interrupciones o errores."] },
      { id: "responsabilidad", title: "7. Límite de responsabilidad", paragraphs: ["En la medida que la ley lo permite, no respondemos por daños indirectos ni por pérdidas derivadas de un evento, y nuestra responsabilidad total se limita a lo que hayas pagado por el servicio en los 12 meses anteriores."] },
      { id: "terminacion", title: "8. Terminación", paragraphs: ["Puedes dejar de usar DOne y pedir la eliminación de tu cuenta cuando quieras. Podemos suspender cuentas que incumplan estos términos."] },
      { id: "ley", title: "9. Ley aplicable", paragraphs: ["Estos términos se rigen por las leyes del Estado Plurinacional de Bolivia, sin perjuicio de los derechos que la ley de tu país te reconozca como consumidor."] },
      { id: "cambios", title: "10. Cambios", paragraphs: ["Podemos actualizar estos términos; publicaremos la versión nueva con su fecha. Si sigues usando DOne después, la aceptas."] },
      { id: "contacto", title: "11. Contacto", paragraphs: [reach("es-BO", c)] }
    ]
  };
}

function termsEn(c: LegalContext): LegalDoc {
  return {
    title: "Terms of use",
    description: "The rules for using DOne: your account, your content, your guests and the limits of the service.",
    intro: `By using DOne you accept these terms with ${c.entity}. Last updated: ${UPDATED["en-US"]}.`,
    sections: [
      { id: "service", title: "1. The service", paragraphs: ["DOne lets you create a celebration invitation, share it, receive replies and manage gifts. We may improve, change or discontinue features; if an interruption is long we will tell you."] },
      { id: "account", title: "2. Your account", paragraphs: ["You must give true information, be of legal age in your country and look after your password. You are responsible for what happens under your account."] },
      { id: "content", title: "3. Your content and your guests", paragraphs: ["You are responsible for what you publish and for having the right to use the photos and texts. By adding a guest you state you may share their details in order to invite them. You give us the permission needed to host and display your content only to provide the service."] },
      { id: "use", title: "4. Acceptable use", paragraphs: ["Do not use DOne for spam, harassment, unlawful content or content that infringes others' rights, or to try to access other people's data or harm the service."] },
      { id: "third-parties", title: "5. Vendors and links", paragraphs: ["The directory may link to independent vendors. We are not a party to what you hire from them nor responsible for their service."] },
      { id: "warranty", title: "6. No absolute guarantees", paragraphs: ["The service is provided \"as is\". We take reasonable steps to keep it available and secure, but we do not guarantee it will be free of interruptions or errors."] },
      { id: "liability", title: "7. Limit of liability", paragraphs: ["To the extent the law allows, we are not liable for indirect damages or for losses arising from an event, and our total liability is limited to what you paid for the service in the previous 12 months."] },
      { id: "termination", title: "8. Termination", paragraphs: ["You may stop using DOne and ask for your account to be deleted at any time. We may suspend accounts that breach these terms."] },
      { id: "law", title: "9. Governing law", paragraphs: ["These terms are governed by the laws of the Plurinational State of Bolivia, without prejudice to the consumer rights your own country's law gives you."] },
      { id: "changes", title: "10. Changes", paragraphs: ["We may update these terms; we will publish the new version with its date. If you keep using DOne afterwards, you accept it."] },
      { id: "contact", title: "11. Contact", paragraphs: [reach("en-US", c)] }
    ]
  };
}

function supportEs(c: LegalContext): LegalDoc {
  return {
    title: "Ayuda",
    description: "Cómo contactar a DOne, resolver los problemas más comunes y pedir la eliminación de tu cuenta.",
    intro: "Si algo no sale como esperabas, aquí está cómo resolverlo.",
    sections: [
      { id: "contacto", title: "Escríbenos", paragraphs: [`${reach("es-BO", c)} Cuéntanos qué intentabas hacer y qué pasó; con el nombre de tu celebración es suficiente para empezar.`] },
      { id: "invitado", title: "Soy invitado y no puedo responder", paragraphs: ["Abre el enlace personal que te envió el anfitrión. Si dice que no es válido, pídele que te genere uno nuevo: los enlaces anteriores dejan de funcionar al reemplazarlos."] },
      { id: "anfitrion", title: "Soy anfitrión y mis invitados no ven la invitación", paragraphs: ["Revisa que la celebración esté publicada en la pestaña Publicar y comparte el enlace que aparece ahí."] },
      { id: "cuenta", title: "Olvidé mi contraseña", paragraphs: ["En la pantalla de ingreso elige «Recuperar» y sigue los pasos con el correo de tu cuenta."] },
      { id: "eliminar", title: "Quiero eliminar mi cuenta y mis datos", paragraphs: [`Escribe a ${c.email ?? "nuestro correo de contacto"} desde el correo de tu cuenta. Eliminamos o anonimizamos tus datos en un máximo de 30 días. Más detalles en la política de privacidad.`] }
    ]
  };
}

function supportEn(c: LegalContext): LegalDoc {
  return {
    title: "Support",
    description: "How to contact DOne, fix the most common problems and ask for your account to be deleted.",
    intro: "If something did not go as you expected, here is how to fix it.",
    sections: [
      { id: "contact", title: "Write to us", paragraphs: [`${reach("en-US", c)} Tell us what you were trying to do and what happened; your celebration's name is enough to start.`] },
      { id: "guest", title: "I am a guest and cannot reply", paragraphs: ["Open the personal link the host sent you. If it says the link is not valid, ask them to generate a new one: earlier links stop working once replaced."] },
      { id: "host", title: "I am a host and my guests do not see the invitation", paragraphs: ["Check that the celebration is published in the Publish tab and share the link shown there."] },
      { id: "password", title: "I forgot my password", paragraphs: ["On the sign-in screen choose \"Recover\" and follow the steps with your account email."] },
      { id: "delete", title: "I want to delete my account and data", paragraphs: [`Write to ${c.email ?? "our contact address"} from your account email. We delete or anonymise your data within 30 days at most. More detail in the privacy policy.`] }
    ]
  };
}

const BUILDERS: Readonly<Record<LegalKind, Readonly<Record<SiteLocale, (context: LegalContext) => LegalDoc>>>> = {
  privacy: { "es-BO": privacyEs, "en-US": privacyEn },
  terms: { "es-BO": termsEs, "en-US": termsEn },
  support: { "es-BO": supportEs, "en-US": supportEn }
};

export function legalDoc(kind: LegalKind, locale: SiteLocale, context: LegalContext = legalContext()): LegalDoc {
  return BUILDERS[kind][locale](context);
}
