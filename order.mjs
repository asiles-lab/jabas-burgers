export const PHONE = '5491121709260';
export function calculateOrder(catalog, cart) {
  const items = [];
  for (const [id, quantity] of Object.entries(cart)) {
    const product = catalog.find(item => item.id === id);
    if (!product || !Number.isInteger(quantity) || quantity < 1 || quantity > 30) throw new Error('Revisá los productos y las cantidades del pedido.');
    if (!Number.isSafeInteger(product.price) || product.price < 0) throw new Error('Hay un precio pendiente de confirmar.');
    items.push({ ...product, quantity, subtotal: product.price * quantity });
  }
  return { items, subtotal: items.reduce((total, item) => total + item.subtotal, 0) };
}
export function buildOrderMessage(catalog, cart, details, store) {
  const order = calculateOrder(catalog, cart);
  if (!order.items.length) throw new Error('Agregá al menos un producto.');
  const name = String(details.name || '').trim();
  if (name.length < 2 || name.length > 80) throw new Error('Ingresá tu nombre (entre 2 y 80 caracteres).');
  if (!['delivery', 'pickup'].includes(details.method)) throw new Error('Elegí envío o retiro.');
  const address = String(details.address || '').trim();
  if (details.method === 'delivery' && (address.length < 5 || address.length > 250)) throw new Error('Ingresá calle, número y localidad para el envío.');
  if (details.method === 'pickup' && !store.pickupAddress) throw new Error('Falta confirmar la dirección de retiro del local.');
  const money = value => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(value);
  const lines = ["Hola JABA’S BURGERS, quisiera hacer este pedido:", '', 'Nombre: ' + name,
    'Modalidad: ' + (details.method === 'delivery' ? 'Envío a domicilio' : 'Retiro en el local'),
    (details.method === 'delivery' ? 'Dirección de entrega: ' + address : 'Dirección de retiro: ' + store.pickupAddress), '',
    ...order.items.map(item => `${item.quantity} × ${item.name} — ${money(item.subtotal)} (${money(item.price)} c/u)`), '',
    'Subtotal de productos: ' + money(order.subtotal)];
  if (details.method === 'delivery') lines.push('Envío: costo y cobertura a confirmar con el local.');
  if (String(details.notes || '').trim()) lines.push('Observaciones: ' + String(details.notes).trim().slice(0, 500));
  lines.push('', '¿Me confirman disponibilidad, total final y tiempo de preparación?');
  return lines.join('\n');
}
export function orderUrl(message) { return `https://wa.me/${PHONE}?text=${encodeURIComponent(message)}`; }
