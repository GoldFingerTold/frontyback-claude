// Ruta pública: recibe testimonios del formulario del sitio. Quedan "pending" y no se
// muestran en la web hasta que se aprueban desde /admin (ver server/routes/admin.js).

const express = require('express');
const db = require('../db');
const asyncHandler = require('../asyncHandler');
const notifier = require('../email');

const router = express.Router();

const MAX_TEXT_LENGTH = 600;

router.post('/', asyncHandler(async (req, res) => {
  const { name, rating, text, website } = req.body || {};

  // Campo "website" es un honeypot: un campo oculto por CSS que ningún humano completa,
  // pero que los bots de formularios suelen rellenar solos. Si viene con algo, se ignora
  // la petición como si hubiera funcionado (para no darle pistas al bot).
  if (website) {
    return res.json({ ok: true });
  }

  if (!name || !name.trim()) return res.status(400).json({ error: 'Falta el nombre.' });
  if (!text || !text.trim()) return res.status(400).json({ error: 'Falta el testimonio.' });
  if (text.trim().length > MAX_TEXT_LENGTH) {
    return res.status(400).json({ error: `El texto es muy largo (máx. ${MAX_TEXT_LENGTH} caracteres).` });
  }

  let ratingValue = null;
  if (rating !== undefined && rating !== null && rating !== '') {
    const n = Number(rating);
    if (!Number.isInteger(n) || n < 1 || n > 5) {
      return res.status(400).json({ error: 'La puntuación tiene que ser un número entero de 1 a 5.' });
    }
    ratingValue = n;
  }

  await db.getDb().collection('testimonials').insertOne({
    name: name.trim(),
    rating: ratingValue,
    text: text.trim(),
    status: 'pending',
    position: 0,
    created_at: new Date()
  });

  await notifier.notify(
    `Nuevo testimonio de ${name.trim()} (pendiente de aprobar)`,
    notifier.renderFields([
      ['Nombre', name.trim()],
      ['Puntuación', ratingValue],
      ['Texto', text.trim()]
    ])
  );

  res.json({ ok: true });
}));

module.exports = router;
