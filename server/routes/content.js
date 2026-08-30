// Ruta pública: todo lo que necesita la página principal en una sola llamada.

const express = require('express');
const db = require('../db');
const asyncHandler = require('../asyncHandler');

const router = express.Router();

router.get('/', asyncHandler(async (req, res) => {
  const mongo = db.getDb();

  const contentDoc = await mongo.collection('content').findOne({ _id: 'main' });
  const { _id, ...content } = contentDoc || {};

  const gallery = await mongo
    .collection('gallery_images')
    .find({}, { projection: { url: 1, alt_text: 1 } })
    .sort({ position: 1, _id: 1 })
    .toArray();

  const social = await mongo
    .collection('social_links')
    .find({ visible: true }, { projection: { platform: 1, label: 1, url: 1 } })
    .sort({ position: 1, _id: 1 })
    .toArray();

  // Solo los testimonios aprobados son públicos - los pendientes/rechazados no salen acá.
  const testimonials = await mongo
    .collection('testimonials')
    .find({ status: 'approved' }, { projection: { name: 1, rating: 1, text: 1 } })
    .sort({ position: 1, _id: -1 })
    .toArray();

  res.json({
    content,
    gallery: gallery.map(({ _id, url, alt_text }) => ({ id: _id, url, alt: alt_text })),
    social: social.map(({ _id, platform, label, url }) => ({ id: _id, platform, label, url })),
    testimonials: testimonials.map(({ _id, name, rating, text }) => ({ id: _id, name, rating, text }))
  });
}));

module.exports = router;
