// Conexión a MongoDB Atlas + contenido semilla. Este proyecto NO es el sitio de un
// cliente: es la demo comercial de FrontyBack (frontyback.com) para mostrarle en vivo a
// prospectos cómo se ve y se edita un sitio con panel de administración propio.
//
// Multi-rubro: un solo código y un solo proceso sirven varias demos, una por subdominio,
// cada una con su propia base de datos y su propio /admin:
//
//   eventos.frontyback.com -> base por defecto del connection string (frontyback-demo)
//   bares.frontyback.com   -> base "frontyback-bares"
//   cafes.frontyback.com   -> base "frontyback-cafes"
//   resto.frontyback.com   -> base "frontyback-resto"
//
// El rubro activo de cada request viaja por AsyncLocalStorage (lo setea un middleware en
// index.js según el hostname), así que getDb() devuelve la base correcta sin tener que
// tocar los ~45 lugares que ya lo llaman.

const { AsyncLocalStorage } = require('async_hooks');
const { MongoClient, ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');

const uri = process.env.MONGODB_URI;
if (!uri) {
  throw new Error(
    'Falta la variable de entorno MONGODB_URI (el connection string de MongoDB Atlas). ' +
    'Copiá .env.example a .env y completala antes de arrancar el servidor.'
  );
}

const client = new MongoClient(uri);

// --- Rubros y a qué base va cada uno ---
const RUBROS = ['eventos', 'bares', 'cafes', 'resto', 'inmo', 'muelita', 'toguita', 'curita', 'cuentita'];
const DEFAULT_RUBRO = 'eventos';

// Si el connection string apunta a una base "-dev", las bases por rubro también llevan
// "-dev", así probar en local NO escribe en las bases reales de producción (que se
// sembrarían con la contraseña de admin de dev, entre otras cosas).
const BASE_DB_NAME = client.db().databaseName;
const DEV_SUFFIX = /-dev$/.test(BASE_DB_NAME) ? '-dev' : '';

// null => usa la base que ya trae el connection string (frontyback-demo en prod,
// frontyback-demo-dev en local). Así "eventos" reutiliza la demo que ya existe y no se
// pierde nada de lo cargado hasta ahora.
const DB_NAME_BY_RUBRO = {
  eventos: null,
  bares: 'frontyback-bares' + DEV_SUFFIX,
  cafes: 'frontyback-cafes' + DEV_SUFFIX,
  resto: 'frontyback-resto' + DEV_SUFFIX,
  inmo: 'frontyback-inmo' + DEV_SUFFIX,
  muelita: 'frontyback-muelita' + DEV_SUFFIX,
  toguita: 'frontyback-toguita' + DEV_SUFFIX,
  curita: 'frontyback-curita' + DEV_SUFFIX,
  cuentita: 'frontyback-cuentita' + DEV_SUFFIX
};

const dbs = new Map(); // rubro -> Db
const als = new AsyncLocalStorage();

// Corre fn con un rubro activo. El middleware de index.js envuelve cada request con esto.
function runWith(rubro, fn) {
  return als.run({ rubro: RUBROS.includes(rubro) ? rubro : DEFAULT_RUBRO }, fn);
}

function currentRubro() {
  const store = als.getStore();
  return store && RUBROS.includes(store.rubro) ? store.rubro : DEFAULT_RUBRO;
}

function getDb() {
  const rubro = currentRubro();
  const d = dbs.get(rubro);
  if (!d) throw new Error(`La base del rubro "${rubro}" todavía no está conectada. Llamá a connect() primero.`);
  return d;
}

async function connect() {
  await client.connect();
  for (const rubro of RUBROS) {
    const name = DB_NAME_BY_RUBRO[rubro];
    dbs.set(rubro, name ? client.db(name) : client.db());
    await als.run({ rubro }, async () => {
      await ensureIndexes();
      await seedIfEmpty();
    });
  }
  console.log(`Conectado a MongoDB Atlas. Rubros: ${RUBROS.join(', ')}.`);
}

async function ensureIndexes() {
  const db = getDb();
  await db.collection('gallery_images').createIndex({ position: 1 });
  await db.collection('banner_gallery_images').createIndex({ position: 1 });
  await db.collection('social_links').createIndex({ position: 1 });
  await db.collection('testimonials').createIndex({ status: 1, position: 1 });
  await db.collection('contact_messages').createIndex({ created_at: -1 });
  await db.collection('product_categories').createIndex({ position: 1 });
  await db.collection('products').createIndex({ category_id: 1, position: 1 });
  await db.collection('clients').createIndex({ status: 1 });
  await db.collection('clients').createIndex({ next_followup_date: 1 });
}

// --- Contenido semilla ---
// BASE_CONTENT es el molde común (rubro eventos/salones, que es como nació la demo).
// RUBRO_OVERRIDES pisa sólo lo que cambia por rubro: nombre, copy, etiquetas de secciones
// y color de acento. Agregar un rubro nuevo = agregar un bloque acá, nada más.
const BASE_CONTENT = {
  site_name: 'Tu Salón de Eventos',
  logo_image: '',
  site_tagline: 'Así se vería tu sitio',

  // Color de acento del sitio (hex). Editable desde el panel. Tiñe botones, números de
  // las estadísticas, estrellas de testimonios, foco de los campos, etc.
  accent_color: '#1c1c1a',

  nav_home_label: 'Inicio',
  nav_servicios_label: 'Servicios',
  nav_salon_label: 'Tu Espacio',
  nav_productos_label: 'Productos',
  nav_testimonios_label: 'Testimonios',
  nav_contacto_label: 'Contacto',

  // Tipo de portada: 'image' (foto, de siempre), 'video' (un archivo subido o un link
  // externo pegado) o 'gallery' (varias fotos con transición automática, útil por
  // ejemplo para mostrar el avance de obra de un edificio). Default 'image' a propósito,
  // así el contenido ya cargado en sitios existentes sigue mostrando la foto de siempre
  // sin que haga falta tocar nada.
  banner_media_type: 'image',
  banner_image: '',
  banner_video_url: '',
  banner_video_file: '',
  banner_title: 'Tu Salón de Eventos',
  banner_subtitle: 'Esto es una demo de FrontyBack: un sitio real, con un panel donde vos mismo editás textos y fotos, sin depender de nadie.',

  stat_1_number: '120',
  stat_1_label: 'Invitados de capacidad',
  stat_2_number: '10',
  stat_2_label: 'Años de trayectoria',
  stat_3_number: '50+',
  stat_3_label: 'Eventos realizados',

  servicios_heading: 'Nuestros Servicios',
  servicios_subheading: 'Todo lo que necesitás para un evento inolvidable',
  servicios_text: [
    'Este texto lo editás vos desde el panel - contá acá la capacidad de tu espacio y las comodidades que ofrecés.',
    'Cada servicio es un párrafo separado: catering, DJ, iluminación, lo que corresponda a tu negocio.',
    'Podés agregar, borrar o reordenar tantos como quieras - el sitio se acomoda solo.'
  ].join('\n\n'),

  salon_heading: 'Tu Espacio',
  salon_subheading: 'Así se muestran tus fotos',
  salon_text: 'Esta sección es para contar tu salón o local. Las fotos de abajo se suben, borran y reordenan desde el panel en segundos - probalo vos mismo en la demo.',

  productos_heading: 'Nuestros productos y precios',
  productos_subheading: 'Escaneá para ver',

  proximo_evento_enabled: '0',
  proximo_evento_label: '',
  proximo_evento_text: '',
  proximo_evento_media_type: 'image',
  proximo_evento_image: '',
  proximo_evento_video_url: '',
  proximo_evento_vertical: '0',

  testimonios_heading: 'Testimonios',
  testimonios_subheading: 'Lo que dicen tus clientes',
  testimonios_form_heading: 'Dejá tu opinión',
  testimonios_form_text: 'Los testimonios que manda el público quedan pendientes hasta que vos los aprobás desde el panel.',

  contact_heading: 'Contacto',
  contact_subheading: '¿Te interesa un sitio así para tu negocio?',
  contact_address: 'Tu dirección acá',
  contact_phone: 'Tu teléfono acá',
  contact_email: 'tu@email.com',
  contact_hours: 'Tu horario de atención acá',

  footer_text: 'Demo de FrontyBack — frontyback.com'
};

const RUBRO_OVERRIDES = {
  eventos: {
    // Igual que la base. Se deja explícito para que quede claro que existe.
    accent_color: '#1c1c1a'
  },

  bares: {
    site_name: 'Tu Bar',
    accent_color: '#c1443b',
    nav_salon_label: 'El lugar',
    nav_productos_label: 'Carta',
    banner_title: 'Tu Bar',
    banner_subtitle: 'Tragos bien hechos, buena música y una barra para quedarse. Editá este texto, las fotos y la carta desde tu panel, cuando quieras.',
    stat_1_number: '80',
    stat_1_label: 'Personas de capacidad',
    stat_2_number: '6',
    stat_2_label: 'Años en el barrio',
    stat_3_number: '12',
    stat_3_label: 'Tragos de autor',
    servicios_heading: 'La noche, como te gusta',
    servicios_subheading: 'Del after office hasta el cierre',
    servicios_text: [
      'Contá tu propuesta: coctelería de autor, cervezas tiradas, vinos por copa y una cocina para acompañar hasta tarde.',
      'Cada ítem es un párrafo aparte. Sumá el happy hour, los shows en vivo y los eventos privados; se editan desde el panel en segundos.',
      'Cambiá la carta y los precios vos mismo cada vez que haga falta, sin llamar a nadie.'
    ].join('\n\n'),
    salon_heading: 'El lugar',
    salon_subheading: 'Así se ven tus fotos',
    salon_text: 'Mostrá la barra, los rincones, la terraza, la previa llena un viernes. Vas sumando y reordenando las fotos desde el panel a medida que sacás nuevas.',
    productos_heading: 'Nuestra carta',
    contact_subheading: '¿Querés un sitio así para tu bar?'
  },

  cafes: {
    site_name: 'Tu Café',
    accent_color: '#8a5a33',
    nav_salon_label: 'El local',
    nav_productos_label: 'Menú',
    banner_title: 'Tu Café',
    banner_subtitle: 'Café de especialidad, pastelería del día y un lugar para quedarse un rato. Editá los textos, las fotos y el menú desde tu panel.',
    stat_1_number: '40',
    stat_1_label: 'Lugares para sentarse',
    stat_2_number: '100%',
    stat_2_label: 'Pastelería propia',
    stat_3_number: '7:30',
    stat_3_label: 'Abrimos temprano',
    servicios_heading: 'De la mañana a la merienda',
    servicios_subheading: 'Lo que servimos cada día',
    servicios_text: [
      'Contá tu propuesta: métodos de filtrado, espresso, brunch de fin de semana, tostados y opciones sin TACC y veganas.',
      'Cada ítem es un párrafo aparte. Sumá el brunch, los desayunos y el espacio para trabajar; todo se edita desde el panel.',
      'Actualizá el menú y los precios vos mismo cuando cambie la carta de estación.'
    ].join('\n\n'),
    salon_heading: 'El local',
    salon_subheading: 'Así se ven tus fotos',
    salon_text: 'Mostrá la barra, la vidriera con las tortas, las mesas junto a la ventana, el patio. Cargás y reordenás las fotos desde el panel.',
    productos_heading: 'Nuestro menú',
    contact_subheading: '¿Querés un sitio así para tu café?'
  },

  resto: {
    site_name: 'Tu Restaurante',
    accent_color: '#1f6f4a',
    nav_salon_label: 'El salón',
    nav_productos_label: 'Menú',
    banner_title: 'Tu Restaurante',
    banner_subtitle: 'Cocina de estación, carta de vinos y un salón para ocasiones. Editá los textos, las fotos y el menú desde tu panel, cuando quieras.',
    stat_1_number: '90',
    stat_1_label: 'Cubiertos',
    stat_2_number: '12',
    stat_2_label: 'Años de cocina',
    stat_3_number: '4.8',
    stat_3_label: 'Puntaje de los clientes',
    servicios_heading: 'Nuestra cocina',
    servicios_subheading: 'Lo que ponemos en la mesa',
    servicios_text: [
      'Contá tu propuesta: cocina de estación, menú ejecutivo al mediodía, degustación con maridaje y carta de vinos.',
      'Cada ítem es un párrafo aparte. Sumá las reservas para grupos, los eventos privados y el salón exclusivo; se editan desde el panel.',
      'Cambiá el menú y los precios vos mismo cada vez que rota la carta.'
    ].join('\n\n'),
    salon_heading: 'El salón',
    salon_subheading: 'Así se ven tus fotos',
    salon_text: 'Mostrá la puesta de mesa, la cava, la cocina a la vista, la terraza al atardecer. Las fotos se administran desde el panel.',
    productos_heading: 'Nuestro menú',
    contact_subheading: '¿Querés un sitio así para tu restaurante?'
  },

  inmo: {
    site_name: 'Tu Inmobiliaria',
    accent_color: '#1f3a6b',
    nav_servicios_label: 'Servicios',
    nav_salon_label: 'Emprendimientos',
    nav_productos_label: 'Tipologías',
    banner_title: 'Tu Inmobiliaria',
    banner_subtitle: 'Emprendimientos en pozo, avance de obra al día y planes de pago claros. Cargás cada proyecto, sus fotos y sus precios desde tu panel.',
    stat_1_number: '45',
    stat_1_label: 'Unidades disponibles',
    stat_2_number: '3',
    stat_2_label: 'Emprendimientos activos',
    stat_3_number: '18',
    stat_3_label: 'Meses a la posesión',
    servicios_heading: 'De la reserva a la escritura',
    servicios_subheading: 'Cómo trabajamos',
    servicios_text: [
      'Contá tu propuesta: venta de unidades en pozo, financiación en cuotas en pesos con ajuste y entrega llave en mano.',
      'Cada servicio es un párrafo aparte. Sumá tasaciones, alquileres, permutas y asesoramiento para la escritura; se editan desde el panel.',
      'Publicá el avance de obra y actualizá precios y disponibilidad vos mismo, a medida que avanza cada proyecto.'
    ].join('\n\n'),
    salon_heading: 'Nuestros emprendimientos',
    salon_subheading: 'Así se ven tus fotos',
    salon_text: 'Mostrá renders, avance de obra mes a mes, la ubicación y los amenities de cada proyecto. Vas sumando fotos desde el panel según avanza la construcción.',
    productos_heading: 'Tipologías y precios',
    productos_subheading: 'Escaneá para ver',
    contact_subheading: '¿Querés un sitio así para tu inmobiliaria?'
  },

  muelita: {
    site_name: 'Tu Consultorio Dental',
    accent_color: '#1690a3',
    nav_servicios_label: 'Servicios',
    nav_salon_label: 'Consultorio',
    nav_productos_label: 'Tratamientos',
    banner_title: 'Tu Consultorio Dental',
    banner_subtitle: 'Odontología general, estética y ortodoncia para toda la familia. Editá los textos, las fotos y los tratamientos desde tu panel, cuando quieras.',
    stat_1_number: '15',
    stat_1_label: 'Años de experiencia',
    stat_2_number: '3000+',
    stat_2_label: 'Pacientes atendidos',
    stat_3_number: '5',
    stat_3_label: 'Especialidades',
    servicios_heading: 'Nuestros servicios',
    servicios_subheading: 'Salud y estética dental para toda la familia',
    servicios_text: [
      'Contá tu propuesta: odontología general, limpieza y prevención, blanqueamiento, ortodoncia e implantes.',
      'Cada servicio es un párrafo aparte. Sumá urgencias, odontopediatría y financiación en cuotas; se editan desde el panel.',
      'Mostrá el avance de un tratamiento de ortodoncia o un caso de estética, subiendo fotos vos mismo cuando quieras.'
    ].join('\n\n'),
    salon_heading: 'Nuestro consultorio',
    salon_subheading: 'Así se ve nuestro espacio',
    salon_text: 'Mostrá el consultorio, el equipamiento y la sala de espera. Las fotos se suben, borran y reordenan desde el panel en segundos.',
    productos_heading: 'Nuestros tratamientos',
    productos_subheading: 'Escaneá para ver',
    contact_subheading: '¿Querés un sitio así para tu consultorio?'
  },

  toguita: {
    site_name: 'Tu Estudio Jurídico',
    accent_color: '#5c1a2e',
    nav_servicios_label: 'Áreas',
    nav_salon_label: 'Estudio',
    nav_productos_label: 'Honorarios',
    banner_title: 'Tu Estudio Jurídico',
    banner_subtitle: 'Asesoramiento legal claro, en las áreas que tu empresa o vos necesiten. Editá los textos, las fotos y los honorarios desde tu panel, cuando quieras.',
    stat_1_number: '20',
    stat_1_label: 'Años de trayectoria',
    stat_2_number: '500+',
    stat_2_label: 'Casos resueltos',
    stat_3_number: '4',
    stat_3_label: 'Áreas de práctica',
    servicios_heading: 'Áreas de práctica',
    servicios_subheading: 'Asesoramiento integral para vos o tu empresa',
    servicios_text: [
      'Contá tu propuesta: derecho civil y comercial, derecho laboral, familia y sucesiones, y defensa del consumidor.',
      'Cada área es un párrafo aparte. Sumá contratos, cobranzas y mediación; se editan desde el panel en segundos.',
      'Actualizá los honorarios y las áreas que atendés vos mismo, sin depender de nadie.'
    ].join('\n\n'),
    salon_heading: 'Nuestro estudio',
    salon_subheading: 'Así se ve nuestro espacio',
    salon_text: 'Mostrá las oficinas, la sala de reuniones y el equipo. Las fotos se suben, borran y reordenan desde el panel en segundos.',
    productos_heading: 'Consultas y honorarios',
    productos_subheading: 'Escaneá para ver',
    contact_subheading: '¿Querés un sitio así para tu estudio?'
  },

  curita: {
    site_name: 'Tu Consultorio Médico',
    accent_color: '#2f7dd1',
    nav_servicios_label: 'Especialidades',
    nav_salon_label: 'Consultorio',
    nav_productos_label: 'Consultas',
    banner_title: 'Tu Consultorio Médico',
    banner_subtitle: 'Atención médica cercana, con turnos claros y especialistas para toda la familia. Editá los textos, las fotos y las especialidades desde tu panel.',
    stat_1_number: '12',
    stat_1_label: 'Especialidades médicas',
    stat_2_number: '8',
    stat_2_label: 'Años atendiendo el barrio',
    stat_3_number: '5000+',
    stat_3_label: 'Pacientes atendidos',
    servicios_heading: 'Nuestras especialidades',
    servicios_subheading: 'Atención integral para toda la familia',
    servicios_text: [
      'Contá tu propuesta: clínica médica, pediatría, ginecología, cardiología y laboratorio de análisis.',
      'Cada especialidad es un párrafo aparte. Sumá guardia, estudios por imágenes y turnos online; se editan desde el panel.',
      'Publicá las especialidades y los turnos disponibles vos mismo, a medida que sumás profesionales.'
    ].join('\n\n'),
    salon_heading: 'Nuestro consultorio',
    salon_subheading: 'Así se ve nuestro espacio',
    salon_text: 'Mostrá los consultorios, el equipamiento y la sala de espera. Las fotos se administran desde el panel.',
    productos_heading: 'Consultas y especialidades',
    productos_subheading: 'Escaneá para ver',
    contact_subheading: '¿Querés un sitio así para tu consultorio?'
  },

  cuentita: {
    site_name: 'Tu Estudio Contable',
    accent_color: '#a67c1e',
    nav_servicios_label: 'Servicios',
    nav_salon_label: 'Estudio',
    nav_productos_label: 'Honorarios',
    banner_title: 'Tu Estudio Contable',
    banner_subtitle: 'Impuestos al día, liquidación de sueldos y asesoramiento para que tu negocio crezca tranquilo. Editá los textos, las fotos y los honorarios desde tu panel.',
    stat_1_number: '18',
    stat_1_label: 'Años de trayectoria',
    stat_2_number: '200+',
    stat_2_label: 'Empresas asesoradas',
    stat_3_number: '3',
    stat_3_label: 'Áreas de servicio',
    servicios_heading: 'Nuestros servicios',
    servicios_subheading: 'Todo lo que tu negocio necesita en un solo lugar',
    servicios_text: [
      'Contá tu propuesta: monotributo y autónomos, liquidación de sueldos, balances y asesoramiento impositivo.',
      'Cada servicio es un párrafo aparte. Sumá constitución de sociedades y auditoría; se editan desde el panel.',
      'Actualizá los honorarios y los servicios que ofrecés vos mismo, cuando haga falta.'
    ].join('\n\n'),
    salon_heading: 'Nuestro estudio',
    salon_subheading: 'Así se ve nuestro espacio',
    salon_text: 'Mostrá las oficinas y el equipo de trabajo. Las fotos se suben, borran y reordenan desde el panel en segundos.',
    productos_heading: 'Servicios y honorarios',
    productos_subheading: 'Escaneá para ver',
    contact_subheading: '¿Querés un sitio así para tu estudio?'
  }
};

function contentForRubro(rubro) {
  return { ...BASE_CONTENT, ...(RUBRO_OVERRIDES[rubro] || {}) };
}

const DEFAULT_SOCIAL = [];
const DEFAULT_GALLERY = [];

// Categorías y productos de ejemplo para la página /productos (lo que se ve al escanear
// el QR en el pitch). Por rubro, así el QR también muestra algo del mundo del prospecto.
const PRODUCTS_BY_RUBRO = {
  eventos: [
    {
      name: 'Paquete para 50 personas',
      products: [
        { name: 'Menú clásico + brindis', price: 'Desde $150.000' },
        { name: 'Menú premium + barra libre', price: 'Desde $220.000' }
      ]
    },
    {
      name: 'Paquete para 100 personas',
      products: [
        { name: 'Menú clásico + brindis', price: 'Desde $280.000' },
        { name: 'Menú premium + barra libre', price: 'Desde $410.000' }
      ]
    }
  ],
  bares: [
    {
      name: 'Tragos de autor',
      products: [
        { name: 'Negroni de la casa', price: '$4.800' },
        { name: 'Gin tonic premium', price: '$5.200' }
      ]
    },
    {
      name: 'Cervezas',
      products: [
        { name: 'Pinta rubia', price: '$3.200' },
        { name: 'Pinta IPA', price: '$3.600' }
      ]
    },
    {
      name: 'Para picar',
      products: [
        { name: 'Tabla de fiambres y quesos', price: '$12.500' },
        { name: 'Rabas', price: '$9.800' }
      ]
    }
  ],
  cafes: [
    {
      name: 'Café',
      products: [
        { name: 'Espresso', price: '$2.200' },
        { name: 'Flat white', price: '$3.400' },
        { name: 'Cold brew', price: '$3.800' }
      ]
    },
    {
      name: 'Pastelería',
      products: [
        { name: 'Medialunas (x3)', price: '$2.700' },
        { name: 'Porción de cheesecake', price: '$4.500' }
      ]
    },
    {
      name: 'Brunch',
      products: [
        { name: 'Huevos benedictine', price: '$7.900' },
        { name: 'Tostado de campo', price: '$6.200' }
      ]
    }
  ],
  resto: [
    {
      name: 'Entradas',
      products: [
        { name: 'Burrata con tomates asados', price: '$8.900' },
        { name: 'Empanadas criollas (x3)', price: '$5.400' }
      ]
    },
    {
      name: 'Principales',
      products: [
        { name: 'Bife de chorizo con guarnición', price: '$16.500' },
        { name: 'Ravioles de la casa', price: '$11.900' }
      ]
    },
    {
      name: 'Postres',
      products: [
        { name: 'Flan casero con dulce', price: '$4.800' },
        { name: 'Volcán de chocolate', price: '$5.600' }
      ]
    }
  ],
  inmo: [
    {
      name: 'Torre Ríos — Entrega 2026',
      products: [
        { name: 'Monoambiente (32 m²)', price: 'Desde USD 62.000' },
        { name: '2 ambientes (48 m²)', price: 'Desde USD 89.000' },
        { name: '3 ambientes (71 m²)', price: 'Desde USD 128.000' }
      ]
    },
    {
      name: 'Distrito Norte — En pozo',
      products: [
        { name: '2 ambientes con balcón', price: 'Desde USD 84.000' },
        { name: '2 ambientes con cochera', price: 'Desde USD 97.000' },
        { name: 'Dúplex 3 ambientes', price: 'Desde USD 145.000' }
      ]
    },
    {
      name: 'Formas de pago',
      products: [
        { name: 'Anticipo 30% + 40 cuotas en pesos', price: 'Ajuste CAC' },
        { name: 'Contado', price: '10% de descuento' }
      ]
    }
  ],
  muelita: [
    {
      name: 'Consultas',
      products: [
        { name: 'Consulta y diagnóstico', price: '$8.000' },
        { name: 'Limpieza (profilaxis)', price: '$12.000' },
        { name: 'Urgencia', price: '$15.000' }
      ]
    },
    {
      name: 'Estética',
      products: [
        { name: 'Blanqueamiento dental', price: 'Desde $45.000' },
        { name: 'Carilla de resina (por pieza)', price: 'Desde $35.000' }
      ]
    },
    {
      name: 'Ortodoncia',
      products: [
        { name: 'Brackets metálicos (tratamiento completo)', price: 'Desde $600.000' },
        { name: 'Alineadores estéticos (tratamiento completo)', price: 'Desde $900.000' }
      ]
    },
    {
      name: 'Implantes',
      products: [
        { name: 'Implante unitario', price: 'Desde $280.000' },
        { name: 'Corona sobre implante', price: 'Desde $180.000' }
      ]
    }
  ],
  toguita: [
    {
      name: 'Consultas',
      products: [
        { name: 'Consulta inicial', price: '$25.000' },
        { name: 'Consulta urgente', price: '$40.000' }
      ]
    },
    {
      name: 'Derecho civil y comercial',
      products: [
        { name: 'Redacción de contrato', price: 'Desde $60.000' },
        { name: 'Reclamo extrajudicial', price: 'Desde $80.000' }
      ]
    },
    {
      name: 'Derecho laboral',
      products: [
        { name: 'Liquidación final y despido', price: 'Desde $90.000' },
        { name: 'Asesoramiento a empresas (mensual)', price: 'Desde $70.000' }
      ]
    },
    {
      name: 'Familia y sucesiones',
      products: [
        { name: 'Sucesión (honorarios base)', price: 'Desde $150.000' },
        { name: 'Divorcio de común acuerdo', price: 'Desde $120.000' }
      ]
    }
  ],
  curita: [
    {
      name: 'Consultas',
      products: [
        { name: 'Consulta clínica general', price: '$9.000' },
        { name: 'Consulta pediátrica', price: '$9.500' }
      ]
    },
    {
      name: 'Especialidades',
      products: [
        { name: 'Cardiología', price: '$12.000' },
        { name: 'Ginecología', price: '$12.000' },
        { name: 'Dermatología', price: '$11.000' }
      ]
    },
    {
      name: 'Estudios',
      products: [
        { name: 'Análisis de laboratorio (básico)', price: 'Desde $14.000' },
        { name: 'Electrocardiograma', price: '$10.000' }
      ]
    }
  ],
  cuentita: [
    {
      name: 'Monotributo y autónomos',
      products: [
        { name: 'Alta de monotributo', price: '$25.000' },
        { name: 'Liquidación mensual', price: 'Desde $15.000' }
      ]
    },
    {
      name: 'Liquidación de sueldos',
      products: [
        { name: 'Por empleado (mensual)', price: '$6.000' },
        { name: 'Alta/baja de personal', price: '$10.000' }
      ]
    },
    {
      name: 'Balances y asesoramiento',
      products: [
        { name: 'Balance anual (PyME)', price: 'Desde $180.000' },
        { name: 'Asesoramiento impositivo (mensual)', price: 'Desde $50.000' }
      ]
    }
  ]
};

function productsForRubro(rubro) {
  return PRODUCTS_BY_RUBRO[rubro] || PRODUCTS_BY_RUBRO[DEFAULT_RUBRO];
}

async function seedIfEmpty() {
  const db = getDb();
  const rubro = currentRubro();
  const defaultContent = contentForRubro(rubro);

  const contentDoc = await db.collection('content').findOne({ _id: 'main' });
  if (!contentDoc) {
    await db.collection('content').insertOne({ _id: 'main', ...defaultContent });
  } else {
    const missing = {};
    for (const [key, value] of Object.entries(defaultContent)) {
      if (!(key in contentDoc)) missing[key] = value;
    }
    if (Object.keys(missing).length > 0) {
      await db.collection('content').updateOne({ _id: 'main' }, { $set: missing });
    }
  }

  const galleryCount = await db.collection('gallery_images').countDocuments();
  if (galleryCount === 0 && DEFAULT_GALLERY.length > 0) {
    await db.collection('gallery_images').insertMany(
      DEFAULT_GALLERY.map((item, i) => ({ ...item, position: i }))
    );
  }

  const socialCount = await db.collection('social_links').countDocuments();
  if (socialCount === 0 && DEFAULT_SOCIAL.length > 0) {
    await db.collection('social_links').insertMany(
      DEFAULT_SOCIAL.map((item, i) => ({ ...item, visible: true, position: i }))
    );
  }

  const categoryCount = await db.collection('product_categories').countDocuments();
  if (categoryCount === 0) {
    const cats = productsForRubro(rubro);
    for (let i = 0; i < cats.length; i++) {
      const { name, products } = cats[i];
      const { insertedId } = await db.collection('product_categories').insertOne({ name, position: i });
      if (products.length > 0) {
        await db.collection('products').insertMany(
          products.map((p, j) => ({ ...p, category_id: insertedId, image_url: '', position: j }))
        );
      }
    }
  }

  const adminDoc = await db.collection('admin_user').findOne({ _id: 'admin' });
  if (!adminDoc) {
    const password = process.env.ADMIN_PASSWORD || 'cambiar-esta-clave';
    const hash = bcrypt.hashSync(password, 10);
    await db.collection('admin_user').insertOne({ _id: 'admin', password_hash: hash });
    if (!process.env.ADMIN_PASSWORD) {
      console.warn(
        '[aviso] No hay ADMIN_PASSWORD en .env: se creó el usuario admin con la clave por defecto ' +
        '"cambiar-esta-clave". Copiá .env.example a .env y definí una clave propia antes de publicar el sitio.'
      );
    }
  }
}

// Vuelve la demo del rubro activo a los valores de fábrica (textos + borra galería, redes
// y testimonios cargados). Pensado para correrlo antes de cada pitch, así el prospecto
// anterior no deja restos. No toca la contraseña del admin ni los mensajes recibidos.
async function resetDemo() {
  const db = getDb();
  const rubro = currentRubro();
  await db.collection('content').updateOne({ _id: 'main' }, { $set: contentForRubro(rubro) }, { upsert: true });
  await db.collection('gallery_images').deleteMany({});
  await db.collection('banner_gallery_images').deleteMany({});
  await db.collection('social_links').deleteMany({});
  await db.collection('testimonials').deleteMany({});
  await db.collection('product_categories').deleteMany({});
  await db.collection('products').deleteMany({});
  await seedIfEmpty();
}

module.exports = { connect, getDb, ObjectId, resetDemo, runWith, RUBROS, DEFAULT_RUBRO };
