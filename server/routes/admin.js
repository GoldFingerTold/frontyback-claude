// Rutas protegidas del panel: editar textos, subir/borrar/reordenar fotos de la
// galería, reemplazar imágenes fijas, gestionar redes sociales, moderar testimonios y
// ver los mensajes de contacto. Se montan detrás de auth.requireAdmin en index.js.

const express = require('express');
const multer = require('multer');
const db = require('../db');
const asyncHandler = require('../asyncHandler');
const { uploadBuffer } = require('../cloudinary');
const { ObjectId } = require('mongodb');

const router = express.Router();

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_TYPES.has(file.mimetype)) {
      return cb(new Error('Formato de imagen no soportado. Usá JPG, PNG, WEBP o GIF.'));
    }
    cb(null, true);
  }
});

function withMulterErrors(field) {
  const mw = upload.single(field);
  return (req, res, next) => {
    mw(req, res, (err) => {
      if (err) return res.status(400).json({ error: err.message });
      next();
    });
  };
}

// ---------- Textos ----------

router.get('/content', asyncHandler(async (req, res) => {
  const contentDoc = await db.getDb().collection('content').findOne({ _id: 'main' });
  const { _id, ...content } = contentDoc || {};
  res.json({ content });
}));

router.put('/content', asyncHandler(async (req, res) => {
  const updates = req.body || {};
  const keys = Object.keys(updates);
  if (keys.length === 0) return res.status(400).json({ error: 'No hay campos para actualizar.' });

  const clean = {};
  for (const key of keys) clean[key] = String(updates[key] ?? '');

  await db.getDb().collection('content').updateOne({ _id: 'main' }, { $set: clean }, { upsert: true });

  res.json({ ok: true });
}));

// Reemplazar una imagen fija del contenido (banner_image, logo_image, etc.), o subir
// una imagen suelta y devolver su URL para usarla donde haga falta.
router.post('/content/image', withMulterErrors('image'), asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No se recibió ninguna imagen.' });
  const cloudResult = await uploadBuffer(req.file.buffer, 'frontyback-demo/content');
  const url = cloudResult.secure_url;

  const { key } = req.body || {};
  if (key) {
    await db.getDb().collection('content').updateOne({ _id: 'main' }, { $set: { [key]: url } }, { upsert: true });
  }

  res.json({ ok: true, url });
}));

// ---------- Galería ----------

router.get('/gallery', asyncHandler(async (req, res) => {
  const items = await db.getDb().collection('gallery_images').find().sort({ position: 1, _id: 1 }).toArray();
  res.json({ items: items.map(({ _id, url, alt_text, position }) => ({ id: _id, url, alt: alt_text, position })) });
}));

router.post('/gallery', withMulterErrors('image'), asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No se recibió ninguna imagen.' });
  const cloudResult = await uploadBuffer(req.file.buffer, 'frontyback-demo/gallery');
  const url = cloudResult.secure_url;
  const alt = (req.body && req.body.alt) || '';

  const mongo = db.getDb();
  const last = await mongo.collection('gallery_images').find().sort({ position: -1 }).limit(1).toArray();
  const nextPos = last.length > 0 ? last[0].position + 1 : 0;

  const inserted = await mongo.collection('gallery_images').insertOne({ url, alt_text: alt, position: nextPos });

  res.json({ ok: true, id: inserted.insertedId, url });
}));

router.delete('/gallery/:id', asyncHandler(async (req, res) => {
  const result = await db.getDb().collection('gallery_images').deleteOne({ _id: new ObjectId(req.params.id) });
  if (result.deletedCount === 0) return res.status(404).json({ error: 'No existe esa imagen.' });

  // Nota: la imagen queda huérfana en Cloudinary (no se borra desde acá) - a esta
  // escala no representa un costo real (plan gratis de 25GB).

  res.json({ ok: true });
}));

// Reordenar: recibe la lista completa de ids en el orden final.
router.put('/gallery/reorder', asyncHandler(async (req, res) => {
  const { order } = req.body || {};
  if (!Array.isArray(order)) return res.status(400).json({ error: 'Falta el array "order".' });

  const ops = order.map((id, index) => ({
    updateOne: { filter: { _id: new ObjectId(id) }, update: { $set: { position: index } } }
  }));
  if (ops.length > 0) await db.getDb().collection('gallery_images').bulkWrite(ops);

  res.json({ ok: true });
}));

