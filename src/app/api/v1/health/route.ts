import { NextResponse } from 'next/server';

/**
 * Moataz AI — Liveness Probe
 * Used by Railway Healthcheck to verify the process is alive.
 * This endpoint MUST always return 200 OK as long as the server is running.
 */

export const dynamic = 'force-dynamic';

export async function GET() {
  return new Response(JSON.stringify({ status: 'ok' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
