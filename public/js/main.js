// Trae el contenido de /api/content y arma toda la página con eso.

function apiUrl(path) {
  return (window.API_BASE || '') + path;
}

function resolveImageUrl(url) {
  if (!url) return url;
  if (url.startsWith('/uploads/')) return apiUrl(url);
  return url;
}

// Un solo acento de color para todos los íconos de servicios (a propósito: el sitio
// anterior los tenía en ocho colores random sin relación entre sí). Varían la forma,
// no el color - el color lo pone el CSS (.servicio-icon), no cada SVG.
const SERVICE_ICONS = [
  '<path d="M12 3 3 7v6c0 5 4 8.5 9 10 5-1.5 9-5 9-10V7l-9-4Z"/>', // capacidad/protección
  '<path d="M12 3v18M5 7l7-4 7 4M5 17l7 4 7-4M3 12h18"/>', // clima/confort
  '<circle cx="12" cy="12" r="5"/><path d="M12 1v3M12 20v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M1 12h3M20 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>', // iluminación
  '<path d="M9 18V5l10-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="16" cy="16" r="3"/>', // música/DJ
  '<path d="M4 21c0-4 4-6 8-6s8 2 8 6M12 3a4 4 0 0 1 4 4c0 2-2 4-4 6-2-2-4-4-4-6a4 4 0 0 1 4-4Z"/>' // efectos/momento especial
];

function iconSvg(index) {
  const path = SERVICE_ICONS[index % SERVICE_ICONS.length];
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
}

