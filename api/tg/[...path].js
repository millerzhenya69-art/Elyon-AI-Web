// Vercel Edge Function — relays requests to api.telegram.org.
// Uses Vercel's edge network / IP pool, separate from Cloudflare's,
// as a workaround for HF Spaces' egress firewall blocking Telegram/Cloudflare.
//
// Public URL:  https://elyon-ai-web.vercel.app/api/tg/<rest of telegram path>
// Set TG_PROXY_URL in HF Secrets to: https://elyon-ai-web.vercel.app/api/tg

export const config = { runtime: 'edge' };

export default async function handler(req) {
  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/api\/tg/, '');
  const targetUrl = 'https://api.telegram.org' + path + url.search;

  const init = {
    method: req.method,
    headers: req.headers,
    body: ['GET', 'HEAD'].includes(req.method) ? undefined : req.body,
  };

  const resp = await fetch(targetUrl, init);

  return new Response(resp.body, {
    status: resp.status,
    statusText: resp.statusText,
    headers: resp.headers,
  });
}
