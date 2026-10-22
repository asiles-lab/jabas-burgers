import { track } from './analytics.mjs';
import { calculateOrder, buildOrderMessage, orderUrl } from './order.mjs';
const $ = selector => document.querySelector(selector);
const money = value => new Intl.NumberFormat('es-AR', { style:'currency', currency:'ARS', maximumFractionDigits:0 }).format(value);
const escape = value => String(value ?? '').replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
let catalog = [], store = {}, cart = {}, filter = 'Todos', toastTimer;
const dialog = $('#cart-dialog');
function notify(message) { $('#toast').textContent = message; $('#toast').classList.add('visible'); clearTimeout(toastTimer); toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), 2300); }
function photo(product, className = '') { return product.image && product.id !== 'dip-mayonesa' ? `<img class="${className}" src="${escape(product.image)}" alt="${escape(product.name)}" loading="lazy">` : `<div class="${className || 'missing-photo'}" aria-hidden="true">JABA’S</div>`; }
function renderProducts() {
  const visible = catalog.filter(product => product.id !== 'dip-mayonesa' && (filter === 'Todos' || product.category === filter));
  $('#products').innerHTML = visible.length ? visible.map(product => {
    const combinedDip = product.id === 'dip-ketchup';
    const name = combinedDip ? 'Dip de ketchup o mayonesa' : product.name;
    const description = combinedDip ? '100 g. Elegí tu dip.' : product.description;
    const controls = combinedDip ? '<div class="dip-options"><button class="add-button" data-add="dip-ketchup" aria-label="Agregar dip de ketchup">Ketchup <span aria-hidden="true">+</span></button><button class="add-button" data-add="dip-mayonesa" aria-label="Agregar dip de mayonesa">Mayonesa <span aria-hidden="true">+</span></button></div>' : `<button class="add-button" data-add="${escape(product.id)}" aria-label="Agregar ${escape(product.name)}">Agregar <span aria-hidden="true">+</span></button>`;
    return `<article class="product"><div class="product-image">${photo(product)}<span class="category-tag">${escape(product.category)}</span></div><div class="product-info"><h3>${escape(name)}</h3><p>${escape(description)}</p><div class="product-bottom${combinedDip ? ' dip-bottom' : ''}"><strong class="price">${money(product.price)}</strong>${controls}</div></div></article>`;
  }).join('') : '<p class="loading">El menú no está disponible en este momento. Podés consultar el catálogo de WhatsApp al pie de la página.</p>';
  document.querySelectorAll('[data-filter]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.filter === filter)));
}
function updateCart() {
  try { localStorage.setItem('jabas-cart-v1', JSON.stringify(cart)); } catch {}
  const order = calculateOrder(catalog, cart);
  const count = order.items.reduce((total, product) => total + product.quantity, 0);
  document.querySelectorAll('[data-count]').forEach(element => element.textContent = count);
  document.querySelectorAll('[data-total]').forEach(element => element.textContent = money(order.subtotal));
  $('.mobile-cart').hidden = !count; document.body.classList.toggle('has-cart', count > 0);
  $('#checkout-area').hidden = !count;
  $('#cart-items').innerHTML = count ? order.items.map(product => `<article class="cart-item">${photo(product, 'cart-thumb')}<div><div class="cart-item-top"><h3>${escape(product.name)}</h3><button class="remove" data-remove="${escape(product.id)}" aria-label="Quitar ${escape(product.name)}">×</button></div><div class="cart-item-bottom"><div class="quantity"><button data-change="${escape(product.id)}" data-delta="-1" aria-label="Restar una unidad de ${escape(product.name)}">−</button><span aria-label="Cantidad">${product.quantity}</span><button data-change="${escape(product.id)}" data-delta="1" aria-label="Sumar una unidad de ${escape(product.name)}" ${product.quantity >= 30 ? 'disabled' : ''}>+</button></div><strong>${money(product.subtotal)}</strong></div></div></article>`).join('') : '<div class="cart-empty"><h3>TU ANTOJO EMPIEZA ACÁ.</h3><p>Todavía no sumaste nada.<br>Hay una burger esperando por vos.</p><button class="button primary" data-browse>Explorar el menú ↗</button></div>';
  $('#form-error').textContent = '';
}
function changeQuantity(id, delta) {
  if (!catalog.some(product => product.id === id)) return;
  const previous = cart[id] || 0;
  const next = Math.min(30, Math.max(0, previous + delta));
  if (next) cart[id] = next; else delete cart[id];
  updateCart();
  return next > previous;
}
function changeMethod() {
  const pickup = $('#checkout-form').elements.method.value === 'pickup';
  $('#delivery-fields').hidden = pickup; $('#customer-address').required = !pickup;
  $('#pickup-fields').hidden = !pickup;
  $('#pickup-address').textContent = store.pickupAddress || 'Estamos confirmando la dirección del local. Consultala por WhatsApp antes de pasar a retirar.';
  $('.submit-order').disabled = pickup && !store.pickupAddress;
  $('#form-error').textContent = pickup && !store.pickupAddress ? 'Por el momento, coordiná el retiro desde el enlace “Consultar por WhatsApp” de la página.' : '';
}
document.addEventListener('click', event => {
  const open = event.target.closest('[data-open-cart]');
  if (open) { updateCart(); changeMethod(); dialog.showModal(); track('abrir_carrito'); return; }
  const add = event.target.closest('[data-add]');
  if (add) { const added = changeQuantity(add.dataset.add, 1); if (added) track('agregar_producto'); notify(added ? 'Listo, lo sumamos a tu pedido.' : 'Máximo 30 unidades por producto.'); return; }
  const category = event.target.closest('[data-filter]');
  if (category) { filter = category.dataset.filter; renderProducts(); track('filtrar_menu'); return; }
  const quantity = event.target.closest('[data-change]');
  if (quantity) { changeQuantity(quantity.dataset.change, Number(quantity.dataset.delta)); changeMethod(); track('cambiar_cantidad'); return; }
  const remove = event.target.closest('[data-remove]');
  if (remove) { delete cart[remove.dataset.remove]; updateCart(); changeMethod(); track('quitar_producto'); return; }
  if (event.target.closest('[data-browse]')) { dialog.close(); $('#menu').scrollIntoView({ behavior:'smooth' }); }
});
$('#close-cart').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => { if (event.target === dialog) { const box = dialog.getBoundingClientRect(); if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close(); } });
$('#checkout-form').addEventListener('change', event => { if (event.target.name === 'method') { changeMethod(); track(event.target.value === 'pickup' ? 'elegir_retiro' : 'elegir_envio'); } });
$('#checkout-form').addEventListener('submit', event => {
  event.preventDefault();
  try { const details = Object.fromEntries(new FormData(event.currentTarget)); const message = buildOrderMessage(catalog, cart, details, store); track('continuar_whatsapp'); window.open(orderUrl(message), '_blank', 'noopener'); $('#form-error').textContent = ''; }
  catch (error) { $('#form-error').textContent = error.message; }
});
try {
  const response = await fetch('./catalog.json'); if (!response.ok) throw new Error('No pudimos cargar el menú.');
  store = await response.json(); catalog = store.products || [];
  if (!Array.isArray(catalog) || catalog.some(product => !product.id || !Number.isSafeInteger(product.price) || product.price < 0)) throw new Error('El menú necesita una actualización.');
  try { const saved = JSON.parse(localStorage.getItem('jabas-cart-v1') || '{}'); if (saved && typeof saved === 'object' && !Array.isArray(saved)) for (const [id, quantity] of Object.entries(saved)) { if (catalog.some(product => product.id === id) && Number.isInteger(quantity) && quantity > 0 && quantity <= 30) cart[id] = quantity; } } catch {}
  const categories = ['Todos', ...new Set(catalog.map(product => product.category).filter(Boolean))];
  $('#filters').innerHTML = categories.map(category => `<button class="filter" data-filter="${escape(category)}" aria-pressed="${category === filter}">${escape(category)}</button>`).join('');
  if (store.pickupAddress) $('#contact-address').textContent = store.pickupAddress;
  renderProducts(); updateCart(); changeMethod();
} catch (error) { $('#products').innerHTML = `<p class="loading">${escape(error.message)} <a href="https://wa.me/c/5491121709260">Ver catálogo en WhatsApp ↗</a></p>`; }
