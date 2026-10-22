const consentKey = 'jabas-analytics-consent-v1';
let consent = null;
let started = false;
try { consent = localStorage.getItem(consentKey); } catch {}

function startAnalytics() {
  if (started || consent !== 'yes') return;
  started = true;
  window.clarity = window.clarity || function () {
    (window.clarity.q = window.clarity.q || []).push(arguments);
  };
  window.clarity('consentv2', { ad_Storage: 'denied', analytics_Storage: 'granted' });
  const campaign = new URLSearchParams(location.search).get('utm_campaign');
  if (['presentacion_jabas', 'prueba_interna'].includes(campaign)) {
    window.clarity('set', 'campana_demo', campaign);
  }
  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://www.clarity.ms/tag/z1vlwu0fw7';
  document.head.append(script);
}

const notice = document.getElementById('analytics-notice');
if (notice) {
  notice.hidden = consent === 'yes' || consent === 'no';
  document.getElementById('analytics-preferences')?.addEventListener('click', () => {
    notice.hidden = false;
    document.getElementById('analytics-accept')?.focus();
  });
  const choose = value => {
    consent = value;
    try { localStorage.setItem(consentKey, value); } catch {}
    notice.hidden = true;
    if (value === 'yes') startAnalytics();
    else if (started) {
      window.clarity('consentv2', { ad_Storage: 'denied', analytics_Storage: 'denied' });
      // Reload removes the recording script entirely after withdrawing consent.
      location.reload();
    }
  };
  document.getElementById('analytics-accept')?.addEventListener('click', () => choose('yes'));
  document.getElementById('analytics-reject')?.addEventListener('click', () => choose('no'));
}
startAnalytics();

// Only fixed event names are sent. Never pass form values or WhatsApp URLs.
const events = new Set([
  'abrir_carrito', 'agregar_producto', 'quitar_producto', 'cambiar_cantidad',
  'filtrar_menu', 'elegir_envio', 'elegir_retiro', 'continuar_whatsapp',
  'consultar_whatsapp', 'ver_catalogo_whatsapp', 'ver_menu', 'ver_como_pedir'
]);

export function track(event) {
  if (consent !== 'yes' || !events.has(event)) return;
  try {
    if (typeof window.clarity === 'function') window.clarity('event', event);
  } catch { /* Analytics must never interrupt an order. */ }
}

document.addEventListener('click', event => {
  const link = event.target.closest('a[href]');
  if (!link) return;
  const href = link.getAttribute('href');
  if (href === '#menu') track('ver_menu');
  else if (href === '#como-pedir') track('ver_como_pedir');
  else if (href === 'https://wa.me/5491121709260') track('consultar_whatsapp');
  else if (href === 'https://wa.me/c/5491121709260') track('ver_catalogo_whatsapp');
});
