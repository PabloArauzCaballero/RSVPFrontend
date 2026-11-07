// Contenido sintetico boliviano. Ninguna persona, telefono ni marca es real: correos @example.com y telefonos +591 7000xxxx de prueba.
export const PASSWORD = process.env.SEED_PASSWORD ?? "Demo-Bolivia-2026!";

// PRNG determinista (mulberry32): la misma semilla siempre produce las mismas familias.
export function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

const SURNAMES = ["Quispe", "Mamani", "Flores", "Choque", "Vargas", "Rojas", "Condori", "Gutiérrez", "Fernández", "Calle", "Apaza", "Villca", "Salazar", "Ticona", "Limachi", "Poma", "Aguilar", "Mendoza", "Cruz", "Torrez"];
const FEMALE = ["María", "Rosa", "Lucía", "Carmen", "Sandra", "Patricia", "Elena", "Julia", "Beatriz", "Daniela", "Fabiola", "Gabriela", "Mónica", "Silvia", "Teresa", "Valeria", "Ximena", "Yolanda", "Paola", "Karen"];
const MALE = ["Juan", "Luis", "Carlos", "José", "Marco", "Pedro", "Ramiro", "Freddy", "Hugo", "Iván", "Jorge", "Mauricio", "Néstor", "Óscar", "Rodrigo", "Sergio", "Wálter", "Álvaro", "Diego", "Gonzalo"];
const KIDS = ["Mateo", "Sofía", "Camila", "Santiago", "Valentina", "Thiago"];

export const DIETS = ["Sin gluten", "Vegetariana", "Alergia a los mariscos", "Sin lactosa", "Diabético: poco azúcar", "Sin ají, por favor", "Vegana", "Alergia al maní"];
export const MESSAGES = ["¡Qué alegría! Ahí estaremos.", "Con todo el cariño, los esperamos en familia nomás.", "Felicidades a los novios, que Dios los bendiga.", "Llegamos desde Cochabamba el viernes.", "Gracias por invitarnos, no nos lo perdemos.", "Nos hubiera encantado, pero ese día viajamos. Un abrazo grande."];

/** Familias de la boda: ~60 invitados repartidos en 14 grupos. Incluye nombres compuestos y uno muy largo para probar el diseño. */
export function weddingFamilies() {
  const r = rng(20261107);
  const pick = (list) => list[Math.floor(r() * list.length)];
  const sizes = [6, 5, 5, 4, 4, 4, 4, 4, 4, 4, 4, 3, 3, 3, 3]; // = 60
  const families = [];
  let phone = 1;
  sizes.forEach((size, index) => {
    const surname = SURNAMES[index % SURNAMES.length];
    const second = SURNAMES[(index * 7 + 3) % SURNAMES.length];
    const members = [];
    for (let i = 0; i < size; i += 1) {
      const female = i % 2 === 1;
      const name = i >= 2 && size >= 4 && i >= size - 2 && index % 2 === 0
        ? `${pick(KIDS)} ${surname} ${second}`
        : `${pick(female ? FEMALE : MALE)} ${surname} ${i === 0 ? second : pick(SURNAMES)}`;
      const n = phone; phone += 1;
      members.push({ name, contact: i === 0 ? { email: `${name.split(" ")[0]}.${surname}.${index}`.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "") + "@example.com" } : { phone: `+5917000${String(1000 + n).padStart(4, "0")}` }, allowedCompanions: i === 0 ? 1 : i % 3 === 0 ? 2 : 0 });
    }
    families.push({ group: `Familia ${surname} ${second}`, members });
  });
  families[0].members[0].name = "María de los Ángeles Condori Quispe de Mamani"; // nombre compuesto largo
  families[1].members[0].name = "José Luis Fernández-Gutiérrez de la Vega y Rojas"; // doble apellido con guion
  families[2].members[0].name = "Wálter Ticona"; // corto
  families[13].group = "Compañeros de la Facultad de Ingeniería, promoción 2012 (grupo grande de la UMSA)"; // nombre de grupo muy largo
  return families;
}

