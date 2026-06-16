export const runtime = 'edge';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const filePath = searchParams.get('path');
  if (!filePath) {
    return new Response('Missing path', { status: 400 });
  }

  // @ts-ignore - process.env is available in Vercel Edge Runtime
  const apiBaseUrl = process.env.VITE_API_BASE_URL as string | undefined;
  if (!apiBaseUrl) {
    return new Response('VITE_API_BASE_URL not configured', { status: 500 });
  }

  const backendBase = apiBaseUrl.replace(/\/api$/, '');
  const backendUrl = `${backendBase}/uploads/${filePath}`;

  try {
    const response = await fetch(backendUrl);
    if (!response.ok) {
      return new Response('File not found', { status: response.status });
    }
    return new Response(response.body, {
      status: 200,
      headers: response.headers,
    });
  } catch {
    return new Response('Proxy error', { status: 502 });
  }
}
