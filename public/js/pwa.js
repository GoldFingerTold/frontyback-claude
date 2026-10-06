// Instalación como PWA, compartido entre el sitio público y el panel de administración
// (cada uno con su propio manifest - ver server/index.js - así que cada uno se instala
// como su propia app). El botón propio evita depender de que alguien encuentre la opción
// escondida en el menú del navegador.

if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});

let promptDeInstalacion = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  promptDeInstalacion = e;
  const boton = document.getElementById('instalar-btn');
  if (boton) boton.style.display = 'block';
});

document.addEventListener('DOMContentLoaded', () => {
  const boton = document.getElementById('instalar-btn');
  if (!boton) return;

  boton.addEventListener('click', async () => {
    if (!promptDeInstalacion) return;
    promptDeInstalacion.prompt();
    await promptDeInstalacion.userChoice;
    promptDeInstalacion = null;
    boton.style.display = 'none';
  });

  window.addEventListener('appinstalled', () => {
    boton.style.display = 'none';
  });

  const esIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const yaInstalada = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
  if (esIOS && !yaInstalada) {
    boton.style.display = 'block';
    const texto = document.getElementById('instalar-btn-texto');
    if (texto) texto.textContent = 'Instalar: Compartir → Agregar a inicio';
  }
});
