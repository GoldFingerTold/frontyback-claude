// Ruta pública: la lista de categorías con sus productos/precios, para la página
// /productos (a la que apunta el QR), y el QR en sí (público a propósito: se muestra en
// la página principal para quien lo quiera escanear, así que no puede vivir detrás del
// login de admin - si viviera ahí, un visitante sin sesión ni lo vería).

const express = require('express');
const QRCode = require('qrcode');
const db = require('../db');
const asyncHandler = require('../asyncHandler');

const router = express.Router();

// Código QR (PNG) que apunta a esta misma página /productos - se arma la URL desde el
// propio request, así funciona igual en local, en Render o en cualquier dominio sin
// tener que hardcodear nada.
router.get('/qr', asyncHandler(async (req, res) => {
  const url = `${req.protocol}://${req.get('host')}/productos`;
  const buffer = await QRCode.toBuffer(url, { width: 600, margin: 2 });
  res.set('Content-Type', 'image/png');
  res.send(buffer);
}));

router.get('/', asyncHandler(async (req, res) => {
  const mongo = db.getDb();

  const categories = await mongo.collection('product_categories').find().sort({ position: 1, _id: 1 }).toArray();
  const products = await mongo.collection('products').find().sort({ position: 1, _id: 1 }).toArray();

  const byCategory = new Map();
  for (const p of products) {
    const key = String(p.category_id);
    if (!byCategory.has(key)) byCategory.set(key, []);
    byCategory.get(key).push({ id: p._id, name: p.name, price: p.price, image: p.image_url });
  }

  res.json({
    categories: categories.map((c) => ({
      id: c._id,
      name: c.name,
      products: byCategory.get(String(c._id)) || []
    }))
  });
}));

module.exports = router;