export const WEDDING = {
  title: "Lucía Flores y Daniel Choque",
  subtitle: "Nos casamos y queremos celebrarlo contigo",
  venueName: "Salón Los Cedros, Calacoto",
  hosts: { BRIDE: "Lucía Flores Mamani", GROOM: "Daniel Choque Vargas" },
  dressCode: "Formal. Los colores verde, durazno y crema serán de la decoración; mejor evitar el blanco.",
  story: "Nos conocimos en 2016 en una feria de libros en La Paz, discutiendo por el último ejemplar de un libro de Jaime Saenz. Daniel lo dejó ir y Lucía le invitó un café de Yungas para agradecerle. Ocho años y un viaje a Sucre después, Daniel preguntó en el mirador de Killi Killi, con el Illimani de fondo. Queremos compartir este día con la gente que nos cuidó, nos aguantó y nos hizo reír.\n\nLa fiesta es en familia: habrá comida, música para bailar cueca y cumbia, y mucho cariño.",
  venues: [
    { key: "ceremonia", kind: "ceremony", name: "Parroquia San Miguel", address: "Av. Ballivián 1250, Calacoto, La Paz" },
    { key: "recepcion", kind: "reception", name: "Salón Los Cedros", address: "Calle 21 esq. Av. Costanera, Calacoto, La Paz" }
  ],
  faq: [
    { question: "¿Puedo llevar niños?", answer: "Claro que sí. Habrá una mesa infantil y una persona que los cuide hasta las 22:00." },
    { question: "¿Hay estacionamiento?", answer: "El salón tiene lugar para 40 autos. Si vienes de El Alto, te recomendamos compartir movilidad." },
    { question: "¿Qué hago si tengo una dieta especial?", answer: "Cuéntanos en tu respuesta y avisamos a la cocina. Tenemos menú vegetariano y sin gluten." },
    { question: "¿Dónde queda el hotel más cercano?", answer: "A 5 minutos, en Calacoto. Abajo dejamos recomendaciones con precio para invitados." }
  ],
  recommendations: [
    { kind: "lodging", name: "Hotel Calacoto Suites", description: "A cinco minutos del salón. Pregunta por la tarifa 'Boda Flores-Choque'." },
    { kind: "transport", name: "Radiotaxi de la zona sur", description: "Servicio nocturno confiable. Pídelo con una hora de anticipación." },
    { kind: "other", name: "Café para el desayuno del sábado", description: "Salteñas y api morado en la Av. Ballivián. Abre desde las 7:00." }
  ]
};

