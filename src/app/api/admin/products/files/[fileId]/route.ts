import { NextRequest, NextResponse } from 'next/server';
import { RBACService } from '@/services/auth/rbac.service';
import { ProductFileService } from '@/services/file/product-file.service';

export const dynamic = 'force-dynamic';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  const auth = await RBACService.requireAdmin();
  if ('error' in auth) return auth.error;

  try {
    const { fileId } = await params;
    await ProductFileService.removeProductFile(fileId, auth.session.userId);
    return NextResponse.json({ message: 'File deleted successfully.' });
  } catch (error) {
    console.error('Failed to delete product file:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Failed to delete product file.' },
      { status: 500 }
    );
  }
}
