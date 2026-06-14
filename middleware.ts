declare const process: { env: Record<string, string | undefined> };

export async function middleware(request: Request) {
  const url = new URL(request.url);

  if (url.pathname.startsWith('/uploads')) {
    const base = process.env.VITE_API_BASE_URL;
    if (!base) throw new Error('VITE_API_BASE_URL is required');
    const origin = base.replace(/\/api$/, '');
    const backendUrl = `${origin}${url.pathname}${url.search}`;

    try {
      const response = await fetch(backendUrl);
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      });
    } catch {
      return new Response('Not Found', { status: 404 });
    }
  }
}

export const config = {
  matcher: '/uploads/:path*',
};
