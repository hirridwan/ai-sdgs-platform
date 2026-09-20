/**
 * WORKER ROUTER — AI × SDGs Platform
 *
 * Fungsi:
 * - Menjadi pintu masuk utama Cloudflare Worker.
 * - Mengarahkan request API ke backend yang sesuai.
 *
 * Route:
 * - POST /api/gemini
 *   → V1 — Source Pack
 *   → worker/gemini.ts
 *
 * - POST /api/gemini-ai
 *   → V2 — Gemini AI + Google Search
 *   → worker/gemini-ai.ts
 *
 * Selain route API, request lainnya diteruskan ke
 * frontend React/Vite melalui ASSETS.
 */

import { onRequestPost as handleGemini } from './gemini';
import { onRequestPost as handleGeminiAi } from './gemini-ai';

type WorkerEnv = {
  ASSETS: any;
  GEMINI_API_KEY?: string;
  GEMINI_MODEL?: string;
};

export default {
  async fetch(request: Request, env: WorkerEnv): Promise<Response> {
    const url = new URL(request.url);

    // Backend V1: /api/gemini
    if (url.pathname === '/api/gemini') {
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
      return handleGemini({ request, env });
    }

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
