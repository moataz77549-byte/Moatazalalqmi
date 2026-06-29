import { NextRequest, NextResponse } from 'next/server';
import { aiGateway } from '@/lib/ai-gateway/gateway';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/middleware';
import { successResponse, errorResponse } from '@/lib/api';
import { encryptApiKey, decryptApiKey, maskApiKey } from '@/lib/ai-gateway/key-vault';
import { createAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user) return NextResponse.json(errorResponse('Unauthorized'), { status: 401 });

    const { type } = await params;
    const providerType = type.toUpperCase() as any;

    // Get health status
    const health = await aiGateway.checkProvider(providerType);

    // Get models for this provider
    const models = aiGateway.listModels(providerType);

    return NextResponse.json(successResponse({
      provider: providerType,
      health,
      models,
    }));
  } catch (error: any) {
    return NextResponse.json(errorResponse(error.message), { status: 500 });
  }
}

// Configure provider with API key
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user) return NextResponse.json(errorResponse('Unauthorized'), { status: 401 });

    const { type } = await params;
    const providerType = type.toUpperCase() as any;
    const body = await request.json();
    const { apiKey, baseUrl, organizationId, config } = body;

    if (!organizationId) {
      return NextResponse.json(errorResponse('organizationId is required'), { status: 400 });
    }

    // Encrypt API key before storing
    const encryptedKey = apiKey ? encryptApiKey(apiKey) : null;

    // Upsert provider in database
    const provider = await db.provider.upsert({
      where: {
        id: body.providerId || 'new',
      },
      create: {
        organizationId,
        type: providerType,
        name: body.name || providerType,
        apiKey: encryptedKey,
        baseUrl,
        isActive: true,
        config: config ? JSON.stringify(config) : null,
      },
      update: {
        apiKey: encryptedKey || undefined,
        baseUrl,
        config: config ? JSON.stringify(config) : undefined,
      },
    });

    // Initialize the driver with decrypted key
    if (encryptedKey) {
      await aiGateway.configureProvider({
        type: providerType,
        name: provider.name,
        apiKey: decryptApiKey(encryptedKey),
        baseUrl,
        organizationId,
        isActive: true,
        priority: 0,
        config,
      });
    }

    await createAuditLog({
      userId: user.id,
      organizationId,
      action: 'UPDATE',
      resource: 'provider',
      resourceId: provider.id,
      details: { providerType, hasApiKey: !!apiKey },
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
    });

    return NextResponse.json(successResponse({
      providerId: provider.id,
      type: providerType,
      apiKeyMasked: encryptedKey ? maskApiKey(apiKey) : null,
    }, 'Provider configured'));
  } catch (error: any) {
    return NextResponse.json(errorResponse(error.message), { status: 500 });
  }
}