const SOCIAL_ICONS = {
  whatsapp: '<path d="M16.02 3C9.4 3 4 8.36 4 15c0 2.36.68 4.56 1.86 6.42L4 29l7.77-1.83A11.9 11.9 0 0 0 16.02 27C22.63 27 28 21.64 28 15S22.63 3 16.02 3Zm6.94 16.98c-.3.85-1.72 1.63-2.38 1.7-.63.08-1.4.35-4.68-1.02-3.93-1.65-6.46-5.63-6.66-5.89-.19-.26-1.6-2.13-1.6-4.07 0-1.94.99-2.9 1.35-3.29.35-.4.77-.5 1.02-.5.26 0 .52 0 .74.01.24.02.56-.09.87.68.31.78 1.06 2.7 1.16 2.9.1.19.16.42.03.68-.13.26-.2.42-.4.65-.19.23-.41.51-.58.68-.19.19-.4.4-.17.79.23.4 1.02 1.72 2.2 2.79 1.51 1.38 2.78 1.81 3.17 2.01.4.19.63.16.87-.1.24-.26 1-1.19 1.27-1.6.26-.4.52-.33.87-.19.34.13 2.2 1.06 2.57 1.25.38.19.63.29.72.45.1.16.1.94-.2 1.8Z"/>',
  instagram: '<path d="M16 3.6c3.7 0 4.14.01 5.6.08 1.35.06 2.2.26 2.72.44a5.4 5.4 0 0 1 1.98 1.28 5.4 5.4 0 0 1 1.28 1.98c.18.51.38 1.37.44 2.72.07 1.46.08 1.9.08 5.6s-.01 4.14-.08 5.6c-.06 1.35-.26 2.2-.44 2.72a5.4 5.4 0 0 1-1.28 1.98 5.4 5.4 0 0 1-1.98 1.28c-.51.18-1.37.38-2.72.44-1.46.07-1.9.08-5.6.08s-4.14-.01-5.6-.08c-1.35-.06-2.2-.26-2.72-.44a5.4 5.4 0 0 1-1.98-1.28 5.4 5.4 0 0 1-1.28-1.98c-.18-.51-.38-1.37-.44-2.72-.07-1.46-.08-1.9-.08-5.6s.01-4.14.08-5.6c.06-1.35.26-2.2.44-2.72a5.4 5.4 0 0 1 1.28-1.98 5.4 5.4 0 0 1 1.98-1.28c.51-.18 1.37-.38 2.72-.44C11.86 3.6 12.3 3.6 16 3.6Zm0 2.4c-3.63 0-4.05.01-5.48.08-1.12.05-1.73.24-2.13.39-.54.21-.92.46-1.32.86-.4.4-.65.78-.86 1.32-.15.4-.34 1.01-.39 2.13-.07 1.43-.08 1.85-.08 5.48s.01 4.05.08 5.48c.05 1.12.24 1.73.39 2.13.21.54.46.92.86 1.32.4.4.78.65 1.32.86.4.15 1.01.34 2.13.39 1.43.07 1.85.08 5.48.08s4.05-.01 5.48-.08c1.12-.05 1.73-.24 2.13-.39.54-.21.92-.46 1.32-.86.4-.4.65-.78.86-1.32.15-.4.34-1.01.39-2.13.07-1.43.08-1.85.08-5.48s-.01-4.05-.08-5.48c-.05-1.12-.24-1.73-.39-2.13a3.6 3.6 0 0 0-.86-1.32 3.6 3.6 0 0 0-1.32-.86c-.4-.15-1.01-.34-2.13-.39-1.43-.07-1.85-.08-5.48-.08Zm0 4.1a5.9 5.9 0 1 1 0 11.8 5.9 5.9 0 0 1 0-11.8Zm0 2.4a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Zm6.13-2.68a1.38 1.38 0 1 1-2.76 0 1.38 1.38 0 0 1 2.76 0Z"/>',
  facebook: '<path d="M18.6 28V16.9h3.72l.56-4.32H18.6V9.86c0-1.25.35-2.1 2.14-2.1h2.28V3.9c-.4-.05-1.75-.17-3.32-.17-3.29 0-5.54 2.01-5.54 5.7v3.18H10.4v4.32h3.76V28h4.44Z"/>',
  link: '<path d="M13.4 18.6a1.5 1.5 0 0 1 0-2.12l3-3a1.5 1.5 0 1 1 2.12 2.12l-3 3a1.5 1.5 0 0 1-2.12 0Zm-3.35 3.35 2-2a1.5 1.5 0 1 0-2.12-2.12l-2 2a3.5 3.5 0 0 1-4.95-4.95l4-4a3.5 3.5 0 0 1 4.95 0 1.5 1.5 0 0 0 2.12-2.12 6.5 6.5 0 0 0-9.19 0l-4 4a6.5 6.5 0 0 0 9.19 9.19Zm11.3-11.3a6.5 6.5 0 0 0-9.19 0l-2 2a1.5 1.5 0 1 0 2.12 2.12l2-2a3.5 3.5 0 1 1 4.95 4.95l-4 4a3.5 3.5 0 0 1-4.95 0 1.5 1.5 0 1 0-2.12 2.12 6.5 6.5 0 0 0 9.19 0l4-4a6.5 6.5 0 0 0 0-9.19Z"/>'
};

function socialIconSvg(platform) {
  const path = SOCIAL_ICONS[platform] || SOCIAL_ICONS.link;
  return `<svg viewBox="0 0 32 32" aria-hidden="true">${path}</svg>`;
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value || '';
}

function paragraphs(text) {
  return (text || '')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

function renderServicios(text) {
  const el = document.getElementById('servicios-list');
  if (!el) return;
  el.innerHTML = '';
  paragraphs(text).forEach((item, index) => {
    const card = document.createElement('div');
    card.className = 'servicio-card';
    const icon = document.createElement('div');
    icon.className = 'servicio-icon';
    icon.innerHTML = iconSvg(index);
    const p = document.createElement('p');
    p.textContent = item;
    card.appendChild(icon);
    card.appendChild(p);
    el.appendChild(card);
  });
}

function renderGallery(items) {
  const el = document.getElementById('gallery');
  if (!el) return;
  el.innerHTML = '';

  if (items.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'gallery-empty';
    empty.textContent = 'Todavía no hay fotos acá - subí una desde el panel y mirá cómo aparece al instante.';
    el.appendChild(empty);
    return;
  }

  items.forEach((item, index) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    const img = document.createElement('img');
    img.src = resolveImageUrl(item.url);
    img.alt = item.alt || 'Foto del salón';
    img.loading = 'lazy';
    btn.appendChild(img);
    btn.addEventListener('click', () => openLightbox(items, index));
    el.appendChild(btn);
  });
}

