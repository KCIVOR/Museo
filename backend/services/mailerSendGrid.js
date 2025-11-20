// backend/services/mailerSendGrid.js
// Lightweight SendGrid adapter for bulk templated sends

import sgMail from '@sendgrid/mail';

// Read env dynamically at runtime
function getEnv(name, fallback = undefined) {
  const v = process.env[name];
  return typeof v === 'undefined' ? fallback : v;
}

function getInt(name, fallback) {
  const v = getEnv(name);
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function ensureInit() {
  const key = getEnv('SENDGRID_API_KEY');
  if (!key) {
    console.warn('[sendgrid] SENDGRID_API_KEY not set; emails disabled');
    return false;
  }
  try {
    sgMail.setApiKey(key);
    return true;
  } catch (e) {
    console.error('[sendgrid] setApiKey failed:', e?.message || e);
    return false;
  }
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export async function sendBulkTemplate({
  from,
  templateId,
  unsubscribeGroupId, // integer (SendGrid group id)
  personalizations,   // array of { to: { email, name? }, dynamic_template_data: {...} }
  category = 'event-announcement',
}) {
  if (!ensureInit()) return { success: false, error: 'SENDGRID_NOT_CONFIGURED' };
  const FROM = from || getEnv('SENDGRID_FROM');
  const tpl = templateId || getEnv('SENDGRID_ANNOUNCE_TEMPLATE_ID');
  const groupIdRaw = unsubscribeGroupId ?? getEnv('SENDGRID_UNSUB_GROUP_ID');
  const groupId = groupIdRaw ? parseInt(groupIdRaw, 10) : undefined;
  if (!FROM || !tpl) {
    return { success: false, error: 'MISSING_FROM_OR_TEMPLATE' };
  }
  const CHUNK = getInt('SENDGRID_BULK_CHUNK', 1000);
  const CONC = getInt('SENDGRID_CONCURRENCY', 3);

  const batches = chunk(personalizations, CHUNK);
  let sent = 0; let failed = 0;

  for (let i = 0; i < batches.length; i += CONC) {
    const window = batches.slice(i, i + CONC);
    const tasks = window.map(async (pz, idx) => {
      const msg = {
        from: FROM,
        templateId: tpl,
        personalizations: pz,
        categories: [category],
      };
      if (Number.isInteger(groupId)) {
        msg.asm = { groupId };
      }
      try {
        const [resp] = await sgMail.send(msg);
        if (resp?.statusCode && resp.statusCode >= 200 && resp.statusCode < 300) {
          sent += pz.length;
          console.log(`[sendgrid] sent batch size=${pz.length} status=${resp.statusCode}`);
          return { ok: true };
        }
        failed += pz.length;
        console.warn('[sendgrid] non-2xx response for batch:', resp?.statusCode);
        return { ok: false };
      } catch (e) {
        failed += pz.length;
        const msg = e?.response?.body || e?.message || e;
        console.warn('[sendgrid] batch failed:', msg);
        return { ok: false, error: msg };
      }
    });
    const results = await Promise.allSettled(tasks);
    // Optional: could implement retry-once for failed windows here
    const okCount = results.filter(r => r.status === 'fulfilled' && r.value?.ok).length;
    console.log(`[sendgrid] window done: ok=${okCount}/${results.length}`);
  }

  return { success: failed === 0, sent, failed };
}

export default { sendBulkTemplate };
