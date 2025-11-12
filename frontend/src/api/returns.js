const API = import.meta.env.VITE_API_BASE;

// Helper to handle JSON responses
async function handleJson(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) {
    throw new Error(data.error || data.message || `Request failed (${res.status})`);
  }
  return data;
}

export async function createReturn({ orderId, reason, description, evidenceFiles = [] }) {
  const form = new FormData();
  form.append('orderId', orderId);
  form.append('reason', reason);
  if (description) form.append('description', description);
  // Append images under field name 'evidence'
  evidenceFiles.forEach((f) => form.append('evidence', f));

  const res = await fetch(`${API}/returns`, {
    method: 'POST',
    credentials: 'include',
    body: form,
  });
  return handleJson(res);
}

export async function getBuyerReturns() {
  const res = await fetch(`${API}/returns/buyer`, { credentials: 'include' });
  return handleJson(res);
}

export async function getSellerReturns(status) {
  const url = status ? `${API}/returns/seller?status=${encodeURIComponent(status)}` : `${API}/returns/seller`;
  const res = await fetch(url, { credentials: 'include' });
  return handleJson(res);
}

export async function getAdminReturns({ status, disputed } = {}) {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (disputed === true) params.set('disputed', 'true');
  const url = params.toString() ? `${API}/returns/admin/all?${params.toString()}` : `${API}/returns/admin/all`;
  const res = await fetch(url, { credentials: 'include' });
  return handleJson(res);
}

export async function getReturnDetails(returnId) {
  const res = await fetch(`${API}/returns/${returnId}`, { credentials: 'include' });
  return handleJson(res);
}

export async function addReturnMessage(returnId, message) {
  const res = await fetch(`${API}/returns/${returnId}/messages`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  });
  return handleJson(res);
}

export async function disputeReturn(returnId, disputeReason) {
  const res = await fetch(`${API}/returns/${returnId}/dispute`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ disputeReason }),
  });
  return handleJson(res);
}

export async function approveReturn(returnId, sellerResponse) {
  const res = await fetch(`${API}/returns/${returnId}/approve`, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sellerResponse }),
  });
  return handleJson(res);
}

export async function rejectReturn(returnId, sellerResponse) {
  const res = await fetch(`${API}/returns/${returnId}/reject`, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sellerResponse }),
  });
  return handleJson(res);
}

export async function resolveDispute(returnId, resolution, adminNotes) {
  const res = await fetch(`${API}/returns/${returnId}/resolve`, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resolution, adminNotes }),
  });
  return handleJson(res);
}

export async function markReturnShipped(returnId, trackingNumber) {
  const body = {};
  if (trackingNumber) body.tracking_number = trackingNumber;

  const res = await fetch(`${API}/returns/${returnId}/shipped`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return handleJson(res);
}

export async function markReturnReceived(returnId, receivedCondition) {
  const body = {};
  if (receivedCondition) body.received_condition = receivedCondition;

  const res = await fetch(`${API}/returns/${returnId}/received`, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return handleJson(res);
}