export const PROVIDERS = [
  { key: "salon", name: "Salón Illimani Eventos", plan: "PREMIUM", city: "la-paz", category: "VENUE", state: "VERIFIED",
    about: "Salón de eventos en la zona sur de La Paz con capacidad para 250 personas, jardín y estacionamiento propio.",
    address: { line: "Calle 17 de Calacoto 8231", city: "la-paz", reference: "Frente a la plazuela, portón verde", latitude: -16.5385, longitude: -68.0814 },
    listings: [["SERVICE", "Alquiler de salón principal (hasta 250 personas)", 1800000, "Incluye mesas, sillas, mantelería básica y personal de limpieza."], ["SERVICE", "Salón y jardín, paquete de boda completo con cena para 120", 4500000, "Incluye menú de tres tiempos, brindis y decoración base."], ["SERVICE", "Salón pequeño para civil o reunión familiar (60 personas)", 650000, "Ideal para ceremonias íntimas."]] },
  { key: "catering", name: "Sabores del Valle Catering", plan: "FEATURED", city: "cochabamba", category: "CATERING", state: "VERIFIED",
    about: "Cocina boliviana de autor: pique macho, lechón al horno, platos vegetarianos y barra de postres. Servimos en Cochabamba y La Paz.",
    address: { line: "Av. Heroínas 345", city: "cochabamba", reference: "Segundo piso", latitude: -17.3935, longitude: -66.157 },
    listings: [["SERVICE", "Catering de boda para 100 invitados", 900000, "Menú de tres tiempos con mozos y vajilla incluidos."], ["SERVICE", "Barra de coctelería y singani", 280000, "Dos bartenders y hielo para 100 personas."], ["PRODUCT", "Cajas de salteñas para el recibimiento (por 50)", 45000, "Salteñas de carne, pollo y verduras."]] },
  { key: "foto", name: "Luz Andina Fotografía", plan: "FREE", city: "sucre", category: "PHOTOGRAPHY", state: "VERIFIED",
    about: "Fotografía y video de bodas con luz natural. Entregamos galería privada en 15 días.",
    address: { line: "Calle Bolívar 112", city: "sucre", reference: "Zona central", latitude: -19.0333, longitude: -65.2627 },
    listings: [["SERVICE", "Cobertura fotográfica de boda (8 horas)", 750000, "Dos fotógrafos, 400 fotos editadas y álbum digital."], ["SERVICE", "Sesión de pareja pre-boda en Sucre o La Paz", 180000, "Dos horas de sesión y 40 fotos editadas."]] },
  { key: "pasteleria", name: "Dulce Tarija Pastelería", plan: "FREE", city: "tarija", category: "PASTRY", state: "VERIFIED",
    about: "Tortas de boda, mesas de dulces y bocaditos tarijeños hechos a mano.",
    address: { line: "Calle Ingavi 640", city: "tarija", reference: "Esquina con plaza Luis de Fuentes", latitude: -21.5355, longitude: -64.7296 },
    listings: [["PRODUCT", "Torta de bodas de tres pisos (80 porciones)", 120000, "Bizcocho de vainilla con relleno de dulce de leche."], ["PRODUCT", "Mesa de dulces para 100 personas", 85000, "Alfajores, brigadeiros, trufas y mini tartas."], ["PRODUCT", "Caja de 24 alfajores de maicena", 14000, "Con envoltura personalizada."]] },
  { key: "musica", name: "Sonido Altiplano DJ", plan: "FREE", city: "el-alto", category: "MUSIC", state: "VERIFIED",
    about: "DJ, sonido e iluminación para fiestas. Cueca, cumbia, saya, morenada y lo que pidan los novios.",
    address: { line: "Av. 6 de Marzo 2340", city: "el-alto", reference: "Zona 16 de Julio", latitude: -16.5, longitude: -68.1833 },
    listings: [["SERVICE", "DJ y sonido para 6 horas", 220000, "Incluye micrófonos inalámbricos y luces."], ["SERVICE", "Conjunto de morenada y caporales (show de 20 minutos)", 350000, "Bailarines con vestuario completo."]] },
  { key: "decoracion", name: "Cantuta Decoraciones", plan: "FREE", city: "santa-cruz", category: "DECORATION", state: "IN_REVIEW",
    about: "Ambientación floral y arcos de cantuta para ceremonias.",
    address: { line: "Av. San Martín 1204", city: "santa-cruz", reference: "Equipetrol", latitude: -17.7833, longitude: -63.1822 },
    listings: [["SERVICE", "Decoración floral de salón (hasta 100 personas)", 480000, "Centros de mesa, arco y camino de pétalos."]] },
  { key: "maquillaje", name: "Wara Maquillaje", plan: "FREE", city: "oruro", category: "MAKEUP", state: "DRAFT",
    about: "",
    address: null,
    listings: [["SERVICE", "Maquillaje y peinado de novia con prueba previa", 90000, "Incluye una prueba una semana antes."]] },
  { key: "transporte", name: "Potosí Turismo y Transporte", plan: "FREE", city: "potosi", category: "TRANSPORT", state: "REJECTED",
    about: "Buses y minivans para trasladar invitados.",
    address: { line: "Calle Bolívar 55", city: "potosi", reference: "", latitude: -19.5836, longitude: -65.7531 },
    reason: "Falta el registro de transporte público vigente. Vuelve a enviar la solicitud con el documento.",
    listings: [["SERVICE", "Minivan para 15 pasajeros (La Paz a Copacabana, ida y vuelta)", 160000, "Con chofer y combustible."]] },
  { key: "invitaciones", name: "Papel de Seda Invitaciones", plan: "FREE", city: "la-paz", category: "INVITATIONS", state: "SUSPENDED",
    about: "Invitaciones impresas y tarjetas de agradecimiento.",
    address: { line: "Calle Illampu 780", city: "la-paz", reference: "Segundo piso", latitude: -16.4955, longitude: -68.1411 },
    reason: "Reclamos de entregas fuera de plazo; revisión pendiente.",
    listings: [["PRODUCT", "Invitaciones impresas (100 unidades)", 60000, "Papel reciclado, sobre incluido."]] },
  { key: "planner", name: "Ch'aska Planificación de Bodas", plan: "PREMIUM", city: "santa-cruz", category: "WEDDING_PLANNER", state: "VERIFIED",
    about: "Coordinamos tu boda de principio a fin: proveedores, cronograma y el día del evento.",
    address: { line: "Calle Libertad 90", city: "santa-cruz", reference: "Piso 3, oficina 4", latitude: -17.7863, longitude: -63.1812 },
    listings: [["SERVICE", "Coordinación del día de la boda", 600000, "Una coordinadora y una asistente durante todo el evento."], ["SERVICE", "Planificación completa de boda (6 meses)", 3500000, "Presupuesto, proveedores, cronograma e invitados."], ["SERVICE", "Asesoría de una hora", 25000, "Reunión virtual para resolver dudas."]] }
];

export const GIFTS_EXTERNAL = [
  ["Licuadora de vaso de vidrio", 32000, "https://tienda.example/licuadora", "approved"],
  ["Juego de sábanas de algodón, matrimonial", 45000, "https://tienda.example/sabanas", "approved"],
  ["Cafetera italiana de 6 tazas", 21000, "https://tienda.example/cafetera", "approved"],
  ["Vajilla de cerámica para 12 personas, con diseño artesanal de Potolo y detalles pintados a mano por maestras de la comunidad", 128000, "https://tienda.example/vajilla", "approved"],
  ["Aporte para la luna de miel en Uyuni", 500000, "https://tienda.example/luna-de-miel", "approved"],
  ["Televisor 55 pulgadas", 489900, "https://tienda.example/tv", "pending"],
  ["Set de ollas de acero inoxidable", 98000, "https://tienda.example/ollas", "pending"],
  ["Lavadora automática", 235000, "https://tienda.example/lavadora", "pending"],
  ["Entrada para un concierto", 15000, "https://tienda.example/concierto", "rejected"],
  ["Pasaje de avión Santa Cruz a Miami (sin límite de precio de prueba)", 987654321, "https://tienda.example/pasaje", "approved"]
];
