import { NextRequest, NextResponse } from 'next/server';
import { RBACService } from '@/services/auth/rbac.service';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { env } from '@/lib/env';
import { storageService } from '@/services/storage/storage.service';

export const dynamic = 'force-dynamic';

// Allowed MIME types and extensions
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
  'image/avif',
  'model/gltf-binary',
  'model/gltf+json',
  'application/octet-stream', // Used for .glb/.gltf models
  'application/pdf',
  'application/zip',
]);

const ALLOWED_EXTENSIONS = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.gif',
  '.svg',
  '.avif',
  '.glb',
  '.gltf',
  '.pdf',
  '.zip',
]);

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB maximum

export async function POST(request: NextRequest) {
  const auth = await RBACService.requireAdmin();
  if ('error' in auth) return auth.error;

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const folder = (formData.get('folder') as string) || 'products';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File exceeds maximum allowed size of 50MB (received ${(file.size / (1024 * 1024)).toFixed(1)}MB)` },
        { status: 400 }
      );
    }

    const rawExt = path.extname(file.name).toLowerCase();
    const mimeType = file.type || 'application/octet-stream';

    if (!ALLOWED_EXTENSIONS.has(rawExt) && !ALLOWED_MIME_TYPES.has(mimeType)) {
      return NextResponse.json(
        { error: `Unsupported file type: ${mimeType} (${rawExt}). Allowed formats: images, GLB/GLTF 3D models, PDF, and ZIP.` },
        { status: 400 }
      );
    }

    const sanitizedBase = path.basename(file.name, rawExt).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40);
    const uniqueId = crypto.randomBytes(6).toString('hex');
    const finalFileName = `${sanitizedBase}-${uniqueId}${rawExt}`;
    const cleanFolder = folder.replace(/[^a-zA-Z0-9_-]/g, '');

    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    const hasR2 = Boolean(env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY);

    if (hasR2) {
      const storageKey = `public/${cleanFolder}/${finalFileName}`;
      await storageService.uploadFile({
        fileBuffer,
        key: storageKey,
        contentType: mimeType,
      });

      const publicUrl = process.env.R2_PUBLIC_DOMAIN
        ? `https://${process.env.R2_PUBLIC_DOMAIN}/${storageKey}`
        : `${env.NEXT_PUBLIC_APP_URL}/api/downloads/file-stream?key=${encodeURIComponent(storageKey)}`;

      return NextResponse.json({
        url: publicUrl,
        fileName: file.name,
        fileSize: file.size,
        mimeType,
      });
    } else {
      // Local public storage in public/uploads/{folder}
      const uploadDir = path.resolve(process.cwd(), 'public', 'uploads', cleanFolder);
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const filePath = path.join(uploadDir, finalFileName);
      fs.writeFileSync(filePath, fileBuffer);

      const publicUrl = `/uploads/${cleanFolder}/${finalFileName}`;

      return NextResponse.json({
        url: publicUrl,
        fileName: file.name,
        fileSize: file.size,
        mimeType,
      });
    }
  } catch (error: any) {
    console.error('File upload failure:', error);
    return NextResponse.json(
      { error: error.message || 'File upload failed' },
      { status: 500 }
    );
  }
}
