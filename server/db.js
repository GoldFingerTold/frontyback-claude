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
const RUBROS = ['eventos', 'bares', 'cafes', 'resto', 'inmo'];
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
  inmo: 'frontyback-inmo' + DEV_SUFFIX
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

  banner_image: '',
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
    nav_salon_label: 'El Lugar',
    nav_productos_label: 'Carta',
    banner_title: 'Tu Bar',
    banner_subtitle: 'Esto es una demo de FrontyBack: un sitio real, con un panel donde vos mismo editás textos, fotos y la carta, sin depender de nadie.',
    stat_1_number: '80',
    stat_1_label: 'Personas de capacidad',
    stat_2_number: '6',
    stat_2_label: 'Años en el barrio',
    stat_3_number: '30+',
    stat_3_label: 'Etiquetas de gin',
    servicios_heading: 'Qué ofrecemos',
    servicios_subheading: 'La previa, el after office y la noche',
    servicios_text: [
      'Contá acá tu propuesta: coctelería de autor, cervezas tiradas, tabla de picadas, música en vivo los fines de semana.',
      'Cada ítem es un párrafo aparte - sumás o sacás los que quieras desde el panel.',
      'Ideal para mostrar happy hour, shows y eventos privados.'
    ].join('\n\n'),
    salon_heading: 'El Lugar',
    salon_text: 'Contá el ambiente de tu bar: la barra, los rincones, la terraza. Las fotos se suben y reordenan desde el panel en segundos.',
    productos_heading: 'Nuestra carta',
    contact_subheading: '¿Querés un sitio así para tu bar?'
  },

  cafes: {
    site_name: 'Tu Café',
    accent_color: '#8a5a33',
    nav_salon_label: 'El Local',
    nav_productos_label: 'Menú',
    banner_title: 'Tu Café',
    banner_subtitle: 'Esto es una demo de FrontyBack: un sitio real, con un panel donde vos mismo editás textos, fotos y el menú, sin depender de nadie.',
    stat_1_number: '40',
    stat_1_label: 'Cubiertos',
    stat_2_number: '5',
    stat_2_label: 'Años tostando café',
    stat_3_number: '100%',
    stat_3_label: 'Pastelería propia',
    servicios_heading: 'Qué encontrás',
    servicios_subheading: 'De la mañana a la merienda',
    servicios_text: [
      'Contá tu propuesta: café de especialidad, brunch de fin de semana, pastelería artesanal, opciones sin TACC y veganas.',
      'Cada ítem es un párrafo aparte - los editás desde el panel.',
      'Ideal para mostrar el brunch, los desayunos y el espacio para trabajar.'
    ].join('\n\n'),
    salon_heading: 'El Local',
    salon_text: 'Mostrá el ambiente de tu café: la barra, las mesas, la vidriera, el patio. Subís y ordenás las fotos desde el panel.',
    productos_heading: 'Nuestro menú',
    contact_subheading: '¿Querés un sitio así para tu café?'
  },

  resto: {
    site_name: 'Tu Restaurante',
    accent_color: '#1f6f4a',
    nav_salon_label: 'El Salón',
    nav_productos_label: 'Menú',
    banner_title: 'Tu Restaurante',
    banner_subtitle: 'Esto es una demo de FrontyBack: un sitio real, con un panel donde vos mismo editás textos, fotos y el menú, sin depender de nadie.',
    stat_1_number: '90',
    stat_1_label: 'Cubiertos',
    stat_2_number: '12',
    stat_2_label: 'Años de cocina',
    stat_3_number: '4.8',
    stat_3_label: 'Puntaje promedio',
    servicios_heading: 'Nuestra cocina',
    servicios_subheading: 'Lo que ponemos en la mesa',
    servicios_text: [
      'Contá tu propuesta: cocina de estación, menú ejecutivo al mediodía, carta de vinos, reservas para grupos y eventos.',
      'Cada ítem es un párrafo aparte - se edita desde el panel.',
      'Ideal para mostrar el menú degustación, los platos de la casa y el salón privado.'
    ].join('\n\n'),
    salon_heading: 'El Salón',
    salon_text: 'Mostrá tu salón: la puesta de mesa, la cava, la cocina a la vista, la terraza. Las fotos se administran desde el panel.',
    productos_heading: 'Nuestro menú',
    contact_subheading: '¿Querés un sitio así para tu restaurante?'
  },

  inmo: {
    site_name: 'Tu Inmobiliaria',
    accent_color: '#1f3a6b',
    site_tagline: 'Así se vería tu sitio',
    nav_servicios_label: 'Servicios',
    nav_salon_label: 'Emprendimientos',
    nav_productos_label: 'Tipologías',
    banner_title: 'Tu Inmobiliaria',
    banner_subtitle: 'Esto es una demo de FrontyBack: un sitio real, con un panel donde vos mismo cargás emprendimientos, fotos, avance de obra y precios, sin depender de nadie.',
    stat_1_number: '45',
    stat_1_label: 'Unidades disponibles',
    stat_2_number: '3',
    stat_2_label: 'Emprendimientos activos',
    stat_3_number: '18',
    stat_3_label: 'Meses a la posesión',
    servicios_heading: 'Qué hacemos',
    servicios_subheading: 'De la reserva a la escritura',
    servicios_text: [
      'Contá tu propuesta: venta de unidades en pozo, financiación en cuotas en pesos, entrega llave en mano.',
      'Cada servicio es un párrafo aparte: tasaciones, alquileres, asesoramiento y escrituración.',
      'Ideal para mostrar formas de pago, anticipo y plan de cuotas de cada emprendimiento.'
    ].join('\n\n'),
    salon_heading: 'Nuestros emprendimientos',
    salon_subheading: 'Así se muestran tus fotos',
    salon_text: 'Mostrá cada emprendimiento: renders, avance de obra, ubicación y amenities. Las fotos se suben y reordenan desde el panel a medida que avanza la obra.',
    productos_heading: 'Tipologías y precios',
    productos_subheading: 'Escaneá para ver',
    contact_subheading: '¿Querés un sitio así para tu inmobiliaria?'
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
  await db.collection('social_links').deleteMany({});
  await db.collection('testimonials').deleteMany({});
  await db.collection('product_categories').deleteMany({});
  await db.collection('products').deleteMany({});
  await seedIfEmpty();
}

module.exports = { connect, getDb, ObjectId, resetDemo, runWith, RUBROS, DEFAULT_RUBRO };
