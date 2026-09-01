// Conexión a MongoDB Atlas + contenido semilla. Este proyecto NO es el sitio de un
// cliente: es la demo comercial de FrontyBack (frontyback.com) para mostrarle en vivo a
// prospectos - sobre todo salones/organizadores de eventos - cómo se ve y se edita un
// sitio con panel de administración propio. Por eso el contenido de acá abajo es
// genérico y no usa fotos ni datos de ningún cliente real: son placeholders pensados
// para que Hugo suba una foto del prospecto en el momento y muestre el cambio en vivo.

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
let db = null;

function getDb() {
  if (!db) throw new Error('La base de datos todavía no está conectada. Llamá a connect() primero.');
  return db;
}

async function connect() {
  await client.connect();
  db = client.db();
  await ensureIndexes();
  await seedIfEmpty();
  console.log('Conectado a MongoDB Atlas.');
}

async function ensureIndexes() {
  await db.collection('gallery_images').createIndex({ position: 1 });
  await db.collection('social_links').createIndex({ position: 1 });
  await db.collection('testimonials').createIndex({ status: 1, position: 1 });
  await db.collection('contact_messages').createIndex({ created_at: -1 });
}

// --- Contenido semilla de la demo (sin fotos ni datos de ningún cliente real) ---
const DEFAULT_CONTENT = {
  site_name: 'Tu Salón de Eventos',
  logo_image: '',
  site_tagline: 'Así se vería tu sitio',

  nav_home_label: 'Inicio',
  nav_servicios_label: 'Servicios',
  nav_salon_label: 'Tu Espacio',
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

const DEFAULT_SOCIAL = [];
const DEFAULT_GALLERY = [];

async function seedIfEmpty() {
  const contentDoc = await db.collection('content').findOne({ _id: 'main' });
  if (!contentDoc) {
    await db.collection('content').insertOne({ _id: 'main', ...DEFAULT_CONTENT });
  } else {
    const missing = {};
    for (const [key, value] of Object.entries(DEFAULT_CONTENT)) {
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

// Vuelve todo el contenido demo a los valores de fábrica (textos + borra galería,
// redes y testimonios cargados). Pensado para correrlo antes de cada pitch, así el
// prospecto anterior no deja restos en la demo del próximo. No toca la contraseña
// del admin ni los mensajes de contacto recibidos.
async function resetDemo() {
  await db.collection('content').updateOne({ _id: 'main' }, { $set: DEFAULT_CONTENT }, { upsert: true });
  await db.collection('gallery_images').deleteMany({});
  await db.collection('social_links').deleteMany({});
  await db.collection('testimonials').deleteMany({});
}

module.exports = { connect, getDb, ObjectId, resetDemo };
