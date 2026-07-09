// Vercel Middleware — relays requests to two upstreams:
//  - /api/tg/*      -> api.telegram.org        (bot's outbound Telegram calls,
//                       bypasses HF Spaces' egress firewall)
//  - /api/relay/*   -> unkony-elyon-bot.hf.space (app/website's calls to our
//                       own backend — some mobile carriers can't reach
//                       *.hf.space directly, but can reach this Vercel domain,
//                       so routing through here fixes connectivity for them too)
//
// Using middleware instead of a file-system api/*/[...path].js route:
// Vercel's zero-config dynamic segment matching ([...path].js) breaks when
// an intermediate path segment contains a colon (e.g. /bot123:ABC/sendMessage),
// which is exactly the shape of every real Telegram Bot API URL. Middleware
// operates on the raw incoming request before that segment-matching layer,
// so it isn't affected by the same bug.

export const config = {
  matcher: ['/api/tg/:path*', '/api/relay/:path*'],
};

const UPSTREAMS = {
  '/api/tg':    'https://api.telegram.org',
  '/api/relay': 'https://unkony-elyon-bot.hf.space',
};

export default async function middleware(req) {
  const url = new URL(req.url);
  const prefix = Object.keys(UPSTREAMS).find((p) => url.pathname.startsWith(p));
  if (!prefix) return new Response('Not found', { status: 404 });

  const path = url.pathname.slice(prefix.length);
  const targetUrl = UPSTREAMS[prefix] + path + url.search;

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
