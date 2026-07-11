// Guestbook endpoint: receives a feedback submission from the tool and creates
// a page in the Notion guestbook database. The Notion token is a secret and
// lives only in Netlify env vars (NOTION_TOKEN, NOTION_DB_ID), never in the
// client. The browser posts here same-origin, so no CORS handling is needed.
const NOTION_VERSION = '2022-06-28';
const MAX_NAME = 80;
const MAX_MESSAGE = 2000; // Notion's per-rich-text-item limit

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

  // Honeypot: real users never fill this hidden field. Bots do. Pretend success
  // so the bot doesn't learn it was blocked.
  if (body.website) return json(200, { ok: true });

  const message = String(body.message || '').trim();
  const name = String(body.name || '').trim().slice(0, MAX_NAME) || 'Anonymous';
  if (!message) return json(400, { ok: false, error: 'Message is required' });
  if (message.length > MAX_MESSAGE) {
    return json(400, { ok: false, error: 'Message is too long' });
  }

  const token = process.env.NOTION_TOKEN;
  const dbId = process.env.NOTION_DB_ID;
  if (!token || !dbId) {
    console.error('guestbook: NOTION_TOKEN or NOTION_DB_ID not set');
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
          Name: { title: [{ text: { content: name } }] },
          Message: { rich_text: [{ text: { content: message } }] },
          Status: { select: { name: 'New' } },
        },
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      console.error('guestbook: Notion API error', res.status, detail);
      return json(502, { ok: false, error: 'Could not save right now' });
    }
    return json(200, { ok: true });
  } catch (e) {
    console.error('guestbook: request failed', e);
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
