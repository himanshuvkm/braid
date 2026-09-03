import { NextResponse } from 'next/server';
import { getAdapter } from '../../../lib/db';

export async function GET() {
  try {
    const adapter = getAdapter();
    const isDbHealthy = await adapter.isHealthy();

    if (!isDbHealthy) {
      return NextResponse.json(
        {
          status: 'unhealthy',
          service: 'braid-app',
          database: {
            status: 'disconnected',
            type: adapter.type,
          },
          error: 'Database connectivity verification failed',
          timestamp: Date.now(),
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        status: 'healthy',
        service: 'braid-app',
        database: {
          status: 'connected',
          type: adapter.type,
        },
        uptimeSeconds: Math.floor(process.uptime()),
        timestamp: Date.now(),
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown health check error';
    return NextResponse.json(
      {
        status: 'unhealthy',
        service: 'braid-app',
        error: message,
        timestamp: Date.now(),
      },
      { status: 503 }
    );
  }
}
