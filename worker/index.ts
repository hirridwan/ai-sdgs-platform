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
 * - POST /api/auth/login
 * - POST /api/auth/logout
 * - GET  /api/auth/me
 *   → Login/logout/cek-sesi tim
 *   → worker/auth.ts
 *
 * Selain route API, request lainnya diteruskan ke
 * frontend React/Vite melalui ASSETS.
 */

import { onRequestPost as handleGemini } from './gemini';
import { onRequestPost as handleGeminiAi } from './gemini-ai';
import { handleLogin, handleLogout, handleMe } from './auth';
import {
  handleAddMember,
  handleDeleteMember,
  handleGetTeam,
  handleListSdgs,
  handleUpdateMember,
  handleUpdateTeam,
} from './teams';
import { handleAiWithLogging, handleListInteractions } from './interactions';
import { handleAdminAuth } from './admin-auth';
import { handleAdminApi } from './admin-api';
import { handleListMotions } from './motions';
import { handleRuns } from './debate-runs';
import type { Env } from './lib/db';


export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname.startsWith('/api/admin/auth/')) {
      return handleAdminAuth(request, env);
    }

    if (url.pathname.startsWith('/api/admin/')) {
      return handleAdminApi(request, env);
    }

    if (url.pathname === '/api/debate-sessions') {
      return handleRuns(request, env);
    }

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
      return handleAiWithLogging(request, env, handleGemini, 'v1');
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
      return handleAiWithLogging(request, env, handleGeminiAi, 'v2');
    }

    // Auth: /api/auth/login
    if (url.pathname === '/api/auth/login') {
      if (request.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
          status: 405,
          headers: { 'Content-Type': 'application/json; charset=utf-8', Allow: 'POST' },
        });
      }
      return handleLogin(request, env);
    }

    // Auth: /api/auth/logout
    if (url.pathname === '/api/auth/logout') {
      if (request.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
          status: 405,
          headers: { 'Content-Type': 'application/json; charset=utf-8', Allow: 'POST' },
        });
      }
      return handleLogout(request, env);
    }

    // Auth: /api/auth/me
    if (url.pathname === '/api/auth/me') {
      if (request.method !== 'GET') {
        return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
          status: 405,
          headers: { 'Content-Type': 'application/json; charset=utf-8', Allow: 'GET' },
        });
      }
      return handleMe(request, env);
    }

    // Team: /api/sdgs (publik, tidak perlu login)
    if (url.pathname === '/api/sdgs') {
      if (request.method !== 'GET') {
        return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
          status: 405,
          headers: { 'Content-Type': 'application/json; charset=utf-8', Allow: 'GET' },
        });
      }
      return handleListSdgs();
    }

    // Bank Mosi: /api/motions (publik, tidak perlu login)
    if (url.pathname === '/api/motions') {
      if (request.method !== 'GET') {
        return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
          status: 405,
          headers: { 'Content-Type': 'application/json; charset=utf-8', Allow: 'GET' },
        });
      }
      return handleListMotions(env);
    }

    // Team: /api/team
    if (url.pathname === '/api/team') {
      if (request.method === 'GET') return handleGetTeam(request, env);
      if (request.method === 'PATCH') return handleUpdateTeam(request, env);
      return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json; charset=utf-8', Allow: 'GET, PATCH' },
      });
    }

    // Team: /api/team/members
    if (url.pathname === '/api/team/members') {
      if (request.method === 'POST') return handleAddMember(request, env);
      if (request.method === 'PATCH') return handleUpdateMember(request, env);
      if (request.method === 'DELETE') return handleDeleteMember(request, env);
      return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json; charset=utf-8', Allow: 'POST, PATCH, DELETE' },
      });
    }

    // Riwayat AI milik tim yang sedang login.
    if (url.pathname === '/api/interactions') {
      if (request.method !== 'GET') {
        return new Response(
          JSON.stringify({ error: 'Method Not Allowed' }),
          {
            status: 405,
            headers: {
              'Content-Type': 'application/json; charset=utf-8',
              Allow: 'GET',
            },
          },
        );
      }

      return handleListInteractions(request, env);
    }

    // Frontend: React/Vite static assets and SPA routes.
    return env.ASSETS.fetch(request);
  },
};