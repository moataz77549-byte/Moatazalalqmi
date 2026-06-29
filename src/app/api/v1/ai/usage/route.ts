import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/middleware';
import { getUsageStats } from '@/lib/ai-gateway/usage-tracker';
import { successResponse, errorResponse } from '@/lib/api';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) return NextResponse.json(errorResponse('Unauthorized'), { status: 401 });

    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId') || undefined;
    const provider = searchParams.get('provider') || undefined;
    const startDate = searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined;
    const endDate = searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined;

    const stats = await getUsageStats({
      userId: user.id,
      organizationId,
      provider,
      startDate,
      endDate,
    });

    return NextResponse.json(successResponse(stats));
  } catch (error: any) {
    return NextResponse.json(errorResponse(error.message), { status: 500 });
  }
}
