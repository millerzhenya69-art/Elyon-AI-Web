// Vercel Middleware — relays /api/tg/* requests to api.telegram.org.
// Using middleware instead of a file-system api/tg/[...path].js route:
// Vercel's zero-config dynamic segment matching ([...path].js) breaks when
// an intermediate path segment contains a colon (e.g. /bot123:ABC/sendMessage),
// which is exactly the shape of every real Telegram Bot API URL. Middleware
// operates on the raw incoming request before that segment-matching layer,
// so it isn't affected by the same bug.

export const config = {
  matcher: '/api/tg/:path*',
};

export default async function middleware(req) {
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
