// Ruta pública: recibe el formulario de contacto y lo guarda para verse en el panel
// (no envía email: no hay credenciales SMTP configuradas. Si más adelante se quiere
// notificar por correo, se puede sumar nodemailer acá).

const express = require('express');
const db = require('../db');
const asyncHandler = require('../asyncHandler');

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

  res.json({ ok: true });
}));

module.exports = router;
