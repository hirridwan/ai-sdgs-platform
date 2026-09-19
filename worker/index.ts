import { onRequestPost as handleGeminiAi } from './gemini-ai';

type WorkerEnv = {
  ASSETS: any;
  GEMINI_API_KEY?: string;
  GEMINI_MODEL?: string;
};

export default {
  async fetch(request: Request, env: WorkerEnv, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Backend V2: /api/gemini-ai
    if (url.pathname === '/api/gemini-ai') {
      if (request.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
          status: 405,
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            Allow: 'POST',
          },
        });
      }

      // Adapt the existing Pages Function context to the Worker handler.
      return handleGeminiAi({ request, env });
    }

    // Frontend: React/Vite static assets and SPA routes.
    return env.ASSETS.fetch(request);
  },
};
