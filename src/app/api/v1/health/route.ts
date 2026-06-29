import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // This health check simply verifies that the application is running and responsive.
    // It does not check external dependencies like the database to avoid
    // returning a non-200 status when the application itself is healthy but a dependency is not.
    return NextResponse.json({ status: 'ok', message: 'Application is alive' }, { status: 200 });
  } catch (error) {
    console.error('Health check failed:', error);
    return NextResponse.json({ status: 'error', message: 'Internal server error during health check' }, { status: 500 });
  }
}
