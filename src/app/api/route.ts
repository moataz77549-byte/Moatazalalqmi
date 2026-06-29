import { NextResponse } from 'next/server';
import { config } from '@/lib/config';

export async function GET() {
  return NextResponse.json({
    name: config.app.name,
    version: config.app.version,
    description: 'Enterprise AI Operating System',
    docs: '/docs/api',
    health: '/api/v1/health',
    api: '/api/v1',
  });
}