// Logo si hay uno cargado, o el nombre del sitio como texto si todavía no se subió
// ninguno - así la demo se ve prolija desde el primer segundo, sin logo roto.
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

// Foto de portada si hay una cargada, o un placeholder invitando a subir una - así se
// ve intencional (no roto) mientras no se cargó ninguna imagen todavía.
function renderHeroImage(content) {
  const img = document.getElementById('banner-image');
  const placeholder = document.getElementById('hero-placeholder');
  if (content.banner_image) {
    img.src = resolveImageUrl(content.banner_image);
    img.alt = content.site_name || '';
    img.hidden = false;
    if (placeholder) placeholder.hidden = true;
  } else {
    img.hidden = true;
    if (placeholder) placeholder.hidden = false;
  }
}

function renderTestimonials(items) {
  const grid = document.getElementById('testimonials-grid');
  if (!grid) return;
  grid.innerHTML = '';

  if (items.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'testimonials-empty';
    empty.textContent = 'Todavía no hay opiniones publicadas - ¡sé el primero en dejar la tuya!';
    grid.appendChild(empty);
    return;
  }

  items.forEach((item) => {
    const card = document.createElement('div');
    card.className = 'testimonial-card';

    if (item.rating) {
      const stars = document.createElement('div');
      stars.className = 'testimonial-stars';
      stars.textContent = '★'.repeat(item.rating) + '☆'.repeat(5 - item.rating);
      card.appendChild(stars);
    }

    const text = document.createElement('p');
    text.className = 'testimonial-text';
    text.textContent = `"${item.text}"`;
    card.appendChild(text);

    const name = document.createElement('p');
    name.className = 'testimonial-name';
    name.textContent = `— ${item.name}`;
    card.appendChild(name);

    grid.appendChild(card);
  });
}

function renderSocial(items) {
  const row = document.getElementById('social-row');
  const waFloat = document.getElementById('whatsapp-float');
  const heroWa = document.getElementById('hero-whatsapp');

  if (row) {
    row.innerHTML = '';
    items.forEach((item) => {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = item.url;
      a.target = '_blank';
      a.rel = 'noopener';
      a.setAttribute('aria-label', item.label);
      a.innerHTML = socialIconSvg(item.platform);
      li.appendChild(a);
      row.appendChild(li);
    });
  }

  const whatsapp = items.find((i) => i.platform === 'whatsapp');
  if (waFloat) {
    if (whatsapp) { waFloat.href = whatsapp.url; waFloat.hidden = false; }
    else { waFloat.hidden = true; }
  }
  if (heroWa) {
    if (whatsapp) { heroWa.href = whatsapp.url; heroWa.hidden = false; }
    else { heroWa.hidden = true; }
  }
}

// Acepta un link de YouTube (watch, youtu.be, shorts, o ya embed) o de Instagram (reel o
// post) y lo devuelve listo para meter en un <iframe> - ambos bloquean mostrar su página
// normal "incrustada" en otro sitio, así que hace falta el formato /embed/ de cada uno.
// También devuelve si conviene mostrarlo vertical (Shorts y Reels lo son casi siempre).
function parseVideoUrl(url) {
  if (!url) return null;
  const trimmed = url.trim();

  let match =
    trimmed.match(/youtu\.be\/([a-zA-Z0-9_-]{6,})/) ||
    trimmed.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{6,})/) ||
    trimmed.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{6,})/) ||
    trimmed.match(/[?&]v=([a-zA-Z0-9_-]{6,})/);
  if (match) {
    return {
      embedUrl: `https://www.youtube.com/embed/${match[1]}`,
      vertical: /youtube\.com\/shorts\//.test(trimmed)
    };
  }

  match = trimmed.match(/instagram\.com\/(reel|p)\/([a-zA-Z0-9_-]+)/);
  if (match) {
    const [, kind, id] = match;
    return {
      embedUrl: `https://www.instagram.com/${kind}/${id}/embed`,
      vertical: kind === 'reel'
    };
  }

  return null;
}