// ---------- Redes sociales ----------

router.get('/social', asyncHandler(async (req, res) => {
  const items = await db.getDb().collection('social_links').find().sort({ position: 1, _id: 1 }).toArray();
  res.json({ items: items.map(({ _id, platform, label, url, visible, position }) => ({ id: _id, platform, label, url, visible, position })) });
}));

router.post('/social', asyncHandler(async (req, res) => {
  const { platform, label, url } = req.body || {};
  if (!platform || !label || !url) {
    return res.status(400).json({ error: 'Faltan datos (plataforma, etiqueta o URL).' });
  }

  const mongo = db.getDb();
  const last = await mongo.collection('social_links').find().sort({ position: -1 }).limit(1).toArray();
  const nextPos = last.length > 0 ? last[0].position + 1 : 0;

  const inserted = await mongo.collection('social_links').insertOne({
    platform: platform.trim(),
    label: label.trim(),
    url: url.trim(),
    visible: true,
    position: nextPos
  });

  res.json({ ok: true, id: inserted.insertedId });
}));

// IMPORTANTE: "reorder" tiene que registrarse ANTES que "/:id" - si no, Express matchea
// "reorder" como si fuera el valor de :id (rutas fijas antes que rutas con parámetro).
router.put('/social/reorder', asyncHandler(async (req, res) => {
  const { order } = req.body || {};
  if (!Array.isArray(order)) return res.status(400).json({ error: 'Falta el array "order".' });

  const ops = order.map((id, index) => ({
    updateOne: { filter: { _id: new ObjectId(id) }, update: { $set: { position: index } } }
  }));
  if (ops.length > 0) await db.getDb().collection('social_links').bulkWrite(ops);

  res.json({ ok: true });
}));

router.put('/social/:id', asyncHandler(async (req, res) => {
  const mongo = db.getDb();
  const row = await mongo.collection('social_links').findOne({ _id: new ObjectId(req.params.id) });
  if (!row) return res.status(404).json({ error: 'No existe esa red.' });

  const { platform, label, url, visible } = req.body || {};
  await mongo.collection('social_links').updateOne(
    { _id: row._id },
    {
      $set: {
        platform: platform ?? row.platform,
        label: label ?? row.label,
        url: url ?? row.url,
        visible: visible === undefined ? row.visible : Boolean(visible)
      }
    }
  );
  res.json({ ok: true });
}));

router.delete('/social/:id', asyncHandler(async (req, res) => {
  const result = await db.getDb().collection('social_links').deleteOne({ _id: new ObjectId(req.params.id) });
  if (result.deletedCount === 0) return res.status(404).json({ error: 'No existe esa red.' });
  res.json({ ok: true });
}));

// ---------- Testimonios (moderación) ----------

// Trae TODOS los testimonios sin importar el estado - a diferencia de /api/content,
// que solo devuelve los aprobados. Así el panel puede mostrar la bandeja completa.
router.get('/testimonials', asyncHandler(async (req, res) => {
  const items = await db.getDb().collection('testimonials')
    .find()
    .sort({ status: 1, created_at: -1 })
    .toArray();
  // "pending" antes que el resto (orden alfabético lo pone primero: approved < pending < rejected
  // no da lo que queremos, así que ordenamos a mano después de traerlos).
  items.sort((a, b) => {
    if (a.status === 'pending' && b.status !== 'pending') return -1;
    if (a.status !== 'pending' && b.status === 'pending') return 1;
    return 0;
  });
  res.json({ items: items.map(({ _id, name, rating, text, status, position, created_at }) => ({ id: _id, name, rating, text, status, position, created_at })) });
}));

// El propio dueño carga un testimonio ya aprobado directamente (sin pasar por "pending").
router.post('/testimonials', asyncHandler(async (req, res) => {
  const { name, rating, text } = req.body || {};
  if (!name || !name.trim()) return res.status(400).json({ error: 'Falta el nombre.' });
  if (!text || !text.trim()) return res.status(400).json({ error: 'Falta el texto.' });

  let ratingValue = null;
  if (rating !== undefined && rating !== null && rating !== '') {
    const n = Number(rating);
    if (Number.isInteger(n) && n >= 1 && n <= 5) ratingValue = n;
  }

  const mongo = db.getDb();
  const last = await mongo.collection('testimonials').find().sort({ position: -1 }).limit(1).toArray();
  const nextPos = last.length > 0 ? last[0].position + 1 : 0;

  const inserted = await mongo.collection('testimonials').insertOne({
    name: name.trim(),
    rating: ratingValue,
    text: text.trim(),
    status: 'approved',
    position: nextPos,
    created_at: new Date()
  });

  res.json({ ok: true, id: inserted.insertedId });
}));

