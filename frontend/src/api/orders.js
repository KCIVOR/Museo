const API = import.meta.env.VITE_API_BASE;

async function handleJson(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) {
    throw new Error(data.error || data.message || `Request failed (${res.status})`);
  }
  return data;
}

export async function buyNow(orderData) {
  // Ensure we have at least the minimum required fields
  const { marketItemId, quantity = 1 } = orderData;
  if (!marketItemId) {
    throw new Error('marketItemId is required');
  }
  
  // Make API call with all provided order data
  const res = await fetch(`${API}/marketplace/orders/buy-now`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(orderData)
  });
  return handleJson(res);
}
