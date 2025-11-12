export const runtime = 'nodejs';

function textFromHTML(html: string): string {
  try {
    const noScript = html.replace(/<script[\s\S]*?<\/script>/gi, '');
    const noStyle = noScript.replace(/<style[\s\S]*?<\/style>/gi, '');
    const text = noStyle.replace(/<[^>]+>/g, ' ');
    const collapsed = text.replace(/\s+/g, ' ').trim();
    return collapsed.slice(0, 8000);
  } catch {
    return html.slice(0, 8000);
  }
}

export async function POST(request: Request) {
  try {
    const { url } = await request.json();
    if (!url || typeof url !== 'string') {
      return Response.json({ error: 'Missing url' }, { status: 400 });
    }
    if (!/^https?:\/\//i.test(url)) {
      return Response.json({ error: 'Invalid URL' }, { status: 400 });
    }

    const res = await fetch(url, { headers: { 'User-Agent': 'AgenticAssistant/1.0' }, cache: 'no-store' });
    const ct = res.headers.get('content-type') || '';
    if (!res.ok) {
      return Response.json({ error: `Upstream ${res.status}` }, { status: 502 });
    }

    if (ct.includes('text/html') || ct.includes('text/plain') || ct.includes('application/xhtml')) {
      const html = await res.text();
      const text = textFromHTML(html);
      return Response.json({ contentType: 'text', text });
    }

    // For JSON, return prettified subset
    if (ct.includes('application/json')) {
      const json = await res.json();
      const text = JSON.stringify(json, null, 2).slice(0, 8000);
      return Response.json({ contentType: 'json', text });
    }

    return Response.json({ error: `Unsupported content-type: ${ct}` }, { status: 415 });
  } catch (e: any) {
    return Response.json({ error: e?.message ?? 'Unknown error' }, { status: 500 });
  }
}
