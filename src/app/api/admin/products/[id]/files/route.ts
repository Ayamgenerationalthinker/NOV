import { NextRequest, NextResponse } from 'next/server';
import { RBACService } from '@/services/auth/rbac.service';
import { ProductFileService } from '@/services/file/product-file.service';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await RBACService.requireAdmin();
  if ('error' in auth) return auth.error;

  try {
    const { id } = await params;
    const files = await ProductFileService.getProductFiles(id);
    return NextResponse.json({ files });
  } catch (error) {
    console.error('Failed to get product files:', error);
    return NextResponse.json({ error: 'Failed to retrieve product files.' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await RBACService.requireAdmin();
  if ('error' in auth) return auth.error;

  try {
    const { id } = await params;
    const formData = await request.formData();

    const file = formData.get('file') as File | null;
    const versionNumber = (formData.get('versionNumber') as string) || '1.0.0';
    const isPrimary = formData.get('isPrimary') === 'true';
    const maxDownloadsStr = formData.get('maxDownloads') as string | null;
    const maxDownloads = maxDownloadsStr ? parseInt(maxDownloadsStr, 10) : undefined;

    if (!file) {
      return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    const attached = await ProductFileService.attachFileToProduct({
      productId: id,
      fileName: file.name,
      fileBuffer,
      mimeType: file.type || 'application/octet-stream',
      versionNumber,
      isPrimary,
      maxDownloads,
      adminUserId: auth.session.userId,
    });

    return NextResponse.json({ file: attached, message: 'File uploaded and attached successfully.' }, { status: 201 });
  } catch (error) {
    console.error('File upload error:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Failed to attach product file.' },
      { status: 500 }
    );
  }
}
