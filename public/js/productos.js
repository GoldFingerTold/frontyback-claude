// Página /productos: trae la marca (logo/nombre) desde /api/content para que la barra
// de navegación y el pie coincidan con el resto del sitio, y la lista de categorías +
// productos desde /api/products.

function apiUrl(path) {
  return (window.API_BASE || '') + path;
}

function resolveImageUrl(url) {
  if (!url) return url;
  if (url.startsWith('/uploads/')) return apiUrl(url);
  return url;
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value || '';
}

function renderBrand(content) {
  const logo = document.getElementById('nav-logo');
  const brandText = document.getElementById('nav-brand-text');
  if (content.logo_image) {
    logo.src = resolveImageUrl(content.logo_image);
    logo.alt = content.site_name || '';
    logo.hidden = false;
    if (brandText) brandText.hidden = true;
  } else {
    logo.hidden = true;
    if (brandText) {
      brandText.textContent = content.site_name || '';
      brandText.hidden = false;
    }
  }
}

function renderNavLabels(content) {
  document.querySelectorAll('[data-nav-label]').forEach((el) => {
    const key = el.getAttribute('data-nav-label');
    if (content[key]) el.textContent = content[key];
  });
}

function renderProductos(categories) {
  const list = document.getElementById('productos-list');
  list.innerHTML = '';

  const withProducts = categories.filter((c) => c.products.length > 0);
  if (withProducts.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'gallery-empty';
    empty.textContent = 'Todavía no hay productos cargados.';
    list.appendChild(empty);
    return;
  }

  withProducts.forEach((cat) => {
    const section = document.createElement('div');
    section.className = 'productos-categoria';

    const h2 = document.createElement('h2');
    h2.className = 'productos-categoria-title';
    h2.textContent = cat.name;
    section.appendChild(h2);

    const grid = document.createElement('div');
    grid.className = 'productos-grid';
    cat.products.forEach((p) => {
      const card = document.createElement('div');
      card.className = 'producto-card';

      if (p.image) {
        const img = document.createElement('img');
        img.src = resolveImageUrl(p.image);
        img.alt = p.name;
        img.loading = 'lazy';
        card.appendChild(img);
      }

      const body = document.createElement('div');
      body.className = 'producto-card-body';
      const name = document.createElement('p');
      name.className = 'producto-nombre';
      name.textContent = p.name;
      body.appendChild(name);
      if (p.price) {
        const price = document.createElement('p');
        price.className = 'producto-precio';
        price.textContent = p.price;
        body.appendChild(price);
      }
      card.appendChild(body);

      grid.appendChild(card);
    });
    section.appendChild(grid);
    list.appendChild(section);
  });
}

async function loadPage() {
  const [contentRes, productsRes] = await Promise.all([
    fetch(apiUrl('/api/content')),
    fetch(apiUrl('/api/products'))
  ]);
  const { content } = await contentRes.json();
  const { categories } = await productsRes.json();

  document.title = `Productos — ${content.site_name || ''}`;
  renderBrand(content);
  renderNavLabels(content);
  setText('productos-title', content.nav_productos_label ? `${content.nav_productos_label}` : 'Nuestros productos');
  setText('footer-brand', content.site_name);
  setText('footer-text', content.footer_text);
  document.getElementById('footer-year').textContent = String(new Date().getFullYear());

  renderProductos(categories);
}

document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.getElementById('nav-toggle');
  const links = document.getElementById('nav-links');
  toggle.addEventListener('click', () => {
    const open = links.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(open));
  });

  loadPage().catch((err) => {
    console.error('No se pudo cargar la página de productos:', err);
  });
});
