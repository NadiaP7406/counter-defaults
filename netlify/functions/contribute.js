// Contribute endpoint: receives an ANONYMOUS signature (the encoded shape of
// someone's settings) and stores it as a Type=Signature row in the guestbook
// database, so we can report which defaults people override most. Explicit
// opt-in: fired only when someone taps "contribute" in the tool. No name, no
// message, no PII - just the settings vector. Reuses the same Notion token and
// database as the guestbook, so no extra env vars are needed.
const NOTION_VERSION = '2022-06-28';
const MAX_SIGNATURE = 200;
const SIG_RE = /^s=\d{1,20}(&t=[a-z0-9.]{1,120})?$/; // e.g. "s=3300020001032&t=emdash.fillers"

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return json(405, { ok: false, error: 'Method not allowed' });
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (e) {
    return json(400, { ok: false, error: 'Invalid JSON' });
  }

  // Honeypot: real users never fill this hidden field. Bots do.
  if (body.website) return json(200, { ok: true });

  const signature = String(body.signature || '').trim().slice(0, MAX_SIGNATURE);
  // Only accept a well-formed, non-default signature. Nothing to learn from an
  // all-default contribution, and the shape guards against junk payloads.
  if (!signature || !SIG_RE.test(signature)) {
    return json(400, { ok: false, error: 'No valid signature' });
  }

  const token = process.env.NOTION_TOKEN;
  const dbId = process.env.NOTION_DB_ID;
  if (!token || !dbId) {
    console.error('contribute: NOTION_TOKEN or NOTION_DB_ID not set');
    return json(500, { ok: false, error: 'Server not configured' });
  }

  try {
    const res = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Notion-Version': NOTION_VERSION,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        parent: { database_id: dbId },
        properties: {
          Name: { title: [{ text: { content: '(anonymous signature)' } }] },
          Signature: { rich_text: [{ text: { content: signature } }] },
          Type: { select: { name: 'Signature' } },
          // Read, not New: these are aggregate data, never feedback to triage.
          Status: { select: { name: 'Read' } },
        },
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      console.error('contribute: Notion API error', res.status, detail);
      return json(502, { ok: false, error: 'Could not save right now' });
    }
    return json(200, { ok: true });
  } catch (e) {
    console.error('contribute: request failed', e);
    return json(502, { ok: false, error: 'Could not save right now' });
  }
};

function json(statusCode, obj) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(obj),
  };
}