// "reorder" antes que "/:id" por el mismo motivo que en redes sociales (ver más arriba).
router.put('/testimonials/reorder', asyncHandler(async (req, res) => {
  const { order } = req.body || {};
  if (!Array.isArray(order)) return res.status(400).json({ error: 'Falta el array "order".' });

  const ops = order.map((id, index) => ({
    updateOne: { filter: { _id: new ObjectId(id) }, update: { $set: { position: index } } }
  }));
  if (ops.length > 0) await db.getDb().collection('testimonials').bulkWrite(ops);

  res.json({ ok: true });
}));

// Aprobar, rechazar, o editar el texto/nombre/puntuación de un testimonio existente.
router.put('/testimonials/:id', asyncHandler(async (req, res) => {
  const mongo = db.getDb();
  const row = await mongo.collection('testimonials').findOne({ _id: new ObjectId(req.params.id) });
  if (!row) return res.status(404).json({ error: 'No existe ese testimonio.' });

  const { name, rating, text, status } = req.body || {};

  if (status !== undefined && !['pending', 'approved', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'Estado inválido.' });
  }

  let ratingValue = row.rating;
  if (rating !== undefined) {
    if (rating === null || rating === '') {
      ratingValue = null;
    } else {
      const n = Number(rating);
      if (!Number.isInteger(n) || n < 1 || n > 5) {
        return res.status(400).json({ error: 'La puntuación tiene que ser un número entero de 1 a 5.' });
      }
      ratingValue = n;
    }
  }

  // Si se aprueba recién ahora y no tenía posición asignada, lo mandamos al final.
  let position = row.position;
  if (status === 'approved' && row.status !== 'approved') {
    const last = await mongo.collection('testimonials').find().sort({ position: -1 }).limit(1).toArray();
    position = last.length > 0 ? last[0].position + 1 : 0;
  }

  await mongo.collection('testimonials').updateOne(
    { _id: row._id },
    {
      $set: {
        name: (name ?? row.name).trim(),
        rating: ratingValue,
        text: (text ?? row.text).trim(),
        status: status ?? row.status,
        position
      }
    }
  );

  res.json({ ok: true });
}));

router.delete('/testimonials/:id', asyncHandler(async (req, res) => {
  const result = await db.getDb().collection('testimonials').deleteOne({ _id: new ObjectId(req.params.id) });
  if (result.deletedCount === 0) return res.status(404).json({ error: 'No existe ese testimonio.' });
  res.json({ ok: true });
}));

// ---------- Mensajes de contacto ----------

router.get('/messages', asyncHandler(async (req, res) => {
  const items = await db.getDb().collection('contact_messages').find().sort({ created_at: -1 }).toArray();
  res.json({ items: items.map(({ _id, name, email, phone, message, created_at, is_read }) => ({ id: _id, name, email, phone, message, created_at, is_read })) });
}));

router.put('/messages/:id/read', asyncHandler(async (req, res) => {
  const result = await db.getDb().collection('contact_messages').updateOne(
    { _id: new ObjectId(req.params.id) },
    { $set: { is_read: true } }
  );
  if (result.matchedCount === 0) return res.status(404).json({ error: 'No existe ese mensaje.' });
  res.json({ ok: true });
}));

router.delete('/messages/:id', asyncHandler(async (req, res) => {
  const result = await db.getDb().collection('contact_messages').deleteOne({ _id: new ObjectId(req.params.id) });
  if (result.deletedCount === 0) return res.status(404).json({ error: 'No existe ese mensaje.' });
  res.json({ ok: true });
}));

// ---------- Reset de la demo ----------

// Vuelve el contenido, la galería, las redes y los testimonios a los valores de
// fábrica - pensado para correrlo antes de cada pitch, así lo que cargó/subió el
// prospecto anterior no queda dando vueltas en la próxima demo.
router.post('/demo-reset', asyncHandler(async (req, res) => {
  await db.resetDemo();
  res.json({ ok: true });
}));

module.exports = router;
