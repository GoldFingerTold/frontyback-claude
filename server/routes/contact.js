// Ruta pública: recibe el formulario de contacto, lo guarda para verse en el panel, y
// avisa por email (ver server/email.js - si no está configurado, simplemente no manda
// el aviso, pero el mensaje queda guardado igual).

const express = require('express');
const db = require('../db');
const asyncHandler = require('../asyncHandler');
const notifier = require('../email');

const router = express.Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.post('/', asyncHandler(async (req, res) => {
  const { name, email, phone, message } = req.body || {};

  if (!name || !name.trim()) return res.status(400).json({ error: 'Falta el nombre.' });
  if (!email || !EMAIL_RE.test(email.trim())) return res.status(400).json({ error: 'El email no es válido.' });
  if (!message || !message.trim()) return res.status(400).json({ error: 'Falta el mensaje.' });

  await db.getDb().collection('contact_messages').insertOne({
    name: name.trim(),
    email: email.trim(),
    phone: (phone || '').trim(),
    message: message.trim(),
    created_at: new Date(),
    is_read: false
  });

  await notifier.notify(
    `Nueva consulta de ${name.trim()}`,
    notifier.renderFields([
      ['Nombre', name.trim()],
      ['Email', email.trim()],
      ['Teléfono', phone],
      ['Mensaje', message.trim()]
    ])
  );

  res.json({ ok: true });
}));

module.exports = router;
