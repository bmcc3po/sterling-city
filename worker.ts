export default {
  async fetch(request: Request, env: { ASSETS: Fetcher }): Promise<Response> {
    const url = new URL(request.url);
    const res = await env.ASSETS.fetch(request);
    const ct = res.headers.get("content-type") || "";
    // Never serve the SPA HTML fallback as a JS/CSS module (iOS Safari MIME / CORS break).
    if (url.pathname.startsWith("/assets/") && ct.includes("text/html")) {
      return new Response("Not found", {
        status: 404,
        headers: { "Cache-Control": "no-store", "Content-Type": "text/plain; charset=utf-8" },
      });
    }
    return res;
  },
};
