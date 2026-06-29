import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/middleware';
import { createAuditLog } from '@/lib/audit';
import { aiGateway } from '@/lib/ai-gateway/gateway';
import { errorResponse, successResponse } from '@/lib/api';
import { DocumentStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

async function getOwnedDocument(documentId: string, userId: string) {
  const doc = await db.knowledgeDocument.findUnique({ where: { id: documentId } });
  if (!doc || doc.userId !== userId) return null;
  return doc;
}

// GET /api/v1/documents/[id]/summary — Get document summary (generate if not exists)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(errorResponse('Unauthorized'), { status: 401 });
    }

    const { id } = await params;
    const doc = await getOwnedDocument(id, user.id);
    if (!doc) {
      return NextResponse.json(errorResponse('Document not found'), { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const regenerate = searchParams.get('regenerate') === 'true';

    // Return existing summary if available and not asked to regenerate
    if (doc.summary && !regenerate) {
      return NextResponse.json(
        successResponse({
          documentId: id,
          summary: doc.summary,
          generated: false,
          generatedAt: doc.processedAt,
        })
      );
    }

    // Generate new summary on-demand
    let summary = '';
    try {
      const response = await aiGateway.chat(
        {
          model: 'auto',
          messages: [
            {
              role: 'system',
              content:
                'Summarize the following document in 2-3 concise paragraphs. Capture key points, main arguments, and important conclusions.',
            },
            { role: 'user', content: doc.content.substring(0, 8000) },
          ],
          temperature: 0.3,
          maxTokens: 300,
        },
        {
          userId: user.id,
          organizationId: doc.organizationId,
          enableCache: true,
          enableFallback: true,
        }
      );
      summary = response.content;
    } catch (err) {
      console.error('On-demand summary generation failed:', err);
      return NextResponse.json(
        errorResponse('Failed to generate summary'),
        { status: 502 }
      );
    }

    const updated = await db.knowledgeDocument.update({
      where: { id },
      data: {
        summary,
        processedAt: new Date(),
        status: doc.status === DocumentStatus.PENDING ? DocumentStatus.INDEXED : doc.status,
      },
    });

    await createAuditLog({
      userId: user.id,
      organizationId: doc.organizationId,
      action: 'UPDATE',
      resource: 'document',
      resourceId: id,
      details: { action: 'generate-summary', regenerated: regenerate },
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    return NextResponse.json(
      successResponse(
        {
          documentId: id,
          summary,
          generated: true,
          generatedAt: updated.processedAt,
        },
        'Document summary generated'
      )
    );
  } catch (error) {
    console.error('Get document summary error:', error);
    return NextResponse.json(errorResponse('Internal server error'), { status: 500 });
  }
}

// Note: this route intentionally generates the summary on-demand via the AI gateway
// rather than re-running the full document-processing pipeline (chunking, embedding, etc.).