function renderProximoEvento(content) {
  const section = document.getElementById('proximo-evento');
  if (!section) return;

  if (content.proximo_evento_enabled !== '1') {
    section.hidden = true;
    return;
  }

  setText('proximo-evento-label', content.proximo_evento_label);
  setText('proximo-evento-text', content.proximo_evento_text);

  const img = document.getElementById('proximo-evento-image');
  const videoWrap = document.getElementById('proximo-evento-video-wrap');
  const video = document.getElementById('proximo-evento-video');

  if (content.proximo_evento_media_type === 'video' && content.proximo_evento_video_url) {
    const parsed = parseVideoUrl(content.proximo_evento_video_url);
    img.hidden = true;
    video.src = parsed ? parsed.embedUrl : content.proximo_evento_video_url;
    // Vertical si el campo lo tiene tildado (el admin lo puede forzar a mano) O si el
    // link pegado era de Shorts - no exigimos las dos cosas, porque el campo puede
    // haber quedado en su valor por defecto ("0") en contenido cargado antes de que
    // existiera esta casilla.
    const isVertical = content.proximo_evento_vertical === '1' || Boolean(parsed && parsed.vertical);
    videoWrap.classList.toggle('vertical', isVertical);
    videoWrap.hidden = false;
  } else if (content.proximo_evento_image) {
    videoWrap.hidden = true;
    video.src = '';
    img.src = resolveImageUrl(content.proximo_evento_image);
    img.hidden = false;
  } else {
    // Activado pero sin foto ni video cargados todavía: mejor no mostrar nada roto.
    section.hidden = true;
    return;
  }

  section.hidden = false;
}

function renderNavLabels(content) {
  document.querySelectorAll('[data-nav-label]').forEach((el) => {
    const key = el.getAttribute('data-nav-label');
    if (content[key]) el.textContent = content[key];
  });
}

// ---------- Lightbox ----------

let lightboxItems = [];
let lightboxIndex = 0;

function openLightbox(items, index) {
  lightboxItems = items;
  lightboxIndex = index;
  updateLightboxImage();
  document.getElementById('lightbox').hidden = false;
  document.body.style.overflow = 'hidden';
}
function closeLightbox() {
  document.getElementById('lightbox').hidden = true;
  document.body.style.overflow = '';
}
function updateLightboxImage() {
  const item = lightboxItems[lightboxIndex];
  const img = document.getElementById('lightbox-img');
  img.src = resolveImageUrl(item.url);
  img.alt = item.alt || '';
}
function stepLightbox(delta) {
  lightboxIndex = (lightboxIndex + delta + lightboxItems.length) % lightboxItems.length;
  updateLightboxImage();
}
function initLightbox() {
  document.getElementById('lightbox-close').addEventListener('click', closeLightbox);
  document.getElementById('lightbox-prev').addEventListener('click', () => stepLightbox(-1));
  document.getElementById('lightbox-next').addEventListener('click', () => stepLightbox(1));
  document.getElementById('lightbox').addEventListener('click', (e) => {
    if (e.target.id === 'lightbox') closeLightbox();
  });
  document.addEventListener('keydown', (e) => {
    if (document.getElementById('lightbox').hidden) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') stepLightbox(-1);
    if (e.key === 'ArrowRight') stepLightbox(1);
  });
}

// ---------- Nav móvil ----------

function initNav() {
  const toggle = document.getElementById('nav-toggle');
  const links = document.getElementById('nav-links');
  toggle.addEventListener('click', () => {
    const open = links.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(open));
  });
  links.querySelectorAll('a').forEach((a) => {
    a.addEventListener('click', () => {
      links.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    });
  });
}

