// Ruta pública: la lista de categorías con sus productos/precios, para la página
// /productos (a la que apunta el QR que se descarga desde el panel).

const express = require('express');
const db = require('../db');
const asyncHandler = require('../asyncHandler');

const router = express.Router();

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