// ---------- Formulario de testimonios ----------

function initTestimonialForm() {
  const form = document.getElementById('testimonial-form');
  const status = document.getElementById('testimonial-status');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    status.textContent = 'Enviando...';
    status.className = 'form-status';

    const payload = {
      name: form.name.value.trim(),
      rating: form.rating.value || null,
      text: form.text.value.trim(),
      website: form.website.value // honeypot
    };

    try {
      const res = await fetch(apiUrl('/api/testimonials'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo enviar la opinión.');

      status.textContent = '¡Gracias! Tu opinión va a revisarse antes de publicarse en el sitio.';
      status.className = 'form-status ok';
      form.reset();
    } catch (err) {
      status.textContent = err.message || 'Ocurrió un error al enviar tu opinión.';
      status.className = 'form-status error';
    }
  });
}

// ---------- Formulario de contacto ----------

function initContactForm() {
  const form = document.getElementById('contact-form');
  const status = document.getElementById('form-status');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    status.textContent = 'Enviando...';
    status.className = 'form-status';

    const payload = {
      name: form.name.value.trim(),
      email: form.email.value.trim(),
      phone: form.phone.value.trim(),
      message: form.message.value.trim()
    };

    try {
      const res = await fetch(apiUrl('/api/contact'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo enviar el mensaje.');

      status.textContent = '¡Gracias! Tu mensaje fue enviado, te vamos a responder a la brevedad.';
      status.className = 'form-status ok';
      form.reset();
    } catch (err) {
      status.textContent = err.message || 'Ocurrió un error al enviar el mensaje.';
      status.className = 'form-status error';
    }
  });
}

// ---------- Carga inicial ----------

async function loadSite() {
  const res = await fetch(apiUrl('/api/content'));
  const { content, gallery, social, testimonials } = await res.json();

  document.title = content.site_name || 'Demo — FrontyBack';
  setText('footer-brand', content.site_name);
  setText('footer-text', content.footer_text);
  document.getElementById('footer-year').textContent = String(new Date().getFullYear());

  renderBrand(content);
  renderHeroImage(content);
  setText('site-tagline', content.site_tagline);
  setText('banner-title', content.banner_title);
  setText('banner-subtitle', content.banner_subtitle);

  setText('stat-1-number', content.stat_1_number);
  setText('stat-1-label', content.stat_1_label);
  setText('stat-2-number', content.stat_2_number);
  setText('stat-2-label', content.stat_2_label);
  setText('stat-3-number', content.stat_3_number);
  setText('stat-3-label', content.stat_3_label);

  setText('servicios-heading', content.servicios_heading);
  setText('servicios-subheading', content.servicios_subheading);
  renderServicios(content.servicios_text);

  setText('salon-heading', content.salon_heading);
  setText('salon-subheading', content.salon_subheading);
  setText('salon-text', content.salon_text);

  setText('testimonios-heading', content.testimonios_heading);
  setText('testimonios-subheading', content.testimonios_subheading);
  setText('testimonios-form-heading', content.testimonios_form_heading);
  setText('testimonios-form-text', content.testimonios_form_text);

  setText('contact-heading', content.contact_heading);
  setText('contact-subheading', content.contact_subheading);
  setText('contact-address', content.contact_address);
  setText('contact-phone', content.contact_phone);
  setText('contact-email', content.contact_email);
  setText('contact-hours', content.contact_hours);

  renderNavLabels(content);
  renderProximoEvento(content);
  renderGallery(gallery);
  renderTestimonials(testimonials);
  renderSocial(social);
}

document.addEventListener('DOMContentLoaded', () => {
  initNav();
  initLightbox();
  initContactForm();
  initTestimonialForm();
  loadSite().catch((err) => {
    console.error('No se pudo cargar el contenido del sitio:', err);
  });
});
